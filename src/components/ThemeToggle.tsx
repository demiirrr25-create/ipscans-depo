"use client";

import { useEffect, useSyncExternalStore } from "react";
import { uiText } from "@/i18n/ui";
import type { Locale } from "@/i18n/config";

export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "ipscans-theme";
export const THEME_CHANGE_EVENT = "ipscans-theme-change";

function getSystemTheme(): ThemeMode {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark") return raw;
  } catch {
    // Ignore storage access errors in restricted contexts
  }
  return null;
}

export function getActiveTheme(): ThemeMode {
  if (typeof document !== "undefined") {
    const attr = document.documentElement.dataset.theme;
    if (attr === "light" || attr === "dark") return attr;
  }
  return getStoredTheme() ?? getSystemTheme();
}

export function applyThemeToDocument(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme } })
    );
  }
}

function subscribeToTheme(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === THEME_STORAGE_KEY) {
      const next = getStoredTheme() ?? getSystemTheme();
      document.documentElement.dataset.theme = next;
      document.documentElement.style.colorScheme = next;
      onStoreChange();
    }
  };

  const handleCustom = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_CHANGE_EVENT, handleCustom);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, handleCustom);
  };
}

function getServerSnapshot(): ThemeMode {
  return "light";
}

export function ThemeToggle({
  locale = "en",
  className = "",
}: {
  locale?: Locale;
  className?: string;
}) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getActiveTheme,
    getServerSnapshot
  );

  // Sync with OS preference changes when no explicit localStorage override is stored
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");

    const onMediaChange = (e: MediaQueryListEvent) => {
      if (getStoredTheme() !== null) return;
      const nextTheme: ThemeMode = e.matches ? "dark" : "light";
      applyThemeToDocument(nextTheme);
    };

    mql.addEventListener("change", onMediaChange);
    return () => mql.removeEventListener("change", onMediaChange);
  }, []);

  const isDark = theme === "dark";

  const label = isDark
    ? uiText(locale, "Switch to light mode", "Açık temaya geç")
    : uiText(locale, "Switch to dark mode", "Koyu temaya geç");

  function handleToggle() {
    const nextTheme: ThemeMode = isDark ? "light" : "dark";
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Storage unavailable; still apply in-memory for current session
    }
    applyThemeToDocument(nextTheme);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      className={`group relative inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface-dim/70 text-ink-2 transition-colors duration-200 hover:border-line-2 hover:bg-surface-2 hover:text-ink cursor-pointer ${className}`.trim()}
    >
      <span className="relative grid size-5 place-items-center">
        {/* Sun Icon (shown in Light Mode) */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`col-start-1 row-start-1 transition-all duration-500 ease-out-expo ${
            isDark
              ? "scale-50 rotate-90 opacity-0"
              : "scale-100 rotate-0 opacity-100"
          }`}
        >
          <circle cx="12" cy="12" r="4.25" />
          <path d="M12 2.5v2.25M12 19.25v2.25M4.93 4.93l1.6 1.6M17.47 17.47l1.6 1.6M2.5 12h2.25M19.25 12h2.25M4.93 19.07l1.6-1.6M17.47 6.53l1.6-1.6" />
        </svg>

        {/* Moon Icon (shown in Dark Mode) */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`col-start-1 row-start-1 transition-all duration-500 ease-out-expo ${
            isDark
              ? "scale-100 rotate-0 opacity-100 text-signal"
              : "scale-50 -rotate-90 opacity-0"
          }`}
        >
          <path d="M20.35 14.65A8.5 8.5 0 0 1 9.35 3.65a8.5 8.5 0 1 0 11 11Z" />
        </svg>
      </span>
    </button>
  );
}
