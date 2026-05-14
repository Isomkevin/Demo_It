import { analyzeProduct } from "../modules/analyzer";
import { generateScript } from "../modules/script";
import { recordAllScenes } from "../modules/automation";
import { generateAllNarrations } from "../modules/voice";
import { buildTimeline } from "../modules/voice/sync";
import fs from "fs/promises";
import path from "path";

const TEST_URL = process.argv[2] || "https://example.com";
const OUTPUT_DIR = path.resolve(process.env.OUTPUT_DIR || "./tmp/demo-copilot-output");
const PROJECT_ID = "test-" + Date.now();

const run = async () => {
  console.log(`\n=== Phase 3 Integration Test ===`);
  console.log(`URL: ${TEST_URL}\n`);

  // 1. Analyze
  console.log("1/5 Analyzing product...");
  const productMap = await analyzeProduct(TEST_URL);

  // 2. Script
  console.log("2/5 Generating script...");
  const script = await generateScript(productMap, TEST_URL, "marketing");
  console.log(`✓ ${script.scenes.length} scenes`);

  // 3. Record
  console.log("3/5 Recording scenes...");
  const videoMap = await recordAllScenes(script, PROJECT_ID, TEST_URL, OUTPUT_DIR);
  console.log(`✓ ${Object.keys(videoMap).length} video segments`);

  // 4. Voice
  console.log("4/5 Generating narration...");
  const voiceOutputs = await generateAllNarrations(script, PROJECT_ID, OUTPUT_DIR);
  console.log(`✓ ${voiceOutputs.length} audio files`);

  // 5. Timeline
  console.log("5/5 Building timeline...");
  const timeline = buildTimeline(script, voiceOutputs, videoMap);
  console.log(`✓ Total duration: ${Math.round(timeline.totalDurationMs / 1000)}s`);

  // Save timeline JSON
  const timelinePath = path.join(OUTPUT_DIR, PROJECT_ID, "timeline.json");
  await fs.writeFile(timelinePath, JSON.stringify(timeline, null, 2));
  console.log(`\n✓ Timeline saved: ${timelinePath}`);
  console.log("Phase 3 test complete. Proceed to Phase 4 for rendering (HyperFrames and/or Remotion per RENDER_BACKEND).");
};

run().catch(console.error);
