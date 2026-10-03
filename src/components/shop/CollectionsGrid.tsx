"use client";

export interface CollectionItem {
  id: string;
  name: string;
  desc: string;
  badge: string;
  tag: string;
}

interface CollectionsGridProps {
  title: string;
  subtitle: string;
  collections: readonly CollectionItem[];
}

export function CollectionsGrid({
  title,
  subtitle,
  collections,
}: CollectionsGridProps) {
  const categoryIcons: Record<string, React.ReactNode> = {
    suits: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FDE68A" strokeWidth="1.5">
        <path d="M6 3h12l3 5-9 13L3 8l3-5z" />
        <path d="M12 3v18" />
        <path d="M7 8l5 4 5-4" />
      </svg>
    ),
    outerwear: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FDE68A" strokeWidth="1.5">
        <path d="M20.38 3.46L16 2 12 5 8 2 3.62 3.46A2 2 0 002 5.38V21a1 1 0 001.38.92L8 20l4 2 4-2 4.62 1.92A1 1 0 0022 21V5.38a2 2 0 00-1.62-1.92z" />
        <path d="M12 5v17" />
      </svg>
    ),
    shirts: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FDE68A" strokeWidth="1.5">
        <path d="M3 6l6-3 3 3 3-3 6 3v15H3V6z" />
        <path d="M12 6v15" />
        <circle cx="12" cy="10" r="1" fill="#FDE68A" />
        <circle cx="12" cy="14" r="1" fill="#FDE68A" />
      </svg>
    ),
    footwear: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FDE68A" strokeWidth="1.5">
        <path d="M4 18l3-12h10l3 12H4z" />
        <path d="M2 18h20v3H2z" />
        <path d="M9 10h6" />
      </svg>
    ),
  };

  return (
    <section className="my-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-white tracking-tight">
          {title}
        </h2>
        <p className="mt-3 text-neutral-400 text-sm sm:text-base">
          {subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {collections.map((item) => (
          <div
            key={item.id}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900/80 to-neutral-950 p-6 transition-all duration-300 hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/15 transition-all" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/10">
                  {categoryIcons[item.id] || categoryIcons.suits}
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300 px-2.5 py-1 rounded-md border border-amber-500/20 bg-amber-500/10">
                  {item.tag}
                </span>
              </div>

              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-white group-hover:text-amber-200 transition">
                {item.name}
              </h3>

              <p className="mt-2 text-xs text-neutral-400 leading-relaxed">
                {item.desc}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-medium text-amber-400/90">
              <span>{item.badge}</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
