"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { uiText } from "@/i18n/ui";
import { applications, platformCopy, scannerApplication } from "@/content/applications";
import { lprRelease } from "@/content/lpr-release";
import { toolPath } from "@/lib/tool-routes";
import { MorphingSolutionParticles } from "./SpatialParticles";
import { TypewriterHeader } from "./TypewriterHeader";



export function SurfaceShowcase({ locale }: { locale: Locale }) {
  const [hoverSolution, setHoverSolution] = useState<number | null>(null);
  const copy = platformCopy[locale];
  const ipcast = applications.find((a) => a.id === "ipcast")!;

  const agentFirstStatement = uiText(
    locale,
    "IPScans is our network intelligence platform, allowing anyone to discover, verify, and diagnose every connection.",
    "IPScans, ağınızdaki her bağlantıyı keşfetmenizi, doğrulamanızı ve analiz etmenizi sağlayan profesyonel ağ platformudur."
  );

  const featureItems = [
    {
      id: "scanner",
      title: "IPscans+",
      description: scannerApplication.description[locale],
      href: `/${locale}/applications/scanner`,
      downloadHref: scannerApplication.downloadUrl,
      image: "/scanner-v43-preview.png",
      tag: "WINDOWS · x64 · ARP · ICMP · ONVIF · LLDP",
      badge: uiText(locale, "Network Discovery & Scanner", "Ağ Keşfi ve Cihaz Analizi"),
    },
    {
      id: "ipcast",
      title: "IPCast",
      description: ipcast.description[locale],
      href: `/${locale}/applications/ipcast`,
      downloadHref: ipcast.downloadUrl,
      image: "/ipcast-v25-preview.png",
      tag: `${ipcast.platform} · NATIVE WIN64 · VERIFIED`,
      badge: uiText(locale, "Remote Desktop & File Transfer", "Uzak Masaüstü ve Dosya Aktarımı"),
    },
    {
      id: "lpr",
      title: "IPScans LPR Pro",
      description: uiText(
        locale,
        "5-page live operator workspace, independent trigger/recognition lines, resident vehicle registry, and local ONNX plate recognition on Windows.",
        "Windows üzerinde 5 bölmeli canlı operatör çalışma alanı, bağımsız kalibrasyon çizgileri, blok/daire araç kütüğü ve yerel ONNX plaka tanıma."
      ),
      href: `/${locale}/lpr-pro`,
      downloadHref: lprRelease.url,
      image: "/lpr-pro-preview.png",
      tag: "WINDOWS · x64 · LIVE OPERATOR WORKSPACE",
      badge: uiText(locale, "License Plate Recognition Suite", "Plaka Tanıma ve Operatör Paketi"),
    },
    {
      id: "web-tools",
      title: uiText(locale, "Browser Diagnostics", "Tarayıcı Tanı Araçları"),
      description: uiText(
        locale,
        "Instant IP intelligence, ASN & WHOIS lookup, DNS records, port reference, and real-time speed telemetry directly in your browser.",
        "Tarayıcınızdan anında IP sorgulama, ASN ve WHOIS analizi, DNS kayıtları, port referansı ve gerçek zamanlı hız testi."
      ),
      href: toolPath("speedTest", locale),
      downloadHref: null,
      image: "/web-tools-preview.png",
      tag: "WEB · ZERO INSTALL · HIGH SPEED EDGE",
      badge: uiText(locale, "IP · Speed Test · DNS · WHOIS · Ports", "IP · Hız Testi · DNS · WHOIS · Portlar"),
    },
  ];

  return (
    <>
      {/* Section 4: IPScans Mission Statement */}
      <section className="agent-first-section" data-agent-first-section>
        <div className="grid-container text-container" data-text-container>
          <div className="grid-row">
            <div className="grid-col col-xs-4 col-sm-8 col-md-10">
              <div className="heading-3 agent-first-text" data-typed-header>
                <TypewriterHeader
                  text={agentFirstStatement}
                  trigger="visible"
                  speedMs={16}
                  startDelayMs={80}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: IPScans .feature-explorer-section with authentic application screenshots */}
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
                        <TypewriterHeader
                          text={item.title}
                          trigger="visible"
                          speedMs={24}
                          startDelayMs={60}
                        />
                      </Link>
                      <p className="body feature-description">{item.description}</p>
                      <div className="feature-item-actions">
                        <Link
                          href={item.href}
                          className="call-to-action button button-compact button-secondary"
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
                        {item.downloadHref && (
                          <a
                            href={item.downloadHref}
                            className="call-to-action button button-compact button-primary"
                          >
                            <span>{copy.downloadApp} EXE ↓</span>
                          </a>
                        )}
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
                          <span className="feature-media-card__dots" aria-hidden="true">
                            <i />
                            <i />
                            <i />
                          </span>
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

      {/* Section 6: IPScans .try-solutions-section */}
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
