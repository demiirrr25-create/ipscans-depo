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
} {
  if (delta == null) {
    return {
      grade: "—",
      badgeClass: "text-neutral-500 border-white/10 bg-white/5",
    };
  }
  if (delta <= 5) {
    return {
      grade: "A+",
      badgeClass: "text-white border-white/20 bg-white/10 font-bold",
    };
  }
  if (delta <= 15) {
    return {
      grade: "A",
      badgeClass: "text-neutral-200 border-white/15 bg-white/5",
    };
  }
  if (delta <= 30) {
    return {
      grade: "B",
      badgeClass: "text-white border-white/20 bg-white/5",
    };
  }
  if (delta <= 60) {
    return {
      grade: "C",
      badgeClass: "text-[#FBBF24] border-[#FBBF24]/30 bg-[#FBBF24]/10",
    };
  }
  if (delta <= 120) {
    return {
      grade: "D",
      badgeClass: "text-amber-500 border-amber-500/30 bg-amber-500/10",
    };
  }
  return {
    grade: "F",
    badgeClass: "text-rose-400 border-rose-500/30 bg-rose-500/10",
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
  const isTr = locale === "tr";
  const [update, setUpdate] = useState<SpeedUpdate | null>(null);
  const [result, setResult] = useState<SpeedResult | null>(null);
  const [tracePoints, setTracePoints] = useState<Trace[]>([]);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  // Persistent phase results so download NEVER disappears when upload starts
  const [lockedDownload, setLockedDownload] = useState<number | null>(null);
  const [lockedUpload, setLockedUpload] = useState<number | null>(null);
  const [livePing, setLivePing] = useState<number | null>(null);
  const [liveJitter, setLiveJitter] = useState<number | null>(null);
  const [stageProgress, setStageProgress] = useState(0);

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
          setLockedDownload(d);
          setLockedUpload(u);
          setLivePing(p);
          setLiveJitter(isNaN(j) ? null : j);
          setStageProgress(100);
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
              name: "IPScans Core Edge",
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
    setLockedDownload(null);
    setLockedUpload(null);
    setLivePing(null);
    setLiveJitter(null);
    setStageProgress(0);
    setRunning(true);

    const session = new AbortController();
    controller.current = session;

    try {
      const measured = await runSpeedTest(session.signal, (val) => {
        if (session.signal.aborted) return;
        setUpdate(val);

        if (val.server) setServerInfo(val.server);
        if (val.client) setClientInfo(val.client);

        if (val.ping != null) setLivePing(val.ping);
        if (val.jitter != null) setLiveJitter(val.jitter);

        // Track and lock intermediate download speed immediately upon completion
        if (val.downloadFinal != null && val.downloadFinal > 0) {
          setLockedDownload(val.downloadFinal);
        }

        // Track and lock intermediate upload speed immediately upon completion
        if (val.uploadFinal != null && val.uploadFinal > 0) {
          setLockedUpload(val.uploadFinal);
        }

        // Calibrated smooth progression (0% -> 100%)
        if (val.phase === "init") {
          setStageProgress(3);
        } else if (val.phase === "latency") {
          const pingProg = val.progress ?? 0.5;
          setStageProgress(Math.min(20, Math.max(3, 3 + pingProg * 17)));
        } else if (val.phase === "download") {
          const downProg = val.progress ?? 0;
          setStageProgress(Math.min(60, Math.max(20, 20 + downProg * 40)));
        } else if (val.phase === "download_complete") {
          setStageProgress(60);
        } else if (val.phase === "upload") {
          const upProg = val.progress ?? 0;
          setStageProgress(Math.min(98, Math.max(60, 60 + upProg * 38)));
        } else if (val.phase === "upload_complete" || val.phase === "complete") {
          setStageProgress(100);
        }

        if (val.trace) {
          setTracePoints((prev) => [...prev.slice(-80), val.trace!]);
        }
      });

      setLockedDownload(measured.download);
      setLockedUpload(measured.upload);
      setLivePing(measured.idle);
      setLiveJitter(measured.jitter);
      setStageProgress(100);
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
        setNotice(uiText(locale, "Test stopped.", "Test durduruldu."));
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

  // Active speedometer readout
  const liveGaugeValue = useMemo(() => {
    if (result) return result.download;
    if (!update) return null;
    if (update.phase === "latency") return update.ping ?? livePing ?? 0;
    if (update.phase === "download") return update.mbps;
    if (update.phase === "download_complete") return lockedDownload ?? update.mbps;
    if (update.phase === "upload") return update.mbps;
    if (update.phase === "upload_complete") return lockedUpload ?? update.mbps;
    return update.mbps;
  }, [result, update, livePing, lockedDownload, lockedUpload]);

  const bufferbloatDelta = useMemo(() => {
    if (!result) return null;
    const loaded = Math.max(result.loadedDownload ?? 0, result.loadedUpload ?? 0);
    return loaded > 0 ? Math.max(0, loaded - result.idle) : null;
  }, [result]);

  const bloat = useMemo(() => getBufferbloatGrade(bufferbloatDelta), [bufferbloatDelta]);

  const shareUrl = useMemo(() => {
    if (!result || typeof window === "undefined") return "";
    const base = `${window.location.origin}/${locale}/hiz-testi`;
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
    const textSummary = `IPScans Hız Testi: ↓ ${result.download.toFixed(1)} Mbps · ↑ ${result.upload.toFixed(1)} Mbps · Ping: ${result.idle.toFixed(1)} ms · Bufferbloat: Grade ${bloat.grade}`;

    if (navigator.share && typeof window !== "undefined") {
      try {
        await navigator.share({
          title: "IPScans Hız Testi Sonucu",
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
          "Result link copied to clipboard.",
          "Sonuç bağlantısı panoya kopyalandı."
        )
      );
    } catch {
      setNotice(
        uiText(
          locale,
          "Could not access clipboard.",
          "Panoya erişilemedi."
        )
      );
    }
  }

  function exportResult() {
    if (!result) return;
    const payload = {
      platform: "IPScans Precision Telemetry Engine",
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

  // Dial SVG geometry: 240-degree circular arc
  const cx = 160;
  const cy = 160;
  const radius = 118;
  const strokeWidth = 8;
  const sweepAngle = 240;
  const startAngle = 150; // starts bottom-left
  const totalArcLen = (2 * Math.PI * radius * sweepAngle) / 360;

  // Calibrated Logarithmic Ratio (0 to 1000 Mbps)
  const currentRatio = useMemo(() => {
    if (!liveGaugeValue || liveGaugeValue <= 0) return 0;
    if (update?.phase === "latency") {
      // Ping gauge ratio: 0 to 120ms range
      return Math.min(0.25, (liveGaugeValue / 120) * 0.25);
    }
    const ratio = Math.log10(1 + liveGaugeValue) / Math.log10(1 + 1000);
    return Math.min(1, Math.max(0, ratio));
  }, [liveGaugeValue, update]);

  const strokeDashoffset = totalArcLen * (1 - currentRatio);

  const polarToCartesian = (centerX: number, centerY: number, r: number, angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(rad),
      y: centerY + r * Math.sin(rad),
    };
  };

  const p1 = polarToCartesian(cx, cy, radius, startAngle);
  const p2 = polarToCartesian(cx, cy, radius, startAngle + sweepAngle);
  const baseArcPath = `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 1 1 ${p2.x} ${p2.y}`;

  // Tip indicator coordinate
  const currentAngle = startAngle + sweepAngle * currentRatio;
  const tipPos = polarToCartesian(cx, cy, radius, currentAngle);

  // Speed scale ticks
  const ticks = [0, 10, 50, 100, 250, 500, 1000];

  // Dynamic Phase Label
  const phaseLabel = useMemo(() => {
    if (!running && !result) return uiText(locale, "READY", "HAZIR");
    if (!running && result) return uiText(locale, "COMPLETE", "TAMAMLANDI");
    if (update?.phase === "latency") return uiText(locale, "LATENCY", "GECİKME");
    if (update?.phase === "download") return uiText(locale, "DOWNLOAD", "İNDİRME");
    if (update?.phase === "download_complete") return uiText(locale, "DOWNLOAD OK", "İNDİRME TAMAM");
    if (update?.phase === "upload") return uiText(locale, "UPLOAD", "YÜKLEME");
    if (update?.phase === "upload_complete") return uiText(locale, "UPLOAD OK", "YÜKLEME TAMAM");
    return uiText(locale, "MEASURING", "ÖLÇÜLÜYOR");
  }, [running, result, update, locale]);

  return (
    <div className="relative mx-auto w-full max-w-5xl py-4 select-none" aria-label={dict.title}>
      {/* 1. Subtle Monochromatic Surface Glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 h-[420px] w-[680px] -z-10 rounded-full bg-white/[0.015] blur-3xl transition-opacity duration-700"
        aria-hidden="true"
      />

      {/* 2. Top Edge Telemetry HUD Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5 font-mono text-xs text-neutral-400">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${
                running ? "bg-white animate-ping opacity-60" : "bg-neutral-600 opacity-30"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                running ? "bg-white" : "bg-neutral-500"
              }`}
            />
          </span>
          <span className="text-white font-medium">
            {serverInfo?.name || "IPScans Core Edge"}
          </span>
          <span className="text-neutral-600">/</span>
          <span className="text-neutral-400">
            {serverInfo?.location || "Edge Telemetry Gateway"}
          </span>
        </div>

        <div className="flex items-center gap-5 text-[11px]">
          <div>
            <span className="text-neutral-500 mr-1.5 uppercase">IP:</span>
            <span className="text-neutral-200 font-medium">
              {clientInfo?.ip || "Auto-detecting"}
            </span>
            {clientInfo?.country && (
              <span className="ml-1 text-neutral-500">({clientInfo.country})</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="cursor-pointer rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1 text-neutral-300 transition-colors hover:border-white/30 hover:text-white"
          >
            {showHistory ? uiText(locale, "Kapat", "Kapat") : uiText(locale, "Geçmiş", "Geçmiş")} ({history.length})
          </button>
        </div>
      </div>

      {/* 3. Central Telemetry Instrument & Speedometer */}
      <div className="relative my-6 flex flex-col items-center justify-center">
        
        {/* Phase Pill */}
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1 text-xs font-mono tracking-widest text-neutral-300">
          <span className={`h-1.5 w-1.5 rounded-full ${running ? "bg-white animate-pulse" : "bg-neutral-500"}`} />
          <span>{phaseLabel}</span>
        </div>

        {/* The Instrument Arc */}
        <div className="relative flex h-[300px] w-[320px] sm:h-[340px] sm:w-[360px] items-center justify-center select-none">
          <svg viewBox="0 0 320 300" className="h-full w-full overflow-visible" aria-hidden="true">
            <defs>
              <linearGradient id={`speedArc-${gradientId}`} x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#737373" />
                <stop offset="60%" stopColor="#D4D4D4" />
                <stop offset="100%" stopColor="#FFFFFF" />
              </linearGradient>

              <filter id={`arcGlow-${gradientId}`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Subtle outer tick ring */}
            {ticks.map((t) => {
              const r = Math.log10(1 + t) / Math.log10(1 + 1000);
              const angle = startAngle + sweepAngle * r;
              const innerTick = polarToCartesian(cx, cy, radius + 12, angle);
              const outerTick = polarToCartesian(cx, cy, radius + 20, angle);
              const textPos = polarToCartesian(cx, cy, radius + 32, angle);
              return (
                <g key={t}>
                  <line
                    x1={innerTick.x}
                    y1={innerTick.y}
                    x2={outerTick.x}
                    y2={outerTick.y}
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="1.5"
                  />
                  <text
                    x={textPos.x}
                    y={textPos.y + 3}
                    textAnchor="middle"
                    fill="rgba(255, 255, 255, 0.35)"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {t}
                  </text>
                </g>
              );
            })}

            {/* Inactive Base Track */}
            <path
              d={baseArcPath}
              fill="none"
              stroke="rgba(255, 255, 255, 0.06)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Active Luminous Sweep Arc (Dolum Barı) */}
            <path
              d={baseArcPath}
              fill="none"
              stroke={`url(#speedArc-${gradientId})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={totalArcLen}
              strokeDashoffset={strokeDashoffset}
              filter={`url(#arcGlow-${gradientId})`}
              className="transition-[stroke-dashoffset] duration-200 ease-out"
            />

            {/* Dynamic Traveling Head Bead */}
            {currentRatio > 0 && (
              <circle
                cx={tipPos.x}
                cy={tipPos.y}
                r="6"
                fill="#FFFFFF"
                stroke="#171717"
                strokeWidth="2"
                filter={`url(#arcGlow-${gradientId})`}
                className="transition-[cx,cy] duration-200 ease-out"
              />
            )}
          </svg>

          {/* Central High-Precision Telemetry Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
            <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-neutral-400">
              {update?.phase === "latency" ? "RTT GECİKME" : "BANT GENİŞLİĞİ"}
            </span>

            <div className="my-1 font-mono text-6xl sm:text-7xl font-bold tracking-tight text-white tabular-nums">
              {liveGaugeValue != null ? liveGaugeValue.toFixed(1) : "0.0"}
            </div>

            <span className="font-mono text-xs tracking-widest text-neutral-400 uppercase">
              {update?.phase === "latency" ? "MS" : "MBPS"}
            </span>
          </div>
        </div>

        {/* 4. Optimized Stage Progress Bar (Dolum Barı 0 - 100%) */}
        <div className="w-full max-w-md mx-auto my-3 px-4">
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mb-1.5">
            <span className={update?.phase === "latency" ? "text-white font-semibold" : ""}>
              {isTr ? "1. Gecikme" : "1. Ping"}
            </span>
            <span className={update?.phase === "download" || update?.phase === "download_complete" ? "text-white font-semibold" : ""}>
              {isTr ? "2. İndirme" : "2. Download"}
            </span>
            <span className={update?.phase === "upload" || update?.phase === "upload_complete" ? "text-white font-semibold" : ""}>
              {isTr ? "3. Yükleme" : "3. Upload"}
            </span>
            <span className={result ? "text-white font-bold" : ""}>
              {running ? `${Math.round(stageProgress)}%` : result ? "100%" : isTr ? "Hazır" : "Ready"}
            </span>
          </div>

          <div className="relative h-2 w-full rounded-full bg-white/[0.06] overflow-hidden p-0.5 border border-white/[0.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-neutral-500 via-neutral-200 to-white transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
              style={{ width: `${stageProgress}%` }}
            />
          </div>
        </div>

        {/* Primary Interactive Action Trigger */}
        <div className="mt-3 flex items-center justify-center">
          {running ? (
            <button
              type="button"
              onClick={stop}
              className="cursor-pointer rounded-full border border-rose-500/40 bg-rose-500/10 px-8 py-3 font-mono text-sm font-semibold text-rose-300 transition-all hover:bg-rose-500/20 hover:border-rose-500/70"
            >
              {uiText(locale, "Testi Durdur", "Testi Durdur")} ⏹
            </button>
          ) : (
            <button
              type="button"
              onClick={start}
              className="group relative cursor-pointer overflow-hidden rounded-full bg-white px-10 py-3.5 font-mono text-sm font-bold text-black shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all hover:scale-105 hover:bg-neutral-100 hover:shadow-[0_0_35px_rgba(255,255,255,0.3)] active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-2">
                <span>
                  {result
                    ? uiText(locale, "Yeniden Test Et", "Yeniden Test Et")
                    : uiText(locale, "Hız Testini Başlat", "Hız Testini Başlat")}
                </span>
                <span>▶</span>
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Live Real-Time Throughput Oscilloscope Waveform */}
      <div className="relative my-6 h-20 w-full overflow-hidden rounded-2xl bg-white/[0.015] border border-white/[0.06] p-2">
        {tracePoints.length > 1 ? (
          <svg viewBox="0 0 500 70" preserveAspectRatio="none" className="h-full w-full overflow-visible">
            <defs>
              <linearGradient id={`traceGrad-${gradientId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {(() => {
              const maxMb = Math.max(...tracePoints.map((t) => t.mbps), 10);
              const points = tracePoints.map((t, idx) => {
                const x = (idx / (tracePoints.length - 1)) * 500;
                const y = 70 - (t.mbps / maxMb) * 60;
                return `${x},${y}`;
              });
              const d = `M 0,70 L ${points.join(" L ")} L 500,70 Z`;
              const strokeD = `M ${points.join(" L ")}`;

              return (
                <>
                  <path d={d} fill={`url(#traceGrad-${gradientId})`} />
                  <path d={strokeD} fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
                </>
              );
            })()}
          </svg>
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-[11px] text-neutral-600">
            {running ? (isTr ? "Aktif telemetri dalga formu..." : "Live telemetry waveform...") : (isTr ? "Canlı hız dalga formu" : "Live throughput waveform")}
          </div>
        )}
      </div>

      {/* 6. Precision 4-Telemetry HUD Cards (Persistent locked values upon phase completion) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
        
        {/* Metric 1: Download (Locks in as soon as download ends!) */}
        <div
          className={`rounded-2xl border p-5 transition-all ${
            update?.phase === "download"
              ? "border-white/30 bg-white/[0.04] shadow-[0_0_20px_rgba(255,255,255,0.06)]"
              : lockedDownload != null
              ? "border-white/15 bg-white/[0.02]"
              : "border-white/[0.07] bg-white/[0.02]"
          }`}
        >
          <div className="flex items-center justify-between font-mono text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <span className="text-white">↓</span>
              <span>{isTr ? "İNDİRME" : "DOWNLOAD"}</span>
            </span>
            {update?.phase === "download" ? (
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            ) : lockedDownload != null ? (
              <span className="text-[10px] text-neutral-300 font-semibold">{isTr ? "✓ TAMAM" : "✓ DONE"}</span>
            ) : null}
          </div>
          <div className="mt-3 font-mono text-3xl sm:text-4xl font-bold tracking-tight text-white tabular-nums">
            {result
              ? result.download.toFixed(1)
              : lockedDownload != null
              ? lockedDownload.toFixed(1)
              : update?.phase === "download"
              ? update.mbps.toFixed(1)
              : "—"}
            <span className="ml-1.5 text-xs font-normal text-neutral-500">Mbps</span>
          </div>
        </div>

        {/* Metric 2: Upload (Locks in as soon as upload ends!) */}
        <div
          className={`rounded-2xl border p-5 transition-all ${
            update?.phase === "upload"
              ? "border-white/30 bg-white/[0.04] shadow-[0_0_20px_rgba(255,255,255,0.06)]"
              : lockedUpload != null
              ? "border-white/15 bg-white/[0.02]"
              : "border-white/[0.07] bg-white/[0.02]"
          }`}
        >
          <div className="flex items-center justify-between font-mono text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <span className="text-white">↑</span>
              <span>{isTr ? "YÜKLEME" : "UPLOAD"}</span>
            </span>
            {update?.phase === "upload" ? (
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            ) : lockedUpload != null ? (
              <span className="text-[10px] text-neutral-300 font-semibold">{isTr ? "✓ TAMAM" : "✓ DONE"}</span>
            ) : null}
          </div>
          <div className="mt-3 font-mono text-3xl sm:text-4xl font-bold tracking-tight text-white tabular-nums">
            {result
              ? result.upload.toFixed(1)
              : lockedUpload != null
              ? lockedUpload.toFixed(1)
              : update?.phase === "upload"
              ? update.mbps.toFixed(1)
              : "—"}
            <span className="ml-1.5 text-xs font-normal text-neutral-500">Mbps</span>
          </div>
        </div>

        {/* Metric 3: Ping & Jitter */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <div className="flex items-center justify-between font-mono text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <span className="text-neutral-400">RTT</span>
              <span>PING</span>
            </span>
            {(result?.jitter != null || liveJitter != null) && (
              <span className="text-[10px] text-neutral-500">
                ±{(result?.jitter ?? liveJitter ?? 0).toFixed(1)} ms
              </span>
            )}
          </div>
          <div className="mt-3 font-mono text-3xl sm:text-4xl font-bold tracking-tight text-white tabular-nums">
            {result
              ? result.idle.toFixed(1)
              : livePing != null
              ? livePing.toFixed(1)
              : "—"}
            <span className="ml-1.5 text-xs font-normal text-neutral-500">ms</span>
          </div>
        </div>

        {/* Metric 4: Bufferbloat Quality */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <div className="flex items-center justify-between font-mono text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <span className="text-neutral-400">BUF</span>
              <span>BUFFERBLOAT</span>
            </span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold border ${bloat.badgeClass}`}>
              {bloat.grade}
            </span>
          </div>
          <div className="mt-3 font-mono text-3xl sm:text-4xl font-bold tracking-tight text-white tabular-nums">
            {bufferbloatDelta != null ? `+${bufferbloatDelta.toFixed(0)}` : "—"}
            <span className="ml-1.5 text-xs font-normal text-neutral-500">{isTr ? "ms yük" : "ms load"}</span>
          </div>
        </div>

      </div>

      {/* 7. Post-Test Controls & Export Bar */}
      {result && (
        <div className="my-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] pt-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={share}
              className="cursor-pointer rounded-full border border-white/15 bg-white/5 px-5 py-2 font-mono text-xs text-white transition-colors hover:bg-white/10 hover:border-white/30"
            >
              Bağlantıyı Paylaş ↗
            </button>

            <button
              type="button"
              onClick={exportResult}
              className="cursor-pointer rounded-full border border-white/15 bg-white/5 px-5 py-2 font-mono text-xs text-white transition-colors hover:bg-white/10 hover:border-white/30"
            >
              JSON İndir ↓
            </button>
          </div>

          <span className="font-mono text-xs text-neutral-500">
            {new Date(result.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>
      )}

      {/* 8. Toast / Notice */}
      {notice && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-center font-mono text-xs text-neutral-300">
          {notice}
        </div>
      )}

      {/* 9. Slide-down History Drawer */}
      {showHistory && (
        <div className="mt-8 border-t border-white/[0.08] pt-6">
          <div className="flex items-center justify-between mb-4 font-mono text-xs">
            <span className="text-neutral-400 uppercase tracking-wider">
              Geçmiş Ölçümler ({history.length})
            </span>
            {history.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="cursor-pointer text-neutral-500 hover:text-rose-400 transition-colors"
              >
                Geçmişi Temizle
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <p className="font-mono text-xs text-neutral-600">Kayıtlı test bulunmuyor.</p>
          ) : (
            <div className="max-h-60 overflow-y-auto rounded-xl border border-white/[0.08] bg-black/40">
              <table className="w-full text-left font-mono text-xs">
                <thead className="border-b border-white/[0.08] bg-white/[0.02] text-neutral-500">
                  <tr>
                    <th className="p-3">Tarih</th>
                    <th className="p-3">İndirme</th>
                    <th className="p-3">Yükleme</th>
                    <th className="p-3">Ping</th>
                    <th className="p-3">Jitter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-neutral-300">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02]">
                      <td className="p-3 text-neutral-500">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="p-3 text-white font-medium">{item.download.toFixed(1)} Mbps</td>
                      <td className="p-3 text-neutral-300 font-medium">{item.upload.toFixed(1)} Mbps</td>
                      <td className="p-3">{item.ping.toFixed(1)} ms</td>
                      <td className="p-3 text-neutral-500">{item.jitter != null ? `${item.jitter.toFixed(1)} ms` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
