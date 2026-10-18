import { useId } from "react";

/**
 * IPScans mark — a hexagonal node graph with a gradient signal core.
 * Uses currentColor for the frame so it adapts to light and dark stages.
 */
export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="IPScans"
      className={`shrink-0 ${className}`}
      fill="none"
    >
      <defs>
        <linearGradient id={`g-${id}`} x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2F6BFF" />
          <stop offset="0.5" stopColor="#00C2FF" />
          <stop offset="1" stopColor="#7A5CFF" />
        </linearGradient>
      </defs>
      <path
        d="M32 5.5 55 18.75v26.5L32 58.5 9 45.25v-26.5L32 5.5Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M32 5.5V24M55 18.75 39 28M55 45.25 39 36M32 58.5V40M9 45.25 25 36M9 18.75 25 28"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle cx="32" cy="32" r="9" fill={`url(#g-${id})`} />
    </svg>
  );
}

/** Mark + wordmark lockup used in the header and footer. */
export function LogoLockup({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Logo size={size} />
      <span className="text-[1.15rem] font-medium tracking-[-0.03em]">IPScans</span>
    </span>
  );
}
