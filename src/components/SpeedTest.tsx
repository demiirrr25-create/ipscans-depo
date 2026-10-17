"use client";

import { uiText } from "@/i18n/ui";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { SpeedResult, SpeedUpdate, Trace } from "@/lib/speed-engine";
import { AntigravityParticles } from "./AntigravityParticles";

function getBufferbloatGrade(delta: number | null | undefined): { grade: string; color: string } {
  if (delta == null) return { grade: "—", color: "#9aa0a6" };
  if (delta <= 5) return { grade: "A+", color: "#10b981" };
  if (delta <= 15) return { grade: "A", color: "#34d399" };
  if (delta <= 30) return { grade: "B", color: "#60a5fa" };
  if (delta <= 60) return { grade: "C", color: "#fbbf24" };
  if (delta <= 120) return { grade: "D", color: "#f97316" };
  return { grade: "F", color: "#ef4444" };
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
    ? `IPScans / ${new Date(result.timestamp).toLocaleString(locale)}\n${dict.download} ${fmt(result.download, "Mbps")} · ${dict.upload} ${fmt(result.upload, "Mbps")}\n${dict.ping} ${fmt(result.idle)} · ${uiText(locale, "Jitter", "Gecikme sapması")} ${fmt(result.jitter)}\n${uiText(locale, "Loaded latency", "Yük altında")} ${fmt(result.loadedDownload)} (Grade: ${bloat.grade})\nCloudflare Edge Anycast · ${(result.bytes / 1e6).toFixed(1)} MB transferred\nhttps://ipscans.com/${locale}`
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
              endpoint: "Cloudflare Anycast HTTPS Edge",
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

  // Dial progress geometry
  const progressRatio = Math.min(1, Math.log10(1 + (liveValue ?? 0)) / 3.8);
  const capsuleCount = 36;
  const circumference = 2 * Math.PI * 98; // radius 98

  return (
    <section className="agy-speed-studio" aria-label={dict.title}>
      <div className="agy-speed-hero-card">
        <AntigravityParticles variant="subpage" className="agy-speed-hero-card__bg" />

        {/* Top Status & Edge Location Ribbon */}
        <div className="agy-speed-topbar">
          <div
            className="agy-speed-stage-pills"
            role="list"
            aria-label={uiText(locale, "Test stages", "Test aşamaları")}
          >
            {(["latency", "download", "upload"] as const).map((stage, index) => {
              const isCurrent = running && update?.phase === stage;
              const isDone = Boolean(result) || (stage === "latency" && (update?.phase === "download" || update?.phase === "upload")) || (stage === "download" && update?.phase === "upload");
              return (
                <div
                  key={stage}
                  role="listitem"
                  aria-current={isCurrent ? "step" : undefined}
                  className={`newsletter-topic-pill ${isCurrent ? "selected animate-pulse" : isDone ? "selected" : ""}`}
                >
                  <span className="font-mono text-xs opacity-70">0{index + 1}</span>
                  <span>
                    {stage === "latency"
                      ? uiText(locale, "Latency & Jitter", "Gecikme & Sapma")
                      : stage === "download"
                        ? dict.download
                        : dict.upload}
                  </span>
                  <span aria-hidden="true" className="font-mono text-xs">
                    {isDone ? "✓" : isCurrent ? "●" : "·"}
                  </span>
                </div>
              );
            })}
          </div>

          <span className="agy-speed-edge-pill">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
            <span>
              {uiText(
                locale,
                "Cloudflare Anycast Edge · TLS 1.3",
                "Cloudflare Anycast Uç Ağı · TLS 1.3"
              )}
            </span>
          </span>
        </div>

        {/* Main Telemetry & Tachometer Dashboard */}
        <div className="agy-speed-main-grid">
          {/* Tachometer Dial Panel */}
          <div className="agy-speed-gauge-panel">
            <div className="agy-speed-dial" role="presentation">
              <svg
                viewBox="0 0 260 260"
                className="agy-speed-dial__svg"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id={`speedArc-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00f0ff" />
                    <stop offset="45%" stopColor="#7189ff" />
                    <stop offset="80%" stopColor="#ff4d6d" />
                    <stop offset="100%" stopColor="#ffcf03" />
                  </linearGradient>
                  <filter id={`dialGlow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Ambient glow backing circle */}
                <circle
                  cx="130"
                  cy="130"
                  r="98"
                  fill="none"
                  stroke="rgba(0, 240, 255, 0.05)"
                  strokeWidth="12"
                />

                {/* Radial tick marks */}
                {Array.from({ length: capsuleCount }).map((_, idx) => {
                  const ang = (idx / capsuleCount) * Math.PI * 2 - Math.PI * 0.5;
                  const active = idx / capsuleCount <= progressRatio;
                  const r1 = 114;
                  const r2 = active ? 124 : 118;
                  const x1 = 130 + Math.cos(ang) * r1;
                  const y1 = 130 + Math.sin(ang) * r1;
                  const x2 = 130 + Math.cos(ang) * r2;
                  const y2 = 130 + Math.sin(ang) * r2;
                  return (
                    <line
                      key={idx}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={active ? "#00f0ff" : "rgba(255,255,255,0.12)"}
                      strokeWidth={active ? "3" : "1.8"}
                      strokeLinecap="round"
                      className="transition-colors duration-150"
                    />
                  );
                })}

                {/* Base track circle */}
                <circle
                  cx="130"
                  cy="130"
                  r="98"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="6"
                />

                {/* Active progress arc */}
                <circle
                  cx="130"
                  cy="130"
                  r="98"
                  fill="none"
                  stroke={`url(#speedArc-${gradientId})`}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progressRatio)}
                  transform="rotate(-90 130 130)"
                  filter={`url(#dialGlow-${gradientId})`}
                  className="transition-[stroke-dashoffset] duration-150"
                />
              </svg>

              {/* Digital HUD in Center */}
              <div className="agy-speed-dial__center">
                <span className="agy-speed-dial__phase">
                  {running
                    ? label
                    : result
                      ? uiText(locale, "COMPLETE", "TAMAMLANDI")
                      : uiText(locale, "READY", "HAZIR")}
                </span>
                <span className="agy-speed-dial__number">
                  {liveValue != null && (!running || update?.phase !== "latency")
                    ? liveValue.toFixed(1)
                    : running && update?.phase === "latency"
                      ? "..."
                      : "—"}
                </span>
                <span className="agy-speed-dial__unit">
                  {running && update?.phase === "latency" ? "PING / RTT" : "Mbps"}
                </span>
                {peakSpeed > 0 && (
                  <span className="mt-1 font-mono text-[10px] text-neutral-400">
                    PEAK: {peakSpeed.toFixed(1)} Mbps
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
                className="call-to-action button button-primary"
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
                    ? uiText(locale, "Measurement verified via Cloudflare Edge", "Ölçüm Cloudflare Uç Ağı ile doğrulandı")
                    : uiText(locale, "Click Start to measure real HTTPS throughput", "Gerçek HTTPS aktarım hızını ölçmek için Başlat'a tıklayın"))}
            </p>
          </div>

          {/* Telemetry Panel */}
          <div className="agy-speed-telemetry-panel">
            {/* 6 High-Tech Cards */}
            <div className="agy-speed-metrics-grid">
              <div className="agy-speed-metric-card">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="agy-speed-metric-card__label">{dict.download}</p>
                    <span className="agy-speed-metric-card__badge text-[#00f0ff]">↓ HTTPS</span>
                  </div>
                  <p className="agy-speed-metric-card__value">{fmt(result?.download, "Mbps")}</p>
                </div>
              </div>

              <div className="agy-speed-metric-card">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="agy-speed-metric-card__label">{dict.upload}</p>
                    <span className="agy-speed-metric-card__badge text-[#7189ff]">↑ HTTPS</span>
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
                    <span className="agy-speed-metric-card__badge">Δ ms</span>
                  </div>
                  <p className="agy-speed-metric-card__value">{fmt(result?.jitter)}</p>
                </div>
              </div>

              <div className="agy-speed-metric-card">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="agy-speed-metric-card__label">{uiText(locale, "Bufferbloat", "Yük Altı Gecikme")}</p>
                    <span
                      className="agy-speed-metric-card__badge font-bold"
                      style={{ color: bloat.color }}
                    >
                      GRADE {bloat.grade}
                    </span>
                  </div>
                  <p className="agy-speed-metric-card__value">{fmt(result?.loadedDownload)}</p>
                </div>
              </div>

              <div className="agy-speed-metric-card">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="agy-speed-metric-card__label">{uiText(locale, "Transferred", "Aktarılan")}</p>
                    <span className="agy-speed-metric-card__badge">DATA</span>
                  </div>
                  <p className="agy-speed-metric-card__value">
                    {result ? `${(result.bytes / 1e6).toFixed(1)} MB` : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Live Throughput Area Graph */}
            <div className="agy-speed-chart-card">
              <div className="agy-speed-chart-card__head">
                <span className="font-mono text-xs uppercase text-neutral-300">
                  {uiText(locale, "Real-Time Throughput Curve", "Gerçek Zamanlı Aktarım Eğrisi")}
                </span>
                <span className="font-mono text-xs text-neutral-400">
                  {trace.length > 0
                    ? `${(trace[trace.length - 1]?.mbps ?? 0).toFixed(1)} Mbps (${trace[trace.length - 1]?.direction})`
                    : "0.0 Mbps"}
                </span>
              </div>

              <div className="agy-speed-chart-card__graph">
                {trace.length > 1 ? (
                  <svg
                    viewBox={`0 0 ${trace.length * 4} 60`}
                    className="agy-speed-chart-card__svg"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id={`chartFill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#7189ff" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Area polygon */}
                    <polygon
                      fill={`url(#chartFill-${gradientId})`}
                      points={`0,60 ${trace
                        .map(
                          (p, i) =>
                            `${i * 4},${Math.max(4, 60 - (p.mbps / (peakSpeed || 100)) * 52)}`
                        )
                        .join(" ")} ${(trace.length - 1) * 4},60`}
                    />
                    {/* Stroke line */}
                    <polyline
                      fill="none"
                      stroke="#00f0ff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={trace
                        .map(
                          (p, i) =>
                            `${i * 4},${Math.max(4, 60 - (p.mbps / (peakSpeed || 100)) * 52)}`
                        )
                        .join(" ")}
                    />
                  </svg>
                ) : (
                  <div className="flex h-14 items-center justify-center font-mono text-xs text-neutral-400">
                    {uiText(locale, "Awaiting test execution...", "Test başlatılması bekleniyor...")}
                  </div>
                )}
              </div>
            </div>

            {/* Practical Connection Capability Ratings (shown when complete) */}
            {result && (
              <div className="rounded-2xl border border-white/10 bg-[#101217] p-5">
                <span className="font-mono text-[11px] tracking-wider uppercase text-neutral-400">
                  {uiText(locale, "CONNECTION READINESS ASSESSMENT", "BAĞLANTI UYGUNLUK DEĞERLENDİRMESİ")}
                </span>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🎮</span>
                      <span className="text-xs font-medium text-white">
                        {uiText(locale, "Online Gaming", "Online Oyun")}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-emerald-400">
                      {result.idle < 35 && (result.jitter ?? 0) < 10
                        ? uiText(locale, "Exceptional RTT", "Mükemmel Ping")
                        : result.idle < 80
                          ? uiText(locale, "Good Performance", "İyi Seviye")
                          : uiText(locale, "Moderate Latency", "Orta Gecikme")}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📺</span>
                      <span className="text-xs font-medium text-white">
                        {uiText(locale, "4K / 8K Streaming", "4K / 8K Video")}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-emerald-400">
                      {result.download >= 50
                        ? uiText(locale, "8K Ultra-HD Ready", "8K Ultra-HD Hazır")
                        : result.download >= 25
                          ? uiText(locale, "4K UHD Ready", "4K UHD Hazır")
                          : uiText(locale, "1080p HD Ready", "1080p HD Hazır")}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📞</span>
                      <span className="text-xs font-medium text-white">
                        {uiText(locale, "VoIP & Video Calls", "Video Konferans")}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-emerald-400">
                      {bloat.grade === "A+" || bloat.grade === "A"
                        ? uiText(locale, "Bufferbloat Free", "Sıfır Donma")
                        : uiText(locale, "Stable Audio/Video", "Kararlı Akış")}
                    </p>
                  </div>
                </div>

                {/* Secondary export / share controls */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={share}
                      className="button button-compact button-secondary"
                    >
                      <span>{uiText(locale, "Copy Summary", "Sonucu Kopyala")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={exportResult}
                      className="button button-compact button-secondary"
                    >
                      <span>{uiText(locale, "Export JSON", "JSON Olarak İndir")} ↗</span>
                    </button>
                  </div>
                  <span className="font-mono text-xs text-neutral-400">
                    ID: {result.timestamp.slice(0, 19).replace("T", " ")}
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
