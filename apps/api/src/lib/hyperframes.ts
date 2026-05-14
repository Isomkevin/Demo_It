import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Runs `hyperframes render` in an initialized HyperFrames project directory.
 * Docs: https://hyperframes.heygen.com/quickstart
 *
 * Prerequisites: Node.js 22+, FFmpeg on PATH, and a valid HyperFrames project
 * (e.g. from `npx hyperframes init …`).
 */
export async function runHyperframesRender(params: {
  projectDir: string;
  outputFile: string;
}): Promise<void> {
  const npx =
    process.env.HYPERFRAMES_NPX?.trim() ||
    (process.platform === "win32" ? "npx.cmd" : "npx");
  const args = ["hyperframes", "render", "--output", params.outputFile];
  await execFileAsync(npx, args, {
    cwd: params.projectDir,
    env: process.env,
  });
}
