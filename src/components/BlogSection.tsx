import { uiText } from '@/i18n/ui';
import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import { posts,localizedPostText,readingMinutes,postCategory } from '@/content/posts';

const featured=['windows-kurulum-code-5','hiz-testi-dogru-olcum','ag-haritasi-kanitlari'];
export function BlogSection({locale}:{locale:Locale}) {
  const available=posts.filter(p=>p.body[locale]);
  if(!available.length) return null;
  const selection=featured.map(slug=>available.find(p=>p.slug===slug)!).filter(Boolean);
  return <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8" aria-labelledby="journal-title">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-white/20 pb-8"><div><p className="font-mono text-xs uppercase tracking-[.2em] text-neutral-400">03 / {uiText(locale, "JOURNAL", "REHBERLER")}</p><h2 id="journal-title" className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-[-.04em] sm:text-6xl">{uiText(locale, "Understand your network.", "Ağınızı daha iyi anlayın.")}</h2></div><Link href={`/${locale}/blog`} className="min-h-11 py-3 text-sm underline underline-offset-8">{available.length} {uiText(locale, "guides to explore", "rehberi keşfet")} ↗</Link></div>
    <div className="grid gap-px border border-white/15 bg-white/15 md:grid-cols-3">{selection.map((p,i)=><Link key={p.slug} href={`/${locale}/blog/${p.slug}`} className="group flex flex-col bg-black p-7 transition-colors hover:bg-neutral-900"><div className={`editorial-art editorial-art-${i}`} aria-hidden="true"><span/><span/><span/><b>{['01','02','03'][i]}</b></div><p className="mt-7 font-mono text-[11px] uppercase tracking-widest text-neutral-400">{postCategory(p,locale)} / {readingMinutes(p,locale)} {uiText(locale, "MIN", "DK")}</p><h3 className="mt-4 text-2xl font-medium tracking-tight">{localizedPostText(p.title,locale)}</h3><p className="mt-4 text-sm leading-relaxed text-neutral-400">{localizedPostText(p.excerpt,locale)}</p><span className="mt-auto pt-8 text-sm">{uiText(locale, "Read the guide", "Rehberi oku")} ↗</span></Link>)}</div>
  </section>;
}
