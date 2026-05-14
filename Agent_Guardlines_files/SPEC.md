# DEMO COPILOT — MASTER TECHNICAL SPEC
> Agent-optimized. Read this fully before writing any code.

---

## 1. WHAT YOU ARE BUILDING

An AI pipeline that takes a live web app URL and outputs a cinematic MP4 product demo video — automatically. No human editing. No manual recording.

**Pipeline summary:**
```
URL → Analyze UI → Plan narrative → Automate browser → Record video → Generate voice → Sync timeline → Render MP4
```

**Final render (compositing):** Prefer **[HyperFrames](https://hyperframes.heygen.com/)** (HeyGen): declarative HTML/CSS/JS compositions + `hyperframes render` → MP4. **Remotion** remains an optional React-based path documented in Phase 4.

---

## 2. MONOREPO STRUCTURE

Use `pnpm` workspaces + Turborepo. Create this exact structure:

```
demo-copilot/
├── apps/
│   ├── web/                        # Next.js 14 (App Router) — Control Panel UI
│   └── api/                        # Node.js + Fastify — Core Orchestrator
├── packages/
│   ├── types/                      # Shared TypeScript types (source of truth)
│   └── db/                         # Prisma schema + client
├── tasks/                          # Agent phase files (do not modify)
├── .env.example                    # All required env vars (see Section 5)
├── turbo.json
├── pnpm-workspace.yaml
├── CLAUDE.md
├── .cursorrules
└── SPEC.md
```

### apps/web/ structure
```
apps/web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Home: URL input form
│   ├── projects/
│   │   ├── page.tsx                # Project list
│   │   └── [id]/
│   │       ├── page.tsx            # Project detail + status
│   │       └── video/
│   │           └── page.tsx        # Video player + export
│   └── api/
│       └── [...]/                  # Next.js route handlers (proxy to api app)
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── project/
│   │   ├── CreateProjectForm.tsx
│   │   ├── ProjectCard.tsx
│   │   ├── PipelineStatus.tsx      # Real-time job progress
│   │   └── VideoPlayer.tsx
│   └── layout/
│       ├── Header.tsx
│       └── Sidebar.tsx
├── lib/
│   ├── api-client.ts               # Typed fetch wrapper for api app
│   └── utils.ts
├── store/
│   └── project.store.ts            # Zustand store
├── hooks/
│   └── useProjectStatus.ts         # Polling hook for job status
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

### apps/api/ structure
```
apps/api/
├── src/
│   ├── index.ts                    # Fastify server entry point
│   ├── routes/
│   │   ├── projects.ts             # CRUD for projects
│   │   └── jobs.ts                 # Job status endpoints
│   ├── modules/
│   │   ├── analyzer/
│   │   │   ├── index.ts            # Product Analyzer module
│   │   │   ├── dom-scraper.ts      # Playwright DOM extraction
│   │   │   └── flow-builder.ts     # Flow graph construction
│   │   ├── script/
│   │   │   ├── index.ts            # Demo Script Engine
│   │   │   └── prompts.ts          # All LLM prompts (centralized)
│   │   ├── automation/
│   │   │   ├── index.ts            # Browser Automation Engine
│   │   │   ├── executor.ts         # Action executor
│   │   │   └── recorder.ts         # Screen capture
│   │   ├── voice/
│   │   │   ├── index.ts            # Voice Engine
│   │   │   └── sync.ts             # Timeline sync logic
│   │   ├── renderer/
│   │   │   ├── index.ts            # Rendering Engine
│   │   │   └── timeline.ts         # Timeline builder
│   │   └── orchestrator/
│   │       ├── index.ts            # Main pipeline coordinator
│   │       └── queue.ts            # BullMQ queue definitions
│   ├── lib/
│   │   ├── prisma.ts               # Prisma client singleton
│   │   ├── redis.ts                # Redis client singleton
│   │   ├── llm.ts                  # LLM client (Anthropic SDK)
│   │   ├── elevenlabs.ts           # ElevenLabs client
│   │   ├── storage.ts              # S3/Supabase storage client
│   │   └── hyperframes.ts          # Invoke HyperFrames CLI (see §14)
│   └── types/                      # Local API types (re-exports from packages/types)
├── prisma/
│   └── schema.prisma
├── tsconfig.json
└── package.json
```

---

## 3. COMPLETE TYPESCRIPT TYPES
> File: `packages/types/src/index.ts`
> Every module imports from here. Never duplicate types.

```typescript
// ─── Product Analysis ────────────────────────────────────────────────────────

export type Page = {
  url: string;
  title: string;
  components: Component[];
};

export type Component = {
  type: "button" | "form" | "nav" | "input" | "modal" | "card" | "table" | "other";
  selector: string;
  label: string;
  isInteractive: boolean;
};

export type Interaction = {
  trigger: string;         // CSS selector
  action: "click" | "type" | "scroll" | "hover";
  label: string;
};

export type UserFlow = {
  id: string;
  name: string;
  steps: FlowStep[];
  valueScore: number;      // 0–1, AI-assigned importance
};

export type FlowStep = {
  pageUrl: string;
  action: Interaction;
  description: string;
};

export type ProductMap = {
  pages: Page[];
  flows: UserFlow[];
  primaryValuePaths: UserFlow[];
  appType: "dashboard" | "saas" | "tool" | "marketplace" | "other";
};

// ─── Script / Narrative ──────────────────────────────────────────────────────

export type DemoTone = "investor" | "user_onboarding" | "marketing" | "tutorial";

export type Scene = {
  id: string;
  title: string;
  narration: string;
  actions: BrowserAction[];
  visualFocus: string;        // CSS selector or area description
  durationMs: number;         // estimated
  transition: "cut" | "fade" | "zoom_in" | "zoom_out";
};

export type DemoScript = {
  productName: string;
  hook: string;
  tone: DemoTone;
  scenes: Scene[];
  closingCTA: string;
  estimatedDurationMs: number;
};

// ─── Browser Actions ─────────────────────────────────────────────────────────

export type BrowserAction =
  | { type: "navigate"; url: string }
  | { type: "click"; selector: string; label?: string }
  | { type: "type"; selector: string; text: string }
  | { type: "wait"; ms: number }
  | { type: "scroll"; direction: "up" | "down"; px?: number }
  | { type: "hover"; selector: string }
  | { type: "screenshot"; label: string };

// ─── Voice / Audio ───────────────────────────────────────────────────────────

export type VoiceStyle = "startup_hype" | "neutral" | "enterprise" | "friendly";

export type WordTiming = {
  word: string;
  startMs: number;
  endMs: number;
};

export type VoiceOutput = {
  sceneId: string;
  audioUrl: string;
  durationMs: number;
  wordTimings: WordTiming[];
};

// ─── Timeline ────────────────────────────────────────────────────────────────

export type Caption = {
  text: string;
  startMs: number;
  endMs: number;
};

export type Transition = {
  type: "fade" | "cut" | "zoom_in" | "zoom_out" | "slide";
  durationMs: number;
};

export type TimelineScene = {
  sceneId: string;
  videoSegmentUrl: string;
  audioSegmentUrl: string;
  captions: Caption[];
  transition: Transition;
  startMs: number;
  endMs: number;
};

export type Timeline = {
  scenes: TimelineScene[];
  totalDurationMs: number;
  fps: number;
  resolution: { width: number; height: number };
};

// ─── Jobs / Orchestration ────────────────────────────────────────────────────

export type PipelineStage =
  | "queued"
  | "analyzing"
  | "scripting"
  | "recording"
  | "voicing"
  | "syncing"
  | "rendering"
  | "completed"
  | "failed";

export type JobStatus = {
  projectId: string;
  stage: PipelineStage;
  progress: number;           // 0–100
  message: string;
  error?: string;
};

export type RenderBackend = "hyperframes" | "remotion";

// ─── DB Models (mirrors Prisma) ───────────────────────────────────────────────

export type Project = {
  id: string;
  url: string;
  name: string;
  tone: DemoTone;
  status: PipelineStage;
  videoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type DemoRun = {
  id: string;
  projectId: string;
  script?: DemoScript;
  timeline?: Timeline;
  videoUrl?: string;
  durationMs?: number;
  createdAt: Date;
};
```

---

## 4. DATABASE SCHEMA
> File: `packages/db/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Project {
  id        String   @id @default(cuid())
  url       String
  name      String   @default("")
  tone      String   @default("marketing")
  status    String   @default("queued")
  videoUrl  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  runs      DemoRun[]
}

model DemoRun {
  id         String   @id @default(cuid())
  projectId  String
  script     Json?
  timeline   Json?
  videoUrl   String?
  durationMs Int?
  createdAt  DateTime @default(now())
  project    Project  @relation(fields: [projectId], references: [id])
}
```

---

## 5. ENVIRONMENT VARIABLES
> Create `.env.example` at root. Copy to `.env` before running.

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/demo_copilot"

# Redis
REDIS_URL="redis://localhost:6379"

# AI
ANTHROPIC_API_KEY="sk-ant-..."

# Voice
ELEVENLABS_API_KEY="..."
ELEVENLABS_VOICE_ID="..."          # Default voice ID

# Storage (choose one)
SUPABASE_URL="..."
SUPABASE_SERVICE_KEY="..."
# OR
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"
AWS_S3_BUCKET="demo-copilot-assets"

# App
API_PORT=3001
WEB_PORT=3000
API_URL="http://localhost:3001"
NEXT_PUBLIC_API_URL="http://localhost:3001"

# Video output
OUTPUT_DIR="/tmp/demo-copilot-output"
VIDEO_RESOLUTION_WIDTH=1920
VIDEO_RESOLUTION_HEIGHT=1080
VIDEO_FPS=30

# Final compositor: hyperframes | remotion (see §14 HyperFrames)
RENDER_BACKEND="hyperframes"
HYPERFRAMES_PROJECTS_DIR="hyperframes-projects"
# HYPERFRAMES_NPX="npx"
```

---

## 6. API ENDPOINTS
> All prefixed with `/api/v1`

```
POST   /projects                    Create project + enqueue pipeline
GET    /projects                    List all projects
GET    /projects/:id                Get project + latest run status
GET    /projects/:id/status         Poll job status (SSE stream)
POST   /projects/:id/regenerate     Re-run pipeline for project
GET    /projects/:id/script         Get generated script
GET    /projects/:id/timeline       Get timeline JSON
GET    /projects/:id/download       Redirect to video MP4 URL
DELETE /projects/:id                Delete project + assets
```

### Request/Response shapes

```typescript
// POST /projects
type CreateProjectRequest = {
  url: string;
  name?: string;
  tone?: DemoTone;
};
type CreateProjectResponse = {
  project: Project;
  jobId: string;
};

// GET /projects/:id/status (SSE)
// Emits: JobStatus objects as JSON lines
// Client should use EventSource API

// GET /projects/:id/script
type ScriptResponse = {
  script: DemoScript;
};
```

---

## 7. KEY PACKAGES
> Install these exactly. Do not substitute.

### api
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.0",
    "@prisma/client": "^5.18.0",
    "bullmq": "^5.12.0",
    "fastify": "^4.28.0",
    "@fastify/cors": "^9.0.0",
    "ioredis": "^5.4.1",
    "playwright": "^1.47.0",
    "fluent-ffmpeg": "^2.1.3",
    "elevenlabs": "^1.3.0",
    "zod": "^3.23.8",
    "pino": "^9.4.0"
  },
  "devDependencies": {
    "prisma": "^5.18.0",
    "typescript": "^5.6.0",
    "tsx": "^4.19.0"
  }
}
```

**HyperFrames:** Final render uses the **HyperFrames CLI** (`npx hyperframes render`, [quickstart](https://hyperframes.heygen.com/quickstart)). It is not required in `package.json` if workers have Node 22+ and network for `npx`. Pin with a devDependency if CI must be offline-stable.

### web
```json
{
  "dependencies": {
    "next": "14.2.14",
    "react": "^18.3.0",
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.56.0",
    "framer-motion": "^11.9.0",
    "tailwindcss": "^3.4.0",
    "shadcn-ui": "latest",
    "zod": "^3.23.8"
  }
}
```

---

## 8. LLM USAGE RULES
- Always use `claude-sonnet-4-20250514` (Anthropic)
- Always use structured JSON output with Zod validation
- Always wrap LLM calls in retry logic (max 3 attempts)
- Never put prompts inline — all prompts live in `modules/script/prompts.ts`
- Parse and validate all LLM responses before passing downstream
- If JSON parse fails, retry with: "Your previous response was not valid JSON. Return JSON only."

---

## 9. BROWSER AUTOMATION RULES
- Always use isolated browser contexts per scene
- Headless mode in production, headed in development
- Default timeout: 10,000ms per action
- On selector failure: retry with 3 fallback strategies (nth-child, text content, aria-label)
- Always capture at 1920×1080
- Record each scene as a separate MP4 chunk
- Store chunks to `OUTPUT_DIR/[projectId]/segments/scene-[id].mp4`

---

## 10. VIDEO RENDERING RULES
- **Default:** Use **[HyperFrames](https://hyperframes.heygen.com/)** for compositing: timed HTML/CSS/JS compositions, optional GSAP, assets under `assets/`, then `npx hyperframes render --output …` (see [quickstart](https://hyperframes.heygen.com/quickstart)). Orchestration calls `apps/api/src/lib/hyperframes.ts` → `runHyperframesRender`.
- **Alternate:** Remotion (React) compositing as documented in `PHASE_4.md` when `RENDER_BACKEND=remotion`.
- **Segment merge / encoding:** FFmpeg remains valid for Playwright segment concat and encodes; HyperFrames also requires FFmpeg on PATH for its CLI render.
- Output: H.264, AAC (when applicable), MP4 container; target **1920×1080 @ 30fps** unless composition metadata overrides.
- Final file path: `OUTPUT_DIR/[projectId]/final.mp4` (or beside the HyperFrames project per orchestrator choice).
- Upload to storage, update `Project.videoUrl` in DB.
- **Agent authoring:** Install HeyGen skills so agents emit valid compositions: `npx skills add heygen-com/hyperframes` ([quickstart](https://hyperframes.heygen.com/quickstart)).
- **Docs index:** `https://hyperframes.mintlify.app/llms.txt` (for agents discovering HF pages).

