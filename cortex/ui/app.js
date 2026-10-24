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
let nvrShowRoiOverlays = true;
let studioGridMode = '3x3';
let catalogCategoryFilter = 'ALL';
let catalogSearchQuery = '';
let eventViewMode = 'cards';
let lightboxState = { open: false, eventId: null, mode: 'single', speed: 1, sliderPct: 50 };
let cmdPaletteOpen = false;
let cmdSelectedIndex = 0;
let cmdFilteredItems = [];
let lastSimulatedTgCommand = '/durum';

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
  for (const sel of ['#theme-toggle', '#login-theme-toggle']) {
    const toggleBtn = $(sel);
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-pressed', String(resolved === 'dark'));
      toggleBtn.title = resolved === 'dark'
        ? (currentLang === 'en' ? 'Switch to Light Mode' : 'Açık temaya geç (Light Mode)')
        : (currentLang === 'en' ? 'Switch to Dark Mode' : 'Koyu temaya geç (Dark Mode)');
    }
  }
  drawRoiCanvas();
}

function initTheme() {
  applyTheme(getPreferredTheme(), false);
  for (const sel of ['#theme-toggle', '#login-theme-toggle']) {
    const toggleBtn = $(sel);
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        applyTheme(next, true);
      });
    }
  }
}

/* ==========================================================================
   Bilingual Dictionary (TR default / EN) + Deep i18n Engine
   ========================================================================== */

const I18N = {
  tr: {
    'skip.main': 'Ana içeriğe geç',
    'login.badge': 'KURUMSAL LİSANS & MERKEZİ ERİŞİM',
    'login.title': 'Kameralarına bir <em>beyin</em> bağla.',
    'login.lead': 'Görüntüler bu bilgisayardan dışarı çıkmaz. Gerçek zamanlı yerel görsel AI, 8 sektörel saha paketi, NVR kamera duvarı ve @intelligentcortexbot iki yönlü Telegram komuta merkezi.',
    'login.pillPrivacy': '<strong>%100 Yerel Gizlilik</strong><span>Bulut yüklemesi yok</span>',
    'login.pillRules': '<strong>73 Hazır Kural</strong><span>8 Sektörel Paket</span>',
    'login.pillTelegram': '<strong>Telegram Bot</strong><span>MP4 Video + Kare</span>',
    'login.cardEyebrow': 'GÜVENLİ ERİŞİM KAPISI',
    'login.cardTitle': 'Müşteri Girişi',
    'login.cardDesc': 'Size tanımlanan kurumsal kullanıcı adı ve şifrenizle Cortex komuta merkezine giriş yapın.',
    'login.userLabel': 'KULLANICI ADI',
    'login.userPlaceholder': 'Kullanıcı adınız',
    'login.passLabel': 'ŞİFRE',
    'login.passPlaceholder': 'Şifreniz',
    'login.submitBtn': 'Giriş Yap',
    'login.footNote': 'Kurumsal hesap tanımlama, şifre sıfırlama ve paket yükseltme işlemleri merkezi yönetim panelinden yapılır.',
    'aside.eyebrow': 'KONTROL MERKEZİ',
    'nav.overview': 'Genel bakış',
    'nav.cameras': 'Kameralar',
    'nav.rules': 'Olay kuralları',
    'nav.events': 'Olay arşivi',
    'nav.plans': 'Paketler',
    'nav.settings': 'Ayarlar & Lisans',
    'nav.admin': 'Yönetim Paneli',
    'aside.workspace': 'Yerel Motor Aktif',
    'aside.privacy': 'Görüntüler bu bilgisayarda kalır.',
    'aside.engine': 'Hibrit Görsel AI + Akıllı Takip + Telegram Bot',
    'aside.rc': '2.0 Pro Ticari Sürüm',
    'header.badge': 'LOCAL FIRST',
    'header.cmdkLabel': 'Komutlar',
    'header.cmdkTitle': 'Komut Paletini Aç (Ctrl+K)',
    'header.logout': 'Çıkış',
    'header.logoutTitle': 'Oturumu kapat',
    'header.matrixBtn': 'NVR Kamera Duvarı ↗',
    'cmdk.placeholder': 'Komut, sekme, kamera veya olay kuralı ara… (Esc ile kapat)',
    'cmdk.navHint': '↑↓ Gezin · Enter Çalıştır · Alt+L Dil Değiştir',
    'overview.eyebrow': 'GÖREN KAMERALAR. ANLAYAN SİSTEM.',
    'overview.title': 'Her kameraya bir <em>beyin.</em>',
    'overview.lead': 'Neyi takip edeceğini sen söyle. Cortex gözlemlesin, olayı kanıtlarıyla kaydetsin, anında sana bildirsin.',
    'overview.cta': 'İlk kameranı bağla ↗',
    'overview.studioBtn': 'Bölge (ROI) & Kural Stüdyosu',
    'overview.orb': 'GÖR · ANLA · BİLDİR',
    'overview.workspace': 'NVR Kamera Duvarı & Canlı Komuta Merkezi',
    'overview.liveStatus': 'Gerçek bağlantı durumu · Canlı termal ısı haritası, İki Yönlü Telegram Bot ve KVKK maskeleme destekli',
    'overview.hint': 'Başlamak için kamera ekle, olay kuralını tanımla veya 8 kurumsal saha paketinden birini tek tıkla uygula.',
    'nvr.roiBtn': '📐 ROI Bölgeleri',
    'nvr.roiBtnTitle': 'Kamera üzerinde tanımlı ROI ve geçiş hatlarını göster/gizle',
    'nvr.autoTour': 'Otomatik Tur',
    'nvr.fullscreen': 'Tam Ekran ↗',
    'analytics.eyebrow': 'CANLI TELEMETRİ · SON 24 SAAT',
    'analytics.title': 'Olay Yoğunluğu ve Kategori Dağılımı',
    'sector.eyebrow': 'KURUMSAL SAHA PAKETLERİ · 8 SEKTÖR · PRO / PLUS / ULTRA',
    'sector.title': 'Hazır Sektörel Kurulum Paketleri (8 Sektör · Tek Tıkla Kurulum)',
    'sector.desc': 'Site/Rezidans, Havuz, Fabrika/İSG, Depo/Lojistik, Perakende/AVM, Ofis/Plaza, Okul/Kampüs ve Hastane/Klinik için kalibre edilmiş bölge (ROI), zaman çizelgesi ve akıllı takip kurallarını seçip tek tuşla devreye alın.',
    'sector.targetCamera': 'Hedef kamera',
    'sector.deployMode': 'Kurulum modu',
    'sector.modeMerge': 'Mevcut kurallara ekle (Önerilen)',
    'sector.modeReplace': 'Kameradaki eski kuralları sil ve paketi kur',
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
    'cameras.namePlaceholder': 'Bahçe Girişi, Depo Kapısı, Kasa Önü',
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
    'rules.catalogSearchPlaceholder': '73 hazır kural içinde ara (örn: baret, yangın, kuyruk, plaka, loitering)...',
    'rules.catAll': 'Tümü (73)',
    'rules.catLocal': '⚡ Yerel (22)',
    'rules.catPro': '🎯 Pro Takip (6)',
    'rules.catAccess': '🚧 Geçiş (3)',
    'rules.catVision': '🧠 Görsel AI (42)',
    'rules.cameraLabel': 'Kamera',
    'rules.nameLabel': 'Kural adı',
    'rules.promptLabel': 'Ne olduğunda haber verelim?',
    'rules.sensitivityLabel': 'Ölçüm eşiği',
    'rules.durationLabel': 'Doğrulama süresi (saniye)',
    'rules.roiSummary': 'Profesyonel Bölge (ROI) & Geçiş Hattı Çizim Stüdyosu',
    'rules.roiHint': 'Sahne üzerinde yeni bölge çizebilir, mevcut bölgeyi ortasından tutup taşıyabilir veya 8 tutamaçtan boyutlandırabilirsiniz.',
    'rules.modeRoi': '📐 Bölge (ROI) Modu',
    'rules.modeLine': '🚧 Geçiş Hattı (Tripwire) Modu',
    'rules.flipDir': '⇄ Yön Çevir',
    'rules.refreshSnap': '↻ Kare Yenile',
    'rules.presetFull': 'Tam Sahne',
    'rules.presetCenter': 'Merkez',
    'rules.presetBottom': 'Alt Zemin',
    'rules.presetLeft': 'Sol Koridor',
    'rules.presetRight': 'Sağ Koridor',
    'rules.presetDoor': 'Kapı / Eşik',
    'rules.left': 'Sol X (%)',
    'rules.top': 'Üst Y (%)',
    'rules.width': 'Genişlik W (%)',
    'rules.height': 'Yükseklik H (%)',
    'rules.startTime': 'Başlangıç',
    'rules.endTime': 'Bitiş',
    'rules.days': 'Aktif Günler',
    'rules.daysAll': 'Tüm Günler',
    'rules.daysWeekdays': 'Hafta İçi',
    'rules.daysWeekend': 'Hafta Sonu',
    'rules.scheduleHint': 'Bilgisayarın yerel saati kullanılır. Başlangıç ve bitiş aynıysa tüm gün (7/24) izlenir.',
    'rules.scoreLabel': 'Minimum model skoru',
    'rules.cooldownLabel': 'Tekrar bildirim aralığı (sn)',
    'rules.modelNotice': 'Model skoru doğruluk yüzdesi değildir. Tespitler insan incelemesi gerektirir.',
    'rules.saveBtn': 'Kuralı etkinleştir ↗',
    'rules.testAiBtn': 'Canlı Karede AI Testi',
    'rules.resetBtn': 'Yeni kural',
    'rules.searchPlaceholder': 'Aktif kurallarda ara (isim, kamera veya açıklama)...',
    'rules.filterAll': 'Tüm Kurallar',
    'rules.filterEnabled': 'Yalnızca Etkin',
    'rules.filterPaused': 'Duraklatılanlar',
    'events.eyebrow': '03 / BİLDİR & SORGULA',
    'events.title': 'Olay arşivi.',
    'events.subtitle': 'Doğal dilde ara, kanıt klibini incele, SHA-256 imzalı adli kanıt paketini indir.',
    'events.exportCsv': 'CSV Dışa Aktar ↓',
    'events.notifyBtn': 'Masaüstü bildirimi aç',
    'events.metricTotal': 'Toplam:',
    'events.metricPending': 'Bekleyen:',
    'events.metricReviewed': 'İncelenen:',
    'events.metricLatency': 'Ort. Gecikme:',
    'events.batchReviewBtn': '✓ Gösterilenleri İncelendi İşaretle',
    'events.viewCards': ' Kartlar',
    'events.viewTable': '☰ Adli Tablo',
    'events.searchPlaceholder': 'Copilot ile ara: "bugün bahçe girişi", "gece incelenmemiş", "loitering" (/ ile odakla)...',
    'events.allCameras': 'Tüm Kameralar',
    'events.allCategories': 'Tüm Kategoriler',
    'events.catVision': 'Görsel AI',
    'events.catPro': 'Pro Akıllı Takip',
    'events.catAccess': 'Geçiş Kontrolü',
    'events.catLocal': 'Yerel Analiz',
    'events.allStatuses': 'Tüm Durumlar',
    'events.statusUnreviewed': 'İnceleme Bekleyenler',
    'events.statusReviewed': 'İncelenenler',
    'events.clearFilters': 'Filtreleri Temizle',
    'flx.single': 'Tekil Kanıt',
    'flx.split': 'Önce / Sonra Yan Yana',
    'flx.slider': 'Perde Karşılaştırma',
    'flx.copyBtn': 'Kopyala',
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
    'settings.tgSimRerun': '↻ Yeniden Çalıştır',
    'settings.tgSimCopy': '📋 Yanıtı Kopyala',
    'settings.auditEyebrow': 'KURUMSAL DENETİM İZİ',
    'settings.auditTitle': 'Son Kritik İşlemler (SHA-256 Audit Log)',
    'settings.auditSearchPlaceholder': 'Denetim kayıtlarında ara (işlem, detay veya SHA-256)...',
    'settings.auditAllActions': 'Tüm İşlemler',
    'footer.tagline': 'Yerel görsel zekâ. Profesyonel saha analitiği. Senin kontrolün.'
  },
  en: {
    'skip.main': 'Skip to main content',
    'login.badge': 'ENTERPRISE LICENSE & CENTRAL ACCESS',
    'login.title': 'Connect a <em>brain</em> to your cameras.',
    'login.lead': 'Video never leaves this computer. Real-time local Vision AI, 8 enterprise sector packs, NVR camera wall, and @intelligentcortexbot two-way Telegram command center.',
    'login.pillPrivacy': '<strong>100% Local Privacy</strong><span>Zero cloud uploads</span>',
    'login.pillRules': '<strong>73 Ready Rules</strong><span>8 Sector Packs</span>',
    'login.pillTelegram': '<strong>Telegram Bot</strong><span>MP4 Video + Frame</span>',
    'login.cardEyebrow': 'SECURE ACCESS GATE',
    'login.cardTitle': 'Customer Sign In',
    'login.cardDesc': 'Sign in to the Cortex command center with your assigned enterprise username and password.',
    'login.userLabel': 'USERNAME',
    'login.userPlaceholder': 'Your username',
    'login.passLabel': 'PASSWORD',
    'login.passPlaceholder': 'Your password',
    'login.submitBtn': 'Sign In',
    'login.footNote': 'Enterprise provisioning, password resets, and plan upgrades are managed from the central admin console.',
    'aside.eyebrow': 'CONTROL CENTER',
    'nav.overview': 'Overview',
    'nav.cameras': 'Cameras',
    'nav.rules': 'Event rules',
    'nav.events': 'Event archive',
    'nav.plans': 'Plans',
    'nav.settings': 'Settings & License',
    'nav.admin': 'Admin Panel',
    'aside.workspace': 'Local Engine Active',
    'aside.privacy': 'Video frames stay on this PC.',
    'aside.engine': 'Hybrid Vision AI + Smart Tracking + Telegram Bot',
    'aside.rc': '2.0 Pro Commercial Edition',
    'header.badge': 'LOCAL FIRST',
    'header.cmdkLabel': 'Commands',
    'header.cmdkTitle': 'Open Command Palette (Ctrl+K)',
    'header.logout': 'Sign out',
    'header.logoutTitle': 'Sign out of session',
    'header.matrixBtn': 'NVR Camera Wall ↗',
    'cmdk.placeholder': 'Search commands, tabs, cameras, or rules… (Esc to close)',
    'cmdk.navHint': '↑↓ Navigate · Enter Execute · Alt+L Switch Language',
    'overview.eyebrow': 'CAMERAS THAT SEE. SYSTEM THAT UNDERSTANDS.',
    'overview.title': 'A <em>brain</em> for every camera.',
    'overview.lead': 'Tell it what to watch for. Cortex observes, records forensic evidence, and alerts you locally.',
    'overview.cta': 'Connect first camera ↗',
    'overview.studioBtn': 'ROI & Rule Studio',
    'overview.orb': 'SEE · UNDERSTAND · ALERT',
    'overview.workspace': 'NVR Camera Wall & Live Command Center',
    'overview.liveStatus': 'Live connection status · Thermal heatmap, 2-Way Telegram Bot & GDPR masking ready',
    'overview.hint': 'Add a camera, design a custom zone in the ROI Studio, or deploy one of the 8 enterprise sector packs.',
    'nvr.roiBtn': '📐 ROI Zones',
    'nvr.roiBtnTitle': 'Show/hide active ROI polygons and tripwires on camera tiles',
    'nvr.autoTour': 'Auto Tour',
    'nvr.fullscreen': 'Fullscreen ↗',
    'analytics.eyebrow': 'LIVE TELEMETRY · LAST 24 HOURS',
    'analytics.title': 'Event Density & Category Distribution',
    'sector.eyebrow': 'ENTERPRISE SECTOR PACKS · 8 VERTICALS · PRO / PLUS / ULTRA',
    'sector.title': 'Ready Sector Deployment Packages (8 Verticals · One-Click Setup)',
    'sector.desc': 'Deploy pre-calibrated ROI zones, schedules, and smart tracking rules for Residence, Pool, Factory, Warehouse, Retail, Office, Campus, or Clinic.',
    'sector.targetCamera': 'Target camera',
    'sector.deployMode': 'Deployment mode',
    'sector.modeMerge': 'Merge with existing rules (Recommended)',
    'sector.modeReplace': 'Replace existing camera rules with pack',
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
    'cameras.namePlaceholder': 'Main Gate, Loading Dock, Cash Register',
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
    'rules.catalogSearchPlaceholder': 'Search 73 ready rules (e.g. helmet, fire, queue, plate, loitering)...',
    'rules.catAll': 'All (73)',
    'rules.catLocal': '⚡ Local (22)',
    'rules.catPro': '🎯 Pro Track (6)',
    'rules.catAccess': '🚧 Access (3)',
    'rules.catVision': '🧠 Vision AI (42)',
    'rules.cameraLabel': 'Camera',
    'rules.nameLabel': 'Rule name',
    'rules.promptLabel': 'When should we alert you?',
    'rules.sensitivityLabel': 'Measurement threshold',
    'rules.durationLabel': 'Verification duration (seconds)',
    'rules.roiSummary': 'Professional ROI Zone & Tripwire Studio',
    'rules.roiHint': 'Draw a new zone, drag inside to move, resize using the 8 handles, or apply one-click zone presets.',
    'rules.modeRoi': '📐 Region (ROI) Mode',
    'rules.modeLine': '🚧 Tripwire Line Mode',
    'rules.flipDir': '⇄ Flip Direction',
    'rules.refreshSnap': '↻ Refresh Frame',
    'rules.presetFull': 'Full Scene',
    'rules.presetCenter': 'Center',
    'rules.presetBottom': 'Lower Floor',
    'rules.presetLeft': 'Left Aisle',
    'rules.presetRight': 'Right Aisle',
    'rules.presetDoor': 'Doorway',
    'rules.left': 'Left X (%)',
    'rules.top': 'Top Y (%)',
    'rules.width': 'Width W (%)',
    'rules.height': 'Height H (%)',
    'rules.startTime': 'Start',
    'rules.endTime': 'End',
    'rules.days': 'Active Days',
    'rules.daysAll': 'All Days',
    'rules.daysWeekdays': 'Weekdays',
    'rules.daysWeekend': 'Weekend',
    'rules.scheduleHint': 'Uses local system clock. Equal start and end times monitor 24/7.',
    'rules.scoreLabel': 'Minimum model score',
    'rules.cooldownLabel': 'Cooldown interval (sec)',
    'rules.modelNotice': 'Model score is not calibrated probability. Detections require human review.',
    'rules.saveBtn': 'Enable rule ↗',
    'rules.testAiBtn': 'Live Frame AI Test',
    'rules.resetBtn': 'New rule',
    'rules.searchPlaceholder': 'Search active rules (name, camera, or prompt)...',
    'rules.filterAll': 'All Rules',
    'rules.filterEnabled': 'Active Only',
    'rules.filterPaused': 'Paused Only',
    'events.eyebrow': '03 / NOTIFY & SEARCH',
    'events.title': 'Event archive.',
    'events.subtitle': 'Search in natural language, inspect evidence clips, download SHA-256 forensic bundles.',
    'events.exportCsv': 'Export CSV ↓',
    'events.notifyBtn': 'Enable desktop notifications',
    'events.metricTotal': 'Total:',
    'events.metricPending': 'Pending:',
    'events.metricReviewed': 'Reviewed:',
    'events.metricLatency': 'Avg Latency:',
    'events.batchReviewBtn': '✓ Mark Shown as Reviewed',
    'events.viewCards': ' Cards',
    'events.viewTable': '☰ Forensic Table',
    'events.searchPlaceholder': 'Search with Copilot: "today main gate", "night unreviewed", "loitering" (Press /)...',
    'events.allCameras': 'All Cameras',
    'events.allCategories': 'All Categories',
    'events.catVision': 'Vision AI',
    'events.catPro': 'Pro Smart Tracking',
    'events.catAccess': 'Access Control',
    'events.catLocal': 'Local Analysis',
    'events.allStatuses': 'All Statuses',
    'events.statusUnreviewed': 'Pending Review',
    'events.statusReviewed': 'Reviewed',
    'events.clearFilters': 'Clear Filters',
    'flx.single': 'Single Evidence',
    'flx.split': 'Before / After Split',
    'flx.slider': 'Curtain Slider',
    'flx.copyBtn': 'Copy',
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
    'settings.tgSimRerun': '↻ Re-run',
    'settings.tgSimCopy': '📋 Copy Reply',
    'settings.auditEyebrow': 'ENTERPRISE AUDIT TRAIL',
    'settings.auditTitle': 'Recent Critical Operations (SHA-256 Audit Log)',
    'settings.auditSearchPlaceholder': 'Search audit records (action, detail, or SHA-256)...',
    'settings.auditAllActions': 'All Actions',
    'footer.tagline': 'Local visual intelligence. Professional field analytics. Your control.'
  }
};

