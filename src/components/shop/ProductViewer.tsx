"use client";

import { useRef, useState } from "react";

/**
 * Drag-to-rotate product viewer. Placeholder for a future GLTF/R3F model —
 * keeps the same container/interaction contract so a real 3D canvas can drop in later.
 */
export function ProductViewer({ badge }: { badge?: string }) {
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragging = useRef(false);
  const lastX = useRef(0);

  function onPointerDown(e: React.PointerEvent) {
    dragging.current = true;
    setIsDragging(true);
    lastX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const delta = e.clientX - lastX.current;
    lastX.current = e.clientX;
    setRotation((r) => r + delta * 0.6);
  }
  function onPointerUp() {
    dragging.current = false;
    setIsDragging(false);
  }

  return (
    <div
      className="relative aspect-square w-full cursor-grab select-none overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] active:cursor-grabbing"
      style={{ perspective: "900px" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_30%,rgba(0,194,255,0.12),transparent)]" />
      {badge && (
        <span className="absolute left-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-black">
          {badge}
        </span>
      )}
      <div
        className="animate-float flex h-full w-full items-center justify-center"
        style={{
          transform: `rotateY(${rotation}deg)`,
          transformStyle: "preserve-3d",
          transition: isDragging ? "none" : "transform 0.4s ease-out",
        }}
      >
        <svg
          width="55%"
          height="55%"
          viewBox="0 0 200 200"
          fill="none"
          className="drop-shadow-[0_20px_40px_rgba(0,194,255,0.25)]"
        >
          <circle cx="100" cy="100" r="70" fill="#111318" stroke="#00C2FF" strokeWidth="2" />
          <circle cx="100" cy="100" r="46" fill="#0A0B0D" stroke="#00F5A0" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="24" fill="#00C2FF" opacity="0.15" />
          <circle cx="100" cy="100" r="10" fill="#00C2FF" />
          <rect x="86" y="18" width="28" height="14" rx="4" fill="#00F5A0" opacity="0.7" />
        </svg>
      </div>
      <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-neutral-500">
        ← sürükle / drag →
      </p>
    </div>
  );
}
