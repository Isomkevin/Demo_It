import * as ffmpegStaticNs from "ffmpeg-static";

/**
 * Path to the ffmpeg-static binary (bundled with the api package).
 */
export function resolveFfmpegExecutable(): string {
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
