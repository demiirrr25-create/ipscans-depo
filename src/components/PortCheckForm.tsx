"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { toolCopy } from "@/components/tools/copy";
import { Icon } from "@/components/ds/Icon";
import { CopyButton } from "@/components/ds/CopyButton";

type PortResult = {
  host: string;
  ip: string;
  ports: { port: number; name: string; open: boolean }[];
};

const EXAMPLES = ["example.com", "cloudflare.com", "1.1.1.1", "8.8.8.8"] as const;

const PROBED_PORTS: { port: number; name: string }[] = [
  { port: 21, name: "FTP" },
  { port: 22, name: "SSH" },
  { port: 25, name: "SMTP" },
  { port: 53, name: "DNS" },
  { port: 80, name: "HTTP" },
  { port: 110, name: "POP3" },
  { port: 143, name: "IMAP" },
  { port: 443, name: "HTTPS" },
  { port: 3306, name: "MySQL" },
  { port: 3389, name: "RDP" },
  { port: 5432, name: "PostgreSQL" },
  { port: 8080, name: "HTTP-alt" },
];

function cleanHost(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .toLowerCase();
}

export function PortCheckForm({
  dict,
  locale,
}: {
  dict: Dictionary["ports"];
  locale: Locale;
}) {
  const copy = toolCopy[locale];
  const [host, setHost] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [result, setResult] = useState<PortResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressCount, setProgressCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => {
      setProgressCount((prev) => (prev < PROBED_PORTS.length ? prev + 1 : prev));
    }, 110);
    return () => clearInterval(timer);
  }, [loading]);

  async function check(rawValue: string) {
    const cleaned = cleanHost(rawValue);
    if (!cleaned) return;
    setHost(cleaned);
    setLastQuery(cleaned);
    setProgressCount(1);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/ports?host=${encodeURIComponent(cleaned)}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(res.status === 403 ? copy.ports.privateTarget : dict.error);
      } else {
        setResult(data);
      }
    } catch {
      setError(dict.error);
    } finally {
      setLoading(false);
    }
  }

  const openCount = result ? result.ports.filter((p) => p.open).length : 0;
  const closedCount = result ? result.ports.length - openCount : 0;

  return (
    <div className="space-y-6">
      {/* Search Bar & Disclaimer Card */}
      <div className="ds-card p-6 sm:p-8">
        <label htmlFor="PortCheckForm-input" className="ds-label">
          {copy.ports.inputLabel}
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            check(host);
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 text-ink-3">
              <Icon name="plug" size={18} />
            </span>
            <input
              id="PortCheckForm-input"
              autoCapitalize="none"
              spellCheck={false}
              autoComplete="off"
              required
              aria-invalid={error !== null}
              aria-describedby={error ? "PortCheckForm-error" : undefined}
              value={host}
              onChange={(e) => setHost(e.target.value)}
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
                setHost(ex);
                check(ex);
              }}
              className="ds-chip ds-mono cursor-pointer transition-colors hover:bg-surface-3 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>

        {/* Disclaimer & Scope Note */}
        <div className="mt-6 flex flex-col gap-2 rounded-md border border-line bg-surface-dim p-4 text-xs leading-relaxed text-ink-2">
          <div className="flex items-start gap-2.5 font-medium text-ink">
            <Icon name="shield" size={16} className="mt-0.5 shrink-0 text-signal" />
            <span>{dict.disclaimer}</span>
          </div>
          <p className="ps-6 text-ink-3">{copy.ports.note}</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          id="PortCheckForm-error"
          role="alert"
          className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-bad/25 bg-bad-soft p-5 sm:p-6"
        >
          <div className="flex items-center gap-3 text-ink">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-bad/15 text-bad">
              <Icon name="info" size={18} />
            </span>
            <p className="text-[0.95rem] font-medium text-ink">{error}</p>
          </div>
          {lastQuery && (
            <button
              type="button"
              onClick={() => check(lastQuery)}
              className="btn btn-secondary btn-sm"
            >
              <Icon name="refresh" size={15} />
              <span>{copy.retry}</span>
            </button>
          )}
        </div>
      )}

      {/* Results & Live Progress */}
      <div role="status" aria-live="polite" aria-busy={loading}>
        {loading && (
          <div className="ds-card p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="ds-spinner text-signal" aria-hidden="true" />
                <div>
                  <p className="font-medium text-ink">
                    {copy.ports.checking}{" "}
                    <code className="ds-mono text-signal">{lastQuery}</code>
                  </p>
                  <p className="ds-caption mt-0.5">{dict.loading}</p>
                </div>
              </div>
              <span className="ds-chip ds-mono ds-tabular">
                {progressCount} / {PROBED_PORTS.length}
              </span>
            </div>

            <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-signal transition-all duration-150"
                style={{
                  width: `${Math.round((progressCount / PROBED_PORTS.length) * 100)}%`,
                }}
              />
            </div>

            <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {PROBED_PORTS.map((p, idx) => {
                const active = idx < progressCount;
                return (
                  <div
                    key={p.port}
                    className={`flex items-center justify-between rounded-md border px-4 py-3 transition-colors ${
                      active
                        ? "border-signal/25 bg-signal-soft/35"
                        : "border-line bg-surface-dim opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`size-2 rounded-full ${
                          active ? "bg-signal" : "bg-ink-4"
                        }`}
                      />
                      <span className="ds-mono font-semibold text-ink">
                        {p.port}
                      </span>
                      <span className="text-sm text-ink-3">{p.name}</span>
                    </div>
                    <div className="ds-skeleton h-5 w-16 rounded-full" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && !result && !error && (
          <div className="ds-card-muted flex flex-col items-center justify-center p-10 text-center sm:p-14">
            <span className="mb-4 grid size-12 place-items-center rounded-[14px] bg-signal-soft text-signal">
              <Icon name="plug" size={22} />
            </span>
            <h2 className="ds-h4 text-ink">{copy.emptyTitle}</h2>
            <p className="ds-body mt-2 max-w-[440px]">{copy.emptyBody}</p>
          </div>
        )}

        {!loading && result && (
          <div className="space-y-4">
            {/* Primary Answer Header */}
            <div className="ds-card p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="ds-caption">{copy.ports.inputLabel}</p>
                  <p className="ds-h2 ds-mono mt-1 break-all text-ink">
                    {result.host}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="ds-caption">{copy.ports.resolved}:</span>
                    <code className="ds-mono text-sm font-medium text-ink">
                      {result.ip}
                    </code>
                    <CopyButton
                      value={result.ip}
                      label={copy.copy}
                      copiedLabel={copy.copied}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-md border border-line bg-surface-dim px-4 py-2.5 text-end">
                    <span className="ds-caption block">{copy.ports.checked}</span>
                    <span className="ds-mono ds-tabular text-lg font-semibold text-ink">
                      {result.ports.length}
                    </span>
                  </div>
                  <div className="rounded-md border border-line bg-surface-dim px-4 py-2.5 text-end">
                    <span className="ds-caption block">{copy.ports.openPorts}</span>
                    <span
                      className={`ds-mono ds-tabular text-lg font-semibold ${
                        openCount > 0 ? "text-ok" : "text-ink"
                      }`}
                    >
                      {openCount}
                    </span>
                  </div>
                  <div className="rounded-md border border-line bg-surface-dim px-4 py-2.5 text-end">
                    <span className="ds-caption block">{copy.ports.noReply}</span>
                    <span className="ds-mono ds-tabular text-lg font-semibold text-ink-2">
                      {closedCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Per-Port Result Rows */}
            <div className="ds-card p-6 sm:p-8">
              <div className="grid gap-2.5 sm:grid-cols-2">
                {result.ports.map((p) => (
                  <div
                    key={p.port}
                    className={`flex items-center justify-between gap-3 rounded-md border px-4 py-3.5 transition-colors ${
                      p.open
                        ? "border-ok/30 bg-ok-soft/45"
                        : "border-line bg-surface-dim/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        aria-hidden="true"
                        className={`size-2.5 shrink-0 rounded-full ${
                          p.open ? "bg-ok" : "bg-bad"
                        }`}
                      />
                      <span className="ds-mono ds-tabular text-base font-semibold text-ink">
                        {p.port}
                      </span>
                      <span className="ds-mono text-xs text-ink-3">/TCP</span>
                      <span className="truncate text-sm font-medium text-ink-2">
                        {p.name}
                      </span>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                        p.open ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"
                      }`}
                    >
                      {p.open ? (
                        <>
                          <Icon name="check" size={13} />
                          <span>{dict.open}</span>
                        </>
                      ) : (
                        <span>{copy.ports.noReply}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tasteful Cross-Sell to Hardware/Security Shop */}
            {result.ports.some((p) => p.open) && (
              <div className="ds-card-muted flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
                <div className="flex items-start gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-signal-soft text-signal">
                    <Icon name="shield" size={20} />
                  </span>
                  <div>
                    <h3 className="ds-h4 text-ink">{dict.crossSell.title}</h3>
                    <p className="ds-body mt-1.5 max-w-[600px]">
                      {dict.crossSell.body}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/${locale}/shop`}
                  className="btn btn-secondary shrink-0 self-start sm:self-center"
                >
                  <span>{dict.crossSell.cta}</span>
                  <Icon
                    name="arrowRight"
                    size={16}
                    className="btn-arrow rtl-flip"
                  />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
