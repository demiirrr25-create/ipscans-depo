"""Minimal in-app translation layer for the desktop UI.

Kept intentionally small (flat string tables, no external i18n framework)
since the app only has a handful of screens. The active language is chosen
once on first run (see `app.ui.language_dialog`) and remembered via
QSettings, same mechanism as the privacy-notice acceptance flag.
"""
from __future__ import annotations

from PyQt6.QtCore import QSettings

_ORG, _APP = "ipscans", "NetworkScanner"
_LANGUAGE_KEY = "ui_language_v1"

DEFAULT_LANGUAGE = "en"

# (code, native display name) — shown in the language picker.
LANGUAGES: list[tuple[str, str]] = [
    ("en", "English"),
    ("tr", "Türkçe"),
    ("de", "Deutsch"),
    ("fr", "Français"),
    ("es", "Español"),
    ("ru", "Русский"),
]

_STRINGS: dict[str, dict[str, str]] = {
    "en": {
        "app_title": "IPscans+",
        "app_subtitle": "Network Discovery · Device Intelligence · IP TREE",
        "lang_title": "Welcome to IPscans+",
        "lang_subtitle": "Choose your language to continue",
        "lang_continue": "Continue",
        "scan_target": "Scan Target",
        "mode_range": "IP Range",
        "mode_single": "Single IP",
        "mode_cidr": "CIDR",
        "start_scan": "Start Scan",
        "stop_scan": "Stop",
        "search_placeholder": "Search: filter instantly by IP, vendor or MAC address...",
        "col_ip": "IP",
        "col_mac": "MAC",
        "col_vendor": "Vendor",
        "col_hostname": "Hostname",
        "col_ports": "Open Ports",
        "col_serial": "Serial No",
        "col_source": "Source",
        "col_device_type": "Device Type",
        "status_ready": "Ready.",
        "status_detected": "Detected local network: {value}",
        "status_discovering": "Discovering hosts among {count} addresses...",
        "status_stopping": "Stopping...",
        "status_scanning": "Scanning {done}/{total} — {found} device(s) found",
        "status_done": "Done — {count} device(s) found",
        "status_error": "Scan error",
        "invalid_target_title": "Invalid target",
        "terms_window_title": "Terms of Use",
        "terms_heading": "Step 1 of 2 — Terms of Use",
        "terms_checkbox": "I have read and agree to the Terms of Use above.",
        "terms_decline": "Decline and Exit",
        "terms_accept": "I Agree",
        "privacy_window_title": "Privacy Policy",
        "privacy_heading": "Step 2 of 2 — Privacy Policy",
        "privacy_checkbox": "I have read and agree to the Privacy Policy above.",
        "privacy_decline": "Decline and Exit",
        "privacy_accept": "I Agree",
        "wizard_back": "Back",
    },
    "tr": {
        "app_title": "IPscans+",
        "app_subtitle": "Ağ Keşfi · Cihaz Analizi · IP TREE",
        "col_device_type": "Cihaz Türü",
        "lang_title": "IPscans+'a Hoş Geldiniz",
        "lang_subtitle": "Devam etmek için dilinizi seçin",
        "lang_continue": "Devam Et",
        "scan_target": "Tarama Hedefi",
        "mode_range": "IP Aralığı",
        "mode_single": "Tek IP",
        "mode_cidr": "CIDR",
        "start_scan": "Taramayı Başlat",
        "stop_scan": "Durdur",
        "search_placeholder": "Ara: IP, üretici veya MAC adresine göre anında filtrele...",
        "col_ip": "IP",
        "col_mac": "MAC",
        "col_vendor": "Üretici",
        "col_hostname": "Ana Bilgisayar Adı",
        "col_ports": "Açık Portlar",
        "col_serial": "Seri No",
        "col_source": "Kaynak",
        "status_ready": "Hazır.",
        "status_detected": "Yerel ağ algılandı: {value}",
        "status_discovering": "{count} adres arasında cihazlar aranıyor...",
        "status_stopping": "Durduruluyor...",
        "status_scanning": "Taranıyor {done}/{total} — {found} cihaz bulundu",
        "status_done": "Tamamlandı — {count} cihaz bulundu",
        "status_error": "Tarama hatası",
        "invalid_target_title": "Geçersiz hedef",
        "terms_window_title": "Kullanım Şartları",
        "terms_heading": "Adım 1/2 — Kullanım Şartları",
        "terms_checkbox": "Yukarıdaki Kullanım Şartları'nı okudum ve kabul ediyorum.",
        "terms_decline": "Reddet ve Çık",
        "terms_accept": "Kabul Ediyorum",
        "privacy_window_title": "Gizlilik Politikası",
        "privacy_heading": "Adım 2/2 — Gizlilik Politikası",
        "privacy_checkbox": "Yukarıdaki Gizlilik Politikası'nı okudum ve kabul ediyorum.",
        "privacy_decline": "Reddet ve Çık",
        "privacy_accept": "Kabul Ediyorum",
        "wizard_back": "Geri",
    },
    "de": {
        "app_title": "IPscans+",
        "app_subtitle": "Tiefgehendes Netzwerk-Scan-Tool",
        "lang_title": "Willkommen bei IPscans+",
        "lang_subtitle": "Wählen Sie Ihre Sprache, um fortzufahren",
        "lang_continue": "Weiter",
        "scan_target": "Scan-Ziel",
        "mode_range": "IP-Bereich",
        "mode_single": "Einzelne IP",
        "mode_cidr": "CIDR",
        "start_scan": "Scan starten",
        "stop_scan": "Stopp",
        "search_placeholder": "Suchen: sofort nach IP, Hersteller oder MAC-Adresse filtern...",
        "col_ip": "IP",
        "col_mac": "MAC",
        "col_vendor": "Hersteller",
        "col_hostname": "Hostname",
        "col_ports": "Offene Ports",
        "col_serial": "Seriennummer",
        "col_source": "Quelle",
        "status_ready": "Bereit.",
        "status_detected": "Lokales Netzwerk erkannt: {value}",
        "status_discovering": "Durchsuche {count} Adressen nach Hosts...",
        "status_stopping": "Wird gestoppt...",
        "status_scanning": "Scanne {done}/{total} — {found} Gerät(e) gefunden",
        "status_done": "Fertig — {count} Gerät(e) gefunden",
        "status_error": "Scan-Fehler",
        "invalid_target_title": "Ungültiges Ziel",
        "terms_window_title": "Nutzungsbedingungen",
        "terms_heading": "Schritt 1 von 2 — Nutzungsbedingungen",
        "terms_checkbox": "Ich habe die obigen Nutzungsbedingungen gelesen und stimme zu.",
        "terms_decline": "Ablehnen und beenden",
        "terms_accept": "Ich stimme zu",
        "privacy_window_title": "Datenschutzrichtlinie",
        "privacy_heading": "Schritt 2 von 2 — Datenschutzrichtlinie",
        "privacy_checkbox": "Ich habe die obige Datenschutzrichtlinie gelesen und stimme zu.",
        "privacy_decline": "Ablehnen und beenden",
        "privacy_accept": "Ich stimme zu",
        "wizard_back": "Zurück",
    },
    "fr": {
        "app_title": "IPscans+",
        "app_subtitle": "Outil d'analyse réseau approfondie",
        "lang_title": "Bienvenue sur IPscans+",
        "lang_subtitle": "Choisissez votre langue pour continuer",
        "lang_continue": "Continuer",
        "scan_target": "Cible du scan",
        "mode_range": "Plage IP",
        "mode_single": "IP unique",
        "mode_cidr": "CIDR",
        "start_scan": "Démarrer le scan",
        "stop_scan": "Arrêter",
        "search_placeholder": "Rechercher : filtrer instantanément par IP, fabricant ou adresse MAC...",
        "col_ip": "IP",
        "col_mac": "MAC",
        "col_vendor": "Fabricant",
        "col_hostname": "Nom d'hôte",
        "col_ports": "Ports ouverts",
        "col_serial": "N° de série",
        "col_source": "Source",
        "status_ready": "Prêt.",
        "status_detected": "Réseau local détecté : {value}",
        "status_discovering": "Recherche d'hôtes parmi {count} adresses...",
        "status_stopping": "Arrêt en cours...",
        "status_scanning": "Analyse {done}/{total} — {found} appareil(s) trouvé(s)",
        "status_done": "Terminé — {count} appareil(s) trouvé(s)",
        "status_error": "Erreur de scan",
        "invalid_target_title": "Cible invalide",
        "terms_window_title": "Conditions d'utilisation",
        "terms_heading": "Étape 1/2 — Conditions d'utilisation",
        "terms_checkbox": "J'ai lu et j'accepte les conditions d'utilisation ci-dessus.",
        "terms_decline": "Refuser et quitter",
        "terms_accept": "J'accepte",
        "privacy_window_title": "Politique de confidentialité",
        "privacy_heading": "Étape 2/2 — Politique de confidentialité",
        "privacy_checkbox": "J'ai lu et j'accepte la politique de confidentialité ci-dessus.",
        "privacy_decline": "Refuser et quitter",
        "privacy_accept": "J'accepte",
        "wizard_back": "Retour",
    },
    "es": {
        "app_title": "IPscans+",
        "app_subtitle": "Herramienta de escaneo de red en profundidad",
        "lang_title": "Bienvenido a IPscans+",
        "lang_subtitle": "Elige tu idioma para continuar",
        "lang_continue": "Continuar",
        "scan_target": "Objetivo del escaneo",
        "mode_range": "Rango IP",
        "mode_single": "IP única",
        "mode_cidr": "CIDR",
        "start_scan": "Iniciar escaneo",
        "stop_scan": "Detener",
        "search_placeholder": "Buscar: filtra al instante por IP, fabricante o MAC...",
        "col_ip": "IP",
        "col_mac": "MAC",
        "col_vendor": "Fabricante",
        "col_hostname": "Nombre de host",
        "col_ports": "Puertos abiertos",
        "col_serial": "N.º de serie",
        "col_source": "Origen",
        "status_ready": "Listo.",
        "status_detected": "Red local detectada: {value}",
        "status_discovering": "Buscando hosts entre {count} direcciones...",
        "status_stopping": "Deteniendo...",
        "status_scanning": "Escaneando {done}/{total} — {found} dispositivo(s) encontrado(s)",
        "status_done": "Listo — {count} dispositivo(s) encontrado(s)",
        "status_error": "Error de escaneo",
        "invalid_target_title": "Objetivo no válido",
        "terms_window_title": "Condiciones de uso",
        "terms_heading": "Paso 1/2 — Condiciones de uso",
        "terms_checkbox": "He leído y acepto las condiciones de uso anteriores.",
        "terms_decline": "Rechazar y salir",
        "terms_accept": "Acepto",
        "privacy_window_title": "Política de privacidad",
        "privacy_heading": "Paso 2/2 — Política de privacidad",
        "privacy_checkbox": "He leído y acepto la política de privacidad anterior.",
        "privacy_decline": "Rechazar y salir",
        "privacy_accept": "Acepto",
        "wizard_back": "Atrás",
    },
    "ru": {
        "app_title": "IPscans+",
        "app_subtitle": "Инструмент глубокого сканирования сети",
        "lang_title": "Добро пожаловать в IPscans+",
        "lang_subtitle": "Выберите язык, чтобы продолжить",
        "lang_continue": "Продолжить",
        "scan_target": "Цель сканирования",
        "mode_range": "Диапазон IP",
        "mode_single": "Один IP",
        "mode_cidr": "CIDR",
        "start_scan": "Начать сканирование",
        "stop_scan": "Стоп",
        "search_placeholder": "Поиск: мгновенная фильтрация по IP, производителю или MAC-адресу...",
        "col_ip": "IP",
        "col_mac": "MAC",
        "col_vendor": "Производитель",
        "col_hostname": "Имя хоста",
        "col_ports": "Открытые порты",
        "col_serial": "Серийный номер",
        "col_source": "Источник",
        "status_ready": "Готово.",
        "status_detected": "Обнаружена локальная сеть: {value}",
        "status_discovering": "Поиск устройств среди {count} адресов...",
        "status_stopping": "Остановка...",
        "status_scanning": "Сканирование {done}/{total} — найдено {found} устр.",
        "status_done": "Готово — найдено {count} устр.",
        "status_error": "Ошибка сканирования",
        "invalid_target_title": "Неверная цель",
        "terms_window_title": "Условия использования",
        "terms_heading": "Шаг 1 из 2 — Условия использования",
        "terms_checkbox": "Я прочитал(а) и принимаю указанные выше Условия использования.",
        "terms_decline": "Отклонить и выйти",
        "terms_accept": "Принимаю",
        "privacy_window_title": "Политика конфиденциальности",
        "privacy_heading": "Шаг 2 из 2 — Политика конфиденциальности",
        "privacy_checkbox": "Я прочитал(а) и принимаю указанную выше Политику конфиденциальности.",
        "privacy_decline": "Отклонить и выйти",
        "privacy_accept": "Принимаю",
        "wizard_back": "Назад",
    },
}


