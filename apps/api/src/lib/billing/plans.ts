import type { BillingProduct, PlanTier } from "@demo-copilot/types";
import { normalizePlanTier } from "./plan-features";

export type PlanConfig = {
  tier: PlanTier;
  monthlyCredits: number | null;
  defaultSeats: number;
  minSeats?: number;
  maxSeats?: number;
};

export const PLAN_CONFIG: Record<Exclude<PlanTier, "FREE">, PlanConfig> = {
  STARTER: { tier: "STARTER", monthlyCredits: 5, defaultSeats: 1 },
  PRO: { tier: "PRO", monthlyCredits: null, defaultSeats: 1 },
  TEAM: { tier: "TEAM", monthlyCredits: null, defaultSeats: 3, minSeats: 3, maxSeats: 10 },
  ENTERPRISE: { tier: "ENTERPRISE", monthlyCredits: null, defaultSeats: 1 },
};

export const ONE_TIME_CREDITS: Record<"video_single" | "video_pack_5", number> = {
  video_single: 1,
  video_pack_5: 5,
};

export type CheckoutProduct = BillingProduct;

export function getPriceId(product: CheckoutProduct): string {
  const envMap: Record<CheckoutProduct, string | undefined> = {
    video_single: process.env.STRIPE_PRICE_VIDEO_SINGLE,
    video_pack_5: process.env.STRIPE_PRICE_VIDEO_PACK_5,
    starter: process.env.STRIPE_PRICE_STARTER,
    pro: process.env.STRIPE_PRICE_PRO,
    team: process.env.STRIPE_PRICE_TEAM,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE ?? process.env.STRIPE_PRICE_AGENCY,
    agency: process.env.STRIPE_PRICE_ENTERPRISE ?? process.env.STRIPE_PRICE_AGENCY,
  };
  const priceId = envMap[product];
  if (!priceId) {
    throw new Error(`Missing Stripe price env for product: ${product}`);
  }
  return priceId;
}

export function isSubscriptionProduct(product: CheckoutProduct): boolean {
  return (
    product === "starter" ||
    product === "pro" ||
    product === "team" ||
    product === "enterprise" ||
    product === "agency"
  );
}

export function productToPlanTier(product: CheckoutProduct): PlanTier | null {
  const map: Partial<Record<CheckoutProduct, PlanTier>> = {
    starter: "STARTER",
    pro: "PRO",
    team: "TEAM",
    enterprise: "ENTERPRISE",
    agency: "ENTERPRISE",
  };
  return map[product] ?? null;
}

export function planTierFromMetadata(value: string | undefined): PlanTier | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  if (normalized === "AGENCY") return "ENTERPRISE";
  const tier = normalized as PlanTier;
  if (["STARTER", "PRO", "TEAM", "ENTERPRISE"].includes(tier)) {
    return tier;
  }
  return null;
}

export function creditsForProduct(product: CheckoutProduct): number {
  if (product === "video_single" || product === "video_pack_5") {
    return ONE_TIME_CREDITS[product];
  }
  const tier = productToPlanTier(product);
  if (!tier || tier === "FREE") return 0;
  const credits = PLAN_CONFIG[tier].monthlyCredits;
  return credits ?? 0;
}

export function defaultQuantityForProduct(product: CheckoutProduct): number {
  if (product === "team") return PLAN_CONFIG.TEAM.defaultSeats;
  return 1;
}

export function clampTeamQuantity(quantity: number): number {
  const { minSeats = 3, maxSeats = 10 } = PLAN_CONFIG.TEAM;
  return Math.min(maxSeats, Math.max(minSeats, quantity));
}

export function monthlyCreditsForPlan(plan: PlanTier | string): number {
  const tier = normalizePlanTier(String(plan));
  if (tier === "FREE") return 0;
  return PLAN_CONFIG[tier].monthlyCredits ?? 0;
}
