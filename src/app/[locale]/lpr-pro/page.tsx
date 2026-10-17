import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { lprRelease } from "@/content/lpr-release";
import { PageShell } from "@/components/PageShell";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: "IPScans LPR Pro · Windows Beta",
    description:
      locale === "tr"
        ? "Yerel plaka tanıma ve kayıt inceleme için Windows değerlendirme sürümü."
        : "Windows evaluation release for local plate recognition and record review.",
    robots:
      locale === "tr" || locale === "en"
        ? undefined
        : { index: false, follow: true },
    alternates: {
      canonical: `/${locale === "tr" ? "tr" : "en"}/lpr-pro`,
      languages: {
        tr: "/tr/lpr-pro",
        en: "/en/lpr-pro",
        "x-default": "/en/lpr-pro",
      },
    },
  };
}

export default async function LprPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const tr = locale === "tr";
  const features = tr
    ? [
        [
          "Yerel tanıma",
          "Görüntü ve kayıtlı videoda ONNX plaka tespiti, OCR ve ardışık kare uzlaşması. Görüntüler buluta yüklenmez.",
        ],
        [
          "Kayıt ve inceleme",
          "Plaka arama, gerekçeli düzeltme, CSV raporu, yerel denetim kaydı ve saklama süresi.",
        ],
        [
          "Kontrollü erişim",
          "Yönetici, operatör ve denetçi rolleri; ziyaretçi, personel ve araç izinleri için kural simülatörü.",
        ],
        [
          "Kamera bağlantısı",
          "Hikvision ve Dahua ana akış RTSP profilleri, özel RTSP adresi ve Windows DPAPI ile korunan kamera parolaları.",
        ],
      ]
    : [
        [
          "Local recognition",
          "ONNX plate detection, OCR and frame consensus on images and recorded video. Images are not uploaded.",
        ],
        [
          "Review and records",
          "Plate search, corrections with reasons, CSV export, local audit log and retention controls.",
        ],
        [
          "Access rules",
          "Administrator, operator and auditor roles; a rule simulator for visitors, staff and vehicle permissions.",
        ],
        [
          "Camera connections",
          "Hikvision and Dahua main-stream RTSP profiles, custom RTSP addresses and Windows DPAPI-protected camera credentials.",
        ],
      ];

  const subtitle = tr
    ? "Plakaları yerelde okuyun. Sonuçları inceleyin. Erişim kurallarınızı sınayın."
    : "Read plates locally. Review results. Test your access rules.";

  return (
    <PageShell title="IPScans LPR Pro" subtitle={subtitle}>
      <article lang={tr ? "tr" : "en"} className="space-y-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/${locale}/download`}
            className="button button-compact button-secondary"
          >
            <span>← {tr ? "Tüm uygulamalar" : "All applications"}</span>
          </Link>
          <span className="font-mono text-xs uppercase tracking-[.22em] text-neutral-400">
            WINDOWS x64 / 0.3.1 BETA
          </span>
        </div>

        <div className="agy-surface-card p-7 sm:p-10">
          <p className="body max-w-3xl text-neutral-300">
            {tr
              ? "Bu sürüm saha değerlendirmesi içindir. Ticari üretim ve fiziksel bariyer kontrolü için hazır değildir. IPscans+ ve IPCast uygulamalarından bağımsızdır."
              : "This release is for evaluation. It is not ready for commercial production or physical barrier control. It is independent of IPscans+ and IPCast."}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a href={lprRelease.url} className="button button-primary">
              <span>
                {tr
                  ? "Windows uygulamasını indir · EXE"
                  : "Download Windows app · EXE"}{" "}
                ↓
              </span>
            </a>
            <a href={lprRelease.releaseUrl} className="button button-secondary">
              <span>
                {tr ? "Sürüm notları ve kaynak" : "Release notes and source"} ↗
              </span>
            </a>
          </div>
          <p className="mt-5 text-sm text-neutral-400">
            {tr
              ? "Windows 10/11 x64 için 118,3 MB taşınabilir değerlendirme uygulaması. İmzalanmamıştır; dosyanın kaydedileceği yeri tarayıcınız belirler."
              : "118.3 MB portable evaluation app for Windows 10/11 x64. It is unsigned; your browser controls where the file is saved."}
          </p>
        </div>

        <figure className="feature-media-card">
          <div className="feature-media-card__bar">
            <span className="feature-media-card__title">
              IPScans LPR Pro v{lprRelease.version} · Recognition Lab
            </span>
            <span className="feature-media-card__tag">
              WINDOWS 10/11 · x64 · OFFLINE ONNX INFERENCE
            </span>
          </div>
          <div className="feature-media-card__viewport">
            <Image
              src="/lpr-pro-preview.png"
              alt={
                tr
                  ? "Sentetik 34 ABC 123 örneğini inceleyen gerçek LPR Pro arayüzü"
                  : "Actual LPR Pro interface reviewing a synthetic 34 ABC 123 example"
              }
              width={1440}
              height={950}
              className="feature-image"
              priority
            />
          </div>
          <figcaption className="border-t border-white/10 px-6 py-4 text-sm text-neutral-400">
            {tr
              ? "Gerçek uygulama ekranı; sentetik örnek. Güven puanı saha doğruluk oranı değildir."
              : "Actual application screenshot; synthetic example. Confidence is not a field accuracy rate."}
          </figcaption>
        </figure>

        <div className="grid gap-6 sm:grid-cols-2">
          {features.map(([title, body], idx) => (
            <section key={title} className="agy-surface-card p-7">
              <span className="agy-eyebrow">0{idx + 1} / LPR PRO</span>
              <h2 className="heading-5 mt-4">{title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                {body}
              </p>
            </section>
          ))}
        </div>

        <section className="agy-surface-card p-7 sm:p-10">
          <h2 className="heading-4">
            {tr ? "İlk kullanım" : "Getting started"}
          </h2>
          <ol className="mt-6 list-decimal space-y-3 ps-6 text-neutral-200">
            <li>
              {tr
                ? "EXE dosyasını indirmeler klasörünüzden çalıştırın; ilk açılışta en az 12 karakterli bir yönetici parolası oluşturun."
                : "Run the EXE from your downloads folder; create an administrator password of at least 12 characters at first launch."}
            </li>
            <li>
              {tr
                ? "Ayarlar bölümünden yaklaşık 11 MB değerlendirme modelini indirin veya kendi incelenmiş model manifestinizi seçin."
                : "Download about 11 MB of evaluation models in Settings, or select your own reviewed model manifest."}
            </li>
            <li>
              {tr
                ? "Tanıma bölümünde kullanma izniniz olan bir görüntü veya video seçin. Sonuçları Geçmiş bölümünde inceleyin."
                : "Select an image or video you are authorized to use in Recognition. Review results in History."}
            </li>
          </ol>
          <p className="mt-6 text-sm leading-relaxed text-neutral-400">
            {tr
              ? "İndirilen değerlendirme modelleri yalnız çevrimdışı kullanılır; model ve eğitim verisi ticari hak incelemesi tamamlanmamıştır. Canlı RTSP için ticari kullanımı incelenmiş bir model manifesti gerekir."
              : "Downloaded evaluation models are restricted to offline use; commercial rights review of model weights and training data is pending. Live RTSP requires a commercially reviewed model manifest."}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-neutral-400">
            {tr
              ? "QtCore DLL uyarısı devam ederse Windows için resmi Microsoft Visual C++ x64 paketini yükleyip uygulamayı yeniden açın."
              : "If a QtCore DLL error persists, install Microsoft's official Visual C++ x64 package for Windows and reopen the app."}{" "}
            <a
              className="text-white underline underline-offset-4"
              href="https://aka.ms/vs/17/release/vc_redist.x64.exe"
            >
              {tr ? "Microsoft x64 paketi" : "Microsoft x64 package"} ↗
            </a>
          </p>
        </section>

        <section className="agy-surface-card p-7 sm:p-10">
          <h2 className="heading-5">
            {tr
              ? "Cihaz uyumluluğunun sınırları"
              : "Device compatibility limits"}
          </h2>
          <p className="mt-4 leading-relaxed text-neutral-300">
            {tr
              ? "Hikvision/Dahua RTSP adres profilleri mevcuttur; fiziksel model ve firmware doğrulaması yapılmadı. Kameranın kendi ANPR olaylarını alma ve ONVIF keşfi henüz tamamlanmadı. Modbus TCP tek bobin okuma ve Shelly RPC durum sorgulama araçları bulunur; röle çıkışı ve otomatik bariyer açma kapalıdır. Tüm Ethernet rölelerle uyumluluk iddiası yoktur."
              : "Hikvision/Dahua RTSP address profiles are included; physical models and firmware have not been validated. Native camera ANPR events and ONVIF discovery are not yet implemented. Read-only Modbus TCP single-coil and Shelly RPC status tools are included; relay actuation and automatic barrier opening are disabled. Universal Ethernet relay compatibility is not claimed."}
          </p>
          <p className="mt-4 leading-relaxed text-neutral-400">
            {tr
              ? "Gerçek Türk plaka saha veri seti, gece/yağmur testleri, çok kameralı kapasite ölçümü, imzalı ticari lisans sistemi ve kod imzalama tamamlanmadan üretim sürümü olarak kullanmayın."
              : "Field validation with real Turkish plates, night/rain tests, multi-camera capacity measurements, signed commercial licensing and code signing remain outstanding."}
          </p>
          <p className="mt-6 break-all border-t border-white/10 pt-5 font-mono text-xs text-neutral-400">
            {tr ? "Sürüm dosyası SHA-256" : "Release file SHA-256"}:{" "}
            {lprRelease.sha256}
          </p>
        </section>
      </article>
    </PageShell>
  );
}
