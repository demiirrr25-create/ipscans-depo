import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { posts, localizedPostText } from "@/content/posts";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale).blog;
  return {
    title: t.title,
    description: t.subtitle,
    alternates: { canonical: `/${locale}/blog`, languages: { en: "/en/blog", tr: "/tr/blog", "x-default": "/en/blog" } },
    robots: posts.some((post) => post.body[locale]) ? undefined : { index: false, follow: true },
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <PageShell title={dict.blog.title} subtitle={dict.blog.subtitle}>
      {posts.filter((post) => post.body[locale]).length === 0 ? (
        <p className="text-center text-neutral-400">{dict.blog.empty}</p>
      ) : (
        <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
          {posts.filter((post) => post.body[locale]).map((post) => (
            <Link
              key={post.slug}
              href={`/${locale}/blog/${post.slug}`}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/25 hover:bg-white/5"
            >
              <time className="text-xs text-neutral-500">{post.date}</time>
              <h2 className="mt-2 text-lg font-semibold text-white group-hover:text-white">
                {localizedPostText(post.title, locale)}
              </h2>
              <p className="mt-2 text-sm text-neutral-400">
                {localizedPostText(post.excerpt, locale)}
              </p>
              <span className="mt-3 inline-block text-sm text-white">
                {dict.blog.readMore} →
              </span>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
