import { Worker, type Job } from "bullmq";
import { redis } from "../../lib/redis";
import { prisma } from "../../lib/prisma";
import { analyzeProduct } from "../analyzer";
import { generateScript } from "../script";
import { recordAllScenes } from "../automation";
import { generateAllNarrations } from "../voice";
import { buildTimeline } from "../voice/sync";
import { renderTimelineToMP4 } from "../renderer";
import type { RenderBackend } from "@demo-copilot/types";
import {
  QUEUE_NAMES,
  scriptQueue, automationQueue, voiceQueue, renderQueue,
  type AnalyzeJobData, type ScriptJobData,
  type AutomationJobData, type VoiceJobData, type RenderJobData,
} from "./queue";
import type { DemoScript, DemoTone, PipelineStage } from "@demo-copilot/types";
import path from "node:path";
import { resolveOutputDir } from "../../lib/output-dir";
import { consumeCreditForProject } from "../../lib/billing/credits";
import { getExportProfile } from "../../lib/billing/plan-features";
import { DEFAULT_VOICE_ID } from "../../lib/elevenlabs";

const OUTPUT_DIR = resolveOutputDir();
const workerOpts = { connection: redis };

// ─── Status Helper ────────────────────────────────────────────────────────────
async function updateStatus(projectId: string, stage: PipelineStage, message = "") {
  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: stage,
      ...(stage !== "failed" ? { errorMessage: null } : {}),
    },
  });
  console.log(`[Pipeline] [${projectId}] ${stage}: ${message}`);
}

async function markProjectFailed(projectId: string, err: Error) {
  const errorMessage = (err.message || String(err)).slice(0, 500);
  await prisma.project.update({
    where: { id: projectId },
    data: { status: "failed", errorMessage },
  });
}

async function markFailedIfExhausted(
  job: Job<{ projectId: string }> | undefined,
  err: Error,
  label: string
) {
  if (!job?.data?.projectId) return;
  const max = job.opts.attempts ?? 1;
  if (job.attemptsMade < max) return;
  console.error(`[Pipeline] [${job.data.projectId}] ${label} failed permanently:`, err);
  try {
    await markProjectFailed(job.data.projectId, err);
  } catch (e) {
    console.error("[Pipeline] Could not set failed status:", e);
  }
}

// ─── Worker 1: Analyze ────────────────────────────────────────────────────────
const analyzeWorker = new Worker<AnalyzeJobData>(QUEUE_NAMES.ANALYZE, async (job) => {
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
analyzeWorker.on("failed", (job, err) => void markFailedIfExhausted(job, err, "analyze"));

// ─── Worker 2: Script ─────────────────────────────────────────────────────────
const scriptWorker = new Worker<ScriptJobData>(QUEUE_NAMES.SCRIPT, async (job) => {
  const { projectId, url, tone } = job.data;
  await updateStatus(projectId, "scripting");

  const raw = await redis.get(`project:${projectId}:productMap`);
  if (!raw) throw new Error("productMap not found in cache");
  const productMap = JSON.parse(raw);

  const script = await generateScript(productMap, url, tone as DemoTone);
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
scriptWorker.on("failed", (job, err) => void markFailedIfExhausted(job, err, "script"));

// ─── Worker 3: Automation ─────────────────────────────────────────────────────
const automationWorker = new Worker<AutomationJobData>(QUEUE_NAMES.AUTOMATION, async (job) => {
  const { projectId, url } = job.data;
  await updateStatus(projectId, "recording");

  const raw = await redis.get(`project:${projectId}:script`);
  if (!raw) throw new Error("script not found in cache");
  const script: DemoScript = JSON.parse(raw);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { org: true },
  });
  const exportProfile = getExportProfile(project?.org?.plan ?? "FREE");

  const videoMap = await recordAllScenes(script, projectId, url, OUTPUT_DIR, {
    width: exportProfile.width,
    height: exportProfile.height,
  });
  await redis.set(`project:${projectId}:videoMap`, JSON.stringify(videoMap), "EX", 3600);

  await voiceQueue.add("voice", { projectId }, {
    jobId: `voice-${projectId}`,
    attempts: 3,
  });
}, workerOpts);
automationWorker.on("failed", (job, err) => void markFailedIfExhausted(job, err, "recording"));

// ─── Worker 4: Voice ─────────────────────────────────────────────────────────
const voiceWorker = new Worker<VoiceJobData>(QUEUE_NAMES.VOICE, async (job) => {
  const { projectId } = job.data;
  await updateStatus(projectId, "voicing");

  const raw = await redis.get(`project:${projectId}:script`);
  if (!raw) throw new Error("script not found");
  const script: DemoScript = JSON.parse(raw);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { org: true },
  });
  const voiceId = project?.org?.voiceId ?? DEFAULT_VOICE_ID;

  const voiceOutputs = await generateAllNarrations(script, projectId, OUTPUT_DIR, voiceId);
  await redis.set(`project:${projectId}:voiceOutputs`, JSON.stringify(voiceOutputs), "EX", 3600);

  await renderQueue.add("render", { projectId }, {
    jobId: `render-${projectId}`,
    attempts: 2,
  });
}, workerOpts);
voiceWorker.on("failed", (job, err) => void markFailedIfExhausted(job, err, "voice"));

// ─── Worker 5: Render ─────────────────────────────────────────────────────────
const renderWorker = new Worker<RenderJobData>(QUEUE_NAMES.RENDER, async (job) => {
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
  try {
    mp4Path = await renderTimelineToMP4(timeline, projectId, OUTPUT_DIR);
  } catch (err) {
    await markProjectFailed(projectId, err instanceof Error ? err : new Error(String(err)));
    throw err;
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

  await consumeCreditForProject(projectId);

  // Cleanup intermediate files
  try {
    const fs = require("fs/promises");
    for (const videoPath of Object.values(videoMap)) {
      await fs.unlink(videoPath).catch(() => {});
    }
    for (const voiceOutput of voiceOutputs) {
      await fs.unlink(voiceOutput.audioUrl).catch(() => {});
    }
    const audioDir = path.join(OUTPUT_DIR, projectId, "audio");
    await fs.rm(audioDir, { recursive: true, force: true }).catch(() => {});
    
    if (backend === "hyperframes") {
      const hfRoot = path.join(OUTPUT_DIR, process.env.HYPERFRAMES_PROJECTS_DIR || "hyperframes-projects", projectId);
      await fs.rm(hfRoot, { recursive: true, force: true }).catch(() => {});
    }
    
    await redis.del(`project:${projectId}:script`);
    await redis.del(`project:${projectId}:videoMap`);
    await redis.del(`project:${projectId}:voiceOutputs`);
    await redis.del(`project:${projectId}:productMap`);
    await redis.del(`project:${projectId}:runId`);
    console.log(`[Pipeline] Cleaned up intermediate files for ${projectId}`);
  } catch (err) {
    console.warn(`[Pipeline] Cleanup failed for ${projectId}:`, err);
  }

  console.log(`[Pipeline] ✓ Project ${projectId} complete: ${mp4Path}`);
}, workerOpts);
renderWorker.on("failed", (job, err) => void markFailedIfExhausted(job, err, "render"));

export function startWorkers() {
  console.log("[Orchestrator] All pipeline workers started");
}
