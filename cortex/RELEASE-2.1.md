# Cortex 2.1.0 — Paketler ve arayüz

24 Ekim 2026

## Bu sürümde

- PRO ve PLUS kullanıcıları için yeni Ultra tanıtım kartı; kullanılan kamera ve kural kapasitesi.
- Paketler ekranında PRO / PLUS / ULTRA karşılaştırması ve lisans etkinleştirmeye geçiş.
- Açık ve koyu temada okunabilirlik, dar ekran düzeni, klavye odağı ve azaltılmış hareket desteği.
- Ayarlarda ve sunucuda pakete göre olay arşivi sınırı.
- Site ve Windows uygulaması arasında güncel sürüm/indirme bilgisi.

| Paket | Kamera | Kural | Olay arşivi |
|---|---:|---:|---:|
| PRO | 4 | 8 | 7 gün |
| PLUS | 12 | 32 | 15 gün |
| ULTRA | 32 | 128 | 30 gün |

PRO: Yerel kurallar, geçiş kontrolü, bölge stüdyosu, Telegram bildirimleri, site ve perakende paketleri.
PLUS: PRO özelliklerine ek olarak Ollama görsel AI, akıllı takip, iki yönlü Telegram, kanıt ZIP ve 7 sektör paketi.
ULTRA: PLUS özelliklerine ek olarak Copilot arama, gizlilik maskeleme, imzalı webhook, denetim izi, NVR filo ve 8 sektör paketi.

Arşiv süreleri olay kanıtları içindir; kesintisiz NVR video kaydı değildir. Gerçek analiz kapasitesi donanım, seçilen model ve kamera akışına bağlıdır.

## Kurulum ve güncelleme

1. Açık eski Cortex uygulamasını kapatın.
2. IPScans-Cortex-2.1.0.exe dosyasını çalıştırın. Mevcut kullanıcı profilindeki şifreli ayarlar korunur.
3. Uygulama kendi sürüm klasörüne yerleşir, masaüstü ve Başlat menüsü kısayollarını günceller.
4. Paketler ekranında mevcut lisansı ve kullanım sınırlarını kontrol edin.
5. Paket değiştirmek için yetkili sağlayıcınızdan alınan lisans anahtarını Ayarlar & Lisans bölümünde etkinleştirin.

Ollama ve model için ilk hazırlık internet ve ek disk alanı gerektirebilir. EXE kod imzalı değildir.

## Bulutta çalışma durumu

Bilgisayar kapalıyken bulutta analiz bu sürümde sunulmuyor. Ultra için planlanan özellik olarak ayrı gösterilir; lisans etkinleştirmek bulut hizmetini başlatmaz. Ücretli sunucu kurulumu bu yayının kapsamına alınmamıştır. Mevcut sürümde analiz bilgisayarı açık kalmalıdır.

## Doğrulama

86 otomatik Cortex testi geçti. Windows paketinin kendi testi insan dedektörü, arayüz ve FFmpeg bileşenlerini doğruladı. Paket ekranı açık/koyu tema, Türkçe/İngilizce ve 390 piksel dar ekran genişliğinde kontrol edildi. Yeni gerçek kamera saha testi yapılmadı.
