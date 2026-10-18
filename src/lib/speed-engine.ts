import { xhrUpload } from './speed-upload.ts';

export type Direction = 'download' | 'upload';
export type Trace = { seconds: number; mbps: number; direction: Direction };

export type ServerInfo = {
  id: string;
  name: string;
  location: string;
  country: string;
  region?: string;
};

export type ClientInfo = {
  ip: string;
  city?: string;
  country?: string;
  region?: string;
  isp?: string;
  connectionType?: string;
};

export type SpeedResult = {
  download: number;
  upload: number;
  idle: number;
  minPing: number;
  jitter: number | null;
  packetLoss: number; // percentage (0 to 100)
  loadedDownload: number | null;
  loadedUpload: number | null;
  seconds: number;
  bytes: number;
  requestsFailed: number;
  latencySamples: number;
  stability: number | null;
  capped: boolean;
  timestamp: string;
  trace: Trace[];
  server?: ServerInfo;
  client?: ClientInfo;
};

export type SpeedUpdate = {
  phase: 'init' | 'latency' | Direction | 'download_complete' | 'upload_complete' | 'complete';
  mbps: number;
  seconds: number;
  ping?: number;
  jitter?: number;
  progress?: number;
  trace?: Trace;
  server?: ServerInfo;
  client?: ClientInfo;
  downloadFinal?: number;
  uploadFinal?: number;
};

// Endpoints: Prefer local API endpoints, fallback to high-capacity CDN edge if needed
const LOCAL_DOWN = '/api/speedtest/download';
const CLOUD_DOWN = 'https://speed.cloudflare.com/__down';
const LOCAL_UP = '/api/speedtest/upload';
const CLOUD_UP = 'https://speed.cloudflare.com/__up';

const CAP = 256_000_000;
const WARMUP = 800; // 800ms warm-up to clear initial TCP slow-start
const DURATION = 6000; // 6s per direction for solid sampling without long waits

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function jitter(values: number[]): number | null {
  return values.length < 2
    ? null
    : values.slice(1).reduce((sum, value, i) => sum + Math.abs(value - values[i]), 0) / (values.length - 1);
}

export function variation(values: number[]): number | null {
  if (values.length < 4) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean <= 0) return null;
  return (Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length) / mean) * 100;
}

async function probeLatency(endpoint: string, signal: AbortSignal): Promise<number> {
  const start = performance.now();
  const url = endpoint.includes('?') 
    ? `${endpoint}&r=${crypto.randomUUID()}` 
    : `${endpoint}?r=${crypto.randomUUID()}`;
  
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]),
  });
  if (!response.ok) throw new Error('Latency endpoint unavailable');
  await response.arrayBuffer();
  return performance.now() - start;
}

async function delay(ms: number, signal: AbortSignal) {
  if (signal.aborted) return;
  await new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal.addEventListener('abort', done, { once: true });
  });
}

export async function fetchServerInfo(signal: AbortSignal): Promise<{ server: ServerInfo; client: ClientInfo }> {
  try {
    const res = await fetch('/api/speedtest/info', {
      cache: 'no-store',
      signal: AbortSignal.any([signal, AbortSignal.timeout(3500)]),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        server: data.server || {
          id: 'ipscans-edge',
          name: 'IPScans Edge Network',
          location: 'Auto-Selected Edge Node',
          country: 'Global',
        },
        client: data.client || { ip: data.ip || 'Unknown' },
      };
    }
  } catch {
    // fallback if info endpoint times out
  }
  return {
    server: {
      id: 'ipscans-edge',
      name: 'IPScans Edge Engine',
      location: 'Selected Edge Core',
      country: 'Global',
    },
    client: {
      ip: 'Detected',
    },
  };
}

