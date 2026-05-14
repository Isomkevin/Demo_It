"use client";

import { motion } from "framer-motion";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Props = ComponentPropsWithoutRef<typeof motion.button> & { children: ReactNode };

export function GradientCtaButton({ children, className = "", disabled, type = "button", ...props }: Props) {
  return (
    <motion.button
      type={type}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      disabled={disabled}
      className={`group relative mt-2 overflow-hidden rounded-xl px-6 py-4 text-sm font-semibold text-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.15)] transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
      {...props}
    >
      <span className="absolute inset-0 bg-gradient-to-r from-cyan-300 via-white to-fuchsia-300 bg-[length:200%_100%] transition-[background-position] duration-500 group-hover:bg-right" />
      <span
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent bg-[length:200%_100%] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:animate-shimmer"
        aria-hidden
      />
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </motion.button>
  );
}
