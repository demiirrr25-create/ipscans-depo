"use client";

import { useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { localeTags, type Locale } from "@/i18n/config";
import { toolCopy } from "@/components/tools/copy";
import { Icon } from "@/components/ds/Icon";
import { CopyButton } from "@/components/ds/CopyButton";

type IpResult = {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  isp: string | null;
  org: string | null;
  asn?: string | null;
};

const EXAMPLES = ["8.8.8.8", "1.1.1.1", "9.9.9.9", "208.67.222.222"] as const;

function formatLocalTime(timezone: string | null, locale: Locale): string | null {
  if (!timezone) return null;
  try {
    return new Intl.DateTimeFormat(localeTags[locale], {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date());
  } catch {
    return null;
  }
}

export function IpLookupForm({
  dict,
  locale = "en",
}: {
  dict: Dictionary["ipLookup"];
  locale?: Locale;
}) {
  const copy = toolCopy[locale];
  const [ip, setIp] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [isOwnIp, setIsOwnIp] = useState(false);
  const [result, setResult] = useState<IpResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function lookup(rawValue: string) {
    const cleaned = rawValue.trim();
    setLastQuery(cleaned);
    setIsOwnIp(cleaned === "");
    setLoading(true);
    setError(false);
    setResult(null);
    try {
      const url = cleaned ? `/api/ip?ip=${encodeURIComponent(cleaned)}` : "/api/ip";
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

  const hasCoords =
    result != null &&
    typeof result.latitude === "number" &&
    typeof result.longitude === "number" &&
    Number.isFinite(result.latitude) &&
    Number.isFinite(result.longitude);

  const coordString = hasCoords ? `${result.latitude}, ${result.longitude}` : null;
  const localTime = result ? formatLocalTime(result.timezone, locale) : null;
  const locationSummary = result
    ? [result.city, result.region, result.country].filter(Boolean).join(", ")
    : "";

  return (
    <div className="space-y-6">
      {/* Search Workspace Bar */}
      <div className="ds-card p-6 sm:p-8">
        <label htmlFor="IpLookupForm-input" className="ds-label">
          {dict.fields.ip}
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookup(ip);
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 text-ink-3">
              <Icon name="globe" size={18} />
            </span>
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
              className="ds-input ds-mono ps-11"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex-1 sm:flex-initial"
            >
              {loading ? (
                <span className="ds-spinner" aria-hidden="true" />
              ) : (
                <Icon name="search" size={17} />
              )}
              <span>{loading ? dict.loading : dict.button}</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setIp("");
                lookup("");
              }}
              className="btn btn-secondary flex-1 sm:flex-initial"
            >
              <Icon name="network" size={17} />
              <span>{dict.myIp}</span>
            </button>
          </div>
        </form>

        {/* Example Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="ds-caption me-1">{copy.examples}:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              disabled={loading}
              onClick={() => {
                setIp(ex);
                lookup(ex);
              }}
              className="ds-chip ds-mono cursor-pointer transition-colors hover:bg-surface-3 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          id="IpLookupForm-error"
          role="alert"
          className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-bad/25 bg-bad-soft p-5 sm:p-6"
        >
          <div className="flex items-center gap-3 text-ink">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-bad/15 text-bad">
              <Icon name="info" size={18} />
            </span>
            <p className="text-[0.95rem] font-medium text-ink">{dict.error}</p>
          </div>
          <button
            type="button"
            onClick={() => lookup(lastQuery)}
            className="btn btn-secondary btn-sm"
          >
            <Icon name="refresh" size={15} />
            <span>{copy.retry}</span>
          </button>
        </div>
      )}

      {/* Results & Live Region */}
      <div role="status" aria-live="polite" aria-busy={loading}>
        {loading && (
          <div className="space-y-4">
            <div className="ds-card p-6 sm:p-8">
              <div className="ds-skeleton h-4 w-28" />
              <div className="ds-skeleton mt-4 h-10 w-64 max-w-full" />
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="ds-skeleton h-7 w-40 rounded-full" />
                <div className="ds-skeleton h-7 w-32 rounded-full" />
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {[0, 1].map((col) => (
                <div key={col} className="ds-card p-6 sm:p-8 space-y-4">
                  <div className="ds-skeleton h-6 w-36" />
                  {[0, 1, 2, 3].map((row) => (
                    <div key={row} className="flex justify-between gap-4 py-2">
                      <div className="ds-skeleton h-4 w-24" />
                      <div className="ds-skeleton h-4 w-40" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !result && !error && (
          <div className="ds-card-muted flex flex-col items-center justify-center p-10 text-center sm:p-14">
            <span className="mb-4 grid size-12 place-items-center rounded-[14px] bg-signal-soft text-signal">
              <Icon name="globe" size={22} />
            </span>
            <h2 className="ds-h4 text-ink">{copy.emptyTitle}</h2>
            <p className="ds-body mt-2 max-w-[440px]">{copy.emptyBody}</p>
            <button
              type="button"
              onClick={() => {
                setIp("");
                lookup("");
              }}
              className="btn btn-secondary btn-sm mt-6"
            >
              <Icon name="network" size={15} />
              <span>{dict.myIp}</span>
            </button>
          </div>
        )}

        {!loading && result && (
          <div className="space-y-4">
            {/* Primary Answer Card */}
            <div className="ds-card p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-ink-3">
                    {isOwnIp && <span className="ds-live-dot" aria-hidden="true" />}
                    <span>{isOwnIp ? copy.ip.yourIp : dict.fields.ip}</span>
                  </div>
                  <p className="ds-h2 ds-mono break-all text-ink">{result.ip}</p>
                </div>
                <CopyButton
                  value={result.ip}
                  label={copy.copy}
                  copiedLabel={copy.copied}
                />
              </div>

              {(locationSummary || result.isp || result.org) && (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {locationSummary && (
                    <span className="ds-chip">
                      <Icon name="map" size={14} className="text-signal" />
                      <span>{locationSummary}</span>
                    </span>
                  )}
                  {(result.isp || result.org) && (
                    <span className="ds-chip">
                      <Icon name="network" size={14} className="text-signal" />
                      <span>{result.isp || result.org}</span>
                    </span>
                  )}
                  {result.asn && (
                    <span className="ds-chip ds-mono">{result.asn}</span>
                  )}
                </div>
              )}
            </div>

            {/* Location & Network Detail Cards */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="ds-card p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-[11px] bg-signal-soft text-signal">
                    <Icon name="map" size={18} />
                  </span>
                  <h2 className="ds-h4 text-ink">{copy.ip.location}</h2>
                </div>
                <dl className="mt-5">
                  <div className="ds-kv">
                    <dt>{dict.fields.country}</dt>
                    <dd>
                      {result.country
                        ? result.countryCode
                          ? `${result.country} (${result.countryCode})`
                          : result.country
                        : "—"}
                    </dd>
                  </div>
                  <div className="ds-kv">
                    <dt>{dict.fields.region}</dt>
                    <dd>{result.region || "—"}</dd>
                  </div>
                  <div className="ds-kv">
                    <dt>{dict.fields.city}</dt>
                    <dd>{result.city || "—"}</dd>
                  </div>
                  <div className="ds-kv">
                    <dt>{dict.fields.timezone}</dt>
                    <dd className="ds-mono">{result.timezone || "—"}</dd>
                  </div>
                  {localTime && (
                    <div className="ds-kv">
                      <dt>{copy.ip.localTime}</dt>
                      <dd className="ds-tabular">{localTime}</dd>
                    </div>
                  )}
                  <div className="ds-kv">
                    <dt>{dict.fields.coordinates}</dt>
                    <dd>
                      {coordString ? (
                        <span className="inline-flex flex-wrap items-center gap-2">
                          <code className="ds-mono text-[0.9rem]">{coordString}</code>
                          <CopyButton
                            value={coordString}
                            label={copy.copy}
                            copiedLabel={copy.copied}
                          />
                        </span>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="ds-card flex flex-col justify-between p-6 sm:p-8">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-[11px] bg-signal-soft text-signal">
                      <Icon name="network" size={18} />
                    </span>
                    <h2 className="ds-h4 text-ink">{copy.ip.network}</h2>
                  </div>
                  <dl className="mt-5">
                    <div className="ds-kv">
                      <dt>{dict.fields.ip}</dt>
                      <dd className="ds-mono">{result.ip}</dd>
                    </div>
                    <div className="ds-kv">
                      <dt>{dict.fields.isp}</dt>
                      <dd>{result.isp || "—"}</dd>
                    </div>
                    <div className="ds-kv">
                      <dt>{dict.fields.org}</dt>
                      <dd>{result.org || "—"}</dd>
                    </div>
                    <div className="ds-kv">
                      <dt>{copy.ip.asn}</dt>
                      <dd className="ds-mono">{result.asn || "—"}</dd>
                    </div>
                  </dl>
                </div>
                <p className="ds-caption mt-6 border-t border-line pt-4">
                  {copy.ip.approx}
                </p>
              </div>
            </div>

            {/* Real OpenStreetMap Embed & Link */}
            {hasCoords && (
              <div className="ds-card overflow-hidden p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Icon name="map" size={18} className="text-signal" />
                    <h3 className="font-medium text-ink">{dict.mapLabel}</h3>
                  </div>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${result.latitude}&mlon=${result.longitude}#map=11/${result.latitude}/${result.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    <span>{copy.ip.openMap}</span>
                    <Icon name="external" size={14} />
                  </a>
                </div>
                <div className="overflow-hidden rounded-md border border-line bg-surface-dim">
                  <iframe
                    title={dict.mapLabel}
                    className="h-72 w-full border-0 sm:h-80"
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                      result.longitude! - 0.05
                    }%2C${result.latitude! - 0.05}%2C${result.longitude! + 0.05}%2C${
                      result.latitude! + 0.05
                    }&layer=mapnik&marker=${result.latitude}%2C${result.longitude}`}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
