"use client";

import { useState } from "react";
import { Icon } from "./Icon";

/** Small copy-to-clipboard control with confirmation state. */
export function CopyButton({
  value,
  label,
  copiedLabel = "✓",
  tone = "light",
  className = "",
}: {
  value: string;
  label: string;
  copiedLabel?: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard API unavailable (insecure context / old browser): fall back.
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.8rem] font-medium transition-colors ${
        tone === "dark"
          ? "bg-white/8 text-on-stage-2 hover:bg-white/14 hover:text-white"
          : "bg-surface-2 text-ink-2 hover:bg-surface-3 hover:text-ink"
      } ${className}`}
    >
      <Icon name={copied ? "check" : "copy"} size={14} className={copied ? "text-ok" : ""} />
      {copied ? copiedLabel : label}
    </button>
  );
}
