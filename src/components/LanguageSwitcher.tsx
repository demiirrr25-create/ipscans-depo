"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  function pathForLocale(target: Locale) {
    const segments = pathname.split("/");
    segments[1] = target;
    return segments.join("/") || `/${target}`;
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      {locales.map((l) => (
        <Link
          key={l}
          href={pathForLocale(l)}
          className={`rounded-md px-2 py-1 uppercase transition ${
            l === locale
              ? "bg-white text-black font-semibold"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          {l}
        </Link>
      ))}
    </div>
  );
}
