import type { ReactNode } from "react";
import { DemoBackdrop } from "./DemoBackdrop";

type DemoShellProps = {
  children: ReactNode;
  className?: string;
};

export function DemoShell({ children, className = "" }: DemoShellProps) {
  return (
    <main
      className={`relative isolate min-h-screen overflow-x-hidden bg-background text-foreground ${className}`.trim()}
    >
      <DemoBackdrop />
      {children}
    </main>
  );
}
