"use client";

import { useState } from "react";
import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

type PortResult = {
  host: string;
  ip: string;
  ports: { port: number; name: string; open: boolean }[];
};

export function PortCheckForm({
  dict,
  locale,
}: {
  dict: Dictionary["ports"];
  locale: Locale;
}) {
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
      <label htmlFor="PortCheckForm-input" className="mb-2 block text-sm font-medium text-neutral-200">{dict.placeholder}</label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          check(host.trim());
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <input
          id="PortCheckForm-input"
          autoCapitalize="none"
          spellCheck={false}
          autoComplete="off"
          required
          aria-invalid={error}
          aria-describedby={error ? "PortCheckForm-error" : undefined}
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder={dict.placeholder}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-white focus:border-white/40"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:scale-[1.03] disabled:opacity-60"
        >
          {loading ? dict.loading : dict.button}
        </button>
      </form>

      <p className="mt-3 text-xs text-neutral-400">{dict.disclaimer}</p>

      {error && (
        <p id="PortCheckForm-error" role="alert" className="mt-6 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm text-white">
          {dict.error}
        </p>
      )}

      <div role="status" aria-live="polite" aria-busy={loading}>
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

          {result.ports.some((p) => p.open) && (
            <div className="mt-6 rounded-xl border border-white/20 bg-white/[0.06] p-5">
              <h3 className="font-semibold text-white">
                {dict.crossSell.title}
              </h3>
              <p className="mt-1 text-sm text-neutral-300">
                {dict.crossSell.body}
              </p>
              <Link
                href={`/${locale}/shop`}
                className="mt-3 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-200"
              >
                {dict.crossSell.cta} →
              </Link>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
