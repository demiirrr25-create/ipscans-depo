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


TERMS_BODY: dict[str, str] = {
    "en": """
<h3>Terms of Use</h3>
<p><b>What this app does:</b> ipscans Network Scanner discovers devices on
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
<p><b>Bu uygulama ne yapar:</b> ipscans Network Scanner, yönelttiğiniz yerel
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
<p><b>Was diese App tut:</b> ipscans Network Scanner findet Geräte im
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
<p><b>Ce que fait cette application :</b> ipscans Network Scanner détecte
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
<p><b>Qué hace esta aplicación:</b> ipscans Network Scanner detecta
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
<p><b>Что делает это приложение:</b> ipscans Network Scanner обнаруживает
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
<p><b>Local storage:</b> The only data this app stores is your chosen
language, your acceptance of these policies, and your scan settings,
saved locally on your own machine.</p>
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
<p><b>Yerel depolama:</b> Bu uygulamanın sakladığı tek veri, seçtiğiniz dil,
bu politikaları kabul ettiğiniz bilgisi ve tarama ayarlarınızdır; bunların
hepsi yalnızca kendi bilgisayarınızda tutulur.</p>
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
<p><b>Lokale Speicherung:</b> Die App speichert lediglich Ihre gewählte
Sprache, Ihre Zustimmung zu diesen Richtlinien und Ihre Scan-Einstellungen
— alles ausschließlich lokal auf Ihrem eigenen Rechner.</p>
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
<p><b>Stockage local :</b> La seule donnée conservée par l'application est
la langue choisie, votre acceptation de ces politiques et vos paramètres
de scan, enregistrés uniquement sur votre propre machine.</p>
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
<p><b>Almacenamiento local:</b> Lo único que guarda esta aplicación es el
idioma elegido, tu aceptación de estas políticas y tus ajustes de escaneo,
guardados únicamente en tu propio equipo.</p>
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
<p><b>Локальное хранение:</b> Приложение сохраняет только выбранный вами
язык, факт согласия с этими политиками и настройки сканирования — всё
это хранится исключительно на вашем собственном компьютере.</p>
<p>Нажимая «Принимаю», вы подтверждаете, что прочитали и принимаете
данную Политику конфиденциальности.</p>
""",
}


def get_terms_body(lang: str) -> str:
    return TERMS_BODY.get(lang) or TERMS_BODY[DEFAULT_LANGUAGE]


def get_privacy_body(lang: str) -> str:
    return PRIVACY_BODY.get(lang) or PRIVACY_BODY[DEFAULT_LANGUAGE]
