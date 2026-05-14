import { analyzeProduct } from "../modules/analyzer";
import { generateScript } from "../modules/script";
import fs from "fs/promises";
import path from "path";

const TEST_URL = process.argv[2] || "https://example.com";
const OUTPUT_DIR = path.resolve(process.env.OUTPUT_DIR || "./tmp/demo-copilot-output");

const run = async () => {
  console.log(`\n=== Testing AI Pipeline ===`);
  console.log(`URL: ${TEST_URL}\n`);

  // 1. Analyze
  console.log("Step 1: Analyzing product...");
  const productMap = await analyzeProduct(TEST_URL);
  console.log(`✓ Found ${productMap.flows.length} flows, app type: ${productMap.appType}`);

  // 2. Generate script
  console.log("\nStep 2: Generating demo script...");
  const script = await generateScript(productMap, TEST_URL, "marketing");
  console.log(`✓ Script: "${script.hook}"`);
  console.log(`✓ ${script.scenes.length} scenes, estimated ${Math.round(script.estimatedDurationMs / 1000)}s`);
  script.scenes.forEach((s, i) => {
    console.log(`  Scene ${i + 1}: ${s.title} (${s.actions.length} actions)`);
  });

  // 3. Save output
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, `test-script-${Date.now()}.json`);
  await fs.writeFile(outputPath, JSON.stringify({ productMap, script }, null, 2));
  console.log(`\n✓ Full output saved to: ${outputPath}`);
};

run().catch(console.error);
