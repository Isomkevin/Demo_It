import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.join(__dirname, "..", "..", ".env");
const localEnv = path.join(__dirname, ".env.local");
const envLocal = path.join(__dirname, ".env");

if (existsSync(rootEnv)) config({ path: rootEnv });
if (existsSync(envLocal)) config({ path: envLocal });
if (existsSync(localEnv)) config({ path: localEnv });

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
