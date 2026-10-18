"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import type { Locale } from "@/i18n/config";
import { uiText } from "@/i18n/ui";

interface AppLiveDemoProps {
  appId: "scanner" | "ipcast" | "lpr-pro";
  appName: string;
  version: string;
  locale: Locale;
  videoSrc?: string;
}

export function AppLiveDemo({
  appId,
  appName,
  version,
  locale,
  videoSrc,
}: AppLiveDemoProps) {
  const isTr = locale === "tr";
  const [activeTab, setActiveTab] = useState<"scan" | "map" | "telemetry">("scan");
  const [isPlaying, setIsPlaying] = useState(true);
  const [scanProgress, setScanProgress] = useState(68);
  const [discoveredCount, setDiscoveredCount] = useState(6);
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scanner simulated devices
  const scannerDevices = [
    { ip: "192.168.1.1", name: "Gateway (UDM Pro)", vendor: "Ubiquiti Networks", mac: "74:83:C2:11:4F:90", ports: "80, 443, 22", ping: "0.6 ms", type: "Gateway", status: "Active" },
    { ip: "192.168.1.12", name: "Switch 24 PoE Gen2", vendor: "Ubiquiti Networks", mac: "74:83:C2:8A:2B:44", ports: "22, 161 (SNMP)", ping: "0.8 ms", type: "Switch", status: "Active" },
    { ip: "192.168.1.25", name: "MacBook Pro M3 Max", vendor: "Apple, Inc.", mac: "F0:18:98:C3:90:12", ports: "22, 5000", ping: "1.4 ms", type: "Workstation", status: "Active" },
    { ip: "192.168.1.42", name: "Axis P3245-V 4K Camera", vendor: "Axis Communications", mac: "AC:CC:8E:22:98:B1", ports: "80, 443, 554 (ONVIF)", ping: "2.1 ms", type: "IP Camera", status: "Streaming" },
    { ip: "192.168.1.65", name: "Synology DS923+ NAS", vendor: "Synology Inc.", mac: "00:11:32:FB:41:88", ports: "5000, 5001, 445 (SMB)", ping: "1.1 ms", type: "Storage", status: "Active" },
    { ip: "192.168.1.80", name: "Hikvision NVR 16-Channel", vendor: "Hikvision Digital", mac: "44:19:B6:5E:21:77", ports: "80, 8000, 554", ping: "1.9 ms", type: "NVR", status: "Recording" },
    { ip: "192.168.1.104", name: "Dell PowerEdge R650", vendor: "Dell Inc.", mac: "D4:F5:27:88:A1:04", ports: "22, 443, 3389", ping: "0.9 ms", type: "Server", status: "Online" },
  ];

  // LPR simulated detections
  const lprDetections = [
    { time: "13:42:08", plate: "34 BJK 1903", score: "99.4%", cam: "CAM-01 Entrance", gate: "GRANTED", color: "text-[#46D39A]" },
    { time: "13:41:52", plate: "06 ANK 2026", score: "98.7%", cam: "CAM-02 Exit", gate: "GRANTED", color: "text-[#46D39A]" },
    { time: "13:39:15", plate: "35 IZM 410", score: "97.2%", cam: "CAM-01 Entrance", gate: "REVIEW", color: "text-[#FFB800]" },
    { time: "13:36:40", plate: "16 BUR 99", score: "99.1%", cam: "CAM-01 Entrance", gate: "GRANTED", color: "text-[#46D39A]" },
  ];

  // Continuous subtle pulse animation loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          return 12;
        }
        return prev + 4;
      });
    }, 380);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative mx-auto w-full max-w-6xl my-8 overflow-hidden rounded-2xl border border-white/15 bg-[#080A0E] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] transition-all ${
        isFullscreen ? "p-6" : ""
      }`}
    >
      {/* 1. Sleek Window Titlebar Mockup */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/10 bg-[#0E1218] px-4 py-3 select-none">
        {/* Left: Window Dots & App Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-[#FF5F56]/80 transition-opacity hover:opacity-100" />
            <span className="h-3 w-3 rounded-full bg-[#FFBD2E]/80 transition-opacity hover:opacity-100" />
            <span className="h-3 w-3 rounded-full bg-[#27C93F]/80 transition-opacity hover:opacity-100" />
          </div>

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          <div className="flex items-center gap-2 font-mono text-xs text-neutral-300">
            <span className="font-semibold text-white">{appName}</span>
            <span className="text-neutral-500 font-normal">v{version}</span>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {isTr ? "CANLI SİMÜLASYON" : "LIVE SIMULATION"}
            </span>
          </div>
        </div>

        {/* Center: Interactive Tabs for Scanner */}
        {appId === "scanner" && (
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1 text-xs font-mono my-1 sm:my-0">
            <button
              type="button"
              onClick={() => setActiveTab("scan")}
              className={`rounded-md px-3 py-1 transition-all ${
                activeTab === "scan"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {isTr ? "Keşif Tablosu" : "Discovery"}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("map")}
              className={`rounded-md px-3 py-1 transition-all ${
                activeTab === "map"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {isTr ? "Topoloji Haritası" : "Topology Map"}
            </button>
          </div>
        )}

        {/* Right: Simulation Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? (isTr ? "Durdur" : "Pause") : (isTr ? "Oynat" : "Play")}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-mono text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <span>{isPlaying ? "⏸" : "▶"}</span>
            <span className="hidden sm:inline">{isPlaying ? (isTr ? "Durdur" : "Pause") : (isTr ? "Devam" : "Resume")}</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isTr ? "Tam Ekran" : "Fullscreen"}
            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </div>
      </div>

      {/* 2. Main Viewport: Video or Interactive Simulation */}
      {videoSrc ? (
        <div className="relative aspect-video w-full bg-black">
          <video
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="relative min-h-[460px] bg-[#0A0D12] p-5 sm:p-7 select-none">
          {/* ----------------- IPscans+ (Scanner) SIMULATION ----------------- */}
          {appId === "scanner" && (
            <div>
              {/* Scan Command Bar Mockup */}
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#10141C] p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-neutral-400">
                    Wi-Fi 6 / 192.168.1.100
                  </span>
                  <span className="text-white font-semibold px-1">
                    192.168.1.1 - 192.168.1.254
                  </span>
                  <span className="text-neutral-500">
                    ({isTr ? "254 hedef" : "254 targets"})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-2 w-28 sm:w-36 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-[#00F0FF] to-[#46D39A] transition-all duration-300"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-[#00F0FF] font-medium min-w-[38px]">
                    {scanProgress}%
                  </span>
                </div>
              </div>

              {/* View 1: Discovery Table */}
              {activeTab === "scan" && (
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0C1016]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="border-b border-white/10 bg-[#121620] text-neutral-400">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold text-white">IP Address</th>
                        <th className="py-2.5 px-4 font-semibold text-white">Device Name</th>
                        <th className="py-2.5 px-4 font-semibold text-white">Vendor</th>
                        <th className="py-2.5 px-4 font-semibold text-white hidden md:table-cell">MAC Address</th>
                        <th className="py-2.5 px-4 font-semibold text-white">Open Ports</th>
                        <th className="py-2.5 px-4 font-semibold text-white text-right">RTT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {scannerDevices.map((dev, idx) => {
                        const isSelected = selectedDevice === idx;
                        return (
                          <tr
                            key={dev.ip}
                            onClick={() => setSelectedDevice(idx)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-white/10 text-white"
                                : "hover:bg-white/[0.04] text-neutral-300"
                            }`}
                          >
                            <td className="py-2.5 px-4 font-medium text-[#00F0FF] flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#46D39A]" />
                              {dev.ip}
                            </td>
                            <td className="py-2.5 px-4 text-white font-medium">{dev.name}</td>
                            <td className="py-2.5 px-4 text-neutral-400">{dev.vendor}</td>
                            <td className="py-2.5 px-4 text-neutral-500 hidden md:table-cell">{dev.mac}</td>
                            <td className="py-2.5 px-4">
                              <span className="rounded bg-white/5 px-2 py-0.5 text-neutral-300 border border-white/10">
                                {dev.ports}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right text-emerald-400 font-semibold">{dev.ping}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* View 2: Topology Map */}
              {activeTab === "map" && (
                <div className="relative h-[340px] w-full rounded-xl border border-white/10 bg-[#07090D] p-4 overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 bg-[radial-gradient(#1A2230_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
                  
                  {/* Visual Node Graph */}
                  <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-xl">
                    {/* Gateway */}
                    <div className="flex items-center gap-3 rounded-xl border border-[#00F0FF]/40 bg-[#101724] px-4 py-2 text-xs font-mono text-white shadow-[0_0_20px_rgba(0,240,255,0.15)]">
                      <span className="text-lg">🌐</span>
                      <div>
                        <div className="font-semibold text-[#00F0FF]">Gateway (192.168.1.1)</div>
                        <div className="text-[10px] text-neutral-400">UDM-Pro · 10Gbps SFP+ Uplink</div>
                      </div>
                    </div>

                    <div className="h-8 w-px bg-gradient-to-b from-[#00F0FF] to-white/40" />

                    {/* Switch */}
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-[#101A18] px-4 py-2 text-xs font-mono text-white shadow-[0_0_20px_rgba(70,211,154,0.15)]">
                      <span className="text-lg">🔀</span>
                      <div>
                        <div className="font-semibold text-emerald-400">Core Switch (192.168.1.12)</div>
                        <div className="text-[10px] text-neutral-400">24-Port GbE PoE · Confirmed Adjacency</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 w-full text-center">
                      <div className="flex flex-col items-center">
                        <div className="h-6 w-px bg-white/20 mb-2" />
                        <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-[11px] font-mono text-neutral-200 w-full">
                          📹 4K Camera (Port 5)
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="h-6 w-px bg-white/20 mb-2" />
                        <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-[11px] font-mono text-neutral-200 w-full">
                          💻 Workstation (Port 8)
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="h-6 w-px bg-white/20 mb-2" />
                        <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-[11px] font-mono text-neutral-200 w-full">
                          🗄️ Storage NAS (Port 12)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status bar */}
              <div className="mt-4 flex flex-wrap items-center justify-between text-xs font-mono text-neutral-400">
                <div>
                  <span className="text-white font-semibold">{scannerDevices.length}</span>{" "}
                  {isTr ? "cihaz keşfedildi · Çift tıklayarak web arayüzüne erişin ↗" : "devices identified · Double-click row to open browser interface ↗"}
                </div>
                <div className="text-neutral-500">
                  {isTr ? "Adaptör: Realtek PCIe GbE · MTU 1500" : "Adapter: Realtek PCIe GbE · MTU 1500"}
                </div>
              </div>
            </div>
          )}

          {/* ----------------- IPCast SIMULATION ----------------- */}
          {appId === "ipcast" && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between rounded-xl border border-white/10 bg-[#10141C] p-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white font-semibold">{isTr ? "OTURUM BAĞLI" : "SESSION CONNECTED"}</span>
                  <span className="text-neutral-400">#IPC-740-912</span>
                </div>
                <div className="flex items-center gap-4 text-neutral-400">
                  <span>Latency: <strong className="text-emerald-400">2.6 ms</strong></span>
                  <span>FPS: <strong className="text-white">60 FPS Locked</strong></span>
                  <span>Bitrate: <strong className="text-cyan-400">42.8 Mbps</strong></span>
                </div>
              </div>

              {/* Simulated Remote Screen */}
              <div className="relative aspect-[16/9] w-full rounded-xl border border-white/15 bg-gradient-to-br from-[#121622] via-[#0E1016] to-[#0A0C10] p-6 overflow-hidden flex flex-col justify-between shadow-inner">
                <div className="flex justify-between items-center text-xs font-mono text-white/50">
                  <span>Remote: Windows 11 Pro Workstation</span>
                  <span className="rounded bg-black/40 px-2 py-1 text-white border border-white/10">Ultra-Low Latency Mode</span>
                </div>

                <div className="flex flex-col items-center justify-center my-auto text-center">
                  <div className="h-16 w-16 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 flex items-center justify-center text-3xl mb-3 shadow-[0_0_30px_rgba(0,240,255,0.2)]">
                    🖥️
                  </div>
                  <h4 className="font-semibold text-white text-base">Direct Peer-to-Peer 4K Display Stream</h4>
                  <p className="text-xs text-neutral-400 max-w-md mt-1">
                    {isTr
                      ? "Donanım hızlandırmalı D3D11 çözücü ve TLS 1.3 uçtan uca şifreleme aktif."
                      : "Hardware-accelerated D3D11 decoding & end-to-end TLS 1.3 encryption active."}
                  </p>
                </div>

                <div className="flex justify-between items-center text-xs font-mono text-neutral-500">
                  <span>Client: 3840 x 2160 @ 60Hz</span>
                  <span className="text-emerald-400">Zero Frame Drops (0.00%)</span>
                </div>
              </div>
            </div>
          )}

          {/* ----------------- LPR Pro SIMULATION ----------------- */}
          {appId === "lpr-pro" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Simulated Camera Feed */}
              <div className="relative aspect-[4/3] rounded-xl border border-white/15 bg-black p-4 flex flex-col justify-between overflow-hidden">
                <div className="flex justify-between text-xs font-mono text-neutral-400 z-10">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    CAM-01 / LIVE 1080p
                  </span>
                  <span>30 FPS · H.264</span>
                </div>

                {/* Bounding box on simulated plate */}
                <div className="mx-auto my-auto relative border-2 border-emerald-400 rounded-lg p-3 bg-emerald-500/10 backdrop-blur-xs shadow-[0_0_20px_rgba(70,211,154,0.3)]">
                  <span className="absolute -top-3 left-2 bg-emerald-500 text-black px-1.5 py-0.2 text-[9px] font-mono font-bold rounded">
                    OCR: 99.4%
                  </span>
                  <div className="font-mono text-2xl font-bold tracking-widest text-white px-4 py-1">
                    34 BJK 1903
                  </div>
                </div>

                <div className="flex justify-between text-[11px] font-mono text-neutral-400 z-10 border-t border-white/10 pt-2">
                  <span>Trigger: Optical Line #2</span>
                  <span className="text-emerald-400 font-semibold">RELAY: BARRIER OPEN</span>
                </div>
              </div>

              {/* Recent Detections Log */}
              <div className="flex flex-col rounded-xl border border-white/10 bg-[#0E1218] p-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3 text-xs font-mono font-semibold text-white">
                  <span>{isTr ? "Son Plaka Geçişleri" : "Recent Detections"}</span>
                  <span className="text-neutral-500 text-[11px]">Real-Time Event Stream</span>
                </div>

                <div className="space-y-2.5 overflow-y-auto max-h-[260px] text-xs font-mono">
                  {lprDetections.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] p-2.5 hover:bg-white/[0.06] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-neutral-500 text-[11px]">{d.time}</span>
                        <span className="font-bold text-white tracking-wider">{d.plate}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-neutral-400 text-[11px]">{d.score}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border border-current/20 ${d.color}`}>
                          {d.gate}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
