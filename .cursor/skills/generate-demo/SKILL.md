---
name: generate-demo
description: >-
  Use Demo Copilot (this repo) to produce a top-tier, engaging product demo from any
  public product URL. Run when the user invokes /generate-demo or wants a cinematic
  marketing-style demo driven by the Demo Copilot pipeline.
disable-model-invocation: true
---

# Generate product demo (Demo Copilot)

You are guiding a **Demo Copilot** run: an agentic pipeline (analyze site → script → Playwright record → ElevenLabs voice → sync → MP4 render) defined in this monorepo (`apps/api`, `apps/web`).

## Outcome

A **cohesive, high-impact demo narrative** for *any* product the user cares about, backed by the automated pipeline—not a generic screen recording. Prioritize one clear story arc: hook → value → proof → CTA.

## Before starting

1. **Base URL** — Local default: API `http://localhost:3001` (or `API_URL` / deployed origin). Web UI: `http://localhost:3000` unless `WEB_URL` / hosting says otherwise.
2. **Stack up** — Redis + Postgres + workers must be running (`docker compose`, `pnpm dev`, Prisma `db:push`). See repo `README.md`.
3. **Keys** — `.env` needs LLM (`ANTHROPIC_API_KEY` or `OPENROUTER_API_KEY`) and `ELEVENLABS_API_KEY` (and voice id if required). FFmpeg on PATH; Playwright Chromium installed for `api`.
4. **URL must be reachable** — Prefer a **stable, public** URL. Logged-in-only or heavy bot-blocking sites may fail or produce weak flows; say so early and suggest staging, marketing site, or Loom-style landing page.

## Discover inputs (do not skip)

Ask or infer, then confirm:

| Question | Maps to |
|----------|---------|
| Product URL | `POST /api/v1/projects` body `url` |
| Friendly label (optional) | `name` |
| Audience & intent | `tone`: `investor` \| `user_onboarding` \| `marketing` \| `tutorial` |

**Tone guide**

- **investor** — Outcome, traction, differentiation, concise.
- **user_onboarding** — First success path, clarity, reduced jargon.
- **marketing** — Benefit-led, emotional hook, bold CTA (default in API).
- **tutorial** — Step-by-step, teaching pace.

## Quality bar (your responsibility before/after API call)

- **Single spine**: one primary user journey the script can follow; deprioritize edge features.
- **Hook in first seconds**: problem or promise, not “welcome to our dashboard.”
- **Concrete visuals**: scenes should imply real UI actions (clicks, forms, nav) the recorder can perform.
- **CTA**: explicit next step (sign up, book demo, try feature).
- If the user’s brief is vague, propose a **default narrative** and tone; get a one-line yes.

## Create the run

`POST {API_ORIGIN}/api/v1/projects`

```json
{
  "url": "https://example.com/product",
  "name": "Optional display name",
  "tone": "marketing"
}
```

- On success, note `project.id` from the response.
- Pipeline is asynchronous (BullMQ workers). Poll `GET {API_ORIGIN}/api/v1/projects/:id` until `status` is `completed` or `failed`.
- Optional live updates: `GET {API_ORIGIN}/api/v1/projects/:id/status` (SSE).

Statuses (in order): `queued` → `analyzing` → `scripting` → `recording` → `voicing` → `syncing` → `rendering` → `completed` | `failed`.

## After completion

- Read the returned `project` (and nested latest `runs` if present). `videoUrl` may be a **server filesystem path** today—clarify for the user how they access the file in their environment (local disk vs future object storage).
- Summarize **what story** the demo tells and **what to improve** next (alternate tone, different URL, shorter path).

## Human path

Users may prefer the **Next.js control panel** (`apps/web`): create/list projects there while the same API runs underneath.

## If something fails

- Check API logs and worker console for stage that stuck.
- Re-read `README.md` and `.env.example` for missing services or keys.

Stay within this workflow; do not invent endpoints beyond what exists in `apps/api/src/routes/`.
