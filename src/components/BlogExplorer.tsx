"use client";
import Link from 'next/link';
import { useState } from 'react';

export type BlogCard = {slug:string;title:string;excerpt:string;category:string;date:string;minutes:number};
export function BlogExplorer({items,locale}:{items:BlogCard[];locale:string}) {
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('');
  const tr=locale==='tr';
  const categories=[...new Set(items.map(p=>p.category))];
  const normalized=query.trim().toLocaleLowerCase(locale);
  const filtered=items.filter(p=>(!category||p.category===category)&&`${p.title} ${p.excerpt} ${p.category}`.toLocaleLowerCase(locale).includes(normalized));
  return <div>
    <div className="grid gap-6 border-b border-white/15 pb-8 md:grid-cols-[1fr_320px]">
      <div><p className="font-mono text-xs uppercase tracking-widest text-neutral-400">FIELD NOTES / {items.length}</p><h2 className="mt-3 text-2xl tracking-tight">{tr?'Bir soruyla başlayın.':'Start with a question.'}</h2></div>
      <label className="self-end"><span className="mb-2 block text-xs text-neutral-400">{tr?'Rehberlerde ara':'Search guides'}</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={tr?'DNS, kurulum, gecikme…':'DNS, installation, latency…'} className="min-h-12 w-full rounded-full border border-white/25 bg-neutral-950 px-5 text-sm outline-none focus:border-white" /></label>
    </div>
    <div className="my-6 flex flex-wrap gap-2" role="group" aria-label={tr?'Konu filtreleri':'Topic filters'}>
      {['',...categories].map(c=><button key={c} type="button" onClick={()=>setCategory(c)} aria-pressed={category===c} className="min-h-11 rounded-full border border-white/20 px-4 text-sm text-neutral-300 transition-colors aria-pressed:border-white aria-pressed:bg-white aria-pressed:text-black">{c||(tr?'Tümü':'All')} <span className="ms-1 opacity-60">{c?items.filter(p=>p.category===c).length:items.length}</span></button>)}
    </div>
    <p role="status" className="mb-6 font-mono text-xs text-neutral-400">{filtered.length} {tr?'rehber bulundu':'guides found'}</p>
    <div className="grid gap-px border border-white/15 bg-white/15 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((p,i)=><Link key={p.slug} href={`/${locale}/blog/${p.slug}`} className="blog-card group flex min-h-72 flex-col bg-black p-7 transition-colors hover:bg-neutral-900 focus-visible:bg-neutral-900">
        <div className="flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-widest text-neutral-400"><span>{p.category}</span><span>{String(i+1).padStart(2,'0')} ↗</span></div>
        <h3 className="mt-8 text-xl font-medium leading-snug tracking-tight">{p.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400">{p.excerpt}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-8 font-mono text-[11px] text-neutral-500"><time dateTime={p.date}>{p.date}</time><span>{p.minutes} {tr?'dk okuma':'min read'}</span></div>
      </Link>)}
    </div>
    {filtered.length===0&&<div className="py-16 text-center"><p className="text-neutral-400">{tr?'Bu aramayla eşleşen rehber bulunamadı.':'No guides match your search.'}</p><button type="button" className="mt-5 min-h-11 underline underline-offset-4" onClick={()=>{setQuery('');setCategory('');}}>{tr?'Filtreleri temizle':'Clear filters'}</button></div>}
  </div>;
}
