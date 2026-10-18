"""Model-independent, latest-frame Qt preview. Capture never runs on the UI thread."""
import time
from dataclasses import replace
from queue import Empty

from PySide6.QtCore import QTimer
from PySide6.QtGui import QShortcut, QKeySequence
from PySide6.QtWidgets import QDialog, QVBoxLayout, QLabel, QPushButton, QInputDialog, QListWidget

from .camera import CameraConfig, CameraWorker


from .calibration_ui import CalibrationSurface as VideoSurface, CalibrationControls
from .calibration import CameraCalibration
from .theme import apply_theme


ERRORS = {
    "open_failed": "Akış açılamadı. Adres, ağ erişimi ve kullanıcı bilgilerini kontrol edin.",
    "no_decoded_frame": "Oturum açıldı ancak çözülen kare alınamadı. Akışı ve codec desteğini kontrol edin.",
    "stream_interrupted": "Görüntü akışı kesildi. Kamera ve ağ bağlantısını kontrol edin.",
    "frame_too_large": "Görüntü kapasite sınırını aşıyor. Kamera alt akışını seçin.",
    "capture_failed": "Görüntü yakalama başarısız. Video bileşenlerini ve kamera ayarlarını kontrol edin.",
}


class PreviewDialog(QDialog):
    def __init__(self, source, camera_id, parent=None, *, worker_factory=CameraWorker,
                 authorize=lambda: None, confirm_connection=False, lines=(), save_lines=None,
                 pipeline_factory=None,on_result=None,region=None,capture_worker=None,transport='tcp',
                 calibration=None,save_calibration=None,decoder_mode='software'):
        super().__init__(parent)
        self.setWindowTitle("LPR PRO · Canlı kamera")
        self.resize(1100, 780)
        apply_theme(self)
        self.authorize = authorize
        self.owns_capture=capture_worker is None
        self.worker = capture_worker if capture_worker is not None else worker_factory(CameraConfig(source, camera_id=camera_id,transport=transport,decoder_mode=decoder_mode))
        self.last_frame_at = None
        self.closing = False
        self.result_code = QDialog.DialogCode.Rejected
        self.pipeline_factory=pipeline_factory
        self.on_result=on_result
        self.region=region
        self.inference=None
        self.ocr_enabled=False
        self.ocr_delivery_failed=False
        self.pending_result=None
        self.delivery_retry_at=0.
        layout = QVBoxLayout(self)
        self.surface = VideoSurface(self)
        self.surface.set_calibration(calibration if calibration is not None else CameraCalibration.from_legacy(lines,region))
        self.surface.geometryEditing.connect(self.invalidate_lines)
        layout.addWidget(self.surface, 1)
        if save_calibration is not None or save_lines is not None:
            save=save_calibration if save_calibration is not None else lambda value:save_lines(value.trigger_lines)
            self.calibration_controls=CalibrationControls(self.surface,save,self.authorize,self,legacy_only=save_calibration is None)
            self.line_status=self.calibration_controls.status
            layout.addWidget(self.calibration_controls)
        self.status = QLabel("Bağlanıyor… İlk çözülen kare bekleniyor.")
        self.status.setWordWrap(True)
        layout.addWidget(self.status)
        if pipeline_factory is not None:
            self.ocr_button=QPushButton("OCR başlat")
            self.ocr_button.clicked.connect(self.toggle_ocr)
            layout.addWidget(self.ocr_button)
            self.ocr_status=QLabel("OCR kapalı · Canlı görüntü bağımsız çalışır.")
            self.ocr_status.setWordWrap(True);layout.addWidget(self.ocr_status)
            self.readings=QListWidget();self.readings.setMaximumHeight(100)
            layout.addWidget(self.readings)
        self.confirm_button = None
        if confirm_connection:
            self.confirm_button = QPushButton("Görüntü doğrulandı · Kamerayı kaydet")
            self.confirm_button.setEnabled(False)
            self.confirm_button.clicked.connect(self.confirm)
            layout.addWidget(self.confirm_button)
        self.close_button = QPushButton("Kapat")
        self.close_button.clicked.connect(self.close)
        self.fullscreen_button = QPushButton("Tam ekran / F11")
        self.fullscreen_button.clicked.connect(self.toggle_fullscreen)
        layout.addWidget(self.fullscreen_button)
        self.fullscreen_shortcut=QShortcut(QKeySequence("F11"),self)
        self.fullscreen_shortcut.activated.connect(self.toggle_fullscreen)
        layout.addWidget(self.close_button)
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.poll)
        self.timer.start(33)
        if self.owns_capture:self.worker.start()

    def toggle_ocr(self):
        if self.closing:return
        try:self.authorize()
        except PermissionError:
            self.close();return
        if self.inference is not None and self.inference.is_alive():
            self.ocr_enabled=False
            self.inference.stop()
            self.ocr_button.setEnabled(False)
            self.ocr_button.setText("OCR durduruluyor…")
            return
        self.poll_ocr()
        if self.pending_result is not None or (self.inference is not None and not self.inference.results.empty()):
            return
        from .live_inference import LiveInference
        self.inference=LiveInference(self.worker,self.pipeline_factory,region=self.region,lines=self.surface.lines,calibration=self.surface.calibration())
        self.ocr_enabled=True
        self.ocr_delivery_failed=False
        self.inference.start()
        self.ocr_button.setText("OCR durdur")

    def invalidate_lines(self):
        if self.inference is not None and self.inference.is_alive():
            self.ocr_enabled=False
            self.inference.stop()
            self.ocr_button.setEnabled(False)
            self.ocr_button.setText("Çizgi düzenleniyor · OCR durduruluyor…")

    def poll_ocr(self):
        inference=self.inference
        if inference is None:return
        if time.monotonic()>=self.delivery_retry_at:
            for _ in range(16):
                if self.pending_result is None:
                    try:result=inference.results.get_nowait()
                    except Empty:break
                    _,generation=self.worker.snapshot()
                    if result["generation"]!=generation:
                        # Validated crossings remain historical events when a
                        # new camera connection replaces the live preview.
                        if not result.get("passages"):continue
                        result={**result,"decisions":[]}
                    self.pending_result=result
                try:
                    if not self.closing:self.authorize()
                    if self.on_result is not None:self.on_result(self.pending_result)
                except Exception:
                    self.ocr_delivery_failed=True;self.ocr_enabled=False
                    inference.stop();self.delivery_retry_at=time.monotonic()+1
                    break
                result=self.pending_result;self.pending_result=None;self.ocr_delivery_failed=False
                for decision in result["decisions"]:
                    if decision["status"] in {"recognized","review","candidate"}:
                        self.readings.insertItem(0,f'{decision["plate"]} · {decision["confidence"]:.1%} · {decision["status"]}')
                for passage in result.get("passages",[]):
                    self.readings.insertItem(0,f'{passage["direction"]} · {passage["vehicle_type"]} · {passage["plate"] or "Plaka okunamadı"} · {passage["status"]}')
                while self.readings.count()>50:self.readings.takeItem(self.readings.count()-1)
        labels={"loading_models":"Modeller yükleniyor","waiting_for_frame":"Kare bekleniyor",
                "analyzing":"OCR çalışıyor","stopped":"OCR durdu",
                "inference_failed":"OCR başarısız; model dosyalarını ve video bileşenlerini kontrol edin",
                "result_queue_full":"Kayıt kuyruğu doldu; OCR durdu. Kayıt işleme hızını kontrol edin"}
        state="Kayıt bekliyor; OCR durduruldu. Teslim yeniden denenecek" if self.ocr_delivery_failed else labels.get(inference.status,inference.status)
        latency="" if inference.inference_ms is None else f" · {inference.inference_ms:.0f} ms/kare"
        passage_labels={"enabled":"Araç geçişi açık","no_lines":"Geçiş için çizgi tanımlayın",
                        "no_vehicle_model":"Araç modeli yok; geçiş hesabı kapalı","loading":""}
        passage_label=passage_labels.get(getattr(inference,"passage_status","loading"),"")
        self.ocr_status.setText(f"{state} · İşlenen kare: {inference.processed}{latency} · {passage_label}")
        if not inference.is_alive():
            pending=self.pending_result is not None or not inference.results.empty()
            self.ocr_button.setEnabled(not pending)
            self.ocr_button.setText("Sonuçlar kaydediliyor…" if pending else "OCR başlat")

    def toggle_fullscreen(self):
        if self.isFullScreen():self.showNormal()
        else:self.showFullScreen()

    def rename_line(self):
        for line in self.surface.lines:
            if line.id==self.surface.selected:
                name,ok=QInputDialog.getText(self,"PTS çizgisi","Ad",text=line.name)
                if ok and name.strip() and len(name)<=120:
                    self.invalidate_lines()
                    self.surface.lines=[replace(old,name=name.strip()) if old.id==line.id else old for old in self.surface.lines]
                    self.surface.update()
                break

    def reverse_line(self):
        self.invalidate_lines()
        self.surface.lines=[replace(line,positive_direction="exit" if line.positive_direction=="entry" else "entry")
                            if line.id==self.surface.selected else line for line in self.surface.lines]
        self.surface.update()

    def poll(self):
        if self.closing:
            return
        try:
            self.authorize()
        except PermissionError:
            self.close()
            return
        self.poll_ocr()
        try:
            frame = self.worker.frames.get_nowait()
        except Empty:
            frame = None
        now = time.monotonic()
        if frame is not None and 0 <= now-frame.captured_at <= 2:
            self.surface.set_frame(frame.image)
            self.last_frame_at = frame.captured_at
        state = self.worker.status
        if state != "connected" or self.last_frame_at is None or now-self.last_frame_at > 2:
            if self.confirm_button is not None:
                self.confirm_button.setEnabled(False)
            self.surface.clear()
            error = ERRORS.get(self.worker.last_error, "İlk çözülen kare bekleniyor.")
            self.status.setText(f"{state} · {self.worker.active_transport.upper()} · {error} · Yeniden bağlantı: {self.worker.reconnects}")
        else:
            if self.confirm_button is not None:
                self.confirm_button.setEnabled(True)
            width, height = self.worker.resolution
            age = (now-self.last_frame_at)*1000
            self.status.setText(f"CANLI · {self.worker.active_transport.upper()} · {width}×{height} · {self.worker.fps:.1f} FPS · "
                                f"Çözüm sonrası kare yaşı: {age:.0f} ms")

    def confirm(self):
        try:self.authorize()
        except PermissionError:
            self.close()
            return
        if self.worker.status != "connected" or self.last_frame_at is None or time.monotonic()-self.last_frame_at > 2:
            return
        self.result_code = QDialog.DialogCode.Accepted
        self.close()

    def closeEvent(self, event):
        self.closing = True
        self.surface.clear()
        if self.confirm_button is not None:
            self.confirm_button.setEnabled(False)
        if self.owns_capture:self.worker.stop()
        if self.inference is not None:self.inference.stop()
        self.poll_ocr()
        # Never abandon a native reader or block Qt while its read timeout expires.
        pending=self.pending_result is not None or (self.inference is not None and not self.inference.results.empty())
        if (self.owns_capture and self.worker.is_alive()) or (self.inference is not None and self.inference.is_alive()) or pending:
            self.surface.clear()
            self.status.setText("Kamera bağlantısı kapatılıyor…")
            if self.ocr_delivery_failed:self.status.setText("Bekleyen geçiş kaydedilemiyor. Disk erişimini düzeltin; kayıt bellekte korunuyor ve yeniden denenecek.")
            self.close_button.setEnabled(False)
            QTimer.singleShot(100, self.close)
            event.ignore()
            return
        self.timer.stop()
        self.done(self.result_code)
        event.accept()

    def reject(self):
        self.close()
