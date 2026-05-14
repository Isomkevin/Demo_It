"use client";

import { motion } from "framer-motion";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type MotionAnchorProps = ComponentPropsWithoutRef<typeof motion.a>;

export function GradientCta({
  children,
  className = "",
  ...props
}: MotionAnchorProps & { children: ReactNode }) {
  return (
    <motion.a
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-4 text-sm font-semibold text-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.15)] transition ${className}`.trim()}
      {...props}
    >
      <span className="absolute inset-0 bg-gradient-to-r from-cyan-300 via-white to-fuchsia-300 bg-[length:200%_100%] transition-[background-position] duration-500 group-hover:bg-right" />
      <span
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent bg-[length:200%_100%] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:animate-shimmer"
        aria-hidden
      />
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </motion.a>
  );
}
