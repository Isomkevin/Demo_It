import type { Project } from "@demo-copilot/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/** Project as returned by the JSON API (dates are ISO strings). */
export type ApiProject = Omit<Project, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  createProject: (body: { url: string; name?: string; tone?: string }) =>
    apiFetch<{ project: { id: string } }>("/api/v1/projects", { method: "POST", body: JSON.stringify(body) }),
  getProjects: () => apiFetch<{ projects: ApiProject[] }>("/api/v1/projects"),
  getProject: (id: string) => apiFetch<{ project: ApiProject }>(`/api/v1/projects/${id}`),
};
