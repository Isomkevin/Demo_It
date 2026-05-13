# PHASE 1 — Foundation, Recorder & Basic Export
> Read SPEC.md before starting. Complete tasks in order. Do not start Phase 2 until all tasks here pass typecheck and manual test.

**Goal:** By end of Phase 1, you can pass a web URL to a script and receive a real MP4 screen recording of basic navigation through that URL.

**No AI, no voice, no rendering fancy — just record and export.**

---

## TASK 1.1 — Monorepo Scaffold

Create the full monorepo structure.

### Steps

1. Initialize root `package.json`:
```json
{
  "name": "demo-copilot",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint"
  }
}
```

2. Create `pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

3. Create `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
```

4. Create `docker-compose.yml` (copy from SPEC.md Section 13)

5. Create `.env.example` (copy from SPEC.md Section 5)

6. Run: `pnpm install`

### Done when
- [ ] `pnpm -r list` shows all workspaces
- [ ] `docker compose up -d` starts postgres + redis without error

---

## TASK 1.2 — Shared Types Package

Create the types package that all apps import from.

### Steps

1. Create `packages/types/package.json`:
```json
{
  "name": "@demo-copilot/types",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

2. Create `packages/types/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

3. Create `packages/types/src/index.ts`
   - Copy ALL types from SPEC.md Section 3 exactly as written.

### Done when
- [ ] `packages/types/src/index.ts` exports all types from SPEC.md
- [ ] No TypeScript errors: `pnpm --filter=@demo-copilot/types typecheck`

---

## TASK 1.3 — Database Package

Create Prisma package with schema and client singleton.

### Steps

1. Create `packages/db/package.json`:
```json
{
  "name": "@demo-copilot/db",
  "version": "0.0.1",
  "scripts": {
    "db:push": "prisma db push",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.18.0"
  },
  "devDependencies": {
    "prisma": "^5.18.0"
  }
}
```

2. Create `packages/db/prisma/schema.prisma`
   - Copy schema from SPEC.md Section 4 exactly.

3. Create `packages/db/src/index.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ log: ["error", "warn"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export * from "@prisma/client";
```

4. Run:
```bash
pnpm --filter=@demo-copilot/db db:generate
pnpm --filter=@demo-copilot/db db:push
```

### Done when
- [ ] `prisma studio` opens and shows `Project` and `DemoRun` tables
- [ ] No TypeScript errors

---

## TASK 1.4 — API App Scaffold (Fastify)

Create the backend API app with health check.

### Steps

1. Create `apps/api/package.json` with dependencies from SPEC.md Section 7.

2. Create `apps/api/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": "src",
    "paths": {
      "@demo-copilot/types": ["../../packages/types/src/index.ts"],
      "@demo-copilot/db": ["../../packages/db/src/index.ts"]
    }
  },
  "include": ["src"]
}
```

3. Create `apps/api/src/lib/redis.ts`:
```typescript
import IORedis from "ioredis";

export const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});
```

4. Create `apps/api/src/lib/prisma.ts`:
```typescript
export { prisma } from "@demo-copilot/db";
```

5. Create `apps/api/src/index.ts`:
```typescript
import Fastify from "fastify";
import cors from "@fastify/cors";

const server = Fastify({ logger: { level: "info" } });

await server.register(cors, { origin: process.env.WEB_URL || "http://localhost:3000" });

server.get("/health", async () => ({ status: "ok", ts: new Date().toISOString() }));

const port = Number(process.env.API_PORT) || 3001;
await server.listen({ port, host: "0.0.0.0" });
console.log(`API running on port ${port}`);
```

6. Add `dev` script to `apps/api/package.json`:
```json
"scripts": {
  "dev": "tsx watch src/index.ts",
  "build": "tsc",
  "typecheck": "tsc --noEmit"
}
```

### Done when
- [ ] `pnpm --filter=api dev` starts without error
- [ ] `curl http://localhost:3001/health` returns `{"status":"ok"}`

---

## TASK 1.5 — Playwright DOM Scraper

Create the DOM scraper that extracts page structure.

### File: `apps/api/src/modules/analyzer/dom-scraper.ts`

