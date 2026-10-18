"""Live-video calibration canvas and bounded, undoable geometry editing."""
from dataclasses import replace
import math
import uuid

from PySide6.QtCore import Qt, QPointF, QRectF, Signal
from PySide6.QtGui import QImage, QPainter, QPen, QColor, QPolygonF
from PySide6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QComboBox, QSpinBox, QDoubleSpinBox, QInputDialog, QFormLayout)

from .calibration import CameraCalibration, CalibrationRegion, RecognitionLine
from .lines import CrossingLine, video_rectangle, normalized_point


class CalibrationSurface(QWidget):
    geometryEditing=Signal()
    selectionChanged=Signal()
    documentChanged=Signal()

    def __init__(self,parent=None):
        super().__init__(parent)
        self.image=QImage()
        self.lines=[];self.recognition_lines=[];self.regions=[]
        self.policy=CameraCalibration()
        self.selected=None;self.drawing=False;self.tool="edit"
        self.drag=None;self.draft=None;self.polygon=[]
        self.history=[];self.waiting_second=False
        self.setMinimumSize(480,270)
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)

    def calibration(self):
        return replace(self.policy,trigger_lines=tuple(self.lines),recognition_lines=tuple(self.recognition_lines),regions=tuple(self.regions))

    def set_calibration(self,value,*,clear_history=True):
        if not isinstance(value,CameraCalibration):raise ValueError("Invalid calibration")
        self.policy=value
        self.lines=list(value.trigger_lines);self.recognition_lines=list(value.recognition_lines);self.regions=list(value.regions)
        self.selected=None;self.cancel_draft()
        if clear_history:self.history.clear()
        self.selectionChanged.emit();self.documentChanged.emit();self.update()

    def checkpoint(self):
        current=self.calibration()
        if not self.history or self.history[-1]!=current:
            self.history.append(current)
            self.history=self.history[-50:]
        self.geometryEditing.emit()

    def undo(self):
        if not self.history:return
        self.geometryEditing.emit()
        self.set_calibration(self.history.pop(),clear_history=False)

    def reset_geometry(self):
        self.checkpoint()
        self.set_calibration(CameraCalibration(),clear_history=False)

    def set_tool(self,tool):
        self.cancel_draft();self.tool=tool;self.drawing=tool=="trigger"
        self.setCursor(Qt.CursorShape.ArrowCursor if tool=="edit" else Qt.CursorShape.CrossCursor)
        self.setFocus()

    def cancel_draft(self):
        self.draft=None;self.drag=None;self.polygon=[];self.waiting_second=False
        self.update()

    def video_rect(self):
        return video_rectangle(self.width(),self.height(),self.image.width(),self.image.height())

    def screen_point(self,point):
        x,y,w,h=self.video_rect()
        return QPointF(x+point[0]*w,y+point[1]*h)

    def event_point(self,event):
        if self.image.isNull():return None
        return normalized_point(event.position().x(),event.position().y(),self.video_rect())

    def set_frame(self,frame):
        h,w=frame.shape[:2]
        self.image=QImage(frame.data,w,h,frame.strides[0],QImage.Format.Format_BGR888).copy()
        self.update()

    def clear(self):
        self.image=QImage();self.update()

    def objects(self):return self.lines+self.recognition_lines+self.regions

    def selected_object(self):return next((obj for obj in self.objects() if obj.id==self.selected),None)

    def update_object(self,value,*,checkpoint=True):
        candidate=replace(self.calibration(),
            trigger_lines=tuple(value if obj.id==value.id else obj for obj in self.lines),
            recognition_lines=tuple(value if obj.id==value.id else obj for obj in self.recognition_lines),
            regions=tuple(value if obj.id==value.id else obj for obj in self.regions))
        if checkpoint:self.checkpoint()
        self.lines=list(candidate.trigger_lines);self.recognition_lines=list(candidate.recognition_lines);self.regions=list(candidate.regions)
        self.documentChanged.emit();self.update()

    def delete_selected(self):
        if self.selected_object() is None:return
        self.checkpoint()
        self.lines=[obj for obj in self.lines if obj.id!=self.selected]
        # Removing an ROI also removes the association, never leaves a dangling ID.
        self.recognition_lines=[replace(obj,region_id=None) if obj.region_id==self.selected else obj for obj in self.recognition_lines if obj.id!=self.selected]
        self.regions=[obj for obj in self.regions if obj.id!=self.selected]
        self.selected=None;self.selectionChanged.emit();self.documentChanged.emit();self.update()

    def paintEvent(self,event):
        painter=QPainter(self);painter.fillRect(self.rect(),QColor("#07080B"))
        painter.setPen(QPen(QColor("#1E222D"),1))
        painter.drawRect(self.rect().adjusted(0,0,-1,-1))
        if self.image.isNull():return
        painter.drawImage(QRectF(*self.video_rect()),self.image)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        for region in self.regions:
            color=QColor("#A8B0C2" if region.purpose=="vehicle" else "#4C82FF")
            if region.exclude:color=QColor("#F59E0B")
            fill=QColor(color);fill.setAlpha(28)
            painter.setBrush(fill);painter.setPen(QPen(color,2,Qt.PenStyle.DotLine if region.exclude else Qt.PenStyle.DashLine))
            polygon=QPolygonF([self.screen_point(point) for point in region.points])
            painter.drawPolygon(polygon);painter.setBrush(Qt.BrushStyle.NoBrush)
            painter.drawText(polygon[0]+QPointF(4,-5),f'{region.name}{" · Hariç" if region.exclude else ""}')
            if region.id==self.selected:
                for point in polygon:painter.drawEllipse(point,5,5)
        for line in self.lines+self.recognition_lines:
            recognition=isinstance(line,RecognitionLine)
            color=QColor("#4C82FF" if recognition else "#F5F7FA")
            painter.setPen(QPen(color,3 if line.id==self.selected else 2,Qt.PenStyle.DashLine if recognition else Qt.PenStyle.SolidLine))
            a,b=self.screen_point(line.start),self.screen_point(line.end)
            painter.drawLine(a,b);painter.drawEllipse(a,5,5);painter.drawEllipse(b,5,5)
            midpoint=(a+b)/2
            if recognition:
                painter.drawText(midpoint+QPointF(4,-8),f'O · {line.name} · Öncelik {line.priority}')
            else:
                dx,dy=b.x()-a.x(),b.y()-a.y();length=math.hypot(dx,dy)
                sign=1 if line.positive_direction=="entry" else -1
                tip=midpoint+QPointF(-dy/length*24*sign,dx/length*24*sign)
                painter.drawLine(midpoint,tip)
                back=tip-QPointF(-dy/length*7*sign,dx/length*7*sign)
                painter.drawLine(tip,back+QPointF(dx/length*4,dy/length*4));painter.drawLine(tip,back-QPointF(dx/length*4,dy/length*4))
                permitted="Çift yön" if len(line.allowed_directions)==2 else ("Giriş" if line.allowed_directions[0]=="entry" else "Çıkış")
                painter.drawText(tip+QPointF(6,-6),f'T · {line.name} · {permitted}')
        painter.setPen(QPen(Qt.GlobalColor.white,2,Qt.PenStyle.DashLine))
        if self.draft:
            a,b=(self.screen_point(point) for point in self.draft)
            if "rectangle" in self.tool:painter.drawRect(QRectF(a,b).normalized())
            else:painter.drawLine(a,b)
        if self.polygon:
            points=QPolygonF([self.screen_point(point) for point in self.polygon])
            painter.drawPolyline(points)
            for point in points:painter.drawEllipse(point,4,4)

    def mousePressEvent(self,event):
        if event.button()==Qt.MouseButton.RightButton and self.polygon:
            self.finish_polygon();return
        if event.button()!=Qt.MouseButton.LeftButton:return
        point=self.event_point(event)
        if point is None:return
        # The legacy `drawing=True` contract remains a trigger-line drag tool.
        tool="trigger" if self.drawing else self.tool
        if "polygon" in tool:
            if not self.polygon:self.checkpoint()
            if len(self.polygon)<32 and point not in self.polygon:self.polygon.append(point)
            self.update();return
        if tool!="edit":
            if self.waiting_second and self.draft:
                self.draft=(self.draft[0],point);self.finish_draft();return
            self.checkpoint();self.draft=(point,point);self.update();return
        self.selected=None
        p=event.position()
        for obj in reversed(self.lines+self.recognition_lines):
            a,b=self.screen_point(obj.start),self.screen_point(obj.end)
            for field,end in (("start",a),("end",b)):
                if math.hypot(p.x()-end.x(),p.y()-end.y())<=12:
                    self.begin_drag(obj,field,point);return
            dx,dy=b.x()-a.x(),b.y()-a.y()
            t=max(0,min(1,((p.x()-a.x())*dx+(p.y()-a.y())*dy)/(dx*dx+dy*dy)))
            if math.hypot(p.x()-a.x()-t*dx,p.y()-a.y()-t*dy)<=10:
                self.begin_drag(obj,"move",point);return
        for obj in reversed(self.regions):
            for index,vertex in enumerate(obj.points):
                end=self.screen_point(vertex)
                if math.hypot(p.x()-end.x(),p.y()-end.y())<=12:
                    self.begin_drag(obj,index,point);return
            if obj.contains(point):self.begin_drag(obj,"move",point);return
        self.selectionChanged.emit();self.update()

    def begin_drag(self,obj,field,point):
        self.checkpoint();self.selected=obj.id;self.drag=(obj,field,point)
        self.selectionChanged.emit();self.update()

    def mouseMoveEvent(self,event):
        point=self.event_point(event)
        if point is None:return
        if self.draft:self.draft=(self.draft[0],point)
        elif self.drag:
            obj,field,origin=self.drag
            try:
                vertices=obj.points if isinstance(obj,CalibrationRegion) else (obj.start,obj.end)
                if field=="move":
                    dx=max(-min(p[0] for p in vertices),min(point[0]-origin[0],1-max(p[0] for p in vertices)))
                    dy=max(-min(p[1] for p in vertices),min(point[1]-origin[1],1-max(p[1] for p in vertices)))
                    translated=tuple((p[0]+dx,p[1]+dy) for p in vertices)
                    updated=replace(obj,points=translated) if isinstance(obj,CalibrationRegion) else replace(obj,start=translated[0],end=translated[1])
                elif isinstance(obj,CalibrationRegion):
                    if obj.shape=="rectangle":
                        updated=CalibrationRegion.rectangle(obj.id,obj.name,point,obj.points[(field+2)%4],obj.purpose,obj.exclude)
                    else:
                        points=list(obj.points);points[field]=point;updated=replace(obj,points=tuple(points))
                else:updated=replace(obj,**{field:point})
                self.update_object(updated,checkpoint=False)
            except ValueError:pass
        self.update()

    def mouseReleaseEvent(self,event):
        if event.button()!=Qt.MouseButton.LeftButton:return
        if self.draft:
            if math.dist(*self.draft)>=.01:self.finish_draft()
            else:self.waiting_second=True
        self.drag=None;self.update()

    def finish_draft(self):
        if not self.draft:return
        tool="trigger" if self.drawing else self.tool
        try:
            identity=uuid.uuid4().hex
            if tool=="trigger" and len(self.lines)<16:
                obj=CrossingLine(identity,f"Tetik {len(self.lines)+1}",*self.draft);self.lines.append(obj)
            elif tool=="recognition" and len(self.recognition_lines)<16:
                obj=RecognitionLine(identity,f"Okuma {len(self.recognition_lines)+1}",*self.draft);self.recognition_lines.append(obj)
            elif "rectangle" in tool and len(self.regions)<32:
                purpose="vehicle" if tool.startswith("vehicle") else "recognition"
                obj=CalibrationRegion.rectangle(identity,f"ROI {len(self.regions)+1}",*self.draft,purpose,tool.endswith("exclude"));self.regions.append(obj)
            else:return
            self.selected=obj.id;self.selectionChanged.emit();self.documentChanged.emit()
        except ValueError:pass
        finally:
            self.cancel_draft();self.drawing=False;self.tool="edit";self.setCursor(Qt.CursorShape.ArrowCursor)

    def finish_polygon(self):
        if len(self.polygon)<3:return
        try:
            obj=CalibrationRegion(uuid.uuid4().hex,f"ROI {len(self.regions)+1}",tuple(self.polygon),
                "vehicle" if self.tool.startswith("vehicle") else "recognition",self.tool.endswith("exclude"))
            if len(self.regions)>=32:return
            self.regions.append(obj);self.selected=obj.id;self.documentChanged.emit();self.selectionChanged.emit()
            self.cancel_draft();self.set_tool("edit")
        except ValueError:
            # Keep the draft so an invalid polygon can be corrected or cancelled.
            self.setToolTip("Alan kendiyle kesişmemeli; Escape ile iptal edip yeniden çizin.")

    def keyPressEvent(self,event):
        if event.key()==Qt.Key.Key_Delete:self.delete_selected()
        elif event.key()==Qt.Key.Key_Escape:self.cancel_draft();self.set_tool("edit")
        elif event.key() in (Qt.Key.Key_Return,Qt.Key.Key_Enter):self.finish_polygon()
        elif event.key()==Qt.Key.Key_Z and event.modifiers() & Qt.KeyboardModifier.ControlModifier:self.undo()
        else:super().keyPressEvent(event)


