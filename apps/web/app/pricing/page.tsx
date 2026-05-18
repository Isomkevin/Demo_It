"use client";

import { useState } from "react";
import Link from "next/link";
import { DemoShell } from "@/components/theme/DemoShell";
import { GlassCard } from "@/components/theme/GlassCard";
import { LabsNav } from "@/components/layout/LabsNav";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { api, ApiError } from "@/lib/api-client";
import type { BillingProduct } from "@demo-copilot/types";

export default function PricingPage() {
  const [teamSeats, setTeamSeats] = useState(3);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const openPortal = async () => {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const { url } = await api.openBillingPortal();
      window.location.href = url;
    } catch (err) {
      setPortalError(err instanceof ApiError ? err.message : "Could not open billing portal");
      setPortalLoading(false);
    }
  };

  return (
    <DemoShell>
      <LabsNav />

      <section className="relative z-10 mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warm">ElevenHacks × Stripe</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Pricing</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Pay per launch video or subscribe for monthly demo credits. Powered by Stripe Checkout.
          </p>
          <button
            type="button"
            onClick={openPortal}
            disabled={portalLoading}
            className="mt-4 text-sm font-medium text-accent hover:underline disabled:opacity-50"
          >
            {portalLoading ? "Opening portal…" : "Manage subscription & invoices"}
          </button>
          {portalError ? <p className="mt-1 text-xs text-red-600">{portalError}</p> : null}
        </div>

        <div className="mt-12">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-muted">
            Pay per video
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <PriceCard
              title="Single demo"
              price="$19"
              detail="1 cinematic MP4 from any product URL"
              product="video_single"
              cta="Buy 1 demo"
            />
            <PriceCard
              title="5-pack"
              price="$79"
              detail="5 demo credits — best for a launch week"
              product="video_pack_5"
              cta="Buy 5 demos"
            />
          </div>
        </div>

        <div className="mt-14">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-muted">
            Monthly subscriptions
          </h2>
          <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            <PriceCard
              title="Starter"
              price="$29/mo"
              detail="5 demos per month · all tones"
              product="starter"
              cta="Subscribe"
            />
            <PriceCard
              title="Pro"
              price="$79/mo"
              detail="20 demos/mo · social launch drafts"
              product="pro"
              cta="Subscribe"
              highlighted
            />
            <GlassCard className="flex flex-col">
              <h3 className="text-lg font-bold text-foreground">Team</h3>
              <p className="mt-2 text-3xl font-bold text-accent">$199/mo</p>
              <p className="mt-2 flex-1 text-sm text-muted">60 demos/mo · seat-based billing</p>
              <label className="mt-4 text-xs font-medium text-muted">
                Seats ({teamSeats})
                <input
                  type="range"
                  min={3}
                  max={10}
                  value={teamSeats}
                  onChange={(e) => setTeamSeats(Number(e.target.value))}
                  className="mt-1 w-full accent-accent"
                />
              </label>
              <CheckoutButton
                product="team"
                quantity={teamSeats}
                label={`Subscribe · ${teamSeats} seats`}
                className="mt-4 w-full"
              />
            </GlassCard>
            <PriceCard
              title="Agency"
              price="$499/mo"
              detail="200 demos/mo · high-volume GTM"
              product="agency"
              cta="Subscribe"
            />
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-muted">
          <Link href="/" className="text-accent hover:underline">
            ← Back to Demo It
          </Link>
          {" · "}
          New accounts include 1 free demo credit.
        </p>
      </section>
    </DemoShell>
  );
}

function PriceCard({
  title,
  price,
  detail,
  product,
  cta,
  highlighted,
}: {
  title: string;
  price: string;
  detail: string;
  product: BillingProduct;
  cta: string;
  highlighted?: boolean;
}) {
  return (
    <GlassCard
      className={highlighted ? "ring-2 ring-accent/30" : ""}
      innerClassName="flex h-full flex-col"
    >
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-accent">{price}</p>
      <p className="mt-2 flex-1 text-sm text-muted">{detail}</p>
      <CheckoutButton product={product} label={cta} className="mt-6 w-full" />
    </GlassCard>
  );
}
