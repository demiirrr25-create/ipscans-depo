"use client";

import { useEffect, useRef } from "react";

type Variant = "hero" | "ambient" | "stage";

type Particle = {
  /** home position in normalized field units (-1..1) */
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  hue: number; // 0..1 along the signal gradient
  phase: number;
  depth: number;
};

const STOPS: [number, number, number][] = [
  [47, 107, 255], // signal blue
  [0, 194, 255], // cyan
  [122, 92, 255], // violet
];

function gradientColor(t: number): [number, number, number] {
  const x = ((t % 1) + 1) % 1;
  const seg = x * STOPS.length;
  const i = Math.floor(seg);
  const f = seg - i;
  const a = STOPS[i % STOPS.length];
  const b = STOPS[(i + 1) % STOPS.length];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

function buildParticles(variant: Variant, area: number): Particle[] {
  const density = variant === "hero" ? 1 / 1700 : variant === "stage" ? 1 / 2600 : 1 / 4200;
  const count = Math.max(90, Math.min(variant === "hero" ? 900 : 420, Math.round(area * density)));
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    let hx: number;
    let hy: number;
    if (variant === "ambient") {
      hx = Math.random() * 2 - 1;
      hy = Math.random() * 2 - 1;
    } else {
      // Concentric "signal rings": a soft annulus with radial falloff.
      const angle = Math.random() * Math.PI * 2;
      const ring = Math.random() < 0.62 ? 0.62 + (Math.random() - 0.5) * 0.22 : 0.25 + Math.random() * 0.95;
      hx = Math.cos(angle) * ring;
      hy = Math.sin(angle) * ring;
    }
    out.push({
      hx,
      hy,
      x: hx,
      y: hy,
      vx: 0,
      vy: 0,
      len: 2 + Math.random() * 5,
      hue: (Math.atan2(hy, hx) / (Math.PI * 2) + 1) % 1,
      phase: Math.random() * Math.PI * 2,
      depth: 0.35 + Math.random() * 0.65,
    });
  }
  return out;
}

/**
 * Brand backdrop: a field of short gradient "signal" dashes arranged in
 * rings that breathe, slowly rotate and part around the pointer.
 * - Pauses when off-screen or when the tab is hidden.
 * - DPR capped at 2, particle count scales with area.
 * - Renders a single static frame under prefers-reduced-motion.
 */
export function SignalField({
  variant = "hero",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles: Particle[] = [];
    let raf = 0;
    let running = false;
    let visible = true;
    let t = 0;
    const pointer = { x: -9999, y: -9999, active: false };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = buildParticles(variant, width * height);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = variant === "hero" ? height * 0.52 : height / 2;
      const scale = variant === "ambient" ? Math.max(width, height) * 0.55 : Math.min(width * 0.62, height * 0.78);
      const rot = t * 0.035;
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      const breathe = 1 + Math.sin(t * 0.6) * 0.018;
      const alphaBase = variant === "stage" ? 0.85 : 0.75;

      for (const p of particles) {
        // rotate home position, add gentle wave
        const wave = Math.sin(t * 0.9 + p.phase) * 0.012;
        const hx = (p.hx * cosR - p.hy * sinR) * (breathe + wave);
        const hy = (p.hx * sinR + p.hy * cosR) * (breathe + wave);
        const tx = cx + hx * scale;
        const ty = cy + hy * scale;

        // spring toward home
        p.vx += (tx - p.x) * 0.045;
        p.vy += (ty - p.y) * 0.045;

        // pointer repulsion
        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          const r = 150;
          if (d2 < r * r && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const force = (1 - d / r) * 7;
            p.vx += (dx / d) * force;
            p.vy += (dy / d) * force;
          }
        }

        p.vx *= 0.82;
        p.vy *= 0.82;
        p.x += p.vx;
        p.y += p.vy;

        // orient dash tangentially to the ring
        const ang = Math.atan2(p.y - cy, p.x - cx) + Math.PI / 2;
        const len = p.len * (0.6 + p.depth * 0.6);
        const ex = Math.cos(ang) * len;
        const ey = Math.sin(ang) * len;
        const [r, g, b] = gradientColor(p.hue + t * 0.01);
        const a = alphaBase * p.depth;
        ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${a})`;
        ctx.lineWidth = 1.1 + p.depth * 0.9;
        ctx.beginPath();
        ctx.moveTo(p.x - ex / 2, p.y - ey / 2);
        ctx.lineTo(p.x + ex / 2, p.y + ey / 2);
        ctx.stroke();
      }
    };

    const loop = () => {
      t += 1 / 60;
      draw();
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || reduced || !visible || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    resize();
    // seed positions at home so the first frame is composed
    const cx0 = width / 2;
    const cy0 = variant === "hero" ? height * 0.52 : height / 2;
    const s0 = variant === "ambient" ? Math.max(width, height) * 0.55 : Math.min(width * 0.62, height * 0.78);
    for (const p of particles) {
      p.x = cx0 + p.hx * s0 * (reduced ? 1 : 1.25);
      p.y = cy0 + p.hy * s0 * (reduced ? 1 : 1.25);
    }
    draw();
    start();

    const ro = new ResizeObserver(() => {
      resize();
      for (const p of particles) {
        p.x = width / 2 + p.hx * Math.min(width, height) * 0.5;
        p.y = height / 2 + p.hy * Math.min(width, height) * 0.5;
      }
      if (!running) draw();
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= rect.width && pointer.y <= rect.height;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
