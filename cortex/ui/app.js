const $ = s => document.querySelector(s);
let state = null, seen = new Set(), first = true, refreshing = false, lastInstallPhase = null, currentTab = 'overview';
let heatmapCameras = new Set();
let studioMode = 'roi';
let isDrawing = false, dragAction = null, dragStart = null, initialRoi = null;
let matrixOpen = false, matrixHeatmap = false;
let nvrGridLayout = 'grid-2x2';
let nvrFocusedCameraId = null;
let nvrAutoTourActive = false;
let nvrAutoTourTimer = null;
let nvrTourIndex = 0;
let localTelegramPhones = [];
let currentClientTenantId = '';
let ultraBannerDismissed = false;
let sectorSelections = {}; // { [packId]: Set<number> }
let adminToken = '';
let lastGeneratedKey = '';
let lastGeneratedOrg = '';
let syncSignalFieldRunning = () => {};

function resetClientTelegramInputs() {
  localTelegramPhones = [];
  first = true;
  seen.clear();
  if (state && Array.isArray(state.events)) {
    for (const ev of state.events) {
      if (ev && ev.id) seen.add(ev.id);
    }
  }
  const phoneEl = $('#tgPhone');
  if (phoneEl) {
    phoneEl.value = '';
    phoneEl.dataset.syncedPhone = '';
  }
  const chatEl = $('#tgChatId');
  if (chatEl) {
    chatEl.value = '';
  }
}

try {
  adminToken = sessionStorage.getItem('cortex-admin-token') || '';
} catch (e) {}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

/* ==========================================================================
   60FPS Zero-Jank DOM Helpers (Dirty-Check & Double-Buffered Image Swap)
   ========================================================================== */

function setHtmlIfChanged(el, html, key) {
  if (!el) return false;
  const k = key !== undefined ? String(key) : html;
  if (el.dataset.renderKey === k) return false;
  el.dataset.renderKey = k;
  el.innerHTML = html;
  return true;
}

function updateCameraImageSmooth(imgEl, url) {
  if (!imgEl || imgEl.dataset.loading === '1') return;
  imgEl.dataset.loading = '1';
  const pre = new Image();
  pre.onload = () => {
    imgEl.src = url;
    imgEl.dataset.loading = '0';
  };
  pre.onerror = () => {
    imgEl.dataset.loading = '0';
  };
  pre.src = url;
}

/* ==========================================================================
   ipscans.com SignalField Canvas Engine (Login Architectural Stage)
   ========================================================================== */

function initSignalField() {
  const canvas = $('#loginSignalCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const STOPS_DARK = [
    [76, 130, 255],  // #4C82FF
    [0, 210, 255],   // #00D2FF
    [155, 132, 255], // #9B84FF
  ];

  function gradientColor(t) {
    const x = ((t % 1) + 1) % 1;
    const seg = x * STOPS_DARK.length;
    const i = Math.floor(seg);
    const f = seg - i;
    const a = STOPS_DARK[i % STOPS_DARK.length];
    const b = STOPS_DARK[(i + 1) % STOPS_DARK.length];
    return [
      a[0] + (b[0] - a[0]) * f,
      a[1] + (b[1] - a[1]) * f,
      a[2] + (b[2] - a[2]) * f,
    ];
  }

  const BUCKET_COUNT = 16;
  const PALETTE = Array.from({ length: BUCKET_COUNT }, (_, b) => {
    const rgb = gradientColor(b / BUCKET_COUNT);
    return `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},0.72)`;
  });
  const buckets = Array.from({ length: BUCKET_COUNT }, () => []);

  function buildParticles(area) {
    const count = Math.max(90, Math.min(420, Math.round(area / 2600)));
    const out = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const ring = Math.random() < 0.62
        ? 0.62 + (Math.random() - 0.5) * 0.22
        : 0.25 + Math.random() * 0.95;
      const hx = Math.cos(angle) * ring;
      const hy = Math.sin(angle) * ring;
      out.push({
        hx,
        hy,
        x: hx,
        y: hy,
        vx: 0,
        vy: 0,
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        len: 2 + Math.random() * 5,
        hue: (Math.atan2(hy, hx) / (Math.PI * 2) + 1) % 1,
        phase: Math.random() * Math.PI * 2,
        depth: 0.35 + Math.random() * 0.65,
      });
    }
    return out;
  }

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let raf = 0;
  let running = false;
  let t = 0;
  let lastTime = performance.now();
  const pointer = { x: -9999, y: -9999, active: false };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width || 640);
    height = Math.max(1, rect.height || 720);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles = buildParticles(width * height);
    const cx0 = width / 2;
    const cy0 = height / 2;
    const s0 = Math.min(width * 0.62, height * 0.78);
    for (const p of particles) {
      p.x = cx0 + p.hx * s0 * (reduced ? 1 : 1.15);
      p.y = cy0 + p.hy * s0 * (reduced ? 1 : 1.15);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const scale = Math.min(width * 0.62, height * 0.78);
    const rot = t * 0.035;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);
    const breathe = 1 + Math.sin(t * 0.6) * 0.018;

    for (let b = 0; b < BUCKET_COUNT; b++) {
      buckets[b].length = 0;
    }

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const wave = Math.sin(t * 0.9 + p.phase) * 0.012;
      const hx = (p.hx * cosR - p.hy * sinR) * (breathe + wave);
      const hy = (p.hx * sinR + p.hy * cosR) * (breathe + wave);
      const tx = cx + hx * scale;
      const ty = cy + hy * scale;

      p.vx += (tx - p.x) * 0.045;
      p.vy += (ty - p.y) * 0.045;

      if (pointer.active) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        const r = 150;
        if (d2 < r * r && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const force = (1 - d / r) * 7;
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
        }
      }

      p.vx *= 0.82;
      p.vy *= 0.82;
      p.x += p.vx;
      p.y += p.vy;

      const ang = Math.atan2(p.y - cy, p.x - cx) + Math.PI / 2;
      const len = p.len * (0.6 + p.depth * 0.6);
      const ex = Math.cos(ang) * len * 0.5;
      const ey = Math.sin(ang) * len * 0.5;
      p.x1 = p.x - ex;
      p.y1 = p.y - ey;
      p.x2 = p.x + ex;
      p.y2 = p.y + ey;

      const hueShift = ((p.hue + t * 0.01) % 1 + 1) % 1;
      const colorIdx = (hueShift * BUCKET_COUNT) | 0;
      buckets[colorIdx & 15].push(p);
    }

    ctx.lineWidth = 1.6;
    for (let b = 0; b < BUCKET_COUNT; b++) {
      const bucket = buckets[b];
      if (!bucket.length) continue;
      ctx.strokeStyle = PALETTE[b];
      ctx.beginPath();
      for (let j = 0; j < bucket.length; j++) {
        const p = bucket[j];
        ctx.moveTo(p.x1, p.y1);
        ctx.lineTo(p.x2, p.y2);
      }
      ctx.stroke();
    }
  }

  function loop(now) {
    const gate = $('#cortexLoginGate');
    if (!gate || gate.hidden || document.hidden) {
      running = false;
      return;
    }
    const ts = typeof now === 'number' ? now : performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (ts - lastTime) / 1000));
    lastTime = ts;
    t += dt;
    draw();
    raf = requestAnimationFrame(loop);
  }

  function start() {
    const gate = $('#cortexLoginGate');
    if (running || reduced || !gate || gate.hidden || document.hidden) return;
    if (particles.length === 0 || width <= 1 || height <= 1) resize();
    lastTime = performance.now();
    running = true;
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
  }

  syncSignalFieldRunning = () => {
    const gate = $('#cortexLoginGate');
    if (gate && !gate.hidden && !document.hidden) {
      if (particles.length === 0 || width <= 1 || height <= 1) {
        resize();
        draw();
      }
      start();
    } else {
      stop();
    }
  };

  resize();
  draw();
  start();

  window.addEventListener('resize', () => {
    const gate = $('#cortexLoginGate');
    if (gate && !gate.hidden) {
      const rect = canvas.getBoundingClientRect();
      if (Math.abs(rect.width - width) > 4 || Math.abs(rect.height - height) > 4) {
        resize();
        if (!running) draw();
      }
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else syncSignalFieldRunning();
  });

  const stageEl = canvas.parentElement;
  if (stageEl) {
    stageEl.addEventListener('pointermove', e => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= rect.width && pointer.y <= rect.height;
    }, { passive: true });
    stageEl.addEventListener('pointerleave', () => {
      pointer.active = false;
    });
  }
}

/* ==========================================================================
   Web Audio API — Zero-Dependency Operator Alarm Synthesizer
   ========================================================================== */

function playOperatorAlert() {
  if (!state?.soundAlert) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    for (const [offset, freq] of [[0, 660], [0.16, 880]]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(0.08, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.15);
    }
  } catch (e) {}
}

/* ==========================================================================
   IPScans v2 Theme System (Light Default / Dark + OS Preference + Persistence)
   ========================================================================== */

function getPreferredTheme() {
  try {
    const qsTheme = new URLSearchParams(window.location.search).get("theme");
    if (qsTheme === "light" || qsTheme === "dark") return qsTheme;
    const saved = localStorage.getItem("ipscans-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch (e) {}
  return "light";
}

function applyTheme(theme, persist = false) {
  const resolved = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  if (persist) {
    try { localStorage.setItem("ipscans-theme", resolved); } catch (e) {}
  }
  const toggleBtn = $('#theme-toggle');
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-pressed', String(resolved === 'dark'));
    toggleBtn.title = resolved === 'dark' ? 'Açık temaya geç (Light Mode)' : 'Koyu temaya geç (Dark Mode)';
  }
  drawRoiCanvas();
}

function initTheme() {
  applyTheme(getPreferredTheme(), false);
  const toggleBtn = $('#theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(next, true);
    });
  }
}

/* ==========================================================================
   Bilingual Dictionary (TR default / EN)
   ========================================================================== */

const I18N = {
  tr: {
    'aside.eyebrow': 'KONTROL MERKEZİ',
    'nav.overview': 'Genel bakış',
    'nav.cameras': 'Kameralar',
    'nav.rules': 'Olay kuralları',
    'nav.events': 'Olay arşivi',
    'nav.settings': 'Ayarlar & Lisans',
    'nav.admin': 'Yönetim Paneli',
    'aside.workspace': 'Yerel Motor Aktif',
    'aside.privacy': 'Görüntüler bu bilgisayarda kalır.',
    'aside.engine': 'Hibrit Görsel AI + Akıllı Takip + Telegram Bot',
    'aside.rc': '2.0 Pro Ticari Sürüm',
    'header.badge': 'LOCAL FIRST',
    'overview.eyebrow': 'GÖREN KAMERALAR. ANLAYAN SİSTEM.',
    'overview.title': 'Her kameraya bir <em>beyin.</em>',
    'overview.lead': 'Neyi takip edeceğini sen söyle. Cortex gözlemlesin, olayı kanıtlarıyla kaydetsin, anında sana bildirsin.',
    'overview.cta': 'İlk kameranı bağla ↗',
    'overview.studioBtn': 'Bölge (ROI) & Kural Stüdyosu',
    'overview.orb': 'GÖR · ANLA · BİLDİR',
    'overview.workspace': 'NVR Kamera Duvarı & Canlı Komuta Merkezi',
    'overview.liveStatus': 'Gerçek bağlantı durumu · Canlı termal ısı haritası, İki Yönlü Telegram Bot ve KVKK maskeleme destekli',
    'overview.hint': 'Başlamak için kamera ekle, olay kuralını tanımla veya 8 kurumsal saha paketinden birini tek tıkla uygula.',
    'sector.eyebrow': 'KURUMSAL SAHA PAKETLERİ · 8 SEKTÖR · PRO / PLUS / ULTRA',
    'sector.title': 'Hazır Sektörel Kurulum Paketleri (8 Sektör · Tek Tıkla Kurulum)',
    'sector.desc': 'Site/Rezidans, Havuz, Fabrika/İSG, Depo/Lojistik, Perakende/AVM, Ofis/Plaza, Okul/Kampüs ve Hastane/Klinik için kalibre edilmiş bölge (ROI), zaman çizelgesi ve akıllı takip kurallarını seçip tek tuşla devreye alın.',
    'sector.targetCamera': 'Hedef kamera',
    'sector.deployMode': 'Kurulum modu',
    'stats.cameras': 'KAMERALAR',
    'stats.rules': 'ETKİN KURALLAR',
    'stats.events': 'İNCELEME BEKLEYEN',
    'empty.camerasTitle': 'Henüz kamera eklenmedi.',
    'empty.camerasDesc': 'IP adresi ve giriş bilgileriyle ilk kameranı bağla.',
    'empty.rulesTitle': 'Kütüphaneden bir konfigürasyon seç.',
    'empty.rulesDesc': 'Aydınlatma, hareket, loitering, kapasite, sınır güvenliği, İSG ve görsel AI kuralları hazır.',
    'empty.eventsTitle': 'Henüz olay yok.',
    'empty.eventsDesc': 'Tespit edilen olayların açıklamaları ve yerel klipleri burada görünür. Örnek veya sahte olay gösterilmez.',
    'cameras.eyebrow': '01 / GÖR & BAĞLAN',
    'cameras.title': 'Kameraların.',
    'cameras.subtitle': 'Aynı ağdaki ONVIF cihazları keşfet, NVR kanallarını topluca içe aktar veya RTSP ile doğrudan bağlan.',
    'cameras.discover': 'Ağda keşfet ↗',
    'cameras.addTitle': 'Kamera ekle',
    'cameras.nameLabel': 'Kamera adı',
    'cameras.templateLabel': 'Bağlantı şablonu',
    'cameras.ipLabel': 'Cihaz IP adresi',
    'cameras.rtspLabel': 'RTSP adresi (tam adres yapıştırılabilir)',
    'cameras.showRtsp': 'RTSP adresini göster',
    'cameras.transportLabel': 'RTSP taşıma biçimi',
    'cameras.credHint': 'Tam adres kullanıcı adı ve parola içeriyorsa aşağıdaki alanları boş bırakabilirsin.',
    'cameras.userLabel': 'Kullanıcı adı',
    'cameras.passLabel': 'Parola',
    'cameras.vaultHint': 'Kimlik bilgileri yerel Fernet AES-128 şifreli kasada saklanır.',
    'cameras.testBtn': 'Bağlantıyı test et',
    'cameras.saveBtn': 'Kaydet ve izlemeyi başlat ↗',
    'rules.eyebrow': '02 / ANLA & TASARLA',
    'rules.title': 'Sen söyle.<br>Cortex takip etsin.',
    'rules.formTitle': 'Yeni olay kuralı',
    'rules.catalogLabel': 'Konfigürasyon kütüphanesi (22 Yerel + 6 Pro Takip + 3 Geçiş + 42 Görsel AI)',
    'rules.cameraLabel': 'Kamera',
    'rules.nameLabel': 'Kural adı',
    'rules.promptLabel': 'Ne olduğunda haber verelim?',
    'rules.sensitivityLabel': 'Ölçüm eşiği',
    'rules.durationLabel': 'Doğrulama süresi (saniye)',
    'rules.roiSummary': 'Profesyonel Bölge (ROI) & Geçiş Hattı Çizim Stüdyosu',
    'rules.roiHint': 'Sahne üzerinde yeni bölge çizebilir, mevcut bölgeyi ortasından tutup taşıyabilir veya 8 tutamaçtan boyutlandırabilirsiniz.',
    'rules.left': 'Sol X (%)',
    'rules.top': 'Üst Y (%)',
    'rules.width': 'Genişlik W (%)',
    'rules.height': 'Yükseklik H (%)',
    'rules.startTime': 'Başlangıç',
    'rules.endTime': 'Bitiş',
    'rules.days': 'Aktif Günler',
    'rules.scheduleHint': 'Bilgisayarın yerel saati kullanılır. Başlangıç ve bitiş aynıysa tüm gün (7/24) izlenir.',
    'rules.scoreLabel': 'Minimum model skoru',
    'rules.cooldownLabel': 'Tekrar bildirim aralığı (sn)',
    'rules.modelNotice': 'Model skoru doğruluk yüzdesi değildir. Tespitler insan incelemesi gerektirir.',
    'rules.saveBtn': 'Kuralı etkinleştir ↗',
    'rules.resetBtn': 'Yeni kural',
    'events.eyebrow': '03 / BİLDİR & SORGULA',
    'events.title': 'Olay arşivi.',
    'events.subtitle': 'Doğal dilde ara, kanıt klibini incele, SHA-256 imzalı adli kanıt paketini indir.',
    'events.notifyBtn': 'Masaüstü bildirimi aç',
    'settings.eyebrow': '04 / ÇALIŞMA ALANI, OLLAMA VLM & MÜŞTERİ LİSANSI',
    'settings.title': 'Ayarlar & Üyelik Merkezi',
    'settings.engineTitle': 'Yerel Ollama Görsel AI Motoru',
    'settings.modelLabel': 'Aktif Ollama görsel model adı',
    'settings.installBtn': 'Seçili modeli kur ve bağla',
    'settings.cancelBtn': 'İptal et',
    'settings.testModelBtn': 'Model bağlantısını kontrol et',
    'settings.retentionLabel': 'Kayıt saklama süresi (gün)',
    'settings.retentionHint': 'Süreyi azaltmak, süresi dolan olay kayıtlarını ve kliplerini siler.',
    'settings.autostart': 'Cortex açıldığında kayıtlı kameraları otomatik başlat',
    'settings.webhookTitle': 'Kurumsal Webhook Kanalı (Slack / Discord / SIEM)',
    'settings.webhookLabel': 'HTTPS webhook URL',
    'settings.replaceWebhook': 'Webhook ayarını değiştir (boş bırakılırsa kapatılır)',
    'settings.webhookHint': 'Slack ve Discord webhook adresleri otomatik tanınır.',
    'settings.saveBtn': 'Ayarları kaydet',
    'footer.tagline': 'Yerel görsel zekâ. Profesyonel saha analitiği. Senin kontrolün.'
  },
  en: {
    'aside.eyebrow': 'CONTROL CENTER',
    'nav.overview': 'Overview',
    'nav.cameras': 'Cameras',
    'nav.rules': 'Event rules',
    'nav.events': 'Event archive',
    'nav.settings': 'Settings & License',
    'nav.admin': 'Admin Panel',
    'aside.workspace': 'Local Engine Active',
    'aside.privacy': 'Video frames stay on this PC.',
    'aside.engine': 'Hybrid Vision AI + Smart Tracking + Telegram Bot',
    'aside.rc': '2.0 Pro Commercial Edition',
    'header.badge': 'LOCAL FIRST',
    'overview.eyebrow': 'CAMERAS THAT SEE. SYSTEM THAT UNDERSTANDS.',
    'overview.title': 'A <em>brain</em> for every camera.',
    'overview.lead': 'Tell it what to watch for. Cortex observes, records forensic evidence, and alerts you locally.',
    'overview.cta': 'Connect first camera ↗',
    'overview.studioBtn': 'ROI & Rule Studio',
    'overview.orb': 'SEE · UNDERSTAND · ALERT',
    'overview.workspace': 'NVR Camera Wall & Live Command Center',
    'overview.liveStatus': 'Live connection status · Thermal heatmap, 2-Way Telegram Bot & GDPR masking ready',
    'overview.hint': 'Add a camera, design a custom zone in the ROI Studio, or deploy one of the 8 enterprise sector packs.',
    'sector.eyebrow': 'ENTERPRISE SECTOR PACKS · 8 VERTICALS · PRO / PLUS / ULTRA',
    'sector.title': 'Ready Sector Deployment Packages (8 Verticals · One-Click Setup)',
    'sector.desc': 'Deploy pre-calibrated ROI zones, schedules, and smart tracking rules for Residence, Pool, Factory, Warehouse, Retail, Office, Campus, or Clinic.',
    'sector.targetCamera': 'Target camera',
    'sector.deployMode': 'Deployment mode',
    'stats.cameras': 'CAMERAS',
    'stats.rules': 'ACTIVE RULES',
    'stats.events': 'PENDING REVIEW',
    'empty.camerasTitle': 'No cameras added yet.',
    'empty.camerasDesc': 'Connect your first camera with its IP address and RTSP credentials.',
    'empty.rulesTitle': 'Select a configuration from the library.',
    'empty.rulesDesc': 'Lighting, motion, loitering, occupancy, perimeter, HSE, and Vision AI rules are ready.',
    'empty.eventsTitle': 'No events recorded yet.',
    'empty.eventsDesc': 'Detected event descriptions and local evidence clips appear here.',
    'cameras.eyebrow': '01 / SEE & CONNECT',
    'cameras.title': 'Your cameras.',
    'cameras.subtitle': 'Discover ONVIF devices on your LAN, batch-import NVR channels, or connect via RTSP.',
    'cameras.discover': 'Discover on LAN ↗',
    'cameras.addTitle': 'Add camera',
    'cameras.nameLabel': 'Camera name',
    'cameras.templateLabel': 'Connection preset',
    'cameras.ipLabel': 'Device IP address',
    'cameras.rtspLabel': 'RTSP URL (full URL can be pasted)',
    'cameras.showRtsp': 'Show RTSP URL',
    'cameras.transportLabel': 'RTSP transport',
    'cameras.credHint': 'Leave username/password blank if already embedded in the RTSP URL.',
    'cameras.userLabel': 'Username',
    'cameras.passLabel': 'Password',
    'cameras.vaultHint': 'Credentials are stored in the local encrypted Fernet vault.',
    'cameras.testBtn': 'Test connection',
    'cameras.saveBtn': 'Save & start monitoring ↗',
    'rules.eyebrow': '02 / UNDERSTAND & DESIGN',
    'rules.title': 'You describe it.<br>Cortex watches.',
    'rules.formTitle': 'New event rule',
    'rules.catalogLabel': 'Configuration library (22 Local + 6 Pro Tracking + 3 Access + 42 Vision AI)',
    'rules.cameraLabel': 'Camera',
    'rules.nameLabel': 'Rule name',
    'rules.promptLabel': 'When should we alert you?',
    'rules.sensitivityLabel': 'Measurement threshold',
    'rules.durationLabel': 'Verification duration (seconds)',
    'rules.roiSummary': 'Professional ROI Zone & Tripwire Studio',
    'rules.roiHint': 'Draw a new zone, drag inside to move, resize using the 8 handles, or apply one-click zone presets.',
    'rules.left': 'Left X (%)',
    'rules.top': 'Top Y (%)',
    'rules.width': 'Width W (%)',
    'rules.height': 'Height H (%)',
    'rules.startTime': 'Start',
    'rules.endTime': 'End',
    'rules.days': 'Active Days',
    'rules.scheduleHint': 'Uses local system clock. Equal start and end times monitor 24/7.',
    'rules.scoreLabel': 'Minimum model score',
    'rules.cooldownLabel': 'Cooldown interval (sec)',
    'rules.modelNotice': 'Model score is not calibrated probability. Detections require human review.',
    'rules.saveBtn': 'Enable rule ↗',
    'rules.resetBtn': 'New rule',
    'events.eyebrow': '03 / NOTIFY & SEARCH',
    'events.title': 'Event archive.',
    'events.subtitle': 'Search in natural language, inspect evidence clips, download SHA-256 forensic bundles.',
    'events.notifyBtn': 'Enable desktop notifications',
    'settings.eyebrow': '04 / WORKSPACE, OLLAMA VLM & CUSTOMER LICENSE',
    'settings.title': 'Settings & Membership Hub',
    'settings.engineTitle': 'Local Ollama Vision AI Engine',
    'settings.modelLabel': 'Active Ollama vision model name',
    'settings.installBtn': 'Install & connect selected model',
    'settings.cancelBtn': 'Cancel',
    'settings.testModelBtn': 'Check model connection',
    'settings.retentionLabel': 'Evidence retention (days)',
    'settings.retentionHint': 'Reducing retention deletes expired event records and video clips.',
    'settings.autostart': 'Automatically start saved cameras when Cortex launches',
    'settings.webhookTitle': 'Enterprise Webhook Channel (Slack / Discord / SIEM)',
    'settings.webhookLabel': 'HTTPS webhook URL',
    'settings.replaceWebhook': 'Update webhook setting (leave empty to disable)',
    'settings.webhookHint': 'Sends event payload over HTTPS JSON with optional HMAC-SHA256 signature.',
    'settings.saveBtn': 'Save settings',
    'footer.tagline': 'Local visual intelligence. Professional field analytics. Your control.'
  }
};

