"use client";

import React, { useState } from "react";
import Link from "next/link";

type PlanTier = "PRO" | "PLUS" | "ULTRA";

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
      "42 Çoklu Ollama Görsel AI Şablonu (Gemma 3, Qwen 2.5 VL, MiniCPM-V)",
      "İki Yönlü Telegram Komuta Botu (/durum, /anlik, /koru, /sustur)",
      "SHA-256 Adli Kanıt ZIP Paketi + 7 Sektörel Paket",
    ],
  },
  ULTRA: {
    label: "Cortex ULTRA",
    camerasMax: 32,
    rulesMax: 128,
    retentionDays: 30,
    priceNote: "32 Kamera · 128 Kural · 30 Gün Arşiv",
    features: [
      "Tüm 8 Sektörel Kurulum Paketi (Klinik & Yaşlı Bakım Dahil)",
      "SQLite FTS5 Doğal Dil 'Cortex Copilot' Arama",
      "KVKK/GDPR Kalıcı Gizlilik Maskeleme & İmzalı Kurumsal Webhook",
      "Toplu ONVIF NVR Filo Eşitleme & Tam Uzaktan Yönetici Müdahalesi",
    ],
  },
};

const LICENSE_SECRET = "IPScans-Cortex-2.0-Commercial-Root-2026";

async function sha256Hex(message: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(message));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

async function generateCommercialLicenseKey(
  plan: PlanTier,
  org: string
): Promise<string> {
  const canonical = plan.trim().toUpperCase() as PlanTier;
  const normOrg =
    (org || "IPSCANS")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 16) || "IPSCANS";
  const orgTag = (await sha256Hex(normOrg)).slice(0, 6);
  const sig = (await hmacSha256Hex(LICENSE_SECRET, `${canonical}:${orgTag}`)).slice(
    0,
    8
  );
  return `IPS-${canonical}-${orgTag}-${sig}`;
}

const INITIAL_CUSTOMERS: CustomerNode[] = [
  {
    id: "CUST-101",
    org: "Kuzey Yıldızı Rezidans Yönetimi",
    contact: "guvenlik@kuzeyyildizi.com.tr",
    plan: "PLUS",
    licenseKey: "IPS-PLUS-A2C6F9-CD232097",
    camerasUsed: 10,
    camerasMax: 12,
    rulesUsed: 24,
    rulesMax: 32,
    retentionDays: 15,
    ollamaModel: "gemma3:4b",
    telegramActive: true,
    status: "online",
    issueNote: "Tüm RTSP akışları ve İki Yönlü Telegram Botu sağlıklı çalışıyor.",
    lastSeen: "Az önce",
  },
  {
    id: "CUST-102",
    org: "Anadolu Lojistik & Antrepo A.Ş.",
    contact: "operasyon@anadolulojistik.com",
    plan: "ULTRA",
    licenseKey: "IPS-ULTRA-F775CA-D5854D6C",
    camerasUsed: 28,
    camerasMax: 32,
    rulesUsed: 86,
    rulesMax: 128,
    retentionDays: 30,
    ollamaModel: "qwen2.5vl:7b",
    telegramActive: true,
    status: "warning",
    issueNote:
      "Kamera #14 (Yükleme Rampası) yüksek gecikme uyarısı verdi — Uzaktan akış yenileme önerilir.",
    lastSeen: "1 dk önce",
  },
  {
    id: "CUST-103",
    org: "Marmara Perakende Mağazacılık",
    contact: "it@marmaraperakende.com",
    plan: "PRO",
    licenseKey: "IPS-PRO-E792FD-6AC0153F",
    camerasUsed: 4,
    camerasMax: 4,
    rulesUsed: 8,
    rulesMax: 8,
    retentionDays: 7,
    ollamaModel: "Yerel Motor (Modelsiz)",
    telegramActive: true,
    status: "online",
    issueNote: "PRO paket kamera ve kural kotası %100 dolu (4/4 kamera).",
    lastSeen: "2 dk önce",
  },
  {
    id: "CUST-104",
    org: "Özel Şifa Yaşlı Bakım & Klinik",
    contact: "teknik@sifaklinik.org",
    plan: "ULTRA",
    licenseKey: "IPS-ULTRA-38EA90-B01C82E4",
    camerasUsed: 16,
    camerasMax: 32,
    rulesUsed: 48,
    rulesMax: 128,
    retentionDays: 30,
    ollamaModel: "minicpm-v:8b",
    telegramActive: true,
    status: "online",
    issueNote: "Klinik & Yaşlı Bakım sektörel paketi ve düşme tespiti aktif.",
    lastSeen: "Az önce",
  },
];

