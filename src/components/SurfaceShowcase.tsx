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
      secondaryImage: "/scanner-v43-map.png",
      tag: "WINDOWS 10/11 · x64 · ARP · ICMP · ONVIF · LLDP",
      badge: uiText(locale, "Network Discovery & Topology", "Ağ Keşfi ve Topoloji Haritası"),
    },
    {
      id: "ipcast",
      title: `IPCast v${ipcast.version}`,
      description: ipcast.description[locale],
      href: `/${locale}/applications/ipcast`,
      image: "/ipcast-v25-preview.png",
      tag: `${ipcast.platform} · TLS 1.3 · SHA-256 PINNING`,
      badge: uiText(locale, "Remote Desktop & File Transfer", "Uzak Masaüstü ve Dosya Aktarımı"),
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
      image: "/lpr-pro-preview.png",
      tag: "WINDOWS 10/11 · x64 · OFFLINE ONNX INFERENCE",
      badge: uiText(locale, "Recognition Laboratory", "Plaka Tanıma Laboratuvarı"),
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
      image: "/web-tools-preview.png",
      tag: "WEB · ZERO INSTALL · CLOUDFLARE EDGE",
      badge: uiText(locale, "IP · Speed Test · DNS · WHOIS · Ports", "IP · Hız Testi · DNS · WHOIS · Portlar"),
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

      {/* Section 5: Antigravity .feature-explorer-section with authentic application screenshots */}
      <section className="feature-explorer-section" data-feature-explorer-section>
        <div className="grid-container">
          <div className="feature-list">
            {featureItems.map((item, idx) => (
              <div key={item.id} className="feature-item" data-feature-item>
                <div className="grid-row">
                  <div className="grid-col col-xs-4 col-md-4">
                    <div className="feature-copy">
                      <span className="feature-copy__eyebrow">{item.badge}</span>
                      <Link
                        className="heading-4 feature-title feature-title-link"
                        href={item.href}
                      >
                        {item.title}
                      </Link>
                      <p className="body feature-description">{item.description}</p>
                      <div className="feature-item-actions">
                        <Link
                          href={item.href}
                          className="call-to-action button button-compact"
                        >
                          <span>{copy.details}</span>
                          <svg
                            viewBox="0 -960 960 960"
                            width="16px"
                            height="16px"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path d="M647-440H160v-80h487L423-744l57-56 320 320-320 320-57-56 224-224Z" />
                          </svg>
                        </Link>
                      </div>
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
                  <div className="grid-col col-xs-4 col-md-offset-1 col-md-7">
                    <Link href={item.href} className="feature-media group">
                      <div className="feature-media-card">
                        <div className="feature-media-card__bar">
                          <span className="feature-media-card__title">{item.title}</span>
                          <span className="feature-media-card__tag">{item.tag}</span>
                        </div>
                        <div className="feature-media-card__viewport">
                          <Image
                            className="feature-image"
                            src={item.image}
                            alt={item.title}
                            width={1440}
                            height={900}
                            sizes="(max-width: 1024px) 100vw, 58vw"
                          />
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6: Antigravity .try-solutions-section */}
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