let currentLang = 'tr';

function applyLanguage(lang, persist = false) {
  currentLang = lang === 'en' ? 'en' : 'tr';
  document.documentElement.lang = currentLang;
  if (persist) {
    try { localStorage.setItem('ipscans-lang', currentLang); } catch (e) {}
  }
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
  const dict = I18N[currentLang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (dict[key]) el.innerHTML = dict[key];
  });
  updateCrumb(currentTab);
  renderPlans();
}

function initLanguage() {
  let saved = 'tr';
  try { saved = localStorage.getItem('ipscans-lang') || 'tr'; } catch (e) {}
  applyLanguage(saved, false);
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => applyLanguage(btn.dataset.lang, true));
  });
}

/* ==========================================================================
   Core UI Helpers & Navigation
   ========================================================================== */

function message(t) {
  $('#message').textContent = t;
  $('#message').hidden = false;
  setTimeout(() => $('#message').hidden = true, 7000);
}

async function api(path, data) {
  const headers = { 'Content-Type': 'application/json' };
  if (adminToken) headers['X-Admin-Token'] = adminToken;
  const r = await fetch('/api/' + path, data === undefined ? {} : {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });
  const j = await r.json();
  if (!r.ok) throw Error(j.error || 'Bağlantı kurulamadı');
  return j;
}

function empty(title, description, icon = 'CORTEX') {
  return `<div class="empty"><span class="symbol" aria-hidden="true">${esc(icon)}</span><h2>${title}</h2><p>${description}</p></div>`;
}

function updateCrumb(name) {
  if (name === 'plans') { $('#crumb').textContent = currentLang === 'en' ? 'Plans & usage' : 'Paketler ve kullanım'; return; }
  const labels = currentLang === 'en'
    ? { overview: 'Overview', cameras: 'Cameras', rules: 'Event rules', events: 'Event archive', settings: 'Settings & License', admin: 'Admin Control Panel' }
    : { overview: 'Genel bakış', cameras: 'Kameralar', rules: 'Olay kuralları', events: 'Olay arşivi', settings: 'Ayarlar & Lisans', admin: 'Yönetim Paneli' };
  const text = labels[name] || 'Cortex';
  if ($('#crumb')) $('#crumb').textContent = text;
  if ($('#pageTitle')) $('#pageTitle').textContent = text;
}

function closeMatrixWallModal() {
  matrixOpen = false;
  const m = $('#matrixWallModal');
  if (m) m.hidden = true;
}

function tab(name) {
  if (!document.getElementById(name)?.classList.contains('view')) return;
  window.scrollTo({top:0,behavior:'instant'});
  if (matrixOpen) closeMatrixWallModal();
  currentTab = name;
  document.querySelectorAll('.view').forEach(v => v.hidden = v.id !== name);
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  updateCrumb(name);
  renderPlans();
  if (name === 'overview') renderNvrWall();
  if (name === 'rules') updateROI();
  if (name === 'admin') refreshAdminPanel();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && matrixOpen) {
    closeMatrixWallModal();
  }
});

document.addEventListener('click', async e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.action === 'open-ultra-upgrade') {
    if (matrixOpen) closeMatrixWallModal();
    tab('settings');
    const hub = $('#cortexPlansHub') || $('#accountMembershipCard');
    if (hub) hub.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if (b.dataset.action === 'dismiss-ultra-banner') {
    ultraBannerDismissed = true;
    const banner = $('#ultraUpgradeBanner');
    if (banner) banner.hidden = true;
    return;
  }
  if (b.dataset.watchOverview) {
    const cid = b.dataset.watchOverview;
    nvrFocusedCameraId = cid;
    tab('overview');
    renderNvrWall();
    const wallEl = $('#overviewCameras') || $('#cameraWall');
    if (wallEl) wallEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (b.dataset.tab) {
    if (matrixOpen) closeMatrixWallModal();
    return tab(b.dataset.tab);
  }
  if (b.dataset.edit) { editRule(b.dataset.edit); return; }
  if (b.dataset.nvrGrid) {
    setNvrGridLayout(b.dataset.nvrGrid, false);
    return;
  }
  if (b.dataset.nvrFocus) {
    const cid = b.dataset.nvrFocus;
    if (nvrGridLayout === 'grid-1x1' && nvrFocusedCameraId === cid) {
      setNvrGridLayout('grid-2x2', false);
    } else {
      nvrFocusedCameraId = cid;
      setNvrGridLayout('grid-1x1', false);
    }
    return;
  }
  if (b.dataset.nvrSnapshot) {
    const cid = b.dataset.nvrSnapshot;
    window.open(`/api/frame/${encodeURIComponent(cid)}?t=${Date.now()}`, '_blank', 'noopener');
    return;
  }
  if (b.dataset.nvrRoi) {
    const cid = b.dataset.nvrRoi;
    if (matrixOpen) closeMatrixWallModal();
    tab('rules');
    if ($('#cameraSelect')) {
      $('#cameraSelect').value = cid;
      updateROI();
    }
    const f = $('#ruleForm');
    if (f) f.scrollIntoView({ behavior: 'smooth', block: 'start' });
    message('Kamera ROI & Kural Çizim Stüdyosuna yüklendi.');
    return;
  }
  if (b.dataset.tgTestPhone) {
    const phone = b.dataset.tgTestPhone;
    b.disabled = true;
    try {
      const chatId = ($('#tgChatId')?.value || '').trim();
      const r = await api('telegram-test', { phone, chatId });
      message(r.message || `${phone} numarasına örnek Olay Öncesi Kare + MP4 Video test bildirimi gönderildi.`);
    } catch (err) {
      message(err.message);
    } finally {
      b.disabled = false;
    }
    return;
  }
  if (b.dataset.tgRemovePhone) {
    const phone = b.dataset.tgRemovePhone;
    b.disabled = true;
    try {
      const r = await api('telegram-remove-phone', { phone });
      const normDigits = phone.replace(/\D/g, '');
      localTelegramPhones = localTelegramPhones.filter(p => (p.phone || '').replace(/\D/g, '') !== normDigits);
      if (state?.telegram && Array.isArray(state.telegram.phones)) {
        state.telegram.phones = state.telegram.phones.filter(p => {
          const val = typeof p === 'string' ? p : (p.phone || p.phoneDisplay || '');
          return val.replace(/\D/g, '') !== normDigits;
        });
      }
      renderTelegramPhones();
      message(r.message || `${phone} numarası bildirim listesinden kaldırıldı.`);
      await refresh();
    } catch (err) {
      const normDigits = phone.replace(/\D/g, '');
      localTelegramPhones = localTelegramPhones.filter(p => (p.phone || '').replace(/\D/g, '') !== normDigits);
      renderTelegramPhones();
      message(err.message);
    } finally {
      b.disabled = false;
    }
    return;
  }
  if (b.dataset.heatmapToggle) {
    const cid = b.dataset.heatmapToggle;
    if (heatmapCameras.has(cid)) heatmapCameras.delete(cid);
    else heatmapCameras.add(cid);
    refresh();
    return;
  }
  if (b.dataset.privacyMask) {
    const cid = b.dataset.privacyMask;
    const cam = state?.cameras.find(c => c.id === cid);
    if (!cam) return;
    const existing = cam.privacyMasks || [];
    if (existing.length) {
      if (!confirm(`${cam.name} üzerindeki ${existing.length} KVKK gizlilik maskesi kaldırılsın mı?`)) return;
      try {
        await api('camera-privacy', { id: cid, masks: [] });
        message('Gizlilik maskeleri kaldırıldı.');
        await refresh();
      } catch (err) { message(err.message); }
    } else {
      const coords = prompt('KVKK Gizlilik Maskesi (Sol%, Üst%, Genişlik%, Yükseklik%):', '0,0,25,25');
      if (!coords) return;
      const [x, y, width, height] = coords.split(',').map(v => Number(v.trim()));
      try {
        await api('camera-privacy', { id: cid, masks: [{ x, y, width, height, mode: 'blur' }] });
        message('KVKK bulanıklaştırma maskesi eklendi.');
        await refresh();
      } catch (err) { message(err.message); }
    }
    return;
  }
  if (b.dataset.sectorPack) {
    const packId = b.dataset.sectorPack;
    const cid = $('#sectorCameraSelect')?.value || (state?.cameras.length > 1 ? 'ALL' : state?.cameras[0]?.id);
    if (!cid) return message('Önce bir kamera ekleyin ve seçin.');
    const mode = $('#sectorDeployMode')?.value || 'merge';
    const selectedSet = sectorSelections[packId];
    const rules = selectedSet ? Array.from(selectedSet) : undefined;
    b.disabled = true;
    try {
      const res = await api('sector-apply', { camera: cid, pack: packId, mode, rules });
      message(res.message);
      await refresh();
    } catch (err) {
      message(err.message);
    } finally {
      b.disabled = false;
    }
    return;
  }
  if (b.dataset.sectorPreviewRule) {
    const [packId, ruleIdxStr] = b.dataset.sectorPreviewRule.split(':');
    const pack = state?.sectorPacks?.find(p => p.id === packId);
    const tmpl = pack?.rules?.[Number(ruleIdxStr)];
    if (!tmpl) return;
    tab('rules');
    loadSectorRuleIntoStudio(tmpl);
    message(`"${tmpl.name}" kuralı ve kalibre edilmiş ROI bölgesi çizim stüdyosuna yüklendi.`);
    return;
  }
  if (b.dataset.sectorSelectAll) {
    const packId = b.dataset.sectorSelectAll;
    const pack = state?.sectorPacks?.find(p => p.id === packId);
    if (!pack) return;
    const set = sectorSelections[packId] || new Set(pack.rules.map((_, i) => i));
    if (set.size === pack.rules.length) {
      sectorSelections[packId] = new Set([0]);
    } else {
      sectorSelections[packId] = new Set(pack.rules.map((_, i) => i));
    }
    renderSectorPacks(true);
    return;
  }
  if (b.dataset.tgSim) {
    const cmd = b.dataset.tgSim;
    const out = $('#telegramSimOutput');
    if (out) out.textContent = `Komut işleniyor: ${cmd} …`;
    try {
      const r = await api('telegram-simulate', { command: cmd });
      if (out) {
        out.textContent = `>>> KULLANICI KOMUTU: ${r.command}\n\n${r.reply}${r.hasPhoto ? '\n\n[Anlık JPEG kamera karesi eklendi]' : ''}`;
      }
      await refresh();
    } catch (err) {
      if (out) out.textContent = err.message;
    }
    return;
  }
  if (b.dataset.adminAction) {
    const action = b.dataset.adminAction;
    const customerId = b.dataset.customer || 'node-local-primary';
    const plan = b.dataset.plan || 'ULTRA';
    b.disabled = true;
    try {
      const r = await api('admin/action', { adminToken, action, customerId, plan });
      const out = $('#admActionOutput');
      if (out) out.textContent = `[${new Date().toLocaleTimeString('tr-TR')}] ${r.message}`;
      message(r.message);
      await refreshAdminPanel();
      await refresh();
    } catch (err) {
      message(err.message);
    } finally {
      b.disabled = false;
    }
    return;
  }
  if (b.dataset.copyLicense) {
    const key = b.dataset.copyLicense;
    const org = b.dataset.org || 'Kurumsal Müşteri';
    try {
      await navigator.clipboard.writeText(key);
      message(`Lisans anahtarı kopyalandı: ${key}`);
    } catch (err) {
      message(`Anahtar: ${key}`);
    }
    if ($('#licenseKeyInput')) $('#licenseKeyInput').value = key;
    const orgInput = $('#licenseActivateForm')?.elements?.organization;
    if (orgInput) orgInput.value = org;
    return;
  }
  if (b.classList.contains('chip-query')) {
    $('#copilotQuery').value = b.dataset.query || '';
    renderEventsList();
    return;
  }
  if (b.dataset.action) {
    if (b.dataset.action.endsWith('-delete') && !confirm('Bu kaydı silmek istiyor musunuz? Kamera silinirse bağlı kurallar da silinir; olay arşivi korunur.')) return;
    b.disabled = true;
    try {
      const res = await api(b.dataset.action, { id: b.dataset.id });
      if (res && res.message) message(res.message);
      await refresh();
    } catch (e) {
      message(e.message);
    } finally {
      b.disabled = false;
    }
  }
});

document.addEventListener('change', e => {
  const cb = e.target.closest('input[data-sector-rule-check]');
  if (!cb) return;
  const [packId, idxStr] = cb.dataset.sectorRuleCheck.split(':');
  const idx = Number(idxStr);
  const pack = state?.sectorPacks?.find(p => p.id === packId);
  if (!pack) return;
  if (!sectorSelections[packId]) {
    sectorSelections[packId] = new Set(pack.rules.map((_, i) => i));
  }
  if (cb.checked) sectorSelections[packId].add(idx);
  else sectorSelections[packId].delete(idx);
  const btn = document.querySelector(`button[data-sector-pack="${packId}"]`);
  if (btn) {
    const count = sectorSelections[packId].size;
    btn.textContent = count ? `Seçili ${count} kuralı kur ↗` : 'En az 1 kural seçin';
    btn.disabled = count === 0;
  }
});

/* ==========================================================================
   Camera Inventory Status List, Bespoke Sector SVGs & Analytics
   ========================================================================== */

