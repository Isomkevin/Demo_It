import type { BillingProduct, PlanTier } from "@demo-copilot/types";
import {
  creditsForProduct,
  monthlyCreditsForPlan,
  planTierFromMetadata,
  productToPlanTier,
} from "./plans";
import { grantCredits, setPlan } from "./credits";
import { getStripe, type StripeCheckoutSession, type StripeSubscription } from "./stripe";

export function checkoutFulfillmentId(sessionId: string): string {
  return `checkout_session:${sessionId}`;
}

async function resolvePlanFromSubscription(
  subscription: StripeSubscription
): Promise<PlanTier | null> {
  const price = subscription.items.data[0]?.price;
  const metaTier = planTierFromMetadata(price?.metadata?.plan_tier);
  if (metaTier) return metaTier;

  const priceIds: Array<{ env: string | undefined; tier: PlanTier }> = [
    { env: process.env.STRIPE_PRICE_STARTER, tier: "STARTER" },
    { env: process.env.STRIPE_PRICE_PRO, tier: "PRO" },
    { env: process.env.STRIPE_PRICE_TEAM, tier: "TEAM" },
    {
      env: process.env.STRIPE_PRICE_ENTERPRISE ?? process.env.STRIPE_PRICE_AGENCY,
      tier: "ENTERPRISE",
    },
  ];

  for (const { env, tier } of priceIds) {
    if (env && price?.id === env) return tier;
  }

  return null;
}

function subscriptionPeriodEnd(sub: StripeSubscription): Date {
  const end = (sub as { current_period_end?: number }).current_period_end;
  return end ? new Date(end * 1000) : new Date();
}

function resolveProduct(session: StripeCheckoutSession): BillingProduct | undefined {
  const meta = session.metadata?.product as BillingProduct | undefined;
  if (meta) return meta;
  return undefined;
}

/**
 * Apply credits / plan after a completed Checkout Session.
 * Idempotent via checkoutFulfillmentId(session.id) in the credit ledger.
 */
export async function fulfillCheckoutSession(
  session: StripeCheckoutSession
): Promise<{ fulfilled: boolean; reason?: string }> {
  const orgId = session.metadata?.orgId ?? session.client_reference_id ?? null;
  if (!orgId) {
    return { fulfilled: false, reason: "missing_org_id" };
  }

  if (session.status !== "complete") {
    return { fulfilled: false, reason: "session_not_complete" };
  }

  const fulfillmentId = checkoutFulfillmentId(session.id);
  const stripe = getStripe();
  const product = resolveProduct(session);

  if (session.mode === "payment") {
    if (!product) {
      return { fulfilled: false, reason: "missing_product_metadata" };
    }
    const credits = creditsForProduct(product);
    if (credits <= 0) {
      return { fulfilled: false, reason: "zero_credits_product" };
    }
    await grantCredits(orgId, credits, "purchase", fulfillmentId);
    return { fulfilled: true };
  }

  if (session.mode === "subscription" && session.subscription) {
    const subId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;
    const sub = await stripe.subscriptions.retrieve(subId);
    const tier = await resolvePlanFromSubscription(sub);
    if (!tier) {
      return { fulfilled: false, reason: "unknown_subscription_tier" };
    }

    const quantity = sub.items.data[0]?.quantity ?? 1;
    const grant = monthlyCreditsForPlan(tier);

    await setPlan(orgId, tier, {
      subscriptionId: sub.id,
      subscriptionStatus: sub.status,
      periodEnd: subscriptionPeriodEnd(sub),
      seatLimit: tier === "TEAM" ? quantity : 1,
      ...(grant > 0 ? { grantCredits: grant, stripeEventId: fulfillmentId } : {}),
    });
    return { fulfilled: true };
  }

  return { fulfilled: false, reason: "unsupported_mode" };
}
