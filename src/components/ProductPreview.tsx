"use client";

import { uiText } from "@/i18n/ui";
import type { Locale } from "@/i18n/config";
import Image from "next/image";
import { useState } from "react";

export function ProductPreview({ locale }: { locale: Locale }) {
  const slides = [
    {
      id: "scanner",
      label: uiText(locale, "IPscans+ · Scan", "IPscans+ · Tarama"),
      src: "/scanner-v43-preview.png",
      alt: uiText(
        locale,
        "IPscans+ network discovery workspace",
        "IPscans+ ağ keşfi çalışma alanı"
      ),
    },
    {
      id: "ipcast",
      label: uiText(locale, "IPCast · Remote Desktop", "IPCast · Uzak Masaüstü"),
      src: "/ipcast-v25-preview.png",
      alt: uiText(
        locale,
        "IPCast remote desktop and live streaming interface",
        "IPCast uzak masaüstü ve canlı yayın arayüzü"
      ),
    },
    {
      id: "lpr",
      label: uiText(locale, "LPR Pro · Plate Recognition", "LPR Pro · Plaka Tanıma"),
      src: "/lpr-pro-preview.png",
      alt: uiText(
        locale,
        "IPScans LPR Pro 1.0.0 operator workspace",
        "IPScans LPR Pro 1.0.0 operatör çalışma alanı"
      ),
    },
    {
      id: "web",
      label: uiText(locale, "Browser Diagnostics", "Web Tanılama Araçları"),
      src: "/web-tools-preview.png",
      alt: uiText(
        locale,
        "IPScans browser diagnostics suite",
        "IPScans tarayıcı tanılama araçları"
      ),
    },
  ];

  const [activeIndex, setActiveIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const current = slides[activeIndex];
  const nextSlide = slides[(activeIndex + 1) % slides.length];

  return (
    <div className="hero-media-stage">
      <div
        className="video-wrapper"
        data-video-wrapper
        role="button"
        tabIndex={0}
        aria-label={uiText(locale, "Switch application preview", "Uygulama görünümünü değiştir")}
        onClick={() => setActiveIndex((prev) => (prev + 1) % slides.length)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setCursorPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }}
        onMouseLeave={() => setCursorPos(null)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setActiveIndex((prev) => (prev + 1) % slides.length);
          }
        }}
      >
        <div
          className="custom-cursor"
          data-cursor
          style={
            cursorPos
              ? {
                  left: `${cursorPos.x}px`,
                  top: `${cursorPos.y}px`,
                  opacity: 1,
                }
              : undefined
          }
        >
          <div className="cursor-content">
            <svg
              viewBox="0 -960 960 960"
              width="20px"
              height="20px"
              fill="currentColor"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M320-200v-560l440 280-440 280Z" />
            </svg>
            <span className="call-to-action">{nextSlide.label}</span>
          </div>
        </div>

        <div className="video-control-button" translate="no">
          <svg
            viewBox="0 -960 960 960"
            width="24px"
            height="24px"
            fill="currentColor"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M320-200v-560l440 280-440 280Z" />
          </svg>
        </div>

        <Image
          src={current.src}
          width={1440}
          height={900}
          sizes="(max-width: 1280px) 100vw, 1440px"
          alt={current.alt}
          className="landing-video"
          priority
        />
      </div>

      <div
        className="hero-surface-pills"
        role="tablist"
        aria-label={uiText(locale, "Application surfaces", "Uygulama yüzeyleri")}
      >
        {slides.map((slide, idx) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={idx === activeIndex}
            className={`newsletter-topic-pill ${idx === activeIndex ? "selected" : ""}`}
            onClick={() => setActiveIndex(idx)}
          >
            <span>{slide.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