function camera(c, idx = 0) {
  const isOnline = c.status === 'Bağlı';
  const isPaused = c.status === 'Durduruldu';
  const chCode = `CH-${String(idx + 1).padStart(2, '0')}`;
  const protoLabel = `RTSP/${String(c.transport || 'tcp').toUpperCase()} · H.264/MJPEG`;
  const masksCount = (c.privacyMasks || []).length;
  const camRulesCount = (state?.rules || []).filter(r => r.camera === c.id && r.enabled).length;
  const infSeconds = (Number(c.inferenceMs || 0) / 1000).toFixed(1);
  const hasPermit = Number(c.permitRemainingSeconds || 0) > 0 || Boolean(c.permitActive);

  let statusPillHtml = '';
  if (isOnline) {
    statusPillHtml = `<span class="status-pill online" data-cam-status>🟢 Çevrimiçi (Online)</span>`;
  } else if (isPaused) {
    statusPillHtml = `<span class="status-pill paused" data-cam-status>⏸ Durduruldu</span>`;
  } else {
    statusPillHtml = `<span class="status-pill offline" data-cam-status>🔴 Bağlantı Yok (${esc(c.status || 'Çevrimdışı')})</span>`;
  }

  return `<article class="card camera-card inventory-mode camera-list-row" data-camera-id="${esc(c.id)}">
    <div class="camera-row-main">
      <div class="camera-row-identity">
        <span class="camera-ch-badge">${chCode}</span>
        <div class="camera-row-title-group">
          <h2>${esc(c.name)}</h2>
          <span class="camera-row-proto mono">${esc(protoLabel)}</span>
        </div>
      </div>
      <div class="actions" style="margin:0;gap:8px">
        ${statusPillHtml}
      </div>
    </div>

    <div class="camera-row-telemetry">
      <div class="camera-row-chips">
        <span class="tag ${camRulesCount > 0 ? 'ok' : ''}" data-cam-rules-badge>${camRulesCount} Etkin Kural</span>
        <span class="tag" data-cam-analysis>Durum: ${esc(c.analysis || 'Hazır')}</span>
        <span class="tag mono" data-cam-inference>AI: ${infSeconds}sn</span>
        <span class="tag ${masksCount > 0 ? 'ok' : ''}" data-cam-masks>KVKK: ${masksCount}</span>
        ${hasPermit ? `<span class="tag warn" data-cam-permit>Geçici İzin Aktif</span>` : ''}
      </div>
      <div class="camera-row-actions">
        <button type="button" data-action="toggle" data-id="${esc(c.id)}" class="${isPaused ? 'primary' : ''}">${isPaused ? 'Başlat' : 'Durdur'}</button>
        <button type="button" data-nvr-roi="${esc(c.id)}">ROI &amp; Kural</button>
        <button type="button" data-action="access-permit" data-id="${esc(c.id)}">15sn İzin</button>
        <button type="button" data-privacy-mask="${esc(c.id)}">KVKK Maske</button>
        <button type="button" data-watch-overview="${esc(c.id)}" class="primary">Genel Bakışta İzle ↗</button>
        <button type="button" data-action="camera-delete" data-id="${esc(c.id)}">Sil</button>
      </div>
    </div>
  </article>`;
}

function renderCameraListSmooth() {
  const listEl = $('#cameraList');
  if (!listEl || !state) return;
  const dict = I18N[currentLang] || I18N.tr;
  const cams = state.cameras || [];
  if (!cams.length) {
    setHtmlIfChanged(listEl, empty(dict['empty.camerasTitle'], dict['empty.camerasDesc'], 'RTSP'), 'empty:' + currentLang);
    return;
  }
  const onlineCount = cams.filter(c => c.status === 'Bağlı').length;
  const offlineOrPausedCount = cams.length - onlineCount;
  const rulesByCam = cams.map(c => (state.rules || []).filter(r => r.camera === c.id && r.enabled).length);

  const structKey = JSON.stringify([
    currentLang,
    cams.map((c, idx) => [
      c.id,
      c.name,
      c.status,
      c.transport,
      c.analysis,
      c.inferenceMs,
      (c.privacyMasks || []).length,
      c.permitRemainingSeconds,
      rulesByCam[idx]
    ])
  ]);

  const headerHtml = `<div class="camera-inventory-header">
    <div class="camera-inventory-metrics">
      <span class="tag mono">Toplam: <strong>${cams.length} Kamera</strong></span>
      <span class="tag ok mono">Çevrimiçi: <strong>${onlineCount}</strong></span>
      <span class="tag ${offlineOrPausedCount > 0 ? 'warn' : ''} mono">Çevrimdışı/Durdurulan: <strong>${offlineOrPausedCount}</strong></span>
    </div>
    <span class="camera-inventory-note">Canlı video akışları yalnızca Genel Bakış (NVR Duvarı) ekranında oynatılır</span>
  </div>`;

  const fullHtml = headerHtml + cams.map((c, idx) => camera(c, idx)).join('');
  setHtmlIfChanged(listEl, fullHtml, structKey);
}

function getSectorIconSvg(packId) {
  switch (packId) {
    case 'site':
      // Twin modern residential towers with glass facade lines & security arch
      return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="8" height="17" rx="1.2" fill="currentColor" fill-opacity="0.16"/>
        <rect x="13" y="7" width="8" height="14" rx="1.2" fill="currentColor" fill-opacity="0.08"/>
        <path d="M5.5 7.5h3M5.5 11h3M5.5 14.5h3M15.5 10.5h3M15.5 14h3"/>
        <path d="M2 21h20M9 21v-3a3 3 0 0 1 6 0v3"/>
      </svg>`;
    case 'pool':
      // Contained water waves with perimeter safety ring/shield
      return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity="0.14"/>
        <path d="M7 13.2c1.2-1.1 2.5-1.1 3.7 0s2.5 1.1 3.7 0 2.5-1.1 2.6 0"/>
        <path d="M7 16.5c1.2-1.1 2.5-1.1 3.7 0s2.5 1.1 3.7 0 2.5-1.1 2.6 0"/>
        <path d="M9.5 6.5v3.5M14.5 6.5v3.5M9.5 8.2h5"/>
      </svg>`;
    case 'factory':
      // Industrial sawtooth factory silhouette + safety hard-hat/gear emblem
      return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 20V9l5 3V9l5 3V6h8v14H3z" fill="currentColor" fill-opacity="0.15"/>
        <circle cx="16.5" cy="13.5" r="2.3"/>
        <path d="M7 16h3M16.5 10v1.2M16.5 15.8V17"/>
      </svg>`;
    case 'warehouse':
      // Isometric 3D logistics cube / warehouse portal with pallet grid
      return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 3l8.5 4.8v8.4L12 21l-8.5-4.8V7.8L12 3z" fill="currentColor" fill-opacity="0.14"/>
        <path d="M3.5 7.8L12 12.6l8.5-4.8M12 12.6V21"/>
        <path d="M7.8 5.4l8.5 4.8"/>
      </svg>`;
    case 'retail':
      // Modern storefront/mall facade with luxury shopping bag arch & sensor node
      return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M5 7h14l1.5 13H3.5L5 7z" fill="currentColor" fill-opacity="0.14"/>
        <path d="M8.5 7V5.8a3.5 3.5 0 0 1 7 0V7"/>
        <circle cx="12" cy="13.5" r="2.2"/>
        <path d="M9 17.5h6"/>
      </svg>`;
    case 'office':
      // Corporate high-rise plaza tower with skybridge & smart access badge
      return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="6" y="3" width="12" height="18" rx="1.5" fill="currentColor" fill-opacity="0.15"/>
        <path d="M9.5 7h5M9.5 10.5h5M9.5 14h5"/>
        <path d="M10 21v-3.5h4V21M3 21h18"/>
      </svg>`;
    case 'campus':
      // Academic graduation cap / campus quadrangle emblem
      return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 4L2.5 9 12 14l9.5-5L12 4z" fill="currentColor" fill-opacity="0.16"/>
        <path d="M6 11v5.2c0 1.8 2.7 3.3 6 3.3s6-1.5 6-3.3V11"/>
        <path d="M21.5 9v6.5"/>
      </svg>`;
    case 'clinic':
    default:
      // Precision medical shield + cross + ECG pulse line
      return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 3l7.5 3.2v5.6c0 5-3.2 8.2-7.5 9.7-4.3-1.5-7.5-4.7-7.5-9.7V6.2L12 3z" fill="currentColor" fill-opacity="0.15"/>
        <path d="M12 8.2v6.6M8.7 11.5h6.6"/>
      </svg>`;
  }
}

