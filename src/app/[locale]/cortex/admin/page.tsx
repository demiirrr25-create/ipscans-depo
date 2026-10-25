"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type PlanTier = "PRO" | "PLUS" | "ULTRA";
type AdminView = "overview" | "topology" | "stations" | "licensing" | "audit";

interface CustomerNode {
  id: string;
  org: string;
  contact: string;
  plan: PlanTier;
  licenseKey: string;
  camerasUsed: number;
  camerasMax: number;
  rulesUsed: number;
  rulesMax: number;
  retentionDays: number;
  ollamaModel: string;
  telegramActive: boolean;
  status: "online" | "warning" | "suspended";
  issueNote: string;
  lastSeen: string;
}

interface AuditEntry {
  id: string;
  time: string;
  category: "license" | "intervention" | "diagnostics" | "security";
  severity: "info" | "warn" | "ok";
  target: string;
  message: string;
}

const PLAN_SPECS: Record<
  PlanTier,
  {
    label: string;
    camerasMax: number;
    rulesMax: number;
    retentionDays: number;
    priceNote: string;
    features: string[];
  }
> = {
  PRO: {
    label: "Cortex PRO",
    camerasMax: 4,
    rulesMax: 8,
    retentionDays: 7,
    priceNote: "4 Kamera · 8 Kural · 7 Gün Arşiv",
    features: [
      "22 Deterministik Yerel Kural + 3 Geçiş Kuralı",
      "8-Tutamaçlı ROI & Tripwire Stüdyosu",
      "Site ve Perakende Sektörel Paketleri",
      "Tek Yönlü Telegram Fotoğraflı Alarm",
    ],
  },
  PLUS: {
    label: "Cortex PLUS",
    camerasMax: 12,
    rulesMax: 32,
    retentionDays: 15,
    priceNote: "12 Kamera · 32 Kural · 15 Gün Arşiv",
    features: [
      "6 Cortex Pro Akıllı Takip Kuralı (Düşme, Unutulan Nesne, Tailgating, Loitering)",
      "42 Çoklu Ollama Görsel AI (VLM) Şablonu",
      "8 Sektörel Hazır Kurulum Paketi",
      "İki Yönlü Telegram Komuta Botu (@intelligentcortexbot)",
    ],
  },
  ULTRA: {
    label: "Cortex ULTRA",
    camerasMax: 32,
    rulesMax: 128,
    retentionDays: 30,
    priceNote: "32 Kamera · 128 Kural · 30 Gün Arşiv",
    features: [
      "Tam Ekran NVR Kamera Duvarı (1x1, 2x2, 3x3, 4x4) + Otomatik Tur",
      "Canlı Hareket Isı Haritası (Thermal Heatmap) & KVKK Maskeleme",
      "SHA-256 Adli Kanıt Paketi (.ZIP) & Kurumsal Denetim İzi",
      "Merkezi Yönetim Panelinden Uzaktan Teknik Müdahale & Kota Yönetimi",
    ],
  },
};

const LICENSE_SECRET = "IPScans-Cortex-2.0-Commercial-Root-2026";

async function generateCommercialLicenseKey(
  plan: PlanTier,
  orgName: string
): Promise<string> {
  const cleanOrg =
    orgName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6) || "CLIENT";
  const payload = `${plan}:${cleanOrg}:${LICENSE_SECRET}`;
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const enc = new TextEncoder().encode(payload);
    const hashBuf = await window.crypto.subtle.digest("SHA-256", enc);
    const hex = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 12)
      .toUpperCase();
    return `IPS-${plan}-${cleanOrg}-${hex}`;
  }
  return `IPS-${plan}-${cleanOrg}-9F8E7D6C5B4A`;
}

const INITIAL_CUSTOMERS: CustomerNode[] = [
  {
    id: "CUST-101",
    org: "Marmara Park Rezidans & Site Yönetimi",
    contact: "guvenlik@marmarapark.com.tr",
    plan: "ULTRA",
    licenseKey: "IPS-ULTRA-MARMAR-8A4F2C1E9D0B",
    camerasUsed: 18,
    camerasMax: 32,
    rulesUsed: 54,
    rulesMax: 128,
    retentionDays: 30,
    ollamaModel: "qwen2.5vl:7b",
    telegramActive: true,
    status: "online",
    issueNote: "Sorunsuz çalışıyor · 18 RTSP akışı aktif",
    lastSeen: "Az önce (Canlı)",
  },
  {
    id: "CUST-102",
    org: "Anadolu Organize Metal Sanayi A.Ş.",
    contact: "isg@anadolumetal.com",
    plan: "PLUS",
    licenseKey: "IPS-PLUS-ANADOL-3C9B1D4E7F2A",
    camerasUsed: 11,
    camerasMax: 12,
    rulesUsed: 29,
    rulesMax: 32,
    retentionDays: 15,
    ollamaModel: "gemma3:4b",
    telegramActive: true,
    status: "warning",
    issueNote:
      "Kamera #4 (Kaynak Atölyesi) RTSP zaman aşımı · Uzaktan sıfırlama önerilir",
    lastSeen: "2 dk önce",
  },
  {
    id: "CUST-103",
    org: "Kuzey Lojistik Antrepo & Soğuk Hava",
    contact: "operasyon@kuzeylojistik.net",
    plan: "PRO",
    licenseKey: "IPS-PRO-KUZEYL-5D1A8E3B9C4F",
    camerasUsed: 4,
    camerasMax: 4,
    rulesUsed: 8,
    rulesMax: 8,
    retentionDays: 7,
    ollamaModel: "qwen2.5vl:3b",
    telegramActive: false,
    status: "warning",
    issueNote: "PRO kamera ve kural kotası %100 doldu · PLUS yükseltme adayı",
    lastSeen: "5 dk önce",
  },
  {
    id: "CUST-104",
    org: "Nişantaşı Özel Cerrahi Tıp Merkezi",
    contact: "bt@nisantasitip.com",
    plan: "PLUS",
    licenseKey: "IPS-PLUS-NISANT-7E2D9A6C4B1F",
    camerasUsed: 8,
    camerasMax: 12,
    rulesUsed: 19,
    rulesMax: 32,
    retentionDays: 15,
    ollamaModel: "minicpm-v:8b",
    telegramActive: true,
    status: "online",
    issueNote: "KVKK gizlilik maskeleri ve düşme tespiti aktif",
    lastSeen: "1 dk önce",
  },
];

const INITIAL_AUDIT: AuditEntry[] = [
  {
    id: "AUD-904",
    time: "24.10.2026 15:40:12",
    category: "security",
    severity: "ok",
    target: "HMAC-SHA256 Root Authority",
    message: "Kriptografik kök anahtar ve yerel denetim zinciri doğrulandı.",
  },
  {
    id: "AUD-903",
    time: "24.10.2026 15:32:04",
    category: "diagnostics",
    severity: "warn",
    target: "CUST-102 · Anadolu Organize Metal",
    message: "Kamera #4 (Kaynak Atölyesi) RTSP gecikme uyarısı raporlandı.",
  },
  {
    id: "AUD-902",
    time: "24.10.2026 15:18:45",
    category: "license",
    severity: "info",
    target: "CUST-103 · Kuzey Lojistik",
    message: "PRO paket kanal ve kural kotası %100 eşiğine ulaştı.",
  },
  {
    id: "AUD-901",
    time: "24.10.2026 14:55:19",
    category: "intervention",
    severity: "ok",
    target: "CUST-101 · Marmara Park Rezidans",
    message: "18 RTSP akışı ve @intelligentcortexbot bildirim hattı senkronize edildi.",
  },
];

