import type { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma";

/** Same default as `index.ts` @fastify/cors; SSE uses `reply.raw` so global CORS hooks never attach headers before flushHeaders. */
function webOriginAllow(request: FastifyRequest): string {
  const configured = process.env.WEB_URL || "http://localhost:3000";
  const origin = request.headers.origin;
  if (!origin) return configured;
  if (origin === configured) return origin;
  try {
    const u = new URL(configured);
    const o = new URL(origin);
    if (o.protocol === u.protocol && o.port === u.port) {
      if (
        (u.hostname === "localhost" && o.hostname === "127.0.0.1") ||
        (u.hostname === "127.0.0.1" && o.hostname === "localhost")
      ) {
        return origin;
      }
    }
  } catch {
    /* ignore */
  }
  return configured;
}

export async function jobRoutes(fastify: FastifyInstance) {
  // SSE status stream
  fastify.get<{ Params: { id: string } }>(
    "/api/v1/projects/:id/status",
    async (request, reply) => {
      const { id } = request.params;

      reply.raw.setHeader("Access-Control-Allow-Origin", webOriginAllow(request));
      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.flushHeaders();

      const send = (data: object) => {
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      let lastStatus = "";
      const tick = async () => {
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
      };

      void tick();
      const interval = setInterval(() => void tick(), 1500);

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