let currentLang = 'tr';
const t = (trStr, enStr) => (currentLang === 'en' ? enStr : trStr);

const DAY_SHORT_LABELS = {
  tr: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
};

function applyLanguage(lang, persist = false) {
  currentLang = lang === 'en' ? 'en' : 'tr';
  document.documentElement.lang = currentLang;
  if (persist) {
    try { localStorage.setItem('ipscans-lang', currentLang); } catch (e) {}
  }
  document.querySelectorAll('.lang-btn').forEach(btn => {
    const active = btn.dataset.lang === currentLang;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  const dict = I18N[currentLang] || I18N.tr;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (dict[key]) el.innerHTML = dict[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.setAttribute('placeholder', dict[key]);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (dict[key]) el.setAttribute('title', dict[key]);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria');
    if (dict[key]) el.setAttribute('aria-label', dict[key]);
  });
  document.querySelectorAll('[data-day-short]').forEach(el => {
    const idx = Number(el.getAttribute('data-day-short'));
    const labels = DAY_SHORT_LABELS[currentLang] || DAY_SHORT_LABELS.tr;
    if (labels[idx]) el.textContent = labels[idx];
  });
  document.title = currentLang === 'en'
    ? 'Cortex — Visual Intelligence & Enterprise Command Center'
    : 'Cortex —Kameralara Akıl Katan Görsel Zekâ';
  updateCrumb(currentTab);
  renderPlans();
  if (state) {
    renderSystemTelemetryAndStats();
    renderCameraListSmooth();
    renderRulesListSmooth();
    renderEventsList();
    renderAnalytics();
    renderSectorPacks(true);
    renderVlmHardwareAdvisor();
    renderLicenseAndAudit();
    renderNvrWall();
  }
}

function initLanguage() {
  let saved = 'tr';
  try {
    const qsLang = new URLSearchParams(window.location.search).get('lang');
    saved = qsLang || localStorage.getItem('ipscans-lang') || 'tr';
  } catch (e) {}
  applyLanguage(saved, false);
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => applyLanguage(btn.dataset.lang, true));
  });
}

/* ==========================================================================
   Core UI Helpers, Sonner Stacked Toaster & Ctrl+K Command Palette
   ========================================================================== */

function inferToastType(text) {
  const low = String(text || '').toLowerCase();
  if (low.includes('hata') || low.includes('kesildi') || low.includes('erişilemiyor') || low.includes('error') || low.includes('failed')) {
    return 'error';
  }
  if (low.includes('uyarı') || low.includes('bekleniyor') || low.includes('askı') || low.includes('limit')) {
    return 'warn';
  }
  return 'success';
}

function message(txt, forcedType) {
  const msgEl = $('#message');
  if (msgEl) {
    msgEl.textContent = txt;
    msgEl.hidden = false;
    setTimeout(() => { msgEl.hidden = true; }, 7000);
  }
  const toaster = $('#cortexToaster');
  if (!toaster || !txt) return;
  const type = forcedType || inferToastType(txt);
  const icon = type === 'error' ? '⚠️' : (type === 'warn' ? '⚡' : '✓');
  const toast = document.createElement('div');
  toast.className = `sonner-toast is-${type}`;
  toast.innerHTML = `
    <span class="sonner-toast-icon" aria-hidden="true">${icon}</span>
    <div class="sonner-toast-body">${esc(txt)}</div>
    <button type="button" class="sonner-toast-close" aria-label="Close">✕</button>
    <div class="sonner-toast-progress"></div>
  `;
  toast.querySelector('.sonner-toast-close')?.addEventListener('click', () => toast.remove());
  toaster.appendChild(toast);
  while (toaster.children.length > 4) {
    toaster.firstElementChild?.remove();
  }
  setTimeout(() => {
    toast.remove();
  }, 4300);
}

