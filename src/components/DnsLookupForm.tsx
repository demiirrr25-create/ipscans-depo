"use client";

import { useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";

type DnsResponse = {
  domain: string;
  records: Record<string, string[]>;
};

const TYPES = ["A", "AAAA", "MX", "TXT", "NS", "CNAME"];

export function DnsLookupForm({ dict }: { dict: Dictionary["dns"] }) {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<DnsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function lookup(value: string) {
    if (!value) return;
    setLoading(true);
    setError(false);
    setResult(null);
    try {
      const res = await fetch(`/api/dns?domain=${encodeURIComponent(value)}`);
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
          lookup(domain.trim());
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder={dict.placeholder}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-white outline-none focus:border-white/40"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-white px-5 py-3 font-semibold text-black transition hover:bg-white disabled:opacity-60"
        >
          {loading ? dict.loading : dict.button}
        </button>
      </form>

      {error && (
        <p className="mt-6 rounded-lg border border-white/25 bg-white/10 px-4 py-3 text-sm text-white">
          {dict.error}
        </p>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          {TYPES.map((type) => (
            <div
              key={type}
              className="overflow-hidden rounded-xl border border-white/10"
            >
              <div className="bg-white/5 px-4 py-2 text-sm font-semibold text-white">
                {type}
              </div>
              <div className="px-4 py-3">
                {result.records[type]?.length ? (
                  <ul className="space-y-1">
                    {result.records[type].map((r, i) => (
                      <li
                        key={i}
                        className="break-all font-mono text-sm text-neutral-200"
                      >
                        {r}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-sm text-neutral-500">
                    {dict.noRecords}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
