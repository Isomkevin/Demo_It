import Fastify from "fastify";
import cors from "@fastify/cors";

const server = Fastify({ logger: { level: "info" } });

server.register(cors, { origin: process.env.WEB_URL || "http://localhost:3000" });

server.get("/health", async () => ({ status: "ok", ts: new Date().toISOString() }));

const port = Number(process.env.API_PORT) || 3001;

import { projectRoutes } from "./routes/projects";
import { jobRoutes } from "./routes/jobs";
import { startWorkers } from "./modules/orchestrator";

const start = async () => {
  try {
    await server.register(projectRoutes);
    await server.register(jobRoutes);
    
    startWorkers();

    await server.listen({ port, host: "0.0.0.0" });
    console.log(`API running on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
