import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { SpeedTest } from "@/components/SpeedTest";
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
    title: dict.speedTest.title,
    description: dict.speedTest.subtitle,
    alternates: { canonical: toolPath("speedTest", locale) },
  };
}

export default async function SpeedTestPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (locale !== "en") redirect(toolPath("speedTest", locale));
  const dict = getDictionary(locale);

  return (
    <PageShell title={dict.speedTest.title} subtitle={dict.speedTest.subtitle}>
      <SpeedTest dict={dict.speedTest} locale={locale} />
    </PageShell>
  );
}
