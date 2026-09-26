import { ImageResponse } from "next/og";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = isLocale(locale) ? getDictionary(locale) : getDictionary("en");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <svg width="96" height="96" viewBox="0 0 64 64">
          <polygon
            points="32,4 56,18 56,46 32,60 8,46 8,18"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
          />
          <circle cx="32" cy="32" r="9" fill="#FFFFFF" />
        </svg>
        <div style={{ marginTop: 28, fontSize: 64, fontWeight: 700, letterSpacing: -1 }}>
          ipscans
        </div>
        <div style={{ marginTop: 12, fontSize: 28, color: "#a3a3a3", maxWidth: 900, textAlign: "center" }}>
          {dict.meta.description}
        </div>
      </div>
    ),
    { ...size }
  );
}
