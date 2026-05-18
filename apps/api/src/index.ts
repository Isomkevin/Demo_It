import "./load-env";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerOrgContext } from "./plugins/org-context";
import { projectRoutes } from "./routes/projects";
import { jobRoutes } from "./routes/jobs";
import { videoRoutes } from "./routes/video";
import { billingRoutes } from "./routes/billing";
import { startWorkers } from "./modules/orchestrator";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

const server = Fastify({ logger: { level: "info" } });

server.register(cors, { origin: process.env.WEB_URL || "http://localhost:3000" });

server.addContentTypeParser(
  "application/json",
  { parseAs: "buffer" },
  (req, body, done) => {
    if (req.url === "/api/v1/billing/webhook") {
      req.rawBody = body as Buffer;
      done(null, body);
      return;
    }
    try {
      const text = (body as Buffer).toString("utf8");
      done(null, text ? JSON.parse(text) : {});
    } catch (err) {
      done(err as Error, undefined);
    }
  }
);

server.get("/health", async () => ({ status: "ok", ts: new Date().toISOString() }));

const port = Number(process.env.API_PORT ?? process.env.PORT) || 3001;

const start = async () => {
  try {
    await registerOrgContext(server);
    await server.register(billingRoutes);
    await server.register(projectRoutes);
    await server.register(jobRoutes);
    await server.register(videoRoutes);

    startWorkers();

    await server.listen({ port, host: "0.0.0.0" });
    console.log(`API running on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
