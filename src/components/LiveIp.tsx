"use client";

import { useEffect, useState } from "react";

export function LiveIp({ label }: { label: string }) {
  const [ip, setIp] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/ip")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (d.ip) setIp(d.ip);
        else setError(true);
      })
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="live-ip-chip">
      <span className="dot" aria-hidden="true" />
      <span className="text-sm text-neutral-400">{label}</span>
      <span className="min-w-0 break-all font-mono text-sm font-semibold text-white">
        {error ? "—" : ip ?? "…"}
      </span>
    </div>
  );
}
