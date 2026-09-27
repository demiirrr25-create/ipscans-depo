"""Onboarding text for ipscans Network Health Pro's welcome wizard.

Full content in tr/en; other languages in the shared language picker
(available_languages(), reused from the free app — it's just display
names, not scanner-specific) fall back to English, same convention the
free app itself uses for missing translations.
"""
from __future__ import annotations

DEFAULT_LANGUAGE = "en"

STRINGS: dict[str, dict[str, str]] = {
    "en": {
        "lang_title": "Welcome to ipscans Network Health Pro",
        "lang_subtitle": "Choose your language to continue",
        "lang_continue": "Continue",
        "terms_heading": "Step 1 of 3 — Terms of Use",
        "terms_checkbox": "I have read and agree to the Terms of Use above.",
        "terms_accept": "I Agree",
        "terms_decline": "Decline and Exit",
        "privacy_heading": "Step 2 of 3 — Privacy Policy",
        "privacy_checkbox": "I have read and agree to the Privacy Policy above.",
        "privacy_accept": "I Agree",
        "privacy_decline": "Decline and Exit",
        "welcome_heading": "Step 3 of 3 — You're all set",
        "welcome_body": (
            "<h3>What's in Network Health Pro</h3>"
            "<ul>"
            "<li><b>Scanner</b> — the exact IP Scanner you already know, unchanged.</li>"
            "<li><b>Dashboard</b> — a live Network Health Score with a plain-language breakdown.</li>"
            "<li><b>Monitoring</b> — continuous scans with configurable intervals, catching "
            "problems before your users report them.</li>"
            "<li><b>Event Log &amp; Inventory</b> — IP conflict detection, MAC/IP change history, "
            "and per-device notes.</li>"
            "<li><b>License</b> — start a 30-day PRO trial with just an email, right from this app.</li>"
            "</ul>"
        ),
        "welcome_button": "Get Started",
        "back": "Back",
    },
    "tr": {
        "lang_title": "ipscans Network Health Pro'ya Hoş Geldiniz",
        "lang_subtitle": "Devam etmek için dilinizi seçin",
        "lang_continue": "Devam Et",
        "terms_heading": "Adım 1/3 — Kullanım Şartları",
        "terms_checkbox": "Yukarıdaki Kullanım Şartları'nı okudum ve kabul ediyorum.",
        "terms_accept": "Kabul Ediyorum",
        "terms_decline": "Reddet ve Çık",
        "privacy_heading": "Adım 2/3 — Gizlilik Politikası",
        "privacy_checkbox": "Yukarıdaki Gizlilik Politikası'nı okudum ve kabul ediyorum.",
        "privacy_accept": "Kabul Ediyorum",
        "privacy_decline": "Reddet ve Çık",
        "welcome_heading": "Adım 3/3 — Hazırsınız",
        "welcome_body": (
            "<h3>Network Health Pro'da neler var</h3>"
            "<ul>"
            "<li><b>Scanner</b> — zaten bildiğiniz IP Scanner, değişmedi.</li>"
            "<li><b>Dashboard</b> — sade bir dille açıklanan, canlı Network Health Score.</li>"
            "<li><b>Monitoring</b> — yapılandırılabilir aralıklarla sürekli tarama; sorunlar "
            "kullanıcılarınız fark etmeden tespit edilir.</li>"
            "<li><b>Event Log &amp; Inventory</b> — IP çakışma tespiti, MAC/IP değişiklik geçmişi "
            "ve cihaz başına notlar.</li>"
            "<li><b>License</b> — sadece e-posta ile 30 günlük PRO denemesi başlatın.</li>"
            "</ul>"
        ),
        "welcome_button": "Başla",
        "back": "Geri",
    },
}


def t(lang: str, key: str) -> str:
    table = STRINGS.get(lang) or STRINGS[DEFAULT_LANGUAGE]
    return table.get(key) or STRINGS[DEFAULT_LANGUAGE].get(key, key)


