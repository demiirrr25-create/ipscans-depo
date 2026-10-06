import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, locales } from "./i18n/config";

function getPreferredLocale(request: NextRequest): string {
  const saved = request.cookies.get("ipscans-locale")?.value;
  if (saved && (locales as readonly string[]).includes(saved)) return saved;
  const header = request.headers.get("accept-language");
  if (header) {
    const preferences = header.split(",").map((part) => {
      const [tag, quality] = part.trim().split(";q=");
      return { language: tag.split("-")[0].toLowerCase(), weight: quality === undefined ? 1 : Number(quality) };
    }).sort((a, b) => b.weight - a.weight);
    for (const preference of preferences) {
      if ((locales as readonly string[]).includes(preference.language)) return preference.language;
    }
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
