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

**Stripe billing** (pay-per-video + subscriptions — required for ElevenHacks × Stripe):

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `WEB_URL`
- Six Price IDs: `STRIPE_PRICE_VIDEO_SINGLE`, `STRIPE_PRICE_VIDEO_PACK_5`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM`, `STRIPE_PRICE_AGENCY/STRIPE_PRICE_ENTERPRISE`

Create products in [Stripe Dashboard](https://dashboard.stripe.com/test/products) (test mode). On each **subscription** price, add metadata `plan_tier` = `starter` | `pro` | `team` | `agency`.

Create products/prices in your Stripe account and write Price IDs to `.env`:

```bash
pnpm --filter=api stripe:setup -- --write
```

If prices already exist in Stripe but `.env` has wrong or stale `price_…` IDs, sync from your account:

```bash
pnpm --filter=api stripe:sync -- --write
```

Validate Stripe env (secret key + every `STRIPE_PRICE_*`):

```bash
pnpm --filter=api stripe:check
```

Local webhooks (install [Stripe CLI](https://stripe.com/docs/stripe-cli)):

```bash
stripe listen --forward-to localhost:3001/api/v1/billing/webhook
```

Copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET` in `.env`, then restart the API.

**Credits stay at 0 after paying?** Stripe Checkout can succeed before the API receives a webhook (typical in local dev without `stripe listen`). The app now calls `POST /api/v1/billing/confirm-checkout` from `/billing/success` using `session_id` in the URL, so credits apply even without webhooks. For production, still configure a Stripe Dashboard webhook endpoint pointing at `https://your-api/api/v1/billing/webhook` with event `checkout.session.completed`.

**Cursor + Stripe MCP** (optional): do not commit API keys. Copy `.cursor/mcp.json.example` to `.cursor/mcp.json` and paste `STRIPE_SECRET_KEY` from `.env`, or run `.\scripts\run-stripe-mcp.ps1` (stdio MCP via `npx @stripe/mcp`).

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

#### To run both API and Web together (monorepo development):

```bash
pnpm dev
```

- **Web App**: http://localhost:3000
- **API Server**: http://localhost:3001

#### To run servers separately:

In one terminal, start the API server:
```bash
pnpm --filter=api dev
```
*(API runs at http://localhost:3001)*

In another terminal, start the Web server:
```bash
pnpm --filter=web dev
```
*(Web runs at http://localhost:3000)*

### Smoke test

- API: open http://localhost:3001/health — expect `{"status":"ok",...}`  
- UI: open http://localhost:3000 — submit a URL to enqueue a run (needs valid AI + voice keys for the full job to finish).
- Billing: http://localhost:3000/pricing — test Checkout with card `4242 4242 4242 4242`. New browsers get **1 free demo credit**.

### Troubleshooting

| Symptom | What to check |
|--------|----------------|
| RSC / “app-router.js#” / Client Manifest errors | Path contains **`#`**. Rename/move the repo or use **`subst`** (see **Critical** above). |
| `DATABASE_URL` errors on `db:push` | `.env` exists at **repo root**; Postgres container is `Up` (`docker compose ps`). |
| UI cannot reach API | `NEXT_PUBLIC_API_URL=http://localhost:3001` in root `.env`; restart `pnpm dev`. |
| Jobs stuck / workers errors | Redis `Up`; same `REDIS_URL` in `.env`. |
| Playwright fails | Run `pnpm --filter=api exec playwright install chromium`. |
| Windows + `OUTPUT_DIR=/tmp/...` | Prefer a Windows path in `.env` (e.g. under the repo `tmp/` folder) or ensure that folder exists. |
| Checkout works but credits not added | Run `stripe listen --forward-to localhost:3001/api/v1/billing/webhook` and set `STRIPE_WEBHOOK_SECRET`. |
| `402 PAYWALL` on generate | Buy credits at `/pricing` or use your free credit (1 per browser org). |

### Typecheck

```bash
pnpm typecheck
```

## Architecture
- `apps/web`: Next.js 14 frontend control panel (pricing, Stripe Checkout, credits badge).
- `apps/api`: Fastify backend orchestration with BullMQ + Stripe billing webhooks.
- `packages/db`: Shared Prisma database schemas (`Organization`, `CreditLedger`, `Project`).
- `packages/types`: Shared TypeScript definitions (including billing types).

*Submitted for [ElevenHacks Hackathon #7](https://hacks.elevenlabs.io/hackathons/7) and [Hackathon #8](https://hacks.elevenlabs.io/hackathons/8) — Built for ElevenHacks using Cursor + Stripe + ElevenLabs*
