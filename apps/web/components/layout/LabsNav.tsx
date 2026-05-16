import Link from "next/link";
import { HistoryDropdown } from "@/components/history/HistoryDropdown";

const links = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#benchmark", label: "Benchmark" },
];

export function LabsNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-5 sm:gap-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-foreground transition hover:opacity-80">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            D
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Demo <span className="text-accent">It</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 sm:flex" aria-label="Primary">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted transition hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <HistoryDropdown />
          <a
            href="#create"
            className="rounded-full border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-accent/30 hover:bg-accent-soft/40"
          >
            Get started
          </a>
        </div>
      </div>
    </header>
  );
}
