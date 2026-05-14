import path from "node:path";

const defaultDir = () => path.join(process.cwd(), "tmp", "demo-copilot-output");

/**
 * Resolves OUTPUT_DIR: defaults under cwd, and avoids Unix `/tmp/...` on Windows
 * (common in copied `.env.example` values) which often does not exist or is wrong.
 */
export function resolveOutputDir(): string {
  const raw = process.env.OUTPUT_DIR?.trim();
  if (!raw) return defaultDir();

  const normalized = raw.replace(/\\/g, "/");
  if (
    process.platform === "win32" &&
    (normalized.startsWith("/tmp/") || normalized === "/tmp")
  ) {
    const fallback = defaultDir();
    console.warn(
      `[config] OUTPUT_DIR="${raw}" is a Unix-style path on Windows; using "${fallback}". Set OUTPUT_DIR to a Windows path if you need a different folder.`
    );
    return fallback;
  }

  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}
