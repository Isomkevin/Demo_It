"use client";

import { motion } from "framer-motion";

export type PipelineStage = {
  key: string;
  label: string;
  description: string;
};

type Props = {
  stages: PipelineStage[];
  currentKey: string;
  progress: number;
};

export function PipelineTimeline({ stages, currentKey, progress }: Props) {
  const currentIndex = Math.max(
    0,
    stages.findIndex((s) => s.key === currentKey),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Pipeline</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {stages[currentIndex]?.label ?? "Initializing…"}
          </p>
        </div>
        <span className="font-mono text-2xl font-bold tabular-nums text-accent">{progress}%</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-stone-200">
        <motion.div
          className="h-full rounded-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "easeInOut", duration: 0.45 }}
        />
      </div>

      <ol className="relative flex flex-col gap-0">
        {stages.map((stage, idx) => {
          const isPast = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isLast = idx === stages.length - 1;

          return (
            <li key={stage.key} className="relative flex gap-4 pb-6 last:pb-0">
              {!isLast ? (
                <span
                  className={`absolute left-[11px] top-7 h-[calc(100%-12px)] w-px ${
                    isPast ? "bg-accent/40" : "bg-border"
                  }`}
                  aria-hidden
                />
              ) : null}

              <span
                className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                  isPast
                    ? "border-accent bg-accent text-white"
                    : isCurrent
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border bg-surface text-stone-400"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isPast ? (
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  idx + 1
                )}
              </span>

              <div className="min-w-0 flex-1 pt-0.5">
                <p
                  className={`text-sm font-semibold ${
                    isCurrent ? "text-accent" : isPast ? "text-foreground" : "text-muted"
                  }`}
                >
                  {stage.label}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{stage.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
