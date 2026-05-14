import { scrapePage } from "../modules/analyzer/dom-scraper";
import { recordScene } from "../modules/automation/executor";
import { mergeSegmentsToMP4 } from "../modules/automation/recorder";
import path from "path";

const TEST_URL = process.argv[2] || "https://example.com";
const OUTPUT_DIR = path.resolve(process.env.OUTPUT_DIR || "./tmp/demo-copilot-output");
const PROJECT_ID = "test-" + Date.now();

console.log(`Testing with URL: ${TEST_URL}`);

// 1. Scrape
const runScrape = async () => {
  const scrape = await scrapePage(TEST_URL);
  console.log(`Scraped: ${scrape.title} — ${scrape.components.length} components`);
};

// 2. Record a simple scene: navigate + scroll + wait
const runRecord = async () => {
  const recording = await recordScene(
    "scene-1",
    PROJECT_ID,
    TEST_URL,
    [
      { type: "wait", ms: 2000 },
      { type: "scroll", direction: "down", px: 600 },
      { type: "wait", ms: 1500 },
      { type: "scroll", direction: "down", px: 600 },
      { type: "wait", ms: 1500 },
    ],
    OUTPUT_DIR
  );
  console.log(`Recorded scene: ${recording.videoPath} (${recording.durationMs}ms)`);

  // 3. Merge to MP4
  const mp4Path = path.join(OUTPUT_DIR, PROJECT_ID, "final.mp4");
  await mergeSegmentsToMP4([recording.videoPath], mp4Path);
  console.log(`MP4 exported: ${mp4Path}`);
};

const main = async () => {
  await runScrape();
  await runRecord();
}

main().catch(console.error);
