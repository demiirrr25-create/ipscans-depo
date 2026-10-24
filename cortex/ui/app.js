const $ = s => document.querySelector(s);
let state = null, seen = new Set(), first = true, refreshing = false, lastInstallPhase = null, currentTab = 'overview';
let heatmapCameras = new Set();
let studioMode = 'roi';
let isDrawing = false, dragAction = null, dragStart = null, initialRoi = null;
let matrixOpen = false, matrixHeatmap = false;
let sectorSelections = {}; // { [packId]: Set<number> }
let adminToken = '';
let lastGeneratedKey = '';
let lastGeneratedOrg = '';

try {
  adminToken = sessionStorage.getItem('cortex-admin-token') || '';
} catch (e) {}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

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
    'aside.workspace': 'Yerel çalışma alanı',
    'aside.privacy': 'Görüntüler bu bilgisayarda kalır.',
    'aside.engine': 'Hibrit Görsel AI + Akıllı Takip + Telegram Bot',
    'aside.rc': '2.0 Pro Ticari Sürüm',
    'header.badge': 'LOCAL FIRST',
    'overview.eyebrow': 'GÖREN KAMERALAR. ANLAYAN SİSTEM.',
    'overview.title': 'Her kameraya<br>bir <em>beyin.</em>',
    'overview.lead': 'Neyi takip edeceğini sen söyle.<br>Cortex gözlemlesin, olayı kanıtlarıyla kaydetsin, anında sana bildirsin.',
    'overview.cta': 'İlk kameranı bağla ↗',
    'overview.studioBtn': 'Bölge (ROI) & Kural Stüdyosu ⌘',
    'overview.orb': 'GÖR · ANLA · BİLDİR',
    'overview.workspace': 'Çalışma alanın',
    'overview.liveStatus': 'Gerçek bağlantı durumu · Canlı termal ısı haritası, İki Yönlü Telegram Bot ve KVKK maskeleme destekli',
    'overview.hint': 'Başlamak için kamera ekle, olay kuralını tanımla veya yukarıdan 8 kurumsal saha paketinden birini tek tıkla uygula. 22 yerel piksel kuralı, 6 Cortex Pro akıllı takip kuralı, 3 geçiş kontrol kuralı ve 42 görsel AI şablonu hazır gelir.',
    'sector.eyebrow': 'KURUMSAL SAHA PAKETLERİ · 8 SEKTÖR · PRO / PLUS / ULTRA',
    'sector.title': 'Tek tıkla sektörel kurulum paketleri',
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
    'cameras.credHint': 'Tam adres kullanıcı adı ve parola içeriyorsa aşağıdaki alanları boş bırakabilirsin. Ayrı alanlar doldurulursa bu bilgiler kullanılır.',
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
    'rules.roiSummary': '🎯 Profesyonel Bölge (ROI) & Geçiş Hattı Çizim Stüdyosu',
    'rules.roiHint': 'Sahne üzerinde yeni bölge çizebilir, mevcut bölgeyi ortasından tutup taşıyabilir, 8 kenar/köşe tutamacından boyutlandırabilir veya hazır bölge şablonlarını seçebilirsiniz.',
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
    'rules.modelNotice': 'Model skoru doğruluk yüzdesi değildir. Tespitler insan incelemesi gerektirir. Güncel kareler birlikte değerlendirilir. AI süresi kamera kartında görünür; 15 saniyeden eski yanıtlar alarm üretmez.',
    'rules.saveBtn': 'Kuralı etkinleştir ↗',
    'rules.resetBtn': 'Yeni kural',
    'events.eyebrow': '03 / BİLDİR & SORGULA',
    'events.title': 'Olay arşivi.',
    'events.subtitle': 'Doğal dilde ara, kanıt klibini incele, SHA-256 imzalı adli kanıt paketini indir.',
    'events.notifyBtn': 'Masaüstü bildirimi aç',
    'settings.eyebrow': '04 / ÇALIŞMA ALANI, OLLAMA VLM & MÜŞTERİ LİSANSI',
    'settings.title': 'Kontrol sende.',
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
    'settings.webhookHint': 'Slack ve Discord webhook adresleri otomatik tanınır. HMAC sırrı girilirse her bildirim X-Cortex-Signature-256 başlığıyla kriptografik olarak imzalanır.',
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
    'aside.workspace': 'Local workspace',
    'aside.privacy': 'Video frames stay on this PC.',
    'aside.engine': 'Hybrid Vision AI + Smart Tracking + Telegram Bot',
    'aside.rc': '2.0 Pro Commercial Edition',
    'header.badge': 'LOCAL FIRST',
    'overview.eyebrow': 'CAMERAS THAT SEE. SYSTEM THAT UNDERSTANDS.',
    'overview.title': 'A <em>brain</em> for<br>every camera.',
    'overview.lead': 'Tell it what to watch for.<br>Cortex observes, records forensic evidence, and alerts you locally.',
    'overview.cta': 'Connect first camera ↗',
    'overview.studioBtn': 'ROI & Rule Studio ⌘',
    'overview.orb': 'SEE · UNDERSTAND · ALERT',
    'overview.workspace': 'Your workspace',
    'overview.liveStatus': 'Live connection status · Thermal heatmap, 2-Way Telegram Bot & GDPR masking ready',
    'overview.hint': 'Add a camera, design a custom zone in the ROI Studio, or deploy one of the 8 enterprise sector packs above.',
    'sector.eyebrow': 'ENTERPRISE SECTOR PACKS · 8 VERTICALS · PRO / PLUS / ULTRA',
    'sector.title': 'One-click sector deployment packages',
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
    'rules.roiSummary': '🎯 Professional ROI Zone & Tripwire Studio',
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
    'settings.title': 'You are in control.',
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

