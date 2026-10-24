import type { Locale } from "@/i18n/config";

export type ProductId = "scanner" | "ipcast" | "lpr" | "cortex";

export type ProductCopy = {
  category: string;
  headline: string;
  description: string;
  highlights: [string, string, string];
  caption: string;
};

export type HomeCopy = {
  heroHeadline: string;
  heroLead: string;
  downloadScannerCta: string;
  runSpeedTestCta: string;
  scrollCue: string;
  lineupTitle: string;
  lineupLead: string;
  downloadForWindows: string;
  scannerViews: {
    discovery: string;
    topology: string;
    discoveryCaption: string;
    topologyCaption: string;
  };
  products: Record<ProductId, ProductCopy>;
  toolsTitle: string;
  toolsLead: string;
  articlesTitle: string;
  viewAllArticles: string;
  minRead: string;
  closingNote: string;
};

export const homeCopy: Record<Locale, HomeCopy> = {
  en: {
    heroHeadline: "Every connection on your network, in focus.",
    heroLead:
      "IPScans is the network intelligence platform uniting native Windows applications—IPscans+, IPCast, LPR Pro, and Cortex—with instant browser diagnostics.",
    downloadScannerCta: "Download IPscans+ for Windows",
    runSpeedTestCta: "Run Speed Test",
    scrollCue: "Explore the platform",
    lineupTitle: "Four native applications. One operational standard.",
    lineupLead:
      "Built for Windows 10 and 11 (x64) to handle subnet discovery, encrypted remote support, license plate recognition, and local camera intelligence.",
    downloadForWindows: "Download for Windows",
    scannerViews: {
      discovery: "Device Discovery",
      topology: "Topology Map",
      discoveryCaption: "IPscans+ parallel subnet scan showing live hosts, MAC vendors, and open services.",
      topologyCaption: "Interactive layer-2 and layer-3 topology map with instant device drill-down.",
    },
    products: {
      scanner: {
        category: "Network Discovery & Topology",
        headline: "Map every host, port, and camera on your local subnet.",
        description:
          "Multi-threaded ARP, ICMP, SNMP, WMI, UPnP, and ONVIF discovery with an interactive topology map and one-click device access.",
        highlights: ["ARP · ICMP · SNMP · ONVIF", "Interactive topology map", "Double-click device access"],
        caption: "IPscans+ live device inventory and topology mapping on Windows.",
      },
      ipcast: {
        category: "Remote Desktop & File Transfer",
        headline: "Direct remote desktop sessions with explicit access control.",
        description:
          "Connect via 9-digit device ID or direct IP over TLS-protected channels with granular view/control approval, shared clipboard, and chunked file transfer.",
        highlights: ["9-digit ID or direct LAN IP", "Session permission approval", "TLS-encrypted file transfer"],
        caption: "IPCast remote desktop workspace with session controls and file transfer.",
      },
      lpr: {
        category: "License Plate Recognition Suite",
        headline: "Five-page live operator console for gates and parking.",
        description:
          "Local ONNX license plate recognition with independent trigger and recognition lines, polygon zones, resident vehicle registry, and encrypted event journals.",
        highlights: ["5-page operator workspace", "Trigger & recognition lines", "Resident & vehicle registry"],
        caption: "IPScans LPR Pro live camera wall, plate reads, and gate event log.",
      },
      cortex: {
        category: "Camera Vision AI & Sector Suite",
        headline: "Local RTSP camera intelligence, 6 sector packs, and 8-handle ROI studio.",
        description:
          "Deploy 6 one-click sector packages, calibrate zones in the 8-handle ROI & Tripwire studio, run 25 model-free + smart tracking rules alongside 32 local Gemma 3 vision AI templates, and export SHA-256 forensic ZIP bundles.",
        highlights: ["6 One-Click Sector Packages", "8-Handle ROI & Tripwire Studio", "Forensic ZIP & Telegram alerts"],
        caption: "IPScans Cortex 2.0 Pro control center, sector packs, and ROI calibration studio.",
      },
    },
    toolsTitle: "Instant diagnostics, right in your browser.",
    toolsLead:
      "Inspect IP routing, verify DNS propagation, query WHOIS records, check common TCP ports, and measure connection performance without installing software.",
    articlesTitle: "Field guides & network engineering notes.",
    viewAllArticles: "All articles",
    minRead: "min read",
    closingNote: "Windows 10/11 (x64) desktop applications · Free browser diagnostics · No registration required",
  },

  tr: {
    heroHeadline: "Ağınızdaki her bağlantı, tek odakta.",
    heroLead:
      "IPScans; IPscans+, IPCast, LPR Pro ve Cortex yerel Windows uygulamalarını anında çalışan tarayıcı tanı araçlarıyla birleştiren ağ istihbarat platformudur.",
    downloadScannerCta: "Windows için IPscans+ İndir",
    runSpeedTestCta: "Hız Testini Başlat",
    scrollCue: "Platformu keşfedin",
    lineupTitle: "Dört yerel uygulama. Tek operasyonel standart.",
    lineupLead:
      "Alt ağ keşfi, şifreli uzak masaüstü desteği, plaka tanıma ve yerel kamera analizi için Windows 10 ve 11 (x64) mimarisiyle geliştirildi.",
    downloadForWindows: "Windows için İndir",
    scannerViews: {
      discovery: "Cihaz Keşfi",
      topology: "Topoloji Haritası",
      discoveryCaption: "Canlı cihazları, MAC üreticilerini ve açık servisleri gösteren paralel IPscans+ taraması.",
      topologyCaption: "Anında cihaz detayına inen etkileşimli ağ topolojisi haritası.",
    },
    products: {
      scanner: {
        category: "Ağ Keşfi ve Topoloji",
        headline: "Yerel ağınızdaki her cihazı, portu ve kamerayı haritalayın.",
        description:
          "Çok iş parçacıklı ARP, ICMP, SNMP, WMI, UPnP ve ONVIF keşfi; etkileşimli topoloji haritası ve çift tıklamayla doğrudan cihaz erişimi.",
        highlights: ["ARP · ICMP · SNMP · ONVIF", "Etkileşimli topoloji haritası", "Çift tıklamayla cihaz erişimi"],
        caption: "Windows üzerinde IPscans+ canlı cihaz envanteri ve topoloji görünümü.",
      },
      ipcast: {
        category: "Uzak Masaüstü ve Dosya Aktarımı",
        headline: "Açık erişim onaylı, doğrudan uzak masaüstü bağlantıları.",
        description:
          "9 haneli cihaz kimliği veya doğrudan IP ile TLS korumalı kanallar üzerinden bağlanın; görüntüleme/kontrol izinlerini yönetin, pano ve dosya paylaşın.",
        highlights: ["9 haneli kimlik veya yerel IP", "Oturum bazlı erişim onayı", "TLS şifreli dosya aktarımı"],
        caption: "Oturum izinleri ve dosya aktarımıyla IPCast uzak masaüstü çalışma alanı.",
      },
      lpr: {
        category: "Plaka Tanıma ve Operatör Paketi",
        headline: "Bariyer ve otoparklar için 5 bölmeli canlı operatör konsolu.",
        description:
          "Bağımsız tetik ve okuma çizgileri, çokgen bölgeler, blok/daire sakin araç kütüğü ve şifreli olay günlüğü ile yerel ONNX plaka tanıma.",
        highlights: ["5 bölmeli operatör konsolu", "Bağımsız tetik ve okuma çizgisi", "Blok/daire araç kütüğü"],
        caption: "IPScans LPR Pro canlı kamera duvarı, plaka okumaları ve geçiş kayıtları.",
      },
      cortex: {
        category: "Kurumsal Kamera Görsel AI ve Sektör Paketi",
        headline: "6 sektörel kurulum paketi, 8-tutamaçlı ROI stüdyosu ve adli kanıt arşivi.",
        description:
          "RTSP ve ONVIF kameralara 6 tek tıkla sektörel paket uygulayın, 8-tutamaçlı ROI & geçiş hattı stüdyosunda kalibrasyon yapın, 25 yerel + akıllı takip kuralını ve 32 Gemma 3 görsel AI şablonunu çalıştırıp SHA-256 imzalı kanıt ZIP paketleri üretin.",
        highlights: ["6 Tek Tıkla Sektör Paketi", "8-Tutamaçlı ROI & Geçiş Stüdyosu", "SHA-256 Adli Kanıt & Telegram"],
        caption: "Canlı RTSP kamera akışlarını yerelde denetleyen IPScans Cortex 2.0 Pro kontrol merkezi.",
      },
    },
    toolsTitle: "Tarayıcınızda anında çalışan tanı araçları.",
    toolsLead:
      "Ek yazılım kurmadan IP yönlendirmesini inceleyin, DNS kayıtlarını doğrulayın, WHOIS bilgilerini sorgulayın, yaygın TCP portlarını sınayın ve bağlantı hızınızı ölçün.",
    articlesTitle: "Saha rehberleri ve ağ mühendisliği notları.",
    viewAllArticles: "Tüm rehberler",
    minRead: "dk okuma",
    closingNote: "Windows 10/11 (x64) masaüstü uygulamaları · Ücretsiz tarayıcı araçları · Kayıt gerektirmez",
  },

  de: {
    heroHeadline: "Jede Verbindung in Ihrem Netzwerk im Fokus.",
    heroLead:
      "IPScans ist die Plattform für Netzwerkintelligenz, die native Windows-Anwendungen – IPscans+, IPCast, LPR Pro und Cortex – mit sofortigen Browser-Diagnosetools vereint.",
    downloadScannerCta: "IPscans+ für Windows herunterladen",
    runSpeedTestCta: "Geschwindigkeitstest starten",
    scrollCue: "Plattform entdecken",
    lineupTitle: "Vier native Anwendungen. Ein operativer Standard.",
    lineupLead:
      "Entwickelt für Windows 10 und 11 (x64) zur Subnetz-Erkennung, verschlüsselten Fernwartung, Kennzeichenerkennung und lokalen Kameraanalyse.",
    downloadForWindows: "Für Windows herunterladen",
    scannerViews: {
      discovery: "Geräteerkennung",
      topology: "Topologiekarte",
      discoveryCaption: "Paralleler Subnetz-Scan in IPscans+ mit aktiven Hosts, MAC-Herstellern und offenen Diensten.",
      topologyCaption: "Interaktive Topologiekarte mit direktem Gerätezugriff.",
    },
    products: {
      scanner: {
        category: "Netzwerkerkennung & Topologie",
        headline: "Erfassen Sie jeden Host, Port und jede Kamera im lokalen Subnetz.",
        description:
          "Mehrstufige ARP-, ICMP-, SNMP-, WMI-, UPnP- und ONVIF-Erkennung mit interaktiver Topologiekarte und Gerätezugriff per Doppelklick.",
        highlights: ["ARP · ICMP · SNMP · ONVIF", "Interaktive Topologiekarte", "Zugriff per Doppelklick"],
        caption: "IPscans+ Live-Geräteinventar und Topologiekarte unter Windows.",
      },
      ipcast: {
        category: "Fernwartung & Dateitransfer",
        headline: "Direkte Remote-Desktop-Sitzungen mit expliziter Zugriffskontrolle.",
        description:
          "Verbinden Sie sich per 9-stelliger Geräte-ID oder direkter IP über TLS-gesicherte Kanäle mit Sitzungsfreigabe, Zwischenablage und Dateitransfer.",
        highlights: ["9-stellige ID oder direkte IP", "Explizite Sitzungsfreigabe", "TLS-verschlüsselter Dateitransfer"],
        caption: "IPCast Remote-Desktop-Arbeitsbereich mit Berechtigungssteuerung.",
      },
      lpr: {
        category: "Kennzeichenerkennung",
        headline: "Live-Bedienkonsole mit fünf Arbeitsbereichen für Zufahrten und Parkflächen.",
        description:
          "Lokale ONNX-Kennzeichenerkennung mit separaten Trigger- und Erkennungslinien, Polygonzonen, Fahrzeugregister und verschlüsseltem Ereignisprotokoll.",
        highlights: ["5-teilige Bedienkonsole", "Trigger- & Erkennungslinien", "Bewohner- & Fahrzeugregister"],
        caption: "IPScans LPR Pro Live-Kamerawand, Kennzeichenerfassung und Zufahrtsprotokoll.",
      },
      cortex: {
        category: "Kamera-Vision-KI & Regel-Engine",
        headline: "Lokale RTSP-Kameraanalyse und automatisierte Videobeweise.",
        description:
          "Verbinden Sie RTSP- und ONVIF-Streams, werten Sie 12 modellfreie Regeln sowie lokale Vision-KI aus und speichern Sie 12-Sekunden-Beweisclips samt Webhook-Versand.",
        highlights: ["RTSP- & ONVIF-Integration", "12 native + Vision-KI-Regeln", "12-Sekunden-Videobeweise"],
        caption: "IPScans Cortex Regel-Engine bei der lokalen Analyse von RTSP-Kamerastreams.",
      },
    },
    toolsTitle: "Sofortige Netzwerkdiagnose direkt im Browser.",
    toolsLead:
      "Prüfen Sie IP-Routing, DNS-Einträge, WHOIS-Registrierungen, gängige TCP-Ports und Ihre Verbindungsgeschwindigkeit ohne Softwareinstallation.",
    articlesTitle: "Praxisleitfäden & Netzwerktechnik-Artikel.",
    viewAllArticles: "Alle Artikel",
    minRead: "Min. Lesezeit",
    closingNote: "Windows 10/11 (x64) Desktop-Anwendungen · Kostenlose Browser-Diagnose · Keine Registrierung erforderlich",
  },

  es: {
    heroHeadline: "Cada conexión de su red, en foco.",
    heroLead:
      "IPScans es la plataforma de inteligencia de red que une aplicaciones nativas para Windows —IPscans+, IPCast, LPR Pro y Cortex— con diagnósticos instantáneos en el navegador.",
    downloadScannerCta: "Descargar IPscans+ para Windows",
    runSpeedTestCta: "Iniciar test de velocidad",
    scrollCue: "Explorar la plataforma",
    lineupTitle: "Cuatro aplicaciones nativas. Un mismo estándar operativo.",
    lineupLead:
      "Diseñadas para Windows 10 y 11 (x64) para cubrir descubrimiento de subred, escritorio remoto cifrado, reconocimiento de matrículas e inteligencia local de cámaras.",
    downloadForWindows: "Descargar para Windows",
    scannerViews: {
      discovery: "Descubrimiento",
      topology: "Mapa de topología",
      discoveryCaption: "Escaneo paralelo en IPscans+ mostrando hosts activos, fabricantes MAC y servicios abiertos.",
      topologyCaption: "Mapa interactivo de topología de red con acceso directo a cada dispositivo.",
    },
    products: {
      scanner: {
        category: "Descubrimiento y topología de red",
        headline: "Visualice cada host, puerto y cámara en su subred local.",
        description:
          "Descubrimiento multihilo mediante ARP, ICMP, SNMP, WMI, UPnP y ONVIF con mapa de topología interactivo y acceso con doble clic.",
        highlights: ["ARP · ICMP · SNMP · ONVIF", "Mapa de topología interactivo", "Acceso con doble clic"],
        caption: "Inventario de dispositivos en vivo y mapa de topología de IPscans+ en Windows.",
      },
      ipcast: {
        category: "Escritorio remoto y transferencia de archivos",
        headline: "Sesiones de escritorio remoto con control explícito de acceso.",
        description:
          "Conéctese mediante ID de 9 dígitos o IP directa sobre canales protegidos con TLS, aprobación de permisos, portapapeles compartido y envío de archivos.",
        highlights: ["ID de 9 dígitos o IP directa", "Aprobación de permisos en vivo", "Transferencia cifrada con TLS"],
        caption: "Espacio de trabajo remoto IPCast con control de sesión y transferencia de archivos.",
      },
      lpr: {
        category: "Reconocimiento de matrículas",
        headline: "Consola de operador en vivo de cinco paneles para accesos y estacionamientos.",
        description:
          "Reconocimiento local ONNX con líneas independientes de disparo y lectura, zonas poligonales, padrón de vehículos y registro cifrado de eventos.",
        highlights: ["Consola de 5 paneles", "Líneas de disparo y lectura", "Padrón de residentes y vehículos"],
        caption: "Muro de cámaras en vivo, lectura de matrículas y registro de accesos en LPR Pro.",
      },
      cortex: {
        category: "IA visual para cámaras y motor de reglas",
        headline: "Inteligencia local para cámaras RTSP y evidencia en vídeo automatizada.",
        description:
          "Conecte flujos RTSP y ONVIF, ejecute 12 reglas nativas junto con IA visual local y conserve clips de prueba de 12 segundos con notificaciones webhook.",
        highlights: ["Flujos RTSP y ONVIF", "12 reglas nativas + IA visual", "Clips de evidencia de 12 s"],
        caption: "Motor de reglas IPScans Cortex analizando flujos RTSP localmente.",
      },
    },
    toolsTitle: "Diagnósticos instantáneos, directamente en su navegador.",
    toolsLead:
      "Consulte enrutamiento IP, verifique registros DNS, examine datos WHOIS, compruebe puertos TCP comunes y mida la velocidad de su conexión sin instalar software.",
    articlesTitle: "Guías prácticas y notas de ingeniería de red.",
    viewAllArticles: "Todos los artículos",
    minRead: "min de lectura",
    closingNote: "Aplicaciones de escritorio Windows 10/11 (x64) · Diagnósticos web gratuitos · Sin registro",
  },

  fr: {
    heroHeadline: "Chaque connexion de votre réseau, en pleine clarté.",
    heroLead:
      "IPScans est la plateforme d'intelligence réseau réunissant des applications Windows natives — IPscans+, IPCast, LPR Pro et Cortex — et des outils de diagnostic instantanés dans le navigateur.",
    downloadScannerCta: "Télécharger IPscans+ pour Windows",
    runSpeedTestCta: "Lancer le test de débit",
    scrollCue: "Découvrir la plateforme",
    lineupTitle: "Quatre applications natives. Une même exigence opérationnelle.",
    lineupLead:
      "Conçues pour Windows 10 et 11 (x64) pour assurer la découverte de sous-réseau, l'assistance à distance chiffrée, la lecture de plaques et l'analyse vidéo locale.",
    downloadForWindows: "Télécharger pour Windows",
    scannerViews: {
      discovery: "Découverte d'appareils",
      topology: "Carte de topologie",
      discoveryCaption: "Analyse parallèle IPscans+ affichant les hôtes actifs, constructeurs MAC et services ouverts.",
      topologyCaption: "Carte topologique interactive avec accès direct aux interfaces des équipements.",
    },
    products: {
      scanner: {
        category: "Découverte réseau & topologie",
        headline: "Cartographiez chaque hôte, port et caméra de votre sous-réseau local.",
        description:
          "Découverte multithread ARP, ICMP, SNMP, WMI, UPnP et ONVIF avec carte topologique interactive et ouverture d'appareil par double-clic.",
        highlights: ["ARP · ICMP · SNMP · ONVIF", "Carte topologique interactive", "Accès rapide par double-clic"],
        caption: "Inventaire en direct et cartographie réseau IPscans+ sous Windows.",
      },
      ipcast: {
        category: "Bureau à distance & transfert de fichiers",
        headline: "Sessions de bureau à distance directes avec validation explicite.",
        description:
          "Connexion par identifiant à 9 chiffres ou IP directe via TLS avec contrôle des droits de vue/commande, presse-papiers partagé et transfert de fichiers.",
        highlights: ["ID à 9 chiffres ou IP directe", "Validation des permissions", "Transfert de fichiers sous TLS"],
        caption: "Interface de bureau à distance IPCast avec gestion des droits et transfert de fichiers.",
      },
      lpr: {
        category: "Reconnaissance de plaques d'immatriculation",
        headline: "Console opérateur en direct à cinq vues pour accès et parkings.",
        description:
          "Reconnaissance locale ONNX avec lignes de déclenchement et de lecture distinctes, zones polygonales, registre de véhicules résidents et journal chiffré.",
        highlights: ["Console opérateur 5 vues", "Lignes de détection dédiées", "Registre résidents & véhicules"],
        caption: "Mur de caméras en direct, lectures de plaques et journal d'accès dans LPR Pro.",
      },
      cortex: {
        category: "IA visuelle & moteur de règles caméra",
        headline: "Analyse locale des flux RTSP et archivage vidéo de preuve automatisé.",
        description:
          "Connectez vos flux RTSP et ONVIF, appliquez 12 règles natives ainsi que l'IA visuelle locale et enregistrez des extraits vidéo de 12 secondes avec webhooks.",
        highlights: ["Flux RTSP & ONVIF", "12 règles natives + IA visuelle", "Clips de preuve de 12 secondes"],
        caption: "Moteur de règles IPScans Cortex analysant localement les flux vidéo RTSP.",
      },
    },
    toolsTitle: "Diagnostics instantanés, directement dans votre navigateur.",
    toolsLead:
      "Inspectez le routage IP, vérifiez la propagation DNS, consultez le WHOIS, testez les ports TCP courants et mesurez votre débit sans aucune installation.",
    articlesTitle: "Guides techniques et notes d'ingénierie réseau.",
    viewAllArticles: "Tous les articles",
    minRead: "min de lecture",
    closingNote: "Applications Windows 10/11 (x64) · Outils de diagnostic web gratuits · Sans inscription",
  },

  it: {
    heroHeadline: "Ogni connessione della tua rete, a fuoco.",
    heroLead:
      "IPScans è la piattaforma di network intelligence che unisce applicazioni native per Windows — IPscans+, IPCast, LPR Pro e Cortex — a strumenti diagnostici istantanei nel browser.",
    downloadScannerCta: "Scarica IPscans+ per Windows",
    runSpeedTestCta: "Avvia test di velocità",
    scrollCue: "Esplora la piattaforma",
    lineupTitle: "Quattro applicazioni native. Un unico standard operativo.",
    lineupLead:
      "Progettate per Windows 10 e 11 (x64) per gestire scansione di sottorete, desktop remoto crittografato, riconoscimento targhe e analisi video locale.",
    downloadForWindows: "Scarica per Windows",
    scannerViews: {
      discovery: "Rilevamento dispositivi",
      topology: "Mappa topologica",
      discoveryCaption: "Scansione parallela in IPscans+ con host attivi, produttori MAC e servizi aperti.",
      topologyCaption: "Mappa topologica interattiva con accesso immediato ai dispositivi.",
    },
    products: {
      scanner: {
        category: "Rilevamento di rete & topologia",
        headline: "Mappa ogni host, porta e telecamera nella tua sottorete locale.",
        description:
          "Rilevamento multi-thread ARP, ICMP, SNMP, WMI, UPnP e ONVIF con mappa topologica interattiva e accesso rapido con doppio clic.",
        highlights: ["ARP · ICMP · SNMP · ONVIF", "Mappa topologica interattiva", "Accesso con doppio clic"],
        caption: "Inventario dispositivi in tempo reale e mappa di rete IPscans+ su Windows.",
      },
      ipcast: {
        category: "Desktop remoto & trasferimento file",
        headline: "Sessioni di desktop remoto dirette con controllo esplicito degli accessi.",
        description:
          "Connettiti tramite ID a 9 cifre o IP diretto su canali protetti da TLS con approvazione dei permessi, appunti condivisi e trasferimento file.",
        highlights: ["ID a 9 cifre o IP diretto", "Approvazione permessi sessione", "Trasferimento file protetto da TLS"],
        caption: "Area di lavoro desktop remoto IPCast con gestione permessi e invio file.",
      },
      lpr: {
        category: "Riconoscimento targhe",
        headline: "Console operatore live a cinque viste per varchi e parcheggi.",
        description:
          "Riconoscimento targhe ONNX locale con linee di attivazione e lettura indipendenti, zone poligonali, registro veicoli residenti e log eventi crittografato.",
        highlights: ["Console operatore a 5 viste", "Linee di trigger e lettura", "Registro residenti e veicoli"],
        caption: "Parete telecamere live, lettura targhe e registro transiti in IPScans LPR Pro.",
      },
      cortex: {
        category: "Vision AI & motore di regole per telecamere",
        headline: "Analisi locale dei flussi RTSP e prove video automatizzate.",
        description:
          "Collega flussi RTSP e ONVIF, valuta 12 regole native insieme alla Vision AI locale e archivia clip di prova da 12 secondi con invio webhook.",
        highlights: ["Flussi RTSP e ONVIF", "12 regole native + Vision AI", "Clip video di prova da 12 s"],
        caption: "Motore di regole IPScans Cortex per il monitoraggio locale dei flussi RTSP.",
      },
    },
    toolsTitle: "Diagnostica istantanea, direttamente nel browser.",
    toolsLead:
      "Analizza il routing IP, verifica i record DNS, consulta i dati WHOIS, controlla le porte TCP comuni e misura la velocità della connessione senza installare software.",
    articlesTitle: "Guide tecniche e approfondimenti di rete.",
    viewAllArticles: "Tutti gli articoli",
    minRead: "min di lettura",
    closingNote: "Applicazioni desktop Windows 10/11 (x64) · Diagnostica browser gratuita · Nessuna registrazione",
  },

  pt: {
    heroHeadline: "Cada ligação da sua rede, em foco.",
    heroLead:
      "A IPScans é a plataforma de inteligência de rede que reúne aplicações nativas para Windows — IPscans+, IPCast, LPR Pro e Cortex — com diagnósticos instantâneos no navegador.",
    downloadScannerCta: "Descarregar IPscans+ para Windows",
    runSpeedTestCta: "Iniciar teste de velocidade",
    scrollCue: "Explorar a plataforma",
    lineupTitle: "Quatro aplicações nativas. Um padrão operacional.",
    lineupLead:
      "Desenvolvidas para Windows 10 e 11 (x64) para descoberta de sub-rede, assistência remota encriptada, reconhecimento de matrículas e inteligência local de câmaras.",
    downloadForWindows: "Descarregar para Windows",
    scannerViews: {
      discovery: "Descoberta de dispositivos",
      topology: "Mapa de topologia",
      discoveryCaption: "Análise paralela no IPscans+ com anfitriões ativos, fabricantes MAC e serviços abertos.",
      topologyCaption: "Mapa interativo de topologia de rede com acesso rápido ao dispositivo.",
    },
    products: {
      scanner: {
        category: "Descoberta de rede e topologia",
        headline: "Mapeie cada anfitrião, porta e câmara na sua sub-rede local.",
        description:
          "Descoberta multithread ARP, ICMP, SNMP, WMI, UPnP e ONVIF com mapa de topologia interativo e acesso direto com duplo clique.",
        highlights: ["ARP · ICMP · SNMP · ONVIF", "Mapa de topologia interativo", "Acesso com duplo clique"],
        caption: "Inventário de dispositivos em tempo real e topologia do IPscans+ no Windows.",
      },
      ipcast: {
        category: "Ambiente de trabalho remoto e ficheiros",
        headline: "Sessões de acesso remoto diretas com aprovação explícita.",
        description:
          "Ligue-se por ID de 9 dígitos ou IP direto em canais protegidos por TLS com aprovação de visualização/controlo, área de transferência e envio de ficheiros.",
        highlights: ["ID de 9 dígitos ou IP direto", "Aprovação de permissões", "Transferência de ficheiros com TLS"],
        caption: "Espaço de trabalho remoto IPCast com controlo de sessão e transferência de ficheiros.",
      },
      lpr: {
        category: "Reconhecimento de matrículas",
        headline: "Consola de operador em direto com cinco painéis para portões e parques.",
        description:
          "Reconhecimento local de matrículas ONNX com linhas independentes de ativação e leitura, zonas poligonais, registo de residentes e diário de eventos encriptado.",
        highlights: ["Consola de operador de 5 painéis", "Linhas de ativação e leitura", "Registo de residentes e veículos"],
        caption: "Mural de câmaras em direto, leituras de matrículas e registo de acessos no LPR Pro.",
      },
      cortex: {
        category: "IA visual para câmaras e motor de regras",
        headline: "Inteligência local para câmaras RTSP e provas de vídeo automatizadas.",
        description:
          "Ligue transmissões RTSP e ONVIF, execute 12 regras nativas com IA visual local e arquive clips de prova de 12 segundos com entrega por webhook.",
        highlights: ["Transmissões RTSP e ONVIF", "12 regras nativas + IA visual", "Clips de prova de 12 segundos"],
        caption: "Motor de regras IPScans Cortex a monitorizar transmissões RTSP localmente.",
      },
    },
    toolsTitle: "Diagnósticos instantâneos, diretamente no navegador.",
    toolsLead:
      "Inspecione encaminhamento IP, verifique registos DNS, consulte dados WHOIS, teste portas TCP comuns e meça a velocidade da ligação sem instalar software.",
    articlesTitle: "Guias técnicos e notas de engenharia de rede.",
    viewAllArticles: "Todos os artigos",
    minRead: "min de leitura",
    closingNote: "Aplicações Windows 10/11 (x64) · Diagnósticos web gratuitos · Sem registo obrigatório",
  },

  nl: {
    heroHeadline: "Elke verbinding in uw netwerk, scherp in beeld.",
    heroLead:
      "IPScans is het platform voor netwerkintelligentie dat native Windows-applicaties — IPscans+, IPCast, LPR Pro en Cortex — combineert met directe browserdiagnose.",
    downloadScannerCta: "Download IPscans+ voor Windows",
    runSpeedTestCta: "Snelheidstest starten",
    scrollCue: "Verken het platform",
    lineupTitle: "Vier native applicaties. Eén operationele standaard.",
    lineupLead:
      "Gebouwd voor Windows 10 en 11 (x64) voor subnet-detectie, versleutelde hulp op afstand, kentekenherkenning en lokale camera-intelligentie.",
    downloadForWindows: "Downloaden voor Windows",
    scannerViews: {
      discovery: "Apparaatdetectie",
      topology: "Topologiekaart",
      discoveryCaption: "Parallelle subnetscan in IPscans+ met actieve hosts, MAC-fabrikanten en open poorten.",
      topologyCaption: "Interactieve netwerktopologiekaart met directe apparaattoegang.",
    },
    products: {
      scanner: {
        category: "Netwerkdetectie & topologie",
        headline: "Breng elke host, poort en camera in uw lokale subnet in kaart.",
        description:
          "Multi-threaded ARP-, ICMP-, SNMP-, WMI-, UPnP- en ONVIF-detectie met een interactieve topologiekaart en apparaattoegang via dubbelklik.",
        highlights: ["ARP · ICMP · SNMP · ONVIF", "Interactieve topologiekaart", "Toegang met dubbelklik"],
        caption: "IPscans+ live apparaatinventaris en topologiekaart op Windows.",
      },
      ipcast: {
        category: "Extern bureaublad & bestandsoverdracht",
        headline: "Directe extern-bureaubladsessies met expliciete toegangscontrole.",
        description:
          "Verbind via een 9-cijferige apparaat-ID of direct IP-adres over TLS-beveiligde kanalen met toestemmingsbeheer, gedeeld klembord en bestandsoverdracht.",
        highlights: ["9-cijferige ID of direct IP", "Expliciete sessietoestemming", "TLS-versleutelde bestandsoverdracht"],
        caption: "IPCast extern-bureaubladwerkruimte met sessiebeheer en bestandsoverdracht.",
      },
      lpr: {
        category: "Kentekenherkenning",
        headline: "Live operatorconsole met vijf weergaven voor slagbomen en parkeerterreinen.",
        description:
          "Lokale ONNX-kentekenherkenning met afzonderlijke trigger- en herkenningslijnen, polygoonzones, voertuigregister en versleuteld gebeurtenissenlogboek.",
        highlights: ["Operatorconsole met 5 weergaven", "Trigger- & herkenningslijnen", "Bewoners- & voertuigregister"],
        caption: "IPScans LPR Pro live camerawand, kentekenregistraties en toegangslogboek.",
      },
      cortex: {
        category: "Camera Vision-AI & regelengine",
        headline: "Lokale RTSP-camera-intelligentie en geautomatiseerd videobewijs.",
        description:
          "Verbind RTSP- en ONVIF-streams, evalueer 12 modelvrije regels naast lokale vision-AI en archiveer bewijsclips van 12 seconden met webhook-meldingen.",
        highlights: ["RTSP- & ONVIF-streams", "12 native + vision-AI-regels", "Videobewijsclips van 12 s"],
        caption: "IPScans Cortex regelengine analyseert live RTSP-camerastreams lokaal.",
      },
    },
    toolsTitle: "Directe netwerkdiagnose, rechtstreeks in uw browser.",
    toolsLead:
      "Controleer IP-routering, verifieer DNS-records, raadpleeg WHOIS-gegevens, test veelgebruikte TCP-poorten en meet uw verbindingssnelheid zonder software te installeren.",
    articlesTitle: "Praktijkgidsen & netwerkengineering-notities.",
    viewAllArticles: "Alle artikelen",
    minRead: "min leestijd",
    closingNote: "Windows 10/11 (x64) desktop-apps · Gratis browserdiagnose · Geen registratie vereist",
  },

  pl: {
    heroHeadline: "Każde połączenie w Twojej sieci w pełnej ostrości.",
    heroLead:
      "IPScans to platforma analityki sieciowej łącząca natywne aplikacje dla systemu Windows — IPscans+, IPCast, LPR Pro oraz Cortex — z natychmiastową diagnostyką w przeglądarce.",
    downloadScannerCta: "Pobierz IPscans+ dla Windows",
    runSpeedTestCta: "Uruchom test prędkości",
    scrollCue: "Poznaj platformę",
    lineupTitle: "Cztery natywne aplikacje. Jeden standard operacyjny.",
    lineupLead:
      "Stworzone dla Windows 10 i 11 (x64) do wykrywania podsieci, szyfrowanego wsparcia zdalnego, rozpoznawania tablic rejestracyjnych i lokalnej analizy obrazu z kamer.",
    downloadForWindows: "Pobierz dla Windows",
    scannerViews: {
      discovery: "Wykrywanie urządzeń",
      topology: "Mapa topologii",
      discoveryCaption: "Równoległe skanowanie podsieci w IPscans+ pokazujące aktywne hosty, producentów MAC i otwarte usługi.",
      topologyCaption: "Interaktywna mapa topologii sieci z szybkim przejściem do szczegółów urządzenia.",
    },
    products: {
      scanner: {
        category: "Wykrywanie sieci i topologia",
        headline: "Zmapuj każdy host, port i kamerę w lokalnej podsieci.",
        description:
          "Wielowątkowe wykrywanie ARP, ICMP, SNMP, WMI, UPnP i ONVIF z interaktywną mapą topologii oraz dostępem do urządzenia po dwukrotnym kliknięciu.",
        highlights: ["ARP · ICMP · SNMP · ONVIF", "Interaktywna mapa topologii", "Dostęp dwukrotnym kliknięciem"],
        caption: "Inwentaryzacja urządzeń na żywo i mapa topologii IPscans+ w systemie Windows.",
      },
      ipcast: {
        category: "Pulpit zdalny i przesyłanie plików",
        headline: "Bezpośrednie sesje pulpitu zdalnego z jawną kontrolą dostępu.",
        description:
          "Łącz się za pomocą 9-cyfrowego identyfikatora lub bezpośredniego adresu IP przez kanały TLS z zatwierdzaniem uprawnień, schowkiem i transferem plików.",
        highlights: ["9-cyfrowe ID lub bezpośrednie IP", "Zatwierdzanie uprawnień sesji", "Transfer plików szyfrowany TLS"],
        caption: "Obszar roboczy pulpitu zdalnego IPCast z kontrolą uprawnień i przesyłaniem plików.",
      },
      lpr: {
        category: "Rozpoznawanie tablic rejestracyjnych",
        headline: "Pięciopanelowa konsola operatora na żywo dla bram i parkingów.",
        description:
          "Lokalne rozpoznawanie tablic ONNX z niezależnymi liniami wyzwalania i odczytu, strefami wielokątnymi, rejestrem pojazdów mieszkańców i szyfrowanym dziennikiem.",
        highlights: ["5-panelowa konsola operatora", "Linie wyzwalania i odczytu", "Rejestr mieszkańców i pojazdów"],
        caption: "Ściana wideo na żywo, odczyty tablic i dziennik wjazdów w IPScans LPR Pro.",
      },
      cortex: {
        category: "Wizyjna AI kamer i silnik reguł",
        headline: "Lokalna inteligencja dla kamer RTSP i automatyczne nagrania dowodowe.",
        description:
          "Podłącz strumienie RTSP i ONVIF, uruchamiaj 12 reguł natywnych oraz lokalną wizyjną AI i zapisuj 12-sekundowe klipy dowodowe z powiadomieniami webhook.",
        highlights: ["Strumienie RTSP i ONVIF", "12 reguł natywnych + wizyjna AI", "12-sekundowe klipy dowodowe"],
        caption: "Silnik reguł IPScans Cortex analizujący lokalnie strumienie z kamer RTSP.",
      },
    },
    toolsTitle: "Natychmiastowa diagnostyka prosto w przeglądarce.",
    toolsLead:
      "Sprawdzaj routing IP, weryfikuj rekordy DNS, odpytuj bazy WHOIS, testuj popularne porty TCP i mierz prędkość łącza bez instalowania oprogramowania.",
    articlesTitle: "Przewodniki techniczne i notatki inżynierii sieciowej.",
    viewAllArticles: "Wszystkie artykuły",
    minRead: "min czytania",
    closingNote: "Aplikacje dla Windows 10/11 (x64) · Bezpłatna diagnostyka w przeglądarce · Bez rejestracji",
  },

  ru: {
    heroHeadline: "Каждое соединение вашей сети — в фокусе.",
    heroLead:
      "IPScans — платформа сетевой аналитики, объединяющая нативные приложения для Windows (IPscans+, IPCast, LPR Pro и Cortex) с мгновенной диагностикой в браузере.",
    downloadScannerCta: "Скачать IPscans+ для Windows",
    runSpeedTestCta: "Запустить тест скорости",
    scrollCue: "Обзор платформы",
    lineupTitle: "Четыре нативных приложения. Единый инженерный стандарт.",
    lineupLead:
      "Созданы для Windows 10 и 11 (x64): обнаружение подсетей, защищённый удалённый доступ, распознавание номерных знаков и локальная видеоаналитика.",
    downloadForWindows: "Скачать для Windows",
    scannerViews: {
      discovery: "Обнаружение устройств",
      topology: "Карта топологии",
      discoveryCaption: "Параллельное сканирование подсети в IPscans+ с отображением активных узлов, MAC-производителей и открытых служб.",
      topologyCaption: "Интерактивная карта топологии сети с быстрым переходом к каждому устройству.",
    },
    products: {
      scanner: {
        category: "Обнаружение сети и топология",
        headline: "Находите каждый узел, порт и камеру в локальной подсети.",
        description:
          "Многопоточное обнаружение ARP, ICMP, SNMP, WMI, UPnP и ONVIF с интерактивной картой топологии и переходом к устройству по двойному щелчку.",
        highlights: ["ARP · ICMP · SNMP · ONVIF", "Интерактивная карта топологии", "Доступ двойным щелчком"],
        caption: "Инвентаризация устройств и карта топологии IPscans+ в Windows.",
      },
      ipcast: {
        category: "Удалённый рабочий стол и передача файлов",
        headline: "Прямые сеансы удалённого рабочего стола с явным контролем доступа.",
        description:
          "Подключение по 9-значному ID устройства или прямому IP через защищённые TLS-каналы с подтверждением прав просмотра и управления, общим буфером обмена и передачей файлов.",
        highlights: ["9-значный ID или прямой IP", "Подтверждение прав сеанса", "Передача файлов по TLS"],
        caption: "Рабочее пространство удалённого доступа IPCast с управлением правами и передачей файлов.",
      },
      lpr: {
        category: "Распознавание автомобильных номеров",
        headline: "Пятипанельная консоль оператора для КПП и парковок.",
        description:
          "Локальное ONNX-распознавание номеров с независимыми линиями триггера и считывания, полигональными зонами, реестром автомобилей резидентов и шифрованным журналом событий.",
        highlights: ["Консоль оператора из 5 панелей", "Линии триггера и считывания", "Реестр резидентов и транспорта"],
        caption: "Живая видеостена, распознавание номеров и журнал проездов в IPScans LPR Pro.",
      },
      cortex: {
        category: "Видеоаналитика и движок правил для камер",
        headline: "Локальный интеллект для RTSP-камер и автоматическая видеофиксация.",
        description:
          "Подключайте потоки RTSP и ONVIF, используйте 12 базовых правил и локальный визуальный ИИ, сохраняйте 12-секундные видеодоказательства с отправкой вебхуков.",
        highlights: ["Потоки RTSP и ONVIF", "12 нативных правил + ИИ", "12-секундные видеоклипы"],
        caption: "Движок правил IPScans Cortex, анализирующий потоки RTSP-камер локально.",
      },
    },
    toolsTitle: "Мгновенная диагностика прямо в браузере.",
    toolsLead:
      "Проверяйте маршрутизацию IP, записи DNS, данные WHOIS, доступность стандартных TCP-портов и скорость интернет-соединения без установки программ.",
    articlesTitle: "Практические руководства и заметки по сетевой инженерии.",
    viewAllArticles: "Все статьи",
    minRead: "мин чтения",
    closingNote: "Приложения для Windows 10/11 (x64) · Бесплатная веб-диагностика · Без регистрации",
  },

  ar: {
    heroHeadline: "كل اتصال في شبكتك، بوضوح تام.",
    heroLead:
      "منصة IPScans لذكاء الشبكات تجمع تطبيقات ويندوز الأصلية — IPscans+ وIPCast وLPR Pro وCortex — مع أدوات تشخيص فورية تعمل مباشرة في المتصفح.",
    downloadScannerCta: "تنزيل IPscans+ لنظام Windows",
    runSpeedTestCta: "بدء اختبار السرعة",
    scrollCue: "استكشف المنصة",
    lineupTitle: "أربعة تطبيقات أصلية. معيار تشغيلي واحد.",
    lineupLead:
      "مصممة لنظامي Windows 10 و11 (x64) لاكتشاف الشبكات الفرعية، والدعم عن بُعد المشفّر، والتعرف على لوحات المركبات، والتحليل الذكي المحلي للكاميرات.",
    downloadForWindows: "التنزيل لنظام Windows",
    scannerViews: {
      discovery: "اكتشاف الأجهزة",
      topology: "خريطة الطوبولوجيا",
      discoveryCaption: "فحص متوازٍ للشبكة في IPscans+ يعرض الأجهزة النشطة ومصنّعي MAC والخدمات المفتوحة.",
      topologyCaption: "خريطة طوبولوجيا تفاعلية للشبكة مع وصول فوري إلى تفاصيل كل جهاز.",
    },
    products: {
      scanner: {
        category: "اكتشاف الشبكة والطوبولوجيا",
        headline: "ارسم خريطة لكل مضيف ومنفذ وكاميرا على شبكتك المحلية.",
        description:
          "اكتشاف متعدد الخيوط عبر ARP وICMP وSNMP وWMI وUPnP وONVIF مع خريطة طوبولوجيا تفاعلية والوصول إلى الجهاز بنقرة مزدوجة.",
        highlights: ["ARP · ICMP · SNMP · ONVIF", "خريطة طوبولوجيا تفاعلية", "وصول سريع بنقرة مزدوجة"],
        caption: "سجل الأجهزة المباشر وخريطة طوبولوجيا الشبكة في IPscans+ على نظام Windows.",
      },
      ipcast: {
        category: "سطح المكتب البعيد ونقل الملفات",
        headline: "جلسات سطح مكتب بعيد مباشرة مع تحكم صريح في الصلاحيات.",
        description:
          "اتصل عبر معرّف جهاز مكوّن من 9 أرقام أو عنوان IP مباشر عبر قنوات محمية بـ TLS مع اعتماد صلاحيات العرض والتحكم والحافظة المشتركة ونقل الملفات.",
        highlights: ["معرّف من 9 أرقام أو IP مباشر", "اعتماد صلاحيات الجلسة", "نقل ملفات مشفّر عبر TLS"],
        caption: "مساحة عمل سطح المكتب البعيد IPCast مع إدارة الصلاحيات ونقل الملفات.",
      },
      lpr: {
        category: "منظومة التعرف على لوحات المركبات",
        headline: "وحدة تحكم مباشرة من خمس صفحات للبوابات ومواقف السيارات.",
        description:
          "تعرف محلي على اللوحات عبر ONNX مع خطوط مستقلة للتشغيل والقراءة، ومناطق مضلعة، وسجل مركبات السكان، وسجل أحداث مشفّر.",
        highlights: ["وحدة تحكم من 5 صفحات", "خطوط تشغيل وقراءة مستقلة", "سجل السكان والمركبات"],
        caption: "جدار الكاميرات المباشر وقراءات اللوحات وسجل العبور في IPScans LPR Pro.",
      },
      cortex: {
        category: "الذكاء البصري للكاميرات ومحرك القواعد",
        headline: "ذكاء محلي لكاميرات RTSP وتوثيق فيديو تلقائي للأحداث.",
        description:
          "اربط بث RTSP وONVIF، وشغّل 12 قاعدة محلية مع الذكاء البصري، واحفظ مقاطع إثبات مدتها 12 ثانية مع إشعارات Webhook.",
        highlights: ["دعم بث RTSP وONVIF", "12 قاعدة محلية + ذكاء بصري", "مقاطع إثبات فيديو 12 ثانية"],
        caption: "محرك قواعد IPScans Cortex يراقب بث كاميرات RTSP محليًا.",
      },
    },
    toolsTitle: "تشخيصات فورية مباشرة من متصفحك.",
    toolsLead:
      "افحص توجيه عناوين IP، وتحقق من سجلات DNS، واستعلم عن بيانات WHOIS، واختبر منافذ TCP الشائعة، وقس سرعة اتصالك دون تثبيت أي برامج.",
    articlesTitle: "أدلة ميدانية وملاحظات في هندسة الشبكات.",
    viewAllArticles: "جميع المقالات",
    minRead: "دقائق قراءة",
    closingNote: "تطبيقات سطح مكتب Windows 10/11 (x64) · أدوات تشخيص مجانية بالمتصفح · لا يتطلب التسجيل",
  },

  ja: {
    heroHeadline: "ネットワークのすべての接続を、鮮明に把握する。",
    heroLead:
      "IPScans は、Windows ネイティブアプリ（IPscans+、IPCast、LPR Pro、Cortex）と、ブラウザで即座に使える診断ツールを統合したネットワークインテリジェンス・プラットフォームです。",
    downloadScannerCta: "Windows 版 IPscans+ をダウンロード",
    runSpeedTestCta: "スピードテストを実行",
    scrollCue: "プラットフォームを見る",
    lineupTitle: "4 つのネイティブアプリケーション。ひとつの運用基準。",
    lineupLead:
      "サブネット検出、暗号化リモートサポート、ナンバープレート認識、ローカルカメラ解析のために Windows 10 / 11 (x64) 向けに設計されています。",
    downloadForWindows: "Windows 版をダウンロード",
    scannerViews: {
      discovery: "デバイス検出",
      topology: "トポロジーマップ",
      discoveryCaption: "稼働ホスト、MAC ベンダー、開放サービスを一覧表示する IPscans+ の並列サブネットスキャン。",
      topologyCaption: "各デバイスへ即座にアクセスできるインタラクティブなトポロジーマップ。",
    },
    products: {
      scanner: {
        category: "ネットワーク検出・トポロジー",
        headline: "ローカルサブネット上のすべてのホスト、ポート、カメラを可視化。",
        description:
          "ARP、ICMP、SNMP、WMI、UPnP、ONVIF によるマルチスレッド検出と、インタラクティブなトポロジーマップ、ダブルクリックでのデバイスアクセスを提供します。",
        highlights: ["ARP · ICMP · SNMP · ONVIF", "対話型トポロジーマップ", "ダブルクリックで直接アクセス"],
        caption: "Windows 上の IPscans+ ライブデバイス一覧とトポロジーマップ。",
      },
      ipcast: {
        category: "リモートデスクトップ・ファイル転送",
        headline: "明示的なアクセス承認を備えた直接リモートデスクトップ。",
        description:
          "9 桁のデバイス ID または直接 IP で TLS 暗号化チャネル経由で接続。閲覧・操作権限の承認、クリップボード共有、分割ファイル転送に対応します。",
        highlights: ["9 桁 ID または直接 IP 接続", "セッションごとの権限承認", "TLS 暗号化ファイル転送"],
        caption: "セッション権限管理とファイル転送を備えた IPCast リモートデスクトップ画面。",
      },
      lpr: {
        category: "ナンバープレート認識スイート",
        headline: "ゲートや駐車場向けの 5 画面ライブオペレーターコンソール。",
        description:
          "独立したトリガーラインと認識ライン、ポリゴン領域、居住者車両台帳、暗号化イベントジャーナルを備えたローカル ONNX ナンバープレート認識。",
        highlights: ["5 画面オペレーターコンソール", "独立トリガー・認識ライン", "居住者・車両レジストリ"],
        caption: "IPScans LPR Pro のライブカメラウォール、ナンバー読み取り、通過ログ。",
      },
      cortex: {
        category: "カメラビジョン AI・ルールエンジン",
        headline: "RTSP カメラのローカル解析と自動ビデオ証跡アーカイブ。",
        description:
          "RTSP / ONVIF ストリームを接続し、12 のネイティブルールとローカルビジョン AI を実行。トリガー後 12 秒間の証跡映像を保存し Webhook で通知します。",
        highlights: ["RTSP / ONVIF ストリーム入力", "12 のネイティブ + AI ルール", "12 秒間の証跡ビデオ保存"],
        caption: "RTSP カメラ映像をローカルで監視する IPScans Cortex ルールエンジン。",
      },
    },
    toolsTitle: "ブラウザで即座に使えるネットワーク診断。",
    toolsLead:
      "ソフトのインストール不要で、IP ルーティングの確認、DNS レコードの検証、WHOIS 照会、主要 TCP ポートのチェック、回線速度の測定が行えます。",
    articlesTitle: "フィールドガイド＆ネットワーク技術ノート。",
    viewAllArticles: "すべての記事",
    minRead: "分で読了",
    closingNote: "Windows 10/11 (x64) デスクトップアプリ · 無料ブラウザ診断ツール · 登録不要",
  },

  ko: {
    heroHeadline: "네트워크의 모든 연결을 선명하게 포착합니다.",
    heroLead:
      "IPScans는 Windows 네이티브 애플리케이션(IPscans+, IPCast, LPR Pro, Cortex)과 브라우저 기반 즉시 진단 도구를 하나로 결합한 네트워크 인텔리전스 플랫폼입니다.",
    downloadScannerCta: "Windows용 IPscans+ 다운로드",
    runSpeedTestCta: "속도 테스트 실행",
    scrollCue: "플랫폼 살펴보기",
    lineupTitle: "네 가지 네이티브 애플리케이션. 하나의 운영 표준.",
    lineupLead:
      "서브넷 탐색, 암호화 원격 지원, 차량 번호판 인식, 로컬 카메라 지능형 분석을 위해 Windows 10 및 11 (x64) 환경에 맞춰 설계되었습니다.",
    downloadForWindows: "Windows용 다운로드",
    scannerViews: {
      discovery: "장치 탐색",
      topology: "토폴로지 맵",
      discoveryCaption: "활성 호스트, MAC 제조사, 열린 서비스를 보여주는 IPscans+ 병렬 서브넷 스캔.",
      topologyCaption: "장치를 즉시 확인하고 접속할 수 있는 인터랙티브 토폴로지 맵.",
    },
    products: {
      scanner: {
        category: "네트워크 탐색 및 토폴로지",
        headline: "로컬 서브넷의 모든 호스트, 포트, 카메라를 한눈에 매핑하세요.",
        description:
          "ARP, ICMP, SNMP, WMI, UPnP, ONVIF 멀티스레드 탐색과 인터랙티브 토폴로지 맵, 더블 클릭 장치 접속 기능을 제공합니다.",
        highlights: ["ARP · ICMP · SNMP · ONVIF", "인터랙티브 토폴로지 맵", "더블 클릭 장치 접속"],
        caption: "Windows용 IPscans+ 실시간 장치 인벤토리 및 토폴로지 매핑.",
      },
      ipcast: {
        category: "원격 데스크톱 및 파일 전송",
        headline: "명시적 접근 승인을 갖춘 직관적인 원격 데스크톱 세션.",
        description:
          "9자리 장치 ID 또는 직접 IP를 통해 TLS 보호 채널로 연결하며, 화면 보기/제어 권한 승인, 클립보드 공유 및 분할 파일 전송을 지원합니다.",
        highlights: ["9자리 ID 또는 직접 IP 연결", "세션별 권한 승인 제어", "TLS 암호화 파일 전송"],
        caption: "세션 제어 및 파일 전송 기능을 갖춘 IPCast 원격 데스크톱 워크스페이스.",
      },
      lpr: {
        category: "차량 번호판 인식 스위트",
        headline: "출입 게이트와 주차장을 위한 5페이지 실시간 운영자 콘솔.",
        description:
          "독립된 트리거 및 인식 라인, 다각형 영역, 입주자 차량 등록부, 암호화된 이벤트 저널을 갖춘 로컬 ONNX 번호판 인식 솔루션입니다.",
        highlights: ["5페이지 운영자 워크스페이스", "독립 트리거 및 인식 라인", "입주자 및 차량 등록부"],
        caption: "IPScans LPR Pro 실시간 카메라 월, 번호판 판독 및 출입 이벤트 로그.",
      },
      cortex: {
        category: "카메라 비전 AI 및 규칙 엔진",
        headline: "로컬 RTSP 카메라 인텔리전스 및 자동 비디오 증거 보관.",
        description:
          "RTSP 및 ONVIF 스트림을 연결하고 12가지 네이티브 규칙과 로컬 비전 AI를 실행하여 12초 분량의 증거 비디오 클립을 저장 및 웹훅으로 전달합니다.",
        highlights: ["RTSP 및 ONVIF 스트림 연결", "12개 네이티브 + 비전 AI 규칙", "12초 비디오 증거 클립"],
        caption: "실시간 RTSP 카메라 피드를 로컬에서 분석하는 IPScans Cortex 규칙 엔진.",
      },
    },
    toolsTitle: "설치 없이 브라우저에서 바로 실행하는 진단 도구.",
    toolsLead:
      "별도 소프트웨어 설치 없이 IP 라우팅 확인, DNS 레코드 검증, WHOIS 조회, 주요 TCP 포트 점검 및 인터넷 속도 측정을 즉시 수행하세요.",
    articlesTitle: "현장 가이드 및 네트워크 엔지니어링 노트.",
    viewAllArticles: "모든 글 보기",
    minRead: "분 분량",
    closingNote: "Windows 10/11 (x64) 데스크톱 애플리케이션 · 무료 브라우저 진단 도구 · 회원가입 불필요",
  },

  zh: {
    heroHeadline: "让网络中的每一处连接都清晰可见。",
    heroLead:
      "IPScans 是集成了原生 Windows 应用程序（IPscans+、IPCast、LPR Pro 与 Cortex）与即时浏览器诊断工具的网络智能平台。",
    downloadScannerCta: "下载 Windows 版 IPscans+",
    runSpeedTestCta: "运行测速",
    scrollCue: "探索平台",
    lineupTitle: "四款原生桌面应用，统一的工程标准。",
    lineupLead:
      "专为 Windows 10 和 11 (x64) 打造，涵盖子网发现、加密远程桌面支持、车牌识别以及本地摄像机视觉智能。",
    downloadForWindows: "下载 Windows 版",
    scannerViews: {
      discovery: "设备发现",
      topology: "拓扑地图",
      discoveryCaption: "IPscans+ 并行子网扫描，直观呈现活动主机、MAC 厂商与开放服务。",
      topologyCaption: "支持双击直达设备的交互式二层/三层网络拓扑图。",
    },
    products: {
      scanner: {
        category: "网络发现与拓扑映射",
        headline: "精准绘制本地子网中的每一台主机、端口与摄像机。",
        description:
          "支持多线程 ARP、ICMP、SNMP、WMI、UPnP 与 ONVIF 发现，提供交互式拓扑地图与双击快速访问设备界面。",
        highlights: ["ARP · ICMP · SNMP · ONVIF", "交互式网络拓扑地图", "双击直达设备界面"],
        caption: "Windows 平台上的 IPscans+ 实时设备清单与网络拓扑视图。",
      },
      ipcast: {
        category: "远程桌面与文件传输",
        headline: "具备显式权限审批的直连远程桌面会话。",
        description:
          "通过 9 位设备 ID 或直接 IP 在 TLS 加密通道上建立连接，支持查看/控制权限审批、剪贴板同步与分块文件传输。",
        highlights: ["9 位设备码或直接 IP", "会话级权限审批", "TLS 加密文件传输"],
        caption: "集成会话权限控制与文件传输的 IPCast 远程桌面工作区。",
      },
      lpr: {
        category: "车牌识别与道闸套件",
        headline: "面向出入口与停车场的五页面实时操作员控制台。",
        description:
          "本地 ONNX 车牌识别引擎，具备独立触发线与识别线、多边形区域、住户车辆登记册以及加密事件日志。",
        highlights: ["5 页面操作员工作区", "独立触发线与识别线", "住户与车辆登记管理"],
        caption: "IPScans LPR Pro 实时监控墙、车牌识别抓拍与通行事件记录。",
      },
      cortex: {
        category: "摄像机视觉 AI 与规则引擎",
        headline: "本地 RTSP 摄像机智能分析与自动视频取证归档。",
        description:
          "接入 RTSP 与 ONVIF 视频流，结合 12 项原生规则与本地视觉 AI 模型，自动保存触发后 12 秒取证视频并通过 Webhook 推送。",
        highlights: ["RTSP 与 ONVIF 视频接入", "12 项原生 + 视觉 AI 规则", "12 秒视频取证自动剪辑"],
        caption: "在本地实时监测 RTSP 摄像机视频流的 IPScans Cortex 规则引擎。",
      },
    },
    toolsTitle: "无需安装，在浏览器中即时运行网络诊断。",
    toolsLead:
      "直接在浏览器中查询 IP 路由、验证 DNS 解析记录、检索 WHOIS 信息、检测常见 TCP 端口并测量实时连接速度。",
    articlesTitle: "实战指南与网络工程笔记。",
    viewAllArticles: "查看全部文章",
    minRead: "分钟阅读",
    closingNote: "Windows 10/11 (x64) 桌面应用程序 · 免费浏览器诊断工具 · 无需注册登录",
  },
};
