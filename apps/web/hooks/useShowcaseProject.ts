"use client";

import { useEffect, useState } from "react";
import { api, type ApiProject } from "@/lib/api-client";

const SHOWCASE_ID = process.env.NEXT_PUBLIC_SHOWCASE_PROJECT_ID;

export function useShowcaseProject() {
  const [project, setProject] = useState<ApiProject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (SHOWCASE_ID) {
          const { project: pinned } = await api.getProject(SHOWCASE_ID);
          if (!cancelled && pinned.status === "completed" && pinned.videoUrl) {
            setProject(pinned);
            return;
          }
        }

        const { projects } = await api.getProjects();
        const latest = projects.find((p) => p.status === "completed" && p.videoUrl);
        if (!cancelled) setProject(latest ?? null);
      } catch {
        if (!cancelled) setProject(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { project, loading };
}
