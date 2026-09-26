import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { IpLookupForm } from "@/components/IpLookupForm";
import { notFound, redirect } from "next/navigation";
import { toolPath } from "@/lib/tool-routes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.ipLookup.title,
    description: dict.ipLookup.subtitle,
    alternates: { canonical: toolPath("ipLookup", locale) },
  };
}

export default async function IpSorgulamaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (locale !== "tr") redirect(toolPath("ipLookup", locale));
  const dict = getDictionary(locale);

  return (
    <PageShell title={dict.ipLookup.title} subtitle={dict.ipLookup.subtitle}>
      <IpLookupForm dict={dict.ipLookup} />
    </PageShell>
  );
}
