# IPscans+ v5.0 — Çok İş Parçacıklı Ağ Keşfi ve L2/L3 Topoloji Motoru (Native Rust)

**IPscans+ v5.0 (`IPscans-Plus.exe`)**, Windows 10/11 (x64) için Python/Qt bağımlılıklarından tamamen arındırılarak **%100 Native Rust** ile yeniden inşa edilmiş yüksek hızlı IPv4 alt ağ tarayıcısı ve topoloji haritalama uygulamasıdır.

## Mimari Özellikler
- **64-Thread Paralel Rust Keşif Motoru**: ARP komşu tablosu, TCP servis yoklaması (`21, 22, 23, 53, 80, 443, 445, 554, 1900, 3389, 5353, 8000, 8080, 8443, 37777`) ve ters DNS çözümlemesini milisaniyelik gecikmeyle yürütür.
- **IEEE OUI Üretici ve Cihaz Sınıflandırması**: Dahua, Hikvision, Axis, Ubiquiti, MikroTik, Cisco, Apple ve iş istasyonlarını otomatik sınıflandırır.
- **Kanıt Tabanlı Canlı Topoloji Haritası**: Ana modem (Gateway) merkezli SVG topoloji görünümü ve JSON dışa aktarma.
- **IPScans v2 Açık/Koyu Tema**: Varsayılan aydınlık (Light Mode) kurumsal arayüz ve tek tıkla koyu tema geçişi.

## Derleme ve Doğrulama

```powershell
cargo test
cargo build --release --bin IPscans-Plus
.\target\release\IPscans-Plus.exe --selftest
```
