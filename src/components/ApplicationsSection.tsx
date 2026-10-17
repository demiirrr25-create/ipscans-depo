"use client";

import { uiText } from "@/i18n/ui";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { PublicDictionary } from "@/i18n/dictionaries";
import { applications, platformCopy } from "@/content/applications";
import { toolKeys, toolPath } from "@/lib/tool-routes";
import { lprRelease } from "@/content/lpr-release";

export function ApplicationsSection({
  locale,
  dict,
  primary = false,
}: {
  locale: Locale;
  dict: PublicDictionary;
  primary?: boolean;
}) {
  const Heading = primary ? "h1" : "h2";
  const copy = platformCopy[locale];
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const tools = toolKeys.map((key) => ({
    id: key,
    name: dict[key].title,
    description: dict[key].subtitle,
    href: toolPath(key, locale),
    category: key === "ipLookup" ? "ip" : "network",
    preview: "/web-tools-preview.png",
  }));

  const results = [
    {
      id: "cortex",
      name: "IPScans Cortex",
      description: locale === "tr" ? "RTSP kameralar, doğal dille olay kuralları ve yerel AI analizi. İlk Alpha sürümü." : "RTSP cameras, natural-language event rules and local vision AI. Initial alpha release.",
      href: `/${locale}/cortex`,
      category: "desktop",
      icon: "/cortex-mark.svg",
      preview: "/cortex-preview.png",
      version: "0.1.1 Alpha",
      platform: "Windows 10/11 · x64",
      download: "https://github.com/demiirrr25-create/ipscans-depo/releases/download/cortex-v0.1.1/IPScans-Cortex-0.1.1.exe",
    },
    {
      id: "lpr-pro",
      name: "IPScans LPR Pro",
      description:
        locale === "tr"
          ? "5 bölmeli canlı operatör çalışma alanı, bağımsız kalibrasyon çizgileri, blok/daire araç kütüğü ve yerel ONNX plaka tanıma."
          : "5-page live operator workspace, independent calibration lines, resident vehicle registry, and local ONNX plate recognition.",
      href: `/${locale}/lpr-pro`,
      category: "desktop",
      icon: "/lpr-mark.svg",
      preview: "/lpr-pro-preview.png",
      version: lprRelease.version,
      platform: "Windows 10/11 · x64",
      download: lprRelease.url,
    },
    ...applications.map((app) => ({
      id: app.id,
      name: app.name,
      description: app.description[locale],
      href: `/${locale}/applications/${app.id}`,
      category: "desktop",
      icon: app.icon,
      preview:
        app.id === "ipcast"
          ? "/ipcast-v25-preview.png"
          : "/scanner-v43-preview.png",
      version: app.version,
      platform: app.platform,
      download: app.downloadUrl,
    })),
    ...tools,
  ].filter(
    (item) =>
      (category === "all" || item.category === category) &&
      `${item.name} ${item.description}`
        .toLocaleLowerCase(locale)
        .includes(query.toLocaleLowerCase(locale))
  );

  return (
    <section
      id="applications"
      aria-labelledby="applications-title"
      className="scroll-mt-24 py-6"
    >
      {!primary && (
        <div className="mb-10 sm:flex sm:items-end sm:justify-between">
          <div>
            <p className="agy-eyebrow">
              02 / {uiText(locale, "IPScans ecosystem", "IPScans ekosistemi")}
            </p>
            <Heading id="applications-title" className="agy-section-title">
              {copy.applications}
            </Heading>
            <p className="mt-3 max-w-2xl text-neutral-400">
              {copy.applicationsIntro}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="mt-6 hidden font-mono text-xs tracking-widest text-neutral-500 sm:block"
          >
            {uiText(locale, "EXPLORE", "KEŞFET")} / 01—
            {String(applications.length + tools.length + 2).padStart(2, "0")}
          </span>
        </div>
      )}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="block w-full sm:max-w-md">
          <span className="sr-only">{dict.experience.searchPlaceholder}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={dict.experience.searchPlaceholder}
            className="agy-input w-full"
          />
        </label>
        <div
          role="group"
          aria-label={dict.nav.tools}
          className="flex flex-wrap gap-2"
        >
          {(["all", "ip", "desktop"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={category === value}
              onClick={() => setCategory(value)}
              className={`button button-compact ${
                category === value ? "button-primary" : "button-secondary"
              }`}
            >
              <span>{dict.experience.categories[value]}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="sr-only" role="status">
        {results.length} {copy.applications}
      </p>

      {results.length === 0 && (
        <p className="agy-surface-card p-8 text-neutral-300">
          {dict.experience.noResults}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {results.map((item, index) => (
          <article
            key={item.id}
            className="product-card agy-surface-card group flex flex-col overflow-hidden p-0"
          >
            {"version" in item && item.preview && (
              <Link
                href={item.href}
                className="relative block overflow-hidden border-b border-white/10 bg-[#0b0c0f]"
              >
                <Image
                  src={item.preview}
                  alt={item.name}
                  width={1440}
                  height={900}
                  className="h-44 w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </Link>
            )}
            <div className="flex flex-1 flex-col p-7">
              <div className="flex items-start justify-between">
                {"icon" in item && item.icon ? (
                  <Image
                    src={item.icon}
                    alt=""
                    width={48}
                    height={48}
                    className="rounded-2xl border border-white/10"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] font-mono text-lg text-neutral-200"
                  >
                    ⌁
                  </span>
                )}
                <span className="max-w-[65%] text-end font-mono text-xs text-neutral-400">
                  {String(index + 1).padStart(2, "0")} /{" "}
                  {item.category === "desktop"
                    ? dict.experience.categories.desktop
                    : item.category === "ip"
                      ? dict.experience.categories.ip
                      : dict.nav.tools}
                </span>
              </div>
              <h3 className="mt-6 text-2xl font-medium tracking-tight text-white">
                {item.name}
              </h3>
              <p className="mt-2.5 max-w-sm text-sm leading-relaxed text-neutral-400">
                {item.description}
              </p>
              {"version" in item && (
                <p className="mt-4 font-mono text-xs text-neutral-500">
                  {item.platform} <span aria-hidden="true">/</span> v
                  {item.version}
                </p>
              )}
              <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
                <Link
                  href={item.href}
                  className="button button-compact button-secondary"
                >
                  <span>{copy.details} →</span>
                </Link>
                {"download" in item && (
                  <a
                    href={item.download}
                    aria-label={`${item.name} — ${
                      item.id === "lpr-pro"
                        ? uiText(locale, "Download EXE", "EXE indir")
                        : copy.downloadApp
                    }`}
                    className="button button-compact button-primary ms-auto"
                  >
                    <span>
                      {item.id === "lpr-pro"
                        ? uiText(locale, "Download EXE", "EXE indir")
                        : copy.downloadApp}{" "}
                      ↓
                    </span>
                  </a>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
