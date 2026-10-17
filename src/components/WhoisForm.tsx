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
    <div className="agy-form-stack">
      <label htmlFor="WhoisForm-input" className="agy-form-label">
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
          id="WhoisForm-input"
          autoCapitalize="none"
          spellCheck={false}
          autoComplete="off"
          required
          aria-invalid={error}
          aria-describedby={error ? "WhoisForm-error" : undefined}
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
        <p id="WhoisForm-error" role="alert" className="agy-alert-box">
          {dict.error}
        </p>
      )}

      <div role="status" aria-live="polite" aria-busy={loading}>
        {result && (
          <div className="agy-result-card">
            <table className="agy-table">
              <tbody>
                {rows.map(([label, value]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>{value ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
