import { chromium, type Locator, type Page } from "playwright";
import path from "path";
import fs from "fs/promises";
import type { BrowserAction } from "@demo-copilot/types";

/** SPAs and live sites rarely reach `networkidle`; `domcontentloaded` is reliable with a hard cap. */
const GOTO_OPTS = { waitUntil: "domcontentloaded" as const, timeout: 60_000 };

export type SceneRecording = {
  sceneId: string;
  videoPath: string;
  durationMs: number;
};

const INTERACT_TIMEOUT = 35_000;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Pull label from Playwright `:has-text("…")` / `:has-text('…')` in the scripted selector. */
function extractHasTextLabel(selector: string): string | null {
  const m = selector.match(/:has-text\s*\(\s*["']([^"']+)["']\s*\)/i);
  const t = m?.[1]?.trim();
  return t && t.length > 0 ? t : null;
}

/** Extra phrases to try when the scripted label does not match real UI copy. */
function expandedSearchPhrases(label: string): string[] {
  const seen = new Set<string>();
  const add = (s: string) => {
    const t = s.trim();
    if (t.length > 0) seen.add(t);
  };
  add(label);
  const lower = label.toLowerCase();

  if (/sign\s*up|signup/.test(lower)) {
    ["Sign Up", "Sign up", "Signup", "Register", "Create account", "Get started", "Join", "Join now"].forEach(add);
  }
  if (/register/.test(lower)) {
    ["Register", "Sign up", "Sign Up", "Create account", "Join"].forEach(add);
  }
  if (/join\b/.test(lower) && lower.length < 40) {
    ["Join", "Register", "Sign up", "Get started"].forEach(add);
  }
  if (/log\s*in|login|sign\s*in/.test(lower)) {
    ["Log in", "Login", "Sign in"].forEach(add);
  }

  return [...seen];
}

function phrasePattern(phrase: string): RegExp {
  const parts = phrase
    .trim()
    .split(/\s+/)
    .map(escapeRegExp)
    .filter(Boolean);
  if (parts.length === 0) return /^$/;
  return new RegExp(parts.join("\\s+"), "i");
}

async function tryClick(loc: Locator, timeout: number): Promise<boolean> {
  try {
    if ((await loc.count()) === 0) return false;
    const first = loc.first();
    await first.scrollIntoViewIfNeeded({ timeout: 5_000 }).catch(() => {});
    await first.click({ timeout });
    return true;
  } catch {
    return false;
  }
}

async function tryHover(loc: Locator, timeout: number): Promise<boolean> {
  try {
    if ((await loc.count()) === 0) return false;
    const first = loc.first();
    await first.scrollIntoViewIfNeeded({ timeout: 5_000 }).catch(() => {});
    await first.hover({ timeout });
    return true;
  } catch {
    return false;
  }
}

async function resilientPointerAction(
  page: Page,
  selector: string,
  mode: "click" | "hover",
  timeout: number
): Promise<void> {
  const primary = page.locator(selector).first();
  await primary.scrollIntoViewIfNeeded({ timeout: 8_000 }).catch(() => {});

  const primaryTimeout = Math.min(12_000, timeout);
  if (mode === "click") {
    if (await tryClick(primary, primaryTimeout)) return;
  } else if (await tryHover(primary, primaryTimeout)) return;

  const label = extractHasTextLabel(selector);
  const phrases = label ? expandedSearchPhrases(label) : [];

  for (const phrase of phrases) {
    const re = phrasePattern(phrase);
    const candidates: Locator[] = [
      page.getByRole("button", { name: re }),
      page.getByRole("link", { name: re }),
      page.locator('[role="button"]').filter({ hasText: re }),
      page.locator("button, a[href]").filter({ hasText: re }),
    ];
    for (const loc of candidates) {
      if (mode === "click") {
        if (await tryClick(loc, timeout)) return;
      } else if (await tryHover(loc, timeout)) return;
    }
  }

  if (mode === "click") {
    await primary.click({ timeout });
  } else {
    await primary.hover({ timeout });
  }
}

async function scrollLocatorIntoView(page: Page, selector: string): Promise<void> {
  const loc = page.locator(selector).first();
  await loc.scrollIntoViewIfNeeded({ timeout: 8_000 }).catch(() => {});
}

export async function recordScene(
  sceneId: string,
  projectId: string,
  url: string,
  actions: BrowserAction[],
  outputDir: string
): Promise<SceneRecording> {
  const segmentsDir = path.join(outputDir, projectId, "segments");
  await fs.mkdir(segmentsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: segmentsDir,
      size: { width: 1920, height: 1080 },
    },
  });
  const page = await context.newPage();

  const startTime = Date.now();

  try {
    await page.goto(url, GOTO_OPTS);

    for (const action of actions) {
      switch (action.type) {
        case "navigate":
          await page.goto(action.url, GOTO_OPTS);
          break;
        case "click":
          await resilientPointerAction(page, action.selector, "click", INTERACT_TIMEOUT);
          break;
        case "type":
          await scrollLocatorIntoView(page, action.selector);
          await page.locator(action.selector).first().fill(action.text, { timeout: INTERACT_TIMEOUT });
          break;
        case "wait":
          await page.waitForTimeout(action.ms);
          break;
        case "scroll":
          await page.evaluate(
            ({ direction, px }) => window.scrollBy(0, direction === "down" ? (px || 400) : -(px || 400)),
            { direction: action.direction, px: action.px }
          );
          break;
        case "hover":
          await resilientPointerAction(page, action.selector, "hover", INTERACT_TIMEOUT);
          break;
        case "screenshot":
          await page.screenshot({
            path: path.join(segmentsDir, `${sceneId}-${action.label}.png`),
          });
          break;
      }
      await page.waitForTimeout(500); // small buffer between actions
    }

    await page.waitForTimeout(1000); // buffer before closing
  } finally {
    await context.close();
    await browser.close();
  }

  const endTime = Date.now();

  // Playwright saves the video as a temp file in segmentsDir — find and rename it
  const files = await fs.readdir(segmentsDir);
  const videoFile = files.find((f) => f.endsWith(".webm") && !f.startsWith("scene-"));
  if (!videoFile) throw new Error(`No video recorded for scene ${sceneId}`);

  const finalPath = path.join(segmentsDir, `scene-${sceneId}.webm`);
  await fs.rename(path.join(segmentsDir, videoFile), finalPath);

  return {
    sceneId,
    videoPath: finalPath,
    durationMs: endTime - startTime,
  };
}
