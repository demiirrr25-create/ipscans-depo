"use client";
import { uiText } from '@/i18n/ui';
import type { Locale } from '@/i18n/config';
import Image from 'next/image';
import { useState } from 'react';
export function ProductPreview({locale}: {locale:Locale}) {
  const [map,setMap]=useState(false);
  return <figure className="overflow-hidden rounded-2xl border border-white/20 bg-black">
    <div className="flex flex-wrap items-center gap-2 border-b border-white/15 p-3">
      <button onClick={()=>setMap(false)} aria-pressed={!map} className="min-h-11 rounded-full px-5 text-xs aria-pressed:bg-white aria-pressed:text-black">{uiText(locale, "Scan", "Tarama")}</button>
      <button onClick={()=>setMap(true)} aria-pressed={map} className="min-h-11 rounded-full px-5 text-xs aria-pressed:bg-white aria-pressed:text-black">{uiText(locale, "Network map", "Ağ haritası")}</button>
      <span className="ms-auto px-3 font-mono text-[10px] text-neutral-400">WINDOWS / v4.3</span>
    </div>
    <Image src={map?'/scanner-v43-map.png':'/scanner-v43-preview.png'} width={1440} height={900} sizes="(max-width: 1280px) 100vw, 1200px" alt={uiText(locale, "IPScans+ application interface with example devices", "Örnek cihazlarla IPScans+ uygulama arayüzü")} className="h-auto w-full"/>
    <figcaption className="border-t border-white/15 p-4 text-center text-xs text-neutral-400">{uiText(locale, "Actual application interface · Example data, not a live scan.", "Gerçek uygulama arayüzü · Örnek veri; canlı tarama değildir.")}</figcaption>
  </figure>;
}
