"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Renders a Google AdSense ad unit. Requires NEXT_PUBLIC_ADSENSE_CLIENT_ID to
 * be set (loads the AdSense script — see GoogleTag) and a real `slot` id
 * created in the AdSense dashboard after the site is approved. Until then,
 * this renders nothing.
 */
export function AdSlot({ slot }: { slot: string }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  useEffect(() => {
    if (!client) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense script not loaded yet (e.g. consent denied) — ignore.
    }
  }, [client]);

  if (!client) return null;

  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
