import type { Metadata } from "next";
import { isLocale, locales, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { ToolRenderer, toolMeta } from "@/components/tools/ToolRenderer";
import { notFound, redirect } from "next/navigation";
import { findToolBySlug, toolKeys, toolPath, toolSlugs } from "@/lib/tool-routes";

const BASE_URL = "https://ipscans.com";

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    toolKeys.map((key) => ({ locale, tool: toolSlugs[key][locale] }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; tool: string }>;
}): Promise<Metadata> {
  const { locale, tool } = await params;
  if (!isLocale(locale)) return {};
  const key = findToolBySlug(tool);
  if (!key) return {};
  const dict = getDictionary(locale);
  const { title, subtitle } = toolMeta(key, dict);

  return {
    title,
    description: subtitle,
    alternates: {
      canonical: toolPath(key, locale),
      languages: Object.fromEntries(
        locales.map((l) => [l, toolPath(key, l)])
      ),
    },
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ locale: string; tool: string }>;
}) {
  const { locale, tool } = await params;
  if (!isLocale(locale)) notFound();
  const key = findToolBySlug(tool);
  if (!key) notFound();

  const canonicalSlug = toolSlugs[key][locale];
  if (tool !== canonicalSlug) redirect(toolPath(key, locale));

  const dict = getDictionary(locale);
  const { title, subtitle } = toolMeta(key, dict);

  // SoftwareApplication + BreadcrumbList structured data — helps both classic
  // search rich results and AI answer engines identify this as a free, named
  // tool rather than an anonymous page.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: title,
        description: subtitle,
        url: `${BASE_URL}${toolPath(key, locale)}`,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Any",
        inLanguage: localeTags[locale],
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        publisher: { "@id": `${BASE_URL}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ipscans", item: `${BASE_URL}/${locale}` },
          { "@type": "ListItem", position: 2, name: title, item: `${BASE_URL}${toolPath(key, locale)}` },
        ],
      },
    ],
  };

  return (
    <PageShell title={title} subtitle={subtitle}>
      <script
        type="application/ld+json"
        // Static, code-authored structured data — safe to inject directly.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ToolRenderer toolKey={key} locale={locale} dict={dict} />
    </PageShell>
  );
}
