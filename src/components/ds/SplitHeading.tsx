import { createElement, Fragment, type CSSProperties } from "react";

/**
 * Headline whose words rise into place one after another on first paint.
 * Pure CSS animation (no JS) — server-renderable, LCP-safe, and the full
 * text stays in the DOM for SEO / screen readers.
 */
export function SplitHeading({
  text,
  as = "h1",
  className = "",
  delay = 0,
}: {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  delay?: number;
}) {
  const words = text.split(/\s+/).filter(Boolean);
  return createElement(
    as,
    { className, style: { "--split-delay": `${delay}ms` } as CSSProperties },
    words.map((word, i) => (
      <Fragment key={`${word}-${i}`}>
        <span className="ds-split-word">
          <span style={{ "--i": i } as CSSProperties}>{word}</span>
        </span>
        {i < words.length - 1 ? " " : null}
      </Fragment>
    ))
  );
}
