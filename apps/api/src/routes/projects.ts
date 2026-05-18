import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { DemoScript } from "@demo-copilot/types";
import { prisma } from "../lib/prisma";
import { hasCredits } from "../lib/billing/credits";
import { getPlanCapabilities } from "../lib/billing/plan-features";
import { enqueuePipeline } from "../modules/orchestrator/queue";
import { generateSocialDrafts } from "../modules/social";

const CreateProjectBody = z.object({
  url: z.string().url(),
  name: z.string().optional(),
  tone: z.enum(["investor", "user_onboarding", "marketing", "tutorial"]).optional(),
});

const SocialDraftsBody = z.object({
  brand: z.string().min(1).optional(),
  handle: z.string().min(1).optional(),
});

function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export async function projectRoutes(fastify: FastifyInstance) {
  // Create project
  fastify.post("/api/v1/projects", async (request, reply) => {
    const body = CreateProjectBody.parse(request.body);
    const orgId = request.orgId;

    if (!(await hasCredits(orgId))) {
      return reply.status(402).send({
        error: "insufficient_credits",
        code: "PAYWALL",
        message: "You need credits to generate a demo. Upgrade or buy a video credit.",
      });
    }

    const project = await prisma.project.create({
      data: {
        url: body.url,
        name: body.name || new URL(body.url).hostname,
        tone: body.tone || "marketing",
        status: "queued",
        orgId,
      },
    });

    await enqueuePipeline(project.id, body.url, body.tone || "marketing");

    return reply.status(201).send({ project, jobId: `analyze-${project.id}` });
  });

  // List projects
  fastify.get("/api/v1/projects", async (request) => {
    let projects = await prisma.project.findMany({
      where: { orgId: request.orgId },
      orderBy: { createdAt: "desc" },
    });

    // Claim legacy rows created before org-scoped billing (local dev / upgrades)
    if (projects.length === 0) {
      const claimed = await prisma.project.updateMany({
        where: { orgId: null },
        data: { orgId: request.orgId },
      });
      if (claimed.count > 0) {
        projects = await prisma.project.findMany({
          where: { orgId: request.orgId },
          orderBy: { createdAt: "desc" },
        });
      }
    }

    return { projects };
  });

  // Get project by ID
  fastify.get<{ Params: { id: string } }>("/api/v1/projects/:id", async (request, reply) => {
    const project = await prisma.project.findUnique({
      where: { id: request.params.id },
      include: { runs: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!project) return reply.status(404).send({ error: "Not found" });
    if (project.orgId && project.orgId !== request.orgId) {
      return reply.status(404).send({ error: "Not found" });
    }
    return { project };
  });

  // AI-generated social drafts for launch posts
  fastify.post<{ Params: { id: string } }>(
    "/api/v1/projects/:id/social-drafts",
    async (request, reply) => {
      const project = await prisma.project.findUnique({
        where: { id: request.params.id },
        include: { runs: { orderBy: { createdAt: "desc" }, take: 1 } },
      });
      if (!project) return reply.status(404).send({ error: "Not found" });

      if (project.status !== "completed") {
        return reply.status(400).send({
          error: "Project must be completed before generating social drafts",
        });
      }

      let orgBrandName: string | null = null;
      if (project.orgId) {
        const org = await prisma.organization.findUnique({
          where: { id: project.orgId },
        });
        if (org && !getPlanCapabilities(org.plan).socialDrafts) {
          return reply.status(402).send({
            error: "paid_plan_required",
            code: "PAYWALL",
            message: "Social launch drafts require Pro plan or higher.",
          });
        }
        if (org && getPlanCapabilities(org.plan).brandKit && org.brandName) {
          orgBrandName = org.brandName;
        }
      }

      const body = SocialDraftsBody.safeParse(request.body ?? {});
      const parsed = body.success ? body.data : {};

      const host = displayHost(project.url);
      const brand = parsed.brand?.trim() || orgBrandName || project.name || host;
      const handle = parsed.handle?.trim() || host.replace(/\./g, "");

      const run = project.runs[0];
      const script = (run?.script as DemoScript | null) ?? null;

      try {
        const platformDrafts = await generateSocialDrafts({
          url: project.url,
          name: project.name,
          tone: project.tone,
          brand,
          handle,
          script,
        });

        return {
          brand,
          handle,
          platformDrafts,
          caption: platformDrafts.linkedin,
        };
      } catch (err) {
        request.log.error(err, "social-drafts generation failed");
        return reply.status(502).send({
          error:
            err instanceof Error
              ? err.message
              : "Failed to generate social drafts. Check API keys and try again.",
        });
      }
    }
  );
}
