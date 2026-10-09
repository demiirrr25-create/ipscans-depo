import { uiText } from '@/i18n/ui';
import Link from "next/link";
import type { Metadata } from "next";
import { isLocale, locales, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { getPost, posts, localizedPostText, readingMinutes, postCategory } from "@/content/posts";
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
    title: localizedPostText(post.title, locale),
    description: localizedPostText(post.excerpt, locale),
    // Only hreflang to locales that actually have a translation for this post.
    alternates: {
      canonical: `/${locale}/blog/${slug}`,
      languages: Object.fromEntries(
        [...locales
          .filter((l) => post.body[l])
          .map((l) => [l, `/${l}/blog/${slug}`]), ["x-default", `/${post.body.en ? "en" : "tr"}/blog/${slug}`]]
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

  const headings: {id:string;title:string}[] = [];
  const articleHtml = localizedPostText(post.body, locale).replace(/<h2>(.*?)<\/h2>/g, (_,title:string) => {
    const id = `section-${headings.length+1}`;
    headings.push({id,title});
    return `<h2 id="${id}">${title}</h2>`;
  });
  const related = posts.filter(p=>p.slug!==slug && p.body[locale]).sort((a,b)=>Number(b.category===post.category)-Number(a.category===post.category)).slice(0,3);
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
      <div className="grid gap-12 lg:grid-cols-[220px_minmax(0,720px)] lg:justify-center">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-400">{postCategory(post,locale)}</p>
          <p className="mt-3 text-xs text-neutral-500"><time dateTime={post.date}>{post.date}</time> · {readingMinutes(post,locale)} {uiText(locale, "min read", "dk okuma")}</p>
          <nav aria-label={uiText(locale, "On this page", "Bu yazıda")} className="mt-8 border-t border-white/20 pt-5"><p className="mb-3 text-sm font-medium">{uiText(locale, "On this page", "Bu yazıda")}</p>{headings.map(h=><a key={h.id} href={`#${h.id}`} className="block min-h-10 py-2 text-sm text-neutral-400 hover:text-white">{h.title}</a>)}</nav>
        </aside>
        <article className="min-w-0">
          <p className="mb-8 border-b border-white/15 pb-6 text-sm text-neutral-400">IPScans {uiText(locale, "Editorial Team", "Editör Ekibi")}</p>
          <div className="prose-ipscans article-body" dangerouslySetInnerHTML={{__html:articleHtml}}/>
          <Link href={`/${locale}/blog`} className="mt-12 inline-flex min-h-11 items-center text-sm underline underline-offset-4">← {dict.blog.title}</Link>
        </article>
      </div>
      <section className="mt-20 border-t border-white/20 pt-10" aria-labelledby="related-title"><h2 id="related-title" className="text-2xl font-medium">{uiText(locale, "Keep exploring", "Okumaya devam edin")}</h2><div className="mt-6 grid gap-4 md:grid-cols-3">{related.map(p=><Link key={p.slug} href={`/${locale}/blog/${p.slug}`} className="rounded-xl border border-white/15 p-6 hover:bg-white/5"><p className="font-mono text-xs text-neutral-500">{postCategory(p,locale)}</p><h3 className="mt-3 text-lg">{localizedPostText(p.title,locale)} ↗</h3><p className="mt-3 text-sm text-neutral-400">{localizedPostText(p.excerpt,locale)}</p></Link>)}</div></section>
    </PageShell>
  );
}
