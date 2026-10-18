"use client";

import { useEffect, useRef } from "react";

/**
 * Fixed top reading progress indicator for long-form articles.
 * Uses GPU-only `transform: scaleX()` driven by passive scroll events.
 */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    let rafId = 0;
    const update = () => {
      rafId = 0;
      const target = document.getElementById(targetId);
      if (!target) {
        bar.style.transform = "scaleX(0)";
        return;
      }
      const rect = target.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const total = Math.max(1, rect.height - viewportH * 0.45);
      const scrolled = Math.max(0, -rect.top + viewportH * 0.2);
      const ratio = Math.min(1, Math.max(0, scrolled / total));
      bar.style.transform = `scaleX(${ratio.toFixed(4)})`;
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [targetId]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden bg-transparent"
    >
      <div
        ref={barRef}
        className="h-full w-full origin-left bg-[image:var(--signal-gradient)] transition-transform duration-150 ease-out rtl:origin-right"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