let lastSectorPackKey = '';
function renderSectorPacks(force = false) {
  const grid = $('#sectorPackGrid');
  if (!grid || !state?.sectorPacks) return;
  const sel = $('#sectorCameraSelect');
  if (sel && document.activeElement !== sel) {
    const camSelKey = JSON.stringify((state.cameras || []).map(c => [c.id, c.name]));
    if (sel.dataset.renderKey !== camSelKey) {
      const prev = sel.value;
      const camOptions = state.cameras.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
      const allOption = state.cameras.length > 1
        ? `<option value="ALL">Tüm Kameralara Uygula (${state.cameras.length} Kamera)</option>`
        : '';
      sel.innerHTML = state.cameras.length
        ? allOption + camOptions
        : '<option value="">Önce kamera ekleyin</option>';
      sel.dataset.renderKey = camSelKey;
      if (prev && (prev === 'ALL' || state.cameras.some(c => c.id === prev))) {
        sel.value = prev;
      }
    }
  }

  const activeNames = new Set((state.rules || []).filter(r => r.enabled).map(r => r.name));
  const renderKey = JSON.stringify([
    state.sectorPacks.map(p => p.id),
    Array.from(activeNames),
    state.cameras.length
  ]);
  if (!force && lastSectorPackKey === renderKey) return;
  lastSectorPackKey = renderKey;

  grid.innerHTML = state.sectorPacks.map(p => {
    if (!sectorSelections[p.id]) {
      sectorSelections[p.id] = new Set(p.rules.map((_, i) => i));
    }
    const selSet = sectorSelections[p.id];
    const deployedCount = p.rules.filter(r => activeNames.has(r.name)).length;
    const tierBadge = p.tier || 'PLUS';
    return `
      <article class="sector-card sector-pack-card ${deployedCount > 0 ? 'sector-active' : ''}">
        <div>
          <div class="sector-head">
            <span class="sector-icon" data-sector-theme="${esc(p.id)}">${getSectorIconSvg(p.id)}</span>
            <div class="sector-head-meta">
              <div class="sector-badges">
                <span class="tag ${tierBadge === 'PRO' ? '' : tierBadge === 'PLUS' ? 'ok' : 'warn'}">${esc(tierBadge)}</span>
                ${deployedCount > 0
                  ? `<span class="tag ok">${deployedCount}/${p.rules.length} AKTİF</span>`
                  : `<span class="tag">${p.rules.length} KURAL</span>`}
              </div>
              <h3>${esc(p.name)}</h3>
            </div>
          </div>
          <p class="fine sector-summary">${esc(p.summary)}</p>
          <div class="sector-rules-list">
            <div class="sector-rules-bar">
              <span>Paketteki Kurallar</span>
              <button type="button" class="sector-mini-btn" data-sector-select-all="${esc(p.id)}">Tümünü Seç/Bırak</button>
            </div>
            ${p.rules.map((r, idx) => {
              const isDep = activeNames.has(r.name);
              const checked = selSet.has(idx);
              return `
                <div class="sector-rule-item ${isDep ? 'is-deployed' : ''}">
                  <label class="sector-rule-check">
                    <input type="checkbox" data-sector-rule-check="${esc(p.id)}:${idx}" ${checked ? 'checked' : ''}>
                    <span class="sector-rule-name">${esc(r.name)}</span>
                  </label>
                  <div class="sector-rule-pills">
                    <span class="sector-pill">${esc(r.categoryBadge || r.kind)}</span>
                    <button type="button" class="sector-preview-btn" data-sector-preview-rule="${esc(p.id)}:${idx}" title="Bu kuralı ve bölgeyi çizim stüdyosunda aç">ROI</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        <div class="sector-foot">
          <button type="button" class="primary sector-apply-btn" data-sector-pack="${esc(p.id)}">Seçili ${selSet.size} kuralı kur ↗</button>
        </div>
      </article>
    `;
  }).join('');
}

function loadSectorRuleIntoStudio(tmpl) {
  const f = $('#ruleForm');
  if (!f) return;
  const tplValue = tmpl.kind === 'vision' ? (tmpl.visionTemplate || 'custom') : tmpl.kind;
  if ($('#ruleTemplate')) {
    $('#ruleTemplate').value = tplValue;
    chooseTemplate();
  }
  f.elements.id.value = '';
  f.elements.name.value = tmpl.name || '';
  f.elements.prompt.value = tmpl.prompt || '';
  if (tmpl.sensitivity !== undefined && f.elements.sensitivity) f.elements.sensitivity.value = tmpl.sensitivity;
  if (tmpl.duration !== undefined && f.elements.duration) f.elements.duration.value = tmpl.duration;
  if (tmpl.cooldown !== undefined && f.elements.cooldown) f.elements.cooldown.value = tmpl.cooldown;
  if (tmpl.threshold !== undefined && f.elements.threshold) f.elements.threshold.value = tmpl.threshold;
  if (tmpl.axis && f.elements.axis) f.elements.axis.value = tmpl.axis;
  if (tmpl.direction && f.elements.direction) f.elements.direction.value = tmpl.direction;
  if (tmpl.line !== undefined && f.elements.line) f.elements.line.value = tmpl.line;
  if (tmpl.margin !== undefined && f.elements.margin) f.elements.margin.value = tmpl.margin;
  const roi = tmpl.roi || [0, 0, 100, 100];
  ['x', 'y', 'width', 'height'].forEach((k, i) => {
    if (f.elements[k]) f.elements[k].value = roi[i];
  });
  f.elements.start.value = tmpl.start || '00:00';
  f.elements.end.value = tmpl.end || '00:00';
  if (!f.elements.camera.value && state?.cameras?.[0]) {
    f.elements.camera.value = state.cameras[0].id;
  }
  updateROI();
  f.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderAnalytics() {
  const a = state?.analytics;
  if (!a) return;
  const latBadge = $('#avgLatencyBadge');
  if (latBadge) {
    latBadge.hidden = !a.avgLatencyMs;
    if (a.avgLatencyMs) {
      latBadge.textContent = `Ort. AI yanıtı: ${(a.avgLatencyMs / 1000).toFixed(1)} sn`;
    }
  }
  const chart = $('#hourlyChart');
  if (chart && Array.isArray(a.hourly24h)) {
    const maxVal = Math.max(1, ...a.hourly24h);
    const chartHtml = a.hourly24h.map((val, idx) => {
      const pct = Math.max(6, Math.round((val / maxVal) * 100));
      const hourLabel = `${23 - idx}s`;
      return `<div class="bar-col" title="${hourLabel} önce: ${val} olay">
        <div class="bar-fill ${val > 0 ? 'has-val' : ''}" style="height:${pct}%"></div>
        <span class="bar-lbl">${idx % 4 === 0 ? hourLabel : ''}</span>
      </div>`;
    }).join('');
    setHtmlIfChanged(chart, chartHtml, JSON.stringify(a.hourly24h));
  }
  const catBox = $('#categoryBreakdown');
  if (catBox && a.byCategory) {
    const catHtml = Object.entries(a.byCategory).map(([k, v]) => `<span class="tag">${esc(k)}: <strong>${v}</strong></span>`).join('');
    setHtmlIfChanged(catBox, catHtml, JSON.stringify(a.byCategory));
  }
}

function syncLoginGate() {
  const gate = $('#cortexLoginGate');
  if (!gate) return true;
  let sessionLogged = false;
  try {
    sessionLogged = sessionStorage.getItem('cortex_logged_in') === '1';
  } catch (e) {}

  const serverAuth = state?.auth?.authenticated;
  if (serverAuth === true) {
    sessionLogged = true;
    try { sessionStorage.setItem('cortex_logged_in', '1'); } catch (e) {}
    gate.hidden = true;
  } else if (serverAuth === false) {
    sessionLogged = false;
    try { sessionStorage.removeItem('cortex_logged_in'); } catch (e) {}
    gate.hidden = false;
  } else {
    gate.hidden = sessionLogged;
  }
  syncSignalFieldRunning();

  const userObj = state?.auth?.user || {};
  const org = userObj.organization || state?.license?.organization || 'Kurumsal Saha';
  const plan = (userObj.plan || state?.license?.plan || 'PRO').toUpperCase();
  const uname = userObj.username ? `@${userObj.username} · ` : '';
  const activeBadge = $('#activeUserBadge');
  if (activeBadge) {
    activeBadge.textContent = `${uname}${org} (${plan})`;
  }
  return sessionLogged;
}

function formatNvrTimestamp(d = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} | ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function updateNvrClocks() {
  const gate = $('#cortexLoginGate');
  if (gate && !gate.hidden) return;
  const str = formatNvrTimestamp();
  if ($('#nvrLiveClock')) $('#nvrLiveClock').textContent = str;
  if ($('#matrixLiveClock')) $('#matrixLiveClock').textContent = str;
  const shortStr = str.split('|')[1]?.trim() || str;
  document.querySelectorAll('.nvr-osd-clock').forEach(el => {
    el.textContent = shortStr;
  });
}

function setNvrGridLayout(layout, fromTour = false) {
  if (!fromTour && nvrAutoTourActive) {
    nvrAutoTourActive = false;
    if (nvrAutoTourTimer) {
      clearInterval(nvrAutoTourTimer);
      nvrAutoTourTimer = null;
    }
    const tourBtn = $('#nvrAutoTourBtn');
    if (tourBtn) {
      tourBtn.classList.remove('active');
      tourBtn.textContent = 'Otomatik Tur';
    }
  }
  const allowed = ['grid-1x1', 'grid-2x2', 'grid-1plus5', 'grid-3x3', 'grid-4x4'];
  nvrGridLayout = allowed.includes(layout) ? layout : 'grid-2x2';
  document.querySelectorAll('[data-nvr-grid]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.nvrGrid === nvrGridLayout);
  });
  const wall = $('#cameraWall');
  if (wall) {
    wall.className = `nvr-wall-grid ${nvrGridLayout}`;
  }
  const matrixGrid = $('#matrixWallGrid');
  if (matrixGrid) {
    matrixGrid.className = `nvr-wall-grid wall-grid ${nvrGridLayout}`;
  }
  renderNvrWall();
  renderMatrixWall();
}

function toggleNvrAutoTour() {
  nvrAutoTourActive = !nvrAutoTourActive;
  const btn = $('#nvrAutoTourBtn');
  if (btn) {
    btn.classList.toggle('active', nvrAutoTourActive);
    btn.textContent = nvrAutoTourActive ? 'Otomatik Tur: AÇIK' : 'Otomatik Tur';
  }
  if (nvrAutoTourTimer) {
    clearInterval(nvrAutoTourTimer);
    nvrAutoTourTimer = null;
  }
  if (nvrAutoTourActive) {
    const cams = state?.cameras || [];
    if (cams.length > 0) {
      nvrTourIndex = 0;
      nvrFocusedCameraId = cams[0].id;
    }
    setNvrGridLayout('grid-1x1', true);
    nvrAutoTourTimer = setInterval(() => {
      const list = state?.cameras || [];
      if (!list.length) return;
      nvrTourIndex = (nvrTourIndex + 1) % list.length;
      nvrFocusedCameraId = list[nvrTourIndex].id;
      renderNvrWall();
      renderMatrixWall();
    }, 6000);
  }
}

function getSlotCountForLayout(layout, camCount) {
  if (layout === 'grid-1x1') return Math.max(1, camCount);
  if (layout === 'grid-1plus5') return Math.max(6, camCount);
  if (layout === 'grid-3x3') return Math.max(9, camCount);
  if (layout === 'grid-4x4') return Math.max(16, camCount);
  return Math.max(4, camCount); // grid-2x2 default
}

function getOrderedNvrCameras() {
  const allCameras = state?.cameras || [];
  let orderedCameras = [...allCameras];
  if (nvrFocusedCameraId && orderedCameras.some(c => c.id === nvrFocusedCameraId)) {
    const focused = orderedCameras.find(c => c.id === nvrFocusedCameraId);
    orderedCameras = [focused, ...orderedCameras.filter(c => c.id !== nvrFocusedCameraId)];
  }
  return orderedCameras;
}

function computeNvrStructureKey(forMatrix = false) {
  const orderedCameras = getOrderedNvrCameras();
  const slotCount = getSlotCountForLayout(nvrGridLayout, orderedCameras.length);
  return JSON.stringify({
    layout: nvrGridLayout,
    focused: nvrFocusedCameraId,
    slotCount,
    lang: currentLang,
    matrixHeat: forMatrix ? matrixHeatmap : false,
    cams: orderedCameras.map(c => [
      c.id,
      c.name,
      c.status,
      forMatrix ? (matrixHeatmap || heatmapCameras.has(c.id)) : heatmapCameras.has(c.id)
    ])
  });
}

function buildNvrCellsHtml(forMatrix = false) {
  const orderedCameras = getOrderedNvrCameras();
  const slotCount = getSlotCountForLayout(nvrGridLayout, orderedCameras.length);
  const nowTs = Date.now();
  const timeShort = formatNvrTimestamp().split('|')[1]?.trim() || '00:00:00';

  const cells = [];
  for (let i = 0; i < slotCount; i++) {
    const c = orderedCameras[i];
    const chNum = String(i + 1).padStart(2, '0');
    const chTag = `CH-${chNum}`;
    const isVip = (nvrGridLayout === 'grid-1plus5' && i === 0) || (nvrGridLayout === 'grid-1x1' && i === 0);

    if (c) {
      const isOnline = c.status === 'Bağlı';
      const showHeat = forMatrix ? (matrixHeatmap || heatmapCameras.has(c.id)) : heatmapCameras.has(c.id);
      const camRulesCount = (state?.rules || []).filter(r => r.camera === c.id && r.enabled).length;

      cells.push(`<article class="nvr-cell card camera-card ${isOnline ? 'is-online' : 'is-standby'} ${isVip ? 'nvr-cell-vip' : ''}" data-camera-id="${esc(c.id)}">
        <div class="nvr-monitor">
          <span class="nvr-hud-corner tl"></span>
          <span class="nvr-hud-corner tr"></span>
          <span class="nvr-hud-corner bl"></span>
          <span class="nvr-hud-corner br"></span>

          <div class="nvr-osd-top">
            <div class="nvr-osd-left">
              <span class="dot ${isOnline ? '' : 'offline'}"></span>
              <span class="nvr-ch-tag">${chTag}</span>
              <strong class="nvr-cam-title">${esc(c.name)}</strong>
            </div>
            <div class="nvr-osd-right">
              <span class="nvr-osd-pill" data-nvr-rules>${camRulesCount} Kural</span>
              <span class="nvr-osd-clock mono">${timeShort}</span>
            </div>
          </div>

          ${isOnline
            ? `<div class="camera-stage nvr-stage">
                <img class="cameraimg" src="/api/frame/${c.id}?t=${nowTs}" alt="${esc(c.name)} güncel görüntüsü">
                ${showHeat ? `<img class="heatmap-overlay" src="/api/heatmap/${c.id}?t=${nowTs}" alt="Canlı ısı haritası">` : ''}
              </div>`
            : `<div class="nvr-no-signal">
                <div class="nvr-no-signal-inner">
                  <button type="button" data-action="toggle" data-id="${c.id}" class="primary">İzlemeyi Başlat</button>
                </div>
              </div>`}

          <div class="nvr-osd-bottom" ${isOnline ? '' : 'hidden'}>
            <span class="nvr-analysis-line" data-nvr-analysis>${esc(c.analysis || '')}</span>
            <span data-nvr-status hidden>${esc(c.status)}</span>
          </div>
        </div>

        <div class="nvr-dock">
          <button type="button" data-action="toggle" data-id="${c.id}" class="nvr-dock-btn ${c.status === 'Durduruldu' ? 'primary' : ''}" title="${c.status === 'Durduruldu' ? 'İzlemeyi Başlat' : 'İzlemeyi Durdur'}">${c.status === 'Durduruldu' ? 'BAŞLAT' : 'DURDUR'}</button>
          <button type="button" data-nvr-focus="${c.id}" class="nvr-dock-btn ${nvrGridLayout === 'grid-1x1' && nvrFocusedCameraId === c.id ? 'active' : ''}">ODAK</button>
          <button type="button" data-nvr-snapshot="${c.id}" class="nvr-dock-btn">KARE</button>
          <button type="button" data-nvr-roi="${c.id}" class="nvr-dock-btn">ROI</button>
          <button type="button" data-heatmap-toggle="${c.id}" class="nvr-dock-btn ${showHeat ? 'active' : ''}">ISI</button>
          <button type="button" data-action="access-permit" data-id="${c.id}" class="nvr-dock-btn">İZİN</button>
          <button type="button" data-action="camera-delete" data-id="${c.id}" class="nvr-dock-btn nvr-dock-danger" title="Kamerayı Sil">SİL</button>
        </div>
      </article>`);
    } else {
      cells.push(`<article class="nvr-cell nvr-slot-empty ${isVip ? 'nvr-cell-vip' : ''}">
        <div class="nvr-monitor">
          <span class="nvr-hud-corner tl"></span>
          <span class="nvr-hud-corner tr"></span>
          <span class="nvr-hud-corner bl"></span>
          <span class="nvr-hud-corner br"></span>

          <div class="nvr-osd-top">
            <div class="nvr-osd-left">
              <span class="nvr-ch-tag">${chTag}</span>
            </div>
          </div>

          <div class="nvr-no-signal">
            <div class="nvr-no-signal-inner">
              <button type="button" class="nvr-add-slot-btn" data-tab="cameras">+ Kamera Ekle</button>
            </div>
          </div>
        </div>
      </article>`);
    }
  }
  return cells.join('');
}

function updateNvrContainerInPlace(containerEl) {
  if (!containerEl || !state) return;
  const nowTs = Date.now();
  const cams = state.cameras || [];
  for (const c of cams) {
    const cell = containerEl.querySelector(`[data-camera-id="${CSS.escape(c.id)}"]`);
    if (!cell) continue;
    const camRulesCount = (state.rules || []).filter(r => r.camera === c.id && r.enabled).length;
    const rulesEl = cell.querySelector('[data-nvr-rules]');
    if (rulesEl) rulesEl.textContent = `${camRulesCount} Kural`;
    const analysisEl = cell.querySelector('[data-nvr-analysis]');
    if (analysisEl) analysisEl.textContent = c.analysis || '';
    const statusEl = cell.querySelector('[data-nvr-status]');
    if (statusEl) statusEl.textContent = c.status;

    if (c.status === 'Bağlı') {
      const imgEl = cell.querySelector('img.cameraimg');
      if (imgEl) updateCameraImageSmooth(imgEl, `/api/frame/${c.id}?t=${nowTs}`);
      const heatEl = cell.querySelector('img.heatmap-overlay');
      if (heatEl) updateCameraImageSmooth(heatEl, `/api/heatmap/${c.id}?t=${nowTs}`);
    }
  }
}

function renderNvrWall() {
  if (!state) return;
  const cams = state.cameras || [];
  const onlineCount = cams.filter(c => c.status === 'Bağlı').length;
  const maxCams = state.license?.maxCameras || 32;
  const summaryEl = $('#nvrChannelSummary');
  if (summaryEl) {
    summaryEl.textContent = `${onlineCount} / ${maxCams} Kanal`;
  }
  updateNvrClocks();

  const wallEl = $('#cameraWall') || $('#overviewCameras');
  if (wallEl) {
    if (wallEl.id === 'cameraWall') {
      wallEl.className = `nvr-wall-grid ${nvrGridLayout}`;
    }
    const structKey = computeNvrStructureKey(false);
    if (wallEl.dataset.renderKey !== structKey) {
      wallEl.dataset.renderKey = structKey;
      wallEl.innerHTML = buildNvrCellsHtml(false);
    } else if (currentTab === 'overview') {
      updateNvrContainerInPlace(wallEl);
    }
  }
  renderNvrEventTicker();
}

function renderNvrEventTicker() {
  const ticker = $('#nvrEventTicker');
  if (!ticker || !state) return;
  const events = (state.events || []).slice(0, 6);
  const tickerKey = JSON.stringify([
    (state.events || []).length,
    events.map(e => [e.id, e.camera, e.rule, e.snapshot, e.clip, e.observedAt || e.time])
  ]);
  if (!events.length) {
    const emptyHtml = `
      <span class="nvr-ticker-label">SON OLAYLAR</span>
      <div class="nvr-ticker-items">
        <span class="nvr-ticker-empty">Henüz kayıtlı olay yok.</span>
      </div>`;
    setHtmlIfChanged(ticker, emptyHtml, tickerKey);
    return;
  }
  const html = `
    <span class="nvr-ticker-label">SON OLAYLAR (${state.events.length})</span>
    <div class="nvr-ticker-items">
      ${events.map(e => {
        const ts = new Date((e.observedAt || e.time) * 1000).toLocaleTimeString('tr-TR');
        return `<div class="nvr-ticker-item">
          <span class="nvr-ticker-time mono">${esc(ts)}</span>
          <strong>${esc(e.camera)} · ${esc(e.rule)}</strong>
          ${e.snapshot ? `<a target="_blank" href="/api/evidence/${e.id}/00.jpg" class="nvr-ticker-link">KARE</a>` : ''}
          ${e.clip ? `<a target="_blank" href="/api/evidence/${e.id}/clip.mp4" class="nvr-ticker-link">MP4 VİDEO</a>` : ''}
        </div>`;
      }).join('')}
    </div>`;
  setHtmlIfChanged(ticker, html, tickerKey);
}

function renderUltraUpgradeBanner() {
  const banner = $('#ultraUpgradeBanner');
  if (!banner || !state) return;
  const plan = (state.license?.plan || state.auth?.user?.plan || 'PRO').toUpperCase();
  if ((plan !== 'PRO' && plan !== 'PLUS') || ultraBannerDismissed) {
    banner.hidden = true;
    return;
  }
  banner.hidden = false;

  const lic = state.license || {};
  const maxCams = lic.maxCameras || (plan === 'PLUS' ? 12 : 4);
  const maxRules = lic.maxRules || (plan === 'PLUS' ? 32 : 8);
  const maxPhones = state.telegram?.maxPhones || lic.maxPhones || (plan === 'PLUS' ? 5 : 2);

  const html = `
    <div class="ultra-top-left">
      <span class="ultra-top-badge mono">
        <span class="ultra-top-pulse" aria-hidden="true"></span>
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M8 1.5L14 8L8 14.5L2 8L8 1.5Z"/>
        </svg>
        <span>CORTEX ULTRA</span>
      </span>
      <span class="ultra-top-plan mono">${esc(plan)} PAKETİ</span>
      <span class="ultra-top-sep" aria-hidden="true"></span>
      <span class="ultra-top-copy">Kurumsal <strong>ULTRA</strong> pakete geçerek tüm saha sınırlarını kaldırın:</span>
    </div>

    <div class="ultra-top-pills" role="list" aria-label="ULTRA Paket Ayrıcalıkları">
      <span class="ultra-top-pill" role="listitem"><b>32</b> Kamera <em>+${Math.max(0, 32 - maxCams)}</em></span>
      <span class="ultra-top-pill" role="listitem"><b>128</b> AI Kuralı <em>+${Math.max(0, 128 - maxRules)}</em></span>
      <span class="ultra-top-pill" role="listitem"><b>10</b> Telegram <em>+${Math.max(0, 10 - maxPhones)}</em></span>
      <span class="ultra-top-pill" role="listitem"><b>8</b> Sektör Paketi</span>
      <span class="ultra-top-pill" role="listitem"><b>30 Gün</b> Arşiv</span>
    </div>

    <div class="ultra-top-actions">
      <button type="button" class="ultra-top-cta" data-action="open-ultra-upgrade">
        <span>ULTRA'ya Yükselt</span>
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12L12 4M6 4h6v6"/></svg>
      </button>
      <button type="button" class="ultra-top-close" data-action="dismiss-ultra-banner" aria-label="Üst bildirimi kapat" title="Gizle">
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>
      </button>
    </div>
  `;
  setHtmlIfChanged(banner, html, `${plan}:${maxCams}:${maxRules}:${maxPhones}:${currentLang}:top-v2`);
}

function renderLicenseAndAudit() {
  if (!state) return;
  const lic = state.license || {};
  const userObj = state.auth?.user || {};
  const plan = (lic.plan || userObj.plan || 'PRO').toUpperCase();
  const org = userObj.organization || lic.organization || 'Kurumsal Saha';
  const username = userObj.username || 'yerel-istasyon';
  const email = userObj.email || lic.contact || 'Kurumsal İletişim Tanımlı';
  const licKeyStr = lic.key || 'IPS-' + plan + '-LOCAL';

  const badge = $('#licenseBadge');
  if (badge && lic.badge) {
    setHtmlIfChanged(badge, `<span>${esc(lic.badge)}</span> <i class="dot"></i>`, lic.badge);
  }
  const headerTag = $('#membershipTierHeaderTag');
  if (headerTag) {
    headerTag.className = 'tag mono ' + (plan === 'ULTRA' ? 'warn' : plan === 'PLUS' ? 'ok' : '');
    headerTag.textContent = `AKTİF PAKET: CORTEX ${plan}`;
  }
  const quotaBadge = $('#quotaTierBadge');
  if (quotaBadge) {
    quotaBadge.className = 'tag mono ' + (plan === 'ULTRA' ? 'warn' : plan === 'PLUS' ? 'ok' : '');
    quotaBadge.textContent = `CORTEX ${plan} LİMİTLERİ`;
  }

  const orgInput = $('#licenseActivateForm')?.elements?.organization;
  if (orgInput && document.activeElement !== orgInput && !orgInput.value.trim() && org) {
    orgInput.value = org;
  }

  const camsUsed = (state.cameras || []).length;
  const maxCams = lic.maxCameras || (plan === 'ULTRA' ? 32 : plan === 'PLUS' ? 12 : 4);
  const rulesUsed = (state.rules || []).length;
  const maxRules = lic.maxRules || (plan === 'ULTRA' ? 128 : plan === 'PLUS' ? 32 : 8);
  const phonesUsed = normalizeTelegramPhones(state.telegram).length;
  const maxPhones = state.telegram?.maxPhones || lic.maxPhones || (plan === 'ULTRA' ? 10 : plan === 'PLUS' ? 5 : 2);
  const retentionUsed = Number(state.retention || 7);
  const maxRetention = plan === 'ULTRA' ? 30 : plan === 'PLUS' ? 15 : 7;

  let validityLabel = 'Aktif · Kurumsal Lisans';
  if (lic.expiresAt) {
    const expMs = typeof lic.expiresAt === 'number' && lic.expiresAt < 1e12 ? lic.expiresAt * 1000 : Number(lic.expiresAt);
    const remDays = Math.max(0, Math.ceil((expMs - Date.now()) / 86400000));
    validityLabel = `Aktif · ${remDays} Gün Kaldı`;
  }

  const pct = (u, m) => Math.min(100, Math.round((u / Math.max(1, m)) * 100));
  const camPct = pct(camsUsed, maxCams);
  const rulePct = pct(rulesUsed, maxRules);
  const phonePct = pct(phonesUsed, maxPhones);
  const retPct = pct(retentionUsed, maxRetention);

  const quotaGridHtml = `
    <div class="quota-progress-grid">
      <div class="quota-item">
        <div class="quota-item-top">
          <span>Kamera Kanal Kotası</span>
          <strong class="mono">${camsUsed} / ${maxCams} Kanal</strong>
        </div>
        <div class="quota-bar"><div class="quota-bar-fill ${camPct >= 90 ? 'is-warn' : ''}" style="width:${camPct}%"></div></div>
      </div>
      <div class="quota-item">
        <div class="quota-item-top">
          <span>AI Kural Kotası</span>
          <strong class="mono">${rulesUsed} / ${maxRules} Kural</strong>
        </div>
        <div class="quota-bar"><div class="quota-bar-fill ${rulePct >= 90 ? 'is-warn' : ''}" style="width:${rulePct}%"></div></div>
      </div>
      <div class="quota-item">
        <div class="quota-item-top">
          <span>Telegram Bildirim Kotası</span>
          <strong class="mono">${phonesUsed} / ${maxPhones} Numara</strong>
        </div>
        <div class="quota-bar"><div class="quota-bar-fill ${phonePct >= 90 ? 'is-warn' : 'is-ok'}" style="width:${phonePct}%"></div></div>
      </div>
      <div class="quota-item">
        <div class="quota-item-top">
          <span>Kanıt Saklama Süresi</span>
          <strong class="mono">${retentionUsed} / ${maxRetention} Gün</strong>
        </div>
        <div class="quota-bar"><div class="quota-bar-fill" style="width:${retPct}%"></div></div>
      </div>
    </div>
  `;

  const quotaBox = $('#quotaOverviewBox');
  const licDetails = $('#licenseDetails');
  if (licDetails) {
    const licHtml = `
      <div class="account-meta-grid">
        <div class="account-meta-cell">
          <span>Kurum / Müşteri</span>
          <strong>${esc(org)}</strong>
        </div>
        <div class="account-meta-cell">
          <span>Kullanıcı Hesabı</span>
          <strong>@${esc(username)} · ${esc(email)}</strong>
        </div>
        <div class="account-meta-cell">
          <span>Aktif Paket &amp; Süre</span>
          <strong>CORTEX ${esc(plan)} · ${esc(validityLabel)}</strong>
        </div>
        <div class="account-meta-cell">
          <span>Lisans Anahtarı</span>
          <strong><code class="mono">${esc(licKeyStr)}</code></strong>
        </div>
      </div>
      ${quotaBox ? '' : quotaGridHtml}
    `;
    const licKey = JSON.stringify([org, username, email, plan, validityLabel, licKeyStr, Boolean(quotaBox)]);
    setHtmlIfChanged(licDetails, licHtml, licKey);
  }

  if (quotaBox) {
    const quotaKey = JSON.stringify([camsUsed, maxCams, rulesUsed, maxRules, phonesUsed, maxPhones, retentionUsed, maxRetention]);
    setHtmlIfChanged(quotaBox, quotaGridHtml, quotaKey);
  }

  const upgBox = $('#upgradeAnalysisBox');
  if (upgBox) {
    if (plan === 'ULTRA') {
      upgBox.className = 'upgrade-analysis-box is-ultra-complete';
      const ultraHtml = `
        <div class="upgrade-summary-bar">
          <div class="upgrade-bar-copy">
            <span class="eyebrow" style="color:var(--ok)">KURUMSAL TAM KAPASİTE AKTİF</span>
            <strong>CORTEX ULTRA · Tüm Saha Kapasitesi ve Kurumsal Modüller Açık</strong>
          </div>
          <div class="upgrade-bar-deltas">
            <span class="upgrade-delta-chip is-complete mono">32 KAMERA</span>
            <span class="upgrade-delta-chip is-complete mono">128 AI KURALI</span>
            <span class="upgrade-delta-chip is-complete mono">10 TELEGRAM</span>
            <span class="upgrade-delta-chip is-complete mono">8 SEKTÖR · 30 GÜN ARŞİV</span>
          </div>
        </div>
      `;
      setHtmlIfChanged(upgBox, ultraHtml, 'ULTRA');
    } else {
      upgBox.className = 'upgrade-analysis-box';
      const camGain = Math.max(0, 32 - maxCams);
      const ruleGain = Math.max(0, 128 - maxRules);
      const phoneGain = Math.max(0, 10 - maxPhones);
      const retGain = Math.max(0, 30 - maxRetention);
      const upgHtml = `
        <div class="upgrade-summary-bar">
          <div class="upgrade-bar-copy">
            <span class="eyebrow">PAKET YÜKSELTME KAZANIM ÖZETİ (${esc(plan)} → ULTRA)</span>
            <strong>ULTRA Pakete Geçtiğinizde Eklenecek Kurumsal Kapasite</strong>
          </div>
          <div class="upgrade-bar-deltas">
            <span class="upgrade-delta-chip mono">+${camGain} Kamera (32)</span>
            <span class="upgrade-delta-chip mono">+${ruleGain} AI Kuralı (128)</span>
            <span class="upgrade-delta-chip mono">+${phoneGain} Telegram (10)</span>
            <span class="upgrade-delta-chip mono">+${retGain} Gün Arşiv (30G)</span>
            <span class="upgrade-delta-chip mono">8 Sektör + Filo</span>
          </div>
        </div>
      `;
      setHtmlIfChanged(upgBox, upgHtml, `${plan}:${maxCams}:${maxRules}:${maxPhones}:${maxRetention}`);
    }
  }

  document.querySelectorAll('[data-tier-card]').forEach(card => {
    const cardTier = card.dataset.tierCard;
    const isCurrent = cardTier === plan;
    card.classList.toggle('tier-active-card', isCurrent);
    const slot = card.querySelector('.tier-status-slot') || card;
    let pill = card.querySelector('.tier-current-pill');
    if (isCurrent) {
      if (!pill) {
        pill = document.createElement('span');
        pill.className = 'tier-current-pill mono';
        slot.appendChild(pill);
      }
      pill.textContent = 'AKTİF PAKETİNİZ';
    } else if (pill) {
      pill.remove();
    }
  });

  const auditBox = $('#auditList');
  if (auditBox) {
    const items = (state.audit || []).slice(0, 12);
    const auditHtml = items.length
      ? `<table><thead><tr><th>Zaman</th><th>İşlem</th><th>Detay</th><th>SHA-256 Zincir</th></tr></thead><tbody>${items.map(a => `<tr><td class="mono">${new Date(a.time * 1000).toLocaleTimeString('tr-TR')}</td><td><strong>${esc(a.action)}</strong></td><td>${esc(a.detail)}</td><td><code>${esc(a.id)}</code></td></tr>`).join('')}</tbody></table>`
      : '<p class="fine">Henüz denetim kaydı oluşmadı.</p>';
    const auditKey = JSON.stringify(items.map(a => [a.id, a.time, a.action, a.detail]));
    setHtmlIfChanged(auditBox, auditHtml, auditKey);
  }
}

function renderMatrixWall() {
  if (!matrixOpen || !state) return;
  const grid = $('#matrixWallGrid');
  if (!grid) return;
  grid.className = `nvr-wall-grid wall-grid ${nvrGridLayout}`;
  const structKey = computeNvrStructureKey(true);
  if (grid.dataset.renderKey !== structKey) {
    grid.dataset.renderKey = structKey;
    grid.innerHTML = buildNvrCellsHtml(true);
  } else {
    updateNvrContainerInPlace(grid);
  }
}

function normalizeTelegramPhones(tg) {
  const defaultChat = tg?.chatId || '';
  const botUsername = tg?.botUsername || 'intelligentcortexbot';
  const merged = [];
  const seenDigits = new Set();

  function addEntry(item) {
    if (!item) return;
    const rawPhone = typeof item === 'string' ? item : (item.phone || item.phoneDisplay || '');
    const display = typeof item === 'string' ? item : (item.phoneDisplay || item.phone || '');
    const digits = rawPhone.replace(/\D/g, '') || display.replace(/\D/g, '');
    if (!digits || seenDigits.has(digits)) return;
    seenDigits.add(digits);
    merged.push({
      phone: rawPhone || display,
      phoneDisplay: display || rawPhone,
      chatId: (typeof item === 'object' && item.chatId) ? item.chatId : defaultChat,
      botUsername: (typeof item === 'object' && item.botUsername) ? item.botUsername : botUsername
    });
  }

  if (Array.isArray(tg?.phones)) {
    tg.phones.forEach(addEntry);
  }
  localTelegramPhones.forEach(addEntry);
  if (merged.length === 0 && (tg?.phoneDisplay || tg?.phone)) {
    addEntry({ phone: tg.phone || tg.phoneDisplay, phoneDisplay: tg.phoneDisplay || tg.phone, chatId: defaultChat, botUsername });
  }
  return merged;
}

function renderTelegramPhones() {
  if (!state) return;
  const tg = state.telegram || {};
  const phones = normalizeTelegramPhones(tg);
  const plan = (state.license?.plan || state.auth?.user?.plan || 'PRO').toUpperCase();
  const defaultMax = plan === 'ULTRA' ? 10 : plan === 'PLUS' ? 5 : 2;
  const maxPhones = tg.maxPhones || state.license?.maxPhones || defaultMax;

  const quotaBadge = $('#tgPhoneQuotaBadge');
  if (quotaBadge) {
    quotaBadge.className = 'tag ' + (phones.length >= maxPhones ? 'warn' : 'ok');
    quotaBadge.textContent = `Kayıtlı Numaralar: ${phones.length} / ${maxPhones} (${plan})`;
  }

  const listEl = $('#tgPhonesList');
  if (!listEl) return;
  const phonesKey = JSON.stringify([maxPhones, phones.map(p => [p.phone, p.phoneDisplay, p.chatId])]);
  if (!phones.length) {
    const emptyHtml = `<div class="tg-phone-empty fine">Henüz kayıtlı bildirim numarası yok. Paket kotanıza göre en fazla <strong>${maxPhones}</strong> cep telefonu numarası ekleyebilirsiniz.</div>`;
    setHtmlIfChanged(listEl, emptyHtml, phonesKey);
    return;
  }

  const html = phones.map((p, idx) => `
    <div class="tg-phone-row">
      <div class="tg-phone-row-info">
        <span class="tg-phone-index mono">#${idx + 1}</span>
        <strong class="tg-phone-number">${esc(p.phoneDisplay || p.phone)}</strong>
        <span class="tg-phone-chat mono">Chat: <code>${esc(p.chatId || 'Otomatik')}</code></span>
      </div>
      <div class="tg-phone-row-actions">
        <button type="button" class="sector-mini-btn" data-tg-test-phone="${esc(p.phone || p.phoneDisplay)}">Test Gönder</button>
        <button type="button" class="sector-mini-btn tg-remove-btn" data-tg-remove-phone="${esc(p.phone || p.phoneDisplay)}">Kaldır</button>
      </div>
    </div>
  `).join('');
  setHtmlIfChanged(listEl, html, phonesKey);
}

function filterEventsLocally(events) {
  const q = ($('#copilotQuery')?.value || '').trim().toLowerCase();
  const cat = $('#eventCategoryFilter')?.value || '';
  const rev = $('#eventReviewFilter')?.value || '';
  const now = Date.now() / 1000;

  return events.filter(e => {
    if (rev === 'unreviewed' && e.reviewed) return false;
    if (rev === 'reviewed' && !e.reviewed) return false;
    const kind = e.kind || 'vision';
    if (cat === 'vision' && kind !== 'vision') return false;
    if (cat === 'pro' && !kind.startsWith('pro_')) return false;
    if (cat === 'access' && !kind.startsWith('access_') && kind !== 'pro_tailgating') return false;
    if (cat === 'local' && (kind === 'vision' || kind.startsWith('access_') || kind.startsWith('pro_'))) return false;

    if (!q) return true;
    let rem = q;
    const evTime = e.observedAt || e.time || 0;
    if (rem.includes('bugün') || rem.includes('son 24 saat')) {
      if (now - evTime > 86400) return false;
      rem = rem.replace('bugün', '').replace('son 24 saat', '');
    }
    if (rem.includes('incelenmemiş') || rem.includes('bekleyen')) {
      if (e.reviewed) return false;
      rem = rem.replace('incelenmemiş', '').replace('bekleyen', '');
    }
    if (rem.includes('gece')) {
      const hr = new Date(evTime * 1000).getHours();
      if (!(hr >= 20 || hr < 6)) return false;
      rem = rem.replace('gece', '');
    }
    const tokens = rem.trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return true;
    const hay = `${e.camera || ''} ${e.rule || ''} ${e.reason || ''} ${e.kind || ''} ${(e.tags || []).join(' ')}`.toLowerCase();
    return tokens.every(t => hay.includes(t));
  });
}

function renderEventsList() {
  if (!state) return;
  const listEl = $('#eventList');
  if (!listEl) return;

  // Do not interrupt active video playback inside #eventList
  const playingVideo = Array.from(listEl.querySelectorAll('video')).some(v => !v.paused && !v.ended);
  if (playingVideo) return;

  const dict = I18N[currentLang] || I18N.tr;
  const filtered = filterEventsLocally(state.events || []);
  const countEl = $('#copilotCount');
  if (countEl) {
    countEl.textContent = `${filtered.length} / ${state.events.length} olay gösteriliyor`;
  }
  const html = filtered.map(e => `<article class="card">
    <div class="sectiontitle" style="margin-bottom:8px">
      <div class="actions" style="margin:0;gap:6px">
        <span class="tag ${e.reviewed ? 'ok' : 'warn'}">${e.reviewed ? 'İncelendi' : 'İnceleme gerekli'}</span>
        <span class="tag">${esc(ruleCategoryLabel(e.kind))}</span>
      </div>
      <span class="fine">${new Date((e.observedAt || e.time) * 1000).toLocaleString('tr-TR')}</span>
    </div>
    <h2>${esc(e.rule)} · ${esc(e.camera)}</h2>
    <p>${esc(e.reason)}</p>
    <div class="event-meta-chips">
      ${e.latencyMs ? `<span class="tag mono">${(e.latencyMs / 1000).toFixed(1)}sn</span>` : ''}
      <span class="tag mono">${e.kind && e.kind !== 'vision' ? 'YEREL/PRO' : 'SKOR ' + e.confidence}</span>
      ${e.notification ? `<span class="tag">${esc(e.notification)}</span>` : ''}
      ${e.recording ? `<span class="tag ${e.recording === 'complete' ? 'ok' : ''}">${esc(e.recording === 'pending' ? 'Hazırlanıyor…' : e.recording === 'complete' ? 'MP4 Video Hazır' : e.recording)}</span>` : ''}
    </div>
    ${e.snapshot ? `<a target="_blank" href="/api/evidence/${e.id}/00.jpg">Olay karesini aç ↗</a>` : ''}
    ${e.clip ? `<video controls preload="none" src="/api/evidence/${e.id}/clip.mp4"></video>` : ''}
    <div class="actions">
      ${e.before ? `<a target="_blank" href="/api/evidence/${e.id}/before.mp4">Olay öncesi örnek kareler ↗</a>` : ''}
      ${e.clip ? `<a download href="/api/evidence/${e.id}/clip.mp4">Klibi indir ↓</a>` : '<span>RTSP klibi alınamadı; örnek kareleri inceleyin.</span>'}
      <a download href="/api/evidence-bundle/${e.id}.zip">Adli Kanıt Paketi (SHA-256 ZIP) ↓</a>
      ${!e.reviewed ? `<button data-action="review" data-id="${e.id}">İncelendi olarak işaretle</button>` : ''}
    </div>
  </article>`).join('') || empty(dict['empty.eventsTitle'], dict['empty.eventsDesc'], 'SHA');
  const key = JSON.stringify([currentLang, filtered.map(e => [e.id, e.reviewed, e.recording, e.clip, e.snapshot, e.notification])]);
  setHtmlIfChanged(listEl, html, key);
}

function ruleCategoryLabel(kind) {
  if (!state) return 'Görsel AI';
  const all = [...(state.templates || []), ...(state.proTemplates || [])];
  return all.find(t => t.kind === kind)?.category || 'Görsel AI';
}

async function refresh() {
  if (refreshing) return;
  refreshing = true;
  try {
    state = await api('state');
    const incomingTenantId = state?.auth?.activeTenantId || state?.auth?.user?.customerId || state?.auth?.user?.username || '';
    if (incomingTenantId !== currentClientTenantId) {
      currentClientTenantId = incomingTenantId;
      ultraBannerDismissed = false;
      resetClientTelegramInputs();
    }
    const sessionLogged = syncLoginGate(state);
    if (!sessionLogged && state?.auth?.authenticated === false) {
      first = true;
      for (const ev of (state?.events || [])) {
        if (ev && ev.id) seen.add(ev.id);
      }
      return;
    }
    setupCatalog();
    renderInstaller();
    renderDevices();
    renderSectorPacks();
    renderAnalytics();
    renderPlans();
    renderLicenseAndAudit();
    renderNvrWall();
    renderMatrixWall();

    if ($('#version')) $('#version').textContent = state.version;
    $('#diskStatus').textContent = 'Olay diski boş alanı: ' + state.diskFreeGB + ' GB';
    const dict = I18N[currentLang] || I18N.tr;
    const statsData = [
      ['stats.cameras', dict['stats.cameras'], state.cameras.length],
      ['stats.rules', dict['stats.rules'], state.rules.filter(r => r.enabled).length],
      ['stats.events', dict['stats.events'], state.events.filter(e => !e.reviewed).length]
    ];
    const statsHtml = statsData.map(([key, label, b]) => `<div class="stat"><span data-i18n="${key}">${label}</span><strong>${b.toString().padStart(2, '0')}</strong></div>`).join('');
    setHtmlIfChanged($('#stats'), statsHtml, JSON.stringify(statsData));

    renderCameraListSmooth();

    const camSelectEl = $('#cameraSelect');
    if (camSelectEl && document.activeElement !== camSelectEl) {
      const camSelectKey = JSON.stringify((state.cameras || []).map(c => [c.id, c.name]));
      if (camSelectEl.dataset.renderKey !== camSelectKey) {
        const selected = camSelectEl.value;
        camSelectEl.innerHTML = '<option value="">Kamera seçin</option>' + state.cameras.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
        camSelectEl.dataset.renderKey = camSelectKey;
        if (selected && state.cameras.some(c => c.id === selected)) {
          camSelectEl.value = selected;
        } else if (!selected && state.cameras.length === 1) {
          camSelectEl.value = state.cameras[0].id;
        }
      } else if (!camSelectEl.value && state.cameras.length === 1) {
        camSelectEl.value = state.cameras[0].id;
      }
    }
    if (currentTab === 'rules') updateROI();

    const rulesHtml = state.rules.map(r => {
      const roi = r.roi || [0, 0, 100, 100];
      const threshVal = r.kind === 'vision' || !r.kind ? r.threshold : (r.sensitivity ?? r.dark);
      return `<article class="card rule-card ${r.enabled ? '' : 'rule-paused'}">
        <div class="sectiontitle" style="margin-bottom:8px">
          <div class="actions" style="margin:0;gap:6px">
            <span class="tag ${r.enabled ? 'ok' : 'warn'}">${r.enabled ? 'ETKİN' : 'DURAKLATILDI'}</span>
            <span class="tag">${esc(state.cameras.find(c => c.id === r.camera)?.name || 'Kamera')}</span>
            <span class="tag">${esc(ruleCategoryLabel(r.kind))}</span>
          </div>
          <span class="tag mono">ROI: ${roi[0]},${roi[1]}% (${roi[2]}×${roi[3]}%)</span>
        </div>
        <h2>${esc(r.name)}</h2>
        <p>${esc(r.prompt)}</p>
        <div class="rule-metric-chips">
          <span class="tag mono">EŞİK ${esc(threshVal)}</span>
          <span class="tag mono">${r.cooldown}SN</span>
          <span class="tag mono">${esc(r.schedule?.start || '00:00')}–${esc(r.schedule?.end || '00:00')}</span>
        </div>
        <div class="actions">
          <button data-action="rule-toggle" data-id="${r.id}">${r.enabled ? 'Duraklat' : 'Etkinleştir'}</button>
          <button data-edit="${r.id}" class="primary">Stüdyoda Düzenle ↗</button>
          <button data-action="rule-delete" data-id="${r.id}">Sil</button>
        </div>
      </article>`;
    }).join('') || empty(dict['empty.rulesTitle'], dict['empty.rulesDesc'], 'ROI');
    const rulesKey = JSON.stringify([currentLang, state.rules, (state.cameras || []).map(c => [c.id, c.name])]);
    setHtmlIfChanged($('#ruleList'), rulesHtml, rulesKey);

    renderEventsList();

    if (first) {
      $('#model').value = state.model;
      if ($('#recommendedModelSelect')) $('#recommendedModelSelect').value = state.model;
      if ($('#aiInterval') && state.aiInterval) $('#aiInterval').value = String(state.aiInterval);
      $('#retention').value = state.retention;
      $('#autostart').checked = state.autostart;
      if ($('#soundAlert')) $('#soundAlert').checked = state.soundAlert !== false;
      if ($('#smartCascade')) $('#smartCascade').checked = state.smartCascade !== false;
      if ($('#tgEnabled') && state.telegram) $('#tgEnabled').checked = state.telegram.enabled !== false;
    }
    if (state.telegram) {
      const phones = normalizeTelegramPhones(state.telegram);
      const serverPhone = state.telegram.phoneDisplay || state.telegram.phone || phones[0]?.phoneDisplay || '';
      const phoneEl = $('#tgPhone');
      if (phoneEl && document.activeElement !== phoneEl) {
        if (serverPhone) {
          if (first || !phoneEl.value.trim() || phoneEl.dataset.syncedPhone !== serverPhone) {
            phoneEl.value = serverPhone;
            phoneEl.dataset.syncedPhone = serverPhone;
          }
        } else if (phones.length === 0 && (first || phoneEl.dataset.syncedPhone)) {
          phoneEl.value = '';
          phoneEl.dataset.syncedPhone = '';
        }
      }
      const chatEl = $('#tgChatId');
      if (chatEl && document.activeElement !== chatEl) {
        chatEl.value = state.telegram.chatId || '';
      }
      const botTag = '@' + (state.telegram.botUsername || 'intelligentcortexbot');
      const hasPhone = phones.length > 0 || Boolean(serverPhone);
      const phoneLabel = serverPhone || (phones[0]?.phoneDisplay || phones[0]?.phone || '');
      const isEnabled = state.telegram.enabled !== false;
      if ($('#tgBotBadge')) {
        if (!hasPhone) {
          $('#tgBotBadge').className = 'tag warn';
          $('#tgBotBadge').textContent = `${botTag} · Numara Bekleniyor`;
        } else {
          $('#tgBotBadge').className = 'tag ' + (isEnabled ? 'ok' : 'warn');
          $('#tgBotBadge').textContent = isEnabled ? `${botTag} Bağlı` : `${botTag} Duraklatıldı`;
        }
      }
      if ($('#headerTelegramLabel')) {
        if (!hasPhone) {
          $('#headerTelegramLabel').textContent = 'Telegram Bot: Numara Ekle';
        } else if (isEnabled) {
          $('#headerTelegramLabel').textContent = phones.length > 1
            ? `Telegram: ${phones.length} Numara Aktif`
            : `Telegram: ${phoneLabel}`;
        } else {
          $('#headerTelegramLabel').textContent = 'Telegram Bot: Bağla';
        }
      }
      if ($('#telegramStatus') && Date.now() > tgStatusOverrideUntil) {
        let tgStatHtml = '';
        if (!hasPhone) {
          tgStatHtml = `Resmi Bot (<strong>${esc(botTag)}</strong>) hazır · Henüz kayıtlı telefon numarası yok. Yukarıdan numaranızı ekleyip tek tıkla bağlanın.`;
        } else if (isEnabled) {
          const chatSuffix = state.telegram.chatId ? ` · Chat ID: <code>${esc(state.telegram.chatId)}</code>` : '';
          tgStatHtml = `Resmi Bot (<strong>${esc(botTag)}</strong>) aktif · Kayıtlı Numara: <strong>${phones.length} Adet (${esc(phoneLabel)})</strong>${chatSuffix}`;
        } else {
          tgStatHtml = `Telegram bildirimleri duraklatıldı (<strong>${esc(botTag)}</strong> · Numara: ${esc(phoneLabel)}).`;
        }
        setHtmlIfChanged($('#telegramStatus'), tgStatHtml);
      }
      renderTelegramPhones();
    }
    const nowSec = Date.now() / 1000;
    let latestFreshEvent = null;
    for (const e of (state.events || [])) {
      const isUnseen = !seen.has(e.id);
      seen.add(e.id);
      const evTs = Number(e.observedAt || e.time || 0);
      if (!first && isUnseen && evTs > 0 && (nowSec - evTs) <= 15) {
        if (!latestFreshEvent) latestFreshEvent = e;
      }
    }
    if (latestFreshEvent) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Cortex · ' + latestFreshEvent.rule, {
          body: latestFreshEvent.camera + ': ' + latestFreshEvent.reason,
          tag: 'cortex-live-alarm'
        });
      }
      playOperatorAlert();
    }
    first = false;
  } catch (e) {
    message('Yerel servis bağlantısı kesildi. Cortex uygulamasını açın.');
  } finally {
    refreshing = false;
  }
}

for (const [id, path] of [['cameraForm', 'cameras'], ['ruleForm', 'rules'], ['settingsForm', 'settings']]) {
  $('#' + id).addEventListener('submit', async e => {
    e.preventDefault();
    const b = e.target.querySelector('button.primary');
    b.disabled = true;
    try {
      const d = Object.fromEntries(new FormData(e.target));
      if (path === 'rules') {
        const selectedTemplate = $('#ruleTemplate').value;
        const allLocalAndPro = [...(state.templates || []), ...(state.proTemplates || [])];
        d.kind = allLocalAndPro.some(t => t.kind === selectedTemplate) ? selectedTemplate : 'vision';
        d.visionTemplate = d.kind === 'vision' ? selectedTemplate : '';
        d.days = Array.from($('#ruleDays').selectedOptions, o => Number(o.value));
        if (d.kind === 'lights_off') {
          d.dark = 45;
          d.drop = 0.45;
          d.hold = 3;
        }
      }
      if (path === 'settings') {
        d.autostart = !!d.autostart;
        d.soundAlert = !!d.soundAlert;
        d.smartCascade = !!d.smartCascade;
        d.replaceWebhook = !!d.replaceWebhook;
        if (Number(d.retention) < state.retention && !confirm('Yeni saklama süresini aşan olaylar ve klipler silinecek. Kaydedilsin mi?')) return;
      }
      const result = await api(path, d);
      if (path === 'cameras') {
        try {
          await api('toggle', { id: result.id });
          $('#cameraResult').textContent = 'Kamera kaydedildi. Canlı bağlantı başlatıldı.';
        } catch (error) {
          $('#cameraResult').textContent = 'Kamera kaydedildi; izlemeyi kamera kartından başlatın.';
        }
        e.target.reset();
      }
      message('Kaydedildi.');
      if (path === 'rules') resetRule();
      await refresh();
    } catch (e) {
      message(e.message);
    } finally {
      b.disabled = false;
    }
  });
}

function template() {
  const ip = $('#ip').value.trim();
  if (!ip) return;
  const kind = $('#brand').value;
  if (kind !== 'rtsp') {
    $('#rtsp').value = `rtsp://${ip}:554/${kind === 'hik' ? 'Streaming/Channels/101' : 'cam/realmonitor?channel=1&subtype=0'}`;
  }
}

$('#brand').onchange = template;
$('#ip').oninput = template;

$('#discover').onclick = async () => {
  const b = $('#discover');
  b.disabled = true;
  b.textContent = 'Keşfediliyor…';
  try {
    const found = await api('discover', {});
    $('#discovery').innerHTML = found.length
      ? found.map(d => `<button type="button" class="device" data-ip="${esc(d.ip)}" data-brand="${esc(d.brand)}">${esc(d.brand)} · ${esc(d.ip)} →</button>`).join('')
      : empty('Cihaz bulunamadı.', 'Aynı ağda olduğunuzu ve kamerada ONVIF keşfinin etkin olduğunu kontrol edin. RTSP ile elle ekleyebilirsiniz.', 'ONVIF');
    document.querySelectorAll('.device').forEach(btn => btn.onclick = () => {
      $('#ip').value = btn.dataset.ip;
      $('#brand').value = btn.dataset.brand === 'Hikvision' ? 'hik' : 'rtsp';
      template();
      message('IP seçildi. RTSP yolunu ve kimlik bilgilerini tamamlayın.');
    });
  } catch (e) {
    message(e.message);
  } finally {
    b.disabled = false;
    b.textContent = 'Ağda keşfet ↗';
  }
};

$('#recommendedModelSelect')?.addEventListener('change', e => {
  const val = e.target.value;
  if ($('#model')) $('#model').value = val;
  const found = state?.recommendedModels?.find(m => m.id === val);
  if (found && $('#recommendedModelDesc')) {
    $('#recommendedModelDesc').textContent = `${found.description} (${found.vram})`;
  }
});

$('#modelTest').onclick = async () => {
  try {
    const d = await api('model', {});
    $('#modelResult').textContent = d.message;
    await refresh();
  } catch (e) {
    $('#modelResult').textContent = 'Ollama erişilemiyor. Ollama uygulamasını açın.';
  }
};

$('#testAiRuleBtn')?.addEventListener('click', async () => {
  const f = $('#ruleForm');
  const promptTxt = f?.elements?.prompt?.value || '';
  const camId = f?.elements?.camera?.value || '';
  const { x, y, width, height } = getRoiNumbers();
  const out = $('#aiRuleTestResult');
  const btn = $('#testAiRuleBtn');
  if (out) out.textContent = 'Ollama VLM analiz ediyor…';
  if (btn) btn.disabled = true;
  try {
    const r = await api('ai-test', { prompt: promptTxt, camera: camId, roi: [x, y, width, height] });
    if (out) {
      out.textContent = `${r.result.matched ? 'EŞLEŞTİ' : 'EŞLEŞMEDİ'} (Skor: ${r.result.confidence} · ${r.latencyMs} ms) — ${r.result.reason}`;
    }
  } catch (err) {
    if (out) out.textContent = err.message;
  } finally {
    if (btn) btn.disabled = false;
  }
});

$('#notify').onclick = async () => {
  if (!('Notification' in window)) return message('Tarayıcı masaüstü bildirimini desteklemiyor.');
  message('Bildirim izni: ' + await Notification.requestPermission());
};

$('#showRtsp').onchange = e => {
  $('#rtsp').type = e.target.checked ? 'text' : 'password';
};

$('#testCamera').onclick = async () => {
  const form = $('#cameraForm');
  if (!form.reportValidity()) return;
  const b = $('#testCamera');
  b.disabled = true;
  $('#cameraResult').textContent = 'Kameradan görüntü alınıyor… (en fazla 15 saniye)';
  try {
    const r = await api('camera-test', Object.fromEntries(new FormData(form)));
    $('#cameraResult').textContent = r.message + ' Parlaklık: ' + r.brightness + '/255.';
  } catch (e) {
    $('#cameraResult').textContent = e.message;
  } finally {
    b.disabled = false;
  }
};

let catalogReady = false;
function setupCatalog() {
  if (catalogReady) return;
  catalogReady = true;
  const allLocal = [...(state.templates || []), ...(state.proTemplates || [])];
  const groups = [...new Set(allLocal.map(t => t.category))];
  $('#ruleTemplate').innerHTML =
    groups.map(g => `<optgroup label="${esc(g)}">${allLocal.filter(t => t.category === g).map(t => `<option value="${t.kind}">${esc(t.name)}</option>`).join('')}</optgroup>`).join('') +
    [...new Set(state.visionTemplates.map(t => t.category))].map(g => `<optgroup label="${esc(g)} · Görsel AI">${state.visionTemplates.filter(t => t.category === g).map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</optgroup>`).join('') +
    '<optgroup label="Özel"><option value="custom">Kendi görsel kuralını yaz</option></optgroup>';
  chooseTemplate();
}

function chooseTemplate() {
  const value = $('#ruleTemplate').value;
  const isCrossing = value.startsWith('access_') || value === 'pro_tailgating';
  $('#accessSettings').hidden = !isCrossing;
  const allLocal = [...(state?.templates || []), ...(state?.proTemplates || [])];
  const t = allLocal.find(t => t.kind === value);
  const vision = state?.visionTemplates?.find(t => t.id === value);
  const f = $('#ruleForm');
  f.elements.kind.value = t ? value : 'vision';
  $('#localSettings').hidden = !t || value.startsWith('access_');
  $('#scoreLabel').hidden = !!t;
  if ($('#modelNotice')) $('#modelNotice').hidden = !!t;
  const engineBadge = $('#ruleEngineBadge');
  if (engineBadge) {
    engineBadge.textContent = isCrossing
      ? 'Geçiş & İz Takip Motoru'
      : value.startsWith('pro_')
        ? 'Cortex Pro Akıllı Takip'
        : t
          ? 'Gerçek Zamanlı Yerel Motor'
          : 'Ollama Görsel AI';
  }
  f.elements.name.value = t ? t.name : vision?.name || '';
  f.elements.prompt.value = t ? t.description : vision?.prompt || '';
  f.elements.prompt.readOnly = !!t;
  $('#templateDescription').textContent = t
    ? t.description
    : 'Görsel AI: ' + (vision?.category || 'Özel kural') + '. Son karelerde görünen kanıt aranır.';
  if (t) {
    f.elements.sensitivity.value = t.sensitivity;
    f.elements.duration.value = t.duration;
    const light = t.category === 'Aydınlatma', link = t.category === 'Bağlantı';
    $('#sensitivityLabel').hidden = link;
    f.elements.sensitivity.max = light ? 255 : 100;
    $('#thresholdHelp').textContent = light
      ? 'Eşik: gri parlaklık (0–255). IR/gece görüşü ve otomatik pozlama sonucu değiştirebilir.'
      : link
        ? 'Kesinti en az 15 saniye doğrulanır. Geri gelme kuralı ilk bağlantıda alarm vermez.'
        : t.kind === 'pro_loitering'
          ? 'Eşik: bölgede bekleyen minimum kişi/hedef sayısı. Süre: bekleme (dwell time) saniyesi.'
          : t.kind === 'pro_occupancy'
            ? 'Eşik: bölgede aynı anda izin verilen maksimum kişi kapasitesi.'
            : t.kind === 'pro_perimeter'
              ? 'Eşik: korunan yasak bölgede eşzamanlı minimum hedef sayısı. Süre: doğrulama saniyesi.'
              : t.kind === 'pro_tailgating'
                ? 'Eşik: ardışık geçişlerin kaçak geçiş sayılacağı zaman penceresi (saniye).'
                : t.kind === 'pro_fall'
                  ? 'Eşik: hareketsizlik toleransı (%). Süre: yerde hareketsiz kalma doğrulama süresi (sn).'
                  : t.kind === 'pro_abandon'
                    ? 'Eşik: maksimum giriş-çıkış süresi. Süre: bölgeden ayrıldıktan sonra doğrulama süresi (sn).'
                    : t.kind === 'frozen'
                      ? 'Eşik: ortalama piksel farkı (0–255 ölçeği). Durağan sahne de tetikleyebilir.'
                      : t.kind === 'low_detail'
                        ? 'Eşik: başlangıç referansına göre ayrıntı kaybı yüzdesi.'
                        : 'Eşik: değişen piksel yüzdesi.';
  }
  drawRoiCanvas();
}

function resetRule() {
  const f = $('#ruleForm');
  f.reset();
  f.elements.id.value = '';
  $('#saveRule').textContent = 'Kuralı etkinleştir ↗';
  chooseTemplate();
  updateROI();
}

function editRule(id, shouldScroll = true) {
  const r = state.rules.find(r => r.id === id);
  if (!r) return;
  tab('rules');
  $('#ruleTemplate').value = r.kind === 'vision' || !r.kind ? (r.visionTemplate || 'custom') : r.kind;
  chooseTemplate();
  const f = $('#ruleForm');
  for (const key of ['id', 'camera', 'name', 'prompt', 'threshold', 'cooldown', 'duration', 'sensitivity', 'axis', 'direction', 'line', 'margin']) {
    if (r[key] !== undefined && f.elements[key]) f.elements[key].value = r[key];
  }
  if (r.kind === 'lights_off' && r.duration === undefined) {
    f.elements.sensitivity.value = r.dark;
    f.elements.duration.value = r.hold * 3;
  }
  for (const [i, key] of ['x', 'y', 'width', 'height'].entries()) {
    f.elements[key].value = (r.roi || [0, 0, 100, 100])[i];
  }
  f.elements.start.value = r.schedule?.start || '00:00';
  f.elements.end.value = r.schedule?.end || '00:00';
  for (const o of $('#ruleDays').options) {
    o.selected = (r.schedule?.days || [0, 1, 2, 3, 4, 5, 6]).includes(Number(o.value));
  }
  $('#saveRule').textContent = 'Değişiklikleri kaydet';
  updateROI();
  if (shouldScroll) f.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ==========================================================================
   Professional 8-Handle ROI & Tripwire Drawing Studio (#roiCanvas)
   ========================================================================== */

function getRoiNumbers() {
  const f = $('#ruleForm');
  if (!f) return { x: 0, y: 0, width: 100, height: 100 };
  const x = Math.max(0, Math.min(95, Number(f.elements.x.value) || 0));
  const y = Math.max(0, Math.min(95, Number(f.elements.y.value) || 0));
  const width = Math.max(5, Math.min(100 - x, Number(f.elements.width.value) || 100));
  const height = Math.max(5, Math.min(100 - y, Number(f.elements.height.value) || 100));
  return { x, y, width, height };
}

function setRoiNumbers({ x, y, width, height }) {
  const f = $('#ruleForm');
  if (!f) return;
  const rx = Math.round(Math.max(0, Math.min(95, x)));
  const ry = Math.round(Math.max(0, Math.min(95, y)));
  const rw = Math.round(Math.max(5, Math.min(100 - rx, width)));
  const rh = Math.round(Math.max(5, Math.min(100 - ry, height)));
  f.elements.x.value = rx;
  f.elements.y.value = ry;
  f.elements.width.value = rw;
  f.elements.height.value = rh;
  syncRoiBoxFromInputs();
}

function drawCalibrationBackdrop(ctx, w, h) {
  const isDark = document.documentElement.dataset.theme === 'dark';
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  if (isDark) {
    grad.addColorStop(0, '#090D16');
    grad.addColorStop(0.55, '#0F1624');
    grad.addColorStop(1, '#0B0F1A');
  } else {
    grad.addColorStop(0, '#F1F5FB');
    grad.addColorStop(0.55, '#E6EEF8');
    grad.addColorStop(1, '#DCE6F4');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.10)' : 'rgba(51, 65, 85, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 10; i++) {
    const gx = (w * i) / 10;
    const gy = (h * i) / 10;
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
  }
  ctx.stroke();

  ctx.strokeStyle = isDark ? 'rgba(76, 130, 255, 0.18)' : 'rgba(37, 99, 235, 0.24)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.strokeRect(w * 0.24, h * 0.18, w * 0.52, h * 0.42);
  ctx.moveTo(w * 0.24, h * 0.18); ctx.lineTo(0, 0);
  ctx.moveTo(w * 0.76, h * 0.18); ctx.lineTo(w, 0);
  ctx.moveTo(w * 0.24, h * 0.60); ctx.lineTo(0, h);
  ctx.moveTo(w * 0.76, h * 0.60); ctx.lineTo(w, h);
  ctx.stroke();

  ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(51, 65, 85, 0.28)';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 16, 0, Math.PI * 2);
  ctx.moveTo(w / 2 - 24, h / 2); ctx.lineTo(w / 2 + 24, h / 2);
  ctx.moveTo(w / 2, h / 2 - 24); ctx.lineTo(w / 2, h / 2 + 24);
  ctx.stroke();
}

function drawRoiCanvas() {
  const canvas = $('#roiCanvas');
  const f = $('#ruleForm');
  if (!canvas || !f) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const img = $('#roiImage');
  const hasLiveFrame = img && !img.hidden && img.getAttribute('src');
  if (!hasLiveFrame) {
    drawCalibrationBackdrop(ctx, w, h);
  }

  const { x: pctX, y: pctY, width: pctW, height: pctH } = getRoiNumbers();
  const rx = (pctX / 100) * w;
  const ry = (pctY / 100) * h;
  const rw = (pctW / 100) * w;
  const rh = (pctH / 100) * h;

  const isDark = document.documentElement.dataset.theme === 'dark';
  const signalColor = isDark ? '#4C82FF' : '#2563EB';

  ctx.fillStyle = isDark ? 'rgba(5, 7, 12, 0.56)' : 'rgba(15, 23, 42, 0.18)';
  ctx.fillRect(0, 0, w, ry);
  ctx.fillRect(0, ry + rh, w, h - (ry + rh));
  ctx.fillRect(0, ry, rx, rh);
  ctx.fillRect(rx + rw, ry, w - (rx + rw), rh);

  ctx.strokeStyle = isDark ? 'rgba(76, 130, 255, 0.32)' : 'rgba(37, 99, 235, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i <= 2; i++) {
    const gx = rx + (rw * i) / 3;
    const gy = ry + (rh * i) / 3;
    ctx.moveTo(gx, ry);
    ctx.lineTo(gx, ry + rh);
    ctx.moveTo(rx, gy);
    ctx.lineTo(rx + rw, gy);
  }
  ctx.stroke();

  const hs = 8;
  const handles = [
    [rx, ry],
    [rx + rw / 2 - hs / 2, ry],
    [rx + rw - hs, ry],
    [rx + rw - hs, ry + rh / 2 - hs / 2],
    [rx + rw - hs, ry + rh - hs],
    [rx + rw / 2 - hs / 2, ry + rh - hs],
    [rx, ry + rh - hs],
    [rx, ry + rh / 2 - hs / 2],
  ];
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = signalColor;
  ctx.lineWidth = 2;
  for (const [hx, hy] of handles) {
    ctx.fillRect(hx, hy, hs, hs);
    ctx.strokeRect(hx, hy, hs, hs);
  }

  const val = $('#ruleTemplate')?.value || '';
  const showLine = val.startsWith('access_') || val === 'pro_tailgating' || studioMode === 'line';
  const axis = f.elements.axis?.value || 'y';
  const dir = f.elements.direction?.value || 'positive';
  const lineVal = Math.max(10, Math.min(90, Number(f.elements.line?.value) || 50));
  const marginVal = Math.max(5, Math.min(20, Number(f.elements.margin?.value) || 8));

  if (showLine) {
    const linePct = lineVal / 100;
    const marginPct = marginVal / 100;
    ctx.save();
    if (axis === 'y') {
      const ly = linePct * h;
      const my = marginPct * h;
      ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
      ctx.fillRect(rx, ly - my, rw, my * 2);

      ctx.strokeStyle = 'rgba(217, 119, 6, 0.65)';
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(rx, ly - my); ctx.lineTo(rx + rw, ly - my);
      ctx.moveTo(rx, ly + my); ctx.lineTo(rx + rw, ly + my);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(rx, ly);
      ctx.lineTo(rx + rw, ly);
      ctx.stroke();

      const cx = rx + rw / 2;
      const arrowY = dir === 'positive' ? ly + 22 : ly - 14;
      ctx.fillStyle = isDark ? '#22C55E' : '#15803D';
      ctx.font = '700 13px sans-serif';
      ctx.fillText(dir === 'positive' ? '▼ GİRİŞ / İHLAL YÖNÜ (+)' : '▲ GİRİŞ / İHLAL YÖNÜ (-)', Math.max(rx + 8, cx - 78), arrowY);
    } else {
      const lx = linePct * w;
      const mx = marginPct * w;
      ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
      ctx.fillRect(lx - mx, ry, mx * 2, rh);

      ctx.strokeStyle = 'rgba(217, 119, 6, 0.65)';
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(lx - mx, ry); ctx.lineTo(lx - mx, ry + rh);
      ctx.moveTo(lx + mx, ry); ctx.lineTo(lx + mx, ry + rh);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(lx, ry);
      ctx.lineTo(lx, ry + rh);
      ctx.stroke();

      const cy = ry + rh / 2;
      const arrowX = dir === 'positive' ? lx + 12 : Math.max(rx + 6, lx - 140);
      ctx.fillStyle = isDark ? '#22C55E' : '#15803D';
      ctx.font = '700 13px sans-serif';
      ctx.fillText(dir === 'positive' ? '▶ GİRİŞ YÖNÜ (+)' : '◀ GİRİŞ YÖNÜ (-)', arrowX, cy);
    }
    ctx.restore();
  }

  const hudCoords = $('#roiHudCoords');
  if (hudCoords) {
    hudCoords.textContent = `ROI: X:${pctX}% Y:${pctY}% · ${pctW}×${pctH}%` + (showLine ? ` | HAT: ${axis.toUpperCase()}=${lineVal}% (±${marginVal}%)` : '');
  }
}

function syncRoiBoxFromInputs() {
  const f = $('#ruleForm');
  const b = $('#roiBox');
  if (!f || !b) return;
  const { x, y, width, height } = getRoiNumbers();
  b.style.left = x + '%';
  b.style.top = y + '%';
  b.style.width = width + '%';
  b.style.height = height + '%';
  drawRoiCanvas();
}

function updateROI() {
  const f = $('#ruleForm');
  if (!f) return;
  const c = state?.cameras?.find(c => c.id === f.elements.camera.value);
  const live = c?.status === 'Bağlı';
  const img = $('#roiImage');
  const hudCam = $('#roiHudCamera');
  if (img) {
    if (live) {
      img.hidden = false;
      updateCameraImageSmooth(img, '/api/frame/' + c.id + '?t=' + Date.now());
    } else {
      img.hidden = true;
      img.removeAttribute('src');
    }
  }
  if (hudCam) {
    hudCam.textContent = live
      ? `CANLI · ${c.name}`
      : (c ? `${c.name} · KALİBRASYON SAHNESİ` : 'KALİBRASYON SAHNESİ · 16:9');
  }
  syncRoiBoxFromInputs();
}

function detectHitHandle(px, py, roi) {
  const tol = 3.5;
  const right = roi.x + roi.width;
  const bottom = roi.y + roi.height;
  const midX = roi.x + roi.width / 2;
  const midY = roi.y + roi.height / 2;

  if (Math.abs(px - roi.x) <= tol && Math.abs(py - roi.y) <= tol) return 'nw';
  if (Math.abs(px - right) <= tol && Math.abs(py - roi.y) <= tol) return 'ne';
  if (Math.abs(px - right) <= tol && Math.abs(py - bottom) <= tol) return 'se';
  if (Math.abs(px - roi.x) <= tol && Math.abs(py - bottom) <= tol) return 'sw';
  if (Math.abs(px - midX) <= tol && Math.abs(py - roi.y) <= tol) return 'n';
  if (Math.abs(px - right) <= tol && Math.abs(py - midY) <= tol) return 'e';
  if (Math.abs(px - midX) <= tol && Math.abs(py - bottom) <= tol) return 's';
  if (Math.abs(px - roi.x) <= tol && Math.abs(py - midY) <= tol) return 'w';

  const isFullScreen = roi.x === 0 && roi.y === 0 && roi.width === 100 && roi.height === 100;
  if (!isFullScreen && px > roi.x + tol && px < right - tol && py > roi.y + tol && py < bottom - tol) {
    return 'move';
  }
  return 'new';
}

function cursorForAction(action) {
  switch (action) {
    case 'nw':
    case 'se': return 'nwse-resize';
    case 'ne':
    case 'sw': return 'nesw-resize';
    case 'n':
    case 's': return 'ns-resize';
    case 'e':
    case 'w': return 'ew-resize';
    case 'move': return 'move';
    default: return 'crosshair';
  }
}

function initInteractiveStudio() {
  const preview = $('#roiPreview');
  const f = $('#ruleForm');
  if (!preview || !f) return;

  $('#drawModeRoi')?.addEventListener('click', () => {
    studioMode = 'roi';
    $('#drawModeRoi').classList.add('active');
    $('#drawModeLine').classList.remove('active');
    drawRoiCanvas();
  });
  $('#drawModeLine')?.addEventListener('click', () => {
    studioMode = 'line';
    $('#drawModeLine').classList.add('active');
    $('#drawModeRoi').classList.remove('active');
    $('#accessSettings').hidden = false;
    drawRoiCanvas();
  });

  document.querySelectorAll('[data-roi-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [x, y, width, height] = btn.dataset.roiPreset.split(',').map(Number);
      setRoiNumbers({ x, y, width, height });
    });
  });

  document.querySelectorAll('[data-time-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [start, end] = btn.dataset.timePreset.split(',');
      f.elements.start.value = start;
      f.elements.end.value = end;
    });
  });

  function relCoords(e) {
    const rect = preview.getBoundingClientRect();
    const px = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const py = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    return [px, py];
  }

  preview.addEventListener('pointerdown', e => {
    isDrawing = true;
    dragStart = relCoords(e);
    initialRoi = getRoiNumbers();
    preview.setPointerCapture(e.pointerId);
    if (studioMode === 'line') {
      dragAction = 'line';
      const axis = f.elements.axis?.value || 'y';
      const val = Math.round(axis === 'y' ? dragStart[1] : dragStart[0]);
      const margin = Number(f.elements.margin?.value) || 8;
      f.elements.line.value = Math.max(margin + 5, Math.min(95 - margin, val));
      drawRoiCanvas();
    } else {
      dragAction = detectHitHandle(dragStart[0], dragStart[1], initialRoi);
    }
  });

  preview.addEventListener('pointermove', e => {
    const [cx, cy] = relCoords(e);
    if (!isDrawing || !dragStart || !initialRoi) {
      if (studioMode === 'line') {
        preview.style.cursor = (f.elements.axis?.value || 'y') === 'y' ? 'ns-resize' : 'ew-resize';
      } else {
        preview.style.cursor = cursorForAction(detectHitHandle(cx, cy, getRoiNumbers()));
      }
      return;
    }

    if (dragAction === 'line') {
      const axis = f.elements.axis?.value || 'y';
      const val = Math.round(axis === 'y' ? cy : cx);
      const margin = Number(f.elements.margin?.value) || 8;
      f.elements.line.value = Math.max(margin + 5, Math.min(95 - margin, val));
      drawRoiCanvas();
      return;
    }

    const dx = cx - dragStart[0];
    const dy = cy - dragStart[1];
    let { x, y, width, height } = initialRoi;

    if (dragAction === 'move') {
      x = Math.max(0, Math.min(100 - width, x + dx));
      y = Math.max(0, Math.min(100 - height, y + dy));
      setRoiNumbers({ x, y, width, height });
      return;
    }

    if (dragAction === 'new') {
      const x1 = Math.min(dragStart[0], cx);
      const y1 = Math.min(dragStart[1], cy);
      const x2 = Math.max(dragStart[0], cx);
      const y2 = Math.max(dragStart[1], cy);
      setRoiNumbers({ x: x1, y: y1, width: Math.max(5, x2 - x1), height: Math.max(5, y2 - y1) });
      return;
    }

    const right = x + width;
    const bottom = y + height;
    if (dragAction.includes('w')) {
      x = Math.max(0, Math.min(right - 5, cx));
      width = right - x;
    }
    if (dragAction.includes('e')) {
      width = Math.max(5, Math.min(100 - x, cx - x));
    }
    if (dragAction.includes('n')) {
      y = Math.max(0, Math.min(bottom - 5, cy));
      height = bottom - y;
    }
    if (dragAction.includes('s')) {
      height = Math.max(5, Math.min(100 - y, cy - y));
    }
    setRoiNumbers({ x, y, width, height });
  });

  preview.addEventListener('pointerup', () => {
    isDrawing = false;
    dragAction = null;
    dragStart = null;
  });

  for (const name of ['axis', 'direction', 'line', 'margin']) {
    f.elements[name]?.addEventListener('input', drawRoiCanvas);
    f.elements[name]?.addEventListener('change', drawRoiCanvas);
  }
  syncRoiBoxFromInputs();
}

