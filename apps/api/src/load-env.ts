import { existsSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";

/**
 * Load monorepo root `.env` first, then `apps/api/.env` overrides (when cwd is apps/api).
 */
const rootEnv = path.resolve(process.cwd(), "..", "..", ".env");
const localEnv = path.resolve(process.cwd(), ".env");

if (existsSync(rootEnv)) config({ path: rootEnv });
if (existsSync(localEnv) && localEnv !== rootEnv) config({ path: localEnv, override: true });
