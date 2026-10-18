"use client";

import { createElement, useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  as?: keyof HTMLElementTagNameMap;
  className?: string;
  /** Delay in ms before the element animates in once visible. */
  delay?: number;
  /** "up" = fade + rise (default), "scale" = fade + subtle scale. */
  variant?: "up" | "scale";
  id?: string;
  style?: CSSProperties;
};

/**
 * Reveals its children with a GPU-friendly opacity/transform transition the
 * first time they scroll into view. One shared IntersectionObserver serves
 * every instance on the page. Respects prefers-reduced-motion via CSS.
 */
let sharedObserver: IntersectionObserver | null = null;
function getObserver() {
  if (sharedObserver || typeof window === "undefined") return sharedObserver;
  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).dataset.revealed = "true";
          sharedObserver?.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  return sharedObserver;
}

export function Reveal({ children, as = "div", className = "", delay = 0, variant = "up", id, style }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = getObserver();
    if (!observer) {
      el.dataset.revealed = "true";
      return;
    }
    observer.observe(el);
    return () => observer.unobserve(el);
  }, []);

  return createElement(
    as,
    {
      ref,
      id,
      className: `${variant === "scale" ? "ds-reveal-scale" : "ds-reveal"} ${className}`.trim(),
      style: { ...style, "--reveal-delay": `${delay}ms` } as CSSProperties,
    },
    children
  );
}
