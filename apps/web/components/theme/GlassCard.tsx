import type { ReactNode } from "react";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  withInnerGlow?: boolean;
};

export function GlassCard({
  children,
  className = "",
  innerClassName = "",
  withInnerGlow = true,
}: GlassCardProps) {
  return (
    <div className={`relative w-full ${className}`.trim()}>
      <div className="pointer-events-none absolute -inset-px rounded-[1.35rem] bg-gradient-to-br from-white/25 via-fuchsia-500/20 to-cyan-400/20 opacity-60 blur-sm" />
      <div className="pointer-events-none absolute -inset-[2px] rounded-[1.4rem] bg-gradient-to-tr from-cyan-400/30 via-transparent to-fuchsia-500/25 opacity-40 animate-border-glow" />

      <div
        className={`relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/40 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_25px_80px_-20px_rgba(0,0,0,0.85),0_0_120px_-30px_rgba(168,85,247,0.35)] backdrop-blur-2xl sm:p-10 ${innerClassName}`.trim()}
      >
        {withInnerGlow ? (
          <>
            <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-fuchsia-500/15 blur-3xl" />
          </>
        ) : null}
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}
