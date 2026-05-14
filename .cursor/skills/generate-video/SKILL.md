---
name: generate-video
description: >-
  Use Demo Copilot (this repo) to produce a final demo video (MP4) from a product URL
  via the API pipeline and workers. Run when the user invokes /generate-video or
  explicitly wants the rendered video artifact, not just narrative planning.
disable-model-invocation: true
---

# Generate demo video (Demo Copilot)

You are operating **Demo Copilot** to deliver a **rendered demo video** (MP4) from a product URL using this repository’s Fastify API and BullMQ orchestration (`apps/api/src/modules/orchestrator`).

## API contract

- **Create job**: `POST {API_ORIGIN}/api/v1/projects` with JSON body:
  - `url` (string, required, valid URL)
  - `name` (optional)
  - `tone` (optional): `investor` | `user_onboarding` | `marketing` | `tutorial` — defaults to `marketing` server-side.

- **Poll state**: `GET {API_ORIGIN}/api/v1/projects/:id` — inspect `status` and `videoUrl` on the project when complete.

- **Stream progress** (optional): `GET {API_ORIGIN}/api/v1/projects/:id/status` — SSE; payloads include `stage` and `progress` (0–100).

Resolve `API_ORIGIN` from the user’s environment: deployed `API_URL`, or local `http://localhost:3001` / `NEXT_PUBLIC_API_URL` as in `.env.example`.

## Preconditions (verify or instruct)

1. **Infrastructure**: PostgreSQL + Redis (e.g. `docker compose up -d`), Prisma schema applied (`pnpm --filter=@demo-copilot/db db:push`).
2. **Processes**: API with workers started (e.g. `pnpm dev` from repo root so `startWorkers()` runs—see `apps/api/src/index.ts`).
3. **Secrets**: `.env` per `.env.example` — LLM key, `ELEVENLABS_API_KEY`, optional storage keys if the deployment uses them.
4. **Renderer stack**: FFmpeg available; Playwright Chromium installed for the `api` package; `RENDER_BACKEND` (`hyperframes` default) and related env if non-default.

## Execution flow for the agent

1. Confirm **canonical product URL** and **tone** with the user (or apply defaults and state them).
2. `POST /api/v1/projects` — capture `project.id` (and `jobId` string if returned, for human reference only).
3. Poll project until terminal state:
   - **`completed`**: report `videoUrl` and total duration if available from `runs[0].durationMs` / timeline metadata in DB response.
   - **`failed`**: instruct to check API/worker logs; common causes include unreachable URL, Redis/DB down, missing API keys, Playwright timeouts, render CLI failure.

## Pipeline stages (for user-visible progress)

`queued` → `analyzing` → `scripting` → `recording` → `voicing` → `syncing` → `rendering` → `completed` | `failed`

Explain briefly what each stage means if the user is waiting.

## Output expectations

- Today, `videoUrl` may be a **local path** on the machine running the API (see `OUTPUT_DIR` in `.env.example`). Tell the user exactly that and how to retrieve or serve the file in their setup.
- Do not promise CDN URLs unless the deployment actually uploads to S3/Supabase and the API returns a public URL.

## Curl examples (adapt origin)

```bash
curl -sS -X POST "$API_ORIGIN/api/v1/projects" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://example.com\",\"tone\":\"marketing\"}"
```

```bash
curl -sS "$API_ORIGIN/api/v1/projects/PROJECT_ID"
```

## Relationship to `/generate-demo`

- **`generate-demo`**: broader product/narrative coaching + same pipeline.
- **`generate-video`**: this skill—**operator focus** on infra, API, polling, MP4 delivery, and failure triage.

Do not fabricate routes; only use handlers registered under `apps/api/src/routes/`.
