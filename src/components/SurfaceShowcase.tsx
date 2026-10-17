"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { uiText } from "@/i18n/ui";
import { applications, platformCopy, scannerApplication } from "@/content/applications";
import { lprRelease } from "@/content/lpr-release";
import { toolPath } from "@/lib/tool-routes";

export function SurfaceShowcase({ locale }: { locale: Locale }) {
  const [active, setActive] = useState(0);
  const copy = platformCopy[locale];
  const ipcast = applications.find((a) => a.id === "ipcast")!;

  const surfaces = [
    {
      id: "scanner",
      badge: `IPscans+ v${scannerApplication.version}`,
      title: uiText(locale, "Local network discovery & live topology", "Yerel ağ keşfi ve canlı topoloji haritası"),
      description: scannerApplication.description[locale],
      href: `/${locale}/applications/scanner`,
      downloadUrl: scannerApplication.downloadUrl,
      image: "/scanner-v43-preview.png",
      meta: "Windows 10/11 · x64 · Verified SHA-256",
    },
    {
      id: "map",
      badge: "Network Map · ONVIF",
      title: uiText(locale, "Visual evidence & verified camera inspection", "Görsel kanıtlar ve doğrulanmış kamera incelemesi"),
      description: uiText(
        locale,
        "Inspect device roles, latency paths, port evidence and verified-HTTPS ONVIF profiles in one unified view.",
        "Cihaz rollerini, gecikme yollarını, port kanıtlarını ve doğrulanmış HTTPS ONVIF profillerini tek ekranda inceleyin."
      ),
      href: `/${locale}/ip-scanner`,
      downloadUrl: scannerApplication.downloadUrl,
      image: "/scanner-v43-map.png",
      meta: "ARP · ICMP · mDNS · SSDP · ONVIF",
    },
    {
      id: "ipcast",
      badge: `IPCast v${ipcast.version}`,
      title: uiText(locale, "Zero-config remote desktop with access approval", "Erişim onaylı, kurulumsuz uzak masaüstü"),
      description: ipcast.description[locale],
      href: `/${locale}/applications/ipcast`,
      downloadUrl: ipcast.downloadUrl,
      image: "/scanner-v43-preview.png",
      meta: `${ipcast.platform} · Direct + Relay`,
    },
    {
      id: "lpr",
      badge: `LPR Pro v${lprRelease.version}`,
      title: uiText(locale, "Local license plate recognition & record review", "Yerel plaka tanıma ve kayıt inceleme"),
      description: uiText(
        locale,
        "On-device plate detection, RTSP stream inspection and timestamped event logs on Windows.",
        "Cihaz üzerinde plaka tespiti, RTSP yayın incelemesi ve zaman damgalı kayıt geçmişi."
      ),
      href: `/${locale}/lpr-pro`,
      downloadUrl: lprRelease.url,
      image: "/scanner-v43-map.png",
      meta: "Windows 10/11 · x64 · Offline AI",
    },
  ];

  const bouncers = [
    { label: "IP", href: toolPath("ipLookup", locale), symbol: "⌖" },
    { label: "SPEED", href: toolPath("speedTest", locale), symbol: "⚡" },
    { label: "DNS", href: toolPath("dns", locale), symbol: "◈" },
    { label: "WHOIS", href: toolPath("whois", locale), symbol: "◎" },
    { label: "PORTS", href: toolPath("ports", locale), symbol: "⌁" },
    { label: "SCAN+", href: `/${locale}/ip-scanner`, symbol: "⊞" },
    { label: "IPCAST", href: `/${locale}/applications/ipcast`, symbol: "↗" },
    { label: "LPR", href: `/${locale}/lpr-pro`, symbol: "▣" },
  ];

  const current = surfaces[active] ?? surfaces[0];

  return (
    <>
      {/* Antigravity .agent-first-section with .icon-list .bouncer circles */}
      <section className="agy-agent-first-section">
        <ul className="agy-bouncer-list" aria-label={copy.applications}>
          {bouncers.map((item, idx) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="agy-bouncer"
                style={{ animationDelay: `${idx * 0.18}s` }}
                title={item.label}
              >
                <span aria-hidden="true" className="agy-bouncer__symbol">{item.symbol}</span>
                <span className="agy-bouncer__label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="agy-agent-first-text">
          <h2>
            {uiText(
              locale,
              "The network-first platform that turns raw packets into verifiable evidence.",
              "Ham ağ trafiğini doğrulanabilir kanıtlara dönüştüren yeni nesil ağ platformu."
            )}
          </h2>
          <p>
            {uiText(
              locale,
              "Work seamlessly across browser diagnostics, desktop LAN discovery, remote desktop sessions, and local camera intelligence.",
              "Tarayıcı tabanlı tanı araçları, masaüstü yerel ağ keşfi, uzak masaüstü bağlantıları ve yerel kamera analizi arasında kesintisiz çalışın."
            )}
          </p>
        </div>
      </section>

      {/* Antigravity .landing-use-case-section interactive surface switcher */}
      <section className="agy-use-case-section" aria-labelledby="surfaces-heading">
        <div className="agy-container">
          <div className="agy-use-case-header">
            <p className="agy-eyebrow">01 / {copy.applications}</p>
            <h2 id="surfaces-heading">
              {uiText(locale, "Choose your surface.", "Çalışma yüzeyinizi seçin.")}
            </h2>
            <p className="agy-use-case-sub">{copy.applicationsIntro}</p>
          </div>

          <div className="agy-use-case-grid">
            <div className="agy-use-case-tabs" role="tablist" aria-label={copy.applications}>
              {surfaces.map((surface, index) => {
                const isSelected = index === active;
                return (
                  <button
                    key={surface.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActive(index)}
                    className={`agy-use-case-tab ${isSelected ? "is-active" : ""}`}
                  >
                    <span className="agy-use-case-tab__badge">{surface.badge}</span>
                    <span className="agy-use-case-tab__title">{surface.title}</span>
                    <span className="agy-use-case-tab__desc">{surface.description}</span>
                  </button>
                );
              })}
            </div>

            <div className="agy-slide-wrapper" role="tabpanel">
              <div className="agy-slide-topbar">
                <span className="agy-slide-badge">{current.badge}</span>
                <span className="agy-slide-meta">{current.meta}</span>
              </div>
              <div className="agy-slide-media">
                <Image
                  src={current.image}
                  width={1440}
                  height={900}
                  sizes="(max-width: 1024px) 100vw, 848px"
                  alt={current.title}
                  className="h-auto w-full object-cover"
                />
              </div>
              <div className="agy-slide-footer">
                <Link href={current.href} className="btn-ghost">
                  {copy.details} <span aria-hidden="true">→</span>
                </Link>
                <a href={current.downloadUrl} className="btn-primary">
                  {copy.downloadApp} <span aria-hidden="true">↓</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
