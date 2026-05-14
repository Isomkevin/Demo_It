"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/api-client";
import { DemoShell } from "@/components/theme/DemoShell";
import { GlassCard } from "@/components/theme/GlassCard";
import { GradientCtaButton } from "@/components/theme/GradientCtaButton";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 28 },
  },
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [tone, setTone] = useState("marketing");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { project } = await api.createProject({ url, tone });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      alert("Failed to create project: " + err);
      setLoading(false);
    }
  };

  return (
    <DemoShell>
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 py-16 sm:px-8">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative w-full max-w-lg"
        >
          <GlassCard>
            <motion.div variants={item} className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-300 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live studio
            </motion.div>

            <motion.h1
              variants={item}
              className="relative mt-4 bg-gradient-to-br from-white via-zinc-100 to-zinc-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent [text-shadow:0_0_80px_rgba(168,85,247,0.25)] sm:text-5xl"
            >
              Demo{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
                Copilot
              </span>
            </motion.h1>

            <motion.p variants={item} className="relative mt-3 max-w-md text-pretty text-sm leading-relaxed text-zinc-400 sm:text-base">
              Generate cinematic product demos from any URL — polished motion, tone-aware pacing, and
              a launch-ready storyboard in one flow.
            </motion.p>

            <motion.form variants={item} onSubmit={handleSubmit} className="relative mt-8 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="url" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Product URL
                </label>
                <div className="group relative">
                  <div className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-r from-cyan-500/0 via-white/15 to-fuchsia-500/0 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100" />
                  <input
                    id="url"
                    type="url"
                    required
                    placeholder="https://yourproduct.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="relative w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white shadow-inner shadow-black/40 outline-none ring-0 transition placeholder:text-zinc-600 focus:border-cyan-400/40 focus:bg-black/55 focus:shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_0_40px_-8px_rgba(34,211,238,0.2)]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="tone" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Demo tone
                </label>
                <div className="group relative">
                  <div className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-r from-fuchsia-500/0 via-white/15 to-cyan-500/0 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100" />
                  <select
                    id="tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="relative w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 pr-11 text-sm text-white shadow-inner shadow-black/40 outline-none transition focus:border-fuchsia-400/40 focus:bg-black/55 focus:shadow-[0_0_0_1px_rgba(232,121,249,0.25),0_0_40px_-8px_rgba(232,121,249,0.2)]"
                  >
                    <option value="marketing">Marketing — upbeat, value-focused</option>
                    <option value="investor">Investor — visionary, metrics-focused</option>
                    <option value="user_onboarding">Onboarding — educational, clear</option>
                    <option value="tutorial">Tutorial — step-by-step, technical</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
              </div>

              <GradientCtaButton type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-90"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Generating…
                  </>
                ) : (
                  <>
                    Generate demo
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M5 12h14m-6-6l6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
              </GradientCtaButton>
            </motion.form>
          </GlassCard>

          <motion.p variants={item} className="mt-6 text-center text-xs text-zinc-600">
            Tip: use a live marketing or product page for the richest crawl.
          </motion.p>
        </motion.div>
      </div>
    </DemoShell>
  );
}
