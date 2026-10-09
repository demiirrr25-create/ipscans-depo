import { xhrUpload } from './speed-upload.ts';

export type Direction = 'download' | 'upload';
export type Trace = { seconds: number; mbps: number; direction: Direction };
export type SpeedResult = {
  download: number; upload: number; idle: number; jitter: number | null;
  loadedDownload: number | null; loadedUpload: number | null;
  seconds: number; bytes: number; requestsFailed: number; latencySamples: number;
  stability: number | null; capped: boolean; timestamp: string; trace: Trace[];
};
export type SpeedUpdate = { phase: 'latency' | Direction; mbps: number; seconds: number; trace?: Trace };
const DOWN = 'https://speed.cloudflare.com/__down';
const CAP = 256_000_000;
const WARMUP = 1000;
const DURATION = 8000;

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
export function jitter(values: number[]): number | null {
  return values.length < 2 ? null : values.slice(1).reduce((sum, value, i) => sum + Math.abs(value - values[i]), 0) / (values.length - 1);
}
export function variation(values: number[]): number | null {
  if (values.length < 4) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean <= 0) return null;
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length) / mean * 100;
}
async function latency(signal: AbortSignal): Promise<number> {
  const start = performance.now();
  const response = await fetch(`${DOWN}?bytes=0&r=${crypto.randomUUID()}`, {
    cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]),
  });
  if (!response.ok) throw new Error('Latency endpoint unavailable');
  await response.arrayBuffer();
  return performance.now() - start;
}
async function delay(ms: number, signal: AbortSignal) {
  if (signal.aborted) return;
  await new Promise<void>(resolve => {
    const done = () => { clearTimeout(timer); signal.removeEventListener('abort', done); resolve(); };
    const timer = setTimeout(done, ms);
    signal.addEventListener('abort', done, { once: true });
  });
}

export async function runSpeedTest(signal: AbortSignal, update: (value: SpeedUpdate) => void): Promise<SpeedResult> {
  const start = performance.now(), trace: Trace[] = [], idle: number[] = [];
  let failures = 0, transferred = 0, capped = false;
  update({ phase: 'latency', mbps: 0, seconds: 0 });
  // Discard connection/TLS warmup. No fabricated substitute on failure.
  try { await latency(signal); } catch { signal.throwIfAborted(); }
  for (let i = 0; i < 8; i++) {
    signal.throwIfAborted();
    try { idle.push(await latency(signal)); } catch { failures++; signal.throwIfAborted(); }
  }
  if (idle.length < 4) throw new Error('Insufficient latency samples');

  async function transfer(direction: Direction) {
    const controller = new AbortController();
    const phaseSignal = AbortSignal.any([signal, controller.signal]);
    const phaseStart = performance.now();
    const measuredStart = phaseStart + WARMUP;
    let bytes = 0, confirmed = 0, phaseBytes = 0, reserved = 0, lastBytes = 0, lastTime = measuredStart;
    const loaded: number[] = [];
    let limitReached = false;
    update({ phase: direction, mbps: 0, seconds: (phaseStart-start)/1000 });
    const count = (delta: number) => {
      phaseBytes += delta;
      if (performance.now() >= measuredStart) bytes += delta;
    };
    const timer = setTimeout(() => controller.abort(), WARMUP + DURATION);
    const ticker = setInterval(() => {
      const now = performance.now();
      if (now <= measuredStart) return;
      const point = { seconds: (now - start) / 1000,
        mbps: (bytes - lastBytes) * 8 / ((now - lastTime) * 1000), direction };
      lastBytes = bytes; lastTime = now;
      trace.push(point);
      update({ phase: direction, mbps: point.mbps, seconds: point.seconds, trace: point });
    }, 250);
    const latencyTask = (async () => {
      while (!phaseSignal.aborted) {
        try { const value = await latency(phaseSignal); if (!phaseSignal.aborted && performance.now() >= measuredStart) loaded.push(value); }
        catch { if (!phaseSignal.aborted) failures++; }
        await delay(400, phaseSignal);
      }
    })();
    const payload = new Uint8Array(1_000_000);
    for (let offset = 0; offset < payload.length; offset += 65536)
      crypto.getRandomValues(payload.subarray(offset, Math.min(payload.length, offset + 65536)));
    async function worker() {
      const size = direction === 'download' ? 5_000_000 : payload.length;
      while (!phaseSignal.aborted) {
        if (reserved + size > CAP) { limitReached = true; break; }
        reserved += size;
        try {
          if (direction === 'download') {
            const response = await fetch(`${DOWN}?bytes=${size}&r=${crypto.randomUUID()}`, { cache: 'no-store', signal: phaseSignal });
            if (!response.ok || !response.body) throw new Error('Download endpoint unavailable');
            const reader = response.body.getReader();
            try {
              while (!phaseSignal.aborted) { const { done, value } = await reader.read(); if (done) break; count(value.byteLength); }
            } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
          } else {
            let requestMeasured = 0;
            const upload = xhrUpload(payload, delta => { count(delta); if (performance.now() >= measuredStart) requestMeasured += delta; });
            phaseSignal.addEventListener('abort', upload.abort, { once: true });
            const success = await upload.promise;
            phaseSignal.removeEventListener('abort', upload.abort);
            if (success) confirmed += requestMeasured;
            else if (!phaseSignal.aborted) throw new Error('Upload endpoint unavailable');
          }
        } catch { if (!phaseSignal.aborted) failures++; break; }
      }
    }
    let ended: number;
    try { await Promise.all(Array.from({ length: 4 }, worker)); ended = performance.now(); }
    finally { clearTimeout(timer); clearInterval(ticker); controller.abort(); await latencyTask; }
    signal.throwIfAborted();
    transferred += phaseBytes; capped ||= limitReached;
    const seconds = (ended! - measuredStart) / 1000;
    const observed = direction === 'upload' ? confirmed : bytes;
    if (seconds < .5 || observed <= 0) throw new Error('Insufficient measured transfer; try again');
    return { mbps: observed * 8 / seconds / 1_000_000, loaded: median(loaded), samples: loaded.length };
  }
  const down = await transfer('download'), up = await transfer('upload');
  return { download: down.mbps, upload: up.mbps, idle: median(idle)!, jitter: jitter(idle),
    loadedDownload: down.loaded, loadedUpload: up.loaded, seconds: (performance.now()-start)/1000,
    bytes: transferred, requestsFailed: failures, latencySamples: idle.length + down.samples + up.samples,
    stability: variation(trace.filter(p => p.direction === 'download').map(p => p.mbps)), capped,
    timestamp: new Date().toISOString(), trace };
}
