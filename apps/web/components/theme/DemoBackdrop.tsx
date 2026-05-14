export function DemoBackdrop() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-[20%] -top-[10%] h-[min(90vw,720px)] w-[min(90vw,720px)] rounded-full bg-fuchsia-600/35 blur-[100px] animate-aurora" />
        <div className="absolute -right-[15%] top-[20%] h-[min(85vw,640px)] w-[min(85vw,640px)] rounded-full bg-cyan-500/25 blur-[110px] animate-aurora-reverse" />
        <div className="absolute bottom-[-20%] left-[25%] h-[min(70vw,520px)] w-[min(70vw,520px)] rounded-full bg-violet-600/30 blur-[90px] animate-aurora" />
        <div className="absolute left-1/2 top-1/2 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-indigo-600/20 via-transparent to-transparent blur-3xl" />
      </div>

      <div className="pointer-events-none fixed left-1/2 top-[-40%] h-[120vmin] w-[120vmin] -translate-x-1/2 rounded-full bg-[conic-gradient(from_180deg_at_50%_50%,transparent,rgba(168,85,247,0.5),transparent,rgba(34,211,238,0.45),transparent)] opacity-[0.12] mix-blend-screen blur-sm animate-spin-slow" />

      <div className="bg-grid-fade pointer-events-none fixed inset-0" />
      <div className="noise-overlay fixed inset-0" aria-hidden />
    </>
  );
}
