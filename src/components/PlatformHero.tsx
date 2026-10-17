import { uiText } from "@/i18n/ui";
import Link from "next/link";
import { AntigravityParticles } from "./AntigravityParticles";
import { AntigravityTypewriter } from "./AntigravityTypewriter";
import { SurfaceShowcase } from "./SurfaceShowcase";
import { LiveIp } from "./LiveIp";
import { Logo } from "./Logo";
import type { Locale } from "@/i18n/config";
import { scannerApplication, platformCopy } from "@/content/applications";

export function PlatformHero({ locale, ipLabel }: { locale: Locale; ipLabel: string }) {
  const copy = platformCopy[locale];
  const heroTitle = uiText(
    locale,
    "Experience liftoff with the next-gen network intelligence platform",
    "Yeni nesil ağ keşif ve analiz platformuyla tanışın"
  );

  return (
    <>
      <section className="welcome-wrapper" data-welcome-section>
        <div className="hero-video-wrapper">
          <div className="hero-video-container" data-hero-particles>
            <AntigravityParticles variant="hero" />
          </div>
        </div>

        <div className="welcome-section" data-welcome-content>
          <div className="logo-container" data-logo>
            <span className="welcome-logo-lockup">
              <Logo size={30} />
              <span className="welcome-logo-wordmark">IPScans</span>
            </span>
          </div>

          <div className="header-container">
            <h1 className="landing-main-header">
              <AntigravityTypewriter
                text={heroTitle}
                trigger="mount"
                speedMs={24}
                startDelayMs={140}
                className="landing-main"
              />
            </h1>
          </div>

          <div className="grid-row welcome-cta" data-cta>
            <a
              href={scannerApplication.downloadUrl}
              className="call-to-action button button-primary"
            >
              <svg
                className="download-icon"
                viewBox="0 -960 960 960"
                width="20px"
                height="20px"
                fill="currentColor"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M480-336 288-528l51-51 105 105v-342h72v342l105-105 51 51-192 192ZM263.72-192Q234-192 213-213.15T192-264v-72h72v72h432v-72h72v72q0 29.7-21.16 50.85Q725.68-192 695.96-192H263.72Z" />
              </svg>
              <span>{copy.downloadApp} Windows</span>
            </a>
            <Link
              href={`/${locale}/download`}
              className="call-to-action button button-secondary"
            >
              <span>{copy.explore}</span>
            </Link>
          </div>

          <div className="welcome-ip-row">
            <LiveIp label={ipLabel} />
          </div>
        </div>
      </section>

      <SurfaceShowcase locale={locale} />
    </>
  );
}
