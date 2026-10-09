"use client";
import Image from 'next/image';
import { useState } from 'react';
export function ProductPreview({tr}: {tr:boolean}) {
  const [map,setMap]=useState(false);
  return <figure className="overflow-hidden rounded-2xl border border-white/20 bg-black">
    <div className="flex flex-wrap items-center gap-2 border-b border-white/15 p-3">
      <button onClick={()=>setMap(false)} aria-pressed={!map} className="min-h-11 rounded-full px-5 text-xs aria-pressed:bg-white aria-pressed:text-black">SCAN</button>
      <button onClick={()=>setMap(true)} aria-pressed={map} className="min-h-11 rounded-full px-5 text-xs aria-pressed:bg-white aria-pressed:text-black">NETWORK MAP</button>
      <span className="ms-auto px-3 font-mono text-[10px] text-neutral-400">WINDOWS / v4.2</span>
    </div>
    <Image src={map?'/scanner-v42-map.png':'/scanner-v42-preview.png'} width={1440} height={900} sizes="(max-width: 1280px) 100vw, 1200px" alt={tr?`IPscans+ 4.2 gerçek ${map?'ağ haritası':'tarama'} arayüzü; örnek veriler`:`Actual IPscans+ 4.2 ${map?'network map':'scan'} interface; example data`} className="h-auto w-full"/>
    <figcaption className="border-t border-white/15 p-4 text-center text-xs text-neutral-400">{tr?'Gerçek uygulama arayüzü · Örnek veri; canlı tarama değildir.':'Actual application interface · Example data, not a live scan.'}</figcaption>
  </figure>;
}
