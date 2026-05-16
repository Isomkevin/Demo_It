"use client";

import { motion } from "framer-motion";

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
  return (
    <section id="benchmark" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warm">Benchmark</p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Demo It vs Google Pomelli
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted">
            Pomelli excels at on-brand marketing creatives for SMBs. Demo It targets the gap: polished{" "}
            <strong className="font-medium text-foreground">product demo videos</strong> with narration
            and screen capture—ideal for launches, onboarding, and investor decks.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="surface-card-elevated mt-12 overflow-hidden rounded-2xl"
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
          
        </motion.div>
      </div>
    </section>
  );
}
