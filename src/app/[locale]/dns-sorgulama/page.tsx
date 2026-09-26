import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { DnsLookupForm } from "@/components/DnsLookupForm";
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
    title: dict.dns.title,
    description: dict.dns.subtitle,
    alternates: { canonical: toolPath("dns", locale) },
  };
}

export default async function DnsSorgulamaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (locale !== "tr") redirect(toolPath("dns", locale));
  const dict = getDictionary(locale);

  return (
    <PageShell title={dict.dns.title} subtitle={dict.dns.subtitle}>
      <DnsLookupForm dict={dict.dns} />
    </PageShell>
  );
}
