import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "path";
import fs from "fs/promises";
import type { Caption, Timeline } from "@demo-copilot/types";
import { resolveFfmpegExecutable } from "../../lib/ffmpeg-bin";

const execFileAsync = promisify(execFile);

const FFMPEG_MAX_BUFFER = 20 * 1024 * 1024;

async function execFfmpeg(
  ffmpeg: string,
  args: string[],
  options?: { cwd?: string }
): Promise<void> {
  try {
    await execFileAsync(ffmpeg, args, {
      ...options,
      maxBuffer: FFMPEG_MAX_BUFFER,
      windowsHide: true,
    });
  } catch (e) {
    const ex = e as NodeJS.ErrnoException & { stderr?: Buffer; stdout?: Buffer };
    const tail = [ex.stderr?.toString(), ex.stdout?.toString()]
      .filter(Boolean)
      .join("\n")
      .trim()
      .slice(-6000);
    const preview = args.slice(0, 12).join(" ");
    throw new Error(
      `ffmpeg failed (${ffmpeg} ${preview}${args.length > 12 ? " …" : ""}): ${ex.message ?? String(e)}${
        tail ? `\n--- ffmpeg output ---\n${tail}` : ""
      }`
    );
  }
}

function sceneDurationSec(scene: { startMs: number; endMs: number }): number {
  return Math.max(0.1, (scene.endMs - scene.startMs) / 1000);
}

function formatSrtTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const frac = ms % 1000;
  const pad = (n: number, w: number) => String(n).padStart(w, "0");
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(frac, 3)}`;
}

function escapeSrtText(text: string): string {
  return text.replace(/\r/g, "").replace(/\n/g, " ").replace(/</g, "").trim();
}

/**
 * Build a single SRT from timeline captions (global ms timestamps).
 */
export function captionsToSrt(captions: Caption[]): string {
  const sorted = [...captions].sort((a, b) => a.startMs - b.startMs);
  const lines: string[] = [];
  let idx = 1;
  for (const c of sorted) {
    if (c.endMs <= c.startMs) continue;
    lines.push(String(idx++));
    lines.push(`${formatSrtTime(c.startMs)} --> ${formatSrtTime(c.endMs)}`);
    lines.push(escapeSrtText(c.text) || ".");
    lines.push("");
  }
  return lines.join("\n");
}

async function muxSceneToMp4(params: {
  ffmpeg: string;
  videoPath: string;
  audioPath: string;
  durationSec: number;
  outPath: string;
  width: number;
  height: number;
  fps: number;
}): Promise<void> {
  const { ffmpeg, videoPath, audioPath, durationSec, outPath, width, height, fps } = params;
  const T = durationSec.toFixed(3);
  const filterComplex = [
    `[0:v]fps=${fps},scale=${width}:${height}:force_original_aspect_ratio=decrease,`,
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,setpts=PTS-STARTPTS[v]`,
    `;[1:a]atrim=duration=${T},asetpts=PTS-STARTPTS,apad=whole_dur=${T}[a]`,
  ].join("");

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await execFfmpeg(ffmpeg, [
    "-y",
    "-stream_loop",
    "-1",
    "-i",
    videoPath,
    "-i",
    audioPath,
    "-filter_complex",
    filterComplex,
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-t",
    T,
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    outPath,
  ]);
}

async function concatMp4s(ffmpeg: string, files: string[], outPath: string): Promise<void> {
  const listPath = path.join(path.dirname(outPath), "concat-scenes.txt");
  const listContent = files.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n");
  await fs.writeFile(listPath, listContent, "utf8");

  await execFfmpeg(ffmpeg, [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c",
    "copy",
    outPath,
  ]);
}

async function burnSubtitles(
  ffmpeg: string,
  workDir: string,
  inputBasename: string,
  srtBasename: string,
  outPath: string
): Promise<void> {
  await execFfmpeg(
    ffmpeg,
    [
      "-y",
      "-i",
      inputBasename,
      "-vf",
      `subtitles=${srtBasename}`,
      "-c:a",
      "copy",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "23",
      "-movflags",
      "+faststart",
      outPath,
    ],
    { cwd: workDir }
  );
}

/**
 * Renders timeline to MP4 using ffmpeg: per-scene mux (loop video to fill audio duration),
 * concat, optional SRT captions burn-in.
 */
export async function renderTimelineWithFfmpeg(
  timeline: Timeline,
  projectId: string,
  outputDir: string
): Promise<string> {
  const ffmpeg = resolveFfmpegExecutable();
  const workDir = path.join(outputDir, projectId, "render-work");
  await fs.mkdir(workDir, { recursive: true });

  const sceneFiles: string[] = [];
  let i = 0;
  for (const scene of timeline.scenes) {
    const durationSec = sceneDurationSec(scene);
    const outScene = path.join(workDir, `scene-${String(++i).padStart(3, "0")}.mp4`);
    await muxSceneToMp4({
      ffmpeg,
      videoPath: scene.videoSegmentUrl,
      audioPath: scene.audioSegmentUrl,
      durationSec,
      outPath: outScene,
      width: timeline.resolution.width,
      height: timeline.resolution.height,
      fps: timeline.fps,
    });
    sceneFiles.push(outScene);
  }

  const mergedNoSubs = path.join(workDir, "merged-nosubs.mp4");
  await concatMp4s(ffmpeg, sceneFiles, mergedNoSubs);

  const allCaptions = timeline.scenes.flatMap((s) => s.captions);
  const finalPath = path.join(outputDir, projectId, "final.mp4");
  await fs.mkdir(path.dirname(finalPath), { recursive: true });

  if (allCaptions.length > 0) {
    const srtPath = path.join(workDir, "captions.srt");
    await fs.writeFile(srtPath, captionsToSrt(allCaptions), "utf8");
    try {
      await burnSubtitles(ffmpeg, workDir, "merged-nosubs.mp4", "captions.srt", finalPath);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[Renderer] Subtitle burn-in failed, exporting without burned-in captions: ${msg}`);
      await fs.copyFile(mergedNoSubs, finalPath);
    }
  } else {
    await fs.copyFile(mergedNoSubs, finalPath);
  }

  return finalPath;
}
