import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { platformCopy, scannerApplication } from "@/content/applications";
import { Icon } from "@/components/ds/Icon";
import { DownloadStage } from "@/components/ds/product";
import { HeroSection } from "@/components/home/HeroSection";
import { ProductShowcase } from "@/components/home/ProductShowcase";
import { NetworkToolsSection } from "@/components/home/NetworkToolsSection";
import { LatestArticlesSection } from "@/components/home/LatestArticlesSection";
import { homeCopy } from "@/components/home/copy";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const platform = platformCopy[locale];
  const copy = homeCopy[locale];

  return (
    <div className="relative">
      <HeroSection locale={locale} dict={dict} />

      <ProductShowcase locale={locale} />

      <NetworkToolsSection locale={locale} dict={dict} />

      <LatestArticlesSection locale={locale} dict={dict} />

      <section className="ds-section">
        <div className="ds-container">
          <DownloadStage
            title={dict.cta.title}
            lead={dict.cta.subtitle}
            note={copy.closingNote}
          >
            <a
              href={scannerApplication.downloadUrl}
              className="btn btn-inverse btn-lg"
            >
              <Icon name="windows" size={18} />
              <span>{copy.downloadScannerCta}</span>
              <Icon name="download" size={18} />
            </a>
            <Link
              href={`/${locale}/download`}
              className="btn btn-inverse-secondary btn-lg"
            >
              <span>{platform.explore}</span>
              <Icon
                name="arrowRight"
                size={18}
                className="btn-arrow rtl-flip"
              />
            </Link>
          </DownloadStage>
        </div>
      </section>
    </div>
  );
}
