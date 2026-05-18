import type { BillingProduct, PlanTier } from "@demo-copilot/types";

export type PlanConfig = {
  tier: PlanTier;
  monthlyCredits: number;
  defaultSeats: number;
  minSeats?: number;
  maxSeats?: number;
};

export const PLAN_CONFIG: Record<Exclude<PlanTier, "FREE">, PlanConfig> = {
  STARTER: { tier: "STARTER", monthlyCredits: 5, defaultSeats: 1 },
  PRO: { tier: "PRO", monthlyCredits: 20, defaultSeats: 1 },
  TEAM: { tier: "TEAM", monthlyCredits: 60, defaultSeats: 3, minSeats: 3, maxSeats: 10 },
  AGENCY: { tier: "AGENCY", monthlyCredits: 200, defaultSeats: 1 },
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
    agency: process.env.STRIPE_PRICE_AGENCY,
  };
  const priceId = envMap[product];
  if (!priceId) {
    throw new Error(`Missing Stripe price env for product: ${product}`);
  }
  return priceId;
}

export function isSubscriptionProduct(product: CheckoutProduct): boolean {
  return product === "starter" || product === "pro" || product === "team" || product === "agency";
}

export function productToPlanTier(product: CheckoutProduct): PlanTier | null {
  const map: Partial<Record<CheckoutProduct, PlanTier>> = {
    starter: "STARTER",
    pro: "PRO",
    team: "TEAM",
    agency: "AGENCY",
  };
  return map[product] ?? null;
}

export function planTierFromMetadata(value: string | undefined): PlanTier | null {
  if (!value) return null;
  const normalized = value.toUpperCase() as PlanTier;
  if (["STARTER", "PRO", "TEAM", "AGENCY"].includes(normalized)) {
    return normalized;
  }
  return null;
}

export function creditsForProduct(product: CheckoutProduct): number {
  if (product === "video_single" || product === "video_pack_5") {
    return ONE_TIME_CREDITS[product];
  }
  const tier = productToPlanTier(product);
  if (!tier || tier === "FREE") return 0;
  return PLAN_CONFIG[tier].monthlyCredits;
}

export function defaultQuantityForProduct(product: CheckoutProduct): number {
  if (product === "team") return PLAN_CONFIG.TEAM.defaultSeats;
  return 1;
}

export function clampTeamQuantity(quantity: number): number {
  const { minSeats = 3, maxSeats = 10 } = PLAN_CONFIG.TEAM;
  return Math.min(maxSeats, Math.max(minSeats, quantity));
}
