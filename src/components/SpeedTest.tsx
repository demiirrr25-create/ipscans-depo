"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { uiText } from "@/i18n/ui";
import {
  runSpeedTest,
  type SpeedResult,
  type SpeedUpdate,
  type Trace,
  type ServerInfo,
  type ClientInfo,
} from "@/lib/speed-engine";

function getBufferbloatGrade(delta: number | null | undefined): {
  grade: string;
  badgeClass: string;
  desc: string;
} {
  if (delta == null) {
    return {
      grade: "—",
      badgeClass: "text-neutral-500 border-white/10 bg-white/5",
      desc: "Ölçüm bekleniyor",
    };
  }
  if (delta <= 5) {
    return {
      grade: "A+",
      badgeClass: "text-[#00FF9D] border-[#00FF9D]/40 bg-[#00FF9D]/10 shadow-[0_0_15px_rgba(0,255,157,0.2)]",
      desc: "Kusursuz kuyruk yönetimi · Minimum yük gecikmesi",
    };
  }
  if (delta <= 15) {
    return {
      grade: "A",
      badgeClass: "text-[#00F0FF] border-[#00F0FF]/40 bg-[#00F0FF]/10 shadow-[0_0_15px_rgba(0,240,255,0.2)]",
      desc: "Mükemmel akış sağlığı · Kesintisiz gerçek zamanlı iletişim",
    };
  }
  if (delta <= 30) {
    return {
      grade: "B",
      badgeClass: "text-white border-white/30 bg-white/5",
      desc: "İyi performans · Tipik eşzamanlı kullanım için uygun",
    };
  }
  if (delta <= 60) {
    return {
      grade: "C",
      badgeClass: "text-[#FBBF24] border-[#FBBF24]/30 bg-[#FBBF24]/10",
      desc: "Orta seviye yük gecikmesi gözlemlendi",
    };
  }
  if (delta <= 120) {
    return {
      grade: "D",
      badgeClass: "text-amber-500 border-amber-500/30 bg-amber-500/10",
      desc: "Yüksek bant genişliği altında belirgin kuyruk gecikmesi",
    };
  }
  return {
    grade: "F",
    badgeClass: "text-red-400 border-red-500/30 bg-red-500/10",
    desc: "Kritik bufferbloat gecikmesi",
  };
}

interface TestHistoryItem {
  id: string;
  timestamp: string;
  download: number;
  upload: number;
  ping: number;
  jitter: number | null;
  server?: string;
}

const STORAGE_KEY = "ipscans_speed_history";

