# PHASE 2 — AI Analyzer, Script Engine & Scene Planner
> Prerequisite: Phase 1 complete. All typecheck passing.
> Goal: Feed a URL → get back a structured DemoScript JSON with scenes, narration, and browser actions.

---

## TASK 2.1 — LLM Client Singleton

Create a reusable, retry-wrapped Anthropic client.

### File: `apps/api/src/lib/llm.ts`

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODEL = "claude-sonnet-4-20250514";

/**
 * Call the LLM and parse structured JSON output.
 * Retries up to 3 times on parse failure.
 */
export async function callLLM<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
  maxTokens = 4096
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const retryHint =
      attempt > 1
        ? "\n\nIMPORTANT: Your previous response failed JSON parsing. Return ONLY valid JSON, no markdown, no explanation."
        : "";

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt + retryHint }],
    });

    const rawText =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    // Extract JSON from response (handles markdown code fences)
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) ||
      rawText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);

    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : rawText;

    try {
      const parsed = JSON.parse(jsonStr.trim());
      return schema.parse(parsed);
    } catch (err) {
      lastError = err;
      console.warn(`LLM attempt ${attempt} failed:`, err);
    }
  }

  throw new Error(`LLM call failed after 3 attempts: ${lastError}`);
}
```

### Done when
- [ ] `callLLM(...)` is importable from `../lib/llm`
- [ ] No TypeScript errors

---

## TASK 2.2 — Centralized Prompts File

All prompts live here. Never write prompts in module logic.

### File: `apps/api/src/modules/script/prompts.ts`

```typescript
export const ANALYZER_SYSTEM_PROMPT = `
You are an expert product analyst and UX researcher.
Given a raw HTML snapshot and URL of a web application, extract its structure.

Rules:
- Identify user-facing flows, not implementation details
- Assign valueScore (0.0 to 1.0) based on how core the flow is to product value
- appType must be one of: dashboard, saas, tool, marketplace, other
- Limit to max 5 flows
- Return ONLY valid JSON, no explanation
`.trim();

export function buildAnalyzerPrompt(url: string, title: string, html: string): string {
  const truncatedHtml = html.slice(0, 8000); // keep within token budget
  return `
URL: ${url}
Page Title: ${title}

HTML (truncated):
${truncatedHtml}

Return a JSON object matching this exact shape:
{
  "pages": [{ "url": string, "title": string, "components": [] }],
  "flows": [
    {
      "id": string,
      "name": string,
      "steps": [{ "pageUrl": string, "action": { "trigger": string, "action": "click"|"type"|"scroll"|"hover", "label": string }, "description": string }],
      "valueScore": number
    }
  ],
  "primaryValuePaths": [/* same shape as flows, top 2-3 most important */],
  "appType": "dashboard"|"saas"|"tool"|"marketplace"|"other"
}
`.trim();
}

export const SCRIPT_SYSTEM_PROMPT = `
You are a world-class product storyteller and demo director.
Convert a product map into a cinematic demo script that will be narrated by AI voice and recorded automatically.

Rules:
- Start with a compelling hook (problem the product solves)
- Each scene must have: narration text, browser actions to perform, and a visual focus area
- Narration should be concise (max 2–3 sentences per scene)
- Focus on value, not feature lists
- Tone must match the requested demo style
- Actions must be executable Playwright actions (navigate, click, type, wait, scroll)
- estimatedDurationMs should reflect narration length (avg 150 words/min)
- Max 6 scenes for MVP
- Return ONLY valid JSON
`.trim();

