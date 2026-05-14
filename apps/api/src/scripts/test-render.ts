import fs from "fs/promises";
import path from "path";
import { renderTimelineToMP4 } from "../modules/renderer";
import type { Timeline } from "@demo-copilot/types";

// Load a timeline JSON produced by Phase 3 test
const timelinePath = process.argv[2];
if (!timelinePath) {
  console.error("Usage: tsx test-render.ts <path-to-timeline.json>");
  process.exit(1);
}

const OUTPUT_DIR = path.resolve(process.env.OUTPUT_DIR || "./tmp/demo-copilot-output");
const PROJECT_ID = "render-" + Date.now();

const run = async () => {
  const raw = await fs.readFile(timelinePath, "utf-8");
  const timeline: Timeline = JSON.parse(raw);

  console.log(`\n=== Phase 4 Render Test ===`);
  console.log(`Scenes: ${timeline.scenes.length}`);
  console.log(`Total duration: ${Math.round(timeline.totalDurationMs / 1000)}s\n`);

  const mp4Path = await renderTimelineToMP4(timeline, PROJECT_ID, OUTPUT_DIR);
  
  try {
    const stats = await fs.stat(mp4Path);
    console.log(`\n✓ MP4 created: ${mp4Path}`);
    console.log(`✓ File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  } catch (err) {
    console.log(`\n✗ MP4 not found (expected if HyperFrames CLI is mocked/missing)`);
  }
};

run().catch(console.error);
