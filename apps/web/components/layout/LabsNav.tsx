"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HistoryDropdown } from "@/components/history/HistoryDropdown";

const links = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#benchmark", label: "Benchmark" },
];

export function LabsNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-5 sm:gap-4 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 text-foreground transition hover:opacity-80">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            D
          </span>
          <span className="truncate text-sm font-semibold tracking-tight">
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
            className="hidden rounded-full border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-accent/30 hover:bg-accent-soft/40 sm:inline-flex"
          >
            Get started
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground sm:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen ? (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border bg-surface sm:hidden"
            aria-label="Mobile"
          >
            <ul className="flex flex-col gap-1 px-5 py-3">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-muted"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#create"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg bg-accent px-3 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Get started
                </a>
              </li>
            </ul>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
