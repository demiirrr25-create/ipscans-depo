import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { WhoisForm } from "@/components/WhoisForm";
import { notFound } from "next/navigation";

export default async function WhoisPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <PageShell title={dict.whois.title} subtitle={dict.whois.subtitle}>
      <WhoisForm dict={dict.whois} />
    </PageShell>
  );
}
