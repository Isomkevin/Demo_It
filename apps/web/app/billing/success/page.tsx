"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { BillingStatus } from "@demo-copilot/types";
import { DemoShell } from "@/components/theme/DemoShell";
import { GlassCard } from "@/components/theme/GlassCard";
import { LabsNav } from "@/components/layout/LabsNav";
import { api, ApiError } from "@/lib/api-client";

function BillingSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const next = sessionId
          ? await api.confirmCheckout(sessionId)
          : await api.getBillingStatus();
        if (!cancelled) setStatus(next);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not apply credits. If you paid, try refreshing or contact support."
          );
          try {
            const fallback = await api.getBillingStatus();
            if (!cancelled) setStatus(fallback);
          } catch {
            if (!cancelled) setStatus(null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const creditLabel = status?.unlimitedDemos
    ? "Unlimited demos"
    : status
      ? `${status.creditsBalance} credit${status.creditsBalance === 1 ? "" : "s"}`
      : null;

  return (
    <section className="relative z-10 mx-auto max-w-lg px-5 py-20 sm:px-8">
      <GlassCard innerClassName="!p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warm">Payment successful</p>
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          {loading ? "Applying credits…" : error ? "Payment received" : "Credits added"}
        </h1>
        <p className="mt-3 text-sm text-muted">
          {error
            ? error
            : "Your Stripe payment went through. Demo credits are ready — generate your next launch video."}
        </p>
        {creditLabel && !loading ? (
          <p className="mt-2 text-sm font-medium text-foreground">
            Balance: {creditLabel}
            {status && status.plan !== "FREE" ? ` · ${status.planDisplayName ?? status.plan} plan` : ""}
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
  );
}

export default function BillingSuccessPage() {
  return (
    <DemoShell>
      <LabsNav />
      <Suspense
        fallback={
          <section className="relative z-10 mx-auto max-w-lg px-5 py-20 text-center text-sm text-muted">
            Loading…
          </section>
        }
      >
        <BillingSuccessContent />
      </Suspense>
    </DemoShell>
  );
}
