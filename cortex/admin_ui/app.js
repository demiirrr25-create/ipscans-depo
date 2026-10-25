/* IPScans Cortex 2.4.0 — Bağımsız Geliştirici & Müşteri Yönetim Merkezi (Port 8766) */
(() => {
  'use strict';

  const PLAN_DEFAULTS = {
    PRO: { maxCameras: 4, maxRules: 8, maxTelegramPhones: 2, label: 'CORTEX PRO' },
    PLUS: { maxCameras: 12, maxRules: 32, maxTelegramPhones: 5, label: 'CORTEX PLUS' },
    ULTRA: { maxCameras: 32, maxRules: 128, maxTelegramPhones: 10, label: 'CORTEX ULTRA' },
  };

  const SVG_ICONS = {
    plus: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>`,
    bolt: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    layers: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
    shield: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
    bot: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 16h.01M16 16h.01"/></svg>`,
    sun: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 3v2m0 14v2M3 12h2m14 0h2m-2.6-6.4-1.4 1.4M7 17l-1.4 1.4m0-12.8L7 7m10 10 1.4 1.4"/></svg>`,
    user: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    pause: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/></svg>`,
    clipboard: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" height="4" width="8" rx="1"/></svg>`,
    station: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
    inspect: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/></svg>`,
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
  let infra3DCtrl = null;
  let quickFilterMode = 'ALL';
  let auditFilterMode = 'ALL';
  let inspectedCustomerId = null;
  let infraViewMode = '3d';
  let adminCmdkOpen = false;
  let adminCmdkItems = [];
  let adminCmdkIdx = 0;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  /* ==========================================================================
     Synthesized Web Audio Tactile Micro-Feedback Engine (adminSound)
     ========================================================================== */
  const adminSound = (() => {
    let ctx = null;
    let muted = false;
    try {
      muted = localStorage.getItem('cortex_admin_sound_muted') === '1';
    } catch (_) {}

    function getCtx() {
      if (muted) return null;
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!ctx) ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }

    function syncBtn() {
      const btn = $('#adminSoundToggleBtn');
      const iconWrap = $('#adminSoundIcon');
      if (btn) btn.classList.toggle('is-muted', muted);
      if (iconWrap) {
        const onSvg = iconWrap.querySelector('.icon-sound-on');
        const offSvg = iconWrap.querySelector('.icon-sound-off');
        if (onSvg && offSvg) {
          onSvg.hidden = muted;
          offSvg.hidden = !muted;
        }
      }
    }

    function trigger(type = 'click') {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      try {
        if (type === 'click') {
          const osc = c.createOscillator();
          const gain = c.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1400, now);
          osc.frequency.exponentialRampToValueAtTime(190, now + 0.016);
          gain.gain.setValueAtTime(0.04, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.016);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(now);
          osc.stop(now + 0.018);
        } else if (type === 'pop') {
          const osc = c.createOscillator();
          const gain = c.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(360, now);
          osc.frequency.exponentialRampToValueAtTime(680, now + 0.048);
          gain.gain.setValueAtTime(0.045, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.052);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(now);
          osc.stop(now + 0.055);
        } else if (type === 'success') {
          [523.25, 659.25].forEach((freq, i) => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            const t0 = now + i * 0.055;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t0);
            gain.gain.setValueAtTime(0.04, t0);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(t0);
            osc.stop(t0 + 0.15);
          });
        } else if (type === 'error') {
          const osc = c.createOscillator();
          const gain = c.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(160, now);
          osc.frequency.linearRampToValueAtTime(110, now + 0.12);
          gain.gain.setValueAtTime(0.04, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(now);
          osc.stop(now + 0.14);
        }
      } catch (_) {}
    }

    function toggleMute() {
      muted = !muted;
      try {
        localStorage.setItem('cortex_admin_sound_muted', muted ? '1' : '0');
      } catch (_) {}
      syncBtn();
      if (!muted) trigger('pop');
      return muted;
    }

    return { trigger, toggleMute, syncBtn };
  })();

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

  function formatTimestamp(epochSec) {
    if (!epochSec) return 'Az önce';
    const d = new Date(Number(epochSec) * 1000);
    if (Number.isNaN(d.getTime())) return 'Az önce';
    return d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
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
    adminSound.trigger(isError ? 'error' : 'success');
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
      showToast(`${label}`);
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

  function buildCustomerDeliveryPack(c) {
    return [
      `=== IPScans Cortex v2.3 · Kurumsal Hesap & Lisans Teslim Paketi ===`,
      `Kurum / Müşteri: ${c.organization}`,
      `Cortex Giriş Kullanıcı Adı: ${c.username}`,
      `Cortex Giriş Parolası: ${c.passwordHint || 'Cortex2026!'}`,
      `Ticari Paket: CORTEX ${c.plan}`,
      `Lisans Anahtarı: ${c.key}`,
      `Kapasite Kotaları: ${c.maxCameras} Kamera · ${c.maxRules} AI Kuralı · ${c.maxTelegramPhones} Telegram Numarası`,
      `Resmi Telegram Botu: https://t.me/intelligentcortexbot`,
      `Yerel Komuta Arayüzü: http://127.0.0.1:8765`,
    ].join('\n');
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

  function resolveInitialTheme() {
    let saved = null;
    try {
      saved = localStorage.getItem('ipscans-theme');
    } catch (_) {}
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  function applyTheme(theme) {
    const next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    try {
      localStorage.setItem('ipscans-theme', next);
      localStorage.setItem('cortex_admin_theme', next);
    } catch (_) {}
    if (signalFieldCtrl && typeof signalFieldCtrl.draw === 'function') {
      signalFieldCtrl.draw();
    }
    if (infra3DCtrl && typeof infra3DCtrl.draw === 'function') {
      infra3DCtrl.draw();
    }
  }

  function initTheme() {
    applyTheme(resolveInitialTheme());
    $$('[data-theme-toggle], #themeToggleBtn').forEach((btn) => {
      if (btn.dataset.themeBound === '1') return;
      btn.dataset.themeBound = '1';
      btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        adminSound.trigger('click');
      });
    });
  }

  function initSidebar() {
    const sidebar = $('#adminSidebar');
    const shell = $('.admin-shell-body');
    if (!sidebar || !shell) return;

    let collapsed = false;
    try {
      collapsed = localStorage.getItem('cortex_admin_sidebar_collapsed') === '1';
    } catch (_) {}

    function applyCollapsed(state) {
      collapsed = Boolean(state);
      sidebar.classList.toggle('is-collapsed', collapsed);
      shell.classList.toggle('is-sidebar-collapsed', collapsed);
      try {
        localStorage.setItem('cortex_admin_sidebar_collapsed', collapsed ? '1' : '0');
      } catch (_) {}
      setTimeout(() => {
        if (infra3DCtrl) infra3DCtrl.resize();
      }, 240);
    }

    applyCollapsed(collapsed);

    const toggleFn = () => {
      adminSound.trigger('click');
      applyCollapsed(!collapsed);
    };

    $('#adminSidebarToggleBtn')?.addEventListener('click', toggleFn);
    $('#adminSidebarRailCollapseBtn')?.addEventListener('click', toggleFn);

    $$('[data-admin-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.adminNav;
        $$('[data-admin-nav]').forEach((b) => b.classList.toggle('active', b === btn));
        adminSound.trigger('click');
        if (target === 'overview') {
          $('#adminOverviewSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (target === 'infra3d') {
          $('#admin3DInfraSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (target === 'customers') {
          $('#adminCustomersSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (target === 'audit') {
          const det = $('#adminAuditSection');
          if (det) det.open = true;
          det?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    $('#sidebarInspectLocalBtn')?.addEventListener('click', () => {
      const localId = appState.localLicense?.customerId || 'node-local-primary';
      const target = (appState.customers || []).find((c) => c.isLocalNode || c.id === localId) || (appState.customers || [])[0];
      if (target) {
        openInspectorDrawer(target.id);
      }
    });

    $('#sidebarNewCustomerBtn')?.addEventListener('click', () => {
      resetStudioForm();
      $('#adminCustomersSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => $('#custOrganization')?.focus(), 220);
      adminSound.trigger('pop');
    });
  }

  function initAdminBentoSpotlight() {
    let rafId = 0;
    let lastEv = null;
    document.addEventListener(
      'pointermove',
      (e) => {
        lastEv = e;
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          if (!lastEv) return;
          const card = lastEv.target?.closest?.('[data-bento-card], .customer-card');
          if (!card) return;
          const rect = card.getBoundingClientRect();
          card.style.setProperty('--mouse-x', `${Math.round(lastEv.clientX - rect.left)}px`);
          card.style.setProperty('--mouse-y', `${Math.round(lastEv.clientY - rect.top)}px`);
        });
      },
      { passive: true }
    );
  }

  /* ==========================================================================
     120fps/60fps Batched SignalField Canvas + Rotating 3D Cortex Authority Core
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

    // Pre-allocated 3D Icosahedron Authority Core geometry (12 vertices, 30 edges)
    const PHI = (1 + Math.sqrt(5)) / 2;
    const RAW_VERTS = [
      [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
      [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
      [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
    ].map(([vx, vy, vz]) => {
      const len = Math.hypot(vx, vy, vz);
      return { x: vx / len, y: vy / len, z: vz / len };
    });
    const CORE_EDGES = [];
    for (let i = 0; i < RAW_VERTS.length; i++) {
      for (let j = i + 1; j < RAW_VERTS.length; j++) {
        const dx = RAW_VERTS[i].x - RAW_VERTS[j].x;
        const dy = RAW_VERTS[i].y - RAW_VERTS[j].y;
        const dz = RAW_VERTS[i].z - RAW_VERTS[j].z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist < 1.15) CORE_EDGES.push([i, j]);
      }
    }
    const projVerts = Array.from({ length: RAW_VERTS.length }, () => ({ sx: 0, sy: 0, z: 0 }));

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

    function drawAuthorityCore3D(cx, cy, coreRadius) {
      const isLight = document.documentElement.dataset.theme !== 'dark';
      const tiltX = pointer.active ? ((pointer.y - cy) / Math.max(1, height)) * 0.45 : 0;
      const tiltY = pointer.active ? ((pointer.x - cx) / Math.max(1, width)) * 0.45 : 0;
      const rx = t * 0.38 + tiltX;
      const ry = t * 0.54 + tiltY;
      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);
      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      const fov = 320;

      // Subtle core halo
      const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, coreRadius * 1.45);
      if (isLight) {
        grad.addColorStop(0, 'rgba(47, 107, 255, 0.14)');
        grad.addColorStop(0.55, 'rgba(0, 194, 255, 0.05)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      } else {
        grad.addColorStop(0, 'rgba(0, 210, 255, 0.20)');
        grad.addColorStop(0.55, 'rgba(76, 130, 255, 0.07)');
        grad.addColorStop(1, 'rgba(7, 8, 11, 0)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius * 1.45, 0, Math.PI * 2);
      ctx.fill();

      // Gyroscopic orbital ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.22);
      ctx.strokeStyle = isLight ? 'rgba(47, 107, 255, 0.28)' : 'rgba(76, 130, 255, 0.24)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(0, 0, coreRadius * 1.28, coreRadius * 0.44, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      for (let i = 0; i < RAW_VERTS.length; i++) {
        const v = RAW_VERTS[i];
        // Rotate Y then X
        const x1 = v.x * cosY + v.z * sinY;
        const z1 = -v.x * sinY + v.z * cosY;
        const y2 = v.y * cosX - z1 * sinX;
        const z2 = v.y * sinX + z1 * cosX;
        const persp = fov / (fov + z2 * coreRadius);
        projVerts[i].sx = cx + x1 * coreRadius * persp;
        projVerts[i].sy = cy + y2 * coreRadius * persp;
        projVerts[i].z = z2;
      }

      ctx.lineWidth = 1.25;
      ctx.strokeStyle = isLight ? 'rgba(47, 107, 255, 0.42)' : 'rgba(0, 210, 255, 0.42)';
      ctx.beginPath();
      for (let e = 0; e < CORE_EDGES.length; e++) {
        const a = projVerts[CORE_EDGES[e][0]];
        const b = projVerts[CORE_EDGES[e][1]];
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
      }
      ctx.stroke();

      ctx.fillStyle = isLight ? '#2F6BFF' : '#00D2FF';
      for (let i = 0; i < projVerts.length; i++) {
        const pv = projVerts[i];
        const r = pv.z < 0 ? 2.4 : 1.5;
        ctx.beginPath();
        ctx.arc(pv.sx, pv.sy, r, 0, Math.PI * 2);
        ctx.fill();
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

      drawAuthorityCore3D(cx, cy, Math.max(48, Math.min(92, scale * 0.22)));
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

    return { start, stop, sync, draw };
  }

  /* ==========================================================================
     Interactive 3D Multi-Installation Infrastructure Explorer (#adminInfra3DCanvas)
     Delta-Damped 60fps 3D Perspective Engine · Zero Per-Frame Allocations
     ========================================================================== */
  function initAdminInfra3D() {
    const canvas = $('#adminInfra3DCanvas');
    const section = $('#admin3DInfraSection');
    const tooltip = $('#infra3DHoverTooltip');
    if (!canvas || !section) return null;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return null;

    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 800;
    let height = 360;
    let dpr = 1;
    let running = false;
    let inViewport = true;
    let raf = 0;
    let t = 0;
    let lastTime = performance.now();

    // Camera orbit & zoom state (delta-damped)
    let yaw = 0.45;
    let targetYaw = 0.45;
    let pitch = 0.36;
    let targetPitch = 0.36;
    let zoom = 1.0;
    let targetZoom = 1.0;
    let autoRotate = !reducedMotion;

    // Pointer interaction & hit-testing state
    let dragging = false;
    let dragMoved = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let pointerX = -9999;
    let pointerY = -9999;
    let hoveredCustId = null;

    // Pre-allocated Root Authority Core Octahedron (6 vertices, 12 edges)
    const OCTA_VERTS = [
      { x: 0, y: 1, z: 0 },
      { x: 0, y: -1, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: -1 },
    ];
    const OCTA_EDGES = [
      [0, 2], [0, 3], [0, 4], [0, 5],
      [1, 2], [1, 3], [1, 4], [1, 5],
      [2, 4], [4, 3], [3, 5], [5, 2],
    ];
    const projOcta = Array.from({ length: 6 }, () => ({ sx: 0, sy: 0, z: 0 }));
    const projNodes = Array.from({ length: 64 }, () => ({
      id: '',
      sx: 0,
      sy: 0,
      z: 0,
      scale: 1,
      radius: 16,
      cust: null,
    }));
    let activeNodeCount = 0;

    function damp(curr, target, lambda, dt) {
      return curr + (target - curr) * (1 - Math.exp(-lambda * dt));
    }

    function project3D(x, y, z, cosY, sinY, cosP, sinP, cx, cy, fov) {
      const rx = x * cosY + z * sinY;
      const rz1 = -x * sinY + z * cosY;
      const ry = y * cosP - rz1 * sinP;
      const rz = y * sinP + rz1 * cosP;
      const depth = Math.max(80, fov + rz);
      const scale = (fov / depth) * zoom;
      return {
        sx: cx + rx * scale,
        sy: cy + ry * scale,
        z: rz,
        scale,
      };
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(300, rect.width || 800);
      height = Math.max(240, rect.height || 360);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      const isLight = document.documentElement.dataset.theme !== 'dark';
      // Background canvas fill
      ctx.fillStyle = isLight ? '#F7F8FA' : '#07080B';
      ctx.fillRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.52;
      const fov = 560;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);

      // Ambient radial stage glow
      const bgGlow = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.min(width, height) * 0.55);
      if (isLight) {
        bgGlow.addColorStop(0, 'rgba(47, 107, 255, 0.11)');
        bgGlow.addColorStop(0.5, 'rgba(0, 194, 255, 0.04)');
        bgGlow.addColorStop(1, 'rgba(247, 248, 250, 0)');
      } else {
        bgGlow.addColorStop(0, 'rgba(76, 130, 255, 0.14)');
        bgGlow.addColorStop(0.5, 'rgba(0, 210, 255, 0.04)');
        bgGlow.addColorStop(1, 'rgba(7, 8, 11, 0)');
      }
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, width, height);

      // 1. Draw 3D Perspective Orbital Reference Rings on Y=0 plane
      const orbitRadii = [110, 210, 295];
      for (let rIdx = 0; rIdx < orbitRadii.length; rIdx++) {
        const rad = orbitRadii[rIdx];
        ctx.strokeStyle = rIdx === 1
          ? (isLight ? 'rgba(47, 107, 255, 0.24)' : 'rgba(76, 130, 255, 0.18)')
          : (isLight ? 'rgba(11, 13, 18, 0.08)' : 'rgba(255, 255, 255, 0.06)');
        ctx.lineWidth = rIdx === 1 ? 1.2 : 1;
        ctx.beginPath();
        const segs = 64;
        for (let s = 0; s <= segs; s++) {
          const ang = (s / segs) * Math.PI * 2;
          const px = Math.cos(ang) * rad;
          const pz = Math.sin(ang) * rad;
          const pt = project3D(px, 18, pz, cosY, sinY, cosP, sinP, cx, cy, fov);
          if (s === 0) ctx.moveTo(pt.sx, pt.sy);
          else ctx.lineTo(pt.sx, pt.sy);
        }
        ctx.stroke();
      }

      // 2. Project Customer Station Nodes in 3D space
      const customers = appState.customers || [];
      const localCustId = appState.localLicense?.customerId || 'node-local-primary';
      activeNodeCount = Math.min(customers.length, projNodes.length);
      const baseOrbitRadius = Math.min(230, Math.max(155, width * 0.22));

      for (let i = 0; i < activeNodeCount; i++) {
        const c = customers[i];
        const angle = (i / Math.max(1, activeNodeCount)) * Math.PI * 2 + 0.35;
        const elev = (i % 2 === 0 ? -1 : 1) * 22 * Math.sin(angle * 1.5);
        const r = c.isLocalNode || c.id === localCustId ? baseOrbitRadius * 0.86 : baseOrbitRadius;
        const nx = Math.cos(angle) * r;
        const ny = elev;
        const nz = Math.sin(angle) * r;
        const pt = project3D(nx, ny, nz, cosY, sinY, cosP, sinP, cx, cy, fov);

        const slot = projNodes[i];
        slot.id = c.id;
        slot.nx = nx;
        slot.ny = ny;
        slot.nz = nz;
        slot.sx = pt.sx;
        slot.sy = pt.sy;
        slot.z = pt.z;
        slot.scale = pt.scale;
        slot.radius = Math.max(12, Math.round(17 * pt.scale));
        slot.cust = c;
      }

      // Project Root Core at (0, -4, 0)
      const rootPt = project3D(0, -4, 0, cosY, sinY, cosP, sinP, cx, cy, fov);

      // 3. Draw 3D Cryptographic Links & Telemetry Data Packets (Root -> Stations)
      for (let i = 0; i < activeNodeCount; i++) {
        const node = projNodes[i];
        const c = node.cust;
        const isSuspended = c.status === 'suspended';
        const isLocal = Boolean(c.isLocalNode || c.id === localCustId);
        const isSelected = c.id === inspectedCustomerId || c.id === hoveredCustId;

        ctx.save();
        if (isSuspended) {
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = isLight ? 'rgba(240, 68, 56, 0.65)' : 'rgba(239, 68, 68, 0.55)';
          ctx.lineWidth = 1.4;
        } else if (isLocal) {
          ctx.strokeStyle = isSelected ? (isLight ? '#2F6BFF' : '#00D2FF') : (isLight ? 'rgba(47, 107, 255, 0.72)' : 'rgba(76, 130, 255, 0.72)');
          ctx.lineWidth = isSelected ? 2.2 : 1.7;
        } else {
          ctx.strokeStyle = isSelected ? (isLight ? '#2F6BFF' : '#00D2FF') : (isLight ? 'rgba(18, 183, 106, 0.55)' : 'rgba(34, 197, 94, 0.45)');
          ctx.lineWidth = isSelected ? 2.0 : 1.35;
        }

        ctx.beginPath();
        ctx.moveTo(rootPt.sx, rootPt.sy);
        ctx.lineTo(node.sx, node.sy);
        ctx.stroke();
        ctx.restore();

        // Animated telemetry packet along active link
        if (!isSuspended) {
          const pulseProg = ((t * 0.55 + i * 0.27) % 1 + 1) % 1;
          const pktX = rootPt.sx + (node.sx - rootPt.sx) * pulseProg;
          const pktY = rootPt.sy + (node.sy - rootPt.sy) * pulseProg;
          ctx.fillStyle = isLocal ? (isLight ? '#2F6BFF' : '#00D2FF') : (isLight ? '#12B76A' : '#22C55E');
          ctx.beginPath();
          ctx.arc(pktX, pktY, 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 4. Draw Central 3D HMAC-SHA256 Root Authority Core Wireframe
      const coreR = 34 * rootPt.scale;
      const coreGlow = ctx.createRadialGradient(rootPt.sx, rootPt.sy, 3, rootPt.sx, rootPt.sy, coreR * 1.9);
      if (isLight) {
        coreGlow.addColorStop(0, 'rgba(47, 107, 255, 0.24)');
        coreGlow.addColorStop(0.55, 'rgba(0, 194, 255, 0.08)');
        coreGlow.addColorStop(1, 'rgba(247, 248, 250, 0)');
      } else {
        coreGlow.addColorStop(0, 'rgba(0, 210, 255, 0.35)');
        coreGlow.addColorStop(0.55, 'rgba(76, 130, 255, 0.12)');
        coreGlow.addColorStop(1, 'rgba(7, 8, 11, 0)');
      }
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(rootPt.sx, rootPt.sy, coreR * 1.9, 0, Math.PI * 2);
      ctx.fill();

      const rotCoreY = yaw + t * 0.7;
      const cosCY = Math.cos(rotCoreY);
      const sinCY = Math.sin(rotCoreY);
      for (let v = 0; v < OCTA_VERTS.length; v++) {
        const ov = OCTA_VERTS[v];
        const pt = project3D(ov.x * 32, ov.y * 32 - 4, ov.z * 32, cosCY, sinCY, cosP, sinP, cx, cy, fov);
        projOcta[v].sx = pt.sx;
        projOcta[v].sy = pt.sy;
      }

      ctx.strokeStyle = isLight ? 'rgba(47, 107, 255, 0.82)' : 'rgba(0, 210, 255, 0.78)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let e = 0; e < OCTA_EDGES.length; e++) {
        const a = projOcta[OCTA_EDGES[e][0]];
        const b = projOcta[OCTA_EDGES[e][1]];
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
      }
      ctx.stroke();

      ctx.fillStyle = isLight ? '#2F6BFF' : '#00D2FF';
      ctx.beginPath();
      ctx.arc(rootPt.sx, rootPt.sy, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Root Core HUD Label
      ctx.font = '600 10px "Google Sans Code", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = isLight ? '#1F56E0' : '#00D2FF';
      ctx.fillText('HMAC-SHA256 KÖK OTORİTE (8766)', rootPt.sx, rootPt.sy - coreR - 10);

      // 5. Draw Customer Station Nodes + 3 Orbiting Quota Satellites + Warning Rings
      hoveredCustId = null;
      for (let i = 0; i < activeNodeCount; i++) {
        const node = projNodes[i];
        const c = node.cust;
        const isSuspended = c.status === 'suspended';
        const isLocal = Boolean(c.isLocalNode || c.id === localCustId);
        const camPct = calcQuotaPct(c.camerasUsed, c.maxCameras);
        const rulePct = calcQuotaPct(c.rulesUsed, c.maxRules);
        const tgPct = calcQuotaPct(c.telegramPhonesUsed, c.maxTelegramPhones);
        const daysLeft = c.daysRemaining != null ? c.daysRemaining : 365;
        const highQuotaWarn = !isSuspended && (camPct >= 80 || rulePct >= 80 || tgPct >= 80 || daysLeft < 30);

        // Hit-test pointer proximity
        const distToPtr = Math.hypot(pointerX - node.sx, pointerY - node.sy);
        const isHovered = distToPtr <= node.radius + 10;
        if (isHovered) hoveredCustId = c.id;
        const isSelected = c.id === inspectedCustomerId || isHovered;

        const baseColor = isSuspended
          ? (isLight ? '#F04438' : '#EF4444')
          : isLocal
          ? (isLight ? '#2F6BFF' : '#4C82FF')
          : c.plan === 'ULTRA'
          ? (isLight ? '#7A5CFF' : '#9B84FF')
          : c.plan === 'PLUS'
          ? (isLight ? '#00A6E0' : '#00D2FF')
          : (isLight ? '#12B76A' : '#22C55E');

        // High Quota Warning Ring (Amber)
        if (highQuotaWarn) {
          ctx.strokeStyle = isLight ? 'rgba(247, 144, 9, 0.85)' : 'rgba(245, 158, 11, 0.78)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, node.radius + 9 + Math.sin(t * 3 + i) * 2, 0, Math.PI * 2);
          ctx.stroke();
        }

        // 3 Orbiting Quota Satellites (Cameras, Rules, Telegram)
        const satOrbitRx = node.radius + 13;
        const satOrbitRy = (node.radius + 13) * 0.48;
        ctx.strokeStyle = isLight ? 'rgba(11, 13, 18, 0.14)' : 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(node.sx, node.sy, satOrbitRx, satOrbitRy, 0, 0, Math.PI * 2);
        ctx.stroke();

        const satColors = isLight
          ? ['#2F6BFF', '#7A5CFF', '#12B76A']
          : ['#00D2FF', '#9B84FF', '#22C55E'];
        for (let s = 0; s < 3; s++) {
          const sAng = t * (1.35 + s * 0.25) + i * 1.7 + (s * Math.PI * 2) / 3;
          const sx = node.sx + Math.cos(sAng) * satOrbitRx;
          const sy = node.sy + Math.sin(sAng) * satOrbitRy;
          ctx.fillStyle = isSuspended ? (isLight ? '#F04438' : '#EF4444') : satColors[s];
          ctx.beginPath();
          ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Station Node Outer Glow & Core Sphere
        ctx.fillStyle = isLight
          ? (isSelected ? '#2F6BFF' : '#0B0D12')
          : (isSelected ? 'rgba(76, 130, 255, 0.28)' : 'rgba(13, 15, 20, 0.90)');
        ctx.strokeStyle = isSelected ? (isLight ? '#2F6BFF' : '#FFFFFF') : baseColor;
        ctx.lineWidth = isSelected ? 2.4 : 1.8;
        ctx.beginPath();
        ctx.arc(node.sx, node.sy, node.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Plan Code Inside Node
        ctx.font = '700 9px "Google Sans Code", monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.plan || 'ULTRA', node.sx, node.sy);

        // Projected HUD Label Below Station Node
        const labelY = node.sy + node.radius + 15;
        ctx.font = '600 11px "Google Sans Flex", system-ui, sans-serif';
        ctx.fillStyle = isLight
          ? (isSelected ? '#2F6BFF' : '#0B0D12')
          : (isSelected ? '#FFFFFF' : '#E2E8F0');
        const orgShort = String(c.organization || '').length > 22
          ? String(c.organization).slice(0, 20) + '…'
          : String(c.organization || '');
        ctx.fillText(orgShort, node.sx, labelY);

        ctx.font = '500 9.5px "Google Sans Code", monospace';
        ctx.fillStyle = isSuspended
          ? (isLight ? '#F04438' : '#EF4444')
          : isLocal
          ? (isLight ? '#2F6BFF' : '#00D2FF')
          : (isLight ? '#464A53' : '#94A3B8');
        ctx.fillText(
          `@${c.username} · ${c.camerasUsed || 0}/${c.maxCameras}K · ${c.telegramPhonesUsed || 0}/${c.maxTelegramPhones}TG`,
          node.sx,
          labelY + 13
        );
      }

      canvas.style.cursor = hoveredCustId ? 'pointer' : dragging ? 'grabbing' : 'grab';
      updateHoverTooltip();
    }

    function updateHoverTooltip() {
      if (!tooltip) return;
      if (!hoveredCustId || dragging) {
        tooltip.hidden = true;
        return;
      }
      const node = projNodes.find((n) => n.id === hoveredCustId);
      if (!node || !node.cust) {
        tooltip.hidden = true;
        return;
      }
      const c = node.cust;
      tooltip.hidden = false;
      const left = Math.min(width - 230, Math.max(12, node.sx + 18));
      const top = Math.min(height - 110, Math.max(12, node.sy - 24));
      tooltip.style.left = `${Math.round(left)}px`;
      tooltip.style.top = `${Math.round(top)}px`;
      tooltip.innerHTML = `
        <strong>${esc(c.organization)} (@${esc(c.username)})</strong>
        <span>Paket: CORTEX ${esc(c.plan)} · ${c.status === 'suspended' ? 'Askıda' : 'Aktif'}</span>
        <span>Kotalar: ${c.camerasUsed || 0}/${c.maxCameras} Kam · ${c.rulesUsed || 0}/${c.maxRules} Kural · ${c.telegramPhonesUsed || 0}/${c.maxTelegramPhones} TG</span>
        <span class="tooltip-cta">Tıkla: Sağ İstasyon Denetçisini Aç →</span>
      `;
    }

    function loop(now) {
      if (!running) return;
      if (document.hidden || !inViewport || infraViewMode !== '3d' || $('#adminWorkspace')?.hidden) {
        stop();
        return;
      }
      const ts = typeof now === 'number' ? now : performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (ts - lastTime) / 1000));
      lastTime = ts;
      t += dt;

      if (autoRotate && !dragging) {
        targetYaw += dt * 0.18;
      }
      yaw = damp(yaw, targetYaw, 10, dt);
      pitch = damp(pitch, targetPitch, 10, dt);
      zoom = damp(zoom, targetZoom, 10, dt);

      draw();
      raf = requestAnimationFrame(loop);
    }

    function start() {
      if (running || reducedMotion || document.hidden || !inViewport || infraViewMode !== '3d' || $('#adminWorkspace')?.hidden) {
        draw();
        return;
      }
      lastTime = performance.now();
      running = true;
      raf = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    function sync() {
      if (document.hidden || !inViewport || infraViewMode !== '3d' || $('#adminWorkspace')?.hidden) {
        stop();
      } else {
        start();
      }
    }

    // Pointer Orbit + Click-to-Inspect Events
    canvas.addEventListener('pointerdown', (e) => {
      dragging = true;
      dragMoved = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      canvas.setPointerCapture?.(e.pointerId);
    });

    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = e.clientX - rect.left;
      pointerY = e.clientY - rect.top;
      if (dragging) {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        if (Math.hypot(dx, dy) > 4) dragMoved = true;
        targetYaw += dx * 0.0075;
        targetPitch = Math.max(-0.55, Math.min(0.85, targetPitch + dy * 0.006));
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        if (!running) draw();
      } else if (!running) {
        draw();
      }
    });

    canvas.addEventListener('pointerup', (e) => {
      const wasDrag = dragMoved;
      dragging = false;
      canvas.releasePointerCapture?.(e.pointerId);
      if (!wasDrag && hoveredCustId) {
        openInspectorDrawer(hoveredCustId);
      }
    });

    canvas.addEventListener('pointerleave', () => {
      dragging = false;
      pointerX = -9999;
      pointerY = -9999;
      if (tooltip) tooltip.hidden = true;
    });

    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        targetZoom = Math.max(0.65, Math.min(1.75, targetZoom + delta));
        if (!running) draw();
      },
      { passive: false }
    );

    // Camera Control Buttons
    $('#infraZoomInBtn')?.addEventListener('click', () => {
      targetZoom = Math.min(1.75, targetZoom + 0.16);
      adminSound.trigger('click');
      if (!running) draw();
    });

    $('#infraZoomOutBtn')?.addEventListener('click', () => {
      targetZoom = Math.max(0.65, targetZoom - 0.16);
      adminSound.trigger('click');
      if (!running) draw();
    });

    $('#infraAutoRotateBtn')?.addEventListener('click', (e) => {
      autoRotate = !autoRotate;
      e.currentTarget.classList.toggle('is-active', autoRotate);
      adminSound.trigger('click');
      sync();
    });

    $('#infraResetViewBtn')?.addEventListener('click', () => {
      targetYaw = 0.45;
      targetPitch = 0.36;
      targetZoom = 1.0;
      adminSound.trigger('click');
      if (!running) draw();
    });

    $$('[data-infra-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        infraViewMode = btn.dataset.infraView || '3d';
        $$('[data-infra-view]').forEach((b) => b.classList.toggle('active', b === btn));
        const wrap3d = $('#infra3DCanvasWrap');
        const mat2d = $('#adminInfra2DMatrix');
        if (wrap3d) wrap3d.hidden = infraViewMode !== '3d';
        if (mat2d) mat2d.hidden = infraViewMode !== '2d';
        adminSound.trigger('click');
        if (infraViewMode === '3d') {
          resize();
          sync();
        } else {
          stop();
          renderInfraTopologyWidgets();
        }
      });
    });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          inViewport = Boolean(entries[0]?.isIntersecting);
          sync();
        },
        { threshold: 0.05 }
      );
      io.observe(section);
    }

    window.addEventListener('resize', () => {
      if (!$('#adminWorkspace')?.hidden && infraViewMode === '3d') {
        resize();
      }
    });

    document.addEventListener('visibilitychange', sync);

    resize();
    return { start, stop, sync, resize, draw };
  }

  function renderInfraTopologyWidgets() {
    const customers = appState.customers || [];
    const localCustId = appState.localLicense?.customerId || 'node-local-primary';
    const activeCount = customers.filter((c) => c.status !== 'suspended').length;

    if ($('#adminInfraNodeBadge')) {
      $('#adminInfraNodeBadge').textContent = `${customers.length} İstasyon · ${activeCount} Aktif`;
    }
    if ($('#sidebarInfraCountBadge')) {
      $('#sidebarInfraCountBadge').textContent = String(customers.length);
    }
    if ($('#sidebarCustCountBadge')) {
      $('#sidebarCustCountBadge').textContent = String(customers.length);
    }
    if ($('#sidebarAuditCountBadge')) {
      $('#sidebarAuditCountBadge').textContent = String((appState.audit || []).length);
    }

    // Bottom Quick Station Pill Bar
    const bar = $('#adminInfraStationBar');
    if (bar) {
      bar.innerHTML = customers
        .map((c) => {
          const isLocal = Boolean(c.isLocalNode || c.id === localCustId);
          const isSusp = c.status === 'suspended';
          const dotColor = isSusp ? 'var(--bad)' : isLocal ? 'var(--signal)' : 'var(--ok)';
          return `
            <button type="button" class="infra-station-pill ${c.id === inspectedCustomerId ? 'is-selected' : ''}" data-inspect-cust="${esc(c.id)}">
              <span class="status-dot" style="color:${dotColor}"></span>
              <span>${esc(c.organization)}</span>
              <span class="tier-badge tier-${esc((c.plan || 'ULTRA').toLowerCase())}">${esc(c.plan)}</span>
            </button>
          `;
        })
        .join('');
    }

    // 2D Topology Matrix View
    const matrix = $('#adminInfra2DMatrix');
    if (matrix) {
      matrix.innerHTML = customers
        .map((c) => {
          const isLocal = Boolean(c.isLocalNode || c.id === localCustId);
          const isSusp = c.status === 'suspended';
          return `
            <article class="infra-matrix-card" data-inspect-cust="${esc(c.id)}">
              <div class="customer-card-top">
                <strong>${esc(c.organization)}</strong>
                <span class="tier-badge tier-${esc((c.plan || 'ULTRA').toLowerCase())}">${esc(c.plan)}</span>
              </div>
              <div class="sub-cell">@${esc(c.username)} · ${isLocal ? 'Yerel İstasyon (8765)' : isSusp ? 'Askıda' : 'Çevrimiçi'}</div>
              <div class="sub-cell">${c.camerasUsed || 0}/${c.maxCameras} Kamera · ${c.rulesUsed || 0}/${c.maxRules} Kural · ${c.telegramPhonesUsed || 0}/${c.maxTelegramPhones} TG</div>
            </article>
          `;
        })
        .join('');
    }

    if (infra3DCtrl) infra3DCtrl.draw();
  }

  /* ==========================================================================
     Right-Side Slide-Over Customer & Station Inspector Drawer (#adminInspectorDrawer)
     ========================================================================== */
  function openInspectorDrawer(custId) {
    const cust = (appState.customers || []).find((c) => c.id === custId);
    if (!cust) return;
    inspectedCustomerId = cust.id;
    const drawer = $('#adminInspectorDrawer');
    if (!drawer) return;
    drawer.hidden = false;
    adminSound.trigger('pop');
    renderInspectorDrawer();
    renderInfraTopologyWidgets();
  }

  function closeInspectorDrawer() {
    const drawer = $('#adminInspectorDrawer');
    if (drawer) drawer.hidden = true;
    inspectedCustomerId = null;
    renderInfraTopologyWidgets();
  }

  function renderInspectorDrawer() {
    const drawer = $('#adminInspectorDrawer');
    if (!drawer || drawer.hidden || !inspectedCustomerId) return;
    const cust = (appState.customers || []).find((c) => c.id === inspectedCustomerId);
    if (!cust) {
      closeInspectorDrawer();
      return;
    }

    const localCustId = appState.localLicense?.customerId || 'node-local-primary';
    const isLocal = Boolean(cust.isLocalNode || cust.id === localCustId);
    const isSuspended = cust.status === 'suspended';
    const plan = cust.plan || 'ULTRA';
    const daysLeft = cust.daysRemaining != null
      ? cust.daysRemaining
      : Math.max(0, Math.round(((cust.expiresAt || 0) - Date.now() / 1000) / 86400));
    const expPct = Math.max(5, Math.min(100, Math.round((daysLeft / 365) * 100)));

    const camUsed = cust.camerasUsed || 0;
    const ruleUsed = cust.rulesUsed || 0;
    const tgUsed = cust.telegramPhonesUsed || 0;
    const camPct = calcQuotaPct(camUsed, cust.maxCameras);
    const rulePct = calcQuotaPct(ruleUsed, cust.maxRules);
    const tgPct = calcQuotaPct(tgUsed, cust.maxTelegramPhones);

    const planBadge = $('#inspectorPlanBadge');
    if (planBadge) {
      planBadge.textContent = `CORTEX ${plan}`;
      planBadge.className = `tier-badge tier-${plan.toLowerCase()}`;
    }

    const statusBadge = $('#inspectorStatusBadge');
    if (statusBadge) {
      statusBadge.textContent = isSuspended ? 'Askıda' : 'Aktif';
      statusBadge.className = `status-pill ${isSuspended ? 'status-pill-bad' : 'status-pill-ok'}`;
    }

    const localBadge = $('#inspectorLocalBadge');
    if (localBadge) localBadge.hidden = !isLocal;

    if ($('#inspectorOrgName')) $('#inspectorOrgName').textContent = cust.organization || 'Kurumsal Müşteri';
    if ($('#inspectorUsername')) $('#inspectorUsername').textContent = `@${cust.username || 'musteri'}`;
    if ($('#inspectorLastSeen')) $('#inspectorLastSeen').textContent = formatTimestamp(cust.lastSeen || cust.lastHeartbeat);
    if ($('#inspectorVersion')) $('#inspectorVersion').textContent = `v${cust.version || '2.4.0'}`;
    if ($('#inspectorContact')) $('#inspectorContact').textContent = cust.contact || 'Belirtilmedi';
    if ($('#inspectorPasswordHint')) $('#inspectorPasswordHint').textContent = cust.passwordHint || 'Cortex2026!';
    if ($('#inspectorHealthNote')) $('#inspectorHealthNote').textContent = cust.healthNote || cust.health || 'Lisans ve kullanıcı hesabı aktif';

    if ($('#inspectorCamQuotaText')) $('#inspectorCamQuotaText').textContent = `${camUsed} / ${cust.maxCameras} (%${camPct})`;
    if ($('#inspectorCamQuotaBar')) $('#inspectorCamQuotaBar').style.width = `${camPct}%`;

    if ($('#inspectorRuleQuotaText')) $('#inspectorRuleQuotaText').textContent = `${ruleUsed} / ${cust.maxRules} (%${rulePct})`;
    if ($('#inspectorRuleQuotaBar')) $('#inspectorRuleQuotaBar').style.width = `${rulePct}%`;

    if ($('#inspectorTgQuotaText')) $('#inspectorTgQuotaText').textContent = `${tgUsed} / ${cust.maxTelegramPhones} (%${tgPct})`;
    if ($('#inspectorTgQuotaBar')) $('#inspectorTgQuotaBar').style.width = `${tgPct}%`;

    if ($('#inspectorExpiryText')) $('#inspectorExpiryText').textContent = `${daysLeft} Gün Kaldı (%${expPct})`;
    const expBar = $('#inspectorExpiryBar');
    if (expBar) {
      expBar.style.width = `${expPct}%`;
      expBar.classList.toggle('is-warn', daysLeft < 30);
    }

    if ($('#inspectorLicenseKey')) $('#inspectorLicenseKey').textContent = cust.key || '—';

    $$('[data-inspector-upgrade]').forEach((btn) => {
      btn.classList.toggle('active-plan-btn', btn.dataset.inspectorUpgrade === plan);
    });

    const assignBtn = $('#inspectorAssignLocalBtn');
    if (assignBtn) {
      assignBtn.disabled = isLocal;
      const span = assignBtn.querySelector('span');
      if (span) span.textContent = isLocal ? 'Yerel İstasyonda Aktif' : 'Yerel İstasyona (8765) Ata';
    }

    const suspLabel = $('#inspectorSuspendBtnLabel');
    if (suspLabel) {
      suspLabel.textContent = isSuspended ? 'Hesabı Aktifleştir' : 'Hesabı Askıya Al';
    }
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
    closeInspectorDrawer();
    if (signalFieldCtrl) signalFieldCtrl.sync();
    if (infra3DCtrl) infra3DCtrl.sync();
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
    if (infra3DCtrl) {
      setTimeout(() => {
        infra3DCtrl.resize();
        infra3DCtrl.sync();
      }, 40);
    }
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
    const suspendedCount = customers.length - activeCount;
    if ($('#metricTotalCustomers')) $('#metricTotalCustomers').textContent = String(customers.length);
    if ($('#metricActiveLicenses')) $('#metricActiveLicenses').textContent = String(activeCount);
    if ($('#metricCustomerSub')) {
      $('#metricCustomerSub').textContent = `${activeCount} Aktif · ${suspendedCount} Askıda · İzole Kasa`;
    }

    const proCnt = customers.filter((c) => c.plan === 'PRO').length;
    const plusCnt = customers.filter((c) => c.plan === 'PLUS').length;
    const ultraCnt = customers.filter((c) => c.plan === 'ULTRA').length;
    const totalTiers = Math.max(1, customers.length);
    if ($('#metricTierDistText')) {
      $('#metricTierDistText').textContent = `${ultraCnt} ULTRA · ${plusCnt} PLUS · ${proCnt} PRO`;
    }
    const distBar = $('#metricTierDistBar');
    if (distBar) {
      const uPct = Math.max(8, Math.round((ultraCnt / totalTiers) * 100));
      const plPct = Math.max(6, Math.round((plusCnt / totalTiers) * 100));
      const prPct = Math.max(6, Math.round((proCnt / totalTiers) * 100));
      distBar.innerHTML = `
        <div class="metric-tier-seg is-ultra" style="width:${uPct}%" title="ULTRA: ${ultraCnt}"></div>
        <div class="metric-tier-seg is-plus" style="width:${plPct}%" title="PLUS: ${plusCnt}"></div>
        <div class="metric-tier-seg is-pro" style="width:${prPct}%" title="PRO: ${proCnt}"></div>
      `;
    }

    const lic = appState.localLicense || {};
    const localOrg = lic.organization || 'Merkez Saha İstasyonu';
    const localUser = lic.username || 'merkez';
    const localPlan = lic.plan || 'ULTRA';
    if ($('#metricLocalOrg')) $('#metricLocalOrg').textContent = `${localOrg}`;
    if ($('#metricLocalPlanTag')) $('#metricLocalPlanTag').textContent = `CORTEX ${localPlan}`;

    const maxCams = lic.maxCameras || 32;
    const maxRules = lic.maxRules || 128;
    const maxTg = lic.maxTelegramPhones || 10;
    if ($('#metricLocalUserPlan')) {
      $('#metricLocalUserPlan').hidden = false;
      $('#metricLocalUserPlan').textContent = `@${localUser} · ${maxCams} Kamera / ${maxRules} Kural Kotası`;
    }
    if ($('#metricLocalQuotas')) $('#metricLocalQuotas').textContent = `${maxCams} Kam / ${maxRules} Kural / ${maxTg} TG`;
    if ($('#metricLocalUsage')) $('#metricLocalUsage').textContent = `${appState.camerasCount || 0} Kamera · ${appState.rulesCount || 0} Kural`;

    const tg = appState.telegram || {};
    const boundCount = tg.boundPhonesCount || (tg.phone ? 1 : 0);
    if ($('#metricTelegramQuota')) $('#metricTelegramQuota').textContent = `${boundCount} / ${maxTg} TG Numara`;
    if ($('#metricTelegramPhone')) $('#metricTelegramPhone').textContent = tg.phoneDisplay || '—';

    if ($('#metricEngineStatus')) $('#metricEngineStatus').textContent = `${appState.adminPort || 8766}`;
    if ($('#metricDiskFree')) {
      $('#metricDiskFree').textContent = `@${tg.botUsername || 'intelligentcortexbot'} · ${appState.diskFreeGB || 0} GB Boş Disk`;
    }

    const clientLink = $('#openClientCortexLink');
    if (clientLink && appState.cortexClientUrl) {
      clientLink.href = appState.cortexClientUrl;
    }

    const selectedPlan = $('#custPlan')?.value || 'ULTRA';
    $$('.tier-card').forEach((card) => {
      const isSel = card.dataset.selectPlan === selectedPlan;
      card.classList.toggle('tier-card-selected', isSel);
      card.classList.toggle('is-selected-tier', isSel);
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
      if (quickFilterMode === 'ACTIVE' && c.status === 'suspended') return false;
      if (quickFilterMode === 'SUSPENDED' && c.status !== 'suspended') return false;
      if (quickFilterMode === 'LOCAL' && !(c.isLocalNode || c.id === localCustId)) return false;
      if (['PRO', 'PLUS', 'ULTRA'].includes(quickFilterMode) && c.plan !== quickFilterMode) return false;
      if (!query) return true;
      const hay = `${c.organization} ${c.username} ${c.contact} ${c.key} ${c.plan}`.toLowerCase();
      return hay.includes(query);
    });

    const fp = JSON.stringify({
      q: query,
      pf: planFilter,
      qf: quickFilterMode,
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
      container.innerHTML = `<div class="empty-state">Arama veya filtre kriterine uygun müşteri hesabı bulunamadı.</div>`;
      return;
    }

    container.innerHTML = filtered
      .map((c) => {
        const isSuspended = c.status === 'suspended';
        const isLocal = Boolean(c.isLocalNode || c.id === localCustId);
        const planClass = c.plan === 'PRO' ? 'tier-pro' : c.plan === 'PLUS' ? 'tier-plus' : 'tier-ultra';
        const daysLeft = c.daysRemaining != null ? c.daysRemaining : Math.max(0, Math.round(((c.expiresAt || 0) - Date.now() / 1000) / 86400));
        const expPct = Math.max(5, Math.min(100, Math.round((daysLeft / 365) * 100)));
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
              ${isLocal ? '<span class="status-pill status-pill-ok">Aktif İstasyon (8765)</span>' : ''}
              ${isSuspended ? '<span class="status-pill status-pill-bad">Askıda</span>' : ''}
            </div>
            <div class="customer-meta-pills">
              ${c.contact && c.contact !== 'Belirtilmedi' ? `<span class="days-pill">${esc(c.contact)}</span>` : ''}
              <span class="days-pill">${daysLeft} gün</span>
            </div>
          </div>

          <div class="customer-credentials-strip">
            <button type="button" class="cred-chip" data-copy="${esc(c.username)}" data-label="Kullanıcı adı kopyalandı" title="Kullanıcı adını kopyala">
              <span class="cred-chip-text">@${esc(c.username)}</span>
            </button>
            <button type="button" class="cred-chip" data-copy="${esc(pwText)}" data-label="Parolayı kopyala" title="Parolayı kopyala">
              <span class="cred-chip-text">${esc(pwText)}</span>
            </button>
            <button type="button" class="cred-chip" data-copy="${esc(c.key)}" data-label="Lisans anahtarı kopyalandı" title="Tam lisans anahtarını kopyala">
              <span class="cred-chip-text">${esc(truncateKey(c.key))}</span>
            </button>
          </div>

          <div class="cust-expiry-strip">
            <div class="cust-expiry-head">
              <span>Lisans Geçerlilik Süresi</span>
              <strong>${daysLeft} Gün Kaldı (%${expPct})</strong>
            </div>
            <div class="cust-expiry-track">
              <div class="cust-expiry-fill ${daysLeft < 30 ? 'is-warn' : ''}" style="width:${expPct}%"></div>
            </div>
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
            <button type="button" class="btn-primary btn-xs" data-inspect-cust="${esc(c.id)}" title="İstasyon Denetçisini ve Uzaktan Müdahale Çekmecesini Aç">${SVG_ICONS.inspect}<span>İncele &amp; Müdahale</span></button>
            <button type="button" class="btn-secondary btn-xs" data-edit-cust="${esc(c.id)}">Düzenle</button>
            <button type="button" class="btn-secondary btn-xs" data-copy-delivery="${esc(c.id)}" title="Müşteri giriş bilgilerini ve lisans anahtarını tek metin olarak kopyala">${SVG_ICONS.clipboard}<span>Teslim Paketi</span></button>
            ${!isLocal ? `<button type="button" class="btn-secondary btn-xs" data-action="assign_to_local" data-cust="${esc(c.id)}" title="Bu müşteriyi yerel Cortex.exe (Port 8765) oturumuna ata">${SVG_ICONS.station}<span>İstasyona Ata</span></button>` : ''}
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

  function classifyAuditEntry(a) {
    const text = `${a.action || ''} ${a.detail || ''} ${a.actor || ''}`.toLowerCase();
    if (text.includes('tanılama') || text.includes('diag') || text.includes('disk') || text.includes('kasa')) {
      return 'DIAG';
    }
    if (text.includes('oturum') || text.includes('giriş') || text.includes('reddedildi') || text.includes('güvenlik')) {
      return 'SECURITY';
    }
    if (text.includes('müdahale') || text.includes('sıfırlandı') || text.includes('atandı') || text.includes('uzatıldı') || text.includes('askıya')) {
      return 'ACTION';
    }
    return 'LICENSE';
  }

  function renderAudit() {
    const wrap = $('#auditLogList') || $('#auditLogContainer');
    if (!wrap) return;
    const q = ($('#auditFilterInput')?.value || '').trim().toLowerCase();
    const rawList = appState.audit || [];

    const filtered = rawList
      .filter((a) => {
        if (auditFilterMode !== 'ALL' && classifyAuditEntry(a) !== auditFilterMode) {
          return false;
        }
        if (!q) return true;
        const hay = `${a.action || ''} ${a.detail || ''} ${a.hash || ''} ${a.actor || ''}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 25);

    const fp = JSON.stringify({
      m: auditFilterMode,
      q,
      items: filtered.map((a) => [a.time, a.action, a.detail, a.hash]),
    });
    if (wrap.dataset.fingerprint === fp) return;
    wrap.dataset.fingerprint = fp;

    if (!filtered.length) {
      wrap.innerHTML = `<div class="empty-state">Seçili filtreye uygun denetim kaydı bulunmuyor.</div>`;
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
          ${filtered
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
    renderInfraTopologyWidgets();
    renderCustomers();
    renderLicenses();
    renderAudit();
    renderInspectorDrawer();
  }

  function applyPlanDefaultQuotas(plan) {
    const spec = appState.plans?.[plan] || PLAN_DEFAULTS[plan] || PLAN_DEFAULTS.ULTRA;
    $('#custPlan').value = plan;
    $('#custMaxCameras').value = spec.maxCameras;
    $('#custMaxRules').value = spec.maxRules;
    $('#custMaxTelegramPhones').value = spec.maxTelegramPhones;
    $$('.tier-card').forEach((card) => {
      const isSel = card.dataset.selectPlan === plan;
      card.classList.toggle('tier-card-selected', isSel);
      card.classList.toggle('is-selected-tier', isSel);
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
    const saveSpan = $('#saveCustomerBtn')?.querySelector('span');
    if (saveSpan) saveSpan.textContent = `Değişiklikleri Kaydet (@${cust.username})`;
    else if ($('#saveCustomerBtn')) $('#saveCustomerBtn').textContent = `Değişiklikleri Kaydet (@${cust.username})`;

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
    const saveSpan = $('#saveCustomerBtn')?.querySelector('span');
    if (saveSpan) saveSpan.textContent = 'Müşteri Hesabını ve Lisansı Kaydet';
    else if ($('#saveCustomerBtn')) $('#saveCustomerBtn').textContent = 'Müşteri Hesabını ve Lisansı Kaydet';
  }

  /* ==========================================================================
     Admin Command Palette (Ctrl+K) — Crisp Inline SVGs (Zero Emojis)
     ========================================================================== */
  function buildAdminCmdkItems() {
    const items = [
      {
        group: 'Hızlı Yönetim Komutları',
        iconSvg: SVG_ICONS.plus,
        title: 'Yeni Müşteri & Lisans Tanımlama Formunu Sıfırla',
        sub: 'Formu temizle ve güçlü parola üret',
        kbd: 'Form',
        run: () => {
          resetStudioForm();
          $('#custOrganization')?.focus();
        },
      },
      {
        group: 'Hızlı Yönetim Komutları',
        iconSvg: SVG_ICONS.layers,
        title: '3D Kurumsal Altyapı & İstasyon Topolojisine Git',
        sub: 'Uzamsal 3B istasyon ve kota uyduları sahnesini odakla',
        kbd: '3B Sahne',
        run: () => $('#admin3DInfraSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      },
      {
        group: 'Hızlı Yönetim Komutları',
        iconSvg: SVG_ICONS.bolt,
        title: 'Sistem ve Kasa Tanılamasını Çalıştır (Diagnostics)',
        sub: 'AES-256-GCM kasa, SQLite FTS5 ve disk bütünlüğünü doğrula',
        kbd: 'Diag',
        run: () => $('#runDiagBtn')?.click(),
      },
      {
        group: 'Hızlı Yönetim Komutları',
        iconSvg: SVG_ICONS.shield,
        title: 'Cortex ULTRA (32 Kamera / 128 Kural / 10 TG) Şablonunu Seç',
        sub: 'Kurumsal tam kapasite kotalarını forma aktar',
        kbd: 'ULTRA',
        run: () => applyPlanDefaultQuotas('ULTRA'),
      },
      {
        group: 'Hızlı Yönetim Komutları',
        iconSvg: SVG_ICONS.shield,
        title: 'Cortex PLUS (12 Kamera / 32 Kural / 5 TG) Şablonunu Seç',
        sub: 'Orta ölçekli tesis ve fabrika kotalarını forma aktar',
        kbd: 'PLUS',
        run: () => applyPlanDefaultQuotas('PLUS'),
      },
      {
        group: 'Hızlı Yönetim Komutları',
        iconSvg: SVG_ICONS.shield,
        title: 'Cortex PRO (4 Kamera / 8 Kural / 2 TG) Şablonunu Seç',
        sub: 'Başlangıç paketi kotalarını forma aktar',
        kbd: 'PRO',
        run: () => applyPlanDefaultQuotas('PRO'),
      },
      {
        group: 'Hızlı Yönetim Komutları',
        iconSvg: SVG_ICONS.bot,
        title: 'Telegram Bot İletişim Motorunu Sıfırla',
        sub: '@intelligentcortexbot long-polling döngüsünü yenile',
        kbd: 'Bot',
        run: () => $('#restartTelegramGlobalBtn')?.click(),
      },
      {
        group: 'Hızlı Yönetim Komutları',
        iconSvg: SVG_ICONS.sun,
        title: 'Temayı Değiştir (Koyu ↔ Açık)',
        sub: 'Yönetim merkezi görünümünü değiştir',
        kbd: 'Tema',
        run: () => $('#themeToggleBtn')?.click(),
      },
    ];

    for (const c of appState.customers || []) {
      items.push({
        group: 'Kayıtlı Müşteri İstasyonları (İncele & Müdahale)',
        iconSvg: c.status === 'suspended' ? SVG_ICONS.pause : SVG_ICONS.user,
        title: `${c.organization} (@${c.username})`,
        sub: `${c.plan} · ${c.maxCameras} Kam / ${c.maxRules} Kural / ${c.maxTelegramPhones} TG · ${c.key}`,
        kbd: 'İncele',
        run: () => openInspectorDrawer(c.id),
      });
    }
    return items;
  }

  function renderAdminCmdk() {
    const listEl = $('#adminCmdkList');
    if (!listEl) return;
    const q = ($('#adminCmdkInput')?.value || '').trim().toLowerCase();
    const all = buildAdminCmdkItems();
    adminCmdkItems = q
      ? all.filter((it) => `${it.title} ${it.sub} ${it.group}`.toLowerCase().includes(q))
      : all;
    if (adminCmdkIdx >= adminCmdkItems.length) adminCmdkIdx = 0;

    if (!adminCmdkItems.length) {
      listEl.innerHTML = `<div class="empty-state">Eşleşen komut veya müşteri bulunamadı.</div>`;
      return;
    }

    let html = '';
    let lastGroup = '';
    adminCmdkItems.forEach((it, idx) => {
      if (it.group !== lastGroup) {
        lastGroup = it.group;
        html += `<div class="admin-cmdk-group">${esc(lastGroup)}</div>`;
      }
      html += `
        <div class="admin-cmdk-item ${idx === adminCmdkIdx ? 'is-selected' : ''}" role="option" data-admin-cmd-idx="${idx}">
          <div class="admin-cmdk-item-left">
            <span class="admin-cmdk-icon">${it.iconSvg}</span>
            <div>
              <span class="admin-cmdk-title">${esc(it.title)}</span>
              <span class="admin-cmdk-sub">${esc(it.sub)}</span>
            </div>
          </div>
          <kbd class="admin-kbd-pill">${esc(it.kbd)}</kbd>
        </div>
      `;
    });
    listEl.innerHTML = html;
  }

  function openAdminCmdk() {
    const modal = $('#adminCmdPaletteModal');
    if (!modal) return;
    adminCmdkOpen = true;
    adminCmdkIdx = 0;
    modal.hidden = false;
    adminSound.trigger('pop');
    const inp = $('#adminCmdkInput');
    if (inp) {
      inp.value = '';
      setTimeout(() => inp.focus(), 20);
    }
    renderAdminCmdk();
  }

  function closeAdminCmdk() {
    adminCmdkOpen = false;
    const modal = $('#adminCmdPaletteModal');
    if (modal) modal.hidden = true;
  }

  function getLoginInputs() {
    const u = $('#adminUsername') || $('#loginUsername');
    const p = $('#adminPassword') || $('#loginPassword');
    return { u, p };
  }

  async function runInspectorRemoteAction(btn, action, extra = {}) {
    if (!inspectedCustomerId) return;
    await withButtonGuard(btn, async () => {
      try {
        const res = await api('/api/admin/action', {
          action,
          customerId: inspectedCustomerId,
          ...extra,
        });
        applyStatePayload(res);
        showToast(res.message || 'İstasyon komutu başarıyla uygulandı.');
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  function bindEvents() {
    // Sound toggle
    $('#adminSoundToggleBtn')?.addEventListener('click', () => {
      const isMuted = adminSound.toggleMute();
      showToast(isMuted ? 'Dokunsal arayüz sesleri kapatıldı.' : 'Dokunsal arayüz sesleri açıldı.');
    });

    // Admin Command Palette (Ctrl+K)
    $('#adminCmdkBtn')?.addEventListener('click', openAdminCmdk);
    $('#adminCmdPaletteModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'adminCmdPaletteModal' || e.target.dataset.closeAdminCmdk) {
        closeAdminCmdk();
        return;
      }
      const itemEl = e.target.closest('[data-admin-cmd-idx]');
      if (itemEl) {
        const it = adminCmdkItems[Number(itemEl.dataset.adminCmdIdx)];
        closeAdminCmdk();
        if (it) it.run();
      }
    });
    $('#adminCmdkInput')?.addEventListener('input', () => {
      adminCmdkIdx = 0;
      renderAdminCmdk();
    });

    // Inspector Drawer Events
    $('#adminInspectorDrawer')?.addEventListener('click', (e) => {
      if (e.target.dataset.closeInspector || e.target.closest('[data-close-inspector]')) {
        closeInspectorDrawer();
      }
    });

    $('#inspectorCopyKeyBtn')?.addEventListener('click', () => {
      const cust = (appState.customers || []).find((c) => c.id === inspectedCustomerId);
      if (cust?.key) copyText(cust.key, 'Lisans anahtarı panoya kopyalandı');
    });

    $('#inspectorCopyPackBtn')?.addEventListener('click', () => {
      const cust = (appState.customers || []).find((c) => c.id === inspectedCustomerId);
      if (cust) copyText(buildCustomerDeliveryPack(cust), `${cust.organization} teslim paketi kopyalandı`);
    });

    $$('[data-inspector-upgrade]').forEach((btn) => {
      btn.addEventListener('click', () => {
        runInspectorRemoteAction(btn, 'upgrade_plan', { plan: btn.dataset.inspectorUpgrade });
      });
    });

    $('#inspectorAssignLocalBtn')?.addEventListener('click', (e) => {
      runInspectorRemoteAction(e.currentTarget, 'assign_to_local');
    });

    $('#inspectorRunDiagBtn')?.addEventListener('click', (e) => {
      runInspectorRemoteAction(e.currentTarget, 'run_diagnostics');
    });

    $('#inspectorRestartTgBtn')?.addEventListener('click', (e) => {
      runInspectorRemoteAction(e.currentTarget, 'restart_telegram');
    });

    $('#inspectorExtendBtn')?.addEventListener('click', (e) => {
      runInspectorRemoteAction(e.currentTarget, 'extend_license', { days: 30 });
    });

    $('#inspectorSuspendBtn')?.addEventListener('click', (e) => {
      runInspectorRemoteAction(e.currentTarget, 'toggle_suspend');
    });

    $('#inspectorEditFormBtn')?.addEventListener('click', () => {
      const targetId = inspectedCustomerId;
      closeInspectorDrawer();
      if (targetId) loadCustomerIntoForm(targetId);
    });

    // Global Keyboard Shortcuts (Ctrl+K, Ctrl+B, ESC)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (adminCmdkOpen) closeAdminCmdk();
        else openAdminCmdk();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        if (!$('#adminWorkspace')?.hidden) {
          e.preventDefault();
          $('#adminSidebarToggleBtn')?.click();
          return;
        }
      }
      if (e.key === 'Escape') {
        if (adminCmdkOpen) {
          e.preventDefault();
          closeAdminCmdk();
          return;
        }
        if (inspectedCustomerId) {
          e.preventDefault();
          closeInspectorDrawer();
          return;
        }
      }
      if (adminCmdkOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (adminCmdkItems.length) {
            adminCmdkIdx = (adminCmdkIdx + 1) % adminCmdkItems.length;
            adminSound.trigger('click');
            renderAdminCmdk();
          }
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (adminCmdkItems.length) {
            adminCmdkIdx = (adminCmdkIdx - 1 + adminCmdkItems.length) % adminCmdkItems.length;
            adminSound.trigger('click');
            renderAdminCmdk();
          }
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const it = adminCmdkItems[adminCmdkIdx];
          closeAdminCmdk();
          if (it) it.run();
        }
      }
    });

    // Quick status filter pills (Customer Registry)
    $$('[data-quick-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        quickFilterMode = btn.dataset.quickFilter || 'ALL';
        $$('[data-quick-filter]').forEach((b) => b.classList.toggle('active', b === btn));
        adminSound.trigger('click');
        renderCustomers();
      });
    });

    // Audit Trail Filter Pills & Search Input
    $$('[data-audit-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        auditFilterMode = btn.dataset.auditFilter || 'ALL';
        $$('[data-audit-filter]').forEach((b) => b.classList.toggle('active', b === btn));
        adminSound.trigger('click');
        renderAudit();
      });
    });

    $('#auditFilterInput')?.addEventListener('input', () => {
      renderAudit();
    });

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
          adminSound.trigger('error');
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
      adminSound.trigger('pop');
    });

    // Plan dropdown change -> auto-fill default limits
    $('#custPlan')?.addEventListener('change', (e) => {
      applyPlanDefaultQuotas(e.target.value);
      adminSound.trigger('click');
    });

    // Clicking top tier showcase cards selects that tier
    $$('.tier-card[data-select-plan]').forEach((card) => {
      card.addEventListener('click', () => {
        const plan = card.dataset.selectPlan;
        applyPlanDefaultQuotas(plan);
        showToast(`${plan} paketi varsayılan kotaları forma aktarıldı.`);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const plan = card.dataset.selectPlan;
          applyPlanDefaultQuotas(plan);
          showToast(`${plan} paketi varsayılan kotaları forma aktarıldı.`);
        }
      });
    });

    // Reset studio form
    $('#resetFormBtn')?.addEventListener('click', () => {
      resetStudioForm();
      adminSound.trigger('click');
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
      copyText(buildCustomerDeliveryPack(lastSavedCustomer), 'Müşteri teslim özeti panoya kopyalandı');
    });

    // Search and filter inputs
    $('#customerSearchInput')?.addEventListener('input', () => renderCustomerList());
    $('#customerPlanFilter')?.addEventListener('change', () => renderCustomerList());

    // Delegated actions on customer cards, 3D station pills & tables
    document.body.addEventListener('click', async (e) => {
      const inspectBtn = e.target.closest('[data-inspect-cust]');
      if (inspectBtn) {
        openInspectorDrawer(inspectBtn.dataset.inspectCust);
        return;
      }

      const copyBtn = e.target.closest('[data-copy]');
      if (copyBtn) {
        copyText(copyBtn.dataset.copy, copyBtn.dataset.label || 'Kopyalandı');
        return;
      }

      const delivBtn = e.target.closest('[data-copy-delivery]');
      if (delivBtn) {
        const cid = delivBtn.dataset.copyDelivery;
        const cust = (appState.customers || []).find((c) => c.id === cid);
        if (cust) {
          copyText(buildCustomerDeliveryPack(cust), `${cust.organization} teslim paketi kopyalandı`);
        }
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
    initSidebar();
    adminSound.syncBtn();
    initAdminBentoSpotlight();
    signalFieldCtrl = initSignalField();
    infra3DCtrl = initAdminInfra3D();
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
