import type { Locale } from "./config";

const dictionaries = {
  tr: {
    a11y: {
      skipToContent: "İçeriğe geç",
    },
    meta: {
      title: "IPScans — Ağ Araçları ve Uzaktan Erişim Platformu",
      description:
        "IPCast uzak masaüstü, IP Scanner, ağ analizi ve IP yönetimi araçlarını tek platformda keşfedin.",
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
      ctaDownload: "IP Scanner'ı İndir",
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
      "title": "Harry Villegas — Lüks Erkek Giyim Mağazası",
      "brandName": "Harry Villegas",
      "tagline": "Haute Couture & Exclusive Men's Fashion",
      "comingSoonTitle": "Erkek Modasında Zamansız Şıklık — Çok Yakında Açılıyor",
      "comingSoonBody": "İtalyan kumaşlar, özel dikim takım elbiseler, kaşmir kabanlar ve prestijli erkek aksesuarlarından oluşan Harry Villegas koleksiyonu çok yakında online mağazamızda ve Nişantaşı şubemizde.",
      "heroBadge": "Lüks Erkek Giyim Koleksiyonu",
      "heroTitle": "Harry Villegas",
      "heroSubtitle": "Modern Erkeğin Şıklık ve Zarafet İmzası",
      "countdownTitle": "Büyük Açılışa Kalan Süre",
      "days": "Gün",
      "hours": "Saat",
      "minutes": "Dakika",
      "seconds": "Saniye",
      "newsletterTitle": "VIP Açılış Davetiyesi & %15 İndirim",
      "newsletterSubtitle": "Açılış gününe özel sürpriz indirim kodu ve ilk koleksiyonu önceden inceleme ayrıcalığı için e-bültenimize kaydolun.",
      "emailPlaceholder": "E-posta adresinizi girin...",
      "subscribeBtn": "VIP Erişime Katıl",
      "successMsg": "VIP listemize başarıyla kaydoldunuz! Açılış kuponunuz e-postanıza gönderilecektir.",
      "collectionsTitle": "Öne Çıkan Koleksiyonlar",
      "collectionsSubtitle": "İtalyan zanaat anlayışı, terzi el işçiliği ve zamansız tasarımlar.",
      "collections": [
            {
                  "id": "suits",
                  "name": "Takım Elbise & Smoking",
                  "desc": "%100 İtalyan Yünü, Süper 150s kumaşlar ve kusursuz özel dikim kalıplar.",
                  "badge": "Bespoke / Tailored",
                  "tag": "Süper 150s Yün"
            },
            {
                  "id": "outerwear",
                  "name": "Kaşmir Kaban & Dış Giyim",
                  "desc": "Soğuk günlerde şıklığından ödün vermeyenler için saf kaşmir ve kruvaze kabanlar.",
                  "badge": "Luxury Outerwear",
                  "tag": "%100 Saf Kaşmir"
            },
            {
                  "id": "shirts",
                  "name": "Özel Dikim Gömlekler",
                  "desc": "Mısır pamuğundan üretilen, sedef düğmeli ve kolay ütülenen prestij gömlekler.",
                  "badge": "Egyptian Cotton",
                  "tag": "Sedef Düğmeli"
            },
            {
                  "id": "footwear",
                  "name": "Deri Ayakkabı & Aksesuar",
                  "desc": "El yapımı İtalyan deri kösele ayakkabılar, ipek kravatlar ve kol düğmeleri.",
                  "badge": "Handcrafted Leather",
                  "tag": "El İşçiliği"
            }
      ],
      "featuredTitle": "Gelecek Koleksiyondan Ön İzleme",
      "quickLook": "İncele",
      "close": "Kapat",
      "products": [
            {
                  "id": "prod-1",
                  "name": "Milano Süper 150s İtalyan Yün Takım Elbise",
                  "category": "Takım Elbise",
                  "price": "34.500 ₺",
                  "fabric": "%100 Süper 150s İtalyan Yünü",
                  "details": "Kruvaze Yaka, İpek Astar, Özel Dikim Slim-Fit Kalıp.",
                  "badge": "Bestseller Preview"
            },
            {
                  "id": "prod-2",
                  "name": "Roma Saf Kaşmir Kruvaze Kaban",
                  "category": "Dış Giyim",
                  "price": "42.000 ₺",
                  "fabric": "%100 Saf Kaşmir",
                  "details": "Kruvaze kesim, deve tüyü tonu, boynuz düğmeler.",
                  "badge": "Limited Edition"
            },
            {
                  "id": "prod-3",
                  "name": "Venedik Mısır Pamuğu Beyaz Ata Yaka Gömlek",
                  "category": "Gömlek",
                  "price": "8.900 ₺",
                  "fabric": "%100 Giza Mısır Pamuğu",
                  "details": "Sedef düğmeler, manşetli kollar, leke tutmaz doku.",
                  "badge": "Essential"
            },
            {
                  "id": "prod-4",
                  "name": "Floransa El Yapımı Deri Oxford Ayakkabı",
                  "category": "Ayakkabı",
                  "price": "18.500 ₺",
                  "fabric": "Hakiki Dana Derisi & Kösele Taban",
                  "details": "Goodyear welted dikiş teknolojisi, bordo ve siyah seçenekleri.",
                  "badge": "Handmade Italy"
            }
      ],
      "brandValuesTitle": "Neden Harry Villegas?",
      "brandValues": [
            {
                  "title": "İtalyan Kumaş Kalitesi",
                  "desc": "Sadece Biella ve Como bölgesinden ithal edilen en kaliteli kumaşlar kullanılır."
            },
            {
                  "title": "Usta Terzi İşçiliği",
                  "desc": "Her bir parça tecrübeli ustaların elinde hassas dikişlerle şekillenir."
            },
            {
                  "title": "Kişiye Özel Kalıp & Randevu",
                  "desc": "Mağazamızda özel dikim randevusu ile vücudunuza kusursuz uyan tasarımlar."
            },
            {
                  "title": "Zamansız Erkek Modası",
                  "desc": "Gelip geçici trendler yerine yıllarca gardırobunuzun baş tacı olacak şıklık."
            }
      ],
      "faqTitle": "Sıkça Sorulan Sorular",
      "faqs": [
            {
                  "q": "Mağazanız ne zaman açılacak?",
                  "a": "Harry Villegas online mağazamız ve Nişantaşı flagship showroom'umuz çok yakında kapılarını açıyor. VIP e-bültene katılarak kesin açılış tarihinden ilk siz haberdar olabilirsiniz."
            },
            {
                  "q": "Özel dikim (Bespoke) hizmetiniz var mı?",
                  "a": "Evet. Nişantaşı mağazamızda uzman terzilerimiz eşliğinde randevulu özel dikim hizmeti sunuyoruz."
            },
            {
                  "q": "Kargo ve teslimat koşulları nelerdir?",
                  "a": "Açılışımıza özel tüm Türkiye içi siparişlerde ücretsiz sigortalı kargo imkanı sunulacaktır."
            }
      ],
      "storeTitle": "Flagship Showroom & İletişim",
      "storeAddress": "Abdi İpekçi Caddesi No: 42, Nişantaşı / İstanbul",
      "onlineStoreNote": "Türkiye ve Dünya Geneline Online Gönderim",
      "whatsappBtn": "WhatsApp İletişim Line",
      "emailBtn": "E-posta Gönder"
},
  },
  en: {
    a11y: {
      skipToContent: "Skip to content",
    },
    meta: {
      title: "IPScans — Network Tools and Remote Access",
      description:
        "Explore IPCast remote desktop, IP Scanner, network analysis and IP management tools on one platform.",
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
      ctaDownload: "Download IP Scanner",
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
      "title": "Harry Villegas — Luxury Men's Wear Store",
      "brandName": "Harry Villegas",
      "tagline": "Haute Couture & Exclusive Men's Fashion",
      "comingSoonTitle": "Timeless Elegance in Men's Fashion — Opening Soon",
      "comingSoonBody": "The Harry Villegas collection featuring Italian fabrics, tailored suits, cashmere overcoats and luxury men's accessories is coming soon to our online store and flagship boutique.",
      "heroBadge": "Luxury Men's Wear Collection",
      "heroTitle": "Harry Villegas",
      "heroSubtitle": "The Signature of Elegance & Sophistication for Modern Men",
      "countdownTitle": "Countdown to Grand Opening",
      "days": "Days",
      "hours": "Hours",
      "minutes": "Minutes",
      "seconds": "Seconds",
      "newsletterTitle": "VIP Opening Invitation & 15% Off",
      "newsletterSubtitle": "Subscribe to our VIP newsletter for launch invitations, exclusive discount codes and early preview access.",
      "emailPlaceholder": "Enter your email address...",
      "subscribeBtn": "Join VIP Access",
      "successMsg": "You have joined our VIP list! Your launch discount code will be sent to your email.",
      "collectionsTitle": "Featured Collections",
      "collectionsSubtitle": "Italian craftsmanship, bespoke tailoring and timeless menswear design.",
      "collections": [
            {
                  "id": "suits",
                  "name": "Tailored Suits & Tuxedos",
                  "desc": "100% Italian Wool, Super 150s fabrics and flawless bespoke tailoring.",
                  "badge": "Bespoke / Tailored",
                  "tag": "Super 150s Wool"
            },
            {
                  "id": "outerwear",
                  "name": "Cashmere Overcoats & Outerwear",
                  "desc": "Pure cashmere double-breasted overcoats designed for refined elegance.",
                  "badge": "Luxury Outerwear",
                  "tag": "100% Pure Cashmere"
            },
            {
                  "id": "shirts",
                  "name": "Bespoke Dress Shirts",
                  "desc": "Egyptian cotton dress shirts with mother-of-pearl buttons and easy-iron finish.",
                  "badge": "Egyptian Cotton",
                  "tag": "Mother of Pearl"
            },
            {
                  "id": "footwear",
                  "name": "Leather Shoes & Accessories",
                  "desc": "Handcrafted Italian leather shoes, pure silk ties and elegant cufflinks.",
                  "badge": "Handcrafted Leather",
                  "tag": "Italian Handcraft"
            }
      ],
      "featuredTitle": "Exclusive Collection Preview",
      "quickLook": "Quick View",
      "close": "Close",
      "products": [
            {
                  "id": "prod-1",
                  "name": "Milano Super 150s Italian Wool Suit",
                  "category": "Tailored Suits",
                  "price": "$1,150",
                  "fabric": "100% Super 150s Italian Wool",
                  "details": "Peak Lapel, Silk Lining, Tailored Slim-Fit Cut.",
                  "badge": "Bestseller Preview"
            },
            {
                  "id": "prod-2",
                  "name": "Roma Pure Cashmere Double-Breasted Coat",
                  "category": "Outerwear",
                  "price": "$1,400",
                  "fabric": "100% Pure Cashmere",
                  "details": "Double-breasted cut, camel tone, real horn buttons.",
                  "badge": "Limited Edition"
            },
            {
                  "id": "prod-3",
                  "name": "Venice Egyptian Cotton Wing-Tip Shirt",
                  "category": "Shirts",
                  "price": "$290",
                  "fabric": "100% Giza Egyptian Cotton",
                  "details": "Mother-of-pearl buttons, french cuffs, stain resistant.",
                  "badge": "Essential"
            },
            {
                  "id": "prod-4",
                  "name": "Florence Handcrafted Leather Oxford Shoes",
                  "category": "Footwear",
                  "price": "$620",
                  "fabric": "Genuine Calfskin & Leather Sole",
                  "details": "Goodyear welted stitching, available in burgundy and black.",
                  "badge": "Handmade Italy"
            }
      ],
      "brandValuesTitle": "Why Harry Villegas?",
      "brandValues": [
            {
                  "title": "Italian Fabric Quality",
                  "desc": "Woven exclusively from Biella and Como mills in Italy."
            },
            {
                  "title": "Master Tailoring",
                  "desc": "Handcrafted by experienced master tailors with meticulous attention to detail."
            },
            {
                  "title": "Bespoke Fitting & Appointments",
                  "desc": "Personal fitting appointments in our flagship boutique."
            },
            {
                  "title": "Timeless Menswear",
                  "desc": "Enduring luxury styles built to surpass fleeting trends."
            }
      ],
      "faqTitle": "Frequently Asked Questions",
      "faqs": [
            {
                  "q": "When will the store open?",
                  "a": "Our online boutique and flagship store are opening very soon. Join our VIP newsletter to receive the exact launch notification."
            },
            {
                  "q": "Do you offer bespoke tailored fittings?",
                  "a": "Yes. We offer personal bespoke fitting appointments with our master tailors at our boutique."
            },
            {
                  "q": "What are the shipping details?",
                  "a": "Complimentary insured worldwide express shipping will be offered during our launch period."
            }
      ],
      "storeTitle": "Flagship Showroom & Contact",
      "storeAddress": "Abdi Ipekci Avenue No: 42, Nisantasi / Istanbul",
      "onlineStoreNote": "Worldwide & National Online Express Shipping",
      "whatsappBtn": "WhatsApp Care Line",
      "emailBtn": "Send Email"
},
  },
  de: {
    a11y: {
      skipToContent: "Zum Inhalt springen",
    },
    meta: {
      title: "IPScans — Netzwerktools und Fernzugriff",
      description:
        "IPCast Fernzugriff, IP Scanner, Netzwerkanalyse und IP-Verwaltung auf einer Plattform.",
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
      "title": "Harry Villegas — Luxus-Herrenmodegeschäft",
      "brandName": "Harry Villegas",
      "tagline": "Haute Couture & Exklusive Herrenmode",
      "comingSoonTitle": "Zeitlose Eleganz in der Herrenmode — Eröffnung demnächst",
      "comingSoonBody": "Die Harry Villegas Kollektion mit italienischen Stoffen, maßgeschneiderten Anzügen, Kaschmirmänteln und exklusiven Accessoires öffnet bald online und in unserer Boutique.",
      "heroBadge": "Luxus-Herrenmode-Kollektion",
      "heroTitle": "Harry Villegas",
      "heroSubtitle": "Die Signatur für Eleganz und Stil des modernen Mannes",
      "countdownTitle": "Countdown zur Eröffnung",
      "days": "Tage",
      "hours": "Stunden",
      "minutes": "Minuten",
      "seconds": "Sekunden",
      "newsletterTitle": "VIP-Eröffnungseinladung & 15% Rabatt",
      "newsletterSubtitle": "Abonnieren Sie unseren VIP-Newsletter für Einladungen, Rabattcodes und exklusiven Vorabzugang.",
      "emailPlaceholder": "Ihre E-Mail-Adresse...",
      "subscribeBtn": "VIP-Zugang beitreten",
      "successMsg": "Sie wurden erfolgreich zur VIP-Liste hinzugefügt!",
      "collectionsTitle": "Ausgewählte Kollektionen",
      "collectionsSubtitle": "Italienische Handwerkskunst, Maßschneiderei und zeitloses Design.",
      "collections": [
            {
                  "id": "suits",
                  "name": "Maßanzüge & Smokings",
                  "desc": "100% italienische Wolle, Super 150s Stoffe und perfekte Passform.",
                  "badge": "Bespoke / Tailored",
                  "tag": "Super 150s Wolle"
            },
            {
                  "id": "outerwear",
                  "name": "Kaschmirmäntel & Jacken",
                  "desc": "Reiner Kaschmir und zweireihige Mäntel für höchste Ansprüche.",
                  "badge": "Luxury Outerwear",
                  "tag": "100% Reiner Kaschmir"
            },
            {
                  "id": "shirts",
                  "name": "Maßhemden",
                  "desc": "Ägyptische Baumwolle mit Perlmuttknöpfen.",
                  "badge": "Egyptian Cotton",
                  "tag": "Perlmuttknöpfe"
            },
            {
                  "id": "footwear",
                  "name": "Lederschuhe & Accessoires",
                  "desc": "Handgefertigte italienische Lederschuhe und Seidenkrawatten.",
                  "badge": "Handcrafted Leather",
                  "tag": "Italienische Handarbeit"
            }
      ],
      "featuredTitle": "Vorschau auf die kommende Kollektion",
      "quickLook": "Schnellansicht",
      "close": "Schließen",
      "products": [
            {
                  "id": "prod-1",
                  "name": "Milano Super 150s Italienischer Wollanzug",
                  "category": "Maßanzüge",
                  "price": "1.150 €",
                  "fabric": "100% Super 150s Italienische Wolle",
                  "details": "Spitzrevers, Seidenfutter, körperbetonter Schnitt.",
                  "badge": "Bestseller Preview"
            },
            {
                  "id": "prod-2",
                  "name": "Roma Reiner Kaschmir-Zweireiher-Mantel",
                  "category": "Oberbekleidung",
                  "price": "1.400 €",
                  "fabric": "100% Reiner Kaschmir",
                  "details": "Zweireihiger Schnitt, Kamelton, Echthornknöpfe.",
                  "badge": "Limited Edition"
            },
            {
                  "id": "prod-3",
                  "name": "Venedig Ägyptische Baumwollhemd",
                  "category": "Hemden",
                  "price": "290 €",
                  "fabric": "100% Giza Ägyptische Baumwolle",
                  "details": "Perlmuttknöpfe, Umschlagmanschetten.",
                  "badge": "Essential"
            },
            {
                  "id": "prod-4",
                  "name": "Florenz Handgefertigte Oxford-Schuhe",
                  "category": "Schuhe",
                  "price": "620 €",
                  "fabric": "Echtes Kalbsleder & Ledersohle",
                  "details": "Goodyear-welted Naht, verfügbar in Bordeaux und Schwarz.",
                  "badge": "Handmade Italy"
            }
      ],
      "brandValuesTitle": "Warum Harry Villegas?",
      "brandValues": [
            {
                  "title": "Italienische Stoffqualität",
                  "desc": "Exklusiv gewebt in Biella und Como, Italien."
            },
            {
                  "title": "Meisterhafte Schneiderkunst",
                  "desc": "Von erfahrenen Schneidern in Handarbeit gefertigt."
            },
            {
                  "title": "Maßanfertigung & Termine",
                  "desc": "Persönliche Anprobetermine in unserer Boutique."
            },
            {
                  "title": "Zeitlose Herrenmode",
                  "desc": "Beständige Eleganz über wechselnde Trends hinweg."
            }
      ],
      "faqTitle": "Häufig gestellte Fragen",
      "faqs": [
            {
                  "q": "Wann eröffnet der Store?",
                  "a": "Unsere Online-Boutique und der Flagship Store eröffnen sehr bald. Abonnieren Sie unseren Newsletter für Updates."
            },
            {
                  "q": "Bieten Sie Maßschneiderei an?",
                  "a": "Ja, wir bieten persönliche Termine für Maßanfertigungen in unserer Boutique an."
            },
            {
                  "q": "Wie sind die Versandbedingungen?",
                  "a": "Zur Eröffnung bieten wir kostenlosen versicherten Expressversand an."
            }
      ],
      "storeTitle": "Flagship Showroom & Kontakt",
      "storeAddress": "Abdi Ipekci Straße Nr. 42, Nisantasi / Istanbul",
      "onlineStoreNote": "Weltweiter Online-Expressversand",
      "whatsappBtn": "WhatsApp Kundenservice",
      "emailBtn": "E-Mail Senden"
},
  },
  fr: {
    a11y: {
      skipToContent: "Aller au contenu",
    },
    meta: {
      title: "IPScans — Outils réseau et accès à distance",
      description:
        "Découvrez IPCast, IP Scanner, l'analyse réseau et la gestion des IP sur une seule plateforme.",
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
      "title": "Harry Villegas — Boutique de Mode Masculine de Luxe",
      "brandName": "Harry Villegas",
      "tagline": "Haute Couture & Exclusive Men's Fashion",
      "comingSoonTitle": "L'Élégance Intemporelle Masculine — Ouverture Prochaine",
      "comingSoonBody": "La collection Harry Villegas combinant tissus italiens, costumes sur mesure, manteaux en cachemire et accessoires de luxe arrive très bientôt.",
      "heroBadge": "Collection Homme de Luxe",
      "heroTitle": "Harry Villegas",
      "heroSubtitle": "La Signature de l'Élégance pour l'Homme Moderne",
      "countdownTitle": "Compte à rebours avant l'Ouverture",
      "days": "Jours",
      "hours": "Heures",
      "minutes": "Minutes",
      "seconds": "Secondes",
      "newsletterTitle": "Invitation VIP & -15% de Réduction",
      "newsletterSubtitle": "Inscrivez-vous à notre newsletter VIP pour recevoir une invitation d'ouverture et un code promo exclusif.",
      "emailPlaceholder": "Votre adresse e-mail...",
      "subscribeBtn": "Rejoindre l'Accès VIP",
      "successMsg": "Vous avez rejoint la liste VIP avec succès !",
      "collectionsTitle": "Collections En Vedette",
      "collectionsSubtitle": "Artisanat italien, coupe sur mesure et design masculin intemporel.",
      "collections": [
            {
                  "id": "suits",
                  "name": "Costumes & Smokings sur Mesure",
                  "desc": "100% Laine Italienne Super 150s et coupes irréprochables.",
                  "badge": "Bespoke / Tailored",
                  "tag": "Laine Super 150s"
            },
            {
                  "id": "outerwear",
                  "name": "Manteaux Cachemire & Vestes",
                  "desc": "Pure cachemire et manteaux croisés pour une élégance absolue.",
                  "badge": "Luxury Outerwear",
                  "tag": "100% Pur Cachemire"
            },
            {
                  "id": "shirts",
                  "name": "Chemises Sur Mesure",
                  "desc": "Coton égyptien et boutons en nacre synthétisant le chic masculin.",
                  "badge": "Egyptian Cotton",
                  "tag": "Boutons Nacre"
            },
            {
                  "id": "footwear",
                  "name": "Chaussures Cuir & Accessoires",
                  "desc": "Chaussures en cuir italien fait main et cravates en soie pur.",
                  "badge": "Handcrafted Leather",
                  "tag": "Artisanat Italien"
            }
      ],
      "featuredTitle": "Aperçu de la Prochaine Collection",
      "quickLook": "Aperçu Rapide",
      "close": "Fermer",
      "products": [
            {
                  "id": "prod-1",
                  "name": "Costume Milano Laine Italienne Super 150s",
                  "category": "Costumes Sur Mesure",
                  "price": "1 150 €",
                  "fabric": "100% Laine Italienne Super 150s",
                  "details": "Revers à pointe, doublure soie, coupe ajustée.",
                  "badge": "Bestseller Preview"
            },
            {
                  "id": "prod-2",
                  "name": "Manteau Croisé Roma Pur Cachemire",
                  "category": "Manteaux",
                  "price": "1 400 €",
                  "fabric": "100% Pur Cachemire",
                  "details": "Coupe croisée, teinte camel, boutons en corne véritable.",
                  "badge": "Limited Edition"
            },
            {
                  "id": "prod-3",
                  "name": "Chemise Col Cassé Venise Coton Égyptien",
                  "category": "Chemises",
                  "price": "290 €",
                  "fabric": "100% Coton Égyptien Giza",
                  "details": "Boutons en nacre, poignets mousquetaire.",
                  "badge": "Essential"
            },
            {
                  "id": "prod-4",
                  "name": "Chaussures Oxford Florence Cuir Fait Main",
                  "category": "Chaussures",
                  "price": "620 €",
                  "fabric": "Cuir de Veau Véritable & Semelle Cuir",
                  "details": "Couture Goodyear welted, disponible en bordeaux et noir.",
                  "badge": "Handmade Italy"
            }
      ],
      "brandValuesTitle": "Pourquoi Harry Villegas ?",
      "brandValues": [
            {
                  "title": "Qualité des Tissus Italiens",
                  "desc": "Tissés exclusivement dans les régions de Biella et Côme."
            },
            {
                  "title": "Maître Tailleur",
                  "desc": "Fabriqué à la main par des maîtres tailleurs expérimentés."
            },
            {
                  "title": "Sur Mesure & Rendez-vous",
                  "desc": "Rendez-vous personnalisé dans notre boutique de luxe."
            },
            {
                  "title": "Élégance Intemporelle",
                  "desc": "Des créations durables conçues pour traverser le temps."
            }
      ],
      "faqTitle": "Foire Aux Questions",
      "faqs": [
            {
                  "q": "Quand la boutique ouvrira-t-elle ?",
                  "a": "Notre boutique en ligne et showroom ouvriront très bientôt. Inscrivez-vous à la newsletter."
            },
            {
                  "q": "Proposez-vous un service sur mesure ?",
                  "a": "Oui, nous proposons des rendez-vous personnalisés sur mesure dans notre boutique."
            },
            {
                  "q": "Quelles sont les conditions de livraison ?",
                  "a": "Livraison express assurée gratuite durant la période de lancement."
            }
      ],
      "storeTitle": "Showroom Flagship & Contact",
      "storeAddress": "Rue Abdi Ipekci No: 42, Nisantasi / Istanbul",
      "onlineStoreNote": "Expédition Express Internationale et Nationale",
      "whatsappBtn": "Service Client WhatsApp",
      "emailBtn": "Envoyer un E-mail"
},
  },
  es: {
    a11y: {
      skipToContent: "Ir al contenido",
    },
    meta: {
      title: "IPScans — Herramientas de red y acceso remoto",
      description:
        "Descubre IPCast, IP Scanner, análisis de red y gestión de IP en una sola plataforma.",
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
      "title": "Harry Villegas — Tienda de Moda Masculina de Lujo",
      "brandName": "Harry Villegas",
      "tagline": "Haute Couture & Exclusive Men's Fashion",
      "comingSoonTitle": "Elegancia Intemporal en Moda Masculina — Apertura Próxima",
      "comingSoonBody": "La colección Harry Villegas de tejidos italianos, trajes a medida, abrigos de cachemira y accesorios de lujo llega pronto a nuestra tienda online y boutique.",
      "heroBadge": "Colección Masculina de Lujo",
      "heroTitle": "Harry Villegas",
      "heroSubtitle": "La Firma de Elegancia y Distinción para el Hombre Moderno",
      "countdownTitle": "Cuenta Regresiva para la Gran Apertura",
      "days": "Días",
      "hours": "Horas",
      "minutes": "Minutos",
      "seconds": "Segundos",
      "newsletterTitle": "Invitación VIP & 15% de Descuento",
      "newsletterSubtitle": "Suscríbete a nuestra newsletter VIP para recibir invitaciones y un código de descuento exclusivo.",
      "emailPlaceholder": "Tu correo electrónico...",
      "subscribeBtn": "Unirme al Acceso VIP",
      "successMsg": "¡Te has unido con éxito a nuestra lista VIP!",
      "collectionsTitle": "Colecciones Destacadas",
      "collectionsSubtitle": "Artesanía italiana, sastrería a medida y diseño masculino atemporal.",
      "collections": [
            {
                  "id": "suits",
                  "name": "Trajes a Medida & Esmoquin",
                  "desc": "100% Lana Italiana Super 150s y cortes de sastrería impecables.",
                  "badge": "Bespoke / Tailored",
                  "tag": "Lana Super 150s"
            },
            {
                  "id": "outerwear",
                  "name": "Abrigos de Cachemira & Chaquetas",
                  "desc": "Pura cachemira y abrigos cruzados para un estilo distinguido.",
                  "badge": "Luxury Outerwear",
                  "tag": "100% Pura Cachemira"
            },
            {
                  "id": "shirts",
                  "name": "Camisas a Medida",
                  "desc": "Algodón egipcio con botones de madreperla.",
                  "badge": "Egyptian Cotton",
                  "tag": "Botones Madreperla"
            },
            {
                  "id": "footwear",
                  "name": "Zapatos de Cuero & Accesorios",
                  "desc": "Zapatos de cuero italiano hechos a mano y corbatas de seda pura.",
                  "badge": "Handcrafted Leather",
                  "tag": "Artesanía Italiana"
            }
      ],
      "featuredTitle": "Vistazo a la Próxima Colección",
      "quickLook": "Vista Rápida",
      "close": "Cerrar",
      "products": [
            {
                  "id": "prod-1",
                  "name": "Traje Milano Lana Italiana Super 150s",
                  "category": "Trajes a Medida",
                  "price": "1.150 €",
                  "fabric": "100% Lana Italiana Super 150s",
                  "details": "Solapa en punta, forro de seda, corte ajustado a medida.",
                  "badge": "Bestseller Preview"
            },
            {
                  "id": "prod-2",
                  "name": "Abrigo Cruzado Roma Pura Cachemira",
                  "category": "Abrigos",
                  "price": "1.400 €",
                  "fabric": "100% Pura Cachemira",
                  "details": "Corte cruzado, tono camel, botones de cuerno auténtico.",
                  "badge": "Limited Edition"
            },
            {
                  "id": "prod-3",
                  "name": "Camisa Venecia Algodón Egipcio",
                  "category": "Camisas",
                  "price": "290 €",
                  "fabric": "100% Algodón Egipcio Giza",
                  "details": "Botones de madreperla, puño doble para gemelos.",
                  "badge": "Essential"
            },
            {
                  "id": "prod-4",
                  "name": "Zapatos Oxford Florencia Cuir Artesanal",
                  "category": "Calzado",
                  "price": "620 €",
                  "fabric": "Cuero de Ternero & Suela de Cuero",
                  "details": "Costura Goodyear welted, disponible en burdeos y negro.",
                  "badge": "Handmade Italy"
            }
      ],
      "brandValuesTitle": "¿Por qué Harry Villegas?",
      "brandValues": [
            {
                  "title": "Calidad de Tejidos Italianos",
                  "desc": "Tejidos exclusivamente en Biella y Como, Italia."
            },
            {
                  "title": "Maestría en Sastrería",
                  "desc": "Confeccionado a mano por sastres artesanos con gran experiencia."
            },
            {
                  "title": "Sastrería a Medida & Citas",
                  "desc": "Citas personalizadas en nuestra boutique de lujo."
            },
            {
                  "title": "Moda Masculina Atemporal",
                  "desc": "Elegancia duradera que trasciende las modas pasajeras."
            }
      ],
      "faqTitle": "Preguntas Frecuentes",
      "faqs": [
            {
                  "q": "¿Cuándo abrirá la tienda?",
                  "a": "Nuestra tienda online y showroom abrirán muy pronto. Únete a nuestra newsletter para enterarte."
            },
            {
                  "q": "¿Ofrecen servicio de sastrería a medida?",
                  "a": "Sí, ofrecemos citas de sastrería a medida con nuestros maestros sastres."
            },
            {
                  "q": "¿Cuáles son las condiciones de envío?",
                  "a": "Envío express asegurado gratuito durante el periodo de lanzamiento."
            }
      ],
      "storeTitle": "Showroom Flagship & Contacto",
      "storeAddress": "Calle Abdi Ipekci No: 42, Nisantasi / Estambul",
      "onlineStoreNote": "Envíos Express a Todo el Mundo y Nacionales",
      "whatsappBtn": "Atención por WhatsApp",
      "emailBtn": "Enviar Correo"
},
  },
} as const;

export type Dictionary = (typeof dictionaries)[Locale];

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
