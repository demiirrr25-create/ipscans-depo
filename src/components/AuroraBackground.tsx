export function AuroraBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black"
    >
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute left-1/2 top-[-20%] h-[50vh] w-[80vw] -translate-x-1/2 rounded-full bg-white/[0.05] blur-[120px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_-10%,transparent,#000_80%)]" />
    </div>
  );
}
