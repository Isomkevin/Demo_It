import path from "path";
import fs from "fs/promises";
import type { Timeline } from "@demo-copilot/types";
import { runHyperframesRender } from "../../lib/hyperframes";
import { emitHyperframesProject } from "./hyperframes-project";
import { renderTimelineWithFfmpeg } from "./ffmpeg-timeline";

export async function renderTimelineToMP4(
  timeline: Timeline,
  projectId: string,
  outputDir: string
): Promise<string> {
  const backend = process.env.RENDER_BACKEND || "hyperframes";

  if (backend === "remotion") {
    throw new Error("Remotion backend is not implemented in this MVP.");
  }

  if (backend === "hyperframes") {
    const outputFile = path.join(outputDir, projectId, "final.mp4");
    await fs.mkdir(path.dirname(outputFile), { recursive: true });

    try {
      const projectDir = await emitHyperframesProject(timeline, projectId, outputDir);
      await runHyperframesRender({ projectDir, outputFile });
      const st = await fs.stat(outputFile).catch(() => null);
      if (st && st.size > 1000) {
        return outputFile;
      }
      if (st) {
        console.warn(
          `[Renderer] HyperFrames produced a tiny file (${st.size} bytes); trying FFmpeg timeline compositor`
        );
      } else {
        console.warn(`[Renderer] HyperFrames did not produce ${outputFile}; trying FFmpeg timeline compositor`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Renderer] HyperFrames render skipped or failed:\n${msg}`);
    }

    console.log(`[Renderer] Falling back to FFmpeg timeline compositor`);
    return renderTimelineWithFfmpeg(timeline, projectId, outputDir);
  }

  throw new Error(`Unknown render backend: ${backend}`);
}