def available_languages() -> list[tuple[str, str]]:
    return list(LANGUAGES)


_WORKSPACE = {
    "en": {
        "scan": "Scan", "network_map": "Network Map", "history": "History", "settings": "Settings",
        "navigation": "Workspace navigation", "workspace_view": "Workspace view",
        "view_table": "Device table", "view_graph": "Node graph",
        "columns": "Columns",
        "range_start": "Start IP", "range_end": "End IP (optional)",
        "current_adapter": "Current adapter", "refresh_adapters": "Refresh adapters",
        "detecting_adapter": "Detecting active network adapters...", "no_adapter": "No active IPv4 adapter. Enter an authorized range manually.",
        "range_hint": "Enter a start and end IP. Pasted single IPs and bounded CIDRs are also accepted.",
        "range_estimate": "{count:,} target addresses / bounded concurrency / only authorized networks",
        "large_range": "Confirm large scan", "large_range_notice": "This scan covers {count:,} IPs and can take several minutes. Confirm that you are authorized to scan this entire range.",
        "scan_cancelled": "Scan stopped / {count} devices observed / results are incomplete.",
        "overview": "{devices} devices / {cameras} cameras / {routers} routers/AP / {switches} switches / {recorders} NVR/DVR / {conflicts} potential conflicts / {unknown} unknown",
        "col_status": "Status", "col_parent": "Parent / route", "col_latency": "TCP connect time", "col_confidence": "Confidence", "col_device": "Device",
        "zoom_out": "Zoom out", "zoom_in": "Zoom in", "fit_screen": "Fit to screen",
        "collapse_branch": "Collapse branch", "expand_all": "Expand all", "export_map": "Export map",
        "map_legend": "Solid: confirmed LLDP/CDP adjacency (direction unknown). Dashed: inferred gateway/forwarding path, not a confirmed physical connection. Other devices remain unmapped.",
        "graph_accessibility": "Use the device table for screen-reader access. Ctrl+wheel zooms; drag pans; Enter opens a focused device.",
        "device_details": "Device Control Panel", "refresh_node": "Refresh node", "open_device": "Open web interface",
        "copy_ip": "Copy IP", "ping_test": "Ping / TCP test", "username": "Username", "password": "Password",
        "trusted_ca": "Trusted CA bundle (optional)", "choose_ca": "Choose CA",
        "read_configuration": "Authenticate / read configuration", "apply_changes": "Apply changes",
        "dhcp": "DHCP / automatic IP", "dns_from_dhcp": "DNS from DHCP",
        "subnet_mask": "Subnet mask", "gateway": "Gateway", "dns_servers": "DNS servers (comma-separated)",
        "confirm_change": "Confirm authorized configuration change", "operation_running": "Device operation in progress...",
        "configuration_loaded": "Authenticated configuration loaded. Only supported IPv4 operations are available.",
        "credentials_notice": "Credentials are used only in memory for this session; never saved to settings, history or logs.",
        "conflicts": "IP conflicts", "no_conflicts": "No conflicting MAC observations in this scan. This does not prove the network is conflict-free.",
        "potential_conflicts": "Different MAC identities were observed. Expand details for evidence; these are potential conflicts, not confirmed duplicates.",
        "export_results": "Export CSV / JSON", "history_notice": "Up to 20 completed scans, bounded to 32 MiB. Comparisons use matching target ranges; a missing response does not prove a device is offline.",
        "history_baseline": "Baseline scan: no earlier completed scan for this range.",
        "authorized_networks": "Scan and manage only networks and devices you are authorized to administer.",
        "worker_budget": "Worker budget", "snmp_notice": "Your authorized SNMP community (optional, never saved)",
        "update_vendors": "Update IEEE OUI database", "network_changed": "The selected adapter changed or disconnected. Scan stopped; partial results are not a complete baseline.",
        "scan_busy": "Stop the active scan before refreshing an individual node.",
        "scan_read_only": "Configuration changes are disabled while scanning. Stop the scan and reopen this panel to manage the device.",
        "app_subtitle": "Discover / Identify / Map / Manage",
    },
    "tr": {
        "scan": "Tarama", "network_map": "Ağ Haritası", "history": "Geçmiş", "settings": "Ayarlar",
        "navigation": "Çalışma alanı menüsü", "workspace_view": "Çalışma alanı görünümü",
        "view_table": "Cihaz tablosu", "view_graph": "Düğüm haritası", "range_start": "Başlangıç IP", "range_end": "Bitiş IP (isteğe bağlı)",
        "columns": "Sütunlar",
        "current_adapter": "Aktif adaptör", "refresh_adapters": "Adaptörleri yenile",
        "detecting_adapter": "Aktif ağ adaptörleri algılanıyor...", "no_adapter": "Aktif IPv4 adaptörü yok. Yetkili olduğunuz aralığı elle girin.",
        "range_hint": "Başlangıç ve bitiş IP girin. Yapıştırılan tek IP ve sınırlı CIDR de desteklenir.",
        "range_estimate": "{count:,} hedef adres / sınırlı eşzamanlılık / yalnızca yetkili ağlar",
        "large_range": "Geniş taramayı onayla", "large_range_notice": "Bu tarama {count:,} IP içeriyor ve birkaç dakika sürebilir. Tüm aralığı tarama yetkinizi onaylayın.",
        "scan_cancelled": "Tarama durduruldu / {count} cihaz gözlendi / sonuçlar tamamlanmadı.",
        "overview": "{devices} cihaz / {cameras} kamera / {routers} router/AP / {switches} switch / {recorders} NVR/DVR / {conflicts} olası çakışma / {unknown} bilinmeyen",
        "col_status": "Durum", "col_parent": "Üst cihaz / rota", "col_latency": "TCP bağlantı süresi", "col_confidence": "Güven düzeyi", "col_device": "Cihaz",
        "zoom_out": "Uzaklaştır", "zoom_in": "Yakınlaştır", "fit_screen": "Ekrana sığdır",
        "collapse_branch": "Dalı daralt", "expand_all": "Tümünü genişlet", "export_map": "Haritayı dışa aktar",
        "map_legend": "Düz çizgi: doğrulanmış LLDP/CDP komşuluğu (yön bilinmiyor). Kesikli: çıkarımsal ağ geçidi/iletim yolu, doğrulanmış fiziksel bağlantı değil. Diğer cihazlar eşlenmemiştir.",
        "graph_accessibility": "Ekran okuyucu için cihaz tablosunu kullanın. Ctrl+tekerlek yakınlaştırır; sürükleme kaydırır; Enter cihazı açar.",
        "device_details": "Cihaz Kontrol Paneli", "refresh_node": "Düğümü yenile", "open_device": "Web arayüzünü aç",
        "copy_ip": "IP kopyala", "ping_test": "Ping / TCP testi", "username": "Kullanıcı adı", "password": "Parola",
        "trusted_ca": "Güvenilir CA dosyası (isteğe bağlı)", "choose_ca": "CA seç",
        "read_configuration": "Kimlik doğrula / yapılandırmayı oku", "apply_changes": "Değişiklikleri uygula",
        "dhcp": "DHCP / otomatik IP", "dns_from_dhcp": "DHCP üzerinden DNS", "subnet_mask": "Alt ağ maskesi",
        "gateway": "Ağ geçidi", "dns_servers": "DNS sunucuları (virgülle ayır)",
        "confirm_change": "Yetkili yapılandırma değişikliğini onayla", "operation_running": "Cihaz işlemi devam ediyor...",
        "configuration_loaded": "Doğrulanmış yapılandırma okundu. Yalnızca desteklenen IPv4 işlemleri kullanılabilir.",
        "credentials_notice": "Kimlik bilgileri yalnızca oturum belleğinde kullanılır; ayarlara, geçmişe veya loglara kaydedilmez.",
        "conflicts": "IP çakışmaları", "no_conflicts": "Bu taramada farklı MAC gözlemi yok. Bu, ağda çakışma olmadığını kanıtlamaz.",
        "potential_conflicts": "Farklı MAC kimlikleri gözlendi. Kanıtlar için ayrıntıları açın; bunlar doğrulanmış değil, olası çakışmalardır.",
        "export_results": "CSV / JSON dışa aktar", "history_notice": "32 MiB sınırıyla en fazla 20 tamamlanmış tarama. Yalnızca aynı hedef aralıkları karşılaştırılır; yanıt alınamaması çevrimdışı olduğunu kanıtlamaz.",
        "history_baseline": "Başlangıç taraması: bu aralık için önceki tamamlanmış tarama yok.",
        "authorized_networks": "Yalnızca yönetmeye yetkili olduğunuz ağ ve cihazlarda kullanın.",
        "worker_budget": "İş parçacığı bütçesi", "snmp_notice": "Yetkili SNMP community bilgisi (isteğe bağlı, kaydedilmez)",
        "update_vendors": "IEEE OUI veritabanını güncelle", "network_changed": "Seçili adaptör değişti veya bağlantı kesildi. Tarama durduruldu; eksik sonuçlar tam tarama sayılmaz.",
        "scan_busy": "Tek düğümü yenilemeden önce aktif taramayı durdurun.",
        "scan_read_only": "Tarama sırasında yapılandırma değişikliği kapalıdır. Taramayı durdurup cihazı yönetmek için bu paneli yeniden açın.",
        "app_subtitle": "Keşfet / Tanı / Haritala / Yönet",
    },
}

