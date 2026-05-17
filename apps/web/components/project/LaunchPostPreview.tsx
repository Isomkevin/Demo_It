"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api, type ApiProject } from "@/lib/api-client";
import { DemoPostCard } from "@/components/landing/DemoPostCard";
import { DraftSourceBadge } from "@/components/project/DraftSourceBadge";
import { PlatformDraftEditor } from "@/components/project/PlatformDraftEditor";
import {
  applyAiDrafts,
  clearAiGenerated,
  defaultPostContent,
  getDraftSource,
  loadActivePlatform,
  loadAiGeneratedAt,
  loadPostContent,
  markAiGenerated,
  previewCaption,
  saveActivePlatform,
  savePostContent,
  type DraftSource,
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
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [draftSource, setDraftSource] = useState<DraftSource>("template");
  const [aiGeneratedAt, setAiGeneratedAt] = useState<string | null>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  const syncDraftSource = useCallback((projectId: string) => {
    setDraftSource(getDraftSource(projectId));
    setAiGeneratedAt(loadAiGeneratedAt(projectId));
  }, []);

  useEffect(() => {
    setContent(loadPostContent(project));
    setActivePlatform(loadActivePlatform(project.id));
    setEditorOpen(loadEditorOpen(project.id));
    setAiError(null);
    syncDraftSource(project.id);
  }, [project, syncDraftSource]);

  const persist = useCallback(
    (next: PostContent) => {
      setContent(next);
      savePostContent(project.id, next);
    },
    [project.id]
  );

  const generateWithAI = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const { brand, handle } = contentRef.current;
      const result = await api.generateSocialDrafts(project.id, { brand, handle });
      persist(applyAiDrafts(contentRef.current, result));
      markAiGenerated(project.id);
      syncDraftSource(project.id);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI draft generation failed");
    } finally {
      setAiLoading(false);
    }
  }, [project.id, persist, syncDraftSource]);

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

  const resetTemplates = useCallback(() => {
    const defaults = defaultPostContent(project);
    persist(defaults);
    clearAiGenerated(project.id);
    setDraftSource("template");
    setAiGeneratedAt(null);
    setActivePlatform("linkedin");
    saveActivePlatform(project.id, "linkedin");
    setAiError(null);
  }, [project, persist]);

  const previewContent: PostContent = {
    ...content,
    caption: previewCaption(content, activePlatform),
  };

  const activeLabel = platformById(activePlatform).label;

  return (
    <section className="mt-6 border-t border-border pt-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Launch post preview</h2>
            {!aiLoading ? (
              <DraftSourceBadge source={draftSource} generatedAt={aiGeneratedAt} />
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted">
            {aiLoading
              ? "Claude is writing platform-native launch copy from your demo script…"
              : draftSource === "ai"
                ? "These drafts were written by AI from your demo script. Edit freely or reset to templates."
                : editorOpen
                  ? "Showing starter templates — click Generate with AI for platform-native copy (uses API tokens)."
                  : `${activeLabel} preview — expand the editor to edit drafts or generate with AI.`}
          </p>
          {aiError ? (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
              {aiError}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void generateWithAI()}
            disabled={aiLoading}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {aiLoading ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Generating…
              </>
            ) : (
              "Generate with AI"
            )}
          </button>
          <button
            type="button"
            onClick={resetTemplates}
            disabled={aiLoading}
            className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground disabled:opacity-60"
          >
            Reset templates
          </button>
        </div>
      </div>

      <div
        className={`relative grid gap-5 lg:gap-6 ${editorOpen ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}
      >
        {aiLoading ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[2px]"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-5 shadow-lg">
              <div className="h-8 w-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
              <p className="text-sm font-medium text-foreground">Writing launch copy…</p>
              <p className="max-w-xs text-center text-xs text-muted">
                Using your demo script + product context for 8 platforms
              </p>
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border bg-surface-muted/40">
          <button
            type="button"
            onClick={toggleEditor}
            disabled={aiLoading}
            aria-expanded={editorOpen ? "true" : "false"}
            aria-controls={`post-editor-${project.id}`}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-surface-muted/60 disabled:opacity-60 sm:px-5"
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
                  draftSource={draftSource}
                  aiGeneratedAt={aiGeneratedAt}
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
                      disabled={aiLoading}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                        p.id === activePlatform
                          ? "bg-accent text-white"
                          : "border border-border bg-surface text-muted hover:text-foreground"
                      } disabled:opacity-60`}
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
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-[11px] font-medium text-muted">Preview · {activeLabel}</p>
            {!aiLoading ? (
              <DraftSourceBadge source={draftSource} generatedAt={aiGeneratedAt} />
            ) : null}
          </div>
          <div className="surface-card-elevated overflow-hidden rounded-2xl p-1">
            <DemoPostCard
              project={project}
              content={previewContent}
              platformLabel={activeLabel}
              draftSource={draftSource}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
