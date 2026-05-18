import type { PlanTier } from "@demo-copilot/types";

export type ExportProfile = {
  width: number;
  height: number;
  label: string;
};

export type PlanCapabilities = {
  tier: PlanTier;
  displayName: string;
  monthlyCredits: number | null;
  unlimitedDemos: boolean;
  hdExport: boolean;
  customVoice: boolean;
  socialDrafts: boolean;
  collaboration: boolean;
  analytics: boolean;
  brandKit: boolean;
  enterpriseFeatures: boolean;
  marketingBullets: string[];
};

const EXPORT_HD: ExportProfile = { width: 1920, height: 1080, label: "1080p HD" };
const EXPORT_STANDARD: ExportProfile = { width: 1280, height: 720, label: "720p" };

export const PLAN_CAPABILITIES: Record<PlanTier, PlanCapabilities> = {
  FREE: {
    tier: "FREE",
    displayName: "Free",
    monthlyCredits: null,
    unlimitedDemos: false,
    hdExport: false,
    customVoice: false,
    socialDrafts: false,
    collaboration: false,
    analytics: false,
    brandKit: false,
    enterpriseFeatures: false,
    marketingBullets: ["1 demo credit", "720p export", "Standard AI voice"],
  },
  STARTER: {
    tier: "STARTER",
    displayName: "Starter",
    monthlyCredits: 5,
    unlimitedDemos: false,
    hdExport: false,
    customVoice: false,
    socialDrafts: false,
    collaboration: false,
    analytics: false,
    brandKit: false,
    enterpriseFeatures: false,
    marketingBullets: ["5 demos / month", "720p export", "All demo tones"],
  },
  PRO: {
    tier: "PRO",
    displayName: "Pro",
    monthlyCredits: null,
    unlimitedDemos: true,
    hdExport: true,
    customVoice: true,
    socialDrafts: true,
    collaboration: false,
    analytics: false,
    brandKit: false,
    enterpriseFeatures: false,
    marketingBullets: ["Unlimited demos", "HD exports (1080p)", "Custom ElevenLabs voice"],
  },
  TEAM: {
    tier: "TEAM",
    displayName: "Team",
    monthlyCredits: null,
    unlimitedDemos: true,
    hdExport: true,
    customVoice: true,
    socialDrafts: true,
    collaboration: true,
    analytics: true,
    brandKit: true,
    enterpriseFeatures: false,
    marketingBullets: [
      "Everything in Pro",
      "Team collaboration & seats",
      "Usage analytics",
      "Brand kit (logo & colors)",
    ],
  },
  ENTERPRISE: {
    tier: "ENTERPRISE",
    displayName: "Enterprise",
    monthlyCredits: null,
    unlimitedDemos: true,
    hdExport: true,
    customVoice: true,
    socialDrafts: true,
    collaboration: true,
    analytics: true,
    brandKit: true,
    enterpriseFeatures: true,
    marketingBullets: [
      "Private deployments",
      "CRM integrations",
      "SSO & dedicated support",
    ],
  },
};

/** Legacy DB rows may still store AGENCY before migration. */
export function normalizePlanTier(plan: string): PlanTier {
  if (plan === "AGENCY") return "ENTERPRISE";
  return plan as PlanTier;
}

export function getPlanCapabilities(plan: string): PlanCapabilities {
  return PLAN_CAPABILITIES[normalizePlanTier(plan)];
}

export function planHasUnlimitedDemos(plan: string): boolean {
  return getPlanCapabilities(plan).unlimitedDemos;
}

export function getExportProfile(plan: string): ExportProfile {
  return getPlanCapabilities(plan).hdExport ? EXPORT_HD : EXPORT_STANDARD;
}

export function tierMeetsMinimum(current: string, minimum: PlanTier): boolean {
  const order: PlanTier[] = ["FREE", "STARTER", "PRO", "TEAM", "ENTERPRISE"];
  const currentNorm = normalizePlanTier(current);
  return order.indexOf(currentNorm) >= order.indexOf(minimum);
}