```typescript
import { chromium, type Page } from "playwright";
import type { ProductMap, Component, Interaction } from "@demo-copilot/types";

export type ScrapeResult = {
  url: string;
  title: string;
  html: string;
  components: Component[];
  interactions: Interaction[];
};

async function extractComponents(page: Page): Promise<Component[]> {
  return page.evaluate(() => {
    const components: Array<{
      type: string; selector: string; label: string; isInteractive: boolean;
    }> = [];

    const buttons = document.querySelectorAll("button, [role='button'], a");
    buttons.forEach((el, i) => {
      components.push({
        type: "button",
        selector: `button:nth-of-type(${i + 1})`,
        label: el.textContent?.trim().slice(0, 50) || "",
        isInteractive: true,
      });
    });

    const forms = document.querySelectorAll("form");
    forms.forEach((form, i) => {
      components.push({
        type: "form",
        selector: `form:nth-of-type(${i + 1})`,
        label: form.getAttribute("aria-label") || `Form ${i + 1}`,
        isInteractive: true,
      });
    });

    const navs = document.querySelectorAll("nav, [role='navigation']");
    navs.forEach((nav, i) => {
      components.push({
        type: "nav",
        selector: `nav:nth-of-type(${i + 1})`,
        label: "Navigation",
        isInteractive: false,
      });
    });

    return components;
  }) as Promise<Component[]>;
}

async function extractInteractions(page: Page): Promise<Interaction[]> {
  return page.evaluate(() => {
    const interactions: Array<{
      trigger: string; action: string; label: string;
    }> = [];

    document.querySelectorAll("button, a, [role='button']").forEach((el, i) => {
      interactions.push({
        trigger: `[data-testid], button:nth-child(${i + 1})`,
        action: "click",
        label: el.textContent?.trim().slice(0, 50) || `Element ${i}`,
      });
    });

    document.querySelectorAll("input, textarea, select").forEach((el, i) => {
      interactions.push({
        trigger: `input:nth-of-type(${i + 1})`,
        action: "type",
        label: (el as HTMLInputElement).placeholder || `Input ${i}`,
      });
    });

    return interactions;
  }) as Promise<Interaction[]>;
}

export async function scrapePage(url: string): Promise<ScrapeResult> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    const title = await page.title();
    const html = await page.content();
    const components = await extractComponents(page);
    const interactions = await extractInteractions(page);

    return { url, title, html, components, interactions };
  } finally {
    await context.close();
    await browser.close();
  }
}
```

### Done when
- [ ] `scrapePage("https://example.com")` returns a valid object
- [ ] No TypeScript errors

---

## TASK 1.6 — Browser Automation Executor

Create the action executor that performs browser interactions and records video.

### File: `apps/api/src/modules/automation/executor.ts`

```typescript
import { chromium, type Browser, type BrowserContext } from "playwright";
import path from "path";
import fs from "fs/promises";
import type { BrowserAction } from "@demo-copilot/types";

export type SceneRecording = {
  sceneId: string;
  videoPath: string;
  durationMs: number;
};

export async function recordScene(
  sceneId: string,
  projectId: string,
  url: string,
  actions: BrowserAction[],
  outputDir: string
): Promise<SceneRecording> {
  const segmentsDir = path.join(outputDir, projectId, "segments");
  await fs.mkdir(segmentsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: segmentsDir,
      size: { width: 1920, height: 1080 },
    },
  });
  const page = await context.newPage();

  const startTime = Date.now();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    for (const action of actions) {
      switch (action.type) {
        case "navigate":
          await page.goto(action.url, { waitUntil: "networkidle" });
          break;
        case "click":
          await page.click(action.selector, { timeout: 10000 });
          break;
        case "type":
          await page.fill(action.selector, action.text);
          break;
        case "wait":
          await page.waitForTimeout(action.ms);
          break;
        case "scroll":
          await page.evaluate(
            ({ direction, px }) => window.scrollBy(0, direction === "down" ? (px || 400) : -(px || 400)),
            { direction: action.direction, px: action.px }
          );
          break;
        case "hover":
          await page.hover(action.selector, { timeout: 10000 });
          break;
        case "screenshot":
          await page.screenshot({
            path: path.join(segmentsDir, `${sceneId}-${action.label}.png`),
          });
          break;
      }
      await page.waitForTimeout(500); // small buffer between actions
    }

    await page.waitForTimeout(1000); // buffer before closing
  } finally {
    await context.close();
    await browser.close();
  }

  const endTime = Date.now();

  // Playwright saves the video as a temp file in segmentsDir — find and rename it
  const files = await fs.readdir(segmentsDir);
  const videoFile = files.find((f) => f.endsWith(".webm") && !f.startsWith("scene-"));
  if (!videoFile) throw new Error(`No video recorded for scene ${sceneId}`);

  const finalPath = path.join(segmentsDir, `scene-${sceneId}.webm`);
  await fs.rename(path.join(segmentsDir, videoFile), finalPath);

  return {
    sceneId,
    videoPath: finalPath,
    durationMs: endTime - startTime,
  };
}
```

