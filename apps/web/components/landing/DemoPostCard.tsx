"use client";

import type { ApiProject } from "@/lib/api-client";
import { defaultPostContent, type PostContent } from "@/lib/post-content";
import { videoPlaybackUrl } from "@/lib/video-playback";

type Props = {
  project: ApiProject;
  content?: PostContent;
  platformLabel?: string;
};

export function DemoPostCard({ project, content, platformLabel }: Props) {
  const src = videoPlaybackUrl(project.id, project.videoUrl);
  const { brand, handle, caption } = content ?? defaultPostContent(project);
  const initial = brand.charAt(0).toUpperCase() || "?";

  if (!src) return null;

  return (
    <article className="rounded-[14px] bg-stone-900 p-4 sm:p-5">
      <header className="mb-3 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{brand}</p>
          <p className="text-xs text-stone-400">
            @{handle} · {platformLabel ?? "Launch post"}
          </p>
        </div>
      </header>

      <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-stone-200">{caption}</p>

      <div className="aspect-video overflow-hidden rounded-lg border border-white/10 bg-black">
        <video
          src={src}
          controls
          playsInline
          muted
          loop
          autoPlay
          className="h-full w-full object-contain"
          aria-label={`Demo video for ${brand}`}
        />
      </div>

      <footer className="mt-3 flex items-center gap-4 text-[11px] text-stone-500">
        <span>Launch-ready MP4</span>
        <span aria-hidden>·</span>
        <span>Demo It</span>
      </footer>
    </article>
  );
}
