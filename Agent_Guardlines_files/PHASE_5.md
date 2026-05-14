# PHASE 5 — Full Orchestration Pipeline + Next.js UI
> Prerequisite: Phases 1–4 complete. Each module works independently.
> Goal: Wire everything into a job queue. Add a UI where users paste a URL and watch a demo generate in real time.

---

## TASK 5.1 — BullMQ Queue Definitions

Define all job queues and their typed payloads.

### File: `apps/api/src/modules/orchestrator/queue.ts`

```typescript
import { Queue, Worker, type Job } from "bullmq";
import { redis } from "../../lib/redis";

// ─── Queue Names ─────────────────────────────────────────────────────────────
export const QUEUE_NAMES = {
  ANALYZE: "analyze-job",
  SCRIPT: "script-job",
  AUTOMATION: "automation-job",
  VOICE: "voice-job",
  RENDER: "render-job",
} as const;

// ─── Job Payloads ─────────────────────────────────────────────────────────────
export type AnalyzeJobData = { projectId: string; url: string };
export type ScriptJobData = { projectId: string; url: string; tone: string };
export type AutomationJobData = { projectId: string; url: string };
export type VoiceJobData = { projectId: string };
export type RenderJobData = { projectId: string };

// ─── Queues ───────────────────────────────────────────────────────────────────
const queueOpts = { connection: redis };

export const analyzeQueue = new Queue<AnalyzeJobData>(QUEUE_NAMES.ANALYZE, queueOpts);
export const scriptQueue = new Queue<ScriptJobData>(QUEUE_NAMES.SCRIPT, queueOpts);
export const automationQueue = new Queue<AutomationJobData>(QUEUE_NAMES.AUTOMATION, queueOpts);
export const voiceQueue = new Queue<VoiceJobData>(QUEUE_NAMES.VOICE, queueOpts);
export const renderQueue = new Queue<RenderJobData>(QUEUE_NAMES.RENDER, queueOpts);

// ─── Helper: enqueue full pipeline ────────────────────────────────────────────
export async function enqueuePipeline(projectId: string, url: string, tone: string) {
  await analyzeQueue.add("analyze", { projectId, url }, {
    jobId: `analyze-${projectId}`,
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
}
```

---

## TASK 5.2 — Orchestrator: Main Pipeline

Chain the pipeline as sequential BullMQ workers.
Each worker completes its job and enqueues the next stage.

### File: `apps/api/src/modules/orchestrator/index.ts`

