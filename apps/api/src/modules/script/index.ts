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
