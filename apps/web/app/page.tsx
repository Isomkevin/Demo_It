"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/api-client";
import { formatApiError } from "@/lib/api-errors";
import { notifyHistoryChanged } from "@/lib/history-events";
import { useApiHealth } from "@/hooks/useApiHealth";
import { DemoShell } from "@/components/theme/DemoShell";
import { GlassCard } from "@/components/theme/GlassCard";
import { GradientCtaButton } from "@/components/theme/GradientCtaButton";
import { LabsNav } from "@/components/layout/LabsNav";
import { ToneSelector } from "@/components/landing/ToneSelector";
import { HeroPreview } from "@/components/landing/HeroPreview";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { BenchmarkSection } from "@/components/landing/BenchmarkSection";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { ApiError } from "@/lib/api-client";

export default function Home() {
  const [url, setUrl] = useState("");
  const [tone, setTone] = useState("marketing");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const router = useRouter();
  const apiHealthy = useApiHealth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { project } = await api.createProject({ url, tone });
      notifyHistoryChanged();
      router.push(`/projects/${project.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setPaywallOpen(true);
        setError(null);
      } else {
        setError(formatApiError(err));
      }
      setLoading(false);
    }
  };

  return (
    <DemoShell>
      <LabsNav />

      {apiHealthy === false ? (
        <div className="relative z-10 border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-center text-sm text-amber-900">
          API unreachable — run <code className="rounded bg-amber-100 px-1 font-mono text-xs">pnpm dev</code> and
          check port 3001.
        </div>
      ) : null}

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-8 sm:pt-16 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-soft" />
              ElevenHacks × Stripe · Demo Copilot
            </p>

            <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              Cinematic demos from any{" "}
              <span className="text-accent">product URL</span>
            </h1>

            <p className="mt-5 max-w-lg text-pretty text-base leading-relaxed text-muted sm:text-lg">
              Paste your site. We analyze the UI, script a story, record the walkthrough, and narrate it like{" "}
              <a
                href="https://labs.google.com/pomelli"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                Pomelli
              </a>{" "}
              for brand DNA, but the output is a launch-ready video.
            </p>

            <GlassCard id="create" elevated className="mt-8" innerClassName="!p-6 sm:!p-7">
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="url" className="text-sm font-semibold text-foreground">
                    Product URL
                  </label>
                  <input
                    id="url"
                    type="url"
                    required
                    placeholder="https://yourproduct.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-muted px-4 py-3.5 text-sm text-foreground outline-none transition placeholder:text-stone-400 focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15"
                  />
                </div>

                <ToneSelector value={tone} onChange={setTone} />

                {error ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                    {error}
                  </p>
                ) : null}

                <GradientCtaButton type="submit" disabled={loading} className="w-full sm:w-auto">
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
                      Starting pipeline…
                    </>
                  ) : (
                    <>
                      Generate demo
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
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
              </form>
            </GlassCard>

            <p className="mt-4 text-xs text-muted">
              Tip: use a live marketing or app page for the richest UI crawl.
            </p>
          </motion.div>

          <div className="relative lg:pl-4">
            <HeroPreview />
          </div>
        </div>
      </section>

      <HowItWorks />
      <BenchmarkSection />

      <footer className="relative z-10 border-t border-border py-8 text-center text-xs text-muted">
        Built for ElevenHacks · Stripe + ElevenLabs · Not affiliated with Google Labs or Pomelli
      </footer>

      <UpgradeModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </DemoShell>
  );
}
