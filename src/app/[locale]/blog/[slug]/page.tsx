import Link from "next/link";
import type { Metadata } from "next";
import { isLocale, locales, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import {
  getPost,
  posts,
  localizedPostText,
  readingMinutes,
  postCategory,
  postTags,
} from "@/content/posts";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/AdSlot";
import { Icon } from "@/components/ds/Icon";
import { contentCopy } from "@/components/content/copy";
import { fill, formatDate, withHeadingIds } from "@/components/content/format";
import { ReadingProgress } from "@/components/content/ReadingProgress";

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    posts
      .filter((post) => post.body[locale])
      .map((post) => ({ locale, slug: post.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPost(slug);
  if (!isLocale(locale) || !post?.body[locale]) return {};
  return {
    title: localizedPostText(post.title, locale),
    description: localizedPostText(post.excerpt, locale),
    openGraph: {
      type: "article",
      title: localizedPostText(post.title, locale),
      description: localizedPostText(post.excerpt, locale),
      url: `https://ipscans.com/${locale}/blog/${slug}`,
      publishedTime: post.date,
    },
    twitter: {
      card: "summary_large_image",
      title: localizedPostText(post.title, locale),
      description: localizedPostText(post.excerpt, locale),
    },
    // Only hreflang to locales that actually have a translation for this post.
    alternates: {
      canonical: `/${locale}/blog/${slug}`,
      languages: Object.fromEntries([
        ...locales
          .filter((l) => post.body[l])
          .map((l) => [l, `/${l}/blog/${slug}`]),
        ["x-default", `/${post.body.en ? "en" : "tr"}/blog/${slug}`],
      ]),
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const post = getPost(slug);
  if (!post?.body[locale]) notFound();
  const dict = getDictionary(locale);
  const copy = contentCopy[locale];

  const title = localizedPostText(post.title, locale);
  const excerpt = localizedPostText(post.excerpt, locale);
  const category = postCategory(post, locale);
  const minutes = readingMinutes(post, locale);
  const tags = postTags(post, locale);

  const { html: articleHtml, headings } = withHeadingIds(
    localizedPostText(post.body, locale)
  );

  const related = posts
    .filter((p) => p.slug !== slug && p.body[locale])
    .sort(
      (a, b) =>
        Number(b.category === post.category) -
        Number(a.category === post.category)
    )
    .slice(0, 3);

  // One in-content ad between whole sections (before the middle <h2>); short articles get none.
  const splitAt =
    headings.length >= 3
      ? articleHtml.indexOf(
          `<h2 id="${headings[Math.floor(headings.length / 2)].id}"`
        )
      : -1;
  const articleTop = splitAt > 0 ? articleHtml.slice(0, splitAt) : articleHtml;
  const articleBottom = splitAt > 0 ? articleHtml.slice(splitAt) : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: title,
        description: excerpt,
        datePublished: post.date,
        inLanguage: localeTags[locale],
        author: { "@type": "Organization", name: "ipscans" },
        publisher: { "@type": "Organization", name: "ipscans" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "ipscans",
            item: `https://ipscans.com/${locale}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: dict.blog.title,
            item: `https://ipscans.com/${locale}/blog`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: title,
            item: `https://ipscans.com/${locale}/blog/${slug}`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <ReadingProgress targetId="article-prose" />
      <PageShell eyebrow={category} title={title} subtitle={excerpt}>
        <script
          type="application/ld+json"
          // Static, code-authored structured data — safe to inject directly.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Breadcrumb & article meta bar */}
        <div className="mb-12 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
          <nav
            aria-label={copy.breadcrumb}
            className="flex flex-wrap items-center gap-2 text-sm text-ink-3"
          >
            <Link href={`/${locale}`} className="ds-link hover:text-ink">
              {copy.home}
            </Link>
            <Icon name="chevronRight" size={14} className="rtl-flip text-ink-4" />
            <Link href={`/${locale}/blog`} className="ds-link hover:text-ink">
              {dict.blog.title}
            </Link>
            <Icon name="chevronRight" size={14} className="rtl-flip text-ink-4" />
            <span aria-current="page" className="font-medium text-ink">
              {category}
            </span>
          </nav>

          <div className="ds-tabular flex flex-wrap items-center gap-2.5 text-sm text-ink-3">
            <time dateTime={post.date}>
              {formatDate(post.date, locale, "long")}
            </time>
            <span aria-hidden="true">·</span>
            <span>{fill(copy.minRead, { n: minutes })}</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-ink-2">{copy.editorial}</span>
          </div>
        </div>

        {/* Mobile table of contents */}
        {headings.length > 0 && (
          <nav
            aria-label={copy.onThisPage}
            className="ds-card-muted mb-10 p-5 sm:p-6 lg:hidden"
          >
            <p className="ds-eyebrow mb-4">{copy.onThisPage}</p>
            <ol className="grid gap-2 sm:grid-cols-2">
              {headings.map((h, i) => (
                <li key={h.id}>
                  <a
                    href={`#${h.id}`}
                    className="flex items-baseline gap-2.5 py-1 text-sm text-ink-2 transition-colors hover:text-signal"
                  >
                    <span className="ds-mono ds-tabular text-xs text-ink-3">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-medium text-ink">{h.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Two-column desktop layout: sticky TOC + ~68ch article prose */}
        <div className="grid gap-12 lg:grid-cols-[240px_minmax(0,68ch)] lg:justify-center xl:gap-20">
          <aside className="hidden lg:sticky lg:top-[calc(var(--header-h)+32px)] lg:block lg:self-start">
            {headings.length > 0 && (
              <nav aria-label={copy.onThisPage}>
                <p className="ds-eyebrow mb-4">{copy.onThisPage}</p>
                <ol className="space-y-1.5 border-s border-line ps-4">
                  {headings.map((h) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className="block py-1 text-sm leading-snug text-ink-3 transition-colors hover:text-signal"
                      >
                        {h.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            {tags.length > 0 && (
              <div
                className={
                  headings.length > 0 ? "mt-8 border-t border-line pt-6" : ""
                }
              >
                <p className="ds-caption mb-3 font-medium text-ink-2">
                  {copy.topics}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/${locale}/blog?q=${encodeURIComponent(tag)}`}
                      className="ds-chip transition-colors hover:bg-surface-3 hover:text-ink"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 border-t border-line pt-6">
              <Link
                href={`/${locale}/blog`}
                className="inline-flex items-center gap-2 text-sm font-medium text-ink-2 transition-colors hover:text-signal"
              >
                <Icon
                  name="arrowRight"
                  size={15}
                  className="rotate-180 rtl:rotate-0"
                />
                <span>{copy.allArticles}</span>
              </Link>
            </div>
          </aside>

          <article id="article-prose" className="min-w-0 max-w-[68ch]">
            <div
              className="ds-prose"
              dangerouslySetInnerHTML={{ __html: articleTop }}
            />
            {articleBottom && (
              <AdSlot
                slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE}
                label={copy.advertisement}
              />
            )}
            {articleBottom && (
              <div
                className="ds-prose mt-7"
                dangerouslySetInnerHTML={{ __html: articleBottom }}
              />
            )}

            <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/${locale}/blog?q=${encodeURIComponent(tag)}`}
                    className="ds-chip transition-colors hover:bg-surface-3 hover:text-ink"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
              <Link
                href={`/${locale}/blog`}
                className="btn btn-secondary btn-sm"
              >
                <span>{copy.allArticles}</span>
                <Icon
                  name="arrowRight"
                  size={15}
                  className="btn-arrow rtl-flip"
                />
              </Link>
            </div>
          </article>
        </div>

        {/* Related articles */}
        {related.length > 0 && (
          <section
            className="mt-24 border-t border-line pt-16"
            aria-labelledby="related-title"
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="ds-eyebrow mb-3">{dict.blog.title}</p>
                <h2 id="related-title" className="ds-h3 text-ink">
                  {copy.keepReading}
                </h2>
              </div>
              <Link
                href={`/${locale}/blog`}
                className="btn btn-ghost btn-sm"
              >
                <span>{copy.allArticles}</span>
                <Icon
                  name="arrowRight"
                  size={15}
                  className="btn-arrow rtl-flip"
                />
              </Link>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {related.map((p) => {
                const relMinutes = readingMinutes(p, locale);
                return (
                  <Link
                    key={p.slug}
                    href={`/${locale}/blog/${p.slug}`}
                    className="ds-card ds-card-interactive group flex flex-col justify-between p-7 sm:p-8"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="ds-chip">
                          {postCategory(p, locale)}
                        </span>
                        <span className="ds-caption ds-tabular">
                          {fill(copy.minRead, { n: relMinutes })}
                        </span>
                      </div>
                      <h3 className="ds-h4 mt-5 text-ink transition-colors duration-200 group-hover:text-signal">
                        {localizedPostText(p.title, locale)}
                      </h3>
                      <p className="ds-body mt-3 line-clamp-3 text-[0.95rem]">
                        {localizedPostText(p.excerpt, locale)}
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
                );
              })}
            </div>
          </section>
        )}
      </PageShell>
    </>
  );
}