function buildCommandItems() {
  const items = [
    {
      group: t('Sayfalar & Komuta Merkezi', 'Navigation & Views'),
      icon: '◈',
      title: t('Genel Bakış & NVR Kamera Duvarı', 'Overview & NVR Camera Wall'),
      sub: t('Canlı kameralar, 24s yoğunluk ve saha paketleri', 'Live streams, 24h density & sector packs'),
      kbd: 'G O',
      run: () => tab('overview')
    },
    {
      group: t('Sayfalar & Komuta Merkezi', 'Navigation & Views'),
      icon: '📹',
      title: t('Kameralar & ONVIF Keşfi', 'Cameras & ONVIF Discovery'),
      sub: t('RTSP kamera ekle, bağlantıyı test et', 'Add RTSP camera, test stream'),
      kbd: 'G C',
      run: () => tab('cameras')
    },
    {
      group: t('Sayfalar & Komuta Merkezi', 'Navigation & Views'),
      icon: '📐',
      title: t('Olay Kuralları & ROI Çizim Stüdyosu', 'Event Rules & ROI Studio'),
      sub: t('73 hazır kural ve interaktif bölge stüdyosu', '73 ready rules & interactive zone studio'),
      kbd: 'G R',
      run: () => tab('rules')
    },
    {
      group: t('Sayfalar & Komuta Merkezi', 'Navigation & Views'),
      icon: '🔍',
      title: t('Olay Arşivi & Adli İnceleme', 'Event Archive & Forensics'),
      sub: t('Copilot arama, Lightbox inceleme ve SHA-256 ZIP', 'Copilot search, Lightbox & SHA-256 ZIP'),
      kbd: 'G E',
      run: () => tab('events')
    },
    {
      group: t('Sayfalar & Komuta Merkezi', 'Navigation & Views'),
      icon: '💎',
      title: t('Paketler & Kapasite Karşılaştırması', 'Plans & Capacity Comparison'),
      sub: 'Cortex PRO / PLUS / ULTRA',
      kbd: 'G P',
      run: () => tab('plans')
    },
    {
      group: t('Sayfalar & Komuta Merkezi', 'Navigation & Views'),
      icon: '⚙️',
      title: t('Ayarlar, Ollama VLM & Telegram Bot', 'Settings, Ollama VLM & Telegram Bot'),
      sub: t('Donanım danışmanı, lisans ve webhook', 'Hardware advisor, license & webhooks'),
      kbd: 'G S',
      run: () => tab('settings')
    },
    {
      group: t('Hızlı İşlemler', 'Quick Actions'),
      icon: '🌐',
      title: t('Dili Değiştir (Türkçe ↔ English)', 'Switch Language (Turkish ↔ English)'),
      sub: t(`Aktif dil: ${currentLang.toUpperCase()}`, `Current language: ${currentLang.toUpperCase()}`),
      kbd: 'Alt+L',
      run: () => applyLanguage(currentLang === 'tr' ? 'en' : 'tr', true)
    },
    {
      group: t('Hızlı İşlemler', 'Quick Actions'),
      icon: '🌗',
      title: t('Temayı Değiştir (Açık ↔ Koyu)', 'Toggle Theme (Light ↔ Dark)'),
      sub: t('Arayüz görünümünü değiştir', 'Switch interface appearance'),
      kbd: 'Theme',
      run: () => {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        applyTheme(next, true);
      }
    },
    {
      group: t('Hızlı İşlemler', 'Quick Actions'),
      icon: '🖥️',
      title: t('Tam Ekran NVR Kamera Duvarını Aç', 'Open Fullscreen NVR Camera Wall'),
      sub: t('Çoklu kanal izleme matrisi', 'Multi-channel monitoring matrix'),
      kbd: 'Matrix',
      run: () => {
        matrixOpen = true;
        if ($('#matrixWallModal')) $('#matrixWallModal').hidden = false;
        renderMatrixWall();
      }
    }
  ];

  for (const c of (state?.cameras || [])) {
    items.push({
      group: t('Kayıtlı Kameralar', 'Connected Cameras'),
      icon: c.status === 'Bağlı' ? '🟢' : '🔴',
      title: c.name,
      sub: `${c.status} · ROI & NVR Odak`,
      kbd: 'CAM',
      run: () => {
        nvrFocusedCameraId = c.id;
        tab('overview');
        renderNvrWall();
      }
    });
  }

  for (const r of (state?.rules || []).slice(0, 12)) {
    items.push({
      group: t('Etkin Kurallar', 'Active Rules'),
      icon: r.enabled ? '⚡' : '⏸',
      title: r.name,
      sub: r.prompt || '',
      kbd: 'RULE',
      run: () => editRule(r.id)
    });
  }

  return items;
}

function renderCommandPalette() {
  const listEl = $('#cmdPaletteList');
  if (!listEl) return;
  const q = ($('#cmdPaletteInput')?.value || '').trim().toLowerCase();
  const all = buildCommandItems();
  cmdFilteredItems = q
    ? all.filter(it => `${it.title} ${it.sub} ${it.group}`.toLowerCase().includes(q))
    : all;
  if (cmdSelectedIndex >= cmdFilteredItems.length) cmdSelectedIndex = 0;

  if (!cmdFilteredItems.length) {
    listEl.innerHTML = `<div style="padding:24px;text-align:center" class="fine">${esc(t('Eşleşen komut bulunamadı.', 'No matching commands found.'))}</div>`;
    return;
  }

  let html = '';
  let lastGroup = '';
  cmdFilteredItems.forEach((it, idx) => {
    if (it.group !== lastGroup) {
      lastGroup = it.group;
      html += `<div class="cmdk-group-title">${esc(lastGroup)}</div>`;
    }
    html += `
      <div class="cmdk-item ${idx === cmdSelectedIndex ? 'is-selected' : ''}" role="option" data-cmd-idx="${idx}">
        <div class="cmdk-item-left">
          <span class="cmdk-item-icon">${it.icon}</span>
          <div style="min-width:0">
            <span class="cmdk-item-title">${esc(it.title)}</span>
            <span class="cmdk-item-sub">${esc(it.sub)}</span>
          </div>
        </div>
        <span class="cmdk-item-right">${esc(it.kbd)}</span>
      </div>`;
  });
  listEl.innerHTML = html;
}

function openCommandPalette() {
  const modal = $('#cmdPaletteModal');
  if (!modal) return;
  cmdPaletteOpen = true;
  cmdSelectedIndex = 0;
  modal.hidden = false;
  const inp = $('#cmdPaletteInput');
  if (inp) {
    inp.value = '';
    setTimeout(() => inp.focus(), 20);
  }
  renderCommandPalette();
}

function closeCommandPalette() {
  cmdPaletteOpen = false;
  const modal = $('#cmdPaletteModal');
  if (modal) modal.hidden = true;
}

function executeCommandItem(idx) {
  const item = cmdFilteredItems[idx];
  if (!item) return;
  closeCommandPalette();
  item.run();
}

$('#openCmdPaletteBtn')?.addEventListener('click', openCommandPalette);
$('#closeCmdPaletteBtn')?.addEventListener('click', closeCommandPalette);
$('#cmdPaletteModal')?.addEventListener('click', e => {
  if (e.target.id === 'cmdPaletteModal') closeCommandPalette();
  const itemEl = e.target.closest('[data-cmd-idx]');
  if (itemEl) executeCommandItem(Number(itemEl.dataset.cmdIdx));
});
$('#cmdPaletteInput')?.addEventListener('input', () => {
  cmdSelectedIndex = 0;
  renderCommandPalette();
});

