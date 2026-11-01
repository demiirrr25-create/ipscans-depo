# IPScans LPR Pro v2.0 — Plaka Tanıma ve Bariyer Operatör Konsolu (Native Rust)

> Historical snapshot. The current Windows implementation is in [ipscans-lpr](../crates/ipscans-lpr). Build and test from the [root Cargo workspace](../README.md#windows-applications).

**IPScans LPR Pro v2.0 (`IPScans-LPR-Pro.exe`)**, Windows 10/11 (x64) için Python/PySide6 bağımlılıklarından tamamen arındırılarak **%100 Native Rust** ile inşa edilmiş yerel RTSP/ONVIF plaka tanıma, okuma/tetik çizgisi kalibrasyonu ve bariyer röle kontrol konsoludur.

## Mimari Özellikler
- **Canlı Operatör Duvarı & Çift Çizgi Kalibrasyonu**: Okuma Çizgisi (Recognition Line) ve Tetik Çizgisi (Trigger Line) ile milisaniyelik bariyer röle tetikleme.
- **Blok / Daire Sakin ve Misafir Araç Kütüğü**: Yetkili plaka kaydı, güven skoru ve geçiş geçmişi tablosu.
- **Tamamen Yerel Mimari**: Bulut aboneliği gerektirmeden yerel ağda ~2.58 MB native Rust `.exe` olarak çalışır.

## Derleme ve Doğrulama

```powershell
cargo build --release --bin IPScans-LPR-Pro
.\target\release\IPScans-LPR-Pro.exe --selftest
```
