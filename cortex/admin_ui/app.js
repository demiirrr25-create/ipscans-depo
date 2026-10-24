/* IPScans Cortex 2.0.0-pro — Bağımsız Geliştirici & Müşteri Yönetim Merkezi (Port 8766) */
(() => {
  'use strict';

  const PLAN_DEFAULTS = {
    PRO: { maxCameras: 4, maxRules: 8, maxTelegramPhones: 2, label: 'CORTEX PRO' },
    PLUS: { maxCameras: 12, maxRules: 32, maxTelegramPhones: 5, label: 'CORTEX PLUS' },
    ULTRA: { maxCameras: 32, maxRules: 128, maxTelegramPhones: 10, label: 'CORTEX ULTRA' },
  };

  let adminToken = localStorage.getItem('cortex_admin_token') || sessionStorage.getItem('cortex_admin_token') || '';
  let appState = {
    customers: [],
    issuedLicenses: [],
    plans: PLAN_DEFAULTS,
    localLicense: {},
    telegram: {},
    audit: [],
    diskFreeGB: 0,
    camerasCount: 0,
    rulesCount: 0,
    cortexClientUrl: 'http://127.0.0.1:8765',
  };
  let lastSavedCustomer = null;
  let usernameTouchedManually = false;
  let signalFieldCtrl = null;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function esc(val) {
    const div = document.createElement('div');
    div.textContent = val == null ? '' : String(val);
    return div.innerHTML;
  }

  function truncateKey(key) {
    const raw = String(key || '').trim();
    if (raw.length <= 18) return raw;
    return `${raw.slice(0, 12)}…${raw.slice(-4)}`;
  }

  function calcQuotaPct(used, max) {
    const u = Math.max(0, Number(used) || 0);
    const m = Math.max(1, Number(max) || 1);
    return Math.min(100, Math.round((u / m) * 100));
  }

  async function withButtonGuard(btn, fn) {
    if (btn) {
      if (btn.disabled || btn.dataset.busy === '1') return;
      btn.disabled = true;
      btn.dataset.busy = '1';
    }
    try {
      return await fn();
    } finally {
      if (btn) {
        btn.disabled = false;
        delete btn.dataset.busy;
      }
    }
  }

  function showToast(msg, isError = false) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast ' + (isError ? 'toast-error' : 'toast-ok');
    el.hidden = false;
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      el.hidden = true;
    }, 4200);
  }

  async function copyText(text, label = 'Panoya kopyalandı') {
    try {
      await navigator.clipboard.writeText(String(text || ''));
      showToast(`${label}: ${text}`);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = String(text || '');
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      showToast(label);
    }
  }

  function slugifyUsername(org) {
    const trMap = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', Ç: 'c', Ğ: 'g', İ: 'i', Ö: 'o', Ş: 's', Ü: 'u' };
    return String(org || '')
      .replace(/[çğıöşüÇĞİÖŞÜ]/g, (m) => trMap[m] || m)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 24);
  }

  function generateStrongPassword(orgHint = '') {
    const prefix = slugifyUsername(orgHint).slice(0, 6) || 'cortex';
    const cap = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${cap}${num}!`;
  }

  async function api(path, body = null, method = null) {
    const reqMethod = method || (body !== null ? 'POST' : 'GET');
    const headers = { 'Content-Type': 'application/json' };
    if (adminToken) {
      headers['X-Admin-Token'] = adminToken;
    }
    const opts = { method: reqMethod, headers };
    if (body !== null) {
      opts.body = JSON.stringify({ ...body, adminToken });
    }
    const res = await fetch(path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 403 && path !== '/api/admin/login') {
        showLoginScreen();
      }
      throw new Error(data.error || `İstek başarısız (${res.status})`);
    }
    return data;
  }

  function initTheme() {
    const saved = localStorage.getItem('cortex_admin_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    $('#themeToggleBtn')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('cortex_admin_theme', next);
    });
  }

  /* ==========================================================================
     120fps/60fps Batched SignalField Canvas (ipscans.com)
     16 Pre-computed Color Buckets · Zero Per-Frame Allocations
     ========================================================================== */
  function initSignalField() {
    const canvas = $('#adminSignalCanvas');
    const gate = $('#loginGate');
    if (!canvas || !gate) return null;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return null;

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
      const density = 1 / 2100;
      const count = Math.max(96, Math.min(480, Math.round(area * density)));
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
      height = Math.max(1, rect.height || 640);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = buildParticles(width * height);
      const cx0 = width / 2;
      const cy0 = height * 0.52;
      const s0 = Math.min(width * 0.62, height * 0.78);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x = cx0 + p.hx * s0;
        p.y = cy0 + p.hy * s0;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height * 0.52;
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
      if (!running) return;
      if (gate.hidden || document.hidden) {
        stop();
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
      if (running || reduced || gate.hidden || document.hidden) return;
      lastTime = performance.now();
      running = true;
      raf = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    function sync() {
      if (gate.hidden || document.hidden) {
        stop();
      } else {
        if (particles.length === 0 || width <= 1 || height <= 1) {
          resize();
          draw();
        }
        start();
      }
    }

    resize();
    draw();
    start();

    window.addEventListener('resize', () => {
      if (!gate.hidden) {
        const rect = canvas.getBoundingClientRect();
        if (Math.abs(rect.width - width) > 4 || Math.abs(rect.height - height) > 4) {
          resize();
          if (!running) draw();
        }
      }
    });

    document.addEventListener('visibilitychange', sync);

    window.addEventListener(
      'pointermove',
      (e) => {
        if (gate.hidden) return;
        const rect = canvas.getBoundingClientRect();
        pointer.x = e.clientX - rect.left;
        pointer.y = e.clientY - rect.top;
        pointer.active = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= rect.width && pointer.y <= rect.height;
      },
      { passive: true }
    );

    return { start, stop, sync };
  }

  function showLoginScreen() {
    const gate = $('#loginGate');
    const wsRoot = $('#adminWorkspace');
    const ws = $('#workspace');
    if (gate) {
      gate.hidden = false;
      gate.style.display = 'grid';
    }
    if (wsRoot) {
      wsRoot.hidden = true;
      wsRoot.style.display = 'none';
    }
    if (ws) {
      ws.hidden = true;
    }
    if (signalFieldCtrl) signalFieldCtrl.sync();
  }

  function showWorkspace() {
    const gate = $('#loginGate');
    const wsRoot = $('#adminWorkspace');
    const ws = $('#workspace');
    if (gate) {
      gate.hidden = true;
      gate.style.display = 'none';
    }
    if (wsRoot) {
      wsRoot.hidden = false;
      wsRoot.style.display = 'block';
    }
    if (ws) {
      ws.hidden = false;
    }
    if (signalFieldCtrl) signalFieldCtrl.sync();
  }

  function applyStatePayload(data) {
    if (!data || typeof data !== 'object') return;
    if (data.adminToken) {
      adminToken = data.adminToken;
      localStorage.setItem('cortex_admin_token', adminToken);
      sessionStorage.setItem('cortex_admin_token', adminToken);
    }
    appState = {
      ...appState,
      ...data,
    };
    renderAll();
  }

  function renderTelemetry() {
    const customers = appState.customers || [];
    const activeCount = customers.filter((c) => c.status !== 'suspended').length;
    if ($('#metricTotalCustomers')) $('#metricTotalCustomers').textContent = String(customers.length);
    if ($('#metricActiveLicenses')) $('#metricActiveLicenses').textContent = String(activeCount);

    const lic = appState.localLicense || {};
    const localOrg = lic.organization || 'Merkez Saha İstasyonu';
    const localUser = lic.username || 'merkez';
    const localPlan = lic.plan || 'ULTRA';
    if ($('#metricLocalOrg')) $('#metricLocalOrg').textContent = `${localOrg} (${localPlan})`;
    if ($('#metricLocalUserPlan')) $('#metricLocalUserPlan').textContent = `@${localUser} · ${localPlan}`;

    const maxCams = lic.maxCameras || 32;
    const maxRules = lic.maxRules || 128;
    const maxTg = lic.maxTelegramPhones || 10;
    if ($('#metricLocalQuotas')) $('#metricLocalQuotas').textContent = `${maxCams} Kam / ${maxRules} Kural / ${maxTg} TG`;
    if ($('#metricLocalUsage')) $('#metricLocalUsage').textContent = `${appState.camerasCount || 0} Kamera · ${appState.rulesCount || 0} Kural`;

    const tg = appState.telegram || {};
    const boundCount = tg.boundPhonesCount || (tg.phone ? 1 : 0);
    if ($('#metricTelegramQuota')) $('#metricTelegramQuota').textContent = `${boundCount} / ${maxTg}`;
    if ($('#metricTelegramPhone')) $('#metricTelegramPhone').textContent = tg.phoneDisplay || '—';

    if ($('#metricEngineStatus')) $('#metricEngineStatus').textContent = `${appState.adminPort || 8766}`;
    if ($('#metricDiskFree')) $('#metricDiskFree').textContent = `${appState.diskFreeGB || 0} GB`;

    const clientLink = $('#openClientCortexLink');
    if (clientLink && appState.cortexClientUrl) {
      clientLink.href = appState.cortexClientUrl;
    }

    const selectedPlan = $('#custPlan')?.value || 'ULTRA';
    $$('.tier-card').forEach((card) => {
      card.classList.toggle('tier-card-selected', card.dataset.selectPlan === selectedPlan);
    });
  }

  function renderSavedBanner() {
    const banner = $('#savedCredentialsBanner');
    const content = $('#savedCredentialsContent');
    if (!banner || !content) return;
    if (!lastSavedCustomer) {
      banner.hidden = true;
      return;
    }
    const c = lastSavedCustomer;
    banner.hidden = false;
    content.innerHTML = `
      <div class="saved-item">
        <span>Müşteri / Kurum</span>
        <strong>${esc(c.organization)}</strong>
      </div>
      <div class="saved-item">
        <span>Kullanıcı Adı</span>
        <code>${esc(c.username)}</code>
      </div>
      <div class="saved-item">
        <span>Giriş Parolası</span>
        <code>${esc(c.passwordHint)}</code>
      </div>
      <div class="saved-item">
        <span>Paket &amp; Kotalar</span>
        <strong>${esc(c.plan)} · ${c.maxCameras} Kam / ${c.maxRules} Kural / ${c.maxTelegramPhones} TG</strong>
      </div>
      <div class="saved-item saved-item-wide">
        <span>Lisans Anahtarı</span>
        <code>${esc(c.key)}</code>
      </div>
    `;
  }

  function renderCustomers() {
    const container = $('#customerListContainer');
    if (!container) return;

    const query = ($('#customerSearchInput')?.value || '').trim().toLowerCase();
    const planFilter = $('#customerPlanFilter')?.value || 'ALL';
    const localCustId = appState.localLicense?.customerId || 'node-local-primary';

    const filtered = (appState.customers || []).filter((c) => {
      if (planFilter !== 'ALL' && c.plan !== planFilter) return false;
      if (!query) return true;
      const hay = `${c.organization} ${c.username} ${c.contact} ${c.key} ${c.plan}`.toLowerCase();
      return hay.includes(query);
    });

    const fp = JSON.stringify({
      q: query,
      pf: planFilter,
      loc: localCustId,
      items: filtered.map((c) => [
        c.id,
        c.organization,
        c.username,
        c.passwordHint,
        c.contact,
        c.plan,
        c.status,
        c.isLocalNode,
        c.key,
        c.daysRemaining,
        c.expiresAt,
        c.camerasUsed,
        c.maxCameras,
        c.rulesUsed,
        c.maxRules,
        c.telegramPhonesUsed,
        c.maxTelegramPhones,
      ]),
    });
    if (container.dataset.fingerprint === fp) return;
    container.dataset.fingerprint = fp;

    if (!filtered.length) {
      container.innerHTML = `<div class="empty-state">Arama kriterine uygun müşteri hesabı bulunamadı.</div>`;
      return;
    }

    container.innerHTML = filtered
      .map((c) => {
        const isSuspended = c.status === 'suspended';
        const isLocal = Boolean(c.isLocalNode || c.id === localCustId);
        const planClass = c.plan === 'PRO' ? 'tier-pro' : c.plan === 'PLUS' ? 'tier-plus' : 'tier-ultra';
        const daysLeft = c.daysRemaining != null ? c.daysRemaining : Math.max(0, Math.round(((c.expiresAt || 0) - Date.now() / 1000) / 86400));
        const pwText = c.passwordHint || 'Cortex2026!';
        const camUsed = c.camerasUsed || 0;
        const ruleUsed = c.rulesUsed || 0;
        const tgUsed = c.telegramPhonesUsed || 0;
        const camPct = calcQuotaPct(camUsed, c.maxCameras);
        const rulePct = calcQuotaPct(ruleUsed, c.maxRules);
        const tgPct = calcQuotaPct(tgUsed, c.maxTelegramPhones);

        return `
        <article class="customer-card ${isLocal ? 'customer-card-local' : ''} ${isSuspended ? 'customer-card-suspended' : ''}" data-cust-id="${esc(c.id)}">
          <div class="customer-card-top">
            <div class="customer-title-row">
              <h3>${esc(c.organization)}</h3>
              <span class="tier-badge ${planClass}">${esc(c.plan)}</span>
              ${isSuspended ? '<span class="status-pill status-pill-bad">Askıda</span>' : ''}
            </div>
            <div class="customer-meta-pills">
              ${c.contact && c.contact !== 'Belirtilmedi' ? `<span class="days-pill">${esc(c.contact)}</span>` : ''}
              <span class="days-pill">${daysLeft}g</span>
            </div>
          </div>

          <div class="customer-credentials-strip">
            <button type="button" class="cred-chip" data-copy="${esc(c.username)}" data-label="Kullanıcı adı kopyalandı" title="Kopyalamak için tıklayın">
              <span class="cred-chip-text">@${esc(c.username)}</span>
            </button>
            <button type="button" class="cred-chip" data-copy="${esc(pwText)}" data-label="Parola kopyalandı" title="Kopyalamak için tıklayın">
              <span class="cred-chip-text">${esc(pwText)}</span>
            </button>
            <button type="button" class="cred-chip" data-copy="${esc(c.key)}" data-label="Lisans anahtarı kopyalandı" title="Kopyalamak için tıklayın">
              <span class="cred-chip-text">${esc(truncateKey(c.key))}</span>
            </button>
          </div>

          <div class="customer-quotas-grid">
            <div class="quota-pill">
              <div class="quota-pill-top">
                <span>Kamera</span>
                <strong>${camUsed} / ${c.maxCameras}</strong>
              </div>
              <div class="quota-bar"><div class="quota-bar-fill" style="width:${camPct}%"></div></div>
            </div>
            <div class="quota-pill">
              <div class="quota-pill-top">
                <span>Kural</span>
                <strong>${ruleUsed} / ${c.maxRules}</strong>
              </div>
              <div class="quota-bar"><div class="quota-bar-fill" style="width:${rulePct}%"></div></div>
            </div>
            <div class="quota-pill">
              <div class="quota-pill-top">
                <span>Telegram</span>
                <strong>${tgUsed} / ${c.maxTelegramPhones}</strong>
              </div>
              <div class="quota-bar"><div class="quota-bar-fill" style="width:${tgPct}%"></div></div>
            </div>
          </div>

          <div class="customer-actions">
            <button type="button" class="btn-secondary btn-xs" data-edit-cust="${esc(c.id)}">Düzenle</button>
            <div class="inline-plan-switch">
              <button type="button" class="btn-ghost btn-xs ${c.plan === 'PRO' ? 'active-plan-btn' : ''}" data-action="upgrade_plan" data-plan="PRO" data-cust="${esc(c.id)}">PRO</button>
              <button type="button" class="btn-ghost btn-xs ${c.plan === 'PLUS' ? 'active-plan-btn' : ''}" data-action="upgrade_plan" data-plan="PLUS" data-cust="${esc(c.id)}">PLUS</button>
              <button type="button" class="btn-ghost btn-xs ${c.plan === 'ULTRA' ? 'active-plan-btn' : ''}" data-action="upgrade_plan" data-plan="ULTRA" data-cust="${esc(c.id)}">ULTRA</button>
            </div>
            <button type="button" class="btn-secondary btn-xs" data-action="toggle_suspend" data-cust="${esc(c.id)}">
              ${isSuspended ? 'Aktifleştir' : 'Askıya Al'}
            </button>
            <button type="button" class="btn-secondary btn-xs" data-action="extend_license" data-cust="${esc(c.id)}">+30 Gün</button>
            ${
              c.id !== 'node-local-primary'
                ? `<button type="button" class="btn-danger btn-xs" data-delete-cust="${esc(c.id)}" title="Müşteriyi Sil">Sil</button>`
                : ''
            }
          </div>
        </article>
      `;
      })
      .join('');
  }

  const renderCustomerList = renderCustomers;

  function renderLicenses() {
    const wrap = $('#issuedLicensesList');
    if (!wrap) return;
    const list = (appState.issuedLicenses || []).slice(0, 15);
    const fp = JSON.stringify(
      list.map((item) => [
        item.id,
        item.organization,
        item.username,
        item.plan,
        item.maxCameras,
        item.maxRules,
        item.maxTelegramPhones,
        item.key,
      ])
    );
    if (wrap.dataset.fingerprint === fp) return;
    wrap.dataset.fingerprint = fp;

    if (!list.length) {
      wrap.innerHTML = `
        <table class="compact-table">
          <thead>
            <tr>
              <th>Kurum &amp; Kullanıcı</th>
              <th>Paket</th>
              <th>Kotalar</th>
              <th>Lisans Anahtarı</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody id="licenseTableBody">
            <tr><td colspan="5" class="empty-state">Henüz üretilmiş lisans anahtarı kaydı yok.</td></tr>
          </tbody>
        </table>
      `;
      return;
    }

    wrap.innerHTML = `
      <table class="compact-table">
        <thead>
          <tr>
            <th>Kurum &amp; Kullanıcı</th>
            <th>Paket</th>
            <th>Kotalar</th>
            <th>Lisans Anahtarı</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody id="licenseTableBody">
          ${list
            .map(
              (item) => `
            <tr>
              <td>
                <strong>${esc(item.organization)}</strong>
                ${item.username ? `<div class="sub-cell">@${esc(item.username)}</div>` : ''}
              </td>
              <td><span class="tier-badge tier-${esc((item.plan || 'ULTRA').toLowerCase())}">${esc(item.plan)}</span></td>
              <td>${item.maxCameras || '-'} Kam / ${item.maxRules || '-'} Kural / ${item.maxTelegramPhones || 2} TG</td>
              <td><code>${esc(truncateKey(item.key))}</code></td>
              <td>
                <button type="button" class="btn-mini" data-copy="${esc(item.key)}" data-label="Anahtar kopyalandı">Kopyala</button>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  const renderIssuedLicenses = renderLicenses;

  function renderAudit() {
    const wrap = $('#auditLogList') || $('#auditLogContainer');
    if (!wrap) return;
    const list = (appState.audit || []).slice(0, 15);
    const fp = JSON.stringify(
      list.map((a) => [a.time, a.action, a.detail, a.hash])
    );
    if (wrap.dataset.fingerprint === fp) return;
    wrap.dataset.fingerprint = fp;

    if (!list.length) {
      wrap.innerHTML = `<div class="empty-state">Henüz denetim kaydı bulunmuyor.</div>`;
      return;
    }

    wrap.innerHTML = `
      <table class="compact-table">
        <thead>
          <tr>
            <th>Saat</th>
            <th>İşlem</th>
            <th>Detay</th>
            <th>SHA-256</th>
          </tr>
        </thead>
        <tbody>
          ${list
            .map((a) => {
              const dt = new Date((a.time || Date.now() / 1000) * 1000).toLocaleTimeString('tr-TR');
              return `
              <tr>
                <td>${esc(dt)}</td>
                <td><strong>${esc(a.action)}</strong></td>
                <td>${esc(a.detail)}</td>
                <td><code>${esc((a.hash || '').slice(0, 10))}</code></td>
              </tr>
            `;
            })
            .join('')}
        </tbody>
      </table>
    `;
  }

  const renderAuditLog = renderAudit;

  function renderAll() {
    renderTelemetry();
    renderSavedBanner();
    renderCustomers();
    renderLicenses();
    renderAudit();
  }

  function applyPlanDefaultQuotas(plan) {
    const spec = appState.plans?.[plan] || PLAN_DEFAULTS[plan] || PLAN_DEFAULTS.ULTRA;
    $('#custPlan').value = plan;
    $('#custMaxCameras').value = spec.maxCameras;
    $('#custMaxRules').value = spec.maxRules;
    $('#custMaxTelegramPhones').value = spec.maxTelegramPhones;
    $$('.tier-card').forEach((card) => {
      card.classList.toggle('tier-card-selected', card.dataset.selectPlan === plan);
    });
  }

  function loadCustomerIntoForm(custId) {
    const cust = (appState.customers || []).find((c) => c.id === custId);
    if (!cust) return;
    usernameTouchedManually = true;
    $('#custId').value = cust.id;
    $('#custOrganization').value = cust.organization || '';
    $('#custContact').value = cust.contact || '';
    $('#custUsername').value = cust.username || '';
    $('#custPassword').value = cust.passwordHint || 'Cortex2026!';
    $('#custPlan').value = cust.plan || 'ULTRA';
    $('#custMaxCameras').value = cust.maxCameras || 32;
    $('#custMaxRules').value = cust.maxRules || 128;
    $('#custMaxTelegramPhones').value = Math.max(2, cust.maxTelegramPhones || 2);
    const daysLeft = cust.daysRemaining != null ? Math.max(1, cust.daysRemaining) : 365;
    $('#custDays').value = daysLeft;
    $('#custStatus').value = cust.status === 'suspended' ? 'suspended' : 'active';
    $('#custAssignToLocal').checked = Boolean(cust.isLocalNode || appState.localLicense?.customerId === cust.id);

    if ($('#formModeBadge')) $('#formModeBadge').hidden = true;
    $('#studioTitle').textContent = `Müşteri Düzenle (@${cust.username})`;
    $('#resetFormBtn').hidden = false;
    $('#saveCustomerBtn').textContent = `Değişiklikleri Kaydet (@${cust.username})`;

    $('.studio-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast(`${cust.organization} (@${cust.username}) düzenleme formuna yüklendi.`);
  }

  function resetStudioForm() {
    usernameTouchedManually = false;
    $('#custId').value = '';
    $('#custOrganization').value = '';
    $('#custContact').value = '';
    $('#custUsername').value = '';
    $('#custPassword').value = generateStrongPassword('Cortex');
    $('#custDays').value = '365';
    $('#custStatus').value = 'active';
    $('#custAssignToLocal').checked = false;
    applyPlanDefaultQuotas('ULTRA');

    if ($('#formModeBadge')) $('#formModeBadge').hidden = true;
    $('#studioTitle').textContent = 'Müşteri Tanımla';
    $('#resetFormBtn').hidden = true;
    $('#saveCustomerBtn').textContent = 'Müşteri Hesabını ve Lisansı Kaydet';
  }

  function getLoginInputs() {
    const u = $('#adminUsername') || $('#loginUsername');
    const p = $('#adminPassword') || $('#loginPassword');
    return { u, p };
  }

  function bindEvents() {
    // Login form
    $('#loginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = $('#loginSubmitBtn');
      await withButtonGuard(submitBtn, async () => {
        const errEl = $('#loginError');
        errEl.hidden = true;
        const { u, p } = getLoginInputs();
        const username = (u?.value || '').trim();
        const password = p?.value || '';
        try {
          const res = await api('/api/admin/login', { username, password });
          applyStatePayload(res);
          showWorkspace();
          showToast(res.message || 'Geliştirici oturumu açıldı.');
        } catch (err) {
          errEl.textContent = err.message;
          errEl.hidden = false;
        }
      });
    });

    // Quick fill developer credentials
    $('#quickFillAdminBtn')?.addEventListener('click', () => {
      const { u, p } = getLoginInputs();
      if (u) u.value = 'admin';
      if (p) p.value = 'Kingofthegame0714*';
      $('#loginForm')?.requestSubmit();
    });

    // Toggle login password visibility
    $('#toggleLoginPwBtn')?.addEventListener('click', () => {
      const { p } = getLoginInputs();
      if (!p) return;
      const isPw = p.type === 'password';
      p.type = isPw ? 'text' : 'password';
      $('#toggleLoginPwBtn').textContent = isPw ? 'Gizle' : 'Göster';
    });

    // Logout
    $('#logoutBtn')?.addEventListener('click', () => {
      adminToken = '';
      localStorage.removeItem('cortex_admin_token');
      sessionStorage.removeItem('cortex_admin_token');
      showLoginScreen();
    });

    // Refresh state
    $('#refreshStateBtn')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      await withButtonGuard(btn, async () => {
        try {
          const data = await api('/api/admin/state');
          applyStatePayload(data);
          showToast('Veritabanı ve lisans durumu yenilendi.');
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });

    // Diagnostics
    $('#runDiagBtn')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      await withButtonGuard(btn, async () => {
        try {
          const data = await api('/api/admin/action', { action: 'run_diagnostics' });
          applyStatePayload(data);
          showToast(data.message || 'Sistem tanılaması tamamlandı.');
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });

    // Restart Telegram globally
    $('#restartTelegramGlobalBtn')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      await withButtonGuard(btn, async () => {
        try {
          const data = await api('/api/admin/action', {
            action: 'restart_telegram',
            customerId: appState.localLicense?.customerId || 'node-local-primary',
          });
          applyStatePayload(data);
          showToast(data.message || 'Telegram Bot motoru sıfırlandı.');
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });

    // Organization input -> auto-suggest username for new customers
    $('#custOrganization')?.addEventListener('input', (e) => {
      if (!usernameTouchedManually && !$('#custId').value) {
        const suggested = slugifyUsername(e.target.value);
        if (suggested) {
          $('#custUsername').value = suggested;
        }
      }
    });

    $('#custUsername')?.addEventListener('input', () => {
      usernameTouchedManually = true;
    });

    // Generate random strong password
    $('#genRandomPwBtn')?.addEventListener('click', () => {
      const org = $('#custOrganization').value || 'Cortex';
      $('#custPassword').value = generateStrongPassword(org);
    });

    // Plan dropdown change -> auto-fill default limits
    $('#custPlan')?.addEventListener('change', (e) => {
      applyPlanDefaultQuotas(e.target.value);
    });

    // Clicking top tier showcase cards selects that tier
    $$('.tier-card[data-select-plan]').forEach((card) => {
      card.addEventListener('click', () => {
        const plan = card.dataset.selectPlan;
        applyPlanDefaultQuotas(plan);
        showToast(`${plan} paketi varsayılan kotaları forma aktarıldı.`);
      });
    });

    // Reset studio form
    $('#resetFormBtn')?.addEventListener('click', () => {
      resetStudioForm();
    });

    // Submit Customer Studio Form
    $('#customerStudioForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = $('#saveCustomerBtn');
      await withButtonGuard(saveBtn, async () => {
        const payload = {
          id: $('#custId').value.trim(),
          organization: $('#custOrganization').value.trim(),
          contact: $('#custContact').value.trim(),
          username: $('#custUsername').value.trim(),
          password: $('#custPassword').value.trim(),
          plan: $('#custPlan').value,
          maxCameras: Number($('#custMaxCameras').value),
          maxRules: Number($('#custMaxRules').value),
          maxTelegramPhones: Number($('#custMaxTelegramPhones').value),
          days: Number($('#custDays').value),
          status: $('#custStatus').value,
          assignToLocal: $('#custAssignToLocal').checked,
        };
        try {
          const res = await api('/api/admin/customer-save', payload);
          lastSavedCustomer = res.customer || null;
          applyStatePayload(res);
          resetStudioForm();
          renderSavedBanner();
          showToast(res.message || 'Müşteri hesabı ve lisans anahtarı kaydedildi.');
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });

    // Copy buttons on saved banner
    $('#copyLicenseKeyBtn')?.addEventListener('click', () => {
      if (lastSavedCustomer?.key) {
        copyText(lastSavedCustomer.key, 'Lisans anahtarı kopyalandı');
      }
    });

    $('#copyCustomerSummaryBtn')?.addEventListener('click', () => {
      if (!lastSavedCustomer) return;
      const c = lastSavedCustomer;
      const summary = [
        `=== IPScans Cortex 2.0 Pro Müşteri Hesap & Lisans Bilgileri ===`,
        `Kurum / Müşteri: ${c.organization}`,
        `Cortex Giriş Kullanıcı Adı: ${c.username}`,
        `Cortex Giriş Şifresi: ${c.passwordHint}`,
        `Paket: CORTEX ${c.plan}`,
        `Lisans Anahtarı: ${c.key}`,
        `Kamera Kotası: ${c.maxCameras} Kamera`,
        `Kural Kotası: ${c.maxRules} Kural`,
        `Telegram Bot Numara Kotası: ${c.maxTelegramPhones} Telefon Numarası`,
        `Cortex Arayüz Adresi: http://127.0.0.1:8765`,
      ].join('\n');
      copyText(summary, 'Müşteri teslim özeti panoya kopyalandı');
    });

    // Search and filter inputs
    $('#customerSearchInput')?.addEventListener('input', () => renderCustomerList());
    $('#customerPlanFilter')?.addEventListener('change', () => renderCustomerList());

    // Delegated actions on customer cards & tables
    document.body.addEventListener('click', async (e) => {
      const copyBtn = e.target.closest('[data-copy]');
      if (copyBtn) {
        copyText(copyBtn.dataset.copy, copyBtn.dataset.label || 'Kopyalandı');
        return;
      }

      const editBtn = e.target.closest('[data-edit-cust]');
      if (editBtn) {
        loadCustomerIntoForm(editBtn.dataset.editCust);
        return;
      }

      const delBtn = e.target.closest('[data-delete-cust]');
      if (delBtn) {
        const cid = delBtn.dataset.deleteCust;
        const cust = (appState.customers || []).find((c) => c.id === cid);
        if (!window.confirm(`${cust ? cust.organization : cid} müşteri hesabını silmek istediğinize emin misiniz?`)) {
          return;
        }
        await withButtonGuard(delBtn, async () => {
          try {
            const res = await api('/api/admin/customer-delete', { id: cid });
            applyStatePayload(res);
            showToast(res.message || 'Müşteri silindi.');
          } catch (err) {
            showToast(err.message, true);
          }
        });
        return;
      }

      const actBtn = e.target.closest('[data-action]');
      if (actBtn) {
        const action = actBtn.dataset.action;
        const customerId = actBtn.dataset.cust;
        const extra = {};
        if (actBtn.dataset.plan) {
          extra.plan = actBtn.dataset.plan;
        }
        await withButtonGuard(actBtn, async () => {
          try {
            const res = await api('/api/admin/action', { action, customerId, ...extra });
            applyStatePayload(res);
            showToast(res.message || 'İşlem tamamlandı.');
          } catch (err) {
            showToast(err.message, true);
          }
        });
      }
    });
  }

  async function bootstrap() {
    initTheme();
    signalFieldCtrl = initSignalField();
    bindEvents();
    resetStudioForm();
    if (adminToken) {
      try {
        const data = await api('/api/admin/state');
        applyStatePayload(data);
        showWorkspace();
        return;
      } catch (_) {
        showLoginScreen();
      }
    } else {
      showLoginScreen();
    }
  }

  document.addEventListener('DOMContentLoaded', bootstrap);
})();
