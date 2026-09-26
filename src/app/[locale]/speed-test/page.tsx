import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { SpeedTest } from "@/components/SpeedTest";
import { notFound } from "next/navigation";

export default async function SpeedTestPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <PageShell title={dict.speedTest.title} subtitle={dict.speedTest.subtitle}>
      <SpeedTest dict={dict.speedTest} />
    </PageShell>
  );
}
