import type { Metadata } from "next";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { LegalDocument } from "@/components/content/LegalDocument";
import { termsOfService, localizedLegalText } from "@/content/legal";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.footer.terms,
    alternates: {
      canonical: `/${locale}/terms`,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, `/${l}/terms`])),
        "x-default": "/en/terms",
      },
    },
    robots: termsOfService[locale] ? undefined : { index: false, follow: true },
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <LegalDocument
      locale={locale}
      kind="terms"
      rawHtml={localizedLegalText(termsOfService, locale)}
    />
  );
}

