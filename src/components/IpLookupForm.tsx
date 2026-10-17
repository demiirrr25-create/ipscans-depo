"use client";

import { useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";

type IpResult = {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string | null;
  isp: string | null;
  org: string | null;
};

export function IpLookupForm({ dict }: { dict: Dictionary["ipLookup"] }) {
  const [ip, setIp] = useState("");
  const [result, setResult] = useState<IpResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function lookup(value: string) {
    setLoading(true);
    setError(false);
    setResult(null);
    try {
      const url = value ? `/api/ip?ip=${encodeURIComponent(value)}` : "/api/ip";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(true);
      } else {
        setResult(data);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const rows: [string, string | number | null][] = result
    ? [
        [dict.fields.ip, result.ip],
        [dict.fields.country, `${result.country} (${result.countryCode})`],
        [dict.fields.region, result.region],
        [dict.fields.city, result.city],
        [dict.fields.isp, result.isp],
        [dict.fields.org, result.org],
        [dict.fields.timezone, result.timezone],
        [
          dict.fields.coordinates,
          result.latitude != null
            ? `${result.latitude}, ${result.longitude}`
            : null,
        ],
      ]
    : [];

  return (
    <div className="agy-form-stack">
      <label htmlFor="IpLookupForm-input" className="agy-form-label">
        {dict.placeholder}
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          lookup(ip.trim());
        }}
        className="agy-form-row"
      >
        <input
          id="IpLookupForm-input"
          autoCapitalize="none"
          spellCheck={false}
          autoComplete="off"
          aria-invalid={error}
          aria-describedby={error ? "IpLookupForm-error" : undefined}
          value={ip}
          onChange={(e) => setIp(e.target.value)}
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

      <div className="mt-4">
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setIp("");
            lookup("");
          }}
          className="button button-compact button-secondary"
        >
          <span>{dict.myIp}</span>
        </button>
      </div>

      {error && (
        <p id="IpLookupForm-error" role="alert" className="agy-alert-box">
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

        {result && result.latitude != null && result.longitude != null && (
          <div className="mt-6">
            <p className="agy-form-label mb-3">{dict.mapLabel}</p>
            <div className="agy-result-card overflow-hidden">
              <iframe
                title={dict.mapLabel}
                className="h-72 w-full border-0"
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                  result.longitude - 0.05
                }%2C${result.latitude - 0.05}%2C${result.longitude + 0.05}%2C${
                  result.latitude + 0.05
                }&layer=mapnik&marker=${result.latitude}%2C${result.longitude}`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
