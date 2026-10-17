import type { Dictionary } from "@/i18n/dictionaries";

export function ComingSoon({ dict }: { dict: Dictionary["shop"] }) {
  return (
    <div className="agy-surface-card relative mx-auto flex max-w-2xl flex-col items-center overflow-hidden px-8 py-20 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,rgba(113,137,255,0.12),transparent)]" />

      <div
        className="relative grid h-36 w-36 place-items-center"
        aria-hidden="true"
      >
        <span className="animate-spin-slow absolute inset-0 rounded-full border border-dashed border-white/25" />
        <span
          className="absolute inset-3 rounded-full border border-dashed border-white/15"
          style={{ animation: "spin-slow 12s linear infinite reverse" }}
        />
        <span className="animate-float grid h-16 w-16 place-items-center rounded-full border border-white/15 bg-[#18191e]">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.6"
          >
            <rect x="3" y="7" width="14" height="10" rx="2" />
            <path d="M17 10.5 21 8v8l-4-2.5" />
          </svg>
        </span>
      </div>

      <h2 className="heading-4 mt-8 text-white">{dict.comingSoonTitle}</h2>
      <p className="body mx-auto mt-3 max-w-md text-neutral-400">
        {dict.comingSoonBody}
      </p>
    </div>
  );
}
