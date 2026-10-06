import type { Locale } from "@/i18n/config";

type Localized = Record<Locale, string>;

export const ipcastRelease = {
  version: "2.5.0",
  platform: "Windows 10/11 · x64",
  bytes: 106634310,
  sha256: "11e42d230033c065527100c638b8c0b6bd985196f63942f45cb41ff4afab1242",
  fileName: "IPCast-2.5.0.exe",
  url: "https://github.com/demiirrr25-create/ipscans-depo/releases/download/ipcast-v2.5.0/IPCast-2.5.0.exe",
  publishedAt: "2026-10-03T14:03:08Z",
  installerUrl: "https://github.com/demiirrr25-create/ipscans-depo/releases/download/ipcast-v2.5.0/IPCast-2.5.0-Setup.exe",
  installerBytes: 34848042,
  installerSha256: "d94eb92794b8512a3e48d3ac30ab2cb8218f06d38ba3be63e98e9be68003e612",
  releaseUrl: "https://github.com/demiirrr25-create/ipscans-depo/releases/tag/ipcast-v2.5.0",
} as const;

export const desktopRelease = {
  scanner: {
    installerUrl: "https://github.com/demiirrr25-create/ipscans-depo/releases/download/ipscans-plus-v2.0.2/IPscans-Plus-Setup.exe",
    portableUrl: "https://github.com/demiirrr25-create/ipscans-depo/releases/download/ipscans-plus-v2.0.2/IPscans-Plus.exe",
    installerBytes: 52674080,
    installerSha256: "fe4c8c7535a8e2d1939060d38e95a21f9227a827114fb9cbebcd485f05ddf2f5",
  },
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
  tr: { eyebrow: "IPScans ağ araçları platformu", title: "Ağ araçları. Tek platform.", subtitle: "Ağ analizi, IP yönetimi ve uzaktan bağlantı araçları tek bir yerde.", explore: "Uygulamaları Keşfet", download: "IPCast'i İndir", downloadApp: "İndir", applications: "Uygulamalar", applicationsIntro: "IPScans tarafından geliştirilen masaüstü araçları.", details: "Detayları Gör", version: "Sürüm", platform: "Platform", size: "Dosya boyutu", checksum: "SHA-256", preview: "Kararlı sürüm" },
  en: { eyebrow: "IPScans network tools platform", title: "Network tools. One platform.", subtitle: "Network analysis, IP management and remote access tools in one place.", explore: "Explore Apps", download: "Download IPCast", downloadApp: "Download", applications: "Applications", applicationsIntro: "Desktop tools built by IPScans.", details: "View Details", version: "Version", platform: "Platform", size: "File size", checksum: "SHA-256", preview: "Stable release" },
  de: { eyebrow: "IPScans Netzwerkplattform", title: "Netzwerktools. Eine Plattform.", subtitle: "Netzwerkanalyse, IP-Verwaltung und Fernzugriff an einem Ort.", explore: "Apps entdecken", download: "IPCast herunterladen", downloadApp: "Herunterladen", applications: "Anwendungen", applicationsIntro: "Desktop-Tools von IPScans.", details: "Details ansehen", version: "Version", platform: "Plattform", size: "Dateigröße", checksum: "SHA-256", preview: "Stabile Version" },
  fr: { eyebrow: "Plateforme d'outils réseau IPScans", title: "Outils réseau. Une plateforme.", subtitle: "Analyse réseau, gestion des IP et accès à distance au même endroit.", explore: "Découvrir les apps", download: "Télécharger IPCast", downloadApp: "Télécharger", applications: "Applications", applicationsIntro: "Outils de bureau créés par IPScans.", details: "Voir les détails", version: "Version", platform: "Plateforme", size: "Taille du fichier", checksum: "SHA-256", preview: "Version stable" },
  es: { eyebrow: "Plataforma de herramientas de red IPScans", title: "Herramientas de red. Una plataforma.", subtitle: "Análisis de red, gestión de IP y acceso remoto en un solo lugar.", explore: "Explorar aplicaciones", download: "Descargar IPCast", downloadApp: "Descargar", applications: "Aplicaciones", applicationsIntro: "Herramientas de escritorio de IPScans.", details: "Ver detalles", version: "Versión", platform: "Plataforma", size: "Tamaño del archivo", checksum: "SHA-256", preview: "Versión estable" },
  it: { eyebrow: "Piattaforma di strumenti di rete IPScans", title: "Strumenti di rete. Un'unica piattaforma.", subtitle: "Analisi di rete, gestione IP e accesso remoto in un unico posto.", explore: "Esplora le app", download: "Scarica IPCast", downloadApp: "Scarica", applications: "Applicazioni", applicationsIntro: "Strumenti desktop sviluppati da IPScans.", details: "Vedi dettagli", version: "Versione", platform: "Piattaforma", size: "Dimensione file", checksum: "SHA-256", preview: "Versione stabile" },
  pt: { eyebrow: "Plataforma de ferramentas de rede IPScans", title: "Ferramentas de rede. Uma plataforma.", subtitle: "Análise de rede, gestão de IP e acesso remoto num só lugar.", explore: "Explorar aplicações", download: "Descarregar IPCast", downloadApp: "Descarregar", applications: "Aplicações", applicationsIntro: "Ferramentas de ambiente de trabalho da IPScans.", details: "Ver detalhes", version: "Versão", platform: "Plataforma", size: "Tamanho do ficheiro", checksum: "SHA-256", preview: "Versão estável" },
  nl: { eyebrow: "IPScans-platform voor netwerktools", title: "Netwerktools. Eén platform.", subtitle: "Netwerkanalyse, IP-beheer en externe toegang op één plek.", explore: "Ontdek apps", download: "IPCast downloaden", downloadApp: "Downloaden", applications: "Applicaties", applicationsIntro: "Desktoptools ontwikkeld door IPScans.", details: "Details bekijken", version: "Versie", platform: "Platform", size: "Bestandsgrootte", checksum: "SHA-256", preview: "Stabiele versie" },
  pl: { eyebrow: "Platforma narzędzi sieciowych IPScans", title: "Narzędzia sieciowe. Jedna platforma.", subtitle: "Analiza sieci, zarządzanie IP i dostęp zdalny w jednym miejscu.", explore: "Poznaj aplikacje", download: "Pobierz IPCast", downloadApp: "Pobierz", applications: "Aplikacje", applicationsIntro: "Narzędzia komputerowe stworzone przez IPScans.", details: "Zobacz szczegóły", version: "Wersja", platform: "Platforma", size: "Rozmiar pliku", checksum: "SHA-256", preview: "Wersja stabilna" },
  ru: { eyebrow: "Платформа сетевых инструментов IPScans", title: "Сетевые инструменты. Одна платформа.", subtitle: "Анализ сети, управление IP и удалённый доступ в одном месте.", explore: "Смотреть приложения", download: "Скачать IPCast", downloadApp: "Скачать", applications: "Приложения", applicationsIntro: "Настольные инструменты от IPScans.", details: "Подробнее", version: "Версия", platform: "Платформа", size: "Размер файла", checksum: "SHA-256", preview: "Стабильный выпуск" },
  ar: { eyebrow: "منصة أدوات الشبكات IPScans", title: "أدوات الشبكات. منصة واحدة.", subtitle: "تحليل الشبكات وإدارة عناوين IP والوصول عن بُعد في مكان واحد.", explore: "استكشف التطبيقات", download: "تنزيل IPCast", downloadApp: "تنزيل", applications: "التطبيقات", applicationsIntro: "أدوات سطح المكتب من IPScans.", details: "عرض التفاصيل", version: "الإصدار", platform: "النظام", size: "حجم الملف", checksum: "SHA-256", preview: "إصدار مستقر" },
  ja: { eyebrow: "IPScans ネットワークツールプラットフォーム", title: "ネットワークツールをひとつの場所に。", subtitle: "ネットワーク分析、IP管理、リモートアクセスを一か所で。", explore: "アプリを見る", download: "IPCast をダウンロード", downloadApp: "ダウンロード", applications: "アプリケーション", applicationsIntro: "IPScans が開発したデスクトップツール。", details: "詳細を見る", version: "バージョン", platform: "プラットフォーム", size: "ファイルサイズ", checksum: "SHA-256", preview: "安定版" },
  ko: { eyebrow: "IPScans 네트워크 도구 플랫폼", title: "네트워크 도구, 하나의 플랫폼.", subtitle: "네트워크 분석, IP 관리, 원격 접속을 한곳에서.", explore: "앱 살펴보기", download: "IPCast 다운로드", downloadApp: "다운로드", applications: "애플리케이션", applicationsIntro: "IPScans에서 개발한 데스크톱 도구.", details: "자세히 보기", version: "버전", platform: "플랫폼", size: "파일 크기", checksum: "SHA-256", preview: "안정 버전" },
  zh: { eyebrow: "IPScans 网络工具平台", title: "网络工具，一个平台。", subtitle: "网络分析、IP 管理和远程访问，尽在一处。", explore: "探索应用", download: "下载 IPCast", downloadApp: "下载", applications: "应用程序", applicationsIntro: "由 IPScans 开发的桌面工具。", details: "查看详情", version: "版本", platform: "平台", size: "文件大小", checksum: "SHA-256", preview: "稳定版本" },
};