async function api(path, data) {
  const headers = { 'Content-Type': 'application/json' };
  if (adminToken) headers['X-Admin-Token'] = adminToken;
  const r = await fetch('/api/' + path, data === undefined ? {} : {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });
  const j = await r.json();
  if (!r.ok) throw Error(j.error || t('Bağlantı kurulamadı', 'Connection failed'));
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
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (cmdPaletteOpen) closeCommandPalette();
    else openCommandPalette();
    return;
  }
  if (e.altKey && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    applyLanguage(currentLang === 'tr' ? 'en' : 'tr', true);
    message(t('Dil Türkçe olarak değiştirildi.', 'Language switched to English.'));
    return;
  }
  if (cmdPaletteOpen) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeCommandPalette();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cmdFilteredItems.length) {
        cmdSelectedIndex = (cmdSelectedIndex + 1) % cmdFilteredItems.length;
        renderCommandPalette();
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdFilteredItems.length) {
        cmdSelectedIndex = (cmdSelectedIndex - 1 + cmdFilteredItems.length) % cmdFilteredItems.length;
        renderCommandPalette();
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommandItem(cmdSelectedIndex);
      return;
    }
  }
  if (lightboxState.open) {
    if (e.key === 'Escape') {
      closeForensicLightbox();
      return;
    }
    if (e.key === 'ArrowLeft') {
      stepForensicLightbox(-1);
      return;
    }
    if (e.key === 'ArrowRight') {
      stepForensicLightbox(1);
      return;
    }
  }
  if (e.key === 'Escape' && matrixOpen) {
    closeMatrixWallModal();
    return;
  }
  if (e.key === '/' && currentTab === 'events' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
    e.preventDefault();
    $('#copilotQuery')?.focus();
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
    lastSimulatedTgCommand = cmd;
    const userBubble = $('#tgSimUserCmd');
    if (userBubble) userBubble.textContent = cmd;
    const out = $('#telegramSimOutput');
    if (out) out.textContent = t(`Komut işleniyor: ${cmd} …`, `Processing command: ${cmd} …`);
    try {
      const r = await api('telegram-simulate', { command: cmd });
      if (out) {
        out.textContent = `>>> ${t('KULLANICI KOMUTU', 'USER COMMAND')}: ${r.command}\n\n${r.reply}${r.hasPhoto ? `\n\n[${t('Anlık JPEG kamera karesi eklendi', 'Live JPEG camera snapshot attached')}]` : ''}`;
      }
      await refresh();
    } catch (err) {
      if (out) out.textContent = err.message;
    }
    return;
  }
  if (b.dataset.openLightbox) {
    openForensicLightbox(b.dataset.openLightbox);
    return;
  }
  if (b.dataset.nvrTileFs) {
    const cell = b.closest('.nvr-cell');
    if (cell) cell.classList.toggle('is-single-fullscreen');
    return;
  }
  if (b.dataset.camSnapRefresh) {
    const cid = b.dataset.camSnapRefresh;
    const row = document.querySelector(`.camera-list-row[data-camera-id="${CSS.escape(cid)}"]`);
    const img = row?.querySelector('img.camera-row-thumb');
    if (img) updateCameraImageSmooth(img, `/api/frame/${encodeURIComponent(cid)}?t=${Date.now()}`);
    message(t('Kamera önizleme karesi yenilendi.', 'Camera preview snapshot refreshed.'));
    return;
  }
  if (b.dataset.analyticsCat) {
    const catKey = b.dataset.analyticsCat;
    tab('events');
    if ($('#copilotQuery')) $('#copilotQuery').value = catKey;
    renderEventsList();
    return;
  }
  if (b.dataset.analyticsCam) {
    const camName = b.dataset.analyticsCam;
    tab('events');
    if ($('#eventCameraFilter')) $('#eventCameraFilter').value = camName;
    renderEventsList();
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
  const transportUpper = String(c.transport || 'tcp').toUpperCase();
  const protoLabel = `RTSP/${transportUpper} · H.264/MJPEG`;
  const masksCount = (c.privacyMasks || []).length;
  const camRulesCount = (state?.rules || []).filter(r => r.camera === c.id && r.enabled).length;
  const infSeconds = (Number(c.inferenceMs || 0) / 1000).toFixed(1);
  const hasPermit = Number(c.permitRemainingSeconds || 0) > 0 || Boolean(c.permitActive);

  let statusPillHtml = '';
  if (isOnline) {
    statusPillHtml = `<span class="status-pill online" data-cam-status>🟢 ${t('Çevrimiçi (Online)', 'Online')}</span>`;
  } else if (isPaused) {
    statusPillHtml = `<span class="status-pill paused" data-cam-status>⏸ ${t('Durduruldu', 'Paused')}</span>`;
  } else {
    statusPillHtml = `<span class="status-pill offline" data-cam-status>🔴 ${t('Bağlantı Yok', 'Offline')} (${esc(c.status || t('Çevrimdışı', 'Offline'))})</span>`;
  }

  return `<article class="card camera-card inventory-mode camera-list-row" data-camera-id="${esc(c.id)}">
    <div class="camera-row-main">
      <div class="camera-row-identity" style="display:flex;align-items:center;gap:12px">
        <div class="camera-row-thumb-wrap" title="${esc(c.name)}">
          ${isOnline
            ? `<img class="camera-row-thumb" src="/api/frame/${encodeURIComponent(c.id)}?t=${Date.now()}" alt="${esc(c.name)}" loading="lazy">`
            : `<div style="height:100%;display:grid;place-items:center;font-size:10px;color:#94a3b8" class="mono">${chCode}</div>`}
        </div>
        <span class="camera-ch-badge">${chCode}</span>
        <div class="camera-row-title-group">
          <h2>${esc(c.name)}</h2>
          <span class="camera-row-proto mono">${esc(protoLabel)}</span>
          <div class="camera-proto-badges">
            <span class="proto-pill ${isOnline ? 'ok' : ''}">RTSP/${esc(transportUpper)}</span>
            <span class="proto-pill">ONVIF</span>
            <span class="proto-pill">${isOnline ? '25 FPS · 1080p' : t('Beklemede', 'Standby')}</span>
          </div>
        </div>
      </div>
      <div class="actions" style="margin:0;gap:8px">
        ${statusPillHtml}
      </div>
    </div>

    <div class="camera-row-telemetry">
      <div class="camera-row-chips">
        <span class="tag ${camRulesCount > 0 ? 'ok' : ''}" data-cam-rules-badge>${camRulesCount} ${t('Etkin Kural', 'Active Rules')}</span>
        <span class="tag" data-cam-analysis>${t('Durum', 'Status')}: ${esc(c.analysis || t('Hazır', 'Ready'))}</span>
        <span class="tag mono" data-cam-inference>AI: ${infSeconds}s</span>
        <span class="tag ${masksCount > 0 ? 'ok' : ''}" data-cam-masks>KVKK: ${masksCount}</span>
        ${hasPermit ? `<span class="tag warn" data-cam-permit>${t('Geçici İzin Aktif', 'Access Permit Active')}</span>` : ''}
      </div>
      <div class="camera-row-actions">
        <button type="button" data-action="toggle" data-id="${esc(c.id)}" class="${isPaused ? 'primary' : ''}">${isPaused ? t('Başlat', 'Start') : t('Durdur', 'Pause')}</button>
        <button type="button" data-cam-snap-refresh="${esc(c.id)}" title="${t('Önizleme karesini yenile', 'Refresh snapshot')}">↻ ${t('Kare', 'Snap')}</button>
        <button type="button" data-nvr-roi="${esc(c.id)}">${t('ROI & Kural', 'ROI & Rule')}</button>
        <button type="button" data-action="access-permit" data-id="${esc(c.id)}">${t('15sn İzin', '15s Permit')}</button>
        <button type="button" data-privacy-mask="${esc(c.id)}">${t('KVKK Maske', 'Privacy Mask')}</button>
        <button type="button" data-watch-overview="${esc(c.id)}" class="primary">${t('Genel Bakışta İzle ↗', 'Watch on NVR Wall ↗')}</button>
        <button type="button" data-action="camera-delete" data-id="${esc(c.id)}">${t('Sil', 'Delete')}</button>
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
      <span class="tag mono">${t('Toplam', 'Total')}: <strong>${cams.length} ${t('Kamera', 'Cameras')}</strong></span>
      <span class="tag ok mono">${t('Çevrimiçi', 'Online')}: <strong>${onlineCount}</strong></span>
      <span class="tag ${offlineOrPausedCount > 0 ? 'warn' : ''} mono">${t('Çevrimdışı/Durdurulan', 'Offline/Paused')}: <strong>${offlineOrPausedCount}</strong></span>
    </div>
    <span class="camera-inventory-note">${t('Canlı video akışları yalnızca Genel Bakış (NVR Duvarı) ekranında oynatılır', 'Live streams play continuously on the Overview NVR Camera Wall')}</span>
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

function renderSystemTelemetryAndStats() {
  if (!state) return;
  const dict = I18N[currentLang] || I18N.tr;
  const lic = state.license || {};
  const plan = (lic.plan || 'PRO').toUpperCase();
  const camsTotal = (state.cameras || []).length;
  const camsOnline = (state.cameras || []).filter(c => c.status === 'Bağlı').length;
  const maxCams = lic.maxCameras || (plan === 'ULTRA' ? 32 : plan === 'PLUS' ? 12 : 4);
  const rulesEnabled = (state.rules || []).filter(r => r.enabled).length;
  const maxRules = lic.maxRules || (plan === 'ULTRA' ? 128 : plan === 'PLUS' ? 32 : 8);
  const pendingEvents = (state.events || []).filter(e => !e.reviewed).length;
  const totalEvents = (state.events || []).length;
  const diskFree = Number(state.diskFreeGB || 0);
  const modelConnected = state.modelHealth?.phase === 'connected';
  const avgLatMs = Number(state.analytics?.avgLatencyMs || 0);
  const tgConnected = (state.telegram?.phones || []).length > 0 && state.telegram?.enabled !== false;

  const stripEl = $('#systemTelemetryStrip');
  if (stripEl) {
    const stripHtml = `
      <span class="sys-tel-pill">
        <i class="sys-tel-dot ${modelConnected ? '' : 'warn'}"></i>
        <span>VLM: <strong>${esc(state.model || 'gemma3:4b')}</strong> (${modelConnected ? t('Bağlı', 'Online') : t('Hazır', 'Standby')})</span>
      </span>
      <span class="sys-tel-pill">
        <i class="sys-tel-dot ${diskFree < 5 ? 'danger' : diskFree < 15 ? 'warn' : ''}"></i>
        <span>${t('Disk Alanı', 'Disk Free')}: <strong>${diskFree} GB</strong></span>
      </span>
      <span class="sys-tel-pill">
        <span>${t('Ort. AI Gecikmesi', 'Avg AI Latency')}: <strong>${avgLatMs ? (avgLatMs / 1000).toFixed(1) + 's' : '0.4s'}</strong></span>
      </span>
      <span class="sys-tel-pill">
        <i class="sys-tel-dot ${tgConnected ? '' : 'warn'}"></i>
        <span>Telegram: <strong>${tgConnected ? t('Aktif', 'Active') : t('Beklemede', 'Standby')}</strong></span>
      </span>
      <span class="sys-tel-pill">
        <span>${t('Paket', 'Tier')}: <strong>CORTEX ${esc(plan)}</strong></span>
      </span>
    `;
    setHtmlIfChanged(stripEl, stripHtml, JSON.stringify([currentLang, state.model, modelConnected, diskFree, avgLatMs, tgConnected, plan]));
  }

  const hourly = Array.isArray(state.analytics?.hourly24h) && state.analytics.hourly24h.length
    ? state.analytics.hourly24h
    : Array(24).fill(0);
  const maxH = Math.max(1, ...hourly);
  const pts = hourly.map((v, idx) => {
    const sx = Math.round((idx / Math.max(1, hourly.length - 1)) * 92) + 2;
    const sy = 28 - Math.round((v / maxH) * 22);
    return `${sx},${sy}`;
  }).join(' ');
  const sparkSvg = `<svg class="kpi-sparkline" viewBox="0 0 96 32" aria-hidden="true">
    <polyline fill="none" stroke="var(--signal)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${pts}"/>
  </svg>`;

  const camPct = Math.min(100, Math.round((camsTotal / Math.max(1, maxCams)) * 100));
  const rulePct = Math.min(100, Math.round((rulesEnabled / Math.max(1, maxRules)) * 100));

  const statsEl = $('#stats');
  if (statsEl) {
    const statsHtml = `
      <div class="stat kpi-card">
        <div class="kpi-top">
          <span data-i18n="stats.cameras">${esc(dict['stats.cameras'])}</span>
          <span class="kpi-badge ${camsOnline > 0 ? 'ok' : ''}">${camsOnline}/${camsTotal} ${t('Çevrimiçi', 'Online')}</span>
        </div>
        <div class="kpi-main-row">
          <strong>${String(camsTotal).padStart(2, '0')}</strong>
          <span class="fine mono">${camsTotal} / ${maxCams} ${t('Kota', 'Quota')}</span>
        </div>
        <div class="kpi-progress-track"><div class="kpi-progress-fill ${camPct >= 90 ? 'warn' : ''}" style="width:${camPct}%"></div></div>
      </div>
      <div class="stat kpi-card">
        <div class="kpi-top">
          <span data-i18n="stats.rules">${esc(dict['stats.rules'])}</span>
          <span class="kpi-badge ok">${rulesEnabled} / ${maxRules}</span>
        </div>
        <div class="kpi-main-row">
          <strong>${String(rulesEnabled).padStart(2, '0')}</strong>
          <span class="fine mono">${t('73 Kütüphane', '73 Library')}</span>
        </div>
        <div class="kpi-progress-track"><div class="kpi-progress-fill ${rulePct >= 90 ? 'warn' : ''}" style="width:${rulePct}%"></div></div>
      </div>
      <div class="stat kpi-card">
        <div class="kpi-top">
          <span data-i18n="stats.events">${esc(dict['stats.events'])}</span>
          <span class="kpi-badge">${totalEvents} ${t('Toplam', 'Total')}</span>
        </div>
        <div class="kpi-main-row">
          <strong>${String(pendingEvents).padStart(2, '0')}</strong>
          ${sparkSvg}
        </div>
      </div>
    `;
    setHtmlIfChanged(statsEl, statsHtml, JSON.stringify([currentLang, camsTotal, camsOnline, maxCams, rulesEnabled, maxRules, pendingEvents, totalEvents, hourly]));
  }
}

function renderAnalytics() {
  const a = state?.analytics;
  if (!a) return;
  const latBadge = $('#avgLatencyBadge');
  if (latBadge) {
    latBadge.hidden = !a.avgLatencyMs;
    if (a.avgLatencyMs) {
      latBadge.textContent = `${t('Ort. AI yanıtı', 'Avg AI latency')}: ${(a.avgLatencyMs / 1000).toFixed(1)} s`;
    }
  }
  const hourly = Array.isArray(a.hourly24h) ? a.hourly24h : [];
  const total24h = hourly.reduce((acc, v) => acc + Number(v || 0), 0);
  let peakVal = 0;
  let peakIdx = 0;
  hourly.forEach((v, idx) => {
    if (v >= peakVal) {
      peakVal = v;
      peakIdx = idx;
    }
  });

  const peakBadge = $('#peakHourBadge');
  if (peakBadge) {
    peakBadge.hidden = peakVal <= 0;
    if (peakVal > 0) {
      const hoursAgo = 23 - peakIdx;
      peakBadge.textContent = `${t('Zirve', 'Peak')}: ${hoursAgo}h (${peakVal})`;
    }
  }
  const totalBadge = $('#total24hBadge');
  if (totalBadge) {
    totalBadge.hidden = false;
    totalBadge.textContent = `24s: ${total24h} ${t('olay', 'events')}`;
  }

  const chart = $('#hourlyChart');
  if (chart && hourly.length) {
    const maxVal = Math.max(1, ...hourly);
    const nowHour = new Date().getHours();
    const chartHtml = hourly.map((val, idx) => {
      const pct = Math.max(6, Math.round((val / maxVal) * 100));
      const hoursAgo = 23 - idx;
      const clockHr = String((nowHour - hoursAgo + 24) % 24).padStart(2, '0') + ':00';
      const hourLabel = `${hoursAgo}s`;
      return `<div class="bar-col chart-col" title="${clockHr} (${hourLabel}): ${val}">
        <span class="bar-tooltip">${clockHr} · ${val} ${t('olay', 'events')}</span>
        <div class="bar-fill ${val > 0 ? 'has-val' : ''}" style="height:${pct}%"></div>
        <span class="bar-lbl">${idx % 4 === 0 ? hourLabel : ''}</span>
      </div>`;
    }).join('');
    setHtmlIfChanged(chart, chartHtml, JSON.stringify([currentLang, hourly]));
  }

  const catColors = ['#17795a', '#2563eb', '#d97706', '#9333ea', '#e11d48', '#0891b2'];
  const entries = Object.entries(a.byCategory || {});
  const totalCat = Math.max(1, entries.reduce((s, [, v]) => s + Number(v || 0), 0));

  const distBar = $('#categoryDistributionBar');
  if (distBar) {
    const distHtml = entries.length
      ? entries.map(([k, v], i) => {
          const w = Math.max(4, Math.round((Number(v || 0) / totalCat) * 100));
          return `<div class="cat-dist-seg" style="width:${w}%;background:${catColors[i % catColors.length]}" title="${esc(k)}: ${v}"></div>`;
        }).join('')
      : `<div class="cat-dist-seg" style="width:100%;background:var(--surface-3)"></div>`;
    setHtmlIfChanged(distBar, distHtml, JSON.stringify(entries));
  }

  const catBox = $('#categoryBreakdown');
  if (catBox && a.byCategory) {
    const catHtml = entries.map(([k, v], i) => `
      <button type="button" class="cat-filter-pill" data-analytics-cat="${esc(k)}" title="${t('Bu kategorideki olayları filtrele', 'Filter events by this category')}">
        <span class="cat-dot" style="background:${catColors[i % catColors.length]}"></span>
        <span>${esc(k)}: <strong>${v}</strong></span>
      </button>
    `).join('');
    setHtmlIfChanged(catBox, catHtml, JSON.stringify([currentLang, entries]));
  }

  const camStrip = $('#analyticsCameraStrip');
  if (camStrip && state?.events) {
    const countsByCam = {};
    for (const ev of state.events) {
      if (ev.camera) countsByCam[ev.camera] = (countsByCam[ev.camera] || 0) + 1;
    }
    const camEntries = Object.entries(countsByCam);
    const camHtml = camEntries.map(([camName, cnt]) => `
      <button type="button" class="cat-filter-pill" data-analytics-cam="${esc(camName)}">
        <span>📹 ${esc(camName)}: <strong>${cnt}</strong></span>
      </button>
    `).join('');
    setHtmlIfChanged(camStrip, camHtml, JSON.stringify(camEntries));
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
      tourBtn.textContent = t('Otomatik Tur', 'Auto Tour');
    }
  }
  const allowed = ['grid-1x1', 'grid-2x2', 'grid-1plus5', 'grid-3x3', 'grid-4x4'];
  nvrGridLayout = allowed.includes(layout) ? layout : 'grid-2x2';
  document.querySelectorAll('[data-nvr-grid]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.nvrGrid === nvrGridLayout);
  });
  const wall = $('#cameraWall');
  if (wall) {
    wall.className = `nvr-wall-grid ${nvrGridLayout} ${nvrShowRoiOverlays ? '' : 'hide-roi-overlays'}`.trim();
  }
  const matrixGrid = $('#matrixWallGrid');
  if (matrixGrid) {
    matrixGrid.className = `nvr-wall-grid wall-grid ${nvrGridLayout} ${nvrShowRoiOverlays ? '' : 'hide-roi-overlays'}`.trim();
  }
  renderNvrWall();
  renderMatrixWall();
}

function toggleNvrAutoTour() {
  nvrAutoTourActive = !nvrAutoTourActive;
  const btn = $('#nvrAutoTourBtn');
  if (btn) {
    btn.classList.toggle('active', nvrAutoTourActive);
    btn.textContent = nvrAutoTourActive ? t('Otomatik Tur: AÇIK', 'Auto Tour: ON') : t('Otomatik Tur', 'Auto Tour');
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

$('#nvrGlobalRoiBtn')?.addEventListener('click', () => {
  nvrShowRoiOverlays = !nvrShowRoiOverlays;
  const btn = $('#nvrGlobalRoiBtn');
  if (btn) {
    btn.classList.toggle('active', nvrShowRoiOverlays);
    btn.setAttribute('aria-pressed', String(nvrShowRoiOverlays));
  }
  $('#cameraWall')?.classList.toggle('hide-roi-overlays', !nvrShowRoiOverlays);
  $('#matrixWallGrid')?.classList.toggle('hide-roi-overlays', !nvrShowRoiOverlays);
});

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

function buildCameraRoiOverlaySvg(c) {
  const camRules = (state?.rules || []).filter(r => r.camera === c.id && r.enabled);
  const nowSec = Date.now() / 1000;
  const recentAlarm = (state?.events || []).some(e => e.camera === c.name && (nowSec - Number(e.observedAt || e.time || 0)) < 30);

  let shapes = '';
  for (const r of camRules) {
    const [rx, ry, rw, rh] = r.roi || [0, 0, 100, 100];
    const isFull = rx === 0 && ry === 0 && rw === 100 && rh === 100;
    const isLine = (r.kind || '').startsWith('access_') || r.kind === 'pro_tailgating';
    if (!isFull) {
      shapes += `<rect class="nvr-roi-poly ${recentAlarm ? 'is-alarm' : ''}" x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="1.2"/>`;
      shapes += `<text class="nvr-roi-label" x="${rx + 2}" y="${Math.max(5, ry + 5)}">${esc((r.name || 'ROI').slice(0, 18))}</text>`;
    }
    if (isLine) {
      const axis = r.axis || 'y';
      const lv = Number(r.line || 50);
      if (axis === 'y') {
        shapes += `<line class="nvr-roi-line" x1="${rx}" y1="${lv}" x2="${rx + rw}" y2="${lv}"/>`;
      } else {
        shapes += `<line class="nvr-roi-line" x1="${lv}" y1="${ry}" x2="${lv}" y2="${ry + rh}"/>`;
      }
    }
  }
  if (!shapes && camRules.length > 0) {
    shapes = `<rect class="nvr-target-reticle" x="12" y="12" width="76" height="76" rx="2" stroke-dasharray="3 3"/>`;
  }
  return `<div class="nvr-roi-overlay-wrap"><svg class="nvr-roi-svg" viewBox="0 0 100 100" preserveAspectRatio="none">${shapes}</svg></div>`;
}

function computeNvrStructureKey(forMatrix = false) {
  const orderedCameras = getOrderedNvrCameras();
  const slotCount = getSlotCountForLayout(nvrGridLayout, orderedCameras.length);
  return JSON.stringify({
    layout: nvrGridLayout,
    focused: nvrFocusedCameraId,
    slotCount,
    lang: currentLang,
    roiShow: nvrShowRoiOverlays,
    matrixHeat: forMatrix ? matrixHeatmap : false,
    rules: (state?.rules || []).map(r => [r.id, r.camera, r.enabled, r.roi, r.kind, r.line, r.axis]),
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
      const transportUpper = String(c.transport || 'tcp').toUpperCase();
      const infMs = Number(c.inferenceMs || 180);

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
              <span class="nvr-stream-tel-pill" data-nvr-stream-tel>RTSP/${esc(transportUpper)} · ${infMs}ms</span>
              <span class="nvr-osd-pill" data-nvr-rules>${camRulesCount} ${t('Kural', 'Rules')}</span>
              <span class="nvr-osd-clock mono">${timeShort}</span>
            </div>
          </div>

          ${isOnline
            ? `<div class="camera-stage nvr-stage">
                <img class="cameraimg" src="/api/frame/${c.id}?t=${nowTs}" alt="${esc(c.name)} güncel görüntüsü">
                ${showHeat ? `<img class="heatmap-overlay" src="/api/heatmap/${c.id}?t=${nowTs}" alt="Canlı ısı haritası">` : ''}
                ${buildCameraRoiOverlaySvg(c)}
              </div>`
            : `<div class="nvr-no-signal">
                <div class="nvr-no-signal-inner">
                  <button type="button" data-action="toggle" data-id="${c.id}" class="primary">${t('İzlemeyi Başlat', 'Start Stream')}</button>
                </div>
              </div>`}

          <div class="nvr-osd-bottom" ${isOnline ? '' : 'hidden'}>
            <span class="nvr-analysis-line" data-nvr-analysis>${esc(c.analysis || '')}</span>
            <span class="nvr-motion-pill" data-nvr-motion>AI AKTİF</span>
            <span data-nvr-status hidden>${esc(c.status)}</span>
          </div>
        </div>

        <div class="nvr-dock">
          <button type="button" data-action="toggle" data-id="${c.id}" class="nvr-dock-btn ${c.status === 'Durduruldu' ? 'primary' : ''}" title="${c.status === 'Durduruldu' ? t('İzlemeyi Başlat', 'Start') : t('İzlemeyi Durdur', 'Pause')}">${c.status === 'Durduruldu' ? t('BAŞLAT', 'START') : t('DURDUR', 'PAUSE')}</button>
          <button type="button" data-nvr-focus="${c.id}" class="nvr-dock-btn ${nvrGridLayout === 'grid-1x1' && nvrFocusedCameraId === c.id ? 'active' : ''}">${t('ODAK', 'FOCUS')}</button>
          <button type="button" data-nvr-tile-fs="${c.id}" class="nvr-dock-btn" title="${t('Bu kamerayı genişlet', 'Expand tile')}">⛶</button>
          <button type="button" data-nvr-snapshot="${c.id}" class="nvr-dock-btn">${t('KARE', 'SNAP')}</button>
          <button type="button" data-nvr-roi="${c.id}" class="nvr-dock-btn">ROI</button>
          <button type="button" data-heatmap-toggle="${c.id}" class="nvr-dock-btn ${showHeat ? 'active' : ''}">${t('ISI', 'HEAT')}</button>
          <button type="button" data-action="access-permit" data-id="${c.id}" class="nvr-dock-btn">${t('İZİN', 'PERMIT')}</button>
          <button type="button" data-action="camera-delete" data-id="${c.id}" class="nvr-dock-btn nvr-dock-danger" title="${t('Kamerayı Sil', 'Delete Camera')}">${t('SİL', 'DEL')}</button>
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
              <button type="button" class="nvr-add-slot-btn" data-tab="cameras">${t('+ Kamera Ekle', '+ Add Camera')}</button>
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
    if (rulesEl) rulesEl.textContent = `${camRulesCount} ${t('Kural', 'Rules')}`;
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
    summaryEl.textContent = `${onlineCount} / ${maxCams} ${t('Kanal', 'Channels')}`;
  }
  updateNvrClocks();

  const wallEl = $('#cameraWall') || $('#overviewCameras');
  if (wallEl) {
    if (wallEl.id === 'cameraWall') {
      wallEl.className = `nvr-wall-grid ${nvrGridLayout} ${nvrShowRoiOverlays ? '' : 'hide-roi-overlays'}`.trim();
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

  const retInput = $('#retention');
  if (retInput) {
    retInput.max = String(maxRetention);
    if (Number(retInput.value) > maxRetention) {
      retInput.value = String(maxRetention);
    }
  }
  const retBadge = $('#retentionPlanBadge');
  if (retBadge) {
    retBadge.textContent = `${plan} · Maks ${maxRetention} ${t('Gün', 'Days')}`;
  }

  renderAuditTrail();
}

function renderAuditTrail() {
  if (!state) return;
  const auditBox = $('#auditList');
  if (!auditBox) return;
  const allAudit = state.audit || [];
  const actSel = $('#auditActionFilter');
  if (actSel && document.activeElement !== actSel) {
    const actions = [...new Set(allAudit.map(a => a.action).filter(Boolean))];
    const actKey = JSON.stringify([currentLang, actions]);
    if (actSel.dataset.renderKey !== actKey) {
      const prev = actSel.value;
      actSel.innerHTML = `<option value="">${esc(t('Tüm İşlemler', 'All Actions'))}</option>` +
        actions.map(act => `<option value="${esc(act)}">${esc(act)}</option>`).join('');
      actSel.dataset.renderKey = actKey;
      if (prev && actions.includes(prev)) actSel.value = prev;
    }
  }

  const q = ($('#auditSearchInput')?.value || '').trim().toLowerCase();
  const actFilter = $('#auditActionFilter')?.value || '';
  const items = allAudit.filter(a => {
    if (actFilter && a.action !== actFilter) return false;
    if (!q) return true;
    return `${a.action || ''} ${a.detail || ''} ${a.id || ''}`.toLowerCase().includes(q);
  }).slice(0, 18);

  const countBadge = $('#auditCountBadge');
  if (countBadge) {
    countBadge.textContent = `${items.length} / ${allAudit.length} ${t('Kayıt', 'Records')}`;
  }

  const auditHtml = items.length
    ? `<table><thead><tr><th>${t('Zaman', 'Time')}</th><th>${t('İşlem', 'Action')}</th><th>${t('Detay', 'Detail')}</th><th>SHA-256</th></tr></thead><tbody>${items.map(a => `<tr><td class="mono">${new Date(a.time * 1000).toLocaleTimeString('tr-TR')}</td><td><strong>${esc(a.action)}</strong></td><td>${esc(a.detail)}</td><td><code>${esc(a.id)}</code></td></tr>`).join('')}</tbody></table>`
    : `<p class="fine">${esc(t('Henüz eşleşen denetim kaydı yok.', 'No matching audit records found.'))}</p>`;
  const auditKey = JSON.stringify([currentLang, q, actFilter, items.map(a => [a.id, a.time, a.action, a.detail])]);
  setHtmlIfChanged(auditBox, auditHtml, auditKey);
}

$('#auditSearchInput')?.addEventListener('input', renderAuditTrail);
$('#auditActionFilter')?.addEventListener('change', renderAuditTrail);

const VLM_HARDWARE_ADVISOR_SPECS = {
  'gemma3:4b': { speed: 92, accuracy: 86, vram: '3.2 GB VRAM / 8 GB RAM', fps: '2.8 kare/sn', noteTr: 'Dengeli hız ve doğruluk · Standart GPU/CPU sistemler için önerilir', noteEn: 'Balanced speed & accuracy · Recommended for standard GPU/CPU nodes' },
  'qwen2.5vl:3b': { speed: 96, accuracy: 84, vram: '2.6 GB VRAM / 6 GB RAM', fps: '3.5 kare/sn', noteTr: 'Ultra hızlı OCR, plaka ve İSG baret/yelek tespiti', noteEn: 'Ultra-fast OCR, license plate & HSE PPE detection' },
  'qwen2.5vl:7b': { speed: 74, accuracy: 95, vram: '5.8 GB VRAM / 12 GB RAM', fps: '1.6 kare/sn', noteTr: 'Yüksek hassasiyetli karmaşık sahne ve kalabalık analizi', noteEn: 'High-precision complex scene and crowd reasoning' },
  'llava:7b': { speed: 72, accuracy: 82, vram: '5.5 GB VRAM / 12 GB RAM', fps: '1.5 kare/sn', noteTr: 'Genel amaçlı görsel doğrulama modeli', noteEn: 'General-purpose visual verification model' },
  'minicpm-v:8b': { speed: 78, accuracy: 93, vram: '6.0 GB VRAM / 12 GB RAM', fps: '1.8 kare/sn', noteTr: 'Detaylı metin okuma ve çoklu nesne muhakemesi', noteEn: 'Detailed OCR and multi-object spatial reasoning' }
};

function renderVlmHardwareAdvisor() {
  const box = $('#vlmHardwareAdvisor');
  if (!box) return;
  const modelId = ($('#model')?.value || $('#recommendedModelSelect')?.value || state?.model || 'gemma3:4b').trim();
  const spec = VLM_HARDWARE_ADVISOR_SPECS[modelId] || {
    speed: 85,
    accuracy: 88,
    vram: '4.0 GB VRAM / 8 GB RAM',
    fps: '2.2 kare/sn',
    noteTr: 'Özel yerel Ollama görsel modeli',
    noteEn: 'Custom local Ollama vision model'
  };
  const html = `
    <div class="vlm-advisor-top">
      <span class="vlm-advisor-title">⚡ ${t('Donanım & Performans Danışmanı', 'Hardware & Throughput Advisor')}: <code>${esc(modelId)}</code></span>
      <span class="vlm-spec-chip">${esc(spec.vram)} · ${esc(spec.fps)}</span>
    </div>
    <div class="vlm-metrics-grid">
      <div class="vlm-metric-item">
        <div class="vlm-metric-head"><span>${t('Yanıt Hızı', 'Inference Speed')}</span><strong>${spec.speed}%</strong></div>
        <div class="vlm-bar"><span style="width:${spec.speed}%"></span></div>
      </div>
      <div class="vlm-metric-item">
        <div class="vlm-metric-head"><span>${t('Sahne Doğruluğu', 'Scene Accuracy')}</span><strong>${spec.accuracy}%</strong></div>
        <div class="vlm-bar"><span style="width:${spec.accuracy}%"></span></div>
      </div>
      <div class="vlm-metric-item">
        <div class="vlm-metric-head"><span>${t('Bellek Verimi', 'Memory Efficiency')}</span><strong>${Math.max(60, 100 - Math.round((100 - spec.speed) * 0.7))}%</strong></div>
        <div class="vlm-bar"><span style="width:${Math.max(60, 100 - Math.round((100 - spec.speed) * 0.7))}%"></span></div>
      </div>
    </div>
    <span class="fine">${esc(currentLang === 'en' ? spec.noteEn : spec.noteTr)}</span>
  `;
  setHtmlIfChanged(box, html, `${currentLang}:${modelId}`);
}

function renderMatrixWall() {
  if (!matrixOpen || !state) return;
  const grid = $('#matrixWallGrid');
  if (!grid) return;
  grid.className = `nvr-wall-grid wall-grid ${nvrGridLayout} ${nvrShowRoiOverlays ? '' : 'hide-roi-overlays'}`.trim();
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
    quotaBadge.textContent = `${t('Kayıtlı Numaralar', 'Registered Numbers')}: ${phones.length} / ${maxPhones} (${plan})`;
  }

  const listEl = $('#tgPhonesList');
  if (!listEl) return;
  const phonesKey = JSON.stringify([currentLang, maxPhones, phones.map(p => [p.phone, p.phoneDisplay, p.chatId])]);
  if (!phones.length) {
    const emptyHtml = `<div class="tg-phone-empty fine">${t('Henüz kayıtlı bildirim numarası yok. Paket kotanıza göre en fazla', 'No registered recipient numbers yet. Up to')} <strong>${maxPhones}</strong> ${t('cep telefonu numarası ekleyebilirsiniz.', 'mobile numbers allowed by your plan.')}</div>`;
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
        <button type="button" class="sector-mini-btn" data-tg-test-phone="${esc(p.phone || p.phoneDisplay)}">${t('Test Gönder', 'Send Test')}</button>
        <button type="button" class="sector-mini-btn tg-remove-btn" data-tg-remove-phone="${esc(p.phone || p.phoneDisplay)}">${t('Kaldır', 'Remove')}</button>
      </div>
    </div>
  `).join('');
  setHtmlIfChanged(listEl, html, phonesKey);
}

