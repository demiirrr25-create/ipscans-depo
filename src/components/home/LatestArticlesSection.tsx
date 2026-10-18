import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import {
  localizedPostText,
  postCategory,
  posts,
  readingMinutes,
  type Post,
} from "@/content/posts";
import { Icon } from "@/components/ds/Icon";
import { Reveal } from "@/components/ds/Reveal";
import { SectionHeader } from "@/components/ds/product";
import { homeCopy } from "./copy";

const featuredSlugs = [
  "windows-kurulum-code-5",
  "hiz-testi-dogru-olcum",
  "ip-adresi-nedir",
];

export function LatestArticlesSection({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const available = posts.filter((p) => p.body[locale]);
  if (!available.length) return null;

  const selected = [
    ...featuredSlugs
      .map((slug) => available.find((p) => p.slug === slug))
      .filter((p): p is Post => Boolean(p)),
    ...available.filter((p) => !featuredSlugs.includes(p.slug)),
  ].slice(0, 3);

  const copy = homeCopy[locale];

  return (
    <section className="ds-section border-t border-line bg-surface-dim">
      <div className="ds-container">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeader
            eyebrow={dict.nav.blog}
            title={copy.articlesTitle}
            lead={dict.blog.subtitle}
          />
          <Reveal delay={100}>
            <Link
              href={`/${locale}/blog`}
              className="btn btn-secondary"
            >
              <span>{copy.viewAllArticles}</span>
              <Icon
                name="arrowRight"
                size={16}
                className="btn-arrow rtl-flip"
              />
            </Link>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-5 sm:mt-16 lg:grid-cols-3">
          {selected.map((post, i) => (
            <Reveal key={post.slug} delay={i * 80}>
              <Link
                href={`/${locale}/blog/${post.slug}`}
                className="group ds-card ds-card-interactive flex h-full flex-col justify-between p-7 sm:p-8"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="ds-chip">
                      {postCategory(post, locale)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-3">
                      <Icon name="clock" size={14} />
                      <span>
                        {readingMinutes(post, locale)} {copy.minRead}
                      </span>
                    </span>
                  </div>

                  <h3 className="ds-h4 mt-6 text-ink transition-colors duration-200 group-hover:text-signal">
                    {localizedPostText(post.title, locale)}
                  </h3>

                  <p className="ds-body mt-3 line-clamp-3 text-[0.96rem]">
                    {localizedPostText(post.excerpt, locale)}
                  </p>
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-line pt-5 text-sm font-medium text-ink">
                  <span>{dict.blog.readMore}</span>
                  <Icon
                    name="arrowRight"
                    size={16}
                    className="rtl-flip text-ink-3 transition-all duration-300 ease-out-expo group-hover:translate-x-1 group-hover:text-signal"
                  />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
