import type { IconName } from "@/components/ds/Icon";
import type { Locale } from "@/i18n/config";

export type EnterpriseProductCopy = {
  metaTitle: string;
  metaDescription: string;
  backToApps: string;
  eyebrow: string;
  name: string;
  headline: string;
  lead: string;
  primaryCta: string;
  secondaryCta: string;
  screenshotAlt: string;
  screenshotCaption: string;
  capabilities: {
    eyebrow: string;
    title: string;
    lead: string;
    items: { title: string; body: string; icon: IconName }[];
  };
  steps: {
    eyebrow: string;
    title: string;
    lead: string;
    items: { title: string; body: string }[];
    helperText: string;
    helperLinkLabel: string;
    helperLinkHref: string;
  };
  compatibility: {
    eyebrow: string;
    title: string;
    lead: string;
    cards: { title: string; body: string }[];
  };
  release: {
    title: string;
    versionLabel: string;
    platformLabel: string;
    runtimeLabel: string;
    runtimeValue: string;
    installerLabel: string;
    copyLabel: string;
    copiedLabel: string;
    downloadLabel: string;
    releaseNotesLabel: string;
  };
  closing: {
    title: string;
    lead: string;
    primaryCta: string;
    secondaryCta: string;
    note: string;
  };
};

const vcRedistUrl = "https://aka.ms/vs/17/release/vc_redist.x64.exe";

