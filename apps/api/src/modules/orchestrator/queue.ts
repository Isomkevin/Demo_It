import { Queue, Worker, type Job } from "bullmq";
import { redis } from "../../lib/redis";

// ─── Queue Names ─────────────────────────────────────────────────────────────
export const QUEUE_NAMES = {
  ANALYZE: "analyze-job",
  SCRIPT: "script-job",
  AUTOMATION: "automation-job",
  VOICE: "voice-job",
  RENDER: "render-job",
} as const;

// ─── Job Payloads ─────────────────────────────────────────────────────────────
export type AnalyzeJobData = { projectId: string; url: string };
export type ScriptJobData = { projectId: string; url: string; tone: string };
export type AutomationJobData = { projectId: string; url: string };
export type VoiceJobData = { projectId: string };
export type RenderJobData = { projectId: string };

// ─── Queues ───────────────────────────────────────────────────────────────────
const queueOpts = { connection: redis };

export const analyzeQueue = new Queue<AnalyzeJobData>(QUEUE_NAMES.ANALYZE, queueOpts);
export const scriptQueue = new Queue<ScriptJobData>(QUEUE_NAMES.SCRIPT, queueOpts);
export const automationQueue = new Queue<AutomationJobData>(QUEUE_NAMES.AUTOMATION, queueOpts);
export const voiceQueue = new Queue<VoiceJobData>(QUEUE_NAMES.VOICE, queueOpts);
export const renderQueue = new Queue<RenderJobData>(QUEUE_NAMES.RENDER, queueOpts);

// ─── Helper: enqueue full pipeline ────────────────────────────────────────────
export async function enqueuePipeline(projectId: string, url: string, tone: string) {
  await analyzeQueue.add("analyze", { projectId, url }, {
    jobId: `analyze-${projectId}`,
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
}
