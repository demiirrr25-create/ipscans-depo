import { xhrUpload } from './speed-upload.ts';

export type Direction = 'download' | 'upload';
export type Trace = { seconds: number; mbps: number; direction: Direction };

export type ServerInfo = {
  id: string;
  name: string;
  location?: string | null;
  country?: string | null;
  region?: string | null;
  colo?: string | null;
  provider?: string | null;
};

export type ClientInfo = {
  ip?: string | null;
  city?: string | null;
  country?: string | null;
  countryCode?: string | null;
  region?: string | null;
  isp?: string | null;
  org?: string | null;
  timezone?: string | null;
  connectionType?: string | null;
  tls?: string | null;
};

export type StabilityRating = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
export type BufferbloatGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export type StabilityAnalysis = {
  rating: StabilityRating;
  score: number | null;
  cvPercent: number | null;
  bufferbloatMs: number | null;
  bufferbloatGrade: BufferbloatGrade | null;
};

export type ActivityId = 'streaming4k' | 'gaming' | 'videoCalls' | 'cloudBackup';
export type ActivityRating = 'optimal' | 'good' | 'limited';

export type ActivityEvaluation = {
  id: ActivityId;
  rating: ActivityRating;
  threshold: string;
  metric: string;
};

export type SpeedResult = {
  download: number;
  upload: number;
  peakDownload: number;
  peakUpload: number;
  idle: number;
  minPing: number;
  jitter: number | null;
  packetLoss: number; // percentage of failed latency probes (0 to 100)
  loadedDownload: number | null;
  loadedUpload: number | null;
  seconds: number;
  bytes: number;
  downloadBytes: number;
  uploadBytes: number;
  requestsFailed: number;
  latencySamples: number;
  stability: number | null;
  uploadStability: number | null;
  stabilityAnalysis: StabilityAnalysis;
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
  minPing?: number;
  jitter?: number;
  loadedPing?: number;
  progress?: number;
  trace?: Trace;
  server?: ServerInfo;
  client?: ClientInfo;
  downloadFinal?: number;
  uploadFinal?: number;
};

export type SpeedEngineOptions = {
  warmupMs?: number;
  durationMs?: number;
  pingSamples?: number;
  pingIntervalMs?: number;
  workers?: number;
  endpoints?: {
    ping: string;
    download: string;
    upload: string;
  };
};

// Endpoints: Prefer high-capacity global edge, automatic fallback to origin API routes
const LOCAL_PING = '/api/speedtest/ping';
const LOCAL_DOWN = '/api/speedtest/download';
const LOCAL_UP = '/api/speedtest/upload';

const CLOUD_DOWN = 'https://speed.cloudflare.com/__down';
const CLOUD_UP = 'https://speed.cloudflare.com/__up';
const CLOUD_TRACE = 'https://speed.cloudflare.com/cdn-cgi/trace';

const CAP = 512_000_000; // 512 MB per phase safety ceiling
const DEFAULT_WARMUP = 800; // 800ms warm-up to clear initial TCP slow-start
const DEFAULT_DURATION = 6000; // 6s steady-state measurement window per direction
const DEFAULT_PING_SAMPLES = 10;
const DEFAULT_PING_INTERVAL = 55;
const DEFAULT_WORKERS = 4;