_WORKSPACE_LABELS = {
    "de": ("Scan", "Netzwerkkarte", "Verlauf", "Einstellungen", "Gerätetabelle", "Knotengraph", "Start-IP", "End-IP (optional)",
           "Status", "Übergeordnet / Route", "TCP-Verbindungszeit", "Vertrauen", "Verkleinern", "Vergrößern", "Ansicht einpassen", "Zweig einklappen", "Alle ausklappen", "Karte exportieren",
           "Gerätesteuerung", "Knoten aktualisieren", "Weboberfläche öffnen", "IP kopieren", "Ping / TCP-Test", "Benutzername", "Passwort", "Konfiguration lesen", "Änderungen anwenden"),
    "fr": ("Scan", "Carte réseau", "Historique", "Paramètres", "Table des appareils", "Graphe", "IP de début", "IP de fin (facultative)",
           "État", "Parent / route", "Temps de connexion TCP", "Confiance", "Dézoomer", "Zoomer", "Ajuster à l'écran", "Réduire la branche", "Tout développer", "Exporter la carte",
           "Contrôle de l'appareil", "Actualiser le nœud", "Ouvrir l'interface web", "Copier l'IP", "Test Ping / TCP", "Utilisateur", "Mot de passe", "Lire la configuration", "Appliquer"),
    "es": ("Escanear", "Mapa de red", "Historial", "Ajustes", "Tabla de dispositivos", "Grafo", "IP inicial", "IP final (opcional)",
           "Estado", "Padre / ruta", "Tiempo de conexión TCP", "Confianza", "Alejar", "Acercar", "Ajustar a pantalla", "Contraer rama", "Expandir todo", "Exportar mapa",
           "Control del dispositivo", "Actualizar nodo", "Abrir interfaz web", "Copiar IP", "Prueba Ping / TCP", "Usuario", "Contraseña", "Leer configuración", "Aplicar cambios"),
    "ru": ("Сканирование", "Карта сети", "История", "Настройки", "Таблица устройств", "Граф", "Начальный IP", "Конечный IP (необязательно)",
           "Статус", "Родитель / маршрут", "Время TCP-соединения", "Уверенность", "Уменьшить", "Увеличить", "По размеру экрана", "Свернуть ветвь", "Развернуть всё", "Экспорт карты",
           "Управление устройством", "Обновить узел", "Открыть веб-интерфейс", "Копировать IP", "Тест Ping / TCP", "Имя пользователя", "Пароль", "Читать настройки", "Применить"),
}
_LABEL_KEYS = (
    "scan", "network_map", "history", "settings", "view_table", "view_graph", "range_start", "range_end",
    "col_status", "col_parent", "col_latency", "col_confidence", "zoom_out", "zoom_in", "fit_screen",
    "collapse_branch", "expand_all", "export_map", "device_details", "refresh_node", "open_device",
    "copy_ip", "ping_test", "username", "password", "read_configuration", "apply_changes",
)
for _language, _labels in _WORKSPACE_LABELS.items():
    _WORKSPACE[_language] = dict(zip(_LABEL_KEYS, _labels, strict=True))