export const lprCopy: Record<Locale, EnterpriseProductCopy> = {
  en: {
    metaTitle: "IPScans LPR Pro — License Plate Recognition & Operator Workspace",
    metaDescription:
      "Local license plate recognition with a 5-page live operator workspace, independent calibration lines, resident vehicle registry, and durable encrypted event delivery.",
    backToApps: "All applications",
    eyebrow: "License Plate Recognition & Gate Operations",
    name: "IPScans LPR Pro",
    headline: "Autonomous plate recognition and live gate operations, locally on your workstation.",
    lead:
      "Local desktop plate recognition, a localhost event review panel, and optional Ollama / Gemma vision assistance. Inspect shared records and evidence, with operator-approved corrections. AI can be disabled in settings.",
    primaryCta: "Download Installer",
    secondaryCta: "Release notes & source",
    screenshotAlt: "IPScans LPR Pro 5-page live operator workspace and camera wall",
    screenshotCaption: "LPR Pro 1.1 light desktop interface. Passage records shown are synthetic demonstration data.",
    capabilities: {
      eyebrow: "Core capabilities",
      title: "Engineered for residential complexes, parking facilities, and controlled gates.",
      lead:
        "Every component—from ONVIF stream ingestion to ONNX character recognition and SQLite audit snapshots—runs locally without external cloud dependencies.",
      items: [
        {
          icon: "monitor",
          title: "Desktop + localhost review panel",
          body: "Desktop live cameras and calibration, plus authenticated browser access to the latest 100 passages, evidence and audited corrections on the same computer.",
        },
        {
          icon: "activity",
          title: "Independent calibration & polygon regions",
          body: "Configure separate trigger and recognition lines, rectangular or polygon zones, direction filters, repeat windows, and delayed plate matching with reasoned correction audit history.",
        },
        {
          icon: "shield",
          title: "Durable encrypted event delivery",
          body: "Encrypted local delivery journal with automatic retries during temporary database locks. Filter passages by registered or unknown status, block, unit, camera, and direction.",
        },
        {
          icon: "camera",
          title: "ONVIF discovery & hardware decode",
          body: "Bounded IPv4 ONVIF media profile discovery, per-camera automatic D3D11 hardware decoding with CPU fallback, and isolated capture worker processes.",
        },
        {
          icon: "cpu",
          title: "Optional local Ollama / Gemma assistant",
          body: "Prepare Ollama and a vision model automatically from Settings. Review stored evidence on demand; AI suggests, operators verify. First preparation needs internet and disk space. Standard ONNX OCR works with AI disabled.",
        },
        {
          icon: "lock",
          title: "DPAPI vault & verified snapshots",
          body: "Camera credentials and delivery journals are bound to the active Windows user account via DPAPI, paired with administrator SQLite integrity backups and a 6-step setup wizard.",
        },
      ],
    },
    steps: {
      eyebrow: "Getting started",
      title: "Deploy your operator console in three steps.",
      lead: "A guided setup wizard walks administrators through credentials, local ONNX models, and first-camera calibration.",
      items: [
        {
          title: "Initialize administrator access",
          body: "Run the self-contained installer. On first launch, create an administrator password of at least 12 characters through the welcome setup wizard.",
        },
        {
          title: "Configure local ONNX recognition models",
          body: "Download the evaluation recognition models (~15 MB) directly inside Settings, or point the engine to your own SHA-256 verified ONNX model manifest.",
        },
        {
          title: "Calibrate camera lines & start live OCR",
          body: "Add an authorized RTSP/ONVIF camera, draw trigger and recognition calibration lines, register resident vehicles, and start live OCR from the dashboard.",
        },
      ],
      helperText:
        "If a QtCore DLL error appears on a clean Windows installation, install the official Microsoft Visual C++ Redistributable and reopen the application.",
      helperLinkLabel: "Microsoft Visual C++ Redistributable",
      helperLinkHref: vcRedistUrl,
    },
    compatibility: {
      eyebrow: "Compatibility & validation scope",
      title: "Hardware validation and operational safety boundaries.",
      lead: "Transparent engineering notes on tested camera streams, controller diagnostics, and default actuation safeguards.",
      cards: [
        {
          title: "ONVIF & D3D11 stream validation",
          body: "IPv4 ONVIF discovery, media profile selection, H.264 main/sub streams, and automatic D3D11 hardware decoding with software fallback have been validated on Mercusys MC510 hardware.",
        },
        {
          title: "Controller & relay inspection",
          body: "Includes read-only Modbus TCP single-coil and Shelly RPC status inspection tools for gate verification. Physical barrier actuation remains disabled by default for operational safety.",
        },
        {
          title: "Self-contained user runtime",
          body: "Installs into the active Windows user profile with no separate Python, Node.js, or external database service required.",
        },
      ],
    },
    release: {
      title: "Release details",
      versionLabel: "Version",
      platformLabel: "Platform",
      runtimeLabel: "Runtime",
      runtimeValue: "Self-contained desktop package",
      installerLabel: "Windows Installer (.exe)",
      copyLabel: "Copy SHA-256",
      copiedLabel: "Copied",
      downloadLabel: "Download",
      releaseNotesLabel: "Release notes & source on GitHub",
    },
    closing: {
      title: "Ready to run local license plate recognition?",
      lead: "Download the self-contained installer and set up your multi-camera operator wall in minutes.",
      primaryCta: "Download IPScans LPR Pro",
      secondaryCta: "All applications",
      note: "Runs locally on your workstation. Verify package integrity anytime with SHA-256.",
    },
  },
  tr: {
    metaTitle: "IPScans LPR Pro — Plaka Tanıma ve Operatör Çalışma Alanı",
    metaDescription:
      "5 bölmeli canlı operatör çalışma alanı, bağımsız kalibrasyon çizgileri, blok/daire araç kütüğü ve şifreli olay kuyruğu ile yerel plaka tanıma.",
    backToApps: "Tüm uygulamalar",
    eyebrow: "Plaka Tanıma ve Bariyer Operasyonları",
    name: "IPScans LPR Pro",
    headline: "İş istasyonunuzda tamamen yerel çalışan otonom plaka tanıma ve canlı geçiş yönetimi.",
    lead:
      "Masaüstünde yerel plaka tanıma, tarayıcıda olay inceleme ve isteğe bağlı Ollama / Gemma desteği. Aynı kayıtları izleyin, görsel kanıtları inceleyin ve operatör onayıyla düzeltin. AI ayarlardan kapatılabilir.",
    primaryCta: "Kurulum Paketini İndir",
    secondaryCta: "Sürüm notları ve kaynak",
    screenshotAlt: "IPScans LPR Pro 5 bölmeli canlı operatör çalışma alanı ve kamera duvarı",
    screenshotCaption: "LPR Pro 1.1 aydınlık masaüstü arayüzü. Görseldeki geçişler tanıtım için oluşturulmuş örnek verilerdir.",
    capabilities: {
      eyebrow: "Temel yetenekler",
      title: "Site yönetimleri, otoparklar ve kontrollü geçiş noktaları için tasarlandı.",
      lead:
        "ONVIF akış yakalamadan ONNX karakter okumaya ve SQLite bütünlük yedeklerine kadar tüm bileşenler bulut bağımlılığı olmadan yerelde çalışır.",
      items: [
        {
          icon: "monitor",
          title: "Masaüstü + yerel tarayıcı paneli",
          body: "Masaüstünde canlı kamera ve kalibrasyon; localhost panelinde hesapla giriş, son 100 geçiş, görsel kanıt ve denetlenen düzeltmeler. Panel yalnızca aynı bilgisayardan erişilir.",
        },
        {
          icon: "activity",
          title: "Bağımsız kalibrasyon ve bölge tanımlama",
          body: "Ayrı tetik ve okuma çizgileri; dikdörtgen ve çokgen bölgeler, yön filtreleri, tekrar pencereleri, gecikmeli plaka eşleştirme ve gerekçeli düzeltme geçmişi.",
        },
        {
          icon: "shield",
          title: "Kesintisiz yerel olay kuyruğu",
          body: "Geçici veritabanı kilitlenmelerinde şifreli yerel teslimat günlüğü ve otomatik yeniden deneme; kayıtlı/yabancı araç, blok, daire ve kamera bazlı filtreleme.",
        },
        {
          icon: "camera",
          title: "ONVIF medya keşfi ve donanım hızlandırma",
          body: "IPv4 ONVIF kamera keşfi, medya profili seçimi, D3D11 otomatik donanım çözme (CPU geri dönüşlü) ve izole kamera yakalama süreçleri.",
        },
        {
          icon: "cpu",
          title: "İsteğe bağlı yerel Ollama / Gemma desteği",
          body: "Ollama ve görsel model ayarlardan otomatik hazırlanır. Kayıtlı kanıt için AI öneri verir, operatör doğrular. İlk hazırlık internet ve disk alanı gerektirir; AI kapalıyken standart ONNX OCR çalışır.",
        },
        {
          icon: "lock",
          title: "DPAPI kasa ve doğrulanmış yedekleme",
          body: "Kamera parolaları ve teslimat günlüğü etkin Windows kullanıcı hesabına DPAPI ile bağlanır. Yöneticiye özel bütünlük doğrulamalı SQLite yedekleme ve 6 adımlı kurulum sihirbazı içerir.",
        },
      ],
    },
    steps: {
      eyebrow: "İlk kullanım",
      title: "Operatör konsolunuzu üç adımda devreye alın.",
      lead: "Adım adım kurulum sihirbazı; yönetici güvenliği, yerel ONNX modelleri ve ilk kamera kalibrasyonunu hızla tamamlamanızı sağlar.",
      items: [
        {
          title: "Yönetici erişimini oluşturun",
          body: "Kurulum dosyasını çalıştırın. İlk açılışta karşılama sihirbazı üzerinden en az 12 karakterli yönetici parolanızı belirleyin.",
        },
        {
          title: "Yerel ONNX modellerini yapılandırın",
          body: "Ayarlar bölümünden yaklaşık 15 MB boyutundaki değerlendirme modelini indirin veya kendi SHA-256 doğrulamalı ONNX model manifestinizi seçin.",
        },
        {
          title: "Kalibrasyon çizgilerini kaydedin ve OCR başlatın",
          body: "Yetkili kameranızı ekleyin, tetik/okuma çizgilerini kaydedin ve araç kaydı oluşturun. Canlı İzleme ekranından OCR başlatıp sonuçları Geçiş Kayıtları bölümünde inceleyin.",
        },
      ],
      helperText:
        "QtCore DLL uyarısı devam ederse Windows için resmi Microsoft Visual C++ paketini yükleyip uygulamayı yeniden açın.",
      helperLinkLabel: "Microsoft Visual C++ Paketi",
      helperLinkHref: vcRedistUrl,
    },
    compatibility: {
      eyebrow: "Uyumluluk ve doğrulama kapsamı",
      title: "Donanım doğrulaması ve operasyonel güvenlik sınırları.",
      lead: "Test edilen kamera akışları, kontrolcü sorgulama araçları ve varsayılan güvenlik sınırları hakkında şeffaf teknik notlar.",
      cards: [
        {
          title: "ONVIF ve D3D11 akış doğrulaması",
          body: "IPv4 ONVIF keşfi, medya profili seçimi, H.264 ana/alt akış ve D3D11 otomatik donanım çözme (CPU geri dönüşlü) Mercusys MC510 üzerinde sınanmıştır.",
        },
        {
          title: "Kontrolcü ve röle durum denetimi",
          body: "Modbus TCP tek bobin okuma ve Shelly RPC durum sorgulama araçları bulunur; fiziksel bariyer tetikleme güvenlik amacıyla varsayılan olarak kapalıdır.",
        },
        {
          title: "Bağımsız yerel çalışma zamanı",
          body: "Etkin kullanıcı hesabına kurulur; ayrıca Python, Node.js veya harici veritabanı kurulumu gerektirmez.",
        },
      ],
    },
    release: {
      title: "Sürüm bilgileri",
      versionLabel: "Sürüm",
      platformLabel: "Platform",
      runtimeLabel: "Çalışma zamanı",
      runtimeValue: "Bağımsız masaüstü paketi",
      installerLabel: "Windows Kurulum Paketi (.exe)",
      copyLabel: "SHA-256 Kopyala",
      copiedLabel: "Kopyalandı",
      downloadLabel: "İndir",
      releaseNotesLabel: "GitHub sürüm notları ve kaynak",
    },
    closing: {
      title: "Yerel plaka tanıma sistemini kurmaya hazır mısınız?",
      lead: "Bağımsız kurulum paketini indirin ve çok kameralı operatör konsolunuzu dakikalar içinde çalıştırın.",
      primaryCta: "IPScans LPR Pro'yu İndir",
      secondaryCta: "Tüm uygulamalar",
      note: "İş istasyonunuzda tamamen yerel çalışır. Paket bütünlüğünü SHA-256 ile doğrulayabilirsiniz.",
    },
  },
  de: {
    metaTitle: "IPScans LPR Pro — Kennzeichenerkennung & Bedienkonsole",
    metaDescription:
      "Lokale Kennzeichenerkennung mit 5-teiliger Live-Bedienkonsole, unabhängigen Kalibrierungslinien, Fahrzeugregister und verschlüsselter Ereigniswarteschlange.",
    backToApps: "Alle Anwendungen",
    eyebrow: "Kennzeichenerkennung & Zufahrtsbetrieb",
    name: "IPScans LPR Pro",
    headline: "Autonome Kennzeichenerkennung und Live-Zufahrtskontrolle direkt auf Ihrer Workstation.",
    lead:
      "Erkennen Sie Kennzeichen lokal, überwachen Sie eine Multikamera-Livewand, kalibrieren Sie Trigger- und Erkennungslinien und verwalten Sie Bewohnerfahrzeuge mit verschlüsselten Durchfahrtsprotokollen.",
    primaryCta: "Installer herunterladen",
    secondaryCta: "Versionshinweise & Quellcode",
    screenshotAlt: "IPScans LPR Pro Live-Bedienkonsole und Kamerawand",
    screenshotCaption: "Fünfteilige Live-Bedienkonsole mit RTSP-Streams in Echtzeit, Kennzeichen-Ausschnitten und Durchfahrtsprüfung.",
    capabilities: {
      eyebrow: "Kernfunktionen",
      title: "Entwickelt für Wohnanlagen, Parkhäuser und kontrollierte Zufahrten.",
      lead:
        "Jede Komponente – von der ONVIF-Stream-Erfassung über die ONNX-Texterkennung bis hin zu SQLite-Backups – arbeitet lokal ohne Cloud-Abhängigkeit.",
      items: [
        {
          icon: "monitor",
          title: "Fünfteilige Live-Bedienkonsole",
          body: "Ansichten für Live-Dashboard, Kameras, Fahrzeuge & Bewohner, Ereignisse und Einstellungen. Verwaltung von Blöcken, Einheiten und Bewohnern inklusive CSV/XLSX-Import und -Export.",
        },
        {
          icon: "activity",
          title: "Unabhängige Kalibrierung & Polygonzonen",
          body: "Separate Trigger- und Erkennungslinien, Rechteck- und Polygonbereiche, Richtungsfilter, Wiederholungsfenster sowie nachvollziehbare Korrekturhistorie.",
        },
        {
          icon: "shield",
          title: "Ausfallsicheres verschlüsseltes Ereignisjournal",
          body: "Verschlüsseltes lokales Zustellprotokoll mit automatischen Wiederholungen bei Datenbanksperren; Filterung nach Status, Block, Einheit, Kamera und Richtung.",
        },
        {
          icon: "camera",
          title: "ONVIF-Erkennung & Hardware-Dekodierung",
          body: "IPv4-ONVIF-Medienprofilerkennung, automatische D3D11-Hardwaredekodierung pro Kamera mit CPU-Fallback und isolierte Aufnahmeprozesse.",
        },
        {
          icon: "cpu",
          title: "Regionale OCR & Zeichen-Konfidenzwerte",
          body: "Verarbeitung von Einzelbildern, MP4/AVI-Videos und Live-RTSP-Streams mit Konfidenzwerten pro Zeichen, Beweisausschnitten und SHA-256-geprüften ONNX-Modellen.",
        },
        {
          icon: "lock",
          title: "DPAPI-Tresor & geprüfte Snapshots",
          body: "Kamerazugangsdaten werden per DPAPI an das aktive Windows-Benutzerkonto gebunden. Enthält SQLite-Integritätssicherungen und einen 6-stufigen Einrichtungsassistenten.",
        },
      ],
    },
    steps: {
      eyebrow: "Erste Schritte",
      title: "Ihre Bedienkonsole in drei Schritten einrichten.",
      lead: "Ein geführter Assistent begleitet Administratoren durch Passwortschutz, lokale ONNX-Modelle und die erste Kamerakalibrierung.",
      items: [
        {
          title: "Administratorzugang einrichten",
          body: "Starten Sie das Installationsprogramm und legen Sie beim ersten Start im Einrichtungsassistenten ein Administratorpasswort mit mindestens 12 Zeichen fest.",
        },
        {
          title: "Lokale ONNX-Modelle laden",
          body: "Laden Sie in den Einstellungen das Evaluierungsmodell (~15 MB) herunter oder wählen Sie Ihr eigenes SHA-256-geprüftes ONNX-Modellmanifest.",
        },
        {
          title: "Kameralinien kalibrieren & OCR starten",
          body: "Fügen Sie eine RTSP/ONVIF-Kamera hinzu, speichern Sie Trigger- und Erkennungslinien, legen Sie einen Fahrzeugeintrag an und starten Sie die Live-OCR.",
        },
      ],
      helperText:
        "Sollte auf einer frischen Windows-Installation ein QtCore-DLL-Hinweis erscheinen, installieren Sie das offizielle Microsoft Visual C++ Paket und starten Sie die App neu.",
      helperLinkLabel: "Microsoft Visual C++ Paket",
      helperLinkHref: vcRedistUrl,
    },
    compatibility: {
      eyebrow: "Kompatibilität & Prüfumfang",
      title: "Hardware-Validierung und betriebliche Sicherheitsgrenzen.",
      lead: "Transparente technische Angaben zu getesteten Kamerastreams, Steuerungsdiagnosen und Sicherheitsvorgaben.",
      cards: [
        {
          title: "ONVIF- & D3D11-Stream-Validierung",
          body: "IPv4-ONVIF-Erkennung, Medienprofilauswahl, H.264-Haupt-/Substreams und automatische D3D11-Hardwaredekodierung wurden auf einer Mercusys MC510 verifiziert.",
        },
        {
          title: "Steuerungs- & Relais-Diagnose",
          body: "Enthält schreibgeschützte Diagnosewerkzeuge für Modbus TCP (Single-Coil) und Shelly RPC. Die physische Schrankenansteuerung ist standardmäßig deaktiviert.",
        },
        {
          title: "Eigenständige Laufzeitumgebung",
          body: "Wird im Benutzerkonto installiert – eine separate Python-, Node.js- oder Datenbankinstallation ist nicht erforderlich.",
        },
      ],
    },
    release: {
      title: "Versionsdetails",
      versionLabel: "Version",
      platformLabel: "Plattform",
      runtimeLabel: "Laufzeitumgebung",
      runtimeValue: "Eigenständiges Desktop-Paket",
      installerLabel: "Windows-Installer (.exe)",
      copyLabel: "SHA-256 kopieren",
      copiedLabel: "Kopiert",
      downloadLabel: "Herunterladen",
      releaseNotesLabel: "Versionshinweise & Quellcode auf GitHub",
    },
    closing: {
      title: "Bereit für lokale Kennzeichenerkennung?",
      lead: "Laden Sie das eigenständige Installationspaket herunter und richten Sie Ihre Multikamera-Bedienwand in wenigen Minuten ein.",
      primaryCta: "IPScans LPR Pro herunterladen",
      secondaryCta: "Alle Anwendungen",
      note: "Läuft vollständig lokal auf Ihrer Workstation. Paketintegrität jederzeit per SHA-256 prüfbar.",
    },
  },
  es: {
    metaTitle: "IPScans LPR Pro — Reconocimiento de Matrículas y Consola de Operador",
    metaDescription:
      "Reconocimiento local de matrículas con espacio de trabajo en vivo de 5 paneles, líneas de calibración independientes, padrón de vehículos y entrega cifrada de eventos.",
    backToApps: "Todas las aplicaciones",
    eyebrow: "Reconocimiento de Matrículas y Control de Accesos",
    name: "IPScans LPR Pro",
    headline: "Reconocimiento autónomo de matrículas y gestión de accesos en vivo, localmente en su equipo.",
    lead:
      "Lea matrículas en local, supervise un muro multicámara en directo, calibre líneas independientes de disparo y lectura, y gestione el padrón de residentes con registros cifrados.",
    primaryCta: "Descargar instalador",
    secondaryCta: "Notas de versión y código",
    screenshotAlt: "Espacio de trabajo de operador de 5 paneles IPScans LPR Pro",
    screenshotCaption: "Consola de operador en cinco paneles con flujos RTSP en tiempo real, recortes de matrícula y auditoría de pasos.",
    capabilities: {
      eyebrow: "Capacidades principales",
      title: "Diseñado para complejos residenciales, estacionamientos y accesos controlados.",
      lead:
        "Cada componente —desde la ingesta ONVIF hasta el OCR en ONNX y las copias SQLite— se ejecuta localmente sin depender de la nube.",
      items: [
        {
          icon: "monitor",
          title: "Espacio de operador en vivo de 5 paneles",
          body: "Panel en vivo, Cámaras, Vehículos y Residentes, Eventos y Ajustes. Registro de bloques, viviendas, residentes y múltiples propietarios con importación/exportación CSV/XLSX.",
        },
        {
          icon: "activity",
          title: "Calibración independiente y zonas poligonales",
          body: "Líneas separadas de disparo y reconocimiento, regiones rectangulares o poligonales, filtros de dirección, ventanas de repetición e historial auditable de correcciones.",
        },
        {
          icon: "shield",
          title: "Cola de eventos cifrada y resistente",
          body: "Diario local cifrado con reintentos automáticos ante bloqueos temporales; filtrado por estado registrado/desconocido, bloque, unidad, cámara y dirección.",
        },
        {
          icon: "camera",
          title: "Descubrimiento ONVIF y decodificación por hardware",
          body: "Descubrimiento de perfiles multimedia ONVIF IPv4, decodificación automática por hardware D3D11 con respaldo en CPU y procesos de captura aislados.",
        },
        {
          icon: "cpu",
          title: "OCR regional y confianza por carácter",
          body: "Procese imágenes fijas, vídeo MP4/AVI y flujos RTSP en vivo con métricas de confianza por carácter, recortes de evidencia y modelos ONNX verificados con SHA-256.",
        },
        {
          icon: "lock",
          title: "Bóveda DPAPI y copias verificadas",
          body: "Las credenciales de cámara se vinculan a la cuenta activa de Windows mediante DPAPI. Incluye copias de integridad SQLite y asistente de configuración de 6 pasos.",
        },
      ],
    },
    steps: {
      eyebrow: "Primeros pasos",
      title: "Despliegue su consola de operador en tres pasos.",
      lead: "Un asistente guiado acompaña al administrador en la creación de credenciales, descarga de modelos ONNX y calibración de cámaras.",
      items: [
        {
          title: "Inicialice el acceso de administrador",
          body: "Ejecute el instalador. En el primer inicio, cree una contraseña de administrador de al menos 12 caracteres mediante el asistente de bienvenida.",
        },
        {
          title: "Configure los modelos ONNX locales",
          body: "Descargue unos 15 MB de modelos de evaluación en Ajustes o seleccione su propio manifiesto de modelo ONNX verificado con SHA-256.",
        },
        {
          title: "Calibre líneas de cámara e inicie el OCR",
          body: "Añada una cámara autorizada, guarde las líneas de disparo y reconocimiento, registre un vehículo e inicie el OCR desde el Panel en vivo.",
        },
      ],
      helperText:
        "Si persiste un aviso de DLL QtCore, instale el paquete oficial Microsoft Visual C++ para Windows y vuelva a abrir la aplicación.",
      helperLinkLabel: "Paquete Microsoft Visual C++",
      helperLinkHref: vcRedistUrl,
    },
    compatibility: {
      eyebrow: "Compatibilidad y alcance de validación",
      title: "Validación de hardware y límites de seguridad operativa.",
      lead: "Notas técnicas transparentes sobre flujos de cámara probados, diagnóstico de controladores y salvaguardas por defecto.",
      cards: [
        {
          title: "Validación de flujos ONVIF y D3D11",
          body: "El descubrimiento ONVIF IPv4, selección de perfil multimedia, flujos H.264 principal/secundario y decodificación D3D11 se han validado en hardware Mercusys MC510.",
        },
        {
          title: "Inspección de controladores y relés",
          body: "Incluye herramientas de solo lectura para Modbus TCP de bobina única y estado Shelly RPC; el accionamiento físico de barreras permanece desactivado por defecto.",
        },
        {
          title: "Tiempo de ejecución autocontenido",
          body: "Se instala en la cuenta del usuario actual sin requerir instalaciones externas de Python, Node.js ni motores de base de datos.",
        },
      ],
    },
    release: {
      title: "Detalles de la versión",
      versionLabel: "Versión",
      platformLabel: "Plataforma",
      runtimeLabel: "Entorno",
      runtimeValue: "Paquete de escritorio autocontenido",
      installerLabel: "Instalador de Windows (.exe)",
      copyLabel: "Copiar SHA-256",
      copiedLabel: "Copiado",
      downloadLabel: "Descargar",
      releaseNotesLabel: "Notas de versión y código en GitHub",
    },
    closing: {
      title: "¿Listo para ejecutar reconocimiento local de matrículas?",
      lead: "Descargue el instalador autocontenido y configure su muro de operador multicámara en minutos.",
      primaryCta: "Descargar IPScans LPR Pro",
      secondaryCta: "Todas las aplicaciones",
      note: "Se ejecuta localmente en su estación de trabajo. Verifique la integridad con SHA-256.",
    },
  },
  fr: {
    metaTitle: "IPScans LPR Pro — Lecture de Plaques et Console Opérateur",
    metaDescription:
      "Reconnaissance locale de plaques d'immatriculation avec espace opérateur en direct à 5 volets, lignes de calibrage indépendantes, registre des véhicules et journal chiffré.",
    backToApps: "Toutes les applications",
    eyebrow: "Reconnaissance de Plaques & Gestion d'Accès",
    name: "IPScans LPR Pro",
    headline: "Lecture autonome de plaques et supervision d'accès en direct, localement sur votre poste.",
    lead:
      "Lisez les plaques en local, supervisez un mur vidéo multi-caméras, calibrez des lignes indépendantes de déclenchement et de lecture, et gérez le registre des véhicules résidents.",
    primaryCta: "Télécharger l'installateur",
    secondaryCta: "Notes de version et code",
    screenshotAlt: "Espace de travail opérateur à 5 volets IPScans LPR Pro",
    screenshotCaption: "Console opérateur en cinq volets avec flux RTSP en direct, découpes de plaques et vérification des passages.",
    capabilities: {
      eyebrow: "Fonctionnalités clés",
      title: "Conçu pour les résidences, parkings et accès contrôlés.",
      lead:
        "Chaque composant — de l'acquisition ONVIF à la reconnaissance ONNX et aux sauvegardes SQLite — fonctionne en local sans dépendance cloud.",
      items: [
        {
          icon: "monitor",
          title: "Espace opérateur en direct à 5 volets",
          body: "Tableau de bord en direct, Caméras, Véhicules et Résidents, Événements et Paramètres. Registre par bâtiment, logement et résident avec import/export CSV/XLSX.",
        },
        {
          icon: "activity",
          title: "Calibrage indépendant et zones polygonales",
          body: "Lignes de déclenchement et de lecture distinctes, zones rectangulaires ou polygonales, filtres de direction, fenêtres anti-répétition et historique de correction motivé.",
        },
        {
          icon: "shield",
          title: "File d'événements chiffrée et résiliente",
          body: "Journal local chiffré avec nouvelles tentatives automatiques en cas de verrouillage temporaire ; filtrage par statut, bâtiment, logement, caméra et sens.",
        },
        {
          icon: "camera",
          title: "Découverte ONVIF et décodage matériel",
          body: "Découverte bornée des profils média ONVIF IPv4, décodage matériel D3D11 automatique avec repli CPU et processus de capture isolés.",
        },
        {
          icon: "cpu",
          title: "OCR régional et confiance par caractère",
          body: "Traitement d'images fixes, vidéos MP4/AVI et flux RTSP en direct avec score de confiance par caractère, preuves recadrées et modèles ONNX vérifiés par SHA-256.",
        },
        {
          icon: "lock",
          title: "Coffre DPAPI et sauvegardes vérifiées",
          body: "Les identifiants caméra sont liés au compte utilisateur Windows actif via DPAPI. Inclut des sauvegardes SQLite avec contrôle d'intégrité et un assistant en 6 étapes.",
        },
      ],
    },
    steps: {
      eyebrow: "Prise en main",
      title: "Déployez votre console opérateur en trois étapes.",
      lead: "Un assistant guide l'administrateur dans la création du mot de passe, le chargement des modèles ONNX et le calibrage de la première caméra.",
      items: [
        {
          title: "Initialiser l'accès administrateur",
          body: "Lancez l'installateur. Au premier démarrage, créez un mot de passe administrateur d'au moins 12 caractères via l'assistant d'accueil.",
        },
        {
          title: "Configurer les modèles ONNX locaux",
          body: "Téléchargez environ 15 Mo de modèles d'évaluation dans les Paramètres ou sélectionnez votre propre manifeste ONNX vérifié par SHA-256.",
        },
        {
          title: "Calibrer les lignes et lancer l'OCR",
          body: "Ajoutez une caméra autorisée, enregistrez les lignes de déclenchement et de lecture, créez une fiche véhicule et démarrez l'OCR depuis le Tableau de bord.",
        },
      ],
      helperText:
        "Si une erreur DLL QtCore persiste, installez le paquet officiel Microsoft Visual C++ pour Windows puis relancez l'application.",
      helperLinkLabel: "Paquet Microsoft Visual C++",
      helperLinkHref: vcRedistUrl,
    },
    compatibility: {
      eyebrow: "Compatibilité et périmètre de validation",
      title: "Validation matérielle et limites de sécurité opérationnelle.",
      lead: "Notes techniques transparentes sur les flux testés, les outils de diagnostic contrôleur et les sécurités par défaut.",
      cards: [
        {
          title: "Validation des flux ONVIF & D3D11",
          body: "La découverte ONVIF IPv4, la sélection de profil média, les flux H.264 principal/secondaire et le décodage D3D11 automatique ont été validés sur Mercusys MC510.",
        },
        {
          title: "Inspection des contrôleurs et relais",
          body: "Inclut des outils d'inspection en lecture seule Modbus TCP (bobine unique) et Shelly RPC ; l'actionnement physique des barrières reste désactivé par défaut.",
        },
        {
          title: "Exécutable autonome par utilisateur",
          body: "S'installe pour le compte utilisateur courant sans nécessiter Python, Node.js ou un serveur de base de données externe.",
        },
      ],
    },
    release: {
      title: "Détails de la version",
      versionLabel: "Version",
      platformLabel: "Plateforme",
      runtimeLabel: "Exécution",
      runtimeValue: "Paquet de bureau autonome",
      installerLabel: "Installateur Windows (.exe)",
      copyLabel: "Copier SHA-256",
      copiedLabel: "Copié",
      downloadLabel: "Télécharger",
      releaseNotesLabel: "Notes de version et code sur GitHub",
    },
    closing: {
      title: "Prêt à déployer la lecture locale de plaques ?",
      lead: "Téléchargez l'installateur autonome et configurez votre mur opérateur multi-caméras en quelques minutes.",
      primaryCta: "Télécharger IPScans LPR Pro",
      secondaryCta: "Toutes les applications",
      note: "Fonctionne localement sur votre poste de travail. Vérifiez l'intégrité via SHA-256.",
    },
  },
  it: {
    metaTitle: "IPScans LPR Pro — Riconoscimento Targhe e Console Operatore",
    metaDescription:
      "Riconoscimento targhe locale con area operatore live a 5 pannelli, linee di calibrazione indipendenti, registro veicoli residenti e coda eventi crittografata.",
    backToApps: "Tutte le applicazioni",
    eyebrow: "Riconoscimento Targhe e Gestione Varchi",
    name: "IPScans LPR Pro",
    headline: "Riconoscimento autonomo delle targhe e gestione varchi in tempo reale, localmente sulla tua postazione.",
    lead:
      "Leggi le targhe in locale, gestisci la parete video multi-camera, calibra linee indipendenti di attivazione e lettura e amministra il registro veicoli con log crittografati.",
    primaryCta: "Scarica l'installer",
    secondaryCta: "Note di rilascio e sorgente",
    screenshotAlt: "Area di lavoro operatore a 5 pannelli IPScans LPR Pro",
    screenshotCaption: "Console operatore a cinque pannelli con flussi RTSP in tempo reale, ritagli targa e verifica dei transiti.",
    capabilities: {
      eyebrow: "Funzionalità principali",
      title: "Progettato per complessi residenziali, parcheggi e varchi controllati.",
      lead:
        "Ogni componente — dall'acquisizione ONVIF al riconoscimento ONNX fino ai backup SQLite — opera localmente senza dipendenze cloud.",
      items: [
        {
          icon: "monitor",
          title: "Area operatore live a 5 pannelli",
          body: "Dashboard Live, Telecamere, Veicoli e Residenti, Eventi e Impostazioni. Registro di blocchi, interni, residenti e veicoli con import/export CSV/XLSX.",
        },
        {
          icon: "activity",
          title: "Calibrazione indipendente e zone poligonali",
          body: "Linee separate di trigger e riconoscimento, regioni rettangolari o poligonali, filtri di direzione, finestre di ripetizione e storico correzioni motivato.",
        },
        {
          icon: "shield",
          title: "Consegna eventi crittografata e resiliente",
          body: "Giornale locale crittografato con tentativi automatici durante i blocchi temporanei del database; filtri per stato, blocco, interno, telecamera e direzione.",
        },
        {
          icon: "camera",
          title: "Scoperta ONVIF e decodifica hardware",
          body: "Rilevamento profili media ONVIF IPv4, decodifica hardware D3D11 automatica con fallback CPU e processi di acquisizione isolati.",
        },
        {
          icon: "cpu",
          title: "OCR regionale e confidenza per carattere",
          body: "Elabora immagini fisse, video MP4/AVI e flussi RTSP live con metriche di confidenza per carattere, ritagli di prova e modelli ONNX verificati con SHA-256.",
        },
        {
          icon: "lock",
          title: "Cassaforte DPAPI e snapshot verificati",
          body: "Le credenziali delle telecamere sono vincolate all'account utente Windows tramite DPAPI. Include backup di integrità SQLite e procedura guidata in 6 passaggi.",
        },
      ],
    },
    steps: {
      eyebrow: "Come iniziare",
      title: "Attiva la console operatore in tre passaggi.",
      lead: "Una procedura guidata accompagna l'amministratore nella configurazione della password, dei modelli ONNX e della prima telecamera.",
      items: [
        {
          title: "Configura l'accesso amministratore",
          body: "Esegui l'installer. Al primo avvio, crea una password amministratore di almeno 12 caratteri tramite la procedura guidata.",
        },
        {
          title: "Scarica i modelli ONNX locali",
          body: "Scarica circa 15 MB di modelli di valutazione nelle Impostazioni oppure seleziona il tuo manifesto ONNX verificato con SHA-256.",
        },
        {
          title: "Calibra le linee e avvia l'OCR",
          body: "Aggiungi una telecamera autorizzata, salva le linee di trigger e lettura, crea una scheda veicolo e avvia l'OCR dalla Dashboard Live.",
        },
      ],
      helperText:
        "Se persiste un errore DLL QtCore, installa il pacchetto ufficiale Microsoft Visual C++ per Windows e riapri l'applicazione.",
      helperLinkLabel: "Pacchetto Microsoft Visual C++",
      helperLinkHref: vcRedistUrl,
    },
    compatibility: {
      eyebrow: "Compatibilità e ambito di validazione",
      title: "Validazione hardware e limiti di sicurezza operativa.",
      lead: "Note tecniche trasparenti sui flussi telecamera testati, diagnostica dei controller e protezioni predefinite.",
      cards: [
        {
          title: "Validazione flussi ONVIF e D3D11",
          body: "Scoperta ONVIF IPv4, selezione profilo media, flussi H.264 principale/secondario e decodifica D3D11 automatica sono stati testati su Mercusys MC510.",
        },
        {
          title: "Ispezione controller e relè",
          body: "Include strumenti di sola lettura per Modbus TCP a bobina singola e stato Shelly RPC; l'azionamento fisico della barriera resta disattivato per sicurezza.",
        },
        {
          title: "Runtime autonomo per l'utente",
          body: "Si installa nel profilo utente corrente senza richiedere Python, Node.js o database esterni.",
        },
      ],
    },
    release: {
      title: "Dettagli di rilascio",
      versionLabel: "Versione",
      platformLabel: "Piattaforma",
      runtimeLabel: "Runtime",
      runtimeValue: "Pacchetto desktop autonomo",
      installerLabel: "Installer Windows (.exe)",
      copyLabel: "Copia SHA-256",
      copiedLabel: "Copiato",
      downloadLabel: "Scarica",
      releaseNotesLabel: "Note di rilascio e sorgente su GitHub",
    },
    closing: {
      title: "Pronto per il riconoscimento targhe locale?",
      lead: "Scarica l'installer autonomo e configura la tua parete operatore multi-camera in pochi minuti.",
      primaryCta: "Scarica IPScans LPR Pro",
      secondaryCta: "Tutte le applicazioni",
      note: "Funziona localmente sulla tua postazione. Integrità verificabile tramite SHA-256.",
    },
  },
  pt: {
    metaTitle: "IPScans LPR Pro — Reconhecimento de Matrículas e Consola de Operador",
    metaDescription:
      "Reconhecimento local de matrículas com área de operador em direto de 5 painéis, linhas de calibração independentes, registo de veículos e entrega encriptada de eventos.",
    backToApps: "Todas as aplicações",
    eyebrow: "Reconhecimento de Matrículas e Operação de Portarias",
    name: "IPScans LPR Pro",
    headline: "Reconhecimento autónomo de matrículas e gestão de acessos em direto, localmente na sua estação.",
    lead:
      "Leia matrículas localmente, supervisione um mural multicâmara em direto, calibre linhas independentes de disparo e leitura e gira o registo de veículos residentes.",
    primaryCta: "Descarregar instalador",
    secondaryCta: "Notas de lançamento e código",
    screenshotAlt: "Área de operador em direto de 5 painéis IPScans LPR Pro",
    screenshotCaption: "Consola de operador de cinco painéis com transmissões RTSP em tempo real, recortes de matrícula e verificação de passagens.",
    capabilities: {
      eyebrow: "Capacidades principais",
      title: "Concebido para condomínios, parques de estacionamento e portarias controladas.",
      lead:
        "Cada componente — desde a recolha ONVIF até ao OCR em ONNX e cópias SQLite — funciona localmente sem dependências da nuvem.",
      items: [
        {
          icon: "monitor",
          title: "Área de operador em direto de 5 painéis",
          body: "Painel em Direto, Câmaras, Veículos e Residentes, Eventos e Definições. Registo por bloco, fração e residente com importação/exportação CSV/XLSX.",
        },
        {
          icon: "activity",
          title: "Calibração independente e regiões poligonais",
          body: "Linhas separadas de disparo e leitura, regiões retangulares ou poligonais, filtros de direção, janelas de repetição e histórico auditável de correções.",
        },
        {
          icon: "shield",
          title: "Entrega de eventos encriptada e durável",
          body: "Diário local encriptado com novas tentativas automáticas durante bloqueios temporários; filtragem por estado, bloco, fração, câmara e direção.",
        },
        {
          icon: "camera",
          title: "Descoberta ONVIF e descodificação por hardware",
          body: "Descoberta de perfis multimédia ONVIF IPv4, descodificação automática D3D11 por câmara com alternativa em CPU e processos de captura isolados.",
        },
        {
          icon: "cpu",
          title: "OCR regional e confiança por carácter",
          body: "Processe imagens fixas, vídeos MP4/AVI e transmissões RTSP em direto com métricas de confiança por carácter, recortes de prova e modelos ONNX verificados por SHA-256.",
        },
        {
          icon: "lock",
          title: "Cofre DPAPI e cópias verificadas",
          body: "As credenciais das câmaras são associadas à conta de utilizador Windows ativa via DPAPI. Inclui cópias de integridade SQLite e assistente de 6 passos.",
        },
      ],
    },
    steps: {
      eyebrow: "Primeiros passos",
      title: "Implemente a sua consola de operador em três passos.",
      lead: "Um assistente guiado acompanha o administrador na definição de palavra-passe, modelos ONNX locais e calibração da primeira câmara.",
      items: [
        {
          title: "Inicialize o acesso de administrador",
          body: "Execute o instalador. No primeiro arranque, crie uma palavra-passe de administrador com pelo menos 12 caracteres no assistente de boas-vindas.",
        },
        {
          title: "Configure os modelos ONNX locais",
          body: "Transfira cerca de 15 MB de modelos de avaliação nas Definições ou selecione o seu próprio manifesto ONNX verificado com SHA-256.",
        },
        {
          title: "Calibre linhas de câmara e inicie o OCR",
          body: "Adicione uma câmara autorizada, guarde as linhas de disparo e reconhecimento, crie um registo de veículo e inicie o OCR no Painel em Direto.",
        },
      ],
      helperText:
        "Se persistir um erro de DLL QtCore, instale o pacote oficial Microsoft Visual C++ para Windows e volte a abrir a aplicação.",
      helperLinkLabel: "Pacote Microsoft Visual C++",
      helperLinkHref: vcRedistUrl,
    },
    compatibility: {
      eyebrow: "Compatibilidade e âmbito de validação",
      title: "Validação de hardware e limites de segurança operacional.",
      lead: "Notas técnicas transparentes sobre transmissões testadas, ferramentas de diagnóstico de controladores e proteções predefinidas.",
      cards: [
        {
          title: "Validação de transmissões ONVIF e D3D11",
          body: "Descoberta ONVIF IPv4, seleção de perfil multimédia, fluxos H.264 principal/secundário e descodificação D3D11 automática foram testados num Mercusys MC510.",
        },
        {
          title: "Inspeção de controladores e relés",
          body: "Inclui ferramentas de leitura para Modbus TCP de bobina única e estado Shelly RPC; o acionamento físico da barreira permanece desativado por predefinição.",
        },
        {
          title: "Ambiente de execução autónomo",
          body: "Instala-se na conta do utilizador atual sem necessitar de instalar Python, Node.js ou bases de dados externas.",
        },
      ],
    },
    release: {
      title: "Detalhes da versão",
      versionLabel: "Versão",
      platformLabel: "Plataforma",
      runtimeLabel: "Execução",
      runtimeValue: "Pacote autónomo para computador",
      installerLabel: "Instalador Windows (.exe)",
      copyLabel: "Copiar SHA-256",
      copiedLabel: "Copiado",
      downloadLabel: "Descarregar",
      releaseNotesLabel: "Notas de lançamento e código no GitHub",
    },
    closing: {
      title: "Pronto para executar reconhecimento local de matrículas?",
      lead: "Transfira o instalador autónomo e configure o seu mural de operador multicâmara em poucos minutos.",
      primaryCta: "Descarregar IPScans LPR Pro",
      secondaryCta: "Todas as aplicações",
      note: "Funciona localmente na sua estação de trabalho. Verifique a integridade via SHA-256.",
    },
  },
  nl: {
    metaTitle: "IPScans LPR Pro — Kentekenherkenning & Bedieningsconsole",
    metaDescription:
      "Lokale kentekenherkenning met 5-delige live bedieningswerkruimte, onafhankelijke kalibratielijnen, voertuigregister en versleutelde gebeurtenissenwachtrij.",
    backToApps: "Alle applicaties",
    eyebrow: "Kentekenherkenning & Toegangsbeheer",
    name: "IPScans LPR Pro",
    headline: "Autonome kentekenherkenning en live slagboombeheer, lokaal op uw werkstation.",
    lead:
      "Lees kentekens lokaal uit, beheer een live multicamerawand, kalibreer afzonderlijke trigger- en herkenningslijnen en beheer uw voertuigregister met versleutelde logboeken.",
    primaryCta: "Installer downloaden",
    secondaryCta: "Release-opmerkingen & broncode",
    screenshotAlt: "IPScans LPR Pro 5-delige live bedieningswerkruimte",
    screenshotCaption: "Vijfdelige live bedieningsconsole met realtime RTSP-streams, kentekenuitsneden en doorgangscontrole.",
    capabilities: {
      eyebrow: "Kernfuncties",
      title: "Ontworpen voor wooncomplexen, parkeerfaciliteiten en gecontroleerde toegangen.",
      lead:
        "Elk onderdeel — van ONVIF-streamopname tot ONNX-tekenherkenning en SQLite-back-ups — draait lokaal zonder cloudafhankelijkheid.",
      items: [
        {
          icon: "monitor",
          title: "5-delige live bedieningswerkruimte",
          body: "Live Dashboard, Camera's, Voertuigen & Bewoners, Gebeurtenissen en Instellingen. Beheer blokken, eenheden en bewoners met CSV/XLSX-import en -export.",
        },
        {
          icon: "activity",
          title: "Onafhankelijke kalibratie & polygoonregio's",
          body: "Afzonderlijke trigger- en herkenningslijnen, rechthoekige en polygoongebieden, richtingfilters, herhalingsvensters en controleerbare correctiegeschiedenis.",
        },
        {
          icon: "shield",
          title: "Duurzame versleutelde gebeurtenissenwachtrij",
          body: "Versleuteld lokaal logboek met automatische nieuwe pogingen bij tijdelijke databasevergrendelingen; filter op status, blok, eenheid, camera en richting.",
        },
        {
          icon: "camera",
          title: "ONVIF-detectie & hardwaredecodering",
          body: "IPv4 ONVIF-mediaprofielherkenning, automatische D3D11-hardwaredecodering per camera met CPU-terugval en geïsoleerde opnameprocessen.",
        },
        {
          icon: "cpu",
          title: "Regionale OCR & betrouwbaarheid per teken",
          body: "Verwerk stilstaande beelden, MP4/AVI-video en live RTSP-streams met betrouwbaarheidsscores per teken, bewijsuitsneden en SHA-256-geverifieerde ONNX-modellen.",
        },
        {
          icon: "lock",
          title: "DPAPI-kluis & geverifieerde snapshots",
          body: "Cameragegevens worden via DPAPI gekoppeld aan het actieve Windows-gebruikersaccount. Inclusief SQLite-integriteitsback-ups en een installatiewizard in 6 stappen.",
        },
      ],
    },
    steps: {
      eyebrow: "Aan de slag",
      title: "Rol uw bedieningsconsole uit in drie stappen.",
      lead: "Een begeleide wizard helpt beheerders bij wachtwoordbeveiliging, lokale ONNX-modellen en de eerste camerakalibratie.",
      items: [
        {
          title: "Beheerderstoegang instellen",
          body: "Start het installatieprogramma. Maak bij de eerste start via de welkomstwizard een beheerderswachtwoord aan van ten minste 12 tekens.",
        },
        {
          title: "Lokale ONNX-modellen configureren",
          body: "Download circa 15 MB aan evaluatiemodellen in Instellingen, of selecteer uw eigen SHA-256-geverifieerde ONNX-modelmanifest.",
        },
        {
          title: "Cameralijnen kalibreren & OCR starten",
          body: "Voeg een geautoriseerde camera toe, sla trigger- en herkenningslijnen op, maak een voertuigrecord aan en start live OCR vanuit het dashboard.",
        },
      ],
      helperText:
        "Als een QtCore DLL-melding aanhoudt, installeer dan het officiële Microsoft Visual C++ pakket voor Windows en heropen de applicatie.",
      helperLinkLabel: "Microsoft Visual C++ pakket",
      helperLinkHref: vcRedistUrl,
    },
    compatibility: {
      eyebrow: "Compatibiliteit & validatiebereik",
      title: "Hardwarevalidatie en operationele veiligheidsgrenzen.",
      lead: "Transparante technische toelichting op geteste camerastreams, controllerdiagnose en standaard veiligheidswaarborgen.",
      cards: [
        {
          title: "ONVIF- & D3D11-streamvalidatie",
          body: "IPv4 ONVIF-detectie, mediaprofielselectie, H.264 hoofd-/substreams en automatische D3D11-hardwaredecodering zijn gevalideerd op een Mercusys MC510.",
        },
        {
          title: "Controller- & relaisinspectie",
          body: "Bevat alleen-lezen hulpmiddelen voor Modbus TCP single-coil en Shelly RPC-status; fysieke aansturing van slagbomen is standaard uitgeschakeld.",
        },
        {
          title: "Zelfstandige gebruikersruntime",
          body: "Wordt geïnstalleerd onder het huidige gebruikersaccount zonder dat Python, Node.js of externe databases nodig zijn.",
        },
      ],
    },
    release: {
      title: "Releasedetails",
      versionLabel: "Versie",
      platformLabel: "Platform",
      runtimeLabel: "Runtime",
      runtimeValue: "Zelfstandig desktoppakket",
      installerLabel: "Windows-installer (.exe)",
      copyLabel: "SHA-256 kopiëren",
      copiedLabel: "Gekopieerd",
      downloadLabel: "Downloaden",
      releaseNotesLabel: "Release-opmerkingen & broncode op GitHub",
    },
    closing: {
      title: "Klaar voor lokale kentekenherkenning?",
      lead: "Download de zelfstandige installer en stel binnen enkele minuten uw multicamera-bedieningswand in.",
      primaryCta: "IPScans LPR Pro downloaden",
      secondaryCta: "Alle applicaties",
      note: "Draait volledig lokaal op uw werkstation. Controleer de pakketintegriteit met SHA-256.",
    },
  },
  pl: {
    metaTitle: "IPScans LPR Pro — Rozpoznawanie Tablic i Konsola Operatora",
    metaDescription:
      "Lokalne rozpoznawanie tablic rejestracyjnych z 5-panelową konsolą operatora na żywo, niezależnymi liniami kalibracji, rejestrem pojazdów i szyfrowanym dziennikiem zdarzeń.",
    backToApps: "Wszystkie aplikacje",
    eyebrow: "Rozpoznawanie Tablic i Obsługa Wjazdów",
    name: "IPScans LPR Pro",
    headline: "Autonomiczne rozpoznawanie tablic i obsługa szlabanów na żywo, lokalnie na Twojej stacji roboczej.",
    lead:
      "Odczytuj tablice lokalnie, nadzoruj wielokamerową ścianę wideo, kalibruj niezależne linie wyzwalania i odczytu oraz zarządzaj rejestrem pojazdów mieszkańców.",
    primaryCta: "Pobierz instalator",
    secondaryCta: "Informacje o wydaniu i kod",
    screenshotAlt: "5-panelowa konsola operatora na żywo IPScans LPR Pro",
    screenshotCaption: "Pięciopanelowa konsola operatora ze strumieniami RTSP w czasie rzeczywistym, wycinkami tablic i weryfikacją przejazdów.",
    capabilities: {
      eyebrow: "Główne możliwości",
      title: "Zaprojektowany dla osiedli mieszkaniowych, parkingów i kontrolowanych wjazdów.",
      lead:
        "Każdy moduł — od odbioru strumieni ONVIF po rozpoznawanie ONNX i kopie zapasowe SQLite — działa lokalnie bez zależności od chmury.",
      items: [
        {
          icon: "monitor",
          title: "5-panelowa konsola operatora na żywo",
          body: "Panel na żywo, Kamery, Pojazdy i Mieszkańcy, Zdarzenia oraz Ustawienia. Rejestr bloków, lokali, mieszkańców i wielu właścicieli z importem/eksportem CSV/XLSX.",
        },
        {
          icon: "activity",
          title: "Niezależna kalibracja i strefy wielokątne",
          body: "Osobne linie wyzwalania i rozpoznawania, strefy prostokątne i wielokątne, filtry kierunku, okna powtórzeń oraz historia korekt z uzasadnieniem.",
        },
        {
          icon: "shield",
          title: "Trwała szyfrowana kolejka zdarzeń",
          body: "Szyfrowany lokalny dziennik dostarczania z automatycznym ponawianiem podczas blokad bazy; filtrowanie według statusu, bloku, lokalu, kamery i kierunku.",
        },
        {
          icon: "camera",
          title: "Wykrywanie ONVIF i dekodowanie sprzętowe",
          body: "Wykrywanie profili multimedialnych ONVIF IPv4, automatyczne dekodowanie sprzętowe D3D11 z przełączeniem awaryjnym na CPU oraz izolowane procesy przechwytywania.",
        },
        {
          icon: "cpu",
          title: "Regionalny OCR i pewność dla każdego znaku",
          body: "Obsługa zdjęć, nagrań MP4/AVI i strumieni RTSP na żywo ze wskaźnikiem pewności dla każdego znaku, wycinkami dowodowymi i modelami ONNX weryfikowanymi przez SHA-256.",
        },
        {
          icon: "lock",
          title: "Sejf DPAPI i zweryfikowane kopie",
          body: "Poświadczenia kamer są powiązane z aktywnym kontem użytkownika Windows przez DPAPI. Zawiera kopie integralności SQLite i 6-etapowy kreator konfiguracji.",
        },
      ],
    },
    steps: {
      eyebrow: "Pierwsze kroki",
      title: "Wdróż konsolę operatora w trzech krokach.",
      lead: "Kreator przeprowadza administratora przez ustawienie hasła, pobranie lokalnych modeli ONNX i kalibrację pierwszej kamery.",
      items: [
        {
          title: "Skonfiguruj dostęp administratora",
          body: "Uruchom instalator. Przy pierwszym uruchomieniu utwórz w kreatorze powitalnym hasło administratora o długości co najmniej 12 znaków.",
        },
        {
          title: "Skonfiguruj lokalne modele ONNX",
          body: "Pobierz około 15 MB modeli testowych w Ustawieniach lub wybierz własny manifest modelu ONNX zweryfikowany sumą SHA-256.",
        },
        {
          title: "Skalibruj linie kamery i uruchom OCR",
          body: "Dodaj autoryzowaną kamerę, zapisz linie wyzwalania i odczytu, utwórz wpis pojazdu i uruchom OCR z Panelu na żywo.",
        },
      ],
      helperText:
        "Jeśli pojawi się komunikat o bibliotece QtCore DLL, zainstaluj oficjalny pakiet Microsoft Visual C++ dla systemu Windows i ponownie uruchom aplikację.",
      helperLinkLabel: "Pakiet Microsoft Visual C++",
      helperLinkHref: vcRedistUrl,
    },
    compatibility: {
      eyebrow: "Kompatybilność i zakres walidacji",
      title: "Walidacja sprzętowa i granice bezpieczeństwa operacyjnego.",
      lead: "Przejrzyste informacje techniczne o przetestowanych strumieniach kamer, diagnostyce sterowników i domyślnych zabezpieczeniach.",
      cards: [
        {
          title: "Walidacja strumieni ONVIF i D3D11",
          body: "Wykrywanie ONVIF IPv4, wybór profilu multimedialnego, strumienie H.264 główny/pomocniczy oraz automatyczne dekodowanie D3D11 zostały przetestowane na kamerze Mercusys MC510.",
        },
        {
          title: "Inspekcja sterowników i przekaźników",
          body: "Zawiera narzędzia tylko do odczytu dla pojedynczej cewki Modbus TCP oraz statusu Shelly RPC; fizyczne wyzwalanie szlabanu jest domyślnie wyłączone.",
        },
        {
          title: "Samodzielne środowisko uruchomieniowe",
          body: "Instaluje się na koncie bieżącego użytkownika i nie wymaga osobnej instalacji Pythona, Node.js ani baz danych.",
        },
      ],
    },
    release: {
      title: "Szczegóły wydania",
      versionLabel: "Wersja",
      platformLabel: "Platforma",
      runtimeLabel: "Środowisko",
      runtimeValue: "Samodzielny pakiet komputerowy",
      installerLabel: "Instalator Windows (.exe)",
      copyLabel: "Kopiuj SHA-256",
      copiedLabel: "Skopiowano",
      downloadLabel: "Pobierz",
      releaseNotesLabel: "Informacje o wydaniu i kod na GitHubie",
    },
    closing: {
      title: "Gotowy na lokalne rozpoznawanie tablic?",
      lead: "Pobierz samodzielny instalator i skonfiguruj wielokamerową ścianę operatora w kilka minut.",
      primaryCta: "Pobierz IPScans LPR Pro",
      secondaryCta: "Wszystkie aplikacje",
      note: "Działa lokalnie na Twojej stacji roboczej. Zweryfikuj integralność pakietu za pomocą SHA-256.",
    },
  },
  ru: {
    metaTitle: "IPScans LPR Pro — Распознавание Номеров и Консоль Оператора",
    metaDescription:
      "Локальное распознавание автомобильных номеров с 5-панельной живой консолью оператора, независимыми линиями калибровки, базой транспорта и шифрованной очередью событий.",
    backToApps: "Все приложения",
    eyebrow: "Распознавание Номеров и Управление КПП",
    name: "IPScans LPR Pro",
    headline: "Автономное распознавание номеров и контроль проездов в реальном времени на вашей рабочей станции.",
    lead:
      "Распознавайте номера локально, управляйте многокамерной видеостеной, калибруйте независимые линии триггера и чтения и ведите реестр транспорта резидентов.",
    primaryCta: "Скачать установщик",
    secondaryCta: "Примечания к выпуску и код",
    screenshotAlt: "5-панельная консоль оператора IPScans LPR Pro",
    screenshotCaption: "Пятипанельная консоль оператора с потоками RTSP в реальном времени, кадрами номеров и проверкой проездов.",
    capabilities: {
      eyebrow: "Ключевые возможности",
      title: "Разработано для жилых комплексов, паркингов и контролируемых въездов.",
      lead:
        "Каждый компонент — от захвата ONVIF-потоков до распознавания ONNX и резервных копий SQLite — работает локально без облачных сервисов.",
      items: [
        {
          icon: "monitor",
          title: "5-панельная живая консоль оператора",
          body: "Панель мониторинга, Камеры, Транспорт и Резиденты, События и Настройки. Учёт корпусов, квартир, жильцов и автомобилей с импортом и экспортом CSV/XLSX.",
        },
        {
          icon: "activity",
          title: "Независимая калибровка и полигональные зоны",
          body: "Отдельные линии триггера и распознавания, прямоугольные и многоугольные области, фильтры направления, окна повторов и журнал корректировок.",
        },
        {
          icon: "shield",
          title: "Надёжная шифрованная очередь событий",
          body: "Зашифрованный локальный журнал доставки с автоматическими повторами при блокировках БД; фильтрация по статусу, корпусу, квартире, камере и направлению.",
        },
        {
          icon: "camera",
          title: "Обнаружение ONVIF и аппаратное декодирование",
          body: "Поиск медиапрофилей IPv4 ONVIF, автоматическое аппаратное декодирование D3D11 с резервом на CPU и изолированные процессы захвата.",
        },
        {
          icon: "cpu",
          title: "Региональный OCR и точность по символам",
          body: "Обработка изображений, видео MP4/AVI и живых потоков RTSP с оценкой уверенности по каждому символу, кадрами номеров и ONNX-моделями с проверкой SHA-256.",
        },
        {
          icon: "lock",
          title: "Хранилище DPAPI и проверенные снимки БД",
          body: "Учётные данные камер привязываются к активной учётной записи Windows через DPAPI. Включает проверку целостности резервных копий SQLite и мастер настройки из 6 шагов.",
        },
      ],
    },
    steps: {
      eyebrow: "Начало работы",
      title: "Разверните консоль оператора за три шага.",
      lead: "Пошаговый мастер поможет администратору задать пароль, загрузить локальные модели ONNX и откалибровать первую камеру.",
      items: [
        {
          title: "Настройте доступ администратора",
          body: "Запустите установщик. При первом открытии создайте пароль администратора длиной не менее 12 символов с помощью мастера приветствия.",
        },
        {
          title: "Подключите локальные модели ONNX",
          body: "Загрузите около 15 МБ оценочных моделей в разделе «Настройки» или выберите собственный манифест модели ONNX с проверкой SHA-256.",
        },
        {
          title: "Откалибруйте линии камеры и запустите OCR",
          body: "Добавьте авторизованную камеру, сохраните линии триггера и чтения, создайте карточку автомобиля и запустите распознавание на Панели мониторинга.",
        },
      ],
      helperText:
        "Если появляется ошибка QtCore DLL, установите официальный пакет Microsoft Visual C++ для Windows и перезапустите приложение.",
      helperLinkLabel: "Пакет Microsoft Visual C++",
      helperLinkHref: vcRedistUrl,
    },
    compatibility: {
      eyebrow: "Совместимость и объём проверки",
      title: "Аппаратная проверка и границы эксплуатационной безопасности.",
      lead: "Прозрачные технические сведения о протестированных камерах, диагностике контроллеров и защитных ограничениях по умолчанию.",
      cards: [
        {
          title: "Проверка потоков ONVIF и D3D11",
          body: "Обнаружение IPv4 ONVIF, выбор медиапрофиля, основной/дополнительный потоки H.264 и аппаратное декодирование D3D11 протестированы на камере Mercusys MC510.",
        },
        {
          title: "Диагностика контроллеров и реле",
          body: "Включает инструменты чтения одиночной катушки Modbus TCP и статуса Shelly RPC; физическое управление шлагбаумом по умолчанию отключено в целях безопасности.",
        },
        {
          title: "Автономная среда выполнения",
          body: "Устанавливается в профиль текущего пользователя Windows и не требует отдельной установки Python, Node.js или внешних СУБД.",
        },
      ],
    },
    release: {
      title: "Сведения о выпуске",
      versionLabel: "Версия",
      platformLabel: "Платформа",
      runtimeLabel: "Среда выполнения",
      runtimeValue: "Автономный настольный пакет",
      installerLabel: "Установщик Windows (.exe)",
      copyLabel: "Копировать SHA-256",
      copiedLabel: "Скопировано",
      downloadLabel: "Скачать",
      releaseNotesLabel: "Примечания к выпуску и исходный код на GitHub",
    },
    closing: {
      title: "Готовы запустить локальное распознавание номеров?",
      lead: "Скачайте автономный установщик и настройте многокамерную панель оператора за несколько минут.",
      primaryCta: "Скачать IPScans LPR Pro",
      secondaryCta: "Все приложения",
      note: "Работает полностью локально на вашей рабочей станции. Проверяйте целостность через SHA-256.",
    },
  },
  ar: {
    metaTitle: "IPScans LPR Pro — التعرف على لوحات المركبات ووحدة تحكم المشغل",
    metaDescription:
      "تعرف محلي على لوحات المركبات مع مساحة عمل مباشرة من 5 أقسام، وخطوط معايرة مستقلة، وسجل مركبات السكان، وتسليم أحداث مشفر.",
    backToApps: "جميع التطبيقات",
    eyebrow: "التعرف على اللوحات وإدارة البوابات",
    name: "IPScans LPR Pro",
    headline: "تعرف ذاتي على لوحات المركبات وإدارة مباشرة للبوابات محليًا على محطة عملك.",
    lead:
      "اقرأ اللوحات محليًا، وأدر جدار الكاميرات المباشر، وعاير خطوط القدح والقراءة المستقلة، وتحكم في سجل مركبات السكان مع سجلات عبور مشفرة.",
    primaryCta: "تنزيل المثبت",
    secondaryCta: "ملاحظات الإصدار والمصدر",
    screenshotAlt: "مساحة عمل المشغل المباشرة المكونة من 5 أقسام في IPScans LPR Pro",
    screenshotCaption: "وحدة تحكم مباشرة من خمسة أقسام مع بث RTSP فوري واقتصاص اللوحات وتوثيق العبور.",
    capabilities: {
      eyebrow: "القدرات الأساسية",
      title: "مصمم للمجمعات السكنية ومواقف السيارات والبوابات الخاضعة للتحكم.",
      lead:
        "يعمل كل مكوّن — من استقبال بث ONVIF إلى التعرف الضوئي عبر ONNX والنسخ الاحتياطية لقاعدة SQLite — محليًا دون أي اعتماد على السحابة.",
      items: [
        {
          icon: "monitor",
          title: "مساحة عمل مباشرة للمشغل من 5 أقسام",
          body: "لوحة المراقبة المباشرة، والكاميرات، والمركبات والسكان، والأحداث، والإعدادات. إدارة المباني والوحدات والسكان مع استيراد وتصدير CSV/XLSX.",
        },
        {
          icon: "activity",
          title: "معايرة مستقلة ومناطق متعددة الأضلاع",
          body: "خطوط قدح وتعرف منفصلة، ومناطق مستطيلة أو مضلعة، ومرشحات اتجاه، ونوافذ منع التكرار، وسجل تدقيق للتصحيحات المسببة.",
        },
        {
          icon: "shield",
          title: "طابور أحداث مشفر ومستدام",
          body: "سجل تسليم محلي مشفر مع إعادة محاولة تلقائية أثناء أقفال قاعدة البيانات المؤقتة؛ تصفية حسب حالة المركبة والمبنى والوحدة والكاميرا والاتجاه.",
        },
        {
          icon: "camera",
          title: "اكتشاف ONVIF وفك ترميز عتادي",
          body: "اكتشاف ملفات وسائط ONVIF عبر IPv4، وفك ترميز عتادي تلقائي D3D11 لكل كاميرا مع رجوع تلقائي إلى المعالج، وعمليات التقاط معزولة.",
        },
        {
          icon: "cpu",
          title: "تعرف ضوئي إقليمي وثقة لكل محرف",
          body: "معالجة الصور الثابتة ومقاطع MP4/AVI وبث RTSP المباشر مع درجات ثقة لكل حرف، واقتصاص صورة الدليل، ونماذج ONNX محلية موثقة بـ SHA-256.",
        },
        {
          icon: "lock",
          title: "خزنة DPAPI ونسخ احتياطية موثقة",
          body: "تُربط بيانات اعتماد الكاميرات بحساب مستخدم Windows النشط عبر DPAPI، مع نسخ احتياطية SQLite مفحوصة التكامل ومعالج إعداد من 6 خطوات.",
        },
      ],
    },
    steps: {
      eyebrow: "البدء السريع",
      title: "شغّل وحدة تحكم المشغل في ثلاث خطوات.",
      lead: "يرشد معالج الإعداد المسؤول خلال إنشاء كلمة المرور، وتحميل نماذج ONNX المحلية، ومعايرة الكاميرا الأولى.",
      items: [
        {
          title: "تهيئة صلاحية المسؤول",
          body: "شغّل ملف التثبيت. عند التشغيل الأول، أنشئ كلمة مرور للمسؤول لا تقل عن 12 حرفًا عبر معالج الترحيب.",
        },
        {
          title: "إعداد نماذج ONNX المحلية",
          body: "نزّل نماذج التقييم (نحو 15 ميجابايت) من قسم الإعدادات، أو اختر ملف تعريف نموذج ONNX الموثق ببصمة SHA-256.",
        },
        {
          title: "معايرة خطوط الكاميرا وبدء القراءة",
          body: "أضف كاميرا مصرحًا بها، واحفظ خطوط القدح والقراءة، وأنشئ سجل مركبة، ثم ابدأ التعرف المباشر من لوحة المراقبة.",
        },
      ],
      helperText:
        "إذا ظهر تنبيه يخص مكتبة QtCore DLL، ثبّت حزمة Microsoft Visual C++ الرسمية لنظام Windows ثم أعد فتح التطبيق.",
      helperLinkLabel: "حزمة Microsoft Visual C++",
      helperLinkHref: vcRedistUrl,
    },
    compatibility: {
      eyebrow: "التوافق ونطاق التحقق",
      title: "التحقق العتادي وحدود الأمان التشغيلي.",
      lead: "ملاحظات هندسية واضحة حول بث الكاميرات المختبر وأدوات فحص وحدات التحكم وضوابط الأمان الافتراضية.",
      cards: [
        {
          title: "التحقق من بث ONVIF وD3D11",
          body: "تم اختبار اكتشاف IPv4 ONVIF واختيار ملف الوسائط وبث H.264 الرئيسي/الفرعي وفك الترميز العتادي التلقائي D3D11 على كاميرا Mercusys MC510.",
        },
        {
          title: "فحص وحدات التحكم والمرحلات",
          body: "يتضمن أدوات قراءة فقط لفحص ملف فردي عبر Modbus TCP وحالة Shelly RPC؛ ويبقى تحريك الحاجز الفعلي معطلًا افتراضيًا لدواعي السلامة.",
        },
        {
          title: "بيئة تشغيل ذاتية للمستخدم",
          body: "يُثبَّت في حساب المستخدم الحالي دون الحاجة إلى تثبيت Python أو Node.js أو قواعد بيانات خارجية.",
        },
      ],
    },
    release: {
      title: "تفاصيل الإصدار",
      versionLabel: "الإصدار",
      platformLabel: "النظام",
      runtimeLabel: "بيئة التشغيل",
      runtimeValue: "حزمة سطح مكتب مستقلة",
      installerLabel: "مثبّت Windows (.exe)",
      copyLabel: "نسخ SHA-256",
      copiedLabel: "تم النسخ",
      downloadLabel: "تنزيل",
      releaseNotesLabel: "ملاحظات الإصدار والمصدر على GitHub",
    },
    closing: {
      title: "هل أنت مستعد لتشغيل التعرف المحلي على اللوحات؟",
      lead: "نزّل المثبت المستقل واضبط جدار الكاميرات المتعدد للمشغل خلال دقائق.",
      primaryCta: "تنزيل IPScans LPR Pro",
      secondaryCta: "جميع التطبيقات",
      note: "يعمل محليًا بالكامل على محطة عملك. يمكنك التحقق من سلامة الحزمة عبر SHA-256.",
    },
  },
  ja: {
    metaTitle: "IPScans LPR Pro — ナンバープレート認識＆オペレーターコンソール",
    metaDescription:
      "5画面のライブオペレーターワークスペース、独立したキャリブレーションライン、車両・居住者台帳、暗号化イベントキューを備えたローカル車番認識ソフト。",
    backToApps: "すべてのアプリケーション",
    eyebrow: "ナンバープレート認識・ゲート運用",
    name: "IPScans LPR Pro",
    headline: "自律型ナンバープレート認識とライブゲート監視を、ローカルワークステーション上で。",
    lead:
      "ローカル環境でのプレート読み取り、マルチカメラのライブウォール監視、トリガー線と認識線の独立キャリブレーション、暗号化ログ付きの居住者車両台帳を一元管理します。",
    primaryCta: "インストーラーをダウンロード",
    secondaryCta: "リリースノートとソース",
    screenshotAlt: "IPScans LPR Pro 5画面ライブオペレーターワークスペース",
    screenshotCaption: "リアルタイム RTSP ストリーム、ナンバー切り出し画像、通行照合を備えた5画面オペレーターコンソール。",
    capabilities: {
      eyebrow: "主な機能",
      title: "集合住宅、駐車場、管理ゲートのために設計されたローカルアーキテクチャ。",
      lead:
        "ONVIF ストリーム取得から ONNX 文字認識、SQLite バックアップまで、すべての処理がクラウド非依存でローカル稼働します。",
      items: [
        {
          icon: "monitor",
          title: "5画面ライブオペレーターワークスペース",
          body: "ライブダッシュボード、カメラ、車両・居住者、イベント、設定の5画面。棟・部屋・居住者・複数所有者の車両台帳と CSV/XLSX 入出力に対応。",
        },
        {
          icon: "activity",
          title: "独立キャリブレーションとポリゴン領域",
          body: "トリガー線と認識線の個別設定、矩形・多角形ゾーン、方向フィルター、重複抑止ウィンドウ、理由付きの補正履歴監査。",
        },
        {
          icon: "shield",
          title: "堅牢な暗号化イベントキュー",
          body: "一時的なデータベースロック時も自動再試行する暗号化ローカルジャーナル。登録/未登録、棟、部屋、カメラ、進行方向で高度に絞り込み可能。",
        },
        {
          icon: "camera",
          title: "ONVIF 検出とハードウェアデコード",
          body: "IPv4 ONVIF メディアプロファイル検出、カメラごとの自動 D3D11 ハードウェアデコード（CPU フォールバック付）、分離されたキャプチャワーカー。",
        },
        {
          icon: "cpu",
          title: "リージョナル OCR と文字単位の信頼度",
          body: "静止画、MP4/AVI 動画、ライブ RTSP ストリームに対応。文字ごとの信頼度スコア、プレート証拠クロップ、SHA-256 検証済みローカル ONNX モデル。",
        },
        {
          icon: "lock",
          title: "DPAPI ボールトと整合性検証バックアップ",
          body: "カメラ認証情報は DPAPI により実行中の Windows ユーザーアカウントに紐付けられます。SQLite 整合性バックアップと6段階セットアップウィザードを搭載。",
        },
      ],
    },
    steps: {
      eyebrow: "導入ステップ",
      title: "3つのステップでオペレーターコンソールを起動。",
      lead: "セットアップウィザードに従うだけで、管理者パスワードの設定、ONNX モデルの準備、最初のカメラ調整が完了します。",
      items: [
        {
          title: "管理者アクセスの初期設定",
          body: "インストーラーを実行し、初回起動時のウェルカムウィザードで12文字以上の管理者パスワードを作成します。",
        },
        {
          title: "ローカル ONNX モデルの構成",
          body: "設定画面から約15 MB の評価用モデルをダウンロードするか、SHA-256 検証済みの独自 ONNX モデルマニフェストを選択します。",
        },
        {
          title: "ライン調整とライブ OCR の開始",
          body: "許可されたカメラを追加してトリガー線・認識線を保存し、車両レコードを登録してライブダッシュボードから OCR を開始します。",
        },
      ],
      helperText:
        "QtCore DLL エラーが表示される場合は、Microsoft 公式の Visual C++ 再頒布可能パッケージ（x64）をインストールしてから再起動してください。",
      helperLinkLabel: "Microsoft Visual C++ パッケージ",
      helperLinkHref: vcRedistUrl,
    },
    compatibility: {
      eyebrow: "互換性と検証範囲",
      title: "ハードウェア検証と運用上の安全設計。",
      lead: "検証済みのカメラストリーム、コントローラー診断ツール、安全のためのデフォルト制限に関する技術仕様です。",
      cards: [
        {
          title: "ONVIF・D3D11 ストリーム検証",
          body: "IPv4 ONVIF 検出、メディアプロファイル選択、H.264 メイン/サブストリーム、自動 D3D11 ハードウェアデコードは Mercusys MC510 で検証済みです。",
        },
        {
          title: "コントローラー・リレー状態確認",
          body: "読み取り専用の Modbus TCP 単一コイルおよび Shelly RPC ステータス確認ツールを同梱。物理ゲートの開閉出力は安全のためデフォルトで無効化されています。",
        },
        {
          title: "自己完結型ランタイム",
          body: "現在のユーザーアカウントにインストールされ、Python や Node.js、外部データベースの個別導入は不要です。",
        },
      ],
    },
    release: {
      title: "リリース詳細",
      versionLabel: "バージョン",
      platformLabel: "プラットフォーム",
      runtimeLabel: "ランタイム",
      runtimeValue: "自己完結型デスクトップパッケージ",
      installerLabel: "Windows インストーラー (.exe)",
      copyLabel: "SHA-256 をコピー",
      copiedLabel: "コピーしました",
      downloadLabel: "ダウンロード",
      releaseNotesLabel: "GitHub でリリースノートとソースを見る",
    },
    closing: {
      title: "ローカルナンバープレート認識を始めましょう。",
      lead: "自己完結型インストーラーをダウンロードして、マルチカメラのオペレーターコンソールを数分で構築できます。",
      primaryCta: "IPScans LPR Pro をダウンロード",
      secondaryCta: "すべてのアプリケーション",
      note: "ワークステーション上で完全にローカル動作します。SHA-256 でパッケージの整合性を検証可能。",
    },
  },
  ko: {
    metaTitle: "IPScans LPR Pro — 차량 번호판 인식 및 운영자 워크스페이스",
    metaDescription:
      "5개 화면 라이브 운영자 워크스페이스, 독립 보정 라인, 입주자 차량 대장 및 암호화된 이벤트 큐를 갖춘 로컬 번호판 인식 소프트웨어.",
    backToApps: "모든 애플리케이션",
    eyebrow: "차량 번호판 인식 및 출입 통제",
    name: "IPScans LPR Pro",
    headline: "워크스테이션에서 로컬로 실행되는 자율 번호판 인식 및 실시간 게이트 운영.",
    lead:
      "로컬에서 번호판을 판독하고, 멀티 카메라 라이브 월을 관리하며, 독립된 트리거·인식 라인을 보정하고 암호화된 출입 기록으로 입주자 차량 대장을 운영하세요.",
    primaryCta: "설치 프로그램 다운로드",
    secondaryCta: "릴리스 노트 및 소스",
    screenshotAlt: "IPScans LPR Pro 5개 화면 라이브 운영자 워크스페이스",
    screenshotCaption: "실시간 RTSP 스트림, 번호판 크롭 이미지, 출입 검증 기능을 갖춘 5개 패널 운영자 콘솔.",
    capabilities: {
      eyebrow: "핵심 기능",
      title: "주거 단지, 주차 시설 및 통제 구역 게이트를 위해 설계되었습니다.",
      lead:
        "ONVIF 스트림 수집부터 ONNX 문자 인식, SQLite 무결성 백업까지 모든 구성 요소가 클라우드 의존성 없이 로컬에서 작동합니다.",
      items: [
        {
          icon: "monitor",
          title: "5개 화면 라이브 운영자 워크스페이스",
          body: "라이브 대시보드, 카메라, 차량 및 입주자, 이벤트, 설정 화면 제공. 동·호수·입주자 및 다중 소유 차량 대장과 CSV/XLSX 가져오기·내보내기 지원.",
        },
        {
          icon: "activity",
          title: "독립 보정 라인 및 다각형 영역",
          body: "분리된 트리거 및 인식 라인, 직사각형·다각형 영역, 방향 필터, 중복 방지 시간 창, 사유가 기록되는 보정 감사 이력 제공.",
        },
        {
          icon: "shield",
          title: "내구성 있는 암호화 이벤트 전달",
          body: "일시적인 데이터베이스 잠금 시 자동 재시도하는 암호화 로컬 전달 저널. 등록/미등록 상태, 동, 호수, 카메라 및 방향별 필터링 지원.",
        },
        {
          icon: "camera",
          title: "ONVIF 탐색 및 하드웨어 디코딩",
          body: "IPv4 ONVIF 미디어 프로필 탐색, 카메라별 자동 D3D11 하드웨어 디코딩(CPU 폴백 지원) 및 격리된 캡처 워커 프로세스.",
        },
        {
          icon: "cpu",
          title: "지역별 OCR 및 문자별 신뢰도 분석",
          body: "정지 이미지, MP4/AVI 비디오 및 라이브 RTSP 스트림 처리. 문자별 신뢰도 점수, 번호판 증거 크롭, SHA-256 검증 로컬 ONNX 모델.",
        },
        {
          icon: "lock",
          title: "DPAPI 보안 금고 및 검증된 스냅샷",
          body: "카메라 자격 증명은 DPAPI를 통해 활성 Windows 사용자 계정에 바인딩됩니다. 관리자 전용 SQLite 무결성 백업과 6단계 설정 마법사 포함.",
        },
      ],
    },
    steps: {
      eyebrow: "시작하기",
      title: "세 단계로 운영자 콘솔을 구축하세요.",
      lead: "설정 마법사가 관리자 비밀번호 생성, 로컬 ONNX 모델 구성 및 첫 카메라 보정을 안내합니다.",
      items: [
        {
          title: "관리자 액세스 초기화",
          body: "설치 EXE를 실행하고 첫 실행 시 환영 마법사를 통해 12자 이상의 관리자 비밀번호를 생성합니다.",
        },
        {
          title: "로컬 ONNX 인식 모델 구성",
          body: "설정에서 약 15 MB의 평가 모델을 다운로드하거나 SHA-256으로 검증된 자체 ONNX 모델 매니페스트를 선택합니다.",
        },
        {
          title: "카메라 라인 보정 및 라이브 OCR 시작",
          body: "승인된 카메라를 추가하고 트리거·인식 보정 라인을 저장한 뒤 차량 레코드를 생성합니다. 라이브 대시보드에서 OCR을 시작하고 이벤트에서 기록을 확인하세요.",
        },
      ],
      helperText:
        "QtCore DLL 오류가 계속 표시되면 공식 Microsoft Visual C++ 패키지를 설치한 후 애플리케이션을 다시 실행하세요.",
      helperLinkLabel: "Microsoft Visual C++ 패키지",
      helperLinkHref: vcRedistUrl,
    },
    compatibility: {
      eyebrow: "호환성 및 검증 범위",
      title: "하드웨어 검증 및 운영 안전 경계.",
      lead: "테스트된 카메라 스트림, 컨트롤러 상태 진단 도구 및 기본 안전 보호 장치에 대한 기술 안내입니다.",
      cards: [
        {
          title: "ONVIF 및 D3D11 스트림 검증",
          body: "IPv4 ONVIF 탐색, 미디어 프로필 선택, H.264 메인/서브 스트림 및 자동 D3D11 하드웨어 디코딩이 Mercusys MC510에서 검증되었습니다.",
        },
        {
          title: "컨트롤러 및 릴레이 상태 점검",
          body: "읽기 전용 Modbus TCP 단일 코일 및 Shelly RPC 상태 조회 도구가 포함되어 있으며, 물리적 차단기 작동은 안전을 위해 기본적으로 비활성화되어 있습니다.",
        },
        {
          title: "자체 완비형 사용자 런타임",
          body: "현재 사용자 계정에 설치되며 별도의 Python, Node.js 또는 외부 데이터베이스 설치가 필요하지 않습니다.",
        },
      ],
    },
    release: {
      title: "릴리스 세부 정보",
      versionLabel: "버전",
      platformLabel: "플랫폼",
      runtimeLabel: "런타임",
      runtimeValue: "자체 완비형 데스크톱 패키지",
      installerLabel: "Windows 설치 프로그램 (.exe)",
      copyLabel: "SHA-256 복사",
      copiedLabel: "복사됨",
      downloadLabel: "다운로드",
      releaseNotesLabel: "GitHub 릴리스 노트 및 소스",
    },
    closing: {
      title: "로컬 차량 번호판 인식을 시작할 준비가 되셨나요?",
      lead: "자체 완비형 설치 프로그램을 다운로드하고 몇 분 안에 멀티 카메라 운영자 콘솔을 구축하세요.",
      primaryCta: "IPScans LPR Pro 다운로드",
      secondaryCta: "모든 애플리케이션",
      note: "워크스테이션에서 로컬로 작동합니다. SHA-256으로 패키지 무결성을 언제든 검증할 수 있습니다.",
    },
  },
  zh: {
    metaTitle: "IPScans LPR Pro — 车牌识别与操作员工作台",
    metaDescription:
      "配备五面板实时操作员工作台、独立校准线、住户车辆登记库与加密事件队列的本地车牌识别软件。",
    backToApps: "全部应用程序",
    eyebrow: "车牌识别与道闸运营",
    name: "IPScans LPR Pro",
    headline: "在您的本地工作站上实现自主车牌识别与实时道闸值守。",
    lead:
      "本地读取车牌、管理多路实时监控墙、校准独立的触发线与识别线，并通过加密通行日志管理住户车辆登记库。",
    primaryCta: "下载安装程序",
    secondaryCta: "发行说明与源码",
    screenshotAlt: "IPScans LPR Pro 五面板实时操作员工作台与监控墙",
    screenshotCaption: "具备实时 RTSP 视频流、车牌裁剪取证与通行核验的五面板操作员控制台。",
    capabilities: {
      eyebrow: "核心能力",
      title: "专为住宅园区、停车场与受控道闸打造。",
      lead:
        "从 ONVIF 视频流接入到 ONNX 字符识别与 SQLite 完整性快照，所有组件均在本地运行，无需依赖外部云服务。",
      items: [
        {
          icon: "monitor",
          title: "五面板实时操作员工作台",
          body: "涵盖实时看板、摄像头、车辆与住户、通行事件与系统设置。支持楼栋、单元、住户与多车主登记，并提供 CSV/XLSX 导入导出。",
        },
        {
          icon: "activity",
          title: "独立校准线与多边形区域",
          body: "分离的触发线与识别线、矩形及多边形检测区、方向过滤、防重复时间窗、延迟车牌匹配以及带原因记录的修正审计历史。",
        },
        {
          icon: "shield",
          title: "持久化加密事件队列",
          body: "加密的本地投递日志，在数据库短暂锁定时自动重试；支持按登记/未知状态、楼栋、单元、摄像头及方向进行多维筛选。",
        },
        {
          icon: "camera",
          title: "ONVIF 发现与硬件解码",
          body: "有界 IPv4 ONVIF 媒体配置发现、单路摄像头自动 D3D11 硬件解码（支持 CPU 回退）以及隔离的采集工作进程。",
        },
        {
          icon: "cpu",
          title: "区域 OCR 与单字符置信度",
          body: "支持静态图片、MP4/AVI 视频与实时 RTSP 流；提供单字符置信度评分、车牌证据裁剪以及经 SHA-256 校验的本地 ONNX 模型。",
        },
        {
          icon: "lock",
          title: "DPAPI 凭据保险库与校验快照",
          body: "摄像头密码与投递日志通过 DPAPI 绑定至当前 Windows 用户账户。内置管理员专属 SQLite 完整性备份与 6 步设置向导。",
        },
      ],
    },
    steps: {
      eyebrow: "快速上手",
      title: "三步部署您的操作员控制台。",
      lead: "引导式设置向导将协助管理员完成凭据初始化、本地 ONNX 模型加载与首路摄像头校准。",
      items: [
        {
          title: "初始化管理员访问权限",
          body: "运行安装程序。首次启动时，通过欢迎向导创建至少 12 个字符的管理员密码。",
        },
        {
          title: "配置本地 ONNX 识别模型",
          body: "在“设置”中下载约 15 MB 的评估模型，或选择您自己的经 SHA-256 校验的 ONNX 模型清单。",
        },
        {
          title: "校准摄像头线条并启动实时 OCR",
          body: "添加授权摄像头，保存触发线与识别线，创建车辆记录，随后在“实时看板”中启动 OCR 并在“通行事件”中查看记录。",
        },
      ],
      helperText:
        "如果持续出现 QtCore DLL 提示，请安装微软官方 Windows Visual C++ 运行库后重新打开应用。",
      helperLinkLabel: "Microsoft Visual C++ 运行库",
      helperLinkHref: vcRedistUrl,
    },
    compatibility: {
      eyebrow: "兼容性与验证范围",
      title: "硬件验证与运行安全边界。",
      lead: "关于已验证摄像头视频流、控制器状态诊断工具及默认安全保护机制的透明技术说明。",
      cards: [
        {
          title: "ONVIF 与 D3D11 视频流验证",
          body: "IPv4 ONVIF 发现、媒体配置选择、H.264 主/子码流及自动 D3D11 硬件解码已在 Mercusys MC510 硬件上完成验证。",
        },
        {
          title: "控制器与继电器状态检查",
          body: "内置只读的 Modbus TCP 单线圈与 Shelly RPC 状态查询工具；出于安全考虑，物理道闸触发默认保持关闭。",
        },
        {
          title: "自包含用户级运行时",
          body: "安装在当前 Windows 用户账户下，无需额外安装 Python、Node.js 或外部数据库服务。",
        },
      ],
    },
    release: {
      title: "版本详情",
      versionLabel: "版本",
      platformLabel: "平台",
      runtimeLabel: "运行环境",
      runtimeValue: "自包含桌面软件包",
      installerLabel: "Windows 安装程序 (.exe)",
      copyLabel: "复制 SHA-256",
      copiedLabel: "已复制",
      downloadLabel: "下载",
      releaseNotesLabel: "GitHub 发行说明与源码",
    },
    closing: {
      title: "准备好运行本地车牌识别了吗？",
      lead: "下载自包含安装程序，几分钟内即可搭建多路摄像头操作员监控墙。",
      primaryCta: "下载 IPScans LPR Pro",
      secondaryCta: "全部应用程序",
      note: "完全在您的工作站本地运行。可随时通过 SHA-256 校验安装包完整性。",
    },
  },
};
