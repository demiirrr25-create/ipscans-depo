import type { Metadata } from "next";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { ToolRenderer, toolMeta } from "@/components/tools/ToolRenderer";
import { notFound, redirect } from "next/navigation";
import { findToolBySlug, toolKeys, toolPath, toolSlugs } from "@/lib/tool-routes";

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

  return (
    <PageShell title={title} subtitle={subtitle}>
      <ToolRenderer toolKey={key} locale={locale} dict={dict} />
    </PageShell>
  );
}
