import { ElevenLabsClient } from "elevenlabs";
import fs from "fs/promises";
import path from "path";
import { generateMockNarration, shouldFallbackToMockVoice, voiceMockEnabled } from "./voice-mock";

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
  if (voiceMockEnabled()) {
    return generateMockNarration(text, outputPath);
  }

  // Ensure directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  try {
    return await generateNarrationFromElevenLabs(text, outputPath, voiceId);
  } catch (err) {
    if (shouldFallbackToMockVoice(err)) {
      return generateMockNarration(text, outputPath);
    }
    throw err;
  }
}

async function generateNarrationFromElevenLabs(
  text: string,
  outputPath: string,
  voiceId: string
): Promise<GeneratedAudio> {
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
export type VoiceListItem = {
  voiceId: string;
  name: string;
  category?: string;
};

export async function listAvailableVoices(): Promise<VoiceListItem[]> {
  if (voiceMockEnabled() || !process.env.ELEVENLABS_API_KEY) {
    return [
      { voiceId: DEFAULT_VOICE_ID, name: "Rachel (default)" },
      { voiceId: "EXAVITQu4vr4xnSDxMaL", name: "Bella" },
      { voiceId: "VR6AewLTigWG4xSOukaG", name: "Arnold" },
    ];
  }

  const response = await client.voices.getAll();
  const voices = response.voices ?? [];
  return voices
    .filter((v) => v.voice_id)
    .map((v) => ({
      voiceId: v.voice_id!,
      name: v.name ?? v.voice_id!,
      category: v.category ?? undefined,
    }))
    .slice(0, 24);
}

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