for _language, _device_label in (("de", "Gerät"), ("fr", "Appareil"), ("es", "Dispositivo"), ("ru", "Устройство")):
    _WORKSPACE[_language]["col_device"] = _device_label
    _WORKSPACE[_language]["app_subtitle"] = "Discover / Identify / Map / Manage"
for _language, _columns in (("de", "Spalten"), ("fr", "Colonnes"), ("es", "Columnas"), ("ru", "Столбцы")):
    _WORKSPACE[_language]["columns"] = _columns
for _language, _translations in _WORKSPACE.items():
    _STRINGS[_language].update(_translations)


def get_saved_language() -> str | None:
    settings = QSettings(_ORG, _APP)
    value = settings.value(_LANGUAGE_KEY, None)
    return str(value) if value else None


def save_language(code: str) -> None:
    settings = QSettings(_ORG, _APP)
    settings.setValue(_LANGUAGE_KEY, code)


def t(lang: str, key: str, **kwargs) -> str:
    if key == 'rename_device':
        return {'tr': 'İsimlendir…', 'en': 'Rename…', 'de': 'Umbenennen…',
                'fr': 'Renommer…', 'es': 'Renombrar…', 'ru': 'Переименовать…'}.get(lang, 'Rename…')
    if key == "app_title":
        return "IPscans+"
    table = _STRINGS.get(lang) or _STRINGS[DEFAULT_LANGUAGE]
    text = table.get(key) or _STRINGS[DEFAULT_LANGUAGE].get(key, key)
    return text.format(**kwargs) if kwargs else text


