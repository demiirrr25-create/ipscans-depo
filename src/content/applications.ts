import type { Locale } from "@/i18n/config";

type Localized = Record<Locale, string>;

export const ipcastRelease = {
  version: "1.1.0-preview.3",
  platform: "Windows 10/11 · x64",
  bytes: 105811342,
  sha256: "a86a675ae742d1c7979b653c0cdc34164c0f836c5216b4c4552a198c72330675",
  fileName: "IPCast-1.1.0-preview.3.exe",
  url: "https://github.com/demiirrr25-create/ipscans-depo/releases/download/v1.1.0-preview.3/IPCast-1.1.0-preview.3.exe",
} as const;

export const platformCopy: Record<Locale, {
  eyebrow: string;
  title: string;
  subtitle: string;
  explore: string;
  download: string;
  downloadApp: string;
  applications: string;
  applicationsIntro: string;
  details: string;
  version: string;
  platform: string;
  size: string;
  checksum: string;
  preview: string;
}> = {
  tr: { eyebrow: "IPScans ağ araçları platformu", title: "Ağ araçları. Tek platform.", subtitle: "Ağ analizi, IP yönetimi ve uzaktan bağlantı araçları tek bir yerde.", explore: "Uygulamaları Keşfet", download: "IPCast'i İndir", downloadApp: "İndir", applications: "Uygulamalar", applicationsIntro: "IPScans tarafından geliştirilen masaüstü araçları.", details: "Detayları Gör", version: "Sürüm", platform: "Platform", size: "Dosya boyutu", checksum: "SHA-256", preview: "Önizleme sürümü" },
  en: { eyebrow: "IPScans network tools platform", title: "Network tools. One platform.", subtitle: "Network analysis, IP management and remote access tools in one place.", explore: "Explore Apps", download: "Download IPCast", downloadApp: "Download", applications: "Applications", applicationsIntro: "Desktop tools built by IPScans.", details: "View Details", version: "Version", platform: "Platform", size: "File size", checksum: "SHA-256", preview: "Preview release" },
  de: { eyebrow: "IPScans Netzwerkplattform", title: "Netzwerktools. Eine Plattform.", subtitle: "Netzwerkanalyse, IP-Verwaltung und Fernzugriff an einem Ort.", explore: "Apps entdecken", download: "IPCast herunterladen", downloadApp: "Herunterladen", applications: "Anwendungen", applicationsIntro: "Desktop-Tools von IPScans.", details: "Details ansehen", version: "Version", platform: "Plattform", size: "Dateigröße", checksum: "SHA-256", preview: "Vorschauversion" },
  fr: { eyebrow: "Plateforme d'outils réseau IPScans", title: "Outils réseau. Une plateforme.", subtitle: "Analyse réseau, gestion des IP et accès à distance au même endroit.", explore: "Découvrir les apps", download: "Télécharger IPCast", downloadApp: "Télécharger", applications: "Applications", applicationsIntro: "Outils de bureau créés par IPScans.", details: "Voir les détails", version: "Version", platform: "Plateforme", size: "Taille du fichier", checksum: "SHA-256", preview: "Version d'aperçu" },
  es: { eyebrow: "Plataforma de herramientas de red IPScans", title: "Herramientas de red. Una plataforma.", subtitle: "Análisis de red, gestión de IP y acceso remoto en un solo lugar.", explore: "Explorar aplicaciones", download: "Descargar IPCast", downloadApp: "Descargar", applications: "Aplicaciones", applicationsIntro: "Herramientas de escritorio de IPScans.", details: "Ver detalles", version: "Versión", platform: "Plataforma", size: "Tamaño del archivo", checksum: "SHA-256", preview: "Versión preliminar" },
};

export type Application = {
  id: "ipcast" | "scanner" | "health-pro";
  name: string;
  description: Localized;
  icon: string;
  version: string;
  platform: string;
  detailPath: string;
  downloadUrl: string;
};

export const applications: readonly Application[] = [
  {
    id: "ipcast",
    name: "IPCast",
    description: { tr: "Uzak masaüstü ve destek", en: "Remote desktop and support", de: "Fernzugriff und Support", fr: "Bureau à distance et assistance", es: "Escritorio remoto y soporte" },
    icon: "/ipcast-mark.svg",
    version: ipcastRelease.version,
    platform: ipcastRelease.platform,
    detailPath: "/ipcast",
    downloadUrl: ipcastRelease.url,
  },
  {
    id: "scanner",
    name: "IP Scanner",
    description: { tr: "Ağ keşfi ve IP tarayıcı", en: "Network discovery and IP scanner", de: "Netzwerkerkennung und IP-Scanner", fr: "Découverte réseau et scanner IP", es: "Descubrimiento de red y escáner IP" },
    icon: "/scanner-mark.svg",
    version: "1.0.0",
    platform: "Windows · x64",
    detailPath: "/download",
    downloadUrl: "/downloads/ipscans-network-scanner.exe",
  },
  {
    id: "health-pro",
    name: "Network Health Pro",
    description: { tr: "Ağ izleme ve IP çakışma tespiti", en: "Network monitoring and IP conflict detection", de: "Netzwerküberwachung und IP-Konflikterkennung", fr: "Surveillance réseau et détection des conflits IP", es: "Supervisión de red y detección de conflictos IP" },
    icon: "/scanner-mark.svg",
    version: "1.2.1",
    platform: "Windows · x64",
    detailPath: "/pro",
    downloadUrl: "/downloads/ipscans-network-health-pro.exe",
  },
];