```typescript
import { Worker } from "bullmq";
import { redis } from "../../lib/redis";
import { prisma } from "../../lib/prisma";
import { analyzeProduct } from "../analyzer";
import { generateScript } from "../script";
import { recordAllScenes } from "../automation";
import { generateAllNarrations } from "../voice";
import { buildTimeline } from "../voice/sync";
import { renderTimelineToMP4 } from "../renderer";
import { runHyperframesRender } from "../../lib/hyperframes";
import type { RenderBackend } from "@demo-copilot/types";
import {
  QUEUE_NAMES,
  scriptQueue, automationQueue, voiceQueue, renderQueue,
  type AnalyzeJobData, type ScriptJobData,
  type AutomationJobData, type VoiceJobData, type RenderJobData,
} from "./queue";
import type { DemoScript, Timeline } from "@demo-copilot/types";
import path from "path";

const OUTPUT_DIR = process.env.OUTPUT_DIR || "/tmp/demo-copilot-output";
const workerOpts = { connection: redis };

// ─── Status Helper ────────────────────────────────────────────────────────────
async function updateStatus(projectId: string, stage: string, message = "") {
  await prisma.project.update({
    where: { id: projectId },
    data: { status: stage },
  });
  console.log(`[Pipeline] [${projectId}] ${stage}: ${message}`);
}

// ─── Worker 1: Analyze ────────────────────────────────────────────────────────
new Worker<AnalyzeJobData>(QUEUE_NAMES.ANALYZE, async (job) => {
  const { projectId, url } = job.data;
  await updateStatus(projectId, "analyzing", url);

  const productMap = await analyzeProduct(url);

  // Store in DemoRun
  const run = await prisma.demoRun.create({
    data: { projectId },
  });

  // Cache productMap in Redis for next stage
  await redis.set(`project:${projectId}:productMap`, JSON.stringify(productMap), "EX", 3600);
  await redis.set(`project:${projectId}:runId`, run.id, "EX", 3600);

  // Get project tone
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  await scriptQueue.add("script", { projectId, url, tone: project?.tone || "marketing" }, {
    jobId: `script-${projectId}`,
    attempts: 3,
  });
}, workerOpts);

// ─── Worker 2: Script ─────────────────────────────────────────────────────────
new Worker<ScriptJobData>(QUEUE_NAMES.SCRIPT, async (job) => {
  const { projectId, url, tone } = job.data;
  await updateStatus(projectId, "scripting");

  const raw = await redis.get(`project:${projectId}:productMap`);
  if (!raw) throw new Error("productMap not found in cache");
  const productMap = JSON.parse(raw);

  const script = await generateScript(productMap, url, tone as any);
  await redis.set(`project:${projectId}:script`, JSON.stringify(script), "EX", 3600);

  // Save script to DB run
  const runId = await redis.get(`project:${projectId}:runId`);
  if (runId) {
    await prisma.demoRun.update({ where: { id: runId }, data: { script: script as any } });
  }

  await automationQueue.add("automation", { projectId, url }, {
    jobId: `automation-${projectId}`,
    attempts: 2,
  });
}, workerOpts);

// ─── Worker 3: Automation ─────────────────────────────────────────────────────
new Worker<AutomationJobData>(QUEUE_NAMES.AUTOMATION, async (job) => {
  const { projectId, url } = job.data;
  await updateStatus(projectId, "recording");

  const raw = await redis.get(`project:${projectId}:script`);
  if (!raw) throw new Error("script not found in cache");
  const script: DemoScript = JSON.parse(raw);

  const videoMap = await recordAllScenes(script, projectId, url, OUTPUT_DIR);
  await redis.set(`project:${projectId}:videoMap`, JSON.stringify(videoMap), "EX", 3600);

  await voiceQueue.add("voice", { projectId }, {
    jobId: `voice-${projectId}`,
    attempts: 3,
  });
}, workerOpts);

// ─── Worker 4: Voice ─────────────────────────────────────────────────────────
new Worker<VoiceJobData>(QUEUE_NAMES.VOICE, async (job) => {
  const { projectId } = job.data;
  await updateStatus(projectId, "voicing");

  const raw = await redis.get(`project:${projectId}:script`);
  if (!raw) throw new Error("script not found");
  const script: DemoScript = JSON.parse(raw);

  const voiceOutputs = await generateAllNarrations(script, projectId, OUTPUT_DIR);
  await redis.set(`project:${projectId}:voiceOutputs`, JSON.stringify(voiceOutputs), "EX", 3600);

  await renderQueue.add("render", { projectId }, {
    jobId: `render-${projectId}`,
    attempts: 2,
  });
}, workerOpts);

// ─── Worker 5: Render ─────────────────────────────────────────────────────────
new Worker<RenderJobData>(QUEUE_NAMES.RENDER, async (job) => {
  const { projectId } = job.data;
  await updateStatus(projectId, "rendering");

  const [scriptRaw, videoMapRaw, voiceRaw] = await Promise.all([
    redis.get(`project:${projectId}:script`),
    redis.get(`project:${projectId}:videoMap`),
    redis.get(`project:${projectId}:voiceOutputs`),
  ]);

  if (!scriptRaw || !videoMapRaw || !voiceRaw) throw new Error("Missing pipeline data");

  const script: DemoScript = JSON.parse(scriptRaw);
  const videoMap: Record<string, string> = JSON.parse(videoMapRaw);
  const voiceOutputs = JSON.parse(voiceRaw);

  const timeline = buildTimeline(script, voiceOutputs, videoMap);

  const backend = (process.env.RENDER_BACKEND || "hyperframes") as RenderBackend;
  let mp4Path: string;
  if (backend === "remotion") {
    mp4Path = await renderTimelineToMP4(timeline, projectId, OUTPUT_DIR);
  } else {
    // HyperFrames: emit project under OUTPUT_DIR (implement in renderer module), then:
    const hfRoot = path.join(OUTPUT_DIR, process.env.HYPERFRAMES_PROJECTS_DIR || "hyperframes-projects", projectId);
    mp4Path = path.join(OUTPUT_DIR, projectId, "final.mp4");
    await runHyperframesRender({ projectDir: hfRoot, outputFile: mp4Path });
  }

  // Save to DB
  const runId = await redis.get(`project:${projectId}:runId`);
  if (runId) {
    await prisma.demoRun.update({
      where: { id: runId },
      data: { timeline: timeline as any, videoUrl: mp4Path, durationMs: timeline.totalDurationMs },
    });
  }
  await prisma.project.update({
    where: { id: projectId },
    data: { status: "completed", videoUrl: mp4Path },
  });

  console.log(`[Pipeline] ✓ Project ${projectId} complete: ${mp4Path}`);
}, workerOpts);

export function startWorkers() {
  console.log("[Orchestrator] All pipeline workers started");
}
```

Register in `apps/api/src/index.ts`:
```typescript
import { startWorkers } from "./modules/orchestrator";
startWorkers();
```

---

## TASK 5.3 — SSE Status Endpoint

Stream real-time job status to the frontend.

### File: `apps/api/src/routes/jobs.ts`

