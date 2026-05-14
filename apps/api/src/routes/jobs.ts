import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";

export async function jobRoutes(fastify: FastifyInstance) {
  // SSE status stream
  fastify.get<{ Params: { id: string } }>(
    "/api/v1/projects/:id/status",
    async (request, reply) => {
      const { id } = request.params;

      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.flushHeaders();

      const send = (data: object) => {
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      let lastStatus = "";
      const interval = setInterval(async () => {
        try {
          const project = await prisma.project.findUnique({ where: { id } });
          if (!project) {
            clearInterval(interval);
            reply.raw.end();
            return;
          }

          if (project.status !== lastStatus) {
            lastStatus = project.status;
            send({ projectId: id, stage: project.status, progress: getProgress(project.status) });

            if (project.status === "completed" || project.status === "failed") {
              clearInterval(interval);
              setTimeout(() => reply.raw.end(), 1000);
            }
          }
        } catch {
          clearInterval(interval);
          reply.raw.end();
        }
      }, 1500);

      request.raw.on("close", () => clearInterval(interval));
    }
  );
}

function getProgress(stage: string): number {
  const map: Record<string, number> = {
    queued: 0, analyzing: 15, scripting: 30,
    recording: 50, voicing: 65, syncing: 75,
    rendering: 85, completed: 100, failed: 0,
  };
  return map[stage] ?? 0;
}
