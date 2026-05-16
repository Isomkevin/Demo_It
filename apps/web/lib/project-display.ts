import type { PipelineStage } from "@demo-copilot/types";

export const STATUS_LABELS: Record<PipelineStage, string> = {
  queued: "Queued",
  analyzing: "Analyzing",
  scripting: "Scripting",
  recording: "Recording",
  voicing: "Voicing",
  syncing: "Syncing",
  rendering: "Rendering",
  completed: "Ready",
  failed: "Failed",
};

export function statusStyles(status: PipelineStage): string {
  switch (status) {
    case "completed":
      return "bg-accent-soft text-accent";
    case "failed":
      return "bg-red-50 text-red-700";
    case "queued":
      return "bg-stone-100 text-stone-600";
    default:
      return "bg-warm-soft text-warm";
  }
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export const TONE_LABELS: Record<string, string> = {
  marketing: "Marketing",
  investor: "Investor",
  user_onboarding: "Onboarding",
  tutorial: "Tutorial",
};

export function toneLabel(tone: string): string {
  return TONE_LABELS[tone] ?? tone.replace(/_/g, " ");
}

export function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
