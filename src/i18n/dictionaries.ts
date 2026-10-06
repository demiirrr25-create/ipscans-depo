import type { Locale } from "./config";

const existingDictionaries = {
  tr: {
    a11y: {
      skipToContent: "İçeriğe geç",
    },
    meta: {
      title: "IPScans — Ağ Araçları ve Uzaktan Erişim Platformu",
      description:
        "IPCast uzak masaüstü, IPscans+ ağ keşfi, ağ analizi ve IP yönetimi araçlarını tek platformda keşfedin.",
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
      ipcast: "IPCast Remote Desktop",
      pro: "Network Health Pro",
      blog: "Blog",
      shop: "Mağaza",
    },
    hero: {
      badge: "Ağ araçları platformu",
      title: "Ağ Araçları. Tek Platform.",
      subtitle:
        "IP analizi, ağ keşfi ve uzaktan erişim araçlarını tek bir platformda bul.",
      ctaPrimary: "Uygulamaları Keşfet",
      ctaSecondary: "IPCast'i Keşfet",
      ctaDownload: "IPscans+'ı İndir",
      yourIp: "Senin IP adresin",
    },
    stats: {
      title: "Rakamlarla ipscans",
      items: [
        { value: "6+", label: "Ağ aracı" },
        { value: "14", label: "Dil desteği" },
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
      note: "Yaklaşık 47 MB. Python kurulumu gerekmez. Windows güvenlik uyarısı görürseniz dosyanın kaynağını doğrulayın.",
      safe: "Yalnızca sahibi olduğun ağlarda kullan.",
    },
    ipcast: {
      title: "IPCast Uzaktan Masaüstü",
      subtitle:
        "Windows bilgisayarlara uzaktan bağlanın, ekranı görüntüleyin veya kontrol edin. Bağlantınızı TLS şifrelemesiyle koruyun; pano ve dosya aktarımını aynı uygulamada kullanın.",
      badge: "Ücretsiz • Secure Remote Access",
      features: [
        "9 haneli cihaz kodu veya doğrudan IP adresiyle bağlantı kurun",
        "Ekran görüntüleme ve kontrol izinlerini bağlantı sırasında yönetin",
        "İsteğe bağlı katılımsız erişimi parola belirleyerek yapılandırın",
        "Bağlı cihazlar arasında metin kopyalayıp yapıştırın",
        "Dosyaları parçalara ayırarak gönderin ve alın",
        "Son bağlantılarınıza ve favori cihazlarınıza kolayca dönün",
      ],
      button: "IPCast'i İndir (.exe)",
      note: "Taşınabilir EXE veya kurulum paketi. Ayrıca .NET kurmanız gerekmez. Dosyalar kod imzası taşımaz.",
      safe: "Yalnızca size ait veya erişim izniniz bulunan cihazlara bağlanın.",
    },
    pro: {
      title: "ipscans Network Health Pro",
      subtitle:
        "Site yönetimleri, oteller, fabrikalar ve CCTV firmaları için profesyonel IP çakışma önleme ve ağ sağlığı izleme yazılımı.",
      badge: "Ticari sürüm • Abonelik tabanlı lisans",
      button: "Windows için indir (.exe)",
      note: "Aynı güvenilir tarama motorunun üzerine kurulu, ayrı bir ürün — mevcut ücretsiz IP Scanner'ı değiştirmez.",
      mostPopular: "En çok tercih edilen",
      plans: [
        {
          name: "FREE",
          price: "Ücretsiz",
          features: ["Tek seferlik ağ taraması", "IP/MAC/vendor tespiti", "Sınırsız cihaz görüntüleme"],
        },
        {
          name: "PRO",
          price: "Aylık abonelik",
          features: [
            "Sürekli izleme (continuous monitoring)",
            "IP çakışma tespiti ve uyarılar",
            "Network Health Score ve olay günlüğü",
            "CSV/JSON dışa aktarma",
          ],
        },
        {
          name: "BUSINESS",
          price: "Kurumsal fiyatlandırma",
          features: [
            "PRO'daki her şey",
            "PDF/Excel raporlama",
            "Gelişmiş bildirim kuralları",
            "Öncelikli destek",
          ],
        },
        {
          name: "ENTERPRISE",
          price: "Bize ulaşın",
          features: [
            "Çoklu lokasyon / merkezi yönetim",
            "Teknisyen hesapları",
            "Özel entegrasyonlar",
            "Atanmış destek",
          ],
        },
      ],
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
      title: "IPScans — Network Tools and Remote Access",
      description:
        "Explore IPCast remote desktop, IPscans+ network discovery, network analysis and IP management tools on one platform.",
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
      ipcast: "IPCast Remote Desktop",
      pro: "Network Health Pro",
      blog: "Blog",
      shop: "Shop",
    },
    hero: {
      badge: "Network tools platform",
      title: "Network Tools. One Platform.",
      subtitle:
        "IP analysis, network discovery and remote-access tools, brought together in one platform.",
      ctaPrimary: "Explore Applications",
      ctaSecondary: "Explore IPCast",
      ctaDownload: "Download IPscans+",
      yourIp: "Your IP address",
    },
    stats: {
      title: "ipscans in numbers",
      items: [
        { value: "6+", label: "Network tools" },
        { value: "14", label: "Languages" },
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
      note: "About 47 MB. No Python install needed. If Windows shows a security warning, verify the file source before running it.",
      safe: "Only use on networks you own.",
    },
    ipcast: {
      title: "IPCast Remote Desktop",
      subtitle:
        "Connect to Windows computers remotely to view or control their screens. Protect connections with TLS encryption and use clipboard and file transfer in one app.",
      badge: "Free • Secure Remote Access",
      features: [
        "Connect with a 9-digit device code or a direct IP address",
        "Choose screen viewing and control permissions for each connection",
        "Optionally configure unattended access with a password",
        "Copy and paste text between connected devices",
        "Send and receive files in chunks",
        "Return to recent connections and favorite devices",
      ],
      button: "Download IPCast (.exe)",
      note: "Portable EXE or installer. A separate .NET installation is not required. These files are unsigned.",
      safe: "Connect only to devices you own or are authorized to access.",
    },
    pro: {
      title: "ipscans Network Health Pro",
      subtitle:
        "Professional IP conflict prevention and network health monitoring for property management, hotels, factories and CCTV integrators.",
      badge: "Commercial edition • Subscription license",
      button: "Download for Windows (.exe)",
      note: "Built on the same trusted scanning engine, as a separate product — it doesn't replace the free IP Scanner.",
      mostPopular: "Most popular",
      plans: [
        {
          name: "FREE",
          price: "Free",
          features: ["One-off network scans", "IP/MAC/vendor detection", "Unlimited device viewing"],
        },
        {
          name: "PRO",
          price: "Monthly subscription",
          features: [
            "Continuous monitoring",
            "IP conflict detection and alerts",
            "Network Health Score and event log",
            "CSV/JSON export",
          ],
        },
        {
          name: "BUSINESS",
          price: "Business pricing",
          features: [
            "Everything in PRO",
            "PDF/Excel reporting",
            "Advanced notification rules",
            "Priority support",
          ],
        },
        {
          name: "ENTERPRISE",
          price: "Contact us",
          features: [
            "Multi-site / central management",
            "Technician accounts",
            "Custom integrations",
            "Dedicated support",
          ],
        },
      ],
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
      title: "IPScans — Netzwerktools und Fernzugriff",
      description:
        "IPCast Fernzugriff, IPscans+ Netzwerkerkennung, Netzwerkanalyse und IP-Verwaltung auf einer Plattform.",
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
      ipcast: "IPCast Remote Desktop",
      pro: "Network Health Pro",
      blog: "Blog",
      shop: "Shop",
    },
    hero: {
      badge: "Netzwerktool-Plattform",
      title: "Netzwerktools. Eine Plattform.",
      subtitle:
        "IP-Analyse, Netzwerkerkennung und Fernzugriffswerkzeuge auf einer Plattform.",
      ctaPrimary: "Anwendungen entdecken",
      ctaSecondary: "IPCast entdecken",
      ctaDownload: "IP Scanner herunterladen",
      yourIp: "Deine IP-Adresse",
    },
    stats: {
      title: "ipscans in Zahlen",
      items: [
        { value: "6+", label: "Netzwerktools" },
        { value: "14", label: "Sprachen" },
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
      note: "Etwa 47 MB. Keine Python-Installation nötig. Prüfen Sie bei einer Windows-Sicherheitswarnung zuerst die Herkunft der Datei.",
      safe: "Nur in Netzwerken verwenden, die dir gehören.",
    },
    ipcast: {
      title: "IPCast Remote Desktop",
      subtitle:
        "Verbinden Sie sich aus der Ferne mit Windows-Computern, um deren Bildschirm anzusehen oder zu steuern. TLS-Verschlüsselung schützt die Verbindung; Zwischenablage und Dateiübertragung sind integriert.",
      badge: "Kostenlos • Secure Remote Access",
      features: [
        "Verbindung per 9-stelligem Gerätecode oder direkter IP-Adresse",
        "Bildschirmansicht und Steuerungsrechte pro Verbindung festlegen",
        "Optionalen unbeaufsichtigten Zugriff mit einem Passwort einrichten",
        "Text zwischen verbundenen Geräten kopieren und einfügen",
        "Dateien in Teilen senden und empfangen",
        "Letzte Verbindungen und Favoritengeräte schnell wiederfinden",
      ],
      button: "IPCast herunterladen (.exe)",
      note: "Portable EXE oder Installer. Keine separate .NET-Installation erforderlich. Die Dateien sind nicht codesigniert.",
      safe: "Verbinden Sie sich nur mit eigenen Geräten oder Geräten, auf die Sie zugreifen dürfen.",
    },
    pro: {
      title: "ipscans Network Health Pro",
      subtitle:
        "Professionelle IP-Konflikterkennung und Netzwerk-Gesundheitsüberwachung für Hausverwaltungen, Hotels, Fabriken und CCTV-Firmen.",
      badge: "Kommerzielle Edition • Abonnement-Lizenz",
      button: "Für Windows herunterladen (.exe)",
      note: "Baut auf derselben bewährten Scan-Engine auf, als separates Produkt — ersetzt nicht den kostenlosen IP Scanner.",
      mostPopular: "Am beliebtesten",
      plans: [
        {
          name: "FREE",
          price: "Kostenlos",
          features: ["Einmalige Netzwerk-Scans", "IP/MAC/Hersteller-Erkennung", "Unbegrenzte Geräteansicht"],
        },
        {
          name: "PRO",
          price: "Monatliches Abo",
          features: [
            "Kontinuierliche Überwachung",
            "IP-Konflikterkennung und Warnungen",
            "Network Health Score und Ereignisprotokoll",
            "CSV/JSON-Export",
          ],
        },
        {
          name: "BUSINESS",
          price: "Business-Preise",
          features: [
            "Alles aus PRO",
            "PDF/Excel-Berichte",
            "Erweiterte Benachrichtigungsregeln",
            "Priorisierter Support",
          ],
        },
        {
          name: "ENTERPRISE",
          price: "Kontaktieren Sie uns",
          features: [
            "Multi-Standort-/Zentralverwaltung",
            "Techniker-Konten",
            "Individuelle Integrationen",
            "Dedizierter Support",
          ],
        },
      ],
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
      title: "IPScans — Outils réseau et accès à distance",
      description:
        "Découvrez IPCast, IPscans+ pour l'analyse réseau et la gestion des IP sur une seule plateforme.",
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
      ipcast: "IPCast Bureau à Distance",
      pro: "Network Health Pro",
      blog: "Blog",
      shop: "Boutique",
    },
    hero: {
      badge: "Plateforme d'outils réseau",
      title: "Outils réseau. Une plateforme.",
      subtitle:
        "Analyse IP, découverte réseau et outils d’accès à distance réunis sur une plateforme.",
      ctaPrimary: "Découvrir les applications",
      ctaSecondary: "Découvrir IPCast",
      ctaDownload: "Télécharger IP Scanner",
      yourIp: "Votre adresse IP",
    },
    stats: {
      title: "ipscans en chiffres",
      items: [
        { value: "6+", label: "Outils réseau" },
        { value: "14", label: "Langues" },
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
      note: "Environ 47 Mo. Aucune installation de Python requise. Si Windows affiche un avertissement, vérifiez la provenance du fichier.",
      safe: "À utiliser uniquement sur des réseaux que vous possédez.",
    },
    ipcast: {
      title: "IPCast Bureau à distance",
      subtitle:
        "Connectez-vous à distance à des ordinateurs Windows pour afficher ou contrôler leur écran. Le chiffrement TLS protège la connexion ; le presse-papiers et le transfert de fichiers sont intégrés.",
      badge: "Gratuit • Secure Remote Access",
      features: [
        "Connectez-vous avec un code appareil à 9 chiffres ou une adresse IP directe",
        "Choisissez les autorisations d’affichage et de contrôle pour chaque connexion",
        "Configurez, si besoin, un accès sans présence devant l’appareil avec un mot de passe",
        "Copiez et collez du texte entre les appareils connectés",
        "Envoyez et recevez des fichiers par blocs",
        "Retrouvez rapidement les connexions récentes et les appareils favoris",
      ],
      button: "Télécharger IPCast (.exe)",
      note: "EXE portable ou installateur. Aucune installation .NET séparée n'est nécessaire. Ces fichiers ne sont pas signés.",
      safe: "Connectez-vous uniquement à vos appareils ou à ceux auxquels vous êtes autorisé à accéder.",
    },
    pro: {
      title: "ipscans Network Health Pro",
      subtitle:
        "Prévention professionnelle des conflits IP et surveillance de la santé réseau pour syndics, hôtels, usines et intégrateurs CCTV.",
      badge: "Édition commerciale • Licence par abonnement",
      button: "Télécharger pour Windows (.exe)",
      note: "Basé sur le même moteur de scan fiable, en tant que produit séparé — ne remplace pas l'IP Scanner gratuit.",
      mostPopular: "Le plus populaire",
      plans: [
        {
          name: "FREE",
          price: "Gratuit",
          features: ["Scans réseau ponctuels", "Détection IP/MAC/fabricant", "Affichage illimité des appareils"],
        },
        {
          name: "PRO",
          price: "Abonnement mensuel",
          features: [
            "Surveillance continue",
            "Détection des conflits IP et alertes",
            "Score de santé réseau et journal d'événements",
            "Export CSV/JSON",
          ],
        },
        {
          name: "BUSINESS",
          price: "Tarif entreprise",
          features: [
            "Tout ce qui est dans PRO",
            "Rapports PDF/Excel",
            "Règles de notification avancées",
            "Support prioritaire",
          ],
        },
        {
          name: "ENTERPRISE",
          price: "Nous contacter",
          features: [
            "Gestion multi-sites / centralisée",
            "Comptes techniciens",
            "Intégrations personnalisées",
            "Support dédié",
          ],
        },
      ],
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
      title: "IPScans — Herramientas de red y acceso remoto",
      description:
        "Descubre IPCast, IPscans+ para el análisis de red y la gestión de IP en una sola plataforma.",
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
      ipcast: "IPCast Escritorio Remoto",
      pro: "Network Health Pro",
      blog: "Blog",
      shop: "Tienda",
    },
    hero: {
      badge: "Plataforma de herramientas de red",
      title: "Herramientas de red. Una plataforma.",
      subtitle:
        "Análisis IP, descubrimiento de redes y acceso remoto reunidos en una sola plataforma.",
      ctaPrimary: "Explorar aplicaciones",
      ctaSecondary: "Descubrir IPCast",
      ctaDownload: "Descargar IP Scanner",
      yourIp: "Tu dirección IP",
    },
    stats: {
      title: "ipscans en números",
      items: [
        { value: "6+", label: "Herramientas de red" },
        { value: "14", label: "Idiomas" },
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
      note: "Unos 47 MB. No necesitas instalar Python. Si Windows muestra una alerta de seguridad, verifica el origen del archivo.",
      safe: "Úsalo solo en redes que poseas.",
    },
    ipcast: {
      title: "IPCast Escritorio remoto",
      subtitle:
        "Conéctate a equipos Windows a distancia para ver o controlar su pantalla. El cifrado TLS protege la conexión e incluye portapapeles y transferencia de archivos.",
      badge: "Gratis • Secure Remote Access",
      features: [
        "Conéctate mediante un código de dispositivo de 9 dígitos o una dirección IP directa",
        "Elige los permisos de visualización y control para cada conexión",
        "Configura opcionalmente el acceso desatendido con una contraseña",
        "Copia y pega texto entre los dispositivos conectados",
        "Envía y recibe archivos divididos en bloques",
        "Vuelve fácilmente a las conexiones recientes y dispositivos favoritos",
      ],
      button: "Descargar IPCast (.exe)",
      note: "EXE portátil o instalador. No requiere instalar .NET por separado. Los archivos no están firmados.",
      safe: "Conéctate solo a dispositivos propios o a los que tengas autorización para acceder.",
    },
    pro: {
      title: "ipscans Network Health Pro",
      subtitle:
        "Prevención profesional de conflictos de IP y monitoreo de salud de red para administración de propiedades, hoteles, fábricas e integradores CCTV.",
      badge: "Edición comercial • Licencia por suscripción",
      button: "Descargar para Windows (.exe)",
      note: "Construido sobre el mismo motor de escaneo confiable, como producto independiente — no reemplaza al IP Scanner gratuito.",
      mostPopular: "Más popular",
      plans: [
        {
          name: "FREE",
          price: "Gratis",
          features: ["Escaneos de red puntuales", "Detección de IP/MAC/fabricante", "Visualización ilimitada de dispositivos"],
        },
        {
          name: "PRO",
          price: "Suscripción mensual",
          features: [
            "Monitoreo continuo",
            "Detección de conflictos de IP y alertas",
            "Puntuación de salud de red y registro de eventos",
            "Exportación CSV/JSON",
          ],
        },
        {
          name: "BUSINESS",
          price: "Precio empresarial",
          features: [
            "Todo lo de PRO",
            "Informes PDF/Excel",
            "Reglas de notificación avanzadas",
            "Soporte prioritario",
          ],
        },
        {
          name: "ENTERPRISE",
          price: "Contáctanos",
          features: [
            "Gestión multi-sede / centralizada",
            "Cuentas de técnico",
            "Integraciones personalizadas",
            "Soporte dedicado",
          ],
        },
      ],
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

type Widen<T> = T extends string ? string : T extends readonly (infer U)[]
  ? readonly Widen<U>[] : T extends object ? { [K in keyof T]: Widen<T[K]> } : T;

type BaseDictionary = Widen<typeof existingDictionaries.en>;
export type Dictionary = BaseDictionary & { experience: ReturnType<typeof makeExperience> };
export type PublicDictionary = Omit<Dictionary, "pro" | "nav"> & { nav: Omit<Dictionary["nav"], "pro"> };
type NewLocale = Exclude<Locale, keyof typeof existingDictionaries>;

// The ordered phrases below cover every homepage label, feature card, navigation
// entry and shared metadata. Paths and product names remain language-independent.
type HomeTranslation = {
  skip: string;
  meta: string;
  nav: string;
  hero: string;
  stats: string;
  cta: string;
  features: string;
  footer: string;
  cookies: string;
  shop: string;
  tools: string;
  toolUi: string;
  products: string;
};

type ExperienceTranslation = { labels: string; faq: string; scanner: string; more: string };

const experienceTranslations: Record<Locale, ExperienceTranslation> = {
  en: {
    more: "About|IP tools|Desktop apps",
    labels: "Network tools|Resources|Popular tools|Why IPScans?|Privacy first|Lookups run only when requested; use network scans only with permission.|Frequently asked questions|Search tools and applications|Open search|Close search|No results found|Search by tool or application name|All",
    faq: "Is IPScans free?|Yes, the web tools and free desktop scanner are available without registration.|Can I scan any network?|Only scan networks you own or are authorized to test.|How do I install IP Scanner?|Download the Windows application and run the installer.",
    scanner: "Discover local devices, IP addresses and open ports with the Windows IP Scanner.|What is IP Scanner?|A free Windows desktop app for discovering devices on your local network. It shows IP and MAC addresses, hostnames, vendors and open ports where available.|How does it work?|Browsers cannot scan your local network directly. The desktop app uses ARP/ping discovery and, where available, SNMP, WMI, UPnP and Nmap to collect device and hardware details.|Scan your network in three steps|Download IP Scanner|Download the Windows .exe and run it on a computer connected to the network you are authorized to scan.|Scan responsibly|Scan only networks you own or have explicit permission to test. Discovery results depend on device and network settings.|Download and run the Windows app|Start a scan of your authorized local network|Review IP, MAC, vendor, hostname and port results",
  },
  tr: {
    more: "Hakkımızda|IP araçları|Masaüstü uygulamaları",
    labels: "Ağ araçları|Kaynaklar|Popüler araçlar|Neden IPScans?|Gizlilik önceliğimiz|Sorgulamalar yalnızca isteğiniz üzerine yapılır; ağları sadece izinle tarayın.|Sık sorulan sorular|Araç ve uygulama ara|Aramayı aç|Aramayı kapat|Sonuç bulunamadı|Araç veya uygulama adına göre ara|Tümü",
    faq: "IPScans ücretsiz mi?|Evet, web araçları ve ücretsiz masaüstü tarayıcı kayıt olmadan kullanılabilir.|Her ağı tarayabilir miyim?|Yalnızca size ait veya tarama izniniz olan ağları tarayın.|IP Scanner nasıl kurulur?|Windows uygulamasını indirip yükleyiciyi çalıştırın.",
    scanner: "Windows IP Scanner ile yerel ağdaki cihazları, IP adreslerini ve açık portları keşfedin.|IP Scanner nedir?|Yerel ağdaki cihazları bulan ücretsiz bir Windows masaüstü uygulamasıdır. Mevcut olduğunda IP ve MAC adreslerini, cihaz adlarını, üreticileri ve açık portları gösterir.|Nasıl çalışır?|Tarayıcılar yerel ağınızı doğrudan tarayamaz. Masaüstü uygulaması ARP/ping keşfini ve kullanılabildiğinde SNMP, WMI, UPnP ile Nmap'i kullanarak cihaz ve donanım bilgilerini toplar.|Üç adımda ağ taraması|IP Scanner'ı indirin|Windows .exe dosyasını indirin ve taramaya yetkili olduğunuz ağa bağlı bir bilgisayarda çalıştırın.|Sorumlu tarama|Yalnızca sahibi olduğunuz veya açıkça izin aldığınız ağları tarayın. Sonuçlar cihaz ve ağ ayarlarına bağlıdır.|Windows uygulamasını indirip çalıştırın|Yetkili olduğunuz yerel ağı tarayın|IP, MAC, üretici, cihaz adı ve port sonuçlarını inceleyin",
  },
  de: {
    more: "Über uns|IP-Tools|Desktop-Apps",
    labels: "Netzwerktools|Ressourcen|Beliebte Tools|Warum IPScans?|Datenschutz zuerst|Abfragen erfolgen nur auf Anfrage; Netzwerke nur mit Erlaubnis scannen.|Häufig gestellte Fragen|Tools und Apps suchen|Suche öffnen|Suche schließen|Keine Ergebnisse|Nach Tools oder Apps suchen|Alle",
    faq: "Ist IPScans kostenlos?|Ja, Webtools und der kostenlose Desktop-Scanner sind ohne Registrierung verfügbar.|Darf ich jedes Netzwerk scannen?|Nur eigene Netzwerke oder solche mit ausdrücklicher Genehmigung.|Wie installiere ich IP Scanner?|Windows-App herunterladen und Installationsprogramm starten.",
    scanner: "Lokale Geräte, IP-Adressen und offene Ports mit dem Windows IP Scanner entdecken.|Was ist IP Scanner?|Eine kostenlose Windows-Desktop-App zur Geräteerkennung im lokalen Netzwerk. Sie zeigt IP- und MAC-Adressen, Hostnamen, Hersteller und offene Ports an, soweit verfügbar.|Wie funktioniert es?|Browser können das lokale Netzwerk nicht direkt scannen. Die Desktop-App nutzt ARP/ping und, falls verfügbar, SNMP, WMI, UPnP und Nmap für Geräte- und Hardwaredaten.|Netzwerkscan in drei Schritten|IP Scanner herunterladen|Laden Sie die Windows-.exe herunter und starten Sie sie auf einem Computer im Netzwerk, das Sie scannen dürfen.|Verantwortungsvoll scannen|Scannen Sie nur eigene Netzwerke oder solche mit ausdrücklicher Erlaubnis. Ergebnisse hängen von Geräte- und Netzwerkeinstellungen ab.|Windows-App herunterladen und starten|Autorisiertes lokales Netzwerk scannen|IP-, MAC-, Hersteller-, Hostnamen- und Portergebnisse prüfen",
  },
  es: {
    more: "Acerca de|Herramientas IP|Aplicaciones de escritorio",
    labels: "Herramientas de red|Recursos|Herramientas populares|¿Por qué IPScans?|Privacidad ante todo|Las consultas solo se realizan cuando las solicitas; escanea redes únicamente con permiso.|Preguntas frecuentes|Buscar herramientas y aplicaciones|Abrir búsqueda|Cerrar búsqueda|Sin resultados|Busca por nombre de herramienta o aplicación|Todas",
    faq: "¿IPScans es gratis?|Sí, las herramientas web y el escáner de escritorio gratuito no requieren registro.|¿Puedo escanear cualquier red?|Escanea solo redes propias o con autorización.|¿Cómo instalo IP Scanner?|Descarga la aplicación de Windows y ejecuta el instalador.",
    scanner: "Descubre dispositivos, direcciones IP y puertos abiertos de tu red local con IP Scanner para Windows.|¿Qué es IP Scanner?|Una aplicación gratuita para Windows que detecta dispositivos en la red local. Muestra direcciones IP y MAC, nombres de host, fabricantes y puertos abiertos cuando están disponibles.|¿Cómo funciona?|El navegador no puede escanear directamente la red local. La aplicación usa descubrimiento ARP/ping y, cuando están disponibles, SNMP, WMI, UPnP y Nmap para obtener datos de dispositivos y hardware.|Escanea tu red en tres pasos|Descarga IP Scanner|Descarga el archivo .exe para Windows y ejecútalo en un equipo conectado a la red que tienes permiso para escanear.|Escanea de forma responsable|Escanea solo redes propias o con permiso explícito. Los resultados dependen de la configuración de los dispositivos y la red.|Descarga y ejecuta la aplicación para Windows|Escanea tu red local autorizada|Revisa IP, MAC, fabricantes, nombres de host y puertos",
  },
  fr: {
    more: "À propos|Outils IP|Applications de bureau",
    labels: "Outils réseau|Ressources|Outils populaires|Pourquoi IPScans ?|La confidentialité d'abord|Les recherches ne sont lancées qu'à votre demande ; ne scannez les réseaux qu'avec autorisation.|Questions fréquentes|Rechercher des outils et applications|Ouvrir la recherche|Fermer la recherche|Aucun résultat|Rechercher par nom d'outil ou d'application|Tout",
    faq: "IPScans est-il gratuit ?|Oui, les outils web et le scanner de bureau gratuit sont accessibles sans inscription.|Puis-je scanner tous les réseaux ?|Scannez uniquement vos réseaux ou ceux pour lesquels vous avez une autorisation.|Comment installer IP Scanner ?|Téléchargez l'application Windows et lancez l'installation.",
    scanner: "Repérez les appareils, adresses IP et ports ouverts de votre réseau local avec IP Scanner pour Windows.|Qu'est-ce qu'IP Scanner ?|Une application Windows gratuite de découverte des appareils du réseau local. Elle affiche les adresses IP et MAC, noms d'hôte, fabricants et ports ouverts lorsqu'ils sont disponibles.|Comment fonctionne-t-il ?|Un navigateur ne peut pas scanner directement votre réseau local. L'application utilise la découverte ARP/ping et, si disponibles, SNMP, WMI, UPnP et Nmap pour recueillir les données des appareils et du matériel.|Scannez votre réseau en trois étapes|Télécharger IP Scanner|Téléchargez le fichier .exe Windows et lancez-le sur un ordinateur connecté au réseau que vous êtes autorisé à scanner.|Scanner de façon responsable|Ne scannez que vos réseaux ou ceux pour lesquels vous avez une autorisation explicite. Les résultats varient selon la configuration des appareils et du réseau.|Téléchargez et lancez l'application Windows|Scannez votre réseau local autorisé|Consultez les IP, MAC, fabricants, noms d'hôte et ports",
  },
  it: {
    more: "Chi siamo|Strumenti IP|App desktop",
    labels: "Strumenti di rete|Risorse|Strumenti più usati|Perché IPScans?|La privacy prima di tutto|Le ricerche partono solo su richiesta; scansiona le reti solo con autorizzazione.|Domande frequenti|Cerca strumenti e applicazioni|Apri ricerca|Chiudi ricerca|Nessun risultato|Cerca per nome dello strumento o dell'app|Tutti",
    faq: "IPScans è gratuito?|Sì, gli strumenti web e lo scanner desktop gratuito sono disponibili senza registrazione.|Posso scansionare qualsiasi rete?|Scansiona solo le reti di tua proprietà o per cui hai un'autorizzazione.|Come installo IP Scanner?|Scarica l'app Windows e avvia l'installazione.",
    scanner: "Scopri dispositivi, indirizzi IP e porte aperte nella rete locale con IP Scanner per Windows.|Cos'è IP Scanner?|Un'app gratuita per Windows che rileva i dispositivi della rete locale. Mostra indirizzi IP e MAC, nomi host, produttori e porte aperte dove disponibili.|Come funziona?|Il browser non può scansionare direttamente la rete locale. L'app usa ARP/ping e, se disponibili, SNMP, WMI, UPnP e Nmap per raccogliere informazioni su dispositivi e hardware.|Scansiona la rete in tre passaggi|Scarica IP Scanner|Scarica il file .exe per Windows ed eseguilo su un computer collegato alla rete che sei autorizzato a scansionare.|Scansiona in modo responsabile|Scansiona solo reti di tua proprietà o con autorizzazione esplicita. I risultati dipendono dalle impostazioni di rete e dei dispositivi.|Scarica e avvia l'app Windows|Scansiona la rete locale autorizzata|Controlla IP, MAC, produttori, nomi host e porte",
  },
  pt: {
    more: "Sobre nós|Ferramentas de IP|Aplicações de ambiente de trabalho",
    labels: "Ferramentas de rede|Recursos|Ferramentas populares|Porquê IPScans?|Privacidade em primeiro lugar|As consultas só são feitas a pedido; analise redes apenas com autorização.|Perguntas frequentes|Pesquisar ferramentas e aplicações|Abrir pesquisa|Fechar pesquisa|Sem resultados|Pesquise pelo nome da ferramenta ou aplicação|Todas",
    faq: "O IPScans é gratuito?|Sim, as ferramentas web e o analisador gratuito não exigem registo.|Posso analisar qualquer rede?|Analise apenas redes suas ou para as quais tenha autorização.|Como instalar o IP Scanner?|Descarregue a aplicação Windows e execute o instalador.",
    scanner: "Descubra dispositivos, endereços IP e portas abertas na rede local com o IP Scanner para Windows.|O que é o IP Scanner?|Uma aplicação gratuita para Windows que descobre dispositivos da rede local. Mostra endereços IP e MAC, nomes de anfitrião, fabricantes e portas abertas quando disponíveis.|Como funciona?|O navegador não consegue analisar diretamente a rede local. A aplicação utiliza ARP/ping e, quando disponíveis, SNMP, WMI, UPnP e Nmap para recolher dados de dispositivos e hardware.|Analise a rede em três passos|Descarregar IP Scanner|Descarregue o ficheiro .exe para Windows e execute-o num computador ligado à rede que está autorizado a analisar.|Análise responsável|Analise apenas redes suas ou com autorização explícita. Os resultados dependem das definições dos dispositivos e da rede.|Descarregue e execute a aplicação Windows|Analise a sua rede local autorizada|Consulte IP, MAC, fabricantes, nomes de anfitrião e portas",
  },
  nl: {
    more: "Over ons|IP-tools|Desktop-apps",
    labels: "Netwerktools|Informatie|Populaire tools|Waarom IPScans?|Privacy voorop|Opzoekingen gebeuren alleen op verzoek; scan netwerken alleen met toestemming.|Veelgestelde vragen|Zoek tools en apps|Zoeken openen|Zoeken sluiten|Geen resultaten|Zoek op naam van tool of app|Alle",
    faq: "Is IPScans gratis?|Ja, de webtools en gratis desktopscanner werken zonder registratie.|Mag ik elk netwerk scannen?|Scan alleen je eigen netwerk of een netwerk waarvoor je toestemming hebt.|Hoe installeer ik IP Scanner?|Download de Windows-app en start het installatieprogramma.",
    scanner: "Ontdek apparaten, IP-adressen en open poorten op je lokale netwerk met IP Scanner voor Windows.|Wat is IP Scanner?|Een gratis Windows-app die apparaten op je lokale netwerk ontdekt. De app toont IP- en MAC-adressen, hostnamen, fabrikanten en open poorten waar beschikbaar.|Hoe werkt het?|Een browser kan je lokale netwerk niet rechtstreeks scannen. De desktop-app gebruikt ARP/ping en, indien beschikbaar, SNMP, WMI, UPnP en Nmap om apparaat- en hardwaregegevens op te halen.|Scan je netwerk in drie stappen|IP Scanner downloaden|Download de Windows-.exe en start deze op een computer die is verbonden met het netwerk dat je mag scannen.|Scan verantwoord|Scan alleen je eigen netwerk of een netwerk waarvoor je uitdrukkelijke toestemming hebt. Resultaten hangen af van apparaat- en netwerkinstellingen.|Download en start de Windows-app|Scan je toegestane lokale netwerk|Bekijk IP-, MAC-, fabrikant-, hostnaam- en poortgegevens",
  },
  pl: {
    more: "O nas|Narzędzia IP|Aplikacje komputerowe",
    labels: "Narzędzia sieciowe|Materiały|Popularne narzędzia|Dlaczego IPScans?|Prywatność przede wszystkim|Zapytania są wykonywane tylko na żądanie; skanuj sieci wyłącznie za zgodą.|Najczęstsze pytania|Szukaj narzędzi i aplikacji|Otwórz wyszukiwanie|Zamknij wyszukiwanie|Brak wyników|Szukaj według nazwy narzędzia lub aplikacji|Wszystkie",
    faq: "Czy IPScans jest bezpłatny?|Tak, narzędzia internetowe i bezpłatny skaner nie wymagają rejestracji.|Czy mogę skanować każdą sieć?|Skanuj tylko własne sieci lub takie, na które masz zgodę.|Jak zainstalować IP Scanner?|Pobierz aplikację Windows i uruchom instalator.",
    scanner: "Wykrywaj urządzenia, adresy IP i otwarte porty w sieci lokalnej za pomocą IP Scanner dla Windows.|Czym jest IP Scanner?|Bezpłatna aplikacja Windows do wykrywania urządzeń w sieci lokalnej. Pokazuje adresy IP i MAC, nazwy hostów, producentów i otwarte porty, gdy są dostępne.|Jak działa?|Przeglądarka nie może bezpośrednio skanować sieci lokalnej. Aplikacja używa ARP/ping oraz, gdy są dostępne, SNMP, WMI, UPnP i Nmap do zbierania danych o urządzeniach i sprzęcie.|Przeskanuj sieć w trzech krokach|Pobierz IP Scanner|Pobierz plik .exe dla Windows i uruchom na komputerze podłączonym do sieci, którą możesz skanować.|Skanuj odpowiedzialnie|Skanuj tylko własne sieci lub takie, na które masz wyraźną zgodę. Wyniki zależą od ustawień urządzeń i sieci.|Pobierz i uruchom aplikację Windows|Przeskanuj autoryzowaną sieć lokalną|Sprawdź adresy IP i MAC, producentów, nazwy hostów oraz porty",
  },
  ru: {
    more: "О нас|Инструменты IP|Приложения для компьютера",
    labels: "Сетевые инструменты|Материалы|Популярные инструменты|Почему IPScans?|Конфиденциальность прежде всего|Запросы выполняются только по вашей инициативе; сканируйте сети только с разрешения.|Частые вопросы|Поиск инструментов и приложений|Открыть поиск|Закрыть поиск|Ничего не найдено|Поиск по названию инструмента или приложения|Все",
    faq: "IPScans бесплатен?|Да, веб-инструменты и бесплатный сканер доступны без регистрации.|Можно сканировать любую сеть?|Сканируйте только собственные сети или сети с разрешением владельца.|Как установить IP Scanner?|Скачайте приложение для Windows и запустите установщик.",
    scanner: "Находите устройства, IP-адреса и открытые порты локальной сети с помощью IP Scanner для Windows.|Что такое IP Scanner?|Бесплатное приложение Windows для обнаружения устройств в локальной сети. Показывает IP- и MAC-адреса, имена хостов, производителей и открытые порты, если данные доступны.|Как оно работает?|Браузер не может напрямую сканировать локальную сеть. Приложение использует ARP/ping и, при доступности, SNMP, WMI, UPnP и Nmap для сбора сведений об устройствах и оборудовании.|Сканирование сети за три шага|Скачать IP Scanner|Скачайте файл .exe для Windows и запустите его на компьютере в сети, которую вам разрешено сканировать.|Сканируйте ответственно|Сканируйте только собственные сети или сети с явного разрешения. Результаты зависят от настроек устройств и сети.|Скачайте и запустите приложение Windows|Просканируйте разрешённую локальную сеть|Просмотрите IP, MAC, производителей, имена хостов и порты",
  },
  ar: {
    more: "من نحن|أدوات IP|تطبيقات سطح المكتب",
    labels: "أدوات الشبكات|الموارد|الأدوات الشائعة|لماذا IPScans؟|الخصوصية أولًا|لا تُجرى الاستعلامات إلا بطلبك؛ افحص الشبكات بعد الحصول على إذن.|الأسئلة الشائعة|البحث عن الأدوات والتطبيقات|فتح البحث|إغلاق البحث|لم تُعثر على نتائج|ابحث باسم الأداة أو التطبيق|الكل",
    faq: "هل IPScans مجاني؟|نعم، أدوات الويب والماسح المكتبي المجاني متاحة بلا تسجيل.|هل يمكنني فحص أي شبكة؟|افحص الشبكات التي تملكها أو لديك إذن بفحصها فقط.|كيف أثبّت IP Scanner؟|نزّل تطبيق ويندوز وشغّل برنامج التثبيت.",
    scanner: "اكتشف الأجهزة وعناوين IP والمنافذ المفتوحة في شبكتك المحلية باستخدام IP Scanner لويندوز.|ما هو IP Scanner؟|تطبيق مجاني لويندوز يكتشف أجهزة الشبكة المحلية. يعرض عناوين IP وMAC وأسماء المضيفين والشركات المصنعة والمنافذ المفتوحة عند توفرها.|كيف يعمل؟|لا يستطيع المتصفح فحص شبكتك المحلية مباشرة. يستخدم التطبيق اكتشاف ARP/ping وSNMP وWMI وUPnP وNmap عند توفرها لجمع تفاصيل الأجهزة ومكوناتها.|افحص شبكتك في ثلاث خطوات|نزّل IP Scanner|نزّل ملف .exe لويندوز وشغّله على حاسوب متصل بشبكة مُصرح لك بفحصها.|افحص بمسؤولية|افحص شبكات تملكها أو لديك إذن صريح بفحصها فقط. تعتمد النتائج على إعدادات الأجهزة والشبكة.|نزّل تطبيق ويندوز وشغّله|افحص شبكتك المحلية المصرح بها|راجع عناوين IP وMAC والشركات المصنعة وأسماء المضيفين والمنافذ",
  },
  ja: {
    more: "私たちについて|IP ツール|デスクトップアプリ",
    labels: "ネットワークツール|資料|よく使われるツール|IPScans を選ぶ理由|プライバシーを第一に|照会は要求時のみ実行されます。ネットワークのスキャンには許可が必要です。|よくある質問|ツールとアプリを検索|検索を開く|検索を閉じる|結果がありません|ツール名またはアプリ名で検索|すべて",
    faq: "IPScans は無料ですか？|はい。ウェブツールと無料のデスクトップスキャナーは登録不要です。|どのネットワークでもスキャンできますか？|自分のネットワークか、許可を得たネットワークだけをスキャンしてください。|IP Scanner のインストール方法は？|Windows アプリをダウンロードしてインストーラーを実行してください。",
    scanner: "Windows 用 IP Scanner でローカルネットワークのデバイス、IP アドレス、開放ポートを確認。|IP Scanner とは？|ローカルネットワークのデバイスを検出する無料の Windows アプリです。利用可能な場合は IP・MAC アドレス、ホスト名、メーカー、開放ポートを表示します。|仕組み|ブラウザからローカルネットワークを直接スキャンすることはできません。デスクトップアプリは ARP/ping を使用し、利用可能な場合は SNMP、WMI、UPnP、Nmap でデバイスとハードウェアの情報を取得します。|3 ステップでネットワークをスキャン|IP Scanner をダウンロード|Windows 用 .exe をダウンロードし、スキャンの許可を得たネットワークに接続されたパソコンで実行してください。|責任を持ってスキャン|所有するか明示的に許可されたネットワークだけをスキャンしてください。結果はデバイスやネットワークの設定によって異なります。|Windows アプリをダウンロードして実行|許可を得たローカルネットワークをスキャン|IP、MAC、メーカー、ホスト名、ポートを確認",
  },
  ko: {
    more: "소개|IP 도구|데스크톱 앱",
    labels: "네트워크 도구|자료|인기 도구|왜 IPScans인가요?|개인정보 보호 우선|조회는 요청할 때만 진행됩니다. 네트워크 스캔은 허가를 받고 실행하세요.|자주 묻는 질문|도구 및 앱 검색|검색 열기|검색 닫기|검색 결과 없음|도구 또는 앱 이름으로 검색|전체",
    faq: "IPScans는 무료인가요?|네. 웹 도구와 무료 데스크톱 스캐너는 가입 없이 이용할 수 있습니다.|모든 네트워크를 스캔해도 되나요?|소유한 네트워크 또는 허가받은 네트워크만 스캔하세요.|IP Scanner는 어떻게 설치하나요?|Windows 앱을 다운로드하고 설치 프로그램을 실행하세요.",
    scanner: "Windows용 IP Scanner로 로컬 네트워크의 장치, IP 주소와 열린 포트를 찾아보세요.|IP Scanner란?|로컬 네트워크 장치를 탐색하는 무료 Windows 앱입니다. 사용 가능한 경우 IP와 MAC 주소, 호스트 이름, 제조사 및 열린 포트를 표시합니다.|어떻게 작동하나요?|브라우저에서는 로컬 네트워크를 직접 스캔할 수 없습니다. 데스크톱 앱은 ARP/ping과 사용 가능한 경우 SNMP, WMI, UPnP, Nmap을 활용하여 장치 및 하드웨어 정보를 수집합니다.|세 단계로 네트워크 스캔|IP Scanner 다운로드|Windows용 .exe를 다운로드하여 스캔이 허가된 네트워크에 연결된 컴퓨터에서 실행하세요.|책임감 있게 스캔|소유하거나 명시적 허가를 받은 네트워크만 스캔하세요. 결과는 장치 및 네트워크 설정에 따라 달라집니다.|Windows 앱 다운로드 및 실행|허가받은 로컬 네트워크 스캔|IP, MAC, 제조사, 호스트 이름 및 포트 확인",
  },
  zh: {
    more: "关于我们|IP 工具|桌面应用",
    labels: "网络工具|资源|热门工具|为什么选择 IPScans？|隐私优先|仅在你主动请求时查询；扫描网络前请取得授权。|常见问题|搜索工具和应用|打开搜索|关闭搜索|未找到结果|按工具或应用名称搜索|全部",
    faq: "IPScans 免费吗？|是的，网页工具和免费桌面扫描器无需注册即可使用。|可以扫描任何网络吗？|只扫描你拥有或获准测试的网络。|如何安装 IP Scanner？|下载 Windows 应用并运行安装程序。",
    scanner: "使用 Windows 版 IP Scanner 发现本地网络设备、IP 地址和开放端口。|什么是 IP Scanner？|一款免费的 Windows 本地网络设备发现应用。可在信息可用时显示 IP 和 MAC 地址、主机名、厂商及开放端口。|它如何工作？|浏览器无法直接扫描本地网络。桌面应用使用 ARP/ping，并在可用时通过 SNMP、WMI、UPnP 和 Nmap 收集设备与硬件信息。|三步扫描网络|下载 IP Scanner|下载 Windows .exe 文件，在已获准扫描的网络中使用联网电脑运行。|负责任地扫描|只扫描你拥有或明确获准测试的网络。结果取决于设备和网络设置。|下载并运行 Windows 应用|扫描获准测试的本地网络|查看 IP、MAC、厂商、主机名和端口结果",
  },
};

function makeExperience(t: ExperienceTranslation) {
  const l = phrases(t.labels, 13);
  const f = phrases(t.faq, 6);
  const s = phrases(t.scanner, 13);
  const [about, ipTools, desktopApps] = phrases(t.more, 3);
  return {
    networkTools: l[0], resources: l[1], popular: l[2], why: l[3],
    about,
    categories: { all: l[12], network: l[0], ip: ipTools, desktop: desktopApps },
    privacyTitle: l[4], privacyBody: l[5], faqTitle: l[6],
    searchPlaceholder: l[7], openSearch: l[8], closeSearch: l[9],
    noResults: l[10], searchHint: l[11], all: l[12],
    faq: [0, 1, 2].map((i) => ({ question: f[i * 2], answer: f[i * 2 + 1] })),
    scanner: {
      intro: s[0], whatTitle: s[1], whatBody: s[2], howTitle: s[3],
      howBody: s[4], stepsTitle: s[5], downloadTitle: s[6],
      downloadBody: s[7], safetyTitle: s[8], safetyBody: s[9],
      steps: s.slice(10),
    },
  };
}

const homeTranslations: Record<NewLocale, HomeTranslation> = {
  it: {
    skip: "Vai al contenuto",
    meta: "IPScans — Strumenti di rete e accesso remoto|Scopri IPCast per il desktop remoto, IP Scanner e gli strumenti per l'analisi della rete e la gestione degli IP in un'unica piattaforma.",
    nav: "Home|Strumenti|Ricerca IP|Ricerca DNS|WHOIS|Verifica porte|Test di velocità|Scansione rete|App Windows|IPCast Desktop remoto|Network Health Pro|Blog|Negozio",
    hero: "Piattaforma di strumenti di rete|Strumenti di rete. Un'unica piattaforma.|Analisi IP, rilevamento della rete e accesso remoto in un'unica piattaforma.|Esplora le applicazioni|Scopri IPCast|Scarica IP Scanner|Il tuo indirizzo IP",
    stats: "ipscans in numeri|Strumenti di rete|Lingue|Gratuito|Registrazione richiesta",
    cta: "Pronto a esplorare la tua rete?|Cerca il tuo IP, misura la velocità e controlla i record DNS in pochi secondi.|Inizia ora",
    features: "Cosa puoi fare?|Gestisci la tua rete da un unico posto.|Ricerca IP|Scopri posizione, provider e dettagli di qualsiasi indirizzo IP.|Ricerca DNS|Visualizza i record A, MX, TXT, NS e altri record DNS di un dominio.|Ricerca WHOIS|Scopri i dati di registrazione, il registrar e le date di un dominio.|Verifica porte|Controlla se le porte comuni di un server sono aperte.|App Windows|Scarica lo strumento desktop gratuito per scansionare la rete locale.|Test di velocità|Misura download, upload e latenza (ping).|Scansione rete|Scopri la scansione delle reti, le porte e i concetti di sicurezza.|Blog|Guide e articoli sulla sicurezza delle reti e su Internet.|Negozio|Il nostro negozio di dispositivi per la sicurezza delle reti aprirà presto.",
    footer: "Strumenti di rete, tutti in un unico posto.|Tutti i diritti riservati.|Informativa sulla privacy|Termini di servizio",
    cookies: "Utilizziamo i cookie per migliorare la tua esperienza e, se attivati, mostrare annunci.|Accetta|Rifiuta",
    shop: "Negozio|Prossimamente...|Stiamo preparando il nostro negozio di dispositivi per la sicurezza delle reti e la casa intelligente. Presto troverai telecamere di nuova generazione e servizi di installazione.",
    tools: "Ricerca IP|Inserisci un indirizzo IP o lascia vuoto per cercare il tuo.|Ricerca DNS|Consulta i record DNS di un dominio.|Ricerca WHOIS|Consulta i dati di registrazione di un dominio.|Verifica porte|Verifica se le porte più comuni sono aperte su un server.|Test della velocità Internet|Misura velocità e latenza della connessione.|Scansione rete|Che cos'è la scansione delle reti e delle porte?|Articoli su reti, sicurezza e Internet.",
    toolUi: "es. 8.8.8.8|Cerca|Usa il mio IP|Ricerca in corso...|Impossibile recuperare le informazioni IP. Riprova.|Indirizzo IP|Paese|Regione|Città|Provider|Organizzazione|Fuso orario|Coordinate|Posizione sulla mappa|es. example.com|Cerca|Ricerca in corso...|Impossibile recuperare i record DNS. Controlla il dominio.|Nessun record di questo tipo.|es. example.com|Cerca|Ricerca in corso...|Impossibile recuperare i dati WHOIS. Controlla il dominio.|Dominio|Registrar|Creazione|Aggiornamento|Scadenza|Stato|Server dei nomi|es. example.com o 8.8.8.8|Verifica|Verifica in corso...|Verifica non riuscita. Controlla il server.|Aperta|Chiusa|Usa solo su server di tua proprietà o con autorizzazione.|La tua telecamera potrebbe essere esposta|Alcune porte aperte potrebbero appartenere a telecamere. Il nostro negozio di sicurezza aprirà presto.|Visita il negozio|Avvia test|Test in corso...|Ripeti test|Download|Upload|Ping|I risultati possono variare in base al browser e alla rete.|La tua rete è lenta?|Nel nostro prossimo negozio troverai dispositivi di rete e sicurezza.|Visita il negozio|I browser impediscono la scansione diretta delle porte per motivi di sicurezza. Per una vera scansione servono strumenti desktop o servizi autorizzati.|Scansiona solo reti di tua proprietà o autorizzate. La scansione non autorizzata può essere illegale.",
    products: "Scanner di rete per desktop|Scarica il nostro strumento open source per la scansione approfondita tramite ARP/ping, SNMP, WMI, UPnP e Nmap.|Gratis • Nuovo: interfaccia in 6 lingue|Interfaccia moderna con configurazione iniziale in 6 lingue|Trova i dispositivi attivi nella rete locale con scansione parallela|Mostra indirizzo MAC, produttore, nome host e porte aperte|Recupera dettagli hardware tramite SNMP, WMI e UPnP|Apri l'interfaccia web di un dispositivo facendo clic sul suo IP|Scansione semplificata con un clic|Scarica per Windows (.exe)|Circa 47 MB. Non serve Python. Verifica la provenienza del file se Windows mostra un avviso.|Usa solo sulle reti di tua proprietà.|IPCast Desktop remoto|Collegati a computer Windows per visualizzare o controllare lo schermo. Connessioni protette da TLS, con appunti e trasferimento file.|Gratis • Edizione monocromatica 2.1.0|Collegati con codice dispositivo a 9 cifre o indirizzo IP diretto|Gestisci i permessi di visualizzazione e controllo|Configura l'accesso automatico con password|Copia testo tra i dispositivi collegati|Invia e ricevi file a blocchi|Ritrova connessioni recenti e preferiti|Scarica IPCast (.exe)|Circa 105,8 MB (v2.1.0). App Windows autonoma; non serve installare .NET.|Collegati solo a dispositivi tuoi o autorizzati.|ipscans Network Health Pro|Monitoraggio professionale della rete e prevenzione dei conflitti IP per aziende, hotel, fabbriche e installatori CCTV.|Edizione commerciale • Licenza in abbonamento|Scarica per Windows (.exe)|Prodotto distinto basato sullo stesso motore di scansione; non sostituisce IP Scanner gratuito.|Più scelto|Gratuito|Abbonamento mensile|Prezzo aziendale|Contattaci|Scansione singola della rete|Rilevamento IP/MAC/produttore|Dispositivi visualizzabili senza limiti|Monitoraggio continuo|Rilevamento e avvisi di conflitti IP|Punteggio di salute della rete e registro eventi|Esportazione CSV/JSON|Tutto ciò che include PRO|Report PDF/Excel|Regole di notifica avanzate|Supporto prioritario|Gestione centralizzata di più sedi|Account per tecnici|Integrazioni personalizzate|Supporto dedicato|Leggi di più|Nessun articolo. In arrivo.",
  },
  pt: {
    skip: "Ir para o conteúdo",
    meta: "IPScans — Ferramentas de rede e acesso remoto|Descubra o ambiente de trabalho remoto IPCast, o IP Scanner e as ferramentas de análise de rede e gestão de IP numa só plataforma.",
    nav: "Início|Ferramentas|Consulta de IP|Consulta de DNS|WHOIS|Verificar portas|Teste de velocidade|Análise de rede|Aplicação Windows|IPCast Ambiente remoto|Network Health Pro|Blogue|Loja",
    hero: "Plataforma de ferramentas de rede|Ferramentas de rede. Uma plataforma.|Análise de IP, descoberta de redes e acesso remoto numa só plataforma.|Explorar aplicações|Conhecer o IPCast|Descarregar IP Scanner|O seu endereço IP",
    stats: "ipscans em números|Ferramentas de rede|Idiomas|Gratuito|Registo necessário",
    cta: "Pronto para explorar a sua rede?|Consulte o seu IP, meça a velocidade e veja os registos DNS em segundos.|Começar",
    features: "O que pode fazer?|Gira tudo o que diz respeito à sua rede num só lugar.|Consulta de IP|Descubra a localização, o fornecedor e os detalhes de qualquer endereço IP.|Consulta de DNS|Veja os registos A, MX, TXT, NS e outros registos DNS de um domínio.|Consulta WHOIS|Consulte os dados de registo, a entidade registadora e as datas de um domínio.|Verificar portas|Teste se as portas comuns de um servidor estão abertas.|Aplicação Windows|Descarregue a ferramenta gratuita para analisar a sua rede local.|Teste de velocidade|Meça a velocidade de transferência, envio e latência (ping).|Análise de rede|Saiba mais sobre análise de redes, portas e segurança.|Blogue|Guias e artigos sobre segurança de redes e a Internet.|Loja|A nossa loja de equipamentos de segurança de rede abre em breve.",
    footer: "Ferramentas de rede, tudo num só lugar.|Todos os direitos reservados.|Política de privacidade|Termos de utilização",
    cookies: "Utilizamos cookies para melhorar a sua experiência e, quando ativado, apresentar anúncios.|Aceitar|Rejeitar",
    shop: "Loja|Brevemente...|Estamos a preparar a nossa loja de equipamentos de segurança de rede e para a casa inteligente. Em breve, câmaras de segurança de última geração e serviços de instalação.",
    tools: "Consulta de IP|Introduza um endereço IP ou deixe em branco para consultar o seu.|Consulta de DNS|Consulte os registos DNS de um domínio.|Consulta WHOIS|Consulte os dados de registo de um domínio.|Verificar portas|Veja se as portas comuns de um servidor estão abertas.|Teste de velocidade da Internet|Meça a velocidade e latência da ligação.|Análise de rede|O que é a análise de redes e portas?|Artigos sobre redes, segurança e Internet.",
    toolUi: "p. ex. 8.8.8.8|Consultar|Usar o meu IP|A consultar...|Não foi possível obter dados do IP. Tente novamente.|Endereço IP|País|Região|Cidade|Fornecedor de Internet|Organização|Fuso horário|Coordenadas|Localização no mapa|p. ex. example.com|Consultar|A consultar...|Não foi possível obter registos DNS. Verifique o domínio.|Nenhum registo deste tipo.|p. ex. example.com|Consultar|A consultar...|Não foi possível obter dados WHOIS. Verifique o domínio.|Domínio|Entidade registadora|Criado|Atualizado|Expira|Estado|Servidores de nomes|p. ex. example.com ou 8.8.8.8|Verificar|A verificar...|Falha na verificação. Confirme o endereço do servidor.|Aberta|Fechada|Use apenas em servidores seus ou autorizados.|A sua câmara pode estar exposta|Algumas portas abertas podem pertencer a câmaras. A nossa loja de segurança abre em breve.|Visitar loja|Iniciar teste|A testar...|Testar novamente|Transferência|Envio|Ping|Os resultados variam consoante o navegador e a rede.|A sua rede está lenta?|A nossa futura loja terá equipamentos de rede e segurança.|Visitar loja|Por razões de segurança, os navegadores não permitem analisar portas diretamente. A análise real requer ferramentas de ambiente de trabalho ou serviços autorizados.|Analise apenas redes suas ou autorizadas. A análise sem autorização pode ser ilegal.",
    products: "Aplicação de análise de rede|Descarregue a ferramenta de código aberto para análise de rede por ARP/ping, SNMP, WMI, UPnP e Nmap.|Grátis • Novo: interface em 6 idiomas|Interface moderna com configuração inicial em 6 idiomas|Encontra dispositivos ativos na rede local em paralelo|Mostra MAC, fabricante, nome de anfitrião e portas abertas|Obtém detalhes de hardware via SNMP, WMI e UPnP|Abra a interface web de um dispositivo ao clicar no IP|Análise simplificada com um clique|Descarregar para Windows (.exe)|Cerca de 47 MB. Não precisa de Python. Confirme a origem do ficheiro se o Windows apresentar um aviso.|Utilize apenas em redes suas.|IPCast Ambiente de trabalho remoto|Ligue-se a computadores Windows para ver ou controlar o ecrã. Ligações protegidas por TLS, com área de transferência e transferência de ficheiros.|Grátis • Edição monocromática 2.1.0|Ligue-se com um código de 9 dígitos ou um endereço IP|Controle as permissões de visualização e controlo|Configure acesso não assistido com palavra-passe|Copie texto entre os dispositivos ligados|Envie e receba ficheiros por partes|Volte às ligações recentes e aos favoritos|Descarregar IPCast (.exe)|Cerca de 105,8 MB (v2.1.0). Aplicação Windows autónoma; não precisa de instalar .NET.|Ligue-se apenas a dispositivos seus ou autorizados.|ipscans Network Health Pro|Monitorização profissional da rede e prevenção de conflitos IP para condomínios, hotéis, fábricas e instaladores CCTV.|Edição comercial • Licença por subscrição|Descarregar para Windows (.exe)|Produto separado com o mesmo motor de análise; não substitui o IP Scanner gratuito.|Mais popular|Grátis|Subscrição mensal|Preço empresarial|Contacte-nos|Análise pontual da rede|Deteção de IP/MAC/fabricante|Visualização ilimitada de dispositivos|Monitorização contínua|Deteção e alertas de conflitos IP|Índice de saúde da rede e registo de eventos|Exportação CSV/JSON|Tudo o que está incluído no PRO|Relatórios PDF/Excel|Regras avançadas de notificação|Apoio prioritário|Gestão central de vários locais|Contas de técnicos|Integrações personalizadas|Apoio dedicado|Ler mais|Ainda não há artigos. Em breve.",
  },
  nl: {
    skip: "Ga naar inhoud",
    meta: "IPScans — Netwerktools en externe toegang|Ontdek IPCast voor extern bureaublad, IP Scanner, netwerkanalyse en IP-beheer op één platform.",
    nav: "Startpagina|Tools|IP opzoeken|DNS opzoeken|WHOIS|Poorten controleren|Snelheidstest|Netwerkscan|Windows-app|IPCast Extern bureaublad|Network Health Pro|Blog|Winkel",
    hero: "Platform voor netwerktools|Netwerktools. Eén platform.|IP-analyse, netwerkdetectie en externe toegang op één platform.|Ontdek applicaties|Ontdek IPCast|IP Scanner downloaden|Jouw IP-adres",
    stats: "ipscans in cijfers|Netwerktools|Talen|Gratis|Registratie vereist",
    cta: "Klaar om je netwerk te verkennen?|Zoek je IP op, meet je snelheid en bekijk DNS-records in enkele seconden.|Aan de slag",
    features: "Wat kun je doen?|Beheer alles rondom je netwerk op één plek.|IP opzoeken|Ontdek de locatie, provider en netwerkgegevens van elk IP-adres.|DNS opzoeken|Bekijk A-, MX-, TXT-, NS- en andere DNS-records van een domein.|WHOIS opzoeken|Bekijk registratiedetails, registrar en datums van een domein.|Poorten controleren|Test of veelgebruikte poorten op een server openstaan.|Windows-app|Download onze gratis desktoptool om je lokale netwerk te scannen.|Snelheidstest|Meet je download, upload en vertraging (ping).|Netwerkscan|Leer over netwerkscans, poorten en beveiliging.|Blog|Gidsen en artikelen over netwerkbeveiliging en internet.|Winkel|Onze winkel voor netwerkbeveiligingshardware opent binnenkort.",
    footer: "Netwerktools, allemaal op één plek.|Alle rechten voorbehouden.|Privacybeleid|Servicevoorwaarden",
    cookies: "We gebruiken cookies om je ervaring te verbeteren en, indien ingeschakeld, advertenties te tonen.|Accepteren|Weigeren",
    shop: "Winkel|Binnenkort...|We bouwen aan onze winkel voor netwerkbeveiliging en slimme apparaten. Binnenkort vind je er moderne beveiligingscamera's en installatieservices.",
    tools: "IP opzoeken|Voer een IP-adres in of laat leeg om je eigen adres op te zoeken.|DNS opzoeken|Bekijk de DNS-records van een domein.|WHOIS opzoeken|Bekijk de registratiegegevens van een domein.|Poorten controleren|Controleer of veelgebruikte serverpoorten openstaan.|Internetsnelheidstest|Meet je verbindingssnelheid en vertraging.|Netwerkscan|Wat is een netwerk- of poortscan?|Artikelen over netwerken, beveiliging en internet.",
    toolUi: "bijv. 8.8.8.8|Opzoeken|Gebruik mijn IP|Bezig met zoeken...|IP-gegevens ophalen mislukt. Probeer het opnieuw.|IP-adres|Land|Regio|Stad|Provider|Organisatie|Tijdzone|Coördinaten|Locatie op kaart|bijv. example.com|Opzoeken|Bezig met zoeken...|DNS-records ophalen mislukt. Controleer het domein.|Geen records van dit type gevonden.|bijv. example.com|Opzoeken|Bezig met zoeken...|WHOIS-gegevens ophalen mislukt. Controleer het domein.|Domein|Registrar|Aangemaakt|Bijgewerkt|Verloopt|Status|Naamservers|bijv. example.com of 8.8.8.8|Controleren|Bezig met controleren...|Controle mislukt. Controleer het serveradres.|Open|Gesloten|Gebruik dit alleen op eigen servers of met toestemming.|Je camera is mogelijk blootgesteld|Sommige open poorten kunnen bij camera's horen. Onze beveiligingswinkel opent binnenkort.|Bekijk winkel|Test starten|Test bezig...|Opnieuw testen|Download|Upload|Ping|Resultaten kunnen verschillen per browser en netwerk.|Is je netwerk traag?|Onze nieuwe winkel biedt netwerk- en beveiligingsapparatuur.|Bekijk winkel|Browsers staan rechtstreeks poorten scannen om veiligheidsredenen niet toe. Gebruik desktoptools of geautoriseerde diensten voor een echte scan.|Scan alleen je eigen netwerken of met toestemming. Ongeoorloofd scannen kan strafbaar zijn.",
    products: "Desktop-app voor netwerkscans|Download onze opensourcetool voor diepgaande netwerkscans via ARP/ping, SNMP, WMI, UPnP en Nmap.|Gratis • Nieuw: interface in 6 talen|Moderne interface met een instelscherm in 6 talen|Vindt actieve apparaten op het lokale netwerk met parallel scannen|Toont MAC-adres, fabrikant, hostnaam en open poorten|Haalt hardwaregegevens op via SNMP, WMI en UPnP|Klik op een IP om de webinterface van het apparaat te openen|Eenvoudig scannen met één klik|Downloaden voor Windows (.exe)|Ongeveer 47 MB. Geen Python nodig. Controleer de herkomst bij een Windows-waarschuwing.|Gebruik alleen op eigen netwerken.|IPCast Extern bureaublad|Maak op afstand verbinding met Windows-computers om het scherm te bekijken of te bedienen. TLS beveiligt de verbinding; klembord en bestandsoverdracht zijn ingebouwd.|Gratis • Monochrome editie 2.1.0|Verbind via een 9-cijferige apparaatcode of direct IP-adres|Beheer de kijk- en bedieningsrechten per verbinding|Stel desgewenst toegang zonder toezicht in met een wachtwoord|Kopieer tekst tussen verbonden apparaten|Verzend en ontvang bestanden in delen|Ga eenvoudig terug naar recente verbindingen en favorieten|IPCast downloaden (.exe)|Ongeveer 105,8 MB (v2.1.0). Zelfstandige Windows-app; .NET hoeft niet apart geïnstalleerd te worden.|Verbind alleen met eigen apparaten of met toestemming.|ipscans Network Health Pro|Professionele bewaking van netwerken en preventie van IP-conflicten voor beheerders, hotels, fabrieken en CCTV-installateurs.|Commerciële editie • Abonnement|Downloaden voor Windows (.exe)|Apart product met dezelfde betrouwbare scan-engine; vervangt de gratis IP Scanner niet.|Meest gekozen|Gratis|Maandabonnement|Zakelijke tarieven|Neem contact op|Eenmalige netwerkscan|Detectie van IP/MAC/fabrikant|Onbeperkt apparaten bekijken|Doorlopende bewaking|Detectie en waarschuwingen voor IP-conflicten|Netwerkgezondheidsscore en gebeurtenissenlog|CSV/JSON-export|Alles van PRO|PDF/Excel-rapporten|Uitgebreide meldingsregels|Prioritaire ondersteuning|Beheer van meerdere locaties|Technicusaccounts|Aangepaste integraties|Toegewijde ondersteuning|Lees meer|Nog geen artikelen. Binnenkort beschikbaar.",
  },
  pl: {
    skip: "Przejdź do treści",
    meta: "IPScans — Narzędzia sieciowe i dostęp zdalny|Poznaj IPCast do zdalnego pulpitu, IP Scanner oraz narzędzia analizy sieci i zarządzania IP na jednej platformie.",
    nav: "Strona główna|Narzędzia|Sprawdź IP|Sprawdź DNS|WHOIS|Sprawdź porty|Test prędkości|Skanowanie sieci|Aplikacja Windows|IPCast Pulpit zdalny|Network Health Pro|Blog|Sklep",
    hero: "Platforma narzędzi sieciowych|Narzędzia sieciowe. Jedna platforma.|Analiza IP, wykrywanie sieci i dostęp zdalny na jednej platformie.|Poznaj aplikacje|Poznaj IPCast|Pobierz IP Scanner|Twój adres IP",
    stats: "ipscans w liczbach|Narzędzia sieciowe|Języki|Bezpłatnie|Wymagana rejestracja",
    cta: "Gotowy na poznanie swojej sieci?|Sprawdź IP, zmierz prędkość i zobacz rekordy DNS w kilka sekund.|Rozpocznij",
    features: "Co możesz zrobić?|Zarządzaj swoją siecią w jednym miejscu.|Sprawdź IP|Poznaj lokalizację, dostawcę i szczegóły sieciowe dowolnego adresu IP.|Sprawdź DNS|Wyświetl rekordy A, MX, TXT, NS i inne rekordy DNS domeny.|Sprawdź WHOIS|Poznaj dane rejestracyjne domeny, rejestratora i daty.|Sprawdź porty|Zobacz, czy typowe porty serwera są otwarte.|Aplikacja Windows|Pobierz bezpłatne narzędzie do skanowania sieci lokalnej.|Test prędkości|Zmierz pobieranie, wysyłanie i opóźnienie (ping).|Skanowanie sieci|Dowiedz się więcej o skanowaniu sieci, portach i bezpieczeństwie.|Blog|Poradniki i artykuły o bezpieczeństwie sieci i internecie.|Sklep|Nasz sklep ze sprzętem do zabezpieczania sieci otworzy się wkrótce.",
    footer: "Narzędzia sieciowe w jednym miejscu.|Wszelkie prawa zastrzeżone.|Polityka prywatności|Warunki korzystania",
    cookies: "Używamy plików cookie, aby poprawić komfort korzystania i, jeśli włączono, wyświetlać reklamy.|Akceptuj|Odrzuć",
    shop: "Sklep|Już wkrótce...|Przygotowujemy sklep ze sprzętem do zabezpieczania sieci i inteligentnego domu. Wkrótce pojawią się nowoczesne kamery i usługi instalacji.",
    tools: "Sprawdź IP|Wpisz adres IP lub pozostaw puste pole, aby sprawdzić własny.|Sprawdź DNS|Wyświetl rekordy DNS domeny.|Sprawdź WHOIS|Wyświetl dane rejestracyjne domeny.|Sprawdź porty|Sprawdź, czy typowe porty na serwerze są otwarte.|Test prędkości internetu|Zmierz prędkość i opóźnienie połączenia.|Skanowanie sieci|Czym jest skanowanie sieci i portów?|Artykuły o sieciach, bezpieczeństwie i internecie.",
    toolUi: "np. 8.8.8.8|Sprawdź|Użyj mojego IP|Wyszukiwanie...|Nie udało się pobrać informacji o IP. Spróbuj ponownie.|Adres IP|Kraj|Region|Miasto|Dostawca Internetu|Organizacja|Strefa czasowa|Współrzędne|Lokalizacja na mapie|np. example.com|Sprawdź|Wyszukiwanie...|Nie udało się pobrać rekordów DNS. Sprawdź domenę.|Brak rekordów tego typu.|np. example.com|Sprawdź|Wyszukiwanie...|Nie udało się pobrać danych WHOIS. Sprawdź domenę.|Domena|Rejestrator|Utworzono|Zaktualizowano|Wygasa|Status|Serwery nazw|np. example.com lub 8.8.8.8|Sprawdź|Sprawdzanie...|Nie udało się sprawdzić. Zweryfikuj adres serwera.|Otwarty|Zamknięty|Używaj tylko na własnych serwerach lub za zgodą.|Twoja kamera może być dostępna z zewnątrz|Niektóre otwarte porty mogą należeć do kamer. Nasz sklep ze sprzętem ochronnym wkrótce ruszy.|Zobacz sklep|Rozpocznij test|Testowanie...|Testuj ponownie|Pobieranie|Wysyłanie|Ping|Wyniki zależą od przeglądarki i warunków sieciowych.|Twoja sieć jest wolna?|Wkrótce w naszym sklepie znajdziesz sprzęt sieciowy i ochronny.|Zobacz sklep|Przeglądarki ze względów bezpieczeństwa nie pozwalają skanować portów bezpośrednio. Do skanowania użyj aplikacji lub autoryzowanej usługi.|Skanuj tylko własne sieci lub takie, na które masz zgodę. Nieautoryzowane skanowanie może być nielegalne.",
    products: "Aplikacja do skanowania sieci|Pobierz otwarte narzędzie do skanowania sieci za pomocą ARP/ping, SNMP, WMI, UPnP i Nmap.|Bezpłatnie • Nowość: interfejs w 6 językach|Nowoczesny interfejs i konfiguracja w 6 językach|Wykrywa aktywne urządzenia w sieci lokalnej równolegle|Pokazuje MAC, producenta, nazwę hosta i otwarte porty|Pobiera dane sprzętu przez SNMP, WMI i UPnP|Kliknij IP, aby otworzyć interfejs internetowy urządzenia|Prosty ekran skanowania jednym kliknięciem|Pobierz dla Windows (.exe)|Około 47 MB. Python nie jest potrzebny. W razie ostrzeżenia Windows sprawdź źródło pliku.|Używaj tylko we własnych sieciach.|IPCast Pulpit zdalny|Łącz się z komputerami Windows, aby wyświetlać lub sterować ich ekranem. Połączenia chroni TLS; dostępne są schowek i przesyłanie plików.|Bezpłatnie • Edycja monochromatyczna 2.1.0|Połącz się 9-cyfrowym kodem urządzenia lub adresem IP|Zarządzaj uprawnieniami do podglądu i sterowania|Opcjonalnie ustaw dostęp bez nadzoru z hasłem|Kopiuj tekst między połączonymi urządzeniami|Wysyłaj i odbieraj pliki w częściach|Wracaj do ostatnich połączeń i ulubionych|Pobierz IPCast (.exe)|Około 105,8 MB (v2.1.0). Samodzielna aplikacja Windows; instalacja .NET nie jest wymagana.|Łącz się tylko z własnymi lub autoryzowanymi urządzeniami.|ipscans Network Health Pro|Profesjonalne monitorowanie sieci i zapobieganie konfliktom IP dla zarządców, hoteli, fabryk i firm CCTV.|Wersja komercyjna • Licencja abonamentowa|Pobierz dla Windows (.exe)|Osobny produkt oparty na tym samym silniku; nie zastępuje bezpłatnego IP Scanner.|Najpopularniejszy|Bezpłatnie|Abonament miesięczny|Cena dla firm|Skontaktuj się z nami|Jednorazowy skan sieci|Wykrywanie IP/MAC/producenta|Nieograniczony podgląd urządzeń|Stały monitoring|Wykrywanie konfliktów IP i alarmy|Ocena stanu sieci i dziennik zdarzeń|Eksport CSV/JSON|Wszystko z planu PRO|Raporty PDF/Excel|Zaawansowane reguły powiadomień|Wsparcie priorytetowe|Zarządzanie wieloma lokalizacjami|Konta techników|Własne integracje|Dedykowane wsparcie|Czytaj dalej|Brak wpisów. Wkrótce się pojawią.",
  },
  ru: {
    skip: "Перейти к содержимому",
    meta: "IPScans — сетевые инструменты и удалённый доступ|Откройте для себя удалённый рабочий стол IPCast, IP Scanner и инструменты анализа сетей и управления IP на одной платформе.",
    nav: "Главная|Инструменты|Проверка IP|Проверка DNS|WHOIS|Проверка портов|Тест скорости|Сканирование сети|Приложение Windows|IPCast Удалённый рабочий стол|Network Health Pro|Блог|Магазин",
    hero: "Платформа сетевых инструментов|Сетевые инструменты. Одна платформа.|Анализ IP, обнаружение сетей и удалённый доступ на одной платформе.|Посмотреть приложения|Узнать об IPCast|Скачать IP Scanner|Ваш IP-адрес",
    stats: "ipscans в цифрах|Сетевых инструментов|Языков|Бесплатно|Нужна регистрация",
    cta: "Готовы исследовать свою сеть?|Узнайте свой IP, измерьте скорость и проверьте записи DNS за секунды.|Начать",
    features: "Что можно сделать?|Управляйте сетью в одном месте.|Проверка IP|Узнайте местоположение, провайдера и сетевые сведения любого IP-адреса.|Проверка DNS|Просмотрите записи A, MX, TXT, NS и другие записи DNS домена.|Проверка WHOIS|Узнайте регистрационные данные домена, регистратора и даты.|Проверка портов|Проверьте, открыты ли стандартные порты на сервере.|Приложение Windows|Скачайте бесплатную программу для сканирования локальной сети.|Тест скорости|Измерьте скорость загрузки, отдачи и задержку (пинг).|Сканирование сети|Узнайте о сканировании сетей, портах и безопасности.|Блог|Руководства и статьи о сетевой безопасности и интернете.|Магазин|Наш магазин оборудования для безопасности сетей скоро откроется.",
    footer: "Сетевые инструменты в одном месте.|Все права защищены.|Политика конфиденциальности|Условия использования",
    cookies: "Мы используем файлы cookie, чтобы улучшить ваш опыт и, если включено, показывать рекламу.|Принять|Отклонить",
    shop: "Магазин|Скоро...|Мы готовим магазин оборудования для сетевой безопасности и умного дома. Скоро здесь появятся современные камеры безопасности и услуги установки.",
    tools: "Проверка IP|Введите IP-адрес или оставьте поле пустым, чтобы проверить свой.|Проверка DNS|Просмотрите записи DNS домена.|Проверка WHOIS|Просмотрите регистрационные данные домена.|Проверка портов|Узнайте, открыты ли распространённые порты на сервере.|Тест скорости интернета|Измерьте скорость и задержку соединения.|Сканирование сети|Что такое сканирование сетей и портов?|Статьи о сетях, безопасности и интернете.",
    toolUi: "напр. 8.8.8.8|Найти|Использовать мой IP|Поиск...|Не удалось получить сведения об IP. Повторите попытку.|IP-адрес|Страна|Регион|Город|Провайдер|Организация|Часовой пояс|Координаты|Положение на карте|напр. example.com|Найти|Поиск...|Не удалось получить записи DNS. Проверьте домен.|Записи этого типа не найдены.|напр. example.com|Найти|Поиск...|Не удалось получить сведения WHOIS. Проверьте домен.|Домен|Регистратор|Создан|Обновлён|Истекает|Статус|Серверы имён|напр. example.com или 8.8.8.8|Проверить|Проверка...|Проверка не удалась. Уточните адрес сервера.|Открыт|Закрыт|Используйте только для собственных серверов или с разрешения.|Ваша камера может быть доступна извне|Некоторые открытые порты могут принадлежать камерам. Наш магазин оборудования скоро откроется.|Перейти в магазин|Начать тест|Тестирование...|Повторить тест|Загрузка|Отдача|Пинг|Результаты зависят от браузера и состояния сети.|Ваша сеть работает медленно?|В нашем будущем магазине появятся сетевые устройства и средства защиты.|Перейти в магазин|Браузеры запрещают прямое сканирование портов из соображений безопасности. Для сканирования нужны программы или авторизованные службы.|Сканируйте только собственные сети или сети с разрешения. Несанкционированное сканирование может быть незаконным.",
    products: "Приложение для сканирования сети|Скачайте приложение с открытым кодом для глубокого сканирования через ARP/ping, SNMP, WMI, UPnP и Nmap.|Бесплатно • Новинка: интерфейс на 6 языках|Современный интерфейс с настройкой на 6 языках|Находит активные устройства локальной сети параллельным сканированием|Показывает MAC, производителя, имя хоста и открытые порты|Получает данные оборудования через SNMP, WMI и UPnP|Нажмите на IP, чтобы открыть веб-интерфейс устройства|Упрощённое сканирование одним нажатием|Скачать для Windows (.exe)|Около 47 МБ. Python не нужен. При предупреждении Windows проверьте источник файла.|Используйте только в собственных сетях.|IPCast Удалённый рабочий стол|Подключайтесь к компьютерам Windows для просмотра и управления экраном. TLS защищает соединение; доступны буфер обмена и передача файлов.|Бесплатно • Монохромная версия 2.1.0|Подключение по 9-значному коду или IP-адресу|Настройка разрешений на просмотр и управление|Необслуживаемый доступ с паролем по желанию|Копирование текста между устройствами|Передача файлов по частям|Быстрый доступ к последним подключениям и избранному|Скачать IPCast (.exe)|Около 105,8 МБ (v2.1.0). Автономное приложение Windows; установка .NET не нужна.|Подключайтесь только к собственным устройствам или с разрешения.|ipscans Network Health Pro|Профессиональный мониторинг сети и предотвращение конфликтов IP для управляющих компаний, отелей, заводов и служб CCTV.|Коммерческая версия • Подписка|Скачать для Windows (.exe)|Отдельный продукт на том же движке; не заменяет бесплатный IP Scanner.|Популярный выбор|Бесплатно|Ежемесячная подписка|Тариф для организаций|Свяжитесь с нами|Разовое сканирование сети|Обнаружение IP/MAC/производителя|Просмотр любого числа устройств|Непрерывный мониторинг|Обнаружение конфликтов IP и оповещения|Оценка состояния сети и журнал событий|Экспорт CSV/JSON|Всё из PRO|Отчёты PDF/Excel|Расширенные правила уведомлений|Приоритетная поддержка|Централизованное управление несколькими объектами|Учётные записи специалистов|Индивидуальные интеграции|Персональная поддержка|Читать далее|Публикаций пока нет. Скоро появятся.",
  },
  ar: {
    skip: "الانتقال إلى المحتوى",
    meta: "IPScans — أدوات الشبكات والوصول عن بُعد|اكتشف IPCast لسطح المكتب البعيد وIP Scanner وأدوات تحليل الشبكات وإدارة عناوين IP في منصة واحدة.",
    nav: "الرئيسية|الأدوات|البحث عن IP|البحث عن DNS|WHOIS|فحص المنافذ|اختبار السرعة|فحص الشبكة|تطبيق ويندوز|IPCast سطح المكتب البعيد|Network Health Pro|المدونة|المتجر",
    hero: "منصة أدوات الشبكات|أدوات الشبكات. منصة واحدة.|تحليل عناوين IP واكتشاف الشبكات والوصول عن بُعد في منصة واحدة.|استكشف التطبيقات|تعرّف على IPCast|تنزيل IP Scanner|عنوان IP الخاص بك",
    stats: "ipscans بالأرقام|أدوات شبكات|لغات|مجاني|تسجيل مطلوب",
    cta: "هل أنت مستعد لاستكشاف شبكتك؟|ابحث عن عنوان IP وقِس السرعة واعرض سجلات DNS خلال ثوانٍ.|ابدأ الآن",
    features: "ماذا يمكنك أن تفعل؟|أدر كل ما يتعلق بشبكتك من مكان واحد.|البحث عن IP|اكتشف موقع أي عنوان IP ومزود الخدمة وتفاصيل الشبكة.|البحث عن DNS|اعرض سجلات A وMX وTXT وNS وغيرها لأي نطاق.|البحث عن WHOIS|اكتشف بيانات تسجيل النطاق والمسجّل والتواريخ.|فحص المنافذ|تحقق مما إذا كانت المنافذ الشائعة مفتوحة على الخادم.|تطبيق ويندوز|نزّل أداتنا المجانية لفحص شبكتك المحلية.|اختبار السرعة|قِس سرعة التنزيل والرفع وزمن الاستجابة.|فحص الشبكة|تعرّف على فحص الشبكات والمنافذ ومفاهيم الأمان.|المدونة|أدلة ومقالات حول أمن الشبكات والإنترنت.|المتجر|سيفتتح متجر معدات أمن الشبكات قريبًا.",
    footer: "أدوات الشبكات في مكان واحد.|جميع الحقوق محفوظة.|سياسة الخصوصية|شروط الخدمة",
    cookies: "نستخدم ملفات تعريف الارتباط لتحسين تجربتك وعرض الإعلانات عند تفعيلها.|قبول|رفض",
    shop: "المتجر|قريبًا...|نجهز متجرنا لمعدات أمن الشبكات والمنازل الذكية. قريبًا ستجد كاميرات أمنية متطورة وخدمات تركيب.",
    tools: "البحث عن IP|أدخل عنوان IP أو اترك الحقل فارغًا للبحث عن عنوانك.|البحث عن DNS|اعرض سجلات DNS لنطاق.|البحث عن WHOIS|اعرض بيانات تسجيل النطاق.|فحص المنافذ|تحقق من المنافذ الشائعة المفتوحة على الخادم.|اختبار سرعة الإنترنت|قِس سرعة الاتصال وزمن الاستجابة.|فحص الشبكة|ما فحص الشبكات والمنافذ؟|مقالات عن الشبكات والأمان والإنترنت.",
    toolUi: "مثل 8.8.8.8|ابحث|استخدم عنوان IP الخاص بي|جارٍ البحث...|تعذر جلب معلومات IP. حاول مرة أخرى.|عنوان IP|البلد|المنطقة|المدينة|مزود الإنترنت|المؤسسة|المنطقة الزمنية|الإحداثيات|الموقع على الخريطة|مثل example.com|ابحث|جارٍ البحث...|تعذر جلب سجلات DNS. تحقق من النطاق.|لا توجد سجلات من هذا النوع.|مثل example.com|ابحث|جارٍ البحث...|تعذر جلب بيانات WHOIS. تحقق من النطاق.|النطاق|جهة التسجيل|تاريخ الإنشاء|تاريخ التحديث|تاريخ الانتهاء|الحالة|خوادم الأسماء|مثل example.com أو 8.8.8.8|تحقق|جارٍ التحقق...|فشل الفحص. تحقق من عنوان الخادم.|مفتوح|مغلق|استخدمه فقط مع خوادم تملكها أو لديك إذن بفحصها.|قد تكون كاميرتك مكشوفة|قد تتبع بعض المنافذ المفتوحة للكاميرات. سيفتتح متجر معدات الأمان قريبًا.|تصفح المتجر|ابدأ الاختبار|جارٍ الاختبار...|أعد الاختبار|التنزيل|الرفع|زمن الاستجابة|قد تختلف النتائج باختلاف المتصفح وظروف الشبكة.|هل شبكتك بطيئة؟|سيضم متجرنا القادم معدات للشبكات والأمان.|تصفح المتجر|لا تسمح المتصفحات بفحص المنافذ مباشرة لأسباب أمنية. يتطلب الفحص الحقيقي تطبيقًا مكتبيًا أو خدمة مخولة.|افحص الشبكات التي تملكها أو لديك إذن بفحصها فقط. قد يكون الفحص دون إذن مخالفًا للقانون.",
    products: "تطبيق فحص الشبكات|نزّل أداتنا مفتوحة المصدر لفحص الشبكات باستخدام ARP/ping وSNMP وWMI وUPnP وNmap.|مجاني • جديد: واجهة بست لغات|واجهة حديثة وإعداد أولي بست لغات|يجد الأجهزة النشطة على الشبكة المحلية بالفحص المتوازي|يعرض MAC والشركة المصنعة واسم المضيف والمنافذ المفتوحة|يجلب معلومات المعدات عبر SNMP وWMI وUPnP|افتح واجهة الجهاز بالنقر على عنوان IP الخاص به|ابدأ الفحص بنقرة واحدة|تنزيل لويندوز (.exe)|حوالي 47 ميجابايت. لا يحتاج إلى Python. تحقق من مصدر الملف إذا ظهر تحذير من ويندوز.|استخدمه فقط على شبكاتك.|IPCast سطح المكتب البعيد|اتصل بحواسيب ويندوز لعرض شاشتها أو التحكم بها. اتصالات محمية بتشفير TLS مع الحافظة ونقل الملفات.|مجاني • الإصدار الأحادي اللون 2.1.0|اتصل برمز جهاز من 9 أرقام أو بعنوان IP|حدد أذونات عرض الشاشة والتحكم|اضبط الوصول دون حضور بكلمة مرور إذا رغبت|انسخ النص بين الأجهزة المتصلة|أرسل الملفات واستقبلها على أجزاء|ارجع للاتصالات الأخيرة والأجهزة المفضلة|تنزيل IPCast (.exe)|حوالي 105.8 ميجابايت (v2.1.0). تطبيق ويندوز مستقل؛ لا يتطلب تثبيت .NET.|اتصل فقط بأجهزتك أو بالأجهزة المصرح لك بها.|ipscans Network Health Pro|مراقبة الشبكات ومنع تعارض IP باحترافية لمديري العقارات والفنادق والمصانع وشركات الكاميرات.|نسخة تجارية • ترخيص باشتراك|تنزيل لويندوز (.exe)|منتج مستقل بمحرك الفحص نفسه؛ لا يحل محل IP Scanner المجاني.|الأكثر شيوعًا|مجاني|اشتراك شهري|أسعار الشركات|اتصل بنا|فحص الشبكة لمرة واحدة|اكتشاف IP/MAC والشركة المصنعة|عرض أجهزة غير محدود|مراقبة مستمرة|كشف تعارض IP والتنبيهات|تقييم صحة الشبكة وسجل الأحداث|تصدير CSV/JSON|جميع ميزات PRO|تقارير PDF/Excel|قواعد إشعارات متقدمة|دعم ذو أولوية|إدارة مركزية لمواقع متعددة|حسابات للفنيين|تكاملات مخصصة|دعم مخصص|اقرأ المزيد|لا توجد مقالات بعد. ستظهر قريبًا.",
  },
  ja: {
    skip: "本文へ移動",
    meta: "IPScans — ネットワークツールとリモートアクセス|リモートデスクトップの IPCast、IP Scanner、ネットワーク分析と IP 管理ツールをひとつのプラットフォームで。",
    nav: "ホーム|ツール|IP 検索|DNS 検索|WHOIS|ポート確認|速度テスト|ネットワークスキャン|Windows アプリ|IPCast リモートデスクトップ|Network Health Pro|ブログ|ショップ",
    hero: "ネットワークツールプラットフォーム|ネットワークツールをひとつの場所に。|IP 分析、ネットワーク検出、リモートアクセスをひとつのプラットフォームで。|アプリを見る|IPCast を見る|IP Scanner をダウンロード|あなたの IP アドレス",
    stats: "数字で見る ipscans|ネットワークツール|対応言語|無料|登録が必要",
    cta: "ネットワークを調べてみませんか？|IP の検索、速度測定、DNS レコードの確認を数秒で。|始める",
    features: "何ができますか？|ネットワークに関する情報を一か所で管理。|IP 検索|任意の IP アドレスの位置、プロバイダー、ネットワーク情報を確認。|DNS 検索|ドメインの A、MX、TXT、NS などの DNS レコードを表示。|WHOIS 検索|ドメインの登録情報、登録事業者、日付を確認。|ポート確認|サーバーの一般的なポートが開いているか確認。|Windows アプリ|無料のデスクトップツールでローカルネットワークをスキャン。|速度テスト|ダウンロード、アップロード、遅延（ping）を測定。|ネットワークスキャン|ネットワークスキャン、ポート、セキュリティについて学ぶ。|ブログ|ネットワークセキュリティとインターネットのガイドや記事。|ショップ|ネットワークセキュリティ機器のショップは近日公開。",
    footer: "ネットワークツールをひとつの場所に。|無断転載を禁じます。|プライバシーポリシー|利用規約",
    cookies: "体験の向上と、有効な場合の広告表示に Cookie を使用します。|同意する|拒否する",
    shop: "ショップ|近日公開...|ネットワークセキュリティとスマートホーム機器のショップを準備中です。新世代の防犯カメラと設置サービスを近日公開します。",
    tools: "IP 検索|IP アドレスを入力するか、空欄で自分の IP を検索します。|DNS 検索|ドメインの DNS レコードを確認します。|WHOIS 検索|ドメインの登録情報を確認します。|ポート確認|サーバーの一般的なポートが開いているか確認します。|インターネット速度テスト|接続速度と遅延を測定します。|ネットワークスキャン|ネットワークとポートのスキャンとは？|ネットワーク、セキュリティ、インターネットの記事。",
    toolUi: "例: 8.8.8.8|検索|自分の IP を使用|検索中...|IP 情報を取得できません。再試行してください。|IP アドレス|国|地域|都市|プロバイダー|組織|タイムゾーン|座標|地図上の位置|例: example.com|検索|検索中...|DNS レコードを取得できません。ドメインを確認してください。|この種類のレコードはありません。|例: example.com|検索|検索中...|WHOIS 情報を取得できません。ドメインを確認してください。|ドメイン|登録事業者|作成日|更新日|有効期限|状態|ネームサーバー|例: example.com または 8.8.8.8|確認|確認中...|確認に失敗しました。サーバーアドレスを確認してください。|開放|閉鎖|所有するか許可を得たサーバーだけを対象にしてください。|カメラが外部に公開されている可能性|開放ポートの一部はカメラに属する可能性があります。セキュリティ機器店は近日公開。|ショップを見る|テスト開始|テスト中...|再テスト|ダウンロード|アップロード|Ping|結果はブラウザやネットワーク環境によって異なります。|ネットワークが遅いですか？|近日公開のショップでネットワーク・セキュリティ機器をご紹介します。|ショップを見る|ブラウザでは安全上の理由から直接ポートをスキャンできません。実際のスキャンにはデスクトップツールか認可されたサービスが必要です。|所有するか許可を得たネットワークだけをスキャンしてください。無許可のスキャンは違法となる場合があります。",
    products: "ネットワークスキャナー デスクトップアプリ|ARP/ping、SNMP、WMI、UPnP、Nmap による詳細なネットワークスキャン用のオープンソースツールをダウンロード。|無料 • 新機能: 6 言語の画面|新しい画面と初回起動時の 6 言語設定|並列スキャンでローカルネットワークの稼働デバイスを検出|MAC アドレス、メーカー、ホスト名、開放ポートを表示|SNMP、WMI、UPnP でハードウェア情報を取得|結果の IP をクリックしてデバイスのウェブ画面を開く|ワンクリックで簡単にスキャン|Windows 用をダウンロード (.exe)|約 47 MB。Python は不要です。Windows の警告が出た場合はファイルの入手元をご確認ください。|所有するネットワークだけで使用してください。|IPCast リモートデスクトップ|Windows パソコンに接続し、画面の表示や操作ができます。TLS で接続を保護し、クリップボードとファイル転送も利用できます。|無料 • 2.1.0 モノクロ版|9 桁のデバイスコードまたは IP アドレスで接続|接続ごとに表示と操作の権限を設定|パスワードで無人アクセスを任意設定|接続中のデバイス間でテキストをコピー|ファイルを分割して送受信|最近の接続とお気に入りにすぐ戻る|IPCast をダウンロード (.exe)|約 105.8 MB (v2.1.0)。単体の Windows アプリで、.NET の別途インストールは不要です。|所有するかアクセスを許可されたデバイスだけに接続してください。|ipscans Network Health Pro|施設管理者、ホテル、工場、監視カメラ事業者向けの IP 競合防止とネットワーク監視。|商用版 • サブスクリプション|Windows 用をダウンロード (.exe)|同じスキャンエンジンを使用する別製品で、無料の IP Scanner に代わるものではありません。|一番人気|無料|月額制|法人向け価格|お問い合わせ|単発のネットワークスキャン|IP/MAC/メーカーの検出|無制限のデバイス表示|常時監視|IP 競合の検出と通知|ネットワーク健全性スコアとイベント履歴|CSV/JSON 出力|PRO の全機能|PDF/Excel レポート|高度な通知ルール|優先サポート|複数拠点の一元管理|技術者アカウント|個別の連携機能|専任サポート|続きを読む|記事はまだありません。近日公開。",
  },
  ko: {
    skip: "본문으로 건너뛰기",
    meta: "IPScans — 네트워크 도구 및 원격 접속|원격 데스크톱 IPCast, IP Scanner, 네트워크 분석 및 IP 관리 도구를 하나의 플랫폼에서 만나보세요.",
    nav: "홈|도구|IP 조회|DNS 조회|WHOIS|포트 확인|속도 테스트|네트워크 스캔|Windows 앱|IPCast 원격 데스크톱|Network Health Pro|블로그|상점",
    hero: "네트워크 도구 플랫폼|네트워크 도구, 하나의 플랫폼.|IP 분석, 네트워크 탐색 및 원격 접속을 하나의 플랫폼에서.|앱 살펴보기|IPCast 살펴보기|IP Scanner 다운로드|내 IP 주소",
    stats: "숫자로 보는 ipscans|네트워크 도구|지원 언어|무료|가입 필요",
    cta: "네트워크를 탐색할 준비가 되셨나요?|몇 초 만에 IP를 조회하고 속도를 측정하고 DNS 레코드를 확인하세요.|시작하기",
    features: "무엇을 할 수 있나요?|네트워크에 관한 모든 것을 한곳에서 관리하세요.|IP 조회|모든 IP 주소의 위치, 인터넷 제공업체, 네트워크 정보를 확인하세요.|DNS 조회|도메인의 A, MX, TXT, NS 및 기타 DNS 레코드를 확인하세요.|WHOIS 조회|도메인 등록 정보, 등록기관 및 날짜를 확인하세요.|포트 확인|서버의 일반적인 포트가 열려 있는지 확인하세요.|Windows 앱|무료 데스크톱 도구로 로컬 네트워크를 스캔하세요.|속도 테스트|다운로드, 업로드 및 지연 시간(ping)을 측정하세요.|네트워크 스캔|네트워크 스캔, 포트 및 보안 개념을 알아보세요.|블로그|네트워크 보안과 인터넷에 관한 가이드 및 글.|상점|네트워크 보안 장비 상점이 곧 문을 엽니다.",
    footer: "네트워크 도구를 한곳에서.|모든 권리 보유.|개인정보 처리방침|서비스 약관",
    cookies: "사용 경험을 개선하고 활성화된 경우 광고를 표시하기 위해 쿠키를 사용합니다.|동의|거부",
    shop: "상점|출시 예정...|네트워크 보안 및 스마트 홈 장비 상점을 준비 중입니다. 차세대 보안 카메라와 설치 서비스를 곧 만나보세요.",
    tools: "IP 조회|IP 주소를 입력하거나 비워 두고 내 주소를 조회하세요.|DNS 조회|도메인의 DNS 레코드를 확인하세요.|WHOIS 조회|도메인 등록 정보를 확인하세요.|포트 확인|서버의 일반적인 포트가 열려 있는지 확인하세요.|인터넷 속도 테스트|연결 속도와 지연 시간을 측정하세요.|네트워크 스캔|네트워크 및 포트 스캔이란?|네트워크, 보안 및 인터넷에 관한 글.",
    toolUi: "예: 8.8.8.8|조회|내 IP 사용|조회 중...|IP 정보를 가져올 수 없습니다. 다시 시도하세요.|IP 주소|국가|지역|도시|인터넷 제공업체|조직|시간대|좌표|지도상 위치|예: example.com|조회|조회 중...|DNS 레코드를 가져올 수 없습니다. 도메인을 확인하세요.|이 유형의 레코드가 없습니다.|예: example.com|조회|조회 중...|WHOIS 정보를 가져올 수 없습니다. 도메인을 확인하세요.|도메인|등록기관|생성일|수정일|만료일|상태|네임서버|예: example.com 또는 8.8.8.8|확인|확인 중...|확인에 실패했습니다. 서버 주소를 확인하세요.|열림|닫힘|소유하거나 허가받은 서버에만 사용하세요.|카메라가 외부에 노출되었을 수 있습니다|열린 포트 중 카메라 서비스가 있을 수 있습니다. 보안 장비 상점이 곧 문을 엽니다.|상점 보기|테스트 시작|테스트 중...|다시 테스트|다운로드|업로드|핑|결과는 브라우저와 네트워크 상태에 따라 달라질 수 있습니다.|네트워크가 느린가요?|곧 출시될 상점에서 네트워크 및 보안 장비를 만나보세요.|상점 보기|브라우저는 보안상 포트 직접 스캔을 허용하지 않습니다. 실제 스캔에는 데스크톱 도구나 허가된 서비스가 필요합니다.|소유하거나 허가받은 네트워크만 스캔하세요. 무단 스캔은 불법일 수 있습니다.",
    products: "네트워크 스캐너 데스크톱 앱|ARP/ping, SNMP, WMI, UPnP, Nmap으로 네트워크를 정밀 스캔하는 오픈소스 도구를 다운로드하세요.|무료 • 새 기능: 6개 언어 인터페이스|새로운 화면과 첫 실행 시 6개 언어 설정|병렬 스캔으로 로컬 네트워크의 활성 장치 탐색|MAC 주소, 제조사, 호스트 이름 및 열린 포트 표시|SNMP, WMI, UPnP로 하드웨어 정보 확인|결과의 IP를 클릭해 장치 웹 화면 열기|한 번의 클릭으로 간편하게 스캔|Windows용 다운로드 (.exe)|약 47MB. Python 설치가 필요 없습니다. Windows 경고가 표시되면 파일 출처를 확인하세요.|소유한 네트워크에서만 사용하세요.|IPCast 원격 데스크톱|Windows 컴퓨터에 원격으로 연결해 화면을 보거나 제어하세요. TLS로 연결을 보호하고 클립보드와 파일 전송을 이용할 수 있습니다.|무료 • 2.1.0 모노크롬 버전|9자리 장치 코드 또는 IP 주소로 연결|연결마다 화면 보기 및 제어 권한 관리|비밀번호로 무인 접속을 선택적으로 설정|연결된 장치 간 텍스트 복사|파일을 나누어 보내고 받기|최근 연결과 즐겨찾기 다시 열기|IPCast 다운로드 (.exe)|약 105.8MB (v2.1.0). 독립 실행형 Windows 앱이며 .NET을 별도로 설치할 필요가 없습니다.|소유하거나 접근 권한이 있는 장치에만 연결하세요.|ipscans Network Health Pro|관리업체, 호텔, 공장 및 CCTV 업체를 위한 전문 IP 충돌 방지 및 네트워크 상태 모니터링 도구.|상용 버전 • 구독 라이선스|Windows용 다운로드 (.exe)|동일한 스캔 엔진을 사용하는 별도 제품이며 무료 IP Scanner를 대체하지 않습니다.|가장 인기|무료|월간 구독|기업 요금|문의하기|일회성 네트워크 스캔|IP/MAC/제조사 감지|장치 무제한 보기|지속적 모니터링|IP 충돌 감지 및 알림|네트워크 상태 점수 및 이벤트 기록|CSV/JSON 내보내기|PRO의 모든 기능|PDF/Excel 보고서|고급 알림 규칙|우선 지원|여러 지점 통합 관리|기술자 계정|맞춤형 통합|전담 지원|더 읽기|게시물이 아직 없습니다. 곧 공개됩니다.",
  },
  zh: {
    skip: "跳转到内容",
    meta: "IPScans — 网络工具与远程访问|在一个平台上探索 IPCast 远程桌面、IP Scanner、网络分析和 IP 管理工具。",
    nav: "首页|工具|IP 查询|DNS 查询|WHOIS|端口检测|网速测试|网络扫描|Windows 应用|IPCast 远程桌面|Network Health Pro|博客|商店",
    hero: "网络工具平台|网络工具，一个平台。|IP 分析、网络发现和远程访问，汇聚于一个平台。|探索应用|了解 IPCast|下载 IP Scanner|你的 IP 地址",
    stats: "ipscans 数据概览|网络工具|支持语言|免费|需要注册",
    cta: "准备好探索你的网络了吗？|几秒钟内查询 IP、测试网速并查看 DNS 记录。|立即开始",
    features: "可以做什么？|在一个地方管理你的网络。|IP 查询|查看任意 IP 地址的位置、运营商和网络信息。|DNS 查询|查看域名的 A、MX、TXT、NS 等 DNS 记录。|WHOIS 查询|查看域名的注册信息、注册商和日期。|端口检测|检测服务器上的常见端口是否开放。|Windows 应用|下载免费桌面工具，扫描本地网络。|网速测试|测量下载、上传速度和延迟（ping）。|网络扫描|了解网络扫描、端口与安全知识。|博客|关于网络安全和互联网的指南与文章。|商店|我们的网络安全硬件商店即将开业。",
    footer: "网络工具，尽在一处。|保留所有权利。|隐私政策|服务条款",
    cookies: "我们使用 Cookie 改善体验，并在启用时展示广告。|接受|拒绝",
    shop: "商店|即将推出...|我们正在筹备网络安全和智能家居硬件商店。新一代安防摄像头和安装服务即将推出。",
    tools: "IP 查询|输入 IP 地址，或留空查询自己的地址。|DNS 查询|查看域名的 DNS 记录。|WHOIS 查询|查看域名的注册信息。|端口检测|检测服务器的常见端口是否开放。|网络速度测试|测量连接速度和延迟。|网络扫描|什么是网络和端口扫描？|关于网络、安全和互联网的文章。",
    toolUi: "例如 8.8.8.8|查询|使用我的 IP|查询中...|无法获取 IP 信息，请重试。|IP 地址|国家|地区|城市|网络服务商|组织|时区|坐标|地图位置|例如 example.com|查询|查询中...|无法获取 DNS 记录，请检查域名。|没有此类型的记录。|例如 example.com|查询|查询中...|无法获取 WHOIS 信息，请检查域名。|域名|注册商|创建日期|更新日期|到期日期|状态|域名服务器|例如 example.com 或 8.8.8.8|检测|检测中...|检测失败，请检查服务器地址。|开放|关闭|仅用于你拥有或获准测试的服务器。|你的摄像头可能暴露在外|部分开放端口可能属于摄像头。我们的安全设备商店即将开业。|浏览商店|开始测试|测试中...|重新测试|下载|上传|延迟|结果可能因浏览器和网络状况而异。|网络太慢？|即将开业的商店将提供网络和安全设备。|浏览商店|出于安全考虑，浏览器不允许直接扫描端口。实际扫描需要桌面工具或授权服务。|仅扫描你拥有或获准测试的网络。未经授权的扫描可能违法。",
    products: "网络扫描器桌面应用|下载开源工具，利用 ARP/ping、SNMP、WMI、UPnP 和 Nmap 深度扫描网络。|免费 • 新增六语言界面|全新界面，首次启动可选择六种语言|并行扫描本地网络中的所有活动设备|显示 MAC 地址、厂商、主机名和开放端口|通过 SNMP、WMI 和 UPnP 获取硬件信息|点击结果中的 IP，在浏览器中打开设备界面|一键开始扫描|下载 Windows 版 (.exe)|约 47 MB。无需安装 Python。如 Windows 弹出安全警告，请核实文件来源。|仅在你拥有的网络上使用。|IPCast 远程桌面|远程连接 Windows 电脑，查看或控制屏幕。通过 TLS 加密保护连接，支持剪贴板和文件传输。|免费 • 2.1.0 黑白版|使用九位设备码或 IP 地址连接|管理每次连接的查看和控制权限|可设置密码进行无人值守访问|在连接的设备间复制文本|分块发送和接收文件|轻松返回最近连接和收藏的设备|下载 IPCast (.exe)|约 105.8 MB (v2.1.0)。独立 Windows 应用，无需另行安装 .NET。|仅连接你拥有或获准访问的设备。|ipscans Network Health Pro|面向物业、酒店、工厂和监控设备服务商的专业 IP 冲突预防与网络健康监测软件。|商业版 • 订阅许可|下载 Windows 版 (.exe)|基于同一可靠的扫描引擎，但属于独立产品，不会取代免费的 IP Scanner。|最受欢迎|免费|按月订阅|企业定价|联系我们|单次网络扫描|IP/MAC/厂商检测|不限数量查看设备|持续监控|IP 冲突检测及警报|网络健康评分和事件日志|导出 CSV/JSON|包含 PRO 的所有功能|PDF/Excel 报告|高级通知规则|优先支持|多地点集中管理|技术人员账户|定制集成|专属支持|阅读更多|暂无文章，敬请期待。",
  },
};

function phrases(text: string, count: number): string[] {
  const parts = text.split("|");
  if (parts.length !== count) throw new Error(`Expected ${count} translated phrases, got ${parts.length}`);
  return parts;
}

function makeHomeTranslation(t: HomeTranslation): BaseDictionary {
  const en = existingDictionaries.en;
  const [metaTitle, metaDescription] = phrases(t.meta, 2);
  const nav = phrases(t.nav, 13);
  const hero = phrases(t.hero, 7);
  const stats = phrases(t.stats, 5);
  const cta = phrases(t.cta, 3);
  const features = phrases(t.features, 20);
  const footer = phrases(t.footer, 4);
  const cookies = phrases(t.cookies, 3);
  const shop = phrases(t.shop, 3);
  const tools = phrases(t.tools, 13);
  const ui = phrases(t.toolUi, 52);
  const product = phrases(t.products, 51);
  return {
    ...en,
    a11y: { skipToContent: t.skip },
    meta: { title: metaTitle, description: metaDescription.replaceAll("IP Scanner", "IPscans+") },
    nav: Object.fromEntries(
      (Object.keys(en.nav) as (keyof typeof en.nav)[]).map((key, i) => [key, nav[i]]),
    ) as BaseDictionary["nav"],
    hero: Object.fromEntries(
      (Object.keys(en.hero) as (keyof typeof en.hero)[]).map((key, i) => [key, hero[i]]),
    ) as BaseDictionary["hero"],
    stats: {
      title: stats[0],
      items: en.stats.items.map((item, i) => ({ value: i === 1 ? "14" : item.value, label: stats[i + 1] })),
    },
    cta: { title: cta[0], subtitle: cta[1], button: cta[2] },
    features: {
      title: features[0], subtitle: features[1],
      items: en.features.items.map((item, i) => ({
        title: features[2 + i * 2], desc: features[3 + i * 2], href: item.href,
      })),
    },
    footer: { tagline: footer[0], rights: footer[1], privacy: footer[2], terms: footer[3] },
    cookieConsent: { message: cookies[0], accept: cookies[1], reject: cookies[2] },
    shop: { title: shop[0], comingSoonTitle: shop[1], comingSoonBody: shop[2] },
    ipLookup: {
      title: tools[0], subtitle: tools[1], placeholder: ui[0], button: ui[1], myIp: ui[2],
      loading: ui[3], error: ui[4],
      fields: Object.fromEntries(Object.keys(en.ipLookup.fields).map((key, i) => [key, ui[5 + i]])) as BaseDictionary["ipLookup"]["fields"],
      mapLabel: ui[13],
    },
    dns: { title: tools[2], subtitle: tools[3], placeholder: ui[14], button: ui[15], loading: ui[16], error: ui[17], noRecords: ui[18] },
    whois: {
      title: tools[4], subtitle: tools[5], placeholder: ui[19], button: ui[20], loading: ui[21], error: ui[22],
      fields: Object.fromEntries(Object.keys(en.whois.fields).map((key, i) => [key, ui[23 + i]])) as BaseDictionary["whois"]["fields"],
    },
    ports: {
      title: tools[6], subtitle: tools[7], placeholder: ui[30], button: ui[31], loading: ui[32], error: ui[33],
      open: ui[34], closed: ui[35], disclaimer: ui[36],
      crossSell: { title: ui[37], body: ui[38], cta: ui[39] },
    },
    speedTest: {
      title: tools[8], subtitle: tools[9], start: ui[40], running: ui[41], restart: ui[42],
      download: ui[43], upload: ui[44], ping: ui[45], note: ui[46],
      crossSell: { title: ui[47], body: ui[48], cta: ui[49] },
    },
    scan: { title: tools[10], subtitle: tools[11], body: ui[50], disclaimer: ui[51] },
    download: {
      title: product[0], subtitle: product[1], badge: product[2],
      features: product.slice(3, 9), button: product[9], note: product[10], safe: product[11],
    },
    ipcast: {
      title: product[12], subtitle: product[13], badge: product[14],
      features: product.slice(15, 21), button: product[21], note: product[22], safe: product[23],
    },
    pro: {
      title: product[24], subtitle: product[25], badge: product[26], button: product[27],
      note: product[28], mostPopular: product[29],
      plans: en.pro.plans.map((plan, i) => ({
        name: plan.name, price: product[30 + i],
        features: product.slice([34, 37, 41, 45][i], [37, 41, 45, 49][i]),
      })),
    },
    blog: { title: en.blog.title, subtitle: tools[12], readMore: product[49], empty: product[50] },
  };
}

const dictionaries: Record<Locale, Dictionary> = {
  tr: { ...existingDictionaries.tr, experience: makeExperience(experienceTranslations.tr) },
  en: { ...existingDictionaries.en, experience: makeExperience(experienceTranslations.en) },
  de: { ...existingDictionaries.de, experience: makeExperience(experienceTranslations.de) },
  es: { ...existingDictionaries.es, experience: makeExperience(experienceTranslations.es) },
  fr: { ...existingDictionaries.fr, experience: makeExperience(experienceTranslations.fr) },
  it: { ...makeHomeTranslation(homeTranslations.it), experience: makeExperience(experienceTranslations.it) },
  pt: { ...makeHomeTranslation(homeTranslations.pt), experience: makeExperience(experienceTranslations.pt) },
  nl: { ...makeHomeTranslation(homeTranslations.nl), experience: makeExperience(experienceTranslations.nl) },
  pl: { ...makeHomeTranslation(homeTranslations.pl), experience: makeExperience(experienceTranslations.pl) },
  ru: { ...makeHomeTranslation(homeTranslations.ru), experience: makeExperience(experienceTranslations.ru) },
  ar: { ...makeHomeTranslation(homeTranslations.ar), experience: makeExperience(experienceTranslations.ar) },
  ja: { ...makeHomeTranslation(homeTranslations.ja), experience: makeExperience(experienceTranslations.ja) },
  ko: { ...makeHomeTranslation(homeTranslations.ko), experience: makeExperience(experienceTranslations.ko) },
  zh: { ...makeHomeTranslation(homeTranslations.zh), experience: makeExperience(experienceTranslations.zh) },
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function getPublicDictionary(locale: Locale): PublicDictionary {
  const { pro: _legacyProduct, ...publicDictionary } = getDictionary(locale);
  void _legacyProduct;
  const { pro: _legacyNavigation, ...nav } = publicDictionary.nav;
  void _legacyNavigation;
  return { ...publicDictionary, nav };
}
