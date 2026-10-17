"use client";

import { useEffect, useRef, useState } from "react";

export function TypewriterHeader({
  text,
  speedMs = 22,
  startDelayMs = 120,
  trigger = "visible",
  className = "",
  showCursor = true,
}: {
  text: string;
  speedMs?: number;
  startDelayMs?: number;
  trigger?: "mount" | "visible";
  className?: string;
  showCursor?: boolean;
}) {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const [count, setCount] = useState<number>(text.length);
  const [typingDone, setTypingDone] = useState<boolean>(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      return;
    }

    let timerId: ReturnType<typeof setTimeout> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let started = false;

    const startTyping = () => {
      if (started) return;
      started = true;
      setCount(0);
      setTypingDone(false);

      const step = Math.max(1, Math.ceil(text.length / 85));
      timerId = setTimeout(() => {
        let current = 0;
        intervalId = setInterval(() => {
          current = Math.min(text.length, current + step);
          setCount(current);
          if (current >= text.length) {
            if (intervalId) clearInterval(intervalId);
            setTypingDone(true);
          }
        }, speedMs);
      }, startDelayMs);
    };

    if (trigger === "mount") {
      startTyping();
      return () => {
        if (timerId) clearTimeout(timerId);
        if (intervalId) clearInterval(intervalId);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startTyping();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (timerId) clearTimeout(timerId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text, speedMs, startDelayMs, trigger]);

  const visibleSlice = text.slice(0, count);
  const hiddenSlice = text.slice(count);

  return (
    <span
      ref={containerRef}
      className={`typed-container ${className}`.trim()}
      aria-label={text}
    >
      <span className="typed-text" aria-hidden="true">
        {visibleSlice}
      </span>
      {showCursor && (
        <span
          className={`cursor ${typingDone ? "blink" : "is-typing"}`}
          aria-hidden="true"
        />
      )}
      {hiddenSlice && (
        <span className="typed-ghost" aria-hidden="true">
          {hiddenSlice}
        </span>
      )}
    </span>
  );
}

// Backward compatibility alias
export { TypewriterHeader as AntigravityTypewriter };
