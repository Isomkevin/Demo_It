"use client";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type JobStatus = {
  projectId: string;
  stage: string;
  progress: number;
};

export function useProjectStatus(projectId: string) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!projectId || done) return;

    const es = new EventSource(`${API_URL}/api/v1/projects/${projectId}/status`);
    es.onmessage = (e) => {
      const data: JobStatus = JSON.parse(e.data);
      setStatus(data);
      if (data.stage === "completed" || data.stage === "failed") {
        setDone(true);
        es.close();
      }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [projectId, done]);

  return { status, done };
}
