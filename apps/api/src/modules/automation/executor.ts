import { chromium, type Browser, type BrowserContext } from "playwright";
import path from "path";
import fs from "fs/promises";
import type { BrowserAction } from "@demo-copilot/types";

export type SceneRecording = {
  sceneId: string;
  videoPath: string;
  durationMs: number;
};

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
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    for (const action of actions) {
      switch (action.type) {
        case "navigate":
          await page.goto(action.url, { waitUntil: "networkidle" });
          break;
        case "click":
          await page.click(action.selector, { timeout: 10000 });
          break;
        case "type":
          await page.fill(action.selector, action.text);
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
          await page.hover(action.selector, { timeout: 10000 });
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
