import type { Locale } from "@/i18n/config";
import type { EnterpriseProductCopy } from "./lpr-copy";

export const cortexRelease = {
  version: "2.1.1",
  platform: "Windows 10/11 · x64",
  fileName: "IPScans-Cortex-Setup-2.1.1.exe",
  url: "https://github.com/demiirrr25-create/ipscans-depo/releases/download/cortex-v2.1.1/IPScans-Cortex-Setup-2.1.1.exe",
  guideUrl: "https://github.com/demiirrr25-create/ipscans-depo/releases/download/cortex-v2.1.1/Cortex-2.1.1-Kullanim.md",
  ollamaUrl: "https://ollama.com/download",
  sha256: "c514244c4acf47f8aabba607a35f5a7de31732ed3c3aeddefba46ed77a04d4fd",
  bytes: 106927842,
} as const;

export const cortexCopy: Record<Locale, EnterpriseProductCopy> = {
  en: {
    metaTitle: "IPScans Cortex 2.1 — Local Camera Vision AI, 8 Sector Packs & ROI Studio",
    metaDescription:
      "Turn RTSP and ONVIF cameras into a private operations center with 8 One-Click Sector Deployment Packages, an 8-Handle ROI & Tripwire Studio, 31 model-free + smart tracking rules, 42 multi-model Ollama vision AI templates, a 2-way Telegram Command Bot, PRO/PLUS/ULTRA commercial tiers, and SHA-256 forensic ZIP bundles.",
    backToApps: "All applications",
    eyebrow: "Cortex 2.1 · Local Camera Intelligence, Sector Suite & Commercial Control",
    name: "IPScans Cortex 2.1",
    headline: "Commercial intelligence for every camera.",
    lead:
      "Deploy 8 One-Click Sector Packages (Residential, Pool, Factory, Warehouse, Retail, Office, Campus, Clinic) with pre-calibrated zones, calibrate cameras in the daylight-ready 8-Handle ROI & Tripwire Studio, run 31 model-free and smart tracking rules alongside 42 multi-model Ollama vision AI templates (Gemma 3, Qwen 2.5 VL, MiniCPM-V), control your station via a 2-way Telegram Bot, and manage PRO / PLUS / ULTRA commercial licenses from a centralized Admin Panel.",
    primaryCta: "Download for Windows",
    secondaryCta: "User guide",
    screenshotAlt: "IPScans Cortex 2.1 Control Center (Light Theme) and 8 One-Click Sector Deployment Packages",
    screenshotCaption: "IPScans Cortex 2.1 Control Center in Light Theme with live KPIs, Matrix Camera Wall, and 8 One-Click Sector Deployment Packages.",
    capabilities: {
      eyebrow: "Core capabilities",
      title: "Visual analytics, 8 sector packages, 2-way Telegram bot, and forensic evidence without cloud uploads.",
      lead:
        "Combine deterministic pixel rules, multi-target trajectory tracking, and multi-model local Ollama vision AI so your camera feeds never leave your premises.",
      items: [
        {
          icon: "bolt",
          title: "8 One-Click Sector Deployment Packages",
          body: "Ready-to-deploy rule suites for Residential Sites, Pools & Social Clubs, Factories, Warehouses, Retail Stores, Office Plazas, Campuses & Schools, and Clinics & Elder Care—each with pre-calibrated ROI zones, schedules, selective rule checklists, and single or all-camera ('ALL') deployment.",
        },
        {
          icon: "camera",
          title: "8-Handle ROI & Tripwire Calibration Studio",
          body: "Draw, drag-to-pan, and resize analysis zones with 8 precision handles over live RTSP streams or an architectural 16:9 calibration grid in both Light and Dark themes. Includes Tripwire direction arrows, ±% verification bands, spatial/schedule presets, and live thermal heatmaps.",
        },
        {
          icon: "cpu",
          title: "31 Native + Smart Tracking & 42 Multi-Model Vision AI Rules",
          body: "Run 22 deterministic pixel/health rules, 6 Cortex Pro smart tracking rules (Loitering, Crowd/Occupancy, Tailgating, Perimeter Intrusion, Human Fall Detection, Abandoned Object), and 3 crossing rules—plus 42 vision AI templates powered by Gemma 3, Qwen 2.5 VL, and MiniCPM-V with a Live AI Test Studio.",
        },
        {
          icon: "play",
          title: "Forensic ZIP Bundle & Natural-Language Copilot",
          body: "Search events in natural language via SQLite FTS5 ('unreviewed tailgating today', 'night pool') and download court-ready ZIP bundles containing pre/post MP4 clips, keyframes, JSON metadata, and a CHAIN_OF_CUSTODY.sha256 manifest.",
        },
        {
          icon: "shield",
          title: "Two-Way Telegram Command Bot & Signed Webhooks",
          body: "Receive instant event snapshots and remotely command your station via Telegram (/durum, /kameralar, /anlik, /olaylar, /koru, /sustur), plus dispatch HMAC-SHA256 signed webhooks natively compatible with Slack, Discord, and SIEMs.",
        },
        {
          icon: "lock",
          title: "PRO / PLUS / ULTRA Commercial Tiers & Admin Panel",
          body: "Centralized Admin Control Panel for generating cryptographic license keys (PRO 4-Cam, PLUS 12-Cam, ULTRA 32-Cam), monitoring registered customer stations, and executing remote maintenance alongside KVKK/GDPR privacy masking.",
        },
      ],
    },
    steps: {
      eyebrow: "Getting started",
      title: "Start local camera monitoring in three steps.",
      lead: "Run deterministic rules out of the box, or pair Cortex with Ollama for multi-model local vision AI inference.",
      items: [
        {
          title: "Launch the standalone executable & activate license",
          body: "Launch the EXE and enter your PRO, PLUS, or ULTRA license key issued from the Cortex Admin Control Panel.",
        },
        {
          title: "Choose model-free rules or connect Multi-Model Ollama",
          body: "Use 31 local & tracking rules immediately, or select Gemma 3, Qwen 2.5 VL, or MiniCPM-V in Settings and test prompts live.",
        },
        {
          title: "Deploy a Sector Pack & connect Telegram Bot",
          body: "Apply one of the 8 One-Click Sector Packages to your RTSP/ONVIF cameras and pair your Telegram Bot for two-way mobile control.",
        },
      ],
      helperText:
        "Initial AI preparation requires internet. Readiness is verified using an actual vision-model response.",
      helperLinkLabel: "Setup and user guide",
      helperLinkHref: cortexRelease.guideUrl,
    },
    compatibility: {
      eyebrow: "Commercial packages & architecture",
      title: "Three commercial tiers built for private, on-premise camera operations.",
      lead: "Scale from boutique offices to 32-camera industrial facilities with cryptographic license enforcement.",
      cards: [
        {
          title: "Cortex PRO (Up to 4 Cameras / 8 Rules)",
          body: "Includes 22 deterministic local rules, 3 crossing rules, 8-Handle ROI Studio, Residential & Retail sector packs, Telegram photo alerts, and 7-day archive retention.",
        },
        {
          title: "Cortex PLUS (Up to 12 Cameras / 32 Rules)",
          body: "Adds 6 Cortex Pro smart tracking rules (Fall, Abandoned Object, Loitering, Tailgating, Occupancy, Perimeter), 42 Ollama Vision AI templates, Two-Way Telegram Command Bot, Forensic ZIP exports, and 7 sector packs.",
        },
        {
          title: "Cortex ULTRA (Up to 32 Cameras / 128 Rules)",
          body: "Unlocks all 8 sector packs (including Clinic & Elder Care), SQLite FTS5 Copilot search, KVKK/GDPR privacy masking, HMAC-SHA256 webhooks, ONVIF NVR fleet sync, and 30-day archive retention.",
        },
      ],
    },
    release: {
      title: "Release details",
      versionLabel: "Version",
      platformLabel: "Platform",
      runtimeLabel: "Distribution",
      runtimeValue: "Windows installer with desktop shortcut",
      installerLabel: "Windows Installer (.exe)",
      copyLabel: "Copy SHA-256",
      copiedLabel: "Copied",
      downloadLabel: "Download",
      releaseNotesLabel: "Documentation & user guide",
    },
    closing: {
      title: "Give your cameras a commercial local rule engine.",
      lead: "Download IPScans Cortex 2.1 and start capturing rule-driven video evidence on your own hardware.",
      primaryCta: "Download IPScans Cortex",
      secondaryCta: "All applications",
      note: "Standalone executable for Windows. Verify file integrity with SHA-256.",
    },
  },
  tr: {
    metaTitle: "IPScans Cortex 2.1 — Kurumsal Kamera Zekâsı, 8 Sektörel Paket, Telegram Botu ve Yönetim Paneli",
    metaDescription:
      "RTSP/ONVIF kameralarınızı 8 Tek Tıkla Sektörel Kurulum Paketi, 8-Tutamaçlı Bölge (ROI) & Geçiş Hattı Stüdyosu, 31 yerel + akıllı takip kuralı, 42 çoklu model (Gemma 3, Qwen 2.5 VL, MiniCPM-V) görsel AI şablonu, İki Yönlü Telegram Botu ve PRO/PLUS/ULTRA Yönetim Paneliyle tam donanımlı güvenlik merkezine dönüştürün.",
    backToApps: "Tüm uygulamalar",
    eyebrow: "Cortex 2.1 · Kurumsal Kamera Zekâsı, Sektörel Saha Paketi ve Merkezi Lisans Yönetimi",
    name: "IPScans Cortex 2.1",
    headline: "Her kameraya kurumsal görsel zekâ ve tam saha otomasyonu.",
    lead:
      "8 Tek Tıkla Sektörel Kurulum Paketi (Site & Rezidans, Havuz & Sosyal Tesis, Fabrika & Saha, Depo & Lojistik, Perakende & Mağaza, Ofis & Plaza, Kampüs & Okul, Klinik & Yaşlı Bakım), Açık Tema destekli 8-Tutamaçlı Profesyonel Bölge (ROI) & Geçiş Hattı Stüdyosu, 31 model gerektirmeyen yerel ve akıllı takip kuralı, 42 çoklu Ollama görsel AI şablonu (Gemma 3, Qwen 2.5 VL, MiniCPM-V), İki Yönlü Telegram Komuta Botu ve PRO / PLUS / ULTRA Merkezi Yönetim Paneliyle tam yerel kontrol.",
    primaryCta: "Windows İçin İndir",
    secondaryCta: "Kullanım kılavuzu",
    screenshotAlt: "IPScans Cortex 2.1 Açık Tema Kontrol Merkezi ve 8 Tek Tıkla Sektörel Kurulum Paketi",
    screenshotCaption: "Açık Tema (Light Mode) görünümüyle canlı KPI göstergeleri, Matrix Kamera Duvarı ve 8 Tek Tıkla Sektörel Kurulum Paketi sunan IPScans Cortex 2.1 Kontrol Merkezi.",
    capabilities: {
      eyebrow: "Temel yetenekler",
      title: "Buluta görüntü yüklemeden 8 sektörel paket, iki yönlü Telegram botu ve çoklu görsel AI.",
      lead:
        "Deterministik sinyal kurallarını, çoklu hedef yörünge takibini ve çoklu yerel Ollama görsel yapay zekâ modellerini birleştirerek kamera akışlarınızı kendi ağınızda tutun.",
      items: [
        {
          icon: "bolt",
          title: "8 Tek Tıkla Sektörel Kurulum Paketi",
          body: "Site & Rezidans, Havuz & Sosyal Tesis, Fabrika & Endüstriyel Saha, Depo & Lojistik, Perakende & Mağaza, Ofis & Plaza, Kampüs & Okul ve Klinik & Yaşlı Bakım için hazır ROI bölgeleri ve zaman çizelgeleriyle tek kameraya veya tüm kameralara ('ALL') tek tuşla kurulum.",
        },
        {
          icon: "camera",
          title: "8-Tutamaçlı Bölge (ROI) & Geçiş Hattı Stüdyosu",
          body: "Açık ve koyu temada canlı kamera görüntüsü veya 16:9 mimari kalibrasyon sahnesi üzerinde fareyle bölge çizme, sürükleyip taşıma, 8 köşe/kenar tutamacıyla hassas boyutlandırma, ±% doğrulama bandı, hazır bölge/mesai şablonları ve canlı termal ısı haritası.",
        },
        {
          icon: "cpu",
          title: "31 Yerel + Akıllı Takip ve 42 Çoklu Ollama Görsel AI Kuralı",
          body: "22 deterministik piksel/sabotaj kuralı, 6 Cortex Pro akıllı takip kuralı (Loitering, Kalabalık/Kapasite, Tailgating, Yasak Bölge, İnsani Düşme / Bayılma, Bırakılan / Unutulan Nesne) ve 3 geçiş kuralına ek olarak Gemma 3, Qwen 2.5 VL ve MiniCPM-V destekli 42 görsel AI şablonu ve Canlı AI Test Stüdyosu.",
        },
        {
          icon: "play",
          title: "SHA-256 Adli Kanıt ZIP Paketi ve Doğal Dil Arama",
          body: "SQLite FTS5 'Cortex Copilot' ile ('bugün incelenmemiş tailgating', 'gece havuz') saniyeler içinde arama yapın; olay öncesi/sonrası MP4 videoları ve CHAIN_OF_CUSTODY.sha256 sertifikasını tek ZIP paketinde indirin.",
        },
        {
          icon: "shield",
          title: "İki Yönlü Telegram Komuta Botu ve İmzalı Webhook",
          body: "Olay anında fotoğraflı mobil alarm alın ve Telegram üzerinden (/durum, /kameralar, /anlik, /olaylar, /koru, /sustur) komutlarıyla sistemi uzaktan yönetin; Slack, Discord ve SIEM sistemlerine HMAC-SHA256 imzalı webhook iletin.",
        },
        {
          icon: "lock",
          title: "PRO / PLUS / ULTRA Paketler ve Merkezi Yönetim Paneli",
          body: "Yalnızca yöneticiye özel Yönetim Panelinden müşterileriniz için PRO (4 Kamera), PLUS (12 Kamera) ve ULTRA (32 Kamera) lisans anahtarları üretin, kayıtlı istasyonları izleyin ve tek tıkla uzaktan müdahale edin.",
        },
      ],
    },
    steps: {
      eyebrow: "İlk kullanım",
      title: "Üç adımda kurumsal kamera izlemeye başlayın.",
      lead: "Müşteri lisans anahtarınızı etkinleştirin, sektörel paketinizi seçin ve Telegram botunuzu bağlayın.",
      items: [
        {
          title: "EXE dosyasını çalıştırın ve lisansınızı girin",
          body: "Uygulamayı açın; Yönetim Panelinden üretilen IPS-PRO, IPS-PLUS veya IPS-ULTRA lisans anahtarınızı girerek paketinizi anında aktifleştirin.",
        },
        {
          title: "Yerel kuralları veya Çoklu Ollama AI modelini seçin",
          body: "31 yerel ve akıllı takip kuralını hemen kullanın veya Ayarlar'dan Gemma 3, Qwen 2.5 VL ya da MiniCPM-V modelini seçip Canlı AI Test Stüdyosunda doğrulayın.",
        },
        {
          title: "Sektörel paketi kurun ve Telegram Botunu bağlayın",
          body: "8 hazır sektörel paketten birini tek tıkla kameralarınıza dağıtın ve iki yönlü Telegram komuta botuyla cebinizden yönetmeye başlayın.",
        },
      ],
      helperText:
        "İlk AI hazırlığı internet gerektirir. Hazır durumu, gerçek görsel model yanıtı alınarak doğrulanır.",
      helperLinkLabel: "Kurulum ve kullanım kılavuzu",
      helperLinkHref: cortexRelease.guideUrl,
    },
    compatibility: {
      eyebrow: "Ticari paketler ve lisans sınırlandırmaları",
      title: "İhtiyaca göre ölçeklenen 3 kurumsal paket: PRO, PLUS ve ULTRA.",
      lead: "Kriptografik HMAC-SHA256 lisans doğrulamasıyla her müşteri paketine özel kamera, kural ve modül yetkilendirmesi.",
      cards: [
        {
          title: "Cortex PRO (4 Kamera · 8 Kural · 7 Gün Arşiv)",
          body: "22 deterministik yerel kural, 3 geçiş kontrol kuralı, 8-Tutamaçlı ROI Stüdyosu, Site ve Perakende sektörel paketleri ile tek yönlü Telegram fotoğraflı bildirimleri içerir.",
        },
        {
          title: "Cortex PLUS (12 Kamera · 32 Kural · 15 Gün Arşiv)",
          body: "6 Cortex Pro akıllı takip kuralı (Düşme, Unutulan Nesne, Loitering, Tailgating, Kapasite, Çevre), 42 Çoklu Ollama Görsel AI şablonu, İki Yönlü Telegram Komuta Botu, Adli Kanıt ZIP ve 7 sektörel paketi açar.",
        },
        {
          title: "Cortex ULTRA (32 Kamera · 128 Kural · 30 Gün Arşiv)",
          body: "Klinik & Yaşlı Bakım dahil tüm 8 sektörel paket, SQLite FTS5 Doğal Dil Copilot arama, KVKK gizlilik maskeleme, imzalı kurumsal Webhook, toplu ONVIF NVR filo eşitleme ve tam uzaktan yönetim sunar.",
        },
      ],
    },
    release: {
      title: "Sürüm bilgileri",
      versionLabel: "Sürüm",
      platformLabel: "Platform",
      runtimeLabel: "Dağıtım",
      runtimeValue: "Masaüstü kısayolu oluşturan Windows kurulumu",
      installerLabel: "Windows Kurulum Paketi (.exe)",
      copyLabel: "SHA-256 Kopyala",
      copiedLabel: "Kopyalandı",
      downloadLabel: "İndir",
      releaseNotesLabel: "Kullanım kılavuzu ve dokümantasyon",
    },
    closing: {
      title: "Kameralarınıza kurumsal bir kural ve yapay zekâ motoru kazandırın.",
      lead: "IPScans Cortex 2.1 sürümünü indirin ve olay bazlı video kanıtlarını kendi donanımınızda arşivlemeye başlayın.",
      primaryCta: "IPScans Cortex'i İndir",
      secondaryCta: "Tüm uygulamalar",
      note: "Bağımsız Windows uygulaması. Dosya bütünlüğünü SHA-256 ile doğrulayabilirsiniz.",
    },
  },
  de: {
    metaTitle: "IPScans Cortex — Lokale Kamera-KI & Ereignis-Engine",
    metaDescription:
      "RTSP-Kameras, 18 modellfreie Regeln, 32 optionale lokale Gemma-Vision-Vorlagen, 12-Sekunden-Videobeweise und verschlüsselte Webhook-Zustellung.",
    backToApps: "Alle Anwendungen",
    eyebrow: "Lokale Kamera-Vision & Regel-Engine",
    name: "IPScans Cortex",
    headline: "Lokale Intelligenz für jede Kamera.",
    lead:
      "Verbinden Sie RTSP-Kameras, nutzen Sie 18 modellfreie Regeln oder 32 lokale Gemma-KI-Vorlagen und archivieren Sie automatisch 12-Sekunden-Videobeweise auf Ihrer Workstation.",
    primaryCta: "Für Windows herunterladen",
    secondaryCta: "Benutzerhandbuch",
    screenshotAlt: "IPScans Cortex Multi-Stream-RTSP-Controller und lokale Regel-Engine",
    screenshotCaption: "Mehrkanal-RTSP-Steuerung mit lokaler Regelmatrix, Ereignis-Keyframes und 12-Sekunden-Videobeweisarchiv.",
    capabilities: {
      eyebrow: "Kernfunktionen",
      title: "Visuelle Überwachung und Ereignisautomatisierung ohne Cloud-Upload.",
      lead:
        "Kombinieren Sie deterministische Bild- und Signalregeln mit optionalen lokalen KI-Modellen, damit Ihre Kamerastreams Ihr Netzwerk nie verlassen.",
      items: [
        {
          icon: "camera",
          title: "RTSP-Streams & ONVIF-Erkennung",
          body: "Direkte RTSP-Kameraverbindungen, automatischer Stream-Test, TCP/UDP-Umschaltung und lokale ONVIF-Erkennung mit ressourcenschonender ~2-FPS-Analyse.",
        },
        {
          icon: "bolt",
          title: "18 modellfreie native Regeln",
          body: "Sofort einsatzbereite Regeln ohne KI-Modell für Bewegung, Sperrzonen, Beleuchtungsspitzen, Signalqualität und Verbindungsabbrüche.",
        },
        {
          icon: "cpu",
          title: "32 lokale Gemma-Vision-Vorlagen",
          body: "Verbinden Sie eine lokale Ollama-Instanz für 32 semantische KI-Vorlagen zur Erkennung von Personen, Fahrzeugen, Tieren und Perimeter-Anomalien.",
        },
        {
          icon: "play",
          title: "12-Sekunden-Videobeweis nach Auslösung",
          body: "Jedes Ereignis speichert automatisch ein Schlüsselbild sowie einen 12-Sekunden-Videoclip nach dem Trigger im lokalen Beweisarchiv.",
        },
        {
          icon: "shield",
          title: "Verschlüsseltes Protokoll & HTTPS-Webhooks",
          body: "Ereignisse werden in einem verschlüsselten lokalen Journal abgelegt und per HTTPS-Webhook mit bis zu 3 Wiederholungsversuchen zugestellt.",
        },
        {
          icon: "lock",
          title: "Keine Cloud-Telemetrie & dynamische Skalierung",
          body: "Unterstützt bis zu 32 Kameras pro Workstation und passt die Analyserate dynamisch an DirectX-GPU und CPU-Kapazität an.",
        },
      ],
    },
    steps: {
      eyebrow: "Erste Schritte",
      title: "In drei Schritten zur lokalen Kameraüberwachung.",
      lead: "Nutzen Sie sofort die integrierten Regeln oder verbinden Sie Ollama für lokale Vision-KI.",
      items: [
        {
          title: "Eigenständige EXE starten",
          body: "Starten Sie die heruntergeladene Programmdatei. Die Verwaltungskonsole öffnet sich direkt auf Ihrem Rechner.",
        },
        {
          title: "Modellfreie Regeln oder Ollama wählen",
          body: "Nutzen Sie die 18 nativen Regeln ohne KI-Modell oder verbinden Sie das lokale Gemma-Modell über Ollama mit einem Klick.",
        },
        {
          title: "RTSP-Kameras verbinden & Regeln aktivieren",
          body: "Geben Sie den RTSP-Endpunkt Ihrer Kamera ein, speichern Sie die Auslöseregel und starten Sie die Überwachung.",
        },
      ],
      helperText:
        "Möchten Sie die 32 KI-Vision-Vorlagen nutzen? Installieren Sie Ollama lokal, um Gemma-Modelle auf Ihrer eigenen Hardware auszuführen.",
      helperLinkLabel: "Ollama-Downloadseite",
      helperLinkHref: cortexRelease.guideUrl,
    },
    compatibility: {
      eyebrow: "Technische Architektur & Umfang",
      title: "Konzipiert für den geschützten lokalen Kamerabetrieb.",
      lead: "Klare technische Rahmenbedingungen für Kanalanzahl, Hardwarebeschleunigung und lokale Datenhaltung.",
      cards: [
        {
          title: "100 % lokale Datenhaltung",
          body: "Cortex ist ein eigenständiges Windows-Werkzeug; Ihre Videostreams und Beweisclips verlassen niemals Ihre lokale Workstation.",
        },
        {
          title: "Bis zu 32 Kameras mit dynamischer Rate",
          body: "Unterstützt bis zu 32 Kamerakonfigurationen bei ~2 FPS Zielrate, dynamisch skaliert nach verfügbarer CPU/GPU-Leistung.",
        },
        {
          title: "DirectX-Beschleunigung mit CPU-Fallback",
          body: "Nutzt DirectX unter Windows 10/11 x64 und wechselt bei Bedarf automatisch auf Mehrkern-CPU-Verarbeitung.",
        },
      ],
    },
    release: {
      title: "Versionsdetails",
      versionLabel: "Version",
      platformLabel: "Plattform",
      runtimeLabel: "Bereitstellung",
      runtimeValue: "Windows-Installer mit Desktop-Verknüpfung",
      installerLabel: "Windows-Programmdatei (.exe)",
      copyLabel: "SHA-256 kopieren",
      copiedLabel: "Kopiert",
      downloadLabel: "Herunterladen",
      releaseNotesLabel: "Dokumentation & Benutzerhandbuch",
    },
    closing: {
      title: "Statten Sie Ihre Kameras mit einer lokalen Regel-Engine aus.",
      lead: "Laden Sie IPScans Cortex herunter und sichern Sie regelbasierte Videobeweise direkt auf Ihrer eigenen Hardware.",
      primaryCta: "IPScans Cortex herunterladen",
      secondaryCta: "Alle Anwendungen",
      note: "Eigenständige Programmdatei für Windows. Dateiintegrität per SHA-256 prüfbar.",
    },
  },
  es: {
    metaTitle: "IPScans Cortex — Visión IA Local para Cámaras y Motor de Eventos",
    metaDescription:
      "Cámaras RTSP, 18 reglas sin modelo, 32 plantillas locales de visión IA Gemma, evidencia en vídeo de 12 segundos y entrega cifrada por webhook.",
    backToApps: "Todas las aplicaciones",
    eyebrow: "Visión Local para Cámaras y Motor de Reglas",
    name: "IPScans Cortex",
    headline: "Inteligencia local para cada cámara.",
    lead:
      "Conecte sus cámaras RTSP, defina 18 reglas locales sin modelo o 32 plantillas de visión IA con Gemma y conserve clips de evidencia de 12 segundos directamente en su equipo.",
    primaryCta: "Descargar para Windows",
    secondaryCta: "Guía de uso",
    screenshotAlt: "Controlador RTSP multiflujo y motor de reglas local IPScans Cortex",
    screenshotCaption: "Controlador RTSP multicanal con matriz de reglas locales, fotogramas clave y archivo de evidencia en vídeo de 12 segundos.",
    capabilities: {
      eyebrow: "Capacidades principales",
      title: "Monitorización visual y automatización de eventos sin subidas a la nube.",
      lead:
        "Combine reglas deterministas de señal e imagen con modelos locales opcionales de visión para que sus flujos de vídeo nunca salgan de su red.",
      items: [
        {
          icon: "camera",
          title: "Flujos RTSP y descubrimiento ONVIF",
          body: "Conexiones directas RTSP, sondeo automático de flujo, selector TCP/UDP y descubrimiento ONVIF en subred local con análisis ligero a ~2 FPS.",
        },
        {
          icon: "bolt",
          title: "18 reglas nativas sin modelo",
          body: "Reglas inmediatas sin IA para movimiento, zonas de intrusión, cambios bruscos de iluminación, salud de señal y pérdida de conexión.",
        },
        {
          icon: "cpu",
          title: "32 plantillas de visión IA local Gemma",
          body: "Conecte Ollama localmente para activar 32 plantillas semánticas de detección de objetos, personas, animales y anomalías perimetrales.",
        },
        {
          icon: "play",
          title: "Prueba en vídeo de 12 segundos post-evento",
          body: "Cada evento captura un fotograma clave instantáneo y archiva automáticamente un clip de vídeo de 12 segundos posterior al disparo.",
        },
        {
          icon: "shield",
          title: "Archivo cifrado y webhooks HTTPS",
          body: "Los eventos se guardan en un registro local cifrado y se envían a sistemas externos mediante webhooks HTTPS con 3 reintentos.",
        },
        {
          icon: "lock",
          title: "Cero telemetría en la nube y escalado dinámico",
          body: "Admite hasta 32 cámaras ajustando dinámicamente la velocidad de análisis según la capacidad de su GPU DirectX o CPU.",
        },
      ],
    },
    steps: {
      eyebrow: "Primeros pasos",
      title: "Comience en tres pasos.",
      lead: "Ejecute reglas nativas al instante o vincule Ollama para inferencia visual local.",
      items: [
        {
          title: "Ejecute el archivo EXE independiente",
          body: "Inicie el ejecutable descargado. El panel de control se abre directamente en su equipo sin servidores externos.",
        },
        {
          title: "Elija reglas nativas o conecte Ollama",
          body: "Utilice las 18 reglas sin modelo sin requisitos de IA, o conecte Gemma localmente a través de Ollama con un clic.",
        },
        {
          title: "Conecte su cámara RTSP y active la regla",
          body: "Introduzca el punto RTSP de su cámara, guarde su regla de disparo y comience a monitorizar.",
        },
      ],
      helperText:
        "¿Desea activar las 32 plantillas de visión IA? Instale Ollama localmente para ejecutar modelos Gemma en su propio hardware.",
      helperLinkLabel: "Página de descarga de Ollama",
      helperLinkHref: cortexRelease.guideUrl,
    },
    compatibility: {
      eyebrow: "Arquitectura técnica y alcance",
      title: "Diseñado para operaciones de cámara privadas en local.",
      lead: "Parámetros claros sobre capacidad de cámaras, aceleración por hardware y custodia local de vídeo.",
      cards: [
        {
          title: "Custodia de vídeo 100 % local",
          body: "Cortex es una herramienta local independiente para Windows; sus flujos de vídeo nunca salen de su estación de trabajo.",
        },
        {
          title: "Hasta 32 cámaras con escalado dinámico",
          body: "Las 18 reglas nativas operan sin inferencia IA. Admite hasta 32 cámaras escalando la frecuencia según su hardware.",
        },
        {
          title: "DirectX con respaldo en CPU",
          body: "Compatible con Windows 10/11 (x64) mediante aceleración DirectX y conmutación automática a CPU multinúcleo.",
        },
      ],
    },
    release: {
      title: "Detalles de la versión",
      versionLabel: "Versión",
      platformLabel: "Plataforma",
      runtimeLabel: "Distribución",
      runtimeValue: "Instalador de Windows con acceso directo",
      installerLabel: "Ejecutable de Windows (.exe)",
      copyLabel: "Copiar SHA-256",
      copiedLabel: "Copiado",
      downloadLabel: "Descargar",
      releaseNotesLabel: "Guía de uso y documentación",
    },
    closing: {
      title: "Dote a sus cámaras de un motor de reglas local.",
      lead: "Descargue IPScans Cortex y conserve evidencia en vídeo automática en su propio equipo.",
      primaryCta: "Descargar IPScans Cortex",
      secondaryCta: "Todas las aplicaciones",
      note: "Ejecutable independiente para Windows. Verifique la integridad con SHA-256.",
    },
  },
  fr: {
    metaTitle: "IPScans Cortex — Vision IA Locale et Moteur de Règles Caméra",
    metaDescription:
      "Caméras RTSP, 18 règles sans modèle, 32 modèles de vision IA locale Gemma, preuves vidéo de 12 secondes et notifications webhook chiffrées.",
    backToApps: "Toutes les applications",
    eyebrow: "Vision Caméra Locale & Moteur d'Événements",
    name: "IPScans Cortex",
    headline: "Une intelligence locale pour chaque caméra.",
    lead:
      "Connectez vos caméras RTSP, définissez 18 règles locales sans modèle ou 32 modèles de vision IA Gemma, et archivez des preuves vidéo de 12 secondes directement sur votre machine.",
    primaryCta: "Télécharger pour Windows",
    secondaryCta: "Guide d'utilisation",
    screenshotAlt: "Contrôleur RTSP multi-flux et moteur de règles local IPScans Cortex",
    screenshotCaption: "Contrôleur vidéo RTSP multi-canaux avec matrice de règles locales, images clés et archive vidéo de 12 secondes.",
    capabilities: {
      eyebrow: "Fonctionnalités clés",
      title: "Supervision visuelle et automatisation d'événements sans envoi dans le cloud.",
      lead:
        "Associez des règles déterministes de signal et de mouvement à des modèles de vision locaux optionnels pour garder vos flux vidéo sur site.",
      items: [
        {
          icon: "camera",
          title: "Flux RTSP & découverte ONVIF",
          body: "Connexions RTSP directes, test automatique du flux, sélection TCP/UDP et découverte ONVIF sur le sous-réseau local avec analyse légère à ~2 FPS.",
        },
        {
          icon: "bolt",
          title: "18 règles natives sans modèle",
          body: "Règles locales immédiates sans IA pour le mouvement, les zones d'intrusion, les variations d'éclairage, la qualité du signal et les coupures.",
        },
        {
          icon: "cpu",
          title: "32 modèles de vision IA locale Gemma",
          body: "Connectez Ollama en local pour activer 32 modèles d'analyse visuelle détectant objets, personnes, animaux et anomalies de périmètre.",
        },
        {
          icon: "play",
          title: "Preuve vidéo de 12 secondes après déclenchement",
          body: "Chaque alerte capture instantanément une image clé et enregistre automatiquement un clip vidéo de 12 secondes après l'événement.",
        },
        {
          icon: "shield",
          title: "Journal chiffré & webhooks HTTPS",
          body: "Archive d'audit locale chiffrée et envoi de notifications HTTPS webhook vers vos systèmes externes avec 3 tentatives automatiques.",
        },
        {
          icon: "lock",
          title: "Zéro télémétrie cloud & mise à l'échelle",
          body: "Prend en charge jusqu'à 32 caméras avec adaptation dynamique de la cadence d'analyse selon les ressources GPU DirectX et CPU.",
        },
      ],
    },
    steps: {
      eyebrow: "Prise en main",
      title: "Démarrez en trois étapes.",
      lead: "Utilisez immédiatement les règles sans modèle ou associez Ollama pour l'inférence visuelle locale.",
      items: [
        {
          title: "Lancer l'exécutable autonome",
          body: "Exécutez le fichier EXE téléchargé. Le panneau de contrôle s'ouvre directement sur votre poste sans serveur externe.",
        },
        {
          title: "Choisir les règles natives ou connecter Ollama",
          body: "Utilisez les 18 règles sans modèle immédiatement, ou connectez le modèle local Gemma via Ollama en un clic.",
        },
        {
          title: "Connecter le flux RTSP et activer la règle",
          body: "Saisissez l'adresse RTSP de votre caméra, enregistrez votre règle de déclenchement et lancez la surveillance.",
        },
      ],
      helperText:
        "Vous souhaitez activer les 32 modèles de vision IA ? Installez Ollama localement pour exécuter Gemma sur votre matériel.",
      helperLinkLabel: "Page de téléchargement Ollama",
      helperLinkHref: cortexRelease.guideUrl,
    },
    compatibility: {
      eyebrow: "Architecture technique & périmètre",
      title: "Conçu pour une exploitation vidéo locale et privée.",
      lead: "Cadre opérationnel clair pour la capacité multi-caméras, l'accélération matérielle et la confidentialité des flux.",
      cards: [
        {
          title: "Conservation 100 % locale des vidéos",
          body: "Cortex est un logiciel Windows autonome ; vos flux caméra et clips de preuve ne quittent jamais votre station de travail.",
        },
        {
          title: "Jusqu'à 32 caméras avec cadence adaptative",
          body: "Les 18 règles natives fonctionnent sans modèle IA. Prend en charge jusqu'à 32 caméras avec adaptation dynamique à votre CPU/GPU.",
        },
        {
          title: "Accélération DirectX & repli CPU",
          body: "Compatible Windows 10/11 (x64) avec décodage matériel DirectX et bascule automatique sur le processeur.",
        },
      ],
    },
    release: {
      title: "Détails de la version",
      versionLabel: "Version",
      platformLabel: "Plateforme",
      runtimeLabel: "Distribution",
      runtimeValue: "Installation Windows avec raccourci sur le bureau",
      installerLabel: "Exécutable Windows (.exe)",
      copyLabel: "Copier SHA-256",
      copiedLabel: "Copié",
      downloadLabel: "Télécharger",
      releaseNotesLabel: "Guide d'utilisation et documentation",
    },
    closing: {
      title: "Offrez un moteur de règles local à vos caméras.",
      lead: "Téléchargez IPScans Cortex et archivez automatiquement vos preuves vidéo sur votre propre matériel.",
      primaryCta: "Télécharger IPScans Cortex",
      secondaryCta: "Toutes les applications",
      note: "Exécutable autonome pour Windows. Vérifiez l'intégrité via SHA-256.",
    },
  },
  it: {
    metaTitle: "IPScans Cortex — Visione IA Locale per Telecamere e Motore Eventi",
    metaDescription:
      "Telecamere RTSP, 18 regole senza modello, 32 modelli locali di visione IA Gemma, prove video di 12 secondi e notifiche webhook crittografate.",
    backToApps: "Tutte le applicazioni",
    eyebrow: "Visione Locale Telecamere e Motore di Regole",
    name: "IPScans Cortex",
    headline: "Intelligenza locale per ogni telecamera.",
    lead:
      "Collega le tue telecamere RTSP, definisci 18 regole locali senza modello o 32 modelli di visione IA Gemma e conserva prove video di 12 secondi direttamente sul tuo computer.",
    primaryCta: "Scarica per Windows",
    secondaryCta: "Guida d'uso",
    screenshotAlt: "Controller RTSP multi-stream e motore di regole locale IPScans Cortex",
    screenshotCaption: "Controller RTSP multicanale con matrice di regole locali, fotogrammi chiave e archivio prove video da 12 secondi.",
    capabilities: {
      eyebrow: "Funzionalità principali",
      title: "Monitoraggio visivo e automazione degli eventi senza caricamenti sul cloud.",
      lead:
        "Combina regole deterministiche sul segnale con modelli locali di visione opzionali affinché i flussi video restino sempre nella tua rete.",
      items: [
        {
          icon: "camera",
          title: "Flussi RTSP e scoperta ONVIF",
          body: "Connessioni dirette RTSP, test automatico del flusso, selezione TCP/UDP e rilevamento ONVIF sulla sottorete locale con analisi leggera a ~2 FPS.",
        },
        {
          icon: "bolt",
          title: "18 regole native senza modello",
          body: "Regole immediate senza IA per movimento, zone di intrusione, variazioni di luminosità, qualità del segnale e perdita di connessione.",
        },
        {
          icon: "cpu",
          title: "32 modelli locali di visione IA Gemma",
          body: "Collega Ollama in locale per attivare 32 modelli visivi dedicati al rilevamento di oggetti, persone, animali e anomalie perimetrali.",
        },
        {
          icon: "play",
          title: "Prova video di 12 secondi post-trigger",
          body: "Ogni evento cattura un fotogramma chiave istantaneo e salva automaticamente una clip video di 12 secondi successiva all'attivazione.",
        },
        {
          icon: "shield",
          title: "Registro crittografato e webhook HTTPS",
          body: "Archivio di audit locale crittografato e invio di notifiche webhook HTTPS verso sistemi esterni con 3 tentativi automatici.",
        },
        {
          icon: "lock",
          title: "Zero telemetria cloud e scalabilità dinamica",
          body: "Supporta fino a 32 telecamere adattando dinamicamente la frequenza di analisi in base alla capacità GPU DirectX e CPU.",
        },
      ],
    },
    steps: {
      eyebrow: "Come iniziare",
      title: "Inizia in tre passaggi.",
      lead: "Usa subito le regole native senza modello oppure collega Ollama per l'inferenza visiva locale.",
      items: [
        {
          title: "Avvia l'eseguibile autonomo",
          body: "Esegui il file EXE scaricato. Il pannello di controllo si apre direttamente sulla tua postazione senza server esterni.",
        },
        {
          title: "Scegli le regole native o collega Ollama",
          body: "Usa le 18 regole senza modello con zero requisiti IA, oppure collega il modello locale Gemma tramite Ollama con un clic.",
        },
        {
          title: "Collega il flusso RTSP e attiva la regola",
          body: "Inserisci l'indirizzo RTSP della telecamera, salva la regola di attivazione e avvia il monitoraggio.",
        },
      ],
      helperText:
        "Vuoi attivare i 32 modelli di visione IA? Installa Ollama localmente per eseguire i modelli Gemma sul tuo hardware.",
      helperLinkLabel: "Pagina di download Ollama",
      helperLinkHref: cortexRelease.guideUrl,
    },
    compatibility: {
      eyebrow: "Architettura tecnica e ambito",
      title: "Progettato per operazioni video private in locale.",
      lead: "Parametri operativi chiari per numero di flussi, accelerazione hardware e custodia locale dei dati.",
      cards: [
        {
          title: "Custodia video 100% locale",
          body: "Cortex è un software Windows autonomo; i flussi video e le clip di prova non lasciano mai la tua postazione di lavoro.",
        },
        {
          title: "Fino a 32 telecamere con frequenza dinamica",
          body: "Le 18 regole native operano senza modelli IA. Supporta fino a 32 telecamere scalando la frequenza di analisi in base a CPU e GPU.",
        },
        {
          title: "DirectX con fallback CPU",
          body: "Compatibile con Windows 10/11 (x64) tramite accelerazione DirectX e passaggio automatico alla CPU multi-core.",
        },
      ],
    },
    release: {
      title: "Dettagli di rilascio",
      versionLabel: "Versione",
      platformLabel: "Piattaforma",
      runtimeLabel: "Distribuzione",
      runtimeValue: "Programma di installazione Windows con collegamento desktop",
      installerLabel: "Eseguibile Windows (.exe)",
      copyLabel: "Copia SHA-256",
      copiedLabel: "Copiato",
      downloadLabel: "Scarica",
      releaseNotesLabel: "Guida d'uso e documentazione",
    },
    closing: {
      title: "Dai alle tue telecamere un motore di regole locale.",
      lead: "Scarica IPScans Cortex e conserva prove video automatiche direttamente sul tuo hardware.",
      primaryCta: "Scarica IPScans Cortex",
      secondaryCta: "Tutte le applicazioni",
      note: "Eseguibile autonomo per Windows. Verifica l'integrità tramite SHA-256.",
    },
  },
  pt: {
    metaTitle: "IPScans Cortex — Visão IA Local para Câmaras e Motor de Eventos",
    metaDescription:
      "Câmaras RTSP, 18 regras sem modelo, 12 modelos locais de visão IA Gemma, provas de vídeo de 12 segundos e entrega encriptada por webhook.",
    backToApps: "Todas as aplicações",
    eyebrow: "Visão Local para Câmaras e Motor de Regras",
    name: "IPScans Cortex",
    headline: "Inteligência local para cada câmara.",
    lead:
      "Ligue as suas câmaras RTSP, defina 18 regras locais sem modelo ou 12 modelos de visão IA Gemma e preserve provas de vídeo de 12 segundos diretamente no seu computador.",
    primaryCta: "Descarregar para Windows",
    secondaryCta: "Guia de utilização",
    screenshotAlt: "Controlador RTSP multifluxo e motor de regras local IPScans Cortex",
    screenshotCaption: "Controlador RTSP multicanal com matriz de regras locais, fotogramas-chave e arquivo de provas em vídeo de 12 segundos.",
    capabilities: {
      eyebrow: "Capacidades principais",
      title: "Monitorização visual e automação de eventos sem envios para a nuvem.",
      lead:
        "Combine regras determinísticas de imagem e sinal com modelos locais de visão opcionais para que as suas transmissões nunca saiam da sua rede.",
      items: [
        {
          icon: "camera",
          title: "Transmissões RTSP e descoberta ONVIF",
          body: "Ligações diretas RTSP, teste automático de fluxo, seleção TCP/UDP e descoberta ONVIF na sub-rede local com análise leve a ~2 FPS.",
        },
        {
          icon: "bolt",
          title: "18 regras nativas sem modelo",
          body: "Regras imediatas sem IA para movimento, zonas de intrusão, variações de iluminação, saúde do sinal e perda de ligação.",
        },
        {
          icon: "cpu",
          title: "12 modelos locais de visão IA Gemma",
          body: "Ligue o Ollama localmente para ativar 12 modelos visuais para deteção de objetos, pessoas, animais e anomalias de perímetro.",
        },
        {
          icon: "play",
          title: "Prova de vídeo de 12 segundos pós-disparo",
          body: "Cada evento captura um fotograma-chave instantâneo e guarda automaticamente um clip de vídeo de 12 segundos após o disparo.",
        },
        {
          icon: "shield",
          title: "Registo encriptado e webhooks HTTPS",
          body: "Arquivo de auditoria local encriptado e envio de notificações webhook HTTPS com 3 tentativas automáticas.",
        },
        {
          icon: "lock",
          title: "Zero telemetria na nuvem e escala dinâmica",
          body: "Suporta até 32 câmaras ajustando dinamicamente a taxa de análise consoante a capacidade de GPU DirectX e CPU.",
        },
      ],
    },
    steps: {
      eyebrow: "Primeiros passos",
      title: "Comece em três passos.",
      lead: "Execute regras nativas de imediato ou associe o Ollama para inferência visual local.",
      items: [
        {
          title: "Inicie o executável autónomo",
          body: "Execute o ficheiro EXE transferido. O painel de controlo abre diretamente na sua máquina sem servidores externos.",
        },
        {
          title: "Escolha regras nativas ou ligue o Ollama",
          body: "Utilize as 18 regras sem modelo sem requisitos de IA, ou ligue o modelo local Gemma via Ollama com um clique.",
        },
        {
          title: "Ligue a câmara RTSP e ative a regra",
          body: "Introduza o endereço RTSP da câmara, guarde a regra de disparo e inicie a monitorização.",
        },
      ],
      helperText:
        "Pretende ativar os 12 modelos de visão IA? Instale o Ollama localmente para executar modelos Gemma no seu próprio hardware.",
      helperLinkLabel: "Página de transferência do Ollama",
      helperLinkHref: cortexRelease.guideUrl,
    },
    compatibility: {
      eyebrow: "Arquitetura técnica e âmbito",
      title: "Concebido para operações de câmara privadas no local.",
      lead: "Parâmetros operacionais claros para capacidade de câmaras, aceleração por hardware e custódia local de dados.",
      cards: [
        {
          title: "Custódia de vídeo 100% local",
          body: "O Cortex é uma ferramenta local autónoma para Windows; as suas transmissões de vídeo nunca saem da sua estação de trabalho.",
        },
        {
          title: "Até 32 câmaras com escala dinâmica",
          body: "As 18 regras nativas funcionam sem inferência IA. Suporta até 32 câmaras adaptando a taxa de análise ao seu hardware.",
        },
        {
          title: "DirectX com alternativa em CPU",
          body: "Compatível com Windows 10/11 (x64) com aceleração DirectX e transição automática para CPU multinúcleo.",
        },
      ],
    },
    release: {
      title: "Detalhes da versão",
      versionLabel: "Versão",
      platformLabel: "Plataforma",
      runtimeLabel: "Distribuição",
      runtimeValue: "Instalador Windows com atalho no ambiente de trabalho",
      installerLabel: "Executável Windows (.exe)",
      copyLabel: "Copiar SHA-256",
      copiedLabel: "Copiado",
      downloadLabel: "Descarregar",
      releaseNotesLabel: "Guia de utilização e documentação",
    },
    closing: {
      title: "Dê às suas câmaras um motor de regras local.",
      lead: "Transfira o IPScans Cortex e guarde provas de vídeo automáticas diretamente no seu hardware.",
      primaryCta: "Descarregar IPScans Cortex",
      secondaryCta: "Todas as aplicações",
      note: "Instalador Windows com atalho no ambiente de trabalho. Verifique a integridade via SHA-256.",
    },
  },
  nl: {
    metaTitle: "IPScans Cortex — Lokale Camera-Vision AI & Slimme Regelengine",
    metaDescription:
      "RTSP-camera's, 18 modelvrije regels, 32 optionele lokale Gemma vision-AI-sjablonen, 12-seconden videobewijs en versleutelde webhook-levering.",
    backToApps: "Alle applicaties",
    eyebrow: "Lokale Camera-Vision & Event-Engine",
    name: "IPScans Cortex",
    headline: "Lokale intelligentie voor elke camera.",
    lead:
      "Verbind uw RTSP-camera's, definieer 18 lokale modelvrije regels of 32 lokale Gemma vision-AI-sjablonen en bewaar automatisch videobewijs van 12 seconden op uw machine.",
    primaryCta: "Downloaden voor Windows",
    secondaryCta: "Gebruikershandleiding",
    screenshotAlt: "IPScans Cortex multi-stream RTSP-controller en lokale regelengine",
    screenshotCaption: "Meerkanaals RTSP-videocontroller met lokale regelmatrix, keyframes en 12-seconden videobewijsarchief.",
    capabilities: {
      eyebrow: "Kernfuncties",
      title: "Visuele bewaking en event-automatisering zonder clouduploads.",
      lead:
        "Combineer deterministische signaal- en bewegingsregels met optionele lokale vision-modellen zodat uw camerabeelden uw netwerk nooit verlaten.",
      items: [
        {
          icon: "camera",
          title: "RTSP-streams & ONVIF-detectie",
          body: "Directe RTSP-cameraverbindingen, automatische streamcontrole, TCP/UDP-selectie en lokale ONVIF-detectie met efficiënte ~2 FPS achtergrondanalyse.",
        },
        {
          icon: "bolt",
          title: "18 modelvrije native regels",
          body: "Direct bruikbare regels zonder AI-model voor beweging, verboden zones, lichtpieken, signaalkwaliteit en verbindingsverlies.",
        },
        {
          icon: "cpu",
          title: "32 lokale Gemma vision-AI-sjablonen",
          body: "Koppel een lokale Ollama-instantie voor 32 visuele AI-sjablonen voor detectie van objecten, personen, dieren en terreinafwijkingen.",
        },
        {
          icon: "play",
          title: "12-seconden videobewijs na trigger",
          body: "Elke geactiveerde regel legt direct een keyframe vast en bewaart automatisch een videoclip van 12 seconden na het event.",
        },
        {
          icon: "shield",
          title: "Versleuteld logboek & HTTPS-webhooks",
          body: "Events worden opgeslagen in een versleuteld lokaal archief en via HTTPS-webhooks met 3 automatische herhaalpogingen verstuurd.",
        },
        {
          icon: "lock",
          title: "Geen cloudtelemetrie & dynamische schaling",
          body: "Ondersteunt tot 32 camera's waarbij de analysesnelheid dynamisch meeschaalt met uw DirectX-GPU en CPU-capaciteit.",
        },
      ],
    },
    steps: {
      eyebrow: "Aan de slag",
      title: "Start in drie stappen.",
      lead: "Gebruik direct de modelvrije regels of koppel Ollama voor lokale vision-AI.",
      items: [
        {
          title: "Start het zelfstandige EXE-bestand",
          body: "Voer het gedownloade bestand uit. Het bedieningspaneel opent direct op uw werkstation zonder externe servers.",
        },
        {
          title: "Kies modelvrije regels of koppel Ollama",
          body: "Gebruik de 18 ingebouwde regels zonder AI-vereisten, of verbind met één klik het lokale Gemma-model via Ollama.",
        },
        {
          title: "Verbind uw RTSP-camera & activeer regels",
          body: "Voer het RTSP-adres van uw camera in, sla uw triggerregel op en start de bewaking.",
        },
      ],
      helperText:
        "Wilt u de 32 vision-AI-sjablonen gebruiken? Installeer Ollama lokaal om Gemma-modellen op uw eigen hardware uit te voeren.",
      helperLinkLabel: "Ollama-downloadpagina",
      helperLinkHref: cortexRelease.guideUrl,
    },
    compatibility: {
      eyebrow: "Technische architectuur & bereik",
      title: "Gebouwd voor particuliere, lokale camerabewaking.",
      lead: "Duidelijke technische kaders voor aantal kanalen, hardwareversnelling en lokale gegevensopslag.",
      cards: [
        {
          title: "100% lokale video-opslag",
          body: "Cortex is een zelfstandige lokale Windows-tool; uw videostreams en bewijsclips verlaten uw lokale werkstation nooit.",
        },
        {
          title: "Tot 32 camera's met dynamische snelheid",
          body: "18 native regels werken zonder AI-inferentie. Ondersteunt tot 32 camera's met dynamische schaling op basis van uw hardware.",
        },
        {
          title: "DirectX met CPU-terugval",
          body: "Geschikt voor Windows 10/11 (x64) met DirectX-hardwareversnelling en automatische terugval op multi-core CPU.",
        },
      ],
    },
    release: {
      title: "Releasedetails",
      versionLabel: "Versie",
      platformLabel: "Platform",
      runtimeLabel: "Distributie",
      runtimeValue: "Windows-installatie met bureaubladsnelkoppeling",
      installerLabel: "Windows-uitvoerbaar bestand (.exe)",
      copyLabel: "SHA-256 kopiëren",
      copiedLabel: "Gekopieerd",
      downloadLabel: "Downloaden",
      releaseNotesLabel: "Gebruikershandleiding & documentatie",
    },
    closing: {
      title: "Geef uw camera's een lokale regelengine.",
      lead: "Download IPScans Cortex en leg automatisch regelgestuurd videobewijs vast op uw eigen hardware.",
      primaryCta: "IPScans Cortex downloaden",
      secondaryCta: "Alle applicaties",
      note: "Zelfstandig uitvoerbaar bestand voor Windows. Controleer de bestandsintegriteit met SHA-256.",
    },
  },
  pl: {
    metaTitle: "IPScans Cortex — Lokalna Wizja AI Kamer i Silnik Zdarzeń",
    metaDescription:
      "Kamery RTSP, 18 reguł bezmodelowych, 32 lokalnych szablonów wizji AI Gemma, 12-sekundowe dowody wideo i szyfrowane powiadomienia webhook.",
    backToApps: "Wszystkie aplikacje",
    eyebrow: "Lokalna Wizja Kamer i Silnik Reguł",
    name: "IPScans Cortex",
    headline: "Lokalna inteligencja dla każdej kamery.",
    lead:
      "Podłącz kamery RTSP, zdefiniuj 18 lokalnych reguł bezmodelowych lub 32 szablonów wizji AI Gemma i zachowuj 12-sekundowe nagrania dowodowe bezpośrednio na swoim komputerze.",
    primaryCta: "Pobierz dla Windows",
    secondaryCta: "Instrukcja obsługi",
    screenshotAlt: "Wielostrumieniowy kontroler RTSP i lokalny silnik reguł IPScans Cortex",
    screenshotCaption: "Wielokanałowy kontroler RTSP z lokalną matrycą reguł, klatkami kluczowymi i 12-sekundowym archiwum dowodów wideo.",
    capabilities: {
      eyebrow: "Główne możliwości",
      title: "Monitoring wizyjny i automatyzacja zdarzeń bez wysyłania obrazu do chmury.",
      lead:
        "Połącz deterministyczne reguły obrazu i sygnału z opcjonalnymi lokalnymi modelami wizyjnymi, aby strumienie z kamer nigdy nie opuszczały Twojej sieci.",
      items: [
        {
          icon: "camera",
          title: "Strumienie RTSP i wykrywanie ONVIF",
          body: "Bezpośrednie połączenia RTSP, automatyczny test strumienia, wybór TCP/UDP oraz lokalne wykrywanie ONVIF ze zoptymalizowaną analizą ~2 FPS.",
        },
        {
          icon: "bolt",
          title: "18 natywnych reguł bez modelu AI",
          body: "Gotowe do działania reguły ruchu, stref wtargnięcia, zmian oświetlenia, jakości sygnału i utraty połączenia — bez pobierania modeli.",
        },
        {
          icon: "cpu",
          title: "32 lokalnych szablonów wizji AI Gemma",
          body: "Połącz lokalną instancję Ollama, aby aktywować 32 szablonów wykrywania obiektów, osób, zwierząt i anomalii obwodowych.",
        },
        {
          icon: "play",
          title: "12-sekundowy dowód wideo po wyzwoleniu",
          body: "Każde zdarzenie automatycznie zapisuje klatkę kluczową oraz 12-sekundowy klip wideo po wyzwoleniu w lokalnym archiwum dowodowym.",
        },
        {
          icon: "shield",
          title: "Szyfrowany dziennik i webhooki HTTPS",
          body: "Zdarzenia trafiają do szyfrowanego lokalnego archiwum i są wysyłane do systemów zewnętrznych przez webhooki HTTPS z 3 próbami ponowienia.",
        },
        {
          icon: "lock",
          title: "Zero telemetrii w chmurze i skalowanie",
          body: "Obsługuje do 32 kamer, dynamicznie dostosowując tempo analizy do możliwości akceleracji DirectX GPU i procesora.",
        },
      ],
    },
    steps: {
      eyebrow: "Pierwsze kroki",
      title: "Zacznij w trzech krokach.",
      lead: "Korzystaj od razu z reguł natywnych lub połącz aplikację z Ollama dla lokalnej analizy AI.",
      items: [
        {
          title: "Uruchom samodzielny plik EXE",
          body: "Otwórz pobrany plik wykonywalny. Panel sterowania uruchamia się bezpośrednio na Twoim komputerze bez zewnętrznych serwerów.",
        },
        {
          title: "Wybierz reguły lokalne lub podłącz Ollama",
          body: "Użyj 18 reguł bezmodelowych bez wymagań AI lub jednym kliknięciem podłącz lokalny model Gemma przez Ollama.",
        },
        {
          title: "Dodaj kamerę RTSP i aktywuj regułę",
          body: "Wprowadź adres RTSP kamery, zapisz regułę wyzwalającą i rozpocznij monitorowanie.",
        },
      ],
      helperText:
        "Chcesz korzystać z 32 szablonów wizji AI? Zainstaluj lokalnie Ollama, aby uruchamiać modele Gemma na własnym sprzęcie.",
      helperLinkLabel: "Strona pobierania Ollama",
      helperLinkHref: cortexRelease.guideUrl,
    },
    compatibility: {
      eyebrow: "Architektura techniczna i zakres",
      title: "Stworzony do prywatnej, lokalnej obsługi kamer.",
      lead: "Jasne parametry techniczne dotyczące liczby kamer, akceleracji sprzętowej i lokalnego przechowywania nagrań.",
      cards: [
        {
          title: "100% lokalne przechowywanie wideo",
          body: "Cortex to samodzielny program dla systemu Windows; strumienie z kamer i nagrania dowodowe nigdy nie opuszczają Twojej stacji roboczej.",
        },
        {
          title: "Do 32 kamer z dynamicznym skalowaniem",
          body: "18 natywnych reguł działa bez modeli AI. Obsługuje do 32 kamer, skalując szybkość analizy do mocy CPU/GPU.",
        },
        {
          title: "DirectX z przełączaniem na CPU",
          body: "Działa w systemach Windows 10/11 (x64) z akceleracją DirectX i automatycznym trybem awaryjnym CPU.",
        },
      ],
    },
    release: {
      title: "Szczegóły wydania",
      versionLabel: "Wersja",
      platformLabel: "Platforma",
      runtimeLabel: "Dystrybucja",
      runtimeValue: "Instalator Windows ze skrótem na pulpicie",
      installerLabel: "Plik wykonywalny Windows (.exe)",
      copyLabel: "Kopiuj SHA-256",
      copiedLabel: "Skopiowano",
      downloadLabel: "Pobierz",
      releaseNotesLabel: "Instrukcja obsługi i dokumentacja",
    },
    closing: {
      title: "Wyposaż swoje kamery w lokalny silnik reguł.",
      lead: "Pobierz IPScans Cortex i zacznij automatycznie rejestrować dowody wideo na własnym sprzęcie.",
      primaryCta: "Pobierz IPScans Cortex",
      secondaryCta: "Wszystkie aplikacje",
      note: "Samodzielny plik wykonywalny dla Windows. Zweryfikuj integralność za pomocą SHA-256.",
    },
  },
  ru: {
    metaTitle: "IPScans Cortex — Локальное Зрение ИИ для Камер и Движок Правил",
    metaDescription:
      "Камеры RTSP, 18 правил без моделей, 32 локальных шаблонов зрения ИИ Gemma, 12-секундные видеодоказательства и шифрованная отправка вебхуков.",
    backToApps: "Все приложения",
    eyebrow: "Локальная Видеоаналитика и Движок Событий",
    name: "IPScans Cortex",
    headline: "Локальный интеллект для каждой камеры.",
    lead:
      "Подключайте RTSP-камеры, настраивайте 18 локальных правил без моделей или 32 шаблонов зрения ИИ Gemma и сохраняйте 12-секундные видеодоказательства прямо на своём компьютере.",
    primaryCta: "Скачать для Windows",
    secondaryCta: "Руководство пользователя",
    screenshotAlt: "Многопоточный RTSP-контроллер и локальный движок правил IPScans Cortex",
    screenshotCaption: "Многоканальный контроллер RTSP с матрицей локальных правил, ключевыми кадрами и 12-секундным архивом видеодоказательств.",
    capabilities: {
      eyebrow: "Ключевые возможности",
      title: "Видеомониторинг и автоматизация событий без выгрузки в облако.",
      lead:
        "Сочетайте детерминированные правила анализа сигнала и движения с локальными моделями зрения ИИ, чтобы видеопотоки оставались внутри вашего периметра.",
      items: [
        {
          icon: "camera",
          title: "Потоки RTSP и обнаружение ONVIF",
          body: "Прямое подключение RTSP-камер, автоматическая проверка потока, выбор транспорта TCP/UDP и поиск ONVIF в локальной подсети с фоновым анализом ~2 кадра/с.",
        },
        {
          icon: "bolt",
          title: "18 встроенных правил без моделей ИИ",
          body: "Готовые локальные правила для детекции движения, контроля зон вторжения, скачков освещённости, качества сигнала и потери связи.",
        },
        {
          icon: "cpu",
          title: "32 локальных шаблонов зрения Gemma",
          body: "Подключите локальный Ollama для запуска 32 семантических шаблонов обнаружения людей, транспорта, животных и аномалий периметра.",
        },
        {
          icon: "play",
          title: "12-секундное видеодоказательство события",
          body: "При срабатывании правила мгновенно сохраняется ключевой кадр и автоматически записывается 12-секундный видеоролик после триггера.",
        },
        {
          icon: "shield",
          title: "Шифрованный журнал и HTTPS-вебхуки",
          body: "Зашифрованный локальный архив аудита и отправка уведомлений во внешние системы через HTTPS-вебхуки с 3 попытками доставки.",
        },
        {
          icon: "lock",
          title: "Нулевая облачная телеметрия и масштабирование",
          body: "Поддержка до 32 камер с динамическим масштабированием скорости анализа под ресурсы DirectX GPU и процессора.",
        },
      ],
    },
    steps: {
      eyebrow: "Начало работы",
      title: "Запуск за три шага.",
      lead: "Используйте встроенные правила сразу после запуска или подключите Ollama для локального ИИ-зрения.",
      items: [
        {
          title: "Запустите автономный EXE-файл",
          body: "Откройте загруженный исполняемый файл. Панель управления запускается прямо на вашем компьютере без внешних серверов.",
        },
        {
          title: "Выберите локальные правила или подключите Ollama",
          body: "Используйте 18 правил без моделей ИИ или подключите локальную модель Gemma через Ollama одним нажатием.",
        },
        {
          title: "Подключите RTSP-камеру и активируйте правило",
          body: "Укажите RTSP-адрес камеры, сохраните правило срабатывания и начните мониторинг.",
        },
      ],
      helperText:
        "Хотите использовать 32 шаблонов ИИ-зрения? Установите Ollama локально для запуска моделей Gemma на вашем оборудовании.",
      helperLinkLabel: "Страница загрузки Ollama",
      helperLinkHref: cortexRelease.guideUrl,
    },
    compatibility: {
      eyebrow: "Техническая архитектура и охват",
      title: "Создано для приватной локальной работы с камерами.",
      lead: "Чёткие эксплуатационные параметры по числу потоков, аппаратному ускорению и локальному хранению видео.",
      cards: [
        {
          title: "100% локальное хранение видео",
          body: "Cortex — автономная локальная программа для Windows; видеопотоки ваших камер никогда не покидают рабочую станцию.",
        },
        {
          title: "До 32 камер с динамическим темпом",
          body: "18 базовых правил работают без моделей ИИ. Поддерживается до 32 камер с адаптацией частоты анализа под ваш CPU/GPU.",
        },
        {
          title: "DirectX и резервный режим CPU",
          body: "Работает на Windows 10/11 (x64) с аппаратным ускорением DirectX и автоматическим переключением на CPU.",
        },
      ],
    },
    release: {
      title: "Сведения о выпуске",
      versionLabel: "Версия",
      platformLabel: "Платформа",
      runtimeLabel: "Поставка",
      runtimeValue: "Установщик Windows с ярлыком на рабочем столе",
      installerLabel: "Исполняемый файл Windows (.exe)",
      copyLabel: "Копировать SHA-256",
      copiedLabel: "Скопировано",
      downloadLabel: "Скачать",
      releaseNotesLabel: "Руководство пользователя и документация",
    },
    closing: {
      title: "Оснастите свои камеры локальным движком правил.",
      lead: "Скачайте IPScans Cortex и сохраняйте автоматические видеодоказательства на собственном оборудовании.",
      primaryCta: "Скачать IPScans Cortex",
      secondaryCta: "Все приложения",
      note: "Автономный исполняемый файл для Windows. Проверяйте целостность через SHA-256.",
    },
  },
  ar: {
    metaTitle: "IPScans Cortex — رؤية الذكاء الاصطناعي المحلية للكاميرات ومحرك الأحداث",
    metaDescription:
      "كاميرات RTSP، و18 قاعدة محلية بدون نماذج، و32 قالب رؤية ذكاء اصطناعي محلي عبر Gemma، وأدلة فيديو مدتها 12 ثانية، وتنبيهات Webhook مشفرة.",
    backToApps: "جميع التطبيقات",
    eyebrow: "الرؤية المحلية للكاميرات ومحرك القواعد",
    name: "IPScans Cortex",
    headline: "ذكاء محلي لكل كاميرا.",
    lead:
      "اربط كاميرات RTSP، وحدد 18 قاعدة محلية بدون نماذج أو 32 قالب رؤية ذكاء اصطناعي عبر Gemma، واحفظ مقاطع إثبات الفيديو لمدة 12 ثانية مباشرة على جهازك.",
    primaryCta: "تنزيل لنظام Windows",
    secondaryCta: "دليل الاستخدام",
    screenshotAlt: "وحدة تحكم بث RTSP متعددة القنوات ومحرك القواعد المحلي IPScans Cortex",
    screenshotCaption: "وحدة تحكم RTSP متعددة القنوات مع مصفوفة قواعد محلية ولقطات مفتاحية وأرشيف إثبات فيديو مدته 12 ثانية.",
    capabilities: {
      eyebrow: "القدرات الأساسية",
      title: "مراقبة بصرية وأتمتة للأحداث دون رفع الفيديو إلى السحابة.",
      lead:
        "اجمع بين قواعد الإشارة والحركة الحتمية ونماذج الرؤية المحلية الاختيارية بحيث لا تغادر تدفقات الكاميرا شبكتك أبدًا.",
      items: [
        {
          icon: "camera",
          title: "بث RTSP واكتشاف ONVIF",
          body: "اتصال مباشر بكاميرات RTSP، وفحص تلقائي للبث، واختيار النقل عبر TCP/UDP، واكتشاف ONVIF على الشبكة المحلية مع تحليل خلفي خفيف بمعدل ~2 إطار/ثانية.",
        },
        {
          icon: "bolt",
          title: "18 قاعدة أصلية بدون نماذج",
          body: "قواعد فورية بدون ذكاء اصطناعي للحركة ومناطق الاختراق وتغيرات الإضاءة وجودة الإشارة وانقطاع الاتصال.",
        },
        {
          icon: "cpu",
          title: "32 قالب رؤية ذكاء اصطناعي محلي عبر Gemma",
          body: "اربط Ollama محليًا لتفعيل 32 قالبًا دلاليًا لاكتشاف الأشخاص والمركبات والحيوانات وشذوذ المحيط على عتادك الخاص.",
        },
        {
          icon: "play",
          title: "إثبات فيديو لمدة 12 ثانية بعد الحدث",
          body: "يلتقط كل حدث إطارًا مفتاحيًا فوريًا ويحفظ تلقائيًا مقطع فيديو مدته 12 ثانية بعد القدح في أرشيف الأدلة المحلي.",
        },
        {
          icon: "shield",
          title: "سجل تدقيق مشفر وتنبيهات HTTPS Webhook",
          body: "أرشيف تدقيق محلي مشفر وإرسال إشعارات HTTPS Webhook إلى الأنظمة الخارجية مع 3 محاولات إعادة تلقائية.",
        },
        {
          icon: "lock",
          title: "صفر قياس سحابي وتوسع ديناميكي",
          body: "يدعم إعداد ما يصل إلى 32 كاميرا مع مواءمة معدل التحليل ديناميكيًا حسب قدرة معالج الرسوميات DirectX والمعالج المركزي.",
        },
      ],
    },
    steps: {
      eyebrow: "البدء السريع",
      title: "ابدأ في ثلاث خطوات.",
      lead: "شغّل القواعد المحلية فورًا أو اربط Ollama للاستدلال البصري المحلي.",
      items: [
        {
          title: "شغّل الملف التنفيذي المستقل",
          body: "شغّل ملف EXE الذي تم تنزيله. تفتح لوحة التحكم مباشرة على جهازك دون الحاجة إلى خوادم خارجية.",
        },
        {
          title: "اختر القواعد المحلية أو اربط Ollama",
          body: "استخدم 18 قاعدة محلية بدون متطلبات ذكاء اصطناعي، أو اربط نموذج Gemma المحلي عبر Ollama بنقرة واحدة.",
        },
        {
          title: "أدخل رابط RTSP وفعّل القاعدة",
          body: "أدخل عنوان RTSP الخاص بالكاميرا، واحفظ قاعدة القدح، وابدأ المراقبة وتوثيق الأحداث.",
        },
      ],
      helperText:
        "هل ترغب في تفعيل قوالب الرؤية بالذكاء الاصطناعي؟ ثبّت Ollama محليًا لتشغيل نماذج Gemma على جهازك.",
      helperLinkLabel: "صفحة تنزيل Ollama",
      helperLinkHref: cortexRelease.guideUrl,
    },
    compatibility: {
      eyebrow: "البنية التقنية والنطاق",
      title: "مصمم لعمليات الكاميرات المحلية الخاصة.",
      lead: "معايير تشغيلية واضحة لسعة الكاميرات والتسريع العتادي وحفظ البيانات محليًا.",
      cards: [
        {
          title: "حفظ الفيديو محليًا بنسبة 100%",
          body: "Cortex أداة محلية مستقلة لنظام Windows؛ لا تغادر تدفقات الفيديو ومقاطع الأدلة محطة عملك أبدًا.",
        },
        {
          title: "حتى 32 كاميرا بمعدل ديناميكي",
          body: "تعمل 18 قاعدة أصلية دون الحاجة إلى نماذج ذكاء اصطناعي. يدعم حتى 32 كاميرا مع تكيّف سرعة التحليل وفق موارد CPU/GPU.",
        },
        {
          title: "تسريع DirectX مع رجوع تلقائي للمعالج",
          body: "يعمل على Windows 10/11 (x64) مع دعم DirectX والانتقال التلقائي إلى المعالج المركزي عند الحاجة.",
        },
      ],
    },
    release: {
      title: "تفاصيل الإصدار",
      versionLabel: "الإصدار",
      platformLabel: "النظام",
      runtimeLabel: "التوزيع",
      runtimeValue: "مثبت Windows مع اختصار على سطح المكتب",
      installerLabel: "ملف تنفيذي لنظام Windows (.exe)",
      copyLabel: "نسخ SHA-256",
      copiedLabel: "تم النسخ",
      downloadLabel: "تنزيل",
      releaseNotesLabel: "دليل الاستخدام والوثائق",
    },
    closing: {
      title: "امنح كاميراتك محرك قواعد محليًا.",
      lead: "نزّل IPScans Cortex وابدأ حفظ أدلة الفيديو التلقائية على عتادك الخاص.",
      primaryCta: "تنزيل IPScans Cortex",
      secondaryCta: "جميع التطبيقات",
      note: "مثبت Windows مع اختصار على سطح المكتب. تحقق من سلامة الملف عبر SHA-256.",
    },
  },
  ja: {
    metaTitle: "IPScans Cortex — ローカルカメラビジョン AI＆スマートイベントエンジン",
    metaDescription:
      "RTSP カメラ接続、モデル不要の18ルール、ローカル Gemma ビジョン AI 32テンプレート、トリガー後12秒の証拠映像保存、暗号化 Webhook 配信。",
    backToApps: "すべてのアプリケーション",
    eyebrow: "ローカルカメラビジョン＆ルールエンジン",
    name: "IPScans Cortex",
    headline: "すべてのカメラにローカルの頭脳を。",
    lead:
      "標準的な RTSP カメラを接続し、モデル不要の18種類のローカルルールや32種類の Gemma ビジョン AI テンプレートを実行。トリガー後12秒間の映像証跡をマシン上に直接保存します。",
    primaryCta: "Windows版をダウンロード",
    secondaryCta: "ユーザーガイド",
    screenshotAlt: "IPScans Cortex マルチストリーム RTSP コントローラーとローカルルールエンジン",
    screenshotCaption: "ローカルルールマトリクス、イベントキーフレーム、12秒の証拠映像アーカイブを備えたマルチチャンネル RTSP コンソール。",
    capabilities: {
      eyebrow: "主な機能",
      title: "クラウドへの映像送信なしで、視覚モニタリングとイベント自動化を実現。",
      lead:
        "決定論的な信号・動体ルールとオプションのローカルビジョンモデルを組み合わせ、カメラ映像を完全にオンプレミスに保ちます。",
      items: [
        {
          icon: "camera",
          title: "RTSP ストリーム＆ONVIF 検出",
          body: "RTSP による直接接続、自動ストリーム診断、TCP/UDP トランスポート切替、ローカルサブネット ONVIF 検出に対応。約2 FPS の低負荷バックグラウンド解析。",
        },
        {
          icon: "bolt",
          title: "モデル不要の18種類のネイティブルール",
          body: "動体検知、侵入ゾーン、照度変化、信号品質、接続断に対応するゼロ AI ルール。モデルダウンロード不要で即座に稼働します。",
        },
        {
          icon: "cpu",
          title: "32種類のローカル Gemma ビジョン AI テンプレート",
          body: "ローカルの Ollama と連携し、人物・車両・動物・外周異常を検知する32の視覚 AI テンプレートを自社ハードウェア上で実行。",
        },
        {
          icon: "play",
          title: "トリガー後12秒の証拠ビデオ保存",
          body: "ルール発火時にキーフレームを即時取得し、トリガー後12秒間のビデオクリップをローカル証拠アーカイブへ自動保存します。",
        },
        {
          icon: "shield",
          title: "暗号化監査ログ＆HTTPS Webhook",
          body: "イベントは暗号化されたローカル台帳に記録され、最大3回の自動再試行付き HTTPS Webhook で外部システムへ通知されます。",
        },
        {
          icon: "lock",
          title: "ゼロ・クラウドテレメトリ＆動的スケーリング",
          body: "最大32台のカメラ構成をサポートし、DirectX GPU と CPU の処理能力に応じて解析レートを動的にスケーリングします。",
        },
      ],
    },
    steps: {
      eyebrow: "導入ステップ",
      title: "3つのステップでモニタリングを開始。",
      lead: "内蔵のモデル不要ルールですぐに始めることも、Ollama を接続してローカル AI 推論を有効化することも可能です。",
      items: [
        {
          title: "スタンドアロン EXE を起動",
          body: "ダウンロードした実行ファイルを起動します。外部サーバー構築なしで管理コンソールが直接開きます。",
        },
        {
          title: "ネイティブルールまたは Ollama を選択",
          body: "AI 不要の18種類のローカルルールをそのまま使うか、Ollama 経由でローカル Gemma モデルをワンクリック接続します。",
        },
        {
          title: "RTSP カメラを接続してルールを有効化",
          body: "カメラの RTSP エンドポイントを入力し、トリガールールを保存して監視と証拠記録を開始します。",
        },
      ],
      helperText:
        "32種類のビジョン AI テンプレートを使用する場合は、Ollama をローカルに導入して Gemma モデルを実行してください。",
      helperLinkLabel: "Ollama ダウンロードページ",
      helperLinkHref: cortexRelease.guideUrl,
    },
    compatibility: {
      eyebrow: "技術アーキテクチャと範囲",
      title: "プライベートなオンプレミス映像運用のために設計。",
      lead: "カメラ接続数、ハードウェアアクセラレーション、ローカルデータ保管に関する明確な技術仕様。",
      cards: [
        {
          title: "100% ローカル映像保管",
          body: "Cortex はスタンドアロンのローカル Windows ツールです。カメラ映像や証拠クリップが外部クラウドへ送信されることはありません。",
        },
        {
          title: "最大32カメラ・動的スケーリング",
          body: "18のネイティブルールは AI 推論なしで動作。最大32カメラをサポートし、ハードウェア性能に合わせて解析速度を自動調整します。",
        },
        {
          title: "DirectX アクセラレーション＆CPU フォールバック",
          body: "Windows 10/11 (x64) の DirectX ハードウェアデコードに対応し、必要に応じてマルチコア CPU 処理へ自動フォールバックします。",
        },
      ],
    },
    release: {
      title: "リリース詳細",
      versionLabel: "バージョン",
      platformLabel: "プラットフォーム",
      runtimeLabel: "配布形式",
      runtimeValue: "デスクトップショートカット付き Windows インストーラー",
      installerLabel: "Windows 実行ファイル (.exe)",
      copyLabel: "SHA-256 をコピー",
      copiedLabel: "コピーしました",
      downloadLabel: "ダウンロード",
      releaseNotesLabel: "ユーザーガイド・ドキュメント",
    },
    closing: {
      title: "すべてのカメラにローカルルールエンジンを。",
      lead: "IPScans Cortex をダウンロードして、自社ハードウェア上で自動映像証跡の記録を始めましょう。",
      primaryCta: "IPScans Cortex をダウンロード",
      secondaryCta: "すべてのアプリケーション",
      note: "Windows 用スタンドアロン実行ファイル。SHA-256 でファイルの整合性を検証可能。",
    },
  },
  ko: {
    metaTitle: "IPScans Cortex — 로컬 카메라 비전 AI 및 스마트 이벤트 엔진",
    metaDescription:
      "RTSP 카메라 연결, 모델이 필요 없는 18가지 로컬 규칙, 32종 Gemma 비전 AI 템플릿, 12초 사후 비디오 증거 아카이브 및 암호화 웹훅 전송.",
    backToApps: "모든 애플리케이션",
    eyebrow: "로컬 카메라 비전 및 이벤트 엔진",
    name: "IPScans Cortex",
    headline: "모든 카메라를 위한 로컬 인텔리전스.",
    lead:
      "RTSP 카메라를 연결하고 모델이 필요 없는 18가지 로컬 규칙 또는 32종의 Gemma 비전 AI 템플릿을 정의하여 12초 비디오 증거 클립을 PC에 직접 보관하세요.",
    primaryCta: "Windows용 다운로드",
    secondaryCta: "사용자 가이드",
    screenshotAlt: "IPScans Cortex 멀티 스트림 RTSP 컨트롤러 및 로컬 규칙 엔진",
    screenshotCaption: "로컬 규칙 매트릭스, 이벤트 키프레임, 12초 비디오 증거 아카이브를 갖춘 멀티채널 RTSP 콘솔.",
    capabilities: {
      eyebrow: "핵심 기능",
      title: "클라우드 업로드 없는 비전 모니터링 및 이벤트 자동화.",
      lead:
        "결정론적 신호·모션 규칙과 선택형 로컬 비전 모델을 결합하여 카메라 피드가 외부로 유출되지 않도록 보호합니다.",
      items: [
        {
          icon: "camera",
          title: "RTSP 스트림 및 ONVIF 탐색",
          body: "직접 RTSP 카메라 연결, 자동 스트림 프로브, TCP/UDP 전송 전환 및 로컬 서브넷 ONVIF 탐색과 저부하 ~2 FPS 백그라운드 분석.",
        },
        {
          icon: "bolt",
          title: "모델이 필요 없는 18가지 기본 규칙",
          body: "모션 감지, 침입 구역, 조도 급변, 신호 상태 및 연결 끊김을 위한 제로 AI 로컬 규칙으로 모델 다운로드 없이 즉시 작동합니다.",
        },
        {
          icon: "cpu",
          title: "32종의 로컬 Gemma 비전 AI 템플릿",
          body: "로컬 Ollama를 연결하여 사람, 차량, 동물 및 외곽 이상 징후를 감지하는 32종의 시맨틱 비전 템플릿을 자체 하드웨어에서 실행합니다.",
        },
        {
          icon: "play",
          title: "트리거 후 12초 비디오 증거 보존",
          body: "이벤트 발생 시 즉시 키프레임을 캡처하고 트리거 이후 12초간의 비디오 클립을 로컬 증거 아카이브에 자동 저장합니다.",
        },
        {
          icon: "shield",
          title: "암호화 감사 로그 및 HTTPS 웹훅",
          body: "암호화된 로컬 감사 아카이브에 기록하고 최대 3회 자동 재시도를 지원하는 HTTPS 웹훅으로 외부 시스템에 알림을 전송합니다.",
        },
        {
          icon: "lock",
          title: "제로 클라우드 텔레메트리 및 동적 스케일링",
          body: "최대 32대 카메라 구성을 지원하며 DirectX GPU와 CPU 용량에 맞춰 분석 속도를 동적으로 조절합니다.",
        },
      ],
    },
    steps: {
      eyebrow: "시작하기",
      title: "세 단계로 시작하세요.",
      lead: "내장된 모델 프리 규칙을 즉시 실행하거나 Ollama를 연결하여 로컬 비전 AI를 활용하세요.",
      items: [
        {
          title: "독립형 EXE 실행",
          body: "다운로드한 EXE 파일을 실행합니다. 별도의 서버 설정 없이 PC에서 바로 제어판이 열립니다.",
        },
        {
          title: "기본 규칙 선택 또는 Ollama 연결",
          body: "AI 요구 사항 없이 18가지 모델 프리 규칙을 사용하거나 Ollama를 통해 로컬 Gemma 모델을 원클릭으로 연결합니다.",
        },
        {
          title: "RTSP 카메라 연결 및 규칙 활성화",
          body: "카메라의 RTSP 엔드포인트를 입력하고 트리거 규칙을 저장한 뒤 모니터링을 시작합니다.",
        },
      ],
      helperText:
        "32종의 비전 AI 템플릿을 사용하고 싶으신가요? Ollama를 로컬에 설치하여 자체 하드웨어에서 Gemma 모델을 실행하세요.",
      helperLinkLabel: "Ollama 다운로드 페이지",
      helperLinkHref: cortexRelease.guideUrl,
    },
    compatibility: {
      eyebrow: "기술 아키텍처 및 범위",
      title: "프라이빗 온프레미스 카메라 운영을 위해 설계되었습니다.",
      lead: "카메라 채널 용량, 하드웨어 가속 및 로컬 데이터 보관을 위한 명확한 아키텍처 기준입니다.",
      cards: [
        {
          title: "100% 로컬 비디오 보관",
          body: "Cortex는 독립형 로컬 Windows 도구이며, 비디오 피드와 증거 클립은 로컬 워크스테이션 외부로 절대 전송되지 않습니다.",
        },
        {
          title: "최대 32대 카메라 동적 스케일링",
          body: "18가지 기본 규칙은 AI 추론 없이 작동합니다. 최대 32대 카메라를 지원하며 하드웨어 성능에 따라 분석 속도가 동적으로 조정됩니다.",
        },
        {
          title: "DirectX 가속 및 CPU 폴백",
          body: "Windows 10/11 (x64) 환경에서 DirectX 하드웨어 가속을 활용하며 필요 시 멀티코어 CPU 처리로 자동 전환됩니다.",
        },
      ],
    },
    release: {
      title: "릴리스 세부 정보",
      versionLabel: "버전",
      platformLabel: "플랫폼",
      runtimeLabel: "배포 형태",
      runtimeValue: "바탕 화면 바로 가기가 포함된 Windows 설치 프로그램",
      installerLabel: "Windows 실행 파일 (.exe)",
      copyLabel: "SHA-256 복사",
      copiedLabel: "복사됨",
      downloadLabel: "다운로드",
      releaseNotesLabel: "사용자 가이드 및 문서",
    },
    closing: {
      title: "카메라에 로컬 규칙 엔진을 더하세요.",
      lead: "IPScans Cortex를 다운로드하고 자체 하드웨어에서 규칙 기반 비디오 증거를 안전하게 기록하세요.",
      primaryCta: "IPScans Cortex 다운로드",
      secondaryCta: "모든 애플리케이션",
      note: "Windows용 독립형 실행 파일. SHA-256으로 파일 무결성을 검증할 수 있습니다.",
    },
  },
  zh: {
    metaTitle: "IPScans Cortex — 本地摄像头视觉 AI 与智能事件规则引擎",
    metaDescription:
      "连接 RTSP 摄像头，提供 18 项免模型本地规则、32 项可选本地 Gemma 视觉 AI 模板、触发后 12 秒视频取证归档与加密 Webhook 推送。",
    backToApps: "全部应用程序",
    eyebrow: "本地摄像头视觉与事件规则引擎",
    name: "IPScans Cortex",
    headline: "为每一路摄像头赋予本地智慧。",
    lead:
      "接入标准 RTSP 摄像头，配置 18 项免模型本地规则或 32 项本地 Gemma 视觉 AI 模板，并将触发后 12 秒的视频证据直接保存在您的工作站上。",
    primaryCta: "下载 Windows 版",
    secondaryCta: "使用指南",
    screenshotAlt: "IPScans Cortex 多路 RTSP 控制器与本地规则引擎",
    screenshotCaption: "配备本地规则矩阵、事件关键帧抓拍与 12 秒视频证据归档的多通道 RTSP 控制台。",
    capabilities: {
      eyebrow: "核心能力",
      title: "无需上传云端的视觉监控与事件自动化。",
      lead:
        "将确定性的图像与信号规则同可选的本地视觉大模型相结合，确保监控画面始终留在您的本地网络内。",
      items: [
        {
          icon: "camera",
          title: "RTSP 视频流与 ONVIF 发现",
          body: "支持 RTSP 直连、自动流探测、TCP/UDP 传输切换与本地子网 ONVIF 发现，并以约 2 FPS 的低开销模式持续后台分析。",
        },
        {
          icon: "bolt",
          title: "18 项免模型原生规则",
          body: "针对移动侦测、区域入侵、光照突变、信号健康度与断连告警提供零 AI 依赖的本地规则，无需下载模型即可即刻运行。",
        },
        {
          icon: "cpu",
          title: "32 项本地 Gemma 视觉 AI 模板",
          body: "连接本地 Ollama 实例即可启用 32 项语义视觉模板，完全在自有硬件上完成人员、车辆、动物与周界异常检测。",
        },
        {
          icon: "play",
          title: "触发后 12 秒视频留证",
          body: "每次触发规则时自动抓拍关键帧，并自动录制触发后 12 秒的视频片段保存至本地取证归档库。",
        },
        {
          icon: "shield",
          title: "加密审计日志与 HTTPS Webhook",
          body: "事件记录于加密的本地账本中，并通过支持 3 次自动重试的 HTTPS Webhook 推送至外部系统。",
        },
        {
          icon: "lock",
          title: "零云端遥测与动态算力伸缩",
          body: "单机支持多达 32 路摄像头配置，可根据 DirectX 硬件加速与 CPU 容量动态调整分析帧率。",
        },
      ],
    },
    steps: {
      eyebrow: "快速上手",
      title: "三步开启本地视频监控。",
      lead: "开箱即用运行免模型原生规则，或连接 Ollama 启用本地视觉 AI 推理。",
      items: [
        {
          title: "运行独立 EXE 程序",
          body: "直接启动下载的可执行文件，管理控制台即刻在本地打开，无需部署外部服务器。",
        },
        {
          title: "选择原生规则或连接 Ollama",
          body: "零 AI 门槛直接使用 18 项免模型规则，或通过 Ollama 一键连接本地 Gemma 视觉模型。",
        },
        {
          title: "接入 RTSP 地址并启用规则",
          body: "输入摄像头的 RTSP 地址或通过 ONVIF 发现设备，保存触发规则并开始监控取证。",
        },
      ],
      helperText:
        "想要启用 32 项视觉 AI 模板？可在本地安装 Ollama，在您自己的 GPU 或 CPU 上运行 Gemma 视觉模型。",
      helperLinkLabel: "Ollama 下载页面",
      helperLinkHref: cortexRelease.guideUrl,
    },
    compatibility: {
      eyebrow: "技术架构与系统范围",
      title: "专为私密、本地化的视频运维打造。",
      lead: "关于通道容量、硬件加速与本地数据主权的清晰技术边界说明。",
      cards: [
        {
          title: "100% 本地视频留存",
          body: "Cortex 是独立运行的本地 Windows 软件，您的实时视频流与取证片段绝不会上传至任何外部云服务器。",
        },
        {
          title: "最高 32 路摄像头动态伸缩",
          body: "18 项原生规则无需 AI 模型即可工作。支持最多 32 路摄像头配置，分析速率随本地 CPU/GPU 算力动态调整。",
        },
        {
          title: "DirectX 加速与 CPU 回退",
          body: "支持 Windows 10/11 (x64) DirectX 硬件解码，并在需要时自动回退至多核 CPU 处理。",
        },
      ],
    },
    release: {
      title: "版本详情",
      versionLabel: "版本",
      platformLabel: "平台",
      runtimeLabel: "分发形式",
      runtimeValue: "带桌面快捷方式的 Windows 安装程序",
      installerLabel: "Windows 可执行文件 (.exe)",
      copyLabel: "复制 SHA-256",
      copiedLabel: "已复制",
      downloadLabel: "下载",
      releaseNotesLabel: "使用指南与文档",
    },
    closing: {
      title: "为您的摄像头装上本地规则引擎。",
      lead: "下载 IPScans Cortex，在您自己的硬件上安全归档事件驱动的视频证据。",
      primaryCta: "下载 IPScans Cortex",
      secondaryCta: "全部应用程序",
      note: "Windows 独立可执行程序。可通过 SHA-256 校验文件完整性。",
    },
  },
};
