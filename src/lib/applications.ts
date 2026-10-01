import type { Locale } from "@/i18n/config";
import { ipcastRelease } from "@/lib/ipcast-release";

type LocalizedApplicationCopy = {
  description: string;
  status: string;
  action: string;
};

export type Application = {
  id: "ipcast" | "scanner" | "health-pro";
  name: string;
  monogram: string;
  version: string;
  platform: string;
  detailPath: string;
  downloadPath?: string;
  downloadAvailable: boolean;
  copy: Record<Locale, LocalizedApplicationCopy>;
};

export const applications: Application[] = [
  {
    id: "ipcast",
    name: "IPCast",
    monogram: "IP",
    version: ipcastRelease.version,
    platform: ipcastRelease.platform,
    detailPath: "/ipcast",
    downloadPath: "/download/ipcast",
    downloadAvailable: ipcastRelease.published,
    copy: {
      tr: { description: "Yerel ağda uzak masaüstü ve kullanıcı onaylı destek.", status: "Windows paketi doğrulanıyor", action: "Ürün bilgisi" },
      en: { description: "Remote desktop and user-approved support on your local network.", status: "Windows package under validation", action: "Product details" },
      de: { description: "Remotedesktop und nutzerbestätigter Support im lokalen Netzwerk.", status: "Windows-Paket wird geprüft", action: "Produktdetails" },
      fr: { description: "Bureau à distance et assistance approuvée sur votre réseau local.", status: "Validation du package Windows", action: "Détails du produit" },
      es: { description: "Escritorio remoto y soporte aprobado en tu red local.", status: "Paquete de Windows en validación", action: "Detalles del producto" },
    },
  },
  {
    id: "scanner",
    name: "IP Scanner",
    monogram: "IP",
    version: "1.0.0",
    platform: "Windows",
    detailPath: "/download",
    downloadPath: "/downloads/ipscans-network-scanner.exe",
    downloadAvailable: true,
    copy: {
      tr: { description: "Yerel ağındaki cihazları keşfet ve IP envanterini görüntüle.", status: "İndirilebilir", action: "İndir" },
      en: { description: "Discover devices on your local network and inspect your IP inventory.", status: "Available", action: "Download" },
      de: { description: "Geräte im lokalen Netzwerk finden und den IP-Bestand anzeigen.", status: "Verfügbar", action: "Herunterladen" },
      fr: { description: "Découvrez les appareils du réseau local et consultez l’inventaire IP.", status: "Disponible", action: "Télécharger" },
      es: { description: "Detecta dispositivos en tu red local y consulta el inventario IP.", status: "Disponible", action: "Descargar" },
    },
  },
  {
    id: "health-pro",
    name: "Network Health Pro",
    monogram: "NH",
    version: "1.2.1",
    platform: "Windows",
    detailPath: "/pro",
    downloadPath: "/downloads/ipscans-network-health-pro.exe",
    downloadAvailable: true,
    copy: {
      tr: { description: "Sürekli ağ izleme, IP çakışma tespiti ve sağlık raporları.", status: "İndirilebilir", action: "Ürünü keşfet" },
      en: { description: "Continuous network monitoring, IP conflict detection and health reports.", status: "Available", action: "Explore product" },
      de: { description: "Kontinuierliche Netzwerküberwachung, IP-Konflikterkennung und Zustandsberichte.", status: "Verfügbar", action: "Produkt ansehen" },
      fr: { description: "Surveillance réseau continue, détection des conflits IP et rapports de santé.", status: "Disponible", action: "Voir le produit" },
      es: { description: "Supervisión continua, detección de conflictos IP e informes de estado.", status: "Disponible", action: "Ver producto" },
    },
  },
];

export const applicationSectionCopy: Record<Locale, { title: string; subtitle: string }> = {
  tr: { title: "Uygulamalar ve araçlar", subtitle: "IPScans tarafından geliştirilen ağ ve uzaktan erişim araçları." },
  en: { title: "Applications and tools", subtitle: "Network and remote-access tools built by IPScans." },
  de: { title: "Anwendungen und Tools", subtitle: "Netzwerk- und Fernzugriffswerkzeuge von IPScans." },
  fr: { title: "Applications et outils", subtitle: "Des outils réseau et d’accès à distance conçus par IPScans." },
  es: { title: "Aplicaciones y herramientas", subtitle: "Herramientas de red y acceso remoto desarrolladas por IPScans." },
};