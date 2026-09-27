import type { Locale } from "./config";

const dictionaries = {
  tr: {
    a11y: {
      skipToContent: "İçeriğe geç",
    },
    meta: {
      title: "ipscans — IP Sorgulama, Ağ Tarama ve Hız Testi",
      description:
        "IP adresi sorgulama, coğrafi konum tespiti, internet hız testi ve ağ araçları. Hızlı, ücretsiz ve gizliliğe saygılı.",
    },
    nav: {
      home: "Ana Sayfa",
      tools: "Araçlar",
      ipLookup: "IP Sorgulama",
      dns: "DNS Sorgulama",
      whois: "WHOIS",
      ports: "Port Kontrol",
      speedTest: "Hız Testi",
      scan: "Ağ Tarama",
      appDownload: "Windows Uygulaması",
      blog: "Blog",
      shop: "Mağaza",
    },
    hero: {
      badge: "Ağ araçları platformu",
      title: "IP adresini tanı, ağını test et",
      subtitle:
        "Tek bir yerden IP sorgulama, coğrafi konum, internet hız testi ve ağ araçlarına eriş. Ücretsiz ve kayıt gerektirmez.",
      ctaPrimary: "IP'mi Öğren",
      ctaSecondary: "Hız Testi Yap",
      ctaDownload: "Windows Uygulamasını İndir",
      yourIp: "Senin IP adresin",
    },
    stats: {
      title: "Rakamlarla ipscans",
      items: [
        { value: "6+", label: "Ağ aracı" },
        { value: "5", label: "Dil desteği" },
        { value: "%100", label: "Ücretsiz" },
        { value: "0", label: "Kayıt gerektirmez" },
      ],
    },
    cta: {
      title: "Ağını keşfetmeye hazır mısın?",
      subtitle: "Saniyeler içinde IP'ni sorgula, hızını ölç, DNS kayıtlarını gör.",
      button: "Hemen Başla",
    },
    features: {
      title: "Neler yapabilirsin?",
      subtitle: "ipscans ile ağınla ilgili her şeyi tek yerden yönet.",
      items: [
        {
          title: "IP Sorgulama",
          desc: "Herhangi bir IP adresinin konumunu, ISS'sini ve ağ bilgilerini öğren.",
          href: "/ip-sorgulama",
        },
        {
          title: "DNS Sorgulama",
          desc: "Alan adlarının A, MX, TXT, NS ve diğer DNS kayıtlarını görüntüle.",
          href: "/dns-sorgulama",
        },
        {
          title: "WHOIS Sorgulama",
          desc: "Alan adı kayıt bilgilerini, kayıtçıyı ve tarihleri öğren.",
          href: "/whois-sorgulama",
        },
        {
          title: "Port Kontrol",
          desc: "Bir sunucudaki yaygın portların açık olup olmadığını test et.",
          href: "/port-kontrol",
        },
        {
          title: "Windows Uygulaması",
          desc: "Gerçek yerel ağ taraması için ücretsiz masaüstü aracını indir.",
          href: "/download",
        },
        {
          title: "Hız Testi",
          desc: "İndirme, yükleme ve gecikme (ping) değerlerini ölç.",
          href: "/hiz-testi",
        },
        {
          title: "Ağ Tarama",
          desc: "Ağ tarama, port ve güvenlik kavramlarını öğren.",
          href: "/scan",
        },
        {
          title: "Blog",
          desc: "Ağ güvenliği ve internet üzerine rehberler ve makaleler.",
          href: "/blog",
        },
        {
          title: "Mağaza",
          desc: "Ağ güvenliği donanımları mağazamız çok yakında açılıyor.",
          href: "/shop",
        },
      ],
    },
    ipLookup: {
      title: "IP Sorgulama",
      subtitle:
        "Bir IP adresi gir veya boş bırakıp kendi IP adresini sorgula.",
      placeholder: "Örn. 8.8.8.8",
      button: "Sorgula",
      myIp: "Kendi IP'mi kullan",
      loading: "Sorgulanıyor...",
      error: "IP bilgisi alınamadı. Lütfen tekrar dene.",
      fields: {
        ip: "IP Adresi",
        country: "Ülke",
        region: "Bölge",
        city: "Şehir",
        isp: "Servis Sağlayıcı",
        org: "Organizasyon",
        timezone: "Saat Dilimi",
        coordinates: "Koordinatlar",
      },
      mapLabel: "Harita üzerinde konum",
    },
    dns: {
      title: "DNS Sorgulama",
      subtitle:
        "Bir alan adının DNS kayıtlarını (A, AAAA, MX, TXT, NS, CNAME) sorgula.",
      placeholder: "Örn. example.com",
      button: "Sorgula",
      loading: "Sorgulanıyor...",
      error: "DNS kaydı alınamadı. Alan adını kontrol et.",
      noRecords: "Bu tip için kayıt bulunamadı.",
    },
    whois: {
      title: "WHOIS Sorgulama",
      subtitle:
        "Bir alan adının kayıt bilgilerini (sahip, kayıtçı, tarihler) görüntüle.",
      placeholder: "Örn. example.com",
      button: "Sorgula",
      loading: "Sorgulanıyor...",
      error: "WHOIS bilgisi alınamadı. Alan adını kontrol et.",
      fields: {
        domain: "Alan Adı",
        registrar: "Kayıtçı",
        created: "Oluşturulma",
        updated: "Güncellenme",
        expires: "Bitiş",
        status: "Durum",
        nameservers: "Ad Sunucuları",
      },
    },
    ports: {
      title: "Port Kontrol",
      subtitle:
        "Bir sunucudaki yaygın portların açık olup olmadığını kontrol et.",
      placeholder: "Örn. example.com veya 8.8.8.8",
      button: "Kontrol Et",
      loading: "Kontrol ediliyor...",
      error: "Kontrol başarısız. Sunucu adresini kontrol et.",
      open: "Açık",
      closed: "Kapalı",
      disclaimer:
        "Yalnızca sahibi olduğun veya izin aldığın sunuculara yönelik kullan.",
      crossSell: {
        title: "Kameranız güvenlik açığına sahip olabilir",
        body: "Açık bulunan portlar arasında kamera veya kayıt cihazı servislerine ait olabilecekler var. Güvenlik ürünleri mağazamız çok yakında.",
        cta: "Mağazaya Göz At",
      },
    },
    speedTest: {
      title: "İnternet Hız Testi",
      subtitle: "Bağlantı hızını ve gecikmeni ölç.",
      start: "Testi Başlat",
      running: "Test yapılıyor...",
      restart: "Tekrar Test Et",
      download: "İndirme",
      upload: "Yükleme",
      ping: "Ping",
      note: "Sonuçlar tarayıcı ve ağ koşullarına göre değişebilir.",
      crossSell: {
        title: "Ağınız yavaş mı?",
        body: "Çok yakında açılacak mağazamızda ağ ve güvenlik donanımlarını bulacaksınız.",
        cta: "Mağazaya Göz At",
      },
    },
    scan: {
      title: "Ağ Tarama",
      subtitle: "Ağ ve port tarama nedir, nasıl çalışır?",
      body: "Tarayıcılar güvenlik nedeniyle doğrudan port taramasına izin vermez. Gerçek ağ taraması için masaüstü araçlar veya yetkili sunucu tabanlı servisler gerekir. Bu bölümde tarama kavramlarını, yaygın portları ve güvenli kullanım ilkelerini öğreneceksin.",
      disclaimer:
        "Yalnızca sahibi olduğun veya izin aldığın ağları tara. İzinsiz tarama yasa dışı olabilir.",
    },
    download: {
      title: "Ağ Tarayıcı Masaüstü Uygulaması",
      subtitle:
        "ARP/ping, SNMP, WMI, UPnP ve Nmap ile derin ağ taraması yapan açık kaynak masaüstü aracımızı indir.",
      badge: "Ücretsiz • Yeni: 6 dilli arayüz",
      features: [
        "Yeniden tasarlanan modern arayüz ve ilk açılışta 6 dilli kurulum ekranı",
        "Yerel ağındaki tüm canlı cihazları çok iş parçacıklı taramayla bulur",
        "MAC adresi, üretici (vendor), hostname ve açık portları gösterir",
        "SNMP / WMI / UPnP ile seri numarası ve donanım detayı çeker",
        "Sonuçlarda bir IP'ye tıklayınca cihazın web arayüzünü tarayıcıda açar",
        "Sadeleştirilmiş, tek tıkla başlayan tarama ekranı",
      ],
      button: "Windows için indir (.exe)",
      note: "Yaklaşık 47 MB. İndirdikten sonra çift tıklayıp çalıştır — Python kurulumu gerekmez. SmartScreen uyarısı verirse 'Daha fazla bilgi > Yine de çalıştır' de.",
      safe: "Yalnızca sahibi olduğun ağlarda kullan.",
    },
    blog: {
      title: "Blog",
      subtitle: "Ağ, güvenlik ve internet üzerine yazılar.",
      readMore: "Devamını oku",
      empty: "Henüz yazı yok. Yakında burada olacak.",
    },
    footer: {
      tagline: "Ağ araçları, tek bir yerde.",
      rights: "Tüm hakları saklıdır.",
      privacy: "Gizlilik Politikası",
      terms: "Kullanım Koşulları",
    },
    cookieConsent: {
      message: "Deneyiminizi iyileştirmek ve (etkinleştirildiğinde) reklam göstermek için çerez kullanıyoruz.",
      accept: "Kabul Et",
      reject: "Reddet",
    },
    shop: {
      title: "Mağaza",
      comingSoonTitle: "Çok Yakında...",
      comingSoonBody:
        "Ağ güvenliği ve akıllı ev donanımları mağazamızı hazırlıyoruz. Yeni nesil güvenlik kameraları ve kurulum hizmetleriyle çok yakında burada.",
    },
  },
  en: {
    a11y: {
      skipToContent: "Skip to content",
    },
    meta: {
      title: "ipscans — IP Lookup, Network Scanning & Speed Test",
      description:
        "IP address lookup, geolocation, internet speed test and network tools. Fast, free and privacy-friendly.",
    },
    nav: {
      home: "Home",
      tools: "Tools",
      ipLookup: "IP Lookup",
      dns: "DNS Lookup",
      whois: "WHOIS",
      ports: "Port Check",
      speedTest: "Speed Test",
      scan: "Network Scan",
      appDownload: "Windows App",
      blog: "Blog",
      shop: "Shop",
    },
    hero: {
      badge: "Network tools platform",
      title: "Know your IP, test your network",
      subtitle:
        "IP lookup, geolocation, internet speed test and network tools in one place. Free and no sign-up required.",
      ctaPrimary: "Find My IP",
      ctaSecondary: "Run Speed Test",
      ctaDownload: "Download Windows App",
      yourIp: "Your IP address",
    },
    stats: {
      title: "ipscans in numbers",
      items: [
        { value: "6+", label: "Network tools" },
        { value: "5", label: "Languages" },
        { value: "100%", label: "Free" },
        { value: "0", label: "Sign-up needed" },
      ],
    },
    cta: {
      title: "Ready to explore your network?",
      subtitle: "Look up your IP, measure your speed and check DNS records in seconds.",
      button: "Get Started",
    },
    features: {
      title: "What can you do?",
      subtitle: "Manage everything about your network from one place.",
      items: [
        {
          title: "IP Lookup",
          desc: "Discover the location, ISP and network details of any IP address.",
          href: "/ip-lookup",
        },
        {
          title: "DNS Lookup",
          desc: "View A, MX, TXT, NS and other DNS records of any domain.",
          href: "/dns-lookup",
        },
        {
          title: "WHOIS Lookup",
          desc: "Discover domain registration details, registrar and dates.",
          href: "/whois-lookup",
        },
        {
          title: "Port Check",
          desc: "Test whether common ports are open on a server.",
          href: "/port-check",
        },
        {
          title: "Windows App",
          desc: "Download our free desktop tool for a real local network scan.",
          href: "/download",
        },
        {
          title: "Speed Test",
          desc: "Measure your download, upload and latency (ping).",
          href: "/speed-test",
        },
        {
          title: "Network Scan",
          desc: "Learn about network scanning, ports and security concepts.",
          href: "/scan",
        },
        {
          title: "Blog",
          desc: "Guides and articles on network security and the internet.",
          href: "/blog",
        },
        {
          title: "Shop",
          desc: "Our network security hardware shop is launching soon.",
          href: "/shop",
        },
      ],
    },
    ipLookup: {
      title: "IP Lookup",
      subtitle: "Enter an IP address or leave empty to look up your own.",
      placeholder: "e.g. 8.8.8.8",
      button: "Look up",
      myIp: "Use my IP",
      loading: "Looking up...",
      error: "Could not fetch IP information. Please try again.",
      fields: {
        ip: "IP Address",
        country: "Country",
        region: "Region",
        city: "City",
        isp: "ISP",
        org: "Organization",
        timezone: "Timezone",
        coordinates: "Coordinates",
      },
      mapLabel: "Location on map",
    },
    dns: {
      title: "DNS Lookup",
      subtitle:
        "Query a domain's DNS records (A, AAAA, MX, TXT, NS, CNAME).",
      placeholder: "e.g. example.com",
      button: "Look up",
      loading: "Looking up...",
      error: "Could not fetch DNS records. Check the domain name.",
      noRecords: "No records found for this type.",
    },
    whois: {
      title: "WHOIS Lookup",
      subtitle:
        "View a domain's registration details (owner, registrar, dates).",
      placeholder: "e.g. example.com",
      button: "Look up",
      loading: "Looking up...",
      error: "Could not fetch WHOIS data. Check the domain name.",
      fields: {
        domain: "Domain",
        registrar: "Registrar",
        created: "Created",
        updated: "Updated",
        expires: "Expires",
        status: "Status",
        nameservers: "Nameservers",
      },
    },
    ports: {
      title: "Port Check",
      subtitle: "Check whether common ports are open on a server.",
      placeholder: "e.g. example.com or 8.8.8.8",
      button: "Check",
      loading: "Checking...",
      error: "Check failed. Verify the server address.",
      open: "Open",
      closed: "Closed",
      disclaimer: "Only use against servers you own or have permission to test.",
      crossSell: {
        title: "Your camera might be exposed",
        body: "Some open ports could belong to camera or recorder services. Our security hardware shop is launching soon.",
        cta: "Browse Shop",
      },
    },
    speedTest: {
      title: "Internet Speed Test",
      subtitle: "Measure your connection speed and latency.",
      start: "Start Test",
      running: "Testing...",
      restart: "Test Again",
      download: "Download",
      upload: "Upload",
      ping: "Ping",
      note: "Results may vary based on browser and network conditions.",
      crossSell: {
        title: "Is your network slow?",
        body: "Our upcoming shop will feature networking and security hardware to help.",
        cta: "Browse Shop",
      },
    },
    scan: {
      title: "Network Scan",
      subtitle: "What is network and port scanning, and how does it work?",
      body: "Browsers do not allow direct port scanning for security reasons. Real network scanning requires desktop tools or authorized server-based services. In this section you will learn scanning concepts, common ports and safe usage principles.",
      disclaimer:
        "Only scan networks you own or have permission to test. Unauthorized scanning may be illegal.",
    },
    download: {
      title: "Network Scanner Desktop App",
      subtitle:
        "Download our open-source desktop tool for deep network scanning via ARP/ping, SNMP, WMI, UPnP and Nmap.",
      badge: "Free • New: 6-language interface",
      features: [
        "Freshly redesigned, modern interface with a 6-language setup screen on first launch",
        "Finds every live device on your local network with multi-threaded scanning",
        "Shows MAC address, vendor, hostname and open ports",
        "Pulls serial numbers and hardware details via SNMP / WMI / UPnP",
        "Click any IP in the results to open the device's web UI in your browser",
        "Streamlined, one-click scan screen",
      ],
      button: "Download for Windows (.exe)",
      note: "About 47 MB. Double-click to run after downloading — no Python install needed. If SmartScreen warns, choose 'More info > Run anyway'.",
      safe: "Only use on networks you own.",
    },
    blog: {
      title: "Blog",
      subtitle: "Articles on networking, security and the internet.",
      readMore: "Read more",
      empty: "No posts yet. Coming soon.",
    },
    footer: {
      tagline: "Network tools, all in one place.",
      rights: "All rights reserved.",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
    },
    cookieConsent: {
      message: "We use cookies to improve your experience and, when enabled, to show ads.",
      accept: "Accept",
      reject: "Reject",
    },
    shop: {
      title: "Shop",
      comingSoonTitle: "Coming Soon...",
      comingSoonBody:
        "We're building our network security and smart home hardware shop. Next-gen security cameras and installation services, launching soon.",
    },
  },
  de: {
    a11y: {
      skipToContent: "Zum Inhalt springen",
    },
    meta: {
      title: "ipscans — IP-Abfrage, Netzwerkscan & Geschwindigkeitstest",
      description:
        "IP-Adressabfrage, Geolokalisierung, Internet-Geschwindigkeitstest und Netzwerktools. Schnell, kostenlos und datenschutzfreundlich.",
    },
    nav: {
      home: "Startseite",
      tools: "Werkzeuge",
      ipLookup: "IP-Abfrage",
      dns: "DNS-Abfrage",
      whois: "WHOIS",
      ports: "Port-Prüfung",
      speedTest: "Geschwindigkeitstest",
      scan: "Netzwerkscan",
      appDownload: "Windows-App",
      blog: "Blog",
      shop: "Shop",
    },
    hero: {
      badge: "Netzwerktool-Plattform",
      title: "Kenne deine IP, teste dein Netzwerk",
      subtitle:
        "IP-Abfrage, Geolokalisierung, Geschwindigkeitstest und Netzwerktools an einem Ort. Kostenlos und ohne Registrierung.",
      ctaPrimary: "Meine IP finden",
      ctaSecondary: "Geschwindigkeitstest starten",
      ctaDownload: "Windows-App herunterladen",
      yourIp: "Deine IP-Adresse",
    },
    stats: {
      title: "ipscans in Zahlen",
      items: [
        { value: "6+", label: "Netzwerktools" },
        { value: "5", label: "Sprachen" },
        { value: "100%", label: "Kostenlos" },
        { value: "0", label: "Keine Registrierung" },
      ],
    },
    cta: {
      title: "Bereit, dein Netzwerk zu erkunden?",
      subtitle:
        "Frage deine IP ab, miss deine Geschwindigkeit und prüfe DNS-Einträge in Sekunden.",
      button: "Jetzt starten",
    },
    features: {
      title: "Was kannst du tun?",
      subtitle: "Verwalte alles rund um dein Netzwerk an einem Ort.",
      items: [
        {
          title: "IP-Abfrage",
          desc: "Finde Standort, ISP und Netzwerkdetails jeder IP-Adresse heraus.",
          href: "/ip-suche",
        },
        {
          title: "DNS-Abfrage",
          desc: "Zeige A-, MX-, TXT-, NS- und weitere DNS-Einträge einer Domain an.",
          href: "/dns-abfrage",
        },
        {
          title: "WHOIS-Abfrage",
          desc: "Erfahre Registrierungsdetails, Registrar und Daten einer Domain.",
          href: "/whois-abfrage",
        },
        {
          title: "Port-Prüfung",
          desc: "Teste, ob gängige Ports auf einem Server offen sind.",
          href: "/port-pruefung",
        },
        {
          title: "Windows-App",
          desc: "Lade unser kostenloses Desktop-Tool für einen echten lokalen Netzwerkscan herunter.",
          href: "/download",
        },
        {
          title: "Geschwindigkeitstest",
          desc: "Miss Download-, Upload- und Latenzwerte (Ping).",
          href: "/geschwindigkeitstest",
        },
        {
          title: "Netzwerkscan",
          desc: "Lerne Konzepte zu Netzwerkscans, Ports und Sicherheit.",
          href: "/scan",
        },
        {
          title: "Blog",
          desc: "Anleitungen und Artikel zu Netzwerksicherheit und Internet.",
          href: "/blog",
        },
        {
          title: "Shop",
          desc: "Unser Shop für Netzwerksicherheits-Hardware startet bald.",
          href: "/shop",
        },
      ],
    },
    ipLookup: {
      title: "IP-Abfrage",
      subtitle:
        "Gib eine IP-Adresse ein oder lass das Feld leer, um deine eigene abzufragen.",
      placeholder: "z. B. 8.8.8.8",
      button: "Abfragen",
      myIp: "Meine IP verwenden",
      loading: "Wird abgefragt...",
      error: "IP-Informationen konnten nicht geladen werden. Bitte erneut versuchen.",
      fields: {
        ip: "IP-Adresse",
        country: "Land",
        region: "Region",
        city: "Stadt",
        isp: "Internetanbieter",
        org: "Organisation",
        timezone: "Zeitzone",
        coordinates: "Koordinaten",
      },
      mapLabel: "Standort auf der Karte",
    },
    dns: {
      title: "DNS-Abfrage",
      subtitle:
        "Frage die DNS-Einträge (A, AAAA, MX, TXT, NS, CNAME) einer Domain ab.",
      placeholder: "z. B. example.com",
      button: "Abfragen",
      loading: "Wird abgefragt...",
      error: "DNS-Einträge konnten nicht geladen werden. Prüfe den Domainnamen.",
      noRecords: "Keine Einträge für diesen Typ gefunden.",
    },
    whois: {
      title: "WHOIS-Abfrage",
      subtitle:
        "Zeige Registrierungsdetails einer Domain (Inhaber, Registrar, Daten) an.",
      placeholder: "z. B. example.com",
      button: "Abfragen",
      loading: "Wird abgefragt...",
      error: "WHOIS-Daten konnten nicht geladen werden. Prüfe den Domainnamen.",
      fields: {
        domain: "Domain",
        registrar: "Registrar",
        created: "Erstellt",
        updated: "Aktualisiert",
        expires: "Läuft ab",
        status: "Status",
        nameservers: "Nameserver",
      },
    },
    ports: {
      title: "Port-Prüfung",
      subtitle: "Prüfe, ob gängige Ports auf einem Server offen sind.",
      placeholder: "z. B. example.com oder 8.8.8.8",
      button: "Prüfen",
      loading: "Wird geprüft...",
      error: "Prüfung fehlgeschlagen. Serveradresse überprüfen.",
      open: "Offen",
      closed: "Geschlossen",
      disclaimer:
        "Nur bei Servern verwenden, die dir gehören oder für die du eine Erlaubnis hast.",
      crossSell: {
        title: "Deine Kamera könnte ungeschützt sein",
        body: "Einige offene Ports könnten zu Kamera- oder Rekorder-Diensten gehören. Unser Shop für Sicherheits-Hardware startet bald.",
        cta: "Shop ansehen",
      },
    },
    speedTest: {
      title: "Internet-Geschwindigkeitstest",
      subtitle: "Miss die Geschwindigkeit und Latenz deiner Verbindung.",
      start: "Test starten",
      running: "Test läuft...",
      restart: "Erneut testen",
      download: "Download",
      upload: "Upload",
      ping: "Ping",
      note: "Die Ergebnisse können je nach Browser und Netzwerkbedingungen variieren.",
      crossSell: {
        title: "Ist dein Netzwerk langsam?",
        body: "Unser kommender Shop bietet Netzwerk- und Sicherheits-Hardware, die hilft.",
        cta: "Shop ansehen",
      },
    },
    scan: {
      title: "Netzwerkscan",
      subtitle: "Was ist Netzwerk- und Portscanning und wie funktioniert es?",
      body: "Browser erlauben aus Sicherheitsgründen keinen direkten Portscan. Ein echter Netzwerkscan erfordert Desktop-Tools oder autorisierte serverbasierte Dienste. In diesem Abschnitt lernst du Scan-Konzepte, gängige Ports und sichere Nutzungsprinzipien.",
      disclaimer:
        "Scanne nur Netzwerke, die dir gehören oder für die du eine Erlaubnis hast. Unbefugtes Scannen kann illegal sein.",
    },
    download: {
      title: "Netzwerkscanner-Desktop-App",
      subtitle:
        "Lade unser Open-Source-Desktop-Tool für tiefgehende Netzwerkscans per ARP/Ping, SNMP, WMI, UPnP und Nmap herunter.",
      badge: "Kostenlos • Neu: Oberfläche in 6 Sprachen",
      features: [
        "Neu gestaltete, moderne Oberfläche mit Einrichtungsbildschirm in 6 Sprachen beim ersten Start",
        "Findet jedes aktive Gerät in deinem lokalen Netzwerk per Multi-Thread-Scan",
        "Zeigt MAC-Adresse, Hersteller, Hostname und offene Ports an",
        "Ermittelt Seriennummern und Hardware-Details via SNMP / WMI / UPnP",
        "Klick auf eine IP in den Ergebnissen öffnet die Web-UI des Geräts im Browser",
        "Vereinfachter Scan-Bildschirm mit einem Klick zum Start",
      ],
      button: "Für Windows herunterladen (.exe)",
      note: "Etwa 47 MB. Nach dem Download doppelklicken zum Ausführen — keine Python-Installation nötig. Bei SmartScreen-Warnung 'Weitere Informationen > Trotzdem ausführen' wählen.",
      safe: "Nur in Netzwerken verwenden, die dir gehören.",
    },
    blog: {
      title: "Blog",
      subtitle: "Artikel über Netzwerke, Sicherheit und das Internet.",
      readMore: "Weiterlesen",
      empty: "Noch keine Beiträge. Bald verfügbar.",
    },
    footer: {
      tagline: "Netzwerktools, alles an einem Ort.",
      rights: "Alle Rechte vorbehalten.",
      privacy: "Datenschutzerklärung",
      terms: "Nutzungsbedingungen",
    },
    cookieConsent: {
      message: "Wir verwenden Cookies, um Ihr Erlebnis zu verbessern und, sofern aktiviert, Werbung anzuzeigen.",
      accept: "Akzeptieren",
      reject: "Ablehnen",
    },
    shop: {
      title: "Shop",
      comingSoonTitle: "Bald verfügbar...",
      comingSoonBody:
        "Wir bauen unseren Shop für Netzwerksicherheit und Smart-Home-Hardware auf. Sicherheitskameras der nächsten Generation und Installationsservices, bald verfügbar.",
    },
  },
  fr: {
    a11y: {
      skipToContent: "Aller au contenu",
    },
    meta: {
      title: "ipscans — Recherche IP, scan réseau et test de vitesse",
      description:
        "Recherche d'adresse IP, géolocalisation, test de vitesse internet et outils réseau. Rapide, gratuit et respectueux de la vie privée.",
    },
    nav: {
      home: "Accueil",
      tools: "Outils",
      ipLookup: "Recherche IP",
      dns: "Recherche DNS",
      whois: "WHOIS",
      ports: "Vérification de port",
      speedTest: "Test de vitesse",
      scan: "Scan réseau",
      appDownload: "Application Windows",
      blog: "Blog",
      shop: "Boutique",
    },
    hero: {
      badge: "Plateforme d'outils réseau",
      title: "Connaissez votre IP, testez votre réseau",
      subtitle:
        "Recherche IP, géolocalisation, test de vitesse et outils réseau en un seul endroit. Gratuit et sans inscription.",
      ctaPrimary: "Trouver mon IP",
      ctaSecondary: "Lancer le test de vitesse",
      ctaDownload: "Télécharger l'application Windows",
      yourIp: "Votre adresse IP",
    },
    stats: {
      title: "ipscans en chiffres",
      items: [
        { value: "6+", label: "Outils réseau" },
        { value: "5", label: "Langues" },
        { value: "100%", label: "Gratuit" },
        { value: "0", label: "Inscription requise" },
      ],
    },
    cta: {
      title: "Prêt à explorer votre réseau ?",
      subtitle:
        "Recherchez votre IP, mesurez votre vitesse et vérifiez les enregistrements DNS en quelques secondes.",
      button: "Commencer",
    },
    features: {
      title: "Que pouvez-vous faire ?",
      subtitle: "Gérez tout ce qui concerne votre réseau depuis un seul endroit.",
      items: [
        {
          title: "Recherche IP",
          desc: "Découvrez la localisation, le FAI et les détails réseau de toute adresse IP.",
          href: "/recherche-ip",
        },
        {
          title: "Recherche DNS",
          desc: "Affichez les enregistrements A, MX, TXT, NS et autres d'un domaine.",
          href: "/recherche-dns",
        },
        {
          title: "Recherche WHOIS",
          desc: "Découvrez les détails d'enregistrement, le registrar et les dates d'un domaine.",
          href: "/recherche-whois",
        },
        {
          title: "Vérification de port",
          desc: "Testez si les ports courants sont ouverts sur un serveur.",
          href: "/verification-port",
        },
        {
          title: "Application Windows",
          desc: "Téléchargez notre outil de bureau gratuit pour un vrai scan réseau local.",
          href: "/download",
        },
        {
          title: "Test de vitesse",
          desc: "Mesurez votre débit descendant, montant et la latence (ping).",
          href: "/test-de-vitesse",
        },
        {
          title: "Scan réseau",
          desc: "Découvrez les concepts de scan réseau, de ports et de sécurité.",
          href: "/scan",
        },
        {
          title: "Blog",
          desc: "Guides et articles sur la sécurité réseau et internet.",
          href: "/blog",
        },
        {
          title: "Boutique",
          desc: "Notre boutique de matériel de sécurité réseau arrive bientôt.",
          href: "/shop",
        },
      ],
    },
    ipLookup: {
      title: "Recherche IP",
      subtitle:
        "Entrez une adresse IP ou laissez vide pour rechercher la vôtre.",
      placeholder: "ex. 8.8.8.8",
      button: "Rechercher",
      myIp: "Utiliser mon IP",
      loading: "Recherche en cours...",
      error: "Impossible de récupérer les informations IP. Veuillez réessayer.",
      fields: {
        ip: "Adresse IP",
        country: "Pays",
        region: "Région",
        city: "Ville",
        isp: "Fournisseur d'accès",
        org: "Organisation",
        timezone: "Fuseau horaire",
        coordinates: "Coordonnées",
      },
      mapLabel: "Localisation sur la carte",
    },
    dns: {
      title: "Recherche DNS",
      subtitle:
        "Interrogez les enregistrements DNS (A, AAAA, MX, TXT, NS, CNAME) d'un domaine.",
      placeholder: "ex. example.com",
      button: "Rechercher",
      loading: "Recherche en cours...",
      error: "Impossible de récupérer les enregistrements DNS. Vérifiez le nom de domaine.",
      noRecords: "Aucun enregistrement trouvé pour ce type.",
    },
    whois: {
      title: "Recherche WHOIS",
      subtitle:
        "Affichez les détails d'enregistrement d'un domaine (propriétaire, registrar, dates).",
      placeholder: "ex. example.com",
      button: "Rechercher",
      loading: "Recherche en cours...",
      error: "Impossible de récupérer les données WHOIS. Vérifiez le nom de domaine.",
      fields: {
        domain: "Domaine",
        registrar: "Registrar",
        created: "Créé le",
        updated: "Mis à jour le",
        expires: "Expire le",
        status: "Statut",
        nameservers: "Serveurs de noms",
      },
    },
    ports: {
      title: "Vérification de port",
      subtitle: "Vérifiez si les ports courants sont ouverts sur un serveur.",
      placeholder: "ex. example.com ou 8.8.8.8",
      button: "Vérifier",
      loading: "Vérification en cours...",
      error: "Échec de la vérification. Vérifiez l'adresse du serveur.",
      open: "Ouvert",
      closed: "Fermé",
      disclaimer:
        "À utiliser uniquement sur des serveurs que vous possédez ou pour lesquels vous avez une autorisation.",
      crossSell: {
        title: "Votre caméra pourrait être exposée",
        body: "Certains ports ouverts pourraient appartenir à des services de caméra ou d'enregistreur. Notre boutique de matériel de sécurité arrive bientôt.",
        cta: "Voir la boutique",
      },
    },
    speedTest: {
      title: "Test de vitesse internet",
      subtitle: "Mesurez la vitesse et la latence de votre connexion.",
      start: "Démarrer le test",
      running: "Test en cours...",
      restart: "Refaire le test",
      download: "Téléchargement",
      upload: "Envoi",
      ping: "Ping",
      note: "Les résultats peuvent varier selon le navigateur et les conditions réseau.",
      crossSell: {
        title: "Votre réseau est-il lent ?",
        body: "Notre future boutique proposera du matériel réseau et de sécurité pour vous aider.",
        cta: "Voir la boutique",
      },
    },
    scan: {
      title: "Scan réseau",
      subtitle: "Qu'est-ce que le scan réseau et de ports, et comment ça marche ?",
      body: "Les navigateurs n'autorisent pas le scan de ports direct pour des raisons de sécurité. Un vrai scan réseau nécessite des outils de bureau ou des services serveur autorisés. Dans cette section, vous apprendrez les concepts de scan, les ports courants et les principes d'utilisation sûre.",
      disclaimer:
        "Ne scannez que des réseaux que vous possédez ou pour lesquels vous avez une autorisation. Le scan non autorisé peut être illégal.",
    },
    download: {
      title: "Application de bureau — Scanner réseau",
      subtitle:
        "Téléchargez notre outil de bureau open source pour un scan réseau approfondi via ARP/ping, SNMP, WMI, UPnP et Nmap.",
      badge: "Gratuit • Nouveau : interface en 6 langues",
      features: [
        "Interface modernisée avec un écran de configuration en 6 langues au premier lancement",
        "Trouve tous les appareils actifs sur votre réseau local via un scan multi-thread",
        "Affiche l'adresse MAC, le fabricant, le nom d'hôte et les ports ouverts",
        "Récupère les numéros de série et détails matériels via SNMP / WMI / UPnP",
        "Cliquez sur une IP dans les résultats pour ouvrir l'interface web de l'appareil",
        "Écran de scan simplifié, prêt à démarrer en un clic",
      ],
      button: "Télécharger pour Windows (.exe)",
      note: "Environ 47 Mo. Double-cliquez pour exécuter après le téléchargement — aucune installation de Python requise. Si SmartScreen avertit, choisissez 'Plus d'infos > Exécuter quand même'.",
      safe: "À utiliser uniquement sur des réseaux que vous possédez.",
    },
    blog: {
      title: "Blog",
      subtitle: "Articles sur les réseaux, la sécurité et internet.",
      readMore: "Lire la suite",
      empty: "Aucun article pour le moment. Bientôt disponible.",
    },
    footer: {
      tagline: "Les outils réseau, tous en un seul endroit.",
      rights: "Tous droits réservés.",
      privacy: "Politique de confidentialité",
      terms: "Conditions d'utilisation",
    },
    cookieConsent: {
      message: "Nous utilisons des cookies pour améliorer votre expérience et, si activé, afficher des publicités.",
      accept: "Accepter",
      reject: "Refuser",
    },
    shop: {
      title: "Boutique",
      comingSoonTitle: "Bientôt disponible...",
      comingSoonBody:
        "Nous préparons notre boutique de matériel de sécurité réseau et domotique. Caméras de sécurité nouvelle génération et services d'installation, bientôt disponibles.",
    },
  },
  es: {
    a11y: {
      skipToContent: "Ir al contenido",
    },
    meta: {
      title: "ipscans — Búsqueda de IP, escaneo de red y test de velocidad",
      description:
        "Búsqueda de dirección IP, geolocalización, test de velocidad de internet y herramientas de red. Rápido, gratuito y respetuoso con la privacidad.",
    },
    nav: {
      home: "Inicio",
      tools: "Herramientas",
      ipLookup: "Buscar IP",
      dns: "Buscar DNS",
      whois: "WHOIS",
      ports: "Verificar puerto",
      speedTest: "Test de velocidad",
      scan: "Escaneo de red",
      appDownload: "Aplicación Windows",
      blog: "Blog",
      shop: "Tienda",
    },
    hero: {
      badge: "Plataforma de herramientas de red",
      title: "Conoce tu IP, prueba tu red",
      subtitle:
        "Búsqueda de IP, geolocalización, test de velocidad y herramientas de red en un solo lugar. Gratis y sin registro.",
      ctaPrimary: "Buscar mi IP",
      ctaSecondary: "Hacer test de velocidad",
      ctaDownload: "Descargar la app de Windows",
      yourIp: "Tu dirección IP",
    },
    stats: {
      title: "ipscans en números",
      items: [
        { value: "6+", label: "Herramientas de red" },
        { value: "5", label: "Idiomas" },
        { value: "100%", label: "Gratis" },
        { value: "0", label: "Registro requerido" },
      ],
    },
    cta: {
      title: "¿Listo para explorar tu red?",
      subtitle:
        "Busca tu IP, mide tu velocidad y consulta registros DNS en segundos.",
      button: "Empezar ahora",
    },
    features: {
      title: "¿Qué puedes hacer?",
      subtitle: "Gestiona todo lo relacionado con tu red desde un solo lugar.",
      items: [
        {
          title: "Buscar IP",
          desc: "Descubre la ubicación, el ISP y los detalles de red de cualquier dirección IP.",
          href: "/buscar-ip",
        },
        {
          title: "Buscar DNS",
          desc: "Consulta los registros A, MX, TXT, NS y otros de un dominio.",
          href: "/buscar-dns",
        },
        {
          title: "Buscar WHOIS",
          desc: "Descubre los detalles de registro, el registrador y las fechas de un dominio.",
          href: "/buscar-whois",
        },
        {
          title: "Verificar puerto",
          desc: "Comprueba si los puertos comunes están abiertos en un servidor.",
          href: "/verificar-puerto",
        },
        {
          title: "Aplicación Windows",
          desc: "Descarga nuestra herramienta de escritorio gratuita para un escaneo de red local real.",
          href: "/download",
        },
        {
          title: "Test de velocidad",
          desc: "Mide tu velocidad de descarga, subida y latencia (ping).",
          href: "/test-de-velocidad",
        },
        {
          title: "Escaneo de red",
          desc: "Aprende conceptos de escaneo de red, puertos y seguridad.",
          href: "/scan",
        },
        {
          title: "Blog",
          desc: "Guías y artículos sobre seguridad de red e internet.",
          href: "/blog",
        },
        {
          title: "Tienda",
          desc: "Nuestra tienda de hardware de seguridad de red llega pronto.",
          href: "/shop",
        },
      ],
    },
    ipLookup: {
      title: "Buscar IP",
      subtitle:
        "Introduce una dirección IP o déjalo vacío para buscar la tuya.",
      placeholder: "ej. 8.8.8.8",
      button: "Buscar",
      myIp: "Usar mi IP",
      loading: "Buscando...",
      error: "No se pudo obtener la información de IP. Inténtalo de nuevo.",
      fields: {
        ip: "Dirección IP",
        country: "País",
        region: "Región",
        city: "Ciudad",
        isp: "Proveedor de internet",
        org: "Organización",
        timezone: "Zona horaria",
        coordinates: "Coordenadas",
      },
      mapLabel: "Ubicación en el mapa",
    },
    dns: {
      title: "Buscar DNS",
      subtitle:
        "Consulta los registros DNS (A, AAAA, MX, TXT, NS, CNAME) de un dominio.",
      placeholder: "ej. example.com",
      button: "Buscar",
      loading: "Buscando...",
      error: "No se pudieron obtener los registros DNS. Verifica el nombre de dominio.",
      noRecords: "No se encontraron registros para este tipo.",
    },
    whois: {
      title: "Buscar WHOIS",
      subtitle:
        "Consulta los detalles de registro de un dominio (propietario, registrador, fechas).",
      placeholder: "ej. example.com",
      button: "Buscar",
      loading: "Buscando...",
      error: "No se pudieron obtener los datos WHOIS. Verifica el nombre de dominio.",
      fields: {
        domain: "Dominio",
        registrar: "Registrador",
        created: "Creado",
        updated: "Actualizado",
        expires: "Expira",
        status: "Estado",
        nameservers: "Servidores de nombres",
      },
    },
    ports: {
      title: "Verificar puerto",
      subtitle: "Comprueba si los puertos comunes están abiertos en un servidor.",
      placeholder: "ej. example.com o 8.8.8.8",
      button: "Verificar",
      loading: "Verificando...",
      error: "La verificación falló. Comprueba la dirección del servidor.",
      open: "Abierto",
      closed: "Cerrado",
      disclaimer:
        "Úsalo solo con servidores que poseas o para los que tengas permiso.",
      crossSell: {
        title: "Tu cámara podría estar expuesta",
        body: "Algunos puertos abiertos podrían pertenecer a servicios de cámaras o grabadores. Nuestra tienda de hardware de seguridad llega pronto.",
        cta: "Ver tienda",
      },
    },
    speedTest: {
      title: "Test de velocidad de internet",
      subtitle: "Mide la velocidad y la latencia de tu conexión.",
      start: "Iniciar test",
      running: "Probando...",
      restart: "Repetir test",
      download: "Descarga",
      upload: "Subida",
      ping: "Ping",
      note: "Los resultados pueden variar según el navegador y las condiciones de red.",
      crossSell: {
        title: "¿Tu red va lenta?",
        body: "Nuestra próxima tienda ofrecerá hardware de red y seguridad para ayudarte.",
        cta: "Ver tienda",
      },
    },
    scan: {
      title: "Escaneo de red",
      subtitle: "¿Qué es el escaneo de red y de puertos, y cómo funciona?",
      body: "Los navegadores no permiten el escaneo directo de puertos por razones de seguridad. Un escaneo de red real requiere herramientas de escritorio o servicios autorizados basados en servidor. En esta sección aprenderás conceptos de escaneo, puertos comunes y principios de uso seguro.",
      disclaimer:
        "Escanea solo redes que poseas o para las que tengas permiso. El escaneo no autorizado puede ser ilegal.",
    },
    download: {
      title: "Aplicación de escritorio — Escáner de red",
      subtitle:
        "Descarga nuestra herramienta de escritorio de código abierto para un escaneo de red profundo vía ARP/ping, SNMP, WMI, UPnP y Nmap.",
      badge: "Gratis • Nuevo: interfaz en 6 idiomas",
      features: [
        "Interfaz rediseñada y moderna con pantalla de configuración en 6 idiomas al primer inicio",
        "Encuentra todos los dispositivos activos en tu red local con escaneo multi-hilo",
        "Muestra dirección MAC, fabricante, nombre de host y puertos abiertos",
        "Obtiene números de serie y detalles de hardware vía SNMP / WMI / UPnP",
        "Haz clic en una IP de los resultados para abrir la interfaz web del dispositivo",
        "Pantalla de escaneo simplificada, lista en un clic",
      ],
      button: "Descargar para Windows (.exe)",
      note: "Unos 47 MB. Haz doble clic para ejecutar tras la descarga — no necesitas instalar Python. Si SmartScreen avisa, elige 'Más información > Ejecutar de todos modos'.",
      safe: "Úsalo solo en redes que poseas.",
    },
    blog: {
      title: "Blog",
      subtitle: "Artículos sobre redes, seguridad e internet.",
      readMore: "Leer más",
      empty: "Aún no hay artículos. Próximamente.",
    },
    footer: {
      tagline: "Herramientas de red, todas en un solo lugar.",
      rights: "Todos los derechos reservados.",
      privacy: "Política de privacidad",
      terms: "Términos de servicio",
    },
    cookieConsent: {
      message: "Usamos cookies para mejorar tu experiencia y, cuando esté habilitado, mostrar anuncios.",
      accept: "Aceptar",
      reject: "Rechazar",
    },
    shop: {
      title: "Tienda",
      comingSoonTitle: "Próximamente...",
      comingSoonBody:
        "Estamos preparando nuestra tienda de seguridad de red y hardware para el hogar inteligente. Cámaras de seguridad de nueva generación y servicios de instalación, muy pronto.",
    },
  },
} as const;

export type Dictionary = (typeof dictionaries)[Locale];

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