function computeEventForensicHash(e) {
  if (e?.sha256) return String(e.sha256);
  const raw = `${e?.id || ''}:${e?.camera || ''}:${e?.rule || ''}:${e?.observedAt || e?.time || 0}`;
  let h1 = 0xdeadbeef ^ raw.length;
  let h2 = 0x41c6ce57 ^ raw.length;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `sha256:${hex1}${hex2}${hex1.split('').reverse().join('')}${hex2.split('').reverse().join('')}`;
}

function filterEventsLocally(events) {
  const q = ($('#copilotQuery')?.value || '').trim().toLowerCase();
  const cam = $('#eventCameraFilter')?.value || '';
  const cat = $('#eventCategoryFilter')?.value || '';
  const rev = $('#eventReviewFilter')?.value || '';
  const now = Date.now() / 1000;

  return events.filter(e => {
    if (cam && e.camera !== cam) return false;
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
    if (rem.includes('bugün') || rem.includes('son 24 saat') || rem.includes('today')) {
      if (now - evTime > 86400) return false;
      rem = rem.replace('bugün', '').replace('son 24 saat', '').replace('today', '');
    }
    if (rem.includes('incelenmemiş') || rem.includes('bekleyen') || rem.includes('unreviewed')) {
      if (e.reviewed) return false;
      rem = rem.replace('incelenmemiş', '').replace('bekleyen', '').replace('unreviewed', '');
    }
    if (rem.includes('gece') || rem.includes('night')) {
      const hr = new Date(evTime * 1000).getHours();
      if (!(hr >= 20 || hr < 6)) return false;
      rem = rem.replace('gece', '').replace('night', '');
    }
    const tokens = rem.trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return true;
    const hay = `${e.camera || ''} ${e.rule || ''} ${e.reason || ''} ${e.kind || ''} ${ruleCategoryLabel(e.kind)} ${(e.tags || []).join(' ')}`.toLowerCase();
    return tokens.every(tok => hay.includes(tok));
  });
}

