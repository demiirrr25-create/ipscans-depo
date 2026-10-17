import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PlatformHero } from "@/components/PlatformHero";
import { BlogSection } from "@/components/BlogSection";
import { SpatialParticles } from "@/components/SpatialParticles";
import { TypewriterHeader } from "@/components/TypewriterHeader";
import { notFound } from "next/navigation";
import { platformCopy, scannerApplication } from "@/content/applications";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const platform = platformCopy[locale];

  return (
    <div className="main">
      <PlatformHero locale={locale} ipLabel={dict.hero.yourIp} />

      <BlogSection locale={locale} />

      {/* Download Action Section */}
      <section
        className="download-section-container download-section-container--mobile-desktop-only"
        id="download-section"
        data-download-section
      >
        <div className="grid-container">
          <div className="grid-row">
            <div className="grid-col col-md-12">
              <div className="download-section" data-section-element>
                <div className="download-section-backdrop">
                  <SpatialParticles variant="download" />
                </div>
                <div className="download-section-content">
                  <div className="header heading-3" data-typed-header>
                    <TypewriterHeader
                      text={dict.cta.title}
                      trigger="visible"
                      speedMs={20}
                      startDelayMs={80}
                    />
                  </div>
                  <div className="download-section-cta" data-cta-container>
                    <a
                      href={scannerApplication.downloadUrl}
                      className="call-to-action button button-primary-inverse"
                    >
                      <span>{platform.downloadApp} Windows (x64)</span>
                    </a>
                    <Link
                      href={`/${locale}/download`}
                      className="call-to-action button button-secondary-inverse"
                    >
                      <span>{dict.cta.button}</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
