"use client";

import { useState } from "react";
import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { xhrUpload } from "@/lib/speed-upload";

type Phase = "idle" | "ping" | "download" | "upload" | "done";

const DOWN_URL = "https://speed.cloudflare.com/__down?bytes=";

async function measurePing(samples = 8): Promise<{ ping: number; jitter: number }> {
  const times: number[] = [];
  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    try {
      const response = await fetch(`${DOWN_URL}0&r=${start}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (!response.ok) continue;
      times.push(performance.now() - start);
    } catch {
      // ignore failed sample
    }
  }
  if (times.length === 0) throw new Error("No ping samples");
  const sorted = [...times].sort((a, b) => a - b);
  const ping = sorted[Math.floor(sorted.length / 2)];
  let jitterSum = 0;
  for (let i = 1; i < times.length; i++)
    jitterSum += Math.abs(times[i] - times[i - 1]);
  const jitter = times.length > 1 ? jitterSum / (times.length - 1) : 0;
  return { ping: Math.round(ping), jitter: Math.round(jitter) };
}

// Downloads in parallel streamed chunks, reporting cumulative throughput as
// bytes arrive. Aborts every in-flight request the instant the deadline is
// hit so sockets free up immediately instead of trailing into the next phase.
async function measureDownload(
  onProgress: (mbps: number) => void,
  durationMs = 9000,
  parallel = 5,
  chunkBytes = 20_000_000
): Promise<number> {
  const start = performance.now();
  const deadline = start + durationMs;
  let totalBytes = 0;
  const controllers = new Set<AbortController>();

  const timer = setTimeout(() => {
    for (const c of controllers) c.abort();
  }, durationMs);

  async function worker() {
    while (performance.now() < deadline) {
      const controller = new AbortController();
      controllers.add(controller);
      try {
        const res = await fetch(`${DOWN_URL}${chunkBytes}&r=${Math.random()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok || !res.body) break;
        const reader = res.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          totalBytes += value?.byteLength ?? 0;
          const elapsed = (performance.now() - start) / 1000;
          if (elapsed > 0) onProgress((totalBytes * 8) / elapsed / 1_000_000);
        }
      } catch {
        break;
      } finally {
        controllers.delete(controller);
      }
    }
  }

  await Promise.all(Array.from({ length: parallel }, worker));
  clearTimeout(timer);
  if (totalBytes === 0) throw new Error("No download data");
  const seconds = (performance.now() - start) / 1000;
  return (totalBytes * 8) / seconds / 1_000_000;
}

// Uses XHR instead of fetch() because only XHR exposes upload progress
// events — with fetch(), onProgress would only fire once per whole chunk,
// which is what made the upload phase feel stuck/delayed before this fix.

async function measureUpload(
  onProgress: (mbps: number) => void,
  durationMs = 8000,
  parallel = 4,
  chunkBytes = 2_000_000
): Promise<number> {
  const payload = new Uint8Array(chunkBytes);
  crypto.getRandomValues(payload.subarray(0, Math.min(65536, chunkBytes)));
  const start = performance.now();
  const deadline = start + durationMs;
  let totalBytes = 0;

  async function worker() {
    while (performance.now() < deadline) {
      const { promise, abort } = xhrUpload(payload, (delta) => {
        totalBytes += delta;
        const elapsed = (performance.now() - start) / 1000;
        if (elapsed > 0) onProgress((totalBytes * 8) / elapsed / 1_000_000);
      });
      const timer = setTimeout(abort, Math.max(0, deadline - performance.now()));
      const succeeded = await promise;
      clearTimeout(timer);
      if (!succeeded) break;
    }
  }

  await Promise.all(Array.from({ length: parallel }, worker));
  if (totalBytes === 0) throw new Error("No upload data");
  const seconds = (performance.now() - start) / 1000;
  return (totalBytes * 8) / seconds / 1_000_000;
}

const GAUGE_MAX: Record<string, number> = {
  Mbps: 500,
  ms: 150,
};