```typescript
import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";

export async function jobRoutes(fastify: FastifyInstance) {
  // SSE status stream
  fastify.get<{ Params: { id: string } }>(
    "/api/v1/projects/:id/status",
    async (request, reply) => {
      const { id } = request.params;

      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.flushHeaders();

      const send = (data: object) => {
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      let lastStatus = "";
      const interval = setInterval(async () => {
        try {
          const project = await prisma.project.findUnique({ where: { id } });
          if (!project) {
            clearInterval(interval);
            reply.raw.end();
            return;
          }

          if (project.status !== lastStatus) {
            lastStatus = project.status;
            send({ projectId: id, stage: project.status, progress: getProgress(project.status) });

            if (project.status === "completed" || project.status === "failed") {
              clearInterval(interval);
              setTimeout(() => reply.raw.end(), 1000);
            }
          }
        } catch {
          clearInterval(interval);
          reply.raw.end();
        }
      }, 1500);

      request.raw.on("close", () => clearInterval(interval));
    }
  );
}

function getProgress(stage: string): number {
  const map: Record<string, number> = {
    queued: 0, analyzing: 15, scripting: 30,
    recording: 50, voicing: 65, syncing: 75,
    rendering: 85, completed: 100, failed: 0,
  };
  return map[stage] ?? 0;
}
```

---

## TASK 5.4 — Update Project Route: Trigger Pipeline

Update `POST /api/v1/projects` to enqueue the pipeline after creating the project.

### Update `apps/api/src/routes/projects.ts`:
```typescript
// Add import at top
import { enqueuePipeline } from "../modules/orchestrator/queue";

// In the POST handler, after prisma.project.create:
await enqueuePipeline(project.id, body.url, body.tone || "marketing");

return reply.status(201).send({ project, jobId: `analyze-${project.id}` });
```

---

## TASK 5.5 — Next.js Web App

Scaffold the control panel UI.

### Steps

1. Create `apps/web` using Next.js 14:
```bash
pnpm create next-app@14 apps/web --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

2. Install additional dependencies:
```bash
pnpm --filter=web add zustand @tanstack/react-query framer-motion
pnpm --filter=web add @demo-copilot/types
```

3. Create `apps/web/lib/api-client.ts`:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  createProject: (body: { url: string; name?: string; tone?: string }) =>
    apiFetch("/api/v1/projects", { method: "POST", body: JSON.stringify(body) }),
  getProjects: () => apiFetch<{ projects: any[] }>("/api/v1/projects"),
  getProject: (id: string) => apiFetch<{ project: any }>(`/api/v1/projects/${id}`),
};
```

4. Create `apps/web/store/project.store.ts`:
```typescript
import { create } from "zustand";

type ProjectStore = {
  selectedProjectId: string | null;
  setSelectedProject: (id: string | null) => void;
};

export const useProjectStore = create<ProjectStore>((set) => ({
  selectedProjectId: null,
  setSelectedProject: (id) => set({ selectedProjectId: id }),
}));
```

5. Create the home page (`apps/web/app/page.tsx`) with:
   - URL input field
   - Tone selector (marketing / investor / user_onboarding / tutorial)
   - "Generate Demo" button
   - On submit: call `POST /api/v1/projects` then redirect to `/projects/[id]`

6. Create `apps/web/app/projects/[id]/page.tsx` with:
   - `PipelineStatus` component — polls SSE `/api/v1/projects/:id/status`
   - Shows stage progress bar (queued → analyzing → scripting → recording → voicing → rendering → completed)
   - When `completed`: shows video player with the MP4 URL + download button

7. Create `apps/web/hooks/useProjectStatus.ts`:
```typescript
"use client";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type JobStatus = {
  projectId: string;
  stage: string;
  progress: number;
};

export function useProjectStatus(projectId: string) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!projectId || done) return;

    const es = new EventSource(`${API_URL}/api/v1/projects/${projectId}/status`);
    es.onmessage = (e) => {
      const data: JobStatus = JSON.parse(e.data);
      setStatus(data);
      if (data.stage === "completed" || data.stage === "failed") {
        setDone(true);
        es.close();
      }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [projectId, done]);

  return { status, done };
}
```

---

## TASK 5.6 — End-to-End Test

### Manual test (no script needed):

1. Start everything:
```bash
docker compose up -d
pnpm dev
```

2. Open `http://localhost:3000`
3. Paste a real URL (e.g. `https://linear.app`)
4. Select tone: `marketing`
5. Click "Generate Demo"
6. Watch the progress bar move through: queued → analyzing → scripting → recording → voicing → rendering → completed
7. Video player appears — click play
8. Video plays with narration + captions

---

## PHASE 5 COMPLETION CHECKLIST

- [ ] `pnpm typecheck` passes across all packages
- [ ] `pnpm dev` starts both api (3001) and web (3000) without error
- [ ] `POST /api/v1/projects` triggers the full pipeline
- [ ] SSE endpoint streams status updates in real time
- [ ] UI shows live progress bar with stage labels
- [ ] Completed project shows playable video
- [ ] Full run completes in < 10 minutes for a simple app
- [ ] No unhandled promise rejections in API logs

---

## FINAL PROJECT COMPLETION CHECKLIST

Before calling this v1.0:

- [ ] Phase 1–5 all complete
- [ ] Works end-to-end on 3 different real URLs
- [ ] All TypeScript strict errors resolved
- [ ] `.env.example` documents every variable
- [ ] `README.md` has setup instructions
- [ ] Output directory cleaned up between runs (no leftover segments)
- [ ] Error states shown in UI (failed stage, error message)
- [ ] Video download button works

**You have built Demo Copilot MVP. 🎬**
