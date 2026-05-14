import type { FastifyInstance } from "fastify";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";
import { resolveOutputDir } from "../lib/output-dir";

const OUTPUT_DIR = resolveOutputDir();

export async function videoRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { id: string } }>("/api/v1/projects/:id/video", async (request, reply) => {
    const { id } = request.params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project?.videoUrl) {
      return reply.status(404).send({ error: "No video for this project" });
    }

    const videoUrl = project.videoUrl;
    if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
      return reply.redirect(videoUrl);
    }

    const resolved = path.resolve(videoUrl);
    const allowedRoot = path.resolve(OUTPUT_DIR);
    const projectDir = path.join(allowedRoot, id);

    if (!resolved.startsWith(projectDir + path.sep) && resolved !== projectDir) {
      return reply.status(403).send({ error: "Invalid video path" });
    }

    try {
      await fs.promises.access(resolved, fs.constants.R_OK);
    } catch {
      return reply.status(404).send({ error: "Video file not found" });
    }

    const stream = fs.createReadStream(resolved);
    reply.header("Content-Type", "video/mp4");
    reply.header("Accept-Ranges", "bytes");
    return reply.send(stream);
  });
}
