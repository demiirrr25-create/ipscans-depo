import { uiText } from "@/i18n/ui";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { posts, localizedPostText, readingMinutes, postCategory } from "@/content/posts";

const featured = ["windows-kurulum-code-5", "hiz-testi-dogru-olcum", "ag-haritasi-kanitlari"];

export function BlogSection({ locale }: { locale: Locale }) {
  const available = posts.filter((p) => p.body[locale]);
  if (!available.length) return null;
  const selection = featured.map((slug) => available.find((p) => p.slug === slug)!).filter(Boolean);
  return (
    <section className="agy-section" aria-labelledby="journal-title">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="agy-eyebrow">03 / {uiText(locale, "JOURNAL", "REHBERLER")}</p>
          <h2 id="journal-title" className="agy-section-title">
            {uiText(locale, "Understand your network.", "Ağınızı daha iyi anlayın.")}
          </h2>
        </div>
        <Link href={`/${locale}/blog`} className="btn-ghost inline-flex min-h-11 items-center gap-2 px-5 text-sm font-medium">
          {available.length} {uiText(locale, "guides to explore", "rehberi keşfet")} <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {selection.map((p, i) => (
          <Link key={p.slug} href={`/${locale}/blog/${p.slug}`} className="agy-surface-card group flex flex-col p-7">
            <div className={`editorial-art editorial-art-${i}`} aria-hidden="true">
              <span />
              <span />
              <span />
              <b>{["01", "02", "03"][i]}</b>
            </div>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-widest text-neutral-400">
              {postCategory(p, locale)} · {readingMinutes(p, locale)} {uiText(locale, "MIN", "DK")}
            </p>
            <h3 className="mt-3 text-xl font-medium tracking-tight text-white">
              {localizedPostText(p.title, locale)}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-neutral-400">
              {localizedPostText(p.excerpt, locale)}
            </p>
            <span className="mt-auto inline-flex items-center gap-2 pt-7 text-sm font-medium text-white">
              {uiText(locale, "Read the guide", "Rehberi oku")}{" "}
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