class CalibrationControls(QWidget):
    def __init__(self,surface,save,authorize,parent=None,*,legacy_only=False):
        super().__init__(parent)
        self.surface,self.save,self.authorize=surface,save,authorize
        self.loading=False
        layout=QVBoxLayout(self);layout.setContentsMargins(0,0,0,0)
        tools=QHBoxLayout();self.tool=QComboBox()
        tool_items=[("Düzenle","edit"),("Tetik çizgisi çiz","trigger")]
        if not legacy_only:tool_items += [("Okuma çizgisi çiz","recognition"),("Okuma ROI · dikdörtgen","recognition_rectangle"),
            ("Okuma ROI · çokgen","recognition_polygon"),("Araç ROI · dikdörtgen","vehicle_rectangle"),("Araç ROI · çokgen","vehicle_polygon"),
            ("Okumadan hariç · çokgen","recognition_polygon_exclude"),("Araçtan hariç · çokgen","vehicle_polygon_exclude")]
        for label,value in tool_items:self.tool.addItem(label,value)
        tools.addWidget(self.tool)
        self.tool.activated.connect(lambda _:surface.set_tool(self.tool.currentData()))
        def button(label,callback,row):
            item=QPushButton(label);item.clicked.connect(callback);row.addWidget(item);return item
        button("Çokgeni bitir",surface.finish_polygon,tools)
        button("Geri al",surface.undo,tools);button("Sıfırla",surface.reset_geometry,tools)
        layout.addLayout(tools)
        objects=QHBoxLayout();self.objects=QComboBox();objects.addWidget(self.objects,1)
        self.objects.activated.connect(self.select_object)
        button("Adlandır",self.rename,objects);button("Sil",surface.delete_selected,objects)
        layout.addLayout(objects)
        self.trigger_options=QWidget();trigger=QHBoxLayout(self.trigger_options);trigger.setContentsMargins(0,0,0,0)
        self.direction=QComboBox()
        for label,value in (("Çift yön",("entry","exit")),("Yalnız giriş",("entry",)),("Yalnız çıkış",("exit",))):self.direction.addItem(label,value)
        trigger.addWidget(QLabel("Tetik yönü"));trigger.addWidget(self.direction)
        self.direction.activated.connect(lambda _:self.change_selected(allowed_directions=self.direction.currentData()))
        button("Giriş yönünü ters çevir",self.reverse,trigger);layout.addWidget(self.trigger_options)
        self.recognition_options=QWidget();recognition=QHBoxLayout(self.recognition_options);recognition.setContentsMargins(0,0,0,0)
        self.priority=QSpinBox();self.priority.setRange(1,10)
        self.band=QDoubleSpinBox();self.band.setRange(.005,.5);self.band.setDecimals(3);self.band.setSingleStep(.01)
        self.after=QDoubleSpinBox();self.after.setRange(0,10);self.after.setSuffix(" sn")
        self.region=QComboBox()
        for label,widget in (("Öncelik",self.priority),("Çizgi çevresi",self.band),("Sonrası",self.after),("Okuma ROI",self.region)):
            recognition.addWidget(QLabel(label));recognition.addWidget(widget)
        self.priority.valueChanged.connect(lambda v:self.change_selected(priority=v))
        self.band.valueChanged.connect(lambda v:self.change_selected(band=v))
        self.after.valueChanged.connect(lambda v:self.change_selected(after_seconds=v))
        self.region.activated.connect(lambda _:self.change_selected(region_id=self.region.currentData()))
        layout.addWidget(self.recognition_options)
        policy=QHBoxLayout()
        self.repeat=QDoubleSpinBox();self.repeat.setRange(0,300);self.repeat.setSuffix(" sn")
        self.wait=QDoubleSpinBox();self.wait.setRange(0,10);self.wait.setSuffix(" sn")
        policy.addWidget(QLabel("Tekrar okuma aralığı"));policy.addWidget(self.repeat)
        policy.addWidget(QLabel("Tetik sonrası sonuç bekleme"));policy.addWidget(self.wait)
        self.repeat.valueChanged.connect(lambda v:self.change_policy(repeat_seconds=v))
        self.wait.valueChanged.connect(lambda v:self.change_policy(result_wait_seconds=v))
        button("Kalibrasyonu kaydet",self.save_document,policy);layout.addLayout(policy)
        self.status=QLabel("Tetik: beyaz · Okuma: mavi kesik · ROI: alan. İki nokta seçin veya sürükleyin. Çokgen: tıklayın, Enter ile bitirin. Escape: iptal.")
        self.status.setWordWrap(True);layout.addWidget(self.status)
        surface.selectionChanged.connect(self.refresh);surface.documentChanged.connect(self.refresh)
        self.refresh()

    def select_object(self,index):
        self.surface.selected=self.objects.itemData(index);self.surface.set_tool("edit");self.surface.selectionChanged.emit();self.surface.update()

    def refresh(self):
        self.loading=True
        self.objects.clear();self.objects.addItem("Öğe seçin",None)
        for obj in self.surface.objects():
            prefix="Tetik" if isinstance(obj,CrossingLine) else ("Okuma" if isinstance(obj,RecognitionLine) else "ROI")
            self.objects.addItem(f"{prefix} · {obj.name}",obj.id)
        self.objects.setCurrentIndex(max(0,self.objects.findData(self.surface.selected)))
        self.tool.setCurrentIndex(0)
        obj=self.surface.selected_object()
        self.trigger_options.setVisible(isinstance(obj,CrossingLine))
        self.recognition_options.setVisible(isinstance(obj,RecognitionLine))
        if isinstance(obj,CrossingLine):self.direction.setCurrentIndex(max(0,self.direction.findData(obj.allowed_directions)))
        if isinstance(obj,RecognitionLine):
            self.priority.setValue(obj.priority);self.band.setValue(obj.band);self.after.setValue(obj.after_seconds)
            self.region.clear();self.region.addItem("Tüm okuma alanları",None)
            for roi in self.surface.regions:
                if roi.purpose=="recognition" and not roi.exclude:self.region.addItem(roi.name,roi.id)
            self.region.setCurrentIndex(max(0,self.region.findData(obj.region_id)))
        self.repeat.setValue(self.surface.policy.repeat_seconds);self.wait.setValue(self.surface.policy.result_wait_seconds)
        self.loading=False

    def change_selected(self,**values):
        if self.loading:return
        obj=self.surface.selected_object()
        if obj is None:return
        try:self.surface.update_object(replace(obj,**values))
        except (ValueError,TypeError):self.status.setText("Değerler geçersiz; önceki ayar korundu.")

    def change_policy(self,**values):
        if self.loading:return
        self.surface.checkpoint();self.surface.policy=replace(self.surface.policy,**values)

    def rename(self):
        obj=self.surface.selected_object()
        if obj is None:return
        name,ok=QInputDialog.getText(self,"Kalibrasyon öğesi","Ad",text=obj.name)
        if ok and name.strip():self.change_selected(name=name.strip())

    def reverse(self):
        obj=self.surface.selected_object()
        if isinstance(obj,CrossingLine):self.change_selected(positive_direction="exit" if obj.positive_direction=="entry" else "entry")

    def save_document(self):
        if self.surface.draft or self.surface.polygon:
            self.status.setText("Önce çizimi tamamlayın veya Escape ile iptal edin.")
            return
        try:
            self.authorize();self.save(self.surface.calibration())
            self.status.setText("Kalibrasyon kaydedildi. Koordinatlar çözünürlükten bağımsızdır.")
        except Exception:
            self.status.setText("Kalibrasyon kaydedilemedi. Oturumu ve veritabanı erişimini kontrol edin.")
