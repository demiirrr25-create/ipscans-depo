"use client";

import { useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { toolCopy } from "@/components/tools/copy";
import { Icon } from "@/components/ds/Icon";
import { CopyButton } from "@/components/ds/CopyButton";

const TYPES = ["A", "AAAA", "MX", "TXT", "NS", "CNAME"] as const;
type RecordType = (typeof TYPES)[number];
type TabKey = "ALL" | RecordType;

type DnsRecordDetail = {
  value: string;
  ttl?: number;
  priority?: number;
};

type DnsResponse = {
  domain: string;
  records: Record<string, string[]>;
  details?: Partial<Record<RecordType, DnsRecordDetail[]>>;
};

const EXAMPLES = ["cloudflare.com", "google.com", "github.com", "wikipedia.org"] as const;

function cleanDomain(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .toLowerCase();
}

function getEntriesForType(data: DnsResponse, type: RecordType): DnsRecordDetail[] {
  const fromDetails = data.details?.[type];
  if (fromDetails && Array.isArray(fromDetails)) {
    return fromDetails;
  }
  const rawList = data.records?.[type] ?? [];
  return rawList.map((item) => {
    if (type === "MX") {
      const m = item.match(/^(\d+)\s+(.+)$/);
      if (m) {
        return { priority: Number(m[1]), value: m[2] };
      }
    }
    return { value: item };
  });
}

export function DnsLookupForm({
  dict,
  locale = "en",
}: {
  dict: Dictionary["dns"];
  locale?: Locale;
}) {
  const copy = toolCopy[locale];
  const [domain, setDomain] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [result, setResult] = useState<DnsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
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
      const res = await fetch(`/api/dns?domain=${encodeURIComponent(cleaned)}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(true);
      } else {
        setResult(data);
        setActiveTab("ALL");
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const entriesByType: Record<RecordType, DnsRecordDetail[]> | null = result
    ? {
        A: getEntriesForType(result, "A"),
        AAAA: getEntriesForType(result, "AAAA"),
        MX: getEntriesForType(result, "MX"),
        TXT: getEntriesForType(result, "TXT"),
        NS: getEntriesForType(result, "NS"),
        CNAME: getEntriesForType(result, "CNAME"),
      }
    : null;

  const totalRecords = entriesByType
    ? TYPES.reduce((sum, t) => sum + entriesByType[t].length, 0)
    : 0;
  const activeTypeCount = entriesByType
    ? TYPES.filter((t) => entriesByType[t].length > 0).length
    : 0;

  const visibleTypes: RecordType[] =
    activeTab === "ALL"
      ? TYPES.filter((t) => (entriesByType?.[t].length ?? 0) > 0)
      : [activeTab];

  return (
    <div className="space-y-6">
      {/* Search Bar Card */}
      <div className="ds-card p-6 sm:p-8">
        <label htmlFor="DnsLookupForm-input" className="ds-label">
          {dict.placeholder}
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
              <Icon name="dns" size={18} />
            </span>
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
          id="DnsLookupForm-error"
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
              <div className="ds-skeleton mt-3 h-9 w-56 max-w-full" />
              <div className="mt-6 flex gap-2 overflow-hidden">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="ds-skeleton h-9 w-20 shrink-0 rounded-full" />
                ))}
              </div>
            </div>
            <div className="ds-card p-6 sm:p-8 space-y-3">
              {[0, 1, 2, 3].map((r) => (
                <div key={r} className="ds-skeleton h-12 w-full rounded-md" />
              ))}
            </div>
          </div>
        )}

        {!loading && !result && !error && (
          <div className="ds-card-muted flex flex-col items-center justify-center p-10 text-center sm:p-14">
            <span className="mb-4 grid size-12 place-items-center rounded-[14px] bg-signal-soft text-signal">
              <Icon name="dns" size={22} />
            </span>
            <h2 className="ds-h4 text-ink">{copy.emptyTitle}</h2>
            <p className="ds-body mt-2 max-w-[440px]">{copy.emptyBody}</p>
          </div>
        )}

        {!loading && result && entriesByType && (
          <div className="space-y-4">
            {/* Primary Answer Header + Segmented Record Type Filter */}
            <div className="ds-card p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="ds-caption">DNS</p>
                  <p className="ds-h2 ds-mono mt-1 break-all text-ink">
                    {result.domain}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-md border border-line bg-surface-dim px-4 py-2.5 text-end">
                    <span className="ds-caption block">{copy.dns.total}</span>
                    <span className="ds-mono ds-tabular text-lg font-semibold text-ink">
                      {totalRecords}
                    </span>
                  </div>
                  <div className="rounded-md border border-line bg-surface-dim px-4 py-2.5 text-end">
                    <span className="ds-caption block">{copy.dns.types}</span>
                    <span className="ds-mono ds-tabular text-lg font-semibold text-ink">
                      {activeTypeCount} / {TYPES.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Segmented Record Type Tabs */}
              <div
                role="tablist"
                aria-label={copy.dns.types}
                className="ds-rail mt-6 rounded-full border border-line bg-surface-dim p-1.5"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "ALL"}
                  onClick={() => setActiveTab("ALL")}
                  className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === "ALL"
                      ? "bg-ink text-surface shadow-soft"
                      : "text-ink-2 hover:bg-surface hover:text-ink"
                  }`}
                >
                  <span>{copy.dns.total}</span>
                  <span
                    className={`ds-mono ds-tabular rounded-full px-1.5 py-0.5 text-[11px] ${
                      activeTab === "ALL"
                        ? "bg-surface/15 text-surface"
                        : "bg-surface-2 text-ink-3"
                    }`}
                  >
                    {totalRecords}
                  </span>
                </button>
                {TYPES.map((type) => {
                  const count = entriesByType[type].length;
                  const selected = activeTab === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setActiveTab(type)}
                      className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                        selected
                          ? "bg-ink text-surface shadow-soft"
                          : "text-ink-2 hover:bg-surface hover:text-ink"
                      }`}
                    >
                      <span className="ds-mono font-semibold">{type}</span>
                      <span
                        className={`ds-mono ds-tabular rounded-full px-1.5 py-0.5 text-[11px] ${
                          selected
                            ? "bg-surface/15 text-surface"
                            : count > 0
                              ? "bg-signal-soft text-signal"
                              : "bg-surface-2 text-ink-4"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Record Panels */}
            {totalRecords === 0 && activeTab === "ALL" ? (
              <div className="ds-card-muted p-8 text-center">
                <p className="ds-body text-ink-2">{copy.dns.empty}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleTypes.map((type) => {
                  const entries = entriesByType[type];
                  return (
                    <div key={type} className="ds-card p-6 sm:p-8">
                      <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
                        <div className="flex items-center gap-2.5">
                          <span className="ds-mono inline-flex h-7 items-center rounded-xs bg-signal-soft px-2.5 text-xs font-semibold text-signal">
                            {type}
                          </span>
                          <span className="ds-caption ds-tabular">
                            ({entries.length})
                          </span>
                        </div>
                      </div>

                      {entries.length > 0 ? (
                        <ul className="mt-4 divide-y divide-line">
                          {entries.map((entry, idx) => (
                            <li
                              key={`${type}-${idx}-${entry.value}`}
                              className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                            >
                              <div className="min-w-0 flex-1">
                                <code className="ds-mono break-all text-[0.93rem] font-medium text-ink">
                                  {entry.value}
                                </code>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                {entry.priority != null && (
                                  <span className="ds-chip ds-mono text-xs">
                                    {copy.dns.priority}: {entry.priority}
                                  </span>
                                )}
                                {entry.ttl != null && (
                                  <span className="ds-chip ds-mono text-xs">
                                    {copy.dns.ttl}: {entry.ttl}s
                                  </span>
                                )}
                                <CopyButton
                                  value={entry.value}
                                  label={copy.copy}
                                  copiedLabel={copy.copied}
                                />
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="ds-body mt-4 text-ink-3">{dict.noRecords}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
