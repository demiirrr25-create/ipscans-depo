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
        "app_title": "ipscans — Network Scanner",
        "app_subtitle": "Deep Network Scanning Tool",
        "lang_title": "Welcome to ipscans",
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
        "status_ready": "Ready.",
        "status_detected": "Detected local network: {value}",
        "status_discovering": "Discovering hosts among {count} addresses...",
        "status_stopping": "Stopping...",
        "status_scanning": "Scanning {done}/{total} — {found} device(s) found",
        "status_done": "Done — {count} device(s) found",
        "status_error": "Scan error",
        "invalid_target_title": "Invalid target",
    },
    "tr": {
        "app_title": "ipscans — Ağ Tarayıcı",
        "app_subtitle": "Derinlemesine Ağ Tarama Aracı",
        "lang_title": "ipscans'e Hoş Geldiniz",
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
    },
    "de": {
        "app_title": "ipscans — Netzwerkscanner",
        "app_subtitle": "Tiefgehendes Netzwerk-Scan-Tool",
        "lang_title": "Willkommen bei ipscans",
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
    },
    "fr": {
        "app_title": "ipscans — Scanner réseau",
        "app_subtitle": "Outil d'analyse réseau approfondie",
        "lang_title": "Bienvenue sur ipscans",
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
    },
    "es": {
        "app_title": "ipscans — Escáner de red",
        "app_subtitle": "Herramienta de escaneo de red en profundidad",
        "lang_title": "Bienvenido a ipscans",
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
    },
    "ru": {
        "app_title": "ipscans — Сканер сети",
        "app_subtitle": "Инструмент глубокого сканирования сети",
        "lang_title": "Добро пожаловать в ipscans",
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
    },
}


def available_languages() -> list[tuple[str, str]]:
    return list(LANGUAGES)


def get_saved_language() -> str | None:
    settings = QSettings(_ORG, _APP)
    value = settings.value(_LANGUAGE_KEY, None)
    return str(value) if value else None


def save_language(code: str) -> None:
    settings = QSettings(_ORG, _APP)
    settings.setValue(_LANGUAGE_KEY, code)


def t(lang: str, key: str, **kwargs) -> str:
    table = _STRINGS.get(lang) or _STRINGS[DEFAULT_LANGUAGE]
    text = table.get(key) or _STRINGS[DEFAULT_LANGUAGE].get(key, key)
    return text.format(**kwargs) if kwargs else text
