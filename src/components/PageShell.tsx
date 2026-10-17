import type { ReactNode } from "react";
import { AntigravityParticles } from "./AntigravityParticles";
import { AntigravityTypewriter } from "./AntigravityTypewriter";

export function PageShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="agy-page-shell">
      <section className="agy-page-hero">
        <AntigravityParticles variant="subpage" className="agy-page-hero__particles" />
        <div className="grid-container agy-page-hero__inner">
          <div className="grid-row">
            <div className="grid-col col-xs-4 col-sm-8 col-md-10">
              {eyebrow && (
                <p className="agy-page-hero__eyebrow">
                  <span className="agy-page-hero__dot" aria-hidden="true" />
                  <span>{eyebrow}</span>
                </p>
              )}
              <h1 className="heading-2 agy-page-hero__title">
                <AntigravityTypewriter text={title} trigger="mount" speedMs={18} startDelayMs={60} />
              </h1>
              {subtitle && (
                <p className="body-large agy-page-hero__subtitle">{subtitle}</p>
              )}
            </div>
          </div>
        </div>
      </section>
      <div className="grid-container agy-page-body">{children}</div>
    </div>
  );
}
