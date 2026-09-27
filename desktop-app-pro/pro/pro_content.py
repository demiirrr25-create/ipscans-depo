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

        "tab_scanner": "Scanner",
        "tab_dashboard": "Dashboard",
        "tab_monitoring": "Monitoring",
        "tab_event_log": "Event Log",
        "tab_inventory": "Inventory",
        "tab_license": "License",
        "tab_settings": "Settings",
        "settings_monitoring": "Monitoring",
        "settings_license": "License",
        "settings_sites": "My Sites",

        "health_title": "NETWORK HEALTH",
        "stat_devices": "Devices",
        "stat_online": "Online",
        "stat_offline": "Offline",
        "stat_conflicts": "IP Conflicts",
        "stat_high_latency": "High Latency",
        "stat_packet_loss": "Packet Loss",
        "stat_unknown": "Unknown Devices",
        "start_monitoring": "Start Monitoring",
        "stop_monitoring": "Stop",

        "scan_mode": "Scan Mode",
        "mode_quick": "Quick Scan",
        "mode_full": "Full Scan",
        "mode_health": "Health Scan",
        "mode_conflict": "Conflict Scan",
        "mode_continuous": "Continuous Monitoring",
        "site_name": "Site Name",
        "site_name_placeholder": "e.g. ABC Residence",
        "monitoring_interval": "Monitoring Interval",
        "interval_10s": "10 seconds",
        "interval_30s": "30 seconds",
        "interval_60s": "60 seconds",
        "interval_5m": "5 minutes",
        "interval_custom": "Custom...",
        "custom_interval": "Custom (sec)",
        "custom_interval_placeholder": "Custom interval in seconds",
        "run_at_startup": "Run automatically when Windows starts",
        "monitoring_running": "Monitoring running...",
        "monitoring_stopped": "Monitoring stopped.",
        "monitoring_starting": "Starting monitoring — running the first scan...",

        "filter_all": "All",
        "filter_critical": "Critical",
        "filter_warning": "Warning",
        "filter_info": "Info",
        "col_time": "Time",
        "col_severity": "Severity",
        "col_type": "Type",
        "col_ip": "IP",
        "col_mac": "MAC",
        "col_message": "Message",
        "col_confidence": "Confidence",

        "search_placeholder_inventory": "Search by IP, MAC, hostname, vendor or name...",
        "export_csv": "Export CSV",
        "col_name": "Name",
        "col_vendor": "Vendor",
        "col_model": "Model",
        "col_serial": "Serial Number",
        "col_status": "Status",
        "col_latency": "Latency",
        "col_packet_loss": "Packet Loss",
        "col_last_seen": "Last Seen",
        "status_online": "online",
        "status_offline": "offline",
        "tab_topology": "Topology",
        "tab_my_sites": "My Sites",
        "topology_gateway": "Gateway",
        "topology_empty": "No devices yet — run a scan first.",
        "col_tags": "Tags",
        "col_critical": "Critical",
        "tags_placeholder": "e.g. Camera, Block A",
        "group_filter_all": "All groups",
        "device_history_title": "Device History",
        "device_history_latency": "Latency (ms)",
        "device_history_packet_loss": "Packet Loss (%)",
        "device_history_empty": "No history yet — keep monitoring running for a while.",
        "quiet_hours": "Quiet Hours",
        "quiet_hours_enable": "Suppress popups during quiet hours (still logged)",
        "quiet_hours_from": "From",
        "quiet_hours_to": "To",
        "my_sites_refresh": "Refresh",
        "my_sites_col_name": "Site",
        "my_sites_col_devices": "Devices",
        "my_sites_col_online": "Online",
        "my_sites_col_offline": "Offline",
        "my_sites_col_conflicts": "Conflicts",
        "my_sites_col_health": "Health",
        "my_sites_col_synced": "Last Synced",
        "my_sites_requires_license": "Multi-site sync requires an Enterprise-tier license.",
        "my_sites_empty": "No sites reported yet. Set a Site Name in the Monitoring tab and start monitoring.",
        "mark_critical": "Mark as Critical",
        "unmark_critical": "Unmark Critical",
        "view_history": "View History",
        "plan": "Plan",
        "status_label": "Status",
        "expires": "Expires",
        "license_key": "License Key",
        "email_label": "Email",
        "email_placeholder": "you@company.com",
        "start_trial": "Start PRO Trial",
        "check_updates": "Check for Updates",
        "license_note": (
            "Enter your email and start a 30-day PRO trial (no payment yet \u2014 "
            "Stripe billing is coming in a later update). Your license is "
            "validated against ipscans.com and cached locally so the app "
            "keeps working offline."
        ),
        "up_to_date": "You're on the latest version.",
        "update_available": "Update available: v{version} \u2014 {notes}\nDownload: {url}",

        "conflict_title": "IP Conflict Detected",
        "conflict_text": "Possible IP conflict on {ip}",
        "conflict_cause": "Possible cause: two network devices may be using the same IP address.",
        "conflict_action": (
            "Recommended action:\n1. Check the affected devices.\n"
            "2. Verify DHCP reservations.\n3. Check static IP configuration.\n"
            "4. Assign unique IP addresses."
        ),
        "new_device_title": "New Device Detected",
        "trust_device": "Trust Device",
        "ignore": "Ignore",
        "pro_feature_title": "PRO feature",
        "pro_feature_body": (
            "Continuous Monitoring requires an active PRO license.\n\n"
            "Activate a license in the License tab to enable it."
        ),

        "tray_show": "Show",
        "tray_start_monitoring": "Start Monitoring",
        "tray_stop_monitoring": "Stop Monitoring",
        "tray_quit": "Quit",
        "minimized_title": "Still running",
        "minimized_body": "ipscans Network Health Pro is still monitoring in the background.",

        "permission_title": "Keep monitoring continuously?",
        "permission_body": (
            "To catch network problems before your users do, Network Health Pro can:\n\n"
            "\u2022 Keep running in the system tray after you close this window\n"
            "\u2022 Start automatically when Windows starts\n"
            "\u2022 Show a notification when a problem is detected\n\n"
            "You can turn this off anytime from the Monitoring tab."
        ),
        "permission_allow": "Allow",
        "permission_deny": "Not Now",

        "notif_ip_conflict": "IP Conflict Detected",
        "notif_new_device": "New Device Detected",
        "notif_device_offline": "Device Offline",
        "notif_device_online": "Device Back Online",
        "notif_ip_changed": "IP Address Changed",
        "notif_mac_changed": "MAC Address Changed",

        "msg_new_device": "A device that has never been seen on this network before just appeared: {ip}.",
        "msg_ip_changed": "{old_ip} moved to a new address: {new_ip}. This is usually normal (e.g. a DHCP lease renewal).",
        "msg_mac_changed": (
            "{ip} just started responding from a different device than before (was {old_mac}, now {new_mac}). "
            "If the original device is still powered on and connected, two devices may now be sharing this "
            "address — check both devices' IP settings to be sure."
        ),
        "msg_mac_changed_normal": (
            "{ip} is now answering from a different device than a moment ago (was {old_mac}, now {new_mac}), "
            "but this matches a normal address handover (such as a DHCP lease being reassigned) — no action needed."
        ),
        "msg_ip_conflict": (
            "CONFIRMED: two different devices are both using {ip} — MAC {old_mac} and MAC {new_mac}. "
            "This will cause intermittent connectivity problems for both devices until one of them is moved to "
            "a different, unique address. Check each device's network settings (static IP / DHCP reservation)."
        ),
        "msg_ip_conflict_possible": (
            "{ip} just started responding from an unrecognized device (was {old_mac}, now {new_mac}) with no "
            "record of the original device moving anywhere else. This looks like two devices are now sharing "
            "the same address — check both devices' IP settings (static IP / DHCP reservation) to be sure."
        ),
        "msg_device_offline": "{ip} has stopped responding and is now considered offline — it may be powered off, disconnected, or unreachable on the network.",
        "msg_device_online": "{ip} is responding again and is back online.",
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

        "tab_scanner": "Tarayıcı",
        "tab_dashboard": "Panel",
        "tab_monitoring": "İzleme",
        "tab_event_log": "Olay Günlüğü",
        "tab_inventory": "Envanter",
        "tab_license": "Lisans",
        "tab_settings": "Ayarlar",
        "settings_monitoring": "İzleme",
        "settings_license": "Lisans",
        "settings_sites": "Sitelerim",

        "health_title": "AĞ SAĞLIĞI",
        "stat_devices": "Cihazlar",
        "stat_online": "Çevrimiçi",
        "stat_offline": "Çevrimdışı",
        "stat_conflicts": "IP Çakışmaları",
        "stat_high_latency": "Yüksek Gecikme",
        "stat_packet_loss": "Paket Kaybı",
        "stat_unknown": "Bilinmeyen Cihazlar",
        "start_monitoring": "İzlemeyi Başlat",
        "stop_monitoring": "Durdur",

        "scan_mode": "Tarama Modu",
        "mode_quick": "Hızlı Tarama",
        "mode_full": "Tam Tarama",
        "mode_health": "Sağlık Taraması",
        "mode_conflict": "Çakışma Taraması",
        "mode_continuous": "Sürekli İzleme",
        "site_name": "Site Adı",
        "site_name_placeholder": "örn. ABC Sitesi",
        "monitoring_interval": "İzleme Aralığı",
        "interval_10s": "10 saniye",
        "interval_30s": "30 saniye",
        "interval_60s": "60 saniye",
        "interval_5m": "5 dakika",
        "interval_custom": "Özel...",
        "custom_interval": "Özel (saniye)",
        "custom_interval_placeholder": "Saniye cinsinden özel aralık",
        "run_at_startup": "Windows açılışında otomatik çalıştır",
        "monitoring_running": "İzleme çalışıyor...",
        "monitoring_stopped": "İzleme durduruldu.",
        "monitoring_starting": "İzleme başlatılıyor — ilk tarama çalıştırılıyor...",

        "filter_all": "Tümü",
        "filter_critical": "Kritik",
        "filter_warning": "Uyarı",
        "filter_info": "Bilgi",
        "col_time": "Zaman",
        "col_severity": "Önem",
        "col_type": "Tür",
        "col_ip": "IP",
        "col_mac": "MAC",
        "col_message": "Mesaj",
        "col_confidence": "Güven",

        "search_placeholder_inventory": "IP, MAC, ana bilgisayar adı, üretici veya isme göre ara...",
        "export_csv": "CSV Dışa Aktar",
        "col_name": "İsim",
        "col_vendor": "Üretici",
        "col_model": "Model",
        "col_serial": "Seri Numarası",
        "col_status": "Durum",
        "col_latency": "Gecikme",
        "col_packet_loss": "Paket Kaybı",
        "col_last_seen": "Son Görülme",
        "status_online": "çevrimiçi",
        "status_offline": "çevrimdışı",

        "tab_topology": "Topoloji",
        "tab_my_sites": "Sitelerim",
        "topology_gateway": "Ağ Geçidi",
        "topology_empty": "Henüz cihaz yok — önce bir tarama yapın.",
        "col_tags": "Etiketler",
        "col_critical": "Kritik",
        "tags_placeholder": "örn. Kamera, Blok A",
        "group_filter_all": "Tüm gruplar",
        "device_history_title": "Cihaz Geçmişi",
        "device_history_latency": "Gecikme (ms)",
        "device_history_packet_loss": "Paket Kaybı (%)",
        "device_history_empty": "Henüz geçmiş yok — izlemeyi bir süre açık bırakın.",
        "quiet_hours": "Sessiz Saatler",
        "quiet_hours_enable": "Sessiz saatlerde popup gösterme (yine de günlüğe kaydedilir)",
        "quiet_hours_from": "Başlangıç",
        "quiet_hours_to": "Bitiş",
        "my_sites_refresh": "Yenile",
        "my_sites_col_name": "Site",
        "my_sites_col_devices": "Cihazlar",
        "my_sites_col_online": "Çevrimiçi",
        "my_sites_col_offline": "Çevrimdışı",
        "my_sites_col_conflicts": "Çakışmalar",
        "my_sites_col_health": "Sağlık",
        "my_sites_col_synced": "Son Senkron",
        "my_sites_requires_license": "Çoklu site senkronizasyonu Enterprise seviyeli bir lisans gerektirir.",
        "my_sites_empty": "Henüz bildirilen site yok. Monitoring sekmesinde bir Site Adı belirleyip izlemeyi başlatın.",
        "mark_critical": "Kritik Olarak İşaretle",
        "unmark_critical": "Kritik İşaretini Kaldır",
        "view_history": "Geçmişi Görüntüle",

        "plan": "Plan",
        "status_label": "Durum",
        "expires": "Bitiş",
        "license_key": "Lisans Anahtarı",
        "email_label": "E-posta",
        "email_placeholder": "siz@sirket.com",
        "start_trial": "PRO Denemesi Başlat",
        "check_updates": "Güncellemeleri Kontrol Et",
        "license_note": (
            "E-postanızı girin ve sadece e-posta ile 30 günlük PRO denemesi başlatın "
            "(henüz ödeme yok \u2014 Stripe faturalandırma sonraki bir güncellemede gelecek). "
            "Lisansınız ipscans.com üzerinden doğrulanır ve yerel olarak önbelleğe alınır, "
            "böylece uygulama çevrimdışıyken de çalışmaya devam eder."
        ),
        "up_to_date": "En son sürümdesiniz.",
        "update_available": "Güncelleme mevcut: v{version} \u2014 {notes}\nİndir: {url}",

        "conflict_title": "IP Çakışması Tespit Edildi",
        "conflict_text": "{ip} üzerinde olası IP çakışması",
        "conflict_cause": "Olası neden: iki ağ cihazı aynı IP adresini kullanıyor olabilir.",
        "conflict_action": (
            "Önerilen işlem:\n1. Etkilenen cihazları kontrol edin.\n"
            "2. DHCP rezervasyonlarını doğrulayın.\n3. Statik IP yapılandırmasını kontrol edin.\n"
            "4. Benzersiz IP adresleri atayın."
        ),
        "new_device_title": "Yeni Cihaz Tespit Edildi",
        "trust_device": "Cihaza Güven",
        "ignore": "Yoksay",
        "pro_feature_title": "PRO özelliği",
        "pro_feature_body": (
            "Sürekli İzleme aktif bir PRO lisansı gerektirir.\n\n"
            "Etkinleştirmek için Lisans sekmesinden bir lisans etkinleştirin."
        ),

        "tray_show": "Göster",
        "tray_start_monitoring": "İzlemeyi Başlat",
        "tray_stop_monitoring": "İzlemeyi Durdur",
        "tray_quit": "Çıkış",
        "minimized_title": "Hâlâ çalışıyor",
        "minimized_body": "ipscans Network Health Pro arka planda izlemeye devam ediyor.",

        "permission_title": "Sürekli izleme etkinleştirilsin mi?",
        "permission_body": (
            "Sorunları kullanıcılarınız fark etmeden yakalamak için Network Health Pro şunları yapabilir:\n\n"
            "\u2022 Bu pencereyi kapattığınızda sistem tepsisinde çalışmaya devam edin\n"
            "\u2022 Windows başladığında otomatik olarak başlayın\n"
            "\u2022 Bir sorun tespit edildiğinde bildirim gösterin\n\n"
            "Bunu istediğiniz zaman İzleme sekmesinden kapatabilirsiniz."
        ),
        "permission_allow": "İzin Ver",
        "permission_deny": "Şimdi Değil",

        "notif_ip_conflict": "IP Çakışması Tespit Edildi",
        "notif_new_device": "Yeni Cihaz Tespit Edildi",
        "notif_device_offline": "Cihaz Çevrimdışı",
        "notif_device_online": "Cihaz Tekrar Çevrimiçi",
        "notif_ip_changed": "IP Adresi Değişti",
        "notif_mac_changed": "MAC Adresi Değişti",

        "msg_new_device": "Bu ağda daha önce hiç görülmemiş bir cihaz belirdi: {ip}.",
        "msg_ip_changed": "{old_ip} yeni bir adrese taşındı: {new_ip}. Bu genellikle normaldir (ör. DHCP kirasının yenilenmesi).",
        "msg_mac_changed": (
            "{ip} artık öncekinden farklı bir cihazdan yanıt veriyor (önce {old_mac}, şimdi {new_mac}). "
            "Eğer orijinal cihaz hâlâ açık ve bağlıysa, bu adresi şu anda iki cihaz paylaşıyor olabilir — "
            "emin olmak için her iki cihazın da IP ayarlarını kontrol edin."
        ),
        "msg_mac_changed_normal": (
            "{ip} az önce farklı bir cihazdan yanıt vermeye başladı (önce {old_mac}, şimdi {new_mac}), "
            "ancak bu normal bir adres devri ile uyuşuyor (ör. DHCP kirasının yeniden atanması) — "
            "herhangi bir işlem gerekmiyor."
        ),
        "msg_ip_conflict": (
            "DOĞRULANDI: {ip} adresini iki farklı cihaz aynı anda kullanıyor — MAC {old_mac} ve MAC {new_mac}. "
            "Biri farklı, benzersiz bir adrese taşınana kadar her iki cihaz da aralıklı bağlantı sorunları "
            "yaşayacaktır. Her cihazın ağ ayarlarını (statik IP / DHCP rezervasyonu) kontrol edin."
        ),
        "msg_ip_conflict_possible": (
            "{ip} az önce tanınmayan bir cihazdan yanıt vermeye başladı (önce {old_mac}, şimdi {new_mac}) ve "
            "orijinal cihazın başka bir yere taşındığına dair hiçbir kayıt yok. Bu, aynı adresi artık iki cihazın "
            "paylaşıyor olabileceğini gösteriyor — emin olmak için her iki cihazın da IP ayarlarını (statik IP / "
            "DHCP rezervasyonu) kontrol edin."
        ),
        "msg_device_offline": "{ip} yanıt vermeyi durdurdu ve artık çevrimdışı kabul ediliyor — kapalı, bağlantısı kesilmiş veya ağda erişilemez olabilir.",
        "msg_device_online": "{ip} tekrar yanıt veriyor ve çevrimiçi duruma döndü.",
    },
}


def t(lang: str, key: str, **kwargs) -> str:
    table = STRINGS.get(lang) or STRINGS[DEFAULT_LANGUAGE]
    text = table.get(key) or STRINGS[DEFAULT_LANGUAGE].get(key, key)
    return text.format(**kwargs) if kwargs else text


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
