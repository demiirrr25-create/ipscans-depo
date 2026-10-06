import Link from "next/link";
import type { Metadata } from "next";
import { isLocale, locales, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { getPost, posts, localizedPostText } from "@/content/posts";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    posts.filter((post) => post.body[locale]).map((post) => ({ locale, slug: post.slug }))
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
    title: `${localizedPostText(post.title, locale)} — ipscans`,
    description: localizedPostText(post.excerpt, locale),
    // Only hreflang to locales that actually have a translation for this post.
    alternates: {
      canonical: `/${locale}/blog/${slug}`,
      languages: Object.fromEntries(
        [...locales
          .filter((l) => post.title[l])
          .map((l) => [l, `/${l}/blog/${slug}`]), ["x-default", `/en/blog/${slug}`]]
      ),
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: localizedPostText(post.title, locale),
        description: localizedPostText(post.excerpt, locale),
        datePublished: post.date,
        inLanguage: localeTags[locale],
        author: { "@type": "Organization", name: "ipscans" },
        publisher: { "@type": "Organization", name: "ipscans" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ipscans", item: `https://ipscans.com/${locale}` },
          { "@type": "ListItem", position: 2, name: dict.blog.title, item: `https://ipscans.com/${locale}/blog` },
          {
            "@type": "ListItem",
            position: 3,
            name: localizedPostText(post.title, locale),
            item: `https://ipscans.com/${locale}/blog/${slug}`,
          },
        ],
      },
    ],
  };

  return (
    <PageShell title={localizedPostText(post.title, locale)}>
      <script
        type="application/ld+json"
        // Static, code-authored structured data — safe to inject directly.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="mx-auto max-w-2xl">
        <time className="block text-center text-sm text-neutral-500">
          {post.date}
        </time>
        <div
          className="prose-ipscans mt-6"
          // Body HTML is static content authored in src/content/posts.ts, not user input.
          dangerouslySetInnerHTML={{ __html: localizedPostText(post.body, locale) }}
        />
        <div className="mt-10 text-center">
          <Link
            href={`/${locale}/blog`}
            className="text-sm text-white hover:underline"
          >
            ← {dict.blog.title}
          </Link>
        </div>
      </article>
    </PageShell>
  );
}
