import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { PortCheckForm } from "@/components/PortCheckForm";
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
    title: dict.ports.title,
    description: dict.ports.subtitle,
    alternates: { canonical: toolPath("ports", locale) },
  };
}

export default async function PortKontrolPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (locale !== "tr") redirect(toolPath("ports", locale));
  const dict = getDictionary(locale);

  return (
    <PageShell title={dict.ports.title} subtitle={dict.ports.subtitle}>
      <PortCheckForm dict={dict.ports} locale={locale} />
    </PageShell>
  );
}