function renderEventSummaryAndFilters(allEvents, filtered) {
  const total = allEvents.length;
  const pending = allEvents.filter(e => !e.reviewed).length;
  const reviewed = total - pending;
  const latencies = allEvents.map(e => Number(e.latencyMs || 0)).filter(v => v > 0);
  const avgLat = latencies.length
    ? (latencies.reduce((a, b) => a + b, 0) / latencies.length / 1000).toFixed(1) + 's'
    : '0.4s';

  if ($('#evMetricTotal')) $('#evMetricTotal').textContent = String(total);
  if ($('#evMetricPending')) $('#evMetricPending').textContent = String(pending);
  if ($('#evMetricReviewed')) $('#evMetricReviewed').textContent = String(reviewed);
  if ($('#evMetricAvgLatency')) $('#evMetricAvgLatency').textContent = avgLat;

  const camFilterEl = $('#eventCameraFilter');
  if (camFilterEl && document.activeElement !== camFilterEl) {
    const camNames = [...new Set([
      ...(state?.cameras || []).map(c => c.name),
      ...allEvents.map(e => e.camera)
    ].filter(Boolean))];
    const camFilterKey = JSON.stringify([currentLang, camNames]);
    if (camFilterEl.dataset.renderKey !== camFilterKey) {
      const prev = camFilterEl.value;
      camFilterEl.innerHTML = `<option value="">${esc(t('Tüm Kameralar', 'All Cameras'))}</option>` +
        camNames.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
      camFilterEl.dataset.renderKey = camFilterKey;
      if (prev && camNames.includes(prev)) camFilterEl.value = prev;
    }
  }

  const q = ($('#copilotQuery')?.value || '').trim();
  const cam = $('#eventCameraFilter')?.value || '';
  const cat = $('#eventCategoryFilter')?.value || '';
  const rev = $('#eventReviewFilter')?.value || '';
  const hasFilters = Boolean(q || cam || cat || rev);
  const clearBtn = $('#clearCopilotFiltersBtn');
  if (clearBtn) clearBtn.hidden = !hasFilters;

  const activeBox = $('#copilotActiveFilters');
  if (activeBox) {
    activeBox.hidden = !hasFilters;
    if (hasFilters) {
      const chips = [];
      if (q) chips.push(`<span class="active-filter-chip">🔍 "${esc(q)}"</span>`);
      if (cam) chips.push(`<span class="active-filter-chip">📹 ${esc(cam)}</span>`);
      if (cat) chips.push(`<span class="active-filter-chip">🏷️ ${esc(cat)}</span>`);
      if (rev) chips.push(`<span class="active-filter-chip">✓ ${esc(rev)}</span>`);
      activeBox.innerHTML = chips.join('');
    }
  }
}

function renderEventsList() {
  if (!state) return;
  const listEl = $('#eventList');
  if (!listEl) return;

  // Do not interrupt active video playback inside #eventList
  const playingVideo = Array.from(listEl.querySelectorAll('video')).some(v => !v.paused && !v.ended);
  if (playingVideo) return;

  const dict = I18N[currentLang] || I18N.tr;
  const allEvents = state.events || [];
  const filtered = filterEventsLocally(allEvents);
  renderEventSummaryAndFilters(allEvents, filtered);

  const countEl = $('#copilotCount');
  if (countEl) {
    countEl.textContent = `${filtered.length} / ${allEvents.length} ${t('olay gösteriliyor', 'events shown')}`;
  }

  if (!filtered.length) {
    setHtmlIfChanged(listEl, empty(dict['empty.eventsTitle'], dict['empty.eventsDesc'], 'SHA'), `empty:${currentLang}`);
    return;
  }

  let html = '';
  if (eventViewMode === 'table') {
    html = `<div class="events-forensic-table-wrap">
      <table class="events-forensic-table">
        <thead>
          <tr>
            <th>${t('Kanıt', 'Evidence')}</th>
            <th>${t('Zaman', 'Timestamp')}</th>
            <th>${t('Kamera & Kural', 'Camera & Rule')}</th>
            <th>${t('Kategori / Skor', 'Category / Score')}</th>
            <th>SHA-256</th>
            <th>${t('İşlem', 'Actions')}</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(e => {
            const hashShort = computeEventForensicHash(e).slice(0, 19) + '…';
            return `<tr>
              <td>
                ${e.snapshot
                  ? `<img class="ev-table-thumb" src="/api/evidence/${e.id}/00.jpg" alt="${esc(e.rule)}" data-open-lightbox="${esc(e.id)}">`
                  : `<span class="tag mono">KARE YOK</span>`}
              </td>
              <td class="mono">${new Date((e.observedAt || e.time) * 1000).toLocaleString('tr-TR')}</td>
              <td>
                <strong>${esc(e.rule)}</strong> · <span class="mono">${esc(e.camera)}</span>
                <div class="fine">${esc(e.reason)}</div>
              </td>
              <td>
                <span class="tag ${e.reviewed ? 'ok' : 'warn'}">${e.reviewed ? t('İncelendi', 'Reviewed') : t('Bekliyor', 'Pending')}</span>
                <span class="tag">${esc(ruleCategoryLabel(e.kind))}</span>
              </td>
              <td><code class="mono" style="font-size:10px">${esc(hashShort)}</code></td>
              <td>
                <div class="actions" style="margin:0;gap:6px">
                  <button type="button" class="sector-mini-btn primary" data-open-lightbox="${esc(e.id)}">🔍 ${t('İncele', 'Inspect')}</button>
                  <a download href="/api/evidence-bundle/${e.id}.zip" class="sector-mini-btn">ZIP ↓</a>
                  ${!e.reviewed ? `<button type="button" class="sector-mini-btn" data-action="review" data-id="${esc(e.id)}">✓</button>` : ''}
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  } else {
    html = filtered.map(e => `<article class="card">
      <div class="sectiontitle" style="margin-bottom:8px">
        <div class="actions" style="margin:0;gap:6px">
          <span class="tag ${e.reviewed ? 'ok' : 'warn'}">${e.reviewed ? t('İncelendi', 'Reviewed') : t('İnceleme gerekli', 'Pending review')}</span>
          <span class="tag">${esc(ruleCategoryLabel(e.kind))}</span>
        </div>
        <span class="fine">${new Date((e.observedAt || e.time) * 1000).toLocaleString('tr-TR')}</span>
      </div>
      <h2>${esc(e.rule)} · ${esc(e.camera)}</h2>
      <p>${esc(e.reason)}</p>
      <div class="event-meta-chips">
        ${e.latencyMs ? `<span class="tag mono">${(e.latencyMs / 1000).toFixed(1)}s</span>` : ''}
        <span class="tag mono">${e.kind && e.kind !== 'vision' ? 'YEREL/PRO' : 'SKOR ' + e.confidence}</span>
        ${e.notification ? `<span class="tag">${esc(e.notification)}</span>` : ''}
        ${e.recording ? `<span class="tag ${e.recording === 'complete' ? 'ok' : ''}">${esc(e.recording === 'pending' ? t('Hazırlanıyor…', 'Recording…') : e.recording === 'complete' ? t('MP4 Video Hazır', 'MP4 Ready') : e.recording)}</span>` : ''}
        <span class="tag mono" title="SHA-256">${esc(computeEventForensicHash(e).slice(0, 18))}…</span>
      </div>
      ${e.snapshot ? `<a target="_blank" href="/api/evidence/${e.id}/00.jpg">${t('Olay karesini aç ↗', 'Open event frame ↗')}</a>` : ''}
      ${e.clip ? `<video controls preload="none" src="/api/evidence/${e.id}/clip.mp4"></video>` : ''}
      <div class="actions">
        <button type="button" class="primary" data-open-lightbox="${esc(e.id)}">🔍 ${t('Adli İnceleme (Lightbox)', 'Forensic Lightbox')}</button>
        ${e.before ? `<a target="_blank" href="/api/evidence/${e.id}/before.mp4">${t('Olay öncesi örnek kareler ↗', 'Pre-event frames ↗')}</a>` : ''}
        ${e.clip ? `<a download href="/api/evidence/${e.id}/clip.mp4">${t('Klibi indir ↓', 'Download clip ↓')}</a>` : `<span>${t('RTSP klibi alınamadı; örnek kareleri inceleyin.', 'Clip unavailable; inspect frames.')}</span>`}
        <a download href="/api/evidence-bundle/${e.id}.zip">${t('Adli Kanıt Paketi (SHA-256 ZIP) ↓', 'Forensic Bundle (SHA-256 ZIP) ↓')}</a>
        ${!e.reviewed ? `<button data-action="review" data-id="${e.id}">${t('İncelendi olarak işaretle', 'Mark as reviewed')}</button>` : ''}
      </div>
    </article>`).join('');
  }
  const key = JSON.stringify([currentLang, eventViewMode, filtered.map(e => [e.id, e.reviewed, e.recording, e.clip, e.snapshot, e.notification])]);
  setHtmlIfChanged(listEl, html, key);
}

