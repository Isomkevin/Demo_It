import { execFileSync } from "node:child_process";
import * as ffmpegStaticNs from "ffmpeg-static";

function tryFfmpegFromSystemPath(): string | null {
  try {
    if (process.platform === "win32") {
      const out = execFileSync("where.exe", ["ffmpeg"], {
        encoding: "utf8",
        windowsHide: true,
      }).trim();
      const line = out.split(/\r?\n/).find((l) => l.trim().length > 0);
      return line?.trim() ?? null;
    }
    const out = execFileSync("sh", ["-c", "command -v ffmpeg 2>/dev/null"], {
      encoding: "utf8",
    }).trim();
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

/**
 * Resolves ffmpeg: `FFMPEG_PATH`, then `ffmpeg` on PATH, then `ffmpeg-static`.
 */
export function resolveFfmpegExecutable(): string {
  const fromEnv = process.env.FFMPEG_PATH?.trim();
  if (fromEnv) return fromEnv;

  const fromPath = tryFfmpegFromSystemPath();
  if (fromPath) return fromPath;

  const ns = ffmpegStaticNs as unknown as { default?: unknown };
  const fromDefault = ns.default;
  const candidate =
    typeof fromDefault === "string" && fromDefault.length > 0
      ? fromDefault
      : typeof ffmpegStaticNs === "string"
        ? (ffmpegStaticNs as unknown as string)
        : null;
  if (!candidate || candidate.length === 0) {
    throw new Error(
      "Could not find ffmpeg. Install FFmpeg and ensure it is on PATH, or set FFMPEG_PATH in .env to the full path to ffmpeg (see .env.example)."
    );
  }
  return candidate;
}
