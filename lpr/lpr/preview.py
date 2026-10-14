"""Model-independent, latest-frame Qt preview. Capture never runs on the UI thread."""
import time
import uuid
from dataclasses import replace
import math
from queue import Empty

from PySide6.QtCore import Qt, QTimer, QPointF
from PySide6.QtGui import QImage, QPainter, QPen, QShortcut, QKeySequence
from PySide6.QtWidgets import QDialog, QVBoxLayout, QLabel, QPushButton, QWidget, QHBoxLayout, QInputDialog

from .camera import CameraConfig, CameraWorker
from .lines import CrossingLine, video_rectangle, normalized_point


class VideoSurface(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.image = QImage()
        self.lines = []
        self.selected = None
        self.drawing = False
        self.drag = None
        self.draft = None
        self.setMinimumSize(480, 270)
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)

    def video_rect(self):
        return video_rectangle(self.width(),self.height(),self.image.width(),self.image.height())

    def screen_point(self,point):
        x,y,w,h=self.video_rect()
        return QPointF(x+point[0]*w,y+point[1]*h)

    def event_point(self,event):
        if self.image.isNull():return None
        return normalized_point(event.position().x(),event.position().y(),self.video_rect())

    def set_frame(self, frame):
        # Detach from the capture-owned array before the next native read.
        h, w = frame.shape[:2]
        self.image = QImage(frame.data, w, h, frame.strides[0], QImage.Format.Format_BGR888).copy()
        self.update()

    def clear(self):
        self.image = QImage()
        self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.fillRect(self.rect(), Qt.GlobalColor.black)
        if not self.image.isNull():
            size = self.image.size().scaled(self.size(), Qt.AspectRatioMode.KeepAspectRatio)
            x, y = (self.width()-size.width())//2, (self.height()-size.height())//2
            painter.drawImage(x, y, self.image.scaled(size, Qt.AspectRatioMode.KeepAspectRatio,
                                                   Qt.TransformationMode.SmoothTransformation))
            painter.setRenderHint(QPainter.RenderHint.Antialiasing)
            for line in self.lines:
                painter.setPen(QPen(Qt.GlobalColor.white,3 if line.id==self.selected else 2))
                a,b=self.screen_point(line.start),self.screen_point(line.end)
                painter.drawLine(a,b)
                painter.drawEllipse(a,5,5);painter.drawEllipse(b,5,5)
                middle=(a+b)/2
                dx,dy=b.x()-a.x(),b.y()-a.y()
                length=math.hypot(dx,dy)
                sign=1 if line.positive_direction=="entry" else -1
                tip=middle+QPointF(-dy/length*24*sign,dx/length*24*sign)
                painter.drawLine(middle,tip)
                back=tip-QPointF(-dy/length*7*sign,dx/length*7*sign)
                painter.drawLine(tip,back+QPointF(dx/length*4,dy/length*4))
                painter.drawLine(tip,back-QPointF(dx/length*4,dy/length*4))
                painter.drawText(tip+QPointF(6,-6),f"{line.name} · Giriş")
            if self.draft:
                painter.setPen(QPen(Qt.GlobalColor.white,2,Qt.PenStyle.DashLine))
                painter.drawLine(self.screen_point(self.draft[0]),self.screen_point(self.draft[1]))

    def mousePressEvent(self,event):
        if event.button()!=Qt.MouseButton.LeftButton:return
        point=self.event_point(event)
        if point is None:return
        if self.drawing:
            self.draft=(point,point)
            return
        self.selected=None
        for line in reversed(self.lines):
            a,b=self.screen_point(line.start),self.screen_point(line.end)
            p=event.position()
            for field,end in (("start",a),("end",b)):
                if math.hypot(p.x()-end.x(),p.y()-end.y())<=12:
                    self.selected=line.id;self.drag=(line,field,point);return
            dx,dy=b.x()-a.x(),b.y()-a.y()
            t=max(0,min(1,((p.x()-a.x())*dx+(p.y()-a.y())*dy)/(dx*dx+dy*dy)))
            if math.hypot(p.x()-a.x()-t*dx,p.y()-a.y()-t*dy)<=10:
                self.selected=line.id;self.drag=(line,"move",point);return
        self.update()

    def mouseMoveEvent(self,event):
        point=self.event_point(event)
        if point is None:return
        if self.draft:
            self.draft=(self.draft[0],point)
        elif self.drag:
            line,field,origin=self.drag
            try:
                if field=="move":
                    dx,dy=point[0]-origin[0],point[1]-origin[1]
                    dx=max(-min(line.start[0],line.end[0]),min(dx,1-max(line.start[0],line.end[0])))
                    dy=max(-min(line.start[1],line.end[1]),min(dy,1-max(line.start[1],line.end[1])))
                    updated=replace(line,start=(line.start[0]+dx,line.start[1]+dy),end=(line.end[0]+dx,line.end[1]+dy))
                else:updated=replace(line,**{field:point})
                self.lines=[updated if old.id==line.id else old for old in self.lines]
            except ValueError:pass
        self.update()

    def mouseReleaseEvent(self,event):
        if event.button()!=Qt.MouseButton.LeftButton:return
        if self.draft and len(self.lines)<16:
            try:
                line=CrossingLine(uuid.uuid4().hex,f"Çizgi {len(self.lines)+1}",*self.draft)
                self.lines.append(line);self.selected=line.id
            except ValueError:pass
        self.draft=None;self.drag=None;self.drawing=False;self.update()

    def delete_selected(self):
        self.lines=[line for line in self.lines if line.id!=self.selected]
        self.selected=None;self.update()

    def keyPressEvent(self,event):
        if event.key()==Qt.Key.Key_Delete:self.delete_selected()
        elif event.key()==Qt.Key.Key_Escape:
            self.draft=None;self.drag=None;self.drawing=False;self.update()
        else:super().keyPressEvent(event)