const COLO_LOCATIONS: Record<string, string> = {
  IST: 'Istanbul, TR',
  SAW: 'Istanbul, TR',
  ESB: 'Ankara, TR',
  ADB: 'Izmir, TR',
  FRA: 'Frankfurt, DE',
  MUC: 'Munich, DE',
  BER: 'Berlin, DE',
  DUS: 'Düsseldorf, DE',
  HAM: 'Hamburg, DE',
  STR: 'Stuttgart, DE',
  AMS: 'Amsterdam, NL',
  LHR: 'London, GB',
  LGW: 'London, GB',
  MAN: 'Manchester, GB',
  EDI: 'Edinburgh, GB',
  DUB: 'Dublin, IE',
  CDG: 'Paris, FR',
  ORY: 'Paris, FR',
  MRS: 'Marseille, FR',
  LYS: 'Lyon, FR',
  MAD: 'Madrid, ES',
  BCN: 'Barcelona, ES',
  LIS: 'Lisbon, PT',
  MXP: 'Milan, IT',
  FCO: 'Rome, IT',
  ZRH: 'Zurich, CH',
  GVA: 'Geneva, CH',
  VIE: 'Vienna, AT',
  BRU: 'Brussels, BE',
  LUX: 'Luxembourg, LU',
  WAW: 'Warsaw, PL',
  PRG: 'Prague, CZ',
  BUD: 'Budapest, HU',
  OTP: 'Bucharest, RO',
  SOF: 'Sofia, BG',
  ATH: 'Athens, GR',
  SKG: 'Thessaloniki, GR',
  BEG: 'Belgrade, RS',
  ZAG: 'Zagreb, HR',
  CPH: 'Copenhagen, DK',
  ARN: 'Stockholm, SE',
  GOT: 'Gothenburg, SE',
  OSL: 'Oslo, NO',
  HEL: 'Helsinki, FI',
  TLL: 'Tallinn, EE',
  RIX: 'Riga, LV',
  VNO: 'Vilnius, LT',
  KBP: 'Kyiv, UA',
  DME: 'Moscow, RU',
  SVO: 'Moscow, RU',
  LED: 'St. Petersburg, RU',
  DXB: 'Dubai, AE',
  AUH: 'Abu Dhabi, AE',
  DOH: 'Doha, QA',
  RUH: 'Riyadh, SA',
  JED: 'Jeddah, SA',
  DMM: 'Dammam, SA',
  KWI: 'Kuwait City, KW',
  BAH: 'Manama, BH',
  MCT: 'Muscat, OM',
  AMM: 'Amman, JO',
  TLV: 'Tel Aviv, IL',
  CAI: 'Cairo, EG',
  CMN: 'Casablanca, MA',
  JNB: 'Johannesburg, ZA',
  CPT: 'Cape Town, ZA',
  LOS: 'Lagos, NG',
  NBO: 'Nairobi, KE',
  IAD: 'Ashburn, US',
  EWR: 'Newark, US',
  JFK: 'New York, US',
  BOS: 'Boston, US',
  PHL: 'Philadelphia, US',
  ATL: 'Atlanta, US',
  MIA: 'Miami, US',
  MCO: 'Orlando, US',
  TPA: 'Tampa, US',
  ORD: 'Chicago, US',
  DTW: 'Detroit, US',
  MSP: 'Minneapolis, US',
  STL: 'St. Louis, US',
  DFW: 'Dallas, US',
  IAH: 'Houston, US',
  AUS: 'Austin, US',
  DEN: 'Denver, US',
  PHX: 'Phoenix, US',
  SLC: 'Salt Lake City, US',
  LAS: 'Las Vegas, US',
  LAX: 'Los Angeles, US',
  SJC: 'San Jose, US',
  SFO: 'San Francisco, US',
  SEA: 'Seattle, US',
  PDX: 'Portland, US',
  YYZ: 'Toronto, CA',
  YUL: 'Montreal, CA',
  YVR: 'Vancouver, CA',
  YYC: 'Calgary, CA',
  MEX: 'Mexico City, MX',
  QRO: 'Querétaro, MX',
  GRU: 'São Paulo, BR',
  GIG: 'Rio de Janeiro, BR',
  BSB: 'Brasília, BR',
  EZE: 'Buenos Aires, AR',
  SCL: 'Santiago, CL',
  BOG: 'Bogotá, CO',
  LIM: 'Lima, PE',
  NRT: 'Tokyo, JP',
  HND: 'Tokyo, JP',
  KIX: 'Osaka, JP',
  ICN: 'Seoul, KR',
  SIN: 'Singapore, SG',
  HKG: 'Hong Kong, HK',
  TPE: 'Taipei, TW',
  BKK: 'Bangkok, TH',
  KUL: 'Kuala Lumpur, MY',
  CGK: 'Jakarta, ID',
  MNL: 'Manila, PH',
  SGN: 'Ho Chi Minh City, VN',
  HAN: 'Hanoi, VN',
  BOM: 'Mumbai, IN',
  DEL: 'New Delhi, IN',
  BLR: 'Bengaluru, IN',
  MAA: 'Chennai, IN',
  HYD: 'Hyderabad, IN',
  SYD: 'Sydney, AU',
  MEL: 'Melbourne, AU',
  BNE: 'Brisbane, AU',
  PER: 'Perth, AU',
  AKL: 'Auckland, NZ',
};

