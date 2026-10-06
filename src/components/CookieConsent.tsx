"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Dictionary } from "@/i18n/dictionaries";

const STORAGE_KEY = "ipscans-consent";
const CONSENT_CHANGE_EVENT = "ipscans-consent-change";

type ConsentState = "granted" | "denied";
type ConsentSnapshot = ConsentState | "unset";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function applyConsent(state: ConsentState) {
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    };
  window.gtag("consent", "update", {
    ad_storage: state,
    ad_user_data: state,
    ad_personalization: state,
    analytics_storage: state,
  });
}

function subscribeToConsent(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
  };
}

function getConsentSnapshot(): ConsentSnapshot {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "granted" || stored === "denied" ? stored : "unset";
}

/**
 * Minimal cookie/consent banner wired to Google Consent Mode v2. Ads and
 * analytics scripts (see GoogleTag) start with consent denied by default;
 * this banner is how a visitor grants it, which Google requires before
 * personalized ads/analytics run for EEA/UK/CH visitors.
 */
export function CookieConsent({ dict }: { dict: Dictionary["cookieConsent"] }) {
  const consent = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    () => "loading",
  );

  useEffect(() => {
    if (consent === "granted" || consent === "denied") {
      applyConsent(consent);
    }
  }, [consent]);

  function choose(state: ConsentState) {
    localStorage.setItem(STORAGE_KEY, state);
    applyConsent(state);
    window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
  }

  if (consent !== "unset") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/95 px-4 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-neutral-300">{dict.message}</p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => choose("denied")}
            className="btn-ghost rounded-lg px-4 py-2 text-sm font-semibold"
          >
            {dict.reject}
          </button>
          <button
            onClick={() => choose("granted")}
            className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold"
          >
            {dict.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
