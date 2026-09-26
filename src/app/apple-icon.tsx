import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0B0D",
        }}
      >
        <svg width="130" height="130" viewBox="0 0 64 64">
          <polygon
            points="32,4 56,18 56,46 32,60 8,46 8,18"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="4"
          />
          <g stroke="#FFFFFF" strokeWidth="2" opacity={0.9}>
            <line x1="32" y1="4" x2="32" y2="26" />
            <line x1="56" y1="18" x2="38" y2="29" />
            <line x1="56" y1="46" x2="38" y2="35" />
            <line x1="32" y1="60" x2="32" y2="38" />
            <line x1="8" y1="46" x2="26" y2="35" />
            <line x1="8" y1="18" x2="26" y2="29" />
          </g>
          <circle cx="32" cy="32" r="9" fill="#FFFFFF" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
