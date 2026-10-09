import type { Locale } from '@/i18n/config';
import { scannerApplication } from '@/content/applications';
import { ProductPreview } from './ProductPreview';

export function ScannerV4({locale,primary=false}: {locale:Locale;primary?:boolean}) {
  const tr=locale==='tr', Heading=primary?'h1':'h2';
  const features=tr?[
    ['01 / OTOMATİK KEŞİF','Açın. Tarayın. Görün.','Ağ aralığı adaptörden alınır. Sınırlandırılmış motor, eşzamanlılığı ve zaman aşımını yanıtlara göre ayarlar. Sonuçlar tarama bitmeden görünür.'],
    ['02 / CİHAZ KİMLİĞİ','Tek ipucundan fazlası.','ONVIF, mDNS, UPnP, servis yanıtları ve yetkili SNMP birlikte değerlendirilir. Çelişen veya yetersiz kanıt, bilinmeyen olarak kalır.'],
    ['03 / NETWORK MAP','Bağlantıların büyük resmi.','Tam alanı kullanan dikey harita. Doğrulanmış LLDP/CDP komşuluğu düz; çıkarımsal yönlendirme yolu kesikli. Belirsiz cihazlar ayrı grupta.'],
    ['04 / ODAK','Yalnızca iki sekme.','SCAN ve NETWORK MAP. Ortak arama, çift tıklamayla cihaz detayları ve HTML/CSV/JSON raporları. Manuel profil seçimi veya ayar sayfası yok.'],
  ]:[
    ['01 / AUTOMATIC DISCOVERY','Open. Scan. Understand.','The adapter supplies your range. A bounded engine adjusts concurrency and timeouts from observed responses. Results arrive before the scan completes.'],
    ['02 / DEVICE IDENTITY','More than a single clue.','ONVIF, mDNS, UPnP, service responses and authorized SNMP contribute evidence. Conflicting or insufficient identities remain unknown.'],
    ['03 / NETWORK MAP','The bigger picture.','A full-canvas vertical hierarchy. Confirmed LLDP/CDP adjacency is solid; inferred forwarding paths are dashed. Unresolved devices have their own group.'],
    ['04 / FOCUS','Just two tabs.','SCAN and NETWORK MAP. Shared search, double-click device details and HTML/CSV/JSON reports. No manual profiles or settings page.'],
  ];
  return <section className="my-12" aria-labelledby="scanner-v4-title">
    <div className="mb-12 grid items-end gap-10 lg:grid-cols-[1.3fr_.7fr]">
      <div><p className="font-mono text-xs tracking-[.2em] text-neutral-400">IPSCANS+ 4.1 / NETWORK INTELLIGENCE</p>
        <Heading id="scanner-v4-title" className="mt-7 text-5xl font-medium leading-[1.02] tracking-[-.06em] sm:text-7xl">{tr?'Karmaşık ağlar.':'Complex networks.'}<br/><span className="text-neutral-400">{tr?'Sade bir deneyim.':'A focused workspace.'}</span></Heading>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-neutral-300">{tr?'Cihazları keşfedin, kimliklerini anlayın ve ağınızı kanıtlarıyla haritalayın. Windows için baştan tasarlanan monokrom ağ konsolu.':'Discover devices, understand their identity and map your network with evidence. A redesigned monochrome network console for Windows.'}</p>
      </div>
      <div className="border-s border-white/20 ps-7"><p className="font-mono text-xs text-neutral-400">WINDOWS 10 / 11 · x64</p>
        <a href={scannerApplication.downloadUrl} className="btn-primary mt-5 inline-flex min-h-13 items-center justify-between gap-8 rounded-full px-7 font-semibold">{tr?'Windows için indir':'Download for Windows'} ↓</a>
        <a href={scannerApplication.portableUrl} className="mt-4 block min-h-11 py-3 text-sm text-neutral-300 underline underline-offset-4">{tr?'Taşınabilir EXE':'Portable EXE'} ↗</a>
        <p className="mt-2 text-xs leading-relaxed text-neutral-400">{tr?'Yerel ağ keşfi masaüstü uygulamasında çalışır.':'Local network discovery runs in the desktop application.'}</p>
      </div>
    </div>
    <ProductPreview tr={tr}/>
    <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/15 md:grid-cols-2">
      {features.map(([code,title,body])=><div key={code} className="bg-black p-7 sm:p-10"><p className="font-mono text-xs tracking-widest text-neutral-400">{code}</p><h3 className="mt-6 text-2xl font-medium tracking-tight">{title}</h3><p className="mt-4 text-sm leading-relaxed text-neutral-400">{body}</p></div>)}
    </div>
    <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-white/15 p-6"><p className="text-sm text-neutral-300">{tr?'Birleştirilmiş arama. Aynı cihaz, aynı kanıt.':'One search. The same device, the same evidence.'}</p><code className="max-w-full overflow-x-auto text-sm">ip:192.168.1.0/24 port:443 -type:Unknown</code></div>
  </section>;
}
