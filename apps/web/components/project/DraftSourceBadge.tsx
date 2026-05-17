import type { DraftSource } from "@/lib/post-content";
import { formatRelativeTime } from "@/lib/project-display";

type Props = {
  source: DraftSource;
  generatedAt?: string | null;
};

export function DraftSourceBadge({ source, generatedAt }: Props) {
  const isAi = source === "ai";
  const timeLabel =
    isAi && generatedAt ? formatRelativeTime(generatedAt) : null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        isAi ? "bg-accent-soft text-accent" : "bg-stone-100 text-stone-600"
      }`}
      title={
        isAi
          ? timeLabel
            ? `AI-generated copy · ${timeLabel}`
            : "AI-generated copy from your demo script"
          : "Starter templates — click Generate with AI to replace"
      }
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${isAi ? "bg-accent" : "bg-stone-400"}`}
        aria-hidden
      />
      {isAi ? "AI generated" : "Template drafts"}
      {timeLabel ? <span className="font-normal opacity-80">· {timeLabel}</span> : null}
    </span>
  );
}
