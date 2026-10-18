"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { Icon, type IconName } from "@/components/ds/Icon";
import { CopyButton } from "@/components/ds/CopyButton";
import { Reveal } from "@/components/ds/Reveal";
import { SignalField } from "@/components/ds/SignalField";
import { SplitHeading } from "@/components/ds/SplitHeading";
import { FeatureGrid, SectionHeader, formatBytes } from "@/components/ds/product";
import {
  analyzeStability,
  evaluateActivities,
  fetchServerInfo,
  getBufferbloatGrade,
  runSpeedTest,
  type ActivityId,
  type ActivityRating,
  type BufferbloatGrade,
  type ClientInfo,
  type ServerInfo,
  type SpeedResult,
  type SpeedUpdate,
  type Trace,
} from "@/lib/speed-engine";
import { speedTestCopy } from "@/components/speedtest/copy";
import { SpeedGauge } from "@/components/speedtest/SpeedGauge";
import { ThroughputChart } from "@/components/speedtest/ThroughputChart";

interface TestHistoryItem {
  id: string;
  timestamp: string;
  download: number;
  upload: number;
  ping: number;
  jitter: number | null;
  stabilityScore: number | null;
  server?: string;
}

const STORAGE_KEY = "ipscans_speed_history_v2";

const ACTIVITY_ICONS: Record<ActivityId, IconName> = {
  streaming4k: "monitor",
  gaming: "bolt",
  videoCalls: "camera",
  cloudBackup: "server",
};

function gradeBadgeClasses(grade: BufferbloatGrade | null): string {
  if (!grade) return "border-stage-line text-on-stage-3 bg-white/[0.03]";
  if (grade === "A+" || grade === "A") {
    return "border-ok/35 bg-ok/15 text-ok";
  }
  if (grade === "B" || grade === "C") {
    return "border-warn/35 bg-warn/15 text-warn";
  }
  return "border-bad/35 bg-bad/15 text-bad";
}

function activityBadgeClasses(rating: ActivityRating): string {
  if (rating === "optimal") return "bg-ok-soft text-ok";
  if (rating === "good") return "bg-signal-soft text-signal";
  return "bg-warn-soft text-warn";
}

