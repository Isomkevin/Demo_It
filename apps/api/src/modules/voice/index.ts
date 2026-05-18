import path from "path";
import { DEFAULT_VOICE_ID, generateNarration, getWordTimings } from "../../lib/elevenlabs";
import type { DemoScript, VoiceOutput } from "@demo-copilot/types";

export async function generateAllNarrations(
  script: DemoScript,
  projectId: string,
  outputDir: string,
  voiceId: string = DEFAULT_VOICE_ID
): Promise<VoiceOutput[]> {
  const audioDir = path.join(outputDir, projectId, "audio");
  const outputs: VoiceOutput[] = [];

  for (const scene of script.scenes) {
    console.log(`[Voice] Generating audio for scene: ${scene.id}`);
    const audioPath = path.join(audioDir, `${scene.id}.mp3`);

    const { audioPath: savedPath, durationMs } = await generateNarration(
      scene.narration,
      audioPath,
      voiceId
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
