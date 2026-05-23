import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy: (times) => (times > 3 ? null : Math.min(times * 500, 2000)),
});

const REDIS_HELP = `
Redis is not reachable at ${REDIS_URL}

Demo Copilot needs Redis for the demo pipeline job queue (BullMQ).

Fix (pick one):
  1. Start Docker Desktop, then from the repo root:
       docker compose up -d redis postgres
  2. Or run: pnpm infra:up
  3. Cloud Redis: set REDIS_URL in .env (e.g. Upstash free tier)

Then restart the API (pnpm dev).
`.trim();

/** Fail fast with a clear message before workers connect. */
export async function ensureRedisReady(timeoutMs = 8000): Promise<void> {
  const client = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: timeoutMs,
    lazyConnect: true,
  });

  try {
    await client.connect();
    await client.ping();
    await client.quit();
    await redis.connect().catch(() => {});
  } catch {
    try {
      await client.quit();
    } catch {
      /* ignore */
    }
    console.error("\n[Redis] Connection failed\n");
    console.error(REDIS_HELP);
    throw new Error("Redis unavailable — see instructions above");
  }
}