export function SpeedTest({
  dict,
  locale,
}: {
  dict: Dictionary["speedTest"];
  locale: Locale;
}) {
  const copy = speedTestCopy[locale] ?? speedTestCopy.en;

  const [update, setUpdate] = useState<SpeedUpdate | null>(null);
  const [result, setResult] = useState<SpeedResult | null>(null);
  const [tracePoints, setTracePoints] = useState<Trace[]>([]);
  const [running, setRunning] = useState(false);
  const [errorState, setErrorState] = useState<"offline" | "blocked" | null>(null);
  const [stoppedNotice, setStoppedNotice] = useState(false);

  // Persistent phase values so download stays visible while upload runs
  const [lockedDownload, setLockedDownload] = useState<number | null>(null);
  const [lockedUpload, setLockedUpload] = useState<number | null>(null);
  const [livePing, setLivePing] = useState<number | null>(null);
  const [liveMinPing, setLiveMinPing] = useState<number | null>(null);
  const [liveJitter, setLiveJitter] = useState<number | null>(null);
  const [liveLoadedPing, setLiveLoadedPing] = useState<number | null>(null);
  const [stageProgress, setStageProgress] = useState(0);

  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);

  const [history, setHistory] = useState<TestHistoryItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
    } catch {
      return [];
    }
  });

  const controllerRef = useRef<AbortController | null>(null);

  // Discover real server/edge and client IP/ISP on mount
  useEffect(() => {
    const ac = new AbortController();
    fetchServerInfo(ac.signal)
      .then((info) => {
        if (ac.signal.aborted) return;
        setServerInfo(info.server);
        setClientInfo(info.client);
      })
      .catch(() => {
        // Leave null so UI shows "—"
      });
    return () => {
      ac.abort();
      controllerRef.current?.abort();
    };
  }, []);

  async function start() {
    if (running) return;

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setErrorState("offline");
      return;
    }

    setErrorState(null);
    setStoppedNotice(false);
    setUpdate(null);
    setResult(null);
    setTracePoints([]);
    setLockedDownload(null);
    setLockedUpload(null);
    setLivePing(null);
    setLiveMinPing(null);
    setLiveJitter(null);
    setLiveLoadedPing(null);
    setStageProgress(0);
    setRunning(true);

    const session = new AbortController();
    controllerRef.current = session;

    try {
      const measured = await runSpeedTest(session.signal, (val) => {
        if (session.signal.aborted) return;
        setUpdate(val);

        if (val.server) setServerInfo(val.server);
        if (val.client) {
          setClientInfo((prev) => ({ ...prev, ...val.client }));
        }

        if (val.ping != null) setLivePing(val.ping);
        if (val.minPing != null) setLiveMinPing(val.minPing);
        if (val.jitter != null) setLiveJitter(val.jitter);
        if (val.loadedPing != null) setLiveLoadedPing(val.loadedPing);

        if (val.downloadFinal != null && val.downloadFinal > 0) {
          setLockedDownload(val.downloadFinal);
        }
        if (val.uploadFinal != null && val.uploadFinal > 0) {
          setLockedUpload(val.uploadFinal);
        }

        if (val.phase === "init") {
          setStageProgress(4);
        } else if (val.phase === "latency") {
          const p = val.progress ?? 0.5;
          setStageProgress(Math.min(18, Math.max(4, 4 + p * 14)));
        } else if (val.phase === "download") {
          const p = val.progress ?? 0;
          setStageProgress(Math.min(58, Math.max(18, 18 + p * 40)));
        } else if (val.phase === "download_complete") {
          setStageProgress(58);
        } else if (val.phase === "upload") {
          const p = val.progress ?? 0;
          setStageProgress(Math.min(98, Math.max(58, 58 + p * 40)));
        } else if (val.phase === "upload_complete" || val.phase === "complete") {
          setStageProgress(100);
        }

        if (val.trace) {
          setTracePoints((prev) => [...prev.slice(-140), val.trace!]);
        }
      });

      setLockedDownload(measured.download);
      setLockedUpload(measured.upload);
      setLivePing(measured.idle);
      setLiveMinPing(measured.minPing);
      setLiveJitter(measured.jitter);
      setStageProgress(100);
      setResult(measured);

      if (measured.server) setServerInfo(measured.server);
      if (measured.client) {
        setClientInfo((prev) => ({ ...prev, ...measured.client }));
      }

      try {
        const item: TestHistoryItem = {
          id: crypto.randomUUID(),
          timestamp: measured.timestamp,
          download: measured.download,
          upload: measured.upload,
          ping: measured.idle,
          jitter: measured.jitter,
          stabilityScore: measured.stabilityAnalysis.score,
          server: measured.server?.name,
        };
        setHistory((prev) => {
          const next = [item, ...prev].slice(0, 10);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {
            // Storage full or disabled
          }
          return next;
        });
      } catch {
        // Ignore storage errors
      }
    } catch {
      if (session.signal.aborted) {
        setStoppedNotice(true);
        setStageProgress(0);
        return;
      }
      const isOffline =
        typeof navigator !== "undefined" && navigator.onLine === false;
      setErrorState(isOffline ? "offline" : "blocked");
    } finally {
      controllerRef.current = null;
      setRunning(false);
    }
  }

  function stop() {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
      setRunning(false);
    }
  }

  function clearHistory() {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  // Determine active gauge readout, label, and unit
  const isLatencyPhase = running && update?.phase === "latency";

  const liveGaugeValue = useMemo(() => {
    if (result) return result.download;
    if (!update) return null;
    if (update.phase === "latency") return update.ping ?? livePing ?? 0;
    if (update.phase === "download") return update.mbps;
    if (update.phase === "download_complete") return lockedDownload ?? update.mbps;
    if (update.phase === "upload") return update.mbps;
    if (update.phase === "upload_complete") return lockedUpload ?? update.mbps;
    return update.mbps;
  }, [result, update, livePing, lockedDownload, lockedUpload]);

  const gaugeLabel = useMemo(() => {
    if (result) return copy.gauge.resultLabel;
    if (!running) return dict.download;
    if (update?.phase === "latency") return copy.gauge.latencyLabel;
    if (update?.phase === "upload" || update?.phase === "upload_complete") {
      return copy.gauge.uploadLabel;
    }
    return copy.gauge.downloadLabel;
  }, [result, running, update, copy, dict.download]);

  const gaugeSubLabel = useMemo(() => {
    if (result) {
      return `${copy.gauge.peakPrefix} ${result.peakDownload.toFixed(1)} Mbps`;
    }
    if (isLatencyPhase && liveMinPing != null) {
      return `${copy.gauge.minPrefix} ${liveMinPing.toFixed(1)} ms`;
    }
    if (running && update?.phase === "download" && tracePoints.length > 0) {
      const dlPeak = Math.max(
        0,
        ...tracePoints.filter((t) => t.direction === "download").map((t) => t.mbps)
      );
      if (dlPeak > 0) return `${copy.gauge.peakPrefix} ${dlPeak.toFixed(1)} Mbps`;
    }
    if (running && update?.phase === "upload" && tracePoints.length > 0) {
      const ulPeak = Math.max(
        0,
        ...tracePoints.filter((t) => t.direction === "upload").map((t) => t.mbps)
      );
      if (ulPeak > 0) return `${copy.gauge.peakPrefix} ${ulPeak.toFixed(1)} Mbps`;
    }
    return null;
  }, [result, isLatencyPhase, liveMinPing, running, update, tracePoints, copy]);

  // Loaded latency & bufferbloat calculation
  const loadedPingValue = useMemo(() => {
    if (result) {
      const vals = [result.loadedDownload, result.loadedUpload].filter(
        (v): v is number => v != null && v > 0
      );
      return vals.length > 0 ? Math.max(...vals) : null;
    }
    return liveLoadedPing;
  }, [result, liveLoadedPing]);

  const bufferbloatDelta = useMemo(() => {
    const baseIdle = result?.idle ?? livePing;
    if (baseIdle == null || loadedPingValue == null) return null;
    return Math.max(0, loadedPingValue - baseIdle);
  }, [result, livePing, loadedPingValue]);

  const bufferbloatGrade = useMemo(
    () =>
      result?.stabilityAnalysis.bufferbloatGrade ??
      getBufferbloatGrade(bufferbloatDelta),
    [result, bufferbloatDelta]
  );

  // Stability analysis (live or final)
  const stabilityInfo = useMemo(() => {
    if (result) return result.stabilityAnalysis;
    return analyzeStability(null, liveJitter, bufferbloatDelta);
  }, [result, liveJitter, bufferbloatDelta]);

  // Activity suitability evaluations when result is ready
  const activities = useMemo(() => {
    if (!result) return [];
    return evaluateActivities(
      result.download,
      result.upload,
      result.idle,
      result.jitter
    );
  }, [result]);

  // Formatted summary text for clipboard sharing
  const summaryText = useMemo(() => {
    if (!result) return "";
    const parts = [
      `IPScans ${dict.title}`,
      `${dict.download}: ${result.download.toFixed(1)} Mbps (${copy.metrics.peak} ${result.peakDownload.toFixed(1)} Mbps)`,
      `${dict.upload}: ${result.upload.toFixed(1)} Mbps (${copy.metrics.peak} ${result.peakUpload.toFixed(1)} Mbps)`,
      `${dict.ping}: ${result.idle.toFixed(1)} ms (${copy.metrics.minPing} ${result.minPing.toFixed(1)} ms)`,
    ];
    if (result.jitter != null) {
      parts.push(`${copy.metrics.jitter}: ±${result.jitter.toFixed(1)} ms`);
    }
    if (loadedPingValue != null) {
      parts.push(
        `${copy.metrics.loadedLatency}: ${loadedPingValue.toFixed(1)} ms${
          bufferbloatGrade ? ` (${bufferbloatGrade})` : ""
        }`
      );
    }
    if (result.server?.name) {
      parts.push(
        `${copy.network.server}: ${result.server.name}${
          result.server.location ? ` · ${result.server.location}` : ""
        }`
      );
    }
    return parts.join(" · ");
  }, [result, dict, copy, loadedPingValue, bufferbloatGrade]);

  function exportJson() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ipscans-speedtest-${new Date(result.timestamp).toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Active step for the 4-phase stepper
  const activeStepIndex = useMemo(() => {
    if (result) return 4;
    if (!running || !update) return 0;
    if (update.phase === "init" || update.phase === "latency") return 1;
    if (update.phase === "download" || update.phase === "download_complete") return 2;
    if (update.phase === "upload" || update.phase === "upload_complete") return 3;
    return 4;
  }, [result, running, update]);

  // Screen-reader live announcement
  const liveAnnouncement = useMemo(() => {
    if (errorState === "offline") return copy.errors.offlineTitle;
    if (errorState === "blocked") return copy.errors.blockedTitle;
    if (stoppedNotice) return copy.errors.stopped;
    if (result) {
      return `${copy.phases.complete}: ${dict.download} ${result.download.toFixed(1)} Mbps, ${dict.upload} ${result.upload.toFixed(1)} Mbps, ${dict.ping} ${result.idle.toFixed(1)} ms`;
    }
    if (!running || !update) return "";
    if (update.phase === "latency") return copy.phases.latency;
    if (update.phase === "download") return copy.phases.download;
    if (update.phase === "upload") return copy.phases.upload;
    return "";
  }, [errorState, stoppedNotice, result, running, update, copy, dict]);

  const clientLocationText = useMemo(() => {
    if (!clientInfo) return "—";
    const parts = [
      clientInfo.city,
      clientInfo.countryCode || clientInfo.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "—";
  }, [clientInfo]);

  const serverDisplayText = useMemo(() => {
    if (!serverInfo) return "—";
    if (serverInfo.location && !serverInfo.name.includes(serverInfo.location)) {
      return `${serverInfo.name} · ${serverInfo.location}`;
    }
    return serverInfo.name || "—";
  }, [serverInfo]);

  const downloadDisplay =
    result != null
      ? result.download.toFixed(1)
      : lockedDownload != null
        ? lockedDownload.toFixed(1)
        : update?.phase === "download"
          ? update.mbps.toFixed(1)
          : "—";

  const uploadDisplay =
    result != null
      ? result.upload.toFixed(1)
      : lockedUpload != null
        ? lockedUpload.toFixed(1)
        : update?.phase === "upload"
          ? update.mbps.toFixed(1)
          : "—";

  const pingDisplay =
    result != null
      ? result.idle.toFixed(1)
      : livePing != null
        ? livePing.toFixed(1)
        : "—";

  const jitterDisplay =
    result?.jitter != null
      ? result.jitter.toFixed(1)
      : liveJitter != null
        ? liveJitter.toFixed(1)
        : "—";

  return (
    <div
      className="pt-[calc(var(--header-h)+28px)] sm:pt-[calc(var(--header-h)+44px)] pb-16 sm:pb-24"
      aria-label={dict.title}
    >
      {/* Screen-reader phase & result announcer */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* 1. Light Surface Page Header */}
      <section className="ds-container">
        <div className="max-w-[780px]">
          <p className="ds-eyebrow mb-4">{copy.eyebrow}</p>
          <SplitHeading text={dict.title} as="h1" className="ds-h1 text-ink" />
          <p className="ds-lead mt-4 max-w-[620px]">{dict.subtitle}</p>
        </div>
      </section>

      {/* 2. Dark Stage Instrument Panel (Inset, Rounded) */}
      <section className="ds-container mt-8 sm:mt-10">
        <div className="ds-stage p-5 sm:p-8 lg:p-10 shadow-float">
          {/* Brand canvas backdrop inside stage */}
          <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-45">
            <SignalField variant="stage" />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(65%_75%_at_28%_45%,rgb(7_8_11/0.86)_20%,rgb(7_8_11/0.55)_100%)]"
          />

          {/* Stage Top Bar: Phase Stepper & Progress */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stage-line pb-5">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {(
                [
                  { step: 1, label: copy.phases.latency },
                  { step: 2, label: copy.phases.download },
                  { step: 3, label: copy.phases.upload },
                  { step: 4, label: copy.phases.complete },
                ] as const
              ).map(({ step, label }) => {
                const isDone = activeStepIndex > step || (step === 4 && result != null);
                const isCurrent = running && activeStepIndex === step;
                return (
                  <div
                    key={step}
                    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      isCurrent
                        ? "border-signal-cyan/50 bg-signal/20 text-on-stage"
                        : isDone
                          ? "border-stage-line-2 bg-white/[0.06] text-on-stage"
                          : "border-stage-line bg-white/[0.02] text-on-stage-3"
                    }`}
                  >
                    {isDone ? (
                      <Icon name="check" size={13} className="text-ok" />
                    ) : isCurrent ? (
                      <span className="size-2 rounded-full bg-signal-cyan animate-pulse" />
                    ) : (
                      <span className="ds-mono text-[0.7rem] opacity-60">{step}</span>
                    )}
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>

            {/* Progress Bar & Percentage */}
            <div className="flex items-center gap-3 ms-auto" dir="ltr">
              <div className="h-1.5 w-28 sm:w-36 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full transition-[width] duration-200 ease-out"
                  style={{
                    width: `${stageProgress}%`,
                    background: "var(--signal-gradient)",
                  }}
                />
              </div>
              <span className="ds-mono ds-tabular text-xs text-on-stage-2 w-9 text-end">
                {running || result ? `${Math.round(stageProgress)}%` : copy.phases.idle}
              </span>
            </div>
          </div>

          {/* Main Stage Grid: Left = Gauge & Action, Right = Live Graph & 6 Metrics */}
          <div className="mt-7 grid items-center gap-8 lg:grid-cols-[1.02fr_1.28fr] lg:gap-10">
            {/* Left Column: Speedometer Gauge + Start/Restart Button */}
            <div className="flex flex-col items-center justify-center rounded-lg border border-stage-line bg-stage-2/70 px-4 py-6 sm:px-6 sm:py-8">
              <SpeedGauge
                value={liveGaugeValue}
                isLatency={isLatencyPhase}
                running={running}
                label={gaugeLabel}
                unit={isLatencyPhase ? "ms" : "Mbps"}
                subLabel={gaugeSubLabel}
                idleCaption={copy.gauge.idleCaption}
              />

              {/* Single Prominent Primary Control */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                {running ? (
                  <button
                    type="button"
                    onClick={stop}
                    className="btn btn-inverse-secondary btn-lg min-w-[200px]"
                  >
                    <Icon name="close" size={18} />
                    <span>{copy.stop}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={start}
                    className="btn btn-inverse btn-lg min-w-[220px]"
                  >
                    <Icon name={result ? "refresh" : "play"} size={18} />
                    <span>{result ? dict.restart : dict.start}</span>
                  </button>
                )}
              </div>

              {stoppedNotice && !running && (
                <p className="mt-3 text-xs text-on-stage-3">{copy.errors.stopped}</p>
              )}
            </div>

            {/* Right Column: Live Throughput Chart + 6 Telemetry Cards */}
            <div className="flex flex-col gap-4">
              {/* Error Banner if Offline / Blocked / Timeout */}
              {errorState && (
                <div
                  role="alert"
                  className="rounded-lg border border-bad/40 bg-bad/10 p-4 sm:p-5 text-on-stage"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-[520px]">
                      <p className="font-medium text-on-stage">
                        {errorState === "offline"
                          ? copy.errors.offlineTitle
                          : copy.errors.blockedTitle}
                      </p>
                      <p className="mt-1 text-sm text-on-stage-2">
                        {errorState === "offline"
                          ? copy.errors.offlineBody
                          : copy.errors.blockedBody}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={start}
                      className="btn btn-inverse btn-sm shrink-0"
                    >
                      <Icon name="refresh" size={15} />
                      <span>{copy.retry}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Primary Download & Upload Cards */}
              <div className="grid gap-3.5 sm:grid-cols-2">
                {/* Download Card */}
                <div
                  className={`ds-stage-card p-5 transition-colors ${
                    running && update?.phase === "download"
                      ? "border-signal-cyan/50 bg-white/[0.06]"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-on-stage-2">
                      <Icon name="arrowDown" size={15} className="text-signal-cyan" />
                      <span>{dict.download}</span>
                    </span>
                    {result && (
                      <span className="ds-mono text-[0.72rem] text-on-stage-3" dir="ltr">
                        {copy.metrics.peak} {result.peakDownload.toFixed(1)} Mbps
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-baseline gap-2" dir="ltr">
                    <span className="ds-tabular font-display text-3xl sm:text-4xl font-medium tracking-tight text-on-stage">
                      {downloadDisplay}
                    </span>
                    <span className="ds-mono text-xs text-on-stage-3">Mbps</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-on-stage-3">
                    <span>{copy.metrics.transferred}</span>
                    <span className="ds-mono" dir="ltr">
                      {result ? formatBytes(result.downloadBytes) : "—"}
                    </span>
                  </div>
                </div>

                {/* Upload Card */}
                <div
                  className={`ds-stage-card p-5 transition-colors ${
                    running && update?.phase === "upload"
                      ? "border-signal-violet/60 bg-white/[0.06]"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-on-stage-2">
                      <Icon name="arrowUp" size={15} className="text-signal-violet" />
                      <span>{dict.upload}</span>
                    </span>
                    {result && (
                      <span className="ds-mono text-[0.72rem] text-on-stage-3" dir="ltr">
                        {copy.metrics.peak} {result.peakUpload.toFixed(1)} Mbps
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-baseline gap-2" dir="ltr">
                    <span className="ds-tabular font-display text-3xl sm:text-4xl font-medium tracking-tight text-on-stage">
                      {uploadDisplay}
                    </span>
                    <span className="ds-mono text-xs text-on-stage-3">Mbps</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-on-stage-3">
                    <span>{copy.metrics.transferred}</span>
                    <span className="ds-mono" dir="ltr">
                      {result ? formatBytes(result.uploadBytes) : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Secondary 4 Telemetry Cards: Ping, Jitter, Loaded Latency, Stability */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {/* 1. Idle Ping */}
                <div
                  className={`ds-stage-card p-4 transition-colors ${
                    running && update?.phase === "latency"
                      ? "border-signal-cyan/50 bg-white/[0.06]"
                      : ""
                  }`}
                >
                  <span className="block text-xs font-medium text-on-stage-2">
                    {dict.ping}
                  </span>
                  <div className="mt-2 flex items-baseline gap-1.5" dir="ltr">
                    <span className="ds-tabular font-display text-2xl font-medium text-on-stage">
                      {pingDisplay}
                    </span>
                    <span className="ds-mono text-[0.72rem] text-on-stage-3">ms</span>
                  </div>
                  <p className="ds-mono mt-1.5 text-[0.72rem] text-on-stage-3" dir="ltr">
                    {result || liveMinPing != null
                      ? `${copy.metrics.minPing} ${(result?.minPing ?? liveMinPing ?? 0).toFixed(1)} ms`
                      : copy.metrics.medianPing}
                  </p>
                </div>

                {/* 2. Jitter */}
                <div className="ds-stage-card p-4">
                  <span className="block text-xs font-medium text-on-stage-2">
                    {copy.metrics.jitter}
                  </span>
                  <div className="mt-2 flex items-baseline gap-1.5" dir="ltr">
                    <span className="ds-tabular font-display text-2xl font-medium text-on-stage">
                      {jitterDisplay !== "—" ? `±${jitterDisplay}` : "—"}
                    </span>
                    {jitterDisplay !== "—" && (
                      <span className="ds-mono text-[0.72rem] text-on-stage-3">ms</span>
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-[0.72rem] text-on-stage-3">
                    {copy.metrics.jitterDesc}
                  </p>
                </div>

                {/* 3. Loaded Latency & Bufferbloat */}
                <div className="ds-stage-card p-4">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-medium text-on-stage-2">
                      {copy.metrics.loadedLatency}
                    </span>
                    {bufferbloatGrade && (
                      <span
                        className={`ds-mono rounded px-1.5 py-0.5 text-[0.68rem] font-semibold border ${gradeBadgeClasses(
                          bufferbloatGrade
                        )}`}
                        dir="ltr"
                      >
                        {bufferbloatGrade}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5" dir="ltr">
                    <span className="ds-tabular font-display text-2xl font-medium text-on-stage">
                      {loadedPingValue != null ? loadedPingValue.toFixed(0) : "—"}
                    </span>
                    {loadedPingValue != null && (
                      <span className="ds-mono text-[0.72rem] text-on-stage-3">ms</span>
                    )}
                  </div>
                  <p className="ds-mono mt-1.5 text-[0.72rem] text-on-stage-3" dir="ltr">
                    {bufferbloatDelta != null
                      ? `+${bufferbloatDelta.toFixed(0)} ms ${copy.metrics.underLoad}`
                      : copy.metrics.loadedDesc}
                  </p>
                </div>

                {/* 4. Stability Analysis */}
                <div className="ds-stage-card p-4">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-medium text-on-stage-2">
                      {copy.metrics.stability}
                    </span>
                    {stabilityInfo.score != null && (
                      <span className="ds-mono text-[0.7rem] text-on-stage-2" dir="ltr">
                        {stabilityInfo.score}/100
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="font-display text-xl sm:text-2xl font-medium text-on-stage truncate">
                      {copy.stabilityRatings[stabilityInfo.rating]}
                    </span>
                  </div>
                  <p className="ds-mono mt-1.5 text-[0.72rem] text-on-stage-3" dir="ltr">
                    {stabilityInfo.cvPercent != null
                      ? `${copy.metrics.variance} ${stabilityInfo.cvPercent.toFixed(1)}%`
                      : copy.metrics.stabilityDesc}
                  </p>
                </div>
              </div>

              {/* Real-Time Throughput Graph */}
              <ThroughputChart
                trace={tracePoints}
                running={running}
                activePhase={update?.phase}
                title={copy.chart.title}
                downloadLabel={dict.download}
                uploadLabel={dict.upload}
                waitingLabel={copy.chart.waiting}
              />
            </div>
          </div>

          {/* Stage Footer: Real Server/Edge & Client ISP/IP Metadata Strip */}
          <div className="mt-7 grid gap-3 border-t border-stage-line pt-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-sm border border-stage-line bg-white/[0.04] text-signal-cyan">
                <Icon name="server" size={17} />
              </span>
              <div className="min-w-0">
                <span className="block text-[0.72rem] text-on-stage-3">
                  {copy.network.server}
                </span>
                <span className="block truncate text-sm font-medium text-on-stage" dir="ltr">
                  {serverDisplayText}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-sm border border-stage-line bg-white/[0.04] text-on-stage-2">
                <Icon name="globe" size={17} />
              </span>
              <div className="min-w-0">
                <span className="block text-[0.72rem] text-on-stage-3">
                  {copy.network.clientIp}
                </span>
                <span className="ds-mono block truncate text-sm font-medium text-on-stage" dir="ltr">
                  {clientInfo?.ip || "—"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-sm border border-stage-line bg-white/[0.04] text-on-stage-2">
                <Icon name="network" size={17} />
              </span>
              <div className="min-w-0">
                <span className="block text-[0.72rem] text-on-stage-3">
                  {copy.network.isp}
                </span>
                <span className="block truncate text-sm font-medium text-on-stage">
                  {clientInfo?.isp || clientInfo?.org || "—"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-sm border border-stage-line bg-white/[0.04] text-on-stage-2">
                <Icon name="map" size={17} />
              </span>
              <div className="min-w-0">
                <span className="block text-[0.72rem] text-on-stage-3">
                  {copy.network.location}
                </span>
                <span className="block truncate text-sm font-medium text-on-stage">
                  {clientLocationText}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Detailed Results Panel (Revealed upon completion) */}
      {result && (
        <section className="ds-container mt-12 sm:mt-16">
          <div className="ds-card p-6 sm:p-9">
            <div className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
              <div>
                <p className="ds-eyebrow mb-3">{copy.results.eyebrow}</p>
                <h2 className="ds-h3 text-ink">{copy.results.title}</h2>
                <p className="ds-body mt-2 max-w-[620px]">{copy.results.lead}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <CopyButton
                  value={summaryText}
                  label={copy.results.copyReport}
                  copiedLabel={copy.results.copied}
                  className="h-10 px-4 text-sm"
                />
                <button
                  type="button"
                  onClick={exportJson}
                  className="btn btn-secondary btn-sm"
                >
                  <Icon name="download" size={15} />
                  <span>{copy.results.exportJson}</span>
                </button>
                <button
                  type="button"
                  onClick={start}
                  className="btn btn-primary btn-sm"
                >
                  <Icon name="refresh" size={15} />
                  <span>{dict.restart}</span>
                </button>
              </div>
            </div>

            {/* Activity Suitability Cards */}
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {activities.map((act) => {
                const text = copy.results.activities[act.id];
                const ratingLabel = copy.results.ratings[act.rating];
                return (
                  <div
                    key={act.id}
                    className="rounded-md border border-line bg-surface-dim p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="grid size-10 place-items-center rounded-[12px] bg-signal-soft text-signal">
                          <Icon name={ACTIVITY_ICONS[act.id]} size={19} />
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${activityBadgeClasses(
                            act.rating
                          )}`}
                        >
                          {ratingLabel}
                        </span>
                      </div>
                      <h3 className="mt-4 font-medium text-ink">{text.title}</h3>
                      <p className="ds-caption mt-1.5">{text.desc}</p>
                    </div>

                    <div className="mt-5 border-t border-line pt-3 text-xs">
                      <div className="flex items-center justify-between text-ink-3">
                        <span>{copy.results.measuredLabel}</span>
                        <span className="ds-mono font-medium text-ink" dir="ltr">
                          {act.metric}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-ink-3">
                        <span>{copy.results.thresholdLabel}</span>
                        <span className="ds-mono text-ink-2" dir="ltr">
                          {act.threshold}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Technical Telemetry Metadata Strip */}
            <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5 text-xs text-ink-3">
              <div className="flex flex-wrap items-center gap-6">
                <span>
                  {copy.results.duration}:{" "}
                  <strong className="ds-mono font-medium text-ink" dir="ltr">
                    {result.seconds.toFixed(1)}s
                  </strong>
                </span>
                <span>
                  {copy.results.totalData}:{" "}
                  <strong className="ds-mono font-medium text-ink" dir="ltr">
                    {formatBytes(result.bytes)}
                  </strong>
                </span>
                <span>
                  {copy.results.samples}:{" "}
                  <strong className="ds-mono font-medium text-ink" dir="ltr">
                    {result.latencySamples}
                  </strong>
                </span>
              </div>
              <span className="ds-mono text-ink-3" dir="ltr">
                {new Date(result.timestamp).toLocaleTimeString(locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* 4. Recent Measurements History (if available) */}
      {history.length > 0 && (
        <section className="ds-container mt-10">
          <div className="ds-card p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2.5">
                <Icon name="clock" size={18} className="text-signal" />
                <h3 className="ds-h4 text-ink">{copy.history.title}</h3>
                <span className="ds-chip">{history.length}</span>
              </div>
              <button
                type="button"
                onClick={clearHistory}
                className="btn btn-ghost btn-sm text-ink-3 hover:text-bad"
              >
                {copy.history.clear}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-3">
                    <th className="py-3 pe-4 text-start font-medium">{copy.history.time}</th>
                    <th className="py-3 px-4 text-start font-medium">{dict.download}</th>
                    <th className="py-3 px-4 text-start font-medium">{dict.upload}</th>
                    <th className="py-3 px-4 text-start font-medium">{dict.ping}</th>
                    <th className="py-3 px-4 text-start font-medium">{copy.metrics.jitter}</th>
                    <th className="py-3 ps-4 text-start font-medium">{copy.network.server}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {history.map((item) => (
                    <tr key={item.id} className="text-ink-2">
                      <td className="ds-mono py-3.5 pe-4 text-xs text-ink-3" dir="ltr">
                        {new Date(item.timestamp).toLocaleTimeString(locale, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="ds-mono ds-tabular py-3.5 px-4 font-medium text-ink" dir="ltr">
                        {item.download.toFixed(1)} Mbps
                      </td>
                      <td className="ds-mono ds-tabular py-3.5 px-4 font-medium text-ink" dir="ltr">
                        {item.upload.toFixed(1)} Mbps
                      </td>
                      <td className="ds-mono ds-tabular py-3.5 px-4" dir="ltr">
                        {item.ping.toFixed(1)} ms
                      </td>
                      <td className="ds-mono ds-tabular py-3.5 px-4 text-ink-3" dir="ltr">
                        {item.jitter != null ? `±${item.jitter.toFixed(1)} ms` : "—"}
                      </td>
                      <td className="py-3.5 ps-4 text-xs text-ink-3" dir="ltr">
                        {item.server || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* 5. Light Surface Methodology Section & Note */}
      <section className="ds-container ds-section-sm pb-0">
        <SectionHeader
          eyebrow={copy.methodology.eyebrow}
          title={copy.methodology.title}
          lead={copy.methodology.lead}
        />

        <div className="mt-10 sm:mt-12">
          <FeatureGrid
            columns={3}
            features={[
              {
                icon: "gauge",
                title: copy.methodology.items[0].title,
                body: copy.methodology.items[0].body,
              },
              {
                icon: "activity",
                title: copy.methodology.items[1].title,
                body: copy.methodology.items[1].body,
              },
              {
                icon: "shield",
                title: copy.methodology.items[2].title,
                body: copy.methodology.items[2].body,
              },
            ]}
          />
        </div>

        <Reveal className="mt-8 rounded-md border border-line bg-surface-dim px-5 py-4 flex items-center gap-3 text-sm text-ink-2">
          <Icon name="info" size={18} className="shrink-0 text-signal" />
          <p>{dict.note}</p>
        </Reveal>
      </section>
    </div>
  );
}
