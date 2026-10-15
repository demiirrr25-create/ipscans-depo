"""Camera grid with one capture per camera, reused by detail and OCR views."""
import math
import time
from queue import Empty

from PySide6.QtCore import Qt,QTimer,Signal
from PySide6.QtWidgets import QDialog,QWidget,QVBoxLayout,QHBoxLayout,QGridLayout,QLabel,QComboBox,QPushButton

from .camera import CameraConfig,CameraWorker
from .preview import VideoSurface


class CameraTile(QWidget):
    activated=Signal(str)

    def __init__(self,camera,parent=None):
        super().__init__(parent)
        self.camera_id=camera["id"]
        self.sequence=-1
        layout=QVBoxLayout(self)
        layout.setContentsMargins(4,4,4,4)
        title=QPushButton(camera["name"])
        title.clicked.connect(lambda:self.activated.emit(self.camera_id))
        title.setToolTip("Kamera ayrıntısı, PTS çizgileri ve OCR")
        layout.addWidget(title)
        self.surface=VideoSurface()
        self.surface.setMinimumSize(160,90)
        self.surface.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents)
        layout.addWidget(self.surface,1)
        self.status=QLabel("Bağlanıyor…")
        self.status.setWordWrap(True)
        layout.addWidget(self.status)

    def mouseDoubleClickEvent(self,event):
        if event.button()==Qt.MouseButton.LeftButton:self.activated.emit(self.camera_id)

    def poll(self,worker):
        frame,_=worker.snapshot()
        if worker.status!="connected" or frame is None or not 0<=time.monotonic()-frame.captured_at<=2:
            self.surface.clear()
            self.status.setText(f"{worker.status} · Yeniden bağlantı: {worker.reconnects}")
            return
        if frame.sequence!=self.sequence:
            self.surface.set_frame(frame.image)
            self.sequence=frame.sequence
        width,height=worker.resolution
        self.status.setText(f"CANLI · {getattr(worker,'active_transport','tcp').upper()} · {width}×{height} · {worker.fps:.1f} FPS")


