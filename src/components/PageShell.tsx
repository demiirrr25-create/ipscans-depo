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
    <div className="mx-auto max-w-6xl px-4 py-16">
      <header className="text-center">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-5xl">
          <span className="text-gradient">{title}</span>
        </h1>
        {subtitle && (
          <p className="mx-auto mt-4 max-w-2xl text-neutral-400">{subtitle}</p>
        )}
      </header>
      <div className="mt-12">{children}</div>
    </div>
  );
}
