"use client";

interface ShopHeroProps {
  brandName: string;
  tagline: string;
  comingSoonTitle: string;
  comingSoonBody: string;
  heroBadge: string;
}

export function ShopHero({
  brandName,
  tagline,
  comingSoonTitle,
  comingSoonBody,
  heroBadge,
}: ShopHeroProps) {
  return (
    <div className="relative mx-auto flex max-w-5xl flex-col items-center overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-b from-neutral-950 via-neutral-900 to-black p-8 sm:p-16 text-center shadow-2xl">
      {/* Subtle glowing radial background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_70%_at_50%_30%,rgba(251,191,36,0.12),transparent)]" />

      {/* Floating Monogram / Crown Badge */}
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 shadow-lg shadow-amber-500/10">
        <span className="animate-spin-slow absolute inset-0 rounded-full border border-dashed border-amber-500/30" />
        <span className="font-[family-name:var(--font-display)] text-2xl font-black text-amber-200 tracking-widest">
          HV
        </span>
      </div>

      <span className="inline-block px-4 py-1.5 mb-4 text-xs uppercase tracking-[0.25em] font-semibold text-amber-300 border border-amber-500/30 rounded-full bg-amber-500/10">
        {heroBadge}
      </span>

      <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-6xl font-extrabold text-white tracking-tight">
        {brandName}
      </h1>

      <p className="mt-2 font-[family-name:var(--font-display)] text-sm sm:text-base uppercase tracking-[0.3em] text-amber-400 font-medium">
        {tagline}
      </p>

      <div className="my-6 w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

      <h2 className="text-xl sm:text-2xl font-bold text-neutral-100 max-w-2xl">
        {comingSoonTitle}
      </h2>

      <p className="mt-4 max-w-2xl text-sm sm:text-base text-neutral-300 leading-relaxed">
        {comingSoonBody}
      </p>
    </div>
  );
}
