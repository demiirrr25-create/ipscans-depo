import type { ReactNode } from "react";
import { SignalField } from "./ds/SignalField";
import { SplitHeading } from "./ds/SplitHeading";

/**
 * Standard sub-page frame: an airy hero (eyebrow, split headline, lead,
 * optional actions) over a faint signal field, followed by page content.
 *
 * `bodyClassName` lets a page opt out of the default container (e.g. when it
 * renders full-bleed sections itself) by passing "".
 */
export function PageShell({
  eyebrow,
  title,
  subtitle,
  actions,
  aside,
  children,
  bodyClassName = "ds-container pb-24 sm:pb-32",
  heroClassName = "",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  heroClassName?: string;
}) {
  return (
    <div className="relative">
      <section
        className={`relative isolate overflow-hidden pt-[calc(var(--header-h)+56px)] pb-14 sm:pt-[calc(var(--header-h)+88px)] sm:pb-20 ${heroClassName}`}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(70%_80%_at_70%_20%,#000_20%,transparent_75%)]"
        >
          <SignalField variant="ambient" />
        </div>
        <div className="ds-container">
          <div className={aside ? "grid items-end gap-12 lg:grid-cols-[1.25fr_1fr]" : ""}>
            <div className="max-w-[900px]">
              {eyebrow && <p className="ds-eyebrow mb-6 animate-fade-up">{eyebrow}</p>}
              <SplitHeading text={title} className="ds-h1 text-ink" />
              {subtitle && (
                <p
                  className="ds-lead mt-6 max-w-[680px] animate-fade-up"
                  style={{ animationDelay: "180ms" }}
                >
                  {subtitle}
                </p>
              )}
              {actions && (
                <div
                  className="mt-9 flex flex-wrap items-center gap-3 animate-fade-up"
                  style={{ animationDelay: "280ms" }}
                >
                  {actions}
                </div>
              )}
            </div>
            {aside && (
              <div className="animate-fade-up" style={{ animationDelay: "320ms" }}>
                {aside}
              </div>
            )}
          </div>
        </div>
      </section>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
