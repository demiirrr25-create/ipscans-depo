import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/IPScans-Sentinel.exe", destination: "/desktop/tr.html#sentinel", permanent: false },
      { source: "/ipscans-network-health-pro.exe", destination: "/desktop/tr.html#health", permanent: false },
      { source: "/ipscans-network-scanner.exe", destination: "/desktop/tr.html#cli", permanent: false },
    ];
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Devcontainer forwards the dev server through 127.0.0.1, which Next.js
  // otherwise treats as a cross-origin request and blocks.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
