/**
 * Quick sanity check: run with `pnpm --filter api exec tsx src/modules/script/normalize-actions.test.ts`
 */
import { normalizeDemoScript } from "./normalize-actions";
import type { DemoScript, ProductMap } from "@demo-copilot/types";

const baseUrl = "https://example.com";
const productMap: ProductMap = {
  pages: [
    {
      url: baseUrl,
      title: "Home",
      sections: [{ id: "hero", selector: "#hero", label: "Hero" }],
      components: [{ type: "button", selector: "button:has-text(\"Start\")", label: "Start", isInteractive: true }],
    },
    {
      url: "https://example.com/pricing",
      title: "Pricing",
      sections: [{ id: "pricing", selector: "#pricing", label: "Pricing" }],
      components: [],
    },
  ],
  flows: [],
  primaryValuePaths: [],
  appType: "saas",
};

const raw: DemoScript = {
  productName: "Example",
  hook: "Hook",
  tone: "marketing",
  closingCTA: "Try it",
  estimatedDurationMs: 30_000,
  scenes: [
    {
      id: "scene-1",
      title: "Home",
      narration: "Welcome",
      visualFocus: "hero section",
      durationMs: 5000,
      transition: "cut",
      actions: [
        { type: "wait", ms: 1000 },
        { type: "scroll", direction: "down", px: 400 },
      ],
    },
    {
      id: "scene-2",
      title: "Pricing",
      narration: "Plans",
      visualFocus: "#pricing",
      durationMs: 5000,
      transition: "cut",
      actions: [{ type: "wait", ms: 1000 }],
    },
  ],
};

const normalized = normalizeDemoScript(raw, productMap, baseUrl);

const s1 = normalized.scenes[0].actions.map((a) => a.type);
const s2 = normalized.scenes[1].actions.map((a) => a.type);

if (!s1.includes("scrollTo")) throw new Error("scene-1 should have scrollTo, got: " + s1.join(","));
if (!s2.includes("navigate")) throw new Error("scene-2 should navigate, got: " + s2.join(","));
if (s1.includes("scroll")) throw new Error("scene-1 should not have blind scroll");

console.log("normalize-actions.test.ts OK");
console.log("scene-1:", normalized.scenes[0].actions);
console.log("scene-2:", normalized.scenes[1].actions);
