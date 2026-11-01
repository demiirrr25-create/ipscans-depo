import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ds/Icon";
import { Reveal } from "@/components/ds/Reveal";
import { SignalField } from "@/components/ds/SignalField";
import { SplitHeading } from "@/components/ds/SplitHeading";
import {
  DownloadStage,
  FeatureGrid,
  ReleaseDetails,
  ScreenshotFrame,
  SectionHeader,
} from "@/components/ds/product";
import { SentinelInteractiveConsole } from "@/components/sentinel/SentinelInteractiveConsole";
import { isLocale } from "@/i18n/config";
import { localizedAlternates } from "@/lib/seo";

export const sentinelRelease = {
  version: "3.0.0",
  platform: "Windows 10/11 · x64 (Rust Native)",
  fileName: "IPScans-Sentinel.exe",
  url: "https://github.com/demiirrr25-create/ipscans-depo/releases/download/sentinel-v3.0.0/IPScans-Sentinel.exe",
  sha256: "4d3564aeb0abc23aef928abd7935ba739fffadf7f20327feda723b4b20e7d216",
  bytes: 2845184,
} as const;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const isTr = locale === "tr";
  const title = isTr
    ? "IPScans Sentinel 3.0 — Otonom Siber Güvenlik, Ana Modem ve Kamera Savunma Sistemi (Rust)"
    : "IPScans Sentinel 3.0 — Autonomous Cybersecurity, Main Gateway & Camera Defense Suite (Rust)";
  const description = isTr
    ? "Rust dilinde geliştirilen, Yönetici CMD/PowerShell motoru ve yerel Ollama siber güvenlik ajanı (ipscans-cyber-agent) ile sızılan kameraları milisaniyeler içinde karantinaya alıp ana modem portlarını kapatan ve onarım sonrası güvenli ağ erişimini geri veren siber savunma sistemi."
    : "Built natively in Rust with an elevated Administrator CMD/PowerShell engine and pre-configured Ollama cybersecurity agent (ipscans-cyber-agent) to quarantine compromised cameras in milliseconds, harden your main router, and restore clean LAN access.";

  return {
    title,
    description,
    alternates: localizedAlternates(locale, "/sentinel"),
  };
}

