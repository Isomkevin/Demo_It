/**
 * Creates Demo It products/prices in the Stripe account for the configured STRIPE_SECRET_KEY.
 * Run: pnpm --filter=api stripe:setup
 * Optional: pnpm --filter=api stripe:setup -- --write   (updates repo root .env)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import "../load-env";
import Stripe from "stripe";

type PriceSpec = {
  env: string;
  name: string;
  unitAmount: number;
  recurring?: "month";
  metadata?: Record<string, string>;
};

const PRICES: PriceSpec[] = [
  { env: "STRIPE_PRICE_VIDEO_SINGLE", name: "Demo It — Single demo", unitAmount: 1900 },
  { env: "STRIPE_PRICE_VIDEO_PACK_5", name: "Demo It — 5-pack", unitAmount: 7900 },
  {
    env: "STRIPE_PRICE_STARTER",
    name: "Demo It — Starter",
    unitAmount: 2900,
    recurring: "month",
    metadata: { plan_tier: "starter" },
  },
  {
    env: "STRIPE_PRICE_PRO",
    name: "Demo It — Pro",
    unitAmount: 7900,
    recurring: "month",
    metadata: { plan_tier: "pro" },
  },
  {
    env: "STRIPE_PRICE_TEAM",
    name: "Demo It — Team (per seat)",
    unitAmount: 6600,
    recurring: "month",
    metadata: { plan_tier: "team" },
  },
];

function rootEnvPath(): string {
  return path.resolve(process.cwd(), "..", "..", ".env");
}

function updateEnvFile(envPath: string, updates: Record<string, string>): void {
  if (!existsSync(envPath)) {
    console.error(`No .env at ${envPath}`);
    process.exit(1);
  }
  let content = readFileSync(envPath, "utf8");
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}="${value}"`;
    const re = new RegExp(`^${key}=.*$`, "m");
    if (re.test(content)) {
      content = content.replace(re, line);
    } else {
      content += `\n${line}\n`;
    }
  }
  writeFileSync(envPath, content, "utf8");
}

async function main(): Promise<void> {
  const write = process.argv.includes("--write");
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    console.error("❌ STRIPE_SECRET_KEY is missing");
    process.exit(1);
  }

  const stripe = new Stripe(secret);
  const updates: Record<string, string> = {};

  console.log("\nCreating Stripe products & prices (test/live per your secret key)…\n");

  for (const spec of PRICES) {
    const product = await stripe.products.create({
      name: spec.name,
      metadata: spec.metadata,
    });

    const price = await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: spec.unitAmount,
      ...(spec.recurring
        ? {
            recurring: { interval: spec.recurring },
            metadata: spec.metadata,
          }
        : {}),
    });

    updates[spec.env] = price.id;
    const label = spec.recurring
      ? `$${(spec.unitAmount / 100).toFixed(2)}/mo`
      : `$${(spec.unitAmount / 100).toFixed(2)} one-time`;
    console.log(`✅ ${spec.env}`);
    console.log(`   ${spec.name} → ${price.id} (${label})\n`);
  }

  console.log("Add these to your root .env:\n");
  for (const [key, value] of Object.entries(updates)) {
    console.log(`${key}="${value}"`);
  }

  if (write) {
    const envPath = rootEnvPath();
    updateEnvFile(envPath, updates);
    const apiEnv = path.resolve(process.cwd(), ".env");
    if (existsSync(apiEnv) && apiEnv !== envPath) {
      updateEnvFile(apiEnv, updates);
    }
    console.log(`\n✅ Updated ${envPath}`);
  } else {
    console.log("\nTip: re-run with --write to patch .env automatically, then: pnpm --filter=api stripe:check");
  }
}

void main();
