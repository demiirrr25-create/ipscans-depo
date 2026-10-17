# Doğrulama raporu — 10 Ekim 2026

## Güncel sürüm: 0.2.0

Güncel sonuçlar [PHASE2_0.2.md](PHASE2_0.2.md), `verification.json`, `inference-smoke.json`, `synthetic-benchmark.json` ve `video-smoke.json` dosyalarındadır. **26 otomatik test** başarılıdır; gerçek ONNX inference ve PySide6 alt süreç testi de çalıştırıldı. Aşağıdaki 15-test raporu 0.1.0 tarihçesidir, güncel eksik bağımlılık listesi değildir.

## 0.1.0 geçmiş doğrulaması

## Ortam ve çalıştırılan kontroller

Windows 11 build 26200, Python 3.14.3, NumPy 2.4.3, OpenCV Python 5.0.0.93, pytest 9.0.2. ONNX Runtime, PaddleOCR/Paddle ve PySide6 bu ortamda yok. Ortamın Python başlatıcısı `Failed to find real location` uyarısı veriyor; aşağıdaki son kontroller buna rağmen sıfır çıkış koduyla tamamlandı. Ham kayıt: `verification.json`.

| Kontrol | Sonuç |
|---|---|
| `python -m pytest -q` | 15 test başarılı |
| `python -m lpr.cli doctor` | bağımlılık eksiklerini doğru raporladı |
| `python -m lpr.cli demo` | 1 recognized, 1 suppressed, 2 review; 3 kayıt; 0 bariyer komutu |
| `python -m compileall -q lpr` | başarılı |

İlk çalıştırma: 13 başarılı, 1 başarısız. Başarısızlık Windows sandbox geçici dizinine erişim izniydi; atlanmadı. Son çalıştırmada `TEMP`/`TMP` bu sohbetin `work/test-temp` klasörüne yönlendirildi; bütün testler çalıştı. Son kontrolde belirsiz negatif görüntülerin yanlışlıkla başarılı sayılmasını önleyen ek regression testi eklendi.

## Test kapsamı

- Sivil TR plaka alt kümesi ve yanlış/özel biçimlerin reddi.
- Aynı kare, sırası bozulmuş kare, eski/gelecek zaman ve NaN/sonsuz skor reddi.
- Üç farklı karede consensus; düşük güven incelemesi, tekrar bastırma, kamera izolasyonu, pencere süresi ve kapasite.
- Çelişkili plaka okumalarında abstention.
- SQLite parametreli filtreler ve mantıksal retention silmesi.
- Precision, recall, CER, boş payda ve belirsiz negatif görüntü hesapları.
- Detector kutu ölçekleme, letterbox geri dönüşümü, NMS, geçersiz tensör satırı.
- Gerçek NumPy görüntü üzerinde kırpma; detector ve OCR **sahte adaptörlerdir**.
- Model manifest kaynak inceleme alanları, checksum değişikliği, dizin dışına çıkma reddi. Model fixture'ı gerçek ONNX değildir.
- Sahte kamera ile yeniden bağlantı, tek eleman kuyruk, kare düşürme, backend istisnası ve kapatma.

## Test edilmemiş veya tamamlanmamış

Gerçek ONNX inference, gerçek PaddleOCR, kamera kimlik doğrulama, ONVIF keşif, RTSP cihaz uyumluluğu, CUDA, gerçek plaka doğruluğu, fiziksel bariyer, çoklu kamera, proses watchdog, ROI/yön takibi, UI, installer, rol/lisans doğrulama ve üretim güvenliği test edilmedi. Faz 2 gerçek kamera MVP kabulü tamamlanmadı.

Test süresi kamera FPS'i veya tanıma gecikmesi değildir. Gündüz/gece accuracy, CPU/GPU/RAM tüketimi, 1/4/8/16 kamera kapasitesi ve uçtan uca video gecikmesi için sonuç yayımlanmadı. Gerçek veri seti sağlanmadığı için sayısal doğruluk raporu yoktur.

## Yeniden çalıştırma

Normal yerel ortamda paket dizininde `python -m pytest -q` çalıştırın. Kısıtlı sandbox'ta önce TEMP/TMP için yazılabilir bir çalışma dizini seçin. Testler kamera veya bariyer ağına bağlanmaz. `demo` yalnız sentetik plaka metinleri kullanır.