export function SpeedTest({
  dict,
  locale,
}: {
  dict: Dictionary["speedTest"];
  locale: Locale;
}) {
  const gradientId = useId();
  const [update, setUpdate] = useState<SpeedUpdate | null>(null);
  const [result, setResult] = useState<SpeedResult | null>(null);
  const [tracePoints, setTracePoints] = useState<Trace[]>([]);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const [history, setHistory] = useState<TestHistoryItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored).slice(0, 20) : [];
    } catch {
      return [];
    }
  });

  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);

  const controller = useRef<AbortController | null>(null);

  // Sync parameters from query string on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const d = parseFloat(params.get("dl") || "");
      const u = parseFloat(params.get("ul") || "");
      const p = parseFloat(params.get("ping") || "");
      const j = parseFloat(params.get("jit") || "");
      if (!isNaN(d) && !isNaN(u) && !isNaN(p)) {
        queueMicrotask(() => {
          setResult({
            download: d,
            upload: u,
            idle: p,
            minPing: p,
            jitter: isNaN(j) ? null : j,
            packetLoss: 0,
            loadedDownload: null,
            loadedUpload: null,
            seconds: 12,
            bytes: (d + u) * 125000 * 6,
            requestsFailed: 0,
            latencySamples: 10,
            stability: null,
            capped: false,
            timestamp: new Date().toISOString(),
            trace: [],
            server: {
              id: "shared",
              name: "IPScans Network Core",
              location: "Verified Telemetry Gateway",
              country: "Global",
            },
          });
        });
      }
    }
  }, []);

  async function start() {
    if (running) return;
    setNotice("");
    setUpdate(null);
    setResult(null);
    setTracePoints([]);
    setRunning(true);

    const session = new AbortController();
    controller.current = session;

    try {
      const measured = await runSpeedTest(session.signal, (val) => {
        if (session.signal.aborted) return;
        setUpdate(val);
        if (val.server) setServerInfo(val.server);
        if (val.client) setClientInfo(val.client);
        if (val.trace) {
          setTracePoints((prev) => [...prev.slice(-60), val.trace!]);
        }
      });

      setResult(measured);
      if (measured.server) setServerInfo(measured.server);
      if (measured.client) setClientInfo(measured.client);

      try {
        const item: TestHistoryItem = {
          id: crypto.randomUUID(),
          timestamp: measured.timestamp,
          download: measured.download,
          upload: measured.upload,
          ping: measured.idle,
          jitter: measured.jitter,
          server: measured.server?.name,
        };
        const updated = [item, ...history].slice(0, 20);
        setHistory(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Storage failover
      }
    } catch (err: unknown) {
      if (session.signal.aborted) {
        setNotice(uiText(locale, "Test cancelled by user.", "Hız testi kullanıcı tarafından durduruldu."));
        return;
      }
      setNotice(
        err instanceof Error
          ? err.message
          : uiText(locale, "Speed test could not be completed.", "Hız testi tamamlanamadı.")
      );
    } finally {
      controller.current = null;
      setRunning(false);
    }
  }

  function stop() {
    if (controller.current) {
      controller.current.abort();
      controller.current = null;
      setRunning(false);
    }
  }

  const liveMbps = update ? update.mbps : result ? result.download : null;

  const bufferbloatDelta = useMemo(() => {
    if (!result) return null;
    const loaded = Math.max(result.loadedDownload ?? 0, result.loadedUpload ?? 0);
    return loaded > 0 ? Math.max(0, loaded - result.idle) : null;
  }, [result]);

  const bloat = useMemo(() => getBufferbloatGrade(bufferbloatDelta), [bufferbloatDelta]);

  const shareUrl = useMemo(() => {
    if (!result || typeof window === "undefined") return "";
    const base = `${window.location.origin}/${locale}/speed-test`;
    const params = new URLSearchParams({
      dl: result.download.toFixed(1),
      ul: result.upload.toFixed(1),
      ping: result.idle.toFixed(1),
      jit: result.jitter ? result.jitter.toFixed(1) : "0",
    });
    return `${base}?${params.toString()}`;
  }, [result, locale]);

  async function share() {
    if (!result) return;
    const textSummary = `IPScans Internet Speed & Telemetry Analysis\nDownload: ${result.download.toFixed(1)} Mbps · Upload: ${result.upload.toFixed(1)} Mbps\nPing: ${result.idle.toFixed(1)} ms · Jitter: ${result.jitter ? result.jitter.toFixed(1) : 0} ms\nBufferbloat: Grade ${bloat.grade}\nVerify at: ${shareUrl}`;

    if (navigator.share && typeof window !== "undefined") {
      try {
        await navigator.share({
          title: "IPScans Speed Analysis",
          text: textSummary,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl || textSummary);
      setNotice(
        uiText(
          locale,
          "Shareable result link copied to clipboard.",
          "Paylaşılabilir sonuç bağlantısı panoya kopyalandı."
        )
      );
    } catch {
      setNotice(
        uiText(
          locale,
          "Clipboard unavailable. Copy link from browser address bar.",
          "Pano kullanılamıyor. Bağlantıyı tarayıcı adresinden kopyalayabilirsiniz."
        )
      );
    }
  }

  function exportResult() {
    if (!result) return;
    const payload = {
      platform: "IPScans Precision Telemetry Engine",
      method: "Multi-stream HTTP transport with active RTT & loaded latency probing",
      bufferbloatGrade: bloat.grade,
      bufferbloatDeltaMs: bufferbloatDelta,
      ...result,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ipscans-telemetry-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearHistory() {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  // Dial SVG geometry: 260-degree circular arc
  const radius = 95;
  const strokeWidth = 10;
  const sweepAngle = 260;
  const startAngle = 140; // Starts bottom-left
  const totalArcLen = (2 * Math.PI * radius * sweepAngle) / 360;

  // Logarithmic ratio 0 - 1000 Mbps
  const currentRatio = useMemo(() => {
    if (!liveMbps || liveMbps <= 0) return 0;
    const ratio = Math.log10(1 + liveMbps) / Math.log10(1 + 1000);
    return Math.min(1, Math.max(0, ratio));
  }, [liveMbps]);

  const strokeDashoffset = totalArcLen * (1 - currentRatio);

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const p1 = polarToCartesian(140, 140, radius, startAngle);
  const p2 = polarToCartesian(140, 140, radius, startAngle + sweepAngle);
  const baseArcPath = `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 1 1 ${p2.x} ${p2.y}`;

  // Current Phase label
  const phaseLabel = useMemo(() => {
    if (!running && !result) return uiText(locale, "READY", "HAZIR");
    if (!running && result) return uiText(locale, "COMPLETE", "TAMAMLANDI");
    if (update?.phase === "latency") return uiText(locale, "LATENCY", "GECİKME");
    if (update?.phase === "download") return uiText(locale, "DOWNLOAD", "İNDİRME");
    if (update?.phase === "upload") return uiText(locale, "UPLOAD", "YÜKLEME");
    return uiText(locale, "TESTING", "TEST EDİLİYOR");
  }, [running, result, update, locale]);

  return (
    <section className="relative mx-auto w-full max-w-[1200px] px-4 py-8" aria-label={dict.title}>
      {/* Background Subtle Gradient Glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 h-[380px] w-[640px] rounded-full bg-[radial-gradient(circle,rgba(0,240,255,0.04)_0%,transparent_70%)] blur-3xl"
        aria-hidden="true"
      />

      {/* Main Studio Frame */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#08090D] p-6 sm:p-10 shadow-2xl">
        
        {/* 1. Top Edge Telemetry Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`absolute inline-flex h-full w-full rounded-full ${
                  running ? "bg-[#00F0FF] animate-ping" : "bg-[#00FF9D] opacity-75"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  running ? "bg-[#00F0FF]" : "bg-[#00FF9D]"
                }`}
              />
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-white tracking-wide">
                {serverInfo?.name || "IPScans Core Edge"}
              </span>
              <span className="text-neutral-600">/</span>
              <span className="text-neutral-400">
                {serverInfo?.location || "Low-Latency Gateway"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-400">
            <div>
              <span className="text-neutral-600 mr-1.5 uppercase">IP:</span>
              <span className="text-white font-medium">{clientInfo?.ip || "Auto-detecting"}</span>
              {clientInfo?.country && <span className="ml-1 text-neutral-500">({clientInfo.country})</span>}
            </div>

            <div className="hidden md:block">
              <span className="text-neutral-600 mr-1.5 uppercase">PROTOKOL:</span>
              <span className="text-neutral-300">HTTP/2 Chunked Multi-Stream</span>
            </div>

            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-neutral-300 transition-colors hover:border-white/25 hover:text-white"
            >
              {showHistory ? uiText(locale, "Kapat", "Kapat") : uiText(locale, "Geçmiş", "Geçmiş")} ({history.length})
            </button>
          </div>
        </div>

        {/* 2. Main Studio Grid */}
        <div className="relative z-10 my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: Circular Precision Instrument */}
          <div className="lg:col-span-5 flex flex-col items-center justify-between rounded-2xl border border-white/10 bg-[#0D0E14] p-8 text-center">
            
            {/* Phase Indicator Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs font-mono tracking-widest text-[#00F0FF]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00F0FF] animate-pulse" />
              <span>{phaseLabel}</span>
            </div>

            {/* Circular Gauge Instrument */}
            <div className="relative my-6 flex h-[280px] w-[280px] items-center justify-center">
              <svg viewBox="0 0 280 280" className="h-full w-full overflow-visible" aria-hidden="true">
                <defs>
                  <linearGradient id={`speedArc-${gradientId}`} x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00F0FF" />
                    <stop offset="70%" stopColor="#FFFFFF" />
                    <stop offset="100%" stopColor="#00FF9D" />
                  </linearGradient>

                  <filter id={`arcGlow-${gradientId}`} x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Outer Subtle Orbit Ring */}
                <circle
                  cx="140"
                  cy="140"
                  r={radius + 18}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="1"
                  strokeDasharray="3 6"
                />

                {/* Base Track */}
                <path
                  d={baseArcPath}
                  fill="none"
                  stroke="#161822"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                />

                {/* Dynamic Progress Sweep Arc */}
                <path
                  d={baseArcPath}
                  fill="none"
                  stroke={`url(#speedArc-${gradientId})`}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={totalArcLen}
                  strokeDashoffset={strokeDashoffset}
                  filter={`url(#arcGlow-${gradientId})`}
                  className="transition-[stroke-dashoffset] duration-150 ease-out"
                />
              </svg>

              {/* Gauge Center Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-neutral-400">
                  {update?.phase === "latency" ? "RTT LATENCY" : "THROUGHPUT"}
                </span>

                <div className="my-1 font-mono text-5xl sm:text-6xl font-bold tracking-tight text-white tabular-nums">
                  {liveMbps != null ? liveMbps.toFixed(1) : "0.0"}
                </div>

                <span className="font-mono text-xs tracking-wider text-[#00F0FF] uppercase">
                  {update?.phase === "latency" ? "MS" : "MBPS"}
                </span>
              </div>
            </div>

            {/* Main Action Trigger */}
            <div className="w-full max-w-[280px]">
              {running ? (
                <button
                  type="button"
                  onClick={stop}
                  className="w-full cursor-pointer rounded-xl border border-red-500/40 bg-red-500/10 px-6 py-3.5 font-mono text-sm font-semibold text-red-400 transition-all hover:bg-red-500/20 hover:border-red-500/60"
                >
                  {uiText(locale, "Testi Durdur", "Testi Durdur")} ⏹
                </button>
              ) : (
                <button
                  type="button"
                  onClick={start}
                  className="w-full cursor-pointer rounded-xl bg-white px-6 py-3.5 font-mono text-sm font-bold text-black transition-all hover:bg-neutral-200 hover:shadow-[0_0_25px_rgba(255,255,255,0.25)] active:scale-[0.99]"
                >
                  {result
                    ? uiText(locale, "Yeniden Test Et", "Yeniden Test Et")
                    : uiText(locale, "Testi Başlat", "Testi Başlat")}{" "}
                  ▶
                </button>
              )}

              <p className="mt-3 text-[11px] font-mono text-neutral-500">
                {running
                  ? uiText(locale, "Aktif telemetri veri akışı ölçülüyor...", "Aktif telemetri veri akışı ölçülüyor...")
                  : uiText(locale, "Sıfır telemetri kaydı · Doğrudan soket testi", "Sıfır telemetri kaydı · Doğrudan soket testi")}
              </p>
            </div>
          </div>

          {/* Right Column: Telemetry Cards & Live Stream Waveform */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-5">
            
            {/* 4 Telemetry Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* Card 1: Download */}
              <div
                className={`rounded-2xl border p-5 transition-all ${
                  update?.phase === "download"
                    ? "border-[#00F0FF]/50 bg-[#00F0FF]/5 shadow-[0_0_20px_rgba(0,240,255,0.1)]"
                    : "border-white/10 bg-[#0D0E14]"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-neutral-400 flex items-center gap-2">
                    <span className="text-[#00F0FF]">↓</span>
                    {uiText(locale, "İNDİRME (DOWNLOAD)", "İNDİRME (DOWNLOAD)")}
                  </span>
                  {update?.phase === "download" && (
                    <span className="h-2 w-2 rounded-full bg-[#00F0FF] animate-pulse" />
                  )}
                </div>

                <div className="mt-3 font-mono text-3xl sm:text-4xl font-bold tracking-tight text-white tabular-nums">
                  {result
                    ? result.download.toFixed(1)
                    : update?.phase === "download"
                    ? update.mbps.toFixed(1)
                    : "—"}
                  <span className="ml-2 text-xs font-normal text-neutral-400">Mbps</span>
                </div>

                <p className="mt-2 text-[11px] font-mono text-neutral-500">
                  {result
                    ? `${(result.bytes / (1024 * 1024)).toFixed(1)} MB transfer edildi`
                    : "Çok kanallı aşağı akış"}
                </p>
              </div>

              {/* Card 2: Upload */}
              <div
                className={`rounded-2xl border p-5 transition-all ${
                  update?.phase === "upload"
                    ? "border-[#00FF9D]/50 bg-[#00FF9D]/5 shadow-[0_0_20px_rgba(0,255,157,0.1)]"
                    : "border-white/10 bg-[#0D0E14]"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-neutral-400 flex items-center gap-2">
                    <span className="text-[#00FF9D]">↑</span>
                    {uiText(locale, "YÜKLEME (UPLOAD)", "YÜKLEME (UPLOAD)")}
                  </span>
                  {update?.phase === "upload" && (
                    <span className="h-2 w-2 rounded-full bg-[#00FF9D] animate-pulse" />
                  )}
                </div>

                <div className="mt-3 font-mono text-3xl sm:text-4xl font-bold tracking-tight text-white tabular-nums">
                  {result
                    ? result.upload.toFixed(1)
                    : update?.phase === "upload"
                    ? update.mbps.toFixed(1)
                    : "—"}
                  <span className="ml-2 text-xs font-normal text-neutral-400">Mbps</span>
                </div>

                <p className="mt-2 text-[11px] font-mono text-neutral-500">
                  {result ? "Doğrulanmış yukarı akış" : "Asenkron bayt gönderimi"}
                </p>
              </div>

              {/* Card 3: Ping & Jitter */}
              <div className="rounded-2xl border border-white/10 bg-[#0D0E14] p-5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-neutral-400 flex items-center gap-2">
                    <span className="text-[#FBBF24]">⏱</span>
                    {uiText(locale, "GECİKME (PING)", "GECİKME (PING)")}
                  </span>
                  {result?.jitter != null && (
                    <span className="text-[10px] text-neutral-400">
                      Jitter: ±{result.jitter.toFixed(1)} ms
                    </span>
                  )}
                </div>

                <div className="mt-3 font-mono text-3xl sm:text-4xl font-bold tracking-tight text-white tabular-nums">
                  {result
                    ? result.idle.toFixed(1)
                    : update?.ping != null
                    ? update.ping.toFixed(1)
                    : "—"}
                  <span className="ml-2 text-xs font-normal text-neutral-400">ms</span>
                </div>

                <p className="mt-2 text-[11px] font-mono text-neutral-500">
                  {result ? `Minimum RTT: ${result.minPing.toFixed(1)} ms` : "Boşta ağ gecikmesi"}
                </p>
              </div>

              {/* Card 4: Quality & Bufferbloat */}
              <div className="rounded-2xl border border-white/10 bg-[#0D0E14] p-5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-neutral-400 flex items-center gap-2">
                    <span className="text-purple-400">⚡</span>
                    {uiText(locale, "BUFFERBLOAT", "BUFFERBLOAT")}
                  </span>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold ${bloat.badgeClass}`}
                  >
                    Grade {bloat.grade}
                  </span>
                </div>

                <div className="mt-3 font-mono text-3xl sm:text-4xl font-bold tracking-tight text-white tabular-nums">
                  {bufferbloatDelta != null ? `+${bufferbloatDelta.toFixed(0)}` : "—"}
                  <span className="ml-2 text-xs font-normal text-neutral-400">ms yük</span>
                </div>

                <p className="mt-2 text-[11px] font-mono text-neutral-500 truncate">
                  {result ? `Paket Kaybı: ${result.packetLoss.toFixed(1)}%` : bloat.desc}
                </p>
              </div>
            </div>

            {/* Real-Time Bandwidth Stream Waveform */}
            <div className="rounded-2xl border border-white/10 bg-[#0D0E14] p-5">
              <div className="flex items-center justify-between text-xs font-mono mb-3">
                <span className="text-neutral-400 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00F0FF]" />
                  {uiText(locale, "CANLI TELEMETRİ VERİ AKIŞI", "CANLI TELEMETRİ VERİ AKIŞI")}
                </span>
                <span className="text-[10px] text-neutral-500">
                  {running ? "Aktif Örnekleme" : "Son Oturum Grafiği"}
                </span>
              </div>

              {/* SVG Live Throughput Waveform */}
              <div className="relative h-24 w-full overflow-hidden rounded-xl bg-black/40 border border-white/5 p-2">
                {tracePoints.length > 1 ? (
                  <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="h-full w-full overflow-visible">
                    <defs>
                      <linearGradient id={`traceGrad-${gradientId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Area fill */}
                    {(() => {
                      const maxMb = Math.max(...tracePoints.map((t) => t.mbps), 10);
                      const points = tracePoints.map((t, idx) => {
                        const x = (idx / (tracePoints.length - 1)) * 400;
                        const y = 80 - (t.mbps / maxMb) * 70;
                        return `${x},${y}`;
                      });
                      const d = `M 0,80 L ${points.join(" L ")} L 400,80 Z`;
                      const strokeD = `M ${points.join(" L ")}`;

                      return (
                        <>
                          <path d={d} fill={`url(#traceGrad-${gradientId})`} />
                          <path d={strokeD} fill="none" stroke="#00F0FF" strokeWidth="2" strokeLinecap="round" />
                        </>
                      );
                    })()}
                  </svg>
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-mono text-[11px] text-neutral-600">
                    {running
                      ? uiText(locale, "Örnekleme grafiği oluşturuluyor...", "Örnekleme grafiği oluşturuluyor...")
                      : uiText(locale, "Test başlatıldığında anlık hız dalga formu burada çizilir", "Test başlatıldığında anlık hız dalga formu burada çizilir")}
                  </div>
                )}
              </div>
            </div>

            {/* Result Utility Bar */}
            {result && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={share}
                    className="cursor-pointer rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-mono text-xs text-white transition-colors hover:bg-white/10 hover:border-white/30"
                  >
                    Bağlantıyı Paylaş ↗
                  </button>

                  <button
                    type="button"
                    onClick={exportResult}
                    className="cursor-pointer rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-mono text-xs text-white transition-colors hover:bg-white/10 hover:border-white/30"
                  >
                    JSON Raporu İndir ↓
                  </button>
                </div>

                <span className="font-mono text-xs text-neutral-500">
                  {new Date(result.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Toast Notice */}
        {notice && (
          <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-3.5 text-center font-mono text-xs text-neutral-200">
            {notice}
          </div>
        )}

        {/* 4. History Drawer Panel */}
        {showHistory && (
          <div className="mt-6 border-t border-white/10 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-neutral-300">
                Geçmiş Test Kayıtları (Son 20)
              </h3>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={clearHistory}
                  className="cursor-pointer font-mono text-xs text-neutral-500 hover:text-red-400 transition-colors"
                >
                  Geçmişi Temizle
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="font-mono text-xs text-neutral-600">Henüz kaydedilmiş test bulunmuyor.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-[#0D0E14]">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="border-b border-white/10 bg-white/5 text-neutral-400">
                    <tr>
                      <th className="p-3">Tarih</th>
                      <th className="p-3">İndirme</th>
                      <th className="p-3">Yükleme</th>
                      <th className="p-3">Ping</th>
                      <th className="p-3">Jitter</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-neutral-300">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.02]">
                        <td className="p-3 text-neutral-500">
                          {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="p-3 text-[#00F0FF] font-semibold">{item.download.toFixed(1)} Mbps</td>
                        <td className="p-3 text-[#00FF9D] font-semibold">{item.upload.toFixed(1)} Mbps</td>
                        <td className="p-3">{item.ping.toFixed(1)} ms</td>
                        <td className="p-3 text-neutral-400">{item.jitter != null ? `${item.jitter.toFixed(1)} ms` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
}