---

## 11. CODING STANDARDS
- TypeScript strict mode everywhere (`"strict": true`)
- No `any` types — use `unknown` and narrow
- All async functions use try/catch with typed errors
- Use Zod for all external data validation (LLM output, API input)
- Log with `pino` in api, `console` in web
- All file names: `kebab-case.ts`
- All components: `PascalCase.tsx`
- Export pattern: named exports only (no default exports in api)
- Never hardcode secrets — always read from `process.env`
- Run `pnpm typecheck` before considering any task complete

---

## 12. LOCAL DEVELOPMENT SETUP
```bash
# Prerequisites: Node 20+, pnpm 9+, Docker (Postgres + Redis), FFmpeg on PATH
# HyperFrames local renders recommend Node.js 22+ (see https://hyperframes.heygen.com/quickstart )

# 1. Install dependencies
pnpm install

# 2. Start infrastructure
docker compose up -d   # starts postgres + redis

# 3. Setup DB
pnpm --filter=@demo-copilot/db db:push

# 4. Install Playwright browsers
pnpm --filter=api exec playwright install chromium

# 5. (Optional) HyperFrames agent skills
npx skills add heygen-com/hyperframes

# 6. Start all apps
pnpm dev               # runs web + api concurrently via turbo

# 7. API runs on :3001, Web runs on :3000
```

