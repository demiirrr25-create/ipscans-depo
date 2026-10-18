import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { isLocale } from "@/i18n/config";
import { localizedAlternates } from "@/lib/seo";
import { CopyHashButton } from "@/components/CopyHashButton";
import { AppStoreCarousel } from "@/components/AppStoreCarousel";
import type { Metadata } from "next";

const release = "https://github.com/demiirrr25-create/ipscans-depo/releases/download/cortex-v1.0.0-rc.2";
const sha256 = "b0fa5629f6de31e847c1f1ecfbbda51b369527ecbcf6d787be09c73b0a233b81";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const tr = locale === "tr";
  return {
    title: `IPScans Cortex — ${tr ? "Yerel Kamera Görsel AI ve Kural Motoru" : "Local Camera Vision AI & Smart Event Engine"}`,
    description: tr
      ? "RTSP kameralar, model-bağımsız 12 yerel kural, Gemma görsel AI ve kanıt video arşivi. Windows x64 yerel sürüm adayı."
      : "RTSP cameras, 12 model-free rules, optional Gemma vision AI and persistent video evidence. Windows x64 local release candidate.",
    alternates: localizedAlternates(locale, "/cortex"),
  };
}

export default async function CortexPage({
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
          "01 / KAMERA KEŞFİ",
          "RTSP Akışları & ONVIF Entegrasyonu",
          "RTSP üzerinden sınırsız kamera bağlama, otomatik bağlantı sınaması, TCP/UDP taşıma seçimi ve yerel ağda ONVIF keşfi. Sürekli canlı bağlantı ve saniyede iki kare hedefleyen optimize yerel analiz.",
        ],
        [
          "02 / KURAL MOTORU",
          "12 Model-Bağımsız & 12 Görsel AI Kuralı",
          "Hareket, bölge ihlali, aydınlatma, sinyal sağlığı ve bağlantı kesintisi için sıfır-AI yerel kurallar. İsteğe bağlı yerel Gemma AI ile nesne, hayvan ve çevre tespiti. Tüm kurallar yerelde değerlendirilir.",
        ],
        [
          "03 / KANIT KAYDI",
          "Kalıcı Video Klip & Webhook Bildirimi",
          "Olay anında otomatik örnek kare ve 12 saniyelik post-trigger video klip arşivi. Şifreli yerel kütük ve harici sistemler için 3 kez denemeli HTTPS webhook entegrasyonu.",
        ],
      ]
    : [
        [
          "01 / CAMERA INGEST",
          "RTSP Streams & ONVIF Peering",
          "Direct RTSP camera connections, automatic stream probe, TCP/UDP transport toggle, and local subnet ONVIF discovery with low-overhead 2 FPS background analysis.",
        ],
        [
          "02 / EVENT ENGINE",
          "12 Model-Free & 12 Vision AI Rules",
          "Zero-model native rules for motion, intrusion zones, lighting spikes, and signal loss. Optional local Gemma vision inference for objects, animals, and perimeter anomalies.",
        ],
        [
          "03 / EVIDENCE LOG",
          "12-Second Video Proof & Webhooks",
          "Instant keyframe capture and automatic 12-second post-trigger video clips. Encrypted local audit archive and 3-retry HTTPS webhook delivery.",
        ],
      ];

  return (
    <PageShell
      eyebrow="WINDOWS 10/11 x64 · V1 RELEASE CANDIDATE"
      title={tr ? "Her Kameraya Yerel Bir Beyin." : "Local Intelligence for Every Camera."}
      subtitle={
        tr
          ? "RTSP kameralarınızı bağlayın, yerel olay kurallarınızı tanımlayın ve kanıt kliplerini bilgisayarınızda güvenle arşivleyin."
          : "Connect your RTSP cameras, define local event rules, and preserve video evidence directly on your machine."
      }
    >
      <div className="mx-auto max-w-6xl space-y-12">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href={`/${locale}/download`}
            className="button button-secondary button-compact font-mono text-xs"
          >
            <span>← {tr ? "Tüm Masaüstü Uygulamaları" : "All Desktop Applications"}</span>
          </Link>
        </div>

        {/* Hero Deck Card */}
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#07090E] p-6 sm:p-10 shadow-2xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/cortex-mark.svg"
                alt="Cortex"
                width={56}
                height={56}
                className="rounded-2xl border border-white/15 bg-white/5 p-1"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-mono text-xs font-medium text-neutral-300">
                    V1 RC2 · STANDALONE
                  </span>
                  <span className="font-mono text-xs text-neutral-400">Windows 10/11 · x64</span>
                </div>
                <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                  IPScans Cortex
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={`${release}/IPScans-Cortex-1.0.0-rc.2.exe`}
                className="button button-primary group flex items-center gap-2.5 px-6 py-3 font-mono text-xs font-bold"
              >
                <span>{tr ? "Windows Kurulumunu İndir · EXE" : "Download for Windows · EXE"}</span>
                <span className="rounded bg-black/10 px-2 py-0.5 text-[10px] text-neutral-800">
                  63.3 MB
                </span>
                <span>↓</span>
              </a>
              <a
                href={`${release}/Cortex-Kullanim.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="button button-secondary font-mono text-xs"
              >
                <span>{tr ? "Kullanım Kılavuzu" : "User Guide"} ↗</span>
              </a>
            </div>
          </div>

          {/* Checksum row */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4 font-mono text-xs text-neutral-400">
            <div className="flex items-center gap-2 truncate">
              <span className="text-neutral-500 uppercase text-[10px]">SHA-256:</span>
              <code className="text-neutral-300 truncate max-w-sm sm:max-w-md">{sha256}</code>
            </div>
            <CopyHashButton hash={sha256} label={tr ? "Kopyala" : "Copy"} />
          </div>
        </section>

        {/* 5-Second 3-Screenshot App Store Carousel */}
        <div className="my-8">
          <AppStoreCarousel
            appId="cortex"
            appName="IPScans Cortex"
            locale={locale}
            intervalMs={5000}
            screenshots={[
              {
                id: "cortex-console",
                label: tr ? "Cortex Konsolu" : "Cortex Console",
                title: tr ? "Çok Kanallı RTSP Akış Denetleyicisi" : "Multi-Stream RTSP Video Controller",
                tag: "RTSP WALL",
                image: "/cortex-preview.png",
              },
              {
                id: "cortex-rules",
                label: tr ? "12 Yerel Kural" : "12 Local Rules",
                title: tr ? "Gemma Vision AI & Model-Bağımsız Kural Matrisi" : "Gemma Vision AI & Model-Free Rule Matrix",
                tag: "RULE MATRIX",
                renderType: "cortex-rules",
              },
              {
                id: "cortex-events",
                label: tr ? "Kanıt & Webhook" : "Proof Archive",
                title: tr ? "12s Video Kanıt Arşivi & HTTPS Webhook" : "12s Video Evidence Archive & HTTPS Webhooks",
                tag: "EVIDENCE ARCHIVE",
                renderType: "cortex-events",
              },
            ]}
          />
        </div>

        {/* Feature Cards Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {features.map(([n, title, body]) => (
            <article key={n} className="rounded-2xl border border-white/[0.08] bg-[#07090E] p-7">
              <span className="font-mono text-xs text-neutral-400">{n}</span>
              <h3 className="my-3 text-xl font-bold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-neutral-400">{body}</p>
            </article>
          ))}
        </div>

        {/* Getting Started & Specs */}
        <div className="grid gap-8 md:grid-cols-2">
          <section className="rounded-2xl border border-white/[0.08] bg-[#07090E] p-8">
            <h3 className="mb-4 text-xl font-bold text-white">
              {tr ? "Üç Adımda Başlayın" : "Start in Three Steps"}
            </h3>
            <ol className="list-decimal space-y-4 pl-5 text-sm leading-relaxed text-neutral-300">
              <li>
                {tr
                  ? "İndirilen EXE dosyasını çalıştırın. Yönetim konsolu doğrudan bilgisayarınızda açılır."
                  : "Launch the standalone EXE. The control panel opens directly on your machine."}
              </li>
              <li>
                {tr
                  ? "İsteğe bağlı AI: Ollama üzerinden Gemma modelini tek tıkla bağlayın veya AI olmadan 12 yerel kuralı kullanın."
                  : "Optional AI: Connect local Gemma via Ollama, or use 12 model-free rules with zero AI requirements."}
              </li>
              <li>
                {tr
                  ? "Kameranızın RTSP bağlantısını girin, tetikleyici kuralı kaydedin ve izlemeyi başlatın."
                  : "Enter your camera RTSP endpoint, save your trigger rule, and begin monitoring."}
              </li>
            </ol>
            <a
              className="mt-6 inline-block font-mono text-xs text-neutral-300 hover:text-white underline underline-offset-4"
              href="https://ollama.com/download"
              target="_blank"
              rel="noopener noreferrer"
            >
              {tr ? "Ollama İndirme Sayfası" : "Ollama Download Page"} ↗
            </a>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-[#07090E] p-8">
            <h3 className="mb-4 text-xl font-bold text-white">
              {tr ? "Teknik Kapsam ve Donanım Notları" : "Technical Architecture & System Scope"}
            </h3>
            <div className="space-y-3 text-sm leading-relaxed text-neutral-400">
              <p>
                {tr
                  ? "Cortex tamamen yerel çalışan bağımsız bir Windows yazılımıdır; kameralarınızı asla harici bulut sunucularına aktarmaz."
                  : "Cortex is a standalone local Windows tool; your video feeds never leave your local workstation."}
              </p>
              <p>
                {tr
                  ? "12 yerel kural harici model gerektirmeden çalışır. 32 kameraya kadar yapılandırma desteklenir; analiz hızı yerel CPU/GPU kapasitenize göre dinamik ölçeklenir."
                  : "12 native rules operate without AI inference. Supports up to 32 cameras with analysis rate dynamically scaling to your hardware."}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-neutral-500">
              <span>Windows 10 / 11 (x64)</span>
              <span>DirectX / CPU Fallback</span>
            </div>
          </section>
        </div>

      </div>
    </PageShell>
  );
}
