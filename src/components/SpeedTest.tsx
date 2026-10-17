"use client";

import { uiText } from "@/i18n/ui";
import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { SpeedResult, SpeedUpdate, Trace } from "@/lib/speed-engine";
import { AntigravityParticles } from "./AntigravityParticles";

export function SpeedTest({
  dict,
  locale,
}: {
  dict: Dictionary["speedTest"];
  locale: Locale;
}) {
  const [update, setUpdate] = useState<SpeedUpdate | null>(null);
  const [result, setResult] = useState<SpeedResult | null>(null);
  const [trace, setTrace] = useState<Trace[]>([]);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<SpeedResult[]>([]);
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
        if (value.trace)
          setTrace((points) => [...points.slice(-79), value.trace!]);
      });
      setResult(measured);
      setHistory((previous) => [measured, ...previous].slice(0, 5));
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

  const label =
    update?.phase === "upload"
      ? dict.upload
      : update?.phase === "latency"
        ? dict.ping
        : dict.download;
  const value = running ? update?.mbps : result?.download;
  const max = Math.max(100, ...trace.map((p) => p.mbps));
  const fmt = (n: number | null | undefined, unit = "ms") =>
    n == null ? "—" : `${n.toFixed(1)} ${unit}`;
  const summary = result
    ? `IPScans / ${new Date(result.timestamp).toLocaleString(locale)}\n${dict.download} ${fmt(result.download, "Mbps")} · ${dict.upload} ${fmt(result.upload, "Mbps")}\n${dict.ping} ${fmt(result.idle)} · ${uiText(locale, "Jitter", "Gecikme değişimi")} ${fmt(result.jitter)}\n${uiText(locale, "Loaded latency ↓", "Yük altında ↓")} ${fmt(result.loadedDownload)} ↑ ${fmt(result.loadedUpload)}\nCloudflare edge · ${result.seconds.toFixed(1)} s · ${(result.bytes / 1e6).toFixed(1)} MB\nhttps://ipscans.com/${locale}`
    : "";

  async function share() {
    try {
      await navigator.clipboard.writeText(summary);
      setNotice(
        uiText(
          locale,
          "Result copied to clipboard.",
          "Sonuç panoya kopyalandı."
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
              method:
                "HTTPS transfers to Cloudflare edge; HTTP latency; no packet-loss measurement",
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
    link.download = "ipscans-speed-result.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const progressRatio = Math.min(1, Math.log10(1 + (value ?? 0)) / 4);
  const capsuleCount = 28;

  return (
    <section className="agy-speed-studio" aria-label={dict.title}>
      <div className="agy-speed-hero-card">
        <AntigravityParticles variant="subpage" className="agy-speed-hero-card__bg" />

        <div className="agy-speed-topbar">
          <div className="agy-speed-stage-pills" role="list" aria-label={uiText(locale, "Test progress", "Test ilerlemesi")}>
            {(["latency", "download", "upload"] as const).map((phase, index) => {
              const isCurrent = running && update?.phase === phase;
              const isDone = Boolean(result);
              return (
                <div
                  key={phase}
                  role="listitem"
                  aria-current={isCurrent ? "step" : undefined}
                  className={`newsletter-topic-pill ${isCurrent || isDone ? "selected" : ""}`}
                >
                  <span className="font-mono text-xs opacity-70">0{index + 1}</span>
                  <span>
                    {phase === "latency"
                      ? uiText(locale, "HTTP Latency", "HTTP Gecikmesi")
                      : phase === "download"
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
            <span className="agy-page-hero__dot" aria-hidden="true" />
            <span>
              {uiText(
                locale,
                "Cloudflare Edge · HTTPS Telemetry",
                "Cloudflare Uç Ağı · HTTPS Telemetri"
              )}
            </span>
          </span>
        </div>

        <div className="agy-speed-main-grid">
          <div className="agy-speed-gauge-panel">
            <div className="agy-speed-dial">
              <svg
                viewBox="0 0 240 240"
                className="agy-speed-dial__svg"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="agySpeedArc" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="55%" stopColor="#7189ff" />
                    <stop offset="85%" stopColor="#f84242" />
                    <stop offset="100%" stopColor="#ffcf03" />
                  </linearGradient>
                </defs>

                {/* Antigravity outer capsule ring */}
                {Array.from({ length: capsuleCount }).map((_, idx) => {
                  const ang = (idx / capsuleCount) * Math.PI * 2 - Math.PI * 0.5;
                  const active = idx / capsuleCount <= progressRatio;
                  const r1 = 104;
                  const r2 = active ? 112 : 108;
                  const x1 = 120 + Math.cos(ang) * r1;
                  const y1 = 120 + Math.sin(ang) * r1;
                  const x2 = 120 + Math.cos(ang) * r2;
                  const y2 = 120 + Math.sin(ang) * r2;
                  return (
                    <line
                      key={idx}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={active ? "#7189ff" : "rgba(255,255,255,0.14)"}
                      strokeWidth={active ? "2.5" : "1.8"}
                      strokeLinecap="round"
                    />
                  );
                })}

                <circle
                  cx="120"
                  cy="120"
                  r="88"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="5"
                />
                <circle
                  cx="120"
                  cy="120"
                  r="88"
                  fill="none"
                  stroke="url(#agySpeedArc)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray="552.92"
                  strokeDashoffset={552.92 * (1 - progressRatio)}
                  transform="rotate(-90 120 120)"
                  className="transition-[stroke-dashoffset] duration-200"
                />
              </svg>

              <div className="agy-speed-dial__center">
                <span className="agy-speed-dial__phase">
                  {running
                    ? label
                    : result
                      ? dict.download
                      : uiText(locale, "READY", "HAZIR")}
                </span>
                <span className="agy-speed-dial__number">
                  {value != null && (!running || update?.phase !== "latency")
                    ? value.toFixed(1)
                    : "—"}
                </span>
                <span className="agy-speed-dial__unit">
                  {running && update?.phase === "latency" ? "HTTP / ms" : "Mbps"}
                </span>
              </div>
            </div>

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
                    ? uiText(locale, "Measurement complete", "Ölçüm tamamlandı")
                    : uiText(locale, "Click Start to measure real HTTPS throughput", "Gerçek HTTPS aktarım hızını ölçmek için Başlat'a tıklayın"))}
            </p>
          </div>

          <div className="agy-speed-telemetry-panel">
            <div className="agy-speed-metrics-grid">
              {[
                { name: dict.download, val: fmt(result?.download, "Mbps"), badge: "↓ HTTPS" },
                { name: dict.upload, val: fmt(result?.upload, "Mbps"), badge: "↑ HTTPS" },
                { name: uiText(locale, "Idle Latency", "Boşta Gecikme"), val: fmt(result?.idle), badge: "RTT" },
                { name: uiText(locale, "Jitter", "Gecikme Değişimi"), val: fmt(result?.jitter), badge: "Δ ms" },
                { name: uiText(locale, "Loaded Latency ↓", "Yük Altında ↓"), val: fmt(result?.loadedDownload), badge: "Buffer" },
                { name: uiText(locale, "Loaded Latency ↑", "Yük Altında ↑"), val: fmt(result?.loadedUpload), badge: "Buffer" },
              ].map((item) => (
                <div key={item.name} className="agy-speed-metric-card">
                  <div className="flex items-center justify-between gap-2">
                    <p className="agy-speed-metric-card__label">{item.name}</p>
                    <span className="agy-speed-metric-card__badge">{item.badge}</span>
                  </div>
                  <p className="agy-speed-metric-card__value">{item.val}</p>
                </div>
              ))}
            </div>

            <div className="agy-speed-chart-card">
              <div className="agy-speed-chart-card__head">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-white" />
                  <span>↓ {dict.download}</span>
                  <span className="ms-3 inline-block h-2 w-2 rounded-full bg-[#7189ff]" />
                  <span>↑ {dict.upload}</span>
                </span>
                <span className="font-mono text-xs text-[#9aa0a6]">
                  {uiText(locale, "Peak", "Tepe")}: {max.toFixed(0)} Mbps
                </span>
              </div>

              <svg
                viewBox="0 0 440 70"
                role="img"
                aria-label={uiText(
                  locale,
                  "Measured transfer speed over time",
                  "Ölçülen aktarım hızları zaman grafiği"
                )}
                className="agy-speed-chart-card__svg"
              >
                {[20, 45].map((y) => (
                  <path
                    key={y}
                    d={`M0 ${y} H440`}
                    stroke="rgba(255,255,255,0.06)"
                  />
                ))}
                {(["download", "upload"] as const).map((direction) => (
                  <polyline
                    key={direction}
                    points={trace
                      .map((p, i) =>
                        p.direction === direction
                          ? `${(i / Math.max(1, trace.length - 1)) * 440},${64 - (p.mbps / max) * 58}`
                          : ""
                      )
                      .filter(Boolean)
                      .join(" ")}
                    fill="none"
                    stroke={direction === "download" ? "#ffffff" : "#7189ff"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={direction === "upload" ? "4 4" : undefined}
                  />
                ))}
              </svg>
              <p className="agy-speed-chart-card__caption">
                {uiText(
                  locale,
                  "Real-time browser stream telemetry · 4 parallel HTTPS channels · 256 MB cap per direction.",
                  "Gerçek zamanlı tarayıcı akış telemetrisi · 4 paralel HTTPS kanalı · yön başına 256 MB sınır."
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div className="newsletter-card newsletter-card--default mt-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="heading-5 text-white">
                {uiText(locale, "Connection summary", "Bağlantı özeti")}
              </h2>
              <p className="body mt-2 text-[#b7bfd9]">
                {Math.max(result.loadedDownload ?? 0, result.loadedUpload ?? 0) -
                  result.idle >
                100
                  ? uiText(
                      locale,
                      "Latency rose substantially during transfer. Heavy transfers may affect calls.",
                      "Aktarım sırasında gecikme belirgin arttı. Yoğun aktarım, görüntülü görüşmeleri etkileyebilir."
                    )
                  : uiText(
                      locale,
                      "Read speed and latency together; one test does not describe every network condition.",
                      "Hız ve gecikme değerlerini birlikte değerlendirin; tek test bağlantının her zaman aynı davranacağını göstermez."
                    )}
              </p>
              <p className="caption mt-3 font-mono text-[#9aa0a6]">
                {result.seconds.toFixed(1)} s · {(result.bytes / 1e6).toFixed(1)} MB
                · {result.latencySamples}{" "}
                {uiText(locale, "latency samples", "gecikme örneği")} ·{" "}
                {result.requestsFailed}{" "}
                {uiText(locale, "failed HTTP requests", "başarısız HTTP isteği")} ·{" "}
                {uiText(locale, "Stability", "Kararlılık")}:{" "}
                {fmt(result.stability, "%")}
              </p>
              {result.capped && (
                <p className="caption mt-2 text-[#ffcf03]">
                  {uiText(
                    locale,
                    "Data limit reached; the measurement window was shortened.",
                    "Veri sınırına ulaşıldı; ölçüm süresi kısaldı."
                  )}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={share} className="button button-primary">
                <span>{uiText(locale, "Copy result", "Sonucu kopyala")}</span>
              </button>
              <button type="button" onClick={exportResult} className="button button-secondary">
                <span>JSON ↓</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <section className="product-card mt-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="heading-6 text-white">
              {uiText(locale, "This session", "Bu oturum")}
            </h2>
            <button
              type="button"
              onClick={() => setHistory([])}
              className="button button-compact button-secondary"
            >
              <span>{uiText(locale, "Clear history", "Geçmişi temizle")}</span>
            </button>
          </div>
          <p className="caption mt-1 mb-4 text-[#9aa0a6]">
            {uiText(
              locale,
              "Stored only in memory. Closing or reloading this page clears the history.",
              "Yalnızca bellekte tutulur. Sayfayı kapatmak veya yenilemek geçmişi siler."
            )}
          </p>
          <ol className="speed-history-list">
            {history.map((entry) => (
              <li key={entry.timestamp} className="speed-history-item">
                <time dateTime={entry.timestamp}>
                  {new Date(entry.timestamp).toLocaleTimeString(locale)}
                </time>
                <span>↓ {fmt(entry.download, "Mbps")}</span>
                <span>↑ {fmt(entry.upload, "Mbps")}</span>
                <span>HTTP {fmt(entry.idle)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <details className="product-card mt-8" open>
        <summary className="cursor-pointer text-base font-medium text-white">
          {uiText(locale, "How is this measured?", "Nasıl ölçülüyor?")}
        </summary>
        <p className="body mt-4 text-[#9aa0a6]">
          {uiText(
            locale,
            "Real HTTPS traffic; four parallel connections, 1 second warmup and up to 8 seconds measurement per direction. 256 MB data cap per direction. Latency is HTTP round-trip time; jitter is the mean successive sample difference. Cloudflare anycast routing selects the edge; there is no manual city selection.",
            "Gerçek HTTPS trafiği; dört paralel bağlantı, her aktarımda 1 saniye ısınma ve en çok 8 saniye ölçüm. Her yönde 256 MB veri sınırı. Gecikme HTTP gidiş-dönüş süresidir; jitter ardışık örnek farklarının ortalamasıdır. Cloudflare anycast yönlendirmesi uç noktayı seçer; belirli şehir seçimi yoktur."
          )}
        </p>
        <p className="body mt-3 text-[#9aa0a6]">
          {uiText(
            locale,
            "Packet loss: unavailable. HTTP failures are not packet loss; no UDP/TURN measurement server is connected. VPN, Wi-Fi, browser and server conditions affect results. Starting sends test traffic to Cloudflare and uses your data allowance.",
            "Paket kaybı: kullanılamıyor. HTTP hataları paket kaybı değildir; bu testte UDP/TURN ölçüm sunucusu bağlı değil. VPN, Wi-Fi, tarayıcı ve sunucu koşulları sonucu etkiler. Başlatmak Cloudflare’a test trafiği gönderir ve veri kotanızı kullanır."
          )}
        </p>
      </details>
    </section>
  );
}