export function resolveColoLocation(colo: string | null | undefined): string | null {
  if (!colo) return null;
  const code = colo.trim().toUpperCase();
  return COLO_LOCATIONS[code] ?? null;
}

export function parseCloudflareTrace(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const eq = line.indexOf('=');
    if (eq > 0) {
      out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    }
  }
  return out;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function minLatency(values: number[]): number | null {
  if (!values.length) return null;
  let min = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] < min) min = values[i];
  }
  return min;
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

/** Convert bytes transferred over durationMs milliseconds into decimal Mbps (bits / 1e6 / seconds). */
export function bytesToMbps(bytes: number, durationMs: number): number {
  if (bytes <= 0 || durationMs <= 0 || !Number.isFinite(bytes) || !Number.isFinite(durationMs)) {
    return 0;
  }
  const seconds = durationMs / 1000;
  return (bytes * 8) / 1_000_000 / seconds;
}

export function getBufferbloatGrade(deltaMs: number | null | undefined): BufferbloatGrade | null {
  if (deltaMs == null || !Number.isFinite(deltaMs) || deltaMs < 0) return null;
  if (deltaMs <= 5) return 'A+';
  if (deltaMs <= 15) return 'A';
  if (deltaMs <= 30) return 'B';
  if (deltaMs <= 60) return 'C';
  if (deltaMs <= 120) return 'D';
  return 'F';
}

export function analyzeStability(
  cvPercent: number | null,
  idleJitterMs: number | null,
  loadedDeltaMs: number | null
): StabilityAnalysis {
  const bufferbloatMs =
    loadedDeltaMs != null && Number.isFinite(loadedDeltaMs) ? Math.max(0, loadedDeltaMs) : null;
  const bufferbloatGrade = getBufferbloatGrade(bufferbloatMs);

  if (cvPercent == null && idleJitterMs == null) {
    return {
      rating: 'unknown',
      score: null,
      cvPercent: null,
      bufferbloatMs,
      bufferbloatGrade,
    };
  }

  const cvPenalty = cvPercent != null ? Math.min(55, Math.max(0, cvPercent) * 1.1) : 0;
  const jitterPenalty = idleJitterMs != null ? Math.min(30, Math.max(0, idleJitterMs - 1) * 1.5) : 0;
  const bloatPenalty = bufferbloatMs != null ? Math.min(15, Math.max(0, bufferbloatMs - 10) * 0.2) : 0;

  const score = Math.round(Math.max(0, Math.min(100, 100 - cvPenalty - jitterPenalty - bloatPenalty)));
  let rating: StabilityRating = 'poor';
  if (score >= 85) rating = 'excellent';
  else if (score >= 70) rating = 'good';
  else if (score >= 50) rating = 'fair';

  return {
    rating,
    score,
    cvPercent: cvPercent != null ? Math.round(cvPercent * 10) / 10 : null,
    bufferbloatMs: bufferbloatMs != null ? Math.round(bufferbloatMs * 10) / 10 : null,
    bufferbloatGrade,
  };
}

