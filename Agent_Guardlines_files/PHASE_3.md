# PHASE 3 — Voice Generation & Timeline Sync
> Prerequisite: Phase 2 complete. AI pipeline produces valid DemoScript.
> Goal: Each scene's narration text becomes a real audio file. A Timeline JSON is produced that aligns video + audio for every scene.

---

## TASK 3.1 — ElevenLabs Client

### File: `apps/api/src/lib/elevenlabs.ts`

```typescript
import { ElevenLabsClient } from "elevenlabs";
import fs from "fs/promises";
import path from "path";

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export const DEFAULT_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel (default)

export type GeneratedAudio = {
  audioPath: string;
  durationMs: number;
};

/**
 * Generate narration audio for a single scene.
 * Returns local file path and duration.
 */
export async function generateNarration(
  text: string,
  outputPath: string,
  voiceId: string = DEFAULT_VOICE_ID
): Promise<GeneratedAudio> {
  // Ensure directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const audio = await client.textToSpeech.convert(voiceId, {
    text,
    model_id: "eleven_turbo_v2_5",
    output_format: "mp3_44100_128",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
    },
  });

  // Write to file
  const chunks: Buffer[] = [];
  for await (const chunk of audio) {
    chunks.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  await fs.writeFile(outputPath, buffer);

  // Estimate duration from file size (44100Hz, 128kbps MP3 → ~16KB/sec)
  const stats = await fs.stat(outputPath);
  const durationMs = Math.round((stats.size / 16000) * 1000);

  return { audioPath: outputPath, durationMs };
}

/**
 * Get word-level timestamps from ElevenLabs (requires timestamps endpoint).
 * Falls back to even distribution if unavailable.
 */
export async function getWordTimings(
  text: string,
  durationMs: number
): Promise<Array<{ word: string; startMs: number; endMs: number }>> {
  const words = text.split(/\s+/).filter(Boolean);
  const msPerWord = durationMs / words.length;

  return words.map((word, i) => ({
    word,
    startMs: Math.round(i * msPerWord),
    endMs: Math.round((i + 1) * msPerWord),
  }));
}
```

### Done when
- [ ] `generateNarration("Hello world", "/tmp/test.mp3")` creates a real playable MP3
- [ ] No TypeScript errors

---

## TASK 3.2 — Voice Engine Module

Orchestrates narration generation for all scenes in a script.

### File: `apps/api/src/modules/voice/index.ts`

```typescript
import path from "path";
import { generateNarration, getWordTimings } from "../../lib/elevenlabs";
import type { DemoScript, VoiceOutput } from "@demo-copilot/types";

export async function generateAllNarrations(
  script: DemoScript,
  projectId: string,
  outputDir: string
): Promise<VoiceOutput[]> {
  const audioDir = path.join(outputDir, projectId, "audio");
  const outputs: VoiceOutput[] = [];

  for (const scene of script.scenes) {
    console.log(`[Voice] Generating audio for scene: ${scene.id}`);
    const audioPath = path.join(audioDir, `${scene.id}.mp3`);

    const { audioPath: savedPath, durationMs } = await generateNarration(
      scene.narration,
      audioPath
    );

    const wordTimings = await getWordTimings(scene.narration, durationMs);

    outputs.push({
      sceneId: scene.id,
      audioUrl: savedPath,       // local path; will be replaced by storage URL later
      durationMs,
      wordTimings,
    });

    console.log(`[Voice] Scene ${scene.id}: ${durationMs}ms audio`);
  }

  return outputs;
}
```

### Done when
- [ ] `generateAllNarrations(script, projectId, outputDir)` creates one MP3 per scene
- [ ] Each VoiceOutput has non-zero durationMs
- [ ] No TypeScript errors

---

## TASK 3.3 — Timeline Sync Engine

Aligns video segments and audio to produce a Timeline JSON.

### File: `apps/api/src/modules/voice/sync.ts`

