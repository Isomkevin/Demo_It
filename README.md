# Demo Copilot 🎬

An agentic AI pipeline that generates cinematic product demos from any URL.

## The idea (pitch in one breath)

**Problem:** Product teams need polished demo videos (for investors, onboarding, marketing), but producing them means scriptwriting, screen recording, voiceover, editing, and captions—slow and expensive.

**Demo Copilot:** You paste a **live product URL**. The system **scrapes and understands the UI**, an **LLM plans a short demo story** with concrete browser actions, **Playwright records the screen** while simulating those actions, **ElevenLabs narrates** each scene, and the pipeline **merges video + voice + captions** into a **single MP4** you can download from the web UI.

**Why it fits ElevenHack:** It chains **ElevenLabs** (voice) with **browser automation + AI planning** so the output feels like a human-produced walkthrough—not a silent screen cap.

## Features
- **AI UI Analysis**: Understands any webpage structure and extracts user flows.
- **Storytelling Engine**: Writes engaging marketing scripts based on UI flows.
- **Headless Automation**: Uses Playwright to simulate user interactions and record video.
- **Voice Synthesis**: Generates high-quality AI narration using ElevenLabs.
- **Cinematic Rendering**: Tries HyperFrames CLI when configured; otherwise composes a final MP4 with FFmpeg (bundled `ffmpeg-static` for the API) using the timeline (video + narration + captions).

## Local Setup

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL & Redis)

### Critical: your project folder must not contain `#`

If the repo lives under a path like `...\ElevenHack #8 Cursor\...`, **Next.js can fail** with errors such as:

- `Module not found: ... favicon.ico?__next_metadata__`
- `Could not find the module "...app-router.js#" in the React Client Manifest`

The **`#`** is treated like a **URL fragment** inside bundler-generated URLs, so module IDs break. **Renaming or moving the folder** (remove `#` from every parent directory name) is the real fix, for example:

- `C:\dev\Demo_It`  
- `C:\Users\Administrator\Desktop\ElevenHack-8-Cursor\Demo_It`

**Workaround without renaming (Windows):** map a drive letter to the folder so your *current* path has no `#`:

```powershell
subst D: "C:\Users\Administrator\Desktop\ElevenHack #8 Cursor\Demo_It"
cd D:\
pnpm install
pnpm dev
```

When finished: `subst D: /d`

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Variables

Copy the example environment file and fill in your keys:

```bash
cp .env.example .env
```

On **Windows (PowerShell)**:

```powershell
Copy-Item .env.example .env
```

Keep **one `.env` at the repo root** (same folder as `package.json`). The API and web dev server both read it.

Required keys for the **full** pipeline (analyze → script → record → voice → render):

- `ANTHROPIC_API_KEY` **or** `OPENROUTER_API_KEY` (see `apps/api/src/lib/llm.ts`)
- `ELEVENLABS_API_KEY` (+ optional `ELEVENLABS_VOICE_ID`)

For **Docker + DB only**, the defaults in `.env.example` for `DATABASE_URL` and `REDIS_URL` match `docker-compose.yml`.

### 3. Start Infrastructure

Start the database and Redis instances:

```bash
docker compose up -d
```

Initialize the database schema (loads root `.env` automatically):

```bash
pnpm db:push
```

### 4. Playwright Setup

Install the necessary Playwright browsers:

```bash
pnpm --filter=api exec playwright install chromium
```

### 5. Start Development Servers

Run the full monorepo (API and Web):

```bash
pnpm dev
```

- **Web App**: http://localhost:3000
- **API Server**: http://localhost:3001

### Smoke test

- API: open http://localhost:3001/health — expect `{"status":"ok",...}`  
- UI: open http://localhost:3000 — submit a URL to enqueue a run (needs valid AI + voice keys for the full job to finish).

### Troubleshooting

| Symptom | What to check |
|--------|----------------|
| RSC / “app-router.js#” / Client Manifest errors | Path contains **`#`**. Rename/move the repo or use **`subst`** (see **Critical** above). |
| `DATABASE_URL` errors on `db:push` | `.env` exists at **repo root**; Postgres container is `Up` (`docker compose ps`). |
| UI cannot reach API | `NEXT_PUBLIC_API_URL=http://localhost:3001` in root `.env`; restart `pnpm dev`. |
| Jobs stuck / workers errors | Redis `Up`; same `REDIS_URL` in `.env`. |
| Playwright fails | Run `pnpm --filter=api exec playwright install chromium`. |
| Windows + `OUTPUT_DIR=/tmp/...` | Prefer a Windows path in `.env` (e.g. under the repo `tmp/` folder) or ensure that folder exists. |

### Typecheck

```bash
pnpm typecheck
```

## Architecture
- `apps/web`: Next.js 14 frontend control panel.
- `apps/api`: Fastify backend orchestration with BullMQ.
- `packages/db`: Shared Prisma database schemas.
- `packages/types`: Shared TypeScript definitions.

*Built for ElevenHack #8*
