"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "./ds/Icon";

type IpPayload = {
  ip?: string;
  countryCode?: string;
  isp?: string;
};

export function LiveIp({
  label,
  href,
}: {
  label: string;
  href?: string;
}) {
  const [data, setData] = useState<IpPayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/ip", { signal: controller.signal })
      .then((r) => r.json())
      .then((d: IpPayload) => {
        if (d?.ip) {
          setData({ ip: d.ip, countryCode: d.countryCode, isp: d.isp });
        } else {
          setError(true);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(true);
      });
    return () => controller.abort();
  }, []);

  const inner = (
    <>
      <span className="ds-live-dot" aria-hidden="true" />
      <span className="text-ink-3 font-medium">{label}</span>
      <span className="h-3.5 w-px bg-line-2" aria-hidden="true" />
      {error ? (
        <span className="ds-mono text-ink-3">—</span>
      ) : data?.ip ? (
        <span className="ds-mono ds-tabular min-w-0 truncate font-medium text-ink">
          {data.ip}
          {data.countryCode ? (
            <span className="ms-1.5 font-sans text-xs font-normal text-ink-3">
              · {data.countryCode}
            </span>
          ) : null}
        </span>
      ) : (
        <span
          className="ds-skeleton inline-block h-3.5 w-24 rounded-xs"
          aria-label="…"
        />
      )}
      {href && (
        <Icon
          name="arrowUpRight"
          size={14}
          className="rtl-flip text-ink-3 transition-transform duration-300 ease-out-expo group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-signal"
        />
      )}
    </>
  );

  const chipClass =
    "group inline-flex max-w-full items-center gap-2.5 rounded-full border border-line bg-[var(--surface-glass)] px-4 py-2 text-[0.8125rem] shadow-soft backdrop-blur-md transition-all duration-300 ease-out-quart hover:border-line-2 hover:bg-surface-dim";

  if (href) {
    return (
      <Link href={href} className={chipClass}>
        {inner}
      </Link>
    );
  }

  return <div className={chipClass}>{inner}</div>;
}