class CameraCenter(QDialog):
    def __init__(self,cameras,parent=None,*,authorize,open_detail,worker_factory=CameraWorker,pipeline_factory=None,on_result=None):
        super().__init__(parent)
        if not 1<=len(cameras)<=16 or len({c["id"] for c in cameras})!=len(cameras):
            raise ValueError("Use 1..16 unique cameras")
        authorize()
        self.authorize,self.open_detail=authorize,open_detail
        self.cameras=list(cameras)
        self.workers={}
        self.tiles={}
        self.page=0
        self.closing=False
        self.inference=None;self.pipeline_factory=pipeline_factory;self.on_result=on_result;self.delivery_failed=False
        self.setWindowTitle("LPR PRO · Kamera kontrol merkezi")
        self.resize(1440,900)
        root=QVBoxLayout(self)
        controls=QHBoxLayout()
        self.layout_choice=QComboBox();self.layout_choice.addItems(["1","2","4","9","16"])
        default=next(n for n in (1,2,4,9,16) if n>=len(cameras))
        self.layout_choice.setCurrentText(str(default))
        self.layout_choice.currentIndexChanged.connect(self.layout_changed)
        controls.addWidget(QLabel("Görünüm"));controls.addWidget(self.layout_choice)
        self.previous=QPushButton("Önceki");self.previous.clicked.connect(lambda:self.change_page(-1))
        self.next=QPushButton("Sonraki");self.next.clicked.connect(lambda:self.change_page(1))
        controls.addWidget(self.previous);controls.addWidget(self.next)
        self.health=QLabel();controls.addWidget(self.health,1)
        root.addLayout(controls)
        self.ocr_button=QPushButton('Tüm kameralarda OCR başlat');self.ocr_button.setEnabled(pipeline_factory is not None)
        self.ocr_button.clicked.connect(self.toggle_ocr);root.addWidget(self.ocr_button)
        self.ocr_health=QLabel('OCR kapalı');root.addWidget(self.ocr_health)
        self.grid=QGridLayout();root.addLayout(self.grid,1)
        for camera in cameras:
            tile=CameraTile(camera,self)
            tile.activated.connect(self.detail)
            self.tiles[camera["id"]]=tile
            self.workers[camera["id"]]=worker_factory(CameraConfig(camera["source"],camera_id=camera["id"],transport=camera.get('transport','tcp')))
        self.relayout()
        close=QPushButton("Kapat");close.clicked.connect(self.close);root.addWidget(close)
        self.timer=QTimer(self);self.timer.timeout.connect(self.poll)
        try:
            for worker in self.workers.values():worker.start()
        except Exception:
            for worker in self.workers.values():worker.stop()
            for worker in self.workers.values():
                if worker.ident is not None:worker.join(7)
            raise
        self.timer.start(66)

    def layout_changed(self):
        self.page=0;self.relayout()

    def change_page(self,delta):
        count=int(self.layout_choice.currentText())
        pages=math.ceil(len(self.cameras)/count)
        self.page=max(0,min(pages-1,self.page+delta));self.relayout()

    def relayout(self):
        while self.grid.count():self.grid.takeAt(0).widget().hide()
        count=int(self.layout_choice.currentText())
        columns=2 if count==2 else math.isqrt(count)
        for index,camera in enumerate(self.cameras[self.page*count:(self.page+1)*count]):
            tile=self.tiles[camera["id"]]
            self.grid.addWidget(tile,index//columns,index%columns);tile.show()
        self.previous.setEnabled(self.page>0)
        self.next.setEnabled((self.page+1)*count<len(self.cameras))

    def detail(self,camera_id):
        if self.closing:return
        if self.inference is not None and self.inference.is_alive():
            self.ocr_health.setText('Çizgileri düzenlemek veya tek kamera OCR açmak için önce toplu OCR’ı durdurun.')
            return
        try:
            self.authorize()
            self.open_detail(camera_id,self.workers[camera_id],self)
        except PermissionError:self.close()

    def poll(self):
        if self.closing:return
        try:self.authorize()
        except PermissionError:
            self.close();return
        online=0
        for camera_id,worker in self.workers.items():
            frame,_=worker.snapshot()
            if worker.status=="connected" and frame is not None and 0<=time.monotonic()-frame.captured_at<=2:online+=1
            tile=self.tiles[camera_id]
            if not tile.isHidden():tile.poll(worker)
        self.health.setText(f"Canlı: {online} · Görüntü beklenen/çevrimdışı: {len(self.workers)-online}")
        self.poll_ocr()

    def toggle_ocr(self):
        self.authorize()
        if self.inference is not None and self.inference.is_alive():self.inference.stop();return
        from .fleet_inference import FleetInference
        self.delivery_failed=False
        self.inference=FleetInference(self.workers,self.cameras,self.pipeline_factory)
        self.inference.start();self.ocr_button.setText('Toplu OCR durdur')

    def poll_ocr(self):
        inference=self.inference
        if inference is None:return
        if not self.delivery_failed:
            for _ in range(64):
                try:result=inference.results.get_nowait()
                except Empty:break
                try:
                    self.authorize()
                    if self.on_result is not None:self.on_result(result)
                except Exception:
                    self.delivery_failed=True;inference.stop();break
        processed=sum(s['processed'] for s in inference.states.values())
        failed=sum(s['status']=='inference_failed' for s in inference.states.values())
        self.ocr_health.setText('Kayıt hatası: toplu OCR durduruldu.' if self.delivery_failed else
                               f'OCR: {inference.status} · İşlenen kare: {processed} · Hatalı kamera: {failed}')
        if not inference.is_alive():self.ocr_button.setText('Tüm kameralarda OCR başlat')

    def closeEvent(self,event):
        self.closing=True
        if self.inference is not None:self.inference.stop()
        for worker in self.workers.values():worker.stop()
        for tile in self.tiles.values():tile.surface.clear()
        if any(worker.is_alive() for worker in self.workers.values()) or (self.inference is not None and self.inference.is_alive()):
            self.health.setText("Kamera bağlantıları kapatılıyor…")
            QTimer.singleShot(100,self.close);event.ignore();return
        self.poll_ocr();self.timer.stop()
        self.done(QDialog.DialogCode.Rejected);event.accept()

    def reject(self):self.close()
