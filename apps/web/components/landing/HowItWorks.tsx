"use client";

import { motion } from "framer-motion";

const STEPS = [
  {
    step: "01",
    title: "Scan your product",
    description:
      "Paste any live URL. We crawl the UI, extract flows, and build a Product DNA profile—similar to Pomelli’s Business DNA, tuned for demos.",
    accent: "bg-accent-soft text-accent",
  },
  {
    step: "02",
    title: "Shape the story",
    description:
      "Pick a tone—marketing, investor, onboarding, or tutorial. An LLM plans scenes, actions, and narration beats for your audience.",
    accent: "bg-warm-soft text-warm",
  },
  {
    step: "03",
    title: "Watch it render",
    description:
      "Playwright records the walkthrough, ElevenLabs voices each scene, and FFmpeg composes a launch-ready MP4 you can download.",
    accent: "bg-stone-100 text-stone-700",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-t border-border bg-surface-muted/50 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">How it works</p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Three steps from URL to cinematic demo
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted">
            Inspired by the clarity of{" "}
            <a
              href="https://labs.google.com/pomelli"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Google Pomelli
            </a>
            —but built for video walkthroughs, not static social assets.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.article
              key={step.step}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
              className="surface-card group rounded-2xl p-6 transition hover:shadow-[0_16px_48px_-16px_rgb(28_25_23/0.14)]"
            >
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${step.accent}`}
              >
                {step.step}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
