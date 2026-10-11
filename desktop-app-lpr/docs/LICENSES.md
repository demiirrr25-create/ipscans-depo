# Bağımlılık ve model lisans incelemesi

10 Ekim 2026 tarihinde resmî kaynaklardan başlangıç incelemesi. Dağıtım onayı değildir; seçilecek tam sürümler, modeller ve binary transitive bağımlılıklar için SBOM ve NOTICE incelemesi gereklidir.

## 0.2.0 değerlendirme adayları

[Open Image Models](https://github.com/ankandrew/open-image-models/blob/main/LICENSE) ve [FastPlateOCR](https://github.com/ankandrew/fast-plate-ocr/blob/master/LICENSE) kaynakları MIT lisanslıdır. YOLOv9 t-384 plaka tespit ağırlığı ve CCT XS v2 OCR modeli resmî proje release varlıklarından yalnız yerel offline denemeler için indirildi. Kaynak URL, byte sayısı ve SHA-256 değerleri `inference-smoke.json` içindedir. Tam eğitim verisi ve ağırlık yeniden dağıtım incelemesi bitmedi; kapalı kaynak ticari paket için onay verilmedi. Modeller ve üçüncü taraf fotoğraf kaynak ZIP'e eklenmedi.

[FastALPR örnek fotoğrafı](https://github.com/ankandrew/fast-alpr/blob/master/assets/test_image.png) yalnız entegrasyon smoke testi için kullanıldı; bağımsız bir doğruluk veri seti veya ürün görseli olarak dağıtılmadı. Gerçek araç fotoğrafında bir yabancı plaka bulunuyor; TR doğrulayıcısı bunu otomatik kabul etmez.

| Aday | Bulgu | Karar |
|---|---|---|
| ONNX Runtime | kaynak deposu MIT lisansı | inference adayı; model lisansını belirlemez |
| PaddleOCR | kaynak deposu Apache-2.0 | OCR adayı; seçilen ağırlıklar, eğitim verisi ve dağıtım hakları ayrıca kontrol |
| Ultralytics YOLO | AGPL-3.0 / Enterprise lisans seçenekleri | kapalı kaynak dağıtımda koşullar değerlendirilmeden paketlenmez; ONNX export lisans yükümlülüklerini kaldırmaz |
| PySide6/Qt | bu teslimde bağımlılık adayı; ayrıntılı dağıtım incelemesi açık | LGPL/commercial koşulları ve kullanılan Qt modülleri Faz 5 öncesi incelenecek |
| OpenCV / FFmpeg | bu makinedeki wheel test amaçlı kullanıldı | dağıtılacak wheel ve codec derleme seçenekleri için ayrı inceleme |

Kaynaklar:
- [ONNX Runtime LICENSE](https://github.com/microsoft/onnxruntime/blob/main/LICENSE)
- [ONNX Runtime Python kurulumu](https://onnxruntime.ai/docs/get-started/with-python.html)
- [PaddleOCR LICENSE](https://github.com/PaddlePaddle/PaddleOCR/blob/main/LICENSE)
- [PaddleOCR TextRecognition API](https://www.paddleocr.ai/main/en/version3.x/module_usage/text_recognition.html)
- [Ultralytics lisans seçenekleri](https://www.ultralytics.com/license)

Model manifesti `source`, `license`, inceleyen kişi/tarih, ticari kullanım kararı ve SHA-256 ister. Bu kayıt operatör beyanıdır; hukuki onayı veya imzalı tedarik zincirini teknik olarak kanıtlamaz. Örnek manifest bilerek onaysızdır ve çalıştırılamaz. Model ağırlığı veya veri seti teslim paketine eklenmedi.
