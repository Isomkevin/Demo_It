import { chromium, type Page, type Browser, type BrowserContext } from "playwright";
import type { Component, Interaction, PageSection } from "@demo-copilot/types";
import { installEvaluatePolyfill } from "../../lib/playwright-init";

export type ScrapeResult = {
  url: string;
  title: string;
  html: string;
  components: Component[];
  interactions: Interaction[];
  sections: PageSection[];
};

const GOTO_OPTS = { waitUntil: "domcontentloaded" as const, timeout: 60_000 };

async function extractSections(page: Page): Promise<PageSection[]> {
  return page.evaluate(() => {
    const sections: Array<{ id: string; selector: string; label: string }> = [];
    const seen = new Set<string>();

    const add = (el: Element, selector: string, label: string) => {
      const key = selector + label;
      if (seen.has(key) || !label.trim()) return;
      const rect = el.getBoundingClientRect();
      if (rect.height < 60) return;
      seen.add(key);
      sections.push({ id: el.id || selector, selector, label: label.trim().slice(0, 80) });
    };

    document.querySelectorAll("section[id], main section, [data-section], article").forEach((el, i) => {
      const id = el.id;
      const heading = el.querySelector("h1,h2,h3")?.textContent?.trim();
      const label = heading || el.getAttribute("aria-label") || `Section ${i + 1}`;
      const selector = id ? `#${CSS.escape(id)}` : `section:nth-of-type(${i + 1})`;
      add(el, selector, label);
    });

    document.querySelectorAll("h1, h2").forEach((el, i) => {
      const text = el.textContent?.trim();
      if (!text || text.length < 3) return;
      const parent = el.closest("section, article, main > div, [class*='section']") || el.parentElement;
      if (!parent) return;
      const id = parent.id;
      const selector = id ? `#${CSS.escape(id)}` : undefined;
      if (!selector) return;
      add(parent, selector, text);
    });

    return sections.slice(0, 20);
  }) as Promise<PageSection[]>;
}

async function extractComponents(page: Page, pageUrl: string): Promise<Component[]> {
  return page.evaluate((baseUrl) => {
    const components: Array<{
      type: string;
      selector: string;
      label: string;
      isInteractive: boolean;
    }> = [];
    const origin = new URL(baseUrl).origin;

    document.querySelectorAll("nav a[href], header a[href], footer a[href]").forEach((el) => {
      const a = el as HTMLAnchorElement;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
      try {
        const abs = new URL(href, baseUrl);
        if (abs.origin !== origin) return;
        const path = abs.pathname + abs.search;
        const label = a.textContent?.trim().slice(0, 50) || path;
        if (!label) return;
        components.push({
          type: "link",
          selector: `a[href="${href.replace(/"/g, '\\"')}"]`,
          label,
          isInteractive: true,
        });
      } catch {
        /* skip invalid */
      }
    });

    document.querySelectorAll("button, [role='button']").forEach((el, i) => {
      const label = el.textContent?.trim().slice(0, 50) || "";
      if (!label) return;
      components.push({
        type: "button",
        selector: `button:has-text("${label.replace(/"/g, '\\"')}")`,
        label,
        isInteractive: true,
      });
    });

    document.querySelectorAll("a[href]").forEach((el) => {
      const a = el as HTMLAnchorElement;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
      const label = a.textContent?.trim().slice(0, 50) || "";
      if (!label || label.length < 2) return;
      try {
        const abs = new URL(href, baseUrl);
        if (abs.origin !== new URL(baseUrl).origin) return;
        components.push({
          type: "link",
          selector: `a[href="${href.replace(/"/g, '\\"')}"]`,
          label,
          isInteractive: true,
        });
      } catch {
        /* skip */
      }
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

    const deduped = new Map<string, (typeof components)[0]>();
    for (const c of components) {
      const key = `${c.type}:${c.label}:${c.selector}`;
      if (!deduped.has(key)) deduped.set(key, c);
    }
    return [...deduped.values()].slice(0, 40);
  }, pageUrl) as Promise<Component[]>;
}

async function extractInteractions(page: Page): Promise<Interaction[]> {
  return page.evaluate(() => {
    const interactions: Array<{ trigger: string; action: string; label: string }> = [];

    document.querySelectorAll("button, a, [role='button']").forEach((el) => {
      const label = el.textContent?.trim().slice(0, 50) || "";
      if (!label) return;
      interactions.push({
        trigger: `button:has-text("${label.replace(/"/g, '\\"')}")`,
        action: "click",
        label,
      });
    });

    document.querySelectorAll("input, textarea, select").forEach((el, i) => {
      interactions.push({
        trigger: `input:nth-of-type(${i + 1})`,
        action: "type",
        label: (el as HTMLInputElement).placeholder || `Input ${i}`,
      });
    });

    return interactions.slice(0, 30);
  }) as Promise<Interaction[]>;
}

export async function scrapePageWithContext(
  page: Page,
  url: string
): Promise<Omit<ScrapeResult, "html">> {
  await page.goto(url, GOTO_OPTS);
  await page.waitForTimeout(1500);

  const title = await page.title();
  const components = await extractComponents(page, url);
  const interactions = await extractInteractions(page);
  const sections = await extractSections(page);

  return { url, title, components, interactions, sections };
}

export async function scrapePage(url: string): Promise<ScrapeResult> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  await installEvaluatePolyfill(context);
  const page = await context.newPage();

  try {
    const data = await scrapePageWithContext(page, url);
    const html = await page.content();
    return { ...data, html };
  } finally {
    await context.close();
    await browser.close();
  }
}

export async function createScrapeBrowser(): Promise<{
  browser: Browser;
  context: BrowserContext;
  page: Page;
}> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  await installEvaluatePolyfill(context);
  const page = await context.newPage();
  return { browser, context, page };
}

export async function closeScrapeBrowser(browser: Browser): Promise<void> {
  await browser.close();
}
