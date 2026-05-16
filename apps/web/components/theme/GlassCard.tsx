import type { ReactNode } from "react";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  elevated?: boolean;
  id?: string;
};

export function GlassCard({
  children,
  className = "",
  innerClassName = "",
  elevated = false,
  id,
}: GlassCardProps) {
  const surface = elevated ? "surface-card-elevated" : "surface-card";
  return (
    <div id={id} className={`relative w-full scroll-mt-24 rounded-2xl ${surface} ${className}`.trim()}>
      <div className={`relative p-6 sm:p-8 ${innerClassName}`.trim()}>{children}</div>
    </div>
  );
}
