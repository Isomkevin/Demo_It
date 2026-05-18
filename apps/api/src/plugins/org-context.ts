import type { FastifyInstance, FastifyRequest } from "fastify";
import { getOrCreateOrg } from "../lib/billing/credits";

declare module "fastify" {
  interface FastifyRequest {
    orgId: string;
  }
}

const ORG_HEADER = "x-org-id";

function readOrgId(request: FastifyRequest): string | null {
  const header = request.headers[ORG_HEADER];
  if (typeof header === "string" && header.trim().length > 0) {
    return header.trim();
  }
  return null;
}

export async function registerOrgContext(fastify: FastifyInstance) {
  fastify.decorateRequest("orgId", "");

  fastify.addHook("preHandler", async (request, reply) => {
    if (request.url.startsWith("/api/v1/billing/webhook")) {
      return;
    }
    if (request.url === "/health") {
      return;
    }
    if (/\/api\/v1\/projects\/[^/]+\/status/.test(request.url)) {
      return;
    }
    if (/\/api\/v1\/projects\/[^/]+\/video/.test(request.url)) {
      return;
    }

    const orgId = readOrgId(request);
    if (!orgId) {
      return reply.status(400).send({
        error: "Missing organization id",
        code: "ORG_REQUIRED",
      });
    }

    await getOrCreateOrg(orgId);
    request.orgId = orgId;
  });
}