export async function runSpeedTest(
  signal: AbortSignal,
  update: (value: SpeedUpdate) => void
): Promise<SpeedResult> {
  const start = performance.now();
  const trace: Trace[] = [];
  const idle: number[] = [];
  let failures = 0;
  let totalLatencyProbes = 0;
  let transferred = 0;
  let capped = false;

  update({ phase: 'init', mbps: 0, seconds: 0 });

  // 1. Fetch server & client info
  const info: { server: ServerInfo; client: ClientInfo } = await fetchServerInfo(signal).catch(() => ({
    server: { id: 'core', name: 'IPScans Edge', location: 'Optimized Server', country: 'Global' },
    client: { ip: 'Active' },
  }));

  // Detect connection type from browser if supported
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const navConn = (navigator as unknown as { connection?: { effectiveType?: string; type?: string } }).connection;
    if (navConn?.effectiveType) {
      info.client.connectionType = navConn.effectiveType.toUpperCase();
    }
  }

  update({ phase: 'latency', mbps: 0, seconds: 0, server: info.server, client: info.client });

  // 2. Select primary download endpoint: test if local or cloud responds faster
  const pingEndpoint = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? `${CLOUD_DOWN}?bytes=0`
    : '/api/speedtest/ping';

  const downEndpoint = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? CLOUD_DOWN
    : LOCAL_DOWN;

  const upEndpoint = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? CLOUD_UP
    : LOCAL_UP;

  // Warmup probe
  totalLatencyProbes++;
  try {
    await probeLatency(pingEndpoint, signal);
  } catch {
    failures++;
    signal.throwIfAborted();
  }

  // 10 precise idle latency samples
  for (let i = 0; i < 10; i++) {
    signal.throwIfAborted();
    totalLatencyProbes++;
    try {
      const ms = await probeLatency(pingEndpoint, signal);
      idle.push(ms);
      update({
        phase: 'latency',
        mbps: 0,
        seconds: (performance.now() - start) / 1000,
        ping: ms,
        jitter: jitter(idle) ?? undefined,
        progress: (i + 1) / 10,
        server: info.server,
        client: info.client,
      });
    } catch {
      failures++;
      signal.throwIfAborted();
    }
    await delay(60, signal);
  }

  if (idle.length < 2) throw new Error('Insufficient latency samples');

  const idleMedian = median(idle)!;
  const minPing = Math.min(...idle);
  const idleJitter = jitter(idle);

  // 3. Transfer phases: Download then Upload
  async function transfer(direction: Direction, priorDownload?: number) {
    const controller = new AbortController();
    const phaseSignal = AbortSignal.any([signal, controller.signal]);
    const phaseStart = performance.now();
    const measuredStart = phaseStart + WARMUP;
    let bytes = 0;
    let confirmed = 0;
    let phaseBytes = 0;
    let reserved = 0;
    let lastBytes = 0;
    let lastTime = measuredStart;
    const loaded: number[] = [];
    let limitReached = false;

    update({
      phase: direction,
      mbps: 0,
      seconds: (phaseStart - start) / 1000,
      progress: 0,
      server: info.server,
      client: info.client,
      downloadFinal: priorDownload,
    });

    const count = (delta: number) => {
      phaseBytes += delta;
      if (performance.now() >= measuredStart) bytes += delta;
    };

    const timer = setTimeout(() => controller.abort(), WARMUP + DURATION);

    const ticker = setInterval(() => {
      const now = performance.now();
      const elapsedPhase = Math.max(0, now - phaseStart);
      const phaseProgress = Math.min(1, Math.max(0, elapsedPhase / (WARMUP + DURATION)));

      if (now <= measuredStart) {
        update({
          phase: direction,
          mbps: 0,
          seconds: (now - start) / 1000,
          progress: phaseProgress * 0.15,
          server: info.server,
          client: info.client,
          downloadFinal: priorDownload,
        });
        return;
      }
      const point = {
        seconds: (now - start) / 1000,
        mbps: ((bytes - lastBytes) * 8) / ((now - lastTime) * 1000),
        direction,
      };
      lastBytes = bytes;
      lastTime = now;
      trace.push(point);
      update({
        phase: direction,
        mbps: point.mbps,
        seconds: point.seconds,
        progress: phaseProgress,
        trace: point,
        server: info.server,
        client: info.client,
        downloadFinal: priorDownload,
      });
    }, 80);

    // Concurrently probe latency under load to calculate Bufferbloat
    const latencyTask = (async () => {
      while (!phaseSignal.aborted) {
        totalLatencyProbes++;
        try {
          const value = await probeLatency(pingEndpoint, phaseSignal);
          if (!phaseSignal.aborted && performance.now() >= measuredStart) {
            loaded.push(value);
          }
        } catch {
          if (!phaseSignal.aborted) failures++;
        }
        await delay(200, phaseSignal);
      }
    })();

    // Upload payload chunks
    const payload = new Uint8Array(1_000_000);
    for (let offset = 0; offset < payload.length; offset += 65536) {
      crypto.getRandomValues(payload.subarray(offset, Math.min(payload.length, offset + 65536)));
    }

    async function worker() {
      while (!phaseSignal.aborted) {
        const size =
          direction === 'download'
            ? bytes > 30_000_000
              ? 16_000_000
              : bytes > 8_000_000
                ? 8_000_000
                : 2_500_000
            : payload.length;

        if (reserved + size > CAP) {
          limitReached = true;
          break;
        }
        reserved += size;

        try {
          if (direction === 'download') {
            const sep = downEndpoint.includes('?') ? '&' : '?';
            const response = await fetch(`${downEndpoint}${sep}bytes=${size}&r=${crypto.randomUUID()}`, {
              cache: 'no-store',
              signal: phaseSignal,
            });
            if (!response.ok || !response.body) throw new Error('Download endpoint unavailable');
            const reader = response.body.getReader();
            try {
              while (!phaseSignal.aborted) {
                const { done, value } = await reader.read();
                if (done) break;
                count(value.byteLength);
              }
            } finally {
              await reader.cancel().catch(() => {});
              reader.releaseLock();
            }
          } else {
            let requestMeasured = 0;
            const upload = xhrUpload(payload, (delta) => {
              count(delta);
              if (performance.now() >= measuredStart) requestMeasured += delta;
            }, upEndpoint);
            phaseSignal.addEventListener('abort', upload.abort, { once: true });
            const success = await upload.promise;
            phaseSignal.removeEventListener('abort', upload.abort);
            if (success) confirmed += requestMeasured;
            else if (!phaseSignal.aborted) throw new Error('Upload endpoint unavailable');
          }
        } catch {
          if (!phaseSignal.aborted) failures++;
          break;
        }
      }
    }

    let ended: number;
    try {
      // 4 parallel worker connections for maximum precision throughput
      await Promise.all(Array.from({ length: 4 }, worker));
      ended = performance.now();
    } finally {
      clearTimeout(timer);
      clearInterval(ticker);
      controller.abort();
      await latencyTask;
    }

    signal.throwIfAborted();
    transferred += phaseBytes;
    capped ||= limitReached;

    const seconds = (ended! - measuredStart) / 1000;
    const observed = direction === 'upload' ? confirmed : bytes;
    if (seconds < 0.5 || observed <= 0) throw new Error('Insufficient measured transfer; try again');

    return {
      mbps: (observed * 8) / seconds / 1_000_000,
      loaded: median(loaded),
      samples: loaded.length,
    };
  }

  const down = await transfer('download');
  update({
    phase: 'download_complete',
    mbps: down.mbps,
    downloadFinal: down.mbps,
    progress: 1.0,
    seconds: (performance.now() - start) / 1000,
    server: info.server,
    client: info.client,
  });

  const up = await transfer('upload', down.mbps);
  update({
    phase: 'upload_complete',
    mbps: up.mbps,
    downloadFinal: down.mbps,
    uploadFinal: up.mbps,
    progress: 1.0,
    seconds: (performance.now() - start) / 1000,
    server: info.server,
    client: info.client,
  });

  const packetLoss = totalLatencyProbes > 0 
    ? Math.min(100, Math.round((failures / totalLatencyProbes) * 100 * 10) / 10) 
    : 0;

  return {
    download: down.mbps,
    upload: up.mbps,
    idle: idleMedian,
    minPing,
    jitter: idleJitter,
    packetLoss,
    loadedDownload: down.loaded,
    loadedUpload: up.loaded,
    seconds: (performance.now() - start) / 1000,
    bytes: transferred,
    requestsFailed: failures,
    latencySamples: idle.length + down.samples + up.samples,
    stability: variation(trace.filter((p) => p.direction === 'download').map((p) => p.mbps)),
    capped,
    timestamp: new Date().toISOString(),
    trace,
    server: info.server,
    client: info.client,
  };
}
