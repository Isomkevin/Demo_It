# PHASE 4 — Rendering Engine (HyperFrames + Remotion + FFmpeg)
> Prerequisite: Phase 3 complete. Timeline JSON with video + audio paths is produced.
> Goal: Consume Timeline JSON → render a cinematic MP4 with captions, transitions, and audio baked in.

---

## HyperFrames (preferred — HeyGen)

**Product:** [HyperFrames](https://hyperframes.heygen.com/) — AI/agent-friendly video as HTML/CSS/JS; **CLI:** `npx hyperframes init | preview | render` ([quickstart](https://hyperframes.heygen.com/quickstart)).

**Project integration:** `apps/api/src/lib/hyperframes.ts` exposes `runHyperframesRender({ projectDir, outputFile })`. Env: `RENDER_BACKEND=hyperframes` (default in `.env.example`), `HYPERFRAMES_PROJECTS_DIR`, optional `HYPERFRAMES_NPX`. Types: `RenderBackend` in `@demo-copilot/types`.

**Agent workflow:** `npx skills add heygen-com/hyperframes` so generated compositions use correct `data-*` clip semantics, GSAP registration, etc.

### TASK 4.HF — HyperFrames project + render (outline)

1. Scaffold once manually or in CI: `npx hyperframes init <template> --non-interactive` to learn the folder layout (`meta.json`, `index.html`, `compositions/`, `assets/`).
2. Implement a builder (e.g. `modules/renderer/hyperframes-project.ts`) that copies Playwright **segment** files + TTS audio into `assets/`, writes `index.html` / compositions with `class="clip"` timing aligned to `Timeline` from `@demo-copilot/types`.
3. From the render worker, if `process.env.RENDER_BACKEND !== "remotion"`, call `runHyperframesRender` with `projectDir` and `outputFile` → `OUTPUT_DIR/[projectId]/final.mp4`.
4. Validate: same completion criteria as Task 4.7 (playable MP4, captions, audio).

### Done when (HyperFrames path)

- [ ] `runHyperframesRender` succeeds against a hand-built HF project checked into a fixture or generated in `/tmp`
- [ ] Documented in orchestrator behind `RENDER_BACKEND`

---

## Remotion path (alternate when `RENDER_BACKEND=remotion`)

The tasks below (4.1–4.7) implement the **Remotion** renderer. Skip or defer if shipping HyperFrames-only MVP.

---

## TASK 4.1 — Remotion App Setup

Remotion is a React-based video renderer. Set it up as a sub-app inside the api directory.

### Steps

1. Install Remotion in `apps/api`:
```bash
pnpm --filter=api add @remotion/renderer @remotion/core remotion react react-dom
pnpm --filter=api add -D @types/react @types/react-dom
```

2. Create Remotion composition directory:
```
apps/api/src/modules/renderer/
├── compositions/
│   ├── Root.tsx              # Remotion root — registers compositions
│   ├── DemoVideo.tsx         # Main video composition
│   └── components/
│       ├── SceneLayer.tsx    # Renders one scene (video + captions)
│       ├── CaptionOverlay.tsx
│       └── FadeTransition.tsx
├── index.ts                  # Renderer module entry
└── render.ts                 # Remotion renderMedia call
```

---

## TASK 4.2 — Remotion Root Composition

### File: `apps/api/src/modules/renderer/compositions/Root.tsx`

```tsx
import { Composition } from "remotion";
import { DemoVideo } from "./DemoVideo";
import type { Timeline } from "@demo-copilot/types";

// This is required by Remotion — registers all compositions
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="DemoVideo"
        component={DemoVideo}
        durationInFrames={1800}  // placeholder; overridden at render time
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ timeline: null as unknown as Timeline }}
      />
    </>
  );
};
```

---

## TASK 4.3 — Main Video Composition

### File: `apps/api/src/modules/renderer/compositions/DemoVideo.tsx`

```tsx
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneLayer } from "./components/SceneLayer";
import type { Timeline } from "@demo-copilot/types";

type Props = {
  timeline: Timeline;
};

export const DemoVideo: React.FC<Props> = ({ timeline }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {timeline.scenes.map((scene) => {
        const startFrame = Math.round((scene.startMs / 1000) * fps);
        const durationFrames = Math.round(((scene.endMs - scene.startMs) / 1000) * fps);

        return (
          <Sequence
            key={scene.sceneId}
            from={startFrame}
            durationInFrames={durationFrames}
          >
            <SceneLayer scene={scene} fps={fps} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
```

---

## TASK 4.4 — Scene Layer Component

### File: `apps/api/src/modules/renderer/compositions/components/SceneLayer.tsx`

```tsx
import { AbsoluteFill, Video, Audio, useCurrentFrame } from "remotion";
import { CaptionOverlay } from "./CaptionOverlay";
import type { TimelineScene } from "@demo-copilot/types";

type Props = {
  scene: TimelineScene;
  fps: number;
};

export const SceneLayer: React.FC<Props> = ({ scene, fps }) => {
  const frame = useCurrentFrame();
  const currentMs = (frame / fps) * 1000 + scene.startMs;

  return (
    <AbsoluteFill>
      {/* Video layer */}
      <Video
        src={scene.videoSegmentUrl}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* Audio layer */}
      <Audio src={scene.audioSegmentUrl} />

      {/* Caption overlay */}
      <CaptionOverlay
        captions={scene.captions}
        currentMs={currentMs}
      />
    </AbsoluteFill>
  );
};
```

---

## TASK 4.5 — Caption Overlay Component

### File: `apps/api/src/modules/renderer/compositions/components/CaptionOverlay.tsx`

```tsx
import { AbsoluteFill } from "remotion";
import type { Caption } from "@demo-copilot/types";

type Props = {
  captions: Caption[];
  currentMs: number;
};

export const CaptionOverlay: React.FC<Props> = ({ captions, currentMs }) => {
  // Find all words active right now
  const activeWords = captions
    .filter((c) => currentMs >= c.startMs && currentMs <= c.endMs)
    .map((c) => c.text);

  // Build the full sentence (last 8 words visible)
  const visibleSentence = captions
    .filter((c) => c.startMs <= currentMs)
    .slice(-8)
    .map((c) => c.text)
    .join(" ");

  if (!visibleSentence) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 80,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(0,0,0,0.7)",
          borderRadius: 12,
          padding: "16px 32px",
          maxWidth: "80%",
          textAlign: "center",
        }}
      >
        <span
          style={{
            color: "#ffffff",
            fontSize: 42,
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            lineHeight: 1.4,
          }}
        >
          {visibleSentence}
        </span>
      </div>
    </AbsoluteFill>
  );
};
```

---

## TASK 4.6 — Renderer Module Entry

### File: `apps/api/src/modules/renderer/render.ts`

```typescript
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import type { Timeline } from "@demo-copilot/types";

export async function renderTimelineToMP4(
  timeline: Timeline,
  projectId: string,
  outputDir: string
): Promise<string> {
  const outputPath = path.join(outputDir, projectId, "final.mp4");
  const compositionPath = path.join(
    __dirname,
    "compositions/Root.tsx"
  );

  const totalDurationFrames = Math.ceil((timeline.totalDurationMs / 1000) * timeline.fps);

  console.log(`[Renderer] Rendering ${totalDurationFrames} frames @ ${timeline.fps}fps`);
  console.log(`[Renderer] Output: ${outputPath}`);

  const composition = await selectComposition({
    serveUrl: compositionPath,
    id: "DemoVideo",
    inputProps: { timeline },
  });

  await renderMedia({
    composition: {
      ...composition,
      durationInFrames: totalDurationFrames,
      width: timeline.resolution.width,
      height: timeline.resolution.height,
    },
    serveUrl: compositionPath,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: { timeline },
    onProgress: ({ progress }) => {
      process.stdout.write(`\r[Renderer] Progress: ${Math.round(progress * 100)}%`);
    },
  });

  console.log(`\n[Renderer] ✓ Render complete: ${outputPath}`);
  return outputPath;
}
```

### File: `apps/api/src/modules/renderer/index.ts`

```typescript
export { renderTimelineToMP4 } from "./render";
```

---

## TASK 4.7 — Integration Test: Timeline → MP4

### File: `apps/api/src/scripts/test-render.ts`

```typescript
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

const OUTPUT_DIR = process.env.OUTPUT_DIR || "/tmp/demo-copilot-output";
const PROJECT_ID = "render-" + Date.now();

const raw = await fs.readFile(timelinePath, "utf-8");
const timeline: Timeline = JSON.parse(raw);

console.log(`\n=== Phase 4 Render Test ===`);
console.log(`Scenes: ${timeline.scenes.length}`);
console.log(`Total duration: ${Math.round(timeline.totalDurationMs / 1000)}s\n`);

const mp4Path = await renderTimelineToMP4(timeline, PROJECT_ID, OUTPUT_DIR);

const stats = await fs.stat(mp4Path);
console.log(`\n✓ MP4 created: ${mp4Path}`);
console.log(`✓ File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
```

### Run with:
```bash
npx tsx apps/api/src/scripts/test-render.ts /tmp/demo-copilot-output/test-123/timeline.json
```

### Done when
- [ ] Script produces a valid MP4 file with video + audio baked in
- [ ] Captions appear at the bottom during narration
- [ ] File is > 1MB (non-trivial content)
- [ ] Playable in VLC or Chrome

---

## PHASE 4 COMPLETION CHECKLIST

- [ ] **HyperFrames (default):** `runHyperframesRender` documented and callable from pipeline; HF project emission plan implemented or stubbed with clear TODO per Task 4.HF
- [ ] **Remotion (optional):** If `RENDER_BACKEND=remotion`, `pnpm typecheck` passes and `renderTimelineToMP4(timeline, ...)` produces a valid MP4 (not corrupted)
- [ ] `pnpm typecheck` passes across all packages
- [ ] Video has correct resolution (1920×1080)
- [ ] Audio is present and synced to video
- [ ] Captions appear and are readable
- [ ] Render test runs without error using a real timeline from Phase 3

**Phase 4 complete → proceed to PHASE_5.md**