export function buildScriptPrompt(
  productMap: object,
  tone: string,
  url: string
): string {
  return `
Product URL: ${url}
Demo Tone: ${tone}

Product Map:
${JSON.stringify(productMap, null, 2)}

Return a JSON object matching this exact shape:
{
  "productName": string,
  "hook": string,
  "tone": "${tone}",
  "scenes": [
    {
      "id": string (scene-1, scene-2, etc.),
      "title": string,
      "narration": string,
      "actions": [
        { "type": "navigate", "url": string } |
        { "type": "click", "selector": string } |
        { "type": "type", "selector": string, "text": string } |
        { "type": "wait", "ms": number } |
        { "type": "scroll", "direction": "down"|"up", "px": number }
      ],
      "visualFocus": string,
      "durationMs": number,
      "transition": "cut"|"fade"|"zoom_in"|"zoom_out"
    }
  ],
  "closingCTA": string,
  "estimatedDurationMs": number
}
`.trim();
}
```

### Done when
- [ ] All prompt functions exported and typed correctly
- [ ] No TypeScript errors

---

## TASK 2.3 — Product Analyzer Module

### File: `apps/api/src/modules/analyzer/index.ts`

```typescript
import { z } from "zod";
import { callLLM } from "../../lib/llm";
import { scrapePage } from "./dom-scraper";
import { ANALYZER_SYSTEM_PROMPT, buildAnalyzerPrompt } from "../script/prompts";
import type { ProductMap } from "@demo-copilot/types";

const ProductMapSchema = z.object({
  pages: z.array(
    z.object({
      url: z.string(),
      title: z.string(),
      components: z.array(z.any()),
    })
  ),
  flows: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      steps: z.array(
        z.object({
          pageUrl: z.string(),
          action: z.object({
            trigger: z.string(),
            action: z.enum(["click", "type", "scroll", "hover"]),
            label: z.string(),
          }),
          description: z.string(),
        })
      ),
      valueScore: z.number().min(0).max(1),
    })
  ),
  primaryValuePaths: z.array(z.any()),
  appType: z.enum(["dashboard", "saas", "tool", "marketplace", "other"]),
});

export async function analyzeProduct(url: string): Promise<ProductMap> {
  console.log(`[Analyzer] Scraping ${url}`);
  const scrape = await scrapePage(url);

  console.log(`[Analyzer] Sending to LLM for analysis`);
  const productMap = await callLLM(
    ANALYZER_SYSTEM_PROMPT,
    buildAnalyzerPrompt(url, scrape.title, scrape.html),
    ProductMapSchema
  );

  console.log(`[Analyzer] Found ${productMap.flows.length} flows`);
  return productMap as ProductMap;
}
```

### Done when
- [ ] `analyzeProduct("https://vercel.com")` returns a valid ProductMap
- [ ] Flows are non-empty and have reasonable valueScores

---

## TASK 2.4 — Demo Script Engine

### File: `apps/api/src/modules/script/index.ts`

```typescript
import { z } from "zod";
import { callLLM } from "../../lib/llm";
import { SCRIPT_SYSTEM_PROMPT, buildScriptPrompt } from "./prompts";
import type { ProductMap, DemoScript, DemoTone } from "@demo-copilot/types";

const BrowserActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("navigate"), url: z.string() }),
  z.object({ type: z.literal("click"), selector: z.string(), label: z.string().optional() }),
  z.object({ type: z.literal("type"), selector: z.string(), text: z.string() }),
  z.object({ type: z.literal("wait"), ms: z.number() }),
  z.object({ type: z.literal("scroll"), direction: z.enum(["up", "down"]), px: z.number().optional() }),
  z.object({ type: z.literal("hover"), selector: z.string() }),
  z.object({ type: z.literal("screenshot"), label: z.string() }),
]);

const SceneSchema = z.object({
  id: z.string(),
  title: z.string(),
  narration: z.string(),
  actions: z.array(BrowserActionSchema),
  visualFocus: z.string(),
  durationMs: z.number(),
  transition: z.enum(["cut", "fade", "zoom_in", "zoom_out"]),
});

const DemoScriptSchema = z.object({
  productName: z.string(),
  hook: z.string(),
  tone: z.enum(["investor", "user_onboarding", "marketing", "tutorial"]),
  scenes: z.array(SceneSchema),
  closingCTA: z.string(),
  estimatedDurationMs: z.number(),
});

export async function generateScript(
  productMap: ProductMap,
  url: string,
  tone: DemoTone = "marketing"
): Promise<DemoScript> {
  console.log(`[Script] Generating ${tone} demo script`);

  const script = await callLLM(
    SCRIPT_SYSTEM_PROMPT,
    buildScriptPrompt(productMap, tone, url),
    DemoScriptSchema,
    6000
  );

  console.log(`[Script] Generated ${script.scenes.length} scenes`);
  return script as DemoScript;
}
```

### Done when
- [ ] `generateScript(productMap, url)` returns a valid DemoScript
- [ ] Each scene has narration + at least one browser action
- [ ] No TypeScript errors

---

## TASK 2.5 — API Route: Create Project

Wire up the project creation endpoint.

### File: `apps/api/src/routes/projects.ts`

```typescript
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import type { CreateProjectRequest } from "@demo-copilot/types";

