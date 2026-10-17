# LPR PRO — araştırma ve geliştirme kararları

Araştırma tarihi: 14 Ekim 2026. Aşağıdaki özellikler üreticilerin belgelerinden derlenmiştir; bağımsız karşılaştırmalı performans testi değildir.

| Emsal | Belgelenen özellik | LPR PRO için sonuç |
|---|---|---|
| Spinpark / Spintech | Okuma bölgesi, izin zamanları, otopark/üye kapasitesi, anti-passback, ziyaretçi ve bariyer entegrasyonu | 0.4: ROI ve operatör doğrulamalı otopark defteri. Otomatik bariyer ve üye bazlı kota hâlâ eksik. |
| Plate Recognizer Stream | Canlı akış işleme, takip ayarları, olay iletimi, dwell time ve yerel/bulut seçenekleri | 0.4: ayrı plaka izleri ve ortak motorla kamera zamanlaması. Kalıcı webhook kuyruğu ve gelişmiş araç sınıflandırma henüz yok. |
| Genetec AutoVu | Birleşik güvenlik platformunda sabit/mobil ALPR | Çok tesisli yönetim, cihaz filosu ve güvenilir merkezi olay altyapısı sonraki büyük geliştirme alanı. |
| AXIS License Plate Verifier | Uyumlu kamera üzerinde çalışma, izin/engelleme listeleri, erişim kontrolü ve olay API'si | Kamera üstü ANPR ile yerel motoru birleştiren adaptörler, fiziksel cihaz doğrulaması gerektiriyor. |

Kaynaklar: [Spintech ürün özellikleri](https://spintech.com.tr/urun/otopark-plaka-tanima-sistemi/), [Spintech kapasite açıklaması](https://spintech.com.tr/site-plaka-tanima-sistemi/), [Stream yapılandırması](https://guides.platerecognizer.com/docs/stream/configuration/), [Genetec AutoVu](https://www.genetec.com/products/unified-security/autovu), [Axis teknik kılavuzu](https://help.axis.com/en-us/axis-license-plate-verifier), [Axis olay API'si](https://developer.axis.com/vapix/applications/license-plate-verifier-api/).

Spinpark indirme sayfası dosya boyutunu 0.00 KB gösteriyor; kullanıcının gördüğü 1 GB paketin gerçek içeriği bu sayfadan doğrulanamıyor. [İndirme sayfası](https://spintech.com.tr/download/spinpark-otopark-plaka-tanima-yazilimi/). Paket büyüklüğü; çalışma zamanı, sürücüler, modeller ve sıkıştırmaya bağlıdır. Büyük paket, daha doğru tanıma kanıtı değildir.

## Giriş: mevcut ürünün gerçek durumu

0.3.1 sürümünde ONNX tespit/OCR, PySide6 arayüz, yerel kayıt, roller, DPAPI kamera parolaları ve izin simülatörü mevcut. Aynı karede birden fazla plaka görüldüğünde uzlaşma sıfırlanıyordu. Canlı arayüz 60 saniyelik tek kamera gözlemine sınırlıydı.

## Gelişme: uygulanmış 0.4 kapsamı

Çoklu plaka takibi, ROI, 1–16 kamera zamanlaması, 1–120 dakika gözlem, operatör doğrulamalı otopark kayıtları, kapasite/anti-passback, tekrar isteklere dayanıklılık, doğrulanmış yedek, koşul bazında benchmark ve regresyon testleri. Bunlar mevcut ürüne bağlandı; bağımsız bir maket hazırlanmadı.

Teknolojiler amaçlarına göre birleştirildi: ONNX Runtime çıkarım, OpenCV yakalama, FastPlateOCR/Paddle adaptörleri, PySide6 masaüstü, SQLite işlemler, DPAPI sır saklama, Next.js indirme sayfası ve Vercel yayın altyapısı. Her OCR motorunu her karede çalıştırmak veya bütün modelleri pakete eklemek doğruluğu kendiliğinden artırmaz; gecikme, lisans ve bakım yükünü de artırır.

## Sonuç: üstünlük iddiası için gereken kanıt

1. Bağımsız test kümesi: farklı şehir, gün/gece, yağmur, parlama, açı, hareket bulanıklığı, motosiklet, iki satır, yabancı plaka, plakasız araç ve yanlış tetikleyici örnekler. Eğitim/test ayrımı araç ve saha bazında yapılmalı.
2. Aynı görüntüler ve donanım üzerinde emsallerle exact-match, precision/recall, CER, yanlış geçiş/10.000 araç, kaçırılan geçiş, p50/p95/p99 uçtan uca gecikme karşılaştırması. Hedef eşikleri saha SLA'sı ve yanlış açma maliyetiyle belirlenmeli; mevcut OCR skoru gerçek doğruluk değildir.
3. 1/4/8/16 kamerada 24–72 saat yük testi: kopma, ağ kesintisi, CPU/GPU baskısı, disk dolması, saat değişmesi, elektrik kesintisi ve yeniden başlatma.
4. Ticari model/veri hakları, kamera ve röle test donanımı, fiziksel sensör interlock'ları, güncelleme/geri alma ve kod imzalama tamamlanmalı.
5. Bundan sonra yabancı plaka politikaları, araç renk/marka/model eşleştirme, ONVIF/native ANPR, kalıcı imzalı webhook teslimi, çok tesisli yönetim ve ücretlendirme/ödeme entegrasyonu gerçek saha gereksinimleriyle geliştirilmeli.

Bu maddeler mevcut sürümde tamamlanmış gibi gösterilmemelidir. 0.4 beta yayını, otomatik fiziksel erişim kontrolünün sahada devreye alınması anlamına gelmez.
