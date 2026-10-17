"use client";

import { useEffect, useRef } from "react";

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

interface RingParticle {
  uvX: number; // -1.06..1.06
  uvY: number; // -1.06..1.06
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
  variant?: "hero" | "download" | "subpage";
  density?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId = 0;
    let isVisible = true;

    // Wide, homogeneous Poisson-jittered grid covering the full viewport [-1.06, 1.06]
    const cols = variant === "subpage" ? 38 : 48;
    const rows = variant === "subpage" ? 16 : 30;
    const particles: RingParticle[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const jx = (Math.sin(r * 127.1 + c * 311.7) * 43758.5453) % 1;
        const jy = (Math.sin(r * 269.5 + c * 183.3) * 43758.5453) % 1;
        const uvX = (((c + 0.5 + (jx - 0.5) * 0.78) / cols) * 2 - 1) * 1.05;
        const uvY = (((r + 0.5 + (jy - 0.5) * 0.78) / rows) * 2 - 1) * 1.05;
        particles.push({
          uvX,
          uvY,
          curX: uvX,
          curY: uvY,
          scale: 0.42,
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
      height = parent.clientHeight || window.innerHeight || 760;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      if (nx >= -1.15 && nx <= 1.15 && ny >= -1.15 && ny <= 1.15) {
        pointer.x = nx * 0.78;
        pointer.y = ny * 0.75;
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
      ctx.lineCap = "round";

      // Wide, fluid autonomous figure-8 drift across the viewport
      const driftX =
        Math.sin(elapsed * 0.52 + 1.2) * 0.34 +
        Math.cos(elapsed * 0.29) * 0.14;
      const driftY =
        Math.cos(elapsed * 0.61 + 0.7) * 0.24 +
        Math.sin(elapsed * 0.37) * 0.1;
      const targetX = pointer.active ? pointer.x + driftX * 0.25 : driftX;
      const targetY = pointer.active ? pointer.y + driftY * 0.25 : driftY;

      ringPos.x += (targetX - ringPos.x) * (pointer.active ? 0.055 : 0.025);
      ringPos.y += (targetY - ringPos.y) * (pointer.active ? 0.055 : 0.025);

      const aspect = width / Math.max(1, height);
      // Wide outer ring + inner harmonic ring so particles fill the entire screen homogeneously
      const ringRadius =
        (variant === "download" ? 0.72 : variant === "subpage" ? 0.78 : 0.68) +
        Math.sin(elapsed * 0.85) * 0.06 +
        Math.cos(elapsed * 1.9) * 0.03;
      const innerRadius =
        0.34 + Math.cos(elapsed * 0.72 + 1.1) * 0.05;

      const ringWidth = variant === "download" ? 0.44 : 0.42;
      const ringWidth2 = variant === "download" ? 0.24 : 0.22;
      const ringDisplacement = variant === "download" ? 0.15 : 0.19;

      const halfW = width * 0.5;
      const halfH = height * 0.5;
      const aspectScaleX = aspect > 1 ? 0.92 : aspect;
      const aspectScaleY = aspect > 1 ? 1 / Math.min(aspect, 1.45) : 1;
      const time = elapsed * 0.55;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Homogeneous ambient wave displacement across the full screen
        const waveX =
          Math.sin(p.uvX * 5.2 + time * 2.6 + p.seed1 * 4.0) * 0.024 +
          Math.cos(p.uvY * 4.4 - time * 1.9) * 0.016;
        const waveY =
          Math.cos(p.uvY * 5.2 + time * 2.2 + p.seed2 * 4.0) * 0.024 +
          Math.sin(p.uvX * 4.4 + time * 2.0) * 0.016;

        const dx = (p.uvX + waveX - ringPos.x) * aspectScaleX;
        const dy = (p.uvY + waveY - ringPos.y) * aspectScaleY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const noise0 = Math.sin(p.uvX * 4.5 + p.uvY * 4.5 + time * 1.6) * 0.028;
        const dist1 = dist + noise0;

        // Outer wide ring wave
        let t1 =
          smoothstep(ringRadius - ringWidth * 1.6, ringRadius, dist) -
          smoothstep(ringRadius, ringRadius + ringWidth * 1.25, dist1);
        let t2 =
          smoothstep(ringRadius - ringWidth2 * 1.5, ringRadius, dist) -
          smoothstep(ringRadius, ringRadius + ringWidth2 * 1.15, dist1);

        // Inner harmonic wave so the interior and edges both stay alive and balanced
        let tInner =
          smoothstep(innerRadius - 0.26, innerRadius, dist) -
          smoothstep(innerRadius, innerRadius + 0.28, dist1);

        // Global traveling field wave across [-1, 1] x [-1, 1]
        const globalField =
          (Math.sin(p.uvX * 3.1 - p.uvY * 2.4 + time * 1.7 + p.seed1 * 2.2) + 1) * 0.5;

        t1 = Math.max(0, t1);
        t2 = Math.max(0, t2);
        tInner = Math.max(0, tInner);

        let targetScale =
          0.34 +
          globalField * 0.26 +
          t1 * 0.55 +
          Math.pow(t2, 1.8) * 1.15 +
          tInner * 0.48;

        targetScale = Math.max(0.28, Math.min(1.42, targetScale));
        p.scale += (targetScale - p.scale) * 0.16;

        const push = (Math.pow(t2, 0.8) + tInner * 0.45) * ringDisplacement;
        const angle = Math.atan2(dy, dx);
        const targetPosX = p.uvX + waveX + Math.cos(angle) * push * 0.32;
        const targetPosY = p.uvY + waveY + Math.sin(angle) * push * 0.32;

        p.curX += (targetPosX - p.curX) * 0.2;
        p.curY += (targetPosY - p.curY) * 0.2;

        const sx = halfW + p.curX * halfW;
        const sy = halfH + p.curY * halfH;

        // Tangential / radial flow angle with smooth curl noise
        const flowAngle =
          Math.sin(p.uvX * 4.2 + time * 1.4) * 0.55 +
          Math.cos(p.uvY * 4.2 - time * 1.2) * 0.55;
        const rot = angle + flowAngle;

        // Color interpolation matching Google Antigravity's particle spectrum
        const colorWave =
          (Math.sin(p.uvX * 2.1 + p.uvY * 1.9 + elapsed * 0.5 + p.seed1 * 2.5) + 1) * 0.5;

        let rCol = 113;
        let gCol = 137;
        let bCol = 255;

        if (variant === "download") {
          rCol = Math.round(56 + colorWave * 98);
          gCol = Math.round(118 + colorWave * 58);
          bCol = 255;
        } else {
          // Hero & Subpage Antigravity spectrum (#2c64ed -> #7189ff -> #f84242 -> #ffcf03)
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

        const baseOpacity = variant === "subpage" ? 0.52 : variant === "download" ? 0.82 : 0.86;
        const alpha = Math.min(
          0.92,
          Math.max(0.18, (p.scale - 0.08) * baseOpacity)
        );

        const pillLen = Math.max(3.2, p.scale * 7.6);
        const pillThick = Math.max(1.7, p.scale * 3.0);
        const halfSeg = Math.max(0.6, (pillLen - pillThick) * 0.5);
        const cosR = Math.cos(rot) * halfSeg;
        const sinR = Math.sin(rot) * halfSeg;

        ctx.strokeStyle = `rgba(${rCol}, ${gCol}, ${bCol}, ${alpha.toFixed(2)})`;
        ctx.lineWidth = pillThick;
        ctx.beginPath();
        ctx.moveTo(sx - cosR, sy - sinR);
        ctx.lineTo(sx + cosR, sy + sinR);
        ctx.stroke();
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
        tx += rx * 0.025;
        ty += ry * 0.025;
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
