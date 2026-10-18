"use client";

import { useState, useEffect } from "react";
import type { Locale } from "@/i18n/config";

export interface StepItem {
  id: string;
  stepNumber: string;
  title: string;
  subtitle: string;
  description: string;
  tag: string;
}

interface AppStepByStepTourProps {
  appId: "scanner" | "ipcast" | "lpr-pro";
  appName: string;
  version: string;
  locale: Locale;
}

export function AppStepByStepTour({
  appId,
  appName,
  version,
  locale,
}: AppStepByStepTourProps) {
  const isTr = locale === "tr";
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [stepProgress, setStepProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<"table" | "map">("table");
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);

  // Define authentic 5-step guided workflows for each application
  const stepsData: Record<"scanner" | "ipcast" | "lpr-pro", StepItem[]> = {
    scanner: [
      {
        id: "step-1",
        stepNumber: "01",
        title: isTr ? "Ağ Adaptörü ve CIDR Alt Ağ Seçimi" : "Network Adapter & Subnet Range Detection",
        subtitle: isTr ? "Otomatik arayüz tespiti" : "Automated Interface Discovery",
        description: isTr
          ? "Uygulama açıldığında makinenizdeki tüm aktif ağ bağdaştırıcılarını (Ethernet, Wi-Fi, Sanal Ağlar) otomatik listeler. Yerel IP ve /24 alt ağ aralığını (192.168.1.1 - 254) sıfır konfigürasyonla hazır hale getirir."
          : "Automatically enumerates all active local network interfaces (Gigabit Ethernet, Wi-Fi 6, Virtual Switches), resolving your local host IP and calculating the /24 CIDR subnet sweep boundaries with zero configuration.",
        tag: "AUTODETECT · 254 HOST BOUNDARY · ZERO-CONFIG",
      },
      {
        id: "step-2",
        stepNumber: "02",
        title: isTr ? "Asenkron Ham Soket Keşfi & Tarama" : "High-Speed Asynchronous Socket Sweep",
        subtitle: isTr ? "2 saniyenin altında alt ağ taraması" : "Sub-2s Full Subnet Discovery",
        description: isTr
          ? "Bounded eşzamanlı soket motoru, ARP ve ICMP sondalarını milisaniyeler içinde alt ağa yayar. Cihazlar yanıt verdikçe liste anında canlı güncellenir; tüm taramanın bitmesini beklemeniz gerekmez."
          : "Bounded concurrency engine fires native ARP and ICMP probes across the subnet in milliseconds. Active devices populate progressively with verified round-trip ping latency without blocking the user interface.",
        tag: "PROGRESSIVE FLUSH · RAW ARP/ICMP · SUB-2S SWEEP",
      },
      {
        id: "step-3",
        stepNumber: "03",
        title: isTr ? "Çoklu Protokol Parmak İzi & Port Analizi" : "Multi-Protocol Fingerprinting & Port Sweep",
        subtitle: isTr ? "ONVIF, mDNS, UPnP, SNMP ve Portlar" : "Deep Identity & Service Resolution",
        description: isTr
          ? "Yalnızca MAC OUI üreticisiyle yetinmez; ONVIF kamera başlıkları, mDNS servisleri, UPnP tanımları ve açık portları (80, 443, 22, 554, 8080) tarayarak cihazın gerçek kimliğini (Kamera, Switch, NAS, Yazıcı) doğrular."
          : "Resolves deep hardware identity beyond MAC vendor OUIs: probes ONVIF camera endpoints, mDNS announcements, UPnP descriptors, SNMP MIBs, and open service ports (80, 443, 22, 554, 8080).",
        tag: "ONVIF PROBE · IEEE OUI · SERVICE DISCOVERY",
      },
      {
        id: "step-4",
        stepNumber: "04",
        title: isTr ? "Görsel Topoloji & LLDP/CDP Komşuluk Haritası" : "Visual Topology Map & Adjacency Routing",
        subtitle: isTr ? "Hiyerarşik bağlantı şeması" : "Hierarchical Switch & Node Adjacency",
        description: isTr
          ? "'NETWORK MAP' sekmesine geçildiğinde ağın dikey hiyerarşik haritası çizilir. Gateway kök düğümünden yönetilebilir switch'lere ve uç cihazlara giden kanıtlı LLDP/CDP bağlantıları düz çizgilerle görselleştirilir."
          : "Switching to the 'NETWORK MAP' tab reveals the vertical network hierarchy: Gateway root node, managed switch trunk lines, verified LLDP/CDP physical links (solid lines) and inferred routing paths (dashed lines).",
        tag: "LLDP / CDP ADJACENCY · VERTICAL TREE · CANVAS",
      },
      {
        id: "step-5",
        stepNumber: "05",
        title: isTr ? "Çift Tıklamayla Web Arayüzü & PDF Raporu" : "One-Click Web Management & PDF Reports",
        subtitle: isTr ? "Cihaza doğrudan erişim ve raporlama" : "Direct Browser Access & Audit Export",
        description: isTr
          ? "Listede veya haritada bir cihaza çift tıkladığınızda varsayılan tarayıcınızda cihazın yönetim paneli (HTTP/HTTPS) anında açılır. Özel cihaz isimleri atayabilir ve tek tıkla resmi PDF veya CSV raporu alabilirsiniz."
          : "Double-clicking any discovered device immediately launches its web administration console (HTTP/HTTPS) in your default browser. Assign persistent custom aliases and export paginated PDF or CSV audit reports.",
        tag: "DOUBLE-CLICK LAUNCH · PDF EXPORT · CUSTOM ALIASES",
      },
    ],
    ipcast: [
      {
        id: "step-1",
        stepNumber: "01",
        title: isTr ? "Anlık 9 Haneli Cihaz Kimliği & Güvenli PIN" : "Instant 9-Digit Device ID & Temporary Passcode",
        subtitle: isTr ? "Kayıt gerektirmeyen doğrudan adres" : "Zero-Registration Identity Setup",
        description: isTr
          ? "IPCast açıldığı anda bilgisayarınıza özel 9 haneli benzersiz bir erişim adresi (örn: 842 190 327) üretilir. Merkezi sunucuda hesap açma veya oturum açma zorunluluğu olmadan anında bağlantıya hazır hale gelir."
          : "IPCast assigns an instant, unique 9-digit peer address (e.g. 842 190 327) and a rotating temporary security token. No user account or central credentials required.",
        tag: "9-DIGIT ID · ZERO-SIGNUP · EPHEMERAL PIN",
      },
      {
        id: "step-2",
        stepNumber: "02",
        title: isTr ? "P2P Doğrudan NAT Geçişi & Şifreli El Sıkışma" : "Direct P2P NAT Traversal & Encrypted Handshake",
        subtitle: isTr ? "Uçtan uca AES-256 GCM tüneli" : "End-to-End Cryptographic Peering",
        description: isTr
          ? "Bağlantı kurulurken STUN/UDP hole-punching ile iki bilgisayar arasında doğrudan eşler arası (P2P) tünel kurulur. Oturum verileri üçüncü taraf sunuculardan geçmez; AES-256 GCM ile şifrelenir."
          : "STUN and ICE hole-punching establish direct peer-to-peer UDP channels between machines. Session payload never passes unencrypted through relay servers; secured by authenticated AES-256 GCM.",
        tag: "P2P DIRECT · AES-256 GCM · ZERO-RELAY OVERHEAD",
      },
      {
        id: "step-3",
        stepNumber: "03",
        title: isTr ? "Donanım Hızlandırmalı 60 FPS Uzak Masaüstü" : "Hardware-Accelerated 60 FPS Desktop Stream",
        subtitle: isTr ? "Ultra düşük gecikmeli görüntü akışı" : "Sub-15ms Latency Interactive Display",
        description: isTr
          ? "GPU hızlandırmalı VP9 / H.265 kodekleri sayesinde 1440p ve 4K çözünürlüklerde dahi 60 FPS akıcı görüntü aktarımı sağlanır. Fare ve klavye gecikmesi 15 ms'nin altında tutularak yerel masaüstü hissi verilir."
          : "GPU-accelerated capture and VP9/H.265 compression deliver smooth 60 FPS video at 1080p, 1440p and 4K resolutions with sub-15ms interactive input response.",
        tag: "60 FPS VP9 · GPU ACCEL · SUB-15MS LATENCY",
      },
      {
        id: "step-4",
        stepNumber: "04",
        title: isTr ? "Çift Yönlü Giriş Senkronizasyonu & Sistem Sesi" : "Bi-Directional Input Sync & Audio Streaming",
        subtitle: isTr ? "Pürüzsüz klavye, fare ve ses iletimi" : "Low-Overhead Input & Stereo Audio Relay",
        description: isTr
          ? "Uzak bilgisayardaki Windows kısayolları (Ctrl+Alt+Del, Alt+Tab vb.) sorunsuz yönlendirilir. Çift yönlü pano (clipboard) paylaşımı ve kayıpsız stereo sistem sesi aynı tünelden eşzamanlı akar."
          : "Native input hooking translates multi-monitor coordinate grids, special Windows chords (Ctrl+Alt+Del), bi-directional clipboard sync, and synchronized stereo desktop audio.",
        tag: "CLIPBOARD SYNC · CHORD PASSTHROUGH · STEREO AUDIO",
      },
      {
        id: "step-5",
        stepNumber: "05",
        title: isTr ? "Sürükle-Bırak Şifreli Dosya Transferi" : "Drag-and-Drop Encrypted File Transfer",
        subtitle: isTr ? "Yüksek hızlı doğrudan dosya paylaşımı" : "Direct Chunked High-Speed File Pipeline",
        description: isTr
          ? "Dosyaları doğrudan uzak pencereye sürükleyip bırakarak veya dosya yöneticisi arayüzünden aktarabilirsiniz. Parçalı (chunked) aktarım ve SHA-256 bütünlük doğrulaması ile veri bozulması önlenir."
          : "Drag and drop folders or documents directly into the remote session canvas. High-throughput chunked streaming with inline SHA-256 verification guarantees zero data corruption.",
        tag: "CHUNKED STREAMING · INTEGRITY CHECKS · DUAL-PANE",
      },
    ],
    "lpr-pro": [
      {
        id: "step-1",
        stepNumber: "01",
        title: isTr ? "RTSP Kamera Akışı ve Optik Kalibrasyon" : "RTSP Optical Camera Feed & Lens Calibration",
        subtitle: isTr ? "Bağımsız giriş-çıkış tetik çizgileri" : "Multi-Stream IP Camera Transport",
        description: isTr
          ? "ONVIF üzerinden güvenlik kameralarını otomatik keşfeder veya doğrudan RTSP H.264/H.265 akışına bağlanır. Bağımsız giriş ve çıkış tetikleme çizgileriyle araç yönünü ve perspektif açısını kalibre eder."
          : "Auto-discovers ONVIF IP security cameras and attaches directly to RTSP H.264/H.265 streams. Independent entrance/exit virtual tripwires calibrate lens perspective and travel direction.",
        tag: "ONVIF DISCOVERY · RTSP H.264/265 · DUAL TRIPWIRES",
      },
      {
        id: "step-2",
        stepNumber: "02",
        title: isTr ? "Yapay Zeka Plaka Tespiti & Karakter OCR" : "Neural Plate Detection & Optical Character OCR",
        subtitle: isTr ? "30 FPS yerel sinir ağı çıkarımı" : "Real-Time 30 FPS Local Inference",
        description: isTr
          ? "YOLOv8 ve ONNX Runtime motoru ile video karesindeki araç plakasını milisaniyeler içinde tespit edip izole eder. Türk ve Avrupa standartlarındaki plakaları %98.6 doğruluk oranıyla anında metne döker."
          : "High-precision YOLOv8 vehicle detection and ONNX OCR inference parse European and Turkish plate standards at 30 FPS with 98.6% character confidence.",
        tag: "ONNX RUNTIME · YOLOV8 OCR · 98.6% ACCURACY",
      },
      {
        id: "step-3",
        stepNumber: "03",
        title: isTr ? "Otomatik Bariyer Röle Tetikleme (<200ms)" : "Automated Barrier Relay Trigger (<200ms)",
        subtitle: isTr ? "Kuru kontak ve ağ röle kontrolü" : "Sub-200ms Dry-Contact Pulse",
        description: isTr
          ? "Yetkili araç tespit edildiğinde ağ tabanlı IP röle veya USB kuru kontak üzerinden otopark bariyerine milisaniyeler içinde açılma komutu gönderilir. Manuel güvenlik personeli müdahalesine gerek kalmaz."
          : "Authorized plates fire instant dry-contact relays or IP barrier controllers in under 200ms, raising gates automatically without security guard intervention.",
        tag: "RELAY AUTOMATION · DRY CONTACT · SUB-200MS GATE",
      },
      {
        id: "step-4",
        stepNumber: "04",
        title: isTr ? "Site & Rezidans Araç Kütüğü Yönetimi" : "Resident & Fleet Registry Database",
        subtitle: isTr ? "Blok, daire ve beyaz/kara liste" : "Multi-Tenant Whitelist & Blacklist",
        description: isTr
          ? "Blok, daire numarası, araç sahibi ve iletişim bilgilerini içeren yerel SQLite veri tabanı. Kara listedeki veya yetkisiz araçlar giriş yapmaya çalıştığında sesli ve görsel alarm üretir."
          : "Organizes vehicles by building, apartment unit, resident name, and phone. Configures blacklists that trigger immediate visual and acoustic operator alerts.",
        tag: "RESIDENT REGISTRY · LOCAL SQLITE · BLACKLIST ALARM",
      },
      {
        id: "step-5",
        stepNumber: "05",
        title: isTr ? "Fotoğraflı Geçiş Günlüğü & Denetim Raporu" : "Visual Passage Audit Log & PDF Reports",
        subtitle: isTr ? "Tarih, saat ve fotoğraf kanıtı" : "High-Resolution Proof & Export",
        description: isTr
          ? "Her geçiş için araç fotoğrafı, plaka kırpması, tarih-saat ve geçiş yönü şifreli yerel kuyruğa kaydedilir. İstenen tarih aralığında filtrelenerek resmi PDF veya Excel raporu olarak dışa aktarılır."
          : "Every vehicle event archives high-resolution camera crops, extracted plate images, timestamps, and gate status to an encrypted local audit queue with Excel/PDF export.",
        tag: "EVIDENCE ARCHIVE · EXCEL/PDF · ENCRYPTED QUEUE",
      },
    ],
  };

  const steps = stepsData[appId];
  const activeStep = steps[currentStepIndex];

  // Auto-play progress timer (7 seconds per step)
  useEffect(() => {
    if (!isPlaying) return;

    const interval = 50; // update every 50ms
    const stepDuration = 7000;
    const increment = (interval / stepDuration) * 100;

    const timer = setInterval(() => {
      setStepProgress((prev) => {
        if (prev >= 100) {
          setCurrentStepIndex((curr) => (curr + 1) % steps.length);
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, steps.length, currentStepIndex]);

  const selectStep = (index: number) => {
    setCurrentStepIndex(index);
    setStepProgress(0);
  };

  // Realistic sample data for IPscans+
  const scannerDevices = [
    { ip: "192.168.1.1", name: "Gateway (UDM Pro)", vendor: "Ubiquiti Inc.", mac: "74:83:C2:11:4F:90", ping: "0.4 ms", ports: "80, 443, 22", type: "Gateway", web: true },
    { ip: "192.168.1.10", name: "Switch-24-PoE-Gen2", vendor: "Ubiquiti Inc.", mac: "74:83:C2:8A:2B:44", ping: "0.8 ms", ports: "22, 161 (SNMP)", type: "Switch", web: true },
    { ip: "192.168.1.20", name: "UniFi-AP6-Pro", vendor: "Ubiquiti Inc.", mac: "74:83:C2:90:1C:12", ping: "1.1 ms", ports: "80, 443", type: "Access Point", web: true },
    { ip: "192.168.1.100", name: "Synology-DS923-Plus", vendor: "Synology Inc.", mac: "00:11:32:88:9F:A1", ping: "0.6 ms", ports: "5000, 5001, 22, 445", type: "NAS Server", web: true },
    { ip: "192.168.1.110", name: "Dev-Workstation-Win11", vendor: "Dell Technologies", mac: "D4:BE:D9:6A:33:02", ping: "1.4 ms", ports: "3389 (RDP), 445", type: "Workstation", web: false },
    { ip: "192.168.1.210", name: "Cam-Gate-North-4K", vendor: "Hikvision Digital", mac: "44:19:B6:55:A2:18", ping: "2.1 ms", ports: "80, 554 (RTSP), 8000", type: "IP Camera (ONVIF)", web: true },
    { ip: "192.168.1.211", name: "Cam-Gate-South-4K", vendor: "Hikvision Digital", mac: "44:19:B6:55:A2:20", ping: "2.4 ms", ports: "80, 554 (RTSP), 8000", type: "IP Camera (ONVIF)", web: true },
    { ip: "192.168.1.150", name: "Meeting-Room-Display", vendor: "LG Electronics", mac: "A8:23:FE:19:0C:44", ping: "3.8 ms", ports: "8001, 8080", type: "Smart TV", web: false },
  ];

  return (
    <div className="w-full my-10 space-y-6">
      
      {/* 1. Step Navigation Timeline Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
        {steps.map((step, idx) => {
          const isActive = idx === currentStepIndex;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => selectStep(idx)}
              className={`relative cursor-pointer text-left rounded-xl p-3.5 border transition-all ${
                isActive
                  ? "border-[#00F0FF]/60 bg-[#00F0FF]/10 shadow-[0_0_20px_rgba(0,240,255,0.15)]"
                  : "border-white/10 bg-[#0A0D12] hover:border-white/20 hover:bg-white/[0.03]"
              }`}
            >
              {/* Progress bar inside active tab */}
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 h-[2px] bg-[#00F0FF] transition-all duration-75"
                  style={{ width: `${stepProgress}%` }}
                />
              )}

              <div className="flex items-center justify-between font-mono text-xs">
                <span className={isActive ? "text-[#00F0FF] font-bold" : "text-neutral-500 font-semibold"}>
                  ADIM {step.stepNumber}
                </span>
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#00F0FF] animate-pulse" />}
              </div>

              <div className="mt-1.5 text-xs font-semibold text-white truncate">
                {step.title}
              </div>

              <div className="mt-0.5 text-[11px] text-neutral-400 truncate">
                {step.subtitle}
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. Realistic Application Window Mockup Stage */}
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#050608] shadow-2xl">
        
        {/* Window Titlebar */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#0B0D13] px-4 py-2.5 text-xs select-none">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="h-3 w-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
              <span className="h-3 w-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
              <span className="h-3 w-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
            </div>
            <span className="font-mono text-neutral-400 font-medium">
              {appName} · v{version}
            </span>
            <span className="text-neutral-600">|</span>
            <span className="font-mono text-[11px] text-[#00F0FF]">
              {activeStep.tag}
            </span>
          </div>

          {/* Player Controls */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-neutral-300 hover:text-white hover:bg-white/10"
            >
              <span>{isPlaying ? "⏸" : "▶"}</span>
              <span className="hidden sm:inline">{isPlaying ? (isTr ? "Durdur" : "Pause") : (isTr ? "Oynat" : "Play")}</span>
            </button>

            <span className="font-mono text-[11px] text-neutral-500">
              {currentStepIndex + 1} / {steps.length}
            </span>
          </div>
        </div>

        {/* ==================== MOCKUP CONTENT: SCANNER ==================== */}
        {appId === "scanner" && (
          <div className="p-4 sm:p-6 bg-[#08090C] min-h-[460px] font-sans">
            
            {/* Top Command Deck */}
            <div className="mb-4 rounded-xl border border-white/10 bg-[#0E1017] p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                
                {/* Adapter & Range */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-black/60 px-3 py-1.5 font-mono text-neutral-200">
                    <span className="text-[#00F0FF]">●</span>
                    <span>Ethernet (Realtek PCIe GbE)</span>
                    <span className="text-neutral-500">· 192.168.1.50/24</span>
                  </div>

                  <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-neutral-300">
                    <span className="text-neutral-500">Hedef:</span>
                    <span className="text-white">192.168.1.1 - 192.168.1.254</span>
                  </div>
                </div>

                {/* Filter and Scan Actions */}
                <div className="flex items-center gap-2">
                  <div className="hidden md:flex items-center rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-neutral-400 font-mono text-xs w-48">
                    <span>🔍 Ara (IP, MAC, İsim)...</span>
                  </div>

                  <button
                    type="button"
                    className="cursor-pointer rounded-lg bg-white px-3.5 py-1.5 font-mono text-xs font-bold text-black hover:bg-neutral-200"
                  >
                    {isTr ? "Taramayı Başlat" : "Start Scan"} ▶
                  </button>
                </div>
              </div>

              {/* Sub-bar: Telemetry Counter & View Switcher */}
              <div className="flex items-center justify-between border-t border-white/5 pt-2.5 text-xs font-mono">
                <div className="flex items-center gap-4 text-neutral-400">
                  <span className="text-[#00FF9D] font-semibold">
                    ✓ 8 Cihaz Keşfedildi (6 Web Arayüzlü)
                  </span>
                  <span className="hidden sm:inline text-neutral-600">|</span>
                  <span className="hidden sm:inline text-neutral-400">
                    Süre: 1.48 saniye · 254 Host Tarandı
                  </span>
                </div>

                {/* Tab switchers */}
                <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/60 p-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab("table")}
                    className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold ${
                      activeTab === "table" ? "bg-white text-black" : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {isTr ? "Cihaz Tablosu" : "Device Table"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("map")}
                    className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold ${
                      activeTab === "map" ? "bg-white text-black" : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {isTr ? "Ağ Haritası (Topoloji)" : "Network Map"}
                  </button>
                </div>
              </div>
            </div>

            {/* View 1: Real Device Discovery Table */}
            {activeTab === "table" ? (
              <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0A0C11]">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="border-b border-white/10 bg-white/5 text-neutral-400 select-none">
                    <tr>
                      <th className="p-3">IP Adresi</th>
                      <th className="p-3">Cihaz İsmi</th>
                      <th className="p-3">Türü</th>
                      <th className="p-3">Üretici / MAC</th>
                      <th className="p-3">Gecikme</th>
                      <th className="p-3">Açık Portlar</th>
                      <th className="p-3 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-neutral-300">
                    {scannerDevices.map((dev, idx) => (
                      <tr
                        key={dev.ip}
                        onClick={() => setSelectedDeviceIndex(idx)}
                        className={`cursor-pointer transition-colors ${
                          selectedDeviceIndex === idx
                            ? "bg-[#00F0FF]/10 text-white"
                            : "hover:bg-white/[0.02]"
                        }`}
                      >
                        <td className="p-3 font-bold text-white flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#00FF9D]" />
                          {dev.ip}
                        </td>
                        <td className="p-3 text-[#00F0FF]">{dev.name}</td>
                        <td className="p-3 text-neutral-300">{dev.type}</td>
                        <td className="p-3 text-neutral-400">
                          {dev.vendor} <span className="text-neutral-600">({dev.mac})</span>
                        </td>
                        <td className="p-3 text-neutral-300">{dev.ping}</td>
                        <td className="p-3 text-amber-300">{dev.ports}</td>
                        <td className="p-3 text-right">
                          {dev.web && (
                            <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-white hover:bg-white/20">
                              Web UI ↗
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* View 2: Hierarchical Network Map Topology */
              <div className="rounded-xl border border-white/10 bg-[#0A0C11] p-6 text-center">
                <div className="font-mono text-xs text-neutral-400 mb-6 flex items-center justify-center gap-2">
                  <span>HİYERARŞİK TOPOLOJİ AĞACI</span>
                  <span className="text-neutral-600">·</span>
                  <span className="text-[#00FF9D]">DOĞRULANMIŞ LLDP/CDP BAĞLANTILARI</span>
                </div>

                {/* Gateway Root */}
                <div className="inline-block rounded-xl border border-[#00F0FF] bg-[#00F0FF]/10 p-3 text-xs font-mono">
                  <div className="text-[#00F0FF] font-bold">192.168.1.1 (Gateway · UDM Pro)</div>
                  <div className="text-[10px] text-neutral-400">WAN Uplink: 1 Gbps Fiber</div>
                </div>

                {/* Connector line */}
                <div className="h-6 w-0.5 mx-auto bg-white/20 my-1" />

                {/* Core Switch */}
                <div className="inline-block rounded-xl border border-white/20 bg-white/5 p-3 text-xs font-mono">
                  <div className="text-white font-bold">192.168.1.10 (Switch-24-PoE-Gen2)</div>
                  <div className="text-[10px] text-neutral-400">Port 1-24 Trunk Link (LLDP Verified)</div>
                </div>

                {/* Sub connector lines */}
                <div className="h-6 w-0.5 mx-auto bg-white/20 my-1" />

                {/* Leaf Devices Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto mt-2">
                  <div className="rounded-lg border border-white/10 bg-black/60 p-2.5 text-xs font-mono">
                    <div className="text-white font-semibold">192.168.1.20</div>
                    <div className="text-[10px] text-neutral-400">UniFi AP6 Pro</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/60 p-2.5 text-xs font-mono">
                    <div className="text-white font-semibold">192.168.1.100</div>
                    <div className="text-[10px] text-neutral-400">Synology NAS</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/60 p-2.5 text-xs font-mono">
                    <div className="text-white font-semibold">192.168.1.210</div>
                    <div className="text-[10px] text-neutral-400">Hikvision Cam</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/60 p-2.5 text-xs font-mono">
                    <div className="text-white font-semibold">192.168.1.110</div>
                    <div className="text-[10px] text-neutral-400">Workstation PC</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== MOCKUP CONTENT: IPCAST ==================== */}
        {appId === "ipcast" && (
          <div className="p-4 sm:p-6 bg-[#08090C] min-h-[460px] font-sans">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              
              {/* Left Column: Device Identity Card */}
              <div className="md:col-span-6 rounded-2xl border border-white/10 bg-[#0E1017] p-6 space-y-4">
                <div className="font-mono text-xs text-neutral-400 uppercase tracking-widest">
                  {isTr ? "SİZİN CİHAZ ADRESİNİZ" : "YOUR DEVICE ADDRESS"}
                </div>

                <div className="flex items-center gap-4">
                  <div className="font-mono text-4xl sm:text-5xl font-bold tracking-wider text-white">
                    842 190 327
                  </div>
                  <button
                    type="button"
                    className="cursor-pointer rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-xs text-neutral-300 hover:text-white"
                  >
                    Kopyala 📋
                  </button>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs text-[#00FF9D]">
                  <span className="h-2 w-2 rounded-full bg-[#00FF9D] animate-pulse" />
                  <span>Bağlantıya Hazır · P2P Doğrudan Tünel Aktif</span>
                </div>

                <div className="border-t border-white/10 pt-4 space-y-2 text-xs font-mono text-neutral-400">
                  <div className="flex justify-between">
                    <span>Geçici Tek Seferlik PIN:</span>
                    <span className="text-white font-bold tracking-widest">884-912</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Şifreleme Standartı:</span>
                    <span className="text-neutral-200">AES-256-GCM / Ephemeral Key</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Connect to Partner Card */}
              <div className="md:col-span-6 rounded-2xl border border-white/10 bg-[#0E1017] p-6 space-y-4">
                <div className="font-mono text-xs text-neutral-400 uppercase tracking-widest">
                  {isTr ? "UZAK MASAÜSTÜNE BAĞLAN" : "CONNECT TO REMOTE DESKTOP"}
                </div>

                <div className="space-y-2">
                  <div className="font-mono text-xs text-neutral-500">Hedef Cihaz Kimliği:</div>
                  <div className="rounded-xl border border-white/15 bg-black/60 p-3 font-mono text-lg text-white">
                    519 304 881
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex-1 cursor-pointer rounded-xl bg-white p-3 font-mono text-xs font-bold text-black hover:bg-neutral-200"
                  >
                    {isTr ? "Uzak Masaüstünü Başlat" : "Start Remote Desktop"} ▶
                  </button>

                  <button
                    type="button"
                    className="cursor-pointer rounded-xl border border-white/15 bg-white/5 p-3 font-mono text-xs text-neutral-300 hover:text-white"
                  >
                    Dosya Aktarımı 📁
                  </button>
                </div>

                <div className="rounded-lg border border-white/5 bg-black/40 p-3 text-[11px] font-mono text-neutral-400 flex items-center justify-between">
                  <span>Aktif Oturum Kalitesi:</span>
                  <span className="text-[#00F0FF]">60 FPS · 12 ms Ping · VP9 GPU</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ==================== MOCKUP CONTENT: LPR PRO ==================== */}
        {appId === "lpr-pro" && (
          <div className="p-4 sm:p-6 bg-[#08090C] min-h-[460px] font-sans">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              
              {/* Left Column: Live Optical Video Stream Frame */}
              <div className="md:col-span-7 rounded-2xl border border-white/10 bg-black overflow-hidden relative">
                <div className="relative aspect-video w-full bg-[#040507] flex items-center justify-center">
                  
                  {/* Camera OSD Overlay */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 font-mono text-[11px] bg-black/70 px-2.5 py-1 rounded border border-white/10">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-white font-bold">CAM-01 · ANA GİRİŞ KAPISI (RTSP 4K)</span>
                  </div>

                  <div className="absolute top-3 right-3 font-mono text-[11px] text-neutral-400 bg-black/70 px-2.5 py-1 rounded">
                    30 FPS · 3840x2160
                  </div>

                  {/* Simulated Car & Bounding Box */}
                  <div className="relative border-2 border-[#00FF9D] rounded-lg p-4 bg-[#00FF9D]/10 shadow-[0_0_25px_rgba(0,255,157,0.25)] text-center">
                    <div className="absolute -top-3.5 left-3 bg-[#00FF9D] text-black font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                      YOLOv8 PLAKA TESPİTİ · %98.6
                    </div>
                    
                    {/* Detected Turkish Plate Box */}
                    <div className="inline-flex items-center gap-2 border-2 border-white rounded bg-white px-3 py-1 font-mono text-black font-bold text-xl tracking-wider shadow-lg">
                      <span className="bg-[#003399] text-white px-1 py-0.5 text-xs rounded">TR</span>
                      <span>34 ABC 789</span>
                    </div>

                    <div className="mt-2 text-[11px] font-mono text-neutral-300">
                      Araç: Volkswagen Passat · Siyah
                    </div>
                  </div>

                  {/* Virtual Tripwire Line */}
                  <div className="absolute bottom-10 left-0 right-0 border-b border-dashed border-[#00F0FF]/60 flex items-center justify-center">
                    <span className="bg-black/80 text-[#00F0FF] text-[9px] font-mono px-2 py-0.5 rounded -translate-y-2">
                      GİRİŞ TETİKLEYİCİ ÇİZGİSİ (TRIPWIRE A)
                    </span>
                  </div>
                </div>

                <div className="p-3 border-t border-white/10 bg-[#0E1017] flex items-center justify-between text-xs font-mono">
                  <span className="text-[#00FF9D]">✓ OTOMATİK BARİYER AÇILDI (180ms Röle Darbesi)</span>
                  <span className="text-neutral-400">Daire: A Blok D:14 (Ahmet Yılmaz)</span>
                </div>
              </div>

              {/* Right Column: Live Passage Log Table */}
              <div className="md:col-span-5 rounded-2xl border border-white/10 bg-[#0E1017] p-4 flex flex-col justify-between">
                <div>
                  <div className="font-mono text-xs text-neutral-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span>CANLI GEÇİŞ KÜTÜĞÜ</span>
                    <span className="text-[#00F0FF]">KAYIT AKTİF</span>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="rounded-lg border border-[#00FF9D]/30 bg-[#00FF9D]/5 p-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-white font-bold">34 ABC 789 · GİRİŞ</div>
                        <div className="text-[10px] text-neutral-400">A Blok D:14 · İzinli Sakin</div>
                      </div>
                      <span className="text-[#00FF9D] font-bold">AÇILDI</span>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/40 p-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-white font-bold">06 ANK 202 · GİRİŞ</div>
                        <div className="text-[10px] text-neutral-400">B Blok D:08 · İzinli Sakin</div>
                      </div>
                      <span className="text-[#00FF9D] font-bold">AÇILDI</span>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/40 p-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-white font-bold">35 IZM 410 · ÇIKIŞ</div>
                        <div className="text-[10px] text-neutral-400">Ziyaretçi Araç</div>
                      </div>
                      <span className="text-neutral-400 font-bold">KAYDEDİLDİ</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-white/10 pt-3 flex items-center justify-between text-xs font-mono">
                  <span className="text-neutral-500">Bugünkü Geçiş: 142 Araç</span>
                  <button
                    type="button"
                    className="cursor-pointer text-[#00F0FF] hover:underline"
                  >
                    Excel / PDF Raporu Al ↗
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* 3. Detailed Step Description Card */}
      <div className="rounded-xl border border-white/10 bg-[#0B0D13] p-5 sm:p-6 text-neutral-300">
        <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs mb-2">
          <span className="text-[#00F0FF] font-bold">
            ADIM {activeStep.stepNumber} DETAYLI ÇALIŞMA MANTIĞI
          </span>
          <span className="text-neutral-500">{activeStep.tag}</span>
        </div>
        <h4 className="text-lg font-bold text-white mb-2">{activeStep.title}</h4>
        <p className="text-sm leading-relaxed text-neutral-300">
          {activeStep.description}
        </p>
      </div>

    </div>
  );
}
