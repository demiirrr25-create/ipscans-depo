import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { DnsLookupForm } from "@/components/DnsLookupForm";
import { notFound } from "next/navigation";

export default async function DnsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <PageShell title={dict.dns.title} subtitle={dict.dns.subtitle}>
      <DnsLookupForm dict={dict.dns} />
    </PageShell>
  );
}
