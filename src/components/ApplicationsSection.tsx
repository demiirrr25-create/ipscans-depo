"use client";

import { uiText } from "@/i18n/ui";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { PublicDictionary } from "@/i18n/dictionaries";
import { applications, platformCopy, desktopRelease, scannerApplication, ipcastRelease } from "@/content/applications";
import { toolKeys, toolPath } from "@/lib/tool-routes";
import { lprRelease } from "@/content/lpr-release";
import { CopyHashButton } from "./CopyHashButton";
import { AppStoreCarousel, type AppScreenshot } from "./AppStoreCarousel";

interface ApplicationsSectionProps {
  locale: Locale;
  dict: PublicDictionary;
  primary?: boolean;
}

export function ApplicationsSection({
  locale,
  dict,
  primary = false,
}: ApplicationsSectionProps) {
  const isTr = locale === "tr";
  const copy = platformCopy[locale];
  const [activeFilter, setActiveFilter] = useState<"all" | "desktop" | "web">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const cortexReleaseUrl = "https://github.com/demiirrr25-create/ipscans-depo/releases/download/cortex-v1.0.0-rc.2/IPScans-Cortex-1.0.0-rc.2.exe";

  const flagshipApps: Array<{
    id: string;
    name: string;
    tagline: string;
    description: string;
    version: string;
    platform: string;
    sizeMb: string;
    installerUrl: string;
    portableUrl: string | null;
    sha256: string;
    detailUrl: string;
    preview: string;
    icon: string;
    badge: string;
    badgeColor: string;
    capabilities: string[];
    powershellCheck: string;
    screenshots: AppScreenshot[];
  }> = [
    {
      id: "scanner",
      name: "IPscans+",
      tagline: isTr ? "Amiral Gemisi Ağ Tarayıcı & Topoloji Motoru" : "Flagship Network Scanner & Subnet Topology Engine",
      description: isTr
        ? "254 hostu 2 saniyenin altında tarayan asenkron ham soket motoru, ARP ve ICMP sondaları, ONVIF kamera keşfi, port analizi ve doğrulanmış LLDP/CDP hiyerarşik ağ haritası."
        : "Sub-2s 254-host asynchronous socket sweep, native ARP/ICMP probing, ONVIF camera discovery, deep port auditing, and verified LLDP/CDP topology visualization.",
      version: desktopRelease.scanner.version,
      platform: "Windows 10/11 · x64",
      sizeMb: (desktopRelease.scanner.installerBytes / (1024 * 1024)).toFixed(1),
      installerUrl: desktopRelease.scanner.installerUrl,
      portableUrl: desktopRelease.scanner.portableUrl,
      sha256: desktopRelease.scanner.installerSha256,
      detailUrl: `/${locale}/applications/scanner`,
      preview: "/scanner-v43-preview.png",
      icon: "/scanner-icon-v42.png",
      badge: isTr ? "AMİRAL GEMİSİ · KARARLI" : "FLAGSHIP · STABLE",
      badgeColor: "text-neutral-300 border-white/10 bg-white/[0.04]",
      capabilities: [
        "SUB-2S 254 HOST SWEEP",
        "RAW ARP / ICMP SOCKETS",
        "LLDP/CDP TOPOLOGY TREE",
        "ONVIF CAMERA DISCOVERY",
        "ONE-CLICK WEB UI & PDF",
      ],
      powershellCheck: `Get-FileHash .\\IPscans-Plus-Setup.exe -Algorithm SHA256`,
      screenshots: [
        {
          id: "scanner-subnet",
          label: isTr ? "Alt Ağ Taraması" : "Subnet Sweep",
          title: isTr ? "254 Host Gerçek Zamanlı Soket Taraması & Portlar" : "Sub-2s 254-Host Raw Socket Sweep",
          tag: "ARP/ICMP",
          image: "/scanner-v43-preview.png",
        },
        {
          id: "scanner-topology",
          label: isTr ? "Ağ Topolojisi" : "Topology Tree",
          title: isTr ? "Hiyerarşik LLDP & CDP Anahtar Ağacı Haritası" : "Hierarchical LLDP/CDP Switch Tree",
          tag: "TOPOLOGY",
          image: "/scanner-v43-map.png",
        },
        {
          id: "scanner-inspector",
          label: isTr ? "Cihaz & ONVIF" : "Device Audit",
          title: isTr ? "ONVIF IP Kamera ve Ağ Hizmetleri Denetimi" : "ONVIF Discovery & Deep Port Audit",
          tag: "INSPECTOR",
          image: "/scanner-v42-preview.png",
        },
      ],
    },
    {
      id: "ipcast",
      name: "IPCast",
      tagline: isTr ? "Ultra Düşük Gecikmeli P2P Uzak Masaüstü" : "Ultra-Low Latency Direct P2P Remote Desktop",
      description: isTr
        ? "Merkezi sunucu veya hesap gerektirmeyen 9 haneli anlık erişim adresi, STUN/UDP doğrudan tünel, AES-256 GCM şifreleme ve donanım hızlandırmalı 60 FPS masaüstü ve dosya aktarımı."
        : "Zero-signup 9-digit peer addressing, direct STUN/UDP NAT traversal, authenticated AES-256 GCM encryption, and GPU-accelerated 60 FPS remote desktop with chunked file transfer.",
      version: ipcastRelease.version,
      platform: "Windows 10/11 · x64",
      sizeMb: (ipcastRelease.installerBytes / (1024 * 1024)).toFixed(1),
      installerUrl: ipcastRelease.installerUrl,
      portableUrl: ipcastRelease.url,
      sha256: ipcastRelease.installerSha256,
      detailUrl: `/${locale}/applications/ipcast`,
      preview: "/ipcast-v25-preview.png",
      icon: "/ipcast-mark.svg",
      badge: isTr ? "P2P DOĞRUDAN · 60 FPS" : "P2P DIRECT · 60 FPS",
      badgeColor: "text-neutral-300 border-white/10 bg-white/[0.04]",
      capabilities: [
        "9-DIGIT PEER ADDRESS",
        "DIRECT UDP HOLE-PUNCHING",
        "AES-256-GCM TUNNEL",
        "GPU 60 FPS ACCELERATION",
        "DRAG & DROP FILE RELAY",
      ],
      powershellCheck: `Get-FileHash .\\IPCast-2.6.0-Setup.exe -Algorithm SHA256`,
      screenshots: [
        {
          id: "ipcast-console",
          label: isTr ? "9 Haneli Konsol" : "9-Digit Console",
          title: isTr ? "Doğrudan STUN/UDP P2P Bağlantı Konsolu" : "Direct STUN/UDP P2P Connection Console",
          tag: "P2P CONSOLE",
          image: "/ipcast-v25-preview.png",
        },
        {
          id: "ipcast-stream",
          label: isTr ? "60 FPS Canlı Akış" : "60 FPS Stream",
          title: isTr ? "D3D11 Donanım Hızlandırmalı Uzak Masaüstü" : "D3D11 GPU Accelerated Remote Desktop",
          tag: "GPU STREAM",
          renderType: "ipcast-stream",
        },
        {
          id: "ipcast-files",
          label: isTr ? "Dosya Aktarımı" : "File Relay",
          title: isTr ? "AES-256-GCM Şifreli P2P Dosya Aktarım Tüneli" : "AES-256-GCM Encrypted P2P File Pipeline",
          tag: "SECURE RELAY",
          renderType: "ipcast-files",
        },
      ],
    },
    {
      id: "lpr-pro",
      name: "IPScans LPR Pro",
      tagline: isTr ? "Otonom Plaka Tanıma & Operatör Çalışma Alanı" : "Autonomous License Plate Recognition & Operator Workspace",
      description: isTr
        ? "5 bölmeli canlı operatör konsolu, RTSP 4K ONVIF kamera entegrasyonu, yerel ONNX Runtime ile %98.6 doğrulukta plaka OCR, 200ms altı bariyer röle kontrolü ve fotoğraflı geçiş günlüğü."
        : "5-page live operator console, RTSP 4K ONVIF streams, 98.6% accurate local ONNX plate OCR, sub-200ms relay barrier gate automation, and photographic passage audit.",
      version: lprRelease.version,
      platform: "Windows 10/11 · x64",
      sizeMb: (lprRelease.bytes / (1024 * 1024)).toFixed(1),
      installerUrl: lprRelease.url,
      portableUrl: null,
      sha256: lprRelease.sha256,
      detailUrl: `/${locale}/lpr-pro`,
      preview: "/lpr-pro-preview.png",
      icon: "/lpr-mark.svg",
      badge: isTr ? "YEREL ONNX · 4K RTSP" : "LOCAL ONNX · 4K RTSP",
      badgeColor: "text-neutral-300 border-white/10 bg-white/[0.04]",
      capabilities: [
        "5-PAGE OPERATOR CONSOLE",
        "ONNX RUNTIME OCR (%98.6)",
        "RTSP 4K CAMERA WALL",
        "SUB-200MS RELAY BARRIER",
        "RESIDENT FLEET REGISTRY",
      ],
      powershellCheck: `Get-FileHash .\\${lprRelease.fileName} -Algorithm SHA256`,
      screenshots: [
        {
          id: "lpr-console",
          label: isTr ? "Operatör Konsolu" : "Operator Wall",
          title: isTr ? "4K RTSP Canlı Kamera Duvarı & ONNX OCR" : "4K RTSP Live Camera Wall & ONNX OCR",
          tag: "4K CAMERA WALL",
          image: "/lpr-pro-preview.png",
        },
        {
          id: "lpr-calib",
          label: isTr ? "Tetik Kalibrasyonu" : "Calibration",
          title: isTr ? "Tetik Çizgisi ve Plaka Bounding Box Kalibrasyonu" : "Trigger Tripwire & Bounding Box Calibration",
          tag: "CALIBRATION",
          renderType: "lpr-calib",
        },
        {
          id: "lpr-registry",
          label: isTr ? "Sakin Kütüğü" : "Resident Log",
          title: isTr ? "SQLite Sakin Araç Kütüğü ve Bariyer Olay Günlüğü" : "SQLite Vehicle Registry & Barrier Audit",
          tag: "BARRIER AUDIT",
          renderType: "lpr-registry",
        },
      ],
    },
    {
      id: "cortex",
      name: "IPScans Cortex",
      tagline: isTr ? "Yerel Kamera Görsel AI & Olay Kural Motoru" : "Local Camera Vision AI & Smart Event Rule Engine",
      description: isTr
        ? "RTSP kameralara bağlanan, model gerektirmeyen 12 yerel kural ve Ollama Gemma tabanlı 12 görsel AI şablonu. Olay anında otomatik 12 saniyelik video kanıtı ve güvenli webhook bildirimi."
        : "Connects to RTSP cameras with 12 model-free rules and 12 Gemma local vision AI templates. Preserves 12s post-trigger video evidence and dispatches secure webhooks.",
      version: "1.0.0-rc.2",
      platform: "Windows 10/11 · x64",
      sizeMb: "63.3",
      installerUrl: cortexReleaseUrl,
      portableUrl: cortexReleaseUrl,
      sha256: "b0fa5629f6de31e847c1f1ecfbbda51b369527ecbcf6d787be09c73b0a233b81",
      detailUrl: `/${locale}/cortex`,
      preview: "/cortex-preview.png",
      icon: "/cortex-mark.svg",
      badge: isTr ? "YEREL AI · GEMMA VISION" : "LOCAL AI · GEMMA VISION",
      badgeColor: "text-neutral-300 border-white/10 bg-white/[0.04]",
      capabilities: [
        "12 MODEL-FREE RULES",
        "GEMMA VISION AI",
        "ZERO CLOUD TELEMETRY",
        "12S VIDEO PROOF ARCHIVE",
        "INSTANT HTTPS WEBHOOKS",
      ],
      powershellCheck: `Get-FileHash .\\IPScans-Cortex-1.0.0-rc.2.exe -Algorithm SHA256`,
      screenshots: [
        {
          id: "cortex-console",
          label: isTr ? "Cortex Konsolu" : "Cortex Console",
          title: isTr ? "Çok Kanallı RTSP Akış Denetleyicisi" : "Multi-Stream RTSP Video Controller",
          tag: "RTSP WALL",
          image: "/cortex-preview.png",
        },
        {
          id: "cortex-rules",
          label: isTr ? "12 Yerel Kural" : "12 Local Rules",
          title: isTr ? "Gemma Vision AI & Model-Bağımsız Kural Matrisi" : "Gemma Vision AI & Model-Free Rule Matrix",
          tag: "RULE MATRIX",
          renderType: "cortex-rules",
        },
        {
          id: "cortex-events",
          label: isTr ? "Kanıt & Webhook" : "Proof Archive",
          title: isTr ? "12s Video Kanıt Arşivi & HTTPS Webhook" : "12s Video Evidence Archive & HTTPS Webhooks",
          tag: "EVIDENCE ARCHIVE",
          renderType: "cortex-events",
        },
      ],
    },
  ];

  const browserTools = toolKeys.map((key) => ({
    id: key,
    name: dict[key].title,
    subtitle: dict[key].subtitle,
    href: toolPath(key, locale),
    badge: key === "speedTest" ? "TELEMETRY" : "EDGE API",
  }));

  const filteredApps = flagshipApps.filter((app) =>
    `${app.name} ${app.tagline} ${app.description}`
      .toLocaleLowerCase(locale)
      .includes(searchQuery.toLocaleLowerCase(locale))
  );

  return (
    <div className="w-full space-y-16 py-4">

      {/* 1. Top Header & Navigation Switcher */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-6">
        <div>
          <span className="font-mono text-xs tracking-widest text-neutral-400 uppercase">
            01 / {isTr ? "WINDOWS MASAÜSTÜ MÜHENDİSLİK PAKETİ" : "WINDOWS DESKTOP ENGINEERING SUITE"}
          </span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {isTr ? "Doğrudan Windows için Derlenmiş Masaüstü Araçları" : "Native Windows Executable Applications"}
          </h2>
          <p className="mt-2 text-sm text-neutral-400 max-w-2xl leading-relaxed">
            {isTr
              ? "Her biri yerel x64 mimarisinde bağımsız olarak çalışan, donanım hızlandırmalı ve çevrimdışı öncelikli 4 profesyonel masaüstü uygulaması."
              : "Four standalone 64-bit desktop executables built for Windows 10 & 11 with hardware acceleration and zero cloud dependencies."}
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`cursor-pointer rounded-full px-4 py-2 font-mono text-xs transition-colors ${
              activeFilter === "all"
                ? "bg-white font-bold text-black"
                : "border border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white hover:border-white/20"
            }`}
          >
            {isTr ? "Tümü" : "All"} ({flagshipApps.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("desktop")}
            className={`cursor-pointer rounded-full px-4 py-2 font-mono text-xs transition-colors ${
              activeFilter === "desktop"
                ? "bg-white font-bold text-black"
                : "border border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white hover:border-white/20"
            }`}
          >
            EXE ({flagshipApps.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("web")}
            className={`cursor-pointer rounded-full px-4 py-2 font-mono text-xs transition-colors ${
              activeFilter === "web"
                ? "bg-white font-bold text-black"
                : "border border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white hover:border-white/20"
            }`}
          >
            Web ({browserTools.length})
          </button>
        </div>
      </div>

      {/* 2. The 4 Flagship EXE Bento Showcases (Active when filter is 'all' or 'desktop') */}
      {(activeFilter === "all" || activeFilter === "desktop") && (
        <section aria-label="Desktop Executable Applications" className="space-y-12">
          {filteredApps.map((app) => (
            <article
              key={app.id}
              className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#07090E] p-6 sm:p-10 transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_50px_rgba(0,0,0,0.8)]"
            >
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                
                {/* Left Column: Architectural Specs & Download Center */}
                <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
                  
                  {/* Top Badge & Identifier */}
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Image
                        src={app.icon}
                        alt=""
                        width={44}
                        height={44}
                        className="rounded-xl border border-white/15 bg-white/5 p-1"
                      />
                      <span className={`rounded-full border px-3 py-1 font-mono text-xs font-semibold ${app.badgeColor}`}>
                        {app.badge}
                      </span>
                      <span className="font-mono text-xs text-neutral-400">
                        v{app.version} · {app.platform}
                      </span>
                    </div>

                    <h3 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                      {app.name}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-neutral-300">
                      {app.tagline}
                    </p>
                    <p className="mt-3 text-sm text-neutral-300 leading-relaxed">
                      {app.description}
                    </p>
                  </div>

                  {/* Capabilities Chips */}
                  <div className="flex flex-wrap gap-2">
                    {app.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-neutral-300"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>

                  {/* Action Center: Download Buttons */}
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <a
                        href={app.installerUrl}
                        className="group/btn relative inline-flex items-center justify-center gap-2.5 rounded-xl bg-white px-6 py-3.5 font-mono text-xs font-bold text-black transition-all hover:bg-neutral-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] active:scale-95"
                      >
                        <span>{isTr ? "Windows Kurulumu İndir · EXE" : "Download Windows Installer · EXE"}</span>
                        <span className="rounded bg-black/10 px-2 py-0.5 text-[10px] text-neutral-700">
                          {app.sizeMb} MB
                        </span>
                        <span className="text-sm">↓</span>
                      </a>

                      {app.portableUrl && (
                        <a
                          href={app.portableUrl}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3.5 font-mono text-xs font-medium text-neutral-200 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
                        >
                          <span>{isTr ? "Taşınabilir EXE (Portable)" : "Portable EXE"}</span>
                          <span className="text-neutral-400">↗</span>
                        </a>
                      )}

                      <Link
                        href={app.detailUrl}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-3.5 font-mono text-xs text-neutral-400 transition-colors hover:border-white/20 hover:text-white"
                      >
                        <span>{isTr ? "Detaylar & Notlar" : "Release Notes"}</span>
                        <span>→</span>
                      </Link>
                    </div>

                    {/* SHA-256 Checksum Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/40 p-3 text-xs font-mono text-neutral-400">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-neutral-500 uppercase tracking-wider text-[10px]">SHA-256:</span>
                        <code className="text-neutral-300 truncate max-w-[220px] sm:max-w-xs">
                          {app.sha256}
                        </code>
                      </div>
                      <CopyHashButton hash={app.sha256} label={isTr ? "Kopyala" : "Copy"} />
                    </div>
                  </div>

                </div>

                {/* Right Column: 5-Second 3-Screenshot App Store Carousel */}
                <div className="lg:col-span-6">
                  <AppStoreCarousel
                    appId={app.id}
                    appName={app.name}
                    screenshots={app.screenshots}
                    locale={locale}
                    intervalMs={5000}
                  />
                </div>

              </div>
            </article>
          ))}
        </section>
      )}

      {/* 4. Separate Zero-Install Web Diagnostics Section */}
      {(activeFilter === "all" || activeFilter === "web") && (
        <section aria-label="Browser Diagnostic Tools" className="pt-6">
          <div className="border-b border-white/[0.08] pb-6 mb-8">
            <span className="font-mono text-xs tracking-widest text-neutral-400 uppercase">
              02 / {isTr ? "TARAYICI TANI ARAÇLARI" : "BROWSER DIAGNOSTIC TOOLS"}
            </span>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {isTr ? "Kurulum Gerektirmeyen Çevrimiçi Tanı Araçları" : "Zero-Install Web Diagnostics"}
            </h3>
            <p className="mt-1 text-sm text-neutral-400">
              {isTr
                ? "İndirme yapmadan doğrudan tarayıcınızdan çalışan yüksek hızlı edge telemetri ve sorgu araçları."
                : "Instant telemetry and network queries running directly in your browser with zero installation."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {browserTools.map((tool) => (
              <Link
                key={tool.id}
                href={tool.href}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#07090E] p-6 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.02]"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-neutral-400">
                      {tool.badge}
                    </span>
                    <span className="text-neutral-500 group-hover:text-white group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </div>
                  <h4 className="mt-4 text-xl font-bold text-white group-hover:text-neutral-200 transition-colors">
                    {tool.name}
                  </h4>
                  <p className="mt-2 text-xs text-neutral-400 leading-relaxed">
                    {tool.subtitle}
                  </p>
                </div>

                <div className="mt-6 border-t border-white/[0.06] pt-4 font-mono text-xs text-neutral-500 flex items-center justify-between">
                  <span>ONLINE EDGE</span>
                  <span className="text-neutral-300 group-hover:underline">
                    {isTr ? "Aracı Aç ↗" : "Launch Tool ↗"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