const CreateProjectBody = z.object({
  url: z.string().url(),
  name: z.string().optional(),
  tone: z.enum(["investor", "user_onboarding", "marketing", "tutorial"]).optional(),
});

export async function projectRoutes(fastify: FastifyInstance) {
  // Create project
  fastify.post("/api/v1/projects", async (request, reply) => {
    const body = CreateProjectBody.parse(request.body);

    const project = await prisma.project.create({
      data: {
        url: body.url,
        name: body.name || new URL(body.url).hostname,
        tone: body.tone || "marketing",
        status: "queued",
      },
    });

    return reply.status(201).send({ project });
  });

  // List projects
  fastify.get("/api/v1/projects", async () => {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { projects };
  });

  // Get project by ID
  fastify.get<{ Params: { id: string } }>("/api/v1/projects/:id", async (request, reply) => {
    const project = await prisma.project.findUnique({
      where: { id: request.params.id },
      include: { runs: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!project) return reply.status(404).send({ error: "Not found" });
    return { project };
  });
}
```

Register in `apps/api/src/index.ts`:
```typescript
import { projectRoutes } from "./routes/projects";
await server.register(projectRoutes);
```

### Done when
- [ ] `POST /api/v1/projects` with `{ "url": "https://example.com" }` creates a DB record
- [ ] `GET /api/v1/projects` returns array
- [ ] No TypeScript errors

---

## TASK 2.6 — Integration Test: Analyze → Script

Create a test script to verify the full AI pipeline.

### File: `apps/api/src/scripts/test-ai-pipeline.ts`

```typescript
import { analyzeProduct } from "../modules/analyzer";
import { generateScript } from "../modules/script";
import fs from "fs/promises";
import path from "path";

const TEST_URL = process.argv[2] || "https://linear.app";
const OUTPUT_DIR = process.env.OUTPUT_DIR || "/tmp/demo-copilot-output";

console.log(`\n=== Testing AI Pipeline ===`);
console.log(`URL: ${TEST_URL}\n`);

// 1. Analyze
console.log("Step 1: Analyzing product...");
const productMap = await analyzeProduct(TEST_URL);
console.log(`✓ Found ${productMap.flows.length} flows, app type: ${productMap.appType}`);

// 2. Generate script
console.log("\nStep 2: Generating demo script...");
const script = await generateScript(productMap, TEST_URL, "marketing");
console.log(`✓ Script: "${script.hook}"`);
console.log(`✓ ${script.scenes.length} scenes, estimated ${Math.round(script.estimatedDurationMs / 1000)}s`);
script.scenes.forEach((s, i) => {
  console.log(`  Scene ${i + 1}: ${s.title} (${s.actions.length} actions)`);
});

// 3. Save output
await fs.mkdir(OUTPUT_DIR, { recursive: true });
const outputPath = path.join(OUTPUT_DIR, `test-script-${Date.now()}.json`);
await fs.writeFile(outputPath, JSON.stringify({ productMap, script }, null, 2));
console.log(`\n✓ Full output saved to: ${outputPath}`);
```

### Run with:
```bash
npx tsx apps/api/src/scripts/test-ai-pipeline.ts https://yourapp.com
```

### Done when
- [ ] Script outputs a valid DemoScript for any real URL
- [ ] All scenes have non-empty narration and actionable browser actions
- [ ] No TypeScript errors

---

## PHASE 2 COMPLETION CHECKLIST

- [ ] `pnpm typecheck` passes across all packages
- [ ] `analyzeProduct(url)` returns structured ProductMap from a live URL
- [ ] `generateScript(productMap, url)` returns structured DemoScript
- [ ] `POST /api/v1/projects` creates DB record and returns project
- [ ] Integration test script runs without error on 2+ different URLs
- [ ] All LLM prompts are in `prompts.ts`, none inline

**Phase 2 complete → proceed to PHASE_3.md**
