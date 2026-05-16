"use client";

const TONES = [
  {
    id: "marketing",
    label: "Marketing",
    description: "Upbeat, value-focused",
    icon: "📣",
  },
  {
    id: "investor",
    label: "Investor",
    description: "Visionary, metrics-led",
    icon: "📈",
  },
  {
    id: "user_onboarding",
    label: "Onboarding",
    description: "Clear, educational",
    icon: "🎓",
  },
  {
    id: "tutorial",
    label: "Tutorial",
    description: "Step-by-step, technical",
    icon: "🛠",
  },
] as const;

type ToneId = (typeof TONES)[number]["id"];

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function ToneSelector({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted">Demo tone</span>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TONES.map((tone) => {
          const selected = value === tone.id;
          return (
            <button
              key={tone.id}
              type="button"
              onClick={() => onChange(tone.id)}
              className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition ${
                selected
                  ? "border-accent bg-accent-soft/60 shadow-[0_0_0_1px_rgb(15_118_110/0.15)]"
                  : "border-border bg-surface-muted hover:border-border-strong hover:bg-surface"
              }`}
              aria-pressed={selected}
            >
              <span className="text-base" aria-hidden>
                {tone.icon}
              </span>
              <span className={`text-sm font-semibold ${selected ? "text-accent" : "text-foreground"}`}>
                {tone.label}
              </span>
              <span className="text-[11px] leading-snug text-muted">{tone.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type { ToneId };
