# IPScans Network Health Pro v3.0 — Sürekli Ağ Telemetrisi ve ARP/IP Çakışma Tanısı (Native Rust)

> Historical snapshot. The current Windows implementation is in [ipscans-health-pro](../crates/ipscans-health-pro). Build and test from the [root Cargo workspace](../README.md#windows-applications).

**IPScans Network Health Pro v3.0 (`ipscans-network-health-pro.exe`)**, Windows 10/11 (x64) için **%100 Native Rust** mimarisiyle geliştirilmiş sürekli ağ sağlığı, Gateway/WAN RTT, Jitter ve L2 ARP çakışma izleme motorudur.

## Mimari Özellikler
- **Sürekli Gateway & Omurga DNS (1.1.1.1) Telemetrisi**: Ana modem ve WAN omurgası arasındaki gecikme ve paket kaybını gerçek zamanlı ölçer.
- **ARP / IP Çakışma Tespiti**: Yerel alt ağdaki MAC-IP eşleşmelerini izleyerek çift IP veya ARP spoofing anomalilerini anında raporlar.
- **Sıfır Harici Çalışma Zamanı**: Tek dosya ~2.7 MB native Rust PE64 çalıştırılabilir ikili (`ipscans-network-health-pro.exe`).

## Derleme ve Doğrulama

```powershell
cargo build --release --bin ipscans-network-health-pro
.\target\release\ipscans-network-health-pro.exe --selftest
```