ERRORS = {
    "open_failed": "Akış açılamadı. Adres, ağ erişimi ve kullanıcı bilgilerini kontrol edin.",
    "no_decoded_frame": "Oturum açıldı ancak çözülen kare alınamadı. Akışı ve codec desteğini kontrol edin.",
    "stream_interrupted": "Görüntü akışı kesildi. Kamera ve ağ bağlantısını kontrol edin.",
    "frame_too_large": "Görüntü kapasite sınırını aşıyor. Kamera alt akışını seçin.",
    "capture_failed": "Görüntü yakalama başarısız. Video bileşenlerini ve kamera ayarlarını kontrol edin.",
}


class PreviewDialog(QDialog):
    def __init__(self, source, camera_id, parent=None, *, worker_factory=CameraWorker,
                 authorize=lambda: None, confirm_connection=False, lines=(), save_lines=None):
        super().__init__(parent)
        self.setWindowTitle("LPR PRO · Canlı kamera")
        self.resize(960, 640)
        self.authorize = authorize
        self.worker = worker_factory(CameraConfig(source, camera_id=camera_id))
        self.last_frame_at = None
        self.closing = False
        self.result_code = QDialog.DialogCode.Rejected
        layout = QVBoxLayout(self)
        self.surface = VideoSurface(self)
        self.surface.lines = list(lines)
        layout.addWidget(self.surface, 1)
        if save_lines is not None:
            controls=QHBoxLayout()
            def add(label,callback):
                button=QPushButton(label);button.clicked.connect(callback);controls.addWidget(button)
            add("Çizgi çiz",lambda:setattr(self.surface,"drawing",True))
            add("Adlandır",self.rename_line)
            add("Yönü ters çevir",self.reverse_line)
            add("Sil",self.surface.delete_selected)
            def save():
                try:
                    self.authorize()
                    save_lines(self.surface.lines)
                    self.line_status.setText("Çizgiler kaydedildi.")
                except (ValueError,PermissionError):
                    self.line_status.setText("Çizgiler kaydedilemedi. Oturumu ve çizgileri kontrol edin.")
            add("Çizgileri kaydet",save)
            layout.addLayout(controls)
            self.line_status=QLabel("Çizgi çiz: sürükleyin. Düzenle: uçları veya çizgiyi sürükleyin. Delete: sil. Değişiklikleri kaydedin.")
            self.line_status.setWordWrap(True);layout.addWidget(self.line_status)
        self.status = QLabel("Bağlanıyor… İlk çözülen kare bekleniyor.")
        self.status.setWordWrap(True)
        layout.addWidget(self.status)
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
        self.worker.start()

    def toggle_fullscreen(self):
        if self.isFullScreen():self.showNormal()
        else:self.showFullScreen()

    def rename_line(self):
        for line in self.surface.lines:
            if line.id==self.surface.selected:
                name,ok=QInputDialog.getText(self,"PTS çizgisi","Ad",text=line.name)
                if ok and name.strip() and len(name)<=120:
                    self.surface.lines=[replace(old,name=name.strip()) if old.id==line.id else old for old in self.surface.lines]
                    self.surface.update()
                break

    def reverse_line(self):
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
            self.status.setText(f"{state} · {error} · Yeniden bağlantı: {self.worker.reconnects}")
        else:
            if self.confirm_button is not None:
                self.confirm_button.setEnabled(True)
            width, height = self.worker.resolution
            age = (now-self.last_frame_at)*1000
            self.status.setText(f"CANLI · {width}×{height} · {self.worker.fps:.1f} FPS · "
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
        self.worker.stop()
        # Never abandon a native reader or block Qt while its read timeout expires.
        if self.worker.is_alive():
            self.surface.clear()
            self.status.setText("Kamera bağlantısı kapatılıyor…")
            self.close_button.setEnabled(False)
            QTimer.singleShot(100, self.close)
            event.ignore()
            return
        self.timer.stop()
        self.done(self.result_code)
        event.accept()

    def reject(self):
        self.close()
