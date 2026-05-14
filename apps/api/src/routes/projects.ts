import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const CreateProjectBody = z.object({
  url: z.string().url(),
  name: z.string().optional(),
  tone: z.enum(["investor", "user_onboarding", "marketing", "tutorial"]).optional(),
});

export async function projectRoutes(fastify: FastifyInstance) {
  // Create project
  fastify.post("/api/v1/projects", async (request, reply) => {
    const body = CreateProjectBody.parse(request.body);

    const project = await prisma.project.create({
      data: {
        url: body.url,
        name: body.name || new URL(body.url).hostname,
        tone: body.tone || "marketing",
        status: "queued",
      },
    });

    return reply.status(201).send({ project });
  });

  // List projects
  fastify.get("/api/v1/projects", async () => {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { projects };
  });

  // Get project by ID
  fastify.get<{ Params: { id: string } }>("/api/v1/projects/:id", async (request, reply) => {
    const project = await prisma.project.findUnique({
      where: { id: request.params.id },
      include: { runs: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!project) return reply.status(404).send({ error: "Not found" });
    return { project };
  });
}