export function evaluateActivities(
  downloadMbps: number,
  uploadMbps: number,
  pingMs: number,
  jitterMs: number | null
): ActivityEvaluation[] {
  const j = jitterMs ?? 0;

  const streaming4k: ActivityRating =
    downloadMbps >= 35 && pingMs <= 100 ? 'optimal' : downloadMbps >= 25 ? 'good' : 'limited';

  const gaming: ActivityRating =
    pingMs <= 25 && j <= 8 && downloadMbps >= 15 && uploadMbps >= 5
      ? 'optimal'
      : pingMs <= 55 && j <= 20 && downloadMbps >= 5 && uploadMbps >= 2
        ? 'good'
        : 'limited';

  const videoCalls: ActivityRating =
    downloadMbps >= 15 && uploadMbps >= 10 && pingMs <= 50 && j <= 15
      ? 'optimal'
      : downloadMbps >= 5 && uploadMbps >= 3 && pingMs <= 100
        ? 'good'
        : 'limited';

  const cloudBackup: ActivityRating =
    uploadMbps >= 50 && downloadMbps >= 100
      ? 'optimal'
      : uploadMbps >= 15 && downloadMbps >= 25
        ? 'good'
        : 'limited';

  return [
    {
      id: 'streaming4k',
      rating: streaming4k,
      threshold: '≥ 25 Mbps ↓',
      metric: `${downloadMbps.toFixed(1)} Mbps ↓`,
    },
    {
      id: 'gaming',
      rating: gaming,
      threshold: '< 40 ms · ±15 ms',
      metric: `${pingMs.toFixed(0)} ms${jitterMs != null ? ` · ±${jitterMs.toFixed(1)} ms` : ''}`,
    },
    {
      id: 'videoCalls',
      rating: videoCalls,
      threshold: '≥ 10/10 Mbps · < 50 ms',
      metric: `${downloadMbps.toFixed(0)}/${uploadMbps.toFixed(0)} Mbps · ${pingMs.toFixed(0)} ms`,
    },
    {
      id: 'cloudBackup',
      rating: cloudBackup,
      threshold: '≥ 25 Mbps ↑',
      metric: `${uploadMbps.toFixed(1)} Mbps ↑`,
    },
  ];
}

