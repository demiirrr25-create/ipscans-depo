import type { Locale } from "@/i18n/config";

export type DownloadHubCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  learnMore: string;
  downloadInstaller: string;
  platformNote: string;
  apps: {
    scanner: { category: string; valueProp: string; summary: string; screenshotAlt: string };
    ipcast: { category: string; valueProp: string; summary: string; screenshotAlt: string };
    lprPro: { category: string; valueProp: string; summary: string; screenshotAlt: string };
    cortex: { category: string; valueProp: string; summary: string; screenshotAlt: string };
  };
  faq: {
    eyebrow: string;
    title: string;
    lead: string;
    items: { q: string; a: string; code?: string }[];
  };
  webTools: {
    eyebrow: string;
    title: string;
    lead: string;
    openTool: string;
  };
  closing: {
    title: string;
    lead: string;
    primaryCta: string;
    secondaryCta: string;
  };
  shop: {
    eyebrow: string;
    exploreAppsTitle: string;
    exploreAppsLead: string;
    exploreToolsTitle: string;
    exploreToolsLead: string;
    downloadHubCta: string;
  };
};

export const downloadHubCopy: Record<Locale, DownloadHubCopy> = {
  en: {
    eyebrow: "Desktop applications",
    title: "Built for local networks and visual operations.",
    subtitle:
      "Four standalone desktop applications that run directly on your machine with no cloud relays, mandatory accounts, or background telemetry.",
    learnMore: "Learn more",
    downloadInstaller: "Download for Windows",
    platformNote:
      "Designed for 64-bit Windows desktop environments. Full release notes, file sizes, and SHA-256 checksums are listed on each product page.",
    apps: {
      scanner: {
        category: "Network Discovery & Topology",
        valueProp: "Map every device, switch port, and camera on your local subnet in seconds.",
        summary:
          "Asynchronous ARP and ICMP probing, ONVIF camera discovery, deep port auditing, and verified LLDP/CDP switch hierarchy visualization.",
        screenshotAlt: "IPscans+ network scanner and topology view",
      },
      ipcast: {
        category: "Direct Peer-to-Peer Remote Desktop",
        valueProp: "Low-latency screen sharing and file transfer with 9-digit peer addressing.",
        summary:
          "Connect directly across local networks or NAT via STUN/UDP with authenticated encryption, granular session approval, and chunked file transfer.",
        screenshotAlt: "IPCast remote desktop connection workspace",
      },
      lprPro: {
        category: "License Plate Recognition",
        valueProp: "Local plate OCR, multi-camera live wall, and resident vehicle registry for gates.",
        summary:
          "Five-pane operator console with independent trigger and recognition lines, ONVIF stream discovery, local ONNX plate recognition, and encrypted passage logs.",
        screenshotAlt: "IPScans LPR Pro live operator console",
      },
      cortex: {
        category: "Local Camera Vision & Event Rules",
        valueProp: "Turn standard RTSP cameras into a local event engine with automatic video evidence.",
        summary:
          "Twelve model-free visual rules and twelve optional local Gemma vision templates with 12-second post-trigger video archiving and webhook delivery.",
        screenshotAlt: "IPScans Cortex multi-camera rule and event console",
      },
    },
    faq: {
      eyebrow: "Installation & verification",
      title: "Verifying and installing IPScans desktop builds.",
      lead:
        "Every installer and portable executable is published directly from our release repository with a public SHA-256 digest.",
      items: [
        {
          q: "How do I verify the SHA-256 checksum on Windows?",
          a: "Before running an installer, open PowerShell in your Downloads folder and compare the output hash against the SHA-256 digest listed in the product's release details.",
          code: "Get-FileHash .\\<installer-file>.exe -Algorithm SHA256",
        },
        {
          q: "Why does Windows SmartScreen show an unknown publisher prompt?",
          a: "Some builds are distributed without a commercial EV code-signing certificate. If Windows Defender SmartScreen appears, verify the SHA-256 hash matches the official release page, then select More info and Run anyway.",
        },
        {
          q: "Do I need to install Python, .NET, or database servers separately?",
          a: "No. Every IPScans desktop application ships as a self-contained runtime with its required libraries bundled. Optional local AI models can be configured inside the app when needed.",
        },
        {
          q: "Does any application send scan results or camera feeds to the cloud?",
          a: "No. All network discovery, remote desktop streams, plate OCR, and camera event rules execute locally on your workstation.",
        },
      ],
    },
    webTools: {
      eyebrow: "Browser diagnostics",
      title: "Need instant network checks without installing an app?",
      lead: "Run IP geolocation, DNS record lookups, WHOIS queries, port checks, and speed tests right in your browser.",
      openTool: "Open tool",
    },
    closing: {
      title: "Start with IPscans+ for complete local subnet visibility.",
      lead: "Discover every active host, inspect open services, and map your network topology in one click.",
      primaryCta: "Download IPscans+",
      secondaryCta: "Explore IPscans+",
    },
    shop: {
      eyebrow: "Hardware & deployment",
      exploreAppsTitle: "Available now: Desktop software suite",
      exploreAppsLead: "While we prepare our hardware catalog, all four IPScans desktop applications are available to download.",
      exploreToolsTitle: "Instant browser diagnostics",
      exploreToolsLead: "Test connectivity, inspect DNS and WHOIS records, or measure bandwidth directly from your browser.",
      downloadHubCta: "View all desktop apps",
    },
  },
  tr: {
    eyebrow: "Masaüstü uygulamaları",
    title: "Yerel ağlar ve görsel operasyonlar için geliştirildi.",
    subtitle:
      "Bulut aktarımına, zorunlu hesaplara veya arka plan telemetrisine ihtiyaç duymadan doğrudan bilgisayarınızda çalışan dört bağımsız masaüstü uygulaması.",
    learnMore: "Detayları incele",
    downloadInstaller: "Windows için indir",
    platformNote:
      "64-bit Windows masaüstü ortamları için tasarlanmıştır. Sürüm notları, dosya boyutları ve SHA-256 özetleri her ürünün kendi sayfasında yer alır.",
    apps: {
      scanner: {
        category: "Ağ Keşfi ve Topoloji",
        valueProp: "Yerel alt ağınızdaki her cihazı, anahtar portunu ve kamerayı saniyeler içinde haritalayın.",
        summary:
          "Asenkron ARP ve ICMP taraması, ONVIF kamera keşfi, kapsamlı port denetimi ve doğrulanmış LLDP/CDP anahtar hiyerarşisi görselleştirmesi.",
        screenshotAlt: "IPscans+ ağ tarayıcı ve topoloji görünümü",
      },
      ipcast: {
        category: "Doğrudan P2P Uzak Masaüstü",
        valueProp: "9 haneli cihaz adresiyle düşük gecikmeli ekran paylaşımı ve dosya aktarımı.",
        summary:
          "STUN/UDP üzerinden kimlik doğrulamalı şifreleme, oturum bazlı erişim onayı ve parçalı dosya aktarımı ile doğrudan bağlantı kurun.",
        screenshotAlt: "IPCast uzak masaüstü bağlantı ekranı",
      },
      lprPro: {
        category: "Plaka Tanıma ve Operatör Konsolu",
        valueProp: "Bariyer ve otoparklar için yerel plaka okuma, canlı kamera duvarı ve sakin araç kütüğü.",
        summary:
          "Bağımsız tetik ve okuma çizgileri, ONVIF akış keşfi, yerel ONNX plaka tanıma ve şifreli geçiş kayıtlarıyla 5 bölmeli operatör konsolu.",
        screenshotAlt: "IPScans LPR Pro canlı operatör konsolu",
      },
      cortex: {
        category: "Yerel Kamera Görsel AI ve Kural Motoru",
        valueProp: "Standart RTSP kameraları otomatik video kanıtı üreten yerel bir olay motoruna dönüştürün.",
        summary:
          "12 model-bağımsız görsel kural ve 12 isteğe bağlı yerel Gemma görsel şablonu; olay sonrası 12 saniyelik video arşivi ve webhook bildirimi.",
        screenshotAlt: "IPScans Cortex çoklu kamera kural ve olay konsolu",
      },
    },
    faq: {
      eyebrow: "Kurulum ve doğrulama",
      title: "IPScans masaüstü paketlerini doğrulama ve kurma.",
      lead:
        "Her kurulum paketi ve taşınabilir yürütülebilir dosya, açık SHA-256 özetiyle doğrudan sürüm depomuzdan yayımlanır.",
      items: [
        {
          q: "Windows üzerinde SHA-256 özetini nasıl doğrularım?",
          a: "Kurulum dosyasını çalıştırmadan önce İndirilenler klasöründe PowerShell'i açın ve üretilen özeti ürün sayfasındaki SHA-256 değeriyle karşılaştırın.",
          code: "Get-FileHash .\\<kurulum-dosyasi>.exe -Algorithm SHA256",
        },
        {
          q: "Windows SmartScreen neden bilinmeyen yayıncı uyarısı gösteriyor?",
          a: "Bazı sürümler ticari EV kod imzalama sertifikası olmadan dağıtılmaktadır. SmartScreen uyarısı görürseniz SHA-256 özetini resmi sürüm sayfasıyla doğruladıktan sonra Ek bilgi ve Yine de çalıştır adımlarını izleyin.",
        },
        {
          q: "Ayrıca Python, .NET veya veritabanı sunucusu kurmam gerekir mi?",
          a: "Hayır. Tüm IPScans masaüstü uygulamaları gerekli çalışma zamanı kütüphanelerini kendi içinde barındırır. İsteğe bağlı yerel yapay zekâ modelleri uygulama içinden yapılandırılabilir.",
        },
        {
          q: "Uygulamalar tarama sonuçlarını veya kamera görüntülerini buluta gönderir mi?",
          a: "Hayır. Ağ keşfi, uzak masaüstü akışları, plaka okuma ve kamera kural değerlendirmelerinin tamamı yerel iş istasyonunuzda çalışır.",
        },
      ],
    },
    webTools: {
      eyebrow: "Tarayıcı tanı araçları",
      title: "Kurulum yapmadan anında ağ kontrolüne mi ihtiyacınız var?",
      lead: "IP konum sorgulama, DNS kayıtları, WHOIS, port kontrolü ve hız testini doğrudan tarayıcınızda çalıştırın.",
      openTool: "Aracı aç",
    },
    closing: {
      title: "Tam yerel alt ağ görünürlüğü için IPscans+ ile başlayın.",
      lead: "Tüm aktif cihazları keşfedin, açık servisleri denetleyin ve ağ topolojinizi tek tıklamayla görüntüleyin.",
      primaryCta: "IPscans+'ı İndir",
      secondaryCta: "IPscans+'ı Keşfet",
    },
    shop: {
      eyebrow: "Donanım ve kurulum",
      exploreAppsTitle: "Şu anda kullanımda: Masaüstü yazılım paketi",
      exploreAppsLead: "Donanım mağazamız hazırlanırken dört IPScans masaüstü uygulamasının tamamını hemen indirebilirsiniz.",
      exploreToolsTitle: "Anında tarayıcı tanı araçları",
      exploreToolsLead: "Bağlantıyı test edin, DNS ve WHOIS kayıtlarını inceleyin veya bant genişliğinizi doğrudan tarayıcıdan ölçün.",
      downloadHubCta: "Tüm masaüstü uygulamaları",
    },
  },
  de: {
    eyebrow: "Desktop-Anwendungen",
    title: "Entwickelt für lokale Netzwerke und visuelle Abläufe.",
    subtitle:
      "Vier eigenständige Desktop-Anwendungen, die direkt auf Ihrem System laufen – ohne Cloud-Relais, Pflichtkonten oder Hintergrund-Telemetrie.",
    learnMore: "Mehr erfahren",
    downloadInstaller: "Für Windows herunterladen",
    platformNote:
      "Entwickelt für 64-Bit-Windows-Umgebungen. VollständigeVersionshinweise, Dateigrößen und SHA-256-Prüfsummen finden Sie auf der jeweiligen Produktseite.",
    apps: {
      scanner: {
        category: "Netzwerkerkennung & Topologie",
        valueProp: "Erfassen Sie jedes Gerät, jeden Switch-Port und jede Kamera in Ihrem Subnetz in Sekunden.",
        summary:
          "Asynchrone ARP- und ICMP-Scans, ONVIF-Kameraerkennung, Port-Analyse sowie verifizierte LLDP/CDP-Topologiekarten.",
        screenshotAlt: "IPscans+ Netzwerkscanner und Topologieansicht",
      },
      ipcast: {
        category: "Direkter P2P-Fernzugriff",
        valueProp: "Bildschirmfreigabe und Dateitransfer mit niedriger Latenz über 9-stellige Gerätecodes.",
        summary:
          "Direkte Verbindungen über STUN/UDP mit authentifizierter Verschlüsselung, Sitzungsfreigabe und paketweiser Dateiübertragung.",
        screenshotAlt: "IPCast Remote-Desktop-Arbeitsbereich",
      },
      lprPro: {
        category: "Kennzeichenerkennung",
        valueProp: "Lokale Kennzeichen-OCR, Live-Kamerawand und Fahrzeugregister für Zufahrten.",
        summary:
          "Fünfteilige Bedienoberfläche mit separaten Trigger- und Erkennungslinien, ONVIF-Erkennung, lokaler ONNX-OCR und verschlüsseltem Ereignisprotokoll.",
        screenshotAlt: "IPScans LPR Pro Live-Bedienkonsole",
      },
      cortex: {
        category: "Lokale Kamera-KI & Regel-Engine",
        valueProp: "Verwandeln Sie RTSP-Kameras in eine lokale Ereignis-Engine mit automatischer Videobeweissicherung.",
        summary:
          "Zwölf modellfreie Regeln und zwölf optionale lokale Gemma-Vision-Vorlagen mit 12-Sekunden-Videoclips und Webhook-Benachrichtigungen.",
        screenshotAlt: "IPScans Cortex Multikamera- und Regelkonsole",
      },
    },
    faq: {
      eyebrow: "Installation & Verifizierung",
      title: "IPScans Desktop-Pakete prüfen und installieren.",
      lead:
        "Jedes Installationsprogramm und jede portable EXE wird direkt mit einer öffentlichen SHA-256-Prüfsumme veröffentlicht.",
      items: [
        {
          q: "Wie überprüfe ich die SHA-256-Prüfsumme unter Windows?",
          a: "Öffnen Sie PowerShell im Download-Ordner und vergleichen Sie den ausgegebenen Hash-Wert mit der SHA-256-Angabe in den Versionsdetails des Produkts.",
          code: "Get-FileHash .\\<installer-file>.exe -Algorithm SHA256",
        },
        {
          q: "Warum zeigt Windows SmartScreen einen Hinweis auf einen unbekannten Herausgeber?",
          a: "Einige Pakete werden ohne kommerzielles EV-Zertifikat verteilt. Prüfen Sie die SHA-256-Prüfsumme anhand der Produktseite und wählen Sie anschließend Weitere Informationen und Trotzdem ausführen.",
        },
        {
          q: "Muss ich Python, .NET oder Datenbanken separat installieren?",
          a: "Nein. Alle IPScans-Anwendungen bringen ihre benötigte Laufzeitumgebung vollständig mit. Optionale lokale KI-Modelle lassen sich direkt in der Anwendung einrichten.",
        },
        {
          q: "Werden Scan-Ergebnisse oder Kamerabilder in die Cloud übertragen?",
          a: "Nein. Netzwerkerkennung, Fernzugriff, Kennzeichenerkennung und Videoanalyse erfolgen vollständig lokal auf Ihrem Rechner.",
        },
      ],
    },
    webTools: {
      eyebrow: "Browser-Diagnose",
      title: "Sofortige Netzwerkprüfung ohne Installation?",
      lead: "IP-Abfrage, DNS-Einträge, WHOIS, Port-Prüfung und Geschwindigkeitstest direkt im Browser ausführen.",
      openTool: "Tool öffnen",
    },
    closing: {
      title: "Starten Sie mit IPscans+ für vollständige Transparenz im lokalen Subnetz.",
      lead: "Erkennen Sie aktive Hosts, prüfen Sie offene Dienste und visualisieren Sie Ihre Netzwerktopologie mit einem Klick.",
      primaryCta: "IPscans+ herunterladen",
      secondaryCta: "IPscans+ entdecken",
    },
    shop: {
      eyebrow: "Hardware & Bereitstellung",
      exploreAppsTitle: "Jetzt verfügbar: Desktop-Software-Suite",
      exploreAppsLead: "Während wir unseren Hardware-Shop vorbereiten, stehen alle vier IPScans-Desktop-Anwendungen zum Download bereit.",
      exploreToolsTitle: "Sofortige Browser-Diagnose",
      exploreToolsLead: "Testen Sie Verbindungen, prüfen Sie DNS- und WHOIS-Einträge oder messen Sie Ihre Bandbreite direkt im Browser.",
      downloadHubCta: "Alle Desktop-Apps ansehen",
    },
  },
  es: {
    eyebrow: "Aplicaciones de escritorio",
    title: "Diseñadas para redes locales y operaciones visuales.",
    subtitle:
      "Cuatro aplicaciones de escritorio independientes que se ejecutan directamente en su equipo sin retransmisión en la nube, cuentas obligatorias ni telemetría.",
    learnMore: "Más información",
    downloadInstaller: "Descargar para Windows",
    platformNote:
      "Diseñado para entornos Windows de 64 bits. Las notas de versión, tamaños de archivo y sumas SHA-256 se detallan en la página de cada producto.",
    apps: {
      scanner: {
        category: "Descubrimiento de red y topología",
        valueProp: "Mapee cada dispositivo, puerto de switch y cámara en su subred local en segundos.",
        summary:
          "Sondeo asíncrono ARP e ICMP, descubrimiento de cámaras ONVIF, auditoría de puertos y visualización jerárquica LLDP/CDP.",
        screenshotAlt: "Vista de topología y escáner de red IPscans+",
      },
      ipcast: {
        category: "Escritorio remoto P2P directo",
        valueProp: "Uso compartido de pantalla y transferencia de archivos de baja latencia con código de 9 dígitos.",
        summary:
          "Conexión directa mediante STUN/UDP con cifrado autenticado, aprobación de acceso por sesión y envío de archivos fragmentados.",
        screenshotAlt: "Consola de conexión remota IPCast",
      },
      lprPro: {
        category: "Reconocimiento de matrículas",
        valueProp: "OCR local de matrículas, muro de cámaras en vivo y padrón de vehículos para accesos.",
        summary:
          "Consola de operador de cinco paneles con líneas independientes de disparo y lectura, descubrimiento ONVIF, OCR local en ONNX y registro cifrado.",
        screenshotAlt: "Consola de operador en vivo IPScans LPR Pro",
      },
      cortex: {
        category: "Visión local y motor de reglas",
        valueProp: "Convierta cámaras RTSP estándar en un motor local de eventos con evidencia en vídeo automática.",
        summary:
          "Doce reglas visuales sin modelo y doce plantillas locales opcionales con Gemma, clips de evidencia de 12 segundos y webhooks HTTPS.",
        screenshotAlt: "Consola multicámara de reglas y eventos IPScans Cortex",
      },
    },
    faq: {
      eyebrow: "Instalación y verificación",
      title: "Cómo verificar e instalar las aplicaciones de escritorio IPScans.",
      lead:
        "Cada instalador y ejecutable portátil se publica directamente desde nuestro repositorio oficial con su huella SHA-256.",
      items: [
        {
          q: "¿Cómo verifico la suma SHA-256 en Windows?",
          a: "Antes de ejecutar el instalador, abra PowerShell en su carpeta de Descargas y compare el hash resultante con el SHA-256 indicado en los detalles de la versión.",
          code: "Get-FileHash .\\<installer-file>.exe -Algorithm SHA256",
        },
        {
          q: "¿Por qué Windows SmartScreen muestra un aviso de editor desconocido?",
          a: "Algunas compilaciones se distribuyen sin certificado comercial EV. Verifique que el hash SHA-256 coincida con la página oficial y luego seleccione Más información y Ejecutar de todas formas.",
        },
        {
          q: "¿Necesito instalar Python, .NET o servidores de bases de datos por separado?",
          a: "No. Cada aplicación incluye su propio entorno de ejecución autocontenido. Los modelos locales de IA opcionales se configuran desde la propia aplicación.",
        },
        {
          q: "¿Las aplicaciones envían escaneos o vídeo de cámaras a la nube?",
          a: "No. Todo el descubrimiento de red, sesiones remotas, lectura de matrículas y reglas visuales se procesa localmente en su estación de trabajo.",
        },
      ],
    },
    webTools: {
      eyebrow: "Diagnóstico en el navegador",
      title: "¿Necesita comprobaciones de red instantáneas sin instalar nada?",
      lead: "Ejecute consultas de IP, registros DNS, WHOIS, verificación de puertos y test de velocidad directamente en el navegador.",
      openTool: "Abrir herramienta",
    },
    closing: {
      title: "Comience con IPscans+ para obtener visibilidad completa de su subred local.",
      lead: "Descubra cada host activo, inspeccione servicios abiertos y visualice la topología de su red con un clic.",
      primaryCta: "Descargar IPscans+",
      secondaryCta: "Explorar IPscans+",
    },
    shop: {
      eyebrow: "Hardware e implementación",
      exploreAppsTitle: "Disponible ahora: Suite de software de escritorio",
      exploreAppsLead: "Mientras preparamos nuestro catálogo de hardware, las cuatro aplicaciones de escritorio de IPScans están disponibles para descargar.",
      exploreToolsTitle: "Diagnóstico instantáneo en el navegador",
      exploreToolsLead: "Pruebe la conectividad, consulte registros DNS y WHOIS o mida su velocidad directamente desde el navegador.",
      downloadHubCta: "Ver todas las aplicaciones",
    },
  },
  fr: {
    eyebrow: "Applications de bureau",
    title: "Conçues pour les réseaux locaux et les opérations visuelles.",
    subtitle:
      "Quatre applications de bureau autonomes qui s'exécutent directement sur votre poste, sans relais cloud, compte obligatoire ni télémétrie.",
    learnMore: "En savoir plus",
    downloadInstaller: "Télécharger pour Windows",
    platformNote:
      "Conçu pour les environnements Windows 64 bits. Les notes de version, tailles de fichiers et empreintes SHA-256 figurent sur chaque page produit.",
    apps: {
      scanner: {
        category: "Découverte réseau & topologie",
        valueProp: "Cartographiez chaque appareil, port de commutateur et caméra de votre sous-réseau en quelques secondes.",
        summary:
          "Sondes ARP et ICMP asynchrones, découverte ONVIF, audit des ports ouverts et visualisation hiérarchique LLDP/CDP.",
        screenshotAlt: "Scanner réseau et vue topologique IPscans+",
      },
      ipcast: {
        category: "Bureau à distance P2P direct",
        valueProp: "Partage d'écran à faible latence et transfert de fichiers via un identifiant à 9 chiffres.",
        summary:
          "Connexion directe via STUN/UDP avec chiffrement authentifié, approbation de session et transfert de fichiers segmenté.",
        screenshotAlt: "Console de connexion bureau à distance IPCast",
      },
      lprPro: {
        category: "Lecture automatique de plaques",
        valueProp: "OCR local de plaques, mur vidéo multi-caméras et registre de véhicules pour accès et parkings.",
        summary:
          "Console opérateur en cinq volets avec lignes de déclenchement et de lecture indépendantes, découverte ONVIF, OCR ONNX local et journal chiffré.",
        screenshotAlt: "Console opérateur en direct IPScans LPR Pro",
      },
      cortex: {
        category: "Vision caméra locale & moteur de règles",
        valueProp: "Transformez vos caméras RTSP en moteur d'événements local avec preuves vidéo automatiques.",
        summary:
          "Douze règles visuelles sans modèle et douze modèles locaux Gemma optionnels avec clips vidéo de 12 secondes et webhooks HTTPS.",
        screenshotAlt: "Console multi-caméras et règles IPScans Cortex",
      },
    },
    faq: {
      eyebrow: "Installation & vérification",
      title: "Vérifier et installer les applications IPScans.",
      lead:
        "Chaque installateur et exécutable portable est publié directement depuis notre dépôt avec une empreinte SHA-256 publique.",
      items: [
        {
          q: "Comment vérifier l'empreinte SHA-256 sur Windows ?",
          a: "Avant de lancer l'installateur, ouvrez PowerShell dans votre dossier Téléchargements et comparez le hachage obtenu avec la valeur SHA-256 indiquée dans les détails de version.",
          code: "Get-FileHash .\\<installer-file>.exe -Algorithm SHA256",
        },
        {
          q: "Pourquoi Windows SmartScreen affiche-t-il un avertissement d'éditeur inconnu ?",
          a: "Certaines versions sont distribuées sans certificat commercial EV. Vérifiez la correspondance de l'empreinte SHA-256 sur la page produit, puis cliquez sur Informations complémentaires et Exécuter quand même.",
        },
        {
          q: "Dois-je installer Python, .NET ou une base de données séparément ?",
          a: "Non. Chaque application embarque son propre environnement d'exécution autonome. Les modèles IA locaux optionnels se configurent directement dans l'interface.",
        },
        {
          q: "Les applications envoient-elles des données réseau ou des flux vidéo vers le cloud ?",
          a: "Non. La découverte réseau, le bureau à distance, l'OCR de plaques et l'analyse vidéo s'exécutent intégralement en local sur votre machine.",
        },
      ],
    },
    webTools: {
      eyebrow: "Diagnostics navigateur",
      title: "Besoin d'une vérification réseau instantanée sans installation ?",
      lead: "Exécutez des recherches IP, DNS, WHOIS, vérifications de ports et tests de débit directement dans votre navigateur.",
      openTool: "Ouvrir l'outil",
    },
    closing: {
      title: "Commencez avec IPscans+ pour une visibilité complète de votre sous-réseau.",
      lead: "Détectez chaque hôte actif, inspectez les services ouverts et visualisez votre topologie réseau en un clic.",
      primaryCta: "Télécharger IPscans+",
      secondaryCta: "Découvrir IPscans+",
    },
    shop: {
      eyebrow: "Matériel & déploiement",
      exploreAppsTitle: "Disponible dès maintenant : Suite logicielle de bureau",
      exploreAppsLead: "Pendant la préparation de notre boutique matérielle, les quatre applications de bureau IPScans sont disponibles au téléchargement.",
      exploreToolsTitle: "Outils de diagnostic en ligne",
      exploreToolsLead: "Testez votre connexion, consultez les enregistrements DNS et WHOIS ou mesurez votre débit depuis votre navigateur.",
      downloadHubCta: "Voir toutes les applications",
    },
  },
  it: {
    eyebrow: "Applicazioni desktop",
    title: "Progettate per reti locali e operazioni visive.",
    subtitle:
      "Quattro applicazioni desktop autonome che vengono eseguite direttamente sul tuo computer senza relay cloud, account obbligatori o telemetria.",
    learnMore: "Scopri di più",
    downloadInstaller: "Scarica per Windows",
    platformNote:
      "Progettato per ambienti desktop Windows a 64 bit. Note di rilascio, dimensioni dei file e checksum SHA-256 sono disponibili nella pagina di ciascun prodotto.",
    apps: {
      scanner: {
        category: "Rilevamento di rete e topologia",
        valueProp: "Mappa ogni dispositivo, porta switch e telecamera nella tua sottorete locale in pochi secondi.",
        summary:
          "Scansione asincrona ARP e ICMP, rilevamento telecamere ONVIF, verifica delle porte e mappa gerarchica LLDP/CDP.",
        screenshotAlt: "Scanner di rete e vista topologia IPscans+",
      },
      ipcast: {
        category: "Desktop remoto P2P diretto",
        valueProp: "Condivisione schermo a bassa latenza e trasferimento file tramite codice dispositivo a 9 cifre.",
        summary:
          "Connessione diretta tramite STUN/UDP con crittografia autenticata, approvazione della sessione e invio file a blocchi.",
        screenshotAlt: "Area di lavoro desktop remoto IPCast",
      },
      lprPro: {
        category: "Riconoscimento targhe",
        valueProp: "OCR targhe locale, parete video multi-camera e registro veicoli residenti per varchi.",
        summary:
          "Console operatore a cinque pannelli con linee di attivazione e lettura indipendenti, scoperta ONVIF, OCR ONNX locale e registro eventi crittografato.",
        screenshotAlt: "Console operatore live IPScans LPR Pro",
      },
      cortex: {
        category: "Visione locale e motore di regole",
        valueProp: "Trasforma le telecamere RTSP in un motore di eventi locale con prove video automatiche.",
        summary:
          "Dodici regole visive senza modello e dodici modelli locali Gemma opzionali con clip di prova da 12 secondi e webhook HTTPS.",
        screenshotAlt: "Console multi-camera di regole ed eventi IPScans Cortex",
      },
    },
    faq: {
      eyebrow: "Installazione e verifica",
      title: "Verificare e installare i pacchetti desktop IPScans.",
      lead:
        "Ogni programma di installazione ed eseguibile portatile è pubblicato direttamente dal nostro repository con un digest SHA-256 pubblico.",
      items: [
        {
          q: "Come verifico il checksum SHA-256 su Windows?",
          a: "Prima di avviare l'installer, apri PowerShell nella cartella Download e confronta l'hash generato con il valore SHA-256 riportato nei dettagli di rilascio del prodotto.",
          code: "Get-FileHash .\\<installer-file>.exe -Algorithm SHA256",
        },
        {
          q: "Perché Windows SmartScreen mostra un avviso di autore sconosciuto?",
          a: "Alcuni pacchetti sono distribuiti senza certificato commerciale EV. Verifica che l'hash SHA-256 corrisponda alla pagina ufficiale, quindi seleziona Ulteriori informazioni e Esegui comunque.",
        },
        {
          q: "Devo installare Python, .NET o database separatamente?",
          a: "No. Ogni applicazione desktop IPScans include un runtime autonomo completo. I modelli IA locali opzionali possono essere configurati direttamente nell'app.",
        },
        {
          q: "Le applicazioni inviano risultati di scansione o flussi video al cloud?",
          a: "No. Rilevamento di rete, desktop remoto, OCR targhe e analisi video vengono eseguiti interamente in locale sulla tua postazione.",
        },
      ],
    },
    webTools: {
      eyebrow: "Diagnostica nel browser",
      title: "Servono controlli di rete immediati senza installazione?",
      lead: "Esegui ricerca IP, controllo DNS, WHOIS, verifica porte e test di velocità direttamente nel browser.",
      openTool: "Apri strumento",
    },
    closing: {
      title: "Inizia con IPscans+ per una visibilità completa della sottorete locale.",
      lead: "Rileva ogni host attivo, ispeziona i servizi aperti e mappa la topologia di rete con un clic.",
      primaryCta: "Scarica IPscans+",
      secondaryCta: "Esplora IPscans+",
    },
    shop: {
      eyebrow: "Hardware e installazione",
      exploreAppsTitle: "Disponibile ora: Suite software desktop",
      exploreAppsLead: "Mentre prepariamo il catalogo hardware, tutte e quattro le applicazioni desktop IPScans sono disponibili per il download.",
      exploreToolsTitle: "Diagnostica immediata nel browser",
      exploreToolsLead: "Testa la connettività, consulta i record DNS e WHOIS o misura la velocità direttamente dal browser.",
      downloadHubCta: "Vedi tutte le app desktop",
    },
  },
  pt: {
    eyebrow: "Aplicações de ambiente de trabalho",
    title: "Construídas para redes locais e operações visuais.",
    subtitle:
      "Quatro aplicações autónomas que funcionam diretamente no seu computador sem retransmissão na nuvem, contas obrigatórias ou telemetria.",
    learnMore: "Saber mais",
    downloadInstaller: "Descarregar para Windows",
    platformNote:
      "Concebido para ambientes Windows de 64 bits. As notas de lançamento, tamanhos de ficheiro e somas SHA-256 encontram-se na página de cada produto.",
    apps: {
      scanner: {
        category: "Descoberta de rede e topologia",
        valueProp: "Mapeie cada dispositivo, porta de switch e câmara na sua sub-rede local em segundos.",
        summary:
          "Sondagem assíncrona ARP e ICMP, descoberta de câmaras ONVIF, auditoria de portas e visualização hierárquica LLDP/CDP.",
        screenshotAlt: "Vista de topologia e analisador de rede IPscans+",
      },
      ipcast: {
        category: "Ambiente de trabalho remoto P2P",
        valueProp: "Partilha de ecrã de baixa latência e transferência de ficheiros com código de 9 dígitos.",
        summary:
          "Ligação direta via STUN/UDP com encriptação autenticada, aprovação por sessão e transferência de ficheiros segmentada.",
        screenshotAlt: "Consola de ligação remota IPCast",
      },
      lprPro: {
        category: "Reconhecimento de matrículas",
        valueProp: "OCR local de matrículas, mural de vídeo multicâmara e registo de veículos para portarias.",
        summary:
          "Consola de operador de cinco painéis com linhas de disparo e leitura independentes, descoberta ONVIF, OCR ONNX local e registo encriptado.",
        screenshotAlt: "Consola de operador em direto IPScans LPR Pro",
      },
      cortex: {
        category: "Visão local e motor de regras",
        valueProp: "Transforme câmaras RTSP num motor de eventos local com provas de vídeo automáticas.",
        summary:
          "Doze regras visuais sem modelo e doze modelos locais Gemma opcionais com clips de vídeo de 12 segundos e webhooks HTTPS.",
        screenshotAlt: "Consola multicâmara de regras e eventos IPScans Cortex",
      },
    },
    faq: {
      eyebrow: "Instalação e verificação",
      title: "Verificar e instalar aplicações IPScans.",
      lead:
        "Cada instalador e executável portátil é publicado diretamente a partir do nosso repositório com um resumo SHA-256 público.",
      items: [
        {
          q: "Como verifico a soma SHA-256 no Windows?",
          a: "Antes de executar o instalador, abra o PowerShell na pasta Transferências e compare o hash obtido com o valor SHA-256 indicado nos detalhes da versão.",
          code: "Get-FileHash .\\<installer-file>.exe -Algorithm SHA256",
        },
        {
          q: "Porque é que o Windows SmartScreen mostra um aviso de editor desconhecido?",
          a: "Algumas compilações são distribuídas sem certificado comercial EV. Confirme que o hash SHA-256 coincide com a página oficial e selecione Mais informações e Executar mesmo assim.",
        },
        {
          q: "Preciso de instalar Python, .NET ou bases de dados em separado?",
          a: "Não. Todas as aplicações incluem um ambiente de execução autónomo. Os modelos locais de IA opcionais podem ser configurados na própria aplicação.",
        },
        {
          q: "As aplicações enviam resultados de análise ou vídeo para a nuvem?",
          a: "Não. Toda a descoberta de rede, sessões remotas, leitura de matrículas e análise de vídeo ocorre localmente no seu computador.",
        },
      ],
    },
    webTools: {
      eyebrow: "Diagnóstico no navegador",
      title: "Precisa de verificações de rede imediatas sem instalar nada?",
      lead: "Execute consultas de IP, DNS, WHOIS, verificação de portas e teste de velocidade diretamente no navegador.",
      openTool: "Abrir ferramenta",
    },
    closing: {
      title: "Comece com o IPscans+ para visibilidade completa da sua sub-rede local.",
      lead: "Descubra cada anfitrião ativo, inspecione serviços abertos e mapeie a topologia da rede com um clique.",
      primaryCta: "Descarregar IPscans+",
      secondaryCta: "Explorar IPscans+",
    },
    shop: {
      eyebrow: "Hardware e implementação",
      exploreAppsTitle: "Disponível agora: Suite de software para computador",
      exploreAppsLead: "Enquanto preparamos a nossa loja de hardware, as quatro aplicações de ambiente de trabalho IPScans estão disponíveis para transferência.",
      exploreToolsTitle: "Diagnóstico imediato no navegador",
      exploreToolsLead: "Teste a conectividade, consulte registos DNS e WHOIS ou meça a largura de banda diretamente no navegador.",
      downloadHubCta: "Ver todas as aplicações",
    },
  },
  nl: {
    eyebrow: "Desktopapplicaties",
    title: "Gebouwd voor lokale netwerken en visuele operaties.",
    subtitle:
      "Vier zelfstandige desktopapplicaties die rechtstreeks op uw systeem draaien zonder cloudrelays, verplichte accounts of achtergrondtelemetrie.",
    learnMore: "Meer informatie",
    downloadInstaller: "Downloaden voor Windows",
    platformNote:
      "Ontworpen voor 64-bits Windows-omgevingen. Volledige release-opmerkingen, bestandsgroottes en SHA-256-controlesommen staan op elke productpagina.",
    apps: {
      scanner: {
        category: "Netwerkdetectie & topologie",
        valueProp: "Breng elk apparaat, elke switchpoort en camera in uw lokale subnet binnen seconden in kaart.",
        summary:
          "Asynchrone ARP- en ICMP-scans, ONVIF-cameradetectie, poortcontrole en geverifieerde LLDP/CDP-switchtopologie.",
        screenshotAlt: "IPscans+ netwerkscanner en topologieweergave",
      },
      ipcast: {
        category: "Direct P2P extern bureaublad",
        valueProp: "Schermdeling met lage latentie en bestandsoverdracht via een 9-cijferige apparaatcode.",
        summary:
          "Maak rechtstreeks verbinding via STUN/UDP met geauthenticeerde versleuteling, sessiegoedkeuring en bestandsoverdracht in delen.",
        screenshotAlt: "IPCast extern bureaublad-werkruimte",
      },
      lprPro: {
        category: "Kentekenherkenning",
        valueProp: "Lokale kenteken-OCR, live camerawand en voertuigregister voor slagbomen en parkeerterreinen.",
        summary:
          "Bedieningsconsole met vijf panelen, onafhankelijke trigger- en herkenningslijnen, ONVIF-detectie, lokale ONNX-OCR en versleuteld logboek.",
        screenshotAlt: "IPScans LPR Pro live bedieningsconsole",
      },
      cortex: {
        category: "Lokale camera-AI & regelengine",
        valueProp: "Verander standaard RTSP-camera's in een lokale event-engine met automatisch videobewijs.",
        summary:
          "Twaalf modelvrije regels en twaalf optionele lokale Gemma-visiesjablonen met videoclips van 12 seconden en HTTPS-webhooks.",
        screenshotAlt: "IPScans Cortex multicamera- en regelconsole",
      },
    },
    faq: {
      eyebrow: "Installatie & verificatie",
      title: "IPScans-desktoppakketten controleren en installeren.",
      lead:
        "Elk installatieprogramma en draagbaar uitvoerbaar bestand wordt rechtstreeks gepubliceerd met een openbare SHA-256-controlesom.",
      items: [
        {
          q: "Hoe controleer ik de SHA-256-controlesom op Windows?",
          a: "Open PowerShell in uw map Downloads voordat u het installatieprogramma start en vergelijk de hash met de SHA-256-waarde op de productpagina.",
          code: "Get-FileHash .\\<installer-file>.exe -Algorithm SHA256",
        },
        {
          q: "Waarom toont Windows SmartScreen een melding over een onbekende uitgever?",
          a: "Sommige builds worden verspreid zonder commercieel EV-certificaat. Controleer of de SHA-256-hash overeenkomt met de officiële pagina en kies vervolgens Meer informatie en Toch uitvoeren.",
        },
        {
          q: "Moet ik Python, .NET of databases apart installeren?",
          a: "Nee. Elke IPScans-applicatie bevat een zelfstandige runtime. Optionele lokale AI-modellen kunnen vanuit de applicatie worden ingesteld.",
        },
        {
          q: "Sturen de applicaties scanresultaten of camerabeelden naar de cloud?",
          a: "Nee. Alle netwerkdetectie, externe sessies, kentekenherkenning en videoanalyse worden volledig lokaal op uw werkstation uitgevoerd.",
        },
      ],
    },
    webTools: {
      eyebrow: "Browserdiagnose",
      title: "Directe netwerkcontroles nodig zonder installatie?",
      lead: "Voer IP-opzoekingen, DNS-controles, WHOIS-query's, poortscans en snelheidstests rechtstreeks in uw browser uit.",
      openTool: "Tool openen",
    },
    closing: {
      title: "Begin met IPscans+ voor volledig inzicht in uw lokale subnet.",
      lead: "Detecteer elke actieve host, controleer open poorten en breng uw netwerktopologie met één klik in kaart.",
      primaryCta: "IPscans+ downloaden",
      secondaryCta: "IPscans+ bekijken",
    },
    shop: {
      eyebrow: "Hardware & implementatie",
      exploreAppsTitle: "Nu beschikbaar: Desktop-softwaresuite",
      exploreAppsLead: "Terwijl we onze hardwarewinkel voorbereiden, zijn alle vier de IPScans-desktopapplicaties direct beschikbaar om te downloaden.",
      exploreToolsTitle: "Directe browserdiagnose",
      exploreToolsLead: "Test uw verbinding, bekijk DNS- en WHOIS-gegevens of meet uw snelheid rechtstreeks vanuit uw browser.",
      downloadHubCta: "Alle desktop-apps bekijken",
    },
  },
  pl: {
    eyebrow: "Aplikacje komputerowe",
    title: "Stworzone dla sieci lokalnych i operacji wizyjnych.",
    subtitle:
      "Cztery samodzielne aplikacje dla systemu Windows działające bezpośrednio na Twoim komputerze — bez chmury, obowiązkowych kont i telemetrii.",
    learnMore: "Dowiedz się więcej",
    downloadInstaller: "Pobierz dla Windows",
    platformNote:
      "Przeznaczone dla 64-bitowych środowisk Windows. Pełne informacje o wydaniu, rozmiary plików i sumy kontrolne SHA-256 znajdują się na stronach produktów.",
    apps: {
      scanner: {
        category: "Wykrywanie sieci i topologia",
        valueProp: "Zmapuj każde urządzenie, port przełącznika i kamerę w lokalnej podsieci w kilka sekund.",
        summary:
          "Asynchroniczne skanowanie ARP i ICMP, wykrywanie kamer ONVIF, audyt portów oraz hierarchiczna mapa przełączników LLDP/CDP.",
        screenshotAlt: "Skaner sieci i widok topologii IPscans+",
      },
      ipcast: {
        category: "Bezpośredni pulpit zdalny P2P",
        valueProp: "Udostępnianie ekranu z niskim opóźnieniem i przesyłanie plików za pomocą 9-cyfrowego kodu.",
        summary:
          "Bezpośrednie połączenia przez STUN/UDP z uwierzytelnionym szyfrowaniem, zatwierdzaniem sesji i dzielonym transferem plików.",
        screenshotAlt: "Konsola połączenia zdalnego IPCast",
      },
      lprPro: {
        category: "Rozpoznawanie tablic rejestracyjnych",
        valueProp: "Lokalny OCR tablic, ściana wideo na żywo i rejestr pojazdów dla szlabanów i parkingów.",
        summary:
          "Pięciopanelowa konsola operatora z niezależnymi liniami wyzwalania i odczytu, wykrywaniem ONVIF, lokalnym OCR ONNX i szyfrowanym dziennikiem.",
        screenshotAlt: "Konsola operatora na żywo IPScans LPR Pro",
      },
      cortex: {
        category: "Lokalna wizja AI i silnik reguł",
        valueProp: "Zamień kamery RTSP w lokalny silnik zdarzeń z automatycznym zapisem dowodów wideo.",
        summary:
          "Dwanaście reguł bezmodelowych i dwanaście opcjonalnych szablonów Gemma AI z 12-sekundowymi nagraniami dowodowymi i webhookami HTTPS.",
        screenshotAlt: "Wielokamerowa konsola reguł i zdarzeń IPScans Cortex",
      },
    },
    faq: {
      eyebrow: "Instalacja i weryfikacja",
      title: "Weryfikacja i instalacja pakietów IPScans.",
      lead:
        "Każdy instalator i plik przenośny jest publikowany bezpośrednio z naszego repozytorium wraz z publiczną sumą SHA-256.",
      items: [
        {
          q: "Jak zweryfikować sumę kontrolną SHA-256 w systemie Windows?",
          a: "Przed uruchomieniem instalatora otwórz PowerShell w folderze Pobrane i porównaj uzyskany skrót z wartością SHA-256 w szczegółach wydania produktu.",
          code: "Get-FileHash .\\<installer-file>.exe -Algorithm SHA256",
        },
        {
          q: "Dlaczego filtr Windows SmartScreen wyświetla komunikat o nieznanym wydawcy?",
          a: "Niektóre kompilacje są dystrybuowane bez komercyjnego certyfikatu EV. Sprawdź zgodność sumy SHA-256 z oficjalną stroną, a następnie wybierz Więcej informacji i Uruchom mimo to.",
        },
        {
          q: "Czy muszę osobno instalować Pythona, .NET lub bazy danych?",
          a: "Nie. Każda aplikacja IPScans zawiera własne, kompletne środowisko uruchomieniowe. Opcjonalne lokalne modele AI można skonfigurować bezpośrednio w aplikacji.",
        },
        {
          q: "Czy aplikacje wysyłają wyniki skanowania lub obraz z kamer do chmury?",
          a: "Nie. Wykrywanie sieci, sesje zdalne, odczyt tablic i analiza obrazu odbywają się wyłącznie lokalnie na Twojej stacji roboczej.",
        },
      ],
    },
    webTools: {
      eyebrow: "Diagnostyka w przeglądarce",
      title: "Potrzebujesz szybkiego testu sieci bez instalacji?",
      lead: "Sprawdź adres IP, rekordy DNS, dane WHOIS, otwarte porty oraz prędkość łącza bezpośrednio w przeglądarce.",
      openTool: "Otwórz narzędzie",
    },
    closing: {
      title: "Zacznij od IPscans+, aby uzyskać pełny wgląd w sieć lokalną.",
      lead: "Wykryj aktywne hosty, sprawdź otwarte usługi i zobacz topologię sieci jednym kliknięciem.",
      primaryCta: "Pobierz IPscans+",
      secondaryCta: "Poznaj IPscans+",
    },
    shop: {
      eyebrow: "Sprzęt i wdrożenia",
      exploreAppsTitle: "Dostępne teraz: Pakiet aplikacji komputerowych",
      exploreAppsLead: "Podczas gdy przygotowujemy nasz sklep ze sprzętem, wszystkie cztery aplikacje komputerowe IPScans są dostępne do pobrania.",
      exploreToolsTitle: "Natychmiastowa diagnostyka w przeglądarce",
      exploreToolsLead: "Testuj połączenie, sprawdzaj rekordy DNS i WHOIS lub mierz prędkość łącza bezpośrednio w przeglądarce.",
      downloadHubCta: "Zobacz wszystkie aplikacje",
    },
  },
  ru: {
    eyebrow: "Настольные приложения",
    title: "Созданы для локальных сетей и видеоаналитики.",
    subtitle:
      "Четыре автономных настольных приложения, работающих непосредственно на вашем компьютере без облачных ретрансляторов, обязательных аккаунтов и телеметрии.",
    learnMore: "Подробнее",
    downloadInstaller: "Скачать для Windows",
    platformNote:
      "Разработано для 64-разрядных сред Windows. Примечания к выпуску, размеры файлов и контрольные суммы SHA-256 указаны на странице каждого продукта.",
    apps: {
      scanner: {
        category: "Обнаружение сети и топология",
        valueProp: "Находите все устройства, порты коммутаторов и камеры в локальной подсети за секунды.",
        summary:
          "Асинхронное ARP/ICMP-сканирование, обнаружение ONVIF-камер, аудит портов и построение иерархической карты LLDP/CDP.",
        screenshotAlt: "Сетевой сканер и карта топологии IPscans+",
      },
      ipcast: {
        category: "Прямой P2P удалённый рабочий стол",
        valueProp: "Передача экрана с низкой задержкой и обмен файлами по 9-значному коду устройства.",
        summary:
          "Прямое соединение через STUN/UDP с аутентифицированным шифрованием, подтверждением сеанса и поблочной передачей файлов.",
        screenshotAlt: "Консоль удалённого подключения IPCast",
      },
      lprPro: {
        category: "Распознавание автомобильных номеров",
        valueProp: "Локальное распознавание номеров, видеостена и база транспорта для КПП и парковок.",
        summary:
          "Пятипанельная консоль оператора с независимыми линиями триггера и чтения, поддержкой ONVIF, локальным ONNX OCR и шифрованным журналом.",
        screenshotAlt: "Живая консоль оператора IPScans LPR Pro",
      },
      cortex: {
        category: "Локальное зрение ИИ и движок правил",
        valueProp: "Превратите RTSP-камеры в локальную систему контроля событий с автоматической видеофиксацией.",
        summary:
          "Двенадцать правил без ИИ и двенадцать локальных шаблонов Gemma с сохранением 12-секундных видеодоказательств и отправкой HTTPS-вебхуков.",
        screenshotAlt: "Многокамерная консоль правил и событий IPScans Cortex",
      },
    },
    faq: {
      eyebrow: "Установка и проверка",
      title: "Проверка и установка настольных приложений IPScans.",
      lead:
        "Каждый установщик и портативный исполняемый файл публикуется напрямую из нашего репозитория с открытой контрольной суммой SHA-256.",
      items: [
        {
          q: "Как проверить контрольную сумму SHA-256 в Windows?",
          a: "Перед запуском установщика откройте PowerShell в папке «Загрузки» и сравните полученный хеш со значением SHA-256 на странице продукта.",
          code: "Get-FileHash .\\<installer-file>.exe -Algorithm SHA256",
        },
        {
          q: "Почему Windows SmartScreen выводит предупреждение о неизвестном издателе?",
          a: "Некоторые сборки распространяются без коммерческого EV-сертификата. Убедитесь, что хеш SHA-256 совпадает с официальной страницей, затем нажмите «Подробнее» и «Выполнить в любом случае».",
        },
        {
          q: "Нужно ли отдельно устанавливать Python, .NET или СУБД?",
          a: "Нет. Все приложения IPScans включают собственную автономную среду выполнения. Дополнительные локальные модели ИИ настраиваются внутри приложения.",
        },
        {
          q: "Отправляют ли приложения результаты сканирования или видео в облако?",
          a: "Нет. Сканирование сети, удалённый доступ, распознавание номеров и видеоаналитика выполняются полностью локально на вашем компьютере.",
        },
      ],
    },
    webTools: {
      eyebrow: "Браузерная диагностика",
      title: "Нужна мгновенная проверка сети без установки программ?",
      lead: "Выполняйте проверку IP, DNS-записей, WHOIS, открытых портов и скорости соединения прямо в браузере.",
      openTool: "Открыть инструмент",
    },
    closing: {
      title: "Начните с IPscans+ для полного обзора вашей локальной подсети.",
      lead: "Обнаруживайте активные узлы, проверяйте открытые службы и стройте карту сети в один клик.",
      primaryCta: "Скачать IPscans+",
      secondaryCta: "Подробнее об IPscans+",
    },
    shop: {
      eyebrow: "Оборудование и внедрение",
      exploreAppsTitle: "Доступно сейчас: Пакет настольных программ",
      exploreAppsLead: "Пока мы готовим каталог оборудования, все четыре настольных приложения IPScans доступны для бесплатной загрузки.",
      exploreToolsTitle: "Мгновенная диагностика в браузере",
      exploreToolsLead: "Проверяйте соединение, просматривайте записи DNS и WHOIS или измеряйте скорость интернета прямо в браузере.",
      downloadHubCta: "Все настольные приложения",
    },
  },
  ar: {
    eyebrow: "تطبيقات سطح المكتب",
    title: "مصممة للشبكات المحلية والعمليات البصرية.",
    subtitle:
      "أربعة تطبيقات مكتبية مستقلة تعمل مباشرة على جهازك دون وسطاء سحابيين أو حسابات إلزامية أو قياس عن بُعد في الخلفية.",
    learnMore: "اعرف المزيد",
    downloadInstaller: "تنزيل لنظام Windows",
    platformNote:
      "مصممة لبيئات Windows المكتبية بمعمارية 64-بت. تتوفر ملاحظات الإصدار الكاملة وأحجام الملفات وبصمات SHA-256 في صفحة كل منتج.",
    apps: {
      scanner: {
        category: "اكتشاف الشبكة والطوبولوجيا",
        valueProp: "ارسم خريطة لكل جهاز ومنفذ مبدّل وكاميرا على شبكتك الفرعية المحلية في ثوانٍ.",
        summary:
          "فحص ARP وICMP غير متزامن، واكتشاف كاميرات ONVIF، وتدقيق المنافذ، وعرض شجري موثق لطوبولوجيا LLDP/CDP.",
        screenshotAlt: "واجهة فاحص الشبكة وخريطة الطوبولوجيا IPscans+",
      },
      ipcast: {
        category: "سطح مكتب بعيد مباشر من نظير إلى نظير",
        valueProp: "مشاركة شاشة منخفضة الكمون ونقل ملفات عبر رمز جهاز مكوّن من 9 أرقام.",
        summary:
          "اتصال مباشر عبر STUN/UDP مع تشفير موثّق، وموافقة على الجلسة، ونقل ملفات مجزأ.",
        screenshotAlt: "وحدة تحكم الاتصال عن بُعد IPCast",
      },
      lprPro: {
        category: "التعرف على لوحات المركبات",
        valueProp: "قراءة محلية للوحات، وجدار كاميرات مباشر، وسجل مركبات السكان للبوابات والمواقف.",
        summary:
          "وحدة تحكم للمشغل من خمسة أقسام مع خطوط قدح وقراءة مستقلة، واكتشاف ONVIF، ونماذج ONNX محلية، وسجل أحداث مشفر.",
        screenshotAlt: "وحدة تحكم المشغل المباشرة IPScans LPR Pro",
      },
      cortex: {
        category: "رؤية الكاميرا المحلية ومحرك القواعد",
        valueProp: "حوّل كاميرات RTSP القياسية إلى محرك أحداث محلي مع توثيق فيديو تلقائي.",
        summary:
          "اثنتا عشرة قاعدة بصرية بدون نماذج واثنا عشر قالبًا محليًا اختياريًا عبر Gemma مع مقاطع إثبات مدتها 12 ثانية وتنبيهات Webhook.",
        screenshotAlt: "وحدة تحكم القواعد والأحداث متعددة الكاميرات IPScans Cortex",
      },
    },
    faq: {
      eyebrow: "التثبيت والتحقق",
      title: "التحقق من حزم IPScans المكتبية وتثبيتها.",
      lead:
        "يُجرى نشر كل مثبت وملف تنفيذي محمول مباشرة من مستودع الإصدارات الرسمي مع بصمة SHA-256 علنية.",
      items: [
        {
          q: "كيف أتحقق من بصمة SHA-256 على نظام Windows؟",
          a: "قبل تشغيل المثبت، افتح PowerShell في مجلد التنزيلات وقارن قيمة التجزئة الناتجة ببصمة SHA-256 المذكورة في تفاصيل إصدار المنتج.",
          code: "Get-FileHash .\\<installer-file>.exe -Algorithm SHA256",
        },
        {
          q: "لماذا يعرض Windows SmartScreen تنبيه ناشر غير معروف؟",
          a: "تُوزَّع بعض الإصدارات دون شهادة توقيع تجارية EV. تحقق من تطابق بصمة SHA-256 مع الصفحة الرسمية، ثم اختر مزيد من المعلومات وتشغيل على أي حال.",
        },
        {
          q: "هل أحتاج إلى تثبيت Python أو .NET أو قواعد بيانات بشكل منفصل؟",
          a: "لا. يأتي كل تطبيق مكتبي من IPScans ببيئة تشغيل ذاتية متكاملة. ويمكن إعداد نماذج الذكاء الاصطناعي المحلية الاختيارية من داخل التطبيق.",
        },
        {
          q: "هل ترسل التطبيقات نتائج الفحص أو بث الكاميرات إلى السحابة؟",
          a: "لا. جميع عمليات اكتشاف الشبكة وسطح المكتب البعيد وقراءة اللوحات وتحليل الفيديو تعمل محليًا بالكامل على محطة عملك.",
        },
      ],
    },
    webTools: {
      eyebrow: "تشخيصات المتصفح",
      title: "هل تحتاج إلى فحوصات شبكة فورية دون تثبيت؟",
      lead: "شغّل فحص IP وسجلات DNS وWHOIS وفحص المنافذ واختبار السرعة مباشرة في متصفحك.",
      openTool: "فتح الأداة",
    },
    closing: {
      title: "ابدأ مع IPscans+ لرؤية شاملة لشبكتك المحلية.",
      lead: "اكتشف كل جهاز نشط، وافحص الخدمات المفتوحة، واعرض طوبولوجيا الشبكة بنقرة واحدة.",
      primaryCta: "تنزيل IPscans+",
      secondaryCta: "استكشف IPscans+",
    },
    shop: {
      eyebrow: "الأجهزة والنشر",
      exploreAppsTitle: "متاح الآن: حزمة تطبيقات سطح المكتب",
      exploreAppsLead: "بينما نجهز متجر الأجهزة، تتوفر تطبيقات IPScans المكتبية الأربعة للتنزيل المباشر.",
      exploreToolsTitle: "أدوات تشخيص فورية في المتصفح",
      exploreToolsLead: "اختبر الاتصال أو راجع سجلات DNS وWHOIS أو قِس سرعة الإنترنت مباشرة من متصفحك.",
      downloadHubCta: "عرض جميع تطبيقات سطح المكتب",
    },
  },
  ja: {
    eyebrow: "デスクトップアプリケーション",
    title: "ローカルネットワークと映像運用のために設計。",
    subtitle:
      "クラウド中継、必須アカウント、バックグラウンドのテレメトリなしで、お使いのマシン上で直接動作する4つのスタンドアロン・デスクトップアプリ。",
    learnMore: "詳細を見る",
    downloadInstaller: "Windows版をダウンロード",
    platformNote:
      "64ビット Windows デスクトップ環境向けに設計されています。リリースノート、ファイルサイズ、SHA-256 チェックサムは各製品ページに記載されています。",
    apps: {
      scanner: {
        category: "ネットワーク検出・トポロジー",
        valueProp: "ローカルサブネット上のすべてのデバイス、スイッチポート、カメラを数秒で可視化。",
        summary:
          "非同期 ARP/ICMP スキャン、ONVIF カメラ検出、ポート監査、検証済み LLDP/CDP スイッチ階層マップ。",
        screenshotAlt: "IPscans+ ネットワークスキャナーとトポロジー表示",
      },
      ipcast: {
        category: "ダイレクト P2P リモートデスクトップ",
        valueProp: "9桁のピアコードによる低遅延の画面共有とファイル転送。",
        summary:
          "STUN/UDP による直接接続、認証付き暗号化、セッションごとのアクセス承認、分割ファイル転送。",
        screenshotAlt: "IPCast リモートデスクトップ接続コンソール",
      },
      lprPro: {
        category: "ナンバープレート認識",
        valueProp: "ゲートや駐車場向けのローカル車番 OCR、マルチカメラライブ壁面表示、車両台帳。",
        summary:
          "独立したトリガー線と読取線、ONVIF 検出、ローカル ONNX OCR、暗号化イベントログを備えた5画面オペレーターコンソール。",
        screenshotAlt: "IPScans LPR Pro ライブオペレーターコンソール",
      },
      cortex: {
        category: "ローカルカメラ AI・ルールエンジン",
        valueProp: "標準的な RTSP カメラを自動映像証跡付きのローカルイベントエンジンへ。",
        summary:
          "モデル不要の12ルールとオプションのローカル Gemma ビジョン12テンプレート、トリガー後12秒の映像保存、HTTPS Webhook 通知。",
        screenshotAlt: "IPScans Cortex マルチカメラ・ルールコンソール",
      },
    },
    faq: {
      eyebrow: "インストールと検証",
      title: "IPScans デスクトップ版の検証とインストール方法。",
      lead:
        "すべてのインストーラーとポータブル実行ファイルは、公開 SHA-256 ダイジェスト付きで公式リポジトリから直接配布されます。",
      items: [
        {
          q: "Windows で SHA-256 チェックサムを確認するには？",
          a: "実行前にダウンロードフォルダーで PowerShell を開き、出力されたハッシュ値と製品ページの SHA-256 を比較してください。",
          code: "Get-FileHash .\\<installer-file>.exe -Algorithm SHA256",
        },
        {
          q: "Windows SmartScreen で「不明な発行元」と表示されるのはなぜですか？",
          a: "一部のビルドは商用 EV コード署名証明書なしで配布されています。SHA-256 ハッシュが公式ページと一致することを確認し、「詳細情報」から「実行」を選択してください。",
        },
        {
          q: "Python や .NET、データベースを別途インストールする必要はありますか？",
          a: "いいえ。すべての IPScans デスクトップアプリは必要なランタイムを内蔵しています。オプションのローカル AI モデルはアプリ内から設定できます。",
        },
        {
          q: "スキャン結果やカメラ映像がクラウドに送信されることはありますか？",
          a: "いいえ。ネットワーク探索、リモート接続、ナンバープレート認識、映像ルール評価はすべてローカルマシン上で完結します。",
        },
      ],
    },
    webTools: {
      eyebrow: "ブラウザ診断ツール",
      title: "インストール不要で今すぐネットワークを診断したいですか？",
      lead: "IP 検索、DNS レコード照会、WHOIS、ポート確認、速度テストをブラウザ上で即座に実行できます。",
      openTool: "ツールを開く",
    },
    closing: {
      title: "ローカルサブネットの完全な可視化を IPscans+ で始めましょう。",
      lead: "アクティブなホストの検出、公開サービスの確認、ネットワークトポロジーの描画をワンクリックで。",
      primaryCta: "IPscans+ をダウンロード",
      secondaryCta: "IPscans+ の詳細",
    },
    shop: {
      eyebrow: "ハードウェア・導入支援",
      exploreAppsTitle: "現在利用可能：デスクトップソフトウェアスイート",
      exploreAppsLead: "ハードウェアショップの準備中も、4つの IPScans デスクトップアプリケーションはすべてダウンロードいただけます。",
      exploreToolsTitle: "ブラウザで使える即時診断ツール",
      exploreToolsLead: "接続テスト、DNS・WHOIS レコードの照会、回線速度の測定をブラウザから直接実行できます。",
      downloadHubCta: "すべてのデスクトップアプリを見る",
    },
  },
  ko: {
    eyebrow: "데스크톱 애플리케이션",
    title: "로컬 네트워크와 비전 운영을 위해 설계된 네이티브 도구.",
    subtitle:
      "클라우드 릴레이, 필수 계정, 백그라운드 텔레메트리 없이 사용자의 PC에서 직접 실행되는 4종의 독립형 데스크톱 애플리케이션입니다.",
    learnMore: "자세히 보기",
    downloadInstaller: "Windows용 다운로드",
    platformNote:
      "64비트 Windows 데스크톱 환경용으로 설계되었습니다. 전체 릴리스 노트, 파일 크기 및 SHA-256 체크섬은 각 제품 페이지에서 확인할 수 있습니다.",
    apps: {
      scanner: {
        category: "네트워크 탐색 및 토폴로지",
        valueProp: "로컬 서브넷의 모든 장치, 스위치 포트, 카메라를 몇 초 만에 매핑합니다.",
        summary:
          "비동기 ARP/ICMP 스윕, ONVIF 카메라 탐색, 포트 감사 및 검증된 LLDP/CDP 스위치 계층 시각화.",
        screenshotAlt: "IPscans+ 네트워크 스캐너 및 토폴로지 화면",
      },
      ipcast: {
        category: "다이렉트 P2P 원격 데스크톱",
        valueProp: "9자리 피어 코드로 지연 없는 화면 공유와 파일 전송을 제공합니다.",
        summary:
          "STUN/UDP 기반 직접 연결, 인증된 암호화, 세션별 접근 승인 및 분할 파일 전송.",
        screenshotAlt: "IPCast 원격 데스크톱 연결 콘솔",
      },
      lprPro: {
        category: "차량 번호판 인식",
        valueProp: "차단기 및 주차장을 위한 로컬 번호판 OCR, 멀티 카메라 라이브 월, 입주자 차량 대장.",
        summary:
          "독립된 트리거 및 인식 라인, ONVIF 탐색, 로컬 ONNX 번호판 인식, 암호화된 출입 로그를 갖춘 5개 화면 운영자 콘솔.",
        screenshotAlt: "IPScans LPR Pro 라이브 운영자 콘솔",
      },
      cortex: {
        category: "로컬 카메라 비전 AI 및 규칙 엔진",
        valueProp: "표준 RTSP 카메라를 자동 비디오 증거를 남기는 로컬 이벤트 엔진으로 전환합니다.",
        summary:
          "모델이 필요 없는 12가지 규칙과 선택형 로컬 Gemma 비전 템플릿 12종, 12초 사후 비디오 아카이브 및 HTTPS 웹훅 전송.",
        screenshotAlt: "IPScans Cortex 멀티 카메라 규칙 및 이벤트 콘솔",
      },
    },
    faq: {
      eyebrow: "설치 및 무결성 검증",
      title: "IPScans 데스크톱 빌드 검증 및 설치 안내.",
      lead:
        "모든 설치 프로그램과 포터블 실행 파일은 공개 SHA-256 해시와 함께 공식 릴리스 저장소에서 직접 배포됩니다.",
      items: [
        {
          q: "Windows에서 SHA-256 체크섬은 어떻게 확인하나요?",
          a: "설치 파일을 실행하기 전에 다운로드 폴더에서 PowerShell을 열고 출력된 해시 값을 제품 페이지의 SHA-256 값과 비교하세요.",
          code: "Get-FileHash .\\<installer-file>.exe -Algorithm SHA256",
        },
        {
          q: "Windows SmartScreen에서 알 수 없는 게시자 경고가 표시되는 이유는 무엇인가요?",
          a: "일부 빌드는 상용 EV 코드 서명 인증서 없이 배포됩니다. SHA-256 해시가 공식 페이지와 일치하는지 확인한 후 '추가 정보' 및 '실행'을 선택하세요.",
        },
        {
          q: "Python, .NET 또는 데이터베이스를 별도로 설치해야 하나요?",
          a: "아니요. 모든 IPScans 데스크톱 앱은 필요한 런타임이 포함된 자체 완비형 패키지로 제공됩니다. 선택형 로컬 AI 모델은 앱 내부에서 설정할 수 있습니다.",
        },
        {
          q: "스캔 결과나 카메라 영상이 클라우드로 전송되나요?",
          a: "아니요. 네트워크 탐색, 원격 데스크톱 스트림, 번호판 인식 및 카메라 규칙 평가는 모두 로컬 워크스테이션에서 실행됩니다.",
        },
      ],
    },
    webTools: {
      eyebrow: "브라우저 진단 도구",
      title: "설치 없이 즉시 네트워크 상태를 확인하고 싶으신가요?",
      lead: "IP 조회, DNS 레코드 검색, WHOIS 조회, 포트 확인 및 속도 테스트를 브라우저에서 바로 실행하세요.",
      openTool: "도구 열기",
    },
    closing: {
      title: "완벽한 로컬 서브넷 가시성을 위해 IPscans+로 시작하세요.",
      lead: "클릭 한 번으로 모든 활성 호스트를 찾고 열린 서비스를 점검하며 네트워크 토폴로지를 시각화하세요.",
      primaryCta: "IPscans+ 다운로드",
      secondaryCta: "IPscans+ 살펴보기",
    },
    shop: {
      eyebrow: "하드웨어 및 구축",
      exploreAppsTitle: "지금 이용 가능: 데스크톱 소프트웨어 제품군",
      exploreAppsLead: "하드웨어 스토어를 준비하는 동안 4종의 IPScans 데스크톱 애플리케이션을 모두 다운로드하여 사용할 수 있습니다.",
      exploreToolsTitle: "즉시 실행하는 브라우저 진단 도구",
      exploreToolsLead: "브라우저에서 바로 연결 상태를 테스트하고 DNS 및 WHOIS 레코드를 조회하거나 속도를 측정하세요.",
      downloadHubCta: "모든 데스크톱 앱 보기",
    },
  },
  zh: {
    eyebrow: "桌面应用程序",
    title: "专为本地网络与视觉运维打造。",
    subtitle:
      "四款独立运行的桌面应用程序，直接在您的计算机上本地执行，无需云端中继、强制账号或后台遥测。",
    learnMore: "了解更多",
    downloadInstaller: "下载 Windows 版",
    platformNote:
      "专为 64 位 Windows 桌面环境设计。完整的发行说明、文件大小与 SHA-256 校验值均列于各产品页面。",
    apps: {
      scanner: {
        category: "网络发现与拓扑映射",
        valueProp: "数秒内绘制本地子网中的每一台设备、交换机端口与摄像头。",
        summary:
          "异步 ARP 与 ICMP 探测、ONVIF 摄像头发现、深度端口审计以及经过验证的 LLDP/CDP 交换机层级拓扑图。",
        screenshotAlt: "IPscans+ 网络扫描器与拓扑视图",
      },
      ipcast: {
        category: "直连 P2P 远程桌面",
        valueProp: "通过 9 位设备码实现低延迟屏幕共享与分块文件传输。",
        summary:
          "基于 STUN/UDP 建立直接连接，支持认证加密、会话级访问审批与高速文件传输。",
        screenshotAlt: "IPCast 远程桌面连接工作区",
      },
      lprPro: {
        category: "车牌识别与道闸工作台",
        valueProp: "面向道闸与停车场的本地车牌 OCR、多路实时监控墙与住户车辆登记库。",
        summary:
          "五面板操作员控制台，配备独立触发线与识别线、ONVIF 视频流发现、本地 ONNX 车牌识别及加密通行日志。",
        screenshotAlt: "IPScans LPR Pro 实时操作员控制台",
      },
      cortex: {
        category: "本地摄像头视觉 AI 与规则引擎",
        valueProp: "将标准 RTSP 摄像头转化为具备自动视频留证能力的本地事件引擎。",
        summary:
          "内置 12 项免模型视觉规则与 12 项可选本地 Gemma 视觉模板，支持触发后 12 秒视频取证归档与 HTTPS Webhook 推送。",
        screenshotAlt: "IPScans Cortex 多路摄像头规则与事件控制台",
      },
    },
    faq: {
      eyebrow: "安装与校验",
      title: "校验并安装 IPScans 桌面软件包。",
      lead:
        "每个安装程序与便携版可执行文件均直接发布自官方版本仓库，并提供公开的 SHA-256 摘要。",
      items: [
        {
          q: "如何在 Windows 上校验 SHA-256 哈希值？",
          a: "运行安装程序前，在“下载”文件夹中打开 PowerShell，将输出的哈希值与产品版本详情中列出的 SHA-256 进行比对。",
          code: "Get-FileHash .\\<installer-file>.exe -Algorithm SHA256",
        },
        {
          q: "为什么 Windows SmartScreen 会提示未知发布者？",
          a: "部分构建版本未使用商业 EV 代码签名证书分发。请先核对 SHA-256 哈希值与官方页面一致，随后点击“更多信息”并选择“仍要运行”。",
        },
        {
          q: "是否需要单独安装 Python、.NET 或数据库服务器？",
          a: "不需要。每款 IPScans 桌面应用均内置完整的独立运行时环境。可选的本地 AI 模型可直接在应用内配置。",
        },
        {
          q: "应用程序会将扫描结果或摄像头画面上传到云端吗？",
          a: "不会。所有网络发现、远程桌面流、车牌识别与摄像头规则评估均完全在您的本地工作站上运行。",
        },
      ],
    },
    webTools: {
      eyebrow: "浏览器诊断工具",
      title: "无需安装应用，即刻执行网络诊断？",
      lead: "直接在浏览器中运行 IP 查询、DNS 记录查询、WHOIS 查询、端口检测与网速测试。",
      openTool: "打开工具",
    },
    closing: {
      title: "从 IPscans+ 开始，全面掌握本地子网动态。",
      lead: "一键发现所有活动主机、检查开放服务并生成网络拓扑图。",
      primaryCta: "下载 IPscans+",
      secondaryCta: "探索 IPscans+",
    },
    shop: {
      eyebrow: "硬件与部署",
      exploreAppsTitle: "现已推出：桌面软件套件",
      exploreAppsLead: "在我们筹备硬件商店期间，全部四款 IPScans 桌面应用程序均可直接免费下载。",
      exploreToolsTitle: "即开即用的浏览器诊断工具",
      exploreToolsLead: "无需安装，直接通过浏览器测试连通性、查询 DNS 与 WHOIS 记录或测量网络带宽。",
      downloadHubCta: "查看全部桌面应用",
    },
  },
};
