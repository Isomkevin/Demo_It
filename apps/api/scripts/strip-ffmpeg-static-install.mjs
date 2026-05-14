import { execSync } from "node:child_process";
import fs from "node:fs";

const cwd = process.cwd();
const out = execSync(
  "find node_modules/.pnpm -path '*/ffmpeg-static@*/node_modules/ffmpeg-static/package.json' 2>/dev/null || true",
  { encoding: "utf8", cwd, shell: "/bin/sh" }
);

for (const line of out.trim().split("\n")) {
  if (!line) continue;
  const j = JSON.parse(fs.readFileSync(line, "utf8"));
  if (j.scripts) delete j.scripts.install;
  fs.writeFileSync(line, JSON.stringify(j, null, 2));
}