function appendCacheBuster(endpoint: string): string {
  const sep = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${sep}r=${crypto.randomUUID()}`;
}

async function probeLatency(
  endpoint: string,
  signal: AbortSignal
): Promise<{ ms: number; colo?: string | null; clientIp?: string | null }> {
  const url = appendCacheBuster(endpoint);
  const start = performance.now();
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]),
  });
  if (!response.ok) throw new Error('Latency endpoint unavailable');
  await response.arrayBuffer();
  const ms = performance.now() - start;
  const rawRay = response.headers.get('cf-ray');
  const rayColo = rawRay && rawRay.includes('-') ? rawRay.split('-').pop() : null;
  const colo =
    response.headers.get('cf-meta-colo') ||
    response.headers.get('colo') ||
    rayColo ||
    null;
  const clientIp = response.headers.get('cf-meta-ip') || null;
  return { ms, colo, clientIp };
}

async function delay(ms: number, signal: AbortSignal) {
  if (signal.aborted || ms <= 0) return;
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

export async function fetchServerInfo(
  signal: AbortSignal
): Promise<{ server: ServerInfo; client: ClientInfo }> {
  signal.throwIfAborted();

  let server: ServerInfo = {
    id: 'edge',
    name: 'Edge Node',
    location: null,
    country: null,
  };
  const client: ClientInfo = {};

  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const navConn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
    if (navConn?.effectiveType) {
      client.connectionType = navConn.effectiveType.toUpperCase();
    }
  }

  const [traceRes, ipRes, localInfoRes] = await Promise.allSettled([
    fetch(CLOUD_TRACE, {
      cache: 'no-store',
      signal: AbortSignal.any([signal, AbortSignal.timeout(2500)]),
    }).then((r) => (r.ok ? r.text() : Promise.reject(new Error('trace failed')))),
    fetch('/api/ip', {
      cache: 'no-store',
      signal: AbortSignal.any([signal, AbortSignal.timeout(3500)]),
    }).then((r) => (r.ok ? r.json() : Promise.reject(new Error('ip failed')))),
    fetch('/api/speedtest/info', {
      cache: 'no-store',
      signal: AbortSignal.any([signal, AbortSignal.timeout(2500)]),
    }).then((r) => (r.ok ? r.json() : Promise.reject(new Error('info failed')))),
  ]);

  if (localInfoRes.status === 'fulfilled' && localInfoRes.value) {
    const data = localInfoRes.value;
    if (data.server) {
      server = {
        id: data.server.id || 'ipscans-origin',
        name: data.server.name || 'IPScans Origin',
        location: data.server.location ?? null,
        country: data.server.country ?? null,
        region: data.server.region ?? null,
        colo: data.server.colo ?? null,
        provider: 'IPScans',
      };
    }
    if (data.client) {
      if (data.client.ip) client.ip = data.client.ip;
      if (data.client.city) client.city = data.client.city;
      if (data.client.country) client.country = data.client.country;
      if (data.client.region) client.region = data.client.region;
    }
  }

  if (traceRes.status === 'fulfilled' && traceRes.value) {
    const trace = parseCloudflareTrace(traceRes.value);
    const colo = trace.colo?.toUpperCase() || null;
    const loc = resolveColoLocation(colo);
    server = {
      id: colo ? `cf-${colo.toLowerCase()}` : 'cf-anycast',
      name: colo ? `Cloudflare Edge (${colo})` : 'Cloudflare Edge',
      location: loc || colo || null,
      country: loc ? loc.split(', ').pop() || null : trace.loc || null,
      colo,
      provider: 'Cloudflare Anycast',
    };
    if (trace.ip && !client.ip) client.ip = trace.ip;
    if (trace.loc && !client.countryCode) client.countryCode = trace.loc;
    if (trace.tls) client.tls = trace.tls;
  }

  if (ipRes.status === 'fulfilled' && ipRes.value && !ipRes.value.error) {
    const ipData = ipRes.value;
    if (ipData.ip) client.ip = ipData.ip;
    if (ipData.city) client.city = ipData.city;
    if (ipData.region) client.region = ipData.region;
    if (ipData.country) client.country = ipData.country;
    if (ipData.countryCode) client.countryCode = ipData.countryCode;
    if (ipData.isp) client.isp = ipData.isp;
    if (ipData.org) client.org = ipData.org;
    if (ipData.timezone) client.timezone = ipData.timezone;
  }

  return { server, client };
}

export async function runSpeedTest(
  signal: AbortSignal,
  update: (value: SpeedUpdate) => void,
  options: SpeedEngineOptions = {}
): Promise<SpeedResult> {
  signal.throwIfAborted();

  const warmupMs = options.warmupMs ?? DEFAULT_WARMUP;
  const durationMs = options.durationMs ?? DEFAULT_DURATION;
  const pingSampleCount = options.pingSamples ?? DEFAULT_PING_SAMPLES;
  const pingIntervalMs = options.pingIntervalMs ?? DEFAULT_PING_INTERVAL;
  const workerCount = options.workers ?? DEFAULT_WORKERS;

  const start = performance.now();
  const trace: Trace[] = [];
  const idle: number[] = [];
  let latencyFailures = 0;
  let transferFailures = 0;
  let totalLatencyProbes = 0;
  let totalBytes = 0;
  let capped = false;

  update({ phase: 'init', mbps: 0, seconds: 0 });

  // 1. Discover real server & client metadata
  const info: { server: ServerInfo; client: ClientInfo } = options.endpoints
    ? {
        server: { id: 'custom', name: 'Test Endpoint', location: null, country: null },
        client: {},
      }
    : await fetchServerInfo(signal).catch(() => ({
        server: { id: 'edge', name: 'Edge Node', location: null, country: null },
        client: {},
      }));

  signal.throwIfAborted();

  // 2. Select active endpoints: verify Cloudflare edge availability, fall back to local API routes
  let pingEndpoint = options.endpoints?.ping ?? `${CLOUD_DOWN}?bytes=0`;
  let downEndpoint = options.endpoints?.download ?? CLOUD_DOWN;
  let upEndpoint = options.endpoints?.upload ?? CLOUD_UP;

  if (!options.endpoints) {
    totalLatencyProbes++;
    try {
      const warm = await probeLatency(`${CLOUD_DOWN}?bytes=0`, signal);
      if (warm.colo) {
        const colo = warm.colo.toUpperCase();
        const loc = resolveColoLocation(colo);
        info.server = {
          id: `cf-${colo.toLowerCase()}`,
          name: `Cloudflare Edge (${colo})`,
          location: loc || info.server.location || colo,
          country: loc ? loc.split(', ').pop() || null : info.server.country,
          colo,
          provider: 'Cloudflare Anycast',
        };
      }
      if (warm.clientIp && !info.client.ip) {
        info.client.ip = warm.clientIp;
      }
    } catch {
      signal.throwIfAborted();
      // Fallback to local origin endpoints if Cloudflare edge is blocked or unreachable
      pingEndpoint = LOCAL_PING;
      downEndpoint = LOCAL_DOWN;
      upEndpoint = LOCAL_UP;
      if (info.server.provider === 'Cloudflare Anycast') {
        info.server = {
          id: 'ipscans-origin',
          name: 'IPScans Origin',
          location: null,
          country: null,
          provider: 'IPScans',
        };
      }
      try {
        await probeLatency(pingEndpoint, signal);
      } catch {
        latencyFailures++;
        signal.throwIfAborted();
      }
    }
  } else {
    // Warm-up probe on custom endpoint
    totalLatencyProbes++;
    try {
      await probeLatency(pingEndpoint, signal);
    } catch {
      latencyFailures++;
      signal.throwIfAborted();
    }
  }

  update({
    phase: 'latency',
    mbps: 0,
    seconds: (performance.now() - start) / 1000,
    server: info.server,
    client: info.client,
  });

  // 3. Collect idle latency samples (excluding the warm-up probe above)
  for (let i = 0; i < pingSampleCount; i++) {
    signal.throwIfAborted();
    totalLatencyProbes++;
    try {
      const { ms } = await probeLatency(pingEndpoint, signal);
      idle.push(ms);
      update({
        phase: 'latency',
        mbps: 0,
        seconds: (performance.now() - start) / 1000,
        ping: ms,
        minPing: minLatency(idle) ?? ms,
        jitter: jitter(idle) ?? undefined,
        progress: (i + 1) / pingSampleCount,
        server: info.server,
        client: info.client,
      });
    } catch {
      latencyFailures++;
      signal.throwIfAborted();
    }
    if (i < pingSampleCount - 1) {
      await delay(pingIntervalMs, signal);
    }
  }

  if (idle.length < 2) {
    throw new Error('Insufficient latency samples');
  }

  const idleMedian = median(idle)!;
  const minPing = minLatency(idle)!;
  const idleJitter = jitter(idle);

  // Pre-generate random incompressible upload buffer (1 MB max slice)
  const maxPayload = new Uint8Array(1_000_000);
  for (let offset = 0; offset < maxPayload.length; offset += 65536) {
    crypto.getRandomValues(
      maxPayload.subarray(offset, Math.min(maxPayload.length, offset + 65536))
    );
  }

  // 4. Transfer phases: Download then Upload
  async function transfer(direction: Direction, priorDownload?: number) {
    const controller = new AbortController();
    const phaseSignal = AbortSignal.any([signal, controller.signal]);
    const phaseStart = performance.now();
    const measuredStart = phaseStart + warmupMs;
    const totalWindowMs = warmupMs + durationMs;

    let measuredBytes = 0;
    let confirmedUploadBytes = 0;
    let completedUploadRequests = 0;
    let phaseBytes = 0;
    let reserved = 0;
    let peakMbps = 0;
    const loaded: number[] = [];
    let limitReached = false;

    // Sliding window of (time, phaseBytes) snapshots for smooth, real-time throughput display
    const windowHistory: { t: number; total: number }[] = [{ t: phaseStart, total: 0 }];

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
      if (delta <= 0) return;
      phaseBytes += delta;
      if (performance.now() >= measuredStart) {
        measuredBytes += delta;
      }
    };

    const timer = setTimeout(() => controller.abort(), totalWindowMs);

    const ticker = setInterval(() => {
      const now = performance.now();
      const elapsedPhase = Math.max(0, now - phaseStart);
      const phaseProgress = Math.min(1, Math.max(0, elapsedPhase / totalWindowMs));

      windowHistory.push({ t: now, total: phaseBytes });
      while (windowHistory.length > 2 && now - windowHistory[0].t > 480) {
        windowHistory.shift();
      }
      const oldest = windowHistory[0];
      const windowMbps = bytesToMbps(phaseBytes - oldest.total, now - oldest.t);

      if (now <= measuredStart) {
        update({
          phase: direction,
          mbps: windowMbps,
          seconds: (now - start) / 1000,
          progress: phaseProgress,
          server: info.server,
          client: info.client,
          downloadFinal: priorDownload,
        });
        return;
      }

      if (windowMbps > peakMbps) peakMbps = windowMbps;

      const point: Trace = {
        seconds: (now - start) / 1000,
        mbps: windowMbps,
        direction,
      };
      trace.push(point);
      update({
        phase: direction,
        mbps: point.mbps,
        seconds: point.seconds,
        loadedPing: median(loaded) ?? undefined,
        progress: phaseProgress,
        trace: point,
        server: info.server,
        client: info.client,
        downloadFinal: priorDownload,
      });
    }, 90);

    // Concurrently probe latency under load to measure Bufferbloat
    const latencyTask = (async () => {
      while (!phaseSignal.aborted) {
        totalLatencyProbes++;
        try {
          const { ms } = await probeLatency(pingEndpoint, phaseSignal);
          if (!phaseSignal.aborted && performance.now() >= measuredStart) {
            loaded.push(ms);
          }
        } catch {
          if (!phaseSignal.aborted) latencyFailures++;
        }
        await delay(200, phaseSignal);
      }
    })();

    let activeUpEndpoint = upEndpoint;

    async function worker() {
      let workerErrors = 0;
      while (!phaseSignal.aborted) {
        const size =
          direction === 'download'
            ? measuredBytes > 30_000_000
              ? 16_000_000
              : measuredBytes > 8_000_000
                ? 8_000_000
                : 2_500_000
            : measuredBytes > 10_000_000
              ? 1_000_000
              : measuredBytes > 2_000_000
                ? 500_000
                : 250_000;

        if (reserved + size > CAP) {
          limitReached = true;
          break;
        }
        reserved += size;
        let requestBytes = 0;

        try {
          if (direction === 'download') {
            const sep = downEndpoint.includes('?') ? '&' : '?';
            const response = await fetch(
              `${downEndpoint}${sep}bytes=${size}&r=${crypto.randomUUID()}`,
              {
                cache: 'no-store',
                signal: phaseSignal,
              }
            );
            if (!response.ok || !response.body) {
              throw new Error('Download endpoint unavailable');
            }
            const reader = response.body.getReader();
            try {
              while (!phaseSignal.aborted) {
                const { done, value } = await reader.read();
                if (done) break;
                requestBytes += value.byteLength;
                count(value.byteLength);
              }
            } finally {
              await reader.cancel().catch(() => {});
              reader.releaseLock();
            }
            workerErrors = 0;
          } else {
            let requestMeasured = 0;
            const chunk =
              size === maxPayload.length ? maxPayload : maxPayload.subarray(0, size);
            const targetUrl = appendCacheBuster(activeUpEndpoint);
            const upload = xhrUpload(
              chunk,
              (delta) => {
                requestBytes += delta;
                count(delta);
                if (performance.now() >= measuredStart) {
                  requestMeasured += delta;
                }
              },
              targetUrl
            );
            phaseSignal.addEventListener('abort', upload.abort, { once: true });
            const success = await upload.promise;
            phaseSignal.removeEventListener('abort', upload.abort);

            if (success) {
              completedUploadRequests++;
              confirmedUploadBytes += requestMeasured;
              workerErrors = 0;
            } else if (!phaseSignal.aborted) {
              // If Cloudflare upload fails before any request succeeded, fall back to local upload route
              if (!options.endpoints && activeUpEndpoint === CLOUD_UP && completedUploadRequests === 0) {
                activeUpEndpoint = LOCAL_UP;
                reserved -= size - requestBytes;
                continue;
              }
              throw new Error('Upload endpoint unavailable');
            }
          }
        } catch {
          if (!phaseSignal.aborted) {
            transferFailures++;
            workerErrors++;
            if (workerErrors >= 2) break;
          } else {
            break;
          }
        } finally {
          reserved -= Math.max(0, size - requestBytes);
        }
      }
    }

    let ended: number;
    try {
      await Promise.all(Array.from({ length: workerCount }, worker));
      ended = performance.now();
    } finally {
      clearTimeout(timer);
      clearInterval(ticker);
      controller.abort();
      await latencyTask;
    }

    signal.throwIfAborted();
    totalBytes += phaseBytes;
    capped ||= limitReached;

    const measuredDurationMs = Math.max(0, ended! - measuredStart);
    // For upload: if at least one upload request completed or progress was observed before phase timeout,
    // use measuredBytes (which counts verified XHR progress events in the measurement window).
    const observed =
      direction === 'upload'
        ? completedUploadRequests > 0 || (measuredBytes > 0 && transferFailures === 0)
          ? measuredBytes
          : confirmedUploadBytes
        : measuredBytes;

    if (measuredDurationMs < Math.min(250, durationMs * 0.4) || observed <= 0) {
      throw new Error('Insufficient measured transfer; try again');
    }

    const finalMbps = bytesToMbps(observed, measuredDurationMs);
    return {
      mbps: finalMbps,
      peakMbps: Math.max(peakMbps, finalMbps),
      bytes: phaseBytes,
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

  const packetLoss =
    totalLatencyProbes > 0
      ? Math.min(100, Math.round((latencyFailures / totalLatencyProbes) * 100 * 10) / 10)
      : 0;

  const downSamples = trace.filter((p) => p.direction === 'download').map((p) => p.mbps);
  const upSamples = trace.filter((p) => p.direction === 'upload').map((p) => p.mbps);
  const downCv = variation(downSamples);
  const upCv = variation(upSamples);

  const worstLoaded = Math.max(down.loaded ?? 0, up.loaded ?? 0);
  const loadedDelta = worstLoaded > 0 ? Math.max(0, worstLoaded - idleMedian) : null;
  const stabilityAnalysis = analyzeStability(downCv, idleJitter, loadedDelta);

  return {
    download: down.mbps,
    upload: up.mbps,
    peakDownload: down.peakMbps,
    peakUpload: up.peakMbps,
    idle: idleMedian,
    minPing,
    jitter: idleJitter,
    packetLoss,
    loadedDownload: down.loaded,
    loadedUpload: up.loaded,
    seconds: (performance.now() - start) / 1000,
    bytes: totalBytes,
    downloadBytes: down.bytes,
    uploadBytes: up.bytes,
    requestsFailed: latencyFailures + transferFailures,
    latencySamples: idle.length + down.samples + up.samples,
    stability: downCv,
    uploadStability: upCv,
    stabilityAnalysis,
    capped,
    timestamp: new Date().toISOString(),
    trace,
    server: info.server,
    client: info.client,
  };
}
