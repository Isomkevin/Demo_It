"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PipelineStage } from "@demo-copilot/types";
import { api, type ApiProject } from "@/lib/api-client";
import {
  displayHost,
  formatRelativeTime,
  STATUS_LABELS,
  statusStyles,
} from "@/lib/project-display";

function HistoryRow({ project, onNavigate }: { project: ApiProject; onNavigate: () => void }) {
  const status = project.status as PipelineStage;
  const isReady = status === "completed" && project.videoUrl;

  return (
    <Link
      href={`/projects/${project.id}`}
      onClick={onNavigate}
      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-surface-muted"
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${
          isReady ? "bg-accent-soft" : "bg-surface-muted"
        }`}
        aria-hidden
      >
        {isReady ? "▶" : status === "failed" ? "!" : "◌"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground group-hover:text-accent">
          {project.name || displayHost(project.url)}
        </p>
        <p className="truncate text-xs text-muted">{formatRelativeTime(project.createdAt)}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyles(status)}`}
      >
        {STATUS_LABELS[status] ?? status}
      </span>
    </Link>
  );
}

export function HistoryDropdown() {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { projects: list } = await api.getProjects();
      setProjects(list);
      setHasLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load history");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !hasLoaded && !loading) {
      load();
    }
  }, [open, hasLoaded, loading, load]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [open, load]);

  const count = projects.length;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition ${
          open
            ? "border-accent/40 bg-accent-soft/50 text-accent"
            : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground"
        }`}
      >
        History
        {hasLoaded && count > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
        <svg
          className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`}
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

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(100vw-2.5rem,22rem)] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_12px_40px_-8px_rgb(28_25_23/0.18)]"
            role="listbox"
            aria-label="Demo history"
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Your demos</span>
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
              >
                {loading ? "…" : "Refresh"}
              </button>
            </div>

            <div className="max-h-[min(60vh,320px)] overflow-y-auto">
              {loading && !hasLoaded ? (
                <div className="flex items-center justify-center gap-2 px-4 py-10">
                  <div className="h-5 w-5 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
                  <span className="text-sm text-muted">Loading…</span>
                </div>
              ) : error ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-red-700">{error}</p>
                  <button
                    type="button"
                    onClick={load}
                    className="mt-2 text-xs font-semibold text-accent hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : projects.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">No demos yet. Create one to see it here.</p>
              ) : (
                <ul className="py-1">
                  {projects.map((project) => (
                    <li key={project.id}>
                      <HistoryRow project={project} onNavigate={() => setOpen(false)} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
