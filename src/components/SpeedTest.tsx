"use client";

import { useState } from "react";
import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

type Phase = "idle" | "ping" | "download" | "upload" | "done";

const DOWN_URL = "https://speed.cloudflare.com/__down?bytes=";
const UP_URL = "https://speed.cloudflare.com/__up";

async function measurePing(samples = 8): Promise<{ ping: number; jitter: number }> {
  const times: number[] = [];
  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    try {
      await fetch(`${DOWN_URL}0&r=${start}`, { cache: "no-store" });
      times.push(performance.now() - start);
    } catch {
      // ignore failed sample
    }
  }
  if (times.length === 0) return { ping: 0, jitter: 0 };
  times.sort((a, b) => a - b);
  const ping = times[Math.floor(times.length / 2)];
  let jitterSum = 0;
  for (let i = 1; i < times.length; i++)
    jitterSum += Math.abs(times[i] - times[i - 1]);
  const jitter = times.length > 1 ? jitterSum / (times.length - 1) : 0;
  return { ping: Math.round(ping), jitter: Math.round(jitter) };
}

async function measureDownload(
  onProgress: (mbps: number) => void,
  durationMs = 9000,
  parallel = 5,
  chunkBytes = 26_000_000
): Promise<number> {
  const start = performance.now();
  const deadline = start + durationMs;
  let totalBytes = 0;

  async function worker() {
    while (performance.now() < deadline) {
      try {
        const res = await fetch(`${DOWN_URL}${chunkBytes}&r=${Math.random()}`, {
          cache: "no-store",
        });
        const reader = res.body!.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          totalBytes += value?.byteLength ?? 0;
          const elapsed = (performance.now() - start) / 1000;
          if (elapsed > 0) onProgress((totalBytes * 8) / elapsed / 1_000_000);
          if (performance.now() > deadline) {
            await reader.cancel();
            break;
          }
        }
      } catch {
        break;
      }
    }
  }

  await Promise.all(Array.from({ length: parallel }, worker));
  const seconds = (performance.now() - start) / 1000;
  return (totalBytes * 8) / seconds / 1_000_000;
}

async function measureUpload(
  onProgress: (mbps: number) => void,
  durationMs = 8000,
  parallel = 3,
  chunkBytes = 8_000_000
): Promise<number> {
  const payload = new Uint8Array(chunkBytes);
  crypto.getRandomValues(payload.subarray(0, Math.min(65536, chunkBytes)));
  const start = performance.now();
  const deadline = start + durationMs;
  let totalBytes = 0;

  async function worker() {
    while (performance.now() < deadline) {
      try {
        await fetch(UP_URL, { method: "POST", body: payload, cache: "no-store" });
        totalBytes += chunkBytes;
        const elapsed = (performance.now() - start) / 1000;
        if (elapsed > 0) onProgress((totalBytes * 8) / elapsed / 1_000_000);
      } catch {
        break;
      }
    }
  }

  await Promise.all(Array.from({ length: parallel }, worker));
  const seconds = (performance.now() - start) / 1000;
  return (totalBytes * 8) / seconds / 1_000_000;
}

function Gauge({
  label,
  value,
  unit,
  active,
}: {
  label: string;
  value: number | null;
  unit: string;
  active: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 text-center transition ${
        active
          ? "border-white/40 bg-white/[0.06]"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums text-white">
        {value != null
          ? value.toFixed(value < 10 ? 2 : value < 100 ? 1 : 0)
          : active
            ? "…"
            : "—"}
      </div>
      <div className="text-xs text-neutral-500">{unit}</div>
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
  const running = phase !== "idle" && phase !== "done";

  async function run() {
    setPing(null);
    setJitter(null);
    setDownload(null);
    setUpload(null);

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
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="grid gap-4 sm:grid-cols-4">
        <Gauge label={dict.download} value={download} unit="Mbps" active={phase === "download"} />
        <Gauge label={dict.upload} value={upload} unit="Mbps" active={phase === "upload"} />
        <Gauge label={dict.ping} value={ping} unit="ms" active={phase === "ping"} />
        <Gauge label="Jitter" value={jitter} unit="ms" active={phase === "ping"} />
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={run}
          disabled={running}
          className="btn-primary rounded-xl px-10 py-3 font-semibold disabled:opacity-60"
        >
          {running ? dict.running : phase === "done" ? dict.restart : dict.start}
        </button>
        <p className="mt-4 text-xs text-neutral-500">{dict.note}</p>
      </div>

      {phase === "done" && (
        <div className="mt-8 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-5 text-center">
          <h3 className="font-semibold text-amber-200">{dict.crossSell.title}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-300">
            {dict.crossSell.body}
          </p>
          <Link
            href={`/${locale}/shop`}
            className="mt-3 inline-block rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-300"
          >
            {dict.crossSell.cta} →
          </Link>
        </div>
      )}
    </div>
  );
}
