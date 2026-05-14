import * as ffmpegStaticNs from "ffmpeg-static";

/**
 * Resolves the ffmpeg binary: `FFMPEG_PATH` when set (e.g. Docker uses distro ffmpeg),
 * otherwise the path from `ffmpeg-static`.
 */
export function resolveFfmpegExecutable(): string {
  const fromEnv = process.env.FFMPEG_PATH?.trim();
  if (fromEnv) return fromEnv;

  const ns = ffmpegStaticNs as unknown as { default?: unknown };
  const fromDefault = ns.default;
  const candidate =
    typeof fromDefault === "string" && fromDefault.length > 0
      ? fromDefault
      : typeof ffmpegStaticNs === "string"
        ? (ffmpegStaticNs as unknown as string)
        : null;
  if (!candidate || candidate.length === 0) {
    throw new Error("ffmpeg-static did not resolve to a binary path");
  }
  return candidate;
}
