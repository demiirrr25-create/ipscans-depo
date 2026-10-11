"use client";
import { uiText } from '@/i18n/ui';
import type { Locale } from '@/i18n/config';
import Link from 'next/link';
import { useState } from 'react';

export type BlogCard = {slug:string;title:string;excerpt:string;category:string;date:string;minutes:number};
const searchText=(value:string)=>value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replaceAll('ı','i');
export function BlogExplorer({items,locale,initialPage=1,initialQuery=''}:{items:BlogCard[];locale:Locale;initialPage?:number;initialQuery?:string}) {
  const [query,setQueryState]=useState(initialQuery);
  const [category,setCategoryState]=useState('');
  const [filterPage,setFilterPage]=useState(1);
  function setQuery(value:string){setQueryState(value);setFilterPage(1);}
  function setCategory(value:string){setCategoryState(value);setFilterPage(1);}
  const categories=[...new Set(items.map(p=>p.category))];
  const normalized=searchText(query.trim());
  const filtered=items.filter(p=>(!category||p.category===category)&&searchText(`${p.title} ${p.excerpt} ${p.category}`).includes(normalized));
  const pages=Math.max(1,Math.ceil(filtered.length/12));
  const page=Math.min(pages,Math.max(1,query||category?filterPage:initialPage));
  const visible=filtered.slice((page-1)*12,page*12);
  return <div>
    <div className="grid gap-6 border-b border-white/15 pb-8 md:grid-cols-[1fr_320px]">
      <div><p className="font-mono text-xs uppercase tracking-widest text-neutral-400">{uiText(locale, "FIELD NOTES", "SAHA NOTLARI")} / {items.length}</p><h2 className="mt-3 text-2xl tracking-tight">{uiText(locale, "Start with a question.", "Bir soruyla başlayın.")}</h2></div>
      <label className="self-end"><span className="mb-2 block text-xs text-neutral-400">{uiText(locale, "Search guides", "Rehberlerde ara")}</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={uiText(locale, "DNS, installation, latency…", "DNS, kurulum, gecikme…")} className="min-h-12 w-full rounded-full border border-white/25 bg-neutral-950 px-5 text-sm outline-none focus:border-white" /></label>
    </div>
    <label className="my-6 block sm:hidden"><span className="mb-2 block text-xs text-neutral-400">{uiText(locale,'Topic filters','Konu filtreleri')}</span><select value={category} onChange={e=>{setCategory(e.target.value);setFilterPage(1);}} className="min-h-12 w-full border border-white/25 bg-black px-4 text-sm">{['',...categories].map(c=><option key={c} value={c}>{c||uiText(locale,'All','Tümü')}</option>)}</select></label>
    <div className="my-6 hidden flex-wrap gap-2 sm:flex" role="group" aria-label={uiText(locale, "Topic filters", "Konu filtreleri")}>
      {['',...categories].map(c=><button key={c} type="button" onClick={()=>setCategory(c)} aria-pressed={category===c} className="min-h-11 rounded-full border border-white/20 px-4 text-sm text-neutral-300 transition-colors aria-pressed:border-white aria-pressed:bg-white aria-pressed:text-black">{c||(uiText(locale, "All", "Tümü"))} <span className="ms-1 opacity-60">{c?items.filter(p=>p.category===c).length:items.length}</span></button>)}
    </div>
    <p role="status" className="mb-6 font-mono text-xs text-neutral-400">{filtered.length} {uiText(locale, "guides found", "rehber bulundu")}</p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((p,i)=><Link key={p.slug} href={`/${locale}/blog/${p.slug}`} className="blog-card group rounded-2xl border border-white/15 flex min-h-72 flex-col bg-black p-7 transition-colors hover:bg-neutral-900 focus-visible:bg-neutral-900">
        <div className="blog-art" aria-hidden="true"/>
        <div className="flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-widest text-neutral-400"><span>{p.category}</span><span>{String(i+1).padStart(2,'0')} ↗</span></div>
        <h3 className="break-words mt-8 text-xl font-medium leading-snug tracking-tight">{p.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400">{p.excerpt}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-8 font-mono text-[11px] text-neutral-500"><time dateTime={p.date}>{p.date}</time><span>{p.minutes} {uiText(locale, "min read", "dk okuma")}</span></div>
      </Link>)}
    </div>
    {pages>1&&<nav className="blog-pagination" aria-label={uiText(locale,'Pages','Sayfalar')}>{Array.from({length:pages},(_,i)=>query||category?<button type="button" key={i} onClick={()=>setFilterPage(i+1)} aria-current={page===i+1?'page':undefined}>{i+1}</button>:<Link key={i} href={`/${locale}/blog?page=${i+1}`} aria-current={page===i+1?'page':undefined}>{i+1}</Link>)}</nav>}
    {filtered.length===0&&<div className="py-16 text-center"><p className="text-neutral-400">{uiText(locale, "No guides match your search.", "Bu aramayla eşleşen rehber bulunamadı.")}</p><button type="button" className="mt-5 min-h-11 underline underline-offset-4" onClick={()=>{setQuery('');setCategory('');}}>{uiText(locale, "Clear filters", "Filtreleri temizle")}</button></div>}
  </div>;
}
