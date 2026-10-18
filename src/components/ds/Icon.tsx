import type { SVGProps } from "react";

/**
 * Shared stroke icon set (24px grid, 1.6 stroke). Keep this list small and
 * purposeful — add an icon only when a real UI element needs it.
 */
const paths = {
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  arrowUpRight: "M7 17 17 7M8 7h9v9",
  arrowDown: "M12 5v14M6 13l6 6 6-6",
  arrowUp: "M12 19V5M6 11l6-6 6 6",
  download: "M12 4v11M7 10l5 5 5-5M5 19h14",
  chevronDown: "m6 9 6 6 6-6",
  chevronRight: "m9 6 6 6-6 6",
  check: "m5 12.5 4.5 4.5L19 7.5",
  copy: "M9 9h10v10H9zM5 15V5h10",
  close: "M6 6l12 12M18 6 6 18",
  menu: "M4 8h16M4 16h16",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21m0-18C9.5 5.6 8.2 8.6 8.2 12s1.3 6.4 3.8 9M3.5 9h17M3.5 15h17",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4-4",
  bolt: "M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z",
  shield: "M12 3 5 6v5.5c0 4.4 3 8.3 7 9.5 4-1.2 7-5.1 7-9.5V6l-7-3Z",
  network: "M12 4v5M12 15v5M5.5 8.5 9.5 11M14.5 13l4 2.5M5.5 15.5l4-2.5M14.5 11l4-2.5M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  server: "M4 5h16v6H4zM4 13h16v6H4zM8 8h.01M8 16h.01",
  gauge: "M12 14l4-4M4.5 18a9 9 0 1 1 15 0",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  dns: "M4 6h16M4 12h16M4 18h10M18 16v4M16 18h4",
  lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  plug: "M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0V8ZM12 16v5",
  monitor: "M3 5h18v11H3zM8 20h8M12 16v4",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z",
  cpu: "M7 7h10v10H7zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4",
  windows: "M3 5.5 10.5 4.5v7H3zM12 4.3 21 3v8.5h-9zM3 12.5h7.5v7L3 18.5zM12 12.5h9V21l-9-1.3z",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  play: "M8 5v14l11-7L8 5Z",
  pause: "M8 5h3v14H8zM13 5h3v14h-3z",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 8v5m0-8h.01",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  book: "M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4V4Zm0 12a4 4 0 0 1 4-4h10",
  sparkle: "M12 3c.4 4.6 3.4 7.6 8 8-4.6.4-7.6 3.4-8 8-.4-4.6-3.4-7.6-8-8 4.6-.4 7.6-3.4 8-8Z",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2",
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.6,
  className = "",
  ...rest
}: { name: IconName; size?: number; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  const filled = name === "play" || name === "pause" || name === "windows";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path d={paths[name]} />
    </svg>
  );
}
