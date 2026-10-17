import { useId } from "react";

export function Logo({ size = 32 }: { size?: number }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 180 180"
      role="img"
      aria-label="IPScans"
      className="shrink-0"
      fill="none"
    >
      <path
        d="M144.248 149.062C151.748 154.688 162.998 150.938 152.685 140.625C121.748 110.625 128.31 28.125 89.8727 28.125C51.4352 28.125 57.9977 110.625 27.0602 140.625C15.8102 151.875 27.9977 154.688 35.4977 149.062C64.5602 129.375 62.6852 94.6875 89.8727 94.6875C117.06 94.6875 115.185 129.375 144.248 149.062Z"
        fill={`url(#${uid}-grad)`}
      />
      <circle cx="90" cy="128" r="11" fill="#ffffff" opacity="0.95" />
      <defs>
        <linearGradient id={`${uid}-grad`} x1="22" y1="28" x2="158" y2="152" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00B95C" />
          <stop offset="32%" stopColor="#FBBC04" />
          <stop offset="64%" stopColor="#FC413D" />
          <stop offset="100%" stopColor="#3186FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}
