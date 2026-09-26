import type { Dictionary } from "@/i18n/dictionaries";

export function ComingSoon({ dict }: { dict: Dictionary["shop"] }) {
  return (
    <div className="relative mx-auto flex max-w-xl flex-col items-center overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] px-6 py-20 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,rgba(255,255,255,0.08),transparent)]" />

      <div className="relative grid h-40 w-40 place-items-center" aria-hidden="true">
        <span className="animate-spin-slow absolute inset-0 rounded-full border border-dashed border-white/30" />
        <span
          className="absolute inset-3 rounded-full border border-dashed border-white/15"
          style={{ animation: "spin-slow 12s linear infinite reverse" }}
        />
        <span className="animate-float grid h-16 w-16 place-items-center rounded-full bg-white/5">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.6">
            <rect x="3" y="7" width="14" height="10" rx="2" />
            <path d="M17 10.5 21 8v8l-4-2.5" />
          </svg>
        </span>
      </div>

      <h2 className="mt-8 font-[family-name:var(--font-display)] text-2xl font-bold text-white sm:text-3xl">
        <span className="text-gradient text-depth">{dict.comingSoonTitle}</span>
      </h2>
      <p className="mx-auto mt-3 max-w-md text-neutral-400">
        {dict.comingSoonBody}
      </p>
    </div>
  );
}
