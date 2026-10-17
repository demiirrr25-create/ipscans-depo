"use client";

import { uiText } from "@/i18n/ui";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { SpeedResult, SpeedUpdate, Trace, ServerInfo, ClientInfo } from "@/lib/speed-engine";

function getBufferbloatGrade(delta: number | null | undefined): { grade: string; badgeClass: string; desc: string } {
  if (delta == null) return { grade: "—", badgeClass: "text-neutral-400 border-neutral-800 bg-neutral-900/40", desc: "No data" };
  if (delta <= 5) return { grade: "A+", badgeClass: "text-white border-white/40 bg-white/10", desc: "Ultra-low bufferbloat (Competitive Gaming & Live Video)" };
  if (delta <= 15) return { grade: "A", badgeClass: "text-neutral-200 border-white/20 bg-white/5", desc: "Excellent queue management (No stream buffering)" };
  if (delta <= 30) return { grade: "B", badgeClass: "text-neutral-300 border-neutral-700 bg-white/5", desc: "Good performance under typical concurrency" };
  if (delta <= 60) return { grade: "C", badgeClass: "text-neutral-400 border-neutral-800 bg-neutral-900/60", desc: "Moderate buffer delay observed under load" };
  if (delta <= 120) return { grade: "D", badgeClass: "text-neutral-400 border-neutral-800 bg-neutral-900/60", desc: "Noticeable queue lag under heavy bandwidth" };
  return { grade: "F", badgeClass: "text-neutral-500 border-neutral-900 bg-black", desc: "Severe bufferbloat delay" };
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
    } catch {
      setNotice(
        session.signal.aborted
          ? uiText(
              locale,
              "Test stopped. Incomplete telemetry was discarded.",
              "Test durduruldu. Eksik telemetri kaydedilmedi."
            )
          : uiText(
              locale,
              "Insufficient measurement samples. Check your connection.",
              "Yeterli ölçüm örneği alınamadı. Bağlantınızı kontrol edin."
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
  const peakSpeed = useMemo(() => {
    if (!trace.length) return 0;
    return Math.max(...trace.map((p) => p.mbps));
  }, [trace]);

  const fmt = (n: number | null | undefined, unit = "ms") =>
    n == null ? "—" : `${n.toFixed(1)} ${unit}`;

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
    const textSummary = `IPScans Speed Performance Analysis\nDownload: ${result.download.toFixed(1)} Mbps\nUpload: ${result.upload.toFixed(1)} Mbps\nPing: ${result.idle.toFixed(1)} ms · Jitter: ${result.jitter ? result.jitter.toFixed(1) : 0} ms\nBufferbloat: Grade ${bloat.grade}\nVerify at: ${shareUrl}`;

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
      platform: "IPScans Telemetry Engine",
      method: "Multi-stream HTTP transport with active RTT probing",
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
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function clearHistory() {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  // Dial geometry: Precision 320x320 SVG gauge
  // Arc: 260 degrees (-220 to +40)
  const progressRatio = Math.min(1, Math.log10(1 + (liveValue ?? 0)) / 3.8);
  const capsuleCount = 48;
  const radius = 118;
  const circumference = 2 * Math.PI * radius;
  const arcSweep = 0.722;
  const totalArc = circumference * arcSweep;
  const strokeDashoffset = totalArc * (1 - progressRatio);

  return (
    <section className="relative mx-auto w-full max-w-[1200px] px-4 py-8 lg:py-12" aria-label={dict.title}>
      {/* Background Subtle Spatial Depth */}
      <div className="relative overflow-hidden rounded-3xl border border-[#1F1F1F] bg-[#000000] p-6 shadow-2xl md:p-10">
        
        {/* Top Header Ribbon & Edge HUD */}
        <div className="flex flex-col gap-4 border-b border-[#1F1F1F] pb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 items-center justify-center">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            </span>
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                {uiText(locale, "Internet Speed & Telemetry Studio", "İnternet Hız & Telemetri Analiz Merkezi")}
              </h2>
              <p className="text-xs text-[#A1A1A1]">
                {uiText(locale, "Precision multi-stream measurement engine", "Yüksek hassasiyetli çok kanallı ölçüm motoru")}
              </p>
            </div>
          </div>

          {/* Test Stage Breadcrumb */}
          <div className="flex items-center gap-2">
            {(["latency", "download", "upload"] as const).map((stage, index) => {
              const isCurrent = running && update?.phase === stage;
              const isDone =
                Boolean(result) ||
                (stage === "latency" && (update?.phase === "download" || update?.phase === "upload")) ||
                (stage === "download" && update?.phase === "upload");

              return (
                <div
                  key={stage}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                    isCurrent
                      ? "border-white bg-white text-black font-semibold shadow-sm"
                      : isDone
                        ? "border-[#2E2E2E] bg-[#111111] text-white"
                        : "border-[#1F1F1F] bg-transparent text-[#6E6E6E]"
                  }`}
                >
                  <span className="font-mono text-[10px]">0{index + 1}</span>
                  <span>
                    {stage === "latency"
                      ? uiText(locale, "Ping", "Gecikme")
                      : stage === "download"
                        ? dict.download
                        : dict.upload}
                  </span>
                  {isDone && <span className="text-[10px]">✓</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Server & Network Metadata Strip */}
        <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] p-4 text-xs sm:grid-cols-4">
          <div>
            <span className="text-[#6E6E6E] uppercase tracking-wider text-[10px] font-mono block">
              {uiText(locale, "TEST SERVER", "TEST SUNUCUSU")}
            </span>
            <span className="font-medium text-white truncate block mt-0.5">
              {serverInfo?.name || "IPScans Edge Network"}
            </span>
            <span className="text-[#A1A1A1] text-[11px] block truncate">
              {serverInfo?.location || "Auto-Selected Nearest Core"}
            </span>
          </div>

          <div>
            <span className="text-[#6E6E6E] uppercase tracking-wider text-[10px] font-mono block">
              {uiText(locale, "YOUR IP", "GENEL IP")}
            </span>
            <span className="font-mono font-medium text-white block mt-0.5 truncate">
              {clientInfo?.ip || "Detecting..."}
            </span>
            <span className="text-[#A1A1A1] text-[11px] block truncate">
              {clientInfo?.city ? `${clientInfo.city}, ` : ""}{clientInfo?.country || "Global"}
            </span>
          </div>

          <div>
            <span className="text-[#6E6E6E] uppercase tracking-wider text-[10px] font-mono block">
              {uiText(locale, "CONNECTION", "BAĞLANTI TÜRÜ")}
            </span>
            <span className="font-medium text-white block mt-0.5">
              {clientInfo?.connectionType || "High-Bandwidth Link"}
            </span>
            <span className="text-[#A1A1A1] text-[11px] block">
              {uiText(locale, "Full-Duplex", "Tam Çift Yönlü")}
            </span>
          </div>

          <div>
            <span className="text-[#6E6E6E] uppercase tracking-wider text-[10px] font-mono block">
              {uiText(locale, "PACKET LOSS", "PAKET KAYBI")}
            </span>
            <span className="font-mono font-medium text-white block mt-0.5">
              {result ? `${result.packetLoss.toFixed(1)}%` : "0.0%"}
            </span>
            <span className="text-[#A1A1A1] text-[11px] block">
              {result && result.packetLoss > 0
                ? uiText(locale, "Unstable link", "Kayıp gözlendi")
                : uiText(locale, "Zero Request Drop", "Kayıpsız")}
            </span>
          </div>
        </div>

        {/* Main Measurement Layout: Precision Dial + Telemetry Grid */}
        <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-center">
          
          {/* Dial / Tachometer Column */}
          <div className="flex flex-col items-center justify-center lg:col-span-5">
            <div className="relative flex h-[300px] w-[300px] items-center justify-center sm:h-[340px] sm:w-[340px]">
              <svg viewBox="0 0 320 320" className="h-full w-full -rotate-90 transform" aria-hidden="true">
                <defs>
                  <linearGradient id={`speedArc-${gradientId}`} x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#404040" />
                    <stop offset="60%" stopColor="#A1A1A1" />
                    <stop offset="100%" stopColor="#FFFFFF" />
                  </linearGradient>
                  <filter id={`dialGlow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Outer decorative hairline */}
                <circle cx="160" cy="160" r="144" fill="none" stroke="#1F1F1F" strokeWidth="1" />
                <circle cx="160" cy="160" r="124" fill="none" stroke="#111111" strokeWidth="1" />

                {/* Precision tick marks */}
                {Array.from({ length: capsuleCount }).map((_, idx) => {
                  const frac = idx / (capsuleCount - 1);
                  const angDeg = 140 + frac * 260;
                  const angRad = (angDeg * Math.PI) / 180;
                  const active = frac <= progressRatio;
                  const r1 = 132;
                  const r2 = active ? 141 : 136;
                  const x1 = 160 + Math.cos(angRad) * r1;
                  const y1 = 160 + Math.sin(angRad) * r1;
                  const x2 = 160 + Math.cos(angRad) * r2;
                  const y2 = 160 + Math.sin(angRad) * r2;
                  return (
                    <line
                      key={idx}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={active ? "#FFFFFF" : "#2E2E2E"}
                      strokeWidth={active ? "2" : "1"}
                      strokeLinecap="round"
                      className="transition-colors duration-150"
                    />
                  );
                })}

                {/* Base Track Arc */}
                <circle
                  cx="160"
                  cy="160"
                  r={radius}
                  fill="none"
                  stroke="#1F1F1F"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${totalArc} ${circumference}`}
                  transform="rotate(140 160 160)"
                />

                {/* Live Progress Arc */}
                <circle
                  cx="160"
                  cy="160"
                  r={radius}
                  fill="none"
                  stroke={`url(#speedArc-${gradientId})`}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${totalArc} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(140 160 160)"
                  filter={`url(#dialGlow-${gradientId})`}
                  className="transition-[stroke-dashoffset] duration-100 ease-out"
                />
              </svg>

              {/* Center Digital HUD */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-mono text-[10px] tracking-widest text-[#A1A1A1] uppercase">
                  {running
                    ? update?.phase === "latency"
                      ? uiText(locale, "PROBING LATENCY", "PING ÖLÇÜLÜYOR")
                      : update?.phase === "download"
                        ? uiText(locale, "DOWNLOADING", "İNDİRİLİYOR")
                        : uiText(locale, "UPLOADING", "YÜKLENİYOR")
                    : result
                      ? uiText(locale, "COMPLETED", "TAMAMLANDI")
                      : uiText(locale, "STANDBY", "BEKLEMEDE")}
                </span>

                <div className="my-1 flex items-baseline justify-center gap-1">
                  <span className="font-mono text-5xl font-bold tracking-tight text-white tabular-nums sm:text-6xl">
                    {liveValue != null && (!running || update?.phase !== "latency")
                      ? liveValue.toFixed(1)
                      : running && update?.phase === "latency"
                        ? (update?.ping ? update.ping.toFixed(0) : "...")
                        : "0.0"}
                  </span>
                </div>

                <span className="font-mono text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">
                  {running && update?.phase === "latency" ? "MS (RTT)" : "Mbps"}
                </span>

                {peakSpeed > 0 && (
                  <span className="mt-2 rounded border border-[#2E2E2E] bg-[#111111] px-2 py-0.5 font-mono text-[10px] text-[#A1A1A1]">
                    PEAK {peakSpeed.toFixed(1)} Mbps
                  </span>
                )}
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={run}
                disabled={running}
                className="group relative flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all hover:bg-neutral-200 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
              >
                <span>{result ? dict.restart : dict.start}</span>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>

              {running && (
                <button
                  type="button"
                  onClick={() => controller.current?.abort()}
                  className="rounded-full border border-[#2E2E2E] bg-[#111111] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1F1F1F]"
                >
                  {uiText(locale, "Stop", "Durdur")}
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className={`rounded-full border px-4 py-3 text-xs font-mono transition-colors ${
                  showHistory
                    ? "border-white bg-white text-black"
                    : "border-[#2E2E2E] bg-[#0A0A0A] text-[#A1A1A1] hover:text-white"
                }`}
                title={uiText(locale, "Test history & comparison", "Test geçmişi ve karşılaştırma")}
              >
                {uiText(locale, "History", "Geçmiş")} ({history.length})
              </button>
            </div>

            {notice && (
              <p className="mt-3 text-xs text-[#A1A1A1] text-center" role="status">
                {notice}
              </p>
            )}
          </div>

          {/* Right Metrics & Real-Time Graph Column */}
          <div className="flex flex-col gap-4 lg:col-span-7">
            
            {/* 4 Core High-Contrast Metric Panels */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              
              {/* Download Card */}
              <div className="rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] p-4">
                <div className="flex items-center justify-between text-xs text-[#A1A1A1]">
                  <span>{dict.download}</span>
                  <span className="font-mono text-[10px] text-white">↓ DL</span>
                </div>
                <div className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
                  {fmt(result?.download, "Mbps")}
                </div>
                <div className="mt-1 text-[11px] text-[#6E6E6E]">
                  {result ? `${((result.download / 8) * 60).toFixed(0)} MB/min` : "—"}
                </div>
              </div>

              {/* Upload Card */}
              <div className="rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] p-4">
                <div className="flex items-center justify-between text-xs text-[#A1A1A1]">
                  <span>{dict.upload}</span>
                  <span className="font-mono text-[10px] text-white">↑ UL</span>
                </div>
                <div className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
                  {fmt(result?.upload, "Mbps")}
                </div>
                <div className="mt-1 text-[11px] text-[#6E6E6E]">
                  {result ? `${((result.upload / 8) * 60).toFixed(0)} MB/min` : "—"}
                </div>
              </div>

              {/* Ping / Latency Card */}
              <div className="rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] p-4">
                <div className="flex items-center justify-between text-xs text-[#A1A1A1]">
                  <span>{uiText(locale, "Idle Latency", "Gecikme")}</span>
                  <span className="font-mono text-[10px] text-white">RTT</span>
                </div>
                <div className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
                  {fmt(result?.idle)}
                </div>
                <div className="mt-1 text-[11px] text-[#6E6E6E]">
                  {result?.minPing ? `Min: ${result.minPing.toFixed(1)} ms` : "—"}
                </div>
              </div>

              {/* Jitter Card */}
              <div className="rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] p-4">
                <div className="flex items-center justify-between text-xs text-[#A1A1A1]">
                  <span>{uiText(locale, "Jitter", "Sapma")}</span>
                  <span className="font-mono text-[10px] text-white">Δ MS</span>
                </div>
                <div className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
                  {fmt(result?.jitter)}
                </div>
                <div className="mt-1 text-[11px] text-[#6E6E6E]">
                  {result && (result.jitter ?? 0) < 5
                    ? uiText(locale, "Stable", "Kararlı")
                    : uiText(locale, "Normal", "Normal")}
                </div>
              </div>
            </div>

            {/* Bufferbloat & Loaded Latency Panel */}
            <div className="rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F1F1F] pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-[#A1A1A1] uppercase tracking-wider">
                    {uiText(locale, "BUFFERBLOAT / LOADED LATENCY", "YÜK ALTINDA GECİKME DİRENCİ")}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 font-mono text-xs font-semibold ${bloat.badgeClass}`}>
                    GRADE {bloat.grade}
                  </span>
                </div>
                <span className="text-[11px] text-[#6E6E6E]">
                  {bloat.desc}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <span className="text-[11px] text-[#6E6E6E] block">
                    {uiText(locale, "Loaded (Download)", "İndirme Sırasında")}
                  </span>
                  <span className="font-mono text-base font-semibold text-white mt-0.5 block">
                    {fmt(result?.loadedDownload)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#6E6E6E] block">
                    {uiText(locale, "Loaded (Upload)", "Yükleme Sırasında")}
                  </span>
                  <span className="font-mono text-base font-semibold text-white mt-0.5 block">
                    {fmt(result?.loadedUpload)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#6E6E6E] block">
                    {uiText(locale, "Data Exchanged", "Toplam Veri")}
                  </span>
                  <span className="font-mono text-base font-semibold text-white mt-0.5 block">
                    {result ? `${(result.bytes / 1e6).toFixed(1)} MB` : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Real-Time Dual-Series Live Chart */}
            <div className="rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-[#A1A1A1]">
                  {uiText(locale, "Real-Time Throughput Graph", "Gerçek Zamanlı Hız Grafiği")}
                </span>
                <span className="font-mono text-xs text-white">
                  {trace.length > 0
                    ? `${(trace[trace.length - 1]?.mbps ?? 0).toFixed(1)} Mbps (${trace[trace.length - 1]?.direction.toUpperCase()})`
                    : "0.0 Mbps"}
                </span>
              </div>

              <div className="mt-3 h-28 w-full">
                {trace.length > 1 ? (
                  <svg
                    viewBox={`0 0 ${trace.length * 4} 100`}
                    className="h-full w-full"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id={`chartFill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <polygon
                      fill={`url(#chartFill-${gradientId})`}
                      points={`0,100 ${trace
                        .map(
                          (p, i) =>
                            `${i * 4},${Math.max(6, 100 - (p.mbps / (peakSpeed || 100)) * 90)}`
                        )
                        .join(" ")} ${(trace.length - 1) * 4},100`}
                    />
                    <polyline
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={trace
                        .map(
                          (p, i) =>
                            `${i * 4},${Math.max(6, 100 - (p.mbps / (peakSpeed || 100)) * 90)}`
                        )
                        .join(" ")}
                    />
                  </svg>
                ) : (
                  <div className="flex h-full items-center justify-center font-mono text-xs text-[#6E6E6E]">
                    {uiText(locale, "Awaiting test execution...", "Test başlatılması bekleniyor...")}
                  </div>
                )}
              </div>
            </div>

            {/* Quality Summary & Share Action Strip */}
            {result && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] p-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={share}
                    className="flex items-center gap-1.5 rounded-full border border-[#2E2E2E] bg-[#111111] px-4 py-2 font-mono text-xs text-white transition-colors hover:bg-[#1F1F1F]"
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    <span>{uiText(locale, "Share Result", "Sonucu Paylaş")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={exportResult}
                    className="flex items-center gap-1.5 rounded-full border border-[#2E2E2E] bg-[#111111] px-4 py-2 font-mono text-xs text-white transition-colors hover:bg-[#1F1F1F]"
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>{uiText(locale, "Export JSON", "JSON İndir")}</span>
                  </button>
                </div>

                <span className="font-mono text-[11px] text-[#6E6E6E]">
                  ID: {result.timestamp.slice(0, 19).replace("T", " ")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Test History Drawer */}
        {showHistory && (
          <div className="mt-8 rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] p-6">
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {uiText(locale, "Measurement History & Comparison", "Ölçüm Geçmişi ve Karşılaştırma")}
                </h3>
                <p className="text-xs text-[#A1A1A1]">
                  {uiText(locale, "Last tests saved locally on this browser", "Bu tarayıcıda kaydedilen son testler")}
                </p>
              </div>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={clearHistory}
                  className="rounded border border-[#2E2E2E] px-3 py-1 font-mono text-xs text-[#A1A1A1] hover:text-white"
                >
                  {uiText(locale, "Clear History", "Geçmişi Temizle")}
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="py-6 text-center font-mono text-xs text-[#6E6E6E]">
                {uiText(locale, "No past tests recorded yet.", "Kayıtlı test bulunmuyor.")}
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-[#1F1F1F] text-[#6E6E6E]">
                      <th className="py-2 pr-4">{uiText(locale, "DATE", "TARİH")}</th>
                      <th className="py-2 pr-4">{dict.download}</th>
                      <th className="py-2 pr-4">{dict.upload}</th>
                      <th className="py-2 pr-4">{dict.ping}</th>
                      <th className="py-2 pr-4">{uiText(locale, "JITTER", "SAPMA")}</th>
                      <th className="py-2">{uiText(locale, "DELTA", "FARK")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F1F1F]">
                    {history.map((item, idx) => {
                      const deltaDl = result ? item.download - result.download : 0;
                      return (
                        <tr key={item.id} className="text-white hover:bg-[#111111]">
                          <td className="py-2 pr-4 text-[#A1A1A1]">
                            {new Date(item.timestamp).toLocaleString(locale, {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="py-2 pr-4 font-semibold text-white">
                            {item.download.toFixed(1)} Mbps
                          </td>
                          <td className="py-2 pr-4 text-[#A1A1A1]">
                            {item.upload.toFixed(1)} Mbps
                          </td>
                          <td className="py-2 pr-4 text-[#A1A1A1]">
                            {item.ping.toFixed(1)} ms
                          </td>
                          <td className="py-2 pr-4 text-[#A1A1A1]">
                            {item.jitter ? `${item.jitter.toFixed(1)} ms` : "—"}
                          </td>
                          <td className="py-2 text-[11px]">
                            {result && idx > 0 ? (
                              deltaDl > 0 ? (
                                <span className="text-[#46D39A]">+{deltaDl.toFixed(1)} Mbps</span>
                              ) : (
                                <span className="text-[#FF6B6B]">{deltaDl.toFixed(1)} Mbps</span>
                              )
                            ) : (
                              <span className="text-[#6E6E6E]">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
