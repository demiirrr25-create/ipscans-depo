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
    <div className="agy-form-stack">
      <label htmlFor="DnsLookupForm-input" className="agy-form-label">
        {dict.placeholder}
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          lookup(domain.trim());
        }}
        className="agy-form-row"
      >
        <input
          id="DnsLookupForm-input"
          autoCapitalize="none"
          spellCheck={false}
          autoComplete="off"
          required
          aria-invalid={error}
          aria-describedby={error ? "DnsLookupForm-error" : undefined}
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
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

      {error && (
        <p id="DnsLookupForm-error" role="alert" className="agy-alert-box">
          {dict.error}
        </p>
      )}

      <div role="status" aria-live="polite" aria-busy={loading}>
        {result && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {TYPES.map((type) => (
              <div key={type} className="agy-result-card">
                <div className="agy-result-card__head">{type}</div>
                <div className="p-4">
                  {result.records[type]?.length ? (
                    <ul className="space-y-1.5">
                      {result.records[type].map((r, i) => (
                        <li
                          key={i}
                          className="break-all font-mono text-sm text-neutral-100"
                        >
                          {r}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-sm text-neutral-400">
                      {dict.noRecords}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
