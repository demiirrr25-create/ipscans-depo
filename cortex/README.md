# IPScans Cortex v3.0 — Kurumsal Kamera Görsel Zekâ ve Kural Motoru (Native Rust)

**IPScans Cortex v3.0 (`IPScans-Cortex.exe` ve `CortexAdmin.exe`)**, Windows 10/11 (x64) için **%100 Native Rust** mimarisiyle geliştirilmiş yerel RTSP/ONVIF kamera görsel zekâ, 8 hazır sektörel kurulum paketi, 8-tutamaçlı ROI kalibrasyon stüdyosu, Ollama VLM entegrasyonu ve SHA-256 adli kanıt kasası platformudur.

## Mimari Özellikler
- **8 Hazır Sektörel Paket**: Site & Rezidans, Havuz & Sosyal Tesis, Fabrika & Endüstriyel Saha, Depo & Lojistik, Perakende, Ofis & Plaza, Kampüs & Okul, Klinik & Yaşlı Bakım.
- **31 Deterministik + 42 Ollama Görsel AI Kuralı**: Yerel Ollama VLM (`gemma3`, `minicpm-v`, `qwen2.5vl`) ile sıfır bulut maliyetiyle sahne doğrulaması.
- **CortexAdmin (`CortexAdmin.exe`)**: PRO (4 Kamera), PLUS (12 Kamera) ve ULTRA (32 Kamera) paketleri için kriptografik lisans üretim ve filo yönetim konsolu.

## Derleme ve Doğrulama

```powershell
cargo build --release --bin IPScans-Cortex --bin CortexAdmin
.\target\release\IPScans-Cortex.exe --selftest
.\target\release\CortexAdmin.exe --selftest
```
