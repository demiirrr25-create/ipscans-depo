"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/i18n/config";
import { applications, platformCopy, scannerApplication } from "@/content/applications";
import { lprRelease } from "@/content/lpr-release";
import { Icon } from "@/components/ds/Icon";
import { Reveal } from "@/components/ds/Reveal";
import { ScreenshotFrame, SectionHeader } from "@/components/ds/product";
import { homeCopy, type ProductId } from "./copy";

const CORTEX_DOWNLOAD_URL =
  "https://github.com/demiirrr25-create/ipscans-depo/releases/download/cortex-v1.0.0/IPScans-Cortex-1.0.0.exe";

type ScannerView = "discovery" | "topology";

export function ProductShowcase({ locale }: { locale: Locale }) {
  const [activeId, setActiveId] = useState<ProductId>("scanner");
  const [scannerView, setScannerView] = useState<ScannerView>("discovery");

  const copy = homeCopy[locale];
  const platform = platformCopy[locale];
  const ipcastApp = applications.find((a) => a.id === "ipcast")!;

  const products: {
    id: ProductId;
    name: string;
    icon: string;
    href: string;
    downloadUrl: string;
    category: string;
    headline: string;
    description: string;
    highlights: [string, string, string];
    screenshot: {
      src: string;
      width: number;
      height: number;
      caption: string;
    };
  }[] = [
    {
      id: "scanner",
      name: "IPscans+",
      icon: "/scanner-mark.svg",
      href: `/${locale}/applications/scanner`,
      downloadUrl: scannerApplication.downloadUrl,
      ...copy.products.scanner,
      screenshot:
        scannerView === "topology"
          ? {
              src: "/scanner-v43-map.png",
              width: 1440,
              height: 900,
              caption: copy.scannerViews.topologyCaption,
            }
          : {
              src: "/scanner-4-8-1.png",
              width: 1440,
              height: 900,
              caption: copy.scannerViews.discoveryCaption,
            },
    },
    {
      id: "ipcast",
      name: "IPCast",
      icon: "/ipcast-mark.svg",
      href: `/${locale}/applications/ipcast`,
      downloadUrl: ipcastApp.downloadUrl,
      ...copy.products.ipcast,
      screenshot: {
        src: "/ipcast-2-9-1.png",
        width: 1440,
        height: 900,
        caption: copy.products.ipcast.caption,
      },
    },
    {
      id: "lpr",
      name: "LPR Pro",
      icon: "/lpr-mark.svg",
      href: `/${locale}/lpr-pro`,
      downloadUrl: lprRelease.url,
      ...copy.products.lpr,
      screenshot: {
        src: "/lpr-dev4.png",
        width: 1440,
        height: 900,
        caption: copy.products.lpr.caption,
      },
    },
    {
      id: "cortex",
      name: "Cortex",
      icon: "/cortex-mark.svg",
      href: `/${locale}/cortex`,
      downloadUrl: CORTEX_DOWNLOAD_URL,
      ...copy.products.cortex,
      screenshot: {
        src: "/cortex-1-2-rc2.png",
        width: 1265,
        height: 712,
        caption: copy.products.cortex.caption,
      },
    },
  ];

  const active = products.find((p) => p.id === activeId) ?? products[0];

  return (
    <section
      id="lineup"
      className="ds-section border-y border-line bg-surface-dim"
    >
      <div className="ds-container">
        <SectionHeader
          eyebrow={platform.applications}
          title={copy.lineupTitle}
          lead={copy.lineupLead}
        />

        {/* Interactive Enterprise Product Selector Tabs */}
        <Reveal delay={80} className="mt-12 sm:mt-14">
          <div
            role="tablist"
            aria-label={platform.applications}
            className="grid grid-cols-2 gap-2.5 lg:grid-cols-4"
          >
            {products.map((product) => {
              const selected = product.id === active.id;
              return (
                <button
                  key={product.id}
                  id={`product-tab-${product.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`product-panel-${product.id}`}
                  onClick={() => setActiveId(product.id)}
                  className={`group relative flex items-center gap-3.5 rounded-lg border p-4 text-start transition-all duration-300 ease-out-quart ${
                    selected
                      ? "border-line-3 bg-surface shadow-soft"
                      : "border-line bg-surface/60 hover:border-line-2 hover:bg-surface"
                  }`}
                >
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-[13px] border transition-transform duration-500 ease-out-expo group-hover:scale-105 ${
                      selected
                        ? "border-line-2 bg-surface-dim"
                        : "border-line bg-surface"
                    }`}
                  >
                    <Image
                      src={product.icon}
                      alt=""
                      width={24}
                      height={24}
                      className="size-6"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">
                      {product.name}
                    </span>
                    <span className="ds-caption mt-0.5 block truncate text-xs">
                      {product.category}
                    </span>
                  </span>
                  {selected && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-5 bottom-0 h-[2px] rounded-full"
                      style={{ background: "var(--signal-gradient)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* Active Product Stage */}
        <Reveal
          delay={140}
          variant="scale"
          id={`product-panel-${active.id}`}
          className="ds-card mt-5 overflow-hidden p-6 sm:p-10 lg:p-12"
        >
          <div
            role="tabpanel"
            aria-labelledby={`product-tab-${active.id}`}
          >
            <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
              <div>
                <p className="ds-eyebrow">{active.category}</p>
                <h3 className="ds-h2 mt-4 text-ink">{active.name}</h3>
                <p className="ds-h4 mt-3 text-ink-2">{active.headline}</p>
                <p className="ds-body mt-3 max-w-[640px]">
                  {active.description}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {active.highlights.map((item) => (
                    <span key={item} className="ds-chip">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-start gap-4 lg:items-end">
                {/* Sub-view toggle for IPscans+ (Discovery vs Topology Map) */}
                {active.id === "scanner" && (
                  <div
                    role="group"
                    aria-label={active.name}
                    className="inline-flex rounded-full border border-line bg-surface-dim p-1"
                  >
                    <button
                      type="button"
                      onClick={() => setScannerView("discovery")}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-colors duration-200 ${
                        scannerView === "discovery"
                          ? "bg-surface text-ink shadow-soft"
                          : "text-ink-3 hover:text-ink"
                      }`}
                    >
                      <Icon name="network" size={14} />
                      <span>{copy.scannerViews.discovery}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScannerView("topology")}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-colors duration-200 ${
                        scannerView === "topology"
                          ? "bg-surface text-ink shadow-soft"
                          : "text-ink-3 hover:text-ink"
                      }`}
                    >
                      <Icon name="map" size={14} />
                      <span>{copy.scannerViews.topology}</span>
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={active.downloadUrl}
                    className="btn btn-primary"
                  >
                    <Icon name="windows" size={17} />
                    <span>{copy.downloadForWindows}</span>
                    <Icon name="download" size={17} />
                  </a>
                  <Link
                    href={active.href}
                    className="btn btn-secondary"
                  >
                    <span>{platform.details}</span>
                    <Icon
                      name="arrowRight"
                      size={17}
                      className="btn-arrow rtl-flip"
                    />
                  </Link>
                </div>
              </div>
            </div>

            <div
              key={`${active.id}-${active.screenshot.src}`}
              className="mt-8 animate-fade-up sm:mt-10"
            >
              <ScreenshotFrame
                src={active.screenshot.src}
                alt={`${active.name} — ${active.headline}`}
                width={active.screenshot.width}
                height={active.screenshot.height}
                caption={active.screenshot.caption}
                sizes="(min-width: 1320px) 1200px, 92vw"
              />
            </div>
          </div>
        </Reveal>

        {/* Complete 4-Product Lineup Directory Cards (ensures all 4 product routes are always crawlable & one-click accessible) */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product, i) => (
            <Reveal
              key={product.id}
              delay={i * 70}
              className="ds-card ds-card-interactive flex flex-col justify-between p-6"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-sm border border-line bg-surface-dim">
                    <Image
                      src={product.icon}
                      alt=""
                      width={22}
                      height={22}
                      className="size-[22px]"
                    />
                  </span>
                  <span className="ds-caption text-xs">{product.category}</span>
                </div>
                <h4 className="ds-h4 mt-5 text-ink">{product.name}</h4>
                <p className="ds-caption mt-2 line-clamp-3">
                  {product.description}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                <Link
                  href={product.href}
                  className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink"
                >
                  <span className="ds-link">{platform.details}</span>
                  <Icon
                    name="arrowRight"
                    size={15}
                    className="rtl-flip text-ink-3 transition-transform duration-300 ease-out-expo group-hover:translate-x-1 group-hover:text-signal"
                  />
                </Link>
                <a
                  href={product.downloadUrl}
                  aria-label={`${copy.downloadForWindows} — ${product.name}`}
                  className="inline-flex size-8 items-center justify-center rounded-full border border-line bg-surface-dim text-ink-2 transition-colors hover:border-line-2 hover:bg-surface-2 hover:text-ink"
                >
                  <Icon name="download" size={15} />
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
