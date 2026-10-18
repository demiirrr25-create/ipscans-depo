import type { Locale } from "@/i18n/config";
import type { ApplicationSlide } from "@/components/ApplicationSlideshow";

export function getScannerSlides(locale: Locale): ApplicationSlide[] {
  const tr = locale === "tr";
  return [
    {
      id: "scanner-table",
      tabLabel: tr ? "01 / Cihaz Keşif Tablosu" : "01 / Device Discovery Table",
      title: tr ? "Canlı Yerel Ağ Keşfi & Cihaz Analizi" : "Live Local Network Discovery & Inventory",
      tag: "240 HOST SWEEP · SUB-2S LATENCY · NATIVE ARP/ICMP",
      description: tr
        ? "Milisaniye hızında asenkron raw socket taramasıyla tüm yerel alt ağdaki aktif cihazları, MAC üreticilerini, anlık ping sürelerini ve açık ağ servislerini listeler."
        : "Sub-2-second asynchronous socket sweeps detect all live local subnet devices, hardware MAC vendors, real-time RTT latency, and open service ports.",
      image: "/scanner-v43-preview.png",
      metrics: [
        { label: tr ? "Tarama Hızı" : "Sweep Speed", value: "< 2.0s", detail: "/24 Subnet Sweep" },
        { label: tr ? "Protokoller" : "Protocols", value: "ARP · ICMP", detail: "TCP · ONVIF · mDNS" },
        { label: tr ? "Gizlilik" : "Privacy", value: "%100 Yerel", detail: "Zero Cloud Leaks" },
      ],
    },
    {
      id: "scanner-map",
      tabLabel: tr ? "02 / Topoloji Haritası" : "02 / Network Topology Map",
      title: tr ? "Kanıta Dayalı Hiyerarşik Ağ Haritası" : "Evidence-Based Hierarchical Topology Map",
      tag: "LLDP / CDP ADJACENCY · VECTOR GRAPH ENGINE",
      description: tr
        ? "Fiziksel anahtarlar, yönlendiriciler ve bağlı cihazlar arasındaki hiyerarşik bağlantıları LLDP/CDP kanıtlarıyla görselleştirir; uydurma bağlantı üretmez."
        : "Visualizes physical switch adjacency and forwarding paths using strictly verified SNMP, LLDP, and CDP cryptographic evidence.",
      image: "/scanner-v43-map.png",
      metrics: [
        { label: tr ? "Grafik Motoru" : "Graph Engine", value: "Vector 60 FPS", detail: "Infinite Resolution" },
        { label: tr ? "Hiyerarşi" : "Hierarchy", value: "Switch / Router", detail: "Evidence-Based Links" },
        { label: tr ? "Dışa Aktarma" : "Export", value: "SVG / PNG", detail: "Audit Ready" },
      ],
    },
    {
      id: "scanner-oobe",
      tabLabel: tr ? "03 / Windows 11 Karşılama" : "03 / Win11 Welcome Experience",
      title: tr ? "Windows 11 Pro Kalitesinde Sinematik Karşılama" : "Cinematic Windows 11 Pro Setup & Welcome",
      tag: "SPATIAL PARTICLES · 6.5S TELEMETRY SWEEP",
      description: tr
        ? "Tam ekran karanlık modda yumuşak 'Merhaba' geçişi, şeffaf cam kapsüller, tek tıkla entegre sözleşme onayı ve 6.5 saniyelik hassas sistem yükleme telemetrisi."
        : "Fullscreen obsidian black canvas with fluid spatial particles, breathing 'Hello' fade-in, seamless inline agreements, and 6.5s verified launch telemetry.",
      customView: "oobe",
      metrics: [
        { label: tr ? "Başlatma Süresi" : "Launch Sweep", value: "6.5s", detail: "Telemetry Verified" },
        { label: tr ? "Tasarım Dili" : "Design Language", value: "Obsidian", detail: "Win 11 Pro Aligned" },
        { label: tr ? "Görsel FPS" : "Visual FPS", value: "60 FPS Fluid", detail: "Spatial Particles" },
      ],
    },
    {
      id: "scanner-audit",
      tabLabel: tr ? "04 / Kurumsal Denetim Raporu" : "04 / Enterprise Audit Report",
      title: tr ? "Kriptografik Zaman Damgalı Denetim Çıktıları" : "Timestamped Cryptographic Network Audit Reports",
      tag: "SHA-256 INTEGRITY · PDF / HTML / CSV / JSON",
      description: tr
        ? "Ağdaki tüm cihazların IP, MAC, isim ve donanım kimliklerini tek tıkla kurumsal standartlarda PDF, CSV veya JSON formatında raporlar."
        : "One-click export of verified device inventories, open ports, and topology logs into signed PDF, CSV, and JSON audit documents.",
      customView: "audit",
      metrics: [
        { label: tr ? "Formatlar" : "Formats", value: "PDF · CSV", detail: "HTML · JSON" },
        { label: tr ? "Doğrulama" : "Integrity", value: "SHA-256", detail: "Immutable Logs" },
        { label: tr ? "Uyumluluk" : "Compliance", value: "Enterprise", detail: "ISO 27001 Ready" },
      ],
    },
  ];
}