function empty(title, description, icon = '◈') {
  return `<div class="empty"><span class="symbol" aria-hidden="true">${icon}</span><h2>${title}</h2><p>${description}</p></div>`;
}

function updateCrumb(name) {
  const labels = currentLang === 'en'
    ? { overview: 'Cortex', cameras: 'Cameras', rules: 'Event rules', events: 'Event archive', settings: 'Settings & License', admin: 'Admin Control Panel' }
    : { overview: 'Cortex', cameras: 'Kameralar', rules: 'Olay kuralları', events: 'Olay arşivi', settings: 'Ayarlar & Lisans', admin: 'Yönetim Paneli' };
  $('#crumb').textContent = labels[name] || 'Cortex';
}

function tab(name) {
  currentTab = name;
  document.querySelectorAll('.view').forEach(v => v.hidden = v.id !== name);
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  updateCrumb(name);
  if (name === 'rules') updateROI();
  if (name === 'admin') refreshAdminPanel();
}

document.addEventListener('click', async e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.tab) return tab(b.dataset.tab);
  if (b.dataset.edit) { editRule(b.dataset.edit); return; }
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
        out.textContent = `>>> KULLANICI KOMUTU: ${r.command}\n\n${r.reply}${r.hasPhoto ? '\n\n[📸 Anlık JPEG kamera karesi eklendi]' : ''}`;
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
      if (out) out.textContent = `[${new Date().toLocaleTimeString('tr-TR')}] ✓ ${r.message}`;
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
   Camera, Sector Packs, Analytics, Rules & Event Rendering
   ========================================================================== */

function camera(c) {
  const showHeat = heatmapCameras.has(c.id);
  const masksCount = (c.privacyMasks || []).length;
  const camRulesCount = (state?.rules || []).filter(r => r.camera === c.id && r.enabled).length;
  const nowTs = Date.now();
  const stageHtml = c.status === 'Bağlı'
    ? `<div class="camera-stage">
        <img class="cameraimg" src="/api/frame/${c.id}?t=${nowTs}" alt="${esc(c.name)} güncel görüntüsü">
        ${showHeat ? `<img class="heatmap-overlay" src="/api/heatmap/${c.id}?t=${nowTs}" alt="Canlı ısı haritası">` : ''}
      </div>`
    : '<div class="empty" style="margin-top:16px"><p>Canlı görüntü için izlemeyi başlatın.</p></div>';
  return `<article class="card camera-card">
    <div class="sectiontitle">
      <h2>${esc(c.name)}</h2>
      <div class="actions" style="margin:0;gap:6px">
        ${camRulesCount ? `<span class="tag ok">${camRulesCount} etkin kural</span>` : ''}
        ${masksCount ? `<span class="tag ok">KVKK Maske (${masksCount})</span>` : ''}
        <span class="tag">RTSP</span>
      </div>
    </div>
    <div class="status"><span class="dot ${c.status === 'Bağlı' ? '' : 'offline'}"></span> ${esc(c.status)}</div>
    ${stageHtml}
    <p class="fine">${esc(c.analysis)}${c.inferenceMs == null ? '' : ' · AI süresi ' + (c.inferenceMs / 1000).toFixed(1) + ' sn'}${c.frameAge == null ? '' : ' · Kare yaşı ' + c.frameAge + ' sn'}${c.brightness == null ? '' : ' · Parlaklık ' + c.brightness + '/255'}</p>
    <div class="actions">
      <button data-action="toggle" data-id="${c.id}" class="${c.status === 'Durduruldu' ? 'primary' : ''}">${c.status === 'Durduruldu' ? 'İzlemeyi başlat' : 'İzlemeyi durdur'}</button>
      <button data-action="access-permit" data-id="${c.id}">Tek geçiş izni · 15 sn</button>
      <button type="button" data-heatmap-toggle="${c.id}" class="${showHeat ? 'primary' : ''}">🔥 Isı haritası</button>
      <button type="button" data-privacy-mask="${c.id}">🛡️ KVKK maskesi</button>
      <button data-action="camera-delete" data-id="${c.id}">Kamerayı sil</button>
    </div>
  </article>`;
}

