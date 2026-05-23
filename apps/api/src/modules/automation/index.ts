import type { DemoScript, Scene } from "@demo-copilot/types";
import { recordScene } from "./executor";

function resolveSceneStartUrl(scene: Scene, baseUrl: string): string {
  const nav = scene.actions.find(
    (a): a is Extract<typeof a, { type: "navigate" }> => a.type === "navigate"
  );
  return nav?.url ?? baseUrl;
}

export async function recordAllScenes(
  script: DemoScript,
  projectId: string,
  baseUrl: string,
  outputDir: string,
  viewport?: { width: number; height: number }
): Promise<Record<string, string>> {
  const segmentMap: Record<string, string> = {};

  for (const scene of script.scenes) {
    const startUrl = resolveSceneStartUrl(scene, baseUrl);
    console.log(`[Automation] Recording scene: ${scene.id} — "${scene.title}" @ ${startUrl}`);

    const recording = await recordScene(
      scene.id,
      projectId,
      startUrl,
      scene.actions,
      outputDir,
      viewport,
      scene.visualFocus
    );
    segmentMap[scene.id] = recording.videoPath;
    console.log(`[Automation] Scene ${scene.id} recorded: ${recording.durationMs}ms`);
  }

  return segmentMap;
}
