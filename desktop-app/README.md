# IPscans+ (desktop)

PyQt6 tabanlı, ipscans.com ile aynı siyah/beyaz/gri temaya sahip masaüstü ağ
keşif uygulaması. Aktif IPv4 arabirimini ve gerçek ağ maskesini algılar;
ICMP ve TCP yanıtlarını, mDNS, UPnP ve ONVIF ilanlarını birleştirir. MAC/üretici
bilgisi ve cihaz türü yalnızca erişilebilen sinyallerden türetilir. SNMPv2c
yalnızca kullanıcı topluluk bilgisini açıkça girerse çalışır; varsayılan
`public` denemesi yoktur. Yönetilen cihazların LLDP komşuları yetkili SNMP
ile okunabiliyorsa IP TREE bunları doğrulanmış bağlantı olarak gösterir.
Diğer fiziksel bağlantılar kesinmiş gibi gösterilmez. Tek IPv6 adresi veya
en fazla 256 adreslik IPv6 CIDR manuel girilebilir; otomatik IPv6 `/64`
taraması ve link-local arayüz kapsamı desteklenmez. IP TREE geçerli
filtrelenmiş görünümü SVG veya 250 düğüme kadar PNG olarak dışa aktarır.
Olasılık olarak doğrulanmamış yüzde değerleri yerine sinyal kaynağı
gösterilir. İlk açılışta dil seçimi
(6 dil: EN/TR/DE/FR/ES/RU) → kullanım şartları onayı → gizlilik politikası
onayı → ana pencere. Her adım ayrı kaydedilir (yalnızca henüz
tamamlanmamış adımlar gösterilir) ve sözleşmeler kabul edilmeden ana
pencereye erişilemez.

## Kurulum

`assets/icon.png` ve `assets/icon.ico`, `../public/scanner-mark.svg`
kaynağından üretilir. Windows CI, `IPscans-Plus.exe` yanında isteğe bağlı
masaüstü kısayolu sunan `IPscans-Plus-Setup.exe` yükleyicisini de oluşturur.
Doğrulanmış 2.0.1 sürüm: https://github.com/demiirrr25-create/ipscans-depo/releases/tag/ipscans-plus-v2.0.1 .

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Nmap desteği için `nmap` komut satırı aracının ayrıca kurulu ve PATH'te
olması gerekir (https://nmap.org/download.html). WMI yalnızca Windows'ta
etkindir.

```bash
QT_QPA_PLATFORM=offscreen python -m unittest discover -s tests -v
QT_QPA_PLATFORM=offscreen python main.py --selftest
```

## Mimari

```
app/
  core/
    models.py           Device veri modeli (tüm protokollerin birleştiği yer)
    network_utils.py     Hedef ayrıştırma (tek IP / aralık / CIDR), ping sweep,
                          ARP tablosu okuma, hostname çözümleme, port tarama
    vendor_lookup.py     MAC -> üretici (OUI) çevrimdışı sözlük
    scanner.py            Tüm protokolleri birleştiren orkestrasyon (ThreadPoolExecutor)
    intelligence.py       Kanıta dayalı cihaz sınıflandırması
    topology.py           LLDP bağlantıları ve ayrı işaretli çıkarımsal L3 yollar
    history.py            Yerel tekil tarama geçmişi ve CSV/JSON dışa aktarma
    protocols/
      snmp_probe.py       Kullanıcı izniyle SNMPv2c / LLDP bilgileri
      onvif_probe.py      Yerel ağda ONVIF WS-Discovery ilanları
      mdns_probe.py       Yerel mDNS servis ilanları
      wmi_probe.py        Windows WMI (Win32_OperatingSystem, Win32_BIOS)
      upnp_probe.py       SSDP/UPnP keşfi
      nmap_probe.py       python-nmap ile servis/OS parmak izi
  workers/
    scan_worker.py        QThread sarmalayıcı — arayüzü asla dondurmaz
  ui/
    onboarding_wizard.py   Animasyonlu ilk açılış sihirbazı: dil + şartlar + gizlilik
    privacy_dialog.py      Şartlar/gizlilik onay durumu (QSettings)
    styles.py             Karanlık QSS teması (modern segmented control dahil)
    widgets.py             Cihaz tablo modeli, canlı filtre, hedef seçici, IP sıralama
    main_window.py         Ana pencere, çift tık -> tarayıcıda aç
  i18n.py                  Arayüz metinleri için çeviri tablosu (6 dil)
```

Tarama sonuçları iş parçacığından GUI'ye sinyal ile aktarılır. STOP SCAN yeni
işleri iptal eder; çalışan ağ çağrıları sınırlı zaman aşımında biter. İsteğe
bağlı Live Monitoring iki dakika aralıkla tekrar tarar (en fazla 4096 hedef
IPv4 adresi; daha büyük ağlar manuel taranabilir). Tek önceki tarama
yerel JSON dosyasında tutulur. Aynı MAC'in IP değiştirmesi değişiklik olarak
gösterilir; aynı IP'deki MAC değişimi **doğrulanmış çatışma değildir**.

## Bilinen sınırlamalar

- **Uzak WMI** (başka bir Windows makinesini sorgulamak) DCOM + yönetici
  kimlik bilgisi gerektirir ve modern güvenlik duvarlarında varsayılan kapalıdır;
  `wmi_probe.query_local_machine()` yalnızca çalıştığı makineyi güvenilir şekilde
  zenginleştirir. `query_remote()` açıkça kimlik bilgisi verildiğinde kullanılabilir.
- **Nmap** yavaş ve bazı ortamlarda yönetici yetkisi gerektirir; otomatik
  taramada kapalıdır. Otomatik keşif aktif IPv4 aralığı içindir; IPv6 yalnızca
  elle belirlenen tek IP veya küçük CIDR aralığında ICMP/TCP ile taranır.
  CDP/FDB, DHCP sunucu kayıtları ve kimlik doğrulama isteyen ONVIF ayrıntıları
  henüz mevcut değildir. IP TREE, bu bilgiler olmadan fiziksel port sırası
  veya kamera seri numarası uydurmaz.
- Ping, ham soket yerine işletim sisteminin `ping`/`arp` komutlarını
  kullanır — böylece yönetici/root yetkisi gerekmez, ama bazı güvenlik
  duvarları ICMP'yi engelleyen cihazları "kapalı" gösterebilir.
