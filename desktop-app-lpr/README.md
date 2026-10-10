# 0.3.0 evaluation beta

See [release notes](docs/RELEASE_0.3.md) for current features, setup, tests and outstanding limitations. This is not a production barrier-control release.

Build on Windows: `python -m pip install -r requirements-windows.txt`, then `python scripts/build_windows.py`. Run the source UI with `python -c "from lpr.application import main; main()"`.

---

# IPScans LPR Pro — 0.2.0 geliştirme önizlemesi

Windows için bağımsız LPR motoru ve siyah/beyaz TR/EN test arayüzü. **Ticari üretim sürümü değildir.** Gerçek ONNX modelleriyle fotoğraf ve kayıtlı video işleme doğrulandı. Fiziksel kamera, gerçek Türk plaka veri seti ve bariyer saha testleri henüz yapılmadı.

## 0.2.0 ile gelen çalışan kesit

- ONNX YOLOv9 tespit + FastPlateOCR CCT OCR, CPU üzerinde yerel inference.
- Görüntü seçme, plaka kutusu, skor ve inceleme durumu gösteren PySide6 test konsolu.
- Arayüzden bağımsız inference süreci, durdurma, timeout ve TR/EN dil geçişi.
- Kayıtlı video için örnekleme, sınırlı kare sayısı ve EOF'ta durma; video yeniden oynatılmaz.
- Model/config SHA-256 doğrulaması; değerlendirme izni ticari kullanım onayından ayrıdır. `live` komutu değerlendirme modellerini kabul etmez.
- Sabit hash'lerle açıkça başlatılan model hazırlama betiği. Ağırlıklar ZIP'e dahil değildir.

## Windows test arayüzünü çalıştırma

Bu makinedeki teslim için `outputs/Start-LPR-Lab.ps1` çalıştırıcısı hazır ortamı ve sentetik örneği açar. Başka makinede paket dizininde Python 3.14 x64 ile:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements-lab.txt
.\.venv\Scripts\python scripts/prepare_evaluation_models.py
.\.venv\Scripts\python -m lpr.desktop --models models/evaluation/evaluation-models.json
```

`requirements-lab.txt` bu geliştirme makinesinde kullanılan doğrudan bağımlılıkları sabitler; tüm geçişli bağımlılıkların hash'li üretim lock dosyası değildir. Değerlendirme modelleri varsayılan olarak yalnız çevrimdışı fotoğraf/video için açılır. Seçim kutusunu kaldırmak ticari onay üretmez; manifest ayrıca onaylı olmalıdır.

```powershell
python -m lpr.cli image --models models/evaluation/evaluation-models.json --evaluation sample.jpg
python -m lpr.cli video --models models/evaluation/evaluation-models.json --evaluation sample.mp4 --every 2 --max-frames 300
```

Arayüz ticari ürünün altı ana ekranının tamamı değildir; Faz 2 test konsoludur. Fotoğraf sonucu aday okumadır, geçiş izni değildir. Fiziksel bariyer komutu yoktur. Kullanılan modellerin ve eğitim verisinin ticari yeniden dağıtım incelemesi açık olduğu için değerlendirme manifesti `commercial_use_approved: false` kalır.

## Hızlı başlangıç — model gerektirmez

Bu klasörde PowerShell açın:

```powershell
python -m lpr.cli doctor
python -m lpr.cli demo
python -m pytest -q
```

`demo` sentetik OCR okumalarını işler; AI tanıma veya canlı kamera gösterimi değildir. Üç aynı yüksek güvenli okumadan sonra bir `recognized` olayı, sonraki okumada `suppressed`, düşük güvende `review` üretir. Hiçbir bariyer komutu göndermez. Varsayılan veri deposu bellektedir; demo bitince silinir.

## Gerçek görüntü / kamera adaptörlerini çalıştırma

FastPlateOCR + ONNX yolu Python 3.14.3 üzerinde doğrulandı. Aşağıdaki PaddleOCR alternatifi için Python 3.11/3.12 x64 ayrı ortam önerisi korunuyor; PaddleOCR adaptörü henüz gerçek modelle doğrulanmadı.

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python -m pip install -e ".[vision,ocr,test]"
.\.venv\Scripts\python -m lpr.cli doctor
```

