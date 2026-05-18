"use client";

import { useState } from "react";
import Link from "next/link";
import { DemoShell } from "@/components/theme/DemoShell";
import { GlassCard } from "@/components/theme/GlassCard";
import { LabsNav } from "@/components/layout/LabsNav";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { api, ApiError } from "@/lib/api-client";
import type { BillingProduct } from "@demo-copilot/types";

const ENTERPRISE_EMAIL =
  process.env.NEXT_PUBLIC_ENTERPRISE_SALES_EMAIL ?? "sales@demoit.app";

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
        <PricingPageHeader openPortal={openPortal} portalLoading={portalLoading} portalError={portalError} />

        <PayPerVideoSection />

        <SubscriptionsSection teamSeats={teamSeats} setTeamSeats={setTeamSeats} />

        <p className="mt-8 text-center text-sm text-muted">
          <Link href="/settings" className="font-medium text-accent hover:underline">
            Plan settings
          </Link>
          {" — configure custom voice (Pro+) and brand kit (Team+)"}
        </p>

        <p className="mt-4 text-center text-xs text-muted">
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

function PricingPageHeader({
  openPortal,
  portalLoading,
  portalError,
}: {
  openPortal: () => void;
  portalLoading: boolean;
  portalError: string | null;
}) {
  return (
    <PricingPageHeaderBlock openPortal={openPortal} portalLoading={portalLoading} portalError={portalError} />
  );
}

function PricingPageHeaderBlock(props: {
  openPortal: () => void;
  portalLoading: boolean;
  portalError: string | null;
}) {
  const { openPortal, portalLoading, portalError } = props;
  return (
    <div className="text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warm">ElevenHacks × Stripe</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Pricing</h1>
      <p className="mx-auto mt-3 max-w-xl text-muted">
        Pay per launch video or subscribe for unlimited demos, HD exports, and team features.
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
  );
}

function PayPerVideoSection() {
  return (
    <div className="mt-12">
      <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-muted">
        Pay per video
      </h2>
      <PayPerVideoGrid />
    </div>
  );
}

function PayPerVideoGrid() {
  return (
    <div className="mt-6 grid gap-6 sm:grid-cols-2">
      <FeaturePriceCard
        title="Single demo"
        price="$19"
        features={["1 cinematic MP4", "720p export", "Standard voice"]}
        product="video_single"
        cta="Buy 1 demo"
      />
      <FeaturePriceCard
        title="5-pack"
        price="$79"
        features={["5 demo credits", "Best for launch week", "720p export"]}
        product="video_pack_5"
        cta="Buy 5 demos"
      />
    </div>
  );
}

function SubscriptionsSection({
  teamSeats,
  setTeamSeats,
}: {
  teamSeats: number;
  setTeamSeats: (n: number) => void;
}) {
  return (
    <div className="mt-14">
      <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-muted">
        Monthly subscriptions
      </h2>
      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <FeaturePriceCard
          title="Starter"
          price="$29/mo"
          features={["5 demos / month", "720p export", "All demo tones"]}
          product="starter"
          cta="Subscribe"
        />
        <FeaturePriceCard
          title="Pro"
          price="$79/mo"
          features={["Unlimited demos", "HD exports (1080p)", "Custom ElevenLabs voice"]}
          product="pro"
          cta="Subscribe"
          highlighted
          badge="Most popular"
        />
        <GlassCard className="flex flex-col" innerClassName="flex h-full flex-col !p-6">
          <h3 className="text-lg font-bold text-foreground">Team</h3>
          <p className="mt-2 text-3xl font-bold text-accent">$199/mo</p>
          <ul className="mt-4 flex-1 space-y-2 text-sm text-muted">
            {["Collaboration & seats", "Usage analytics", "Brand kit"].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <CheckIcon />
                {f}
              </li>
            ))}
            <li className="flex items-start gap-2 text-xs text-accent">
              <CheckIcon />
              Includes everything in Pro
            </li>
          </ul>
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
        <EnterpriseCard email={ENTERPRISE_EMAIL} />
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-accent"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function FeaturePriceCard({
  title,
  price,
  features,
  product,
  cta,
  highlighted,
  badge,
}: {
  title: string;
  price: string;
  features: string[];
  product: BillingProduct;
  cta: string;
  highlighted?: boolean;
  badge?: string;
}) {
  return (
    <GlassCard
      className={highlighted ? "ring-2 ring-accent/30" : ""}
      innerClassName="relative flex h-full flex-col !p-6"
    >
      {badge ? (
        <span className="absolute right-4 top-4 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
          {badge}
        </span>
      ) : null}
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-accent">{price}</p>
      <ul className="mt-4 flex-1 space-y-2 text-sm text-muted">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <CheckIcon />
            {f}
          </li>
        ))}
      </ul>
      <CheckoutButton product={product} label={cta} className="mt-6 w-full" />
    </GlassCard>
  );
}

function EnterpriseCard({ email }: { email: string }) {
  return (
    <GlassCard innerClassName="flex h-full flex-col !p-6">
      <h3 className="text-lg font-bold text-foreground">Enterprise</h3>
      <p className="mt-2 text-3xl font-bold text-accent">Custom</p>
      <ul className="mt-4 flex-1 space-y-2 text-sm text-muted">
        {["Private deployments", "CRM integrations", "SSO"].map((f) => (
          <li key={f} className="flex items-start gap-2">
            <CheckIcon />
            {f}
          </li>
        ))}
        <li className="flex items-start gap-2 text-xs text-accent">
          <CheckIcon />
          Dedicated support & SLAs
        </li>
      </ul>
      <a
        href={`mailto:${email}?subject=Demo%20It%20Enterprise`}
        className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-hover"
      >
        Contact sales
      </a>
    </GlassCard>
  );
}
