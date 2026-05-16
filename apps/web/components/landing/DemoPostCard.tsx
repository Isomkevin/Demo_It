"use client";

import type { ApiProject } from "@/lib/api-client";
import { displayHost } from "@/lib/project-display";
import { postCaption } from "@/lib/post-caption";
import { videoPlaybackUrl } from "@/lib/video-playback";

type Props = {
  project: ApiProject;
};

export function DemoPostCard({ project }: Props) {
  const src = videoPlaybackUrl(project.id, project.videoUrl);
  const host = displayHost(project.url);
  const brand = project.name || host;

  if (!src) return null;

  return (
    <article className="rounded-[14px] bg-stone-900 p-4 sm:p-5">
      <header className="mb-3 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
          {brand.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{brand}</p>
          <p className="text-xs text-stone-400">@{host.replace(/\./g, "")} · Launch post</p>
        </div>
      </header>

      <p className="mb-3 text-sm leading-relaxed text-stone-200">{postCaption(project)}</p>

      <div className="aspect-video overflow-hidden rounded-lg border border-white/10 bg-black">
        <video
          src={src}
          controls
          playsInline
          muted
          loop
          autoPlay
          className="h-full w-full object-contain"
          aria-label={`Demo video for ${host}`}
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
