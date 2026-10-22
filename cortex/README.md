# Cortex 1.1.0 RC1 — kayıt cihazı, saat yönetimi ve kolay kurulum

- ONVIF Media1 kayıt cihazından kanal keşfi, video kaynağı başına küçük akış seçimi, toplu ekleme ve tekrar kontrolü. En fazla 32 kamera. Desteklenmeyen/başarısız kanallar ayrı gösterilir.
- Kamera/NVR UTC saatini 5–1440 dakika aralıkla bilgisayara eşitleme, mevcut saat dilimini koruma ve yazma sonrası doğrulama. Sapma varsa cihaz manuel saat moduna geçirilir. Cortex açık olmalıdır. NVR saati, bağlı kameraların saatini mutlaka değiştirmez.
- Yerel insan dedektörüyle üç pilot kural: giriş çizgisi, ters yön, tek kullanımlık izinle eşleşmeyen geçiş. Panelde verilen izin 15 saniye geçerlidir ve yalnızca bir geçişte tüketilir. Kart/QR/turnike entegrasyonu henüz yoktur. Kimlik veya üyelik görüntüden çıkarılmaz.
- İlk açılışta otomatik Ollama motoru/Gemma hazırlığı. Mevcut Ollama kullanılır; eksikse resmi bağımsız Windows motoru SHA-256 kontrolüyle indirilir. Model gerçek görsel yanıtla doğrulanır. İlk kullanım internet ve birkaç GB disk gerektirir; motor/model EXE içine gömülü değildir.
- Kullanıcı profiline yerleşim, masaüstü ve Başlat menüsü kısayolları. Açık/koyu tema ve mevcut bölge çizim arayüzü korunur.

Bu sürüm adayı gerçek NVR marka/model matrisi ve havuz videolarıyla saha kabulünden geçmemiştir. İnsan dedektörü tam vücut görüşü bekler; kalabalık, örtüşme, gece ve hızlı hareketlerde kaçırabilir. Güvenlik görevlisinin yerini aldığı iddia edilmez. Windows EXE kod imzalı değildir.


## Başlangıç
1. Önce çalışan eski Cortex'i kapatın. Yeni EXE'yi açın. Masaüstünde IPScans Cortex kısayolu oluşur. Eski şifreli ayarlar aynı kullanıcı profilinden okunur.
2. Ayarlar bölümünden otomatik AI hazırlığını izleyin. İptal edilen/başarısız hazırlık düğmeyle yeniden başlatılabilir. Ağ kesilirse yerel kurallar kullanılabilir. Hazır durumu gerçek model yanıtı olmadan gösterilmez.
3. Kameralar > Kayıt cihazı ve saat yönetimi: ONVIF IP, port, hesap ve parolayı yazın. Kanalları keşfedin, uygun kanalları seçip topluca ekleyin. Görüntü erişimi ayrı olarak kamera kartında doğrulanır. ONVIF Media2-only cihazlar bu sürümde desteklenmez. Uyumsuz cihazlar için tek tek RTSP girişi korunur.
4. Saat yönetimi için aynı formdan yalnızca cihaz ekleyin. Otomatik eşitleme açıkken Cortex saat sapmasını kontrol eder. Bilgisayar saatinin doğru olduğundan emin olun. Cihaz saatine yazma yetkisi gerekir; çok bozuk cihaz saati ONVIF kimlik doğrulamasını da engelleyebilir.
5. Kurallar bölümünde kamera, bölge ve gün/saat seçin. Geçiş kurallarında eksen, giriş yönü, çizgi konumu ve iki taraf doğrulama mesafesini ayarlayın. Koordinatlar görüntünün yüzdesidir. Takip, kişinin ayak noktasını kullanır.
6. İzinsiz geçiş şüphesi için kamera kartından Tek geçiş izni verin. Bu 15 saniyelik manuel test/operatör iznidir; harici kart okuyucu bağlantısı değildir. Bir kamera için yalnızca bir izin eşleştirme kuralı kaydedilir. İkinci geçiş, ikinci izin yoksa ayrı olay oluşturur.

## Korunan özellikler
12 piksel/bağlantı kuralı, 12 görsel Gemma şablonu, karanlık/aydınlık ölçümü, bölge çizimi, takvim, yerel şifreli yapılandırma, olay kaydı, mümkün olduğunda olay öncesi kareler ve 12 saniyelik sonraki klip, isteğe bağlı HTTPS webhook. Kamera akışları buluta gönderilmez. Webhook etkinse olay açıklamaları seçtiğiniz adrese gönderilir. Olay videosu yazımı başarısız olabilir; panelde durum belirtilir.

## Çalıştırma seçenekleri ve geliştirme
- `--portable`: uygulama/kısayol yerleşimini atlar; AI hazırlığını engellemez.
- `--no-browser`: tarayıcı, masaüstü yerleşimi ve otomatik AI hazırlığını atlar; yerel sunucuyu başlatır.
- `--install-only`: kullanıcı profiline EXE/kısayol yerleşimini yapıp çıkar.
- `--self-test`: paket içindeki insan motoru, UI ve FFmpeg dosyasını denetler.
- Python bağımlılıkları `requirements.txt` içinde sabittir. OpenCV 5 HOG içermediğinden 4.13.0.92 kullanılır.
- Test: çalışma dizininde `work/` oluşturun; `python -m unittest discover -s cortex -p "test*.py"` çalıştırın. Testler yerel HTTP erişimi gerektirir, gerçek kamera ayarlarını değiştirmez.

## Kabul durumu
68 otomatik test geçti. ONVIF yanıtları ve saat yazma/okuma testleri kontrollü taklit cihazlarla yürütüldü. Gerçek NVR uyumluluğu, gerçek insan videoları üzerinde doğruluk ve çok kameralı uzun süreli yük testi yapılmadı. İlk kullanımda tam Ollama indirme/kurulum yolu temiz Windows sanal makinesinde henüz sınanmadı. Mevcut Ollama yolu ve doğrulanmamış indirmeyi reddetme davranışı test edildi. Bu sınırlar giderilmeden güvenlik personelinin yerine kullanılacak doğruluk iddiası yoktur.