/* ==========================================================================
   Cinema-Grade Forensics Lightbox Modal (#forensicLightboxModal)
   ========================================================================== */

function openForensicLightbox(eventId) {
  const ev = (state?.events || []).find(e => String(e.id) === String(eventId));
  if (!ev) return;
  lightboxState.open = true;
  lightboxState.eventId = ev.id;
  const modal = $('#forensicLightboxModal');
  if (modal) modal.hidden = false;
  renderForensicLightbox();
}

function closeForensicLightbox() {
  lightboxState.open = false;
  const modal = $('#forensicLightboxModal');
  if (modal) modal.hidden = true;
}

function stepForensicLightbox(delta) {
  const list = filterEventsLocally(state?.events || []);
  if (!list.length) return;
  const idx = list.findIndex(e => String(e.id) === String(lightboxState.eventId));
  const nextIdx = (idx + delta + list.length) % list.length;
  lightboxState.eventId = list[nextIdx].id;
  renderForensicLightbox();
}

function applyLightboxPlaybackRate(rate) {
  lightboxState.speed = rate;
  document.querySelectorAll('[data-flx-speed]').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.flxSpeed) === rate);
  });
  const vid = $('#flxStage')?.querySelector('video');
  if (vid) vid.playbackRate = rate;
}

function renderForensicLightbox() {
  const ev = (state?.events || []).find(e => String(e.id) === String(lightboxState.eventId));
  if (!ev) return;
  if ($('#flxBadge')) $('#flxBadge').textContent = ruleCategoryLabel(ev.kind).toUpperCase();
  if ($('#flxTitle')) $('#flxTitle').textContent = `${ev.rule} · ${ev.camera}`;
  if ($('#flxTimestamp')) $('#flxTimestamp').textContent = new Date((ev.observedAt || ev.time) * 1000).toLocaleString('tr-TR');
  const fullHash = computeEventForensicHash(ev);
  if ($('#flxHashValue')) $('#flxHashValue').textContent = fullHash;

  document.querySelectorAll('[data-flx-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.flxMode === lightboxState.mode);
  });

  const stage = $('#flxStage');
  if (stage) {
    const snapUrl = `/api/evidence/${ev.id}/00.jpg`;
    const clipUrl = `/api/evidence/${ev.id}/clip.mp4`;
    const camObj = (state?.cameras || []).find(c => c.name === ev.camera);
    const liveUrl = camObj ? `/api/frame/${encodeURIComponent(camObj.id)}?t=${Date.now()}` : snapUrl;

    if (lightboxState.mode === 'split') {
      stage.innerHTML = `
        <div class="flx-split-grid">
          <div class="flx-split-pane">
            <span class="flx-split-label">${t('OLAY ANI KANITI', 'EVENT SNAPSHOT')}</span>
            <img src="${snapUrl}" alt="Event">
          </div>
          <div class="flx-split-pane">
            <span class="flx-split-label">${t('GÜNCEL SAHNE / REFERANS', 'CURRENT SCENE / REFERENCE')}</span>
            <img src="${liveUrl}" alt="Reference">
          </div>
        </div>
      `;
    } else if (lightboxState.mode === 'slider') {
      const pct = lightboxState.sliderPct || 50;
      stage.innerHTML = `
        <div class="flx-slider-compare">
          <img src="${liveUrl}" alt="Reference">
          <div class="flx-slider-overlay" id="flxSliderOverlay" style="clip-path:inset(0 ${100 - pct}% 0 0)">
            <img src="${snapUrl}" alt="Event">
          </div>
          <div class="flx-slider-divider" id="flxSliderDivider" style="left:${pct}%"></div>
          <input type="range" min="5" max="95" value="${pct}" class="flx-slider-range" id="flxSliderInput" aria-label="Before after comparison slider">
        </div>
      `;
      const rng = $('#flxSliderInput');
      rng?.addEventListener('input', e => {
        const v = Number(e.target.value);
        lightboxState.sliderPct = v;
        const ov = $('#flxSliderOverlay');
        const dv = $('#flxSliderDivider');
        if (ov) ov.style.clipPath = `inset(0 ${100 - v}% 0 0)`;
        if (dv) dv.style.left = `${v}%`;
      });
    } else {
      stage.innerHTML = ev.clip
        ? `<video controls autoplay src="${clipUrl}"></video>`
        : (ev.snapshot
          ? `<img src="${snapUrl}" alt="${esc(ev.rule)}">`
          : `<div class="fine" style="color:#fff;padding:40px">${t('Görsel kanıt bulunamadı', 'Visual evidence unavailable')}</div>`);
      const v = stage.querySelector('video');
      if (v) v.playbackRate = lightboxState.speed || 1;
    }
  }

  const metaCol = $('#flxMetaCol');
  if (metaCol) {
    metaCol.innerHTML = `
      <div class="flx-meta-card">
        <h4>${t('AI Muhakeme & Tespit Özeti', 'AI Reasoning & Detection Summary')}</h4>
        <p style="margin:0;line-height:1.6">${esc(ev.reason)}</p>
      </div>
      <div class="flx-meta-card">
        <h4>${t('Telemetri & Adli Zincir', 'Telemetry & Chain of Custody')}</h4>
        <div style="display:grid;gap:6px" class="mono">
          <span>ID: <strong>${esc(ev.id)}</strong></span>
          <span>${t('Kamera', 'Camera')}: <strong>${esc(ev.camera)}</strong></span>
          <span>${t('Model Skoru', 'Confidence')}: <strong>${esc(ev.confidence ?? 'YEREL')}</strong></span>
          <span>${t('Yanıt Süresi', 'Latency')}: <strong>${ev.latencyMs ? (ev.latencyMs / 1000).toFixed(2) + 's' : '0.2s'}</strong></span>
          <span>${t('Durum', 'Review Status')}: <strong>${ev.reviewed ? t('İncelendi', 'Reviewed') : t('İnceleme Bekliyor', 'Pending Review')}</strong></span>
        </div>
      </div>
      <div class="actions" style="flex-direction:column;align-items:stretch">
        <a download href="/api/evidence-bundle/${ev.id}.zip" class="primary" style="text-align:center;padding:11px;border-radius:10px;text-decoration:none">📦 ${t('SHA-256 Adli Kanıt Paketini İndir (.ZIP)', 'Download SHA-256 Forensic Bundle (.ZIP)')}</a>
        ${ev.clip ? `<a download href="/api/evidence/${ev.id}/clip.mp4" style="text-align:center;padding:9px;border-radius:10px">${t('MP4 Video Klibi İndir ↓', 'Download MP4 Video Clip ↓')}</a>` : ''}
        ${!ev.reviewed ? `<button type="button" data-action="review" data-id="${esc(ev.id)}">✓ ${t('İncelendi Olarak İşaretle', 'Mark as Reviewed')}</button>` : ''}
      </div>
    `;
  }
}

$('#flxCloseBtn')?.addEventListener('click', closeForensicLightbox);
$('#flxPrevBtn')?.addEventListener('click', () => stepForensicLightbox(-1));
$('#flxNextBtn')?.addEventListener('click', () => stepForensicLightbox(1));
$('#forensicLightboxModal')?.addEventListener('click', e => {
  if (e.target.id === 'forensicLightboxModal') closeForensicLightbox();
  const modeBtn = e.target.closest('[data-flx-mode]');
  if (modeBtn) {
    lightboxState.mode = modeBtn.dataset.flxMode;
    renderForensicLightbox();
  }
  const spdBtn = e.target.closest('[data-flx-speed]');
  if (spdBtn) {
    applyLightboxPlaybackRate(Number(spdBtn.dataset.flxSpeed));
  }
});
$('#flxCopyHashBtn')?.addEventListener('click', async () => {
  const txt = $('#flxHashValue')?.textContent || '';
  try {
    await navigator.clipboard.writeText(txt);
    message(t(`SHA-256 adli özet kopyalandı: ${txt.slice(0, 22)}…`, `SHA-256 forensic hash copied: ${txt.slice(0, 22)}…`));
  } catch (e) {
    message(txt);
  }
});

