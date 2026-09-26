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
    <div className="mx-auto max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          lookup(ip.trim());
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <input
          value={ip}
          onChange={(e) => setIp(e.target.value)}
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

      <button
        onClick={() => {
          setIp("");
          lookup("");
        }}
        className="mt-3 text-sm text-white hover:underline"
      >
        {dict.myIp}
      </button>

      {error && (
        <p className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {dict.error}
        </p>
      )}

      {result && (
        <div className="mt-6 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <tbody>
              {rows.map(([label, value]) => (
                <tr
                  key={label}
                  className="border-b border-white/10 last:border-0"
                >
                  <td className="w-2/5 bg-white/5 px-4 py-3 font-medium text-neutral-400">
                    {label}
                  </td>
                  <td className="px-4 py-3 font-mono text-white">
                    {value ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && result.latitude != null && result.longitude != null && (
        <div className="mt-6">
          <p className="mb-2 text-sm text-neutral-400">{dict.mapLabel}</p>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <iframe
              title="map"
              className="h-72 w-full"
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
  );
}
