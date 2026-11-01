import type { NextConfig } from "next";
import path from "node:path";

const RELEASE_BASE =
  "https://github.com/demiirrr25-create/ipscans-depo/releases/download/desktop-audit-2026.11.01-r2";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/IPscans-Plus.exe", destination: `${RELEASE_BASE}/IPscans-Plus.exe`, permanent: false },
      { source: "/ipscans-network-scanner.exe", destination: `${RELEASE_BASE}/ipscans-network-scanner.exe`, permanent: false },
      { source: "/ipscans-network-health-pro.exe", destination: `${RELEASE_BASE}/ipscans-network-health-pro.exe`, permanent: false },
      { source: "/IPScans-Sentinel.exe", destination: `${RELEASE_BASE}/IPScans-Sentinel.exe`, permanent: false },
      { source: "/IPCast.exe", destination: `${RELEASE_BASE}/IPCast.exe`, permanent: false },
      { source: "/IPScans-LPR-Pro.exe", destination: `${RELEASE_BASE}/IPScans-LPR-Pro.exe`, permanent: false },
      { source: "/IPScans-Cortex.exe", destination: `${RELEASE_BASE}/IPScans-Cortex.exe`, permanent: false },
      { source: "/CortexAdmin.exe", destination: `${RELEASE_BASE}/CortexAdmin.exe`, permanent: false },
    ];
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
