"use client";

import { useState } from "react";

type StageResult = {
  step: number;
  id: string;
  title: string;
  durationMs: number;
  status: string;
  details: string[];
};

export function SentinelInteractiveConsole({ isTr }: { isTr: boolean }) {
  const [prompt, setPrompt] = useState(
    isTr
      ? "Dahua kamerama sızdılar, hemen ağa çıkmasını engelle, ana modemden portları kapat ve sorunu çözdükten sonra ağa erişim ver."
      : "My Dahua camera was compromised—immediately block its outbound network access, close WAN ports on the main router, remediate the camera, and restore LAN access."
  );
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [stages, setStages] = useState<StageResult[]>([]);
  const [gatewayIp, setGatewayIp] = useState("192.168.1.1");
  const [targetIp, setTargetIp] = useState("192.168.1.108");

  async function runSimulation() {
    setLoading(true);
    try {
      const res = await fetch("/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setSummary(data.aiSummaryTr || null);
      if (Array.isArray(data.stages)) {
        setStages(data.stages);
      }
      if (data.gateway?.ip) setGatewayIp(data.gateway.ip);
      if (data.targetDevice?.ip) setTargetIp(data.targetDevice.ip);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ds-card p-6 sm:p-9">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="ds-eyebrow">
            {isTr
              ? "CANLI RUST + OLLAMA SİBER AJAN KONSOLU"
              : "LIVE RUST + OLLAMA CYBER AGENT CONSOLE"}
          </p>
          <h3 className="ds-h3 mt-1 text-ink">
            {isTr
              ? "Otonom Kamera ve Ana Modem Savunma Hattı"
              : "Autonomous Camera & Main Gateway Defense Pipeline"}
          </h3>
        </div>
        <span className="ds-mono rounded-full border border-line-2 bg-surface-dim px-3.5 py-1.5 text-xs font-semibold text-signal">
          ipscans-cyber-agent:latest · Rust 3.0
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="ds-input flex-1"
          aria-label={isTr ? "Güvenlik olayı açıklaması" : "Security incident prompt"}
        />
        <button
          type="button"
          onClick={runSimulation}
          disabled={loading}
          className="btn btn-primary shrink-0"
        >
          <span>
            {loading
              ? isTr
                ? "Müdahale Yürütülüyor..."
                : "Executing Defense..."
              : isTr
                ? "Otonom Müdahaleyi Çalıştır"
                : "Execute Autonomous Defense"}
          </span>
        </button>
      </div>

      {summary && (
        <div className="mt-6 rounded-xl border border-line-2 bg-surface-dim p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
            <span className="ds-mono text-signal">
              Gateway: {gatewayIp} · Target: {targetIp}
            </span>
            <span className="ds-mono text-emerald-500">
              {isTr ? "KORUMA TAMAMLANDI & LAN ERİŞİMİ AÇILDI" : "REMEDIATED & LAN ACCESS RESTORED"}
            </span>
          </div>
          <p className="mt-2.5 text-sm leading-relaxed text-ink">{summary}</p>
        </div>
      )}

      {stages.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stages.map((st) => (
            <div
              key={st.id}
              className="rounded-xl border border-line bg-surface p-4"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-signal">
                <span className="ds-mono">0{st.step}</span>
                <span className="ds-mono">{st.durationMs} ms</span>
              </div>
              <p className="mt-2 font-semibold text-ink">{st.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-2">
                {(st.details || []).join(" · ")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
