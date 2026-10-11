import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { localizedAlternates } from "@/lib/seo";
import { lprRelease } from "@/content/lpr-release";

export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{
  const {locale}=await params;
  if(!isLocale(locale)) return {};
  return {title:"IPScans LPR Pro · Windows Beta",description:locale==="tr"?"Yerel plaka tanıma ve kayıt inceleme için Windows değerlendirme sürümü.":"Windows evaluation release for local plate recognition and record review.",alternates:localizedAlternates(locale,"/lpr-pro")};
}

export default async function LprPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  if(!isLocale(locale)) notFound();
  const tr=locale==="tr";
  const features=tr?[
    ["Yerel tanıma","Görüntü ve kayıtlı videoda ONNX plaka tespiti, OCR ve ardışık kare uzlaşması. Görüntüler buluta yüklenmez."],
    ["Kayıt ve inceleme","Plaka arama, gerekçeli düzeltme, CSV raporu, yerel denetim kaydı ve saklama süresi."],
    ["Kontrollü erişim","Yönetici, operatör ve denetçi rolleri; ziyaretçi, personel ve araç izinleri için kural simülatörü."],
    ["Kamera bağlantısı","Hikvision ve Dahua ana akış RTSP profilleri, özel RTSP adresi ve Windows DPAPI ile korunan kamera parolaları."],
  ]:[
    ["Local recognition","ONNX plate detection, OCR and frame consensus on images and recorded video. Images are not uploaded."],
    ["Review and records","Plate search, corrections with reasons, CSV export, local audit log and retention controls."],
    ["Access rules","Administrator, operator and auditor roles; a rule simulator for visitors, staff and vehicle permissions."],
    ["Camera connections","Hikvision and Dahua main-stream RTSP profiles, custom RTSP addresses and Windows DPAPI-protected camera credentials."],
  ];
  return <article lang={tr?"tr":"en"} className="mx-auto max-w-6xl px-5 pb-24 pt-24 sm:px-8">
    <Link href={`/${locale}/download`} className="text-sm text-neutral-400 underline underline-offset-4">← {tr?"Tüm uygulamalar":"All applications"}</Link>
    <div className="mt-12 border-b border-white/15 pb-12">
      <p className="font-mono text-xs uppercase tracking-[.22em] text-neutral-400">WINDOWS x64 / 0.3.0 BETA</p>
      <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-7xl">IPScans LPR Pro<span className="text-neutral-500">.</span></h1>
      <p className="mt-6 max-w-2xl text-xl leading-relaxed text-neutral-300">{tr?"Plakaları yerelde okuyun. Sonuçları inceleyin. Erişim kurallarınızı sınayın.":"Read plates locally. Review results. Test your access rules."}</p>
      <p className="mt-4 max-w-2xl leading-relaxed text-neutral-400">{tr?"Bu sürüm saha değerlendirmesi içindir. Ticari üretim ve fiziksel bariyer kontrolü için hazır değildir. IPscans+ ve IPCast uygulamalarından bağımsızdır.":"This release is for evaluation. It is not ready for commercial production or physical barrier control. It is independent of IPscans+ and IPCast."}</p>
      <div className="mt-8 flex flex-wrap items-center gap-5">
        <a href={lprRelease.url} className="inline-flex min-h-12 items-center rounded-lg bg-white px-6 py-3 font-semibold text-black hover:bg-neutral-200">{tr?"Windows Beta EXE indir":"Download Windows Beta EXE"} ↓</a>
        <a href={lprRelease.releaseUrl} className="underline underline-offset-4">{tr?"Sürüm notları ve kaynak":"Release notes and source"} ↗</a>
      </div>
      <p className="mt-4 text-sm text-neutral-400">{tr?"Windows 10/11 x64 · Python kurulumu gerekmez · Dijital imzasız":"Windows 10/11 x64 · No Python installation required · Unsigned"} · {(lprRelease.bytes/1024/1024).toFixed(1)} MB</p>
    </div>
    <figure className="mt-10 overflow-hidden rounded-xl border border-white/20">
      <Image src="/lpr-pro-preview.png" alt={tr?"Sentetik 34 ABC 123 örneğini inceleyen gerçek LPR Pro arayüzü":"Actual LPR Pro interface reviewing a synthetic 34 ABC 123 example"} width={1440} height={950} className="h-auto w-full" />
      <figcaption className="border-t border-white/15 p-4 text-sm text-neutral-400">{tr?"Gerçek uygulama ekranı; sentetik örnek. Güven puanı saha doğruluk oranı değildir.":"Actual application screenshot; synthetic example. Confidence is not a field accuracy rate."}</figcaption>
    </figure>
    <div className="mt-14 grid gap-8 sm:grid-cols-2">{features.map(([title,body])=><section key={title} className="border-t border-white/20 pt-6"><h2 className="text-2xl font-semibold">{title}</h2><p className="mt-3 leading-relaxed text-neutral-400">{body}</p></section>)}</div>
    <section className="mt-14 rounded-xl border border-white/20 p-6 sm:p-8"><h2 className="text-2xl font-semibold">{tr?"İlk kullanım":"Getting started"}</h2>
      <ol className="mt-5 list-decimal space-y-3 ps-6 text-neutral-300">
        <li>{tr?"EXE’yi çalıştırın ve en az 12 karakterli bir yönetici parolası oluşturun.":"Run the EXE and create an administrator password of at least 12 characters."}</li>
        <li>{tr?"Ayarlar bölümünden yaklaşık 11 MB değerlendirme modelini indirin veya kendi incelenmiş model manifestinizi seçin.":"Download about 11 MB of evaluation models in Settings, or select your own reviewed model manifest."}</li>
        <li>{tr?"Tanıma bölümünde kullanma izniniz olan bir görüntü veya video seçin. Sonuçları Geçmiş bölümünde inceleyin.":"Select an image or video you are authorized to use in Recognition. Review results in History."}</li>
      </ol>
      <p className="mt-6 text-sm leading-relaxed text-neutral-400">{tr?"İndirilen değerlendirme modelleri yalnız çevrimdışı kullanılır; model ve eğitim verisi ticari hak incelemesi tamamlanmamıştır. Canlı RTSP için ticari kullanımı incelenmiş bir model manifesti gerekir.":"Downloaded evaluation models are restricted to offline use; commercial rights review of model weights and training data is pending. Live RTSP requires a commercially reviewed model manifest."}</p>
    </section>
    <section className="mt-12"><h2 className="text-2xl font-semibold">{tr?"Cihaz uyumluluğunun sınırları":"Device compatibility limits"}</h2>
      <p className="mt-4 leading-relaxed text-neutral-400">{tr?"Hikvision/Dahua RTSP adres profilleri mevcuttur; fiziksel model ve firmware doğrulaması yapılmadı. Kameranın kendi ANPR olaylarını alma ve ONVIF keşfi henüz tamamlanmadı. Modbus TCP tek bobin okuma ve Shelly RPC durum sorgulama araçları bulunur; röle çıkışı ve otomatik bariyer açma kapalıdır. Tüm Ethernet rölelerle uyumluluk iddiası yoktur.":"Hikvision/Dahua RTSP address profiles are included; physical models and firmware have not been validated. Native camera ANPR events and ONVIF discovery are not yet implemented. Read-only Modbus TCP single-coil and Shelly RPC status tools are included; relay actuation and automatic barrier opening are disabled. Universal Ethernet relay compatibility is not claimed."}</p>
      <p className="mt-4 leading-relaxed text-neutral-400">{tr?"Gerçek Türk plaka saha veri seti, gece/yağmur testleri, çok kameralı kapasite ölçümü, imzalı ticari lisans sistemi ve kod imzalama tamamlanmadan üretim sürümü olarak kullanmayın.":"Field validation with real Turkish plates, night/rain tests, multi-camera capacity measurements, signed commercial licensing and code signing remain outstanding."}</p>
    </section>
    <details className="mt-10 border-t border-white/20 pt-6"><summary className="cursor-pointer font-semibold">SHA-256</summary><code className="mt-4 block break-all text-sm text-neutral-400">{lprRelease.sha256}</code></details>
  </article>;
}
