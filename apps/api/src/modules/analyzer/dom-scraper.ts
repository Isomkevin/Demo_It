import { chromium, type Page } from "playwright";
import type { ProductMap, Component, Interaction } from "@demo-copilot/types";

export type ScrapeResult = {
  url: string;
  title: string;
  html: string;
  components: Component[];
  interactions: Interaction[];
};

async function extractComponents(page: Page): Promise<Component[]> {
  return page.evaluate(() => {
    const components: Array<{
      type: string; selector: string; label: string; isInteractive: boolean;
    }> = [];

    const buttons = document.querySelectorAll("button, [role='button'], a");
    buttons.forEach((el, i) => {
      components.push({
        type: "button",
        selector: `button:nth-of-type(${i + 1})`,
        label: el.textContent?.trim().slice(0, 50) || "",
        isInteractive: true,
      });
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

    return components;
  }) as Promise<Component[]>;
}

async function extractInteractions(page: Page): Promise<Interaction[]> {
  return page.evaluate(() => {
    const interactions: Array<{
      trigger: string; action: string; label: string;
    }> = [];

    document.querySelectorAll("button, a, [role='button']").forEach((el, i) => {
      interactions.push({
        trigger: `[data-testid], button:nth-child(${i + 1})`,
        action: "click",
        label: el.textContent?.trim().slice(0, 50) || `Element ${i}`,
      });
    });

    document.querySelectorAll("input, textarea, select").forEach((el, i) => {
      interactions.push({
        trigger: `input:nth-of-type(${i + 1})`,
        action: "type",
        label: (el as HTMLInputElement).placeholder || `Input ${i}`,
      });
    });

    return interactions;
  }) as Promise<Interaction[]>;
}

export async function scrapePage(url: string): Promise<ScrapeResult> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    const title = await page.title();
    const html = await page.content();
    const components = await extractComponents(page);
    const interactions = await extractInteractions(page);

    return { url, title, html, components, interactions };
  } finally {
    await context.close();
    await browser.close();
  }
}
