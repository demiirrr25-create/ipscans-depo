import { AntigravityParticles } from "./AntigravityParticles";

export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="agy-page-shell">
      <section className="agy-page-hero">
        <AntigravityParticles variant="subpage" className="agy-page-hero__particles" />
        <div className="grid-container agy-page-hero__inner">
          <div className="grid-row">
            <div className="grid-col col-xs-4 col-sm-8 col-md-10">
              <div className="agy-page-hero__eyebrow">
                <span className="agy-page-hero__dot" aria-hidden="true" />
                <span>IPSCANS PLATFORM</span>
              </div>
              <h1 className="heading-2 agy-page-hero__title">
                <span>{title}</span>
                <span className="cursor-container" aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="blinking-cursor"
                    src="/assets/image/antigravity-cursor.png"
                    alt=""
                  />
                </span>
              </h1>
              {subtitle && (
                <p className="subhead agy-page-hero__subtitle">{subtitle}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid-container agy-page-body">{children}</div>
    </div>
  );
}
