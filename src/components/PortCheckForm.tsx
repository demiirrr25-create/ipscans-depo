"use client";

import { useState } from "react";
import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { uiText } from "@/i18n/ui";

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
    <div className="agy-form-stack">
      <label htmlFor="PortCheckForm-input" className="agy-form-label">
        {dict.placeholder}
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          check(host.trim());
        }}
        className="agy-form-row"
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
          className="agy-input"
        />
        <button
          type="submit"
          disabled={loading}
          className="button button-primary"
        >
          <span>{loading ? dict.loading : dict.button}</span>
        </button>
      </form>

      <p className="mt-4 text-xs text-neutral-400">{dict.disclaimer}</p>
      <p className="mt-2 text-xs leading-relaxed text-neutral-400">
        {uiText(
          locale,
          "Tests 12 selected TCP ports from the IPScans server. No reply can mean a closed port, filtering or a timeout; this does not scan your local network.",
          "IPScans sunucusundan seçili 12 TCP portu kontrol edilir. Yanıt alınamaması kapalı port, filtreleme veya zaman aşımı olabilir; yerel ağınız taranmaz."
        )}
      </p>

      {error && (
        <p id="PortCheckForm-error" role="alert" className="agy-alert-box">
          {dict.error}
        </p>
      )}

      <div role="status" aria-live="polite" aria-busy={loading}>
        {result && (
          <div className="mt-6">
            <p className="mb-4 text-sm text-neutral-300">
              {result.host}{" "}
              <span className="font-mono text-neutral-400">({result.ip})</span>
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {result.ports.map((p) => (
                <div
                  key={p.port}
                  className={`agy-port-pill ${
                    p.open ? "agy-port-pill--open" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-lg font-semibold text-white">
                      {p.port}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        p.open ? "text-white" : "text-neutral-400"
                      }`}
                    >
                      {p.open
                        ? dict.open
                        : uiText(locale, "No reply", "Yanıt yok")}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-neutral-400">{p.name}</div>
                </div>
              ))}
            </div>

            {result.ports.some((p) => p.open) && (
              <div className="agy-surface-card mt-6 p-6">
                <h3 className="heading-6 text-white">
                  {dict.crossSell.title}
                </h3>
                <p className="mt-2 text-sm text-neutral-300">
                  {dict.crossSell.body}
                </p>
                <Link
                  href={`/${locale}/shop`}
                  className="button button-primary button-compact mt-4"
                >
                  <span>{dict.crossSell.cta} →</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
