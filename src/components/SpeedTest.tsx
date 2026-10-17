"use client";
import { uiText } from "@/i18n/ui";
import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { SpeedResult, SpeedUpdate, Trace } from "@/lib/speed-engine";

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

  return (
    <section className="speed-console" aria-label={dict.title}>
      <div className="speed-console__header">
        <span>
          IPSCANS / {uiText(locale, "CONNECTION LAB", "BAĞLANTI LABORATUVARI")}
        </span>
        <span>
          {uiText(
            locale,
            "Cloudflare edge · HTTPS measurement",
            "Cloudflare uç ağı · HTTPS ölçümü"
          )}
        </span>
      </div>

      <ol
        className="speed-stages"
        aria-label={uiText(locale, "Test progress", "Test ilerlemesi")}
      >
        {(["latency", "download", "upload"] as const).map((phase, index) => (
          <li
            key={phase}
            aria-current={
              running && update?.phase === phase ? "step" : undefined
            }
          >
            <span>0{index + 1}</span>
            {phase === "latency"
              ? uiText(locale, "HTTP latency", "HTTP gecikmesi")
              : phase === "download"
                ? dict.download
                : dict.upload}
            <span aria-hidden="true">
              {result ? "✓" : running && update?.phase === phase ? "●" : "—"}
            </span>
          </li>
        ))}
      </ol>

      <div className="speed-console__grid">
        <div className="speed-console__gauge-col">
          <div className="speed-console__gauge">
            <svg
              viewBox="0 0 320 320"
              className="speed-console__gauge-svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="speedArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="65%" stopColor="#7189ff" />
                  <stop offset="100%" stopColor="#3074f9" />
                </linearGradient>
              </defs>
              <circle
                cx="160"
                cy="160"
                r="142"
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
                strokeDasharray="2 6"
              />
              <circle
                cx="160"
                cy="160"
                r="127"
                fill="none"
                stroke="#1c1e24"
                strokeWidth="9"
              />
              <circle
                cx="160"
                cy="160"
                r="127"
                fill="none"
                stroke="url(#speedArcGrad)"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray="798"
                strokeDashoffset={
                  798 *
                  (1 - Math.min(1, Math.log10(1 + (value ?? 0)) / 4))
                }
                className="transition-[stroke-dashoffset] duration-300"
              />
            </svg>
            <div className="speed-console__gauge-readout">
              <span className="speed-console__gauge-label">
                {running
                  ? label
                  : result
                    ? dict.download
                    : uiText(locale, "READY", "HAZIR")}
              </span>
              <span className="speed-console__gauge-value">
                {value != null && (!running || update?.phase !== "latency")
                  ? value.toFixed(1)
                  : "—"}
              </span>
              <span className="speed-console__gauge-unit">
                {running && update?.phase === "latency" ? "HTTP / ms" : "Mbps"}
              </span>
            </div>
          </div>

          <div className="speed-console__actions">
            <button
              onClick={run}
              disabled={running}
              className="button button-primary"
            >
              <span>{result ? dict.restart : dict.start} ↗</span>
            </button>
            {running && (
              <button
                onClick={() => controller.current?.abort()}
                className="button button-secondary"
              >
                <span>{uiText(locale, "Stop", "Durdur")}</span>
              </button>
            )}
          </div>

          <p role="status" className="speed-console__status">
            {notice ||
              (running
                ? `${label} · ${(update?.seconds ?? 0).toFixed(0)} s`
                : result
                  ? uiText(locale, "Measurement complete", "Ölçüm tamamlandı")
                  : "")}
          </p>
        </div>

        <div className="speed-console__metrics-col">
          <p className="agy-eyebrow">
            {uiText(
              locale,
              "01 / TRANSFER MEASUREMENTS",
              "01 / AKTARIM ÖLÇÜMLERİ"
            )}
          </p>
          <div className="speed-console__metrics-grid">
            {[
              [dict.download, fmt(result?.download, "Mbps")],
              [dict.upload, fmt(result?.upload, "Mbps")],
              [
                uiText(locale, "Idle latency", "Boşta gecikme"),
                fmt(result?.idle),
              ],
              [
                uiText(locale, "Jitter", "Gecikme değişimi"),
                fmt(result?.jitter),
              ],
              [
                uiText(locale, "Loaded latency ↓", "Yük altında ↓"),
                fmt(result?.loadedDownload),
              ],
              [
                uiText(locale, "Loaded latency ↑", "Yük altında ↑"),
                fmt(result?.loadedUpload),
              ],
            ].map(([name, val]) => (
              <div key={name} className="speed-metric-card">
                <p className="speed-metric-card__label">{name}</p>
                <p className="speed-metric-card__value">{val}</p>
              </div>
            ))}
          </div>

          <div className="speed-console__chart-wrap">
            <div className="speed-console__chart-head">
              <span>
                ↓ {dict.download} / ↑ {dict.upload}
              </span>
              <span>{max.toFixed(0)} Mbps</span>
            </div>
            <svg
              viewBox="0 0 400 130"
              role="img"
              aria-label={uiText(
                locale,
                "Measured transfer speed over time",
                "Ölçülen aktarım hızları zaman grafiği"
              )}
              className="speed-console__chart-svg"
            >
              {[32, 64, 96].map((y) => (
                <path
                  key={y}
                  d={`M0 ${y} H400`}
                  stroke="rgba(255,255,255,0.08)"
                />
              ))}
              {(["download", "upload"] as const).map((direction) => (
                <polyline
                  key={direction}
                  points={trace
                    .map((p, i) =>
                      p.direction === direction
                        ? `${(i / Math.max(1, trace.length - 1)) * 400},${125 - (p.mbps / max) * 115}`
                        : ""
                    )
                    .filter(Boolean)
                    .join(" ")}
                  fill="none"
                  stroke={direction === "download" ? "#ffffff" : "#7189ff"}
                  strokeWidth="2.2"
                  strokeDasharray={direction === "upload" ? "4 4" : undefined}
                />
              ))}
            </svg>
            <p className="speed-console__chart-caption">
              {uiText(
                locale,
                "Chart: instantaneous browser transfer. Upload result: completed requests.",
                "Grafik: anlık tarayıcı aktarımı. Upload sonucu: tamamlanan istekler."
              )}
            </p>
          </div>
        </div>
      </div>

      {result && (
        <div className="speed-console__summary">
          <h2 className="heading-6">
            {uiText(locale, "Connection summary", "Bağlantı özeti")}
          </h2>
          <p className="body mt-3 text-neutral-300">
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
          <p className="mt-4 font-mono text-xs text-neutral-400">
            {result.seconds.toFixed(1)} s · {(result.bytes / 1e6).toFixed(1)} MB
            · {result.latencySamples}{" "}
            {uiText(locale, "latency samples", "gecikme örneği")} ·{" "}
            {result.requestsFailed}{" "}
            {uiText(locale, "failed HTTP requests", "başarısız HTTP isteği")} ·{" "}
            {uiText(locale, "Speed variation", "Hız değişkenliği")}:{" "}
            {fmt(result.stability, "%")}
          </p>
          {result.capped && (
            <p className="mt-3 text-sm">
              {uiText(
                locale,
                "Data limit reached; the measurement window was shortened.",
                "Veri sınırına ulaşıldı; ölçüm süresi kısaldı."
              )}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={share} className="button button-primary">
              <span>{uiText(locale, "Copy result", "Sonucu kopyala")}</span>
            </button>
            <button onClick={exportResult} className="button button-secondary">
              <span>JSON ↓</span>
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <section className="speed-console__history">
          <div className="flex items-center justify-between gap-4">
            <h2 className="heading-6">
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
          <p className="mt-2 mb-4 text-xs text-neutral-400">
            {uiText(
              locale,
              "Only in memory. Closing or reloading this page clears the history.",
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

      <details className="speed-console__details" open>
        <summary className="cursor-pointer font-medium text-white">
          {uiText(locale, "How is this measured?", "Nasıl ölçülüyor?")}
        </summary>
        <p className="mt-4 leading-relaxed text-neutral-300">
          {uiText(
            locale,
            "Real HTTPS traffic; four parallel connections, 1 second warmup and up to 8 seconds measurement per direction. 256 MB data cap per direction. Latency is HTTP round-trip time; jitter is the mean successive sample difference. Cloudflare anycast routing selects the edge; there is no manual city selection.",
            "Gerçek HTTPS trafiği; dört paralel bağlantı, her aktarımda 1 saniye ısınma ve en çok 8 saniye ölçüm. Her yönde 256 MB veri sınırı. Gecikme HTTP gidiş-dönüş süresidir; jitter ardışık örnek farklarının ortalamasıdır. Cloudflare anycast yönlendirmesi uç noktayı seçer; belirli şehir seçimi yoktur."
          )}
        </p>
        <p className="mt-3 leading-relaxed text-neutral-300">
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