TERMS_BODY: dict[str, str] = {
    "en": """
<h3>Terms of Use</h3>
<p><b>What this app does:</b> IPscans+ discovers devices on
the local network you point it at (via ICMP ping, ARP, and optional SNMP /
WMI / UPnP queries) and displays their IP, MAC address, vendor, hostname,
open ports and, where available, serial number.</p>
<p><b>Your responsibility:</b> You must only scan networks and devices you
own, administer, or have explicit permission to test. Scanning networks
without authorization may be illegal in your jurisdiction. The authors of
this software are not responsible for misuse.</p>
<p><b>No warranty:</b> This software is provided "as is", without warranty
of any kind. Network scan results (vendor lookups, serial numbers, open
ports) are best-effort and may be incomplete or inaccurate depending on
the devices and protocols available on your network.</p>
<p>By clicking "I Agree", you confirm that you have read and accept these
terms and that you will only use this tool on networks you are authorized
to scan.</p>
""",
    "tr": """
<h3>Kullanım Şartları</h3>
<p><b>Bu uygulama ne yapar:</b> IPscans+, yönelttiğiniz yerel
ağdaki cihazları (ICMP ping, ARP ve isteğe bağlı SNMP / WMI / UPnP sorguları
ile) keşfeder; IP, MAC adresi, üretici, ana bilgisayar adı, açık portlar ve
varsa seri numarasını gösterir.</p>
<p><b>Sorumluluğunuz:</b> Yalnızca sahibi olduğunuz, yönettiğiniz veya test
etme izniniz olan ağları ve cihazları tarayabilirsiniz. İzinsiz ağ taraması
bulunduğunuz yargı bölgesinde yasa dışı olabilir. Bu yazılımın yazarları
kötüye kullanımdan sorumlu değildir.</p>
<p><b>Garanti verilmez:</b> Bu yazılım "olduğu gibi", hiçbir garanti
olmaksızın sağlanır. Ağ tarama sonuçları (üretici sorguları, seri
numaraları, açık portlar) en iyi çaba ile elde edilir ve ağınızdaki
cihazlara/protokollere bağlı olarak eksik veya hatalı olabilir.</p>
<p>"Kabul Ediyorum"a tıklayarak bu şartları okuyup kabul ettiğinizi ve bu
aracı yalnızca taramaya yetkili olduğunuz ağlarda kullanacağınızı
onaylarsınız.</p>
""",
    "de": """
<h3>Nutzungsbedingungen</h3>
<p><b>Was diese App tut:</b> IPscans+ findet Geräte im
lokalen Netzwerk, das Sie angeben (per ICMP-Ping, ARP und optionalen
SNMP-/WMI-/UPnP-Abfragen), und zeigt deren IP, MAC-Adresse, Hersteller,
Hostname, offene Ports und, falls verfügbar, Seriennummer an.</p>
<p><b>Ihre Verantwortung:</b> Sie dürfen ausschließlich Netzwerke und
Geräte scannen, die Ihnen gehören, die Sie verwalten oder für deren Test
Sie eine ausdrückliche Erlaubnis haben. Unbefugtes Scannen kann in Ihrer
Rechtsordnung illegal sein. Die Autoren dieser Software haften nicht für
Missbrauch.</p>
<p><b>Keine Gewährleistung:</b> Diese Software wird "wie besehen", ohne
jegliche Gewährleistung, bereitgestellt. Scan-Ergebnisse (Herstellerdaten,
Seriennummern, offene Ports) beruhen auf bestem Bemühen und können je nach
Geräten/Protokollen in Ihrem Netzwerk unvollständig oder ungenau sein.</p>
<p>Mit einem Klick auf "Ich stimme zu" bestätigen Sie, dass Sie diese
Bedingungen gelesen haben und akzeptieren, und dass Sie dieses Tool nur in
Netzwerken verwenden, für deren Scan Sie berechtigt sind.</p>
""",
    "fr": """
<h3>Conditions d'utilisation</h3>
<p><b>Ce que fait cette application :</b> IPscans+ détecte
les appareils du réseau local que vous ciblez (via ping ICMP, ARP et,
en option, des requêtes SNMP / WMI / UPnP) et affiche leur IP, adresse
MAC, fabricant, nom d'hôte, ports ouverts et, si disponible, numéro de
série.</p>
<p><b>Votre responsabilité :</b> Vous ne devez scanner que des réseaux et
appareils que vous possédez, administrez ou pour lesquels vous avez une
autorisation explicite. Le scan non autorisé peut être illégal selon votre
juridiction. Les auteurs de ce logiciel ne sont pas responsables d'une
mauvaise utilisation.</p>
<p><b>Aucune garantie :</b> Ce logiciel est fourni "tel quel", sans
garantie d'aucune sorte. Les résultats de scan réseau (fabricant, numéros
de série, ports ouverts) sont fournis au mieux et peuvent être incomplets
ou inexacts selon les appareils/protocoles présents sur votre réseau.</p>
<p>En cliquant sur "J'accepte", vous confirmez avoir lu et accepté ces
conditions, et que vous n'utiliserez cet outil que sur des réseaux que
vous êtes autorisé à scanner.</p>
""",
    "es": """
<h3>Condiciones de uso</h3>
<p><b>Qué hace esta aplicación:</b> IPscans+ detecta
dispositivos en la red local que indiques (mediante ping ICMP, ARP y,
opcionalmente, consultas SNMP / WMI / UPnP) y muestra su IP, dirección
MAC, fabricante, nombre de host, puertos abiertos y, si está disponible,
número de serie.</p>
<p><b>Tu responsabilidad:</b> Solo debes escanear redes y dispositivos que
poseas, administres o para los que tengas permiso explícito. Escanear sin
autorización puede ser ilegal en tu jurisdicción. Los autores de este
software no se responsabilizan del mal uso.</p>
<p><b>Sin garantía:</b> Este software se ofrece "tal cual", sin garantía
de ningún tipo. Los resultados del escaneo de red (fabricante, números de
serie, puertos abiertos) son de mejor esfuerzo y pueden ser incompletos o
inexactos según los dispositivos/protocolos presentes en tu red.</p>
<p>Al hacer clic en "Acepto", confirmas que has leído y aceptas estas
condiciones, y que solo usarás esta herramienta en redes que estés
autorizado a escanear.</p>
""",
    "ru": """
<h3>Условия использования</h3>
<p><b>Что делает это приложение:</b> IPscans+ обнаруживает
устройства в указанной вами локальной сети (через ICMP ping, ARP и,
опционально, запросы SNMP / WMI / UPnP) и показывает их IP, MAC-адрес,
производителя, имя хоста, открытые порты и, если доступно, серийный
номер.</p>
<p><b>Ваша ответственность:</b> Вы должны сканировать только те сети и
устройства, которыми владеете, управляете или на тестирование которых у
вас есть явное разрешение. Несанкционированное сканирование может быть
незаконным в вашей юрисдикции. Авторы этого ПО не несут ответственности
за неправомерное использование.</p>
<p><b>Без гарантий:</b> Это программное обеспечение предоставляется
"как есть", без каких-либо гарантий. Результаты сетевого сканирования
(данные производителя, серийные номера, открытые порты) предоставляются
на основе лучших усилий и могут быть неполными или неточными в
зависимости от устройств/протоколов в вашей сети.</p>
<p>Нажимая «Принимаю», вы подтверждаете, что прочитали и принимаете эти
условия, и что будете использовать этот инструмент только в сетях,
которые вам разрешено сканировать.</p>
""",
}