TERMS_BODY: dict[str, str] = {
    "en": """
<h3>Terms of Use — ipscans Network Health Pro</h3>
<p><b>What this app does:</b> Network Health Pro scans the local network you
point it at (ICMP ping, ARP, and the same optional SNMP/WMI/UPnP queries as
the free IP Scanner), and adds continuous monitoring, IP conflict detection,
a Network Health Score, and a device inventory with history.</p>
<p><b>Your responsibility:</b> Only scan networks and devices you own,
administer, or have explicit permission to test. Unauthorized scanning may
violate local laws.</p>
<p><b>License &amp; account:</b> Some features (continuous monitoring, and
multi-site sync on eligible plans) require an active license. Activating a
license sends your email address to ipscans.com, which issues and validates
a license key over HTTPS. No password is required or stored.</p>
<p><b>Data sent to ipscans.com:</b> (1) license validation requests
(email + license key), and (2) if you configure a Site Name and hold an
eligible plan, a compact per-scan summary (device/online/offline/conflict
counts and your Health Score — never raw device lists, IPs, or MACs) for
the "My Sites" feature. All other scan data stays on this computer in a
local database.</p>
<p><b>No warranty:</b> The app is provided "as is". Result accuracy depends
on network conditions and third-party data sources.</p>
""",
    "tr": """
<h3>Kullanım Şartları — ipscans Network Health Pro</h3>
<p><b>Bu uygulama ne yapar:</b> Network Health Pro, yönlendirdiğiniz yerel
ağı tarar (ICMP ping, ARP ve ücretsiz IP Scanner ile aynı opsiyonel
SNMP/WMI/UPnP sorguları) ve buna sürekli izleme, IP çakışma tespiti,
Network Health Score ve geçmişli cihaz envanteri ekler.</p>
<p><b>Sorumluluğunuz:</b> Yalnızca sahibi olduğunuz, yönettiğiniz veya test
etme izniniz olan ağları/cihazları tarayın. İzinsiz tarama yerel yasalara
aykırı olabilir.</p>
<p><b>Lisans ve hesap:</b> Bazı özellikler (sürekli izleme ve uygun planlarda
çoklu lokasyon senkronizasyonu) aktif bir lisans gerektirir. Lisans
etkinleştirmek e-posta adresinizi ipscans.com'a gönderir; orada HTTPS
üzerinden bir lisans anahtarı üretilir ve doğrulanır. Şifre istenmez veya
saklanmaz.</p>
<p><b>ipscans.com'a gönderilen veriler:</b> (1) lisans doğrulama istekleri
(e-posta + lisans anahtarı), ve (2) bir Site Adı belirlediyseniz ve uygun
bir plandaysanız, "My Sites" özelliği için taramaya ait özet sayılar (cihaz/
online/offline/çakışma sayıları ve Health Score — asla ham cihaz listesi,
IP veya MAC gönderilmez). Diğer tüm tarama verileri bu bilgisayardaki yerel
veritabanında kalır.</p>
<p><b>Garanti yok:</b> Uygulama "olduğu gibi" sunulur. Sonuçların doğruluğu
ağ koşullarına ve üçüncü taraf veri kaynaklarına bağlıdır.</p>
""",
}

PRIVACY_BODY: dict[str, str] = {
    "en": """
<h3>Privacy Policy — ipscans Network Health Pro</h3>
<p>This app stores scan results, device history, and event logs in a local
SQLite database on your computer (typically under
<code>%LOCALAPPDATA%\\ipscans-pro</code>). This data is never uploaded.</p>
<p><b>License validation:</b> your email and license key are sent to
ipscans.com over HTTPS to activate/validate your license. This is stored on
the server (Vercel Blob, private access) so your license works across
reinstalls; see the full web policy at
<a href="https://ipscans.com">ipscans.com/privacy</a>.</p>
<p><b>Multi-site sync (eligible plans only):</b> if enabled, a compact
health summary is sent per site — never raw device data.</p>
<p><b>No analytics, ads, or tracking</b> are built into this desktop app.</p>
""",
    "tr": """
<h3>Gizlilik Politikası — ipscans Network Health Pro</h3>
<p>Bu uygulama tarama sonuçlarını, cihaz geçmişini ve olay günlüklerini
bilgisayarınızdaki yerel bir SQLite veritabanında saklar (genellikle
<code>%LOCALAPPDATA%\\ipscans-pro</code> altında). Bu veriler asla
yüklenmez/gönderilmez.</p>
<p><b>Lisans doğrulama:</b> lisansınızı etkinleştirmek/doğrulamak için
e-posta adresiniz ve lisans anahtarınız HTTPS üzerinden ipscans.com'a
gönderilir. Bu bilgi sunucuda (Vercel Blob, özel erişim) saklanır ki
lisansınız yeniden kurulumlarda da çalışsın; tam web politikası için
<a href="https://ipscans.com">ipscans.com/privacy</a> adresine bakın.</p>
<p><b>Çoklu lokasyon senkronizasyonu (yalnızca uygun planlarda):</b>
etkinleştirilirse, her site için özet bir sağlık verisi gönderilir — asla
ham cihaz verisi değil.</p>
<p>Bu masaüstü uygulamasında <b>analitik, reklam veya izleme yoktur</b>.</p>
""",
}


def get_terms_body(lang: str) -> str:
    return TERMS_BODY.get(lang) or TERMS_BODY[DEFAULT_LANGUAGE]


def get_privacy_body(lang: str) -> str:
    return PRIVACY_BODY.get(lang) or PRIVACY_BODY[DEFAULT_LANGUAGE]
