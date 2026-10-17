"use client";

import { uiText } from "@/i18n/ui";
import type { Locale } from "@/i18n/config";
import Image from "next/image";
import { useState } from "react";

export function ProductPreview({ locale }: { locale: Locale }) {
  const [map, setMap] = useState(false);

  return (
    <div
      className="video-wrapper"
      data-video-wrapper
      role="button"
      tabIndex={0}
      aria-label={uiText(locale, "Toggle network map view", "Ağ haritası görünümünü değiştir")}
      onClick={() => setMap((prev) => !prev)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setMap((prev) => !prev);
        }
      }}
    >
      <div className="custom-cursor" data-cursor>
        <div className="cursor-content">
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
          <span className="call-to-action">
            {map
              ? uiText(locale, "Scan", "Tarama")
              : uiText(locale, "Network map", "Ağ haritası")}
          </span>
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
        src={map ? "/scanner-v43-map.png" : "/scanner-v43-preview.png"}
        width={1920}
        height={1080}
        sizes="(max-width: 1280px) 100vw, 1440px"
        alt={uiText(
          locale,
          "IPScans+ application interface with example devices",
          "Örnek cihazlarla IPScans+ uygulama arayüzü"
        )}
        className="landing-video"
        priority
      />
    </div>
  );
}
