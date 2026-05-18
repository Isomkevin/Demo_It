import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getOrCreateOrg } from "../lib/billing/credits";
import { getPlanCapabilities, tierMeetsMinimum } from "../lib/billing/plan-features";
import { listAvailableVoices } from "../lib/elevenlabs";
import { DEFAULT_VOICE_ID } from "../lib/elevenlabs";

const BrandBody = z.object({
  brandName: z.string().min(1).max(80).optional(),
  brandColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  brandLogoUrl: z.string().url().optional().nullable(),
});

const VoiceBody = z.object({
  voiceId: z.string().min(1).max(64),
});

export async function orgSettingsRoutes(fastify: FastifyInstance) {
  fastify.get("/api/v1/org/voices", async (request, reply) => {
    const org = await getOrCreateOrg(request.orgId);
    const caps = getPlanCapabilities(org.plan);
    if (!caps.customVoice) {
      return reply.status(402).send({
        error: "custom_voice_requires_pro",
        code: "PAYWALL",
        message: "Custom voice selection requires Pro plan or higher.",
      });
    }
    const voices = await listAvailableVoices();
    return {
      voices,
      selectedVoiceId: org.voiceId ?? DEFAULT_VOICE_ID,
    };
  });

  fastify.patch("/api/v1/org/voice", async (request, reply) => {
    const org = await getOrCreateOrg(request.orgId);
    if (!getPlanCapabilities(org.plan).customVoice) {
      return reply.status(402).send({
        error: "custom_voice_requires_pro",
        code: "PAYWALL",
      });
    }
    const body = VoiceBody.parse(request.body);
    await prisma.organization.update({
      where: { id: request.orgId },
      data: { voiceId: body.voiceId },
    });
    return { voiceId: body.voiceId };
  });

  fastify.get("/api/v1/org/brand", async (request) => {
    const org = await getOrCreateOrg(request.orgId);
    return {
      brandName: org.brandName,
      brandColor: org.brandColor,
      brandLogoUrl: org.brandLogoUrl,
      canEdit: getPlanCapabilities(org.plan).brandKit,
    };
  });

  fastify.patch("/api/v1/org/brand", async (request, reply) => {
    const org = await getOrCreateOrg(request.orgId);
    if (!getPlanCapabilities(org.plan).brandKit) {
      return reply.status(402).send({
        error: "brand_kit_requires_team",
        code: "PAYWALL",
        message: "Brand kit requires Team plan or higher.",
      });
    }
    const body = BrandBody.parse(request.body);
    const updated = await prisma.organization.update({
      where: { id: request.orgId },
      data: {
        brandName: body.brandName,
        brandColor: body.brandColor,
        brandLogoUrl: body.brandLogoUrl === null ? null : body.brandLogoUrl,
      },
    });
    return {
      brandName: updated.brandName,
      brandColor: updated.brandColor,
      brandLogoUrl: updated.brandLogoUrl,
    };
  });

  fastify.get("/api/v1/org/analytics", async (request, reply) => {
    const org = await getOrCreateOrg(request.orgId);
    if (!tierMeetsMinimum(org.plan, "TEAM")) {
      return reply.status(402).send({
        error: "analytics_requires_team",
        code: "PAYWALL",
        message: "Usage analytics requires Team plan or higher.",
      });
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [demosCompleted, demosThisMonth, ledgerRows] = await Promise.all([
      prisma.project.count({
        where: { orgId: request.orgId, status: "completed" },
      }),
      prisma.project.count({
        where: {
          orgId: request.orgId,
          status: "completed",
          billedAt: { gte: monthStart },
        },
      }),
      prisma.creditLedger.findMany({
        where: {
          orgId: request.orgId,
          createdAt: { gte: monthStart },
          delta: { lt: 0 },
        },
        select: { delta: true },
      }),
    ]);

    const creditsUsedThisMonth = ledgerRows.reduce(
      (sum, row) => sum + Math.abs(row.delta),
      0
    );

    return {
      demosCompleted,
      demosThisMonth,
      creditsUsedThisMonth,
      seatLimit: org.seatLimit,
    };
  });
}
