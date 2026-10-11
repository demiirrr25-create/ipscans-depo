# Faz 2 — 0.2.0 geliştirme sonucu

10 Ekim 2026. Çalışan teslim: yerel fotoğraf/kayıtlı video LPR laboratuvarı. Faz 2 saha kabulü tamamlanmadı; üretim dağıtımı yok.

## Gerçek inference

YOLOv9 t-384 ONNX plaka detector ve CCT XS v2 global OCR, ONNX Runtime CPU sağlayıcısıyla çalıştırıldı. İlk ONNX giriş/çıkış şekilleri okunarak adaptör düzeltildi: detector `[1,3,384,384]` float32 RGB, çıktı Nx7; OCR uint8 RGB 64×128, 10 karakter konumu ve bölge başlığı. OCR bölge tahmini yetkilendirmede kullanılmaz.

| Girdi | Beklenen | Okunan | Kaynak |
|---|---|---|---|
| Örnek araç fotoğrafı | 5AU5341 | 5AU5341 | upstream kamuya açık örnek; bağımsız holdout değil |
| Sentetik Türk plaka 1 | 34ABC123 | 34ABC123 | yerel oluşturulan test grafiği |
| Sentetik Türk plaka 2 | 06AB1234 | 06AB1234 | yerel oluşturulan test grafiği |
| Sentetik Türk plaka 3 | 35A12345 | 35A112445 | hatalı okuma, yaklaşık 0.637 güven; inceleme |
| Sentetik boş görüntü | plaka yok | tespit yok | yerel negatif kontrol |

Hatalı okuma gizlenmedi. Bu beş örnek için saha doğruluğu yüzdesi çıkarılmadı. Üç sentetik plaka ve boş görüntüden oluşan ayrı 4-görüntülü **sentetik** benchmark, hesaplama hattını sınamak için çalıştırıldı: exact match 0.75, plaka precision/recall 2/3, CER 2/24. Bunlar Türk plakalarında gerçek performans iddiası değildir.

## Ölçüm sınırları

Windows 11 build 26200, Python 3.14.3, 16 mantıksal CPU, yaklaşık 15.8 GiB sistem RAM. CPU tanımı: Intel64 Family 6 Model 183 Stepping 1. Model yükleme yaklaşık 702 ms; aynı örnek görüntünün 10 ısınmış tekrarı yaklaşık 20.6–22.3 ms inference verdi. Süreler yalnız bu çalışma koşullarını gösterir; RTSP/decode/UI/DB uçtan uca gecikmesi veya kamera kapasitesi değildir. Süreç RSS anlık ölçümü yaklaşık 140.8 MiB; tepe RAM veya çok kamera yük testi değildir. Ham veriler `inference-smoke.json` içinde.

GPU, CPU kullanım yüzdesi, uzun süreli sıcaklık/frekans etkisi ve 1/4/8/16 gerçek kamera ölçülmedi. NVIDIA desteği doğrulanmış sayılmıyor.

## Windows arayüzü

PySide6 siyah/beyaz test konsolu: model ve dosya seçimi, TR/EN, aday okuma/inceleme durumu, plaka kutusu ve skor. Tanıma ayrı Python sürecinde; kullanıcı durdurabilir, 120 saniye timeout ve 200 satır görüntüleme sınırı vardır. Tam ticari Dashboard/Vehicle Management/Access Control uygulaması değildir.

Qt offscreen testinde gerçek alt süreç sentetik görüntüyü okuyup 34ABC123 üretti. Dil değişimi, iptal, kontrollerin yeniden etkinleşmesi sınandı. Görsel incelemede offscreen Windows font keşfi sorunu bulundu; yerel Segoe UI kaydıyla düzeltildi ve önizleme yeniden incelendi. Fiziksel ekran okuyucu ve çoklu DPI testleri yapılmadı.

## Kayıtlı video

OpenCV MJPEG ile 10 FPS, 12 kareli sentetik içerikli gerçek AVI oluşturuldu; gerçek decode ve modellerle işlendi. 2 pending, 1 review, 1 recognized, 8 suppressed sonucu çıktı. EOF'ta sona erdi; yeniden oynatma yapılmadı. Bariyer komutu: 0. Bu test fiziksel kamera/RTSP testi değildir.

## Hatalar ve düzeltmeler

- İlk venv oluşturma ensurepip aşamasında başarısız oldu. `--without-pip --system-site-packages` ile ayrı ortam oluşturuldu; ek paketler o ortama kuruldu. Bazı temel paketler bu makinenin mevcut site-packages'ından kullanılıyor; temiz VM dağıtım testi yapılmadı.
- Sandbox ağ çözümlemesi paket indirmede başarısız oldu; yetkili ağ erişimiyle kurulum tamamlandı.
- OCR lisansının `main` dalı URL'si 404 verdi; resmî `master/LICENSE` kaynağı okundu.
- CLI benchmark göreli model yolunda FileNotFoundError verdi. Python/Windows path çözümlemesi nokta segmentlerini tekrar eden yola çevirdi; önce abspath normalizasyonu eklenerek düzeltildi ve regression testi yazıldı.
- İlk Qt screenshot yazıları kutu şeklinde gösterdi. Font kaydı düzeltildi; son önizleme okunabilir.

## Açık kalan işler

Gerçek Türk plaka holdout kümesi, gündüz/gece/hareket/kısmi kapanma, kamera ROI/yön/takip, RTSP ve ONVIF fiziksel cihaz testi, GPU, çoklu kamera, DB arıza/toparlanma, credential kasası/RBAC, kalıcı inceleme-düzeltme iş akışı, lisans imzası, gerçek bariyer ve installer henüz doğrulanmadı. Eğitim verisi ve ağırlıkların ticari yeniden dağıtım incelemesi açık; değerlendirme manifesti canlı modda kullanılamaz.
