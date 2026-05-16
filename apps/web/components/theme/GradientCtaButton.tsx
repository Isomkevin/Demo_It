"use client";

import { motion } from "framer-motion";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Props = ComponentPropsWithoutRef<typeof motion.button> & { children: ReactNode };

export function GradientCtaButton({ children, className = "", disabled, type = "button", ...props }: Props) {
  return (
    <motion.button
      type={type}
      whileHover={{ scale: disabled ? 1 : 1.01 }}
      whileTap={{ scale: disabled ? 1 : 0.99 }}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-[0_1px_2px_rgb(15_118_110/0.2),0_8px_20px_-6px_rgb(15_118_110/0.45)] transition hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 ${className}`.trim()}
      {...props}
    >
      {children}
    </motion.button>
  );
}
