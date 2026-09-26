# ipscans Network Scanner (desktop)

PyQt6 tabanlı, ipscans.com ile aynı siyah/beyaz/gri temaya sahip masaüstü ağ
tarama uygulaması. Çerçevesiz, yuvarlak köşeli, gölgeli pencere; ARP/ping ile
hızlı host keşfi + SNMP/WMI/UPnP/Nmap ile derinlemesine cihaz bilgisi.

## Kurulum

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Nmap desteği için `nmap` komut satırı aracının ayrıca kurulu ve PATH'te
olması gerekir (https://nmap.org/download.html). WMI yalnızca Windows'ta
etkindir.

## Mimari

```
app/
  core/
    models.py           Device veri modeli (tüm protokollerin birleştiği yer)
    network_utils.py     Hedef ayrıştırma (tek IP / aralık / CIDR), ping sweep,
                          ARP tablosu okuma, hostname çözümleme, port tarama
    vendor_lookup.py     MAC -> üretici (OUI) çevrimdışı sözlük
    scanner.py            Tüm protokolleri birleştiren orkestrasyon (ThreadPoolExecutor)
    protocols/
      snmp_probe.py       SNMP v2c GET (sysDescr, sysName, seri no OID'i)
      wmi_probe.py        Windows WMI (Win32_OperatingSystem, Win32_BIOS)
      upnp_probe.py       SSDP/UPnP keşfi
      nmap_probe.py       python-nmap ile servis/OS parmak izi
  workers/
    scan_worker.py        QThread sarmalayıcı — arayüzü asla dondurmaz
  ui/
    styles.py             Karanlık QSS teması
    widgets.py             Cihaz tablo modeli, canlı filtre, hedef seçici
    main_window.py         Çerçevesiz ana pencere, çift tık -> tarayıcıda aç
```

## Bilinen sınırlamalar

- **Uzak WMI** (başka bir Windows makinesini sorgulamak) DCOM + yönetici
  kimlik bilgisi gerektirir ve modern güvenlik duvarlarında varsayılan kapalıdır;
  `wmi_probe.query_local_machine()` yalnızca çalıştığı makineyi güvenilir şekilde
  zenginleştirir. `query_remote()` açıkça kimlik bilgisi verildiğinde kullanılabilir.
- **Nmap** taraması diğer protokollere göre yavaştır, bu yüzden varsayılan
  olarak kapalıdır (arayüzden açılabilir).
- Ping, ham soket yerine işletim sisteminin `ping`/`arp` komutlarını
  kullanır — böylece yönetici/root yetkisi gerekmez, ama bazı güvenlik
  duvarları ICMP'yi engelleyen cihazları "kapalı" gösterebilir.
