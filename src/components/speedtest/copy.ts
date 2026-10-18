import type { Locale } from "@/i18n/config";
import type { ActivityId, ActivityRating, StabilityRating } from "@/lib/speed-engine";

export type SpeedTestCopy = {
  eyebrow: string;
  stop: string;
  retry: string;
  phases: {
    idle: string;
    init: string;
    latency: string;
    download: string;
    upload: string;
    complete: string;
  };
  gauge: {
    idleCaption: string;
    latencyLabel: string;
    downloadLabel: string;
    uploadLabel: string;
    resultLabel: string;
    peakPrefix: string;
    minPrefix: string;
  };
  metrics: {
    jitter: string;
    jitterDesc: string;
    loadedLatency: string;
    loadedDesc: string;
    stability: string;
    stabilityDesc: string;
    minPing: string;
    medianPing: string;
    peak: string;
    transferred: string;
    bufferbloat: string;
    underLoad: string;
    variance: string;
  };
  stabilityRatings: Record<StabilityRating, string>;
  network: {
    server: string;
    clientIp: string;
    isp: string;
    location: string;
  };
  chart: {
    title: string;
    waiting: string;
    live: string;
  };
  results: {
    eyebrow: string;
    title: string;
    lead: string;
    copyReport: string;
    copied: string;
    exportJson: string;
    duration: string;
    totalData: string;
    samples: string;
    thresholdLabel: string;
    measuredLabel: string;
    ratings: Record<ActivityRating, string>;
    activities: Record<ActivityId, { title: string; desc: string }>;
  };
  history: {
    title: string;
    clear: string;
    time: string;
  };
  errors: {
    offlineTitle: string;
    offlineBody: string;
    blockedTitle: string;
    blockedBody: string;
    stopped: string;
  };
  methodology: {
    eyebrow: string;
    title: string;
    lead: string;
    items: [
      { title: string; body: string },
      { title: string; body: string },
      { title: string; body: string },
    ];
  };
};

