import type { Metadata } from "next";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { LegalDocument } from "@/components/content/LegalDocument";
import { privacyPolicy, localizedLegalText } from "@/content/legal";
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
    title: dict.footer.privacy,
    alternates: {
      canonical: `/${locale}/privacy`,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, `/${l}/privacy`])),
        "x-default": "/en/privacy",
      },
    },
    robots: privacyPolicy[locale] ? undefined : { index: false, follow: true },
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <LegalDocument
      locale={locale}
      kind="privacy"
      rawHtml={localizedLegalText(privacyPolicy, locale)}
    />
  );
}

