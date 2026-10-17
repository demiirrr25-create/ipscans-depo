# LPR Pro 0.5.0.dev2 — geliştirme önizlemesi

Bu dosya kurulum paketi değildir. Çalıştırılabilir Windows geliştirme sürümüdür; sisteminizde Python veya Node.js kurulumu istemez. Ticari sürüm ve imzalı güncelleme çalışmaları tamamlanmamıştır.

1. `IPScans-LPR-Pro-0.5.0.dev2.exe` dosyasını çalıştırın.
2. Mevcut LPR Pro hesabınızla giriş yapın. Kullanıcı verileri Windows kullanıcı veri klasöründe tutulur.
3. **Kameralar** sekmesinde kayıtlı kamerayı seçin.
4. **Canlı görüntüyü aç** düğmesini kullanın. Bu işlem OCR modeli gerektirmez. Devam eden tanıma işlemi varsa önce onu durdurun.
5. **Çizgi çiz** düğmesine basın, görüntü üzerinde sürükleyin. Çizginin ucunu veya gövdesini sürükleyerek düzenleyebilirsiniz.
6. Çizgiyi seçip **Adlandır**, **Yönü ters çevir** veya **Sil** düğmelerini kullanın. Ok giriş yönünü gösterir.
7. **Çizgileri kaydet** düğmesine basın. Önizlemeyi yeniden açtığınızda çizgiler geri yüklenir.
8. **F11** ile tam ekranı açıp kapatın.

Canlı önizlemede **OCR başlat** düğmesi, seçili yerel modelle aynı kamera akışında tanımayı başlatır. Model yoksa önce Ayarlar/Tanıma ekranında model kurulumunu veya seçimini tamamlayın. OCR durdurulduğunda video açık kalır. Tanıma sonuçları kayıt yetkisiyle veritabanına yazılır; bunlar otomatik fiziksel geçiş sayımı değildir.

**Kamera kontrol merkezini aç** düğmesi 1/2/4/9/16 düzenlerini ve sayfalamayı açar. Kamera adına tıklayın veya görüntüye çift tıklayın: ayrıntı ekranı mevcut RTSP bağlantısını paylaşır. Ayrıntıyı kapatmak ızgaranın videosunu durdurmaz; o ayrıntıda başlatılan OCR ise durur. Gizli sayfalardaki kameraların bağlantıları merkez açıkken korunur. Merkez kapandığında bütün bağlantılar durdurulur.

Çizgiler şu anda çizim ve kayıt işlevini sağlar. Gerçek araç takibi ile otomatik geçiş sayımı henüz bağlanmamıştır. Eski ayrı “izle” OCR işi çalışıyorsa, kamera merkezini açmadan önce onu durdurun. Tüm kameralarda ayrıntı ekranından bağımsız sürekli OCR henüz tamamlanmadı.

Kamera ekleme sırasında görüntü gelmeden kayıt onayı etkinleşmez. Bağlantı başarısız olursa sınırlı sayıda yeniden deneme yapılır. Parola, adres ve codec hatalarının ayrıntılı ayrıştırılması sonraki kamera motoru çalışmasının parçasıdır.
