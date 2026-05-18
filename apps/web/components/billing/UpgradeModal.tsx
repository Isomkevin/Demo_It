"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CheckoutButton } from "@/components/billing/CheckoutButton";

type Props = {
  open: boolean;
  onClose: () => void;
  message?: string;
};

export function UpgradeModal({ open, onClose, message }: Props) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="fixed left-1/2 top-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 shadow-xl"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
          >
            <h2 className="text-lg font-bold text-foreground">Get more demo credits</h2>
            <p className="mt-2 text-sm text-muted">
              {message ||
                "You've used your free credit. Buy a single demo or subscribe for monthly credits."}
            </p>

            <UpgradeActions onClose={onClose} />
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function UpgradeActions({ onClose }: { onClose: () => void }) {
  return (
    <div className="mt-6 flex flex-col gap-3">
      <CheckoutButton product="video_single" label="Buy 1 demo — $19" className="w-full" />
      <CheckoutButton
        product="starter"
        label="Starter — $29/mo (5 demos)"
        variant="secondary"
        className="w-full"
      />
      <Link
        href="/pricing"
        onClick={onClose}
        className="text-center text-sm font-medium text-accent hover:underline"
      >
        View all plans
      </Link>
    </div>
  );
}