export default async function SentinelPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const isTr = locale === "tr";

  const features = isTr
    ? [
        {
          icon: "shield" as const,
          title: "Milisaniyelik Kamera Ağ Karantinası",
          body: "Örneğin 'Dahua kamerama sızdılar' dediğiniz anda TCP 37777 DVRIP ve RTSP 554 oturumlarını tarar; Windows Defender Firewall ve L3 statik rota izolasyonu ile kameranın dış ağa (WAN) çıkışını saliseler içinde engeller.",
        },
        {
          icon: "network" as const,
          title: "Ana Modem / Gateway UPnP ve Port Müdahalesi",
          body: "Varsayılan ağ geçidini (Default Gateway) otomatik bulur, UPnP IGD SOAP DeletePortMapping protokolü ile ana modemde açılmış tüm yetkisiz kamera/yönetim portlarını (37777, 554, 8000, 8899) dış dünyaya kapatır.",
        },
        {
          icon: "cpu" as const,
          title: "Gömülü Ollama Siber Güvenlik Ajanı",
          body: "Yerel olarak çalışan ipscans-cyber-agent:latest modeliyle doğal dilde anlatılan güvenlik sorununu analiz eder, CVE-2021-33044/33045 ve ONVIF zafiyetlerini denetler ve 4 aşamalı savunma planını otonom yürütür.",
        },
        {
          icon: "lock" as const,
          title: "Onarım Sonrası Otomatik Ağ Erişimi",
          body: "Kameradaki P2P bulut arka kapısını ve UPnP otomatik port açma ayarlarını kapattıktan, statik ARP MAC kilidini uyguladıktan sonra karantinayı kaldırarak kameraya güvenli yerel ağ (LAN) erişimini geri verir.",
        },
        {
          icon: "bolt" as const,
          title: "Yönetici CMD ve PowerShell Komuta Motoru",
          body: "Win32 UAC RunAs entegrasyonu ile doğrudan uygulama içinden veya bağımsız pencerede Yönetici (Administrator) CMD.exe ve PowerShell.exe çalıştırır.",
        },
        {
          icon: "check" as const,
          title: "%100 Saf Rust 3.0 Mimarisi",
          body: "Sıfır çalışma zamanı bağımlılığı, 2.8 MB tek dosya yerel Windows x64 çalıştırılabilir mimarisi ve tam açık/koyu tema uyumu.",
        },
      ]
    : [
        {
          icon: "shield" as const,
          title: "Sub-Second Camera Network Quarantine",
          body: "The moment you report a camera intrusion, Sentinel probes TCP 37777 (Dahua DVRIP) and RTSP 554, blocking outbound WAN access in milliseconds via Windows Defender Firewall and L3 route isolation.",
        },
        {
          icon: "network" as const,
          title: "Main Modem / Gateway UPnP Hardening",
          body: "Automatically discovers your Default Gateway and dispatches UPnP IGD SOAP DeletePortMapping commands to sever rogue external WAN port forwards (37777, 554, 8000, 8899) on the main router.",
        },
        {
          icon: "cpu" as const,
          title: "Pre-Configured Ollama Cybersecurity Agent",
          body: "Powered locally by ipscans-cyber-agent:latest to interpret natural-language security incidents, audit CVE-2021-33044/33045 indicators, and orchestrate the 4-stage remediation pipeline.",
        },
        {
          icon: "lock" as const,
          title: "Verified LAN Access Restoration",
          body: "After disabling P2P cloud backdoors and auto-UPnP on the camera and locking static ARP MAC bindings, Sentinel cleanly removes temporary quarantine rules so the camera regains safe LAN operation.",
        },
        {
          icon: "bolt" as const,
          title: "Administrator CMD & PowerShell Engine",
          body: "Spawns and executes elevated Administrator CMD.exe and PowerShell.exe sessions via native Win32 UAC RunAs integration.",
        },
        {
          icon: "check" as const,
          title: "100% Native Rust 3.0 Architecture",
          body: "Zero external runtime dependencies in a 2.8 MB standalone Windows x64 executable with full Light and Dark theme parity.",
        },
      ];

  return (
    <div className="relative">
      <section className="relative isolate overflow-hidden border-b border-line pt-[calc(var(--header-h)+48px)] pb-20 sm:pt-[calc(var(--header-h)+72px)] sm:pb-28">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(70%_70%_at_65%_20%,#000_20%,transparent_75%)]"
        >
          <SignalField variant="ambient" />
        </div>

        <div className="ds-container">
          <Reveal>
            <Link
              href={`/${locale}/download`}
              className="inline-flex items-center gap-2 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
            >
              <Icon name="arrowRight" size={15} className="rotate-180 rtl:rotate-0" />
              <span>{isTr ? "Tüm uygulamalar" : "All applications"}</span>
            </Link>

            <div className="mt-8 flex items-center gap-3.5">
              <span className="grid size-12 place-items-center overflow-hidden rounded-[14px] border border-line bg-surface shadow-xs">
                <Image
                  src="/sentinel-mark.png"
                  alt="IPScans Sentinel"
                  width={48}
                  height={48}
                  className="size-12 object-cover"
                />
              </span>
              <div>
                <p className="ds-eyebrow">
                  {isTr
                    ? "Rust 3.0 · Otonom Siber Güvenlik, Ana Modem ve Kamera Savunma Sistemi"
                    : "Rust 3.0 · Autonomous Cybersecurity, Main Gateway & Camera Defense"}
                </p>
                <p className="text-base font-semibold tracking-tight text-ink">
                  IPScans Sentinel
                </p>
              </div>
            </div>
          </Reveal>

          <div className="mt-8 max-w-[880px]">
            <SplitHeading
              as="h1"
              text={
                isTr
                  ? "Ağınızı, ana modeminizi ve kameralarınızı otonom koruyun."
                  : "Autonomous defense for your network, main router, and IP cameras."
              }
              className="ds-display text-ink"
            />
            <Reveal delay={120}>
              <p className="ds-lead mt-6 max-w-[680px]">
                {isTr
                  ? "Tamamen Rust dilinde geliştirilen IPScans Sentinel; Yönetici CMD/PowerShell motoru ve yerleşik Ollama siber güvenlik ajanıyla ('ipscans-cyber-agent') sızılan kameraların ağa çıkışını saliseler içinde engeller, ana modem portlarını kapatır ve sorunu çözdükten sonra güvenli ağ erişimini geri verir."
                  : "Engineered in Rust, IPScans Sentinel pairs an elevated Administrator CMD/PowerShell engine with a pre-installed Ollama cybersecurity agent ('ipscans-cyber-agent') to quarantine compromised cameras in milliseconds, close rogue router ports, and restore clean LAN access."}
              </p>
            </Reveal>

            <Reveal delay={180} className="mt-9 flex flex-wrap items-center gap-3">
              <a href={sentinelRelease.url} download className="btn btn-primary">
                <Icon name="download" size={16} />
                <span>{isTr ? "Windows İçin İndir (.exe)" : "Download for Windows (.exe)"}</span>
              </a>
              <a href="#live-console" className="btn btn-secondary">
                <span>{isTr ? "Canlı Savunma Konsolunu Dene" : "Try Live Defense Console"}</span>
                <Icon name="arrowDown" size={16} />
              </a>
            </Reveal>
          </div>

          <Reveal delay={200} className="mt-14">
            <ScreenshotFrame
              src="/sentinel-preview.png"
              alt="IPScans Sentinel 3.0 — Rust Native Cybersecurity & Camera Defense"
              width={1440}
              height={900}
              priority
            />
          </Reveal>

          <Reveal delay={240} className="mt-14" id="live-console">
            <SentinelInteractiveConsole isTr={isTr} />
          </Reveal>
        </div>
      </section>

      <section className="ds-section border-b border-line">
        <div className="ds-container">
          <SectionHeader
            eyebrow={isTr ? "Temel yetenekler" : "Core capabilities"}
            title={
              isTr
                ? "Taramadan karantinaya, modem onarımından erişim iznine tam otonom siber güvenlik."
                : "From deep probing to sub-second quarantine, router hardening, and clean restoration."
            }
          />
          <div className="mt-12">
            <FeatureGrid features={features} columns={3} />
          </div>
        </div>
      </section>

      <section className="ds-section">
        <div className="ds-container">
          <ReleaseDetails
            title={isTr ? "Sürüm ve Doğrulama Bilgileri" : "Release & Verification Details"}
            rows={[
              { label: isTr ? "Sürüm" : "Version", value: sentinelRelease.version },
              { label: "Platform", value: sentinelRelease.platform },
              {
                label: isTr ? "Yapay Zekâ Ajanı" : "AI Cyber Agent",
                value: "Ollama · ipscans-cyber-agent:latest",
              },
            ]}
            files={[
              {
                label: "IPScans-Sentinel.exe (Rust Native x64)",
                href: sentinelRelease.url,
                bytes: sentinelRelease.bytes,
                sha256: sentinelRelease.sha256,
              },
            ]}
            copyLabel={isTr ? "SHA-256 Kopyala" : "Copy SHA-256"}
            copiedLabel={isTr ? "Kopyalandı" : "Copied"}
            downloadLabel={isTr ? "İndir" : "Download"}
          />
        </div>
      </section>

      <section className="ds-container pb-24">
        <DownloadStage
          title={
            isTr
              ? "IPScans Sentinel 3.0 ile ağ güvenliğini tamamen otomatikleştirin."
              : "Automate network and camera defense with IPScans Sentinel 3.0."
          }
          lead={
            isTr
              ? "Tek dosya Rust çalıştırılabilir uygulamasını indirin ve yerel ağınızı anında koruma altına alın."
              : "Download the standalone Rust executable and protect your local subnet immediately."
          }
        >
          <a href={sentinelRelease.url} download className="btn btn-inverse">
            <Icon name="download" size={16} />
            <span>{isTr ? "IPScans Sentinel İndir" : "Download IPScans Sentinel"}</span>
          </a>
        </DownloadStage>
      </section>
    </div>
  );
}
