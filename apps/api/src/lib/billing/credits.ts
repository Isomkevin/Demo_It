import type { PlanTier } from "@demo-copilot/types";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { getPlanCapabilities, normalizePlanTier, planHasUnlimitedDemos } from "./plan-features";

const defaultOrgData = {
  plan: "FREE" as const,
  creditsBalance: 1,
  seatLimit: 1,
};

export async function getOrCreateOrg(orgId: string) {
  const existing = await prisma.organization.findUnique({ where: { id: orgId } });
  if (existing) return existing;

  try {
    return await prisma.organization.create({
      data: { id: orgId, ...defaultOrgData },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    }
    throw error;
  }
}

export async function hasCredits(orgId: string): Promise<boolean> {
  const org = await getOrCreateOrg(orgId);
  if (planHasUnlimitedDemos(org.plan)) return true;
  return org.creditsBalance > 0;
}

export async function grantCredits(
  orgId: string,
  delta: number,
  reason: string,
  stripeEventId?: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    if (stripeEventId) {
      const dup = await tx.creditLedger.findUnique({ where: { stripeEventId } });
      if (dup) return;
    }

    await tx.organization.update({
      where: { id: orgId },
      data: { creditsBalance: { increment: delta } },
    });

    await tx.creditLedger.create({
      data: { orgId, delta, reason, stripeEventId },
    });
  });
}

export async function setPlan(
  orgId: string,
  plan: PlanTier,
  opts: {
    subscriptionId?: string | null;
    subscriptionStatus?: string | null;
    periodEnd?: Date | null;
    seatLimit?: number;
    grantCredits?: number;
    stripeEventId?: string;
  }
): Promise<void> {
  const prismaPlan = plan === "ENTERPRISE" ? "ENTERPRISE" : plan;

  await prisma.$transaction(async (tx) => {
    let skipCreditGrant = false;
    if (opts.stripeEventId && opts.grantCredits) {
      const dup = await tx.creditLedger.findUnique({
        where: { stripeEventId: opts.stripeEventId },
      });
      if (dup) skipCreditGrant = true;
    }

    const updateData: {
      plan: PlanTier | "AGENCY";
      subscriptionId?: string | null;
      subscriptionStatus?: string | null;
      periodEnd?: Date | null;
      seatLimit?: number;
      creditsBalance?: { increment: number };
    } = {
      plan: prismaPlan as PlanTier,
      subscriptionId: opts.subscriptionId ?? undefined,
      subscriptionStatus: opts.subscriptionStatus ?? undefined,
      periodEnd: opts.periodEnd ?? undefined,
    };

    if (opts.seatLimit !== undefined) {
      updateData.seatLimit = opts.seatLimit;
    }

    if (opts.grantCredits && opts.grantCredits > 0 && !skipCreditGrant) {
      updateData.creditsBalance = { increment: opts.grantCredits };

      if (opts.stripeEventId) {
        await tx.creditLedger.create({
          data: {
            orgId,
            delta: opts.grantCredits,
            reason: "subscription_grant",
            stripeEventId: opts.stripeEventId,
          },
        });
      } else {
        await tx.creditLedger.create({
          data: {
            orgId,
            delta: opts.grantCredits,
            reason: "subscription_grant",
          },
        });
      }
    }

    await tx.organization.update({
      where: { id: orgId },
      data: updateData,
    });
  });
}

export async function downgradeToFree(orgId: string): Promise<void> {
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      plan: "FREE",
      subscriptionId: null,
      subscriptionStatus: null,
      periodEnd: null,
      seatLimit: 1,
    },
  });
}

export async function consumeCreditForProject(projectId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project?.orgId || project.billedAt) return false;

  const consumed = await prisma.$transaction(async (tx) => {
    const fresh = await tx.project.findUnique({ where: { id: projectId } });
    if (!fresh?.orgId || fresh.billedAt) return false;

    const org = await tx.organization.findUnique({ where: { id: fresh.orgId } });
    if (!org) return false;

    const unlimited = planHasUnlimitedDemos(org.plan);

    if (!unlimited && org.creditsBalance < 1) return false;

    if (!unlimited) {
      await tx.organization.update({
        where: { id: fresh.orgId },
        data: { creditsBalance: { decrement: 1 } },
      });
    }

    await tx.creditLedger.create({
      data: {
        orgId: fresh.orgId,
        delta: unlimited ? 0 : -1,
        reason: unlimited ? "demo_complete_unlimited" : "demo_complete",
        projectId,
      },
    });

    await tx.project.update({
      where: { id: projectId },
      data: { billedAt: new Date() },
    });

    return true;
  });

  return consumed;
}

export async function getBillingStatus(orgId: string) {
  const org = await getOrCreateOrg(orgId);
  const plan = normalizePlanTier(org.plan);
  const caps = getPlanCapabilities(plan);

  return {
    orgId: org.id,
    plan,
    planDisplayName: caps.displayName,
    creditsBalance: org.creditsBalance,
    seatLimit: org.seatLimit,
    subscriptionStatus: org.subscriptionStatus,
    periodEnd: org.periodEnd?.toISOString() ?? null,
    hasPaidPlan: plan !== "FREE",
    unlimitedDemos: caps.unlimitedDemos,
    capabilities: {
      unlimitedDemos: caps.unlimitedDemos,
      hdExport: caps.hdExport,
      customVoice: caps.customVoice,
      socialDrafts: caps.socialDrafts,
      collaboration: caps.collaboration,
      analytics: caps.analytics,
      brandKit: caps.brandKit,
      enterpriseFeatures: caps.enterpriseFeatures,
      marketingBullets: caps.marketingBullets,
    },
    voiceId: org.voiceId,
    brandName: org.brandName,
    brandColor: org.brandColor,
    brandLogoUrl: org.brandLogoUrl,
  };
}