let lastSectorPackKey = '';
function renderSectorPacks(force = false) {
  const grid = $('#sectorPackGrid');
  if (!grid || !state?.sectorPacks) return;
  const sel = $('#sectorCameraSelect');
  if (sel) {
    const prev = sel.value;
    const camOptions = state.cameras.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    const allOption = state.cameras.length > 1
      ? `<option value="ALL">Tüm Kameralara Uygula (${state.cameras.length} Kamera)</option>`
      : '';
    sel.innerHTML = state.cameras.length
      ? allOption + camOptions
      : '<option value="">Önce kamera ekleyin</option>';
    if (prev && (prev === 'ALL' || state.cameras.some(c => c.id === prev))) {
      sel.value = prev;
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
      <article class="sector-card ${deployedCount > 0 ? 'sector-active' : ''}">
        <div>
          <div class="sector-head">
            <span class="sector-icon">${esc(p.icon)}</span>
            <div class="sector-head-meta">
              <div class="sector-badges">
                <span class="tag">${esc(p.badge || 'Saha Paketi')}</span>
                <span class="tag ${tierBadge === 'PRO' ? '' : tierBadge === 'PLUS' ? 'ok' : 'warn'}">${esc(tierBadge)}</span>
                ${deployedCount > 0
                  ? `<span class="tag ok">✓ ${deployedCount}/${p.rules.length} aktif</span>`
                  : `<span class="tag">${p.rules.length} hazır kural</span>`}
              </div>
              <h3>${esc(p.name)}</h3>
            </div>
          </div>
          <p class="fine sector-summary">${esc(p.summary)}</p>
          ${p.recommended ? `<p class="sector-placement"><strong>Önerilen Kameralar:</strong> ${esc(p.recommended)}</p>` : ''}
          <div class="sector-rules-list">
            <div class="sector-rules-bar">
              <span>Paketteki Kurallar &amp; Kalibreli Bölgeler</span>
              <button type="button" class="sector-mini-btn" data-sector-select-all="${esc(p.id)}">Tümünü Seç/Bırak</button>
            </div>
            ${p.rules.map((r, idx) => {
              const roi = r.roi || [0, 0, 100, 100];
              const sched = (r.start && r.end && r.start !== r.end) ? `${r.start}–${r.end}` : '7/24';
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
                    <span class="sector-pill mono">ROI ${roi[0]},${roi[1]}%</span>
                    <span class="sector-pill mono">${esc(sched)}</span>
                    <button type="button" class="sector-preview-btn" data-sector-preview-rule="${esc(p.id)}:${idx}" title="Bu kuralı ve bölgeyi çizim stüdyosunda aç">Stüdyo ↗</button>
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
    latBadge.textContent = a.avgLatencyMs ? `Ort. AI yanıtı: ${(a.avgLatencyMs / 1000).toFixed(1)} sn` : 'Yerel gerçek zamanlı motor aktif';
  }
  const chart = $('#hourlyChart');
  if (chart && Array.isArray(a.hourly24h)) {
    const maxVal = Math.max(1, ...a.hourly24h);
    chart.innerHTML = a.hourly24h.map((val, idx) => {
      const pct = Math.max(6, Math.round((val / maxVal) * 100));
      const hourLabel = `${23 - idx}s`;
      return `<div class="bar-col" title="${hourLabel} önce: ${val} olay">
        <div class="bar-fill ${val > 0 ? 'has-val' : ''}" style="height:${pct}%"></div>
        <span class="bar-lbl">${idx % 4 === 0 ? hourLabel : ''}</span>
      </div>`;
    }).join('');
  }
  const catBox = $('#categoryBreakdown');
  if (catBox && a.byCategory) {
    catBox.innerHTML = Object.entries(a.byCategory).map(([k, v]) => `<span class="tag">${esc(k)}: <strong>${v}</strong></span>`).join('');
  }
}

function renderLicenseAndAudit() {
  if (!state) return;
  const lic = state.license || {};
  const badge = $('#licenseBadge');
  if (badge && lic.badge) {
    badge.innerHTML = `<span>${esc(lic.badge)}</span> <i class="dot"></i>`;
  }
  const licDetails = $('#licenseDetails');
  if (licDetails) {
    licDetails.innerHTML = `<strong>Aktif Paket:</strong> ${esc(lic.name || 'Cortex ULTRA')} (<code>${esc(lic.plan || 'ULTRA')}</code>) · <strong>Kurum:</strong> ${esc(lic.organization || 'Kurumsal Saha')} · <strong>Kamera Kapasitesi:</strong> ${(state.cameras || []).length} / ${lic.maxCameras || 32} Kamera · <strong>Kural Kapasitesi:</strong> ${(state.rules || []).length} / ${lic.maxRules || 128} Kural · <strong>Anahtar:</strong> <code>${esc(lic.key || 'AKTİF')}</code>`;
  }
  const auditBox = $('#auditList');
  if (auditBox) {
    const items = state.audit || [];
    auditBox.innerHTML = items.length
      ? `<table><thead><tr><th>Zaman</th><th>İşlem</th><th>Detay</th><th>SHA-256 Zincir</th></tr></thead><tbody>${items.slice(0, 12).map(a => `<tr><td class="mono">${new Date(a.time * 1000).toLocaleTimeString('tr-TR')}</td><td><strong>${esc(a.action)}</strong></td><td>${esc(a.detail)}</td><td><code>${esc(a.id)}</code></td></tr>`).join('')}</tbody></table>`
      : '<p class="fine">Henüz denetim kaydı oluşmadı.</p>';
  }
}

function renderMatrixWall() {
  if (!matrixOpen || !state) return;
  const grid = $('#matrixWallGrid');
  if (!grid) return;
  const nowTs = Date.now();
  grid.innerHTML = state.cameras.length
    ? state.cameras.map(c => `
      <div class="wall-cell">
        <div class="wall-cell-bar">
          <strong>${esc(c.name)}</strong>
          <span class="tag ${c.status === 'Bağlı' ? 'ok' : 'warn'}">${esc(c.status)}</span>
        </div>
        ${c.status === 'Bağlı'
          ? `<div class="camera-stage"><img class="cameraimg" src="/api/frame/${c.id}?t=${nowTs}" alt="${esc(c.name)}">${matrixHeatmap ? `<img class="heatmap-overlay" src="/api/heatmap/${c.id}?t=${nowTs}" alt="">` : ''}</div>`
          : `<div class="wall-offline">Bağlantı bekleniyor…</div>`}
      </div>
    `).join('')
    : '<div class="wall-offline">Kamera duvarı için önce kamera ekleyin.</div>';
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
  const dict = I18N[currentLang] || I18N.tr;
  const filtered = filterEventsLocally(state.events || []);
  const countEl = $('#copilotCount');
  if (countEl) {
    countEl.textContent = `${filtered.length} / ${state.events.length} olay gösteriliyor`;
  }
  $('#eventList').innerHTML = filtered.map(e => `<article class="card">
    <div class="sectiontitle" style="margin-bottom:8px">
      <div class="actions" style="margin:0;gap:6px">
        <span class="tag ${e.reviewed ? 'ok' : 'warn'}">${e.reviewed ? 'İncelendi' : 'İnceleme gerekli'}</span>
        <span class="tag">${esc(ruleCategoryLabel(e.kind))}</span>
      </div>
      <span class="fine">${new Date((e.observedAt || e.time) * 1000).toLocaleString('tr-TR')}</span>
    </div>
    <h2>${esc(e.rule)} · ${esc(e.camera)}</h2>
    <p>${esc(e.reason)}</p>
    <p class="fine">${e.latencyMs ? 'AI yanıt gecikmesi ' + (e.latencyMs / 1000).toFixed(1) + ' sn · ' : ''}${e.kind && e.kind !== 'vision' ? 'Yerel / Pro motor' : 'Model skoru ' + e.confidence} · ${esc(e.notification)} · ${esc(e.recording === 'pending' ? 'Kayıt hazırlanıyor…' : e.recording === 'complete' ? 'Kayıt hazır' : e.recording || '')}</p>
    ${e.snapshot ? `<a target="_blank" href="/api/evidence/${e.id}/00.jpg">Olay karesini aç ↗</a>` : ''}
    ${e.clip ? `<video controls preload="none" src="/api/evidence/${e.id}/clip.mp4"></video>` : ''}
    <div class="actions">
      ${e.before ? `<a target="_blank" href="/api/evidence/${e.id}/before.mp4">Olay öncesi örnek kareler ↗</a>` : ''}
      ${e.clip ? `<a download href="/api/evidence/${e.id}/clip.mp4">Klibi indir ↓</a>` : '<span>RTSP klibi alınamadı; örnek kareleri inceleyin.</span>'}
      <a download href="/api/evidence-bundle/${e.id}.zip">🛡️ Adli Kanıt Paketi (SHA-256 ZIP) ↓</a>
      ${!e.reviewed ? `<button data-action="review" data-id="${e.id}">İncelendi olarak işaretle</button>` : ''}
    </div>
  </article>`).join('') || empty(dict['empty.eventsTitle'], dict['empty.eventsDesc'], '◷');
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
    setupCatalog();
    renderInstaller();
    renderDevices();
    renderSectorPacks();
    renderAnalytics();
    renderLicenseAndAudit();
    renderMatrixWall();

    if ($('#version')) $('#version').textContent = state.version;
    $('#diskStatus').textContent = 'Olay diski boş alanı: ' + state.diskFreeGB + ' GB';
    const dict = I18N[currentLang] || I18N.tr;
    $('#stats').innerHTML = [
      ['stats.cameras', dict['stats.cameras'], state.cameras.length],
      ['stats.rules', dict['stats.rules'], state.rules.filter(r => r.enabled).length],
      ['stats.events', dict['stats.events'], state.events.filter(e => !e.reviewed).length]
    ].map(([key, label, b]) => `<div class="stat"><span data-i18n="${key}">${label}</span><strong>${b.toString().padStart(2, '0')}</strong></div>`).join('');

    const cards = state.cameras.map(camera).join('') || empty(dict['empty.camerasTitle'], dict['empty.camerasDesc'], '◈');
    $('#overviewCameras').innerHTML = cards;
    $('#cameraList').innerHTML = state.cameras.map(camera).join('') || empty(dict['empty.camerasTitle'], dict['empty.camerasDesc'], '▦');

    const selected = $('#cameraSelect').value;
    $('#cameraSelect').innerHTML = '<option value="">Kamera seçin</option>' + state.cameras.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    if (selected && state.cameras.some(c => c.id === selected)) {
      $('#cameraSelect').value = selected;
    } else if (!selected && state.cameras.length === 1) {
      $('#cameraSelect').value = state.cameras[0].id;
    }
    if (currentTab === 'rules') updateROI();

    $('#ruleList').innerHTML = state.rules.map(r => {
      const roi = r.roi || [0, 0, 100, 100];
      const hasLine = r.kind?.startsWith('access_') || r.kind === 'pro_tailgating';
      return `<article class="card rule-card ${r.enabled ? '' : 'rule-paused'}">
        <div class="sectiontitle" style="margin-bottom:8px">
          <div class="actions" style="margin:0;gap:6px">
            <span class="tag ${r.enabled ? 'ok' : 'warn'}">${r.enabled ? 'Etkin' : 'Duraklatıldı'}</span>
            <span class="tag">${esc(state.cameras.find(c => c.id === r.camera)?.name || 'Kamera')}</span>
            <span class="tag">${esc(ruleCategoryLabel(r.kind))}</span>
          </div>
          <span class="tag mono">ROI: ${roi[0]},${roi[1]}% (${roi[2]}×${roi[3]}%)</span>
        </div>
        <h2>${esc(r.name)}</h2>
        <p>${esc(r.prompt)}</p>
        <p class="fine">${r.kind === 'vision' || !r.kind ? 'Model eşiği ' + r.threshold : 'Yerel/Pro ölçüm · Eşik ' + (r.sensitivity ?? r.dark) + ' · ' + (r.duration ?? r.hold * 3) + ' sn doğrulama'}${hasLine ? ` · Hat: ${(r.axis || 'y').toUpperCase()}=${r.line || 50}% (±${r.margin || 8}%)` : ''} · Tekrar aralığı ${r.cooldown} sn<br>Takvim: ${esc(r.schedule?.start || '00:00')}–${esc(r.schedule?.end || '00:00')} · ${r.schedule?.days.length || 7} gün</p>
        <div class="actions">
          <button data-action="rule-toggle" data-id="${r.id}">${r.enabled ? 'Duraklat' : 'Etkinleştir'}</button>
          <button data-edit="${r.id}" class="primary">Stüdyoda Düzenle ↗</button>
          <button data-action="rule-delete" data-id="${r.id}">Sil</button>
        </div>
      </article>`;
    }).join('') || empty(dict['empty.rulesTitle'], dict['empty.rulesDesc'], '⌘');

    const filterStateKey = JSON.stringify([
      state.events,
      $('#copilotQuery')?.value || '',
      $('#eventCategoryFilter')?.value || '',
      $('#eventReviewFilter')?.value || ''
    ]);
    if ($('#eventList').dataset.key !== filterStateKey) {
      $('#eventList').dataset.key = filterStateKey;
      renderEventsList();
    }

    if (first) {
      $('#model').value = state.model;
      if ($('#recommendedModelSelect')) $('#recommendedModelSelect').value = state.model;
      if ($('#aiInterval') && state.aiInterval) $('#aiInterval').value = String(state.aiInterval);
      $('#retention').value = state.retention;
      $('#autostart').checked = state.autostart;
      if ($('#soundAlert')) $('#soundAlert').checked = state.soundAlert !== false;
      if ($('#smartCascade')) $('#smartCascade').checked = state.smartCascade !== false;
      if ($('#tgPhone') && (state.telegram?.phoneDisplay || state.telegram?.phone)) $('#tgPhone').value = state.telegram.phoneDisplay || state.telegram.phone;
      if ($('#tgChatId') && state.telegram?.chatId) $('#tgChatId').value = state.telegram.chatId;
      if ($('#tgEnabled') && state.telegram) $('#tgEnabled').checked = state.telegram.enabled !== false;
    }
    if ($('#telegramStatus') && state.telegram) {
      const botTag = '@' + (state.telegram.botUsername || 'intelligentcortexbot');
      const phoneLabel = state.telegram.phoneDisplay || state.telegram.phone || 'Tüm bağlı operatörler';
      $('#telegramStatus').textContent = state.telegram.enabled
        ? `✓ Resmi Bot (${botTag}) aktif · Bildirim Hattı: ${phoneLabel} · Chat ID: ${state.telegram.chatId || 'Otomatik'}`
        : `Telegram bildirimleri duraklatıldı (${botTag}).`;
    }
    let newAlarm = false;
    for (const e of state.events) {
      if (!first && !seen.has(e.id)) {
        newAlarm = true;
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Cortex · ' + e.rule, { body: e.camera + ': ' + e.reason });
        }
      }
      seen.add(e.id);
    }
    if (newAlarm) playOperatorAlert();
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
      : empty('Cihaz bulunamadı.', 'Aynı ağda olduğunuzu ve kamerada ONVIF keşfinin etkin olduğunu kontrol edin. RTSP ile elle ekleyebilirsiniz.');
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
      out.textContent = `${r.result.matched ? '✅ EŞLEŞTİ' : '⚪ EŞLEŞMEDİ'} (Skor: ${r.result.confidence} · ${r.latencyMs} ms) — ${r.result.reason}`;
    }
  } catch (err) {
    if (out) out.textContent = `⚠️ ${err.message}`;
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
  $('#modelNotice').hidden = !!t;
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
    : 'Görsel AI: ' + (vision?.category || 'Özel kural') + '. Son karelerde görünen kanıt aranır. Yağmur, küçük hayvanlar ve yapraklar için görüntü kalitesi belirleyicidir; belirsiz sonuç bildirilmez.';
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
                        ? 'Eşik: başlangıç referansına göre ayrıntı kaybı yüzdesi. İlk görüntü yeterli ayrıntı içermelidir.'
                        : 'Eşik: değişen piksel yüzdesi. Hareket ölçümü insan, hayvan veya nesne sınıflandırmaz.';
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

  // Subtle 10% coordinate grid
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

  // Perspective corridor / zone guide lines
  ctx.strokeStyle = isDark ? 'rgba(76, 130, 255, 0.18)' : 'rgba(37, 99, 235, 0.24)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.strokeRect(w * 0.24, h * 0.18, w * 0.52, h * 0.42);
  ctx.moveTo(w * 0.24, h * 0.18); ctx.lineTo(0, 0);
  ctx.moveTo(w * 0.76, h * 0.18); ctx.lineTo(w, 0);
  ctx.moveTo(w * 0.24, h * 0.60); ctx.lineTo(0, h);
  ctx.moveTo(w * 0.76, h * 0.60); ctx.lineTo(w, h);
  ctx.stroke();

  // Center reticle
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

  // Dim outside ROI region using 4 surrounding rectangles
  ctx.fillStyle = isDark ? 'rgba(5, 7, 12, 0.56)' : 'rgba(15, 23, 42, 0.18)';
  ctx.fillRect(0, 0, w, ry); // top
  ctx.fillRect(0, ry + rh, w, h - (ry + rh)); // bottom
  ctx.fillRect(0, ry, rx, rh); // left
  ctx.fillRect(rx + rw, ry, w - (rx + rw), rh); // right

  // Rule-of-thirds grid inside ROI
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

  // 8-point resize handles (4 corners + 4 mid-edges)
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

  // Draw Crossing Tripwire & Margin Band when access/tailgating rule is selected or studioMode==='line'
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
      img.src = '/api/frame/' + c.id + '?t=' + Date.now();
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
      ? `${targetModel} bağlı ✓`
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

$('#telegramForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const statusEl = $('#telegramStatus');
  if (statusEl) statusEl.textContent = '⏳ Telefon numaranız @intelligentcortexbot ile eşleştiriliyor...';
  try {
    const d = Object.fromEntries(new FormData(e.target));
    if (d.phone && d.phone.trim()) {
      d.enabled = true;
      if ($('#tgEnabled')) $('#tgEnabled').checked = true;
    } else {
      d.enabled = !!d.enabled;
    }
    d.sendWelcome = true;
    const r = await api('telegram-bind-phone', d);
    if ($('#tgPhone') && r.phoneDisplay) $('#tgPhone').value = r.phoneDisplay;
    if ($('#tgChatId') && r.chatId) $('#tgChatId').value = r.chatId;
    if (statusEl) statusEl.textContent = '✓ ' + r.message;
    message(r.message);
    await refresh();
  } catch (err) {
    if (statusEl) statusEl.textContent = '⚠️ ' + err.message;
    message(err.message);
  }
});

$('#openTelegramDesktopBtn')?.addEventListener('click', async () => {
  const phoneVal = $('#tgPhone')?.value || '05415130525';
  const statusEl = $('#telegramStatus');
  if (statusEl) statusEl.textContent = '⏳ Telegram uygulaması açılıyor ve numaranız eşleştiriliyor...';
  try {
    const r = await api('telegram-bind-phone', { phone: phoneVal, enabled: true, openDesktop: true, sendWelcome: true });
    if ($('#tgPhone') && r.phoneDisplay) $('#tgPhone').value = r.phoneDisplay;
    if ($('#tgChatId') && r.chatId) $('#tgChatId').value = r.chatId;
    if (statusEl) statusEl.textContent = '✓ ' + r.message;
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

/* --- ADMIN CONTROL PANEL (admin / Kingofthegame0714*) --- */

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
              <button type="button" data-copy-license="${esc(c.licenseKey)}" data-org="${esc(c.organization)}">📋 Anahtarı Kopyala (${esc(c.licenseKey?.slice(0, 14))}…)</button>
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
            <button type="button" data-admin-action="run_diagnostics" data-customer="${esc(c.id)}">🩺 Tanılama</button>
            <button type="button" data-admin-action="reset_streams" data-customer="${esc(c.id)}">🔄 Akışları Sıfırla</button>
            <button type="button" data-admin-action="clear_queues" data-customer="${esc(c.id)}">🧹 Kuyruğu Temizle</button>
            <button type="button" data-admin-action="restart_telegram" data-customer="${esc(c.id)}">🤖 Telegram Yenile</button>
            <button type="button" data-admin-action="upgrade_plan" data-customer="${esc(c.id)}" data-plan="PLUS">⬆️ PLUS'a Yükselt</button>
            <button type="button" data-admin-action="upgrade_plan" data-customer="${esc(c.id)}" data-plan="ULTRA">⬆️ ULTRA'ya Yükselt</button>
            <button type="button" data-admin-action="extend_license" data-customer="${esc(c.id)}">📅 +30 Gün Uzat</button>
            <button type="button" data-admin-action="toggle_suspend" data-customer="${esc(c.id)}">${isSuspended ? '✓ Askıyı Kaldır' : '⛔ Askıya Al'}</button>
          </div>
        </article>`;
      }).join('');
    }

    const issuedBox = $('#adminIssuedLicenses');
    if (issuedBox) {
      issuedBox.innerHTML = issued.length
        ? `<table><thead><tr><th>Tarih</th><th>Müşteri</th><th>Paket</th><th>Kapasite</th><th>Lisans Anahtarı</th><th>İşlem</th></tr></thead><tbody>${issued.map(l => `<tr><td class="mono">${new Date(l.createdAt * 1000).toLocaleDateString('tr-TR')}</td><td><strong>${esc(l.organization)}</strong></td><td><span class="tag">${esc(l.plan)}</span></td><td>${l.maxCameras} Kam / ${l.maxRules} Kural</td><td><code>${esc(l.key)}</code></td><td><button type="button" class="sector-mini-btn" data-copy-license="${esc(l.key)}" data-org="${esc(l.organization)}">Kopyala</button></td></tr>`).join('')}</tbody></table>`
        : '<p class="fine">Bu oturumda henüz yeni lisans anahtarı üretilmedi. Yukarıdaki formdan PRO, PLUS veya ULTRA anahtar üretebilirsiniz.</p>';
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
      box.innerHTML = `<strong>ÜRETİLEN ${esc(r.plan)} LİSANS ANAHTARI (${esc(r.organization)}):</strong><br><code style="font-size:15px;font-weight:700">${esc(r.key)}</code><br><small>Bu anahtarı müşterinin Cortex uygulamasındaki Ayarlar &amp; Lisans alanına girdiğinizde sistem anında aktif olur.</small>`;
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
  $('#matrixWallModal').hidden = false;
  renderMatrixWall();
});

$('#closeMatrixWall')?.addEventListener('click', () => {
  matrixOpen = false;
  $('#matrixWallModal').hidden = true;
});

$('#wallHeatmapToggle')?.addEventListener('click', () => {
  matrixHeatmap = !matrixHeatmap;
  $('#wallHeatmapToggle').classList.toggle('primary', matrixHeatmap);
  renderMatrixWall();
});

document.querySelectorAll('.wall-layout-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.wall-layout-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const grid = $('#matrixWallGrid');
    if (grid) grid.className = `wall-grid cols-${btn.dataset.cols}`;
  });
});

/* Initialize Theme, Language, Interactive Studio & Polling */
initTheme();
initLanguage();
initInteractiveStudio();
try {
  const qsTab = new URLSearchParams(window.location.search).get("tab");
  if (qsTab && ["overview", "cameras", "rules", "events", "settings", "admin"].includes(qsTab)) {
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
setInterval(refresh, 1000);

let discoveryToken=null;
function deviceData(){const d=Object.fromEntries(new FormData($('#deviceForm')));d.sync=!!d.sync;d.https=!!d.https;return d}
function renderDevices(){ $('#deviceList').innerHTML=(state.devices||[]).map(d=>`<article class="card"><h3>${esc(d.name)}</h3><p>${esc(d.host)} · ${d.sync?'Otomatik eşitleme açık':'Eşitleme kapalı'}</p><p class="fine">${esc(d.clock.message)}${d.clock.drift==null?'':' · Sapma '+d.clock.drift+' sn'}${d.clock.checked?' · '+new Date(d.clock.checked*1000).toLocaleString('tr-TR'):''}</p><button data-action="device-toggle" data-id="${d.id}">${d.sync?'Eşitlemeyi durdur':'Eşitlemeyi aç'}</button> <button data-action="device-delete" data-id="${d.id}">Yönetimden kaldır</button></article>`).join('') }
$('#deviceForm').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;discoveryToken=null;$('#importChannels').hidden=true;$('#channelChoices').textContent='';$('#deviceResult').textContent='ONVIF kanalları okunuyor…';try{const r=await api('recorder-discover',deviceData());discoveryToken=r.token;$('#channelChoices').innerHTML=r.channels.map(c=>`<label class="check"><input type="checkbox" class="channelChoice" value="${esc(c.token)}" ${c.error?'disabled':'checked'}>${esc(c.name)} · ${c.error?esc(c.error):esc(c.encoding)+' '+c.width+'×'+c.height}</label>`).join('');$('#importChannels').hidden=!r.channels.some(c=>!c.error);$('#deviceResult').textContent=r.channels.length+' kanal bulundu. Düşük çözünürlüklü analiz akışı tercih edilir.'}catch(e){$('#deviceResult').textContent=e.message}finally{b.disabled=false}};
$('#saveClockDevice').onclick=async()=>{if(!$('#deviceForm').reportValidity())return;try{await api('device-add',deviceData());message('Cihaz saat yönetimine eklendi.');await refresh()}catch(e){message(e.message)}};
$('#importChannels').onclick=async()=>{const b=$('#importChannels');b.disabled=true;try{const r=await api('recorder-import',{token:discoveryToken,channels:Array.from(document.querySelectorAll('.channelChoice:checked'),el=>el.value)});let failed=0;for(const id of r.ids){try{await api('toggle',{id})}catch(e){failed++}}$('#deviceResult').textContent=r.added+' kamera eklendi; '+r.duplicates+' tekrar atlandı.'+(failed?' '+failed+' kamera başlatılamadı.':'');b.hidden=true;$('#channelChoices').textContent='';$('#deviceForm').elements.password.value='';await refresh()}catch(e){message(e.message)}finally{b.disabled=false}};