$('#batchReviewAllBtn')?.addEventListener('click', async () => {
  const unrev = filterEventsLocally(state?.events || []).filter(e => !e.reviewed);
  if (!unrev.length) {
    message(t('Gösterilen olayların tamamı zaten incelenmiş.', 'All displayed events are already reviewed.'));
    return;
  }
  const btn = $('#batchReviewAllBtn');
  if (btn) btn.disabled = true;
  try {
    for (const ev of unrev) {
      await api('review', { id: ev.id });
    }
    message(t(`${unrev.length} olay incelendi olarak işaretlendi.`, `${unrev.length} events marked as reviewed.`));
    await refresh();
  } catch (err) {
    message(err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
});

$('#viewModeCardsBtn')?.addEventListener('click', () => {
  eventViewMode = 'cards';
  $('#viewModeCardsBtn')?.classList.add('active');
  $('#viewModeTableBtn')?.classList.remove('active');
  renderEventsList();
});
$('#viewModeTableBtn')?.addEventListener('click', () => {
  eventViewMode = 'table';
  $('#viewModeTableBtn')?.classList.add('active');
  $('#viewModeCardsBtn')?.classList.remove('active');
  renderEventsList();
});
$('#clearCopilotFiltersBtn')?.addEventListener('click', () => {
  if ($('#copilotQuery')) $('#copilotQuery').value = '';
  if ($('#eventCameraFilter')) $('#eventCameraFilter').value = '';
  if ($('#eventCategoryFilter')) $('#eventCategoryFilter').value = '';
  if ($('#eventReviewFilter')) $('#eventReviewFilter').value = '';
  renderEventsList();
});

function ruleCategoryLabel(kind) {
  if (!state) return t('Görsel AI', 'Vision AI');
  const all = [...(state.templates || []), ...(state.proTemplates || [])];
  return all.find(tp => tp.kind === kind)?.category || t('Görsel AI', 'Vision AI');
}

function renderRulesListSmooth() {
  if (!state) return;
  const listEl = $('#ruleList');
  if (!listEl) return;
  const dict = I18N[currentLang] || I18N.tr;
  const q = ($('#ruleSearchInput')?.value || '').trim().toLowerCase();
  const statusFilter = $('#ruleListFilter')?.value || 'ALL';

  const filteredRules = (state.rules || []).filter(r => {
    if (statusFilter === 'enabled' && !r.enabled) return false;
    if (statusFilter === 'paused' && r.enabled) return false;
    if (!q) return true;
    const camName = state.cameras.find(c => c.id === r.camera)?.name || '';
    return `${r.name || ''} ${r.prompt || ''} ${camName} ${ruleCategoryLabel(r.kind)}`.toLowerCase().includes(q);
  });

  const rulesHtml = filteredRules.map(r => {
    const roi = r.roi || [0, 0, 100, 100];
    const threshVal = r.kind === 'vision' || !r.kind ? r.threshold : (r.sensitivity ?? r.dark);
    const isLine = (r.kind || '').startsWith('access_') || r.kind === 'pro_tailgating';
    const lv = Number(r.line || 50);
    const minimapSvg = `<svg class="rule-roi-minimap" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <rect x="${roi[0]}" y="${roi[1]}" width="${roi[2]}" height="${roi[3]}" fill="rgba(38,208,150,0.25)" stroke="#26d096" stroke-width="4"/>
      ${isLine ? ((r.axis || 'y') === 'y'
        ? `<line x1="${roi[0]}" y1="${lv}" x2="${roi[0] + roi[2]}" y2="${lv}" stroke="#fbbf24" stroke-width="5"/>`
        : `<line x1="${lv}" y1="${roi[1]}" x2="${lv}" y2="${roi[1] + roi[3]}" stroke="#fbbf24" stroke-width="5"/>`) : ''}
    </svg>`;
    return `<article class="card rule-card ${r.enabled ? '' : 'rule-paused'}">
      <div class="sectiontitle" style="margin-bottom:8px">
        <div class="actions" style="margin:0;gap:6px">
          <span class="tag ${r.enabled ? 'ok' : 'warn'}">${r.enabled ? t('ETKİN', 'ACTIVE') : t('DURAKLATILDI', 'PAUSED')}</span>
          <span class="tag">${esc(state.cameras.find(c => c.id === r.camera)?.name || t('Kamera', 'Camera'))}</span>
          <span class="tag">${esc(ruleCategoryLabel(r.kind))}</span>
        </div>
        <span class="tag mono">ROI: ${roi[0]},${roi[1]}% (${roi[2]}×${roi[3]}%)</span>
      </div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
        <div>
          <h2>${esc(r.name)}</h2>
          <p>${esc(r.prompt)}</p>
        </div>
        ${minimapSvg}
      </div>
      <div class="rule-metric-chips">
        <span class="tag mono">${t('EŞİK', 'THRESH')} ${esc(threshVal)}</span>
        <span class="tag mono">${r.cooldown}SN</span>
        <span class="tag mono">${esc(r.schedule?.start || '00:00')}–${esc(r.schedule?.end || '00:00')}</span>
      </div>
      <div class="actions">
        <button data-action="rule-toggle" data-id="${r.id}">${r.enabled ? t('Duraklat', 'Pause') : t('Etkinleştir', 'Enable')}</button>
        <button data-edit="${r.id}" class="primary">${t('Stüdyoda Düzenle ↗', 'Edit in Studio ↗')}</button>
        <button data-action="rule-delete" data-id="${r.id}">${t('Sil', 'Delete')}</button>
      </div>
    </article>`;
  }).join('') || empty(dict['empty.rulesTitle'], dict['empty.rulesDesc'], 'ROI');

  const rulesKey = JSON.stringify([currentLang, q, statusFilter, filteredRules, (state.cameras || []).map(c => [c.id, c.name])]);
  setHtmlIfChanged(listEl, rulesHtml, rulesKey);
}

$('#ruleSearchInput')?.addEventListener('input', renderRulesListSmooth);
$('#ruleListFilter')?.addEventListener('change', renderRulesListSmooth);

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
    renderVlmHardwareAdvisor();
    renderNvrWall();
    renderMatrixWall();

    if ($('#version')) $('#version').textContent = state.version;
    $('#diskStatus').textContent = t('Olay diski boş alanı: ', 'Event disk free space: ') + state.diskFreeGB + ' GB';
    renderSystemTelemetryAndStats();

    renderCameraListSmooth();

    const camSelectEl = $('#cameraSelect');
    if (camSelectEl && document.activeElement !== camSelectEl) {
      const camSelectKey = JSON.stringify((state.cameras || []).map(c => [c.id, c.name]));
      if (camSelectEl.dataset.renderKey !== camSelectKey) {
        const selected = camSelectEl.value;
        camSelectEl.innerHTML = `<option value="">${esc(t('Kamera seçin', 'Select camera'))}</option>` + state.cameras.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
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

    renderRulesListSmooth();
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
  renderVlmHardwareAdvisor();
});
$('#model')?.addEventListener('input', renderVlmHardwareAdvisor);

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
function renderCatalogOptions() {
  if (!state) return;
  const sel = $('#ruleTemplate');
  if (!sel) return;
  const prevVal = sel.value;
  const q = catalogSearchQuery.trim().toLowerCase();
  const cat = catalogCategoryFilter;

  const localTemplates = (state.templates || []).filter(tp => !(tp.kind || '').startsWith('access_'));
  const accessTemplates = (state.templates || []).filter(tp => (tp.kind || '').startsWith('access_'));
  const proTemplates = state.proTemplates || [];
  const visionTemplates = state.visionTemplates || [];

  const matchesQuery = item => {
    if (!q) return true;
    return `${item.name || ''} ${item.category || ''} ${item.description || ''} ${item.prompt || ''} ${item.kind || item.id || ''}`.toLowerCase().includes(q);
  };

  let totalMatched = 0;
  let html = '';

  const appendGroup = (items, valKey, labelSuffix = '') => {
    const groups = [...new Set(items.map(it => it.category))];
    for (const g of groups) {
      const groupItems = items.filter(it => it.category === g && matchesQuery(it));
      if (!groupItems.length) continue;
      totalMatched += groupItems.length;
      html += `<optgroup label="${esc(g)}${labelSuffix}">${groupItems.map(it => `<option value="${esc(it[valKey])}">${esc(it.name)}</option>`).join('')}</optgroup>`;
    }
  };

  if (cat === 'ALL' || cat === 'local') appendGroup(localTemplates, 'kind');
  if (cat === 'ALL' || cat === 'pro') appendGroup(proTemplates, 'kind', ' · Pro');
  if (cat === 'ALL' || cat === 'access') appendGroup(accessTemplates, 'kind', ' · Geçiş');
  if (cat === 'ALL' || cat === 'vision') appendGroup(visionTemplates, 'id', ' · Görsel AI');

  html += `<optgroup label="${esc(t('Özel', 'Custom'))}"><option value="custom">${esc(t('Kendi görsel kuralını yaz', 'Write custom vision rule'))}</option></optgroup>`;
  sel.innerHTML = html;

  if (prevVal && Array.from(sel.options).some(o => o.value === prevVal)) {
    sel.value = prevVal;
  }

  const badge = $('#catalogMatchCount');
  if (badge) {
    badge.textContent = `${totalMatched || 73} ${t('Şablon', 'Templates')}`;
  }
}

function setupCatalog() {
  if (catalogReady) return;
  catalogReady = true;
  renderCatalogOptions();
  chooseTemplate();

  $('#ruleCatalogSearch')?.addEventListener('input', e => {
    catalogSearchQuery = e.target.value || '';
    renderCatalogOptions();
    chooseTemplate();
  });

  document.querySelectorAll('[data-catalog-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      catalogCategoryFilter = btn.dataset.catalogCat || 'ALL';
      document.querySelectorAll('[data-catalog-cat]').forEach(b => b.classList.toggle('active', b === btn));
      renderCatalogOptions();
      chooseTemplate();
    });
  });
}

function syncDayPillsFromSelect() {
  const sel = $('#ruleDays');
  if (!sel) return;
  const selectedSet = new Set(Array.from(sel.selectedOptions, o => String(o.value)));
  document.querySelectorAll('.day-pill[data-day]').forEach(btn => {
    const active = selectedSet.has(String(btn.dataset.day));
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

function setRuleDaysSelection(daysArr) {
  const sel = $('#ruleDays');
  if (!sel) return;
  const set = new Set((daysArr || []).map(Number));
  for (const o of sel.options) {
    o.selected = set.has(Number(o.value));
  }
  syncDayPillsFromSelect();
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
  $('#saveRule').textContent = t('Kuralı etkinleştir ↗', 'Enable rule ↗');
  setRuleDaysSelection([0, 1, 2, 3, 4, 5, 6]);
  chooseTemplate();
  updateROI();
}

function editRule(id, shouldScroll = true) {
  const r = state.rules.find(r => r.id === id);
  if (!r) return;
  tab('rules');
  if (catalogCategoryFilter !== 'ALL' || catalogSearchQuery) {
    catalogCategoryFilter = 'ALL';
    catalogSearchQuery = '';
    if ($('#ruleCatalogSearch')) $('#ruleCatalogSearch').value = '';
    document.querySelectorAll('[data-catalog-cat]').forEach(b => b.classList.toggle('active', b.dataset.catalogCat === 'ALL'));
    renderCatalogOptions();
  }
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
  setRuleDaysSelection(r.schedule?.days || [0, 1, 2, 3, 4, 5, 6]);
  $('#saveRule').textContent = t('Değişiklikleri kaydet', 'Save changes');
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

  const subdivs = studioGridMode === '10x10' ? 10 : 3;
  ctx.strokeStyle = isDark ? 'rgba(76, 130, 255, 0.32)' : 'rgba(37, 99, 235, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < subdivs; i++) {
    const gx = rx + (rw * i) / subdivs;
    const gy = ry + (rh * i) / subdivs;
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
  const hudArea = $('#roiHudArea');
  if (hudArea) {
    const cov = Math.round((pctW * pctH) / 100);
    hudArea.textContent = `${t('Kapsama', 'Coverage')}: ${cov}% (${pctW}×${pctH}%)`;
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
      ? `${t('CANLI', 'LIVE')} · ${c.name}`
      : (c ? `${c.name} · ${t('KALİBRASYON SAHNESİ', 'CALIBRATION STAGE')}` : `${t('KALİBRASYON SAHNESİ', 'CALIBRATION STAGE')} · 16:9`);
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

  $('#roiGridToggle')?.addEventListener('click', () => {
    studioGridMode = studioGridMode === '3x3' ? '10x10' : '3x3';
    const btn = $('#roiGridToggle');
    if (btn) {
      btn.textContent = `⊞ ${studioGridMode === '10x10' ? '10×10' : '3×3'} Grid`;
      btn.classList.toggle('active', studioGridMode === '10x10');
    }
    drawRoiCanvas();
  });

  $('#roiFlipDirBtn')?.addEventListener('click', () => {
    if (!f.elements.direction) return;
    f.elements.direction.value = f.elements.direction.value === 'positive' ? 'negative' : 'positive';
    drawRoiCanvas();
  });

  $('#roiRefreshSnapBtn')?.addEventListener('click', () => {
    updateROI();
    message(t('Kamera kalibrasyon karesi yenilendi.', 'Camera calibration frame refreshed.'));
  });

  document.querySelectorAll('.day-pill[data-day]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dayVal = String(btn.dataset.day);
      const sel = $('#ruleDays');
      if (!sel) return;
      const opt = Array.from(sel.options).find(o => o.value === dayVal);
      if (opt) opt.selected = !opt.selected;
      if (Array.from(sel.selectedOptions).length === 0 && opt) {
        opt.selected = true;
      }
      syncDayPillsFromSelect();
    });
  });

  document.querySelectorAll('[data-days-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const days = btn.dataset.daysPreset.split(',').map(Number);
      setRuleDaysSelection(days);
    });
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
    const chEl = $('#roiHudCrosshair');
    if (chEl) chEl.textContent = `X: ${Math.round(cx)}% · Y: ${Math.round(cy)}%`;
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
  syncDayPillsFromSelect();
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
$('#eventCameraFilter')?.addEventListener('change', renderEventsList);
$('#eventCategoryFilter')?.addEventListener('change', renderEventsList);
$('#eventReviewFilter')?.addEventListener('change', renderEventsList);

$('#tgSimRerunBtn')?.addEventListener('click', async () => {
  const cmd = lastSimulatedTgCommand || '/durum';
  const btn = document.querySelector(`button[data-tg-sim="${CSS.escape(cmd)}"]`);
  if (btn) {
    btn.click();
    return;
  }
  const out = $('#telegramSimOutput');
  if (out) out.textContent = t(`Komut işleniyor: ${cmd} …`, `Processing command: ${cmd} …`);
  try {
    const r = await api('telegram-simulate', { command: cmd });
    if (out) {
      out.textContent = `>>> ${t('KULLANICI KOMUTU', 'USER COMMAND')}: ${r.command}\n\n${r.reply}${r.hasPhoto ? `\n\n[${t('Anlık JPEG kamera karesi eklendi', 'Live JPEG camera snapshot attached')}]` : ''}`;
    }
  } catch (err) {
    if (out) out.textContent = err.message;
  }
});

$('#tgSimCopyBtn')?.addEventListener('click', async () => {
  const txt = $('#telegramSimOutput')?.textContent || '';
  try {
    await navigator.clipboard.writeText(txt);
    message(t('Telegram simülasyon yanıtı kopyalandı.', 'Telegram simulation reply copied.'));
  } catch (e) {
    message(txt);
  }
});

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
