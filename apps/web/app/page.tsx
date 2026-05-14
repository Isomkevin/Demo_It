"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/api-client";

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
    <main className="relative isolate min-h-screen overflow-hidden bg-[#05040a] text-zinc-100">
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-[20%] -top-[10%] h-[min(90vw,720px)] w-[min(90vw,720px)] rounded-full bg-fuchsia-600/35 blur-[100px] animate-aurora" />
        <div className="absolute -right-[15%] top-[20%] h-[min(85vw,640px)] w-[min(85vw,640px)] rounded-full bg-cyan-500/25 blur-[110px] animate-aurora-reverse" />
        <div className="absolute bottom-[-20%] left-[25%] h-[min(70vw,520px)] w-[min(70vw,520px)] rounded-full bg-violet-600/30 blur-[90px] animate-aurora" />
        <div className="absolute left-1/2 top-1/2 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-indigo-600/20 via-transparent to-transparent blur-3xl" />
      </div>

      {/* Conic accent ring (very subtle) */}
      <div
        className="pointer-events-none fixed left-1/2 top-[-40%] h-[120vmin] w-[120vmin] -translate-x-1/2 rounded-full bg-[conic-gradient(from_180deg_at_50%_50%,transparent,rgba(168,85,247,0.5),transparent,rgba(34,211,238,0.45),transparent)] opacity-[0.12] mix-blend-screen blur-sm animate-spin-slow"
      />

      <div className="bg-grid-fade pointer-events-none fixed inset-0" />
      <div className="noise-overlay fixed inset-0" aria-hidden />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 py-16 sm:px-8">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative w-full max-w-lg"
        >
          {/* Outer glow frame */}
          <div className="pointer-events-none absolute -inset-px rounded-[1.35rem] bg-gradient-to-br from-white/25 via-fuchsia-500/20 to-cyan-400/20 opacity-60 blur-sm" />
          <div className="pointer-events-none absolute -inset-[2px] rounded-[1.4rem] bg-gradient-to-tr from-cyan-400/30 via-transparent to-fuchsia-500/25 opacity-40 animate-border-glow" />

          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/40 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_25px_80px_-20px_rgba(0,0,0,0.85),0_0_120px_-30px_rgba(168,85,247,0.35)] backdrop-blur-2xl sm:p-10">
            <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-fuchsia-500/15 blur-3xl" />

            <motion.div variants={item} className="relative mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-300 backdrop-blur-sm">
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

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="group relative mt-2 overflow-hidden rounded-xl px-6 py-4 text-sm font-semibold text-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.15)] transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-cyan-300 via-white to-fuchsia-300 bg-[length:200%_100%] transition-[background-position] duration-500 group-hover:bg-right" />
                <span
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent bg-[length:200%_100%] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:animate-shimmer"
                  aria-hidden
                />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
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
                </span>
              </motion.button>
            </motion.form>
          </div>

          <motion.p
            variants={item}
            className="mt-6 text-center text-xs text-zinc-600"
          >
            Tip: use a live marketing or product page for the richest crawl.
          </motion.p>
        </motion.div>
      </div>
    </main>
  );
}