### Done when
- [ ] Calling `recordScene(...)` with a real URL creates a `.webm` file
- [ ] File is non-zero bytes
- [ ] No TypeScript errors

---

## TASK 1.7 — FFmpeg Merge to MP4

Convert individual `.webm` scene files into a single `.mp4`.

### File: `apps/api/src/modules/automation/recorder.ts`

```typescript
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs/promises";

export async function mergeSegmentsToMP4(
  segmentPaths: string[],
  outputPath: string
): Promise<string> {
  // Create concat list file for ffmpeg
  const listPath = path.join(path.dirname(outputPath), "concat.txt");
  const listContent = segmentPaths.map((p) => `file '${p}'`).join("\n");
  await fs.writeFile(listPath, listContent);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listPath)
      .inputOptions(["-f concat", "-safe 0"])
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions(["-crf 23", "-preset fast", "-movflags +faststart"])
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", reject)
      .run();
  });
}
```

### Done when
- [ ] `mergeSegmentsToMP4(["scene-1.webm", "scene-2.webm"], "output.mp4")` produces a valid MP4
- [ ] MP4 plays in VLC or browser

---

## TASK 1.8 — Manual Integration Test Script

Create a test script that ties together tasks 1.5–1.7 end-to-end.

### File: `apps/api/src/scripts/test-record.ts`

```typescript
import { scrapePage } from "../modules/analyzer/dom-scraper";
import { recordScene } from "../modules/automation/executor";
import { mergeSegmentsToMP4 } from "../modules/automation/recorder";
import path from "path";

const TEST_URL = process.argv[2] || "https://example.com";
const OUTPUT_DIR = process.env.OUTPUT_DIR || "/tmp/demo-copilot-output";
const PROJECT_ID = "test-" + Date.now();

console.log(`Testing with URL: ${TEST_URL}`);

// 1. Scrape
const scrape = await scrapePage(TEST_URL);
console.log(`Scraped: ${scrape.title} — ${scrape.components.length} components`);

// 2. Record a simple scene: navigate + scroll + wait
const recording = await recordScene(
  "scene-1",
  PROJECT_ID,
  TEST_URL,
  [
    { type: "wait", ms: 2000 },
    { type: "scroll", direction: "down", px: 600 },
    { type: "wait", ms: 1500 },
    { type: "scroll", direction: "down", px: 600 },
    { type: "wait", ms: 1500 },
  ],
  OUTPUT_DIR
);
console.log(`Recorded scene: ${recording.videoPath} (${recording.durationMs}ms)`);

// 3. Merge to MP4
const mp4Path = path.join(OUTPUT_DIR, PROJECT_ID, "final.mp4");
await mergeSegmentsToMP4([recording.videoPath], mp4Path);
console.log(`MP4 exported: ${mp4Path}`);
```

### Run with:
```bash
npx tsx apps/api/src/scripts/test-record.ts https://yourapp.com
```

### Done when
- [ ] Script runs without error
- [ ] A valid MP4 file is created at the output path
- [ ] Video plays correctly (has visuals, correct duration)

---

## PHASE 1 COMPLETION CHECKLIST

Before moving to Phase 2, confirm all of the following:

- [ ] Monorepo installs cleanly with `pnpm install`
- [ ] `docker compose up -d` starts postgres + redis
- [ ] `pnpm --filter=@demo-copilot/db db:push` creates tables
- [ ] `pnpm --filter=api dev` starts API on port 3001
- [ ] `curl http://localhost:3001/health` returns OK
- [ ] `pnpm typecheck` passes with zero errors across all packages
- [ ] Test record script produces a valid, playable MP4
- [ ] All generated files are in `.gitignore` (video output, node_modules, dist, .env)

**Phase 1 complete → proceed to PHASE_2.md**
