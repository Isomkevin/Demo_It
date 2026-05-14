import fs from "fs/promises";
import path from "path";
import type { Timeline } from "@demo-copilot/types";

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

  // Stub: Implement actual copying of video/audio to assets/ 
  // and writing index.html + compositions based on timeline JSON.
  // For now, this is a clear TODO per Task 4.HF instructions.
  
  await fs.writeFile(
    path.join(hfRoot, "meta.json"),
    JSON.stringify({ 
      title: projectId, 
      width: timeline.resolution.width, 
      height: timeline.resolution.height, 
      fps: timeline.fps 
    }, null, 2)
  );

  await fs.writeFile(
    path.join(hfRoot, "index.html"),
    `<!DOCTYPE html>
<html>
<body>
  <!-- TODO: Emit composition elements matching Timeline -->
</body>
</html>`
  );

  return hfRoot;
}
