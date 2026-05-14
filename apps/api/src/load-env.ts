import { existsSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";

/**
 * Load `.env` from `apps/api` or monorepo root so `pnpm dev` picks up DATABASE_URL, keys, etc.
 */
const candidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "..", "..", ".env"),
];

for (const envPath of candidates) {
  if (existsSync(envPath)) {
    config({ path: envPath });
    break;
  }
}
