"use client";

import Link from "next/link";
import { DemoShell } from "@/components/theme/DemoShell";
import { GlassCard } from "@/components/theme/GlassCard";
import { LabsNav } from "@/components/layout/LabsNav";

export default function BillingCancelPage() {
  return (
    <DemoShell>
      <LabsNav />
      <section className="relative z-10 mx-auto max-w-lg px-5 py-20 sm:px-8">
        <GlassCard innerClassName="!p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Checkout cancelled</h1>
          <p className="mt-3 text-sm text-muted">No charge was made. You can try again anytime.</p>
          <Link
            href="/pricing"
            className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            Back to pricing
          </Link>
          <Link href="/" className="mt-4 inline-block text-sm text-muted hover:text-foreground">
            Home
          </Link>
        </GlassCard>
      </section>
    </DemoShell>
  );
}
