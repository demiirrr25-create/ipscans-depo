import Image from "next/image";
import type { Locale } from "@/i18n/config";
import { scannerApplication } from "@/content/applications";

export function ScannerV4({ locale, primary = false }: { locale: Locale; primary?: boolean }) {
  const tr = locale === "tr";
  const Heading = primary ? "h1" : "h2";
  const features = tr ? [
    ["01 / MOTOR", "Daha az bekle. Daha çok gör.", "Windows yerel ICMP ve paralel TCP keşfi. Her IP için ayrı ping süreci açmadan, sınırlandırılmış kaynak kullanımıyla."],
    ["02 / KONTROL", "Ağınıza göre bir profil.", "Hızlı, Dengeli, Ayrıntılı ve Hassas ağ. Özel servis portları, birden fazla alt ağ ve tarama dışında bırakılan adresler."],
    ["03 / GÖRÜNÜRLÜK", "Her gözlemin bir kaynağı var.", "Canlı cihaz, servis ve hız sayaçları. ONVIF, mDNS, SSDP ve yetkili SNMP kanıtları; ortak aramalı cihaz tablosu ve ağ haritası."],
    ["04 / İŞ AKIŞI", "Bul. Süz. Paylaş.", "Port, üretici, protokol ve alt ağa göre birleşik arama. Yerel geçmiş, CSV/JSON ve yazdırılabilir bağımsız HTML raporu."],
  ] : [
    ["01 / ENGINE", "Less waiting. More visibility.", "Native Windows ICMP and parallel TCP discovery. No separate ping process for each IPv4 host, with bounded resource use."],
    ["02 / CONTROL", "A profile for your network.", "Quick, Balanced, Detailed and Sensitive network profiles. Custom service ports, multiple subnets and explicit address exclusions."],
    ["03 / VISIBILITY", "Every observation has a source.", "Live device, service and throughput counters. ONVIF, mDNS, SSDP and authorized SNMP evidence across a searchable table and network map."],
    ["04 / WORKFLOW", "Discover. Filter. Share.", "Combine port, vendor, protocol and subnet searches. Local history, CSV/JSON and standalone, printable HTML reports."],
  ];
  return <section className="my-12 overflow-hidden rounded-3xl border border-emerald-200/20 bg-[#0b1319]" aria-labelledby="scanner-v4-title">
    <div className="grid gap-8 p-7 sm:p-12 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <p className="font-mono text-xs tracking-[0.2em] text-emerald-200">IPSCANS+ 4.0 / NETWORK OBSERVATORY</p>
        <Heading id="scanner-v4-title" className="mt-6 max-w-2xl text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">
          {tr ? "Ağınızın tamamı. Net bir bakış." : "Your whole network. A clearer view."}
        </Heading>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300">{tr
          ? "Keşiften cihaz yönetimine, tek bir Windows çalışma alanı. Hız için yeniden tasarlanan motor, kontrol için açık seçenekler."
          : "From discovery to device management, one Windows workspace. An engine redesigned for speed, with explicit controls for your scan."}</p>
        <div className="mt-7 flex flex-wrap items-center gap-5">
          <a href={scannerApplication.downloadUrl} className="inline-flex min-h-12 items-center rounded-xl bg-emerald-200 px-6 font-semibold text-slate-950 transition-colors hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-200">{tr ? 'Windows için indir' : 'Download for Windows'} ↓</a>
          <a href={scannerApplication.portableUrl} className="inline-flex min-h-11 items-center text-sm text-slate-300 underline underline-offset-4">{tr ? 'Taşınabilir EXE' : 'Portable EXE'} ↗</a>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 self-end">
        {[["4", tr ? "tarama profili" : "scan profiles"], ["256", tr ? "özel TCP portuna kadar" : "custom TCP ports max"],
          ["IPv4 + IPv6", tr ? "sınırlandırılmış hedefler" : "bounded targets"], ["HTML", tr ? "paylaşılabilir rapor" : "shareable report"]].map(([value, label]) =>
          <div key={value} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><p className="text-2xl font-semibold text-emerald-100">{value}</p><p className="mt-2 text-xs text-slate-400">{label}</p></div>)}
      </div>
    </div>
    <figure className="px-4 sm:px-8">
      <Image src="/scanner-v4-preview.png" width={1440} height={900} sizes="(max-width: 1280px) 100vw, 1200px"
        alt={tr ? "IPscans+ 4.0 masaüstü arayüzü, örnek veriyle cihaz tablosu ve tarama profilleri" : "IPscans+ 4.0 desktop interface showing scan profiles and a device table with example data"}
        className="h-auto w-full rounded-xl border border-white/10" />
      <figcaption className="py-3 text-center text-xs text-slate-400">{tr ? "Uygulamanın gerçek arayüzü • Örnek veri; canlı ağ taraması değildir." : "Actual application interface • Example data, not a live network scan."}</figcaption>
    </figure>
    <div className="grid gap-px bg-white/10 md:grid-cols-2">
      {features.map(([code, title, body]) => <div key={code} className="bg-[#0b1319] p-7 sm:p-10">
        <p className="font-mono text-xs tracking-widest text-emerald-200/80">{code}</p><h3 className="mt-4 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-relaxed text-slate-400">{body}</p>
      </div>)}
    </div>
    <div className="border-t border-white/10 px-7 py-6 sm:px-10">
      <p className="text-sm text-slate-300">{tr ? "Aramayı birleştirin" : "Combine your search"}</p>
      <code className="mt-3 block overflow-x-auto rounded-lg bg-black/30 p-4 text-sm text-emerald-100">ip:192.168.1.0/24 port:443 -type:Unknown</code>
      <p className="mt-4 text-xs leading-relaxed text-slate-400">{tr
        ? "Hızlı profil yavaş yanıt veren cihazları atlayabilir. Tarama hızı ağınıza, seçilen profile ve cihaz yanıtlarına bağlıdır. Windows 10/11 x64; yerel ağ keşfi masaüstü uygulamasında çalışır."
        : "Quick mode can miss slow responders. Scan speed depends on your network, profile and device responses. Windows 10/11 x64; local discovery runs in the desktop app."}</p>
    </div>
  </section>;
}
