import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 6,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 64 64">
          <polygon
            points="32,4 56,18 56,46 32,60 8,46 8,18"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="5"
          />
          <circle cx="32" cy="32" r="9" fill="#FFFFFF" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
