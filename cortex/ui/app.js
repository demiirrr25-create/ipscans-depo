const $ = s => document.querySelector(s);
let state = null, seen = new Set(), first = true, refreshing = false, lastInstallPhase = null, currentTab = 'overview';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

/* ==========================================================================
   IPScans v2 Theme System (Light / Dark + OS Preference + Persistence)
   ========================================================================== */

function getPreferredTheme() {
  try {
    const saved = localStorage.getItem("ipscans-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch (e) {}
  return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
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
  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = e => {
      try {
        if (!localStorage.getItem("ipscans-theme")) {
          applyTheme(e.matches ? "dark" : "light", false);
        }
      } catch (err) {}
    };
    if (mq.addEventListener) mq.addEventListener('change', listener);
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
    'nav.settings': 'Ayarlar',
    'aside.workspace': 'Yerel çalışma alanı',
    'aside.privacy': 'Görüntüler bu bilgisayarda kalır.',
    'aside.engine': 'Yerel RTSP + Gemma 4 Motoru',
    'aside.rc': 'V1 sürüm adayı',
    'header.badge': 'LOCAL FIRST',
    'overview.eyebrow': 'GÖREN KAMERALAR. ANLAYAN SİSTEM.',
    'overview.title': 'Her kameraya<br>bir <em>beyin.</em>',
    'overview.lead': 'Neyi takip edeceğini sen söyle.<br>Cortex gözlemlesin, olayı kaydetsin, sana bildirsin.',
    'overview.cta': 'İlk kameranı bağla ↗',
    'overview.orb': 'GÖR · ANLA · BİLDİR',
    'overview.workspace': 'Çalışma alanın',
    'overview.liveStatus': 'Gerçek bağlantı durumu',
    'overview.hint': 'Başlamak için kamera ekle, olay kuralını tanımla ve izlemeyi başlat. Görsel AI kuralları için Ollama gerekir. 12 yerel kural türü AI modeli olmadan çalışır. Hayvan, doğa/hava ve müdahale için 12 görsel AI şablonu bulunur. Ayarlardan Gemma’yı tek tuşla hazırlayabilirsin.',
    'stats.cameras': 'KAMERALAR',
    'stats.rules': 'ETKİN KURALLAR',
    'stats.events': 'İNCELEME BEKLEYEN',
    'empty.camerasTitle': 'Henüz kamera eklenmedi.',
    'empty.camerasDesc': 'IP adresi ve giriş bilgileriyle ilk kameranı bağla.',
    'empty.rulesTitle': 'Kütüphaneden bir konfigürasyon seç.',
    'empty.rulesDesc': 'Aydınlatma, hareket ve bölge, görüntü sağlığı ve bağlantı kuralları model gerektirmez.',
    'empty.eventsTitle': 'Henüz olay yok.',
    'empty.eventsDesc': 'Tespit edilen olayların açıklamaları ve yerel klipleri burada görünür. Örnek veya sahte olay gösterilmez.',
    'cameras.eyebrow': '01 / GÖR',
    'cameras.title': 'Kameraların.',
    'cameras.subtitle': 'Aynı ağdaki cihazları keşfet veya RTSP ile bağlan.',
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
    'cameras.vaultHint': 'Kimlik bilgileri yerel şifreli kasada saklanır. Keşif ONVIF etkin ve aynı ağdaki cihazlarla sınırlıdır. Şablon model ve kanalınıza göre değişebilir.',
    'cameras.testBtn': 'Bağlantıyı test et',
    'cameras.saveBtn': 'Kaydet ve izlemeyi başlat',
    'rules.eyebrow': '02 / ANLA',
    'rules.title': 'Sen söyle.<br>Cortex takip etsin.',
    'rules.formTitle': 'Yeni olay kuralı',
    'rules.catalogLabel': 'Konfigürasyon kütüphanesi',
    'rules.cameraLabel': 'Kamera',
    'rules.nameLabel': 'Kural adı',
    'rules.promptLabel': 'Ne olduğunda haber verelim?',
    'rules.sensitivityLabel': 'Ölçüm eşiği',
    'rules.durationLabel': 'Doğrulama süresi (saniye)',
    'rules.roiSummary': 'Bölge ve çalışma takvimi',
    'rules.roiHint': 'Bölge koordinatları görüntünün yüzdesidir. Bağlantı kuralları kameranın tamamını izler. İlk kare referanstır; düzenleme referansı sıfırlar.',
    'rules.left': 'Sol (%)',
    'rules.top': 'Üst (%)',
    'rules.width': 'Genişlik (%)',
    'rules.height': 'Yükseklik (%)',
    'rules.startTime': 'Başlangıç',
    'rules.endTime': 'Bitiş',
    'rules.days': 'Günler',
    'rules.scheduleHint': 'Bilgisayarın yerel saati kullanılır. Başlangıç ve bitiş aynıysa tüm gün. Geceyi aşan aralık, başladığı güne aittir. Birden fazla gün için Ctrl/⌘ ile seçin.',
    'rules.scoreLabel': 'Minimum model skoru',
    'rules.cooldownLabel': 'Tekrar bildirim aralığı (sn)',
    'rules.modelNotice': 'Model skoru doğruluk yüzdesi değildir. Tespitler insan incelemesi gerektirir. Güncel kareler birlikte değerlendirilir. AI süresi kamera kartında görünür; 15 saniyeden eski yanıtlar alarm üretmez. Işık kapanması için yerel şablonu kullanın; AI yanıtını beklemez.',
    'rules.saveBtn': 'Kuralı etkinleştir ↗',
    'rules.resetBtn': 'Yeni kural',
    'events.eyebrow': '03 / BİLDİR',
    'events.title': 'Olay arşivi.',
    'events.subtitle': 'Kanıtı görüntüle. Bağlamı kontrol et. İncelemeyi tamamla.',
    'events.notifyBtn': 'Masaüstü bildirimi aç',
    'settings.eyebrow': 'ÇALIŞMA ALANI',
    'settings.title': 'Kontrol sende.',
    'settings.engineTitle': 'Yerel analiz motoru',
    'settings.modelLabel': 'Ollama görsel model adı',
    'settings.ollamaLead': 'Önce <a href="https://ollama.com/download/windows" target="_blank" rel="noreferrer">Ollama’yı indirip açın ↗</a>. Ardından aşağıdaki düğme Gemma 3 4B’yi indirir, görsel yanıtını test eder ve Cortex’e bağlar. Model indirmesi birkaç GB internet ve disk alanı kullanır. Yeterli RAM/GPU gerekir; hazır durumu donanımda test yanıtı alınmadan gösterilmez.',
    'settings.installBtn': 'Gemma’yı kur ve bağla',
    'settings.cancelBtn': 'İptal et',
    'settings.testModelBtn': 'Model bağlantısını kontrol et',
    'settings.retentionLabel': 'Kayıt saklama süresi (gün)',
    'settings.retentionHint': 'Süreyi azaltmak, süresi dolan olay kayıtlarını ve kliplerini siler.',
    'settings.autostart': 'Cortex açıldığında kayıtlı kameraları otomatik başlat',
    'settings.webhookTitle': 'Bildirim kanalı',
    'settings.webhookLabel': 'HTTPS webhook URL',
    'settings.replaceWebhook': 'Webhook ayarını değiştir (boş bırakılırsa kapatılır)',
    'settings.webhookHint': 'Bu adrese kamera adı, olay açıklaması ve model skoru gönderilir. Video gönderilmez; klipler yerel panelden açılır. Webhook isteğe bağlıdır. Başarısız gönderimler en fazla üç kez denenir; alıcı olay kimliğiyle tekrarları ayıklayabilir.',
    'settings.saveBtn': 'Ayarları kaydet',
    'footer.tagline': 'Yerel zekâ. Senin kontrolün.'
  },
  en: {
    'aside.eyebrow': 'CONTROL CENTER',
    'nav.overview': 'Overview',
    'nav.cameras': 'Cameras',
    'nav.rules': 'Event rules',
    'nav.events': 'Event archive',
    'nav.settings': 'Settings',
    'aside.workspace': 'Local workspace',
    'aside.privacy': 'Video frames stay on this PC.',
    'aside.engine': 'Local AI Vision Engine',
    'aside.rc': 'V1 release candidate',
    'header.badge': 'LOCAL FIRST',
    'overview.eyebrow': 'CAMERAS THAT SEE. SYSTEM THAT UNDERSTANDS.',
    'overview.title': 'A <em>brain</em> for<br>every camera.',
    'overview.lead': 'Tell it what to watch for.<br>Cortex observes, records evidence, and alerts you locally.',
    'overview.cta': 'Connect first camera ↗',
    'overview.orb': 'SEE · UNDERSTAND · NOTIFY',
    'overview.workspace': 'Your workspace',
    'overview.liveStatus': 'Live connection status',
    'overview.hint': 'Add a camera, define an event rule, and start monitoring. Ollama is required for Vision AI rules. 12 deterministic local rule types run without an AI model. 12 Vision AI templates are included for animals, weather, and tampering.',
    'stats.cameras': 'CAMERAS',
    'stats.rules': 'ACTIVE RULES',
    'stats.events': 'PENDING REVIEW',
    'empty.camerasTitle': 'No cameras added yet.',
    'empty.camerasDesc': 'Connect your first camera with its IP address and RTSP credentials.',
    'empty.rulesTitle': 'Select a configuration from the library.',
    'empty.rulesDesc': 'Lighting, motion & zone, image health, and connection rules run without an AI model.',
    'empty.eventsTitle': 'No events recorded yet.',
    'empty.eventsDesc': 'Detected event descriptions and local evidence clips appear here. No sample or fake events are shown.',
    'cameras.eyebrow': '01 / SEE',
    'cameras.title': 'Your cameras.',
    'cameras.subtitle': 'Discover ONVIF devices on your LAN or connect via RTSP.',
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
    'cameras.vaultHint': 'Credentials are stored in the local encrypted vault. Discovery is limited to ONVIF devices on the same subnet.',
    'cameras.testBtn': 'Test connection',
    'cameras.saveBtn': 'Save & start monitoring',
    'rules.eyebrow': '02 / UNDERSTAND',
    'rules.title': 'You describe it.<br>Cortex watches.',
    'rules.formTitle': 'New event rule',
    'rules.catalogLabel': 'Configuration library',
    'rules.cameraLabel': 'Camera',
    'rules.nameLabel': 'Rule name',
    'rules.promptLabel': 'When should we alert you?',
    'rules.sensitivityLabel': 'Measurement threshold',
    'rules.durationLabel': 'Verification duration (seconds)',
    'rules.roiSummary': 'Region of interest & schedule',
    'rules.roiHint': 'Region coordinates are percentages of the frame. Connection rules monitor the entire camera.',
    'rules.left': 'Left (%)',
    'rules.top': 'Top (%)',
    'rules.width': 'Width (%)',
    'rules.height': 'Height (%)',
    'rules.startTime': 'Start',
    'rules.endTime': 'End',
    'rules.days': 'Days',
    'rules.scheduleHint': 'Uses local system clock. Equal start and end times monitor all day.',
    'rules.scoreLabel': 'Minimum model score',
    'rules.cooldownLabel': 'Cooldown interval (sec)',
    'rules.modelNotice': 'Model score is not calibrated probability. Detections require human review. Responses older than 15s do not trigger alarms.',
    'rules.saveBtn': 'Enable rule ↗',
    'rules.resetBtn': 'New rule',
    'events.eyebrow': '03 / NOTIFY',
    'events.title': 'Event archive.',
    'events.subtitle': 'Inspect evidence. Verify context. Complete review.',
    'events.notifyBtn': 'Enable desktop notifications',
    'settings.eyebrow': 'WORKSPACE',
    'settings.title': 'You are in control.',
    'settings.engineTitle': 'Local analysis engine',
    'settings.modelLabel': 'Ollama vision model name',
    'settings.ollamaLead': 'First <a href="https://ollama.com/download/windows" target="_blank" rel="noreferrer">download &amp; open Ollama ↗</a>. Then use the button below to pull the vision model, verify inference, and bind it to Cortex.',
    'settings.installBtn': 'Install & connect Gemma',
    'settings.cancelBtn': 'Cancel',
    'settings.testModelBtn': 'Check model connection',
    'settings.retentionLabel': 'Evidence retention (days)',
    'settings.retentionHint': 'Reducing retention deletes expired event records and video clips.',
    'settings.autostart': 'Automatically start saved cameras when Cortex launches',
    'settings.webhookTitle': 'Notification channel',
    'settings.webhookLabel': 'HTTPS webhook URL',
    'settings.replaceWebhook': 'Update webhook setting (leave empty to disable)',
    'settings.webhookHint': 'Sends camera name, event summary, and score over HTTPS JSON. Video clips stay local.',
    'settings.saveBtn': 'Save settings',
    'footer.tagline': 'Local intelligence. Your control.'
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
  const r = await fetch('/api/' + path, data === undefined ? {} : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    ? { overview: 'Cortex', cameras: 'Cameras', rules: 'Event rules', events: 'Event archive', settings: 'Settings' }
    : { overview: 'Cortex', cameras: 'Kameralar', rules: 'Olay kuralları', events: 'Olay arşivi', settings: 'Ayarlar' };
  $('#crumb').textContent = labels[name] || 'Cortex';
}

function tab(name) {
  currentTab = name;
  document.querySelectorAll('.view').forEach(v => v.hidden = v.id !== name);
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  updateCrumb(name);
  if (name === 'rules') updateROI();
}

document.addEventListener('click', async e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.tab) return tab(b.dataset.tab);
  if (b.dataset.edit) { editRule(b.dataset.edit); return; }
  if (b.dataset.action) {
    if (b.dataset.action.endsWith('-delete') && !confirm('Bu kaydı silmek istiyor musunuz? Kamera silinirse bağlı kurallar da silinir; olay arşivi korunur.')) return;
    b.disabled = true;
    try {
      await api(b.dataset.action, { id: b.dataset.id });
      await refresh();
    } catch (e) {
      message(e.message);
    } finally {
      b.disabled = false;
    }
  }
});

/* ==========================================================================
   Camera, Rule & Event Rendering
   ========================================================================== */

function camera(c) {
  return `<article class="card"><div class="sectiontitle"><h2>${esc(c.name)}</h2><span class="tag">RTSP</span></div><div class="status">${esc(c.status)}</div>${c.status === 'Bağlı' ? `<img class="cameraimg" src="/api/frame/${c.id}?t=${Date.now()}" alt="${esc(c.name)} güncel görüntüsü">` : '<div class="empty" style="margin-top:16px"><p>Canlı görüntü için izlemeyi başlatın.</p></div>'}<p class="fine">${esc(c.analysis)}${c.inferenceMs == null ? '' : ' · AI süresi ' + (c.inferenceMs / 1000).toFixed(1) + ' sn'}${c.frameAge == null ? '' : ' · Kare yaşı ' + c.frameAge + ' sn'}${c.brightness == null ? '' : ' · Parlaklık ' + c.brightness + '/255'}</p><div class="actions"><button data-action="toggle" data-id="${c.id}">${c.status === 'Durduruldu' ? 'İzlemeyi başlat' : 'İzlemeyi durdur'}</button> <button data-action="camera-delete" data-id="${c.id}">Kamerayı sil</button></div></article>`;
}

async function refresh() {
  if (refreshing) return;
  refreshing = true;
  try {
    state = await api('state');
    setupCatalog();
    renderInstaller();
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
    $('#cameraSelect').value = selected;

    $('#ruleList').innerHTML = state.rules.map(r => `<article class="card"><span class="tag">${esc(state.cameras.find(c => c.id === r.camera)?.name)} · ${esc(state.templates.find(t => t.kind === r.kind)?.category || 'Görsel AI')}</span><h2>${esc(r.name)}</h2><p>${esc(r.prompt)}</p><p class="fine">${r.kind === 'vision' || !r.kind ? 'Model eşiği ' + r.threshold : 'Yerel ölçüm · Eşik ' + (r.sensitivity ?? r.dark) + ' · ' + (r.duration ?? r.hold * 3) + ' sn doğrulama'} · Tekrar aralığı ${r.cooldown} sn<br>${esc(r.schedule?.start || '00:00')}–${esc(r.schedule?.end || '00:00')} · ${r.schedule?.days.length || 7} gün · Bölge ${(r.roi || [0, 0, 100, 100]).join(' / ')}%</p><div class="actions"><button data-action="rule-toggle" data-id="${r.id}">${r.enabled ? 'Duraklat' : 'Etkinleştir'}</button><button data-edit="${r.id}">Düzenle</button><button data-action="rule-delete" data-id="${r.id}">Sil</button></div></article>`).join('') || empty(dict['empty.rulesTitle'], dict['empty.rulesDesc'], '⌘');

    const eventKey = JSON.stringify(state.events);
    if ($('#eventList').dataset.key !== eventKey) {
      $('#eventList').dataset.key = eventKey;
      $('#eventList').innerHTML = state.events.map(e => `<article class="card"><span class="tag ${e.reviewed ? 'ok' : 'warn'}">${e.reviewed ? 'İncelendi' : 'İnceleme gerekli'}</span><h2>${esc(e.rule)} · ${esc(e.camera)}</h2><p>${esc(e.reason)}</p><p class="fine">${new Date((e.observedAt || e.time) * 1000).toLocaleString('tr-TR')}${e.latencyMs ? ' · AI yanıt gecikmesi ' + (e.latencyMs / 1000).toFixed(1) + ' sn' : ''} · ${e.kind && e.kind !== 'vision' ? 'Yerel ölçüm' : 'Model skoru ' + e.confidence} · ${esc(e.notification)} · ${esc(e.recording === 'pending' ? 'Kayıt hazırlanıyor…' : e.recording === 'complete' ? 'Kayıt hazır' : e.recording || '')}</p>${e.snapshot ? `<a target="_blank" href="/api/evidence/${e.id}/00.jpg">Olay karesini aç ↗</a>` : ''}${e.clip ? `<video controls preload="none" src="/api/evidence/${e.id}/clip.mp4"></video>` : ''}<div class="actions">${e.before ? `<a target="_blank" href="/api/evidence/${e.id}/before.mp4">Olay öncesi örnek kareler ↗</a>` : ''}${e.clip ? `<a download href="/api/evidence/${e.id}/clip.mp4">Klibi indir ↓</a>` : '<span>RTSP klibi alınamadı; örnek kareleri inceleyin.</span>'}${!e.reviewed ? `<button data-action="review" data-id="${e.id}">İncelendi olarak işaretle</button>` : ''}</div></article>`).join('') || empty(dict['empty.eventsTitle'], dict['empty.eventsDesc'], '◷');
    }

    if (first) {
      $('#model').value = state.model;
      $('#retention').value = state.retention;
      $('#autostart').checked = state.autostart;
    }
    for (const e of state.events) {
      if (!first && !seen.has(e.id) && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Cortex · ' + e.rule, { body: e.camera + ': ' + e.reason });
      }
      seen.add(e.id);
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
        d.kind = state.templates.some(t => t.kind === selectedTemplate) ? selectedTemplate : 'vision';
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

$('#modelTest').onclick = async () => {
  try {
    const d = await api('model', {});
    $('#modelResult').textContent = d.message;
    await refresh();
  } catch (e) {
    $('#modelResult').textContent = 'Ollama erişilemiyor. Ollama uygulamasını açın.';
  }
};

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
  const groups = [...new Set(state.templates.map(t => t.category))];
  $('#ruleTemplate').innerHTML =
    groups.map(g => `<optgroup label="${esc(g)} · AI gerekmez">${state.templates.filter(t => t.category === g).map(t => `<option value="${t.kind}">${esc(t.name)}</option>`).join('')}</optgroup>`).join('') +
    [...new Set(state.visionTemplates.map(t => t.category))].map(g => `<optgroup label="${esc(g)} · Görsel AI">${state.visionTemplates.filter(t => t.category === g).map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</optgroup>`).join('') +
    '<optgroup label="Özel"><option value="custom">Kendi görsel kuralını yaz</option></optgroup>';
  chooseTemplate();
}

function chooseTemplate() {
  const value = $('#ruleTemplate').value;
  const t = state.templates.find(t => t.kind === value);
  const vision = state.visionTemplates.find(t => t.id === value);
  const f = $('#ruleForm');
  f.elements.kind.value = t ? value : 'vision';
  $('#localSettings').hidden = !t;
  $('#scoreLabel').hidden = !!t;
  $('#modelNotice').hidden = !!t;
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
        : t.kind === 'frozen'
          ? 'Eşik: ortalama piksel farkı (0–255 ölçeği). Durağan sahne de tetikleyebilir.'
          : t.kind === 'low_detail'
            ? 'Eşik: başlangıç referansına göre ayrıntı kaybı yüzdesi. İlk görüntü yeterli ayrıntı içermelidir.'
            : 'Eşik: değişen piksel yüzdesi. Hareket ölçümü insan, hayvan veya nesne sınıflandırmaz.';
  }
}

function resetRule() {
  const f = $('#ruleForm');
  f.reset();
  f.elements.id.value = '';
  $('#saveRule').textContent = 'Kuralı etkinleştir ↗';
  chooseTemplate();
  updateROI();
}

function editRule(id) {
  const r = state.rules.find(r => r.id === id);
  if (!r) return;
  tab('rules');
  $('#ruleTemplate').value = r.kind === 'vision' || !r.kind ? (r.visionTemplate || 'custom') : r.kind;
  chooseTemplate();
  const f = $('#ruleForm');
  for (const key of ['id', 'camera', 'name', 'prompt', 'threshold', 'cooldown', 'duration', 'sensitivity']) {
    if (r[key] !== undefined) f.elements[key].value = r[key];
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
  f.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ==========================================================================
   Theme-Aware ROI Zone Overlay & Canvas Drawing
   ========================================================================== */

function drawRoiCanvas() {
  const canvas = $('#roiCanvas');
  const f = $('#ruleForm');
  if (!canvas || !f) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const rx = Math.max(0, Math.min(95, Number(f.elements.x.value) || 0)) / 100 * w;
  const ry = Math.max(0, Math.min(95, Number(f.elements.y.value) || 0)) / 100 * h;
  const rw = Math.max(5, Math.min(100, Number(f.elements.width.value) || 100)) / 100 * w;
  const rh = Math.max(5, Math.min(100, Number(f.elements.height.value) || 100)) / 100 * h;

  const isDark = document.documentElement.dataset.theme === 'dark';
  const signalColor = isDark ? '#4C82FF' : '#2F6BFF';

  // Dim outside region
  ctx.fillStyle = 'rgba(7, 8, 11, 0.50)';
  ctx.fillRect(0, 0, w, h);
  ctx.clearRect(rx, ry, rw, rh);

  // Subtle rule-of-thirds grid inside ROI
  ctx.strokeStyle = isDark ? 'rgba(76, 130, 255, 0.28)' : 'rgba(47, 107, 255, 0.28)';
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

  // Corner handles
  ctx.fillStyle = signalColor;
  const handleSize = 6;
  const corners = [
    [rx, ry],
    [rx + rw - handleSize, ry],
    [rx, ry + rh - handleSize],
    [rx + rw - handleSize, ry + rh - handleSize]
  ];
  for (const [cx, cy] of corners) {
    ctx.fillRect(cx, cy, handleSize, handleSize);
  }
}

function updateROI() {
  const f = $('#ruleForm');
  const c = state?.cameras.find(c => c.id === f.elements.camera.value);
  const visible = c?.status === 'Bağlı';
  $('#roiPreview').hidden = !visible;
  if (!visible) return;
  $('#roiImage').src = '/api/frame/' + c.id + '?t=' + Date.now();
  const b = $('#roiBox');
  b.style.left = f.elements.x.value + '%';
  b.style.top = f.elements.y.value + '%';
  b.style.width = f.elements.width.value + '%';
  b.style.height = f.elements.height.value + '%';
  drawRoiCanvas();
}

$('#ruleTemplate').onchange = chooseTemplate;
$('#resetRule').onclick = resetRule;
$('#cameraSelect').onchange = updateROI;
for (const key of ['x', 'y', 'width', 'height']) {
  $('#ruleForm').elements[key].oninput = updateROI;
}

/* ==========================================================================
   Model Installer Status
   ========================================================================== */

function renderInstaller() {
  const m = state.installer, h = state.modelHealth;
  const busy = ['checking', 'pulling', 'verifying'].includes(m.phase);
  const connected = h.phase === 'connected';
  const gemmaConnected = connected && h.model === 'gemma3:4b';
  $('#installModel').disabled = busy || gemmaConnected;
  $('#installModel').textContent = busy
    ? 'Gemma hazırlanıyor…'
    : gemmaConnected
      ? 'Gemma bağlı ✓'
      : connected
        ? 'Gemma’ya geç'
        : 'Gemma’yı kur ve bağla';
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
  try { await api('model-install', {}); await refresh(); } catch (e) { message(e.message); }
};
$('#cancelModel').onclick = async () => {
  try { await api('model-cancel', {}); await refresh(); } catch (e) { message(e.message); }
};

/* Initialize Theme, Language & Polling */
initTheme();
initLanguage();
refresh();
setInterval(refresh, 1000);
