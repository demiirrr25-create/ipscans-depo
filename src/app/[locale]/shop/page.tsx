import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { ShopHero } from "@/components/shop/ShopHero";
import { CountdownTimer } from "@/components/shop/CountdownTimer";
import { CollectionsGrid } from "@/components/shop/CollectionsGrid";
import { ProductPreviewModal } from "@/components/shop/ProductPreviewModal";
import { VIPNewsletter } from "@/components/shop/VIPNewsletter";
import { BrandValues } from "@/components/shop/BrandValues";
import { StoreLocationFAQ } from "@/components/shop/StoreLocationFAQ";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);

  return {
    title: dict.shop.title,
    description: dict.shop.comingSoonBody,
    keywords: [
      "Harry Villegas",
      "Harry Villegas Shop",
      "Erkek Giyim Mağazası",
      "Lüks Erkek Modası",
      "Takım Elbise",
      "Özel Dikim",
      "Bespoke Menswear",
      "Italian Fabrics",
      "Kaşmir Kaban",
      "Nişantaşı Erkek Giyim",
    ],
    openGraph: {
      title: dict.shop.title,
      description: dict.shop.comingSoonBody,
      type: "website",
      url: "https://harryvillegas.shop",
      siteName: "Harry Villegas",
    },
    alternates: {
      canonical: `https://harryvillegas.shop/${locale}/shop`,
    },
  };
}

export default async function ShopPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    name: "Harry Villegas",
    url: "https://harryvillegas.shop",
    description: dict.shop.comingSoonBody,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Abdi İpekçi Caddesi No: 42",
      addressLocality: "Nişantaşı",
      addressRegion: "İstanbul",
      addressCountry: "TR",
    },
    brand: {
      "@type": "Brand",
      name: "Harry Villegas",
      slogan: dict.shop.tagline,
    },
  };

  return (
    <PageShell title={dict.shop.brandName}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Banner */}
        <ShopHero
          brandName={dict.shop.brandName}
          tagline={dict.shop.tagline}
          comingSoonTitle={dict.shop.comingSoonTitle}
          comingSoonBody={dict.shop.comingSoonBody}
          heroBadge={dict.shop.heroBadge}
        />

        {/* Live Opening Countdown */}
        <CountdownTimer
          dict={{
            countdownTitle: dict.shop.countdownTitle,
            days: dict.shop.days,
            hours: dict.shop.hours,
            minutes: dict.shop.minutes,
            seconds: dict.shop.seconds,
          }}
        />

        {/* Featured Collections */}
        <CollectionsGrid
          title={dict.shop.collectionsTitle}
          subtitle={dict.shop.collectionsSubtitle}
          collections={dict.shop.collections}
        />

        {/* Featured Products & Quick Look Modal */}
        <ProductPreviewModal
          title={dict.shop.featuredTitle}
          quickLook={dict.shop.quickLook}
          closeText={dict.shop.close}
          products={dict.shop.products}
        />

        {/* VIP Early Access Newsletter Form */}
        <VIPNewsletter
          dict={{
            newsletterTitle: dict.shop.newsletterTitle,
            newsletterSubtitle: dict.shop.newsletterSubtitle,
            emailPlaceholder: dict.shop.emailPlaceholder,
            subscribeBtn: dict.shop.subscribeBtn,
            successMsg: dict.shop.successMsg,
          }}
        />

        {/* Brand Core Values */}
        <BrandValues
          title={dict.shop.brandValuesTitle}
          brandValues={dict.shop.brandValues}
        />

        {/* Flagship Location, Contact & FAQ */}
        <StoreLocationFAQ
          storeTitle={dict.shop.storeTitle}
          storeAddress={dict.shop.storeAddress}
          onlineNote={dict.shop.onlineStoreNote}
          whatsappBtn={dict.shop.whatsappBtn}
          emailBtn={dict.shop.emailBtn}
          faqTitle={dict.shop.faqTitle}
          faqs={dict.shop.faqs}
        />
      </div>
    </PageShell>
  );
}
