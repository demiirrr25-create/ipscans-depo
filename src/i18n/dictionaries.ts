import type { Locale } from "./config";

const dictionaries = {
  tr: {
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
      yourIp: "Senin IP adresin",
    },
    stats: {
      title: "Rakamlarla ipscans",
      items: [
        { value: "6+", label: "Ağ aracı" },
        { value: "2", label: "Dil (TR/EN)" },
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
      title: "Windows Ağ Tarama Uygulaması",
      subtitle:
        "Gerçek bir yerel ağ taraması için ücretsiz masaüstü aracımızı indir.",
      badge: "Ücretsiz • Kurulum gerektirmez",
      features: [
        "Yerel ağındaki tüm canlı cihazları bulur",
        "MAC adresi ve cihaz ismini gösterir",
        "Her cihazda yaygın açık portları tarar",
        "Tek dosya, .NET ile çalışır (Windows 10/11)",
      ],
      button: "Windows için indir (.exe)",
      note: "Yaklaşık 12 KB. İndirdikten sonra çift tıklayıp çalıştır. SmartScreen uyarısı verirse 'Daha fazla bilgi > Yine de çalıştır' de.",
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
    },
    shop: {
      title: "Mağaza",
      comingSoonTitle: "Çok Yakında...",
      comingSoonBody:
        "Ağ güvenliği ve akıllı ev donanımları mağazamızı hazırlıyoruz. Yeni nesil güvenlik kameraları ve kurulum hizmetleriyle çok yakında burada.",
    },
  },
  en: {
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
      yourIp: "Your IP address",
    },
    stats: {
      title: "ipscans in numbers",
      items: [
        { value: "6+", label: "Network tools" },
        { value: "2", label: "Languages (TR/EN)" },
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
      title: "Windows Network Scanner",
      subtitle: "Download our free desktop tool for a real local network scan.",
      badge: "Free • No installation",
      features: [
        "Finds every live device on your local network",
        "Shows MAC address and device hostname",
        "Scans common open ports on each device",
        "Single file, runs with .NET (Windows 10/11)",
      ],
      button: "Download for Windows (.exe)",
      note: "About 12 KB. Double-click to run after downloading. If SmartScreen warns, choose 'More info > Run anyway'.",
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
    },
    shop: {
      title: "Shop",
      comingSoonTitle: "Coming Soon...",
      comingSoonBody:
        "We're building our network security and smart home hardware shop. Next-gen security cameras and installation services, launching soon.",
    },
  },
} as const;

export type Dictionary = (typeof dictionaries)[Locale];

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
