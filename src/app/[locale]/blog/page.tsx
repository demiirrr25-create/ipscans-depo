import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { PageShell } from '@/components/PageShell';
import { BlogExplorer } from '@/components/BlogExplorer';
import { posts,localizedPostText,readingMinutes } from '@/content/posts';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata> {
  const {locale}=await params;
  if(!isLocale(locale))return {};
  const t=getDictionary(locale).blog;
  return {title:t.title,description:t.subtitle,alternates:{canonical:`/${locale}/blog`,languages:{en:'/en/blog',tr:'/tr/blog','x-default':'/en/blog'}},robots:posts.some(p=>p.body[locale])?undefined:{index:false,follow:true}};
}
export default async function BlogPage({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;
  if(!isLocale(locale))notFound();
  const dict=getDictionary(locale);
  const items=posts.filter(p=>p.body[locale]).map(p=>({slug:p.slug,title:localizedPostText(p.title,locale),excerpt:localizedPostText(p.excerpt,locale),category:p.category||(locale==='tr'?'Temeller':'Essentials'),date:p.date,minutes:readingMinutes(p,locale)}));
  return <PageShell title={locale==='tr'?'Bilgi, bağlantıyı güçlendirir.':dict.blog.title} subtitle={locale==='tr'?'Ağ keşfinden bağlantı performansına: kaynaklı açıklamalar, pratik örnekler ve adım adım sorun çözümü.':dict.blog.subtitle}>{items.length?<BlogExplorer items={items} locale={locale}/>:<p className="text-neutral-400">{dict.blog.empty}</p>}</PageShell>;
}