$('#ruleTemplate').onchange = chooseTemplate;
$('#resetRule').onclick = resetRule;
$('#cameraSelect').onchange = updateROI;
for (const key of ['x', 'y', 'width', 'height']) {
  $('#ruleForm').elements[key].oninput = syncRoiBoxFromInputs;
}

/* ==========================================================================
   Model Installer Status
   ========================================================================== */

function renderInstaller() {
  const m = state.installer, h = state.modelHealth;
  const busy = ['checking', 'runtime', 'pulling', 'verifying'].includes(m.phase);
  const connected = h.phase === 'connected';
  const targetModel = ($('#model')?.value || state.model || 'gemma3:4b').trim();
  const targetConnected = connected && h.model === targetModel;
  $('#installModel').disabled = busy || targetConnected;
  $('#installModel').textContent = busy
    ? `${targetModel} hazırlanıyor…`
    : targetConnected
      ? `${targetModel} bağlı`
      : `Seçili modeli (${targetModel}) kur ve bağla`;
  $('#cancelModel').hidden = !busy;
  $('#installStatus').textContent = busy
    ? m.message + (m.total ? ' ' + (m.completed / 1024 ** 3).toFixed(2) + ' / ' + (m.total / 1024 ** 3).toFixed(2) + ' GB (katman)' : '')
    : h.message + (m.phase === 'error' ? ' · ' + m.message : '');
  const p = $('#modelProgress');
  p.hidden = !busy;
  if (m.total) p.value = Math.min(100, m.completed / m.total * 100);
  else p.removeAttribute('value');
  if (m.phase === 'ready' && lastInstallPhase !== null && lastInstallPhase !== 'ready') {
    $('#model').value = state.model;
  }
  lastInstallPhase = m.phase;
}

