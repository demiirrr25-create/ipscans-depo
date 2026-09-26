import type { Locale } from "@/i18n/config";

export type InstallOption = "none" | "install" | "installPlus";

export const INSTALL_PRICES: Record<InstallOption, number> = {
  none: 0,
  install: 750,
  installPlus: 1200,
};

export type Product = {
  slug: string;
  name: Record<Locale, string>;
  tagline: Record<Locale, string>;
  description: Record<Locale, string>;
  price: number;
  badge?: Record<Locale, string>;
  specs: Record<Locale, { label: string; value: string }[]>;
};

export const products: Product[] = [
  {
    slug: "dome-pro-4k",
    name: {
      tr: "Dome Pro 4K Güvenlik Kamerası",
      en: "Dome Pro 4K Security Camera",
    },
    tagline: {
      tr: "Gece görüşlü, 360° dönebilen iç/dış mekan kamerası",
      en: "Night vision, 360° pan indoor/outdoor camera",
    },
    description: {
      tr: "4K çözünürlük ve akıllı hareket algılama ile eviniz veya işyeriniz için üst düzey görüntü kalitesi sağlar.",
      en: "4K resolution and smart motion detection deliver top-tier image quality for your home or business.",
    },
    price: 2499,
    badge: { tr: "Çok Satan", en: "Best Seller" },
    specs: {
      tr: [
        { label: "Çözünürlük", value: "4K (3840×2160)" },
        { label: "Gece Görüşü", value: "30m, renkli gece modu" },
        { label: "Depolama", value: "MicroSD + bulut (opsiyonel)" },
        { label: "Bağlantı", value: "Wi-Fi 2.4/5GHz + PoE" },
      ],
      en: [
        { label: "Resolution", value: "4K (3840×2160)" },
        { label: "Night Vision", value: "30m, color night mode" },
        { label: "Storage", value: "MicroSD + cloud (optional)" },
        { label: "Connectivity", value: "Wi-Fi 2.4/5GHz + PoE" },
      ],
    },
  },
  {
    slug: "bullet-outdoor-2k",
    name: {
      tr: "Bullet Dış Mekan 2K Kamera",
      en: "Bullet Outdoor 2K Camera",
    },
    tagline: {
      tr: "IP67 su geçirmez gövde, geniş açı dış mekan koruması",
      en: "IP67 weatherproof body, wide-angle outdoor protection",
    },
    description: {
      tr: "Zorlu hava koşullarına dayanıklı gövdesi ile bahçe, giriş ve otopark gibi açık alanlar için idealdir.",
      en: "Weather-resistant housing makes it ideal for gardens, entrances and parking areas.",
    },
    price: 1699,
    specs: {
      tr: [
        { label: "Çözünürlük", value: "2K (2560×1440)" },
        { label: "Koruma Sınıfı", value: "IP67" },
        { label: "Görüş Açısı", value: "110°" },
        { label: "Bağlantı", value: "Wi-Fi 2.4GHz + PoE" },
      ],
      en: [
        { label: "Resolution", value: "2K (2560×1440)" },
        { label: "Protection", value: "IP67" },
        { label: "Field of View", value: "110°" },
        { label: "Connectivity", value: "Wi-Fi 2.4GHz + PoE" },
      ],
    },
  },
  {
    slug: "nvr-8ch-kit",
    name: {
      tr: "8 Kanal NVR Kayıt Sistemi Seti",
      en: "8-Channel NVR Recording Kit",
    },
    tagline: {
      tr: "4 kamera + 8 kanal kayıt cihazı, tam kurulum seti",
      en: "4 cameras + 8-channel recorder, complete install kit",
    },
    description: {
      tr: "Ev veya küçük işletmeler için 4 kamera ve 8 kanal kayıt cihazından oluşan hazır güvenlik seti.",
      en: "A ready-made security kit with 4 cameras and an 8-channel recorder for homes or small businesses.",
    },
    price: 6999,
    badge: { tr: "Kurumsal", en: "Business" },
    specs: {
      tr: [
        { label: "Kamera Sayısı", value: "4 adet dahil" },
        { label: "Kayıt Kapasitesi", value: "2TB HDD dahil" },
        { label: "Kanal", value: "8 kanal NVR" },
        { label: "Uzaktan İzleme", value: "Mobil uygulama ile" },
      ],
      en: [
        { label: "Cameras", value: "4 included" },
        { label: "Recording", value: "2TB HDD included" },
        { label: "Channels", value: "8-channel NVR" },
        { label: "Remote Viewing", value: "Via mobile app" },
      ],
    },
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
