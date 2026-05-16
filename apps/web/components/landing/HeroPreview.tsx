"use client";

import { motion } from "framer-motion";

const PIPELINE = [
  { label: "Analyzing UI", done: true },
  { label: "Writing script", done: true },
  { label: "Recording", active: true },
  { label: "Voice + render", done: false },
];

export function HeroPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.55 }}
      className="surface-card-elevated relative overflow-hidden rounded-2xl p-1 animate-float"
    >
      <div className="rounded-[14px] bg-stone-900 p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
          <span className="ml-2 truncate font-mono text-[10px] text-stone-500">yourproduct.com/demo</span>
        </div>

        <div className="aspect-video overflow-hidden rounded-lg bg-gradient-to-br from-stone-800 via-stone-900 to-teal-950">
          <div className="flex h-full flex-col justify-between p-4">
            <div className="space-y-2">
              <div className="h-2 w-3/4 rounded bg-white/10" />
              <div className="h-2 w-1/2 rounded bg-white/10" />
              <div className="mt-4 h-8 w-24 rounded-md bg-accent/80" />
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px]">
                ▶
              </span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-2/3 rounded-full bg-accent" />
              </div>
              <span className="font-mono text-[10px] text-stone-400">1:24</span>
            </div>
          </div>
        </div>

        <ul className="mt-4 space-y-2">
          {PIPELINE.map((stage) => (
            <li key={stage.label} className="flex items-center gap-2 text-xs">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  stage.done
                    ? "bg-emerald-400"
                    : stage.active
                      ? "bg-accent animate-pulse-soft"
                      : "bg-stone-600"
                }`}
              />
              <span className={stage.active ? "font-medium text-white" : "text-stone-400"}>
                {stage.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent-soft blur-2xl" aria-hidden />
    </motion.div>
  );
}