Bu komutlar hazırlık talimatıdır; gerçek model kurulumunun başarıyla çalıştırıldığı iddia edilmez. GPU için CPU `onnxruntime` yerine uyumlu `onnxruntime-gpu`, CUDA/cuDNN ve Paddle GPU kombinasyonu ayrıca seçilip kilitlenmeli; aynı ortamda iki ORT wheel'i kurulmaz.

1. Ticari kullanımı onaylanmış plaka detector ONNX ağırlığı ve PaddleOCR yerel recognition model klasörünü temin edin.
2. `examples/models.example.json` dosyasını model dosyalarının yanına kopyalayın. Provenance, lisans incelemesi, gerçek dosya adları ve hash'leri girin. Model dosyaları manifest klasörünün altında bulunmalıdır.
3. Detector çıktı sözleşmesini [mimari belgesinden](docs/ARCHITECTURE.md) doğrulayın. Nx6 ve manifestte açıkça seçilen Nx7 desteklenir; her YOLO export'u desteklenmez.

```powershell
python -m lpr.cli image --models models/models.json sample.jpg
# Kaynak URL'yi komut satırına/parola geçmişine yazmadan oturum için alır:
$sourceSecret = Read-Host 'RTSP URL' -AsSecureString
$env:IPSCANS_LPR_RTSP = [System.Net.NetworkCredential]::new('', $sourceSecret).Password
python -m lpr.cli live --models models/models.json --camera gate-1 --seconds 60
Remove-Item Env:IPSCANS_LPR_RTSP
```

Ortam değişkeni yalnız geliştirme içindir; kalıcı credential kasası uygulanmadı. Yerel stdout plaka içerir: gerçek kişisel veriyi paylaşılan terminal/loglarda çalıştırmayın. Kamera okuma kaynaklı hata çıktıları kaynak URL içermez. `--database path.db` açıkça verilirse olaylar diske yazılır; üretim RBAC/şifreleme henüz yoktur.

## Doğruluk ölçümü

`examples/dataset.example.json` şablonundan, kullanımı izinli ve her görüntüde sıfır/bir plaka olan bağımsız test kümesi hazırlayın:

```powershell
python -m lpr.cli benchmark --models models/models.json --dataset dataset/manifest.json --output benchmark.json
```

Çıktı exact-match accuracy, plaka precision/recall, CER ve p50/p95 **inference** gecikmesini içerir. RTSP taşıma gecikmesi, çoklu plaka detection IoU mAP veya takip doğruluğu değildir. Yanlış okuma hem FP hem FN sayılır; negatif görüntüler FP ölçümü için zorunlu test planı parçasıdır. CER yalnız gerçek plaka bulunan görüntüler üzerinden hesaplanır. Null metrik, ölçülebilir payda bulunmadığı anlamına gelir.

## Teslim durumu

- [Mimari ve mevcut IPScans analizi](docs/ARCHITECTURE.md)
- [Faz bazlı görevler ve kabul ölçütleri](docs/PLAN.md)
- [Lisans kaynakları ve açık incelemeler](docs/LICENSES.md)
- [Test raporu](docs/TEST_REPORT.md)
- [Ham doğrulama çıktısı](docs/verification.json)

Üretim dağıtımı yapılmadı. Faz 2'nin saha kabulü için ticari ağırlık/veri incelemesi, gerçek Türk plaka test kümesi ve yetkili kamera erişimi gereklidir. [0.2.0 ölçümleri ve sınırlar](docs/PHASE2_0.2.md).
