"use client";

import { uiText } from "@/i18n/ui";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { SpeedResult, SpeedUpdate, Trace } from "@/lib/speed-engine";
import { AntigravityParticles } from "./AntigravityParticles";

function getBufferbloatGrade(delta: number | null | undefined): { grade: string; badgeClass: string } {
  if (delta == null) return { grade: "—", badgeClass: "text-neutral-400 border-neutral-700 bg-neutral-900" };
  if (delta <= 5) return { grade: "A+", badgeClass: "text-white border-white/40 bg-white/10" };
  if (delta <= 15) return { grade: "A", badgeClass: "text-neutral-200 border-white/20 bg-white/5" };
  if (delta <= 30) return { grade: "B", badgeClass: "text-neutral-300 border-neutral-700 bg-white/5" };
  if (delta <= 60) return { grade: "C", badgeClass: "text-neutral-400 border-neutral-700 bg-black" };
  if (delta <= 120) return { grade: "D", badgeClass: "text-neutral-400 border-neutral-800 bg-black" };
  return { grade: "F", badgeClass: "text-neutral-500 border-neutral-800 bg-black" };
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
  const [trace, setTrace] = useState<Trace[]>([]);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("");
  const controller = useRef<AbortController | null>(null);

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
      const measured = await runSpeedTest(session.signal, (value) => {
        if (session.signal.aborted) return;
        setUpdate(value);
        if (value.trace) {
          setTrace((points) => [...points.slice(-99), value.trace!]);
        }
      });
      setResult(measured);
    } catch {
      setNotice(
        session.signal.aborted
          ? uiText(
              locale,
              "Test stopped. Incomplete results were not published.",
              "Test durduruldu. Eksik sonuç yayımlanmadı."
            )
          : uiText(
              locale,
              "Insufficient measurements. Check your connection and try again.",
              "Yeterli ölçüm alınamadı. Bağlantıyı kontrol edip yeniden deneyin."
            )
      );
    } finally {
      if (controller.current === session) {
        controller.current = null;
        setRunning(false);
      }
    }
  }

  const phase = update?.phase ?? (result ? "complete" : "ready");
  const label =
    phase === "upload"
      ? dict.upload
      : phase === "latency"
        ? dict.ping
        : phase === "download"
          ? dict.download
          : result
            ? dict.download
            : uiText(locale, "Ready", "Hazır");

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

  const summary = result
    ? `IPScans / ${new Date(result.timestamp).toLocaleString(locale)}\n${dict.download}: ${fmt(result.download, "Mbps")} · ${dict.upload}: ${fmt(result.upload, "Mbps")}\n${dict.ping}: ${fmt(result.idle)} · ${uiText(locale, "Jitter", "Gecikme sapması")}: ${fmt(result.jitter)}\n${uiText(locale, "Loaded latency", "Yük altında")}: ${fmt(result.loadedDownload)} (QoS Grade: ${bloat.grade})\nPayload: ${(result.bytes / 1e6).toFixed(1)} MB transferred\nhttps://ipscans.com/${locale}`
    : "";

  async function share() {
    try {
      await navigator.clipboard.writeText(summary);
      setNotice(
        uiText(
          locale,
          "Full telemetry copied to clipboard.",
          "Tüm telemetri panoya kopyalandı."
        )
      );
    } catch {
      setNotice(
        uiText(
          locale,
          "Copy unavailable; download the JSON result.",
          "Kopyalama kullanılamıyor; JSON dosyasını indirebilirsiniz."
        )
      );
    }
  }

  function exportResult() {
    if (!result) return;
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              generator: "IPScans Speed Telemetry Engine v4.3",
              method: "Multi-threaded adaptive HTTP streaming with RTT probing",
              bufferbloatGrade: bloat.grade,
              bufferbloatDeltaMs: bufferbloatDelta,
              ...result,
            },
            null,
            2
          ),
        ],
        { type: "application/json" }
      )
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `ipscans-speed-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Dial geometry: 280x280 precision obsidian gauge
  // Sweep angle: 260 degrees (-220 deg to +40 deg)
  const progressRatio = Math.min(1, Math.log10(1 + (liveValue ?? 0)) / 3.8);
  const capsuleCount = 44;
  const radius = 104;
  const circumference = 2 * Math.PI * radius;
  // Arc length is 72% of circle (~260 degrees)
  const arcSweep = 0.72;
  const totalArc = circumference * arcSweep;
  const strokeDashoffset = totalArc * (1 - progressRatio);

  return (
    <section className="agy-speed-studio" aria-label={dict.title}>
      <div className="agy-speed-hero-card">
        <AntigravityParticles variant="subpage" className="agy-speed-hero-card__bg" />

        {/* Top Status & Stage Ribbon */}
        <div className="agy-speed-topbar">
          <div
            className="agy-speed-stage-pills"
            role="list"
            aria-label={uiText(locale, "Test stages", "Test aşamaları")}
          >
            {(["latency", "download", "upload"] as const).map((stage, index) => {
              const isCurrent = running && update?.phase === stage;
              const isDone =
                Boolean(result) ||
                (stage === "latency" && (update?.phase === "download" || update?.phase === "upload")) ||
                (stage === "download" && update?.phase === "upload");
              return (
                <div
                  key={stage}
                  role="listitem"
                  aria-current={isCurrent ? "step" : undefined}
                  className={`newsletter-topic-pill ${isCurrent ? "selected animate-pulse" : isDone ? "selected" : ""}`}
                >
                  <span className="font-mono text-xs opacity-60">0{index + 1}</span>
                  <span className="font-medium">
                    {stage === "latency"
                      ? uiText(locale, "Latency & Jitter", "Gecikme & Sapma")
                      : stage === "download"
                        ? dict.download
                        : dict.upload}
                  </span>
                  <span aria-hidden="true" className="font-mono text-xs text-white">
                    {isDone ? "✓" : isCurrent ? "●" : "·"}
                  </span>
                </div>
              );
            })}
          </div>

          <span className="agy-speed-edge-pill">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" aria-hidden="true" />
            <span className="font-mono text-[11px] tracking-wider uppercase">
              {uiText(
                locale,
                "MULTI-STREAM ENGINE · VERIFIED TELEMETRY",
                "ÇOK KANALLI MOTOR · DOĞRULANMIŞ TELEMETRİ"
              )}
            </span>
          </span>
        </div>

        {/* Main Precision Tachometer & Telemetry Grid */}
        <div className="agy-speed-main-grid">
          {/* Executive Obsidian Tachometer */}
          <div className="agy-speed-gauge-panel">
            <div className="agy-speed-dial" role="presentation">
              <svg
                viewBox="0 0 280 280"
                className="agy-speed-dial__svg"
                aria-hidden="true"
              >
                <defs>
                  {/* Platinum-monochrome arc gradient */}
                  <linearGradient id={`speedArc-${gradientId}`} x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(255, 255, 255, 0.25)" />
                    <stop offset="50%" stopColor="rgba(255, 255, 255, 0.75)" />
                    <stop offset="100%" stopColor="#ffffff" />
                  </linearGradient>
                  <filter id={`dialGlow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Outer bezel ring */}
                <circle
                  cx="140"
                  cy="140"
                  r="124"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="1"
                />

                {/* Inner well subtle backing */}
                <circle
                  cx="140"
                  cy="140"
                  r="104"
                  fill="rgba(255, 255, 255, 0.015)"
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeWidth="1"
                />

                {/* Precision tick marks around sweep (260 deg arc) */}
                {Array.from({ length: capsuleCount }).map((_, idx) => {
                  const fraction = idx / (capsuleCount - 1);
                  // Angle from 140 deg to 400 deg (i.e. -220 deg to +40 deg in Cartesian)
                  const angDeg = 140 + fraction * 260;
                  const angRad = (angDeg * Math.PI) / 180;
                  const active = fraction <= progressRatio;
                  const r1 = 114;
                  const r2 = active ? 122 : 117;
                  const x1 = 140 + Math.cos(angRad) * r1;
                  const y1 = 140 + Math.sin(angRad) * r1;
                  const x2 = 140 + Math.cos(angRad) * r2;
                  const y2 = 140 + Math.sin(angRad) * r2;
                  return (
                    <line
                      key={idx}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={active ? "#ffffff" : "rgba(255,255,255,0.14)"}
                      strokeWidth={active ? "2" : "1"}
                      strokeLinecap="round"
                      className="transition-colors duration-150"
                    />
                  );
                })}

                {/* Base track arc (260 degrees) */}
                <circle
                  cx="140"
                  cy="140"
                  r={radius}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.07)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${totalArc} ${circumference}`}
                  transform="rotate(140 140 140)"
                />

                {/* Active progress arc */}
                <circle
                  cx="140"
                  cy="140"
                  r={radius}
                  fill="none"
                  stroke={`url(#speedArc-${gradientId})`}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeDasharray={`${totalArc} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(140 140 140)"
                  filter={`url(#dialGlow-${gradientId})`}
                  className="transition-[stroke-dashoffset] duration-150"
                />
              </svg>

              {/* Digital HUD in Center */}
              <div className="agy-speed-dial__center">
                <span className="agy-speed-dial__phase">
                  {running
                    ? update?.phase === "latency"
                      ? uiText(locale, "PROBING RTT", "PING ÖLÇÜLÜYOR")
                      : update?.phase === "download"
                        ? uiText(locale, "DOWNLOAD STREAM", "İNDİRME AKIŞI")
                        : uiText(locale, "UPLOAD STREAM", "YÜKLEME AKIŞI")
                    : result
                      ? uiText(locale, "MEASUREMENT COMPLETE", "ÖLÇÜM TAMAMLANDI")
                      : uiText(locale, "SYSTEM READY", "SİSTEM HAZIR")}
                </span>
                <span className="agy-speed-dial__number">
                  {liveValue != null && (!running || update?.phase !== "latency")
                    ? liveValue.toFixed(1)
                    : running && update?.phase === "latency"
                      ? "..."
                      : "0.0"}
                </span>
                <span className="agy-speed-dial__unit">
                  {running && update?.phase === "latency" ? "PING / RTT" : "Mbps"}
                </span>
                {peakSpeed > 0 && (
                  <span className="mt-1 font-mono text-[11px] tracking-wide text-neutral-400">
                    PEAK {peakSpeed.toFixed(1)} Mbps
                  </span>
                )}
              </div>
            </div>

            {/* Main Action Controls */}
            <div className="agy-speed-controls">
              <button
                type="button"
                onClick={run}
                disabled={running}
                className="call-to-action button button-primary font-semibold tracking-wide"
              >
                <span>{result ? dict.restart : dict.start}</span>
                <svg viewBox="0 -960 960 960" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <path d="M320-200v-560l440 280-440 280Z" />
                </svg>
              </button>
              {running && (
                <button
                  type="button"
                  onClick={() => controller.current?.abort()}
                  className="call-to-action button button-secondary"
                >
                  <span>{uiText(locale, "Stop", "Durdur")}</span>
                </button>
              )}
            </div>

            <p role="status" className="agy-speed-status">
              {notice ||
                (running
                  ? `${label} · ${(update?.seconds ?? 0).toFixed(0)} s`
                  : result
                    ? uiText(locale, "Real HTTPS stream completed", "Gerçek HTTPS akış testi tamamlandı")
                    : uiText(locale, "Multi-stream throughput & latency test", "Çok kanallı hız ve gecikme testi"))}
            </p>
          </div>

          {/* Telemetry Panel */}
          <div className="agy-speed-telemetry-panel">
            {/* 6 High-Contrast Obsidian Metric Cards */}
            <div className="agy-speed-metrics-grid">
              <div className="agy-speed-metric-card">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="agy-speed-metric-card__label">{dict.download}</p>
                    <span className="agy-speed-metric-card__badge">↓ DL</span>
                  </div>
                  <p className="agy-speed-metric-card__value">{fmt(result?.download, "Mbps")}</p>
                </div>
              </div>

              <div className="agy-speed-metric-card">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="agy-speed-metric-card__label">{dict.upload}</p>
                    <span className="agy-speed-metric-card__badge">↑ UL</span>
                  </div>
                  <p className="agy-speed-metric-card__value">{fmt(result?.upload, "Mbps")}</p>
                </div>
              </div>

              <div className="agy-speed-metric-card">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="agy-speed-metric-card__label">{uiText(locale, "Idle Latency", "Boşta Gecikme")}</p>
                    <span className="agy-speed-metric-card__badge">RTT</span>
                  </div>
                  <p className="agy-speed-metric-card__value">{fmt(result?.idle)}</p>
                </div>
              </div>

              <div className="agy-speed-metric-card">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="agy-speed-metric-card__label">{uiText(locale, "Jitter", "Gecikme Sapması")}</p>
                    <span className="agy-speed-metric-card__badge">Δ MS</span>
                  </div>
                  <p className="agy-speed-metric-card__value">{fmt(result?.jitter)}</p>
                </div>
              </div>

              <div className="agy-speed-metric-card">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="agy-speed-metric-card__label">{uiText(locale, "Bufferbloat", "Yük Altı Gecikme")}</p>
                    <span className={`agy-speed-metric-card__badge border ${bloat.badgeClass}`}>
                      GRADE {bloat.grade}
                    </span>
                  </div>
                  <p className="agy-speed-metric-card__value">{fmt(result?.loadedDownload)}</p>
                </div>
              </div>

              <div className="agy-speed-metric-card">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="agy-speed-metric-card__label">{uiText(locale, "Transferred", "Aktarılan Veri")}</p>
                    <span className="agy-speed-metric-card__badge">DATA</span>
                  </div>
                  <p className="agy-speed-metric-card__value">
                    {result ? `${(result.bytes / 1e6).toFixed(1)} MB` : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Live Real-Time Throughput Curve (Monochromatic Area) */}
            <div className="agy-speed-chart-card">
              <div className="agy-speed-chart-card__head">
                <span className="font-mono text-xs uppercase tracking-wider text-neutral-300">
                  {uiText(locale, "Real-Time Throughput Curve", "Gerçek Zamanlı Aktarım Eğrisi")}
                </span>
                <span className="font-mono text-xs text-white">
                  {trace.length > 0
                    ? `${(trace[trace.length - 1]?.mbps ?? 0).toFixed(1)} Mbps (${trace[trace.length - 1]?.direction.toUpperCase()})`
                    : "0.0 Mbps"}
                </span>
              </div>

              <div className="agy-speed-chart-card__graph">
                {trace.length > 1 ? (
                  <svg
                    viewBox={`0 0 ${trace.length * 4} 70`}
                    className="agy-speed-chart-card__svg"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id={`chartFill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Area polygon */}
                    <polygon
                      fill={`url(#chartFill-${gradientId})`}
                      points={`0,70 ${trace
                        .map(
                          (p, i) =>
                            `${i * 4},${Math.max(4, 70 - (p.mbps / (peakSpeed || 100)) * 62)}`
                        )
                        .join(" ")} ${(trace.length - 1) * 4},70`}
                    />
                    {/* Stroke line */}
                    <polyline
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={trace
                        .map(
                          (p, i) =>
                            `${i * 4},${Math.max(4, 70 - (p.mbps / (peakSpeed || 100)) * 62)}`
                        )
                        .join(" ")}
                    />
                  </svg>
                ) : (
                  <div className="flex h-16 items-center justify-center font-mono text-xs text-neutral-500">
                    {uiText(locale, "Awaiting test execution...", "Test başlatılması bekleniyor...")}
                  </div>
                )}
              </div>
            </div>

            {/* Practical Connection Capability Assessment (Sleek Obsidian Vector Cards) */}
            {result && (
              <div className="rounded-2xl border border-white/10 bg-[#08090d] p-5 shadow-2xl">
                <span className="font-mono text-[11px] tracking-wider uppercase text-neutral-400">
                  {uiText(locale, "CONNECTION READINESS & QUALITY ASSESSMENT", "BAĞLANTI UYGUNLUK VE KALİTE DEĞERLENDİRMESİ")}
                </span>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20">
                    <div className="flex items-center gap-2.5">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white" aria-hidden="true">
                        <line x1="6" y1="12" x2="10" y2="12" />
                        <line x1="8" y1="10" x2="8" y2="14" />
                        <line x1="15" y1="13" x2="15.01" y2="13" />
                        <line x1="18" y1="11" x2="18.01" y2="11" />
                        <rect x="2" y="6" width="20" height="12" rx="6" />
                      </svg>
                      <span className="text-xs font-semibold text-white">
                        {uiText(locale, "Esports & Gaming", "Espor & Çevrim İçi Oyun")}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-xs text-neutral-300">
                      {result.idle < 35 && (result.jitter ?? 0) < 10
                        ? uiText(locale, "Low Latency (Esports Ready)", "Düşük Gecikme (Espor Uygun)")
                        : result.idle < 80
                          ? uiText(locale, "Adequate Response Time", "Yeterli Tepki Süresi")
                          : uiText(locale, "Noticeable Latency", "Belirgin Gecikme")}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20">
                    <div className="flex items-center gap-2.5">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white" aria-hidden="true">
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                      <span className="text-xs font-semibold text-white">
                        {uiText(locale, "4K / 8K UHD Streaming", "4K / 8K UHD Yayın")}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-xs text-neutral-300">
                      {result.download >= 50
                        ? uiText(locale, "8K Ultra-HD Ready", "8K Ultra-HD Hazır")
                        : result.download >= 25
                          ? uiText(locale, "4K UHD Ready", "4K UHD Hazır")
                          : uiText(locale, "1080p HD Ready", "1080p HD Hazır")}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20">
                    <div className="flex items-center gap-2.5">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white" aria-hidden="true">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <span className="text-xs font-semibold text-white">
                        {uiText(locale, "VoIP & Video Conferences", "Sesli & Görüntülü Konferans")}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-xs text-neutral-300">
                      {bloat.grade === "A+" || bloat.grade === "A"
                        ? uiText(locale, "Zero Bufferbloat Jitter", "Sıfır Paket Kuyruğu Donması")
                        : uiText(locale, "Standard Telephony Quality", "Standart Ses Kalitesi")}
                    </p>
                  </div>
                </div>

                {/* Secondary export / share controls */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={share}
                      className="button button-compact button-secondary font-mono text-xs"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 inline-block" aria-hidden="true">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      <span>{uiText(locale, "Copy Summary", "Sonucu Kopyala")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={exportResult}
                      className="button button-compact button-secondary font-mono text-xs"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 inline-block" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span>{uiText(locale, "Export JSON", "JSON Olarak İndir")}</span>
                    </button>
                  </div>
                  <span className="font-mono text-xs text-neutral-400">
                    TELEMETRY ID: {result.timestamp.slice(0, 19).replace("T", " ")}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
