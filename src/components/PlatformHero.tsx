import { uiText } from "@/i18n/ui";
import Link from "next/link";
import { AntigravityParticles } from "./AntigravityParticles";
import { ProductPreview } from "./ProductPreview";
import { SurfaceShowcase } from "./SurfaceShowcase";
import { LiveIp } from "./LiveIp";
import type { Locale } from "@/i18n/config";
import { toolPath } from "@/lib/tool-routes";
import { scannerApplication, platformCopy } from "@/content/applications";

export function PlatformHero({ locale, ipLabel }: { locale: Locale; ipLabel: string }) {
  const copy = platformCopy[locale];
  return (
    <>
      <section className="agy-hero">
        <AntigravityParticles density={120} />
        <div className="agy-hero__content">
          <Link href={`/${locale}/applications/scanner`} className="agy-announcement-pill">
            <span className="agy-announcement-pill__dot" aria-hidden="true" />
            <span>IPscans+ v{scannerApplication.version}</span>
            <span className="agy-announcement-pill__sep" aria-hidden="true">·</span>
            <span className="agy-announcement-pill__cta">{copy.details} →</span>
          </Link>

          <h1 className="agy-hero__title">
            {uiText(locale, "Every connection.", "Her bağlantı.")}{" "}
            <span className="agy-hero__title-muted">
              {uiText(locale, "In focus.", "Net bir bakış.")}
            </span>
            <span className="agy-blinking-cursor" aria-hidden="true">|</span>
          </h1>

          <p className="agy-hero__lead">
            {uiText(
              locale,
              "Discover your network. Understand your devices. See connections with their evidence. Focused network tools for desktop and web.",
              "Ağınızı keşfedin. Cihazları tanıyın. Bağlantıları kanıtlarıyla görün. Masaüstü ve web için sade, güçlü ağ araçları."
            )}
          </p>

          <div className="agy-hero__cta">
            <a href={scannerApplication.downloadUrl} className="btn-primary agy-btn-lg">
              <span>{copy.downloadApp} IPscans+</span>
              <span aria-hidden="true">↓</span>
            </a>
            <Link href={`/${locale}/download`} className="btn-ghost agy-btn-lg">
              <span>{copy.explore}</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="agy-hero__telemetry">
            <LiveIp label={ipLabel} />
            <Link href={toolPath("speedTest", locale)} className="agy-telemetry-link">
              {uiText(locale, "Measure your connection", "Bağlantını ölç")}{" "}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {/* Antigravity .landing-video-section 36px rounded showcase frame */}
        <div className="agy-video-section">
          <div className="agy-video-wrapper">
            <ProductPreview locale={locale} />
          </div>
        </div>
      </section>

      <SurfaceShowcase locale={locale} />
    </>
  );
}
