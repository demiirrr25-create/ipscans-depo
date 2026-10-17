"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Renders a single Google AdSense in-content ad unit. Requires
 * NEXT_PUBLIC_ADSENSE_CLIENT_ID (loads the AdSense script — see GoogleTag)
 * and a real `slot` id created in the AdSense dashboard. Until both exist,
 * this renders nothing, so no empty boxes appear on the page.
 *
 * Only Google AdSense is allowed on ipscans.com; do not add other ad networks.
 */
export function AdSlot({ slot, label, format = "fluid" }: { slot?: string; label: string; format?: "fluid" | "auto" }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const pushed = useRef(false);

  useEffect(() => {
    if (!client || !slot || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense script not loaded yet (e.g. consent denied) — ignore.
    }
  }, [client, slot]);

  if (!client || !slot) return null;

  return (
    <aside className="ad-slot" aria-label={label}>
      <span className="ad-slot__label">{label}</span>
      <ins
        className="adsbygoogle"
        style={{ display: "block", textAlign: "center" }}
        data-ad-client={client}
        data-ad-slot={slot}
        {...(format === "fluid"
          ? { "data-ad-layout": "in-article", "data-ad-format": "fluid" }
          : { "data-ad-format": "auto", "data-full-width-responsive": "true" })}
      />
    </aside>
  );
}
