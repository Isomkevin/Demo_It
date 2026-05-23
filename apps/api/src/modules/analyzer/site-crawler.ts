import type { SiteScrape } from "@demo-copilot/types";
import {
  createScrapeBrowser,
  closeScrapeBrowser,
  scrapePageWithContext,
} from "./dom-scraper";

const DEFAULT_MAX_PAGES = 6;

const HIGH_VALUE_PATHS = [
  "/pricing",
  "/price",
  "/plans",
  "/features",
  "/feature",
  "/product",
  "/products",
  "/demo",
  "/tour",
  "/app",
  "/dashboard",
  "/platform",
  "/solutions",
  "/about",
  "/how-it-works",
  "/use-cases",
  "/customers",
  "/integrations",
];

const SKIP_PATH_RE =
  /\/(login|signin|sign-in|logout|auth|register|signup|sign-up|cart|checkout|account|admin|api|wp-admin|privacy|terms|legal|cookie)/i;

export type CrawlOptions = {
  maxPages?: number;
};

function normalizeUrl(href: string, base: string): string | null {
  try {
    const u = new URL(href, base);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    u.hash = "";
    return u.href.replace(/\/$/, "") || u.href;
  } catch {
    return null;
  }
}

function scoreLink(pathname: string, linkText: string, inNav: boolean): number {
  let score = inNav ? 10 : 2;
  const lower = (pathname + " " + linkText).toLowerCase();
  for (const p of HIGH_VALUE_PATHS) {
    if (lower.includes(p.replace(/^\//, ""))) score += 8;
  }
  if (pathname === "/" || pathname === "") score -= 5;
  if (SKIP_PATH_RE.test(pathname)) score -= 100;
  return score;
}

export async function discoverLinks(
  page: import("playwright").Page,
  seedUrl: string
): Promise<Array<{ url: string; score: number; label: string }>> {
  const origin = new URL(seedUrl).origin;
  const seedNorm = normalizeUrl(seedUrl, seedUrl)!;

  const raw = await page.evaluate((origin) => {
    const out: Array<{ href: string; text: string; inNav: boolean }> = [];
    const add = (el: Element, inNav: boolean) => {
      const a = el.closest("a") || (el.tagName === "A" ? el : null);
      if (!a || a.tagName !== "A") return;
      const href = (a as HTMLAnchorElement).getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:"))
        return;
      try {
        const abs = new URL(href, window.location.href);
        if (abs.origin !== origin) return;
        out.push({
          href: abs.pathname + abs.search,
          text: (a.textContent || "").trim().slice(0, 60),
          inNav,
        });
      } catch {
        /* skip */
      }
    };

    document.querySelectorAll("nav a[href], header a[href]").forEach((el) => add(el, true));
    document.querySelectorAll("main a[href], footer a[href], a[href]").forEach((el) => add(el, false));

    return out;
  }, origin);

  const byUrl = new Map<string, { url: string; score: number; label: string }>();

  for (const { href, text, inNav } of raw) {
    const full = normalizeUrl(href, seedUrl);
    if (!full) continue;
    const u = new URL(full);
    if (u.origin !== origin) continue;
    const s = scoreLink(u.pathname, text, inNav);
    const existing = byUrl.get(full);
    if (!existing || s > existing.score) {
      byUrl.set(full, { url: full, score: s, label: text || u.pathname });
    }
  }

  byUrl.set(seedNorm, { url: seedNorm, score: 100, label: "Home" });

  return [...byUrl.values()]
    .filter((l) => l.score > -50)
    .sort((a, b) => b.score - a.score);
}

export async function scrapeSite(seedUrl: string, options: CrawlOptions = {}): Promise<SiteScrape> {
  const maxPages = options.maxPages ?? (Number(process.env.CRAWL_MAX_PAGES) || DEFAULT_MAX_PAGES);
  const { browser, page } = await createScrapeBrowser();

  try {
    await page.goto(seedUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(1500);

    const discovered = await discoverLinks(page, seedUrl);
    const toVisit = [seedUrl, ...discovered.map((l) => l.url).filter((u) => u !== seedUrl)].slice(
      0,
      maxPages
    );

    const pages: SiteScrape["pages"] = [];
    const visited = new Set<string>();

    for (const url of toVisit) {
      const norm = normalizeUrl(url, seedUrl);
      if (!norm || visited.has(norm)) continue;
      visited.add(norm);

      try {
        console.log(`[Crawler] Scraping ${norm}`);
        const data = await scrapePageWithContext(page, norm);
        pages.push({
          url: data.url,
          title: data.title,
          components: data.components,
          interactions: data.interactions,
          sections: data.sections,
        });
      } catch (err) {
        console.warn(`[Crawler] Failed ${norm}:`, err instanceof Error ? err.message : err);
      }
    }

    if (pages.length === 0) {
      const fallback = await scrapePageWithContext(page, seedUrl);
      pages.push({
        url: fallback.url,
        title: fallback.title,
        components: fallback.components,
        interactions: fallback.interactions,
        sections: fallback.sections,
      });
    }

    console.log(`[Crawler] Scraped ${pages.length} page(s) from ${seedUrl}`);
    return { seedUrl, pages };
  } finally {
    await closeScrapeBrowser(browser);
  }
}