export default function CortexAdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [orgName, setOrgName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>("ULTRA");
  const [generatedKey, setGeneratedKey] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);

  const [customers, setCustomers] = useState<CustomerNode[]>(INITIAL_CUSTOMERS);
  const [actionBanner, setActionBanner] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === "admin" && password === "Kingofthegame0714*") {
      setAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError(
        "Geçersiz yönetici kimlik bilgileri. Lütfen yetkili kullanıcı adı ve şifrenizi girin."
      );
    }
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetOrg = orgName.trim() || "Müşteri Kurumu";
    const key = await generateCommercialLicenseKey(selectedPlan, targetOrg);
    setGeneratedKey(key);
    setCopiedKey(false);

    const spec = PLAN_SPECS[selectedPlan];
    const newNode: CustomerNode = {
      id: `CUST-${105 + customers.length}`,
      org: targetOrg,
      contact: contactEmail.trim() || "iletisim@musteri.com",
      plan: selectedPlan,
      licenseKey: key,
      camerasUsed: 1,
      camerasMax: spec.camerasMax,
      rulesUsed: 2,
      rulesMax: spec.rulesMax,
      retentionDays: spec.retentionDays,
      ollamaModel: selectedPlan === "PRO" ? "Yerel Motor" : "gemma3:4b",
      telegramActive: true,
      status: "online",
      issueNote: `${spec.label} lisansı üretildi ve müşteri istasyonuna tanımlandı.`,
      lastSeen: "Yeni oluşturuldu",
    };
    setCustomers((prev) => [newNode, ...prev]);
    setActionBanner(
      `✅ "${targetOrg}" için ${spec.label} lisans anahtarı (${key}) üretildi. Müşteri bu anahtarı Cortex masaüstü uygulamasında "Ayarlar → Müşteri Lisans Etkinleştirme" alanına yapıştırdığında paket anında aktif olur.`
    );
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  const triggerIntervention = async (
    custId: string,
    action:
      | "reset_streams"
      | "clear_queues"
      | "restart_telegram"
      | "run_diagnostics"
      | "upgrade_ultra"
      | "toggle_suspend"
  ) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== custId) return c;
        if (action === "reset_streams") {
          return {
            ...c,
            status: "online",
            issueNote:
              "Uzaktan müdahale tamamlandı: Tüm RTSP kamera akışları ve FFmpeg işçileri yeniden başlatıldı.",
            lastSeen: "Şimdi",
          };
        }
        if (action === "clear_queues") {
          return {
            ...c,
            status: "online",
            issueNote:
              "Uzaktan müdahale tamamlandı: Olay ve AI analiz kuyrukları temizlendi, bellek optimize edildi.",
            lastSeen: "Şimdi",
          };
        }
        if (action === "restart_telegram") {
          return {
            ...c,
            telegramActive: true,
            status: "online",
            issueNote:
              "İki Yönlü Telegram Komuta Botu long-polling döngüsü uzaktan yeniden başlatıldı.",
            lastSeen: "Şimdi",
          };
        }
        if (action === "run_diagnostics") {
          return {
            ...c,
            status: "online",
            issueNote:
              "Tam sistem tanılaması (RTSP, SQLite WAL, Ollama VLM, SHA-256 Kanıt Zinciri) başarıyla geçti.",
            lastSeen: "Şimdi",
          };
        }
        if (action === "toggle_suspend") {
          const nextSuspended = c.status !== "suspended";
          return {
            ...c,
            status: nextSuspended ? "suspended" : "online",
            issueNote: nextSuspended
              ? "İstasyon yönetici tarafından geçici olarak askıya alındı."
              : "İstasyon yeniden aktif duruma geçirildi.",
            lastSeen: "Şimdi",
          };
        }
        return c;
      })
    );

    if (action === "upgrade_ultra") {
      const target = customers.find((c) => c.id === custId);
      if (target) {
        const newKey = await generateCommercialLicenseKey("ULTRA", target.org);
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === custId
              ? {
                  ...c,
                  plan: "ULTRA",
                  licenseKey: newKey,
                  camerasMax: 32,
                  rulesMax: 128,
                  retentionDays: 30,
                  status: "online",
                  issueNote: `Paket ULTRA seviyesine yükseltildi. Yeni anahtar: ${newKey}`,
                  lastSeen: "Şimdi",
                }
              : c
          )
        );
        setGeneratedKey(newKey);
      }
    }

    setActionBanner(
      `🛠️ [${custId}] istasyonuna uzaktan yönetici müdahalesi (${action}) başarıyla uygulandı.`
    );
  };

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full mb-2">
                IPScans Cortex 2.0 Pro
              </span>
              <h1 className="text-2xl font-bold text-slate-900">
                Merkezi Yönetim ve Lisans Paneli
              </h1>
            </div>
            <span className="text-3xl">🛡️</span>
          </div>
          <p className="text-sm text-slate-600 mb-6">
            Kayıtlı müşteri istasyonlarını izlemek, aksaklıklara uzaktan müdahale
            etmek ve kriptografik <strong>PRO / PLUS / ULTRA</strong> lisans
            anahtarı üretmek için yönetici hesabınızla giriş yapın.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                Yönetici Kullanıcı Adı
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                Yönetici Şifresi
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
                required
              />
            </div>

            {authError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs font-medium text-red-700">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 text-sm transition"
            >
              Yönetim Paneline Giriş Yap
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
            <Link href="/tr/cortex" className="hover:text-blue-600 font-medium">
              ← Cortex Ürün Sayfasına Dön
            </Link>
            <span>HMAC-SHA256 Root Authority</span>
          </div>
        </div>
      </main>
    );
  }

  const totalCameras = customers.reduce((acc, c) => acc + c.camerasUsed, 0);
  const totalRules = customers.reduce((acc, c) => acc + c.rulesUsed, 0);
  const warningCount = customers.filter((c) => c.status !== "online").length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                Yönetici Oturumu Aktif (admin)
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                Cortex 2.0 Pro Lisans Otoritesi
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              IPScans Cortex — Merkezi Yönetim, Müşteri İzleme ve Lisans Paneli
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Bu panelde ürettiğiniz <strong>IPS-PRO</strong>,{" "}
              <strong>IPS-PLUS</strong> ve <strong>IPS-ULTRA</strong> lisans
              anahtarları, müşterinizin masaüstü Cortex uygulamasında anında
              doğrulanır ve ilgili paket kotalarını açar.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/tr/cortex"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Ürün Sayfası
            </Link>
            <button
              onClick={() => setAuthenticated(false)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Güvenli Çıkış
            </button>
          </div>
        </div>

        {actionBanner && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900 font-medium flex items-center justify-between">
            <span>{actionBanner}</span>
            <button
              onClick={() => setActionBanner("")}
              className="text-xs font-bold text-blue-700 hover:underline ml-4"
            >
              Kapat
            </button>
          </div>
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase text-slate-500">
              Kayıtlı Müşteri İstasyonu
            </div>
            <div className="text-3xl font-bold text-slate-900 mt-1">
              {customers.length}
            </div>
            <div className="text-xs text-emerald-600 font-medium mt-1">
              PRO / PLUS / ULTRA Lisanslı
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase text-slate-500">
              Toplam Aktif Kamera
            </div>
            <div className="text-3xl font-bold text-blue-600 mt-1">
              {totalCameras}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Canlı RTSP / ONVIF Akışı
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase text-slate-500">
              Çalışan Kural & AI Şablonu
            </div>
            <div className="text-3xl font-bold text-indigo-600 mt-1">
              {totalRules}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Yerel + Pro Takip + Ollama VLM
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase text-slate-500">
              Müdahale Bekleyen İstasyon
            </div>
            <div
              className={`text-3xl font-bold mt-1 ${
                warningCount > 0 ? "text-amber-600" : "text-emerald-600"
              }`}
            >
              {warningCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Uzaktan Tek Tıkla Onarım Hazır
            </div>
          </div>
        </div>

        {/* License Generator + Package Tiers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              🔑 Lisans Token Üretici (Sadece Yönetici)
            </h2>
            <p className="text-xs text-slate-600 mb-4">
              Müşteri adını ve sattığınız paketi seçin. Üretilen anahtarı
              müşterinin Cortex uygulamasına girdiğinizde sistem anında aktif
              olur.
            </p>
            <form onSubmit={handleGenerateKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Müşteri / Kurum Adı
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Örn: Boğaziçi Holding A.Ş."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Müşteri İletişim / E-Posta
                </label>
                <input
                  type="text"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="guvenlik@firma.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Ticari Paket Seçimi
                </label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value as PlanTier)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium focus:border-blue-600 focus:outline-none"
                >
                  <option value="PRO">
                    PRO Paket (Maks 4 Kamera · 8 Kural · 7 Gün)
                  </option>
                  <option value="PLUS">
                    PLUS Paket (Maks 12 Kamera · 32 Kural · 15 Gün)
                  </option>
                  <option value="ULTRA">
                    ULTRA Paket (Maks 32 Kamera · 128 Kural · 30 Gün)
                  </option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 text-sm transition"
              >
                Müşteri Lisans Anahtarı Üret
              </button>
            </form>

            {generatedKey && (
              <div className="mt-5 rounded-xl bg-slate-900 text-white p-4">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Üretilen Müşteri Lisans Anahtarı
                </div>
                <div className="font-mono text-base font-bold text-emerald-400 mt-1 break-all">
                  {generatedKey}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-300">
                    Cortex Masaüstü ile %100 Uyumlu
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(generatedKey)}
                    className="rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-xs font-semibold text-white"
                  >
                    {copiedKey ? "✓ Kopyalandı" : "Anahtarı Kopyala"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3 Commercial Package Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["PRO", "PLUS", "ULTRA"] as PlanTier[]).map((tier) => {
              const spec = PLAN_SPECS[tier];
              const isSelected = selectedPlan === tier;
              return (
                <div
                  key={tier}
                  onClick={() => setSelectedPlan(tier)}
                  className={`cursor-pointer rounded-2xl border p-5 transition flex flex-col justify-between ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/40 shadow-md"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
                        {tier}
                      </span>
                      <span className="text-xs font-semibold text-blue-700">
                        {spec.camerasMax} Kamera
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {spec.label}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 mt-0.5 mb-3">
                      {spec.priceNote}
                    </p>
                    <ul className="space-y-2 text-xs text-slate-700">
                      {spec.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] font-semibold text-blue-600">
                    {isSelected
                      ? "● Üretim İçin Seçili Paket"
                      : "Seçmek için tıklayın"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Registered Customers & Remote Intervention Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                🖥️ Kayıtlı Müşteri İstasyonları ve Uzaktan Müdahale Masası
              </h2>
              <p className="text-xs text-slate-600">
                Müşterilerinizin kamera/kural kotalarını canlı takip edin; akış
                kopması veya kuyruk sıkışması durumunda tek tıkla müdahale edin.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customers.map((c) => {
              const camPct = Math.min(
                100,
                Math.round((c.camerasUsed / Math.max(1, c.camerasMax)) * 100)
              );
              const rulePct = Math.min(
                100,
                Math.round((c.rulesUsed / Math.max(1, c.rulesMax)) * 100)
              );
              return (
                <div
                  key={c.id}
                  className={`rounded-xl border p-5 ${
                    c.status === "warning"
                      ? "border-amber-300 bg-amber-50/30"
                      : c.status === "suspended"
                      ? "border-red-300 bg-red-50/30"
                      : "border-slate-200 bg-slate-50/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-500">
                          {c.id}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-600 text-white">
                          {c.plan}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            c.status === "online"
                              ? "bg-emerald-100 text-emerald-800"
                              : c.status === "warning"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {c.status === "online"
                            ? "● Çevrimiçi"
                            : c.status === "warning"
                            ? "▲ Müdahale Önerilir"
                            : "■ Askıda"}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-1">
                        {c.org}
                      </h3>
                      <div className="text-xs text-slate-500">
                        {c.contact} · Son sinyal: {c.lastSeen}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(c.licenseKey)}
                      className="text-xs font-mono bg-white border border-slate-200 rounded px-2.5 py-1 hover:border-blue-500 text-slate-700"
                      title="Lisans Anahtarını Kopyala"
                    >
                      {c.licenseKey}
                    </button>
                  </div>

                  {/* Usage bars */}
                  <div className="grid grid-cols-2 gap-3 my-4">
                    <div className="bg-white rounded-lg p-2.5 border border-slate-200/80">
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span>Kamera Kotası</span>
                        <span>
                          {c.camerasUsed} / {c.camerasMax}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600"
                          style={{ width: `${camPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-2.5 border border-slate-200/80">
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span>Kural Kotası</span>
                        <span>
                          {c.rulesUsed} / {c.rulesMax}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600"
                          style={{ width: `${rulePct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 bg-white rounded-lg border border-slate-200/80 p-2.5 mb-3">
                    <strong>Durum Notu:</strong> {c.issueNote}
                  </div>

                  {/* Intervention buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        triggerIntervention(c.id, "reset_streams")
                      }
                      className="rounded-md bg-white border border-slate-300 hover:border-blue-600 px-2.5 py-1 text-xs font-semibold text-slate-700"
                    >
                      🔄 Akışları Yenile
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerIntervention(c.id, "clear_queues")}
                      className="rounded-md bg-white border border-slate-300 hover:border-blue-600 px-2.5 py-1 text-xs font-semibold text-slate-700"
                    >
                      🧹 Kuyrukları Temizle
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        triggerIntervention(c.id, "restart_telegram")
                      }
                      className="rounded-md bg-white border border-slate-300 hover:border-blue-600 px-2.5 py-1 text-xs font-semibold text-slate-700"
                    >
                      📲 Telegram Bot Onar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        triggerIntervention(c.id, "run_diagnostics")
                      }
                      className="rounded-md bg-white border border-slate-300 hover:border-blue-600 px-2.5 py-1 text-xs font-semibold text-slate-700"
                    >
                      🩺 Tanılama Çalıştır
                    </button>
                    {c.plan !== "ULTRA" && (
                      <button
                        type="button"
                        onClick={() =>
                          triggerIntervention(c.id, "upgrade_ultra")
                        }
                        className="rounded-md bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 text-xs font-semibold text-white"
                      >
                        ⚡ ULTRA&apos;ya Yükselt
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        triggerIntervention(c.id, "toggle_suspend")
                      }
                      className="rounded-md bg-slate-200 hover:bg-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-800"
                    >
                      {c.status === "suspended" ? "▶️ Aktifleştir" : "⏸️ Askıya Al"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
