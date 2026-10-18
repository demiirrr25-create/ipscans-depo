"use client";

import { useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { localeTags, type Locale } from "@/i18n/config";
import { toolCopy } from "@/components/tools/copy";
import { Icon } from "@/components/ds/Icon";
import { CopyButton } from "@/components/ds/CopyButton";

type WhoisResult = {
  domain: string;
  registrar: string | null;
  created: string | null;
  updated: string | null;
  expires: string | null;
  status: string[];
  nameservers: string[];
};

const EXAMPLES = ["google.com", "cloudflare.com", "wikipedia.org", "iana.org"] as const;

function cleanDomain(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .toLowerCase();
}

function formatDate(date: string | null, locale: Locale): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  try {
    return new Intl.DateTimeFormat(localeTags[locale], {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

function computeExpiryInfo(
  createdIso: string | null,
  expiresIso: string | null,
  locale: Locale,
  expiredLabel: string
): {
  daysRemaining: number;
  label: string;
  tone: "ok" | "warn" | "bad";
  progressPercent: number | null;
} | null {
  if (!expiresIso) return null;
  const exp = new Date(expiresIso);
  if (Number.isNaN(exp.getTime())) return null;

  const now = Date.now();
  const diffMs = exp.getTime() - now;
  const daysRemaining = Math.ceil(diffMs / 86_400_000);

  let label = expiredLabel;
  if (daysRemaining > 0) {
    try {
      const rtf = new Intl.RelativeTimeFormat(localeTags[locale], {
        numeric: "always",
        style: "long",
      });
      label = rtf.format(daysRemaining, "day");
    } catch {
      label = `${daysRemaining}d`;
    }
  }

  const tone: "ok" | "warn" | "bad" =
    daysRemaining <= 0 ? "bad" : daysRemaining <= 30 ? "warn" : "ok";

  let progressPercent: number | null = null;
  if (createdIso) {
    const cr = new Date(createdIso);
    if (!Number.isNaN(cr.getTime()) && exp.getTime() > cr.getTime()) {
      const total = exp.getTime() - cr.getTime();
      const elapsed = now - cr.getTime();
      progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
    }
  }

  return { daysRemaining, label, tone, progressPercent };
}

export function WhoisForm({
  dict,
  locale = "en",
}: {
  dict: Dictionary["whois"];
  locale?: Locale;
}) {
  const copy = toolCopy[locale];
  const [domain, setDomain] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [result, setResult] = useState<WhoisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function lookup(rawValue: string) {
    const cleaned = cleanDomain(rawValue);
    if (!cleaned) return;
    setDomain(cleaned);
    setLastQuery(cleaned);
    setLoading(true);
    setError(false);
    setResult(null);
    try {
      const res = await fetch(`/api/whois?domain=${encodeURIComponent(cleaned)}`);
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

  const createdFormatted = result ? formatDate(result.created, locale) : null;
  const updatedFormatted = result ? formatDate(result.updated, locale) : null;
  const expiresFormatted = result ? formatDate(result.expires, locale) : null;
  const expiryInfo = result
    ? computeExpiryInfo(result.created, result.expires, locale, copy.whois.expired)
    : null;

  return (
    <div className="space-y-6">
      {/* Search Bar Card */}
      <div className="ds-card p-6 sm:p-8">
        <label htmlFor="WhoisForm-input" className="ds-label">
          {dict.fields.domain}
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookup(domain);
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 text-ink-3">
              <Icon name="search" size={18} />
            </span>
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
              className="ds-input ds-mono ps-11"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary sm:shrink-0"
          >
            {loading ? (
              <span className="ds-spinner" aria-hidden="true" />
            ) : (
              <Icon name="search" size={17} />
            )}
            <span>{loading ? dict.loading : dict.button}</span>
          </button>
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
                setDomain(ex);
                lookup(ex);
              }}
              className="ds-chip ds-mono cursor-pointer transition-colors hover:bg-surface-3 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          id="WhoisForm-error"
          role="alert"
          className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-bad/25 bg-bad-soft p-5 sm:p-6"
        >
          <div className="flex items-center gap-3 text-ink">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-bad/15 text-bad">
              <Icon name="info" size={18} />
            </span>
            <p className="text-[0.95rem] font-medium text-ink">{dict.error}</p>
          </div>
          {lastQuery && (
            <button
              type="button"
              onClick={() => lookup(lastQuery)}
              className="btn btn-secondary btn-sm"
            >
              <Icon name="refresh" size={15} />
              <span>{copy.retry}</span>
            </button>
          )}
        </div>
      )}

      {/* Results & Live Status */}
      <div role="status" aria-live="polite" aria-busy={loading}>
        {loading && (
          <div className="space-y-4">
            <div className="ds-card p-6 sm:p-8">
              <div className="ds-skeleton h-4 w-28" />
              <div className="ds-skeleton mt-3 h-9 w-64 max-w-full" />
              <div className="ds-skeleton mt-6 h-2.5 w-full rounded-full" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {[0, 1].map((col) => (
                <div key={col} className="ds-card p-6 sm:p-8 space-y-4">
                  <div className="ds-skeleton h-6 w-36" />
                  {[0, 1, 2, 3].map((row) => (
                    <div key={row} className="flex justify-between gap-4 py-2">
                      <div className="ds-skeleton h-4 w-28" />
                      <div className="ds-skeleton h-4 w-36" />
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
              <Icon name="search" size={22} />
            </span>
            <h2 className="ds-h4 text-ink">{copy.emptyTitle}</h2>
            <p className="ds-body mt-2 max-w-[440px]">{copy.emptyBody}</p>
          </div>
        )}

        {!loading && result && (
          <div className="space-y-4">
            {/* Primary Domain & Expiry Card */}
            <div className="ds-card p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="ds-caption">{dict.fields.domain}</p>
                  <p className="ds-h2 ds-mono mt-1 break-all text-ink">
                    {result.domain}
                  </p>
                  {result.registrar && (
                    <p className="ds-body mt-2 text-ink-2">{result.registrar}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {expiryInfo ? (
                    <span
                      className={`inline-flex h-8 items-center gap-2 rounded-full px-3.5 text-xs font-medium ${
                        expiryInfo.tone === "ok"
                          ? "bg-ok-soft text-ok"
                          : expiryInfo.tone === "warn"
                            ? "bg-warn-soft text-warn"
                            : "bg-bad-soft text-bad"
                      }`}
                    >
                      <Icon name="clock" size={14} />
                      <span>
                        {copy.whois.remaining}: {expiryInfo.label}
                      </span>
                    </span>
                  ) : (
                    <span className="ds-chip">{copy.whois.unknownExpiry}</span>
                  )}
                  <CopyButton
                    value={result.domain}
                    label={copy.copy}
                    copiedLabel={copy.copied}
                  />
                </div>
              </div>

              {/* Registration Term Progress Bar */}
              {expiryInfo && expiryInfo.progressPercent != null && (
                <div className="mt-6 border-t border-line pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
                    <span>
                      {dict.fields.created}:{" "}
                      <strong className="font-medium text-ink">
                        {createdFormatted ?? "—"}
                      </strong>
                    </span>
                    <span className="ds-mono">{copy.whois.term}</span>
                    <span>
                      {dict.fields.expires}:{" "}
                      <strong className="font-medium text-ink">
                        {expiresFormatted ?? "—"}
                      </strong>
                    </span>
                  </div>
                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        expiryInfo.tone === "ok"
                          ? "bg-signal"
                          : expiryInfo.tone === "warn"
                            ? "bg-warn"
                            : "bg-bad"
                      }`}
                      style={{ width: `${expiryInfo.progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Details & Nameservers/Status Grid */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="ds-card p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-[11px] bg-signal-soft text-signal">
                    <Icon name="clock" size={18} />
                  </span>
                  <h2 className="ds-h4 text-ink">{copy.whois.term}</h2>
                </div>
                <dl className="mt-5">
                  <div className="ds-kv">
                    <dt>{dict.fields.domain}</dt>
                    <dd className="ds-mono">{result.domain}</dd>
                  </div>
                  <div className="ds-kv">
                    <dt>{dict.fields.registrar}</dt>
                    <dd>{result.registrar || "—"}</dd>
                  </div>
                  <div className="ds-kv">
                    <dt>{dict.fields.created}</dt>
                    <dd className="ds-tabular">{createdFormatted || "—"}</dd>
                  </div>
                  <div className="ds-kv">
                    <dt>{dict.fields.updated}</dt>
                    <dd className="ds-tabular">{updatedFormatted || "—"}</dd>
                  </div>
                  <div className="ds-kv">
                    <dt>{dict.fields.expires}</dt>
                    <dd className="ds-tabular">
                      {expiresFormatted || copy.whois.unknownExpiry}
                    </dd>
                  </div>
                  {expiryInfo && (
                    <div className="ds-kv">
                      <dt>{copy.whois.remaining}</dt>
                      <dd className="ds-tabular">{expiryInfo.label}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="ds-card flex flex-col justify-between gap-6 p-6 sm:p-8">
                {/* Nameservers */}
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-[11px] bg-signal-soft text-signal">
                        <Icon name="server" size={18} />
                      </span>
                      <h2 className="ds-h4 text-ink">{dict.fields.nameservers}</h2>
                    </div>
                    <span className="ds-chip ds-mono">
                      {result.nameservers.length}
                    </span>
                  </div>

                  {result.nameservers.length > 0 ? (
                    <ul className="mt-5 divide-y divide-line">
                      {result.nameservers.map((ns) => (
                        <li
                          key={ns}
                          className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                        >
                          <code className="ds-mono break-all text-sm font-medium text-ink">
                            {ns}
                          </code>
                          <CopyButton
                            value={ns}
                            label={copy.copy}
                            copiedLabel={copy.copied}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="ds-body mt-4 text-ink-3">—</p>
                  )}
                </div>

                {/* Status Chips */}
                <div className="border-t border-line pt-5">
                  <p className="ds-caption mb-3 font-medium text-ink-2">
                    {dict.fields.status}
                  </p>
                  {result.status.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {result.status.map((st) => (
                        <span key={st} className="ds-chip ds-mono text-xs">
                          <Icon name="shield" size={13} className="text-signal" />
                          <span>{st}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="ds-caption">—</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
