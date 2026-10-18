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
import { AppLiveDemo } from "./AppLiveDemo";

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
  const [activeInteractiveTour, setActiveInteractiveTour] = useState<"scanner" | "ipcast" | "lpr-pro">("scanner");
  const [activeFilter, setActiveFilter] = useState<"all" | "desktop" | "web">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const cortexReleaseUrl = "https://github.com/demiirrr25-create/ipscans-depo/releases/download/cortex-v1.0.0-rc.2/IPScans-Cortex-1.0.0-rc.2.exe";

  const flagshipApps = [
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
      badgeColor: "text-[#00F0FF] border-[#00F0FF]/30 bg-[#00F0FF]/10",
      capabilities: [
        "SUB-2S 254 HOST SWEEP",
        "RAW ARP / ICMP SOCKETS",
        "LLDP/CDP TOPOLOGY TREE",
        "ONVIF CAMERA DISCOVERY",
        "ONE-CLICK WEB UI & PDF",
      ],
      powershellCheck: `Get-FileHash .\\IPscans-Plus-Setup.exe -Algorithm SHA256`,
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
      badgeColor: "text-[#00FF9D] border-[#00FF9D]/30 bg-[#00FF9D]/10",
      capabilities: [
        "9-DIGIT PEER ADDRESS",
        "DIRECT UDP HOLE-PUNCHING",
        "AES-256-GCM TUNNEL",
        "GPU 60 FPS ACCELERATION",
        "DRAG & DROP FILE RELAY",
      ],
      powershellCheck: `Get-FileHash .\\IPCast-2.6.0-Setup.exe -Algorithm SHA256`,
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
      badgeColor: "text-amber-400 border-amber-400/30 bg-amber-400/10",
      capabilities: [
        "5-PAGE OPERATOR CONSOLE",
        "ONNX RUNTIME OCR (%98.6)",
        "RTSP 4K CAMERA WALL",
        "SUB-200MS RELAY BARRIER",
        "RESIDENT FLEET REGISTRY",
      ],
      powershellCheck: `Get-FileHash .\\${lprRelease.fileName} -Algorithm SHA256`,
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
      badgeColor: "text-purple-400 border-purple-400/30 bg-purple-400/10",
      capabilities: [
        "12 MODEL-FREE RULES",
        "GEMMA VISION AI",
        "ZERO CLOUD TELEMETRY",
        "12S VIDEO PROOF ARCHIVE",
        "INSTANT HTTPS WEBHOOKS",
      ],
      powershellCheck: `Get-FileHash .\\IPScans-Cortex-1.0.0-rc.2.exe -Algorithm SHA256`,
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

      {/* 1. Suite Security & Architecture Guarantees Strip */}
      <section
        aria-label="Security and Architecture Assurances"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#00FF9D]/30 bg-[#00FF9D]/10 text-lg text-[#00FF9D]">
            🛡️
          </span>
          <div>
            <div className="font-mono text-xs font-semibold text-white">VirusTotal 0/72 Clean</div>
            <div className="text-[11px] text-neutral-400">
              {isTr ? "Sıfır kötü amaçlı yazılım · Temiz" : "Zero malware · Clean build"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#00F0FF]/30 bg-[#00F0FF]/10 text-lg text-[#00F0FF]">
            🔐
          </span>
          <div>
            <div className="font-mono text-xs font-semibold text-white">SHA-256 Verified</div>
            <div className="text-[11px] text-neutral-400">
              {isTr ? "Kriptografik bütünlük kontrolü" : "Cryptographic integrity match"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-lg text-amber-400">
            ⚡
          </span>
          <div>
            <div className="font-mono text-xs font-semibold text-white">100% Offline by Design</div>
            <div className="text-[11px] text-neutral-400">
              {isTr ? "Sıfır telemetri · Tamamen yerel" : "Zero telemetry · Pure local execution"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-purple-400/30 bg-purple-400/10 text-lg text-purple-400">
            ⚙️
          </span>
          <div>
            <div className="font-mono text-xs font-semibold text-white">Native Standalone EXEs</div>
            <div className="text-[11px] text-neutral-400">
              {isTr ? "Ek çalışma zamanı gerektirmez" : "Zero external runtime dependencies"}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Top Header & Navigation Switcher */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-6">
        <div>
          <span className="font-mono text-xs tracking-widest text-[#00F0FF] uppercase">
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

      {/* 3. The 4 Flagship EXE Bento Showcases (Active when filter is 'all' or 'desktop') */}
      {(activeFilter === "all" || activeFilter === "desktop") && (
        <section aria-label="Desktop Executable Applications" className="space-y-12">
          {filteredApps.map((app, index) => (
            <article
              key={app.id}
              className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#07090E] p-6 sm:p-10 transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_50px_rgba(0,0,0,0.8)]"
            >
              {/* Subtle Ambient Corner Aura */}
              <div
                className={`pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full blur-3xl opacity-20 ${
                  index % 2 === 0 ? "bg-[#00F0FF]" : "bg-[#00FF9D]"
                }`}
                aria-hidden="true"
              />

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
                    <p className="mt-1 text-sm font-medium text-[#00F0FF]">
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

                {/* Right Column: Realistic Window Mockup Frame */}
                <div className="lg:col-span-6">
                  <Link href={app.detailUrl} className="block group/media">
                    <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl transition-transform duration-500 group-hover/media:scale-[1.01]">
                      
                      {/* Window Header Bar */}
                      <div className="flex items-center justify-between border-b border-white/10 bg-[#0B0D13] px-4 py-2.5 text-xs select-none">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F56]" />
                          <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
                          <span className="h-2.5 w-2.5 rounded-full bg-[#27C93F]" />
                          <span className="ml-2 font-mono text-[11px] text-neutral-400 font-medium">
                            {app.name} · v{app.version}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-[#00F0FF] uppercase tracking-wider">
                          LIVE RUNTIME
                        </span>
                      </div>

                      {/* Viewport Image */}
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#050608]">
                        <Image
                          src={app.preview}
                          alt={app.name}
                          width={1440}
                          height={900}
                          className="h-full w-full object-cover object-top transition-transform duration-700 group-hover/media:scale-105"
                        />
                      </div>
                    </div>
                  </Link>
                </div>

              </div>
            </article>
          ))}
        </section>
      )}

      {/* 4. Interactive Application Tour Preview Section */}
      <section
        aria-label="Interactive Product Tour"
        className="rounded-3xl border border-white/[0.08] bg-[#07090E] p-6 sm:p-10"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div>
            <span className="font-mono text-xs tracking-widest text-[#00F0FF] uppercase">
              02 / {isTr ? "İNTERAKTİF UYGULAMA SİMÜLASYONU" : "INTERACTIVE APPLICATION SIMULATION"}
            </span>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {isTr ? "İndirmeden Önce Arayüzü Canlı Deneyimleyin" : "Test-Drive The Native Interfaces Live"}
            </h3>
            <p className="mt-1 text-sm text-neutral-400">
              {isTr
                ? "Masaüstü uygulamalarımızın gerçek ekran akışlarını ve telemetri motorunu tarayıcınızda adım adım inceleyin."
                : "Step through authentic workflow views and telemetry data before launching on your PC."}
            </p>
          </div>

          {/* App Switcher Tabs */}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 p-1">
            <button
              type="button"
              onClick={() => setActiveInteractiveTour("scanner")}
              className={`cursor-pointer rounded-lg px-4 py-2 font-mono text-xs transition-colors ${
                activeInteractiveTour === "scanner"
                  ? "bg-white text-black font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              IPscans+
            </button>
            <button
              type="button"
              onClick={() => setActiveInteractiveTour("ipcast")}
              className={`cursor-pointer rounded-lg px-4 py-2 font-mono text-xs transition-colors ${
                activeInteractiveTour === "ipcast"
                  ? "bg-white text-black font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              IPCast
            </button>
            <button
              type="button"
              onClick={() => setActiveInteractiveTour("lpr-pro")}
              className={`cursor-pointer rounded-lg px-4 py-2 font-mono text-xs transition-colors ${
                activeInteractiveTour === "lpr-pro"
                  ? "bg-white text-black font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              LPR Pro
            </button>
          </div>
        </div>

        {/* The Live Interactive Demo Component */}
        <div className="mt-8">
          <AppLiveDemo
            appId={activeInteractiveTour}
            appName={
              activeInteractiveTour === "scanner"
                ? "IPscans+"
                : activeInteractiveTour === "ipcast"
                ? "IPCast"
                : "IPScans LPR Pro"
            }
            version={
              activeInteractiveTour === "scanner"
                ? desktopRelease.scanner.version
                : activeInteractiveTour === "ipcast"
                ? ipcastRelease.version
                : lprRelease.version
            }
            locale={locale}
          />
        </div>
      </section>

      {/* 5. Separate Zero-Install Web Diagnostics Section */}
      {(activeFilter === "all" || activeFilter === "web") && (
        <section aria-label="Browser Diagnostic Tools" className="pt-6">
          <div className="border-b border-white/[0.08] pb-6 mb-8">
            <span className="font-mono text-xs tracking-widest text-[#00FF9D] uppercase">
              03 / {isTr ? "TARAYICI TANI ARAÇLARI" : "BROWSER DIAGNOSTIC TOOLS"}
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
                    <span className="text-[#00F0FF] group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </div>
                  <h4 className="mt-4 text-xl font-bold text-white group-hover:text-[#00F0FF] transition-colors">
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
