"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DemoShell } from "@/components/theme/DemoShell";
import { GlassCard } from "@/components/theme/GlassCard";
import { LabsNav } from "@/components/layout/LabsNav";
import { GradientCtaButton } from "@/components/theme/GradientCtaButton";
import { api, ApiError } from "@/lib/api-client";
import type { BillingStatus, OrgAnalytics, VoiceOption } from "@demo-copilot/types";

export default function SettingsPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [analytics, setAnalytics] = useState<OrgAnalytics | null>(null);
  const [brandName, setBrandName] = useState("");
  const [brandColor, setBrandColor] = useState("#0f766e");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getBillingStatus()
      .then((s) => {
        setStatus(s);
        setBrandName(s.brandName ?? "");
        setBrandColor(s.brandColor ?? "#0f766e");
        setBrandLogoUrl(s.brandLogoUrl ?? "");
        if (s.capabilities.customVoice) {
          return api.listVoices().then((v) => {
            setVoices(v.voices);
            setSelectedVoice(v.selectedVoiceId);
          });
        }
      })
      .catch(() => setStatus(null));

    api
      .getOrgAnalytics()
      .then(setAnalytics)
      .catch(() => setAnalytics(null));
  }, []);

  const saveVoice = async () => {
    setMessage(null);
    setError(null);
    try {
      await api.setOrgVoice(selectedVoice);
      setMessage("Custom voice saved for your next demo.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save voice");
    }
  };

  const saveBrand = async () => {
    setMessage(null);
    setError(null);
    try {
      await api.updateOrgBrand({
        brandName: brandName || undefined,
        brandColor,
        brandLogoUrl: brandLogoUrl || null,
      });
      setMessage("Brand kit updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save brand kit");
    }
  };

  return (
    <DemoShell>
      <LabsNav />
      <section className="relative z-10 mx-auto max-w-2xl px-5 py-12 sm:px-8">
        <Link href="/pricing" className="text-sm text-accent hover:underline">
          ← Pricing
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-foreground">Plan settings</h1>
        {status ? (
          <p className="mt-2 text-sm text-muted">
            {status.planDisplayName} plan
            {status.unlimitedDemos ? " · unlimited demos" : ` · ${status.creditsBalance} credits`}
            {status.capabilities.hdExport ? " · HD export" : " · 720p export"}
          </p>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-lg border border-accent/20 bg-accent-soft px-3 py-2 text-sm text-accent">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {status?.capabilities.customVoice ? (
          <GlassCard className="mt-8" innerClassName="!p-6">
            <h2 className="text-lg font-semibold text-foreground">Custom voice (Pro+)</h2>
            <p className="mt-1 text-sm text-muted">ElevenLabs narrator for all new demos.</p>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="mt-4 w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm"
            >
              {voices.map((v) => (
                <option key={v.voiceId} value={v.voiceId}>
                  {v.name}
                </option>
              ))}
            </select>
            <GradientCtaButton type="button" className="mt-4" onClick={() => void saveVoice()}>
              Save voice
            </GradientCtaButton>
          </GlassCard>
        ) : (
          <GlassCard className="mt-8" innerClassName="!p-6">
            <p className="text-sm text-muted">
              Custom voice requires{" "}
              <Link href="/pricing" className="text-accent hover:underline">
                Pro
              </Link>
              .
            </p>
          </GlassCard>
        )}

        {status?.capabilities.brandKit ? (
          <GlassCard className="mt-6" innerClassName="!p-6">
            <h2 className="text-lg font-semibold text-foreground">Brand kit (Team+)</h2>
            <p className="mt-1 text-sm text-muted">Used in social drafts and launch previews.</p>
            <div className="mt-4 flex flex-col gap-3">
              <label className="text-sm font-medium">
                Brand name
                <input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium">
                Accent color
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-border"
                />
              </label>
              <label className="text-sm font-medium">
                Logo URL
                <input
                  value={brandLogoUrl}
                  onChange={(e) => setBrandLogoUrl(e.target.value)}
                  placeholder="https://…"
                  className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                />
              </label>
            </div>
            <GradientCtaButton type="button" className="mt-4" onClick={() => void saveBrand()}>
              Save brand kit
            </GradientCtaButton>
          </GlassCard>
        ) : null}

        {analytics ? (
          <GlassCard className="mt-6" innerClassName="!p-6">
            <h2 className="text-lg font-semibold text-foreground">Usage analytics (Team+)</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted">Demos this month</dt>
                <dd className="text-2xl font-bold text-foreground">{analytics.demosThisMonth}</dd>
              </div>
              <div>
                <dt className="text-muted">Total completed</dt>
                <dd className="text-2xl font-bold text-foreground">{analytics.demosCompleted}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted">Team seats</dt>
                <dd className="text-2xl font-bold text-foreground">{analytics.seatLimit}</dd>
              </div>
            </dl>
          </GlassCard>
        ) : status && !status.capabilities.analytics ? (
          <GlassCard className="mt-6" innerClassName="!p-6">
            <p className="text-sm text-muted">
              Analytics requires{" "}
              <Link href="/pricing" className="text-accent hover:underline">
                Team
              </Link>
              .
            </p>
          </GlassCard>
        ) : null}
      </section>
    </DemoShell>
  );
}
