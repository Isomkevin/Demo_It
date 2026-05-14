"use client";

import Link from "next/link";
import { useProjectStatus } from "@/hooks/useProjectStatus";
import { useEffect, useState } from "react";
import { api, type ApiProject } from "@/lib/api-client";
import { motion } from "framer-motion";
import { DemoShell } from "@/components/theme/DemoShell";
import { GlassCard } from "@/components/theme/GlassCard";
import { GradientCta } from "@/components/theme/GradientCta";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function videoPlaybackUrl(project: Pick<ApiProject, "id" | "videoUrl">): string {
  const url = project.videoUrl;
  if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
    return url;
  }
  return `${API_BASE}/api/v1/projects/${project.id}/video`;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 28 },
  },
};

export default function ProjectPage({ params }: { params: { id: string } }) {
  const { status, done } = useProjectStatus(params.id);
  const [project, setProject] = useState<ApiProject | null>(null);

  useEffect(() => {
    if (done) {
      api.getProject(params.id).then((res) => setProject(res.project)).catch(console.error);
    }
  }, [done, params.id]);

  const stages = [
    { key: "queued", label: "Queued" },
    { key: "analyzing", label: "Analyzing UI" },
    { key: "scripting", label: "Writing Script" },
    { key: "recording", label: "Recording Video" },
    { key: "voicing", label: "Generating Voice" },
    { key: "rendering", label: "Rendering Final Video" },
    { key: "completed", label: "Completed" },
  ];

  const currentStageIndex = status ? stages.findIndex((s) => s.key === status.stage) : 0;
  const progress = status?.progress || 0;

  return (
    <DemoShell>
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 py-12 sm:px-8 lg:py-16">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative w-full max-w-4xl"
        >
          <motion.div variants={item} className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <svg className="h-3.5 w-3.5 text-cyan-400/90" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back to Demo Copilot
            </Link>
            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 font-mono text-[11px] text-zinc-500">
              {params.id.slice(0, 8)}…
            </span>
          </motion.div>

          <GlassCard innerClassName="sm:p-10">
            <motion.h1
              variants={item}
              className="mb-8 bg-gradient-to-br from-white via-zinc-100 to-zinc-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl"
            >
              Demo{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
                generation
              </span>{" "}
              status
            </motion.h1>

            {status?.stage === "failed" ? (
              <motion.div
                variants={item}
                className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-red-950/25 p-6 shadow-[0_0_40px_-12px_rgba(239,68,68,0.35)] backdrop-blur-sm"
              >
                <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-red-500/20 blur-2xl" />
                <h2 className="relative text-lg font-bold text-red-200 sm:text-xl">Generation failed</h2>
                <p className="relative mt-2 text-sm leading-relaxed text-red-300/90">
                  Something went wrong in the demo pipeline. Try again from the home screen, or check API logs if
                  this persists.
                </p>
                <Link
                  href="/"
                  className="relative mt-5 inline-flex text-sm font-semibold text-cyan-300 underline-offset-4 hover:text-cyan-200 hover:underline"
                >
                  Return to start
                </Link>
              </motion.div>
            ) : (
              <motion.div variants={item} className="flex flex-col gap-8">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-zinc-500 sm:text-sm">
                    <span className="text-zinc-300">
                      {status ? stages[Math.max(0, currentStageIndex)]?.label : "Initializing…"}
                    </span>
                    <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-400 bg-clip-text font-bold text-transparent">
                      {progress}%
                    </span>
                  </div>

                  <div className="group relative">
                    <div className="pointer-events-none absolute -inset-px rounded-full bg-gradient-to-r from-cyan-500/40 via-fuchsia-500/40 to-cyan-500/40 opacity-50 blur-sm transition group-hover:opacity-70" />
                    <div className="relative h-4 w-full overflow-hidden rounded-full border border-white/10 bg-black/50 shadow-inner shadow-black/50">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-300 shadow-[0_0_24px_rgba(34,211,238,0.35)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ ease: "easeInOut", duration: 0.5 }}
                      />
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
                    {stages.map((stage, idx) => {
                      const isPast = idx < currentStageIndex;
                      const isCurrent = idx === currentStageIndex;
                      return (
                        <div key={stage.key} className="flex flex-col items-center gap-2 text-center">
                          <div
                            className={`relative h-3 w-3 rounded-full ${
                              isPast
                                ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]"
                                : isCurrent
                                  ? "bg-gradient-to-br from-cyan-400 to-fuchsia-500 shadow-[0_0_14px_rgba(168,85,247,0.6)]"
                                  : "bg-zinc-800 ring-1 ring-white/5"
                            }`}
                          >
                            {isCurrent ? (
                              <span className="absolute inset-0 animate-ping rounded-full bg-fuchsia-400/40" />
                            ) : null}
                          </div>
                          <span
                            className={`text-[11px] leading-tight sm:text-xs ${
                              isCurrent ? "font-medium text-white" : isPast ? "text-zinc-400" : "text-zinc-600"
                            }`}
                          >
                            {stage.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {done && project?.videoUrl ? (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 26 }}
                    className="flex flex-col items-center gap-6 border-t border-white/10 pt-8"
                  >
                    <div className="group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] aspect-video">
                      <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-r from-cyan-500/0 via-white/10 to-fuchsia-500/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <video
                        src={videoPlaybackUrl(project)}
                        controls
                        className="relative h-full w-full object-contain"
                        autoPlay
                      />
                    </div>

                    <GradientCta href={videoPlaybackUrl(project)} download className="w-full sm:w-auto">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Download demo
                    </GradientCta>
                  </motion.div>
                ) : null}
              </motion.div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </DemoShell>
  );
}
