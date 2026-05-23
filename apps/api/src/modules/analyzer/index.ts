import { z } from "zod";
import { callLLM } from "../../lib/llm";
import { ANALYZER_SYSTEM_PROMPT } from "../script/prompts";
import { scrapeSite } from "./site-crawler";
import { mergeCrawledPages, buildAnalyzerPromptFromSite } from "./merge-product-map";
import type { ProductMap } from "@demo-copilot/types";

const FlowStepSchema = z.object({
  pageUrl: z.string(),
  action: z.object({
    trigger: z.string(),
    action: z.enum(["click", "type", "scroll", "hover"]),
    label: z.string(),
  }),
  description: z.string(),
});

const FlowSchema = z.object({
  id: z.string(),
  name: z.string(),
  steps: z.array(FlowStepSchema).default([]),
  valueScore: z.number().min(0).max(1),
});

const ProductMapSchema = z.object({
  pages: z.array(
    z.object({
      url: z.string(),
      title: z.string(),
      components: z.array(z.any()).default([]),
      sections: z.array(z.any()).optional(),
    })
  ),
  flows: z.array(FlowSchema).default([]),
  primaryValuePaths: z.array(FlowSchema).default([]),
  appType: z.enum(["dashboard", "saas", "tool", "marketplace", "other"]),
});

/** Coerce malformed LLM flows (missing steps, string actions) before strict parse. */
function normalizeProductMapJson(input: unknown): unknown {
  if (typeof input !== "object" || input === null) return input;
  const root = { ...(input as Record<string, unknown>) };

  const normalizeFlow = (item: unknown, index: number): Record<string, unknown> | null => {
    if (typeof item !== "object" || item === null) return null;
    const flow = { ...(item as Record<string, unknown>) };
    if (typeof flow.id !== "string" || !flow.id) flow.id = `flow-${index + 1}`;
    if (typeof flow.name !== "string") flow.name = String(flow.name ?? flow.id);
    if (typeof flow.valueScore !== "number") flow.valueScore = 0.5;
    const rawSteps = Array.isArray(flow.steps) ? flow.steps : [];
    flow.steps = rawSteps.filter(
      (step) =>
        typeof step === "object" &&
        step !== null &&
        typeof (step as { pageUrl?: unknown }).pageUrl === "string" &&
        typeof (step as { action?: unknown }).action === "object" &&
        (step as { action?: unknown }).action !== null
    );
    return flow;
  };

  const normalizeFlows = (arr: unknown): unknown[] => {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((item, i) => normalizeFlow(item, i))
      .filter((f): f is Record<string, unknown> => f !== null);
  };

  root.flows = normalizeFlows(root.flows);
  root.primaryValuePaths = normalizeFlows(root.primaryValuePaths);
  if (!Array.isArray(root.pages)) root.pages = [];

  return root;
}

const ProductMapSchemaWithPreprocess = z.preprocess(
  normalizeProductMapJson,
  ProductMapSchema
);

export async function analyzeProduct(url: string): Promise<ProductMap> {
  const maxPages = Number(process.env.CRAWL_MAX_PAGES) || 6;
  console.log(`[Analyzer] Crawling ${url} (max ${maxPages} pages)`);
  const site = await scrapeSite(url, { maxPages });

  console.log(`[Analyzer] Sending ${site.pages.length} page(s) to LLM`);
  const productMap = await callLLM(
    ANALYZER_SYSTEM_PROMPT,
    buildAnalyzerPromptFromSite(site),
    ProductMapSchemaWithPreprocess
  );

  const merged = mergeCrawledPages(productMap as ProductMap, site);
  console.log(`[Analyzer] ${merged.pages.length} pages, ${merged.flows.length} flows`);
  return merged;
}
