import { uiText } from '@/i18n/ui';
import type { Locale } from '@/i18n/config';
import { scannerApplication } from '@/content/applications';
import { ProductPreview } from './ProductPreview';

export function ScannerV4({locale,primary=false}: {locale:Locale;primary?:boolean}) {
  const Heading=primary?'h1':'h2', FeatureHeading=primary?'h2':'h3';
  const features=[[uiText(locale, "01 / AUTOMATIC DISCOVERY", "01 / OTOMATİK KEŞİF"),uiText(locale, "Open. Scan. Understand.", "Açın. Tarayın. Görün."),uiText(locale, "The adapter supplies your range. A bounded engine adjusts concurrency and timeouts from observed responses. Results arrive before the scan completes.", "Ağ aralığı adaptörden alınır. Sınırlandırılmış motor, eşzamanlılığı ve zaman aşımını yanıtlara göre ayarlar. Sonuçlar tarama bitmeden görünür.")],[uiText(locale, "02 / DEVICE IDENTITY", "02 / CİHAZ KİMLİĞİ"),uiText(locale, "More than a single clue.", "Tek ipucundan fazlası."),uiText(locale, "ONVIF, mDNS, UPnP, service responses contribute evidence. Conflicting or insufficient identities remain unknown.", "ONVIF, mDNS, UPnP, servis yanıtları birlikte değerlendirilir. Çelişen veya yetersiz kanıt, bilinmeyen olarak kalır.")],[uiText(locale, "03 / NETWORK MAP", "03 / NETWORK MAP"),uiText(locale, "The bigger picture.", "Bağlantıların büyük resmi."),uiText(locale, "A full-canvas vertical hierarchy. Confirmed LLDP/CDP adjacency is solid; inferred forwarding paths are dashed. Unresolved devices have their own group.", "Tam alanı kullanan dikey harita. Doğrulanmış LLDP/CDP komşuluğu düz; çıkarımsal yönlendirme yolu kesikli. Belirsiz cihazlar ayrı grupta.")],[uiText(locale, "04 / FOCUS", "04 / ODAK"),uiText(locale, "Just two tabs.", "Yalnızca iki sekme."),uiText(locale, "SCAN and NETWORK MAP. Shared search, double-click access to the device web interface in your default browser and custom device names and PDF/HTML/CSV/JSON reports. No manual profiles or settings page.", "SCAN ve NETWORK MAP. Ortak arama, çift tıklamayla varsayılan tarayıcıda cihazın web arayüzü ve özel cihaz adları ve PDF/HTML/CSV/JSON raporları. Manuel profil seçimi veya ayar sayfası yok.")]];
  return <section className="my-12" aria-labelledby="scanner-v4-title">
    <div className="mb-12 grid items-end gap-10 lg:grid-cols-[1.3fr_.7fr]">
      <div><p className="font-mono text-xs tracking-[.2em] text-neutral-400">IPSCANS+ {scannerApplication.version} / {uiText(locale, "NETWORK INTELLIGENCE", "AĞ KEŞFİ")}</p>
        <Heading id="scanner-v4-title" className="mt-7 text-5xl font-medium leading-[1.02] tracking-[-.06em] sm:text-7xl">{uiText(locale, "Complex networks.", "Karmaşık ağlar.")}<br/><span className="text-neutral-400">{uiText(locale, "A focused workspace.", "Sade bir deneyim.")}</span></Heading>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-neutral-300">{uiText(locale, "Discover devices, understand their identity and map your network with evidence. A redesigned monochrome network console for Windows.", "Cihazları keşfedin, kimliklerini anlayın ve ağınızı kanıtlarıyla haritalayın. Windows için baştan tasarlanan monokrom ağ konsolu.")}</p>
      </div>
      <div className="border-s border-white/20 ps-7"><p className="font-mono text-xs text-neutral-400">WINDOWS 10 / 11 · x64</p>
        <a href={scannerApplication.downloadUrl} className="btn-primary mt-5 inline-flex min-h-13 items-center justify-between gap-8 rounded-full px-7 font-semibold">{uiText(locale, "Download for Windows", "Windows için indir")} ↓</a>
        <a href={scannerApplication.portableUrl} className="mt-4 block min-h-11 py-3 text-sm text-neutral-300 underline underline-offset-4">{uiText(locale, "Portable EXE", "Taşınabilir EXE")} ↗</a>
        <p className="mt-2 text-xs leading-relaxed text-neutral-400">{uiText(locale, "Local network discovery runs in the desktop application.", "Yerel ağ keşfi masaüstü uygulamasında çalışır.")}</p>
      </div>
    </div>
    <ProductPreview locale={locale}/>
    <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/15 md:grid-cols-2">
      {features.map(([code,title,body])=><div key={code} className="bg-black p-7 sm:p-10"><p className="font-mono text-xs tracking-widest text-neutral-400">{code}</p><FeatureHeading className="mt-6 text-2xl font-medium tracking-tight">{title}</FeatureHeading><p className="mt-4 text-sm leading-relaxed text-neutral-400">{body}</p></div>)}
    </div>
    <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-white/15 p-6"><p className="text-sm text-neutral-300">{uiText(locale, "One search. The same device, the same evidence.", "Birleştirilmiş arama. Aynı cihaz, aynı kanıt.")}</p><code className="max-w-full overflow-x-auto text-sm">ip:192.168.1.0/24 port:443 -type:Unknown</code></div>
  </section>;
}
