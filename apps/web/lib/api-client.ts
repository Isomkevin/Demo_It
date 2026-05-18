import type { BillingProduct, BillingStatus, Project } from "@demo-copilot/types";
import type { PlatformDrafts } from "@/lib/platform-drafts";
import { getOrCreateOrgId } from "@/lib/org-id";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/** Project as returned by the JSON API (dates are ISO strings). */
export type ApiProject = Omit<Project, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const orgId = getOrCreateOrgId();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Org-Id": orgId,
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let message = `API error ${res.status}`;
    let code: string | undefined;
    try {
      const body = (await res.json()) as { error?: string; message?: string; code?: string };
      message = body.message || body.error || message;
      code = body.code;
    } catch {
      message = await res.text();
    }
    throw new ApiError(message, res.status, code);
  }

  return res.json() as Promise<T>;
}

export const api = {
  createProject: (body: { url: string; name?: string; tone?: string }) =>
    apiFetch<{ project: { id: string } }>("/api/v1/projects", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getProjects: () => apiFetch<{ projects: ApiProject[] }>("/api/v1/projects"),
  getProject: (id: string) => apiFetch<{ project: ApiProject }>(`/api/v1/projects/${id}`),
  generateSocialDrafts: (id: string, body?: { brand?: string; handle?: string }) =>
    apiFetch<{
      brand: string;
      handle: string;
      caption: string;
      platformDrafts: PlatformDrafts;
    }>(`/api/v1/projects/${id}/social-drafts`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),
  getBillingStatus: () => apiFetch<BillingStatus>("/api/v1/billing/status"),
  createCheckout: (body: { product: BillingProduct; quantity?: number }) =>
    apiFetch<{ url: string }>("/api/v1/billing/checkout", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  openBillingPortal: () =>
    apiFetch<{ url: string }>("/api/v1/billing/portal", { method: "POST", body: "{}" }),
};
