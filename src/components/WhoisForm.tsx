"use client";

import { useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";

type WhoisResult = {
  domain: string;
  registrar: string | null;
  created: string | null;
  updated: string | null;
  expires: string | null;
  status: string[];
  nameservers: string[];
};

function fmt(date: string | null) {
  if (!date) return null;
  const d = new Date(date);
  return isNaN(d.getTime()) ? date : d.toLocaleDateString();
}

export function WhoisForm({ dict }: { dict: Dictionary["whois"] }) {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<WhoisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function lookup(value: string) {
    if (!value) return;
    setLoading(true);
    setError(false);
    setResult(null);
    try {
      const res = await fetch(`/api/whois?domain=${encodeURIComponent(value)}`);
      const data = await res.json();
      if (!res.ok || data.error) setError(true);
      else setResult(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const rows: [string, string | null][] = result
    ? [
        [dict.fields.domain, result.domain],
        [dict.fields.registrar, result.registrar],
        [dict.fields.created, fmt(result.created)],
        [dict.fields.updated, fmt(result.updated)],
        [dict.fields.expires, fmt(result.expires)],
        [dict.fields.status, result.status.join(", ") || null],
        [dict.fields.nameservers, result.nameservers.join(", ") || null],
      ]
    : [];

  return (
    <div className="mx-auto max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          lookup(domain.trim());
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
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

      {error && (
        <p className="mt-6 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm text-white">
          {dict.error}
        </p>
      )}

      {result && (
        <div className="mt-6 overflow-hidden rounded-2xl glass">
          <table className="w-full text-sm">
            <tbody>
              {rows.map(([label, value]) => (
                <tr key={label} className="border-b border-white/5 last:border-0">
                  <td className="w-2/5 px-4 py-3 font-medium text-neutral-400">
                    {label}
                  </td>
                  <td className="break-all px-4 py-3 font-mono text-white">
                    {value ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
