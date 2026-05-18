"use client";

import { useEffect } from "react";
import { getOrCreateOrgId } from "@/lib/org-id";

/** Ensures demo_org_id cookie exists before any API calls from child components. */
export function OrgInitializer() {
  useEffect(() => {
    getOrCreateOrgId();
  }, []);
  return null;
}
