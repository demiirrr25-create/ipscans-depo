export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="page-frame mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
      <header className="page-heading border-b border-white/20 pb-10">
        <p className="mb-6 font-mono text-[11px] tracking-[.2em] text-neutral-400">IPSCANS / NETWORK INTELLIGENCE</p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-[-.05em] sm:text-6xl">
          <span className="text-white">{title}</span>
        </h1>
        {subtitle && (
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-neutral-400">{subtitle}</p>
        )}
      </header>
      <div className="mt-12">{children}</div>
    </div>
  );
}