PRIVACY_BODY: dict[str, str] = {
    "en": """
<h3>Privacy Policy</h3>
<p><b>Data collection:</b> This application does not transmit any scan
results, device information, or telemetry to ipscans.com or any third
party. All scanning happens locally between your computer and the devices
on your own network. No account, sign-up, or internet connection is
required for the app to function.</p>
<p><b>Local storage:</b> Language and policy acceptance are saved locally.
Scans remain in memory; no scan history is automatically saved. Existing
exports and earlier-version history files are not deleted. CSV/JSON/HTML
and map exports go only to files you choose. Device credentials and SNMP
secrets are kept only in session memory, never in history or logs. Logs
contain diagnostics and IP addresses and rotate locally. OUI updates
contact IEEE only when requested. Reverse DNS queries use your configured
DNS resolver. Web interfaces open only at your request.</p>
<p>By clicking "I Agree", you confirm that you have read and accept this
Privacy Policy.</p>
""",
    "tr": """
<h3>Gizlilik Politikası</h3>
<p><b>Veri toplama:</b> Bu uygulama hiçbir tarama sonucunu, cihaz bilgisini
veya telemetriyi ipscans.com'a ya da üçüncü bir tarafa iletmez. Tüm tarama
işlemi yalnızca bilgisayarınız ile kendi ağınızdaki cihazlar arasında,
yerel olarak gerçekleşir. Uygulamanın çalışması için hesap, kayıt veya
internet bağlantısı gerekmez.</p>
<p><b>Yerel depolama:</b> Dil ve politika onayları yerelde saklanır.
Taramalar bellekte tutulur; tarama geçmişi otomatik kaydedilmez. Önceki
sürümlerin geçmiş ve dışa aktarım dosyaları silinmez. CSV/JSON/HTML
ve harita dışa aktarmaları seçtiğiniz dosyalara yazılır. Cihaz kimlik
bilgileri ve SNMP sırları yalnızca oturum belleğinde kullanılır; geçmişe
veya loglara kaydedilmez. Tanılama logları IP adresi içerebilir ve yerelde
döndürülür. OUI güncellemesi yalnızca isteğinizle IEEE'ye bağlanır.
Ters DNS sorguları yapılandırılmış DNS çözümleyicisini kullanır.
Web arayüzleri yalnızca sizin isteğinizle açılır.</p>
<p>"Kabul Ediyorum"a tıklayarak bu Gizlilik Politikası'nı okuyup kabul
ettiğinizi onaylarsınız.</p>
""",
    "de": """
<h3>Datenschutzrichtlinie</h3>
<p><b>Datenerhebung:</b> Diese Anwendung überträgt keine Scan-Ergebnisse,
Geräteinformationen oder Telemetriedaten an ipscans.com oder Dritte. Der
gesamte Scan-Vorgang findet lokal zwischen Ihrem Computer und den Geräten
in Ihrem eigenen Netzwerk statt. Für die Funktion der App ist kein Konto,
keine Registrierung und keine Internetverbindung erforderlich.</p>
<p><b>Lokale Speicherung:</b> Sprache und Zustimmung sowie bis zu 20
abgeschlossene Scans (maximal 32 MiB) mit IP/MAC, Hostnamen, Hersteller
und Zeitstempeln werden lokal gespeichert. Exporte gehen in gewählte
Dateien. Zugangsdaten und SNMP-Geheimnisse bleiben nur im Arbeitsspeicher.
Lokale rotierende Diagnoseprotokolle können IP-Adressen enthalten.
OUI-Updates kontaktieren IEEE nur auf Wunsch; Reverse-DNS verwendet den
konfigurierten Resolver. Weboberflächen öffnen nur auf Ihre Anforderung.</p>
<p>Mit einem Klick auf "Ich stimme zu" bestätigen Sie, dass Sie diese
Datenschutzrichtlinie gelesen haben und akzeptieren.</p>
""",
    "fr": """
<h3>Politique de confidentialité</h3>
<p><b>Collecte de données :</b> Cette application ne transmet aucun
résultat de scan, information sur les appareils ni télémétrie à
ipscans.com ou à un tiers. Tout le scan se déroule localement entre votre
ordinateur et les appareils de votre propre réseau. Aucun compte,
inscription ou connexion internet n'est requis pour que l'application
fonctionne.</p>
<p><b>Stockage local :</b> La langue, le consentement et jusqu'à 20 scans
terminés (32 Mio maximum) avec IP/MAC, noms, fabricants et dates sont
conservés localement. Les exports vont dans les fichiers choisis.
Les identifiants et secrets SNMP restent uniquement en mémoire.
Les journaux locaux rotatifs peuvent contenir des adresses IP.
IEEE est contacté uniquement pour une mise à jour OUI demandée.
Le DNS inverse utilise votre résolveur ; les interfaces web ne s'ouvrent
qu'à votre demande.</p>
<p>En cliquant sur "J'accepte", vous confirmez avoir lu et accepté cette
politique de confidentialité.</p>
""",
    "es": """
<h3>Política de privacidad</h3>
<p><b>Recopilación de datos:</b> Esta aplicación no transmite resultados
de escaneo, información de dispositivos ni telemetría a ipscans.com ni a
terceros. Todo el escaneo ocurre localmente entre tu ordenador y los
dispositivos de tu propia red. No se requiere cuenta, registro ni conexión
a internet para que funcione la aplicación.</p>
<p><b>Almacenamiento local:</b> El idioma, el consentimiento y hasta 20
escaneos completos (máximo 32 MiB) con IP/MAC, nombres, fabricante y fechas
se guardan localmente. Las exportaciones van a los archivos elegidos.
Las credenciales y secretos SNMP permanecen solo en memoria.
Los registros locales rotativos pueden incluir direcciones IP.
IEEE se contacta solo al solicitar una actualización OUI. El DNS inverso
usa tu resolutor; las interfaces web se abren solo cuando lo solicitas.</p>
<p>Al hacer clic en "Acepto", confirmas que has leído y aceptas esta
política de privacidad.</p>
""",
    "ru": """
<h3>Политика конфиденциальности</h3>
<p><b>Сбор данных:</b> Это приложение не передаёт результаты сканирования,
информацию об устройствах или телеметрию на ipscans.com или третьим
лицам. Всё сканирование происходит локально между вашим компьютером и
устройствами в вашей собственной сети. Для работы приложения не требуется
учётная запись, регистрация или подключение к интернету.</p>
<p><b>Локальное хранение:</b> Язык, согласие и до 20 завершённых
сканирований (не более 32 МиБ) с IP/MAC, именами, производителями и датами
хранятся локально. Экспорт записывается в выбранные файлы.
Учётные данные и секреты SNMP используются только в памяти сеанса.
Локальные журналы с ротацией могут содержать IP-адреса.
Обновление OUI связывается с IEEE только по запросу. Обратный DNS использует
настроенный резолвер; веб-интерфейсы открываются только по вашему запросу.</p>
<p>Нажимая «Принимаю», вы подтверждаете, что прочитали и принимаете
данную Политику конфиденциальности.</p>
""",
}


def get_terms_body(lang: str) -> str:
    return TERMS_BODY.get(lang) or TERMS_BODY[DEFAULT_LANGUAGE]


def get_privacy_body(lang: str) -> str:
    return PRIVACY_BODY.get(lang) or PRIVACY_BODY[DEFAULT_LANGUAGE]
