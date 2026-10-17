"use client";

import { useEffect, useRef } from "react";

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

interface RingParticle {
  uvX: number; // -1..1
  uvY: number; // -1..1
  curX: number;
  curY: number;
  scale: number;
  seed1: number;
  seed2: number;
}

export function AntigravityParticles({
  variant = "hero",
  className = "",
}: {
  variant?: "hero" | "download";
  density?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId = 0;
    let isVisible = true;

    // Generate jittered Poisson-like grid in [-1, 1] x [-1, 1]
    const cols = 42;
    const rows = 26;
    const particles: RingParticle[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const jx = (Math.sin(r * 127.1 + c * 311.7) * 43758.5453) % 1;
        const jy = (Math.sin(r * 269.5 + c * 183.3) * 43758.5453) % 1;
        const uvX = ((c + 0.5 + (jx - 0.5) * 0.75) / cols) * 2 - 1;
        const uvY = ((r + 0.5 + (jy - 0.5) * 0.75) / rows) * 2 - 1;
        particles.push({
          uvX,
          uvY,
          curX: uvX,
          curY: uvY,
          scale: 0.2,
          seed1: Math.abs(jx),
          seed2: Math.abs(jy),
        });
      }
    }

    const pointer = { x: 0, y: 0, active: false };
    const ringPos = { x: 0, y: 0 };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth || window.innerWidth;
      height = parent.clientHeight || 680;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      if (nx >= -1.1 && nx <= 1.1 && ny >= -1.1 && ny <= 1.1) {
        pointer.x = nx * 0.55;
        pointer.y = ny * 0.55;
        pointer.active = true;
      } else {
        pointer.active = false;
      }
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0 }
    );
    observer.observe(canvas);

    const startTime = performance.now();

    const render = (now: number) => {
      rafId = requestAnimationFrame(render);
      if (!isVisible || document.hidden) return;

      const elapsed = reducedMotion ? 1.5 : (now - startTime) * 0.001;
      ctx.clearRect(0, 0, width, height);

      const driftX = Math.sin(elapsed * 0.66 + 1.4) * 0.22;
      const driftY = Math.cos(elapsed * 0.75 + 0.8) * 0.14;
      const targetX = pointer.active ? pointer.x + driftX * 0.35 : driftX;
      const targetY = pointer.active ? pointer.y + driftY * 0.35 : driftY;

      ringPos.x += (targetX - ringPos.x) * (pointer.active ? 0.045 : 0.02);
      ringPos.y += (targetY - ringPos.y) * (pointer.active ? 0.045 : 0.02);

      const aspect = width / Math.max(1, height);
      const ringRadius =
        (variant === "download" ? 0.34 : 0.31) +
        Math.sin(elapsed * 1.0) * 0.035 +
        Math.cos(elapsed * 2.7) * 0.02;
      const ringWidth = variant === "download" ? 0.19 : 0.16;
      const ringWidth2 = variant === "download" ? 0.08 : 0.095;
      const ringDisplacement = variant === "download" ? 0.16 : 0.22;

      const halfW = width * 0.5;
      const halfH = height * 0.5;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const time = elapsed * 0.5;

        // Ambient wave displacement
        const waveX =
          Math.sin(p.uvX * 9.0 + time * 3.2 + p.seed1 * 3.0) * 0.016 +
          Math.cos(p.uvY * 7.0 + time * 2.1) * 0.01;
        const waveY =
          Math.cos(p.uvY * 9.0 + time * 2.6 + p.seed2 * 3.0) * 0.016 +
          Math.sin(p.uvX * 7.0 + time * 2.4) * 0.01;

        const dx = (p.uvX + waveX - ringPos.x) * (aspect > 1 ? 1 : aspect);
        const dy = (p.uvY + waveY - ringPos.y) / (aspect > 1 ? Math.min(aspect, 1.55) : 1);
        const dist = Math.sqrt(dx * dx + dy * dy);

        const noise0 = Math.sin(p.uvX * 6.0 + p.uvY * 6.0 + time * 1.8) * 0.015;
        const dist1 = dist + noise0;

        let t1 =
          smoothstep(ringRadius - ringWidth * 1.8, ringRadius, dist) -
          smoothstep(ringRadius, ringRadius + ringWidth, dist1);
        let t2 =
          smoothstep(ringRadius - ringWidth2 * 1.8, ringRadius, dist) -
          smoothstep(ringRadius, ringRadius + ringWidth2, dist1);
        const t3 = smoothstep(ringRadius + ringWidth2, ringRadius, dist);

        t1 = Math.max(0, t1);
        t2 = Math.max(0, t2);
        let targetScale =
          t1 * t1 +
          Math.pow(t2, 2.2) * 2.4 +
          t3 * 0.32 +
          0.16 +
          Math.sin(p.uvX * 3.5 + p.uvY * 3.5 + time) * 0.06;

        targetScale = Math.max(0.12, Math.min(1.45, targetScale));
        p.scale += (targetScale - p.scale) * 0.18;

        const push = Math.pow(t2, 0.75) * ringDisplacement;
        const angle = Math.atan2(dy, dx);
        const targetPosX = p.uvX + waveX + Math.cos(angle) * push * 0.35;
        const targetPosY = p.uvY + waveY + Math.sin(angle) * push * 0.35;

        p.curX += (targetPosX - p.curX) * 0.22;
        p.curY += (targetPosY - p.curY) * 0.22;

        const sx = halfW + p.curX * halfW;
        const sy = halfH + p.curY * halfH;

        const noiseAngle = Math.sin(p.uvX * 10 + p.uvY * 10 + elapsed * 0.85) * 0.45;
        const rot = angle + noiseAngle;

        // Color interpolation matching MainParticlesComponent
        const colorWave =
          (Math.sin(p.uvX * 2.4 + p.uvY * 2.1 + elapsed * 0.55 + p.seed1 * 2.0) + 1) * 0.5;

        let rCol = 113;
        let gCol = 137;
        let bCol = 255;

        if (variant === "download") {
          // Dark download ring palette (#7189ff -> #3074f9 -> #a6b8ff)
          rCol = Math.round(48 + colorWave * 95);
          gCol = Math.round(116 + colorWave * 55);
          bCol = 252;
        } else {
          // Hero Antigravity spectrum (#2c64ed -> #7189ff -> #f84242 -> #ffcf03)
          if (colorWave < 0.52) {
            const k = colorWave / 0.52;
            rCol = Math.round(44 + k * (113 - 44));
            gCol = Math.round(100 + k * (137 - 100));
            bCol = Math.round(237 + k * (255 - 237));
          } else if (colorWave < 0.8) {
            const k = (colorWave - 0.52) / 0.28;
            rCol = Math.round(113 + k * (248 - 113));
            gCol = Math.round(137 + k * (66 - 137));
            bCol = Math.round(255 + k * (66 - 255));
          } else {
            const k = (colorWave - 0.8) / 0.2;
            rCol = Math.round(248 + k * (255 - 248));
            gCol = Math.round(66 + k * (207 - 66));
            bCol = Math.round(66 + k * (3 - 66));
          }
        }

        const alpha = Math.min(
          0.92,
          Math.max(0.08, (p.scale - 0.1) * (variant === "download" ? 0.85 : 0.78))
        );
        if (alpha < 0.05) continue;

        const pillLen = Math.max(2.2, p.scale * 7.2);
        const pillThick = Math.max(1.3, p.scale * 2.9);

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(rot);
        ctx.fillStyle = `rgba(${rCol}, ${gCol}, ${bCol}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.roundRect(-pillLen * 0.5, -pillThick * 0.5, pillLen, pillThick, pillThick * 0.5);
        ctx.fill();
        ctx.restore();
      }
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [variant]);

  return (
    <div
      className={`main-particles-component-section ${className}`}
      data-main-particles-component
      aria-hidden="true"
    >
      <div className="main-particles-container" data-container>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

interface MorphParticle {
  baseX: number;
  baseY: number;
  targetX: number;
  targetY: number;
  x: number;
  y: number;
  seed: number;
  color: string;
}

export function MorphingSolutionParticles({
  shape,
  hovered,
}: {
  shape: "individual" | "cube";
  hovered: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hoveredRef = useRef(hovered);

  useEffect(() => {
    hoveredRef.current = hovered;
  }, [hovered]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId = 0;
    let hoverBlend = 0;

    const palette = ["#676A72", "#8E939E", "#346BF1", "#FF4641"];
    const count = 340;
    const particles: MorphParticle[] = [];

    for (let i = 0; i < count; i++) {
      const s1 = Math.sin(i * 91.7) * 43758.5453;
      const s2 = Math.sin(i * 213.3) * 43758.5453;
      const rx = (s1 - Math.floor(s1)) * 2 - 1;
      const ry = (s2 - Math.floor(s2)) * 2 - 1;

      let tx = rx * 0.4;
      let ty = ry * 0.4;

      if (shape === "individual") {
        // Person silhouette: head circle at (0, -0.25) radius 0.16, shoulders arch below (0, 0.24)
        if (i < count * 0.36) {
          const ang = (i / (count * 0.36)) * Math.PI * 2;
          const rad = 0.15 * Math.sqrt((i % 7) / 6 + 0.15);
          tx = Math.cos(ang) * rad;
          ty = -0.24 + Math.sin(ang) * rad;
        } else {
          const k = (i - count * 0.36) / (count * 0.64);
          const ang = Math.PI + k * Math.PI;
          const layer = 0.55 + ((i % 9) / 8) * 0.45;
          tx = Math.cos(ang) * 0.34 * layer;
          ty = 0.36 + Math.sin(ang) * 0.34 * layer;
        }
      } else {
        // Isometric hexagon cube outline + internal Y edges
        const seg = i % 9;
        const t = ((i * 17) % 100) / 100;
        const R = 0.36;
        const verts = Array.from({ length: 6 }, (_, idx) => {
          const a = -Math.PI / 2 + (idx * Math.PI) / 3;
          return { x: Math.cos(a) * R, y: Math.sin(a) * R };
        });
        if (seg < 6) {
          const v1 = verts[seg];
          const v2 = verts[(seg + 1) % 6];
          tx = v1.x + (v2.x - v1.x) * t;
          ty = v1.y + (v2.y - v1.y) * t;
        } else {
          const vIdx = (seg - 6) * 2 + 1;
          const v = verts[vIdx % 6];
          tx = v.x * t;
          ty = v.y * t;
        }
        tx += (rx * 0.025);
        ty += (ry * 0.025);
      }

      particles.push({
        baseX: rx * 0.88,
        baseY: ry * 0.82,
        targetX: tx,
        targetY: ty,
        x: rx * 0.88,
        y: ry * 0.82,
        seed: i * 0.37,
        color: palette[i % palette.length],
      });
    }

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth || 540;
      height = parent.clientHeight || 540;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });

    const startTime = performance.now();
    const render = (now: number) => {
      rafId = requestAnimationFrame(render);
      const t = (now - startTime) * 0.001;
      // Subtle auto-pulse if not hovered so the icon silhouette breathes gently, and snaps to full 1.0 when hovered
      const autoPulse = (Math.sin(t * 0.9 + (shape === "cube" ? 1.5 : 0)) + 1) * 0.18;
      const goal = hoveredRef.current ? 1 : autoPulse;
      hoverBlend += (goal - hoverBlend) * 0.07;

      ctx.clearRect(0, 0, width, height);
      const cx = width * 0.5;
      const cy = height * 0.5;
      const minDim = Math.min(width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const driftX = Math.sin(t * 0.8 + p.seed) * 0.025;
        const driftY = Math.cos(t * 0.7 + p.seed * 1.3) * 0.025;

        const gx =
          (p.baseX + driftX) * (1 - hoverBlend) +
          (p.targetX + driftX * 0.25) * hoverBlend;
        const gy =
          (p.baseY + driftY) * (1 - hoverBlend) +
          (p.targetY + driftY * 0.25) * hoverBlend;

        p.x += (gx - p.x) * 0.14;
        p.y += (gy - p.y) * 0.14;

        const sx = cx + p.x * (minDim * 0.52);
        const sy = cy + p.y * (minDim * 0.52);

        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.35 + hoverBlend * 0.5;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.8 + hoverBlend * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [shape]);

  return (
    <div
      className="morphing-particles-component-section morphing-particles"
      data-morphing-particles-component
      aria-hidden="true"
    >
      <div className="morphing-particles-container" data-container>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