$('#installModel').onclick = async () => {
  const modelVal = ($('#model')?.value || 'gemma3:4b').trim();
  try { await api('model-install', modelVal ? { model: modelVal } : {}); await refresh(); } catch (e) { message(e.message); }
};
$('#cancelModel').onclick = async () => {
  try { await api('model-cancel', {}); await refresh(); } catch (e) { message(e.message); }
};

/* ==========================================================================
   Cortex 2.0 Pro — Copilot Search, Telegram 2-Way Bot, License & Admin Panel
   ========================================================================== */

let tgStatusOverrideUntil = 0;

function focusTelegramOneClick() {
  tab('settings');
  const formEl = $('#telegramForm');
  const phoneEl = $('#tgPhone');
  if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (phoneEl) {
    setTimeout(() => {
      phoneEl.focus();
      phoneEl.select?.();
    }, 120);
  }
}

$('#headerTelegramBtn')?.addEventListener('click', focusTelegramOneClick);
$('#focusTelegramPhoneBtn')?.addEventListener('click', focusTelegramOneClick);

$('#telegramForm')?.addEventListener('submit', async ev => {
  ev.preventDefault();
  const phoneInput = $('#tgPhone');
  const phone = (phoneInput?.value || '').trim();
  const digits = phone.replace(/\D/g, '');
  const statusEl = $('#telegramStatus');
  if (digits.length < 10) {
    const errMsg = 'Lütfen geçerli bir cep telefonu numarası girin (Örn: +90 5XX XXX XX XX).';
    if (statusEl) {
      tgStatusOverrideUntil = Date.now() + 6000;
      statusEl.textContent = errMsg;
    }
    message(errMsg);
    phoneInput?.focus();
    return;
  }

  const btn = $('#tgOneClickBtn');
  const origLabel = btn?.textContent || 'Numarayı Ekle & Botu Başlat';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Numaranız eşleştiriliyor...';
  }
  if (statusEl) {
    tgStatusOverrideUntil = Date.now() + 8000;
    statusEl.textContent = 'Numaranız @intelligentcortexbot ile eşleştiriliyor...';
  }

  try {
    const botToken = ($('#tgBotToken')?.value || '').trim();
    const chatId = ($('#tgChatId')?.value || '').trim();
    const plan = (state?.license?.plan || state?.auth?.user?.plan || 'PRO').toUpperCase();
    const maxPhones = state?.telegram?.maxPhones || state?.license?.maxPhones || (plan === 'ULTRA' ? 10 : plan === 'PLUS' ? 5 : 2);
    const currentPhones = normalizeTelegramPhones(state?.telegram);
    const alreadyExists = currentPhones.some(p => (p.phone || '').replace(/\D/g, '') === digits);
    if (!alreadyExists && currentPhones.length >= maxPhones) {
      throw new Error(`Paketiniz (${plan}) en fazla ${maxPhones} Telegram numarasına izin verir. Daha fazla numara için paketinizi yükseltin veya mevcut bir numarayı kaldırın.`);
    }

    const res = await api('telegram-bind-phone', {
      phone,
      enabled: true,
      botToken,
      chatId,
      openDesktop: Boolean(ev.submitter?.dataset?.openDesktop),
      sendWelcome: true
    });
    const addedDisplay = res.phoneDisplay || phone;
    const addedChat = res.chatId || chatId || '';
    localTelegramPhones.push({
      phone: res.phone || addedDisplay,
      phoneDisplay: addedDisplay,
      chatId: addedChat,
      botUsername: 'intelligentcortexbot'
    });
    if ($('#tgEnabled')) $('#tgEnabled').checked = true;
    if (phoneInput) {
      phoneInput.value = addedDisplay;
      phoneInput.dataset.syncedPhone = addedDisplay;
    }
    if ($('#tgChatId') && res.chatId) $('#tgChatId').value = res.chatId;
    if ($('#tgBotBadge')) {
      $('#tgBotBadge').className = 'tag ok';
      $('#tgBotBadge').textContent = '@intelligentcortexbot Bağlı';
    }
    const deepLink = res.deepLink || 'https://t.me/intelligentcortexbot';
    if (statusEl) {
      tgStatusOverrideUntil = Date.now() + 10000;
      const chatNote = addedChat ? ` (Chat ID: <code>${esc(addedChat)}</code>)` : '';
      setHtmlIfChanged(statusEl, `<strong>${esc(addedDisplay)}</strong> numaranız <strong>@intelligentcortexbot</strong> listesine eklendi${chatNote} · <a href="${esc(deepLink)}" target="_blank" rel="noopener">Telegram'da Botu Aç ↗</a>`);
    }
    renderTelegramPhones();
    message(res.message || `${addedDisplay} numaranız @intelligentcortexbot bildirim listesine eklendi.`);
    await refresh();
  } catch (err) {
    if (statusEl) {
      tgStatusOverrideUntil = Date.now() + 8000;
      statusEl.textContent = err.message;
    }
    message(err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = origLabel;
    }
  }
});

