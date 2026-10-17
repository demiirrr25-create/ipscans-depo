"use client";

import { useEffect, useRef } from "react";

const PALETTE = [
  "rgba(255,255,255,0.85)",
  "rgba(255,255,255,0.55)",
  "rgba(183,191,217,0.6)",
  "rgba(49,134,255,0.85)",
  "rgba(116,155,255,0.8)",
  "rgba(0,185,92,0.8)",
  "rgba(251,188,4,0.8)",
  "rgba(252,65,61,0.8)",
];

/**
 * Antigravity-style morphing particle field on a pure black canvas.
 * Particles orbit in a gentle anti-gravity drift and subtly repel/attract
 * around the cursor without blocking main-thread rendering.
 */
export function AntigravityParticles({ density = 110 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 1;
    let height = 1;
    let raf = 0;
    let pointerX = -9999;
    let pointerY = -9999;

    const count = window.innerWidth < 768 ? Math.round(density * 0.55) : density;
    const particles = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const ring = 0.18 + ((i * 7) % 100) / 135;
      return {
        nx: 0.5 + Math.cos(angle) * ring * 0.55,
        ny: 0.5 + Math.sin(angle) * ring * 0.45,
        vx: (Math.cos(i * 1.7) * 0.00018),
        vy: -0.00012 - (i % 7) * 0.00003,
        r: i % 9 === 0 ? 2.6 : i % 3 === 0 ? 1.9 : 1.3,
        color: PALETTE[i % PALETTE.length],
        phase: i * 0.45,
      };
    });

    function resize() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function render(now: number) {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, width, height);
      const t = now * 0.0006;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!reduceMotion.matches) {
          p.nx += p.vx + Math.sin(t + p.phase) * 0.00015;
          p.ny += p.vy + Math.cos(t * 0.8 + p.phase) * 0.00012;
          if (p.ny < -0.05) p.ny = 1.05;
          if (p.ny > 1.05) p.ny = -0.05;
          if (p.nx < -0.05) p.nx = 1.05;
          if (p.nx > 1.05) p.nx = -0.05;
        }

        let x = p.nx * width;
        let y = p.ny * height;

        const dx = x - pointerX;
        const dy = y - pointerY;
        const distSq = dx * dx + dy * dy;
        if (distSq < 22000 && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const push = ((148 - dist) / 148) * 18;
          x += (dx / dist) * push;
          y += (dy / dist) * push;
        }

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduceMotion.matches) {
        raf = requestAnimationFrame(render);
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      pointerX = e.clientX - r.left;
      pointerY = e.clientY - r.top;
    }

    function onPointerLeave() {
      pointerX = -9999;
      pointerY = -9999;
    }

    resize();
    render(performance.now());

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [density]);

  return (
    <div className="agy-particles" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
