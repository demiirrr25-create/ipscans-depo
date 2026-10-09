import { uiText } from '@/i18n/ui';
import Link from 'next/link';
import { NetworkBackdrop } from './NetworkBackdrop';
import { LiveIp } from './LiveIp';
import type { Locale } from '@/i18n/config';
import { toolPath } from '@/lib/tool-routes';
import { scannerApplication } from '@/content/applications';

export function PlatformHero({locale, ipLabel}: {locale: Locale; ipLabel: string}) {
  return <>
    <section className="platform-hero relative overflow-hidden border-b border-white/15 bg-black">
      <NetworkBackdrop />
      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-16 pt-12 sm:px-8 sm:pt-20">
        <div className="flex justify-between gap-4 font-mono text-[11px] uppercase tracking-[.22em] text-neutral-400"><span>IPSCANS / {uiText(locale, "NETWORK INTELLIGENCE", "AĞ KEŞFİ")}</span><span>{uiText(locale, "DESKTOP / WEB", "MASAÜSTÜ / WEB")}</span></div>
        <h1 className="relative z-10 mt-12 max-w-6xl font-[family-name:var(--font-display)] text-[clamp(3.5rem,8.8vw,8.5rem)] font-medium leading-[.98] tracking-[-.06em] [overflow-wrap:anywhere]">{uiText(locale, "Every connection.", "Her bağlantı.")}<br/><span className="text-neutral-400">{uiText(locale, "In focus.", "Net bir bakış.")}</span></h1>
        <div className="mt-12 grid items-end gap-12 lg:grid-cols-[.9fr_1.1fr]">
          <div className="pb-2">
            <p className="max-w-md text-lg leading-relaxed text-neutral-300">{uiText(locale, "Discover your network. Understand your devices. See connections with their evidence. Focused network tools for desktop and web.", "Ağınızı keşfedin. Cihazları tanıyın. Bağlantıları kanıtlarıyla görün. Masaüstü ve web için sade, güçlü ağ araçları.")}</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href={`/${locale}/applications/scanner`} className="btn-primary inline-flex min-h-13 items-center gap-8 rounded-full px-6 font-semibold">IPscans+ {scannerApplication.version} <span>↗</span></Link><Link href={toolPath('speedTest',locale)} className="btn-ghost inline-flex min-h-13 items-center rounded-full px-6">{uiText(locale, "Measure your connection", "Bağlantını ölç")} ↗</Link></div>
            <div className="mt-12 max-w-sm border-t border-white/20 pt-6"><p className="mb-4 font-mono text-[11px] tracking-widest text-neutral-400">{uiText(locale, "YOUR CONNECTION", "SİZİN BAĞLANTINIZ")}</p><LiveIp label={ipLabel}/></div>
          </div>
          <div className="hidden justify-self-end border-s border-white/20 ps-6 font-mono text-xs uppercase tracking-widest text-neutral-400 lg:block"><span className="mb-3 block h-2 w-2 rounded-full bg-white"/>{uiText(locale, "The pattern behind connections", "Bağlantıların ardındaki düzen")}<p className="mt-3 text-[10px] text-neutral-500">{uiText(locale, "NETWORK ARCHITECTURE / VISUAL STUDY", "AĞ MİMARİSİ / GÖRSEL ANLATIM")}</p></div>
        </div>
      </div>
    </section>
    <section className="mx-auto grid max-w-7xl grid-cols-1 border-b border-white/15 px-5 sm:grid-cols-3 sm:px-8">
      {([[uiText(locale, "01", "01"),uiText(locale, "DISCOVER", "KEŞFET"),uiText(locale, "Automatic network detection. Progressive results.", "Otomatik ağ algılama. Anlık cihaz sonuçları.")],[uiText(locale, "02", "02"),uiText(locale, "UNDERSTAND", "ANLA"),uiText(locale, "Device identity from multiple sources.", "Birden fazla kaynaktan cihaz kimliği.")],[uiText(locale, "03", "03"),uiText(locale, "VERIFY", "DOĞRULA"),uiText(locale, "Transparent measurements. Source-backed connections.", "Açık ölçümler. Kaynağı belli bağlantılar.")]]).map(([n,title,body])=><div key={n} className="border-white/15 py-8 sm:px-7 sm:not-last:border-e"><span className="font-mono text-xs text-neutral-500">{n} /</span><h2 className="mt-4 text-sm tracking-widest">{title}</h2><p className="mt-3 text-sm text-neutral-400">{body}</p></div>)}
    </section>
  </>;
}
