/**
 * Maps active Stripe prices (by product name) to STRIPE_PRICE_* env vars.
 * Run: pnpm --filter=api stripe:sync
 *      pnpm --filter=api stripe:sync -- --write
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import "../load-env";
import Stripe from "stripe";

type Mapping = {
  env: string;
  match: RegExp;
  subscription: boolean;
  planTier?: string;
};

const MAPPINGS: Mapping[] = [
  { env: "STRIPE_PRICE_VIDEO_SINGLE", match: /single demo/i, subscription: false },
  { env: "STRIPE_PRICE_VIDEO_PACK_5", match: /5-pack/i, subscription: false },
  {
    env: "STRIPE_PRICE_STARTER",
    match: /starter/i,
    subscription: true,
    planTier: "starter",
  },
  { env: "STRIPE_PRICE_PRO", match: /\bpro\b/i, subscription: true, planTier: "pro" },
  {
    env: "STRIPE_PRICE_TEAM",
    match: /team/i,
    subscription: true,
    planTier: "team",
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
  const listed = await stripe.prices.list({
    limit: 100,
    active: true,
    expand: ["data.product"],
  });

  const updates: Record<string, string> = {};
  const used = new Set<string>();

  console.log("\nStripe prices → .env mapping:\n");

  for (const mapping of MAPPINGS) {
    const candidates = listed.data.filter((price) => {
      const product =
        typeof price.product === "object" && price.product && "name" in price.product
          ? String(price.product.name)
          : "";
      if (!mapping.match.test(product)) return false;
      const isSub = !!price.recurring;
      return mapping.subscription ? isSub : !isSub;
    });

    if (candidates.length === 0) {
      console.log(`⚠️  ${mapping.env.padEnd(28)} no matching active price (run stripe:setup)`);
      continue;
    }

    const price = candidates[0];
    const productName =
      typeof price.product === "object" && price.product && "name" in price.product
        ? String(price.product.name)
        : price.product;

    updates[mapping.env] = price.id;
    used.add(mapping.env);
    console.log(`✅ ${mapping.env.padEnd(28)} ${price.id}`);
    console.log(`     ${productName}`);

    if (mapping.planTier && price.metadata?.plan_tier !== mapping.planTier) {
      await stripe.prices.update(price.id, {
        metadata: { ...price.metadata, plan_tier: mapping.planTier },
      });
      console.log(`     → set price metadata plan_tier=${mapping.planTier}`);
    }
  }

  if (Object.keys(updates).length === 0) {
    console.error("\nNo prices mapped. Run: pnpm --filter=api stripe:setup");
    process.exit(1);
  }

  console.log("\n" + "─".repeat(72));
  if (write) {
    const root = rootEnvPath();
    updateEnvFile(root, updates);
    const apiEnv = path.resolve(process.cwd(), ".env");
    if (existsSync(apiEnv) && apiEnv !== root) {
      updateEnvFile(apiEnv, updates);
    }
    console.log(`\n✅ Updated ${root}`);
    if (existsSync(apiEnv) && apiEnv !== root) {
      console.log(`✅ Updated ${apiEnv}`);
    }
    console.log("\nRestart dev server: pnpm dev\n");
  } else {
    console.log("\nRe-run with --write to patch .env, then: pnpm --filter=api stripe:check\n");
  }
}

void main();
