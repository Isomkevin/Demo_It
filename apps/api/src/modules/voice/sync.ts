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