export const speedTestCopy: Record<Locale, SpeedTestCopy> = {
  en: {
    eyebrow: "Network Telemetry · Browser Speed Test",
    stop: "Stop test",
    retry: "Try again",
    phases: {
      idle: "Ready",
      init: "Connecting",
      latency: "Latency",
      download: "Download",
      upload: "Upload",
      complete: "Complete",
    },
    gauge: {
      idleCaption: "Press start to measure real throughput and latency",
      latencyLabel: "Idle Latency",
      downloadLabel: "Download Speed",
      uploadLabel: "Upload Speed",
      resultLabel: "Download Speed",
      peakPrefix: "Peak",
      minPrefix: "Min",
    },
    metrics: {
      jitter: "Jitter",
      jitterDesc: "Consecutive RTT variation",
      loadedLatency: "Loaded Latency",
      loadedDesc: "Latency under active load",
      stability: "Stability",
      stabilityDesc: "Throughput consistency",
      minPing: "Min",
      medianPing: "Median",
      peak: "Peak",
      transferred: "Transferred",
      bufferbloat: "Grade",
      underLoad: "under load",
      variance: "CV",
    },
    stabilityRatings: {
      excellent: "Excellent",
      good: "Good",
      fair: "Fair",
      poor: "Unstable",
      unknown: "—",
    },
    network: {
      server: "Test Edge",
      clientIp: "Client IP",
      isp: "ISP / Network",
      location: "Location",
    },
    chart: {
      title: "Real-Time Throughput",
      waiting: "Live download and upload streams appear here during measurement",
      live: "Live sample stream",
    },
    results: {
      eyebrow: "Diagnostic Report",
      title: "What your connection can handle",
      lead: "Activity ratings calculated directly from your measured download, upload, idle ping, and jitter.",
      copyReport: "Copy summary",
      copied: "Copied",
      exportJson: "Export JSON",
      duration: "Duration",
      totalData: "Data transferred",
      samples: "Latency samples",
      thresholdLabel: "Threshold",
      measuredLabel: "Measured",
      ratings: {
        optimal: "Optimal",
        good: "Good",
        limited: "Limited",
      },
      activities: {
        streaming4k: {
          title: "4K UHD Streaming",
          desc: "Sustained high-bitrate video playback without rebuffering.",
        },
        gaming: {
          title: "Online Gaming",
          desc: "Fast round-trip response and low packet timing variance.",
        },
        videoCalls: {
          title: "HD Video Calls",
          desc: "Two-way real-time audio and multi-participant screen sharing.",
        },
        cloudBackup: {
          title: "Cloud Sync & Large Uploads",
          desc: "Sending large media archives, backups, and project repositories.",
        },
      },
    },
    history: {
      title: "Recent Measurements",
      clear: "Clear history",
      time: "Time",
    },
    errors: {
      offlineTitle: "You appear to be offline",
      offlineBody: "Check your internet connection and run the measurement again.",
      blockedTitle: "Measurement could not be completed",
      blockedBody: "A network interruption, firewall, or timeout stopped the transfer stream.",
      stopped: "Measurement stopped.",
    },
    methodology: {
      eyebrow: "Methodology",
      title: "How IPScans measures your connection",
      lead: "Every reading is computed from real browser network streams with zero simulated numbers.",
      items: [
        {
          title: "Multi-stream transfer with warm-up discard",
          body: "Four parallel HTTP streams saturate high-capacity links while discarding the initial 800 ms TCP slow-start window so only steady-state throughput (bits / 1e6 / s) is counted.",
        },
        {
          title: "Idle RTT, jitter & loaded latency",
          body: "Ten sequential uncached probes establish minimum and median idle ping plus mean consecutive jitter, followed by concurrent probes during transfers to measure bufferbloat under load.",
        },
        {
          title: "Sample variance & stability analysis",
          body: "Continuous throughput samples are evaluated via their coefficient of variation (CV) and latency variance to grade real-world line stability.",
        },
      ],
    },
  },
  tr: {
    eyebrow: "Ağ Telemetrisi · Tarayıcı Hız Testi",
    stop: "Testi durdur",
    retry: "Tekrar dene",
    phases: {
      idle: "Hazır",
      init: "Bağlanıyor",
      latency: "Gecikme",
      download: "İndirme",
      upload: "Yükleme",
      complete: "Tamamlandı",
    },
    gauge: {
      idleCaption: "Gerçek bant genişliği ve gecikmeyi ölçmek için başlatın",
      latencyLabel: "Boşta Gecikme",
      downloadLabel: "İndirme Hızı",
      uploadLabel: "Yükleme Hızı",
      resultLabel: "İndirme Hızı",
      peakPrefix: "Zirve",
      minPrefix: "En düşük",
    },
    metrics: {
      jitter: "Jitter",
      jitterDesc: "Ardışık gecikme sapması",
      loadedLatency: "Yük Altında Gecikme",
      loadedDesc: "Aktarım sırasındaki tepki süresi",
      stability: "Kararlılık",
      stabilityDesc: "Akış tutarlılığı",
      minPing: "Min",
      medianPing: "Medyan",
      peak: "Zirve",
      transferred: "Aktarılan",
      bufferbloat: "Sınıf",
      underLoad: "yük farkı",
      variance: "DK",
    },
    stabilityRatings: {
      excellent: "Mükemmel",
      good: "İyi",
      fair: "Orta",
      poor: "Dalgalı",
      unknown: "—",
    },
    network: {
      server: "Test Sunucusu",
      clientIp: "İstemci IP",
      isp: "İSS / Ağ",
      location: "Konum",
    },
    chart: {
      title: "Gerçek Zamanlı Akış Grafiği",
      waiting: "Ölçüm sırasında canlı indirme ve yükleme eğrileri burada görünür",
      live: "Canlı örnek akışı",
    },
    results: {
      eyebrow: "Tanı Raporu",
      title: "Bağlantınızın gerçek kullanım performansı",
      lead: "Etkinlik uygunluğu doğrudan ölçülen indirme, yükleme, ping ve jitter değerlerinizden hesaplanır.",
      copyReport: "Özeti kopyala",
      copied: "Kopyalandı",
      exportJson: "JSON indir",
      duration: "Süre",
      totalData: "Aktarılan veri",
      samples: "Gecikme örneği",
      thresholdLabel: "Eşik",
      measuredLabel: "Ölçülen",
      ratings: {
        optimal: "İdeal",
        good: "İyi",
        limited: "Sınırlı",
      },
      activities: {
        streaming4k: {
          title: "4K UHD Video Akışı",
          desc: "Takılma veya ön belleğe alma olmadan yüksek bit hızlı video izleme.",
        },
        gaming: {
          title: "Çevrimiçi Oyun",
          desc: "Düşük gidiş-dönüş tepki süresi ve kararlı paket zamanlaması.",
        },
        videoCalls: {
          title: "HD Görüntülü Görüşme",
          desc: "Çok katılımlı toplantılarda kesintisiz çift yönlü ses ve ekran paylaşımı.",
        },
        cloudBackup: {
          title: "Bulut Yedekleme ve Büyük Dosyalar",
          desc: "Yüksek boyutlu medya arşivlerini ve yedekleri hızla karşıya yükleme.",
        },
      },
    },
    history: {
      title: "Son Ölçümler",
      clear: "Geçmişi temizle",
      time: "Saat",
    },
    errors: {
      offlineTitle: "İnternet bağlantısı algılanamadı",
      offlineBody: "Ağ bağlantınızı kontrol edip hız testini yeniden başlatın.",
      blockedTitle: "Ölçüm tamamlanamadı",
      blockedBody: "Bir ağ kesintisi, güvenlik duvarı veya zaman aşımı veri akışını durdurdu.",
      stopped: "Ölçüm durduruldu.",
    },
    methodology: {
      eyebrow: "Metodoloji",
      title: "IPScans bağlantı performansını nasıl ölçer?",
      lead: "Tüm sonuçlar simülasyon olmadan, doğrudan tarayıcı üzerinden gerçek veri akışlarıyla hesaplanır.",
      items: [
        {
          title: "Isınma süresini dışlayan çoklu akış",
          body: "Dört paralel HTTP akışı yüksek kapasiteli hatları doyururken, ilk 800 ms'lik TCP yavaş başlangıç (slow-start) penceresini hariç tutarak yalnızca kararlı hızı (bit / 1e6 / sn) ölçer.",
        },
        {
          title: "Boşta RTT, jitter ve yük altında gecikme",
          body: "Önbelleksiz on ardışık sorgu minimum ve medyan ping ile jitter değerini belirler; indirme ve yükleme sırasında devam eden sorgular ise yük altındaki gecikmeyi (bufferbloat) ortaya koyar.",
        },
        {
          title: "Varyans ve hat kararlılığı analizi",
          body: "Canlı hız örneklerinin değişim katsayısı (CV) ve gecikme sapması birlikte değerlendirilerek bağlantınızın gerçek kararlılık puanı hesaplanır.",
        },
      ],
    },
  },
  de: {
    eyebrow: "Netzwerk-Telemetrie · Browser-Geschwindigkeitstest",
    stop: "Test stoppen",
    retry: "Erneut versuchen",
    phases: {
      idle: "Bereit",
      init: "Verbinden",
      latency: "Latenz",
      download: "Download",
      upload: "Upload",
      complete: "Fertig",
    },
    gauge: {
      idleCaption: "Starten Sie den Test, um Durchsatz und Latenz real zu messen",
      latencyLabel: "Leerlauf-Latenz",
      downloadLabel: "Download-Rate",
      uploadLabel: "Upload-Rate",
      resultLabel: "Download-Rate",
      peakPrefix: "Spitze",
      minPrefix: "Min",
    },
    metrics: {
      jitter: "Jitter",
      jitterDesc: "RTT-Schwankung",
      loadedLatency: "Latenz unter Last",
      loadedDesc: "Reaktionszeit bei Transfer",
      stability: "Stabilität",
      stabilityDesc: "Durchsatz-Konstanz",
      minPing: "Min",
      medianPing: "Median",
      peak: "Spitze",
      transferred: "Übertragen",
      bufferbloat: "Note",
      underLoad: "unter Last",
      variance: "VK",
    },
    stabilityRatings: {
      excellent: "Exzellent",
      good: "Gut",
      fair: "Mittel",
      poor: "Instabil",
      unknown: "—",
    },
    network: {
      server: "Test-Server",
      clientIp: "Client-IP",
      isp: "ISP / Netzwerk",
      location: "Standort",
    },
    chart: {
      title: "Echtzeit-Durchsatz",
      waiting: "Live-Kurven für Download und Upload erscheinen während der Messung",
      live: "Live-Messstrom",
    },
    results: {
      eyebrow: "Diagnosebericht",
      title: "Wofür Ihre Verbindung ausgelegt ist",
      lead: "Bewertungen basieren direkt auf Ihren gemessenen Download-, Upload-, Ping- und Jitter-Werten.",
      copyReport: "Bericht kopieren",
      copied: "Kopiert",
      exportJson: "JSON exportieren",
      duration: "Dauer",
      totalData: "Datenmenge",
      samples: "Latenzproben",
      thresholdLabel: "Richtwert",
      measuredLabel: "Gemessen",
      ratings: {
        optimal: "Optimal",
        good: "Gut",
        limited: "Begrenzt",
      },
      activities: {
        streaming4k: {
          title: "4K-UHD-Streaming",
          desc: "Unterbrechungsfreie Videowiedergabe mit hoher Bitrate.",
        },
        gaming: {
          title: "Online-Gaming",
          desc: "Kurze Antwortzeiten und minimale Paketlaufzeitschwankungen.",
        },
        videoCalls: {
          title: "HD-Videokonferenzen",
          desc: "Flüssige bidirektionale Audio-, Video- und Bildschirmübertragung.",
        },
        cloudBackup: {
          title: "Cloud-Sync & große Uploads",
          desc: "Schnelles Senden großer Archive, Backups und Projektdaten.",
        },
      },
    },
    history: {
      title: "Letzte Messungen",
      clear: "Verlauf löschen",
      time: "Zeit",
    },
    errors: {
      offlineTitle: "Keine Internetverbindung erkannt",
      offlineBody: "Bitte prüfen Sie Ihre Netzwerkverbindung und starten Sie den Test erneut.",
      blockedTitle: "Messung konnte nicht abgeschlossen werden",
      blockedBody: "Eine Netzwerkunterbrechung, Firewall oder Zeitüberschreitung hat den Datenstrom beendet.",
      stopped: "Messung gestoppt.",
    },
    methodology: {
      eyebrow: "Methodik",
      title: "Wie IPScans Ihre Verbindung misst",
      lead: "Jeder Messwert stammt aus echten Browser-Datenströmen ohne simulierte Schätzungen.",
      items: [
        {
          title: "Mehrstrom-Transfer ohne Aufwärmphase",
          body: "Vier parallele HTTP-Streams lasten schnelle Leitungen aus, während die ersten 800 ms (TCP Slow-Start) verworfen werden, um nur den stabilen Durchsatz zu berechnen.",
        },
        {
          title: "Leerlauf-RTT, Jitter & Last-Latenz",
          body: "Zehn ungecachte Proben ermitteln Minimal- und Median-Ping sowie Jitter; parallele Messungen während des Transfers zeigen Bufferbloat unter Last.",
        },
        {
          title: "Varianz- und Stabilitätsanalyse",
          body: "Der Variationskoeffizient (VK) der Live-Abtastwerte und die Latenzstreuung bewerten die reale Leitungsstabilität.",
        },
      ],
    },
  },
  es: {
    eyebrow: "Telemetría de Red · Test de Velocidad",
    stop: "Detener test",
    retry: "Reintentar",
    phases: {
      idle: "Listo",
      init: "Conectando",
      latency: "Latencia",
      download: "Descarga",
      upload: "Subida",
      complete: "Completado",
    },
    gauge: {
      idleCaption: "Pulsa iniciar para medir el caudal real y la latencia",
      latencyLabel: "Latencia en reposo",
      downloadLabel: "Velocidad de descarga",
      uploadLabel: "Velocidad de subida",
      resultLabel: "Velocidad de descarga",
      peakPrefix: "Pico",
      minPrefix: "Mín",
    },
    metrics: {
      jitter: "Jitter",
      jitterDesc: "Variación consecutiva de RTT",
      loadedLatency: "Latencia bajo carga",
      loadedDesc: "Respuesta durante transferencia",
      stability: "Estabilidad",
      stabilityDesc: "Consistencia del caudal",
      minPing: "Mín",
      medianPing: "Mediana",
      peak: "Pico",
      transferred: "Transferido",
      bufferbloat: "Grado",
      underLoad: "bajo carga",
      variance: "CV",
    },
    stabilityRatings: {
      excellent: "Excelente",
      good: "Buena",
      fair: "Moderada",
      poor: "Inestable",
      unknown: "—",
    },
    network: {
      server: "Servidor de prueba",
      clientIp: "IP del cliente",
      isp: "ISP / Red",
      location: "Ubicación",
    },
    chart: {
      title: "Caudal en Tiempo Real",
      waiting: "Las curvas de descarga y subida en vivo aparecerán aquí durante la medición",
      live: "Muestreo en vivo",
    },
    results: {
      eyebrow: "Informe de Diagnóstico",
      title: "Capacidad real de tu conexión",
      lead: "Evaluación calculada directamente a partir de tu descarga, subida, ping y jitter medidos.",
      copyReport: "Copiar resumen",
      copied: "Copiado",
      exportJson: "Exportar JSON",
      duration: "Duración",
      totalData: "Datos transferidos",
      samples: "Muestras RTT",
      thresholdLabel: "Umbral",
      measuredLabel: "Medido",
      ratings: {
        optimal: "Óptimo",
        good: "Bueno",
        limited: "Limitado",
      },
      activities: {
        streaming4k: {
          title: "Streaming 4K UHD",
          desc: "Reproducción continua de vídeo de alta tasa de bits sin cortes.",
        },
        gaming: {
          title: "Juegos en línea",
          desc: "Tiempo de respuesta rápido y baja variación entre paquetes.",
        },
        videoCalls: {
          title: "Videollamadas HD",
          desc: "Audio y vídeo bidireccional fluido con uso compartido de pantalla.",
        },
        cloudBackup: {
          title: "Copia en la nube y archivos grandes",
          desc: "Subida rápida de copias de seguridad, repositorios y archivos multimedia.",
        },
      },
    },
    history: {
      title: "Mediciones Recientes",
      clear: "Borrar historial",
      time: "Hora",
    },
    errors: {
      offlineTitle: "Sin conexión a internet",
      offlineBody: "Comprueba tu conexión de red y vuelve a ejecutar la prueba.",
      blockedTitle: "No se pudo completar la medición",
      blockedBody: "Una interrupción de red, cortafuegos o tiempo de espera detuvo el flujo de datos.",
      stopped: "Medición detenida.",
    },
    methodology: {
      eyebrow: "Metodología",
      title: "Cómo mide IPScans tu conexión",
      lead: "Cada cifra se calcula a partir de flujos de red reales en el navegador, sin datos simulados.",
      items: [
        {
          title: "Transferencia multiflujo con descarte de arranque",
          body: "Cuatro flujos HTTP paralelos saturan enlaces de alta capacidad descartando los primeros 800 ms de arranque lento TCP para medir solo el caudal sostenido.",
        },
        {
          title: "RTT en reposo, jitter y latencia bajo carga",
          body: "Diez sondas sin caché determinan el ping mínimo, mediano y el jitter; las sondas paralelas durante la transferencia miden el bufferbloat bajo carga.",
        },
        {
          title: "Análisis de varianza y estabilidad",
          body: "El coeficiente de variación (CV) de las muestras reales y la dispersión de latencia determinan la puntuación de estabilidad de la línea.",
        },
      ],
    },
  },
  fr: {
    eyebrow: "Télémétrie Réseau · Test de Débit",
    stop: "Arrêter le test",
    retry: "Réessayer",
    phases: {
      idle: "Prêt",
      init: "Connexion",
      latency: "Latence",
      download: "Descendant",
      upload: "Montant",
      complete: "Terminé",
    },
    gauge: {
      idleCaption: "Lancez le test pour mesurer votre débit réel et la latence",
      latencyLabel: "Latence au repos",
      downloadLabel: "Débit descendant",
      uploadLabel: "Débit montant",
      resultLabel: "Débit descendant",
      peakPrefix: "Pic",
      minPrefix: "Min",
    },
    metrics: {
      jitter: "Gigue",
      jitterDesc: "Variation RTT consécutive",
      loadedLatency: "Latence sous charge",
      loadedDesc: "Réactivité pendant transfert",
      stability: "Stabilité",
      stabilityDesc: "Régularité du débit",
      minPing: "Min",
      medianPing: "Médiane",
      peak: "Pic",
      transferred: "Transféré",
      bufferbloat: "Note",
      underLoad: "sous charge",
      variance: "CV",
    },
    stabilityRatings: {
      excellent: "Excellente",
      good: "Bonne",
      fair: "Moyenne",
      poor: "Instable",
      unknown: "—",
    },
    network: {
      server: "Serveur de test",
      clientIp: "IP client",
      isp: "FAI / Réseau",
      location: "Localisation",
    },
    chart: {
      title: "Débit en Temps Réel",
      waiting: "Les courbes de téléchargement et d’envoi s’affichent ici pendant la mesure",
      live: "Flux d’échantillons en direct",
    },
    results: {
      eyebrow: "Rapport de Diagnostic",
      title: "Ce que votre connexion permet au quotidien",
      lead: "Qualifications calculées directement à partir de vos mesures de débit, ping et gigue.",
      copyReport: "Copier le résumé",
      copied: "Copié",
      exportJson: "Exporter JSON",
      duration: "Durée",
      totalData: "Données transférées",
      samples: "Échantillons RTT",
      thresholdLabel: "Seuil",
      measuredLabel: "Mesuré",
      ratings: {
        optimal: "Optimal",
        good: "Bon",
        limited: "Limité",
      },
      activities: {
        streaming4k: {
          title: "Streaming 4K UHD",
          desc: "Lecture vidéo haut débit continue sans mise en mémoire tampon.",
        },
        gaming: {
          title: "Jeux en ligne",
          desc: "Temps de réponse aller-retour rapide et faible gigue.",
        },
        videoCalls: {
          title: "Appels vidéo HD",
          desc: "Audio/vidéo bidirectionnel fluide et partage d’écran à plusieurs.",
        },
        cloudBackup: {
          title: "Sauvegarde cloud & fichiers lourds",
          desc: "Envoi rapide d’archives volumineuses, sauvegardes et dépôts.",
        },
      },
    },
    history: {
      title: "Mesures Récentes",
      clear: "Effacer l’historique",
      time: "Heure",
    },
    errors: {
      offlineTitle: "Aucune connexion internet détectée",
      offlineBody: "Vérifiez votre connexion réseau puis relancez le test.",
      blockedTitle: "La mesure n’a pas pu aboutir",
      blockedBody: "Une coupure réseau, un pare-feu ou un délai dépassé a interrompu le transfert.",
      stopped: "Mesure arrêtée.",
    },
    methodology: {
      eyebrow: "Méthodologie",
      title: "Comment IPScans mesure votre connexion",
      lead: "Chaque valeur est calculée à partir de flux réseau réels dans le navigateur, sans simulation.",
      items: [
        {
          title: "Transfert multi-flux avec préchauffage exclu",
          body: "Quatre flux HTTP parallèles saturent la bande passante tout en écartant les 800 premières ms de démarrage TCP pour ne retenir que le débit établi.",
        },
        {
          title: "RTT au repos, gigue et latence sous charge",
          body: "Dix sondes hors cache mesurent le ping minimal, médian et la gigue ; des sondes simultanées au transfert quantifient le bufferbloat sous charge.",
        },
        {
          title: "Analyse de variance et de stabilité",
          body: "Le coefficient de variation (CV) des échantillons de débit et la régularité de latence déterminent l’indice de stabilité réel.",
        },
      ],
    },
  },
  it: {
    eyebrow: "Telemetria di Rete · Test di Velocità",
    stop: "Ferma test",
    retry: "Riprova",
    phases: {
      idle: "Pronto",
      init: "Connessione",
      latency: "Latenza",
      download: "Download",
      upload: "Upload",
      complete: "Completato",
    },
    gauge: {
      idleCaption: "Premi avvia per misurare banda reale e latenza",
      latencyLabel: "Latenza a riposo",
      downloadLabel: "Velocità Download",
      uploadLabel: "Velocità Upload",
      resultLabel: "Velocità Download",
      peakPrefix: "Picco",
      minPrefix: "Min",
    },
    metrics: {
      jitter: "Jitter",
      jitterDesc: "Variazione RTT consecutiva",
      loadedLatency: "Latenza sotto carico",
      loadedDesc: "Risposta durante il trasferimento",
      stability: "Stabilità",
      stabilityDesc: "Costanza della banda",
      minPing: "Min",
      medianPing: "Mediana",
      peak: "Picco",
      transferred: "Trasferiti",
      bufferbloat: "Grado",
      underLoad: "sotto carico",
      variance: "CV",
    },
    stabilityRatings: {
      excellent: "Eccellente",
      good: "Buona",
      fair: "Discreta",
      poor: "Instabile",
      unknown: "—",
    },
    network: {
      server: "Server di test",
      clientIp: "IP cliente",
      isp: "ISP / Rete",
      location: "Posizione",
    },
    chart: {
      title: "Throughput in Tempo Reale",
      waiting: "Le curve di download e upload in tempo reale appariranno durante la misurazione",
      live: "Campionamento live",
    },
    results: {
      eyebrow: "Rapporto Diagnostico",
      title: "Cosa può sostenere la tua connessione",
      lead: "Valutazioni calcolate direttamente dai valori reali di download, upload, ping e jitter.",
      copyReport: "Copia riepilogo",
      copied: "Copiato",
      exportJson: "Esporta JSON",
      duration: "Durata",
      totalData: "Dati trasferiti",
      samples: "Campioni RTT",
      thresholdLabel: "Soglia",
      measuredLabel: "Misurato",
      ratings: {
        optimal: "Ottimale",
        good: "Buono",
        limited: "Limitato",
      },
      activities: {
        streaming4k: {
          title: "Streaming 4K UHD",
          desc: "Riproduzione video ad alto bitrate senza interruzioni di buffering.",
        },
        gaming: {
          title: "Gaming online",
          desc: "Bassa latenza di andata e ritorno e minima variazione tra pacchetti.",
        },
        videoCalls: {
          title: "Videochiamate HD",
          desc: "Audio e video bidirezionali fluidi con condivisione schermo.",
        },
        cloudBackup: {
          title: "Cloud sync e file di grandi dimensioni",
          desc: "Caricamento rapido di backup, archivi multimediali e progetti.",
        },
      },
    },
    history: {
      title: "Misurazioni Recenti",
      clear: "Cancella cronologia",
      time: "Ora",
    },
    errors: {
      offlineTitle: "Nessuna connessione internet rilevata",
      offlineBody: "Controlla la connessione di rete e riprova il test.",
      blockedTitle: "Impossibile completare la misurazione",
      blockedBody: "Un’interruzione di rete, firewall o timeout ha fermato il flusso dati.",
      stopped: "Misurazione interrotta.",
    },
    methodology: {
      eyebrow: "Metodologia",
      title: "Come IPScans misura la tua connessione",
      lead: "Ogni valore è calcolato da flussi di rete reali nel browser, senza dati simulati.",
      items: [
        {
          title: "Trasferimento multi-stream con scarto di avvio",
          body: "Quattro flussi HTTP paralleli saturano la linea scartando i primi 800 ms di avvio lento TCP per misurare solo la velocità a regime.",
        },
        {
          title: "RTT a riposo, jitter e latenza sotto carico",
          body: "Dieci sonde senza cache rilevano ping minimo, mediano e jitter; le sonde durante il trasferimento misurano il bufferbloat sotto carico.",
        },
        {
          title: "Analisi della varianza e stabilità",
          body: "Il coefficiente di variazione (CV) dei campioni e la dispersione della latenza determinano l’indice di stabilità della linea.",
        },
      ],
    },
  },
  pt: {
    eyebrow: "Telemetria de Rede · Teste de Velocidade",
    stop: "Parar teste",
    retry: "Tentar novamente",
    phases: {
      idle: "Pronto",
      init: "Conectando",
      latency: "Latência",
      download: "Download",
      upload: "Upload",
      complete: "Concluído",
    },
    gauge: {
      idleCaption: "Inicie para medir a largura de banda real e a latência",
      latencyLabel: "Latência em repouso",
      downloadLabel: "Velocidade de Download",
      uploadLabel: "Velocidade de Upload",
      resultLabel: "Velocidade de Download",
      peakPrefix: "Pico",
      minPrefix: "Mín",
    },
    metrics: {
      jitter: "Jitter",
      jitterDesc: "Variação consecutiva de RTT",
      loadedLatency: "Latência sob carga",
      loadedDesc: "Resposta durante transferência",
      stability: "Estabilidade",
      stabilityDesc: "Consistência da taxa",
      minPing: "Mín",
      medianPing: "Mediana",
      peak: "Pico",
      transferred: "Transferido",
      bufferbloat: "Nota",
      underLoad: "sob carga",
      variance: "CV",
    },
    stabilityRatings: {
      excellent: "Excelente",
      good: "Boa",
      fair: "Razoável",
      poor: "Instável",
      unknown: "—",
    },
    network: {
      server: "Servidor de teste",
      clientIp: "IP do cliente",
      isp: "ISP / Rede",
      location: "Localização",
    },
    chart: {
      title: "Taxa de Transferência em Tempo Real",
      waiting: "As curvas de download e upload em tempo real aparecem aqui durante a medição",
      live: "Amostragem ao vivo",
    },
    results: {
      eyebrow: "Relatório de Diagnóstico",
      title: "O que a sua ligação suporta",
      lead: "Classificações calculadas diretamente a partir do download, upload, ping e jitter medidos.",
      copyReport: "Copiar resumo",
      copied: "Copiado",
      exportJson: "Exportar JSON",
      duration: "Duração",
      totalData: "Dados transferidos",
      samples: "Amostras RTT",
      thresholdLabel: "Requisito",
      measuredLabel: "Medido",
      ratings: {
        optimal: "Ideal",
        good: "Bom",
        limited: "Limitado",
      },
      activities: {
        streaming4k: {
          title: "Streaming 4K UHD",
          desc: "Reprodução contínua de vídeo de alta taxa de bits sem interrupções.",
        },
        gaming: {
          title: "Jogos Online",
          desc: "Resposta rápida de ida e volta e baixa variação de pacotes.",
        },
        videoCalls: {
          title: "Videochamadas HD",
          desc: "Áudio e vídeo bidirecionais fluidos com partilha de ecrã.",
        },
        cloudBackup: {
          title: "Backup na nuvem e ficheiros grandes",
          desc: "Envio rápido de arquivos pesados, cópias de segurança e projetos.",
        },
      },
    },
    history: {
      title: "Medições Recentes",
      clear: "Limpar histórico",
      time: "Hora",
    },
    errors: {
      offlineTitle: "Sem ligação à internet",
      offlineBody: "Verifique a sua ligação de rede e execute o teste novamente.",
      blockedTitle: "Não foi possível concluir a medição",
      blockedBody: "Uma interrupção de rede, firewall ou tempo limite interrompeu o fluxo de dados.",
      stopped: "Medição interrompida.",
    },
    methodology: {
      eyebrow: "Metodologia",
      title: "Como a IPScans mede a sua ligação",
      lead: "Cada leitura é calculada a partir de fluxos reais no navegador, sem valores simulados.",
      items: [
        {
          title: "Transferência multifluxo com descarte inicial",
          body: "Quatro fluxos HTTP paralelos saturam ligações rápidas enquanto descartam os primeiros 800 ms de arranque TCP para medir apenas a velocidade estável.",
        },
        {
          title: "RTT em repouso, jitter e latência sob carga",
          body: "Dez sondagens sem cache determinam o ping mínimo, mediano e o jitter; sondagens paralelas durante a transferência medem o bufferbloat sob carga.",
        },
        {
          title: "Análise de variância e estabilidade",
          body: "O coeficiente de variação (CV) das amostras de velocidade e a dispersão da latência avaliam a estabilidade real da linha.",
        },
      ],
    },
  },
  nl: {
    eyebrow: "Netwerktelemetrie · Snelheidstest",
    stop: "Test stoppen",
    retry: "Opnieuw proberen",
    phases: {
      idle: "Gereed",
      init: "Verbinden",
      latency: "Latentie",
      download: "Download",
      upload: "Upload",
      complete: "Voltooid",
    },
    gauge: {
      idleCaption: "Klik op start om echte doorvoersnelheid en latentie te meten",
      latencyLabel: "Rust-latentie",
      downloadLabel: "Downloadsnelheid",
      uploadLabel: "Uploadsnelheid",
      resultLabel: "Downloadsnelheid",
      peakPrefix: "Piek",
      minPrefix: "Min",
    },
    metrics: {
      jitter: "Jitter",
      jitterDesc: "Opeenvolgende RTT-variatie",
      loadedLatency: "Belaste latentie",
      loadedDesc: "kwaliteit onder belasting",
      stability: "Stabiliteit",
      stabilityDesc: "Doorvoerconsistentie",
      minPing: "Min",
      medianPing: "Mediaan",
      peak: "Piek",
      transferred: "Verbruikt",
      bufferbloat: "Score",
      underLoad: "onder last",
      variance: "CV",
    },
    stabilityRatings: {
      excellent: "Uitstekend",
      good: "Goed",
      fair: "Redelijk",
      poor: "Instabiel",
      unknown: "—",
    },
    network: {
      server: "Testserver",
      clientIp: "Client-IP",
      isp: "ISP / Netwerk",
      location: "Locatie",
    },
    chart: {
      title: "Real-Time Doorvoer",
      waiting: "Live download- en uploadcurven verschijnen hier tijdens de meting",
      live: "Live meetstroom",
    },
    results: {
      eyebrow: "Diagnoserapport",
      title: "Wat uw verbinding aankan",
      lead: "Geschiktheid direct berekend op basis van uw gemeten download, upload, ping en jitter.",
      copyReport: "Overzicht kopiëren",
      copied: "Gekopieerd",
      exportJson: "JSON exporteren",
      duration: "Duur",
      totalData: "Verplaatste data",
      samples: "RTT-metingen",
      thresholdLabel: "Drempel",
      measuredLabel: "Gemeten",
      ratings: {
        optimal: "Optimaal",
        good: "Goed",
        limited: "Beperkt",
      },
      activities: {
        streaming4k: {
          title: "4K UHD-streaming",
          desc: "Vloeiende videoweergave met hoge bitrate zonder bufferen.",
        },
        gaming: {
          title: "Online gaming",
          desc: "Snelle reactietijd en minimale pakketvariatie.",
        },
        videoCalls: {
          title: "HD-videogesprekken",
          desc: "Stabiele tweerichtingsaudio, video en schermdeling.",
        },
        cloudBackup: {
          title: "Cloudback-up & grote bestanden",
          desc: "Snel versturen van grote media-archieven en back-ups.",
        },
      },
    },
    history: {
      title: "Recente Metingen",
      clear: "Geschiedenis wissen",
      time: "Tijd",
    },
    errors: {
      offlineTitle: "Geen internetverbinding gedetecteerd",
      offlineBody: "Controleer uw netwerkverbinding en start de test opnieuw.",
      blockedTitle: "Meting kon niet worden voltooid",
      blockedBody: "Een netwerkonderbreking, firewall of time-out heeft de gegevensstroom gestopt.",
      stopped: "Meting gestopt.",
    },
    methodology: {
      eyebrow: "Methodologie",
      title: "Hoe IPScans uw verbinding meet",
      lead: "Elke waarde wordt berekend uit echte browserstreams zonder gesimuleerde cijfers.",
      items: [
        {
          title: "Multi-stream overdracht zonder opwarmfase",
          body: "Vier parallelle HTTP-streams benutten snelle verbindingen volledig, terwijl de eerste 800 ms (TCP slow-start) worden genegeerd voor een zuivere meting.",
        },
        {
          title: "Rust-RTT, jitter & belaste latentie",
          body: "Tien ongecachte probes bepalen de minimale en mediane ping en jitter; gelijktijdige probes tijdens overdracht meten bufferbloat onder belasting.",
        },
        {
          title: "Variantie- en stabiliteitsanalyse",
          body: "De variatiecoëfficiënt (CV) van de doorvoermetingen en latentiespreiding bepalen de stabiliteitsscore van uw lijn.",
        },
      ],
    },
  },
  pl: {
    eyebrow: "Telemetria Sieci · Test Prędkości",
    stop: "Zatrzymaj test",
    retry: "Spróbuj ponownie",
    phases: {
      idle: "Gotowy",
      init: "Łączenie",
      latency: "Opóźnienie",
      download: "Pobieranie",
      upload: "Wysyłanie",
      complete: "Zakończono",
    },
    gauge: {
      idleCaption: "Kliknij start, aby zmierzyć rzeczywistą przepustowość i opóźnienie",
      latencyLabel: "Opóźnienie w spoczynku",
      downloadLabel: "Prędkość pobierania",
      uploadLabel: "Prędkość wysyłania",
      resultLabel: "Prędkość pobierania",
      peakPrefix: "Szczyt",
      minPrefix: "Min",
    },
    metrics: {
      jitter: "Jitter",
      jitterDesc: "Wahania kolejnych RTT",
      loadedLatency: "Opóźnienie pod obciążeniem",
      loadedDesc: "Responsywność podczas transferu",
      stability: "Stabilność",
      stabilityDesc: "Spójność przepustowości",
      minPing: "Min",
      medianPing: "Mediana",
      peak: "Szczyt",
      transferred: "Przesłano",
      bufferbloat: "Ocena",
      underLoad: "pod obciążeniem",
      variance: "CV",
    },
    stabilityRatings: {
      excellent: "Doskonała",
      good: "Dobra",
      fair: "Średnia",
      poor: "Niestabilna",
      unknown: "—",
    },
    network: {
      server: "Serwer testowy",
      clientIp: "IP klienta",
      isp: "ISP / Sieć",
      location: "Lokalizacja",
    },
    chart: {
      title: "Przepustowość w Czasie Rzeczywistym",
      waiting: "Wykresy pobierania i wysyłania na żywo pojawią się tutaj podczas pomiaru",
      live: "Strumień próbek na żywo",
    },
    results: {
      eyebrow: "Raport Diagnostyczny",
      title: "Do czego nadaje się Twoje łącze",
      lead: "Oceny obliczone bezpośrednio ze zmierzonego pobierania, wysyłania, pingu i jittera.",
      copyReport: "Kopiuj podsumowanie",
      copied: "Skopiowano",
      exportJson: "Eksportuj JSON",
      duration: "Czas trwania",
      totalData: "Przesłane dane",
      samples: "Próbki RTT",
      thresholdLabel: "Wymóg",
      measuredLabel: "Zmierzono",
      ratings: {
        optimal: "Optymalnie",
        good: "Dobrze",
        limited: "Ograniczone",
      },
      activities: {
        streaming4k: {
          title: "Streaming 4K UHD",
          desc: "Płynne odtwarzanie wideo o wysokim bitrate bez buforowania.",
        },
        gaming: {
          title: "Gry online",
          desc: "Niski czas odpowiedzi i minimalne wahania opóźnień pakietów.",
        },
        videoCalls: {
          title: "Rozmowy wideo HD",
          desc: "Stabilny dwukierunkowy dźwięk, obraz i udostępnianie ekranu.",
        },
        cloudBackup: {
          title: "Kopie w chmurze i duże pliki",
          desc: "Szybkie wysyłanie dużych archiwów, kopii zapasowych i repozytoriów.",
        },
      },
    },
    history: {
      title: "Ostatnie Pomiary",
      clear: "Wyczyść historię",
      time: "Czas",
    },
    errors: {
      offlineTitle: "Brak połączenia z internetem",
      offlineBody: "Sprawdź połączenie sieciowe i uruchom test ponownie.",
      blockedTitle: "Nie udało się ukończyć pomiaru",
      blockedBody: "Przerwa w sieci, zapora lub przekroczenie czasu zatrzymały strumień danych.",
      stopped: "Pomiar zatrzymany.",
    },
    methodology: {
      eyebrow: "Metodologia",
      title: "Jak IPScans mierzy wydajność łącza",
      lead: "Każdy wynik pochodzi z rzeczywistych strumieni sieciowych w przeglądarce, bez symulacji.",
      items: [
        {
          title: "Transfer wielostrumieniowy z pominięciem rozruchu",
          body: "Cztery równoległe strumienie HTTP wysycają łącze, odrzucając pierwsze 800 ms wolnego startu TCP, aby mierzyć wyłącznie stabilną prędkość.",
        },
        {
          title: "RTT w spoczynku, jitter i opóźnienie pod obciążeniem",
          body: "Dziesięć prób bez pamięci podręcznej wyznacza minimalny i medianowy ping oraz jitter, a pomiary podczas transferu określają bufferbloat.",
        },
        {
          title: "Analiza wariancji i stabilności",
          body: "Współczynnik zmienności (CV) próbek prędkości oraz rozrzut opóźnień pozwalają ocenić rzeczywistą stabilność łącza.",
        },
      ],
    },
  },
  ru: {
    eyebrow: "Сетевая телеметрия · Тест скорости",
    stop: "Остановить",
    retry: "Повторить",
    phases: {
      idle: "Готов",
      init: "Подключение",
      latency: "Задержка",
      download: "Загрузка",
      upload: "Отдача",
      complete: "Завершено",
    },
    gauge: {
      idleCaption: "Нажмите старт для измерения реальной пропускной способности и задержки",
      latencyLabel: "Задержка в покое",
      downloadLabel: "Скорость загрузки",
      uploadLabel: "Скорость отдачи",
      resultLabel: "Скорость загрузки",
      peakPrefix: "Пик",
      minPrefix: "Мин",
    },
    metrics: {
      jitter: "Джиттер",
      jitterDesc: "Вариация соседних RTT",
      loadedLatency: "Задержка под нагрузкой",
      loadedDesc: "Отклик во время передачи",
      stability: "Стабильность",
      stabilityDesc: "Равномерность потока",
      minPing: "Мин",
      medianPing: "Медиана",
      peak: "Пик",
      transferred: "Передано",
      bufferbloat: "Класс",
      underLoad: "под нагрузкой",
      variance: "КВ",
    },
    stabilityRatings: {
      excellent: "Отличная",
      good: "Хорошая",
      fair: "Средняя",
      poor: "Нестабильная",
      unknown: "—",
    },
    network: {
      server: "Тестовый узел",
      clientIp: "IP клиента",
      isp: "Провайдер",
      location: "Локация",
    },
    chart: {
      title: "Пропускная способность в реальном времени",
      waiting: "Графики загрузки и отдачи в реальном времени появятся здесь во время теста",
      live: "Поток измерений",
    },
    results: {
      eyebrow: "Диагностический отчёт",
      title: "На что способно ваше соединение",
      lead: "Оценка рассчитана напрямую по измеренным скорости загрузки, отдачи, пингу и джиттеру.",
      copyReport: "Копировать отчёт",
      copied: "Скопировано",
      exportJson: "Экспорт JSON",
      duration: "Длительность",
      totalData: "Передано данных",
      samples: "Проб RTT",
      thresholdLabel: "Порог",
      measuredLabel: "Измерено",
      ratings: {
        optimal: "Оптимально",
        good: "Хорошо",
        limited: "Ограничено",
      },
      activities: {
        streaming4k: {
          title: "Стриминг 4K UHD",
          desc: "Плавное воспроизведение видео с высоким битрейтом без буферизации.",
        },
        gaming: {
          title: "Онлайн-игры",
          desc: "Быстрый отклик и минимальный разброс времени доставки пакетов.",
        },
        videoCalls: {
          title: "HD-видеозвонки",
          desc: "Стабильная двусторонняя видеосвязь и демонстрация экрана.",
        },
        cloudBackup: {
          title: "Облачное резервирование и большие файлы",
          desc: "Быстрая отправка крупных архивов, резервных копий и проектов.",
        },
      },
    },
    history: {
      title: "Последние измерения",
      clear: "Очистить историю",
      time: "Время",
    },
    errors: {
      offlineTitle: "Нет подключения к интернету",
      offlineBody: "Проверьте сетевое подключение и запустите тест снова.",
      blockedTitle: "Не удалось завершить измерение",
      blockedBody: "Сбой сети, межсетевой экран или тайм-аут прервали передачу данных.",
      stopped: "Измерение остановлено.",
    },
    methodology: {
      eyebrow: "Методология",
      title: "Как IPScans измеряет скорость соединения",
      lead: "Каждый показатель вычисляется по реальным сетевым потокам в браузере без симуляции.",
      items: [
        {
          title: "Многопоточная передача с отсечением разогрева",
          body: "Четыре параллельных HTTP-потока нагружают канал, отбрасывая первые 800 мс медленного старта TCP для расчёта установившейся скорости.",
        },
        {
          title: "RTT в покое, джиттер и задержка под нагрузкой",
          body: "Десять некэшируемых запросов определяют минимальный и медианный пинг и джиттер, а замеры во время передачи выявляют bufferbloat.",
        },
        {
          title: "Анализ дисперсии и стабильности",
          body: "Коэффициент вариации (КВ) выборок скорости и разброс задержки формируют оценку реальной стабильности линии.",
        },
      ],
    },
  },
  ar: {
    eyebrow: "قياسات الشبكة · اختبار سرعة الإنترنت",
    stop: "إيقاف الاختبار",
    retry: "إعادة المحاولة",
    phases: {
      idle: "جاهز",
      init: "جارٍ الاتصال",
      latency: "الكمون",
      download: "التنزيل",
      upload: "الرفع",
      complete: "اكتمل",
    },
    gauge: {
      idleCaption: "اضغط على بدء لقياس السرعة الفعلية وزمن الاستجابة",
      latencyLabel: "زمن الاستجابة في الخمول",
      downloadLabel: "سرعة التنزيل",
      uploadLabel: "سرعة الرفع",
      resultLabel: "سرعة التنزيل",
      peakPrefix: "الذروة",
      minPrefix: "الأدنى",
    },
    metrics: {
      jitter: "التذبذب (Jitter)",
      jitterDesc: "تفاوت زمن الاستجابة المتتالي",
      loadedLatency: "الكمون تحت الحمل",
      loadedDesc: "الاستجابة أثناء نقل البيانات",
      stability: "الاستقرار",
      stabilityDesc: "ثبات معدل التدفق",
      minPing: "الأدنى",
      medianPing: "الوسيط",
      peak: "الذروة",
      transferred: "البيانات المنقولة",
      bufferbloat: "التصنيف",
      underLoad: "تحت الحمل",
      variance: "معامل التباين",
    },
    stabilityRatings: {
      excellent: "ممتاز",
      good: "جيد",
      fair: "متوسط",
      poor: "غير مستقر",
      unknown: "—",
    },
    network: {
      server: "خادم الاختبار",
      clientIp: "عنوان IP",
      isp: "مزود الخدمة",
      location: "الموقع",
    },
    chart: {
      title: "معدل التدفق اللحظي",
      waiting: "تظهر منحنيات التنزيل والرفع المباشرة هنا أثناء القياس",
      live: "بث العينات المباشر",
    },
    results: {
      eyebrow: "تقرير التشخيص",
      title: "ما الذي يدعمه اتصالك الفعلي",
      lead: "تُحسب كفاءة الأنشطة مباشرةً من سرعة التنزيل والرفع وزمن الاستجابة والتذبذب المقاس.",
      copyReport: "نسخ الملخص",
      copied: "تم النسخ",
      exportJson: "تصدير JSON",
      duration: "المدة",
      totalData: "حجم البيانات",
      samples: "عينات RTT",
      thresholdLabel: "المتطلب",
      measuredLabel: "المقاس",
      ratings: {
        optimal: "مثالي",
        good: "جيد",
        limited: "محدود",
      },
      activities: {
        streaming4k: {
          title: "بث فيديو 4K UHD",
          desc: "تشغيل مستمر للفيديو عالي الدقة دون تقطع أو انتظار التحميل.",
        },
        gaming: {
          title: "الألعاب الجماعية عبر الإنترنت",
          desc: "استجابة سريعة ذهاباً وإياباً مع تذبذب منخفض للحزم.",
        },
        videoCalls: {
          title: "مكالمات فيديو عالية الدقة",
          desc: "صوت وصورة ثنائية الاتجاه بسلاسة مع مشاركة الشاشة.",
        },
        cloudBackup: {
          title: "النسخ السحابي والملفات الكبيرة",
          desc: "رفع سريع للأرشيفات الضخمة والنسخ الاحتياطية والمشاريع.",
        },
      },
    },
    history: {
      title: "القياسات الأخيرة",
      clear: "مسح السجل",
      time: "الوقت",
    },
    errors: {
      offlineTitle: "لا يوجد اتصال بالإنترنت",
      offlineBody: "تحقق من اتصال الشبكة لديك ثم أعد تشغيل الاختبار.",
      blockedTitle: "تعذر إكمال القياس",
      blockedBody: "تسبب انقطاع الشبكة أو جدار الحماية أو انتهاء المهلة في إيقاف تدفق البيانات.",
      stopped: "تم إيقاف القياس.",
    },
    methodology: {
      eyebrow: "المنهجية",
      title: "كيف يقيس IPScans أداء اتصالك",
      lead: "يُحتسب كل رقم من تدفقات بيانات حقيقية عبر المتصفح دون أي أرقام افتراضية.",
      items: [
        {
          title: "نقل متعدد التدفقات مع استبعاد فترة الإحماء",
          body: "أربعة مسارات HTTP متوازية تشبع الخطوط عالية السعة مع استبعاد أول 800 مللي ثانية من بدء TCP البطيء لقياس السرعة المستقرة فقط.",
        },
        {
          title: "زمن الاستجابة والتذبذب والكمون تحت الحمل",
          body: "عشر نبضات غير مخزنة تحدد أقل ووسيط زمن استجابة والتذبذب، بينما تقيس النبضات المتزامنة أثناء النقل ظاهرة Bufferbloat تحت الحمل.",
        },
        {
          title: "تحليل التباين واستقرار الخط",
          body: "يُقيَّم معامل التباين (CV) لعينات السرعة الحية وتشتت الكمون لتحديد درجة استقرار الاتصال الحقيقية.",
        },
      ],
    },
  },
  ja: {
    eyebrow: "ネットワークテレメトリ · ブラウザ速度テスト",
    stop: "テストを停止",
    retry: "再試行",
    phases: {
      idle: "準備完了",
      init: "接続中",
      latency: "レイテンシ",
      download: "ダウンロード",
      upload: "アップロード",
      complete: "完了",
    },
    gauge: {
      idleCaption: "開始を押して実効スループットと遅延を測定します",
      latencyLabel: "アイドル遅延",
      downloadLabel: "ダウンロード速度",
      uploadLabel: "アップロード速度",
      resultLabel: "ダウンロード速度",
      peakPrefix: "ピーク",
      minPrefix: "最小",
    },
    metrics: {
      jitter: "ジッター",
      jitterDesc: "連続RTTの変動幅",
      loadedLatency: "負荷時レイテンシ",
      loadedDesc: "転送中の応答遅延",
      stability: "安定性",
      stabilityDesc: "スループットの一貫性",
      minPing: "最小",
      medianPing: "中央値",
      peak: "ピーク",
      transferred: "転送量",
      bufferbloat: "評価",
      underLoad: "負荷時増加",
      variance: "CV",
    },
    stabilityRatings: {
      excellent: "極めて良好",
      good: "良好",
      fair: "標準",
      poor: "不安定",
      unknown: "—",
    },
    network: {
      server: "テストエッジ",
      clientIp: "クライアントIP",
      isp: "ISP / 回線",
      location: "ロケーション",
    },
    chart: {
      title: "リアルタイム・スループット",
      waiting: "測定中のダウンロード・アップロード推移がリアルタイムで表示されます",
      live: "ライブサンプル",
    },
    results: {
      eyebrow: "診断レポート",
      title: "この回線で快適に利用できる用途",
      lead: "実測されたダウンロード・アップロード・Ping・ジッターから用途別の適性を算出しています。",
      copyReport: "結果をコピー",
      copied: "コピー完了",
      exportJson: "JSON出力",
      duration: "測定時間",
      totalData: "総転送量",
      samples: "RTTサンプル数",
      thresholdLabel: "目安",
      measuredLabel: "実測値",
      ratings: {
        optimal: "最適",
        good: "良好",
        limited: "制限あり",
      },
      activities: {
        streaming4k: {
          title: "4K UHD ストリーミング",
          desc: "バッファリングのない高ビットレート映像の連続再生。",
        },
        gaming: {
          title: "オンラインゲーム",
          desc: "高速な往復応答と揺らぎの少ないパケット到達。",
        },
        videoCalls: {
          title: "HD ビデオ会議",
          desc: "複数人での双方向通話と画面共有の安定動作。",
        },
        cloudBackup: {
          title: "クラウド同期・大容量送信",
          desc: "大容量メディアやバックアップの高速アップロード。",
        },
      },
    },
    history: {
      title: "最近の測定履歴",
      clear: "履歴を消去",
      time: "時刻",
    },
    errors: {
      offlineTitle: "オフラインのようです",
      offlineBody: "ネットワーク接続を確認してから、もう一度お試しください。",
      blockedTitle: "測定を完了できませんでした",
      blockedBody: "通信の中断、ファイアウォール、またはタイムアウトにより転送が停止しました。",
      stopped: "測定を停止しました。",
    },
    methodology: {
      eyebrow: "測定方式",
      title: "IPScansの回線パフォーマンス測定方法",
      lead: "すべての数値はブラウザ上の実際の通信ストリームから算出され、シミュレート値は一切使用しません。",
      items: [
        {
          title: "ウォームアップ除外のマルチストリーム転送",
          body: "4本の並列HTTPストリームで回線を最大限活用しつつ、TCPスロースタートの最初の800msを除外して定常状態の速度（bits / 1e6 / s）を算出します。",
        },
        {
          title: "アイドルRTT・ジッター・負荷時レイテンシ",
          body: "キャッシュなしの10回のプローブで最小/中央値Pingとジッターを測定し、さらに転送中の並列プローブでバッファブロートを計測します。",
        },
        {
          title: "標本分散と安定性スコア",
          body: "連続スループット標本の変動係数（CV）と遅延のばらつきから、実回線の安定性を評価します。",
        },
      ],
    },
  },
  ko: {
    eyebrow: "네트워크 텔레메트리 · 브라우저 속도 테스트",
    stop: "테스트 중지",
    retry: "다시 시도",
    phases: {
      idle: "준비됨",
      init: "연결 중",
      latency: "지연 시간",
      download: "다운로드",
      upload: "업로드",
      complete: "완료",
    },
    gauge: {
      idleCaption: "시작을 눌러 실제 대역폭과 지연 시간을 측정하세요",
      latencyLabel: "유휴 지연 시간",
      downloadLabel: "다운로드 속도",
      uploadLabel: "업로드 속도",
      resultLabel: "다운로드 속도",
      peakPrefix: "최고",
      minPrefix: "최소",
    },
    metrics: {
      jitter: "지터",
      jitterDesc: "연속 RTT 편차",
      loadedLatency: "부하 시 지연",
      loadedDesc: "전송 중 응답 시간",
      stability: "안정성",
      stabilityDesc: "처리량 일관성",
      minPing: "최소",
      medianPing: "중앙값",
      peak: "최고",
      transferred: "전송량",
      bufferbloat: "등급",
      underLoad: "부하 증가",
      variance: "CV",
    },
    stabilityRatings: {
      excellent: "매우 우수",
      good: "양호",
      fair: "보통",
      poor: "불안정",
      unknown: "—",
    },
    network: {
      server: "테스트 서버",
      clientIp: "클라이언트 IP",
      isp: "ISP / 네트워크",
      location: "위치",
    },
    chart: {
      title: "실시간 처리량 그래프",
      waiting: "측정 중 실시간 다운로드 및 업로드 곡선이 여기에 표시됩니다",
      live: "실시간 샘플 스트림",
    },
    results: {
      eyebrow: "진단 리포트",
      title: "현재 회선으로 원활한 작업",
      lead: "측정된 다운로드, 업로드, 핑 및 지터 값을 기반으로 활동별 적합성을 계산합니다.",
      copyReport: "요약 복사",
      copied: "복사됨",
      exportJson: "JSON 내보내기",
      duration: "소요 시간",
      totalData: "전송된 데이터",
      samples: "RTT 샘플",
      thresholdLabel: "권장 기준",
      measuredLabel: "측정값",
      ratings: {
        optimal: "최적",
        good: "양호",
        limited: "제한적",
      },
      activities: {
        streaming4k: {
          title: "4K UHD 스트리밍",
          desc: "버퍼링 없는 고비트레이트 초고화질 영상 재생.",
        },
        gaming: {
          title: "온라인 게이밍",
          desc: "빠른 왕복 응답 속도와 낮은 패킷 지연 편차.",
        },
        videoCalls: {
          title: "HD 화상 회의",
          desc: "끊김 없는 양방향 음성·영상 통화 및 화면 공유.",
        },
        cloudBackup: {
          title: "클라우드 동기화 및 대용량 업로드",
          desc: "대용량 미디어 아카이브 및 백업 파일의 빠른 전송.",
        },
      },
    },
    history: {
      title: "최근 측정 기록",
      clear: "기록 삭제",
      time: "시간",
    },
    errors: {
      offlineTitle: "인터넷 연결이 감지되지 않습니다",
      offlineBody: "네트워크 연결 상태를 확인한 후 다시 시도해 주세요.",
      blockedTitle: "측정을 완료할 수 없습니다",
      blockedBody: "네트워크 중단, 방화벽 또는 시간 초과로 인해 데이터 스트림이 중단되었습니다.",
      stopped: "측정이 중지되었습니다.",
    },
    methodology: {
      eyebrow: "측정 원리",
      title: "IPScans가 연결 성능을 측정하는 방법",
      lead: "모든 수치는 시뮬레이션 없이 브라우저의 실제 네트워크 스트림에서 계산됩니다.",
      items: [
        {
          title: "웜업 구간을 제외한 다중 스트림 전송",
          body: "4개의 병렬 HTTP 스트림으로 대역폭을 포화시키며 초기 800ms의 TCP 슬로 스타트 구간을 제외하고 정상 상태 속도(bits / 1e6 / s)만 측정합니다.",
        },
        {
          title: "유휴 RTT, 지터 및 부하 지연 시간",
          body: "캐시되지 않은 10회의 프로브로 최소·중앙값 핑과 지터를 구하고, 전송 중 동시 프로브를 통해 부하 상태의 버퍼블로트를 측정합니다.",
        },
        {
          title: "표본 분산 및 회선 안정성 분석",
          body: "실시간 처리량 표본의 변동계수(CV)와 지연 편차를 결합하여 실제 회선 안정성 등급을 산출합니다.",
        },
      ],
    },
  },
  zh: {
    eyebrow: "网络遥测 · 浏览器测速",
    stop: "停止测试",
    retry: "重试",
    phases: {
      idle: "就绪",
      init: "连接中",
      latency: "延迟",
      download: "下载",
      upload: "上传",
      complete: "完成",
    },
    gauge: {
      idleCaption: "点击开始测量真实吞吐量与网络延迟",
      latencyLabel: "空闲延迟",
      downloadLabel: "下载速度",
      uploadLabel: "上传速度",
      resultLabel: "下载速度",
      peakPrefix: "峰值",
      minPrefix: "最低",
    },
    metrics: {
      jitter: "抖动",
      jitterDesc: "连续 RTT 波动",
      loadedLatency: "负载延迟",
      loadedDesc: "传输期间的响应延迟",
      stability: "稳定性",
      stabilityDesc: "吞吐量一致性",
      minPing: "最低",
      medianPing: "中位数",
      peak: "峰值",
      transferred: "已传输",
      bufferbloat: "评级",
      underLoad: "负载增幅",
      variance: "变异系数",
    },
    stabilityRatings: {
      excellent: "极佳",
      good: "良好",
      fair: "一般",
      poor: "波动较大",
      unknown: "—",
    },
    network: {
      server: "测速节点",
      clientIp: "客户端 IP",
      isp: "运营商 / 网络",
      location: "位置",
    },
    chart: {
      title: "实时吞吐量曲线",
      waiting: "测量期间将在此处实时绘制下载与上传吞吐量曲线",
      live: "实时采样流",
    },
    results: {
      eyebrow: "诊断报告",
      title: "您的网络连接适用场景",
      lead: "根据实测下载、上传、空闲延迟和抖动直接计算的常见应用体验评估。",
      copyReport: "复制摘要",
      copied: "已复制",
      exportJson: "导出 JSON",
      duration: "耗时",
      totalData: "传输数据量",
      samples: "RTT 样本",
      thresholdLabel: "要求",
      measuredLabel: "实测",
      ratings: {
        optimal: "极佳",
        good: "良好",
        limited: "受限",
      },
      activities: {
        streaming4k: {
          title: "4K 超高清流媒体",
          desc: "持续高码率视频播放，无卡顿或缓冲等待。",
        },
        gaming: {
          title: "在线竞技游戏",
          desc: "快速的往返响应与极低的数据包时延抖动。",
        },
        videoCalls: {
          title: "高清视频会议",
          desc: "流畅的双向音视频通话与多人屏幕共享。",
        },
        cloudBackup: {
          title: "云端同步与大文件上传",
          desc: "快速上传大型媒体归档、备份与代码仓库。",
        },
      },
    },
    history: {
      title: "最近测量记录",
      clear: "清除记录",
      time: "时间",
    },
    errors: {
      offlineTitle: "未检测到网络连接",
      offlineBody: "请检查您的网络连接后重新运行测速。",
      blockedTitle: "测量未能完成",
      blockedBody: "网络中断、防火墙限制或请求超时导致数据流中止。",
      stopped: "测量已停止。",
    },
    methodology: {
      eyebrow: "测量原理",
      title: "IPScans 如何测量您的连接性能",
      lead: "每一项指标均由浏览器真实网络数据流计算得出，绝无模拟或虚构数值。",
      items: [
        {
          title: "剔除慢启动的多流并发传输",
          body: "通过 4 条并行 HTTP 流充分利用高带宽链路，同时剔除前 800 毫秒的 TCP 慢启动阶段，仅统计稳态吞吐量（bits / 1e6 / s）。",
        },
        {
          title: "空闲 RTT、抖动与负载延迟",
          body: "10 次无缓存探测确定最低与中位数延迟及连续抖动，并在下载和上传期间持续探测以衡量缓冲区膨胀（Bufferbloat）。",
        },
        {
          title: "样本方差与稳定性分析",
          body: "结合实时吞吐量样本的变异系数（CV）与延迟离散度，量化评估线路的真实稳定性。",
        },
      ],
    },
  },
};
