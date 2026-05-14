import fs from "fs/promises";
import path from "path";
import type { Timeline } from "@demo-copilot/types";

/**
 * Emits a HyperFrames-oriented project folder: copies scene media into `assets/`,
 * writes `timeline.json` + `meta.json`, and a minimal `index.html` for CLI debugging.
 * Full HF compositions can be layered on top per Phase 4.HF.
 */
export async function emitHyperframesProject(
  timeline: Timeline,
  projectId: string,
  outputDir: string
): Promise<string> {
  const hfRoot = path.join(
    outputDir,
    process.env.HYPERFRAMES_PROJECTS_DIR || "hyperframes-projects",
    projectId
  );
  const assetsDir = path.join(hfRoot, "assets");

  await fs.mkdir(assetsDir, { recursive: true });

  for (const scene of timeline.scenes) {
    const extV = path.extname(scene.videoSegmentUrl) || ".webm";
    const extA = path.extname(scene.audioSegmentUrl) || ".mp3";
    const vDest = path.join(assetsDir, `${scene.sceneId}-video${extV}`);
    const aDest = path.join(assetsDir, `${scene.sceneId}-audio${extA}`);
    await fs.copyFile(scene.videoSegmentUrl, vDest);
    await fs.copyFile(scene.audioSegmentUrl, aDest);
  }

  await fs.writeFile(path.join(hfRoot, "timeline.json"), JSON.stringify(timeline, null, 2), "utf8");

  await fs.writeFile(
    path.join(hfRoot, "meta.json"),
    JSON.stringify(
      {
        title: projectId,
        width: timeline.resolution.width,
        height: timeline.resolution.height,
        fps: timeline.fps,
      },
      null,
      2
    ),
    "utf8"
  );

  await fs.writeFile(
    path.join(hfRoot, "index.html"),
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>${projectId}</title></head>
<body>
  <p>Assets and timeline.json are emitted for HyperFrames / manual composition.</p>
</body>
</html>`,
    "utf8"
  );

  return hfRoot;
}
