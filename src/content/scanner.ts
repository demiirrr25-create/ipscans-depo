import type { Locale } from "@/i18n/config";

type ScannerCopy = {
  intro: string;
  features: readonly string[];
  limitations: string;
  mapIntro: string;
  releaseNotes: string;
};

export const scannerCopy: Record<Locale, ScannerCopy> = {
  en: {
    intro: "Scan / Discover / Identify / Map / Diagnose",
    features: [
      "Progressive ICMP/TCP, ONVIF, mDNS and SSDP discovery with bounded concurrency, ARP/MAC evidence and offline vendor lookup",
      "Unified Network Map and virtualized device table with shared search, confidence, zoom/pan, branch controls and device details",
      "The map distinguishes observed evidence from inferred routes. A physical connection without evidence remains unknown.",
      "Double-click a device in the table or map to open its IP web interface in the default browser",
      "A modern, spacious interface with a new icon and smooth progress animation that respects Windows animation settings",
      "CSV / JSON / HTML reports · SVG / PNG Network Map",
      "Automatic adapter detection, validated IPv4 ranges and manual IPv6 targets limited to 256 addresses"
],
    limitations: "Scan only authorized networks. IP, DNS and DHCP changes are not available in the app; use the device web interface. A device may have no reachable web page. Real-device accuracy has not been measured; binaries are unsigned.",
    mapIntro: "The map distinguishes observed evidence from inferred routes. A physical connection without evidence remains unknown. Double-click a device in the table or map to open its IP web interface in the default browser",
    releaseNotes: "Release notes & verified packages",
  },
  tr: {
    intro: "Tara / Keşfet / Tanı / Haritala / Tanıla",
    features: [
      "Sınırlı eşzamanlılıkla ilerlemeli ICMP/TCP, ONVIF, mDNS ve SSDP keşfi; ARP/MAC kanıtı ve çevrimdışı üretici eşleştirmesi",
      "Ortak arama, güven düzeyi, zoom/pan, dal kontrolleri ve cihaz detaylarıyla birleşik Network Map ve sanallaştırılmış cihaz tablosu",
      "Harita, gözlemlenen kanıtları çıkarımsal rotalardan ayırır. Kanıtı olmayan fiziksel bağlantılar bilinmiyor olarak kalır.",
      "Listede veya haritada cihaza çift tıklayarak IP adresinin web arayüzünü varsayılan tarayıcıda açın",
      "Yeni ikon, ferah ve modern arayüz; Windows animasyon tercihlerine uyan akıcı tarama ilerleme göstergesi",
      "CSV / JSON / HTML raporları · SVG / PNG ağ haritası",
      "Otomatik adaptör algılama, doğrulanan IPv4 aralıkları ve 256 adresle sınırlı manuel IPv6 hedefleri"
],
    limitations: "Yalnızca tarama yetkiniz olan ağları tarayın. Uygulama içinden IP, DNS veya DHCP değiştirilmez; cihazın web arayüzünü kullanın. Her cihazda erişilebilir bir web sayfası bulunmayabilir. Gerçek cihaz doğruluğu ölçülmedi; dosyalar dijital imzasızdır.",
    mapIntro: "Harita, gözlemlenen kanıtları çıkarımsal rotalardan ayırır. Kanıtı olmayan fiziksel bağlantılar bilinmiyor olarak kalır. Listede veya haritada cihaza çift tıklayarak IP adresinin web arayüzünü varsayılan tarayıcıda açın",
    releaseNotes: "Sürüm notları ve doğrulanan paketler",
  },
  de: {
    intro: "Scannen / Erkennen / Identifizieren / Kartieren / Diagnostizieren",
    features: [
      "Fortlaufende ICMP/TCP-, ONVIF-, mDNS- und SSDP-Erkennung mit begrenzter Parallelität, ARP/MAC-Nachweisen und Offline-Herstellerdaten",
      "Netzwerkkarte und virtualisierte Gerätetabelle mit gemeinsamer Suche, Vertrauensstufen, Zoom und Zweigsteuerung",
      "Die Karte unterscheidet beobachtete Nachweise von abgeleiteten Routen. Physische Verbindungen ohne Nachweis bleiben unbekannt.",
      "Ein Doppelklick auf ein Gerät in Tabelle oder Karte öffnet seine IP-Weboberfläche im Standardbrowser",
      "Neue App-Grafik, großzügige Oberfläche und flüssiger Fortschritt unter Beachtung der Windows-Animationseinstellungen",
      "CSV / JSON / HTML-Berichte · SVG / PNG-Netzwerkkarte",
      "Automatische Adaptererkennung, validierte IPv4-Bereiche und manuelle IPv6-Ziele mit maximal 256 Adressen"
],
    limitations: "Nur autorisierte Netzwerke scannen. IP-, DNS- und DHCP-Änderungen erfolgen nicht in der App, sondern über die Geräte-Weboberfläche. Nicht jedes Gerät bietet eine erreichbare Webseite. Die Genauigkeit an realen Geräten wurde nicht gemessen; Binärdateien sind unsigniert.",
    mapIntro: "Die Karte unterscheidet beobachtete Nachweise von abgeleiteten Routen. Physische Verbindungen ohne Nachweis bleiben unbekannt. Ein Doppelklick auf ein Gerät in Tabelle oder Karte öffnet seine IP-Weboberfläche im Standardbrowser",
    releaseNotes: "Versionshinweise und geprüfte Pakete",
  },
  fr: {
    intro: "Scanner / Découvrir / Identifier / Cartographier / Diagnostiquer",
    features: [
      "Découverte progressive ICMP/TCP, ONVIF, mDNS et SSDP à concurrence limitée, preuves ARP/MAC et fabricants hors ligne",
      "Carte réseau et table virtualisée avec recherche commune, confiance, zoom, branches et détails des appareils",
      "La carte distingue les observations des routes déduites. Les connexions physiques sans preuve restent inconnues.",
      "Un double-clic sur un appareil dans la table ou la carte ouvre son interface IP dans le navigateur par défaut",
      "Nouvelle icône, interface aérée et progression fluide respectant les préférences d’animation de Windows",
      "Rapports CSV / JSON / HTML · Carte réseau SVG / PNG",
      "Détection des adaptateurs, plages IPv4 validées et cibles IPv6 manuelles limitées à 256 adresses"
],
    limitations: "Scannez uniquement les réseaux autorisés. Les changements IP, DNS et DHCP ne sont pas proposés dans l’application ; utilisez l’interface web de l’appareil. Tous les appareils n’ont pas de page accessible. La précision sur appareils réels n’a pas été mesurée ; les exécutables ne sont pas signés.",
    mapIntro: "La carte distingue les observations des routes déduites. Les connexions physiques sans preuve restent inconnues. Un double-clic sur un appareil dans la table ou la carte ouvre son interface IP dans le navigateur par défaut",
    releaseNotes: "Notes de version et paquets vérifiés",
  },
  es: {
    intro: "Escanear / Descubrir / Identificar / Mapear / Diagnosticar",
    features: [
      "Descubrimiento progresivo ICMP/TCP, ONVIF, mDNS y SSDP con concurrencia limitada, pruebas ARP/MAC y fabricantes sin conexión",
      "Mapa de red y tabla virtualizada con búsqueda común, confianza, zoom, ramas y detalles del dispositivo",
      "El mapa distingue las pruebas observadas de las rutas inferidas. Las conexiones físicas sin pruebas permanecen desconocidas.",
      "Haz doble clic en un dispositivo de la tabla o el mapa para abrir su interfaz IP en el navegador predeterminado",
      "Nuevo icono, interfaz espaciosa y progreso animado que respeta las preferencias de animación de Windows",
      "Informes CSV / JSON / HTML · Mapa de red SVG / PNG",
      "Detección de adaptadores, rangos IPv4 validados y destinos IPv6 manuales limitados a 256 direcciones"
],
    limitations: "Escanea solo redes autorizadas. La aplicación no cambia IP, DNS ni DHCP; utiliza la interfaz web del dispositivo. Algunos dispositivos no tienen una página accesible. No se ha medido la precisión en dispositivos reales; los binarios no están firmados.",
    mapIntro: "El mapa distingue las pruebas observadas de las rutas inferidas. Las conexiones físicas sin pruebas permanecen desconocidas. Haz doble clic en un dispositivo de la tabla o el mapa para abrir su interfaz IP en el navegador predeterminado",
    releaseNotes: "Notas de versión y paquetes verificados",
  },
  it: {
    intro: "Scansiona / Scopri / Identifica / Mappa / Diagnostica",
    features: [
      "Rilevamento progressivo ICMP/TCP, ONVIF, mDNS e SSDP con concorrenza limitata, prove ARP/MAC e produttori offline",
      "Mappa di rete e tabella virtualizzata con ricerca comune, affidabilità, zoom, rami e dettagli",
      "La mappa distingue le prove osservate dai percorsi dedotti. Le connessioni fisiche senza prove restano sconosciute.",
      "Un doppio clic su un dispositivo nella tabella o nella mappa apre la sua interfaccia IP nel browser predefinito",
      "Nuova icona, interfaccia spaziosa e avanzamento fluido che rispetta le preferenze di animazione di Windows",
      "Rapporti CSV / JSON / HTML · Mappa di rete SVG / PNG",
      "Rilevamento adattatori, intervalli IPv4 validati e obiettivi IPv6 manuali limitati a 256 indirizzi"
],
    limitations: "Scansiona solo reti autorizzate. IP, DNS e DHCP non si modificano nell’app: usa l’interfaccia web del dispositivo. Non tutti i dispositivi hanno una pagina accessibile. La precisione sui dispositivi reali non è stata misurata; gli eseguibili non sono firmati.",
    mapIntro: "La mappa distingue le prove osservate dai percorsi dedotti. Le connessioni fisiche senza prove restano sconosciute. Un doppio clic su un dispositivo nella tabella o nella mappa apre la sua interfaccia IP nel browser predefinito",
    releaseNotes: "Note di rilascio e pacchetti verificati",
  },
  pt: {
    intro: "Analisar / Descobrir / Identificar / Mapear / Diagnosticar",
    features: [
      "Descoberta progressiva ICMP/TCP, ONVIF, mDNS e SSDP com concorrência limitada, provas ARP/MAC e fabricantes offline",
      "Mapa de rede e tabela virtualizada com pesquisa comum, confiança, zoom, ramos e detalhes",
      "O mapa distingue provas observadas de rotas inferidas. As ligações físicas sem provas permanecem desconhecidas.",
      "Um duplo clique num dispositivo da tabela ou do mapa abre a sua interface IP no navegador predefinido",
      "Novo ícone, interface espaçosa e progresso fluido que respeita as preferências de animação do Windows",
      "Relatórios CSV / JSON / HTML · Mapa de rede SVG / PNG",
      "Deteção de adaptadores, intervalos IPv4 validados e destinos IPv6 manuais limitados a 256 endereços"
],
    limitations: "Analise apenas redes autorizadas. A aplicação não altera IP, DNS ou DHCP; utilize a interface web do dispositivo. Nem todos os dispositivos têm uma página acessível. A precisão em dispositivos reais não foi medida; os binários não estão assinados.",
    mapIntro: "O mapa distingue provas observadas de rotas inferidas. As ligações físicas sem provas permanecem desconhecidas. Um duplo clique num dispositivo da tabela ou do mapa abre a sua interface IP no navegador predefinido",
    releaseNotes: "Notas da versão e pacotes verificados",
  },
  nl: {
    intro: "Scannen / Ontdekken / Identificeren / In kaart brengen / Diagnosticeren",
    features: [
      "Progressieve ICMP/TCP-, ONVIF-, mDNS- en SSDP-detectie met begrensde gelijktijdigheid, ARP/MAC-bewijs en offline fabrikanten",
      "Netwerkkaart en gevirtualiseerde tabel met gedeelde zoekfunctie, betrouwbaarheid, zoom, takken en apparaatdetails",
      "De kaart onderscheidt waargenomen bewijs van afgeleide routes. Fysieke verbindingen zonder bewijs blijven onbekend.",
      "Dubbelklik op een apparaat in de tabel of kaart om de IP-webinterface in de standaardbrowser te openen",
      "Een nieuw pictogram, ruime interface en vloeiende voortgang die de Windows-animatievoorkeuren respecteert",
      "CSV / JSON / HTML-rapporten · SVG / PNG-netwerkkaart",
      "Adapterdetectie, gevalideerde IPv4-bereiken en handmatige IPv6-doelen beperkt tot 256 adressen"
],
    limitations: "Scan alleen geautoriseerde netwerken. De app wijzigt geen IP, DNS of DHCP; gebruik de webinterface van het apparaat. Niet elk apparaat heeft een bereikbare webpagina. De nauwkeurigheid op echte apparaten is niet gemeten; de bestanden zijn niet ondertekend.",
    mapIntro: "De kaart onderscheidt waargenomen bewijs van afgeleide routes. Fysieke verbindingen zonder bewijs blijven onbekend. Dubbelklik op een apparaat in de tabel of kaart om de IP-webinterface in de standaardbrowser te openen",
    releaseNotes: "Releaseopmerkingen en gecontroleerde pakketten",
  },
  pl: {
    intro: "Skanuj / Odkrywaj / Identyfikuj / Mapuj / Diagnozuj",
    features: [
      "Stopniowe wykrywanie ICMP/TCP, ONVIF, mDNS i SSDP z ograniczoną współbieżnością, dowodami ARP/MAC i lokalną bazą producentów",
      "Mapa sieci i wirtualizowana tabela ze wspólnym wyszukiwaniem, poziomem pewności, zoomem, gałęziami i szczegółami",
      "Mapa odróżnia zaobserwowane dowody od wywnioskowanych tras. Połączenia fizyczne bez dowodów pozostają nieznane.",
      "Dwukrotne kliknięcie urządzenia w tabeli lub na mapie otwiera jego interfejs IP w domyślnej przeglądarce",
      "Nowa ikona, przestronny interfejs i płynny postęp zgodny z preferencjami animacji systemu Windows",
      "Raporty CSV / JSON / HTML · Mapa sieci SVG / PNG",
      "Wykrywanie kart, walidowane zakresy IPv4 i ręczne cele IPv6 ograniczone do 256 adresów"
],
    limitations: "Skanuj tylko autoryzowane sieci. Aplikacja nie zmienia IP, DNS ani DHCP; użyj interfejsu WWW urządzenia. Nie każde urządzenie ma dostępną stronę. Dokładność na rzeczywistych urządzeniach nie została zmierzona; pliki nie są podpisane.",
    mapIntro: "Mapa odróżnia zaobserwowane dowody od wywnioskowanych tras. Połączenia fizyczne bez dowodów pozostają nieznane. Dwukrotne kliknięcie urządzenia w tabeli lub na mapie otwiera jego interfejs IP w domyślnej przeglądarce",
    releaseNotes: "Informacje o wydaniu i zweryfikowane pakiety",
  },
  ru: {
    intro: "Сканировать / Обнаруживать / Определять / Картировать / Диагностировать",
    features: [
      "Постепенное обнаружение ICMP/TCP, ONVIF, mDNS и SSDP с ограниченной параллельностью, данными ARP/MAC и локальной базой производителей",
      "Карта сети и виртуализированная таблица с общим поиском, уверенностью, масштабированием, ветвями и подробностями",
      "Карта отличает наблюдаемые данные от предполагаемых маршрутов. Физические соединения без доказательств остаются неизвестными.",
      "Двойной щелчок по устройству в таблице или на карте открывает его IP-веб-интерфейс в браузере по умолчанию",
      "Новый значок, просторный интерфейс и плавный индикатор с учётом настроек анимации Windows",
      "Отчёты CSV / JSON / HTML · Карта сети SVG / PNG",
      "Определение адаптеров, проверенные диапазоны IPv4 и ручные цели IPv6 до 256 адресов"
],
    limitations: "Сканируйте только разрешённые сети. Приложение не меняет IP, DNS и DHCP — используйте веб-интерфейс устройства. Веб-страница может быть недоступна. Точность на реальных устройствах не измерялась; исполняемые файлы не подписаны.",
    mapIntro: "Карта отличает наблюдаемые данные от предполагаемых маршрутов. Физические соединения без доказательств остаются неизвестными. Двойной щелчок по устройству в таблице или на карте открывает его IP-веб-интерфейс в браузере по умолчанию",
    releaseNotes: "Примечания к выпуску и проверенные пакеты",
  },
  ar: {
    intro: "فحص / اكتشاف / تحديد / رسم / تشخيص",
    features: [
      "اكتشاف تدريجي عبر ICMP/TCP وONVIF وmDNS وSSDP بتزامن محدود وأدلة ARP/MAC وقاعدة مصنعين محلية",
      "خريطة شبكة وجدول أجهزة افتراضي ببحث مشترك ومستويات ثقة وتكبير وفروع وتفاصيل",
      "تميّز الخريطة بين الأدلة المرصودة والمسارات المستنتجة. تبقى الاتصالات المادية التي لا تدعمها أدلة غير معروفة.",
      "انقر مرتين على الجهاز في الجدول أو الخريطة لفتح واجهة عنوان IP في المتصفح الافتراضي",
      "أيقونة جديدة وواجهة رحبة ومؤشر تقدم سلس يحترم تفضيلات الحركة في Windows",
      "تقارير CSV / JSON / HTML · خريطة شبكة SVG / PNG",
      "اكتشاف المحولات والتحقق من نطاقات IPv4 وأهداف IPv6 يدوية بحد 256 عنواناً"
],
    limitations: "افحص الشبكات المصرح بها فقط. لا يغيّر التطبيق إعدادات IP أو DNS أو DHCP؛ استخدم واجهة الجهاز على الويب. قد لا توجد صفحة ويب متاحة لكل جهاز. لم تُقَس الدقة على أجهزة فعلية؛ الملفات التنفيذية غير موقعة.",
    mapIntro: "تميّز الخريطة بين الأدلة المرصودة والمسارات المستنتجة. تبقى الاتصالات المادية التي لا تدعمها أدلة غير معروفة. انقر مرتين على الجهاز في الجدول أو الخريطة لفتح واجهة عنوان IP في المتصفح الافتراضي",
    releaseNotes: "ملاحظات الإصدار والحزم المتحققة",
  },
  ja: {
    intro: "スキャン / 検出 / 識別 / マップ / 診断",
    features: [
      "並列数を制限した ICMP/TCP、ONVIF、mDNS、SSDP の逐次結果表示、ARP/MAC 証拠とオフラインメーカー検索",
      "共通検索、信頼度、ズーム、分岐操作、詳細を備えたネットワークマップと仮想化デバイス表",
      "マップは観測された証拠と推定経路を区別します。証拠のない物理接続は不明のままです。",
      "表またはマップのデバイスをダブルクリックすると、IPアドレスのWeb画面が既定のブラウザーで開きます",
      "新しいアイコン、余裕のある画面構成、Windowsのアニメーション設定に従う滑らかな進行表示",
      "CSV / JSON / HTML レポート · SVG / PNG ネットワークマップ",
      "アダプター自動検出、IPv4 範囲検証、256 アドレスまでの手動 IPv6 対象"
],
    limitations: "許可されたネットワークのみをスキャンしてください。アプリ内でIP、DNS、DHCPは変更できません。デバイスのWeb画面を使用してください。アクセス可能なWebページがない機器もあります。実機の精度は測定されておらず、実行ファイルは未署名です。",
    mapIntro: "マップは観測された証拠と推定経路を区別します。証拠のない物理接続は不明のままです。 表またはマップのデバイスをダブルクリックすると、IPアドレスのWeb画面が既定のブラウザーで開きます",
    releaseNotes: "リリースノートと検証済みパッケージ",
  },
  ko: {
    intro: "스캔 / 탐색 / 식별 / 매핑 / 진단",
    features: [
      "제한된 동시성으로 ICMP/TCP, ONVIF, mDNS, SSDP 결과를 순차 표시하고 ARP/MAC 증거와 오프라인 제조사 조회 제공",
      "공통 검색, 신뢰도, 확대, 분기 제어, 상세 정보를 갖춘 네트워크 맵과 가상화 장치 표",
      "지도는 관측된 근거와 추정 경로를 구분합니다. 근거가 없는 물리적 연결은 알 수 없는 상태로 남습니다.",
      "표나 지도에서 장치를 두 번 클릭하면 기본 브라우저에서 해당 IP 주소의 웹 인터페이스가 열립니다",
      "새 아이콘, 여유로운 화면 구성과 Windows 애니메이션 설정을 따르는 부드러운 진행 표시",
      "CSV / JSON / HTML 보고서 · SVG / PNG 네트워크 맵",
      "자동 어댑터 탐지, IPv4 범위 검증 및 256개 주소로 제한된 수동 IPv6 대상"
],
    limitations: "권한이 있는 네트워크만 스캔하세요. 앱에서 IP, DNS, DHCP를 변경하지 않으며 장치의 웹 인터페이스를 사용합니다. 모든 장치에 접속 가능한 웹 페이지가 있는 것은 아닙니다. 실제 장치 정확도는 측정되지 않았으며 실행 파일은 서명되지 않았습니다.",
    mapIntro: "지도는 관측된 근거와 추정 경로를 구분합니다. 근거가 없는 물리적 연결은 알 수 없는 상태로 남습니다. 표나 지도에서 장치를 두 번 클릭하면 기본 브라우저에서 해당 IP 주소의 웹 인터페이스가 열립니다",
    releaseNotes: "릴리스 정보 및 검증된 패키지",
  },
  zh: {
    intro: "扫描 / 发现 / 识别 / 映射 / 诊断",
    features: [
      "限制并发的 ICMP/TCP、ONVIF、mDNS、SSDP 渐进发现，提供 ARP/MAC 证据和离线厂商查询",
      "统一网络地图与虚拟化设备表，共享搜索、置信度、缩放、分支控制和设备详情",
      "地图区分已观察到的证据与推断的路由。没有证据支持的物理连接仍标为未知。",
      "双击列表或地图中的设备，即可在默认浏览器中打开该 IP 地址对应的设备网页界面",
      "全新应用图标、更加宽敞现代的界面，以及遵循 Windows 动画偏好的流畅扫描进度显示",
      "CSV / JSON / HTML 报告 · SVG / PNG 网络地图",
      "自动适配器检测、IPv4 范围验证，以及最多 256 个地址的手动 IPv6 目标"
],
    limitations: "仅扫描获得授权的网络。应用内不提供 IP、DNS 或 DHCP 修改，请使用设备网页界面。并非每台设备都有可访问的网页。尚未测量真实设备的识别准确性；可执行文件未进行数字签名。设备没有响应也不能证明该 IP 地址未被占用。",
    mapIntro: "地图区分已观察到的证据与推断的路由。没有证据支持的物理连接仍标为未知。 双击列表或地图中的设备，即可在默认浏览器中打开该 IP 地址对应的设备网页界面",
    releaseNotes: "发行说明与已验证软件包",
  },
};
