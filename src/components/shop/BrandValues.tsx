"use client";

export interface BrandValue {
  title: string;
  desc: string;
}

interface BrandValuesProps {
  title: string;
  brandValues: readonly BrandValue[];
}

export function BrandValues({ title, brandValues }: BrandValuesProps) {
  const icons = [
    (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FDE68A" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
      </svg>
    ),
    (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FDE68A" strokeWidth="1.5">
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
      </svg>
    ),
    (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FDE68A" strokeWidth="1.5">
        <path d="M12 2v20M2 12h20" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
    (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FDE68A" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  ];

  return (
    <section className="my-20 p-8 sm:p-12 rounded-3xl border border-white/10 bg-neutral-900/50 backdrop-blur-md">
      <div className="text-center max-w-xl mx-auto mb-12">
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-white">
          {title}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {brandValues.map((val, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center text-center p-6 rounded-2xl border border-white/5 bg-white/[0.02]"
          >
            <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 mb-4">
              {icons[idx % icons.length]}
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-white mb-2">
              {val.title}
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {val.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
