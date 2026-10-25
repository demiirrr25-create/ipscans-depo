# Cortex 2.5.0 — Premium arayüz ve arka plan çalışma

Bir ipscans.com projesi · 25 Ekim 2026

## Yenilikler
- Başlangıçtaki 3D karşılama ve uygulama/yönetim panelindeki 3D sahneler kaldırıldı.
- Ortak açık/koyu tasarım, sade kamera kartları, erişilebilir odak durumları ve yeni yörüngeli Cortex logosu eklendi.
- Bildirimler üst sağda sınırlı, kapatılabilir ve tekrarı önleyen bir düzene taşındı. Hata bildirimleri okunana kadar kalır.
- Fabrika, otel, sosyal tesis ve müstakil ev için 24 yeni görsel şablon: toplam 66 görsel şablon, 97 kural şablonu ve 10 sektör paketi. PLUS 9, ULTRA 10 sektör paketine erişir.
- Telegram menüsü anlaşılır Türkçe işlemlerle yenilendi; mevcut komutlar korunur.
- Canlı izlemede ROI varsayılan olarak kapalı. Çizimler yalnızca kullanıcı açtığında gösterilir.
- Kamera yakalama ile ağır analiz ayrı iş parçacıklarında çalışır. Önizleme 960 piksel / hedef 8 FPS, tek istekli görüntü yükleme ve zaman aşımı yönetimi kullanır.
- Tarayıcıdan bağımsız pencere açmayan Cortex süreci. İsteğe bağlı Windows açılış görevi, oturum açılmadan kayıtlı kameraları yeniden başlatır.
- Kurulu Ollama motoru ve mevcut model kütüphanesi açılış göreviyle kullanılabilir. Yeni model indirme işlemi ilk kurulumda tamamlanmalıdır.
- Web yönetim sayfası yerel yönetim merkezine yönlendiren düzenli bir erişim sayfasına dönüştürüldü.
- Web bağımlılıkları Next.js 16.4.3 ve ilgili güvenlik düzeltmeleriyle güncellendi.

## Kurulum
1. IPScans-Cortex-Setup-2.5.0.exe dosyasını çalıştırın ve Windows yönetici onayını verin.
2. Bilgisayar açılışında arka planda başlat seçeneğini açık bırakın. Görev adı: IPScans Cortex Background.
3. Önceki Cortex süreci açıksa kapatın. Masaüstü Cortex kısayolundan paneli açın; kayıtlı kullanıcı hesabınızla giriş yapın.
4. Kameraları ve kuralları doğrulayın. Görsel analiz için Ayarlar bölümünde modelin hazır olduğunu kontrol edin.
5. Tarayıcıyı kapatmak izlemeyi durdurmaz. Windows Görev Zamanlayıcı üzerinden Cortex görevini durdurabilirsiniz. Uygulamadaki açık çıkış işlemi mevcut kameraları durdurur.

Arka plan görevi LocalService hesabını kullanır. Cortex veri dizinine değişiklik izni, mevcut Ollama uygulama dizinine okuma/çalıştırma ve model dizinine okuma/yazma izni verilir. Uygulama yalnızca 127.0.0.1 üzerinde dinler. Yönetim paneli varsayılan olarak 8766, Cortex 8765 portundadır. Yönetim merkezi kısayolu Başlat menüsündedir.

## Doğrulama ve sınırlar
- Python ve web testleri, üretim derlemesi, paketli uygulama ve yerel tarayıcı kontrolleri sürüm doğrulamasının parçalarıdır; sonuçlar release doğrulama dosyasında yer alır.
- Tek kayıtlı kamerayla kısa bağlantı testi yapıldı; kamera görüntüsü kaydedilmedi veya dışarı gönderilmedi. Telegram'a gerçek test mesajı/görüntüsü gönderilmedi.
- 8 FPS önizleme hedefidir; donanım, RTSP gecikmesi, Wi-Fi ve kamera profili sonucu etkiler. Kesintisiz çalışma garantisi değildir.
- Bilgisayar kapalıyken veya uykudayken analiz çalışmaz. Bulutta çalışma bu sürümde sunulmuyor. Açılış görevi bilgisayarın uyanık ve kamera ağına erişebilir olmasını gerektirir.
- Modeller gözlenebilir durumlar için yardımcı uyarılar üretir; doğruluk, özellikle yangın ve iş güvenliği senaryolarında saha testleri ve insan incelemesi gerektirir.
- Kurulum paketinin Authenticode imzası yoktur; SHA-256 dosyasından bütünlük kontrolü yapılabilir.
