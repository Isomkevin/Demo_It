"use client";

import { useState } from "react";
import type { ApiProject } from "@/lib/api-client";
import { DemoPostCard } from "@/components/landing/DemoPostCard";
import { postCaption } from "@/lib/post-caption";

type Props = {
  project: ApiProject;
};

export function LaunchPostPreview({ project }: Props) {
  const [copied, setCopied] = useState(false);
  const caption = postCaption(project);

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="mt-6 border-t border-border pt-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Launch post preview</h2>
          <p className="mt-1 text-xs text-muted">
            Attach your MP4 to a social post — copy the caption below.
          </p>
        </div>
        <button
          type="button"
          onClick={copyCaption}
          className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-surface-muted"
        >
          {copied ? "Copied" : "Copy caption"}
        </button>
      </div>
      <div className="surface-card-elevated overflow-hidden rounded-2xl p-1">
        <DemoPostCard project={project} />
      </div>
    </section>
  );
}
