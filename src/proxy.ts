import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, locales } from "./i18n/config";

function getPreferredLocale(request: NextRequest): string {
  const header = request.headers.get("accept-language");
  if (header) {
    const preferred = header.split(",")[0].split("-")[0].toLowerCase();
    if ((locales as readonly string[]).includes(preferred)) return preferred;
  }
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Next's dynamically-generated icon routes (no file extension in their
  // URL, so the matcher below can't exclude them via ".*\\..*") must be
  // served at the exact root path — redirecting them under /tr or /en broke
  // both the browser tab favicon and Google's favicon discovery.
  if (pathname === "/icon" || pathname === "/apple-icon") {
    return NextResponse.next();
  }

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
  if (hasLocale) return NextResponse.next();

  const locale = getPreferredLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|api|icon|apple-icon|.*\\..*).*)"],
};
