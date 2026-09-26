import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { IpLookupForm } from "@/components/IpLookupForm";
import { notFound } from "next/navigation";

export default async function IpLookupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <PageShell title={dict.ipLookup.title} subtitle={dict.ipLookup.subtitle}>
      <IpLookupForm dict={dict.ipLookup} />
    </PageShell>
  );
}
