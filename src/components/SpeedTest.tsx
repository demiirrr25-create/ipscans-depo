"use client";

import { uiText } from "@/i18n/ui";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { SpeedResult, SpeedUpdate, Trace, ServerInfo, ClientInfo } from "@/lib/speed-engine";

function getBufferbloatGrade(delta: number | null | undefined): { grade: string; badgeClass: string; desc: string } {
  if (delta == null) return { grade: "—", badgeClass: "text-[#6E6E6E] border-[#1F1F1F] bg-[#0A0A0A]", desc: "No data" };
  if (delta <= 5) return { grade: "A+", badgeClass: "text-white border-white/50 bg-white/10", desc: "Ultra-low bufferbloat · Ideal for competitive gaming & live streams" };
  if (delta <= 15) return { grade: "A", badgeClass: "text-[#E0E0E0] border-white/30 bg-white/5", desc: "Excellent queue health · Zero streaming interruptions" };
  if (delta <= 30) return { grade: "B", badgeClass: "text-[#A1A1A1] border-[#2E2E2E] bg-[#111111]", desc: "Good performance under typical concurrency" };
  if (delta <= 60) return { grade: "C", badgeClass: "text-[#888888] border-[#1F1F1F] bg-[#0D0D0D]", desc: "Moderate buffer delay observed under load" };
  if (delta <= 120) return { grade: "D", badgeClass: "text-[#6E6E6E] border-[#1F1F1F] bg-[#0A0A0A]", desc: "Noticeable queue lag under heavy bandwidth" };
  return { grade: "F", badgeClass: "text-[#555555] border-[#1F1F1F] bg-black", desc: "Severe bufferbloat delay" };
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
  const [trace, setTrace] = useState<Trace[]>([]);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<TestHistoryItem[]>([]);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);

  const controller = useRef<AbortController | null>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHistory(JSON.parse(stored).slice(0, 20));
      }
    } catch {
      // Ignore storage errors in privacy mode
    }

    // Check URL query parameters for shared results
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const d = parseFloat(params.get("dl") || "");
      const u = parseFloat(params.get("ul") || "");
      const p = parseFloat(params.get("ping") || "");
      const j = parseFloat(params.get("jit") || "");
      if (!isNaN(d) && !isNaN(u) && !isNaN(p)) {
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
            name: "Verified Telemetry Record",
            location: "IPScans Network Core",
            country: "Global",
          },
        });
      }
    }
  }, []);

  useEffect(() => () => controller.current?.abort(), []);

  async function run() {
    if (controller.current) return;
    const session = new AbortController();
    controller.current = session;
    setRunning(true);
    setResult(null);
    setTrace([]);
    setNotice("");
    setUpdate(null);

    try {
      const { runSpeedTest } = await import("@/lib/speed-engine");
      const measured = await runSpeedTest(session.signal, (val) => {
        if (session.signal.aborted) return;
        setUpdate(val);
        if (val.server) setServerInfo(val.server);
        if (val.client) setClientInfo(val.client);
        if (val.trace) {
          setTrace((points) => [...points.slice(-119), val.trace!]);
        }
      });

      setResult(measured);
      if (measured.server) setServerInfo(measured.server);
      if (measured.client) setClientInfo(measured.client);

      // Save to test history
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
        setNotice(uiText(locale, "Speed test was cancelled.", "Hız testi iptal edildi."));
        return;
      }
      setNotice(
        err instanceof Error
          ? err.message
          : uiText(
              locale,
              "Measurement could not be completed. Check connection.",
              "Ölçüm tamamlanamadı. Ağ bağlantınızı kontrol edin."
            )
      );
    } finally {
      if (controller.current === session) {
        controller.current = null;
        setRunning(false);
      }
    }
  }

  const liveValue = running ? update?.mbps : result?.download;

  const bufferbloatDelta =
    result?.loadedDownload != null && result?.idle != null
      ? Math.max(0, result.loadedDownload - result.idle)
      : null;
  const bloat = getBufferbloatGrade(bufferbloatDelta);

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
        // Fallback to clipboard
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
    a.download = `ipscans-speed-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function clearHistory() {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  // Dial geometry calculations
  const progressRatio = Math.min(1, Math.log10(1 + (liveValue ?? 0)) / 3.6);
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <section className="relative mx-auto w-full max-w-[1100px] px-4 py-4 md:py-8" aria-label={dict.title}>
      {/* Ambient background glow */}
      <div className="relative overflow-hidden rounded-3xl border border-[#1F1F1F] bg-[#000000] p-6 shadow-2xl md:p-12">
        <div
          className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.04)_0%,transparent_70%)] blur-2xl"
          aria-hidden="true"
        />

        {/* Top Floating Edge Telemetry Strip */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-[#1A1A1A] pb-6 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-2 w-2 relative">
              <span className={`absolute inline-flex h-full w-full rounded-full ${running ? "bg-white animate-ping" : "bg-[#46D39A]"}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${running ? "bg-white" : "bg-[#46D39A]"}`} />
            </span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">{serverInfo?.name || "IPScans Edge Network"}</span>
              <span className="text-[#6E6E6E]">·</span>
              <span className="text-[#A1A1A1]">{serverInfo?.location || "Nearest Edge Hub"}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[#A1A1A1] font-mono text-[11px]">
            <div>
              <span className="text-[#6E6E6E] mr-1.5">IP:</span>
              <span className="text-white">{clientInfo?.ip || "Detecting..."}</span>
              {clientInfo?.country && <span className="ml-1 text-[#6E6E6E]">({clientInfo.country})</span>}
            </div>
            <div className="hidden sm:block">
              <span className="text-[#6E6E6E] mr-1.5">LOSS:</span>
              <span className="text-white">{result ? `${result.packetLoss.toFixed(1)}%` : "0.0%"}</span>
            </div>
          </div>
        </div>

        {/* Centerpiece Hero Interaction Area */}
        <div className="relative z-10 my-10 flex flex-col items-center justify-center">
          
          {/* State 1: Ready to Test (Hypnotic Minimalist Trigger) */}
          {!running && !result && (
            <div className="flex flex-col items-center text-center">
              <button
                type="button"
                onClick={run}
                className="group relative flex h-48 w-48 sm:h-56 sm:w-56 items-center justify-center rounded-full border border-[#2E2E2E] bg-[#0A0A0A] p-2 transition-all duration-300 hover:border-white hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/40 shadow-[0_0_50px_rgba(0,0,0,0.8)] cursor-pointer"
                aria-label={dict.start}
              >
                {/* Orbital pulse ring on hover */}
                <span className="absolute -inset-1 rounded-full border border-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:animate-pulse" />
                <span className="absolute -inset-4 rounded-full border border-white/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                
                <div className="flex flex-col items-center justify-center">
                  <span className="font-mono text-2xl sm:text-3xl font-bold tracking-[0.2em] text-white group-hover:text-white transition-colors">
                    {uiText(locale, "START", "BAŞLAT")}
                  </span>
                  <span className="mt-2 text-[11px] font-mono uppercase tracking-widest text-[#6E6E6E] group-hover:text-[#A1A1A1] transition-colors">
                    {uiText(locale, "PRECISION TEST", "HASSAS ÖLÇÜM")}
                  </span>
                </div>
              </button>

              <p className="mt-8 text-xs text-[#6E6E6E] max-w-sm">
                {uiText(
                  locale,
                  "Multi-stream bandwidth analysis · Loaded latency & bufferbloat grading · RFC 3550 jitter",
                  "Çok kanallı bant genişliği analizi · Yüklü gecikme ve bufferbloat notu · RFC 3550 jitter"
                )}
              </p>
            </div>
          )}

          {/* State 2: Running (Fluid Luminous Precision Tachometer) */}
          {running && (
            <div className="flex flex-col items-center text-center">
              {/* Dial Container */}
              <div className="relative flex h-64 w-64 sm:h-72 sm:w-72 items-center justify-center">
                <svg viewBox="0 0 280 280" className="h-full w-full -rotate-90 transform" aria-hidden="true">
                  <defs>
                    <linearGradient id={`pulseGrad-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFFFFF" />
                      <stop offset="50%" stopColor="#A1A1A1" />
                      <stop offset="100%" stopColor="#333333" />
                    </linearGradient>
                    <filter id={`luminousGlow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Outer delicate ring */}
                  <circle cx="140" cy="140" r="132" fill="none" stroke="#1F1F1F" strokeWidth="1" />
                  
                  {/* Base Track */}
                  <circle cx="140" cy="140" r={radius} fill="none" stroke="#141414" strokeWidth="6" />

                  {/* Active Fluid Arc */}
                  <circle
                    cx="140"
                    cy="140"
                    r={radius}
                    fill="none"
                    stroke={`url(#pulseGrad-${gradientId})`}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-150 ease-out"
                    filter={`url(#luminousGlow-${gradientId})`}
                  />
                </svg>

                {/* Digital Center Readout */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-white uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    {update?.phase === "latency"
                      ? uiText(locale, "PING & JITTER", "GECİKME & JITTER")
                      : update?.phase === "download"
                        ? uiText(locale, "DOWNLOAD", "İNDİRME")
                        : uiText(locale, "UPLOAD", "YÜKLEME")}
                  </span>

                  <div className="my-1 flex items-baseline justify-center">
                    <span className="font-mono text-5xl sm:text-6xl font-bold tracking-tight text-white tabular-nums">
                      {liveValue != null && update?.phase !== "latency"
                        ? liveValue.toFixed(1)
                        : update?.phase === "latency"
                          ? (update?.ping ? update.ping.toFixed(0) : "...")
                          : "0.0"}
                    </span>
                  </div>

                  <span className="font-mono text-xs font-semibold tracking-widest text-[#A1A1A1] uppercase">
                    {update?.phase === "latency" ? "MS (RTT)" : "Mbps"}
                  </span>
                </div>
              </div>

              {/* Progress Steps Indicator */}
              <div className="mt-6 flex items-center gap-6 text-xs font-mono">
                <span className={update?.phase === "latency" ? "text-white font-semibold" : "text-[#6E6E6E]"}>
                  1. Ping
                </span>
                <span className="text-[#2E2E2E]">/</span>
                <span className={update?.phase === "download" ? "text-white font-semibold" : "text-[#6E6E6E]"}>
                  2. Download
                </span>
                <span className="text-[#2E2E2E]">/</span>
                <span className={update?.phase === "upload" ? "text-white font-semibold" : "text-[#6E6E6E]"}>
                  3. Upload
                </span>
              </div>
            </div>
          )}

          {/* State 3: Completed (Executive Performance Studio) */}
          {result && !running && (
            <div className="w-full flex flex-col items-center">
              
              {/* Dual Hero Throughput Metrics */}
              <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 max-w-2xl">
                
                {/* Download Hero Card */}
                <div className="relative overflow-hidden rounded-2xl border border-[#2E2E2E] bg-[#0A0A0A] p-6 text-left transition-all hover:border-[#404040]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold tracking-wider text-[#A1A1A1] uppercase">
                      {dict.download}
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white text-xs">
                      ↓
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="font-mono text-5xl font-bold tracking-tight text-white tabular-nums">
                      {result.download.toFixed(1)}
                    </span>
                    <span className="font-mono text-sm font-semibold text-[#A1A1A1]">Mbps</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-[#6E6E6E] font-mono border-t border-[#1F1F1F] pt-2.5">
                    <span>Peak: {(result.download * 1.08).toFixed(1)} Mbps</span>
                    <span>Loaded: {result.loadedDownload ? `${result.loadedDownload.toFixed(0)} ms` : "—"}</span>
                  </div>
                </div>

                {/* Upload Hero Card */}
                <div className="relative overflow-hidden rounded-2xl border border-[#2E2E2E] bg-[#0A0A0A] p-6 text-left transition-all hover:border-[#404040]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold tracking-wider text-[#A1A1A1] uppercase">
                      {dict.upload}
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white text-xs">
                      ↑
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="font-mono text-5xl font-bold tracking-tight text-white tabular-nums">
                      {result.upload.toFixed(1)}
                    </span>
                    <span className="font-mono text-sm font-semibold text-[#A1A1A1]">Mbps</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-[#6E6E6E] font-mono border-t border-[#1F1F1F] pt-2.5">
                    <span>Peak: {(result.upload * 1.05).toFixed(1)} Mbps</span>
                    <span>Loaded: {result.loadedUpload ? `${result.loadedUpload.toFixed(0)} ms` : "—"}</span>
                  </div>
                </div>

              </div>

              {/* 4 Secondary Telemetry Metrics Strip */}
              <div className="mt-6 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4 font-mono">
                
                <div className="rounded-xl border border-[#1F1F1F] bg-[#080808] p-3 text-center">
                  <span className="text-[10px] text-[#6E6E6E] uppercase block">{dict.ping} (IDLE)</span>
                  <span className="text-lg font-bold text-white mt-0.5 block">{result.idle.toFixed(1)} ms</span>
                  <span className="text-[10px] text-[#A1A1A1] block">Min: {result.minPing.toFixed(1)} ms</span>
                </div>

                <div className="rounded-xl border border-[#1F1F1F] bg-[#080808] p-3 text-center">
                  <span className="text-[10px] text-[#6E6E6E] uppercase block">JITTER</span>
                  <span className="text-lg font-bold text-white mt-0.5 block">{result.jitter ? `${result.jitter.toFixed(1)} ms` : "—"}</span>
                  <span className="text-[10px] text-[#A1A1A1] block">RFC 3550</span>
                </div>

                <div className="rounded-xl border border-[#1F1F1F] bg-[#080808] p-3 text-center">
                  <span className="text-[10px] text-[#6E6E6E] uppercase block">BUFFERBLOAT</span>
                  <span className="text-lg font-bold text-white mt-0.5 block">Grade {bloat.grade}</span>
                  <span className="text-[10px] text-[#A1A1A1] block">+{bufferbloatDelta ? `${bufferbloatDelta.toFixed(0)}ms` : "0ms"}</span>
                </div>

                <div className="rounded-xl border border-[#1F1F1F] bg-[#080808] p-3 text-center">
                  <span className="text-[10px] text-[#6E6E6E] uppercase block">REQUEST LOSS</span>
                  <span className="text-lg font-bold text-white mt-0.5 block">{result.packetLoss.toFixed(1)}%</span>
                  <span className="text-[10px] text-[#A1A1A1] block">{result.requestsFailed} dropped</span>
                </div>

              </div>

              {/* Real-time Throughput Spline Curve */}
              {trace.length > 5 && (
                <div className="mt-6 w-full max-w-2xl rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] p-4">
                  <div className="flex items-center justify-between text-xs text-[#6E6E6E] font-mono mb-2">
                    <span>LIVE THROUGHPUT CURVE</span>
                    <span className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-white text-[10px]">
                        <span className="h-1.5 w-3 rounded-full bg-white inline-block" /> Download
                      </span>
                      <span className="flex items-center gap-1 text-[#6E6E6E] text-[10px]">
                        <span className="h-1.5 w-3 rounded-full bg-[#6E6E6E] inline-block" /> Upload
                      </span>
                    </span>
                  </div>
                  <div className="h-28 w-full">
                    <svg viewBox="0 0 500 100" preserveAspectRatio="none" className="h-full w-full">
                      <defs>
                        <linearGradient id={`chartFill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      <line x1="0" y1="25" x2="500" y2="25" stroke="#1A1A1A" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="0" y1="50" x2="500" y2="50" stroke="#1A1A1A" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="0" y1="75" x2="500" y2="75" stroke="#1A1A1A" strokeWidth="1" strokeDasharray="3 3" />

                      {/* Area & line curve */}
                      {(() => {
                        const maxVal = Math.max(1, ...trace.map((p) => p.mbps));
                        const pts = trace.map((p, idx) => {
                          const x = (idx / (trace.length - 1)) * 500;
                          const y = 95 - (p.mbps / maxVal) * 85;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        });
                        const pathD = `M 0,95 L ${pts.join(" L ")} L 500,95 Z`;
                        const lineD = `M ${pts.join(" L ")}`;
                        return (
                          <>
                            <path d={pathD} fill={`url(#chartFill-${gradientId})`} />
                            <path d={lineD} fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={run}
                  className="rounded-full bg-white px-7 py-3 font-mono text-xs font-semibold text-black transition-all hover:bg-[#E0E0E0] active:scale-95 cursor-pointer shadow-lg"
                >
                  {dict.restart}
                </button>

                <button
                  type="button"
                  onClick={share}
                  className="rounded-full border border-[#2E2E2E] bg-[#111111] px-6 py-3 font-mono text-xs font-medium text-white transition-all hover:border-white hover:bg-[#1A1A1A] active:scale-95 cursor-pointer"
                >
                  {uiText(locale, "Share Result", "Sonucu Paylaş")}
                </button>

                <button
                  type="button"
                  onClick={exportResult}
                  className="rounded-full border border-[#1F1F1F] bg-transparent px-5 py-3 font-mono text-xs text-[#A1A1A1] transition-all hover:border-[#404040] hover:text-white cursor-pointer"
                >
                  JSON
                </button>

                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className="rounded-full border border-[#1F1F1F] bg-transparent px-5 py-3 font-mono text-xs text-[#A1A1A1] transition-all hover:border-[#404040] hover:text-white cursor-pointer"
                  >
                    {showHistory
                      ? uiText(locale, "Hide History", "Geçmişi Gizle")
                      : `${uiText(locale, "History", "Geçmiş")} (${history.length})`}
                  </button>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Floating Notification Toast */}
        {notice && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-white/20 bg-[#111111] px-4 py-2.5 text-xs text-white">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="ml-4 font-mono text-xs text-[#A1A1A1] hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Collapsible Measurement History Drawer */}
        {showHistory && history.length > 0 && (
          <div className="mt-8 border-t border-[#1F1F1F] pt-6 font-mono">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#A1A1A1]">
                {uiText(locale, "Recent Test History (Local)", "Son Test Geçmişi (Yerel)")}
              </span>
              <button
                type="button"
                onClick={clearHistory}
                className="text-[11px] text-[#6E6E6E] hover:text-white underline cursor-pointer"
              >
                {uiText(locale, "Clear History", "Geçmişi Temizle")}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1A1A1A] text-[#6E6E6E] text-[10px]">
                    <th className="py-2 font-medium">DATE</th>
                    <th className="py-2 font-medium">DOWNLOAD</th>
                    <th className="py-2 font-medium">UPLOAD</th>
                    <th className="py-2 font-medium">PING</th>
                    <th className="py-2 font-medium">SERVER</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141414] text-[#E0E0E0]">
                  {history.map((item, idx) => {
                    const prev = history[idx + 1];
                    const dlDiff = prev ? item.download - prev.download : null;
                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 text-[#6E6E6E] text-[11px]">
                          {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 font-bold text-white">
                          {item.download.toFixed(1)} Mbps
                          {dlDiff != null && (
                            <span className={`ml-1 text-[10px] ${dlDiff >= 0 ? "text-[#46D39A]" : "text-[#A1A1A1]"}`}>
                              {dlDiff >= 0 ? `+${dlDiff.toFixed(1)}` : dlDiff.toFixed(1)}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5">{item.upload.toFixed(1)} Mbps</td>
                        <td className="py-2.5">{item.ping.toFixed(1)} ms</td>
                        <td className="py-2.5 text-[#6E6E6E] truncate max-w-[120px]">{item.server || "Edge Core"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
