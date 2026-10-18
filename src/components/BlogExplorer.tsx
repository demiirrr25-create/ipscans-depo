"use client";

import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/i18n/config";
import { contentCopy } from "./content/copy";
import { fill, formatDate } from "./content/format";
import { Icon } from "./ds/Icon";

export type BlogCard = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  minutes: number;
};

const PAGE_SIZE = 12;

const searchText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replaceAll("ı", "i");

export function BlogExplorer({
  items,
  locale,
  initialPage = 1,
  initialQuery = "",
}: {
  items: BlogCard[];
  locale: Locale;
  initialPage?: number;
  initialQuery?: string;
}) {
  const copy = contentCopy[locale];
  const [query, setQueryState] = useState(initialQuery);
  const [category, setCategoryState] = useState("");
  const [filterPage, setFilterPage] = useState(1);

  function setQuery(value: string) {
    setQueryState(value);
    setFilterPage(1);
  }
  function setCategory(value: string) {
    setCategoryState(value);
    setFilterPage(1);
  }

  const categories = [...new Set(items.map((p) => p.category))];
  const normalized = searchText(query.trim());
  const isFiltering = Boolean(normalized || category);

  const filtered = items.filter(
    (p) =>
      (!category || p.category === category) &&
      searchText(`${p.title} ${p.excerpt} ${p.category}`).includes(normalized)
  );

  const gridItems = isFiltering ? filtered : filtered.slice(1);
  const pages = Math.max(1, Math.ceil(gridItems.length / PAGE_SIZE));
  const page = Math.min(
    pages,
    Math.max(1, isFiltering ? filterPage : initialPage)
  );

  const featured = !isFiltering && page === 1 && filtered.length > 0 ? filtered[0] : null;
  const visible = gridItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      {/* Featured latest article */}
      {featured && (
        <Link
          href={`/${locale}/blog/${featured.slug}`}
          className="ds-card ds-card-interactive group relative mb-12 block overflow-hidden p-7 sm:p-10 lg:p-12"
        >
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1 bg-[image:var(--signal-gradient)]"
          />
          <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="ds-eyebrow">{copy.featured}</span>
                <span className="ds-chip">{featured.category}</span>
              </div>
              <h2 className="ds-h2 mt-5 text-ink transition-colors duration-200 group-hover:text-signal">
                {featured.title}
              </h2>
            </div>
            <div className="flex flex-col justify-between">
              <p className="ds-lead text-[1.05rem]">{featured.excerpt}</p>
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5 text-sm text-ink-3">
                <div className="ds-tabular flex items-center gap-2.5">
                  <time dateTime={featured.date}>
                    {formatDate(featured.date, locale, "long")}
                  </time>
                  <span aria-hidden="true">·</span>
                  <span>{fill(copy.minRead, { n: featured.minutes })}</span>
                </div>
                <span className="inline-flex items-center gap-2 font-medium text-ink transition-colors group-hover:text-signal">
                  <span>{copy.readArticle}</span>
                  <Icon
                    name="arrowRight"
                    size={16}
                    className="rtl-flip transition-transform duration-300 ease-out-expo group-hover:translate-x-1"
                  />
                </span>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Search & topic filter bar */}
      <div className="ds-card-muted mb-8 p-5 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[360px_1fr] lg:items-end">
          <div>
            <label htmlFor="blog-search-input" className="ds-label">
              {copy.searchLabel}
            </label>
            <div className="relative">
              <Icon
                name="search"
                size={18}
                className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-ink-3"
              />
              <input
                id="blog-search-input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={copy.searchPlaceholder}
                className="ds-input ps-11 pe-10"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={copy.clearFilters}
                  className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <Icon name="close" size={15} />
                </button>
              )}
            </div>
          </div>

          <div>
            <span className="ds-label">{copy.topics}</span>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={copy.topics}
            >
              {["", ...categories].map((c) => {
                const active = category === c;
                const count = c
                  ? items.filter((p) => p.category === c).length
                  : items.length;
                return (
                  <button
                    key={c || "__all__"}
                    type="button"
                    onClick={() => setCategory(c)}
                    aria-pressed={active}
                    className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors duration-200 ${
                      active
                        ? "border-ink bg-ink text-white shadow-soft"
                        : "border-line-2 bg-surface text-ink-2 hover:border-line-3 hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    <span>{c || copy.all}</span>
                    <span
                      className={`ds-tabular text-xs ${
                        active ? "text-white/75" : "text-ink-3"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Results count & active filter reset */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="ds-caption ds-tabular font-medium text-ink-2">
          {fill(copy.results, { n: filtered.length })}
        </p>
        {isFiltering && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("");
            }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-signal transition-colors hover:underline"
          >
            <Icon name="close" size={14} />
            <span>{copy.clearFilters}</span>
          </button>
        )}
      </div>

      {/* Article cards grid */}
      {visible.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <Link
              key={p.slug}
              href={`/${locale}/blog/${p.slug}`}
              className="ds-card ds-card-interactive group flex flex-col justify-between p-7 sm:p-8"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="ds-chip">{p.category}</span>
                  <span className="ds-caption ds-tabular">
                    {fill(copy.minRead, { n: p.minutes })}
                  </span>
                </div>
                <h3 className="ds-h4 mt-5 text-ink transition-colors duration-200 group-hover:text-signal">
                  {p.title}
                </h3>
                <p className="ds-body mt-3 line-clamp-3 text-[0.95rem]">
                  {p.excerpt}
                </p>
              </div>
              <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5 text-sm text-ink-3">
                <time dateTime={p.date} className="ds-tabular">
                  {formatDate(p.date, locale, "short")}
                </time>
                <span className="inline-flex items-center gap-1.5 font-medium text-ink transition-colors group-hover:text-signal">
                  <span>{copy.readArticle}</span>
                  <Icon
                    name="arrowRight"
                    size={15}
                    className="rtl-flip transition-transform duration-300 ease-out-expo group-hover:translate-x-1"
                  />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <nav
          className="mt-14 flex flex-wrap items-center justify-center gap-2"
          aria-label={copy.pagination}
        >
          {page > 1 &&
            (isFiltering ? (
              <button
                type="button"
                onClick={() => setFilterPage(page - 1)}
                className="btn btn-secondary btn-sm"
              >
                {copy.previous}
              </button>
            ) : (
              <Link
                href={`/${locale}/blog?page=${page - 1}`}
                className="btn btn-secondary btn-sm"
              >
                {copy.previous}
              </Link>
            ))}

          {Array.from({ length: pages }, (_, i) => {
            const pNum = i + 1;
            const current = page === pNum;
            const cls = `btn btn-sm ds-tabular min-w-[38px] px-3 ${
              current ? "btn-primary" : "btn-secondary"
            }`;
            return isFiltering ? (
              <button
                type="button"
                key={pNum}
                onClick={() => setFilterPage(pNum)}
                aria-current={current ? "page" : undefined}
                className={cls}
              >
                {pNum}
              </button>
            ) : (
              <Link
                key={pNum}
                href={`/${locale}/blog?page=${pNum}`}
                aria-current={current ? "page" : undefined}
                className={cls}
              >
                {pNum}
              </Link>
            );
          })}

          {page < pages &&
            (isFiltering ? (
              <button
                type="button"
                onClick={() => setFilterPage(page + 1)}
                className="btn btn-secondary btn-sm"
              >
                {copy.next}
              </button>
            ) : (
              <Link
                href={`/${locale}/blog?page=${page + 1}`}
                className="btn btn-secondary btn-sm"
              >
                {copy.next}
              </Link>
            ))}
        </nav>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="ds-card-muted px-6 py-16 text-center">
          <p className="ds-body text-ink">{copy.noResults}</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm mt-5"
            onClick={() => {
              setQuery("");
              setCategory("");
            }}
          >
            <span>{copy.clearFilters}</span>
          </button>
        </div>
      )}
    </div>
  );
}

