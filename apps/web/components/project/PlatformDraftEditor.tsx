"use client";

import { useCallback, useState } from "react";
import { DraftSourceBadge } from "@/components/project/DraftSourceBadge";
import type { ApiProject } from "@/lib/api-client";
import type { DraftSource, PostContent } from "@/lib/post-content";
import type { SocialPlatformId } from "@/lib/social-platforms";
import { platformById, shareComposerUrl, SOCIAL_PLATFORMS } from "@/lib/social-platforms";

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-stone-400 focus:border-accent focus:ring-2 focus:ring-accent/15";

type Props = {
  project: ApiProject;
  content: PostContent;
  activePlatform: SocialPlatformId;
  draftSource: DraftSource;
  aiGeneratedAt?: string | null;
  onPlatformChange: (id: SocialPlatformId) => void;
  onUpdateBrand: (brand: string) => void;
  onUpdateHandle: (handle: string) => void;
  onUpdateDraft: (platform: SocialPlatformId, text: string) => void;
};

function charStatus(length: number, limit: number | null): { label: string; className: string } {
  if (limit === null) {
    return { label: `${length} chars`, className: "text-muted" };
  }
  if (length > limit) {
    return { label: `${length} / ${limit} (over limit)`, className: "text-red-600 font-medium" };
  }
  if (length > limit * 0.9) {
    return { label: `${length} / ${limit}`, className: "text-warm font-medium" };
  }
  return { label: `${length} / ${limit}`, className: "text-muted" };
}

export function PlatformDraftEditor({
  project,
  content,
  activePlatform,
  draftSource,
  aiGeneratedAt,
  onPlatformChange,
  onUpdateBrand,
  onUpdateHandle,
  onUpdateDraft,
}: Props) {
  const [copied, setCopied] = useState(false);
  const platform = platformById(activePlatform);
  const draft = content.platformDrafts[activePlatform] ?? "";
  const status = charStatus(draft.length, platform.charLimit);
  const shareUrl = shareComposerUrl(activePlatform, draft, project.url);

  const copyDraft = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [draft]);

  return (
    <div className="flex flex-col gap-4 border-t border-border px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor={`post-brand-${project.id}`} className="text-xs font-semibold text-foreground">
            Brand name
          </label>
          <input
            id={`post-brand-${project.id}`}
            type="text"
            value={content.brand}
            onChange={(e) => onUpdateBrand(e.target.value)}
            className={inputClass}
            placeholder="Your product"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor={`post-handle-${project.id}`} className="text-xs font-semibold text-foreground">
            Handle
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
              @
            </span>
            <input
              id={`post-handle-${project.id}`}
              type="text"
              value={content.handle}
              onChange={(e) => onUpdateHandle(e.target.value.replace(/^@/, ""))}
              className={`${inputClass} pl-7`}
              placeholder="yourproduct"
            />
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-foreground">Platform drafts</p>
        <div
          className="flex gap-1.5 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Social platforms"
        >
          {SOCIAL_PLATFORMS.map((p) => {
            const selected = p.id === activePlatform;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onPlatformChange(p.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  selected
                    ? "bg-accent text-white shadow-sm"
                    : "border border-border bg-surface text-muted hover:border-accent/40 hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface/80 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-foreground">{platform.label} draft</p>
            <DraftSourceBadge source={draftSource} generatedAt={aiGeneratedAt} />
          </div>
          <span className={`text-[11px] tabular-nums ${status.className}`}>{status.label}</span>
        </div>
        <p className="mb-2 text-[11px] leading-relaxed text-muted">{platform.tip}</p>
        <p className="mb-3 text-[11px] font-medium text-accent">{platform.videoNote}</p>
        <textarea
          id={`post-draft-${project.id}-${activePlatform}`}
          value={draft}
          onChange={(e) => onUpdateDraft(activePlatform, e.target.value)}
          rows={platform.id === "x" || platform.id === "threads" || platform.id === "producthunt" ? 6 : 8}
          className={`${inputClass} min-h-[140px] resize-y`}
          placeholder={`Write your ${platform.label} post…`}
          aria-label={`${platform.label} post draft`}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyDraft}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface-muted"
          >
            {copied ? "Copied" : `Copy ${platform.shortLabel} draft`}
          </button>
          {shareUrl ? (
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent-soft"
            >
              Open {platform.shortLabel} composer
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
