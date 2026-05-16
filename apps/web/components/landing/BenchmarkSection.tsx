"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Cell = "yes" | "partial" | "no" | string;

type Row = {
  feature: string;
  demoIt: Cell;
  pomelli: Cell;
};

const ROWS: Row[] = [
  { feature: "Input: product URL", demoIt: "yes", pomelli: "yes" },
  { feature: "Brand / product understanding", demoIt: "yes", pomelli: "yes" },
  { feature: "Output: cinematic demo video", demoIt: "yes", pomelli: "no" },
  { feature: "Output: social images & copy", demoIt: "no", pomelli: "yes" },
  { feature: "Browser-automated walkthrough", demoIt: "yes", pomelli: "no" },
  { feature: "AI voice narration", demoIt: "yes", pomelli: "no" },
  { feature: "Tone / audience targeting", demoIt: "yes", pomelli: "yes" },
  { feature: "Real-time pipeline progress", demoIt: "yes", pomelli: "partial" },
  { feature: "Download ready asset", demoIt: "yes", pomelli: "yes" },
];

function StatusBadge({ value }: { value: Cell }) {
  if (value === "yes") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        Yes
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span className="inline-flex rounded-full bg-warm-soft px-2.5 py-0.5 text-xs font-medium text-warm">
        Partial
      </span>
    );
  }
  if (value === "no") {
    return (
      <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-500">
        No
      </span>
    );
  }
  return <span className="text-sm text-muted">{value}</span>;
}

export function BenchmarkSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section id="benchmark" className="scroll-mt-20 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex w-full flex-col items-center gap-3 text-center transition hover:opacity-90 sm:flex-row sm:justify-between sm:text-left"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warm">Benchmark</p>
            <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Demo It vs Google Pomelli
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted sm:mx-0 sm:text-base">
              {expanded
                ? "Side-by-side capabilities for judges and reviewers."
                : "Tap to compare video demos vs on-brand social creatives."}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground">
            {expanded ? "Hide" : "Show"} comparison
            <svg
              className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`}
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
          </span>
        </button>

        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="surface-card-elevated mt-8 overflow-hidden rounded-2xl"
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-muted/80">
                        <th className="px-5 py-4 font-semibold text-foreground">Capability</th>
                        <th className="px-5 py-4 font-semibold text-accent">Demo It</th>
                        <th className="px-5 py-4 font-semibold text-muted">
                          <a
                            href="https://labs.google.com/pomelli"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-foreground hover:underline"
                          >
                            Pomelli
                          </a>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ROWS.map((row, i) => (
                        <tr
                          key={row.feature}
                          className={i % 2 === 0 ? "bg-surface" : "bg-surface-muted/40"}
                        >
                          <td className="px-5 py-3.5 font-medium text-foreground">{row.feature}</td>
                          <td className="px-5 py-3.5">
                            <StatusBadge value={row.demoIt} />
                          </td>
                          <td className="px-5 py-3.5">
                            <StatusBadge value={row.pomelli} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="border-t border-border bg-surface-muted/50 px-5 py-3 text-xs text-muted">
                  Reference:{" "}
                  <a
                    href="https://blog.google/technology/google-labs/pomelli"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    Google Labs — Introducing Pomelli
                  </a>
                </p>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}