$('#tgEnabled')?.addEventListener('change', async e => {
  const enabled = e.target.checked;
  const phone = ($('#tgPhone')?.value || '').trim();
  const chatId = ($('#tgChatId')?.value || '').trim();
  try {
    const r = await api('telegram-settings', { phone, chatId, enabled, sendWelcome: false });
    tgStatusOverrideUntil = 0;
    message(r.message);
    await refresh();
  } catch (err) {
    message(err.message);
  }
});

$('#openTelegramDesktopBtn')?.addEventListener('click', async () => {
  const phoneVal = ($('#tgPhone')?.value || '').trim();
  if (phoneVal.replace(/\D/g, '').length < 10) {
    window.open('https://t.me/intelligentcortexbot', '_blank', 'noopener');
    return;
  }
  const statusEl = $('#telegramStatus');
  if (statusEl) {
    tgStatusOverrideUntil = Date.now() + 8000;
    statusEl.textContent = 'Telegram uygulaması açılıyor ve numaranız eşleştiriliyor...';
  }
  try {
    const r = await api('telegram-bind-phone', { phone: phoneVal, enabled: true, openDesktop: true, sendWelcome: true });
    if ($('#tgPhone') && r.phoneDisplay) {
      $('#tgPhone').value = r.phoneDisplay;
      $('#tgPhone').dataset.syncedPhone = r.phoneDisplay;
    }
    if ($('#tgChatId') && r.chatId) $('#tgChatId').value = r.chatId;
    if (statusEl) {
      tgStatusOverrideUntil = Date.now() + 8000;
      statusEl.textContent = r.message;
    }
    message(r.message);
    await refresh();
  } catch (err) {
    window.open('https://t.me/intelligentcortexbot', '_blank', 'noopener');
  }
});

