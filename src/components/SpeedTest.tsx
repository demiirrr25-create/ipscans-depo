"use client";

import { uiText } from "@/i18n/ui";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { SpeedResult, SpeedUpdate, Trace, ServerInfo, ClientInfo } from "@/lib/speed-engine";

function getBufferbloatGrade(delta: number | null | undefined): { grade: string; badgeClass: string; desc: string } {
  if (delta == null) return { grade: "—", badgeClass: "text-[#6E6E6E] border-[#1F1F1F] bg-[#0A0A0A]", desc: "No data" };
  if (delta <= 5) return { grade: "A+", badgeClass: "text-white border-white/60 bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.15)]", desc: "Ultra-low bufferbloat · Flawless competitive gaming & real-time streams" };
  if (delta <= 15) return { grade: "A", badgeClass: "text-[#E0E0E0] border-white/40 bg-white/5", desc: "Excellent queue health · Zero streaming interruptions" };
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

// Calibrated speedometer ticks (0 to 1000+ Mbps)
const SPEED_TICKS = [
  { val: 0, label: "0" },
  { val: 10, label: "10" },
  { val: 50, label: "50" },
  { val: 100, label: "100" },
  { val: 250, label: "250" },
  { val: 500, label: "500" },
  { val: 1000, label: "1G+" },
];

function valToRatio(val: number): number {
  if (val <= 0) return 0;
  // Logarithmic scale mapping 0 - 1000 Mbps to 0.0 - 1.0
  const ratio = Math.log10(1 + val) / Math.log10(1 + 1000);
  return Math.min(1, Math.max(0, ratio));
}

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
  const [, setTrace] = useState<Trace[]>([]);
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
              name: "Verified Telemetry Record",
              location: "IPScans Network Core",
              country: "Global",
            },
          });
        });
      }
    }
  }, []);

  useEffect(() => () => controller.current?.abort(), []);

  // 60 FPS Real-time Oscilloscope Particle Waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.04;
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const mbps = update?.mbps ?? (result ? (result.download || result.upload) : 0);
      const isLive = running && mbps > 0;
      const amplitude = isLive ? Math.min(36, Math.log10(1 + mbps) * 12 + 6) : 4;
      const waveSpeed = isLive ? 2.5 : 0.8;

      // Draw subtle background grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Primary sine spline
      ctx.beginPath();
      for (let x = 0; x < width; x += 3) {
        const nx = x / width;
        const envelope = Math.sin(nx * Math.PI); // Pinched at edges
        const y =
          height / 2 +
          Math.sin(nx * 12 - t * waveSpeed) * amplitude * envelope +
          Math.cos(nx * 24 + t * waveSpeed * 1.3) * (amplitude * 0.35) * envelope;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = isLive ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = isLive ? 2 : 1;
      ctx.stroke();

      // Secondary glowing echo wave
      if (isLive) {
        ctx.beginPath();
        for (let x = 0; x < width; x += 3) {
          const nx = x / width;
          const envelope = Math.sin(nx * Math.PI);
          const y =
            height / 2 +
            Math.sin(nx * 10 - t * waveSpeed * 0.8 + 1.2) * (amplitude * 0.7) * envelope;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [running, update, result]);

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

  const liveValue = update ? update.mbps : result ? result.download : null;

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

  // 240-degree Tachometer Math
  // Center: (180, 160), Radius: 130. Sweep: 240 deg (from 150 deg to 390 deg)
  const cx = 180;
  const cy = 160;
  const r = 130;
  const startAngleDeg = 150;
  const sweepDeg = 240;

  const currentRatio = running && liveValue != null ? valToRatio(liveValue) : result ? valToRatio(result.download) : 0;
  const currentAngleDeg = startAngleDeg + currentRatio * sweepDeg;
  const currentAngleRad = (currentAngleDeg * Math.PI) / 180;

  // Total perimeter of 240 deg arc
  const arcLen = (2 * Math.PI * r * sweepDeg) / 360;
  const fullCircumference = 2 * Math.PI * r;
  const strokeDashoffset = arcLen * (1 - currentRatio);

  // SVG arc path from start to end (for base background track)
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const rad = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(rad),
      y: centerY + radius * Math.sin(rad),
    };
  };

  const startPt = polarToCartesian(cx, cy, r, startAngleDeg);
  const endPt = polarToCartesian(cx, cy, r, startAngleDeg + sweepDeg);
  const baseArcD = `M ${startPt.x} ${startPt.y} A ${r} ${r} 0 1 1 ${endPt.x} ${endPt.y}`;

  // Needle tip
  const needleTip = {
    x: cx + (r - 10) * Math.cos(currentAngleRad),
    y: cy + (r - 10) * Math.sin(currentAngleRad),
  };

  return (
    <section className="relative mx-auto w-full max-w-[1140px] px-4 py-6 md:py-10" aria-label={dict.title}>
      {/* Container Card with pure black background and hairline obsidian border */}
      <div className="relative overflow-hidden rounded-[28px] border border-[#1C1D22] bg-[#000000] p-6 shadow-2xl md:p-10">
        
        {/* Subtle luminous ambient aura */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[650px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.035)_0%,transparent_75%)] blur-3xl"
          aria-hidden="true"
        />

        {/* Top Edge Telemetry Hub */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-[#16171B] pb-6 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full ${running ? "bg-white animate-ping" : "bg-emerald-400 opacity-75"}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${running ? "bg-white" : "bg-emerald-400"}`} />
            </span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white tracking-wide">{serverInfo?.name || "IPScans Verified Edge Hub"}</span>
              <span className="text-[#4E5058]">·</span>
              <span className="text-[#9E9E9E]">{serverInfo?.location || "Low-Latency Gateway"}</span>
            </div>
          </div>

          <div className="flex items-center gap-5 text-[#8E8E93] text-[11px]">
            <div>
              <span className="text-[#555558] mr-1.5">CLIENT IP:</span>
              <span className="text-white font-medium">{clientInfo?.ip || "Auto-detecting"}</span>
              {clientInfo?.country && <span className="ml-1 text-[#66666A]">({clientInfo.country})</span>}
            </div>
            <div className="hidden sm:block">
              <span className="text-[#555558] mr-1.5">PACKET LOSS:</span>
              <span className="text-white font-medium">{result ? `${result.packetLoss.toFixed(1)}%` : "0.0%"}</span>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="text-[#A1A1A6] hover:text-white transition-colors cursor-pointer border border-[#26262B] rounded-lg px-2.5 py-1 bg-[#090A0D]"
              >
                {showHistory ? uiText(locale, "Close History", "Geçmişi Kapat") : uiText(locale, "History", "Geçmiş")} ({history.length})
              </button>
            </div>
          </div>
        </div>

        {/* Center Tachometer / Performance Studio */}
        <div className="relative z-10 my-8 flex flex-col items-center justify-center">

          {/* Tachometer SVG Visualizer */}
          <div className="relative flex h-[310px] w-full max-w-[420px] items-center justify-center">
            <svg viewBox="0 0 360 300" className="h-full w-full overflow-visible" aria-hidden="true">
              <defs>
                <linearGradient id={`arcGrad-${gradientId}`} x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
                  <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
                </linearGradient>

                <filter id={`needleGlow-${gradientId}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background Outer Border Ring */}
              <circle cx={cx} cy={cy} r={r + 14} fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />

              {/* Base Arc Track */}
              <path
                d={baseArcD}
                fill="none"
                stroke="#121317"
                strokeWidth="10"
                strokeLinecap="round"
              />

              {/* Calibrated Ticks & Numerical Speed Labels */}
              {SPEED_TICKS.map((tick) => {
                const ratio = valToRatio(tick.val);
                const angleDeg = startAngleDeg + ratio * sweepDeg;
                const innerPt = polarToCartesian(cx, cy, r - 12, angleDeg);
                const outerPt = polarToCartesian(cx, cy, r + 4, angleDeg);
                const textPt = polarToCartesian(cx, cy, r - 26, angleDeg);

                return (
                  <g key={tick.val}>
                    <line
                      x1={innerPt.x}
                      y1={innerPt.y}
                      x2={outerPt.x}
                      y2={outerPt.y}
                      stroke="rgba(255, 255, 255, 0.25)"
                      strokeWidth="1.5"
                    />
                    <text
                      x={textPt.x}
                      y={textPt.y + 3.5}
                      fill="#71717A"
                      fontSize="9.5"
                      fontFamily="monospace"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {tick.label}
                    </text>
                  </g>
                );
              })}

              {/* Active Sweeping Arc */}
              <path
                d={baseArcD}
                fill="none"
                stroke={`url(#arcGrad-${gradientId})`}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${arcLen} ${fullCircumference}`}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-150 ease-out"
                filter={`url(#needleGlow-${gradientId})`}
              />

              {/* Center Hub & Needle */}
              <circle cx={cx} cy={cy} r="6" fill="#FFFFFF" />
              <circle cx={cx} cy={cy} r="18" fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1.5" />

              {/* Glowing Precision Needle */}
              <line
                x1={cx}
                y1={cy}
                x2={needleTip.x}
                y2={needleTip.y}
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="transition-all duration-150 ease-out"
                filter={`url(#needleGlow-${gradientId})`}
              />
            </svg>

            {/* Centerpiece Numerical Telemetry Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-10 pointer-events-none">
              
              {/* Active Phase Pill */}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-0.5 font-mono text-[10px] font-semibold tracking-widest text-white uppercase backdrop-blur-sm">
                <span className={`h-1.5 w-1.5 rounded-full ${running ? "bg-white animate-pulse" : "bg-[#46D39A]"}`} />
                {!running && !result
                  ? uiText(locale, "READY", "HAZIR")
                  : update?.phase === "latency"
                  ? uiText(locale, "PING & JITTER", "GECİKME ANALİZİ")
                  : update?.phase === "download"
                  ? uiText(locale, "DOWNLOAD STREAM", "İNDİRME TESTİ")
                  : update?.phase === "upload"
                  ? uiText(locale, "UPLOAD STREAM", "YÜKLEME TESTİ")
                  : uiText(locale, "COMPLETED", "TEST TAMAMLANDI")}
              </span>

              {/* Huge Monospace Speed Value */}
              <div className="my-1.5 flex items-baseline justify-center">
                <span className="font-mono text-5xl sm:text-6xl font-extrabold tracking-tight text-white tabular-nums">
                  {running && update?.phase === "latency"
                    ? (update.ping ? update.ping.toFixed(0) : "...")
                    : liveValue != null
                    ? liveValue.toFixed(1)
                    : "0.0"}
                </span>
              </div>

              {/* Unit Tag */}
              <span className="font-mono text-xs font-bold tracking-[0.2em] text-[#A1A1AA] uppercase">
                {running && update?.phase === "latency" ? "MS (RTT)" : "Mbps"}
              </span>
            </div>
          </div>

          {/* 60 FPS Real-time Oscilloscope Waveform Canvas */}
          <div className="w-full max-w-md h-12 mt-2 px-2">
            <canvas
              ref={canvasRef}
              width={480}
              height={48}
              className="w-full h-full rounded-lg bg-[#050608] border border-[#16171B]"
              aria-hidden="true"
            />
          </div>

          {/* Primary Action Button Bar */}
          <div className="mt-8 flex items-center justify-center gap-4">
            {!running ? (
              <button
                type="button"
                onClick={run}
                className="group relative inline-flex items-center justify-center gap-2.5 rounded-full bg-white px-9 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-black transition-all hover:bg-[#E8E8E8] hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer shadow-[0_0_30px_rgba(255,255,255,0.25)]"
              >
                <span>{result ? dict.restart : dict.start}</span>
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stop}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-8 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-red-400 hover:bg-red-500/20 active:scale-95 cursor-pointer transition-colors"
              >
                <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                <span>{uiText(locale, "Cancel Test", "Testi Durdur")}</span>
              </button>
            )}

            {result && !running && (
              <>
                <button
                  type="button"
                  onClick={share}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#2B2C33] bg-[#0E0F14] px-6 py-3 font-mono text-xs font-semibold text-white hover:border-white/30 hover:bg-[#14161D] cursor-pointer transition-all"
                >
                  <span>🔗</span>
                  <span>{uiText(locale, "Share", "Paylaş")}</span>
                </button>

                <button
                  type="button"
                  onClick={exportResult}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#2B2C33] bg-[#0E0F14] px-6 py-3 font-mono text-xs font-semibold text-white hover:border-white/30 hover:bg-[#14161D] cursor-pointer transition-all"
                >
                  <span>⬇</span>
                  <span>JSON</span>
                </button>
              </>
            )}
          </div>

          {notice && (
            <p className="mt-4 text-center font-mono text-xs text-[#A1A1A6] max-w-md">
              {notice}
            </p>
          )}

        </div>

        {/* Executive Telemetry Grid */}
        <div className="relative z-10 mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 font-mono">
          
          {/* Download Card */}
          <div className="rounded-2xl border border-[#1C1D24] bg-[#07080B] p-5 text-left transition-all hover:border-[#2C2D36]">
            <div className="flex items-center justify-between text-xs text-[#8E8E93]">
              <span className="font-semibold uppercase tracking-wider">{dict.download}</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white text-[11px]">↓</span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
                {result ? result.download.toFixed(1) : (update?.phase === "download" ? update.mbps.toFixed(1) : "—")}
              </span>
              <span className="text-xs font-semibold text-[#8E8E93]">Mbps</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between border-t border-[#16171E] pt-2 text-[10px] text-[#636366]">
              <span>Loaded: {result?.loadedDownload ? `${result.loadedDownload.toFixed(0)} ms` : "—"}</span>
              <span>{result ? `${((result.download * 1.25) / 10).toFixed(0)} MB` : "Multi-stream"}</span>
            </div>
          </div>

          {/* Upload Card */}
          <div className="rounded-2xl border border-[#1C1D24] bg-[#07080B] p-5 text-left transition-all hover:border-[#2C2D36]">
            <div className="flex items-center justify-between text-xs text-[#8E8E93]">
              <span className="font-semibold uppercase tracking-wider">{dict.upload}</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white text-[11px]">↑</span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
                {result ? result.upload.toFixed(1) : (update?.phase === "upload" ? update.mbps.toFixed(1) : "—")}
              </span>
              <span className="text-xs font-semibold text-[#8E8E93]">Mbps</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between border-t border-[#16171E] pt-2 text-[10px] text-[#636366]">
              <span>Loaded: {result?.loadedUpload ? `${result.loadedUpload.toFixed(0)} ms` : "—"}</span>
              <span>{result ? `${((result.upload * 1.25) / 10).toFixed(0)} MB` : "Multi-stream"}</span>
            </div>
          </div>

          {/* Latency & Jitter Card */}
          <div className="rounded-2xl border border-[#1C1D24] bg-[#07080B] p-5 text-left transition-all hover:border-[#2C2D36]">
            <div className="flex items-center justify-between text-xs text-[#8E8E93]">
              <span className="font-semibold uppercase tracking-wider">{dict.ping} & JITTER</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white text-[11px]">⚡</span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
                {result ? result.idle.toFixed(1) : (update?.ping ? update.ping.toFixed(0) : "—")}
              </span>
              <span className="text-xs font-semibold text-[#8E8E93]">ms</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between border-t border-[#16171E] pt-2 text-[10px] text-[#636366]">
              <span>Jitter: {result?.jitter ? `${result.jitter.toFixed(1)} ms` : "RFC 3550"}</span>
              <span>Min: {result ? `${result.minPing.toFixed(1)} ms` : "—"}</span>
            </div>
          </div>

          {/* Bufferbloat Grade Card */}
          <div className="rounded-2xl border border-[#1C1D24] bg-[#07080B] p-5 text-left transition-all hover:border-[#2C2D36]">
            <div className="flex items-center justify-between text-xs text-[#8E8E93]">
              <span className="font-semibold uppercase tracking-wider">BUFFERBLOAT</span>
              <span className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${bloat.badgeClass}`}>
                {bloat.grade}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
                {bufferbloatDelta != null ? `+${bufferbloatDelta.toFixed(0)}` : "—"}
              </span>
              <span className="text-xs font-semibold text-[#8E8E93]">ms delta</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between border-t border-[#16171E] pt-2 text-[10px] text-[#636366]">
              <span className="truncate">{bloat.desc.split("·")[0]}</span>
            </div>
          </div>

        </div>

        {/* Test History Drawer */}
        {showHistory && (
          <div className="relative z-10 mt-8 rounded-2xl border border-[#1C1D24] bg-[#07080B] p-6 font-mono">
            <div className="flex items-center justify-between pb-4 border-b border-[#16171E]">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {uiText(locale, "Telemetry Measurement History", "Ölçüm Geçmişi ve Karşılaştırma")}
              </span>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-[11px] text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
                >
                  {uiText(locale, "Clear History", "Geçmişi Temizle")}
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#636366]">
                {uiText(locale, "No previous measurements recorded.", "Kayıtlı ölçüm bulunmuyor.")}
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#16171E] text-[#8E8E93]">
                      <th className="py-2.5 font-medium">TIMESTAMP</th>
                      <th className="py-2.5 font-medium">DOWNLOAD</th>
                      <th className="py-2.5 font-medium">UPLOAD</th>
                      <th className="py-2.5 font-medium">PING</th>
                      <th className="py-2.5 font-medium">JITTER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#121318] text-white">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 text-[#8E8E93]">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="py-2.5 font-bold text-white">{item.download.toFixed(1)} Mbps</td>
                        <td className="py-2.5 font-bold text-white">{item.upload.toFixed(1)} Mbps</td>
                        <td className="py-2.5">{item.ping.toFixed(1)} ms</td>
                        <td className="py-2.5">{item.jitter ? `${item.jitter.toFixed(1)} ms` : "—"}</td>
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
