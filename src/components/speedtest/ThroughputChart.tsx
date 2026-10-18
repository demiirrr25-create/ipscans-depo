"use client";

import { useId } from "react";
import type { Trace } from "@/lib/speed-engine";

const WIDTH = 560;
const HEIGHT = 116;
const PAD_TOP = 12;
const PAD_BOTTOM = 8;
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM;

function buildSmoothCurve(pts: { x: number; y: number }[]): {
  line: string;
  area: string;
  last: { x: number; y: number } | null;
} {
  if (pts.length === 0) return { line: "", area: "", last: null };
  if (pts.length === 1) {
    const p = pts[0];
    return {
      line: `M 0 ${p.y.toFixed(1)} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
      area: `M 0 ${HEIGHT - PAD_BOTTOM} L 0 ${p.y.toFixed(1)} L ${p.x.toFixed(1)} ${p.y.toFixed(1)} L ${p.x.toFixed(1)} ${HEIGHT - PAD_BOTTOM} Z`,
      last: p,
    };
  }

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const midX = (p0.x + p1.x) / 2;
    d += ` C ${midX.toFixed(1)} ${p0.y.toFixed(1)}, ${midX.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }

  const first = pts[0];
  const last = pts[pts.length - 1];
  const base = HEIGHT - PAD_BOTTOM;
  const area = `${d} L ${last.x.toFixed(1)} ${base} L ${first.x.toFixed(1)} ${base} Z`;

  return { line: d, area, last };
}

export function ThroughputChart({
  trace,
  running,
  activePhase,
  title,
  downloadLabel,
  uploadLabel,
  waitingLabel,
}: {
  trace: Trace[];
  running: boolean;
  activePhase?: string;
  title: string;
  downloadLabel: string;
  uploadLabel: string;
  waitingLabel: string;
}) {
  const uid = useId();

  const downTrace = trace.filter((t) => t.direction === "download");
  const upTrace = trace.filter((t) => t.direction === "upload");

  const maxVal = Math.max(
    25,
    ...downTrace.map((t) => t.mbps),
    ...upTrace.map((t) => t.mbps)
  );
  const ceiling = Math.ceil(maxVal * 1.12);

  const mapSeries = (series: Trace[]) => {
    const expectedCount = Math.max(series.length, running ? 45 : Math.max(2, series.length));
    return series.map((item, idx) => {
      const x =
        series.length <= 1
          ? 16
          : (idx / Math.max(1, expectedCount - 1)) * WIDTH;
      const ratio = Math.min(1, Math.max(0, item.mbps / ceiling));
      const y = PAD_TOP + PLOT_H * (1 - ratio);
      return { x, y };
    });
  };

  const downCurve = buildSmoothCurve(mapSeries(downTrace));
  const upCurve = buildSmoothCurve(mapSeries(upTrace));

  const hasData = downTrace.length > 0 || upTrace.length > 0;

  return (
    <div className="ds-stage-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`size-2 rounded-full ${
              running ? "bg-signal-cyan animate-pulse" : "bg-on-stage-3/50"
            }`}
          />
          <span className="text-xs font-medium text-on-stage-2">{title}</span>
        </div>

        <div className="flex items-center gap-4 text-xs" dir="ltr">
          <span className="inline-flex items-center gap-1.5 text-on-stage-2">
            <span className="h-2 w-2 rounded-full bg-signal-cyan" />
            <span>{downloadLabel}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-on-stage-2">
            <span className="h-2 w-2 rounded-full bg-signal-violet" />
            <span>{uploadLabel}</span>
          </span>
          {hasData && (
            <span className="ds-mono text-[0.72rem] text-on-stage-3">
              0–{ceiling} Mbps
            </span>
          )}
        </div>
      </div>

      <div className="relative mt-3 h-[116px] w-full overflow-hidden rounded-md border border-stage-line bg-stage/60" dir="ltr">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`dlArea-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00c2ff" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#2f6bff" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id={`ulArea-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7a5cff" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#7a5cff" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal reference grid lines */}
          {[0.25, 0.5, 0.75].map((r) => {
            const y = PAD_TOP + PLOT_H * r;
            return (
              <line
                key={r}
                x1={0}
                y1={y}
                x2={WIDTH}
                y2={y}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeDasharray="3 5"
                strokeWidth="1"
              />
            );
          })}

          {downCurve.area && (
            <path d={downCurve.area} fill={`url(#dlArea-${uid})`} />
          )}
          {downCurve.line && (
            <path
              d={downCurve.line}
              fill="none"
              stroke="#00c2ff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {downCurve.last && activePhase === "download" && (
            <circle
              cx={downCurve.last.x}
              cy={downCurve.last.y}
              r="4"
              fill="#00c2ff"
              stroke="#07080b"
              strokeWidth="1.5"
            />
          )}

          {upCurve.area && (
            <path d={upCurve.area} fill={`url(#ulArea-${uid})`} />
          )}
          {upCurve.line && (
            <path
              d={upCurve.line}
              fill="none"
              stroke="#7a5cff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {upCurve.last && activePhase === "upload" && (
            <circle
              cx={upCurve.last.x}
              cy={upCurve.last.y}
              r="4"
              fill="#7a5cff"
              stroke="#07080b"
              strokeWidth="1.5"
            />
          )}
        </svg>

        {!hasData && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-on-stage-3">
            {waitingLabel}
          </div>
        )}
      </div>
    </div>
  );
}
