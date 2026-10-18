"use client";

import { useEffect, useId, useRef, useState } from "react";

const MAJOR_TICKS = [0, 5, 10, 25, 50, 100, 250, 500, 1000] as const;
const MINOR_COUNT = 48;

const CX = 180;
const CY = 176;
const RADIUS = 132;
const START_ANGLE = 150;
const SWEEP_ANGLE = 240;
const TOTAL_ARC_LEN = (2 * Math.PI * RADIUS * SWEEP_ANGLE) / 360;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

export function speedToRatio(value: number, isLatency: boolean): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (isLatency) {
    // Map 0..150 ms onto 0..0.38 of the arc so ping movement is clearly visible
    return Math.min(0.38, Math.max(0.02, (value / 150) * 0.38));
  }
  // Piecewise-smooth logarithmic scale calibrated to MAJOR_TICKS (0 -> 1000 Mbps)
  const ratio = Math.log10(1 + value / 2.5) / Math.log10(1 + 1000 / 2.5);
  return Math.min(1, Math.max(0, ratio));
}

export function SpeedGauge({
  value,
  isLatency,
  running,
  label,
  unit,
  subLabel,
  idleCaption,
}: {
  value: number | null;
  isLatency: boolean;
  running: boolean;
  label: string;
  unit: string;
  subLabel?: string | null;
  idleCaption: string;
}) {
  const uid = useId();
  const targetValue = value ?? 0;
  const targetRatio = value != null ? speedToRatio(value, isLatency) : 0;

  const [animRatio, setAnimRatio] = useState(0);
  const [animValue, setAnimValue] = useState(0);
  const stateRef = useRef({ ratio: 0, val: 0 });

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      const snap = requestAnimationFrame(() => {
        stateRef.current.ratio = targetRatio;
        stateRef.current.val = targetValue;
        setAnimRatio(targetRatio);
        setAnimValue(targetValue);
      });
      return () => cancelAnimationFrame(snap);
    }

    let raf = 0;
    const step = () => {
      const curR = stateRef.current.ratio;
      const curV = stateRef.current.val;
      const dR = targetRatio - curR;
      const dV = targetValue - curV;

      if (Math.abs(dR) < 0.0008 && Math.abs(dV) < 0.04) {
        stateRef.current.ratio = targetRatio;
        stateRef.current.val = targetValue;
        setAnimRatio(targetRatio);
        setAnimValue(targetValue);
        return;
      }

      const nextR = curR + dR * 0.18;
      const nextV = curV + dV * 0.22;
      stateRef.current.ratio = nextR;
      stateRef.current.val = nextV;
      setAnimRatio(nextR);
      setAnimValue(nextV);
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [targetRatio, targetValue]);

  const pStart = polar(CX, CY, RADIUS, START_ANGLE);
  const pEnd = polar(CX, CY, RADIUS, START_ANGLE + SWEEP_ANGLE);
  const arcPath = `M ${pStart.x.toFixed(2)} ${pStart.y.toFixed(2)} A ${RADIUS} ${RADIUS} 0 1 1 ${pEnd.x.toFixed(2)} ${pEnd.y.toFixed(2)}`;

  const dashOffset = TOTAL_ARC_LEN * (1 - animRatio);
  const headAngle = START_ANGLE + SWEEP_ANGLE * animRatio;
  const headPos = polar(CX, CY, RADIUS, headAngle);
  const needleInner = polar(CX, CY, RADIUS - 26, headAngle);
  const needleOuter = polar(CX, CY, RADIUS - 6, headAngle);

  const displayNum =
    value == null
      ? "0.0"
      : animValue >= 100
        ? animValue.toFixed(0)
        : animValue.toFixed(1);

  return (
    <div className="relative flex flex-col items-center justify-center select-none" dir="ltr">
      <div className="relative aspect-[360/310] w-full max-w-[380px]">
        <svg
          viewBox="0 0 360 310"
          className="h-full w-full overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`signalArc-${uid}`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2f6bff" />
              <stop offset="50%" stopColor="#00c2ff" />
              <stop offset="100%" stopColor="#7a5cff" />
            </linearGradient>

            <radialGradient id={`coreHalo-${uid}`} cx="50%" cy="54%" r="50%">
              <stop
                offset="0%"
                stopColor="#2f6bff"
                stopOpacity={running ? "0.18" : "0.07"}
              />
              <stop offset="65%" stopColor="#00c2ff" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#07080b" stopOpacity="0" />
            </radialGradient>

            <filter id={`glow-${uid}`} x="-35%" y="-35%" width="170%" height="170%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Ambient inner halo */}
          <circle cx={CX} cy={CY} r={148} fill={`url(#coreHalo-${uid})`} />

          {/* Fine minor radial ticks */}
          {Array.from({ length: MINOR_COUNT + 1 }).map((_, idx) => {
            const frac = idx / MINOR_COUNT;
            const ang = START_ANGLE + SWEEP_ANGLE * frac;
            const active = animRatio > 0 && frac <= animRatio;
            const isMajorStep = idx % 6 === 0;
            const inner = polar(CX, CY, RADIUS - (isMajorStep ? 16 : 13), ang);
            const outer = polar(CX, CY, RADIUS - 9, ang);
            return (
              <line
                key={idx}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke={
                  active
                    ? "rgba(0, 194, 255, 0.65)"
                    : "rgba(255, 255, 255, 0.1)"
                }
                strokeWidth={isMajorStep ? 1.5 : 1}
                strokeLinecap="round"
              />
            );
          })}

          {/* Major logarithmic scale ticks & numbers */}
          {MAJOR_TICKS.map((tick) => {
            const r = speedToRatio(tick, false);
            const angle = START_ANGLE + SWEEP_ANGLE * r;
            const t1 = polar(CX, CY, RADIUS + 9, angle);
            const t2 = polar(CX, CY, RADIUS + 16, angle);
            const labelPos = polar(CX, CY, RADIUS + 29, angle);
            const reached = !isLatency && animRatio >= r && value != null && value > 0;
            return (
              <g key={tick}>
                <line
                  x1={t1.x}
                  y1={t1.y}
                  x2={t2.x}
                  y2={t2.y}
                  stroke={
                    reached
                      ? "rgba(255, 255, 255, 0.65)"
                      : "rgba(255, 255, 255, 0.18)"
                  }
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y + 3.5}
                  textAnchor="middle"
                  fill={
                    reached
                      ? "rgba(255, 255, 255, 0.88)"
                      : "rgba(185, 190, 200, 0.42)"
                  }
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  fontWeight={reached ? "600" : "400"}
                >
                  {tick === 1000 ? "1G" : tick}
                </text>
              </g>
            );
          })}

          {/* Track background arc */}
          <path
            d={arcPath}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={10}
            strokeLinecap="round"
          />

          {/* Active signal gradient arc */}
          <path
            d={arcPath}
            fill="none"
            stroke={`url(#signalArc-${uid})`}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={TOTAL_ARC_LEN}
            strokeDashoffset={dashOffset}
            filter={`url(#glow-${uid})`}
          />

          {/* Subtle radial pointer indicator */}
          {animRatio > 0.004 && (
            <g>
              <line
                x1={needleInner.x}
                y1={needleInner.y}
                x2={needleOuter.x}
                y2={needleOuter.y}
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.85"
              />
              <circle
                cx={headPos.x}
                cy={headPos.y}
                r="6.5"
                fill="#ffffff"
                stroke="#07080b"
                strokeWidth="2.5"
                filter={`url(#glow-${uid})`}
              />
            </g>
          )}
        </svg>

        {/* Center telemetry readout */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-2">
          <span className="ds-mono text-[0.7rem] font-medium uppercase tracking-[0.18em] text-on-stage-3">
            {label}
          </span>

          <div className="ds-tabular mt-1.5 font-display text-[3.6rem] sm:text-[4.25rem] leading-none font-medium tracking-[-0.04em] text-on-stage">
            {displayNum}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="ds-mono rounded-full border border-stage-line-2 bg-white/[0.05] px-3 py-0.5 text-xs font-medium text-on-stage-2">
              {unit}
            </span>
            {subLabel && (
              <span className="ds-mono text-xs text-on-stage-3">
                {subLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {value == null && !running && (
        <p className="-mt-2 text-center text-xs text-on-stage-3 max-w-[280px]">
          {idleCaption}
        </p>
      )}
    </div>
  );
}
