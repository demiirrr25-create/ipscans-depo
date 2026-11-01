# IPScans Sentinel v3.0 — Otonom Siber Savunma, Ana Modem Zırhı ve Ollama AI Komuta Merkezi (Native Rust)

**IPScans Sentinel v3.0**, Windows 10/11 (x64) için sıfır harici çalışma zamanı bağımlılığıyla **%100 Native Rust** olarak geliştirilmiş otonom siber güvenlik, yerel ağ (LAN) denetim ve aktif müdahale komuta merkezidir.

## Temel Yetenekler
- **Yönetici (UAC Elevated) CMD ve PowerShell Orkestratörü**: Güvenlik duvarı (`netsh advfirewall`), ARP komşu tablosu (`arp -d`), yönlendirme (`route`) ve soket bağlantılarını doğrudan yönetici yetkisiyle denetler.
- **Yerel Ollama Siber Güvenlik Ajanı**: Yerel Ollama motorunu (`http://127.0.0.1:11434`) otomatik algılar, en yetkin yerel siber güvenlik modelini yükler ve doğal dildeki olay bildirimlerinden (*"Dahua kamerama sızdılar"*) deterministik + yapay zekâ destekli müdahale planı üretir.
- **Milisaniyelik Cihaz Karantinası (Kill-Switch) ve Kontrollü Ağ Erişimi**: Sızma tespit edilen IP/MAC adresinin (ör. Dahua/Hikvision IP kamera, TCP `554`/`37777`/`8000`) dış ağa ve yerel alt ağa çıkışını milisaniyeler içinde keser; güvenlik sıkılaştırması tamamlandığında cihazı kontrollü olarak tekrar ağa alır.
- **Ana Modem (Gateway) Güvenlik Denetimi**: UPnP IGD, WAN yönetim portları (`7547` TR-069, `23` Telnet, `80`/`443`/`8080`) ve DNS bütünlüğünü denetleyip sıkılaştırır.

## Derleme (Rust Toolchain)

```powershell
cargo build --release --bin IPScans-Sentinel
```