function Gauge({
  label,
  value,
  unit,
  active,
  accent,
}: {
  label: string;
  value: number | null;
  unit: string;
  active: boolean;
  accent: string;
}) {
  const max = GAUGE_MAX[unit] ?? 100;
  const pct = value != null ? Math.min(1, value / max) : 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);
  const display =
    value != null
      ? value.toFixed(value < 10 ? 2 : value < 100 ? 1 : 0)
      : active
        ? "…"
        : "—";

  return (
    <div
      className={`relative min-w-0 overflow-hidden rounded-2xl border p-3 sm:p-6 text-center transition-all duration-300 ${
        active
          ? "border-white/30 bg-white/[0.06] shadow-[0_0_30px_-8px_var(--gauge-accent)]"
          : "border-white/10 bg-white/[0.02]"
      }`}
      style={{ "--gauge-accent": accent } as React.CSSProperties}
    >
      <div className="text-xs uppercase tracking-wider text-neutral-400">
        {label}
      </div>
      <div className="relative mx-auto mt-3 h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="6"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={accent}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-300 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${accent})` }}
          />
        </svg>
        <div
          className="absolute inset-0 grid place-items-center font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums text-white"
        >
          {display}
        </div>
      </div>
      <div className="mt-1 text-xs text-neutral-500">{unit}</div>
    </div>
  );
}

export function SpeedTest({
  dict,
  locale,
}: {
  dict: Dictionary["speedTest"];
  locale: Locale;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [ping, setPing] = useState<number | null>(null);
  const [jitter, setJitter] = useState<number | null>(null);
  const [download, setDownload] = useState<number | null>(null);
  const [upload, setUpload] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const running = phase !== "idle" && phase !== "done";

  async function run() {
    setError(false);
    setPing(null);
    setJitter(null);
    setDownload(null);
    setUpload(null);

    try {
    setPhase("ping");
    const p = await measurePing();
    setPing(p.ping);
    setJitter(p.jitter);

    setPhase("download");
    const d = await measureDownload((mbps) => setDownload(mbps));
    setDownload(d);

    setPhase("upload");
    const u = await measureUpload((mbps) => setUpload(mbps));
    setUpload(u);

    setPhase("done");
    } catch {
      setError(true);
      setPhase("idle");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Gauge
          label={dict.download}
          value={download}
          unit="Mbps"
          active={phase === "download"}
          accent="#FFFFFF"
        />
        <Gauge
          label={dict.upload}
          value={upload}
          unit="Mbps"
          active={phase === "upload"}
          accent="#D4D4D4"
        />
        <Gauge
          label={dict.ping}
          value={ping}
          unit="ms"
          active={phase === "ping"}
          accent="#A3A3A3"
        />
        <Gauge
          label="Jitter"
          value={jitter}
          unit="ms"
          active={phase === "ping"}
          accent="#737373"
        />
      </div>

      <div className="mt-8 text-center">
        <p role="status" className="mb-3 text-sm text-neutral-300">
          {running ? dict.running : phase === "done" ? `${dict.download}: ${download?.toFixed(1)} Mbps · ${dict.upload}: ${upload?.toFixed(1)} Mbps · ${dict.ping}: ${ping} ms` : ""}
        </p>
        {error && <p role="alert" className="mb-4 text-sm text-neutral-200">{{
          tr: "Test tamamlanamadı. İnternet bağlantınızı kontrol edip yeniden deneyin.",
          en: "The test could not finish. Check your connection and try again.",
          de: "Der Test konnte nicht abgeschlossen werden. Prüfen Sie die Verbindung und versuchen Sie es erneut.",
          fr: "Le test n’a pas abouti. Vérifiez votre connexion et réessayez.",
          es: "No se pudo completar la prueba. Comprueba tu conexión e inténtalo de nuevo.",
        }[locale]}</p>}
        <button
          onClick={run}
          disabled={running}
          aria-busy={running}
          className="btn-primary rounded-xl px-10 py-3 font-semibold disabled:opacity-60"
        >
          {running ? dict.running : phase === "done" ? dict.restart : dict.start}
        </button>
        <p className="mt-4 text-xs text-neutral-500">{dict.note}</p>
      </div>

      {phase === "done" && (
        <div className="mt-8 rounded-xl border border-white/20 bg-white/[0.06] p-5 text-center">
          <h3 className="font-semibold text-white">{dict.crossSell.title}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-300">
            {dict.crossSell.body}
          </p>
          <Link
            href={`/${locale}/shop`}
            className="mt-3 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-200"
          >
            {dict.crossSell.cta} →
          </Link>
        </div>
      )}
    </div>
  );
}
