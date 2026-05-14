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
  transition: z.enum(["cut", "fade", "zoom_in", "zoom_out"]).default("cut"),
});

const DemoScriptSchema = z.object({
  productName: z.string(),
  hook: z.string(),
  tone: z.enum(["investor", "user_onboarding", "marketing", "tutorial"]),
  scenes: z.array(SceneSchema),
  closingCTA: z.string(),
  estimatedDurationMs: z.number(),
});

/** LLMs often omit transition or emit one bad action; normalize before strict parse. */
function normalizeLlmScriptJson(input: unknown): unknown {
  if (typeof input !== "object" || input === null) return input;
  const root = { ...(input as Record<string, unknown>) };
  const scenes = root.scenes;
  if (!Array.isArray(scenes)) return root;
  root.scenes = scenes.map((scene, sceneIdx) => {
    if (typeof scene !== "object" || scene === null) return scene;
    const s = { ...(scene as Record<string, unknown>) };
    if (s.transition === undefined || s.transition === null) s.transition = "cut";
    const raw = Array.isArray(s.actions) ? s.actions : [];
    const actions: unknown[] = [];
    for (let i = 0; i < raw.length; i++) {
      const r = BrowserActionSchema.safeParse(raw[i]);
      if (r.success) actions.push(r.data);
      else console.warn(`[Script] Scene ${sceneIdx} dropping invalid action ${i}`);
    }
    return { ...s, actions };
  });
  return root;
}

const DemoScriptSchemaWithPreprocess = z.preprocess(normalizeLlmScriptJson, DemoScriptSchema);

export async function generateScript(
  productMap: ProductMap,
  url: string,
  tone: DemoTone = "marketing"
): Promise<DemoScript> {
  console.log(`[Script] Generating ${tone} demo script`);

  const script = await callLLM<DemoScript>(
    SCRIPT_SYSTEM_PROMPT,
    buildScriptPrompt(productMap, tone, url),
    DemoScriptSchemaWithPreprocess,
    6000
  );

  console.log(`[Script] Generated ${script.scenes.length} scenes`);
  return script;
}
