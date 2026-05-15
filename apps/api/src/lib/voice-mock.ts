import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "fs/promises";
import path from "path";
import { resolveFfmpegExecutable } from "./ffmpeg-bin";

export type GeneratedAudio = {
  audioPath: string;
  durationMs: number;
};

const execFileAsync = promisify(execFile);

/** ~150 wpm; minimum 2s per scene for timeline sync. */
export function estimateNarrationDurationMs(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(2000, Math.round((words / 2.5) * 1000));
}

export function voiceMockEnabled(): boolean {
  const v = process.env.VOICE_MOCK?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function shouldFallbackToMockVoice(err: unknown): boolean {
  if (voiceMockEnabled()) return true;
  const code = (err as { statusCode?: number })?.statusCode;
  if (code === 401 || code === 402 || code === 429) {
    console.warn(
      `[Voice] ElevenLabs returned ${code}; using silent mock narration. Set VOICE_MOCK=1 to skip API calls, or add credits to your ElevenLabs account.`
    );
    return true;
  }
  return false;
}

/** Silent MP3 placeholder so the render pipeline can finish without ElevenLabs quota. */
export async function generateMockNarration(
  text: string,
  outputPath: string
): Promise<GeneratedAudio> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const durationMs = estimateNarrationDurationMs(text);
  const durationSec = (durationMs / 1000).toFixed(3);
  const ffmpeg = resolveFfmpegExecutable();

  await execFileAsync(
    ffmpeg,
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=44100:cl=mono",
      "-t",
      durationSec,
      "-c:a",
      "libmp3lame",
      "-b:a",
      "128k",
      outputPath,
    ],
    { windowsHide: true }
  );

  return { audioPath: outputPath, durationMs };
}
