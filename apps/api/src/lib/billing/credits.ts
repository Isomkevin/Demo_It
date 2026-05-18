import type { PlanTier } from "@demo-copilot/types";
import { prisma } from "../prisma";
import { PLAN_CONFIG } from "./plans";

export async function getOrCreateOrg(orgId: string) {
  const existing = await prisma.organization.findUnique({ where: { id: orgId } });
  if (existing) return existing;

  return prisma.organization.create({
    data: {
      id: orgId,
      plan: "FREE",
      creditsBalance: 1,
      seatLimit: 1,
    },
  });
}

export async function hasCredits(orgId: string): Promise<boolean> {
  const org = await getOrCreateOrg(orgId);
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
  await prisma.$transaction(async (tx) => {
    if (opts.stripeEventId && opts.grantCredits) {
      const dup = await tx.creditLedger.findUnique({
        where: { stripeEventId: opts.stripeEventId },
      });
      if (dup) return;
    }

    const updateData: {
      plan: PlanTier;
      subscriptionId?: string | null;
      subscriptionStatus?: string | null;
      periodEnd?: Date | null;
      seatLimit?: number;
      creditsBalance?: { increment: number };
    } = {
      plan,
      subscriptionId: opts.subscriptionId ?? undefined,
      subscriptionStatus: opts.subscriptionStatus ?? undefined,
      periodEnd: opts.periodEnd ?? undefined,
    };

    if (opts.seatLimit !== undefined) {
      updateData.seatLimit = opts.seatLimit;
    }

    if (opts.grantCredits && opts.grantCredits > 0) {
      updateData.creditsBalance = { increment: opts.grantCredits };

      if (opts.stripeEventId) {
        const dup = await tx.creditLedger.findUnique({
          where: { stripeEventId: opts.stripeEventId },
        });
        if (!dup) {
          await tx.creditLedger.create({
            data: {
              orgId,
              delta: opts.grantCredits,
              reason: "subscription_grant",
              stripeEventId: opts.stripeEventId,
            },
          });
        }
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
    if (!org || org.creditsBalance < 1) return false;

    await tx.organization.update({
      where: { id: fresh.orgId },
      data: { creditsBalance: { decrement: 1 } },
    });

    await tx.creditLedger.create({
      data: {
        orgId: fresh.orgId,
        delta: -1,
        reason: "demo_complete",
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

export function monthlyCreditsForPlan(plan: PlanTier): number {
  if (plan === "FREE") return 0;
  return PLAN_CONFIG[plan].monthlyCredits;
}

export async function getBillingStatus(orgId: string) {
  const org = await getOrCreateOrg(orgId);
  return {
    orgId: org.id,
    plan: org.plan as PlanTier,
    creditsBalance: org.creditsBalance,
    seatLimit: org.seatLimit,
    subscriptionStatus: org.subscriptionStatus,
    periodEnd: org.periodEnd?.toISOString() ?? null,
    hasPaidPlan: org.plan !== "FREE",
  };
}
