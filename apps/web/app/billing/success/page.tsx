"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BillingStatus } from "@demo-copilot/types";
import { DemoShell } from "@/components/theme/DemoShell";
import { GlassCard } from "@/components/theme/GlassCard";
import { LabsNav } from "@/components/layout/LabsNav";
import { api } from "@/lib/api-client";

export default function BillingSuccessPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);

  useEffect(() => {
    api.getBillingStatus().then(setStatus).catch(() => setStatus(null));
  }, []);
  return (
    <DemoShell>
      <LabsNav />
      <section className="relative z-10 mx-auto max-w-lg px-5 py-20 sm:px-8">
        <GlassCard innerClassName="!p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warm">Payment successful</p>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Credits added</h1>
          <p className="mt-3 text-sm text-muted">
            Your Stripe payment went through. Demo credits are ready — generate your next launch video.
          </p>
          {status ? (
            <p className="mt-2 text-sm font-medium text-foreground">
              Balance: {status.creditsBalance} credit{status.creditsBalance === 1 ? "" : "s"}
              {status.plan !== "FREE" ? ` · ${status.plan} plan` : ""}
            </p>
          ) : null}
          <Link
            href="/#create"
            className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover"
          >
            Create a demo
          </Link>
          <Link href="/pricing" className="mt-4 inline-block text-sm text-accent hover:underline">
            View pricing
          </Link>
        </GlassCard>
      </section>
    </DemoShell>
  );
}
