import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { BlogExplorer } from "@/components/BlogExplorer";
import { contentCopy } from "@/components/content/copy";
import { posts, localizedPostText, readingMinutes, postCategory } from "@/content/posts";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale).blog;
  return {
    title: t.title,
    description: t.subtitle,
    alternates: {
      canonical: `/${locale}/blog`,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, `/${l}/blog`])),
        "x-default": "/en/blog",
      },
    },
    robots: posts.some((p) => p.body[locale]) ? undefined : { index: false, follow: true },
  };
}

export default async function BlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const copy = contentCopy[locale];
  const sp = await searchParams;
  const requested = Number(sp.page || 1);
  const q = sp.q?.slice(0, 120) || "";
  const page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  const items = posts
    .filter((p) => p.body[locale])
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((p) => ({
      slug: p.slug,
      title: localizedPostText(p.title, locale),
      excerpt: localizedPostText(p.excerpt, locale),
      category: postCategory(p, locale),
      date: p.date,
      minutes: readingMinutes(p, locale),
    }));

  return (
    <PageShell
      eyebrow={copy.blogEyebrow}
      title={dict.blog.title}
      subtitle={dict.blog.subtitle}
    >
      {items.length ? (
        <BlogExplorer
          key={`${page}-${q}`}
          items={items}
          locale={locale}
          initialPage={page}
          initialQuery={q}
        />
      ) : (
        <div className="ds-card-muted p-12 text-center">
          <p className="ds-body">{dict.blog.empty}</p>
        </div>
      )}
    </PageShell>
  );
}

