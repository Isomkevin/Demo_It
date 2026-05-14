import ffmpeg from "fluent-ffmpeg";
import * as ffmpegStaticPkg from "ffmpeg-static";
import path from "path";
import fs from "fs/promises";

const ffmpegPath = (ffmpegStaticPkg as any).default || ffmpegStaticPkg;
if (typeof ffmpegPath === "string") {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

export async function mergeSegmentsToMP4(
  segmentPaths: string[],
  outputPath: string
): Promise<string> {
  // Create concat list file for ffmpeg
  const listPath = path.join(path.dirname(outputPath), "concat.txt");
  const listContent = segmentPaths.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n");
  await fs.writeFile(listPath, listContent);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listPath)
      .inputOptions(["-f concat", "-safe 0"])
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions(["-crf 23", "-preset fast", "-movflags +faststart"])
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", reject)
      .run();
  });
}
