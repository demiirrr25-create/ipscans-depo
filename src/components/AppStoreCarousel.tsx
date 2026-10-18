"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import type { Locale } from "@/i18n/config";

export interface AppScreenshot {
  id: string;
  label: string;
  title: string;
  tag: string;
  image?: string;
  renderType?: "ipcast-stream" | "ipcast-files" | "lpr-calib" | "lpr-registry" | "cortex-rules" | "cortex-events";
}

interface AppStoreCarouselProps {
  appId: string;
  appName: string;
  screenshots: AppScreenshot[];
  intervalMs?: number;
  locale: Locale;
}

export function AppStoreCarousel({
  appId,
  appName,
  screenshots,
  intervalMs = 5000,
  locale,
}: AppStoreCarouselProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isTr = locale === "tr";

  const nextSlide = useCallback(() => {
    setActiveIdx((prev) => (prev + 1) % screenshots.length);
  }, [screenshots.length]);

  // Automated 5-second slide progression
  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setInterval(nextSlide, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, nextSlide, intervalMs]);

  const current = screenshots[activeIdx];

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#06070A] shadow-xl select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 1. Window Titlebar Chrome */}
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0A0C11] px-4 py-2.5 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F56]/80 inline-block" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]/80 inline-block" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#27C93F]/80 inline-block" />
          <span className="ml-2 font-medium text-white truncate max-w-[140px] sm:max-w-none">
            {appName}
          </span>
          <span className="text-neutral-600">·</span>
          <span className="text-[#00F0FF] text-[11px] truncate hidden sm:inline">
            {current.title}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-neutral-400">
          <span className="rounded bg-white/5 border border-white/10 px-2 py-0.5">
            {activeIdx + 1} / {screenshots.length}
          </span>
          {isPaused && (
            <span className="text-neutral-500 hidden sm:inline">
              ({isTr ? "Durduruldu" : "Paused"})
            </span>
          )}
        </div>
      </div>

      {/* 2. Visual Viewport (Compact Aspect Ratio) */}
      <div className="relative h-[240px] sm:h-[300px] w-full overflow-hidden bg-[#030406]">
        {current.image ? (
          <Image
            key={current.image}
            src={current.image}
            alt={current.title}
            width={1280}
            height={720}
            className="h-full w-full object-cover object-top transition-opacity duration-300"
            priority={activeIdx === 0}
          />
        ) : (
          <CustomInAppView type={current.renderType} isTr={isTr} />
        )}

        {/* Subtle Bottom Vignette */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#06070A] to-transparent" />
      </div>

      {/* 3. Bottom 3-Pill Navigation with 5-Second Animated Progress Fill */}
      <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#0A0C11] p-2.5 px-3">
        <div className="grid grid-cols-3 gap-2 w-full">
          {screenshots.map((s, idx) => {
            const isActive = idx === activeIdx;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className={`relative flex flex-col justify-center overflow-hidden rounded-lg px-2.5 py-1.5 text-left font-mono transition-all cursor-pointer ${
                  isActive
                    ? "border border-white/20 bg-white/10 text-white shadow-sm"
                    : "border border-transparent bg-white/[0.02] text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200"
                }`}
              >
                {/* 5-Second Fill Line inside the active pill */}
                {isActive && !isPaused && (
                  <div
                    key={`progress-${activeIdx}`}
                    className="absolute bottom-0 left-0 h-[2px] bg-[#00F0FF] animate-[progressFill_5s_linear]"
                    style={{ animationDuration: `${intervalMs}ms` }}
                  />
                )}

                <div className="flex items-center justify-between text-[10px]">
                  <span className={isActive ? "text-[#00F0FF] font-bold" : "text-neutral-500 font-semibold"}>
                    0{idx + 1}
                  </span>
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#00F0FF] animate-pulse" />}
                </div>

                <div className="truncate text-[11px] font-medium leading-tight mt-0.5">
                  {s.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// In-app authentic visual renders for secondary screens
function CustomInAppView({
  type,
  isTr,
}: {
  type?: AppScreenshot["renderType"];
  isTr: boolean;
}) {
  if (type === "ipcast-stream") {
    // IPCast 60 FPS Remote Desktop Session Screen
    return (
      <div className="relative flex h-full w-full flex-col justify-between bg-[#040508] p-4 font-mono text-xs select-none">
        <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[11px]">
          <span className="text-[#00FF9D] flex items-center gap-1.5 font-bold">
            <span className="h-2 w-2 rounded-full bg-[#00FF9D] animate-pulse" />
            CANLI P2P OTURUM: 842 190 327
          </span>
          <span className="text-neutral-400">60 FPS · 14ms Ping · D3D11 GPU</span>
        </div>

        <div className="my-auto mx-auto w-full max-w-sm rounded-xl border border-white/15 bg-[#090C12] p-4 text-center">
          <div className="text-2xl mb-1">🖥️</div>
          <div className="text-white font-bold text-sm">
            {isTr ? "Uzak Masaüstü Görüntü Akışı" : "Remote Desktop Video Stream"}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            {isTr ? "Çift yönlü klavye, fare ve kayıpsız stereo ses" : "Bi-directional input & stereo audio"}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-[#00F0FF]">
            AES-256-GCM UÇTAN UCA ŞİFRELİ
          </div>
        </div>

        <div className="border-t border-white/5 pt-2 flex justify-between text-[10px] text-neutral-500">
          <span>{isTr ? "Çözünürlük: 2560x1440" : "Resolution: 2560x1440"}</span>
          <span>VP9 Donanım Kodeği</span>
        </div>
      </div>
    );
  }

  if (type === "ipcast-files") {
    // IPCast P2P Direct File Transfer Pipeline
    return (
      <div className="relative flex h-full w-full flex-col justify-between bg-[#040508] p-4 font-mono text-xs select-none">
        <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[11px]">
          <span className="text-white font-bold">
            {isTr ? "ŞİFRELİ DOĞRUDAN DOSYA AKTARIMI" : "ENCRYPTED P2P FILE PIPELINE"}
          </span>
          <span className="text-[#00FF9D] font-bold">114.2 MB/s</span>
        </div>

        <div className="my-auto space-y-3 max-w-md mx-auto w-full">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-white font-semibold">Database_Backup_2026.sql.gz</span>
              <span className="text-[#00FF9D]">100% · TAMAMLANDI</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-full bg-[#00FF9D] rounded-full" />
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-white font-semibold">VirtualDisk_Ubuntu.vmdk</span>
              <span className="text-[#00F0FF]">1.4 GB / 2.0 GB (70%)</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-[70%] bg-[#00F0FF] rounded-full shadow-[0_0_8px_#00F0FF]" />
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-2 flex justify-between text-[10px] text-neutral-500">
          <span>{isTr ? "Otomatik Yeniden Devam" : "Auto-Resume Supported"}</span>
          <span>SHA-256 Blok Doğrulaması</span>
        </div>
      </div>
    );
  }

  if (type === "lpr-calib") {
    // LPR Pro Crossing Line Calibration Screen
    return (
      <div className="relative flex h-full w-full flex-col justify-between bg-[#030406] p-4 font-mono text-xs select-none">
        <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[11px]">
          <span className="text-amber-400 font-bold">
            CAM-01 · TETİK VE KALİBRASYON ÇİZGİSİ
          </span>
          <span className="text-neutral-400">RTSP 3840x2160 @ 30 FPS</span>
        </div>

        <div className="relative my-auto h-36 w-full rounded-xl border border-white/10 bg-[#07090E] flex items-center justify-center overflow-hidden">
          {/* Grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
          
          {/* Crossing tripwire line */}
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-[#00F0FF] flex justify-between px-2 text-[9px] text-[#00F0FF]">
            <span>◄ GİRİŞ TETİK ÇİZGİSİ (A)</span>
            <span>KALİBRE EDİLDİ ►</span>
          </div>

          {/* Bounding box */}
          <div className="relative rounded border-2 border-[#00FF9D] bg-[#00FF9D]/10 px-3 py-1 text-center shadow-[0_0_15px_rgba(0,255,157,0.3)]">
            <span className="text-[10px] text-[#00FF9D] block font-bold">YOLOv8 PLAKA (%99.2)</span>
            <span className="text-white font-bold text-sm tracking-wider">34 BJK 1903</span>
          </div>
        </div>

        <div className="border-t border-white/5 pt-2 flex justify-between text-[10px] text-neutral-500">
          <span>{isTr ? "Ters Yön Filtresi Aktif" : "Reverse Direction Filter"}</span>
          <span>D3D11 Donanım Çözücü</span>
        </div>
      </div>
    );
  }

  if (type === "lpr-registry") {
    // LPR Pro Vehicle Registry & Passage Events
    return (
      <div className="relative flex h-full w-full flex-col justify-between bg-[#040508] p-4 font-mono text-xs select-none">
        <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[11px]">
          <span className="text-white font-bold">
            {isTr ? "SAKİN KÜTÜĞÜ & GEÇİŞ GÜNLÜĞÜ" : "RESIDENT REGISTRY & LOG"}
          </span>
          <span className="text-[#00FF9D] font-bold">{isTr ? "BARİYER AÇIK" : "GATE GRANTED"}</span>
        </div>

        <div className="my-auto space-y-2 max-w-md mx-auto w-full">
          {[
            { plate: "34 BJK 1903", unit: "A Blok D:12", name: "Murat Kaya", status: "GEÇİŞ ONAYLANDI", color: "text-[#00FF9D]" },
            { plate: "06 ANK 2026", unit: "B Blok D:04", name: "Zeynep Demir", status: "GEÇİŞ ONAYLANDI", color: "text-[#00FF9D]" },
            { plate: "35 IZM 410", unit: "Misafir Araç", name: "Giriş İzni", status: "KAYDEDİLDİ", color: "text-amber-400" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-[11px]">
              <div>
                <span className="text-white font-bold mr-2">{item.plate}</span>
                <span className="text-neutral-400">{item.unit} · {item.name}</span>
              </div>
              <span className={`font-bold text-[10px] ${item.color}`}>{item.status}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-white/5 pt-2 flex justify-between text-[10px] text-neutral-500">
          <span>{isTr ? "Yerel SQLite Veritabanı" : "Local SQLite Database"}</span>
          <span>CSV / Excel Raporu</span>
        </div>
      </div>
    );
  }

  if (type === "cortex-rules") {
    // Cortex 12 Rules & Vision AI Configuration
    return (
      <div className="relative flex h-full w-full flex-col justify-between bg-[#040508] p-4 font-mono text-xs select-none">
        <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[11px]">
          <span className="text-purple-400 font-bold">
            {isTr ? "12 YEREL KURAL + GEMMA VISION" : "12 LOCAL RULES + VISION AI"}
          </span>
          <span className="text-neutral-400">{isTr ? "Model-Bağımsız Analiz" : "Model-Free Ingestion"}</span>
        </div>

        <div className="my-auto space-y-2 max-w-md mx-auto w-full">
          {[
            { rule: "Bölge İhlali (Intrusion)", cam: "Giriş Kapısı", trigger: "Alan Kesme > 2s", status: "AKTİF" },
            { rule: "Aydınlatma Parlaması (Tamper)", cam: "Otopark Kamera 2", trigger: "Ani Lüks Değişimi", status: "AKTİF" },
            { rule: "Gemma AI: İnsan / Araç Tespiti", cam: "Bahçe Çevre Çiti", trigger: "Kişi Doğrulandı (%96)", status: "TETİKLENDİ" },
          ].map((r, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-[11px]">
              <div>
                <div className="text-white font-bold">{r.rule}</div>
                <div className="text-[10px] text-neutral-400">{r.cam} · {r.trigger}</div>
              </div>
              <span className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-[#00F0FF]">
                {r.status}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-white/5 pt-2 flex justify-between text-[10px] text-neutral-500">
          <span>{isTr ? "Ollama Gemma Entegre" : "Ollama Gemma Integrated"}</span>
          <span>Sıfır Bulut Bağımlılığı</span>
        </div>
      </div>
    );
  }

  if (type === "cortex-events") {
    // Cortex 12s Video Proof Log & Webhook
    return (
      <div className="relative flex h-full w-full flex-col justify-between bg-[#040508] p-4 font-mono text-xs select-none">
        <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[11px]">
          <span className="text-white font-bold">
            {isTr ? "12 SANİYELİK KANIT VİDEO KAYITLARI" : "12-SECOND VIDEO EVIDENCE ARCHIVE"}
          </span>
          <span className="text-[#00FF9D] font-bold">WEBHOOK 200 OK</span>
        </div>

        <div className="my-auto space-y-2 max-w-md mx-auto w-full">
          <div className="rounded-lg border border-[#00F0FF]/30 bg-[#00F0FF]/5 p-3 flex items-center justify-between">
            <div>
              <div className="text-white font-bold text-[11px]">Kamera 01 · Tetikleyici: Bölge Girişi</div>
              <div className="text-[10px] text-neutral-400">12s MP4 Video Klip + Kanıt Fotoğrafı</div>
            </div>
            <span className="rounded bg-black/40 px-2 py-1 text-[10px] text-[#00F0FF]">
              İzle / İndir ↗
            </span>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 flex items-center justify-between">
            <div>
              <div className="text-white font-bold text-[11px]">Kamera 03 · Tetikleyici: Işık Sinyali</div>
              <div className="text-[10px] text-neutral-400">Örnek Kare Arşivlendi · 14:12:08</div>
            </div>
            <span className="rounded bg-black/40 px-2 py-1 text-[10px] text-neutral-300">
              Kayıtlı ✓
            </span>
          </div>
        </div>

        <div className="border-t border-white/5 pt-2 flex justify-between text-[10px] text-neutral-500">
          <span>{isTr ? "Yerel Şifreli Disk Arşivi" : "Local Encrypted Storage"}</span>
          <span>HTTPS Webhook Gönderildi</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center font-mono text-xs text-neutral-500">
      Visual Preview Surface
    </div>
  );
}