$('#discoverTelegramChatBtn')?.addEventListener('click', async () => {
  const tokenVal = $('#tgBotToken')?.value || '';
  const btn = $('#discoverTelegramChatBtn');
  if (btn) btn.disabled = true;
  try {
    const r = await api('telegram-discover-chat', { botToken: tokenVal });
    if ($('#tgChatId')) $('#tgChatId').value = r.chatId;
    message(r.message);
    await refresh();
  } catch (err) {
    message(err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
});

$('#testTelegramBtn')?.addEventListener('click', async () => {
  const f = $('#telegramForm');
  const d = Object.fromEntries(new FormData(f));
  try {
    const r = await api('telegram-test', d);
    message(r.message);
  } catch (err) { message(err.message); }
});

$('#licenseActivateForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const d = Object.fromEntries(new FormData(e.target));
    const r = await api('license-activate', d);
    message(r.message);
    await refresh();
  } catch (err) { message(err.message); }
});

/* --- ADMIN CONTROL PANEL --- */

async function refreshAdminPanel() {
  const loginCard = $('#adminLoginCard');
  const dash = $('#adminDashboard');
  const logoutBtn = $('#adminLogoutBtn');
  if (!loginCard || !dash) return;

  if (!adminToken) {
    loginCard.hidden = false;
    dash.hidden = true;
    if (logoutBtn) logoutBtn.hidden = true;
    return;
  }

  try {
    const data = await api('admin/state', { adminToken });
    loginCard.hidden = true;
    dash.hidden = false;
    if (logoutBtn) logoutBtn.hidden = false;

    const customers = data.customers || [];
    const issued = data.issuedLicenses || [];
    if ($('#admStatCustomers')) $('#admStatCustomers').textContent = String(customers.length).padStart(2, '0');
    if ($('#admStatLicenses')) $('#admStatLicenses').textContent = String(issued.length).padStart(2, '0');
    if ($('#admStatHealth')) $('#admStatHealth').textContent = data.safeMode ? 'GÜVENLİ MOD' : `${data.activeStreams || 0} YAYIN · ${data.diskFreeGB} GB`;

    const custList = $('#adminCustomersList');
    if (custList) {
      custList.innerHTML = customers.map(c => {
        const camPct = Math.min(100, Math.round(((c.camerasUsed || 0) / Math.max(1, c.maxCameras || 4)) * 100));
        const rulePct = Math.min(100, Math.round(((c.rulesUsed || 0) / Math.max(1, c.maxRules || 8)) * 100));
        const isSuspended = c.status === 'suspended';
        const tierClass = c.plan === 'ULTRA' ? 'warn' : c.plan === 'PLUS' ? 'ok' : '';
        return `<article class="admin-customer-card">
          <div class="sectiontitle" style="margin-bottom:8px">
            <div>
              <div class="actions" style="margin:0 0 6px;gap:6px">
                <span class="tag ${tierClass}">PAKET: ${esc(c.plan)}</span>
                <span class="tag ${isSuspended ? 'warn' : 'ok'}">${isSuspended ? 'Askıda / Güvenli Mod' : 'Aktif İstasyon'}</span>
                ${c.id === 'node-local-primary' ? '<span class="tag ok">Bu Bilgisayar (Merkez)</span>' : ''}
              </div>
              <h3>${esc(c.organization)}</h3>
              <p class="fine">${esc(c.contact || '')} · Sürüm: ${esc(c.version || '2.0.0-pro')} · Model: <code>${esc(c.model || 'gemma3:4b')}</code> · Son sinyal: ${new Date((c.lastSeen || Date.now() / 1000) * 1000).toLocaleString('tr-TR')}</p>
            </div>
            <div class="actions" style="margin:0">
              <button type="button" data-copy-license="${esc(c.licenseKey)}" data-org="${esc(c.organization)}">Anahtarı Kopyala (${esc(c.licenseKey?.slice(0, 14))}…)</button>
            </div>
          </div>
          <div class="grid" style="margin:10px 0">
            <div>
              <span class="fine">Kamera Kullanımı: <strong>${c.camerasUsed || 0} / ${c.maxCameras || 4}</strong></span>
              <div class="usage-bar"><div class="usage-bar-fill" style="width:${camPct}%"></div></div>
            </div>
            <div>
              <span class="fine">Olay Kuralı Kullanımı: <strong>${c.rulesUsed || 0} / ${c.maxRules || 8}</strong></span>
              <div class="usage-bar"><div class="usage-bar-fill" style="width:${rulePct}%"></div></div>
            </div>
          </div>
          <p class="fine"><strong>Canlı Durum:</strong> ${esc(c.health || 'Çevrimiçi')}</p>
          <div class="actions" style="margin-top:10px">
            <button type="button" data-admin-action="run_diagnostics" data-customer="${esc(c.id)}">Tanılama</button>
            <button type="button" data-admin-action="reset_streams" data-customer="${esc(c.id)}">Akışları Sıfırla</button>
            <button type="button" data-admin-action="clear_queues" data-customer="${esc(c.id)}">Kuyruğu Temizle</button>
            <button type="button" data-admin-action="restart_telegram" data-customer="${esc(c.id)}">Telegram Yenile</button>
            <button type="button" data-admin-action="upgrade_plan" data-customer="${esc(c.id)}" data-plan="PLUS">PLUS'a Yükselt</button>
            <button type="button" data-admin-action="upgrade_plan" data-customer="${esc(c.id)}" data-plan="ULTRA">ULTRA'ya Yükselt</button>
            <button type="button" data-admin-action="extend_license" data-customer="${esc(c.id)}">+30 Gün Uzat</button>
            <button type="button" data-admin-action="toggle_suspend" data-customer="${esc(c.id)}">${isSuspended ? 'Askıyı Kaldır' : 'Askıya Al'}</button>
          </div>
        </article>`;
      }).join('');
    }

    const issuedBox = $('#adminIssuedLicenses');
    if (issuedBox) {
      issuedBox.innerHTML = issued.length
        ? `<table><thead><tr><th>Tarih</th><th>Müşteri</th><th>Paket</th><th>Kapasite</th><th>Lisans Anahtarı</th><th>İşlem</th></tr></thead><tbody>${issued.map(l => `<tr><td class="mono">${new Date(l.createdAt * 1000).toLocaleDateString('tr-TR')}</td><td><strong>${esc(l.organization)}</strong></td><td><span class="tag">${esc(l.plan)}</span></td><td>${l.maxCameras} Kam / ${l.maxRules} Kural</td><td><code>${esc(l.key)}</code></td><td><button type="button" class="sector-mini-btn" data-copy-license="${esc(l.key)}" data-org="${esc(l.organization)}">Kopyala</button></td></tr>`).join('')}</tbody></table>`
        : '<p class="fine">Bu oturumda henüz yeni lisans anahtarı üretilmedi.</p>';
    }
  } catch (err) {
    adminToken = '';
    try { sessionStorage.removeItem('cortex-admin-token'); } catch (e) {}
    loginCard.hidden = false;
    dash.hidden = true;
    if (logoutBtn) logoutBtn.hidden = true;
  }
}

$('#adminLoginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const errEl = $('#adminLoginError');
  if (errEl) errEl.textContent = '';
  try {
    const d = Object.fromEntries(new FormData(e.target));
    const r = await api('admin/login', d);
    adminToken = r.adminToken;
    try { sessionStorage.setItem('cortex-admin-token', adminToken); } catch (ex) {}
    message(r.message);
    await refreshAdminPanel();
  } catch (err) {
    if (errEl) errEl.textContent = err.message;
  }
});

$('#adminLogoutBtn')?.addEventListener('click', () => {
  adminToken = '';
  try { sessionStorage.removeItem('cortex-admin-token'); } catch (e) {}
  refreshAdminPanel();
  message('Yönetici oturumu kapatıldı.');
});

$('#admRefreshBtn')?.addEventListener('click', () => refreshAdminPanel());

$('#adminLicenseForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const d = Object.fromEntries(new FormData(e.target));
    d.adminToken = adminToken;
    const r = await api('admin/license-generate', d);
    lastGeneratedKey = r.key;
    lastGeneratedOrg = r.organization;
    const box = $('#admGeneratedKeyBox');
    if (box) {
      box.hidden = false;
      box.innerHTML = `<strong>ÜRETİLEN ${esc(r.plan)} LİSANS ANAHTARI (${esc(r.organization)}):</strong><br><code style="font-size:15px;font-weight:700">${esc(r.key)}</code>`;
    }
    if ($('#admCopyKeyBtn')) $('#admCopyKeyBtn').hidden = false;
    if ($('#admApplyLocalBtn')) $('#admApplyLocalBtn').hidden = false;
    if ($('#licenseKeyInput')) $('#licenseKeyInput').value = r.key;
    message(r.message);
    await refreshAdminPanel();
  } catch (err) {
    message(err.message);
  }
});

$('#admCopyKeyBtn')?.addEventListener('click', async () => {
  if (!lastGeneratedKey) return;
  try {
    await navigator.clipboard.writeText(lastGeneratedKey);
    message(`Lisans anahtarı panoya kopyalandı: ${lastGeneratedKey}`);
  } catch (e) {
    message(`Anahtar: ${lastGeneratedKey}`);
  }
});

$('#admApplyLocalBtn')?.addEventListener('click', async () => {
  if (!lastGeneratedKey) return;
  try {
    const r = await api('license-activate', { key: lastGeneratedKey, organization: lastGeneratedOrg || 'Kurumsal Müşteri' });
    message(r.message);
    await refresh();
    await refreshAdminPanel();
  } catch (err) {
    message(err.message);
  }
});

$('#copilotQuery')?.addEventListener('input', renderEventsList);
$('#eventCategoryFilter')?.addEventListener('change', renderEventsList);
$('#eventReviewFilter')?.addEventListener('change', renderEventsList);

$('#exportCsvBtn')?.addEventListener('click', () => {
  const q = encodeURIComponent($('#copilotQuery')?.value || '');
  const cat = encodeURIComponent($('#eventCategoryFilter')?.value || '');
  const rev = encodeURIComponent($('#eventReviewFilter')?.value || '');
  window.location.href = `/api/events-export?q=${q}&category=${cat}&reviewed=${rev}`;
});

$('#openMatrixWall')?.addEventListener('click', () => {
  matrixOpen = true;
  if ($('#matrixWallModal')) $('#matrixWallModal').hidden = false;
  renderMatrixWall();
});

$('#openMatrixWallBtn')?.addEventListener('click', () => {
  matrixOpen = true;
  if ($('#matrixWallModal')) $('#matrixWallModal').hidden = false;
  renderMatrixWall();
});

$('#nvrAutoTourBtn')?.addEventListener('click', () => {
  toggleNvrAutoTour();
});

$('#closeMatrixWall')?.addEventListener('click', () => {
  closeMatrixWallModal();
});

$('#wallHeatmapToggle')?.addEventListener('click', () => {
  matrixHeatmap = !matrixHeatmap;
  $('#wallHeatmapToggle')?.classList.toggle('primary', matrixHeatmap);
  $('#wallHeatmapToggle')?.classList.toggle('active', matrixHeatmap);
  renderMatrixWall();
});

/* --- CUSTOMER LOGIN GATE (#cortexLoginGate) --- */

$('#cortexLoginForm')?.addEventListener('submit', async ev => {
  ev.preventDefault();
  const username = ($('#cortexLoginUser')?.value || '').trim();
  const password = $('#cortexLoginPass')?.value || '';
  const errEl = $('#cortexLoginError');
  const btn = $('#cortexLoginBtn');
  const btnLabel = $('#cortexLoginBtnLabel');
  if (errEl) errEl.textContent = '';
  if (btn) btn.disabled = true;
  if (btnLabel) btnLabel.textContent = 'Kimlik doğrulanıyor...';
  try {
    const res = await api('auth/login', { username, password });
    resetClientTelegramInputs();
    ultraBannerDismissed = false;
    try { sessionStorage.setItem('cortex_logged_in', '1'); } catch (e) {}
    if ($('#cortexLoginGate')) $('#cortexLoginGate').hidden = true;
    syncSignalFieldRunning();
    if ($('#activeUserBadge') && res.user) {
      $('#activeUserBadge').textContent = `${res.user.organization || username} (${res.user.plan || 'PRO'})`;
    }
    message(res.message || `Hoş geldiniz, ${res.user?.organization || username}!`);
    await refresh();
  } catch (err) {
    if (errEl) errEl.textContent = err.message;
  } finally {
    if (btn) btn.disabled = false;
    if (btnLabel) btnLabel.textContent = 'Giriş Yap';
  }
});

$('#logoutCortexBtn')?.addEventListener('click', async () => {
  try { await api('auth/logout', {}); } catch (e) {}
  try { sessionStorage.removeItem('cortex_logged_in'); } catch (e) {}
  currentClientTenantId = '';
  ultraBannerDismissed = false;
  resetClientTelegramInputs();
  if ($('#cortexLoginGate')) $('#cortexLoginGate').hidden = false;
  if ($('#cortexLoginPass')) $('#cortexLoginPass').value = '';
  syncSignalFieldRunning();
  message('Oturum kapatıldı. Cortex güvenlik kilidi devrede.');
});

/* Initialize Theme, Language, SignalField, Login Gate, Interactive Studio & Polling */
initTheme();
initLanguage();
initSignalField();
syncLoginGate();
updateNvrClocks();
initInteractiveStudio();
try {
  const qsTab = new URLSearchParams(window.location.search).get("tab");
  if (qsTab && ["overview", "cameras", "rules", "events", "settings"].includes(qsTab)) {
    tab(qsTab);
  }
} catch (e) {}
refresh().then(() => {
  try {
    const qsEdit = new URLSearchParams(window.location.search).get("edit");
    if (qsEdit === "first" && state?.rules?.[0]) {
      editRule(state.rules[0].id, false);
    }
  } catch (e) {}
});
setInterval(refresh, 2000);
setInterval(updateNvrClocks, 1000);

let discoveryToken = null;
function deviceData() {
  const d = Object.fromEntries(new FormData($('#deviceForm')));
  d.sync = !!d.sync;
  d.https = !!d.https;
  return d;
}

function renderDevices() {
  const el = $('#deviceList');
  if (!el || !state) return;
  const devs = state.devices || [];
  const html = devs.map(d => `<article class="card"><h3>${esc(d.name)}</h3><p>${esc(d.host)} · ${d.sync ? 'Otomatik eşitleme açık' : 'Eşitleme kapalı'}</p><p class="fine">${esc(d.clock.message)}${d.clock.drift == null ? '' : ' · Sapma ' + d.clock.drift + ' sn'}${d.clock.checked ? ' · ' + new Date(d.clock.checked * 1000).toLocaleString('tr-TR') : ''}</p><button data-action="device-toggle" data-id="${d.id}">${d.sync ? 'Eşitlemeyi durdur' : 'Eşitlemeyi aç'}</button> <button data-action="device-delete" data-id="${d.id}">Yönetimden kaldır</button></article>`).join('');
  const key = JSON.stringify(devs);
  setHtmlIfChanged(el, html, key);
}

$('#deviceForm').onsubmit = async e => {
  e.preventDefault();
  const b = e.submitter;
  b.disabled = true;
  discoveryToken = null;
  $('#importChannels').hidden = true;
  $('#channelChoices').textContent = '';
  $('#deviceResult').textContent = 'ONVIF kanalları okunuyor…';
  try {
    const r = await api('recorder-discover', deviceData());
    discoveryToken = r.token;
    $('#channelChoices').innerHTML = r.channels.map(c => `<label class="check"><input type="checkbox" class="channelChoice" value="${esc(c.token)}" ${c.error ? 'disabled' : 'checked'}>${esc(c.name)} · ${c.error ? esc(c.error) : esc(c.encoding) + ' ' + c.width + '×' + c.height}</label>`).join('');
    $('#importChannels').hidden = !r.channels.some(c => !c.error);
    $('#deviceResult').textContent = r.channels.length + ' kanal bulundu. Düşük çözünürlüklü analiz akışı tercih edilir.';
  } catch (e) {
    $('#deviceResult').textContent = e.message;
  } finally {
    b.disabled = false;
  }
};

$('#saveClockDevice').onclick = async () => {
  if (!$('#deviceForm').reportValidity()) return;
  try {
    await api('device-add', deviceData());
    message('Cihaz saat yönetimine eklendi.');
    await refresh();
  } catch (e) {
    message(e.message);
  }
};

$('#importChannels').onclick = async () => {
  const b = $('#importChannels');
  b.disabled = true;
  try {
    const r = await api('recorder-import', {
      token: discoveryToken,
      channels: Array.from(document.querySelectorAll('.channelChoice:checked'), el => el.value)
    });
    let failed = 0;
    for (const id of r.ids) {
      try { await api('toggle', { id }); } catch (e) { failed++; }
    }
    $('#deviceResult').textContent = r.added + ' kamera eklendi; ' + r.duplicates + ' tekrar atlandı.' + (failed ? ' ' + failed + ' kamera başlatılamadı.' : '');
    b.hidden = true;
    $('#channelChoices').textContent = '';
    $('#deviceForm').elements.password.value = '';
    await refresh();
  } catch (e) {
    message(e.message);
  } finally {
    b.disabled = false;
  }
};
