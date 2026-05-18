"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BillingStatus } from "@demo-copilot/types";
import { api } from "@/lib/api-client";

const PLAN_LABEL: Record<BillingStatus["plan"], string> = {
  FREE: "Free",
  STARTER: "Starter",
  PRO: "Pro",
  TEAM: "Team",
  AGENCY: "Agency",
};

export function CreditsBadge() {
  const [status, setStatus] = useState<BillingStatus | null>(null);

  useEffect(() => {
    api
      .getBillingStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (!status) return null;

  return (
    <Link
      href="/pricing"
      className="hidden items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:border-accent/30 sm:inline-flex"
    >
      <span className="tabular-nums text-accent">{status.creditsBalance}</span>
      <span className="text-muted">
        credit{status.creditsBalance === 1 ? "" : "s"}
        {status.plan !== "FREE" ? ` · ${PLAN_LABEL[status.plan]}` : ""}
      </span>
    </Link>
  );
}
