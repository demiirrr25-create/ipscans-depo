"use client";
import { useState } from 'react';

const nodes = [
  {name:'Gateway',x:280,y:45,detail:['Ağ geçidi, işletim sisteminin adaptör bilgisinden alınır.','The gateway comes from the operating system’s adapter information.']},
  {name:'Switch',x:280,y:150,detail:['LLDP/CDP komşuluğu düz çizgiyle; yalnızca yönlendirme kanıtı kesikli çizgiyle gösterilir.','LLDP/CDP adjacency uses a solid line; forwarding evidence alone uses a dashed line.']},
  {name:'Camera',x:95,y:285,detail:['ONVIF duyuruları ve servis yanıtları birlikte değerlendirilir. Port 554 tek başına kamera kanıtı değildir.','ONVIF announcements and service responses are combined. Port 554 alone does not identify a camera.']},
  {name:'Workstation',x:280,y:285,detail:['İsimler ve hizmetler keşif kaynaklarıyla birlikte gösterilir; seri numarası tahmin edilmez.','Names and services retain their discovery sources. Serial numbers are never guessed.']},
  {name:'Unresolved',x:465,y:285,detail:['Fiziksel bağlantısı bilinmeyen cihazlar ayrı tutulur.','Devices with unknown physical attachment stay separate.']},
];
export function NetworkExperience({tr=false}: {tr?: boolean}) {
  const [selected,setSelected]=useState(1);
  const [motion,setMotion]=useState(false);
  return <div className={`network-experience ${motion?'is-animated':''}`}>
    <div className="flex items-center justify-between gap-4 border-b border-white/15 px-5 py-4 font-mono text-[11px] uppercase tracking-widest text-neutral-400">
      <span>{tr?'ETKİLEŞİMLİ MİMARİ / ÖRNEK':'INTERACTIVE ARCHITECTURE / EXAMPLE'}</span>
      <button onClick={()=>setMotion(!motion)} aria-pressed={motion} className="min-h-10 shrink-0 text-white">{motion?(tr?'Durdur Ⅱ':'Pause Ⅱ'):(tr?'Canlandır ▷':'Animate ▷')}</button>
    </div>
    <svg viewBox="0 0 560 345" className="w-full" role="img" aria-label={tr?'Örnek dikey ağ yapısı; canlı tarama değil':'Illustrative vertical network structure; not a live scan'}>
      <defs><radialGradient id="network-glow"><stop stopColor="white" stopOpacity=".08"/><stop offset="1" stopColor="black" stopOpacity="0"/></radialGradient></defs>
      <circle cx="280" cy="155" r="220" fill="url(#network-glow)"/>
      <g fill="none" stroke="#555" strokeWidth="1"><path className="flow-path" d="M280 67V127"/><path className="flow-path" d="M280 172V205Q280 220 265 220H110Q95 220 95 235V262"/><path className="flow-path" d="M280 172V262" strokeDasharray="4 5"/></g>
      {nodes.map((node,i)=><g key={node.name} transform={`translate(${node.x} ${node.y})`}>
        <rect x="-70" y="-22" width="140" height="44" rx="8" fill={selected===i?'#fff':'#0b0b0b'} stroke={selected===i?'#fff':'#444'} strokeDasharray={i===4?'3 4':undefined}/>
        <text textAnchor="middle" y="5" fill={selected===i?'#000':'#ddd'} fontSize="13" fontFamily="monospace">{node.name}</text>
      </g>)}
    </svg>
    <div className="flex flex-wrap gap-2 px-5" role="group" aria-label={tr?'Keşif katmanlarını incele':'Explore discovery layers'}>
      {nodes.map((node,i)=><button key={node.name} aria-pressed={selected===i} onClick={()=>setSelected(i)} className="min-h-10 rounded-full border border-white/15 px-3 font-mono text-xs text-neutral-300 transition-colors aria-pressed:border-white aria-pressed:bg-white aria-pressed:text-black">{node.name}</button>)}
    </div>
    <p className="min-h-24 px-5 py-5 text-sm leading-relaxed text-neutral-300" aria-live="polite">{nodes[selected].detail[tr?0:1]}</p>
  </div>;
}
