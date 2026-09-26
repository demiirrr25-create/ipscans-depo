import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { WhoisForm } from "@/components/WhoisForm";
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
    title: dict.whois.title,
    description: dict.whois.subtitle,
    alternates: { canonical: toolPath("whois", locale) },
  };
}

export default async function WhoisSorgulamaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (locale !== "tr") redirect(toolPath("whois", locale));
  const dict = getDictionary(locale);

  return (
    <PageShell title={dict.whois.title} subtitle={dict.whois.subtitle}>
      <WhoisForm dict={dict.whois} />
    </PageShell>
  );
}
