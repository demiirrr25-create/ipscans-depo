import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationSlideshow } from "@/components/ApplicationSlideshow";
import { PageShell } from "@/components/PageShell";
import { getLprSlides } from "@/content/application-slides";
import { lprRelease } from "@/content/lpr-release";
import { isLocale } from "@/i18n/config";
import { localizedAlternates } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const tr = locale === "tr";
  return {
    title: `IPScans LPR Pro · ${tr ? "Windows Plaka Tanıma ve Operatör Konsolu" : "Windows License Plate Recognition & Operator Workspace"}`,
    description: tr
      ? "Windows 10/11 x64 için yerel plaka okuma, 5 bölmeli canlı operatör çalışma alanı, bağımsız kalibrasyon çizgileri, blok/daire araç kütüğü ve şifreli olay kuyruğu."
      : "Local license plate recognition for Windows 10/11 x64 with 5-page live operator workspace, independent calibration lines, vehicle/resident registry, and durable encrypted event delivery.",
    alternates: localizedAlternates(locale, "/lpr-pro"),
  };
}

export default async function LprProPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const tr = locale === "tr";
  const features = tr
    ? [
        [
          "5 bölmeli canlı operatör çalışma alanı",
          "Canlı İzleme (Live Dashboard), Kameralar, Araçlar ve Sakinler, Geçiş Kayıtları ve Ayarlar. Blok, daire, sakin ve çoklu yetkili araç sahibi kayıtları ile CSV/Excel içe ve dışa aktarma.",
        ],
        [
          "Bağımsız kalibrasyon ve bölge tanımlama",
          "Ayrı tetik ve okuma çizgileri; dikdörtgen ve çokgen bölgeler, yön filtreleri, tekrar pencereleri ve gecikmeli plaka eşleştirme. Gerekçeli düzeltme geçmişi ve kanıt kareleri.",
        ],
        [
          "Kesintisiz yerel olay kuyruğu",
          "Geçici veritabanı kesintilerinde şifreli yerel teslimat günlüğü ve otomatik yeniden deneme; kayıtlı/yabancı araç, blok, daire ve kamera bazlı gelişmiş filtreleme.",
        ],
        [
          "ONVIF medya keşfi ve donanım hızlandırma",
          "IPv4 ONVIF kamera keşfi, medya profili seçimi, D3D11 otomatik donanım çözme (CPU geri dönüşlü) ve izole kamera yakalama süreçleri.",
        ],
        [
          "Bölgesel OCR ve karakter analizi",
          "Görüntü, MP4/AVI video ve canlı RTSP kaynakları; karakter bazlı güven puanları, plaka kırpımı ve SHA-256 doğrulamalı yerel ONNX modelleri.",
        ],
        [
          "DPAPI kasa ve doğrulanmış yedekleme",
          "Kamera parolaları ve teslimat günlüğü etkin Windows kullanıcı hesabına DPAPI ile bağlanır. Yöneticiye özel bütünlük doğrulamalı SQLite yedekleme ve 6 adımlı kurulum sihirbazı.",
        ],
      ]
    : [
        [
          "5-page live operator workspace",
          "Live Dashboard, Cameras, Vehicles & Residents, Events, and Settings. Block, unit, resident, and multi-owner vehicle registry with CSV/XLSX import and export.",
        ],
        [
          "Independent calibration & polygon regions",
          "Separate trigger and recognition lines; rectangular and polygon regions, direction filters, repeat windows, and delayed plate matching with reasoned correction audit history.",
        ],
        [
          "Durable encrypted event delivery",
          "Encrypted local delivery journal and automatic retries during temporary database locks; filter by registered/unknown status, block, unit, camera, and direction.",
        ],
        [
          "ONVIF discovery & hardware decode",
          "Bounded IPv4 ONVIF media profile discovery, per-camera automatic D3D11 hardware decoding with software fallback, and isolated capture workers.",
        ],
        [
          "Regional OCR & per-character confidence",
          "Still images, MP4/AVI video, and live RTSP streams; per-character confidence metrics, evidence crops, and SHA-256 verified local ONNX models.",
        ],
        [
          "DPAPI vault & verified snapshots",
          "Camera credentials and delivery journals are bound to the active Windows user account via DPAPI. Includes administrator SQLite integrity backups and a 6-step setup wizard.",
        ],
      ];

  return (
    <PageShell
      eyebrow="WINDOWS 10/11 x64"
      title="IPScans LPR Pro"
      subtitle={
        tr
          ? "Plakaları yerelde okuyun, çok kameralı canlı izleme duvarını yönetin, blok/daire araç kütüğünü ve erişim kurallarınızı sınayın."
          : "Read plates locally, manage your multi-camera live wall, and validate vehicle registries and access rules."
      }
    >
      <article lang={tr ? "tr" : "en"}>
        <div className="mb-8">
          <Link href={`/${locale}/download`} className="button button-secondary button-compact">
            <span>← {tr ? "Tüm uygulamalar" : "All applications"}</span>
          </Link>
        </div>

        <section className="product-card mb-12">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="caption font-mono uppercase tracking-[0.14em] text-[#9aa0a6]">
                {tr ? "Masaüstü Operatör Paketi" : "Desktop Operator Suite"}
              </p>
              <h2 className="heading-4 mt-3 text-white">
                {tr
                  ? "Canlı kamera duvarı, kalibrasyon çizgileri ve yerel plaka tanıma"
                  : "Live camera wall, calibration lines & local plate recognition"}
              </h2>
              <p className="body mt-4 text-[#9aa0a6]">
                {tr
                  ? "IPScans LPR Pro; 5 bölmeli operatör arayüzü, bağımsız tetik/okuma çizgileri, blok ve sakin kayıt sistemi ile Windows 10/11 x64 üzerinde tamamen yerel olarak çalışır."
                  : "IPScans LPR Pro runs locally on Windows 10/11 x64 with a 5-page operator workspace, independent trigger/recognition lines, and resident vehicle registry."}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a href={lprRelease.url} className="button button-primary">
                  <span>{tr ? "Windows Kurulumunu İndir · EXE" : "Download Windows Installer · EXE"}</span>
                </a>
                <a
                  href={lprRelease.releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button-secondary"
                >
                  <span>{tr ? "Sürüm notları ve kaynak ↗" : "Release notes and source ↗"}</span>
                </a>
              </div>
            </div>
            <div className="agy-result-card">
              <p className="agy-result-card__label">{tr ? "Paket Özeti" : "Package Summary"}</p>
              <p className="agy-result-card__value">{(lprRelease.bytes / 1_000_000).toFixed(1)} MB · Windows 10/11 x64</p>
              <p className="caption mt-3 text-[#9aa0a6]">
                {tr
                  ? "Kullanıcı hesabına kurulan bağımsız çalışma zamanı (Python veya Node.js kurulumu gerekmez). Dosya bütünlüğü SHA-256 ile doğrulanır."
                  : "Self-contained runtime installed for the current user (Python and Node.js are not required). Integrity verified via SHA-256."}
              </p>
              <p className="caption mt-3 break-all font-mono text-xs text-[#9aa0a6]">
                SHA-256: {lprRelease.sha256}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <ApplicationSlideshow
            slides={getLprSlides(locale)}
            locale={locale}
            appName="IPScans LPR Pro"
          />
        </section>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(([title, body], idx) => (
            <section key={title} className="product-card">
              <p className="caption font-mono text-[#9aa0a6]">0{idx + 1}</p>
              <h2 className="heading-6 mt-3 text-white">{title}</h2>
              <p className="body mt-3 text-[#9aa0a6]">{body}</p>
            </section>
          ))}
        </div>

        <section className="product-card mt-10">
          <h2 className="heading-5 text-white">{tr ? "İlk kullanım" : "Getting started"}</h2>
          <ol className="body mt-5 list-decimal space-y-3 ps-6 text-[#b7bfd9]">
            <li>
              {tr
                ? "Kurulum EXE dosyasını çalıştırın. İlk açılışta karşılama ve kurulum sihirbazı üzerinden en az 12 karakterli yönetici parolanızı oluşturun."
                : "Run the installer EXE. On first launch, create an administrator password of at least 12 characters through the welcome setup wizard."}
            </li>
            <li>
              {tr
                ? "Ayarlar bölümünden yaklaşık 15 MB değerlendirme modelini indirin veya kendi ONNX model manifestinizi seçin."
                : "Download about 15 MB of evaluation models in Settings, or select your own ONNX model manifest."}
            </li>
            <li>
              {tr
                ? "Kurulum rehberinden yetkili kameranızı ekleyin, tetik/okuma çizgilerini kaydedin ve araç kaydı oluşturun. Canlı İzleme ekranından OCR başlatıp sonuçları Geçiş Kayıtları bölümünde inceleyin."
                : "Use the setup guide to add an authorized camera, save trigger/recognition calibration lines, and create a vehicle record. Start OCR from Live Dashboard and review passages in Events."}
            </li>
          </ol>
          <p className="caption mt-5 text-[#9aa0a6]">
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

        <section className="product-card mt-8">
          <h2 className="heading-6 text-white">
            {tr ? "Cihaz uyumluluğu ve doğrulama kapsamı" : "Device compatibility & validation scope"}
          </h2>
          <p className="body mt-3 text-[#9aa0a6]">
            {tr
              ? "IPv4 ONVIF keşfi, medya profili seçimi, H.264 ana/alt akış ve D3D11 otomatik donanım çözme Mercusys MC510 üzerinde sınanmıştır. Modbus TCP tek bobin okuma ve Shelly RPC durum sorgulama araçları bulunur; fiziksel bariyer tetikleme güvenlik amacıyla kapalıdır."
              : "IPv4 ONVIF discovery, media profile selection, H.264 main/sub streams, and automatic D3D11 hardware decoding were tested on a Mercusys MC510. Read-only Modbus TCP single-coil and Shelly RPC status tools are included; physical barrier actuation remains disabled by default."}
          </p>
        </section>
      </article>
    </PageShell>
  );
}
