import { z } from "zod";
import { callLLM } from "../../lib/llm";
import { ANALYZER_SYSTEM_PROMPT } from "../script/prompts";
import { scrapeSite } from "./site-crawler";
import { mergeCrawledPages, buildAnalyzerPromptFromSite } from "./merge-product-map";
import type { ProductMap } from "@demo-copilot/types";

const ProductMapSchema = z.object({
  pages: z.array(
    z.object({
      url: z.string(),
      title: z.string(),
      components: z.array(z.any()),
      sections: z.array(z.any()).optional(),
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
  const maxPages = Number(process.env.CRAWL_MAX_PAGES) || 6;
  console.log(`[Analyzer] Crawling ${url} (max ${maxPages} pages)`);
  const site = await scrapeSite(url, { maxPages });

  console.log(`[Analyzer] Sending ${site.pages.length} page(s) to LLM`);
  const productMap = await callLLM(
    ANALYZER_SYSTEM_PROMPT,
    buildAnalyzerPromptFromSite(site),
    ProductMapSchema
  );

  const merged = mergeCrawledPages(productMap as ProductMap, site);
  console.log(`[Analyzer] ${merged.pages.length} pages, ${merged.flows.length} flows`);
  return merged;
}