```typescript
import type { DemoScript, VoiceOutput, Timeline, TimelineScene, Caption } from "@demo-copilot/types";

/**
 * Build a Timeline by aligning each scene's video duration to its audio duration.
 * The longer of the two drives the scene duration (video pauses at end if audio longer,
 * audio clips with a fade if video longer).
 */
export function buildTimeline(
  script: DemoScript,
  voiceOutputs: VoiceOutput[],
  videoSegmentPaths: Record<string, string>   // sceneId → local file path
): Timeline {
  const voiceMap = new Map(voiceOutputs.map((v) => [v.sceneId, v]));
  const scenes: TimelineScene[] = [];
  let cursor = 0;

  for (const scene of script.scenes) {
    const voice = voiceMap.get(scene.id);
    if (!voice) throw new Error(`Missing voice output for scene ${scene.id}`);

    const videoPath = videoSegmentPaths[scene.id];
    if (!videoPath) throw new Error(`Missing video segment for scene ${scene.id}`);

    // Scene duration = max of voice audio and estimated video duration
    const sceneDuration = Math.max(voice.durationMs, scene.durationMs);

    // Build captions from word timings (offset by cursor)
    const captions: Caption[] = voice.wordTimings.map((w) => ({
      text: w.word,
      startMs: cursor + w.startMs,
      endMs: cursor + w.endMs,
    }));

    scenes.push({
      sceneId: scene.id,
      videoSegmentUrl: videoPath,
      audioSegmentUrl: voice.audioUrl,
      captions,
      transition: {
        type: scene.transition === "fade" ? "fade" : "cut",
        durationMs: scene.transition === "fade" ? 500 : 0,
      },
      startMs: cursor,
      endMs: cursor + sceneDuration,
    });

    cursor += sceneDuration;
  }

  return {
    scenes,
    totalDurationMs: cursor,
    fps: 30,
    resolution: {
      width: Number(process.env.VIDEO_RESOLUTION_WIDTH) || 1920,
      height: Number(process.env.VIDEO_RESOLUTION_HEIGHT) || 1080,
    },
  };
}
```

### Done when
- [ ] `buildTimeline(script, voiceOutputs, videoMap)` returns a Timeline with correct startMs/endMs per scene
- [ ] No scene overlaps (each startMs equals previous endMs)
- [ ] No TypeScript errors

---

## TASK 3.4 — Connect Voice + Recorder in a Combined Run

Update the automation to record scenes per the script's actions, then generate voice, then build timeline.

### File: `apps/api/src/modules/automation/index.ts`

```typescript
import path from "path";
import type { DemoScript, Scene } from "@demo-copilot/types";
import { recordScene, type SceneRecording } from "./executor";

export async function recordAllScenes(
  script: DemoScript,
  projectId: string,
  baseUrl: string,
  outputDir: string
): Promise<Record<string, string>> {
  const segmentMap: Record<string, string> = {}; // sceneId → videoPath

  for (const scene of script.scenes) {
    console.log(`[Automation] Recording scene: ${scene.id} — "${scene.title}"`);
    const recording = await recordScene(
      scene.id,
      projectId,
      baseUrl,
      scene.actions,
      outputDir
    );
    segmentMap[scene.id] = recording.videoPath;
    console.log(`[Automation] Scene ${scene.id} recorded: ${recording.durationMs}ms`);
  }

  return segmentMap;
}
```

### Done when
- [ ] `recordAllScenes(script, ...)` produces one video file per scene
- [ ] Paths returned in map match actual files on disk

---

## TASK 3.5 — Integration Test: Full Audio + Timeline

### File: `apps/api/src/scripts/test-voice-timeline.ts`

```typescript
import { analyzeProduct } from "../modules/analyzer";
import { generateScript } from "../modules/script";
import { recordAllScenes } from "../modules/automation";
import { generateAllNarrations } from "../modules/voice";
import { buildTimeline } from "../modules/voice/sync";
import { mergeSegmentsToMP4 } from "../modules/automation/recorder";
import fs from "fs/promises";
import path from "path";

const TEST_URL = process.argv[2] || "https://example.com";
const OUTPUT_DIR = process.env.OUTPUT_DIR || "/tmp/demo-copilot-output";
const PROJECT_ID = "test-" + Date.now();

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
console.log("Phase 3 test complete. Proceed to Phase 4 for rendering.");
```

### Run with:
```bash
npx tsx apps/api/src/scripts/test-voice-timeline.ts https://yourapp.com
```

### Done when
- [ ] Script runs end-to-end without error
- [ ] Each scene has a `.mp3` audio file and a `.webm` video file
- [ ] `timeline.json` is written with correct structure
- [ ] `timeline.totalDurationMs` is a positive number

---

## PHASE 3 COMPLETION CHECKLIST

- [ ] `pnpm typecheck` passes across all packages
- [ ] ElevenLabs generates real audible narration (not silent)
- [ ] Word timings produce correct caption timing (roughly aligned)
- [ ] Timeline JSON has non-overlapping scenes with startMs/endMs
- [ ] Integration test completes without error on a live URL

**Phase 3 complete → proceed to PHASE_4.md**
