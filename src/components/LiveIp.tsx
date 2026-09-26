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
    <div className="inline-flex items-center gap-3 rounded-2xl glass px-5 py-3">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      <span className="text-sm text-neutral-400">{label}</span>
      <span className="font-mono text-lg font-semibold text-white">
        {error ? "—" : ip ?? "…"}
      </span>
    </div>
  );
}