export function getIpcastSlides(locale: Locale): ApplicationSlide[] {
  const tr = locale === "tr";
  return [
    {
      id: "ipcast-desktop",
      tabLabel: tr ? "01 / Uzak Masaüstü" : "01 / Remote Desktop",
      title: tr ? "Düşük Gecikmeli 60 FPS Uzak Masaüstü Kontrolü" : "Ultra-Low Latency 60 FPS Remote Control",
      tag: "NATIVE WIN64 · D3D11 ACCELERATED · PEER-TO-PEER",
      description: tr
        ? "Donanım hızlandırmalı video akış hattı ve doğrudan eşler arası UDP bağlantısıyla 60 FPS akıcılıkta sıfıra yakın gecikmeli masaüstü kontrolü sunar."
        : "Hardware-accelerated D3D11 frame capture and direct peer-to-peer UDP transport deliver 60 FPS desktop streaming with near-zero input lag.",
      image: "/ipcast-v25-preview.png",
      metrics: [
        { label: tr ? "Kare Hızı" : "Frame Rate", value: "60 FPS", detail: "D3D11 Accelerated" },
        { label: tr ? "Gecikme" : "Input Latency", value: "< 16ms", detail: "Direct UDP Stream" },
        { label: tr ? "Şifreleme" : "Encryption", value: "TLS 1.3", detail: "End-to-End P2P" },
      ],
    },
    {
      id: "ipcast-security",
      tabLabel: tr ? "02 / Güvenlik ve Onay" : "02 / Security & Approval",
      title: tr ? "9 Haneli Cihaz Kimliği ve Çift Taraflı Onay" : "9-Digit Device ID & Two-Way Authorization",
      tag: "MUTUAL APPROVAL · DYNAMIC PIN · ZERO UNATTENDED RISK",
      description: tr
        ? "Statik açık portlar veya arka kapılar yerine dinamik tek kullanımlık oturum anahtarları ve ana makine ekranında kullanıcı onayı gerektirir."
        : "Replaces vulnerable listening ports with dynamic single-use session tokens and mandatory host approval prompts for every connection.",
      customView: "ipcast-security",
      metrics: [
        { label: tr ? "Kimlik Doğrulama" : "Auth Token", value: "9-Digit PIN", detail: "Dynamic Rotating" },
        { label: tr ? "Şifreleme Standardı" : "Cipher Suite", value: "AES-256-GCM", detail: "Cryptographic Vault" },
        { label: tr ? "Yetkisiz Erişim" : "Unattended Risk", value: "%0 Risk", detail: "Host Approval Mandatory" },
      ],
    },
    {
      id: "ipcast-transfer",
      tabLabel: tr ? "03 / Dosya Transferi" : "03 / File Transfer",
      title: tr ? "Gigabit Hızında Doğrudan P2P Dosya Aktarımı" : "Gigabit-Speed Direct P2P File Transfer",
      tag: "CHUNKED STREAM · AUTO-RESUME · INTEGRITY CHECK",
      description: tr
        ? "Bulut sunucularına dosya yüklemeden iki bilgisayar arasında doğrudan gigabit yerel veya internet hızında güvenli dosya aktarımı yapar."
        : "Transfers files directly between peers with chunked checksum streaming, automatic resume upon disconnection, and zero intermediary cloud storage.",
      customView: "ipcast-transfer",
      metrics: [
        { label: tr ? "Aktarım Hızı" : "Transfer Speed", value: "112+ MB/s", detail: "Direct Gigabit P2P" },
        { label: tr ? "Devam Edebilirlik" : "Auto-Resume", value: "Desteklenir", detail: "Chunked Parity" },
        { label: tr ? "Doğrulama" : "Integrity", value: "SHA-256", detail: "Bit-level Verification" },
      ],
    },
  ];
}

