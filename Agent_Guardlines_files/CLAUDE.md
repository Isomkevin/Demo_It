# CLAUDE.md — Demo Copilot
> This file is read automatically by Claude Code at session start.
> It contains everything Claude needs to work on this project without asking questions.

---

## PROJECT IDENTITY
**Name:** Demo Copilot
**What it does:** Takes a web app URL → outputs a cinematic MP4 product demo video automatically
**Stage:** Greenfield. Building from scratch.
**Stack:** Next.js 14 + Node.js/Fastify + Playwright + ElevenLabs + Remotion + PostgreSQL + Redis + BullMQ

---

## CRITICAL RULES (never violate these)

1. **Read SPEC.md first** before writing any code. It defines types, structure, packages, and standards.
2. **All TypeScript types** live in `packages/types/src/index.ts`. Import from there. Never duplicate.
3. **All LLM prompts** live in `apps/api/src/modules/script/prompts.ts`. Never write prompts inline.
4. **Never use `any`** — use `unknown` and type-narrow properly.
5. **Always validate LLM JSON output with Zod** before using it.
6. **No default exports** in the api app. Named exports only.
7. **Run `pnpm typecheck`** after completing any task. Fix all errors before moving on.
8. **Never hardcode secrets.** Always use `process.env`.
9. Use `claude-sonnet-4-20250514` for all Anthropic API calls.
10. Each Playwright scene runs in an **isolated browser context** — no state leakage.

---

## FILE STRUCTURE (quick reference)

```
demo-copilot/
├── apps/web/          → Next.js UI (port 3000)
├── apps/api/          → Fastify API + pipeline (port 3001)
├── packages/types/    → Shared TS types (single source of truth)
├── packages/db/       → Prisma schema + client
└── tasks/             → Phase files (read-only, do not modify)
```

---

## CURRENT BUILD PHASE

Check `tasks/` folder for the active phase file. Complete tasks in order. Do not skip ahead.

Phase order:
1. `PHASE_1.md` — Monorepo setup + Playwright recorder + basic MP4 export
2. `PHASE_2.md` — LLM analyzer + script engine + scene planner
3. `PHASE_3.md` — ElevenLabs voice + timeline sync
4. `PHASE_4.md` — Remotion rendering engine
5. `PHASE_5.md` — Full orchestration pipeline + UI

---

## HOW TO START A SESSION

1. Run: `cat SPEC.md` — review types and architecture
2. Run: `cat tasks/PHASE_N.md` — identify current phase
3. Check git log or file timestamps to understand what's already built
4. Pick the first incomplete task in the phase file and begin
5. Run `pnpm typecheck` and `pnpm build` frequently to catch regressions

---

## HOW TO RUN THE PROJECT

```bash
# Start infrastructure
docker compose up -d

# Install deps (if first time)
pnpm install

# Push DB schema
pnpm --filter=@demo-copilot/db db:push

# Install Playwright browsers (if first time)
pnpm --filter=api exec playwright install chromium

# Start dev servers
pnpm dev
```

---

## KEY API PATTERNS

### LLM call pattern (always follow this)
```typescript
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic();

async function callLLM<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) continue;

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return schema.parse(parsed);
    } catch {
      if (attempt === 3) throw new Error("LLM returned invalid JSON after 3 attempts");
    }
  }
  throw new Error("LLM call failed");
}
```

### BullMQ job pattern
```typescript
import { Queue, Worker } from "bullmq";
import { redis } from "../lib/redis";

const queue = new Queue("analyze-job", { connection: redis });

const worker = new Worker("analyze-job", async (job) => {
  // job.data contains typed payload
  // update job.updateProgress(n) for 0-100 tracking
}, { connection: redis });
```

### Playwright recording pattern
```typescript
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  recordVideo: { dir: outputDir, size: { width: 1920, height: 1080 } }
});
const page = await context.newPage();
// ... perform actions ...
await context.close(); // saves video
await browser.close();
```

---

## ENVIRONMENT VARIABLES NEEDED

See `.env.example` at root. Required for any module to run:
- `DATABASE_URL` — PostgreSQL
- `REDIS_URL` — Redis
- `ANTHROPIC_API_KEY` — LLM calls
- `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` — Voice generation
- `OUTPUT_DIR` — Local video storage path

---

## COMMON MISTAKES TO AVOID

| Mistake | Correct approach |
|---|---|
| Writing prompts inline in module files | Move to `prompts.ts` |
| Sharing browser context between scenes | Always use `browser.newContext()` per scene |
| Not validating LLM JSON | Always use Zod schema validation |
| Importing types from local files | Import from `@demo-copilot/types` |
| Using `fetch` without error handling | Use the `api-client.ts` wrapper |
| Blocking the main thread with FFmpeg | Use child_process with async/await |
| Hardcoding voice ID | Always read from `ELEVENLABS_VOICE_ID` env var |
