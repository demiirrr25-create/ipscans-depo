"use client";

import { useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";

type PortResult = {
  host: string;
  ip: string;
  ports: { port: number; name: string; open: boolean }[];
};

export function PortCheckForm({ dict }: { dict: Dictionary["ports"] }) {
  const [host, setHost] = useState("");
  const [result, setResult] = useState<PortResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function check(value: string) {
    if (!value) return;
    setLoading(true);
    setError(false);
    setResult(null);
    try {
      const res = await fetch(`/api/ports?host=${encodeURIComponent(value)}`);
      const data = await res.json();
      if (!res.ok || data.error) setError(true);
      else setResult(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          check(host.trim());
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <input
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder={dict.placeholder}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-white outline-none focus:border-white/40"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:scale-[1.03] disabled:opacity-60"
        >
          {loading ? dict.loading : dict.button}
        </button>
      </form>

      <p className="mt-3 text-xs text-amber-300/80">{dict.disclaimer}</p>

      {error && (
        <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {dict.error}
        </p>
      )}

      {result && (
        <div className="mt-6">
          <p className="mb-3 text-sm text-neutral-400">
            {result.host}{" "}
            <span className="font-mono text-neutral-500">({result.ip})</span>
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {result.ports.map((p) => (
              <div
                key={p.port}
                className={`rounded-xl border px-4 py-3 ${
                  p.open
                    ? "border-white/30 bg-white/10"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-lg font-semibold text-white">
                    {p.port}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      p.open ? "text-white" : "text-neutral-500"
                    }`}
                  >
                    {p.open ? dict.open : dict.closed}
                  </span>
                </div>
                <div className="text-xs text-neutral-400">{p.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