export function getLprSlides(locale: Locale): ApplicationSlide[] {
  const tr = locale === "tr";
  return [
    {
      id: "lpr-wall",
      tabLabel: tr ? "01 / Canlı Kamera Duvarı" : "01 / Live Camera Wall",
      title: tr ? "Çok Kameralı Canlı RTSP İzleme ve ONNX Plaka Tanıma" : "Multi-Camera RTSP Live Wall & ONNX License Plate OCR",
      tag: "5-STREAM DECODE · D3D11 ACCELERATED · REAL-TIME OCR",
      description: tr
        ? "RTSP IP kameralar üzerinden çoklu video akışını D3D11 donanım çözümüyle işler; araç plakalarını karakter bazlı güven puanlarıyla anında tanır."
        : "Decodes multi-camera RTSP feeds via D3D11 hardware acceleration and executes local neural ONNX models for instant plate recognition.",
      image: "/lpr-pro-preview.png",
      metrics: [
        { label: tr ? "Kamera Kapasitesi" : "Camera Feeds", value: "5+ Akış", detail: "D3D11 Decoded" },
        { label: tr ? "OCR Doğruluğu" : "OCR Confidence", value: "%99.2+", detail: "Neural ONNX Models" },
        { label: tr ? "Gecikme" : "Recognition Time", value: "< 45ms", detail: "Per-frame Inference" },
      ],
    },
    {
      id: "lpr-calibration",
      tabLabel: tr ? "02 / Çizgi Kalibrasyonu" : "02 / Line & Zone Calibration",
      title: tr ? "Bağımsız Tetik Çizgileri ve Çokgen Algılama Alanları" : "Independent Crossing Lines & Polygon Detection Zones",
      tag: "VECTOR CALIBRATION · DIRECTION FILTERS · REPEAT SUPPRESSION",
      description: tr
        ? "Giriş ve çıkışlar için ayrı tetik çizgileri, çokgen okuma bölgeleri, ters yön filtreleri ve mükerrer plaka okuma engelleme kuralları tanımlar."
        : "Defines custom crossing lines, polygon detection masks, entry/exit direction discriminators, and repeat debounce filters per camera stream.",
      customView: "lpr-calibration",
      metrics: [
        { label: tr ? "Kalibrasyon" : "Calibration", value: "Çokgen / Çizgi", detail: "Vector Coordinate Grid" },
        { label: tr ? "Yön Ayrımı" : "Directional", value: "Giriş / Çıkış", detail: "Reverse Filter Active" },
        { label: tr ? "Yinelenme Filtresi" : "Debounce Window", value: "0-60s", detail: "Duplicate Prevention" },
      ],
    },
    {
      id: "lpr-audit",
      tabLabel: tr ? "03 / Araç Kütüğü ve Olaylar" : "03 / Vehicle Registry & Journal",
      title: tr ? "Sakin Araç Kütüğü, Misafir İzinleri ve Şifreli Olay Günlüğü" : "Resident Registry, Guest Passes & Encrypted Event Journal",
      tag: "LOCAL DPAPI VAULT · ETHERNET RELAY PULSE · CSV/XLSX",
      description: tr
        ? "Site ve otoparklar için blok/daire araç kütüğü oluşturur; kayıtlı araçlarda Ethernet röle sinyaliyle bariyeri otomatik kaldırır ve delil karelerini yerelde şifreler."
        : "Manages resident unit directories, temporary guest passes, automated Ethernet barrier relay pulses, and stores encrypted evidence photos locally.",
      customView: "audit",
      metrics: [
        { label: tr ? "Depolama" : "Storage", value: "SQLite Vault", detail: "DPAPI Encrypted" },
        { label: tr ? "Bariyer Otomasyonu" : "Barrier Relay", value: "Ethernet Pulse", detail: "Automated Gate Lift" },
        { label: tr ? "Dışa Aktarma" : "Data Export", value: "CSV / XLSX", detail: "Full Audit Trail" },
      ],
    },
  ];
}