export type Application = {
  id: "ipcast" | "scanner";
  name: string;
  description: Localized;
  icon: string;
  version: string;
  platform: string;
  detailPath: string;
  downloadUrl: string;
  portableUrl: string;
  installerBytes: number;
  installerSha256: string;
};

export const applications: readonly Application[] = [
  {
    id: "ipcast",
    name: "IPCast",
    description: { tr: "Cihaz kimliğiyle uzak masaüstü bağlantısı ve erişim onayı", en: "Remote desktop connections with device ID and access approval", de: "Fernzugriff und Support", fr: "Bureau à distance et assistance", es: "Escritorio remoto y soporte", it: "Desktop remoto e assistenza", pt: "Ambiente de trabalho remoto e apoio", nl: "Extern bureaublad en ondersteuning", pl: "Pulpit zdalny i wsparcie", ru: "Удалённый рабочий стол и поддержка", ar: "سطح المكتب البعيد والدعم", ja: "リモートデスクトップとサポート", ko: "원격 데스크톱 및 지원", zh: "远程桌面与支持" },
    icon: "/ipcast-mark.svg",
    version: ipcastRelease.version,
    platform: ipcastRelease.platform,
    detailPath: "/ipcast",
    downloadUrl: ipcastRelease.installerUrl,
    portableUrl: ipcastRelease.url,
    installerBytes: ipcastRelease.installerBytes,
    installerSha256: ipcastRelease.installerSha256,
  },
  {
    id: "scanner",
    name: "IPscans+",
    description: { tr: "Ağ keşfi, cihaz tanıma, ONVIF kamera keşfi ve kanıta dayalı IP TREE", en: "Network discovery, device intelligence, ONVIF camera discovery and evidence-based IP TREE", de: "Netzwerkerkennung, Geräteanalyse und IP TREE", fr: "Découverte réseau, analyse des appareils et IP TREE", es: "Descubrimiento de red, análisis de dispositivos e IP TREE", it: "Rilevamento della rete, analisi dei dispositivi e IP TREE", pt: "Descoberta de rede, análise de dispositivos e IP TREE", nl: "Netwerkdetectie, apparaatanalyse en IP TREE", pl: "Wykrywanie sieci, analiza urządzeń i IP TREE", ru: "Обнаружение сети, анализ устройств и IP TREE", ar: "اكتشاف الشبكة وتحليل الأجهزة وIP TREE", ja: "ネットワーク検出、デバイス分析、IP TREE", ko: "네트워크 탐색, 장치 분석 및 IP TREE", zh: "网络发现、设备分析和 IP TREE" },
    icon: "/scanner-mark.svg",
    version: "2.0.2",
    platform: "Windows · x64",
    detailPath: "/download",
    downloadUrl: desktopRelease.scanner.installerUrl,
    portableUrl: desktopRelease.scanner.portableUrl,
    installerBytes: desktopRelease.scanner.installerBytes,
    installerSha256: desktopRelease.scanner.installerSha256,
  },
];

export const scannerApplication: Application = (() => {
  const app = applications.find((entry) => entry.id === "scanner");
  if (!app) throw new Error("IPscans+ product is missing from the catalog");
  return app;
})();
