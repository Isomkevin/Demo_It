"use client";

import { useState } from "react";
import type { BillingProduct } from "@demo-copilot/types";
import { api, ApiError } from "@/lib/api-client";
import { GradientCtaButton } from "@/components/theme/GradientCtaButton";

type Props = {
  product: BillingProduct;
  quantity?: number;
  label: string;
  variant?: "primary" | "secondary";
  className?: string;
};

export function CheckoutButton({
  product,
  quantity,
  label,
  variant = "primary",
  className = "",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const { url } = await api.createCheckout({ product, quantity });
      window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Checkout failed");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {variant === "primary" ? (
        <GradientCtaButton type="button" disabled={loading} className={className} onClick={handleClick}>
          {loading ? "Redirecting…" : label}
        </GradientCtaButton>
      ) : (
        <button
          type="button"
          disabled={loading}
          onClick={handleClick}
          className={`w-full rounded-full border border-border-strong bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-accent/30 hover:bg-accent-soft/30 disabled:opacity-50 ${className}`}
        >
          {loading ? "Redirecting…" : label}
        </button>
      )}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
