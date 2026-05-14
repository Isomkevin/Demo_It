import type { ReactNode } from "react";
import { DemoBackdrop } from "./DemoBackdrop";

type DemoShellProps = {
  children: ReactNode;
  className?: string;
};

export function DemoShell({ children, className = "" }: DemoShellProps) {
  return (
    <main
      className={`relative isolate min-h-screen overflow-hidden bg-[#05040a] text-zinc-100 ${className}`.trim()}
    >
      <DemoBackdrop />
      {children}
    </main>
  );
}
