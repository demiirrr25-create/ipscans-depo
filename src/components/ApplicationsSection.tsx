"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { PublicDictionary } from "@/i18n/dictionaries";
import { applications, platformCopy } from "@/content/applications";
import { toolKeys, toolPath } from "@/lib/tool-routes";

export function ApplicationsSection({ locale, dict }: { locale: Locale; dict: PublicDictionary }) {
  const copy = platformCopy[locale];
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const tools = toolKeys.map((key) => ({
    id: key,
    name: dict[key].title,
    description: dict[key].subtitle,
    href: toolPath(key, locale),
    category: key === "ipLookup" ? "ip" : "network",
  }));
  const results = [
    ...applications.map((app) => ({
      id: app.id,
      name: app.name,
      description: app.description[locale],
      href: `/${locale}/applications/${app.id}`,
      category: "desktop",
      icon: app.icon,
      version: app.version,
      platform: app.platform,
      download: app.downloadUrl,
    })),
    ...tools,
  ].filter((item) =>
    (category === "all" || item.category === category) &&
    `${item.name} ${item.description}`.toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale))
  );

  return (
    <section id="applications" aria-labelledby="applications-title" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-24">
      <div className="mb-10 border-b border-white/15 pb-8 sm:flex sm:items-end sm:justify-between">
        <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">02 / IPScans ecosystem</p>
        <h2 id="applications-title" className="mt-4 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-6xl">{copy.applications}<span className="text-neutral-500">.</span></h2>
        <p className="mt-3 max-w-2xl text-neutral-400">{copy.applicationsIntro}</p>
        </div>
        <span aria-hidden="true" className="mt-6 hidden font-mono text-xs text-neutral-400 sm:block">EXPLORE / 01—{String(applications.length + tools.length).padStart(2, "0")}</span>
      </div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="block w-full sm:max-w-sm">
          <span className="sr-only">{dict.experience.searchPlaceholder}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder={dict.experience.searchPlaceholder}
            className="min-h-12 w-full rounded-xl border border-white/20 bg-neutral-950 px-4 text-white placeholder:text-neutral-400 focus:border-white" />
        </label>
        <div role="group" aria-label={dict.nav.tools} className="flex flex-wrap gap-2">
          {(["all", "network", "ip", "desktop"] as const).map((value) => (
            <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}
              className={`min-h-11 rounded-lg border px-4 text-sm transition ${category === value ? "border-white bg-white text-black" : "border-white/20 text-neutral-300 hover:border-white/50"}`}>
              {dict.experience.categories[value]}
            </button>
          ))}
        </div>
      </div>
      <p className="sr-only" role="status">{results.length} {copy.applications}</p>
      {results.length === 0 && <p className="rounded-xl border border-white/10 p-8 text-neutral-300">{dict.experience.noResults}</p>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {results.map((item, index) => (
          <article key={item.id} className="product-card group flex min-h-72 flex-col overflow-hidden rounded-xl border border-white/15 bg-[#0c0c0c] p-6 transition hover:-translate-y-1 hover:border-white/45 focus-within:border-white sm:p-7">
            <div className="flex items-start justify-between">
              {"icon" in item && item.icon ? <Image src={item.icon} alt="" width={64} height={64} className="rounded-2xl" /> :
                <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/20 font-mono text-2xl">⌁</span>}
              <span className="font-mono text-xs text-neutral-400">{String(index + 1).padStart(2, "0")} / {item.category.toUpperCase()}</span>
            </div>
            <h3 className="mt-8 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white">{item.name}</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-300">{item.description}</p>
            {"version" in item && <p className="mt-4 font-mono text-xs text-neutral-400">{item.platform} <span aria-hidden="true">/</span> v{item.version}</p>}
            <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
              <Link href={item.href} className="inline-flex min-h-11 items-center text-sm font-semibold underline decoration-white/30 underline-offset-4 hover:decoration-white">{copy.details} <span aria-hidden="true" className="ms-2 transition-transform group-hover:translate-x-1">↗</span></Link>
              {"download" in item && <a href={item.download} aria-label={`${item.name} — ${copy.downloadApp}`} className="btn-ghost ms-auto inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold">{copy.downloadApp} ↓</a>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
