const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
  getProjects: () => apiFetch<{ projects: any[] }>("/api/v1/projects"),
  getProject: (id: string) => apiFetch<{ project: any }>(`/api/v1/projects/${id}`),
};
