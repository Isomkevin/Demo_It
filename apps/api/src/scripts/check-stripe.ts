/**
 * Validates Stripe env: secret key mode + each STRIPE_PRICE_* exists in that account.
 * Run: pnpm --filter=api stripe:check
 */
import "../load-env";
import Stripe from "stripe";

const PRICE_ENVS: Array<{ env: string; product: string; subscription: boolean }> = [
  { env: "STRIPE_PRICE_VIDEO_SINGLE", product: "video_single", subscription: false },
  { env: "STRIPE_PRICE_VIDEO_PACK_5", product: "video_pack_5", subscription: false },
  { env: "STRIPE_PRICE_STARTER", product: "starter", subscription: true },
  { env: "STRIPE_PRICE_PRO", product: "pro", subscription: true },
  { env: "STRIPE_PRICE_TEAM", product: "team", subscription: true },
  {
    env: "STRIPE_PRICE_ENTERPRISE",
    product: "enterprise",
    subscription: true,
  },
];

function mask(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 12)}…${id.slice(-6)}`;
}

async function main(): Promise<void> {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    console.error("❌ STRIPE_SECRET_KEY is missing");
    process.exit(1);
  }

  const mode = secret.startsWith("sk_test_")
    ? "test"
    : secret.startsWith("sk_live_")
      ? "live"
      : "unknown";

  console.log(`\nStripe key mode: ${mode} (${mask(secret)})\n`);

  const stripe = new Stripe(secret);

  let accountLabel = "(could not load)";
  try {
    const account = await stripe.accounts.retrieve();
    accountLabel = account.settings?.dashboard?.display_name ?? account.id;
  } catch {
  try {
      const balance = await stripe.balance.retrieve();
      accountLabel = `balance available (currencies: ${balance.available.map((b) => b.currency).join(", ") || "none"})`;
    } catch (e) {
      accountLabel = e instanceof Error ? e.message : String(e);
    }
  }
  console.log(`Account: ${accountLabel}\n`);
  console.log("─".repeat(72));

  let failures = 0;

  for (const { env, product, subscription } of PRICE_ENVS) {
    const raw = process.env[env]?.trim();
    const placeholder =
      !raw || raw === "price_..." || raw.startsWith("price_...") || raw.includes("...");

    if (placeholder) {
      console.log(`⏭  ${env.padEnd(28)} not set (optional: enterprise)`);
      continue;
    }

    try {
      const price = await stripe.prices.retrieve(raw, { expand: ["product"] });
      const productName =
        typeof price.product === "object" && price.product && "name" in price.product
          ? String(price.product.name)
          : String(price.product);

      const amount =
        price.unit_amount != null
          ? `${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}`
          : "custom";

      const recurring = price.recurring
        ? `${price.recurring.interval}${price.recurring.interval_count > 1 ? ` x${price.recurring.interval_count}` : ""}`
        : "one-time";

      const typeOk =
        subscription ? !!price.recurring : !price.recurring;

      const active = price.active ? "active" : "INACTIVE";

      console.log(
        `${typeOk ? "✅" : "⚠️ "} ${env.padEnd(28)} ${mask(raw)}`
      );
      console.log(
        `     product: ${productName} | ${amount} | ${recurring} | ${active} | maps to "${product}"`
      );
      if (!typeOk) {
        console.log(
          `     ⚠️  Expected ${subscription ? "recurring (subscription)" : "one-time"} price for ${product}`
        );
        failures++;
      }
    } catch (err) {
      failures++;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`❌ ${env.padEnd(28)} ${mask(raw)}`);
      console.log(`     ${msg}`);
      console.log(
        `     → Create this price in Stripe Dashboard (${mode} mode) or fix the ID in .env`
      );
    }
  }

  const webhook = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhook || webhook === "whsec" || webhook === "whsec_..." || webhook.length < 20) {
    console.log("\n⚠️  STRIPE_WEBHOOK_SECRET looks missing or incomplete (need full whsec_… from stripe listen)");
  } else {
    console.log(`\n✅ STRIPE_WEBHOOK_SECRET set (${mask(webhook)})`);
  }

  console.log("\n" + "─".repeat(72));

  try {
    const listed = await stripe.prices.list({ limit: 15, active: true, expand: ["data.product"] });
    if (listed.data.length > 0) {
      console.log(`\nActive prices in this Stripe account (${mode} key):\n`);
      for (const p of listed.data) {
        const productName =
          typeof p.product === "object" && p.product && "name" in p.product
            ? String(p.product.name)
            : String(p.product);
        const amount =
          p.unit_amount != null
            ? `${(p.unit_amount / 100).toFixed(2)} ${p.currency.toUpperCase()}`
            : "custom";
        const recurring = p.recurring ? p.recurring.interval : "one-time";
        console.log(`  ${p.id}  →  ${productName} (${amount}, ${recurring})`);
      }
      console.log("\nCopy the price_ IDs above into the matching STRIPE_PRICE_* lines in .env");
    } else {
      console.log(
        `\nNo active prices in this account. Create products at https://dashboard.stripe.com/test/products`
      );
    }
  } catch {
    /* ignore list errors */
  }

  console.log("\n" + "─".repeat(72));
  if (failures > 0) {
    console.log(`\n${failures} problem(s) found. Fix .env then restart: pnpm dev\n`);
    process.exit(1);
  }
  console.log("\nAll configured prices OK for this secret key.\n");
}

void main();
