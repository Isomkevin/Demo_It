"use client";

import { useEffect, useState } from "react";

export function formatElapsed(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  if (min < 60) return rem > 0 ? `${min}m ${rem}s` : `${min}m`;
  const hr = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${hr}h ${m}m` : `${hr}h`;
}

export function useElapsedTime(startIso: string | undefined, active: boolean) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startIso || !active) return;
    const start = new Date(startIso).getTime();
    const tick = () => setElapsed(Math.max(0, Date.now() - start));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startIso, active]);

  return elapsed;
}
