export function DemoBackdrop() {
  return (
    <>
      <div className="hero-glow pointer-events-none fixed inset-0" aria-hidden />
      <div
        className="dot-grid pointer-events-none fixed inset-0 opacity-40 [mask-image:radial-gradient(ellipse_90%_70%_at_50%_0%,black_20%,transparent_75%)]"
        aria-hidden
      />
    </>
  );
}
