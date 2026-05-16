"use client";

import Link from "next/link";
import { useProjectStatus } from "@/hooks/useProjectStatus";
import { useEffect, useState } from "react";
import { api, type ApiProject } from "@/lib/api-client";
import { motion } from "framer-motion";
import { DemoShell } from "@/components/theme/DemoShell";
import { GlassCard } from "@/components/theme/GlassCard";
import { GradientCta } from "@/components/theme/GradientCta";
import { LabsNav } from "@/components/layout/LabsNav";
import { LaunchPostPreview } from "@/components/project/LaunchPostPreview";
import { PipelineTimeline, type PipelineStage } from "@/components/project/PipelineTimeline";
import { ProjectMeta } from "@/components/project/ProjectMeta";
import { DemoVideoPlayer } from "@/components/project/DemoVideoPlayer";
import { videoPlaybackUrl } from "@/lib/video-playback";
import { useElapsedTime, formatElapsed } from "@/hooks/useElapsedTime";

const STAGES: PipelineStage[] = [
  { key: "queued", label: "Queued", description: "Job accepted and waiting for workers." },
  { key: "analyzing", label: "Analyzing UI", description: "Crawling your product and mapping user flows." },
  { key: "scripting", label: "Writing script", description: "LLM plans scenes, actions, and narration." },
  { key: "recording", label: "Recording video", description: "Playwright simulates actions on screen." },
  { key: "voicing", label: "Generating voice", description: "ElevenLabs narrates each scene." },
  { key: "syncing", label: "Syncing timeline", description: "Aligning video, audio, and captions." },
  { key: "rendering", label: "Rendering final video", description: "Composing your downloadable MP4." },
  { key: "completed", label: "Completed", description: "Your demo is ready to preview and download." },
];

export default function ProjectPage({ params }: { params: { id: string } }) {
  const { status, done } = useProjectStatus(params.id);
  const [project, setProject] = useState<ApiProject | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    api
      .getProject(params.id)
      .then((res) => setProject(res.project))
      .catch(console.error);
  }, [params.id]);

  useEffect(() => {
    if (done) {
      api.getProject(params.id).then((res) => setProject(res.project)).catch(console.error);
    }
  }, [done, params.id]);

  const stageKey = status?.stage ?? project?.status ?? "queued";
  const progress = status?.progress ?? 0;
  const failed = stageKey === "failed";
  const inProgress = !failed && !done;
  const completed = done && project?.videoUrl;
  const elapsed = useElapsedTime(project?.createdAt, inProgress);
  const playback = project ? videoPlaybackUrl(project.id, project.videoUrl) : null;

  async function copyPageLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setLinkCopied(false);
    }
  }

  return (
    <DemoShell>
      <LabsNav />

      <div className="relative z-10 mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-foreground"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back to studio
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyPageLink}
              className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-medium text-muted transition hover:text-foreground"
            >
              {linkCopied ? "Link copied" : "Copy link"}
            </button>
            <span className="rounded-full border border-border bg-surface px-3 py-1 font-mono text-[11px] text-muted">
              {params.id.slice(0, 8)}…
            </span>
          </div>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          {completed ? "Your demo is ready" : failed ? "Generation failed" : "Building your demo"}
        </motion.h1>
        <p className="mt-2 text-sm text-muted">
          {completed
            ? "Preview below or download the MP4 for your launch."
            : failed
              ? "Something went wrong in the pipeline. See details below or start a new run."
              : "We’re running the full agentic pipeline—typically 3–8 minutes depending on site complexity."}
        </p>

        {project ? <ProjectMeta project={project} /> : null}

        {inProgress && project ? (
          <p className="mt-3 text-xs text-muted">
            Elapsed: <span className="font-mono font-medium text-foreground">{formatElapsed(elapsed)}</span>
            {" · "}Usually finishes in under 10 minutes
          </p>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-5 lg:gap-8">
          <GlassCard className="lg:col-span-2" elevated innerClassName="!p-6 sm:!p-7">
            {failed ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h2 className="font-semibold text-red-800">Pipeline error</h2>
                {project?.errorMessage ? (
                  <p className="mt-2 rounded-lg bg-red-100/80 px-3 py-2 font-mono text-xs leading-relaxed text-red-900">
                    {project.errorMessage}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-red-700/90">
                    Check API logs and environment keys, then start a new run from the home page.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/"
                    className="inline-flex text-sm font-semibold text-accent hover:underline"
                  >
                    Start over
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      api.getProject(params.id).then((res) => setProject(res.project)).catch(console.error);
                    }}
                    className="text-sm font-medium text-muted hover:text-foreground"
                  >
                    Refresh status
                  </button>
                </div>
              </div>
            ) : (
              <PipelineTimeline stages={STAGES} currentKey={stageKey} progress={progress} />
            )}
          </GlassCard>

          <GlassCard className="lg:col-span-3" elevated innerClassName="!p-4 sm:!p-5">
            {completed && project && playback ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-5"
              >
                <DemoVideoPlayer src={playback} downloadHref={playback} />
                <div className="flex flex-wrap gap-3 px-1 pb-1">
                  <GradientCta href={playback} download>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download MP4
                  </GradientCta>
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3.5 text-sm font-semibold text-foreground transition hover:bg-surface-muted"
                  >
                    Create another
                  </Link>
                </div>
                <LaunchPostPreview project={project} />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex aspect-video flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-muted/60 p-8 text-center"
              >
                {failed ? (
                  <>
                    <p className="text-sm font-medium text-foreground">No preview available</p>
                    <p className="mt-1 max-w-xs text-xs text-muted">
                      The pipeline did not produce a video. Check the error details and try again.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mb-4 h-12 w-12 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
                    <p className="text-sm font-medium text-foreground">Preview will appear here</p>
                    <p className="mt-1 max-w-xs text-xs text-muted">
                      Recording, voice, and render must finish before your video is ready.
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </GlassCard>
        </div>
      </div>
    </DemoShell>
  );
}
