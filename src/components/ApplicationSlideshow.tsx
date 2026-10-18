"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import type { Locale } from "@/i18n/config";
import { uiText } from "@/i18n/ui";

export interface SlideMetric {
  label: string;
  value: string;
  detail: string;
}

export interface ApplicationSlide {
  id: string;
  tabLabel: string;
  title: string;
  tag: string;
  description: string;
  image?: string;
  badge?: string;
  metrics: SlideMetric[];
  customView?: "oobe" | "audit" | "ipcast-security" | "ipcast-transfer" | "ipcast-monitor" | "lpr-calibration" | "lpr-registry" | "lpr-relay";
}

interface ApplicationSlideshowProps {
  slides: ApplicationSlide[];
  locale: Locale;
  appName: string;
  platform?: string;
}

export function ApplicationSlideshow({
  slides,
  locale,
  appName,
}: ApplicationSlideshowProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const nextSlide = useCallback(() => {
    setActiveIdx((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setActiveIdx((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, nextSlide]);

  const current = slides[activeIdx];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  return (
    <div className="relative mx-auto w-full max-w-6xl my-8">
      {/* Top Controls: Interactive Slide Tabs & Pagination */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="tablist">
          {slides.map((s, idx) => {
            const isActive = idx === activeIdx;
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => {
                  setActiveIdx(idx);
                  setIsAutoPlaying(false);
                }}
                className={`group relative flex items-center gap-2 rounded-full px-4 py-2 text-xs font-mono font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] font-semibold"
                    : "border border-white/10 bg-white/[0.03] text-neutral-400 hover:border-white/25 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <span>{s.tabLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Action controls: Prev / Next / Auto-play */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-neutral-500 mr-1">
            {activeIdx + 1} / {slides.length}
          </span>
          <button
            type="button"
            onClick={prevSlide}
            aria-label={uiText(locale, "Previous view", "Önceki görünüm")}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-neutral-300 hover:border-white/30 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            ←
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label={uiText(locale, "Next view", "Sonraki görünüm")}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-neutral-300 hover:border-white/30 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            →
          </button>
        </div>
      </div>

      {/* Main Showcase Mockup Frame with Obsidian Obsidian Styling */}
      <div className="overflow-hidden rounded-[24px] border border-[#1C1D24] bg-[#000000] shadow-2xl transition-all">
        {/* Titlebar Chrome */}
        <div className="flex items-center justify-between border-b border-[#16171E] bg-[#07080B] px-5 py-3.5 text-xs font-mono">
          <div className="flex items-center gap-2" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-[#FF5F56]/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-[#FFBD2E]/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-[#27C93F]/80 inline-block" />
          </div>

          <div className="flex items-center gap-2 truncate px-3">
            <span className="font-semibold text-white tracking-wide">{appName}</span>
            <span className="text-[#3A3C44]">·</span>
            <span className="text-neutral-400 truncate">{current.title}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-neutral-400 uppercase tracking-wider">
              {current.tag}
            </span>
          </div>
        </div>

        {/* Viewport: Live Image or Interactive Render View */}
        <div className="relative min-h-[360px] sm:min-h-[460px] lg:min-h-[540px] w-full bg-[#050608] flex items-center justify-center overflow-hidden">
          {current.image ? (
            <div className="relative h-full w-full">
              <Image
                src={current.image}
                alt={current.title}
                width={1440}
                height={900}
                className="h-full w-full object-cover object-top transition-opacity duration-300"
                priority
              />
            </div>
          ) : (
            <CustomSlideRenderer view={current.customView} locale={locale} />
          )}
        </div>

        {/* Bottom Context & Telemetry Cards for the Active Slide */}
        <div className="border-t border-[#16171E] bg-[#07080B] p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <div className="flex items-center gap-2.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                <span className="font-mono text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  {current.tag}
                </span>
              </div>
              <h3 className="heading-4 mt-2 text-white">{current.title}</h3>
              <p className="body mt-2 text-neutral-400 text-sm leading-relaxed">
                {current.description}
              </p>
            </div>

            {/* Slide-specific Capability Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
              {current.metrics.map((m, mIdx) => (
                <div
                  key={mIdx}
                  className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-left transition-colors hover:border-white/15"
                >
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                    {m.label}
                  </p>
                  <p className="mt-1 text-sm sm:text-base font-bold text-white tracking-tight">
                    {m.value}
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-0.5 truncate">
                    {m.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom High-Tech Vector Visualizations for views without static PNGs
function CustomSlideRenderer({
  view,
  locale,
}: {
  view?: ApplicationSlide["customView"];
  locale: Locale;
}) {
  const tr = locale === "tr";

  if (view === "oobe") {
    // Windows 11 Pro OOBE Mockup View
    return (
      <div className="relative flex h-full w-full min-h-[460px] flex-col items-center justify-center bg-black p-8 text-center select-none">
        {/* Subtle radial particle ring */}
        <div className="pointer-events-none absolute h-72 w-72 rounded-full border border-white/[0.06] bg-[radial-gradient(circle,rgba(255,255,255,0.08)_0%,transparent_70%)] animate-pulse" />
        
        <div className="relative z-10 flex flex-col items-center max-w-lg">
          <div className="h-14 w-14 rounded-2xl border border-white/20 bg-white/5 flex items-center justify-center text-2xl shadow-[0_0_25px_rgba(255,255,255,0.15)] mb-4">
            ⚡
          </div>
          <h4 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight font-sans">
            {tr ? "Merhaba" : "Hello"}
          </h4>
          <p className="mt-2 text-xs font-mono text-neutral-400 tracking-wide">
            {tr
              ? "IPScans Windows 11 Pro Karşılama Deneyimi"
              : "IPScans Windows 11 Pro Welcome Experience"}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 w-full max-w-sm text-left font-sans">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
              <span className="text-sm">⚡</span>
              <p className="font-semibold text-white mt-1">{tr ? "Milisaniye Keşfi" : "Millisecond Discovery"}</p>
              <p className="text-[11px] text-neutral-500">{tr ? "Sıfır gecikmeli ARP & ICMP" : "Zero-latency sweeps"}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
              <span className="text-sm">🗺️</span>
              <p className="font-semibold text-white mt-1">{tr ? "Canlı Topoloji" : "Live Topology"}</p>
              <p className="text-[11px] text-neutral-500">{tr ? "İnteraktif ağ haritası" : "Interactive network map"}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-2">
            <div className="h-1 w-64 rounded-full bg-white/10 overflow-hidden relative">
              <div className="h-full w-2/3 bg-white rounded-full shadow-[0_0_10px_white]" />
            </div>
            <span className="font-mono text-[10px] text-neutral-500">
              {tr ? "Uygulama başlatılıyor... (%75)" : "Launching workspace... (75%)"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (view === "audit") {
    // Enterprise Audit Report Mockup View
    return (
      <div className="relative flex h-full w-full min-h-[460px] flex-col justify-center bg-[#07080B] p-6 sm:p-10 font-mono text-xs select-none">
        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0C0D12] p-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="font-bold text-white tracking-wider">IPSCANS AUDIT REPORT #NET-440</span>
              <p className="text-[10px] text-neutral-500 mt-0.5">{new Date().toISOString()} · SHA-256 VERIFIED</p>
            </div>
            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-400 font-semibold">
              PASSED · 254 NODES
            </span>
          </div>

          <div className="mt-5 space-y-2.5">
            {[
              { ip: "192.168.1.1", mac: "00:1A:2B:3C:4D:5E", name: "Gateway Router (Cisco GbE)", status: "SECURE" },
              { ip: "192.168.1.15", mac: "B8:27:EB:11:22:33", name: "Core Switch 24-Port", status: "VERIFIED" },
              { ip: "192.168.1.42", mac: "DC:A6:32:88:99:AA", name: "Axis Q1656 IP Camera", status: "ONVIF ACTIVE" },
              { ip: "192.168.1.108", mac: "3C:06:30:44:55:66", name: "Synology RackStation NAS", status: "SECURE" },
            ].map((node, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3.5 py-2 text-[11px]">
                <div className="flex items-center gap-3">
                  <span className="text-white font-semibold">{node.ip}</span>
                  <span className="text-neutral-500 font-mono">{node.mac}</span>
                  <span className="text-neutral-300 hidden sm:inline">{node.name}</span>
                </div>
                <span className="text-emerald-400 font-semibold text-[10px]">{node.status}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-[11px] text-neutral-400">
            <span>Cryptographic Checksum: <code className="text-neutral-200">10c273db2aee...</code></span>
            <span className="text-white font-semibold">One-Click PDF / CSV Export</span>
          </div>
        </div>
      </div>
    );
  }

  if (view === "ipcast-security") {
    // IPCast Security PIN & Device Authorization Mockup View
    return (
      <div className="relative flex h-full w-full min-h-[460px] flex-col items-center justify-center bg-[#07080B] p-8 text-center font-mono select-none">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0C0D12] p-6 shadow-2xl">
          <div className="h-10 w-10 mx-auto rounded-xl border border-white/15 bg-white/5 flex items-center justify-center text-lg mb-3">
            🛡️
          </div>
          <h5 className="text-base font-bold text-white tracking-wide">
            {tr ? "İki Taraflı Erişim Onayı" : "Two-Way Access Authorization"}
          </h5>
          <p className="text-xs text-neutral-400 mt-1">
            {tr ? "Hedef cihaz bağlantı isteğinde bulunuyor" : "Inbound remote connection request"}
          </p>

          <div className="my-5 rounded-xl border border-white/10 bg-[#060709] p-4 text-center">
            <span className="text-[10px] uppercase text-neutral-500 tracking-widest">{tr ? "CİHAZ KİMLİĞİ" : "DEVICE ID"}</span>
            <p className="text-3xl font-extrabold text-white tracking-widest mt-1">481 920 375</p>
            <span className="text-[10px] text-emerald-400 mt-1 block">TLS 1.3 AES-256-GCM ENCRYPTED</span>
          </div>

          <div className="flex gap-2">
            <button type="button" className="w-full rounded-xl bg-white py-2.5 text-xs font-bold text-black cursor-pointer">
              {tr ? "Bağlantıyı Onayla" : "Approve Connection"}
            </button>
            <button type="button" className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-neutral-300 cursor-pointer">
              {tr ? "Reddet" : "Reject"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "ipcast-transfer") {
    // IPCast Direct P2P File Transfer Mockup View
    return (
      <div className="relative flex h-full w-full min-h-[460px] flex-col justify-center bg-[#07080B] p-6 sm:p-10 font-mono text-xs select-none">
        <div className="mx-auto w-full max-w-xl rounded-2xl border border-white/10 bg-[#0C0D12] p-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="font-bold text-white tracking-wider">
              {tr ? "P2P DOĞRUDAN DOSYA AKTARIMI" : "P2P DIRECT FILE TRANSFER"}
            </span>
            <span className="text-emerald-400 font-semibold">112.4 MB/s (GbE)</span>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-white">Firmware_Update_v2.4.bin</span>
                <span className="text-neutral-400">842 MB / 1.2 GB (70%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-[70%] bg-white rounded-full shadow-[0_0_10px_white]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-white">Telemetry_Logs_Archive.tar.gz</span>
                <span className="text-emerald-400">100% COMPLETE · VERIFIED</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-full bg-emerald-400 rounded-full" />
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-white/10 pt-3 flex justify-between text-[10px] text-neutral-500">
            <span>Chunks: 1,480/2,048 · Automatic Resume</span>
            <span>SHA-256 Checksum Matching</span>
          </div>
        </div>
      </div>
    );
  }

  if (view === "lpr-calibration") {
    // LPR Pro Trigger Crossing Line Calibration Mockup View
    return (
      <div className="relative flex h-full w-full min-h-[460px] flex-col items-center justify-center bg-[#060709] p-8 text-center font-mono select-none">
        <div className="relative w-full max-w-xl rounded-2xl border border-white/15 bg-black p-5 shadow-2xl overflow-hidden">
          {/* Simulated camera frame */}
          <div className="relative h-64 w-full rounded-xl border border-white/10 bg-[#0B0C10] flex items-center justify-center overflow-hidden">
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
            
            {/* Green Trigger Line */}
            <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 border-t-2 border-emerald-400 flex items-center justify-between px-2 text-[10px] text-emerald-400 font-bold">
              <span>◄ ENTRY TRIGGER LINE</span>
              <span>CALIBRATION CONFIRMED ►</span>
            </div>

            {/* Simulated Bounding Box for License Plate */}
            <div className="absolute top-[40%] left-[45%] h-10 w-28 rounded border-2 border-cyan-400 bg-cyan-400/10 flex items-center justify-center text-cyan-300 font-bold text-xs tracking-wider shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              34 ABC 123
            </div>

            <span className="absolute bottom-2 left-3 text-[10px] text-neutral-500">
              GATE_01 · 1080p @ 60 FPS · D3D11 HARDWARE DECODE
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-neutral-400">
            <span>Sensitivity: 98% · Min Confidence: 0.90</span>
            <span className="text-white font-semibold">Polygon & Crossing Vector Active</span>
          </div>
        </div>
      </div>
    );
  }

  // Fallback generic high-tech preview
  return (
    <div className="flex h-full w-full min-h-[460px] items-center justify-center bg-[#07080B] p-8 font-mono text-neutral-500 text-xs">
      <span>High-Performance Live Telemetry Surface</span>
    </div>
  );
}
