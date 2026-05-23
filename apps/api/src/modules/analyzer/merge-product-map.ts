import type { ProductMap, SiteScrape, Page } from "@demo-copilot/types";

function normalizeUrlKey(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.href.replace(/\/$/, "") || u.href;
  } catch {
    return url;
  }
}

/** Ground product map pages in actually crawled URLs and components. */
export function mergeCrawledPages(productMap: ProductMap, site: SiteScrape): ProductMap {
  const crawledByUrl = new Map(
    site.pages.map((p) => [normalizeUrlKey(p.url), p])
  );
  const allowedUrls = new Set(crawledByUrl.keys());

  const mergedPages: Page[] = site.pages.map((p) => ({
    url: p.url,
    title: p.title,
    components: p.components,
    sections: p.sections,
  }));

  for (const llmPage of productMap.pages ?? []) {
    const key = normalizeUrlKey(llmPage.url);
    if (!allowedUrls.has(key)) continue;
    const crawled = crawledByUrl.get(key)!;
    const existing = mergedPages.find((x) => normalizeUrlKey(x.url) === key);
    if (existing) {
      existing.title = llmPage.title || existing.title;
    }
  }

  const sanitizePageUrl = (pageUrl: string): string => {
    const key = normalizeUrlKey(pageUrl);
    if (allowedUrls.has(key)) {
      const match = site.pages.find((p) => normalizeUrlKey(p.url) === key);
      return match?.url ?? pageUrl;
    }
    return site.seedUrl;
  };

  const sanitizeFlow = (flow: ProductMap["flows"][0]): ProductMap["flows"][0] => {
    const steps = Array.isArray(flow.steps) ? flow.steps : [];
    return {
      ...flow,
      steps: steps.map((step) => ({
        ...step,
        pageUrl: sanitizePageUrl(step.pageUrl ?? site.seedUrl),
      })),
    };
  };

  const withSteps = (flows: ProductMap["flows"] | undefined) =>
    (flows ?? []).map(sanitizeFlow).filter((f) => f.steps.length > 0);

  const flows = withSteps(productMap.flows);
  let primaryValuePaths = withSteps(productMap.primaryValuePaths);
  if (primaryValuePaths.length === 0 && flows.length > 0) {
    primaryValuePaths = [...flows].sort((a, b) => b.valueScore - a.valueScore).slice(0, 3);
  }

  return {
    ...productMap,
    pages: mergedPages,
    flows,
    primaryValuePaths,
  };
}

export function buildAnalyzerPromptFromSite(site: SiteScrape): string {
  const summaries = site.pages.map((p) => ({
    url: p.url,
    title: p.title,
    components: p.components.slice(0, 25),
    sections: p.sections.slice(0, 12),
    topLinks: p.components.filter((c) => c.type === "link").slice(0, 10),
  }));

  return `
Seed URL: ${site.seedUrl}
Crawled ${site.pages.length} page(s). You MUST only use URLs from this list in pages[] and flows[].steps[].pageUrl.

Crawled pages (structured):
${JSON.stringify(summaries, null, 2)}

Return a JSON object matching this exact shape:
{
  "pages": [{ "url": string (from crawl list only), "title": string, "components": [] }],
  "flows": [
    {
      "id": string,
      "name": string,
      "steps": [{ "pageUrl": string (from crawl list), "action": { "trigger": string, "action": "click"|"type"|"scroll"|"hover", "label": string }, "description": string }],
      "valueScore": number
    }
  ],
  "primaryValuePaths": [/* same shape as flows[] — must include steps[]; top 2-3 flows */],
  "appType": "dashboard"|"saas"|"tool"|"marketplace"|"other"
}
`.trim();
}
