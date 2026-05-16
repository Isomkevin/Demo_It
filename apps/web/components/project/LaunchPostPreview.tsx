"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ApiProject } from "@/lib/api-client";
import { DemoPostCard } from "@/components/landing/DemoPostCard";
import { PlatformDraftEditor } from "@/components/project/PlatformDraftEditor";
import { generatePlatformDrafts } from "@/lib/platform-drafts";
import {
  defaultPostContent,
  loadActivePlatform,
  loadPostContent,
  previewCaption,
  saveActivePlatform,
  savePostContent,
  type PostContent,
} from "@/lib/post-content";
import type { SocialPlatformId } from "@/lib/social-platforms";
import { platformById, SOCIAL_PLATFORMS } from "@/lib/social-platforms";

type Props = {
  project: ApiProject;
};

const EDITOR_OPEN_KEY = "demo-it:post-editor-open:";

function loadEditorOpen(projectId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(`${EDITOR_OPEN_KEY}${projectId}`);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

function saveEditorOpen(projectId: string, open: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${EDITOR_OPEN_KEY}${projectId}`, open ? "1" : "0");
  } catch {
    // ignore
  }
}

export function LaunchPostPreview({ project }: Props) {
  const [content, setContent] = useState<PostContent>(() => defaultPostContent(project));
  const [activePlatform, setActivePlatform] = useState<SocialPlatformId>("linkedin");
  const [editorOpen, setEditorOpen] = useState(true);

  useEffect(() => {
    setContent(loadPostContent(project));
    setActivePlatform(loadActivePlatform(project.id));
    setEditorOpen(loadEditorOpen(project.id));
  }, [project]);

  const persist = useCallback(
    (next: PostContent) => {
      setContent(next);
      savePostContent(project.id, next);
    },
    [project.id]
  );

  const toggleEditor = useCallback(() => {
    setEditorOpen((open) => {
      const next = !open;
      saveEditorOpen(project.id, next);
      return next;
    });
  }, [project.id]);

  const selectPlatform = useCallback(
    (id: SocialPlatformId) => {
      setActivePlatform(id);
      saveActivePlatform(project.id, id);
    },
    [project.id]
  );

  const updateBrand = useCallback(
    (brand: string) => {
      setContent((prev) => {
        const next: PostContent = { ...prev, brand };
        savePostContent(project.id, next);
        return next;
      });
    },
    [project.id]
  );

  const updateHandle = useCallback(
    (handle: string) => {
      setContent((prev) => {
        const next: PostContent = { ...prev, handle };
        savePostContent(project.id, next);
        return next;
      });
    },
    [project.id]
  );

  const updateDraft = useCallback(
    (platform: SocialPlatformId, text: string) => {
      setContent((prev) => {
        const platformDrafts = { ...prev.platformDrafts, [platform]: text };
        const caption = platform === "linkedin" ? text : prev.caption;
        const next: PostContent = { ...prev, platformDrafts, caption };
        savePostContent(project.id, next);
        return next;
      });
    },
    [project.id]
  );

  const resetAll = useCallback(() => {
    const defaults = defaultPostContent(project);
    persist(defaults);
    setActivePlatform("linkedin");
    saveActivePlatform(project.id, "linkedin");
  }, [project, persist]);

  const regenerateDrafts = useCallback(() => {
    const platformDrafts = generatePlatformDrafts(project, content.brand, content.handle);
    persist({
      ...content,
      platformDrafts,
      caption: platformDrafts.linkedin,
    });
  }, [project, content, persist]);

  const previewContent: PostContent = {
    ...content,
    caption: previewCaption(content, activePlatform),
  };

  const activeLabel = platformById(activePlatform).label;

  return (
    <section className="mt-6 border-t border-border pt-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Launch post preview</h2>
          <p className="mt-1 text-xs text-muted">
            {editorOpen
              ? "Platform-specific drafts for LinkedIn, X, Instagram, and more — attach your MP4 when posting."
              : `${activeLabel} preview — expand the editor to edit all platform drafts.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={regenerateDrafts}
            className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground"
          >
            Regenerate drafts
          </button>
          <button
            type="button"
            onClick={resetAll}
            className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground"
          >
            Reset all
          </button>
        </div>
      </div>

      <div
        className={`grid gap-5 lg:gap-6 ${editorOpen ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}
      >
        <div className="overflow-hidden rounded-xl border border-border bg-surface-muted/40">
          <button
            type="button"
            onClick={toggleEditor}
            aria-expanded={editorOpen ? "true" : "false"}
            aria-controls={`post-editor-${project.id}`}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-surface-muted/60 sm:px-5"
          >
            <span className="text-xs font-semibold text-foreground">
              Edit drafts · {activeLabel}
            </span>
            <svg
              className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${editorOpen ? "rotate-180" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <AnimatePresence initial={false}>
            {editorOpen ? (
              <motion.div
                id={`post-editor-${project.id}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <PlatformDraftEditor
                  project={project}
                  content={content}
                  activePlatform={activePlatform}
                  onPlatformChange={selectPlatform}
                  onUpdateBrand={updateBrand}
                  onUpdateHandle={updateHandle}
                  onUpdateDraft={updateDraft}
                />
              </motion.div>
            ) : (
              <div className="border-t border-border px-4 py-3 sm:px-5">
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {SOCIAL_PLATFORMS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectPlatform(p.id)}
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                          p.id === activePlatform
                            ? "bg-accent text-white"
                            : "border border-border bg-surface text-muted hover:text-foreground"
                        }`}
                      >
                        {p.shortLabel}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-2">
          <p className="px-1 text-[11px] font-medium text-muted">
            Preview · {activeLabel}
          </p>
          <div className="surface-card-elevated overflow-hidden rounded-2xl p-1">
            <DemoPostCard
              project={project}
              content={previewContent}
              platformLabel={activeLabel}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
