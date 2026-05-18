import path from "path";
import type { DemoScript, Scene } from "@demo-copilot/types";
import { recordScene, type SceneRecording } from "./executor";

export async function recordAllScenes(
  script: DemoScript,
  projectId: string,
  baseUrl: string,
  outputDir: string,
  viewport?: { width: number; height: number }
): Promise<Record<string, string>> {
  const segmentMap: Record<string, string> = {}; // sceneId → videoPath

  for (const scene of script.scenes) {
    console.log(`[Automation] Recording scene: ${scene.id} — "${scene.title}"`);
    const recording = await recordScene(
      scene.id,
      projectId,
      baseUrl,
      scene.actions,
      outputDir,
      viewport
    );
    segmentMap[scene.id] = recording.videoPath;
    console.log(`[Automation] Scene ${scene.id} recorded: ${recording.durationMs}ms`);
  }

  return segmentMap;
}
