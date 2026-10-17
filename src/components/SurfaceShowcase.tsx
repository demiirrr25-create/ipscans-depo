"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { uiText } from "@/i18n/ui";
import { applications, platformCopy, scannerApplication } from "@/content/applications";
import { lprRelease } from "@/content/lpr-release";
import { toolPath } from "@/lib/tool-routes";
import { MorphingSolutionParticles } from "./AntigravityParticles";

const BOUNCER_ICONS = [
  "code_blocks",
  "device_hub",
  "check_circle",
  "file_copy",
  "spark",
  "dashboard_customize",
  "keyboard_tab",
  "refresh",
  "developer_mode_tv",
  "keyboard_return",
  "commit",
  "folder",
  "search_spark",
  "code",
  "data_object",
  "merge",
  "deployed_code",
  "spark",
  "plus_code",
  "terminal",
  "keyboard_command_key",
  "pen_spark",
] as const;

export function SurfaceShowcase({ locale }: { locale: Locale }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [hoverSolution, setHoverSolution] = useState<number | null>(null);
  const copy = platformCopy[locale];
  const ipcast = applications.find((a) => a.id === "ipcast")!;

  const agentFirstStatement = uiText(
    locale,
    "IPScans is our network intelligence platform, allowing anyone to discover, verify, and diagnose every connection.",
    "IPScans, herkesin ağındaki her bağlantıyı keşfetmesini, doğrulamasını ve tanılamasını sağlayan yeni nesil ağ platformumuzdur."
  );

  const featureItems = [
    {
      id: "scanner",
      title: `IPscans+ v${scannerApplication.version}`,
      description: scannerApplication.description[locale],
      href: `/${locale}/applications/scanner`,
      image: "/scanner-v43-preview.png",
      tag: "WINDOWS 10/11 · x64 · ARP · ICMP · ONVIF",
    },
    {
      id: "ipcast",
      title: `IPCast v${ipcast.version}`,
      description: ipcast.description[locale],
      href: `/${locale}/applications/ipcast`,
      image: "/scanner-v43-map.png",
      tag: `${ipcast.platform} · REMOTE DESKTOP`,
    },
    {
      id: "lpr",
      title: `LPR Pro v${lprRelease.version}`,
      description: uiText(
        locale,
        "Local plate recognition, RTSP stream inspection, and timestamped record review on Windows.",
        "Windows üzerinde yerel plaka tanıma, RTSP yayın incelemesi ve zaman damgalı kayıt geçmişi."
      ),
      href: `/${locale}/lpr-pro`,
      image: "/scanner-v43-preview.png",
      tag: "WINDOWS 10/11 · x64 · LOCAL AI",
    },
    {
      id: "web-tools",
      title: uiText(locale, "Browser Diagnostics", "Tarayıcı Tanı Araçları"),
      description: uiText(
        locale,
        "Instant IP intelligence, ASN & WHOIS lookup, DNS records, port reference, and real-time speed telemetry directly in your browser.",
        "Tarayıcınızdan anında IP sorgulama, ASN ve WHOIS analizi, DNS kayıtları, port referansı ve gerçek zamanlı hız testi."
      ),
      href: toolPath("ipLookup", locale),
      image: "/scanner-v43-map.png",
      tag: "WEB · ZERO INSTALL · INSTANT",
    },
  ];

  const useCases = [
    {
      title: uiText(locale, "Network administrators", "Ağ yöneticileri"),
      description: uiText(
        locale,
        "Discover every active device on your subnet, inspect ARP & port evidence, and verify ONVIF cameras with confidence.",
        "Alt ağınızdaki tüm aktif cihazları keşfedin, ARP ve port kanıtlarını inceleyin ve ONVIF kameraları güvenle doğrulayın."
      ),
      href: `/${locale}/ip-scanner`,
      image: "/scanner-v43-preview.png",
      cta: copy.details,
    },
    {
      title: uiText(locale, "IT support & remote teams", "BT destek ve uzak ekipler"),
      description: uiText(
        locale,
        "Connect across local networks or over the internet with explicit session approval and zero router configuration.",
        "Açık oturum onayı ve sıfır modem/port yönlendirme kurulumuyla yerel ağda veya internet üzerinden bağlanın."
      ),
      href: `/${locale}/applications/ipcast`,
      image: "/scanner-v43-map.png",
      cta: copy.details,
    },
    {
      title: uiText(locale, "Security & operations", "Güvenlik ve operasyon"),
      description: uiText(
        locale,
        "Verify public IP exposure, DNS propagation, and local camera plate logs without sending sensitive video streams to the cloud.",
        "Hassas kamera yayınlarını buluta göndermeden genel IP görünürlüğünü, DNS yayılımını ve yerel plaka kayıtlarını doğrulayın."
      ),
      href: `/${locale}/lpr-pro`,
      image: "/scanner-v43-preview.png",
      cta: copy.details,
    },
  ];

  return (
    <>
      {/* Section 4: Antigravity .agent-first-section with 22 bouncing circle icons */}
      <section className="agent-first-section" data-agent-first-section>
        <ul className="icon-list" data-bouncer-list aria-hidden="true">
          {BOUNCER_ICONS.map((iconId, idx) => (
            <li key={`${iconId}-${idx}`} className="grid-col" data-bouncer>
              <div
                className="bouncer"
                translate="no"
                style={{ animationDelay: `${idx * -0.14}s` }}
              >
                <svg
                  viewBox="0 0 960 960"
                  width="1em"
                  height="1em"
                  fill="currentColor"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <use href={`/assets/image/icons/sprite-icons.svg#${iconId}`} />
                </svg>
              </div>
            </li>
          ))}
        </ul>

        <div className="grid-container text-container" data-text-container>
          <div className="grid-row">
            <div className="grid-col col-xs-4 col-sm-8 col-md-9">
              <span className="typed-container heading-3 agent-first-text" data-typed-header>
                <span className="visually-hidden">{agentFirstStatement}</span>
                <span className="typed-content" aria-hidden="true">
                  {agentFirstStatement}
                </span>
                <span className="cursor-container" data-cursor-container>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="blinking-cursor"
                    src="/assets/image/antigravity-cursor.png"
                    alt=""
                    aria-hidden="true"
                  />
                </span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Antigravity .feature-explorer-section */}
      <section className="feature-explorer-section" data-feature-explorer-section>
        <div className="grid-container">
          <div className="feature-list">
            {featureItems.map((item, idx) => (
              <div key={item.id} className="feature-item" data-feature-item>
                <div className="grid-row">
                  <div className="grid-col col-xs-4 col-md-4">
                    <div className="feature-copy">
                      <Link
                        className="heading-4 feature-title feature-title-link"
                        href={item.href}
                      >
                        {item.title}
                      </Link>
                      <p className="body feature-description">{item.description}</p>
                    </div>
                    {idx === featureItems.length - 1 && (
                      <div className="feature-cta-wrap">
                        <Link
                          href={`/${locale}/download`}
                          className="call-to-action button button-secondary"
                        >
                          <span>{copy.explore}</span>
                        </Link>
                      </div>
                    )}
                  </div>
                  <div className="grid-col col-xs-4 col-md-offset-2 col-md-6">
                    <Link href={item.href} className="feature-media group">
                      <div className="feature-media-card">
                        <div className="feature-media-card__bar">
                          <span className="feature-media-card__dots" aria-hidden="true">
                            <i />
                            <i />
                            <i />
                          </span>
                          <span className="feature-media-card__tag">{item.tag}</span>
                        </div>
                        <Image
                          className="feature-image"
                          src={item.image}
                          alt={item.title}
                          width={736}
                          height={750}
                        />
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6: Antigravity .landing-use-case-section */}
      <section className="landing-use-case-section" data-use-case-section>
        <div className="grid-container landing-use-case-header">
          <div className="grid-row">
            <div className="grid-col col-sm-6 col-md-6">
              <div className="use-case-header-main">
                <h2 className="heading-4">
                  <span>
                    {uiText(locale, "Built for professionals", "Profesyoneller için üretildi")}
                  </span>
                  <span>
                    {uiText(locale, "for the network-first era", "yeni nesil ağ dünyası için")}
                  </span>
                </h2>
              </div>
            </div>
            <div className="grid-col col-md-4 col-md-offset-8">
              <p className="body">{copy.applicationsIntro}</p>
            </div>
          </div>
        </div>

        <div className="landing-use-case-list">
          <div className="grid-container">
            <div className="grid-row">
              <div className="grid-col col-xs-4 col-sm-8 col-md-8">
                <div
                  className="slider-container usecases-slider"
                  data-slider
                  data-active-index={activeSlide}
                >
                  <div
                    className="slider-track"
                    style={{
                      transform: `translate3d(calc(${activeSlide} * -100% - ${activeSlide * 24}px), 0, 0)`,
                    }}
                  >
                    {useCases.map((uc, index) => (
                      <Link
                        key={uc.title}
                        href={uc.href}
                        className={`slide-image ${index === activeSlide ? "is-active" : ""}`}
                        onClick={(e) => {
                          if (index !== activeSlide) {
                            e.preventDefault();
                            setActiveSlide(index);
                          }
                        }}
                      >
                        <div className="slide-image-wrapper">
                          <Image
                            className="list-image"
                            src={uc.image}
                            alt={uc.title}
                            width={848}
                            height={488}
                          />
                        </div>
                        <div className="slide-image-overlay">
                          <span className="typed-container heading-4">
                            <span className="typed-content">{uc.title}</span>
                            <span className="cursor-container">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                className="blinking-cursor"
                                src="/assets/image/antigravity-cursor.png"
                                alt=""
                                aria-hidden="true"
                              />
                            </span>
                          </span>
                          <div className="video-control-button" translate="no">
                            <svg
                              viewBox="0 -960 960 960"
                              width="28px"
                              height="28px"
                              fill="currentColor"
                              aria-hidden="true"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M647-440H160v-80h487L423-744l57-56 320 320-320 320-57-56 224-224Z" />
                            </svg>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="slider-copy-wrapper" data-copy-wrapper>
                  {useCases.map((uc, index) => (
                    <div
                      key={uc.title}
                      className={`slider-copy ${index === activeSlide ? "is-active" : ""}`}
                    >
                      <strong className="call-to-action">{uc.title}</strong>
                      <p className="body">{uc.description}</p>
                      <Link className="call-to-action arrow-link" href={uc.href}>
                        {uc.cta}
                      </Link>
                    </div>
                  ))}

                  <div className="slider-controls-container" data-arrow-controls-wrapper>
                    <div className="slider-controls">
                      <button
                        type="button"
                        className="slider-control-button"
                        disabled={activeSlide === 0}
                        aria-label="Previous slide"
                        onClick={() => setActiveSlide((prev) => Math.max(0, prev - 1))}
                      >
                        <svg
                          viewBox="0 -960 960 960"
                          width="24px"
                          height="24px"
                          fill="currentColor"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M400-240 160-480l240-240 56 58-142 142h486v80H314l142 142-56 58Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="slider-control-button"
                        disabled={activeSlide === useCases.length - 1}
                        aria-label="Next slide"
                        onClick={() =>
                          setActiveSlide((prev) => Math.min(useCases.length - 1, prev + 1))
                        }
                      >
                        <svg
                          viewBox="0 -960 960 960"
                          width="24px"
                          height="24px"
                          fill="currentColor"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="m560-240-56-58 142-142H160v-80h486L504-662l56-58 240 240-240 240Z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: Antigravity .try-solutions-section */}
      <section className="try-solutions-section" data-try-solutions-section>
        <div className="grid-container">
          <div className="grid-row">
            <div className="grid-col col-md-12">
              <div className="section-wrapper">
                <div
                  className="solution-section"
                  data-solution-section
                  data-index="0"
                  onMouseEnter={() => setHoverSolution(0)}
                  onMouseLeave={() => setHoverSolution(null)}
                >
                  <div className="try-solution-background left">
                    <MorphingSolutionParticles
                      shape="individual"
                      hovered={hoverSolution === 0}
                    />
                  </div>
                  <div className="try-solutions-content" data-hover-trigger>
                    <p className="try-solution-label small">
                      {uiText(locale, "Available at no charge", "Ücretsiz indirilebilir")}
                    </p>
                    <p className="heading-4 header">
                      {uiText(locale, "For individuals", "Bireysel kullanım için")}
                    </p>
                    <p className="heading-4 subhead">
                      {uiText(locale, "Achieve full visibility", "Tam görünürlük elde edin")}
                    </p>
                    <div className="grid-row solutions-cta">
                      <div className="grid-col">
                        <a
                          href={scannerApplication.downloadUrl}
                          className="call-to-action button button-primary"
                        >
                          <span>{copy.downloadApp}</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="solution-section"
                  data-solution-section
                  data-index="1"
                  onMouseEnter={() => setHoverSolution(1)}
                  onMouseLeave={() => setHoverSolution(null)}
                >
                  <div className="try-solution-background right">
                    <MorphingSolutionParticles
                      shape="cube"
                      hovered={hoverSolution === 1}
                    />
                  </div>
                  <div className="try-solutions-content" data-hover-trigger>
                    <p className="try-solution-label small">
                      {uiText(locale, "Now Available!", "Şimdi Kullanımda!")}
                    </p>
                    <p className="heading-4 header">
                      {uiText(locale, "For teams & IT", "Ekipler ve BT için")}
                    </p>
                    <p className="heading-4 subhead">
                      {uiText(locale, "Level up your network ops", "Ağ operasyonlarınızı güçlendirin")}
                    </p>
                    <div className="grid-row solutions-cta">
                      <div className="grid-col">
                        <Link
                          href={`/${locale}/download`}
                          className="call-to-action button button-secondary"
                        >
                          <span>{copy.details}</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