---

## 13. DOCKER COMPOSE (for local infra only)
> File: `docker-compose.yml` at root

```yaml
version: "3.8"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: demo_copilot
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

---

## 14. HYPERFRAMES (HEYGEN) INTEGRATION

**Product:** [HyperFrames](https://hyperframes.heygen.com/) — compose videos by writing HTML, CSS, and JS; AI-friendly; Apache 2.0.

**Why here:** Playwright captures **authentic product UI**; HyperFrames composes **captions, motion graphics, bumpers, and multi-track timing** into a single MP4 without building a custom frame server.

**Workflow:**
1. Pipeline stages through **voicing / timeline sync** unchanged (`packages/types` `Timeline`, etc.).
2. Emit a HyperFrames project under `OUTPUT_DIR/[projectId]/` or `OUTPUT_DIR/${HYPERFRAMES_PROJECTS_DIR}/[projectId]/`: `meta.json`, `index.html`, `compositions/*.html`, copy **scene video/audio** into `assets/`.
3. Call `runHyperframesRender({ projectDir, outputFile })` from `apps/api/src/lib/hyperframes.ts` (wraps `npx hyperframes render --output …`). On Windows, `npx.cmd` is used unless `HYPERFRAMES_NPX` is set.
4. Set `RENDER_BACKEND=hyperframes` (default in `.env.example`). Use `remotion` only if implementing the Remotion path in Phase 4.

**Environment (see `.env.example`):** `RENDER_BACKEND`, `HYPERFRAMES_PROJECTS_DIR`, optional `HYPERFRAMES_NPX`.

**Types:** `RenderBackend` in `packages/types/src/index.ts`.

**References:**
- [HyperFrames home](https://hyperframes.heygen.com/)
- [Quickstart](https://hyperframes.heygen.com/quickstart) (`npx hyperframes init`, `preview`, `render`)
- Agent skill: `npx skills add heygen-com/hyperframes`
