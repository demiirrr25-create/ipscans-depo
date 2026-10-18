"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { isLocale, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { contentCopy } from "./content/copy";
import { Icon } from "./ds/Icon";

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
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    return "unset";
  }
  return stored === "granted" || stored === "denied" ? stored : "unset";
}

/**
 * Minimal cookie/consent banner wired to Google Consent Mode v2. Ads and
 * analytics scripts (see GoogleTag) start with consent denied by default;
 * this banner is how a visitor grants it, which Google requires before
 * personalized ads/analytics run for EEA/UK/CH visitors.
 */
export function CookieConsent({
  dict,
  locale: localeProp,
}: {
  dict: Dictionary["cookieConsent"];
  locale?: Locale;
}) {
  const params = useParams<{ locale?: string }>();
  const locale: Locale =
    localeProp ?? (params?.locale && isLocale(params.locale) ? params.locale : "en");
  const copy = contentCopy[locale];

  const consent = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    () => "unset",
  );

  useEffect(() => {
    if (consent === "granted" || consent === "denied") {
      applyConsent(consent);
    }
  }, [consent]);

  function choose(state: ConsentState) {
    try {
      localStorage.setItem(STORAGE_KEY, state);
    } catch {
      /* Restricted browser storage: keep the conservative default. */
    }
    applyConsent(state);
    window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
  }

  if (consent !== "unset") return null;

  return (
    <div
      role="region"
      aria-label={copy.cookieTitle}
      className="fixed bottom-4 start-4 end-4 z-50 animate-fade-up sm:bottom-6 sm:start-6 sm:end-auto sm:w-full sm:max-w-[420px]"
    >
      <div className="rounded-lg border border-line-2 bg-surface/95 p-5 shadow-float backdrop-blur-xl sm:p-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-xs bg-signal-soft text-signal">
            <Icon name="shield" size={16} />
          </span>
          <p className="text-sm font-medium text-ink">{copy.cookieTitle}</p>
        </div>
        <p className="mt-2.5 text-sm leading-relaxed text-ink-2">
          {dict.message}{" "}
          <Link
            href={`/${locale}/privacy`}
            className="font-medium text-ink underline decoration-line-3 underline-offset-4 transition-colors hover:text-signal"
          >
            {copy.cookieLink}
          </Link>
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => choose("denied")}
            className="btn btn-secondary btn-sm"
          >
            {dict.reject}
          </button>
          <button
            type="button"
            onClick={() => choose("granted")}
            className="btn btn-primary btn-sm"
          >
            {dict.accept}
          </button>
        </div>
      </div>
    </div>
  );
}

