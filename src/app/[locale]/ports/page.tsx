import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { PortCheckForm } from "@/components/PortCheckForm";
import { notFound } from "next/navigation";

export default async function PortsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <PageShell title={dict.ports.title} subtitle={dict.ports.subtitle}>
      <PortCheckForm dict={dict.ports} />
    </PageShell>
  );
}