export default function CortexAdminPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [authenticated, setAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [authError, setAuthError] = useState("");

  const [activeView, setActiveView] = useState<AdminView>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [topoMode, setTopoMode] = useState<"3d" | "2d">("3d");
  const [autoOrbit, setAutoOrbit] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1.0);

  const [customers, setCustomers] = useState<CustomerNode[]>(INITIAL_CUSTOMERS);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>(INITIAL_AUDIT);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const [newOrg, setNewOrg] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newPlan, setNewPlan] = useState<PlanTier>("ULTRA");
  const [newModel, setNewModel] = useState("gemma3:4b");
  const [generatedKey, setGeneratedKey] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<string>("ALL");
  const [actionLog, setActionLog] = useState<string>(
    "Yönetim konsolu hazır. 3D altyapı sahnesinden veya listeden bir kurulum seçerek uzaktan müdahale edebilirsiniz."
  );
  const [localSyncStatus, setLocalSyncStatus] = useState<string>("127.0.0.1:8765 Hazır");
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [cmdkQuery, setCmdkQuery] = useState("");

  const loginCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const infraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const orbitRef = useRef({
    yaw: 0.42,
    pitch: 0.34,
    targetYaw: 0.42,
    targetPitch: 0.34,
    dragging: false,
    startX: 0,
    startY: 0,
    hoveredId: null as string | null,
    projected: [] as Array<{ id: string; sx: number; sy: number; r: number }>,
  });

  // Initialize IPScans Obsidian Dark Mode by default
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ipscans-theme");
      const resolved = saved === "light" ? "light" : "dark";
      setTheme(resolved);
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
    } catch {
      document.documentElement.dataset.theme = "dark";
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("ipscans-theme", next);
      document.documentElement.dataset.theme = next;
      document.documentElement.style.colorScheme = next;
      window.dispatchEvent(new CustomEvent("ipscans-theme-change", { detail: next }));
    } catch {}
  };

  // Global keyboard shortcuts (Ctrl+K Command Palette, Ctrl+B Sidebar, ESC Drawer/Modal)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdkOpen((v) => !v);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        const tag = (document.activeElement as HTMLElement | null)?.tagName;
        if (!["INPUT", "TEXTAREA", "SELECT"].includes(tag || "")) {
          e.preventDefault();
          setSidebarCollapsed((v) => !v);
        }
      } else if (e.key === "Escape") {
        if (cmdkOpen) setCmdkOpen(false);
        else if (selectedCustomerId) setSelectedCustomerId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cmdkOpen, selectedCustomerId]);

  // 3D Login Stage Canvas Effect
  useEffect(() => {
    if (authenticated) return;
    const canvas = loginCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const nodes = Array.from({ length: 24 }, (_, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / 24);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const rad = i < 10 ? 88 : 148;
      return {
        x: Math.cos(theta) * Math.sin(phi) * rad,
        y: Math.cos(phi) * rad * 0.82,
        z: Math.sin(theta) * Math.sin(phi) * rad,
        ring: i < 10 ? 1 : 2,
      };
    });

    const render = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, rect.width || 520);
      const h = Math.max(1, rect.height || 520);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (
        canvas.width !== Math.round(w * dpr) ||
        canvas.height !== Math.round(h * dpr)
      ) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h * 0.46;
      const yaw = reduced ? 0.4 : now * 0.00045;
      const pitch = 0.28 + (reduced ? 0 : Math.sin(now * 0.0007) * 0.06);
      const cosY = Math.cos(yaw),
        sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch),
        sinP = Math.sin(pitch);

      const project = (x: number, y: number, z: number) => {
        const rx = x * cosY - z * sinY;
        const rz1 = x * sinY + z * cosY;
        const ry = y * cosP - rz1 * sinP;
        const rz = y * sinP + rz1 * cosP;
        const scale = 500 / Math.max(160, 500 + rz + 220);
        return { sx: cx + rx * scale, sy: cy + ry * scale, scale, rz };
      };

      const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 210);
      glow.addColorStop(0, "rgba(76, 130, 255, 0.24)");
      glow.addColorStop(0.5, "rgba(0, 210, 255, 0.07)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, 210, 0, Math.PI * 2);
      ctx.fill();

      const proj = nodes.map((n) => ({ ...n, ...project(n.x, n.y, n.z) }));
      ctx.lineWidth = 1.1;
      proj.forEach((p, idx) => {
        ctx.strokeStyle =
          p.ring === 1
            ? "rgba(76, 130, 255, 0.34)"
            : "rgba(38, 208, 150, 0.22)";
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p.sx, p.sy);
        ctx.stroke();

        const next = proj[(idx + 3) % proj.length];
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.beginPath();
        ctx.moveTo(p.sx, p.sy);
        ctx.lineTo(next.sx, next.sy);
        ctx.stroke();
      });

      // Central 3D Cortex Core
      ctx.strokeStyle = "rgba(0, 210, 255, 0.65)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx, cy, 28, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#07080B";
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#4C82FF";
      ctx.stroke();

      proj.forEach((p, idx) => {
        ctx.fillStyle = idx % 3 === 0 ? "#26D096" : "#4C82FF";
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, Math.max(2.2, 4.2 * p.scale), 0, Math.PI * 2);
        ctx.fill();
      });

      if (!reduced) {
        raf = requestAnimationFrame(render);
      }
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [authenticated]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (filterPlan === "WARN" && c.status !== "warning") return false;
      if (
        filterPlan !== "ALL" &&
        filterPlan !== "WARN" &&
        c.plan !== filterPlan
      ) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.org.toLowerCase().includes(q) ||
        c.contact.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.licenseKey.toLowerCase().includes(q)
      );
    });
  }, [customers, filterPlan, searchQuery]);

  // 3D Multi-Installation Infrastructure Explorer Canvas Effect
  useEffect(() => {
    if (!authenticated || topoMode !== "3d") return;
    if (activeView !== "overview" && activeView !== "topology") return;
    const canvas = infraCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderLoop = (now: number) => {
      const st = orbitRef.current;
      if (autoOrbit && !st.dragging && !reduced) {
        st.targetYaw += 0.0032;
      }
      st.yaw += (st.targetYaw - st.yaw) * 0.12;
      st.pitch += (st.targetPitch - st.pitch) * 0.12;

      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, rect.width || 800);
      const h = Math.max(1, rect.height || 390);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (
        canvas.width !== Math.round(w * dpr) ||
        canvas.height !== Math.round(h * dpr)
      ) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const cosY = Math.cos(st.yaw),
        sinY = Math.sin(st.yaw);
      const cosP = Math.cos(st.pitch),
        sinP = Math.sin(st.pitch);
      const fov = 540 * zoomLevel;

      const project3D = (x: number, y: number, z: number) => {
        const rx = x * cosY - z * sinY;
        const rz1 = x * sinY + z * cosY;
        const ry = y * cosP - rz1 * sinP;
        const rz = y * sinP + rz1 * cosP;
        const scale = fov / Math.max(150, fov + rz + 300);
        return { sx: cx + rx * scale, sy: cy + ry * scale, rz, scale };
      };

      // Orbital reference rings
      [115, 195].forEach((rRing, rIdx) => {
        ctx.beginPath();
        for (let s = 0; s <= 60; s++) {
          const a = (s / 60) * Math.PI * 2;
          const pt = project3D(Math.cos(a) * rRing, 0, Math.sin(a) * rRing);
          if (s === 0) ctx.moveTo(pt.sx, pt.sy);
          else ctx.lineTo(pt.sx, pt.sy);
        }
        ctx.strokeStyle =
          rIdx === 0 ? "rgba(76, 130, 255, 0.18)" : "rgba(38, 208, 150, 0.14)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      const coreProj = project3D(0, 0, 0);
      const pulseT = ((now * 0.00055) % 1 + 1) % 1;

      const stationNodes = filteredCustomers.map((c, idx) => {
        const angle =
          (idx / Math.max(1, filteredCustomers.length)) * Math.PI * 2 -
          Math.PI / 4;
        const radius = c.plan === "ULTRA" ? 135 : c.plan === "PLUS" ? 175 : 210;
        const yOff = idx % 2 === 0 ? -24 : 24;
        const p = project3D(
          Math.cos(angle) * radius,
          yOff,
          Math.sin(angle) * radius
        );
        const color =
          c.status === "online"
            ? "#26D096"
            : c.status === "warning"
            ? "#F5A524"
            : "#F43F5E";
        return {
          ...c,
          sx: p.sx,
          sy: p.sy,
          rz: p.rz,
          scale: p.scale,
          r: Math.max(7, 11 * p.scale),
          color,
        };
      });

      // Draw links from Root Authority to stations
      stationNodes.forEach((stNode) => {
        ctx.save();
        if (stNode.status === "online") {
          ctx.strokeStyle = "rgba(38, 208, 150, 0.48)";
          ctx.lineWidth = 1.6;
          ctx.setLineDash([]);
        } else if (stNode.status === "warning") {
          ctx.strokeStyle = "rgba(245, 165, 36, 0.55)";
          ctx.lineWidth = 1.4;
          ctx.setLineDash([5, 4]);
        } else {
          ctx.strokeStyle = "rgba(244, 63, 94, 0.45)";
          ctx.lineWidth = 1.2;
          ctx.setLineDash([2, 4]);
        }
        ctx.beginPath();
        ctx.moveTo(coreProj.sx, coreProj.sy);
        ctx.lineTo(stNode.sx, stNode.sy);
        ctx.stroke();

        if (stNode.status === "online" && !reduced) {
          const px = coreProj.sx + (stNode.sx - coreProj.sx) * pulseT;
          const py = coreProj.sy + (stNode.sy - coreProj.sy) * pulseT;
          ctx.fillStyle = "#00D2FF";
          ctx.beginPath();
          ctx.arc(px, py, 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Draw Central Root Authority Core
      const coreGlow = ctx.createRadialGradient(
        coreProj.sx,
        coreProj.sy,
        2,
        coreProj.sx,
        coreProj.sy,
        46
      );
      coreGlow.addColorStop(0, "rgba(0, 210, 255, 0.42)");
      coreGlow.addColorStop(1, "rgba(0, 210, 255, 0)");
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(coreProj.sx, coreProj.sy, 46, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#07080B";
      ctx.beginPath();
      ctx.arc(coreProj.sx, coreProj.sy, 17 * coreProj.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = "#00D2FF";
      ctx.stroke();

      ctx.font = '700 11px "Google Sans Flex", system-ui, sans-serif';
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.fillText(
        "HMAC-SHA256 ROOT CORE",
        coreProj.sx,
        coreProj.sy + 17 * coreProj.scale + 15
      );

      // Draw Station Nodes
      stationNodes.forEach((n) => {
        const isSelected = selectedCustomerId === n.id;
        const isHovered = st.hoveredId === n.id;

        if (isSelected || isHovered) {
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(n.sx, n.sy, n.r + 5, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = "#0B0E17";
        ctx.beginPath();
        ctx.arc(n.sx, n.sy, n.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = n.color;
        ctx.stroke();

        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.sx, n.sy, Math.max(2.5, n.r * 0.42), 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '600 10.5px "Google Sans Flex", system-ui, sans-serif';
        ctx.fillStyle = isSelected || isHovered ? "#FFFFFF" : "#E2E8F0";
        ctx.textAlign = "center";
        ctx.fillText(`${n.id} · ${n.org.slice(0, 22)}`, n.sx, n.sy + n.r + 14);
      });

      st.projected = stationNodes.map((n) => ({
        id: n.id,
        sx: n.sx,
        sy: n.sy,
        r: n.r,
      }));

      raf = requestAnimationFrame(renderLoop);
    };

    raf = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(raf);
  }, [
    authenticated,
    topoMode,
    activeView,
    autoOrbit,
    zoomLevel,
    filteredCustomers,
    selectedCustomerId,
  ]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      adminUser.trim() === "ipscans-admin" &&
      adminPass === "CortexAdmin2026!"
    ) {
      setAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Yetkisiz erişim: Yönetici kimlik bilgileri hatalı.");
    }
  };

  const appendAudit = (
    category: AuditEntry["category"],
    severity: AuditEntry["severity"],
    target: string,
    message: string
  ) => {
    const nowStr = new Date().toLocaleString("tr-TR");
    setAuditLogs((prev) => [
      {
        id: `AUD-${905 + prev.length}`,
        time: nowStr,
        category,
        severity,
        target,
        message,
      },
      ...prev,
    ]);
  };

  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrg.trim()) return;
    const key = await generateCommercialLicenseKey(newPlan, newOrg.trim());
    setGeneratedKey(key);
    const spec = PLAN_SPECS[newPlan];
    const newId = `CUST-${105 + customers.length}`;
    const newNode: CustomerNode = {
      id: newId,
      org: newOrg.trim(),
      contact: newContact.trim() || "belirtilmedi@kurum.com",
      plan: newPlan,
      licenseKey: key,
      camerasUsed: 0,
      camerasMax: spec.camerasMax,
      rulesUsed: 0,
      rulesMax: spec.rulesMax,
      retentionDays: spec.retentionDays,
      ollamaModel: newModel,
      telegramActive: true,
      status: "online",
      issueNote: `Yeni ${newPlan} lisansı tanımlandı · Müşteri aktivasyonu bekleniyor`,
      lastSeen: "Yeni oluşturuldu",
    };
    setCustomers((prev) => [newNode, ...prev]);
    const msg = `${newOrg.trim()} için ${newPlan} paketi ve ${key} lisans anahtarı oluşturuldu.`;
    setActionLog(`[${new Date().toLocaleTimeString("tr-TR")}] ${msg}`);
    appendAudit("license", "ok", `${newId} · ${newOrg.trim()}`, msg);
    setNewOrg("");
    setNewContact("");
  };

  const triggerIntervention = async (
    custId: string,
    action:
      | "reset_streams"
      | "clear_queues"
      | "restart_telegram"
      | "upgrade_ultra"
      | "run_diagnostics"
      | "toggle_suspend"
  ) => {
    const target = customers.find((c) => c.id === custId);
    if (!target) return;

    let updatedKey = target.licenseKey;
    if (action === "upgrade_ultra") {
      updatedKey = await generateCommercialLicenseKey("ULTRA", target.org);
    }

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== custId) return c;
        if (action === "reset_streams") {
          return {
            ...c,
            status: "online",
            issueNote:
              "RTSP akışları ve ONVIF bağlantıları uzaktan sıfırlandı · Aktif",
            lastSeen: "Az önce (Müdahale edildi)",
          };
        }
        if (action === "clear_queues") {
          return {
            ...c,
            status: "online",
            issueNote:
              "Ollama VLM çıkarım kuyruğu ve geçici önbellek temizlendi",
            lastSeen: "Az önce (Önbellek temizlendi)",
          };
        }
        if (action === "restart_telegram") {
          return {
            ...c,
            telegramActive: true,
            status: "online",
            issueNote:
              "@intelligentcortexbot long-polling servisi yeniden başlatıldı",
            lastSeen: "Az önce (Bot aktif)",
          };
        }
        if (action === "upgrade_ultra") {
          return {
            ...c,
            plan: "ULTRA",
            camerasMax: 32,
            rulesMax: 128,
            retentionDays: 30,
            licenseKey: updatedKey,
            status: "online",
            issueNote:
              "Paket uzaktan Cortex ULTRA seviyesine yükseltildi (32 Kamera / 128 Kural)",
            lastSeen: "Az önce (ULTRA yükseltildi)",
          };
        }
        if (action === "run_diagnostics") {
          return {
            ...c,
            status: "online",
            issueNote:
              "Uzaktan tanılama tamamlandı: FFmpeg OK, Ollama OK, SHA-256 Kasa OK",
            lastSeen: "Az önce (Tanılama OK)",
          };
        }
        if (action === "toggle_suspend") {
          const nextStatus = c.status === "suspended" ? "online" : "suspended";
          return {
            ...c,
            status: nextStatus,
            issueNote:
              nextStatus === "suspended"
                ? "Lisans yönetici tarafından geçici olarak askıya alındı"
                : "Lisans yeniden aktifleştirildi · Servisler devrede",
            lastSeen: "Az önce",
          };
        }
        return c;
      })
    );

    const actionLabels: Record<typeof action, string> = {
      reset_streams: "RTSP kamera akışları sıfırlandı",
      clear_queues: "Yapay zekâ kuyruğu ve önbelleği temizlendi",
      restart_telegram: "@intelligentcortexbot bağlantısı yeniden başlatıldı",
      upgrade_ultra: `Cortex ULTRA paketine yükseltildi (Yeni Anahtar: ${updatedKey})`,
      run_diagnostics: "Tam sistem tanılaması (Self-Test) çalıştırıldı",
      toggle_suspend: "Lisans erişim durumu güncellendi",
    };

    const msg = `${target.org} (${custId}): ${actionLabels[action]}.`;
    setActionLog(`[${new Date().toLocaleTimeString("tr-TR")}] ${msg}`);
    appendAudit("intervention", "ok", `${custId} · ${target.org}`, actionLabels[action]);
  };

  const syncWithLocalCortexEngine = async () => {
    setLocalSyncStatus("Senkronize ediliyor…");
    try {
      const res = await fetch("http://127.0.0.1:8765/api/state", {
        method: "GET",
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const camCount = Array.isArray(data?.cameras) ? data.cameras.length : 0;
      const ruleCount = Array.isArray(data?.rules) ? data.rules.length : 0;
      setLocalSyncStatus(`Yerel Motor Bağlı (${camCount} Kam / ${ruleCount} Kural)`);
      const msg = `Yerel Cortex EXE Motoru (127.0.0.1:8765) ile senkronize edildi: ${camCount} kamera, ${ruleCount} kural aktif.`;
      setActionLog(`[${new Date().toLocaleTimeString("tr-TR")}] ${msg}`);
      appendAudit("diagnostics", "ok", "127.0.0.1:8765 · Yerel Cortex EXE", msg);
    } catch {
      setLocalSyncStatus("127.0.0.1:8765 Çevrimdışı (Simülasyon Aktif)");
      const msg =
        "Yerel 127.0.0.1:8765 servisine ulaşılamadı; merkezi bulut/filo yönetim verileri kullanılıyor.";
      setActionLog(`[${new Date().toLocaleTimeString("tr-TR")}] ${msg}`);
    }
  };

  const totalCameras = customers.reduce((acc, c) => acc + c.camerasUsed, 0);
  const totalRules = customers.reduce((acc, c) => acc + c.rulesUsed, 0);
  const onlineCount = customers.filter((c) => c.status === "online").length;
  const warningCount = customers.filter((c) => c.status === "warning").length;
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  const filteredAudit = useMemo(() => {
    if (auditCategoryFilter === "ALL") return auditLogs;
    return auditLogs.filter((a) => a.category === auditCategoryFilter);
  }, [auditLogs, auditCategoryFilter]);

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-surface text-ink grid lg:grid-cols-[1.08fr_0.92fr]">
        {/* Left 3D Architectural Stage */}
        <section className="relative hidden lg:flex flex-col justify-between p-12 bg-stage text-on-stage overflow-hidden border-r border-line">
          <canvas
            ref={loginCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/5 px-4 py-2 backdrop-blur-md">
              <img src="/cortex-mark.svg" alt="" width={24} height={24} />
              <span className="font-mono text-xs font-semibold tracking-wider text-white">
                IPSCANS CORTEX · 3D WEB CONTROL CENTER
              </span>
            </div>
            <span className="font-mono text-xs text-white/60">v2.3.0</span>
          </div>

          <div className="relative z-10 my-auto max-w-xl">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-sky-400 mb-3">
              MERKEZİ LİSANS, FİLO TOPOLOJİSİ VE UZAKTAN MÜDAHALE
            </p>
            <h1 className="text-4xl xl:text-5xl font-semibold tracking-tight text-white leading-[1.08]">
              Gören kameralar.{" "}
              <span className="text-sky-400">Yönetilen altyapı.</span>
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              Cortex masaüstü kurulumlarını, PRO / PLUS / ULTRA paket
              kotalarını, HMAC-SHA256 lisans anahtarlarını ve saha sağlık
              telemetrisini 3D topoloji sahnesinde yönetin.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur-md">
              <p className="font-mono text-[11px] font-semibold text-sky-400">
                KRİPTOGRAFİK OTORİTE
              </p>
              <p className="mt-1 text-xs text-white/80">
                HMAC-SHA256 imzalı çevrimdışı doğrulanabilir anahtarlar
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur-md">
              <p className="font-mono text-[11px] font-semibold text-emerald-400">
                3D FİLO TOPOLOJİSİ
              </p>
              <p className="mt-1 text-xs text-white/80">
                Canlı kurulum, kamera ve AI kural kotası görselleştirme
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur-md">
              <p className="font-mono text-[11px] font-semibold text-amber-400">
                UZAKTAN MÜDAHALE
              </p>
              <p className="mt-1 text-xs text-white/80">
                RTSP sıfırlama, VLM önbellek temizleme ve canlı tanılama
              </p>
            </div>
          </div>
        </section>

        {/* Right Login Form Panel */}
        <section className="flex flex-col justify-between p-8 sm:p-12 bg-surface text-ink">
          <div className="flex items-center justify-between">
            <Link
              href="/tr/cortex"
              className="inline-flex items-center gap-2 text-xs font-medium text-ink-2 hover:text-ink"
            >
              <span>← Cortex Ürün Sayfasına Dön</span>
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-dim px-3.5 py-1.5 text-xs font-medium text-ink-2 hover:text-ink cursor-pointer"
            >
              <span>{theme === "dark" ? "Açık Tema" : "Koyu Tema"}</span>
            </button>
          </div>

          <div className="my-auto mx-auto w-full max-w-md rounded-2xl border border-line bg-surface-dim p-8 shadow-lg">
            <div className="flex items-center gap-3.5 mb-6">
              <img
                src="/cortex-mark.svg"
                alt="IPScans Cortex"
                width={42}
                height={42}
              />
              <div>
                <span className="font-mono text-[11px] uppercase tracking-widest text-ink-3 block">
                  IPSCANS CORTEX CONTROL CENTER
                </span>
                <h2 className="text-xl font-semibold text-ink">
                  Yönetici Oturumu Açın
                </h2>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-user"
                  className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink-2 mb-1.5"
                >
                  Yönetici Kullanıcı Adı
                </label>
                <input
                  id="admin-user"
                  type="text"
                  required
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  placeholder="ipscans-admin"
                  className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-pass"
                  className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink-2 mb-1.5"
                >
                  Yönetici Anahtarı / Parola
                </label>
                <input
                  id="admin-pass"
                  type="password"
                  required
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {authError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-medium text-red-500"
                >
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition cursor-pointer"
              >
                Yönetim Merkezine Giriş Yap →
              </button>

              <div className="pt-3 border-t border-line flex items-center justify-between text-xs text-ink-3">
                <span className="font-mono">
                  Yetkili: ipscans-admin / CortexAdmin2026!
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAdminUser("ipscans-admin");
                    setAdminPass("CortexAdmin2026!");
                  }}
                  className="font-semibold text-blue-500 hover:underline cursor-pointer"
                >
                  Otomatik Doldur
                </button>
              </div>
            </form>
          </div>

          <div className="text-center font-mono text-[11px] text-ink-3">
            IPScans Cortex 2.3.0 · Kurumsal Filo ve Lisans Yönetim Konsolu
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-ink flex">
      {/* Left Collapsible Sidebar */}
      <aside
        className={`${
          sidebarCollapsed ? "w-[72px]" : "w-[252px]"
        } shrink-0 border-r border-line bg-surface-dim flex flex-col justify-between transition-all duration-200`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-line">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/cortex-mark.svg"
                alt=""
                width={32}
                height={32}
                className="shrink-0"
              />
              {!sidebarCollapsed && (
                <div className=" truncate">
                  <p className="text-sm font-semibold text-ink leading-tight">
                    Cortex Admin
                  </p>
                  <p className="font-mono text-[10px] text-ink-3">
                    IPScans · v2.3.0
                  </p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              title="Kenar Çubuğunu Daralt / Genişlet (Ctrl+B)"
              className="rounded-lg border border-line bg-surface p-1.5 text-ink-2 hover:text-ink cursor-pointer"
            >
              <svg
                viewBox="0 0 16 16"
                width={14}
                height={14}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
              >
                <path
                  d={
                    sidebarCollapsed
                      ? "M6 3.5L10.5 8 6 12.5"
                      : "M10 3.5L5.5 8 10 12.5"
                  }
                />
              </svg>
            </button>
          </div>

          <nav className="space-y-1" aria-label="Yönetim Konsolu Menüsü">
            {(
              [
                {
                  id: "overview",
                  label: "Genel Konsol",
                  badge: customers.length,
                  svg: (
                    <path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" />
                  ),
                },
                {
                  id: "topology",
                  label: "3D Altyapı Sahnesi",
                  badge: "3D",
                  svg: (
                    <path d="M8 1.5L14 5v6l-6 3.5L2 11V5l6-3.5zM2 5l6 3.5L14 5M8 8.5V15" />
                  ),
                },
                {
                  id: "stations",
                  label: "Kurulumlar & Cihazlar",
                  badge: onlineCount,
                  svg: (
                    <path d="M2 3.5h12v9H2zM5 14.5h6M8 12.5v2" />
                  ),
                },
                {
                  id: "licensing",
                  label: "Lisans & Paket Üretici",
                  badge: "SHA",
                  svg: (
                    <path d="M8 1.8L14.2 8 8 14.2 1.8 8 8 1.8zM8 5.2L10.8 8 8 10.8 5.2 8 8 5.2z" />
                  ),
                },
                {
                  id: "audit",
                  label: "Olay & Denetim İzi",
                  badge: auditLogs.length,
                  svg: (
                    <path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zm0 3v3.2l2.2 1.4" />
                  ),
                },
              ] as const
            ).map((item) => {
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition cursor-pointer ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-ink-2 hover:bg-surface hover:text-ink"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <svg
                      viewBox="0 0 16 16"
                      width={16}
                      height={16}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shrink-0"
                    >
                      {item.svg}
                    </svg>
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </div>
                  {!sidebarCollapsed && (
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-surface text-ink-3 border border-line"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-line space-y-2">
          {!sidebarCollapsed && (
            <div className="rounded-xl border border-line bg-surface p-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-mono text-[11px] font-semibold text-ink">
                  ROOT AUTHORITY AKTİF
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-ink-3 truncate">
                {localSyncStatus}
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Command Header */}
        <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur-md px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs uppercase tracking-widest text-ink-3">
              CORTEX YÖNETİM PANELİ
            </span>
            <span className="text-ink-3">/</span>
            <strong className="text-sm font-semibold text-ink">
              {activeView === "overview" && "Genel Konsol & 3D Altyapı"}
              {activeView === "topology" && "3D Kurumsal Ağ ve İstasyon Topolojisi"}
              {activeView === "stations" && "Yönetilen Cortex Kurulumları"}
              {activeView === "licensing" && "Organizasyon & Lisans Anahtarı Üretici"}
              {activeView === "audit" && "Merkezi Olay, Uyarı & Denetim Kayıtları"}
            </strong>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCmdkOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-dim px-3.5 py-1.5 text-xs font-medium text-ink-2 hover:text-ink cursor-pointer"
            >
              <span>Komut & Ara…</span>
              <kbd className="font-mono text-[10px] rounded bg-surface px-1.5 py-0.5 border border-line">
                Ctrl K
              </kbd>
            </button>

            <button
              type="button"
              onClick={syncWithLocalCortexEngine}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-dim px-3.5 py-1.5 text-xs font-medium text-ink-2 hover:text-ink cursor-pointer"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Yerel EXE Senkronla</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-dim px-3.5 py-1.5 text-xs font-medium text-ink-2 hover:text-ink cursor-pointer"
            >
              <span>{theme === "dark" ? "Açık Tema" : "Koyu Tema"}</span>
            </button>

            <Link
              href="/tr/cortex"
              className="rounded-full border border-line bg-surface-dim px-3.5 py-1.5 text-xs font-medium text-ink-2 hover:text-ink"
            >
              Cortex Sayfası ↗
            </Link>

            <button
              type="button"
              onClick={() => {
                setAuthenticated(false);
                setAdminPass("");
              }}
              className="rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-500/20 cursor-pointer"
            >
              Çıkış
            </button>
          </div>
        </header>

        <div className="p-6 space-y-6 max-w-[1440px] w-full mx-auto">
          {/* KPI Telemetry Ribbon */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-line bg-surface-dim p-5">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                YÖNETİLEN KURULUMLAR
              </p>
              <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-ink">
                {customers.length}
              </p>
              <p className="mt-1 text-xs text-emerald-500 font-medium">
                {onlineCount} Çevrimiçi · {warningCount} Uyarıda
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-surface-dim p-5">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                TOPLAM CANLI KAMERA AKIŞI
              </p>
              <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-ink">
                {totalCameras}
              </p>
              <p className="mt-1 text-xs text-ink-2">
                RTSP / ONVIF H.264 Kanal Havuzu
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-surface-dim p-5">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                ETKİN YAPAY ZEKÂ KURALLARI
              </p>
              <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-ink">
                {totalRules}
              </p>
              <p className="mt-1 text-xs text-ink-2">
                Yerel Motor + Pro Takip + Ollama VLM
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-surface-dim p-5">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                SON SİSTEM İŞLEMİ
              </p>
              <p className="mt-2 text-xs font-mono text-ink leading-relaxed line-clamp-3">
                {actionLog}
              </p>
            </div>
          </section>

          {/* 3D MULTI-INSTALLATION INFRASTRUCTURE EXPLORER */}
          {(activeView === "overview" || activeView === "topology") && (
            <section className="rounded-2xl border border-line bg-surface-dim p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-blue-500">
                    3D CORTEX INFRASTRUCTURE & FLEET EXPLORER
                  </span>
                  <h2 className="text-lg font-semibold text-ink mt-0.5">
                    Kriptografik Kök Otorite, Saha Kurulumları ve Canlı Kota Bağlantıları
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-xl border border-line bg-surface p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setTopoMode("3d")}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold cursor-pointer ${
                        topoMode === "3d"
                          ? "bg-blue-600 text-white"
                          : "text-ink-2 hover:text-ink"
                      }`}
                    >
                      3D Uzamsal Sahne
                    </button>
                    <button
                      type="button"
                      onClick={() => setTopoMode("2d")}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold cursor-pointer ${
                        topoMode === "2d"
                          ? "bg-blue-600 text-white"
                          : "text-ink-2 hover:text-ink"
                      }`}
                    >
                      2D Topoloji Matrisi
                    </button>
                  </div>

                  {topoMode === "3d" && (
                    <div className="inline-flex rounded-xl border border-line bg-surface p-1 gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setZoomLevel((z) => Math.min(1.75, z + 0.15))
                        }
                        className="rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-ink-2 hover:text-ink cursor-pointer"
                        title="Yakınlaştır"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setZoomLevel((z) => Math.max(0.65, z - 0.15))
                        }
                        className="rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-ink-2 hover:text-ink cursor-pointer"
                        title="Uzaklaştır"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        onClick={() => setAutoOrbit((v) => !v)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                          autoOrbit
                            ? "bg-blue-500/15 text-blue-400"
                            : "text-ink-2"
                        }`}
                      >
                        Yörünge
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          orbitRef.current.targetYaw = 0.42;
                          orbitRef.current.targetPitch = 0.34;
                          setZoomLevel(1.0);
                        }}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-ink-2 hover:text-ink cursor-pointer"
                      >
                        Sıfırla
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {topoMode === "3d" ? (
                <div className="relative h-[390px] rounded-xl overflow-hidden border border-line bg-[#050608]">
                  <canvas
                    ref={infraCanvasRef}
                    onPointerDown={(e) => {
                      orbitRef.current.dragging = true;
                      orbitRef.current.startX = e.clientX;
                      orbitRef.current.startY = e.clientY;
                    }}
                    onPointerMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const mx = e.clientX - rect.left;
                      const my = e.clientY - rect.top;
                      if (orbitRef.current.dragging) {
                        const dx = e.clientX - orbitRef.current.startX;
                        const dy = e.clientY - orbitRef.current.startY;
                        orbitRef.current.startX = e.clientX;
                        orbitRef.current.startY = e.clientY;
                        orbitRef.current.targetYaw += dx * 0.007;
                        orbitRef.current.targetPitch = Math.max(
                          -0.8,
                          Math.min(0.8, orbitRef.current.targetPitch + dy * 0.006)
                        );
                        return;
                      }
                      let hit: string | null = null;
                      for (const p of orbitRef.current.projected) {
                        if (Math.hypot(mx - p.sx, my - p.sy) <= p.r + 8) {
                          hit = p.id;
                          break;
                        }
                      }
                      orbitRef.current.hoveredId = hit;
                    }}
                    onPointerUp={() => {
                      orbitRef.current.dragging = false;
                    }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const mx = e.clientX - rect.left;
                      const my = e.clientY - rect.top;
                      for (const p of orbitRef.current.projected) {
                        if (Math.hypot(mx - p.sx, my - p.sy) <= p.r + 10) {
                          setSelectedCustomerId(p.id);
                          return;
                        }
                      }
                    }}
                    className="w-full h-full block cursor-grab active:cursor-grabbing"
                  />

                  <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/75 px-3 py-1 font-mono text-[11px] text-white">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      ROOT AUTHORITY · {filteredCustomers.length} İSTASYON BAĞLI
                    </span>
                    <span className="rounded-full border border-white/12 bg-black/75 px-3 py-1 font-mono text-[11px] text-white/80">
                      Sürükle: Döndür · Düğüme Tıkla: Sağ Detay Çekmecesi
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex flex-wrap items-center gap-4 rounded-xl border border-white/12 bg-black/80 px-3.5 py-1.5 text-[11px] text-white/80">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        Doğrulanmış Canlı Kurulum
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        Kota / RTSP Uyarısı
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        Askıya Alınmış
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedCustomerId(c.id)}
                          className={`rounded-full border px-3 py-1 font-mono text-[11px] font-semibold transition cursor-pointer ${
                            selectedCustomerId === c.id
                              ? "border-blue-400 bg-blue-600 text-white"
                              : "border-white/15 bg-black/80 text-white/90 hover:border-white/40"
                          }`}
                        >
                          {c.id} · {c.plan}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(["ULTRA", "PLUS", "PRO"] as PlanTier[]).map((tier) => {
                    const list = filteredCustomers.filter(
                      (c) => c.plan === tier
                    );
                    return (
                      <div
                        key={tier}
                        className="rounded-xl border border-line bg-surface p-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between border-b border-line pb-2 font-mono text-xs font-bold text-ink-2">
                          <span>CORTEX {tier} KURULUMLARI</span>
                          <span>{list.length}</span>
                        </div>
                        {list.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCustomerId(c.id)}
                            className="w-full text-left rounded-xl border border-line bg-surface-dim hover:border-blue-500 p-3 transition cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <strong className="text-xs font-semibold text-ink">
                                {c.org}
                              </strong>
                              <span className="font-mono text-[10px] text-ink-3">
                                {c.id}
                              </span>
                            </div>
                            <p className="mt-1 font-mono text-[11px] text-ink-2">
                              Kamera: {c.camerasUsed}/{c.camerasMax} · Kural:{" "}
                              {c.rulesUsed}/{c.rulesMax}
                            </p>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Main Workspace Grid: License Generator + Managed Stations */}
          {(activeView === "overview" ||
            activeView === "stations" ||
            activeView === "licensing") && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: License Generator */}
              {(activeView === "overview" || activeView === "licensing") && (
                <div
                  className={`${
                    activeView === "licensing"
                      ? "lg:col-span-12"
                      : "lg:col-span-4"
                  } space-y-6`}
                >
                  <div className="rounded-2xl border border-line bg-surface-dim p-6">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-blue-500">
                      HMAC-SHA256 LİSANS MOTORU
                    </span>
                    <h2 className="text-lg font-semibold text-ink mt-1 mb-4">
                      Yeni Müşteri & Paket Tanımla
                    </h2>

                    <form onSubmit={handleCreateLicense} className="space-y-4">
                      <div>
                        <label
                          htmlFor="new-org"
                          className="block font-mono text-xs font-semibold uppercase text-ink-2 mb-1"
                        >
                          Kurum / Müşteri Adı
                        </label>
                        <input
                          id="new-org"
                          type="text"
                          required
                          value={newOrg}
                          onChange={(e) => setNewOrg(e.target.value)}
                          placeholder="Örn: Boğaziçi Marina Güvenlik"
                          className="w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-sm text-ink"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="new-contact"
                          className="block font-mono text-xs font-semibold uppercase text-ink-2 mb-1"
                        >
                          Yetkili E-Posta / İletişim
                        </label>
                        <input
                          id="new-contact"
                          type="email"
                          value={newContact}
                          onChange={(e) => setNewContact(e.target.value)}
                          placeholder="yonetim@bogazicimarina.com"
                          className="w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-sm text-ink"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="new-plan"
                          className="block font-mono text-xs font-semibold uppercase text-ink-2 mb-1"
                        >
                          Cortex Üyelik Paketi
                        </label>
                        <select
                          id="new-plan"
                          value={newPlan}
                          onChange={(e) =>
                            setNewPlan(e.target.value as PlanTier)
                          }
                          className="w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-sm text-ink"
                        >
                          <option value="PRO">
                            Cortex PRO (4 Kamera · 8 Kural · 7 Gün)
                          </option>
                          <option value="PLUS">
                            Cortex PLUS (12 Kamera · 32 Kural · 15 Gün)
                          </option>
                          <option value="ULTRA">
                            Cortex ULTRA (32 Kamera · 128 Kural · 30 Gün)
                          </option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="new-model"
                          className="block font-mono text-xs font-semibold uppercase text-ink-2 mb-1"
                        >
                          Varsayılan Görsel AI Modeli (Ollama)
                        </label>
                        <select
                          id="new-model"
                          value={newModel}
                          onChange={(e) => setNewModel(e.target.value)}
                          className="w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-sm text-ink"
                        >
                          <option value="gemma3:4b">
                            gemma3:4b (Varsayılan Dengeli)
                          </option>
                          <option value="qwen2.5vl:3b">
                            qwen2.5vl:3b (Düşük Bellek)
                          </option>
                          <option value="qwen2.5vl:7b">
                            qwen2.5vl:7b (Uzamsal & İSG Uzmanı)
                          </option>
                          <option value="minicpm-v:8b">
                            minicpm-v:8b (Yüksek Doğruluk / OCR)
                          </option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition cursor-pointer"
                      >
                        Lisans Anahtarı Üret & Kaydet →
                      </button>
                    </form>

                    {generatedKey && (
                      <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
                        <p className="font-mono text-[11px] font-bold uppercase text-emerald-400">
                          ÜRETİLEN LİSANS ANAHTARI
                        </p>
                        <code className="mt-1 block font-mono text-xs font-bold text-ink break-all">
                          {generatedKey}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Right Column: Managed Installations List */}
              {(activeView === "overview" || activeView === "stations") && (
                <div
                  className={`${
                    activeView === "stations"
                      ? "lg:col-span-12"
                      : "lg:col-span-8"
                  } space-y-4`}
                >
                  <div className="rounded-2xl border border-line bg-surface-dim p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {["ALL", "ULTRA", "PLUS", "PRO", "WARN"].map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFilterPlan(f)}
                          className={`rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition cursor-pointer ${
                            filterPlan === f
                              ? "bg-blue-600 text-white"
                              : "bg-surface text-ink-2 hover:text-ink border border-line"
                          }`}
                        >
                          {f === "ALL"
                            ? "TÜMÜ"
                            : f === "WARN"
                            ? `UYARI (${warningCount})`
                            : f}
                        </button>
                      ))}
                    </div>

                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Kurum, ID veya lisans anahtarı ara…"
                      className="rounded-xl border border-line bg-surface px-3.5 py-1.5 text-xs text-ink w-full sm:w-64"
                    />
                  </div>

                  <div className="space-y-4">
                    {filteredCustomers.map((c) => {
                      const camPct = Math.round(
                        (c.camerasUsed / c.camerasMax) * 100
                      );
                      const rulePct = Math.round(
                        (c.rulesUsed / c.rulesMax) * 100
                      );
                      return (
                        <article
                          key={c.id}
                          className="rounded-2xl border border-line bg-surface-dim p-5 transition hover:border-line-strong"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-bold text-ink-3">
                                  {c.id}
                                </span>
                                <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 font-mono text-[11px] font-bold text-ink">
                                  CORTEX {c.plan}
                                </span>
                                <span
                                  className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
                                    c.status === "online"
                                      ? "bg-emerald-500/15 text-emerald-400"
                                      : c.status === "warning"
                                      ? "bg-amber-500/15 text-amber-400"
                                      : "bg-rose-500/15 text-rose-400"
                                  }`}
                                >
                                  {c.status === "online"
                                    ? "ÇEVRİMİÇİ"
                                    : c.status === "warning"
                                    ? "MÜDAHALE ÖNERİLİR"
                                    : "ASKIDA"}
                                </span>
                              </div>
                              <h3 className="text-base font-semibold text-ink mt-1.5">
                                {c.org}
                              </h3>
                              <p className="font-mono text-xs text-ink-2">
                                {c.contact} · Son bağlantı: {c.lastSeen} · Model:{" "}
                                {c.ollamaModel}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <code className="rounded-lg border border-line bg-surface px-2.5 py-1 font-mono text-[11px] text-ink-2">
                                {c.licenseKey}
                              </code>
                              <button
                                type="button"
                                onClick={() => setSelectedCustomerId(c.id)}
                                className="rounded-xl bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                              >
                                Detay Çekmecesi →
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            <div className="rounded-xl border border-line bg-surface p-3">
                              <div className="flex justify-between font-mono text-xs mb-1.5">
                                <span className="text-ink-2">Kamera Kotası</span>
                                <strong className="tabular-nums text-ink">
                                  {c.camerasUsed} / {c.camerasMax}
                                </strong>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                                <div
                                  className="h-full bg-blue-500"
                                  style={{ width: `${camPct}%` }}
                                />
                              </div>
                            </div>

                            <div className="rounded-xl border border-line bg-surface p-3">
                              <div className="flex justify-between font-mono text-xs mb-1.5">
                                <span className="text-ink-2">AI Kural Kotası</span>
                                <strong className="tabular-nums text-ink">
                                  {c.rulesUsed} / {c.rulesMax}
                                </strong>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500"
                                  style={{ width: `${rulePct}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="rounded-xl border border-line bg-surface px-3.5 py-2 text-xs text-ink-2 mb-3">
                            <strong className="text-ink">Saha Durumu:</strong>{" "}
                            {c.issueNote}
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                triggerIntervention(c.id, "reset_streams")
                              }
                              className="rounded-lg border border-line bg-surface hover:border-blue-500 px-3 py-1.5 text-xs font-medium text-ink cursor-pointer"
                            >
                              Akışları Yenile
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                triggerIntervention(c.id, "clear_queues")
                              }
                              className="rounded-lg border border-line bg-surface hover:border-blue-500 px-3 py-1.5 text-xs font-medium text-ink cursor-pointer"
                            >
                              Kuyrukları Temizle
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                triggerIntervention(c.id, "restart_telegram")
                              }
                              className="rounded-lg border border-line bg-surface hover:border-blue-500 px-3 py-1.5 text-xs font-medium text-ink cursor-pointer"
                            >
                              Telegram Bot Onar
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                triggerIntervention(c.id, "run_diagnostics")
                              }
                              className="rounded-lg border border-line bg-surface hover:border-blue-500 px-3 py-1.5 text-xs font-medium text-ink cursor-pointer"
                            >
                              Tanılama Çalıştır
                            </button>
                            {c.plan !== "ULTRA" && (
                              <button
                                type="button"
                                onClick={() =>
                                  triggerIntervention(c.id, "upgrade_ultra")
                                }
                                className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                              >
                                ULTRA&apos;ya Yükselt
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                triggerIntervention(c.id, "toggle_suspend")
                              }
                              className="rounded-lg border border-line bg-surface-2 hover:bg-surface px-3 py-1.5 text-xs font-medium text-ink-2 cursor-pointer"
                            >
                              {c.status === "suspended"
                                ? "Aktifleştir"
                                : "Askıya Al"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Audit & Notification Center */}
          {(activeView === "overview" || activeView === "audit") && (
            <section className="rounded-2xl border border-line bg-surface-dim p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-blue-500">
                    SHA-256 MERKEZİ DENETİM VE OLAY KAYITLARI
                  </span>
                  <h2 className="text-lg font-semibold text-ink mt-0.5">
                    Son Sistem Müdahaleleri, Uyarılar ve Lisans İşlemleri
                  </h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "ALL", label: "Tümü" },
                    { id: "license", label: "Lisans" },
                    { id: "intervention", label: "Müdahale" },
                    { id: "diagnostics", label: "Tanılama" },
                    { id: "security", label: "Güvenlik" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setAuditCategoryFilter(cat.id)}
                      className={`rounded-lg px-3 py-1 font-mono text-xs font-semibold cursor-pointer ${
                        auditCategoryFilter === cat.id
                          ? "bg-blue-600 text-white"
                          : "bg-surface text-ink-2 border border-line"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-line rounded-xl border border-line bg-surface overflow-hidden">
                {filteredAudit.map((a) => (
                  <div
                    key={a.id}
                    className="p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-ink-3">{a.time}</span>
                      <span
                        className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                          a.severity === "ok"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : a.severity === "warn"
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-blue-500/15 text-blue-400"
                        }`}
                      >
                        {a.category}
                      </span>
                      <strong className="text-ink">{a.target}</strong>
                    </div>
                    <span className="text-ink-2">{a.message}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Right-Side Slide-Over Installation Inspector Drawer */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs"
          onClick={() => setSelectedCustomerId(null)}
        >
          <aside
            className="w-full max-w-md h-full bg-surface border-l border-line p-6 overflow-y-auto flex flex-col justify-between gap-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-blue-500">
                      {selectedCustomer.id}
                    </span>
                    <span className="rounded-full border border-line bg-surface-dim px-2.5 py-0.5 font-mono text-[11px] font-bold text-ink">
                      CORTEX {selectedCustomer.plan}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-ink">
                    {selectedCustomer.org}
                  </h2>
                  <p className="font-mono text-xs text-ink-2">
                    {selectedCustomer.contact}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerId(null)}
                  className="rounded-lg border border-line bg-surface-dim px-2.5 py-1 text-xs font-semibold text-ink-2 hover:text-ink cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="rounded-xl border border-line bg-surface-dim p-3">
                  <span className="text-[10px] text-ink-3 block">
                    SON BAĞLANTI
                  </span>
                  <strong className="text-ink">
                    {selectedCustomer.lastSeen}
                  </strong>
                </div>
                <div className="rounded-xl border border-line bg-surface-dim p-3">
                  <span className="text-[10px] text-ink-3 block">
                    AKTİF AI MODELİ
                  </span>
                  <strong className="text-ink">
                    {selectedCustomer.ollamaModel}
                  </strong>
                </div>
                <div className="rounded-xl border border-line bg-surface-dim p-3">
                  <span className="text-[10px] text-ink-3 block">
                    KAMERA KOTASI
                  </span>
                  <strong className="text-ink tabular-nums">
                    {selectedCustomer.camerasUsed} /{" "}
                    {selectedCustomer.camerasMax} Kanal
                  </strong>
                </div>
                <div className="rounded-xl border border-line bg-surface-dim p-3">
                  <span className="text-[10px] text-ink-3 block">
                    AI KURAL KOTASI
                  </span>
                  <strong className="text-ink tabular-nums">
                    {selectedCustomer.rulesUsed} / {selectedCustomer.rulesMax}{" "}
                    Kural
                  </strong>
                </div>
              </div>

              <div className="rounded-xl border border-line bg-surface-dim p-3.5 space-y-1.5">
                <span className="font-mono text-[10px] font-bold uppercase text-ink-3">
                  KRİPTOGRAFİK LİSANS ANAHTARI
                </span>
                <code className="block font-mono text-xs font-bold text-ink break-all">
                  {selectedCustomer.licenseKey}
                </code>
              </div>

              <div className="rounded-xl border border-line bg-surface-dim p-3.5 space-y-1.5">
                <span className="font-mono text-[10px] font-bold uppercase text-ink-3">
                  SAHA TANI VE UYARI RAPORU
                </span>
                <p className="text-xs text-ink-2 leading-relaxed">
                  {selectedCustomer.issueNote}
                </p>
              </div>

              <div className="space-y-2">
                <span className="font-mono text-[10px] font-bold uppercase text-ink-3 block">
                  UZAKTAN KOMUTA VE MÜDAHALE İŞLEMLERİ
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      triggerIntervention(selectedCustomer.id, "reset_streams")
                    }
                    className="rounded-xl border border-line bg-surface-dim hover:border-blue-500 p-2.5 text-xs font-semibold text-ink cursor-pointer"
                  >
                    Akışları Yenile
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      triggerIntervention(selectedCustomer.id, "clear_queues")
                    }
                    className="rounded-xl border border-line bg-surface-dim hover:border-blue-500 p-2.5 text-xs font-semibold text-ink cursor-pointer"
                  >
                    Kuyrukları Temizle
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      triggerIntervention(
                        selectedCustomer.id,
                        "restart_telegram"
                      )
                    }
                    className="rounded-xl border border-line bg-surface-dim hover:border-blue-500 p-2.5 text-xs font-semibold text-ink cursor-pointer"
                  >
                    Telegram Bot Onar
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      triggerIntervention(
                        selectedCustomer.id,
                        "run_diagnostics"
                      )
                    }
                    className="rounded-xl border border-line bg-surface-dim hover:border-blue-500 p-2.5 text-xs font-semibold text-ink cursor-pointer"
                  >
                    Tanılama Çalıştır
                  </button>
                </div>
                {selectedCustomer.plan !== "ULTRA" && (
                  <button
                    type="button"
                    onClick={() =>
                      triggerIntervention(selectedCustomer.id, "upgrade_ultra")
                    }
                    className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 p-2.5 text-xs font-semibold text-white cursor-pointer"
                  >
                    Cortex ULTRA Paketine Yükselt →
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedCustomerId(null)}
              className="w-full rounded-xl border border-line bg-surface-dim py-2.5 text-xs font-semibold text-ink-2 hover:text-ink cursor-pointer"
            >
              Detay Çekmecesini Kapat
            </button>
          </aside>
        </div>
      )}

      {/* Ctrl+K Command Palette Modal */}
      {cmdkOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-24 px-4 backdrop-blur-xs"
          onClick={() => setCmdkOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-line bg-surface p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="search"
              autoFocus
              value={cmdkQuery}
              onChange={(e) => setCmdkQuery(e.target.value)}
              placeholder="Görünüm, kurulum veya uzaktan müdahale komutu ara…"
              className="w-full rounded-xl border border-line bg-surface-dim px-4 py-2.5 text-sm text-ink"
            />
            <div className="max-h-72 overflow-y-auto space-y-1">
              {customers
                .filter((c) =>
                  `${c.org} ${c.id} ${c.plan}`
                    .toLowerCase()
                    .includes(cmdkQuery.toLowerCase())
                )
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setCmdkOpen(false);
                    }}
                    className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs hover:bg-surface-dim cursor-pointer"
                  >
                    <span className="font-semibold text-ink">
                      {c.id} · {c.org}
                    </span>
                    <span className="font-mono text-[10px] text-ink-3">
                      {c.plan} · İncele
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
