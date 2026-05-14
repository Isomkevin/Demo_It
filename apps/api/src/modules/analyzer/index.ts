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
