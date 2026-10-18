"use client";

import { CopyButton } from "./ds/CopyButton";

/** Back-compat wrapper — prefer `CopyButton` from `@/components/ds/CopyButton`. */
export function CopyHashButton({ hash, label = "Copy SHA-256" }: { hash: string; label?: string }) {
  return <CopyButton value={hash} label={label} />;
}
