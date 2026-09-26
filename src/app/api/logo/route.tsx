import { ImageResponse } from "next/og";

export const runtime = "nodejs";

// Square, opaque dark-background render of the (all-white) logo mark.
// Referenced from Organization JSON-LD — a transparent/white-on-white SVG
// would be invisible to Google's logo indexing, this guarantees contrast.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
        }}
      >
        <svg width="360" height="360" viewBox="0 0 64 64">
          <polygon
            points="32,4 56,18 56,46 32,60 8,46 8,18"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
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
    { width: 512, height: 512 }
  );
}
