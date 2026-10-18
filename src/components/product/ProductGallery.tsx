"use client";

import Image from "next/image";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/ds/Icon";
import type { GalleryItemCopy } from "./product-copy";

export function ProductGallery({
  items,
  prevLabel,
  nextLabel,
  tablistLabel,
}: {
  items: GalleryItemCopy[];
  prevLabel: string;
  nextLabel: string;
  tablistLabel: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (items.length === 0) return null;

  const safeIndex = activeIndex < items.length ? activeIndex : 0;
  const current = items[safeIndex];

  const selectIndex = (next: number, focusTab = false) => {
    const normalized = ((next % items.length) + items.length) % items.length;
    setActiveIndex(normalized);
    if (focusTab) {
      tabRefs.current[normalized]?.focus();
    }
  };

  const onTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const isRtl =
      typeof document !== "undefined" &&
      document.documentElement.dir === "rtl";
    const forwardKey = isRtl ? "ArrowLeft" : "ArrowRight";
    const backwardKey = isRtl ? "ArrowRight" : "ArrowLeft";

    if (e.key === forwardKey) {
      e.preventDefault();
      selectIndex(safeIndex + 1, true);
    } else if (e.key === backwardKey) {
      e.preventDefault();
      selectIndex(safeIndex - 1, true);
    } else if (e.key === "Home") {
      e.preventDefault();
      selectIndex(0, true);
    } else if (e.key === "End") {
      e.preventDefault();
      selectIndex(items.length - 1, true);
    }
  };

  return (
    <div>
      {/* Controls bar: accessible tablist + prev/next buttons */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label={tablistLabel}
          onKeyDown={onTabKeyDown}
          className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-line bg-surface p-1.5 shadow-soft"
        >
          {items.map((item, idx) => {
            const isActive = idx === safeIndex;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  tabRefs.current[idx] = el;
                }}
                id={`${baseId}-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`${baseId}-panel-${item.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => selectIndex(idx)}
                className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-[0.9rem] font-medium transition-all duration-300 ease-out-expo cursor-pointer ${
                  isActive
                    ? "bg-ink text-surface shadow-soft"
                    : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                }`}
              >
                <span
                  className={`ds-mono text-xs ${
                    isActive ? "text-surface/70" : "text-ink-3"
                  }`}
                >
                  0{idx + 1}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => selectIndex(safeIndex - 1)}
            aria-label={prevLabel}
            className="btn btn-secondary btn-sm btn-icon"
          >
            <Icon name="arrowRight" size={16} className="rotate-180 rtl-flip" />
          </button>
          <span className="ds-mono ds-tabular px-2 text-xs text-ink-3">
            {safeIndex + 1} / {items.length}
          </span>
          <button
            type="button"
            onClick={() => selectIndex(safeIndex + 1)}
            aria-label={nextLabel}
            className="btn btn-secondary btn-sm btn-icon"
          >
            <Icon name="arrowRight" size={16} className="rtl-flip" />
          </button>
        </div>
      </div>

      {/* Framed real screenshot stage with smooth crossfade */}
      <div
        id={`${baseId}-panel-${current.id}`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${current.id}`}
      >
        <figure>
          <div className="overflow-hidden rounded-xl border border-line bg-surface p-2 shadow-float sm:p-3">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[22px] bg-stage">
              {items.map((item, idx) => {
                const isActive = idx === safeIndex;
                return (
                  <div
                    key={item.id}
                    aria-hidden={!isActive}
                    className={`absolute inset-0 transition-[opacity,transform] duration-500 ease-out-expo ${
                      isActive
                        ? "z-10 scale-100 opacity-100"
                        : "pointer-events-none z-0 scale-[0.985] opacity-0"
                    }`}
                  >
                    <Image
                      src={item.src}
                      alt={item.title}
                      width={1440}
                      height={900}
                      priority={idx === 0}
                      sizes="(min-width: 1320px) 1240px, 94vw"
                      className={`h-full w-full object-cover object-top transition-transform duration-700 ease-out-expo ${
                        item.imageClassName ?? ""
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <figcaption className="mt-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-baseline">
            <p className="ds-h4 text-ink">{current.title}</p>
            <p className="ds-body max-w-[680px] text-ink-2">{current.caption}</p>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
