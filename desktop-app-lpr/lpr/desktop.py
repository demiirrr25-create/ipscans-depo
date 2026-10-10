"""Phase 2 offline test console. Inference runs in a separate, cancellable process."""
import argparse
import json
import math
import os
from pathlib import Path
import sys

from PySide6.QtCore import Qt, QProcess, QProcessEnvironment, QTimer
from PySide6.QtGui import QImage, QPainter, QPen, QColor, QPixmap, QFontDatabase, QFont
from PySide6.QtWidgets import (QApplication,QMainWindow,QWidget,QVBoxLayout,QHBoxLayout,
    QLabel,QPushButton,QLineEdit,QFileDialog,QComboBox,QCheckBox,QTableWidget,
    QTableWidgetItem,QHeaderView,QSplitter,QFrame)
from .core import valid_tr_plate


COPY={
 "tr":{"title":"Plaka tanıma laboratuvarı","sub":"Yerel görüntü ve video üzerinde modeli doğrulayın.",
       "model":"Model manifesti","input":"Görüntü veya kayıtlı video","browse":"Seç…",
       "evaluation":"Yalnız değerlendirme • ticari onay yerine geçmez","run":"Tanımayı başlat",
       "stop":"Durdur","ready":"Hazır","busy":"Model yükleniyor / görüntü işleniyor…",
       "done":"İşlem tamamlandı","cancelled":"Durduruldu","error":"İşlem tamamlanamadı. Model, bağımlılıklar ve dosyayı kontrol edin.",
       "choose":"Başlamak için model manifesti ve görüntü seçin.","empty":"Görüntü önizlemesi",
       "video":"Kayıtlı video analizi • en fazla 300 kare","results":"OKUMA SONUÇLARI",
       "columns":["Plaka","Güven","Durum"],"review":"İnceleme gerekli","candidate":"Aday okuma",
       "footer":"GELİŞTİRME ÖNİZLEMESİ  /  Bariyer kontrolü yok  /  Veriler bu oturumda tutulur",
       "no_plate":"Plaka tespit edilmedi","timeout":"İşlem süresi sınırı aşıldı.",
       "pending":"Bekleniyor","recognized":"Doğrulanan okuma","suppressed":"Tekrar bastırıldı","rejected":"Reddedildi"},
 "en":{"title":"Recognition laboratory","sub":"Validate the model on local images and recorded video.",
       "model":"Model manifest","input":"Image or recorded video","browse":"Browse…",
       "evaluation":"Evaluation only • does not constitute commercial approval","run":"Start recognition",
       "stop":"Stop","ready":"Ready","busy":"Loading model / processing image…",
       "done":"Processing complete","cancelled":"Stopped","error":"Could not complete. Check the model, dependencies and input file.",
       "choose":"Choose a model manifest and an image to begin.","empty":"Image preview",
       "video":"Recorded video analysis • maximum 300 frames","results":"RECOGNITION RESULTS",
       "columns":["Plate","Confidence","Status"],"review":"Needs review","candidate":"Candidate reading",
       "footer":"DEVELOPMENT PREVIEW  /  No barrier control  /  Data stays in this session",
       "no_plate":"No plate detected","timeout":"Processing time limit exceeded.",
       "pending":"Pending","recognized":"Confirmed reading","suppressed":"Duplicate suppressed","rejected":"Rejected"}}

STYLE="""
QMainWindow,QWidget{background:#0b0b0b;color:#ededed;font-family:'Segoe UI';font-size:13px;}
QLabel#brand{font-size:15px;font-weight:700;letter-spacing:2px;}
QLabel#title{font-size:30px;font-weight:600;}
QLabel#muted{color:#b0b0b0;}
QLabel#section{color:#a8a8a8;font-size:11px;font-weight:600;letter-spacing:2px;}
QLineEdit,QComboBox{background:#171717;border:1px solid #444;border-radius:6px;padding:10px;min-height:20px;}
QPushButton{background:#222;border:1px solid #555;border-radius:6px;padding:11px 18px;}
QPushButton:hover{background:#353535;}
QPushButton:focus,QLineEdit:focus,QComboBox:focus{border:2px solid #fff;}
QPushButton#primary{background:#f1f1f1;color:#101010;font-weight:600;}
QPushButton:disabled{background:#191919;color:#777;border-color:#333;}
QTableWidget{background:#101010;gridline-color:#2a2a2a;border:1px solid #333;border-radius:6px;}
QHeaderView::section{background:#191919;color:#c9c9c9;padding:10px;border:0;border-bottom:1px solid #444;}
QCheckBox{padding:10px 0;}
QLabel#preview{background:#111;border:1px solid #333;border-radius:8px;color:#999;}
QSplitter::handle{background:#242424;width:2px;}
"""


class RecognitionWindow(QMainWindow):
    def __init__(self,lang="tr"):
        super().__init__()
        # Qt's offscreen Windows backend may not enumerate system fonts.
        if os.name == "nt" and "Segoe UI" not in QFontDatabase.families():
            for filename in ("segoeui.ttf","segoeuib.ttf"):
                font=Path(os.environ.get("SystemRoot",r"C:\Windows"))/"Fonts"/filename
                if font.is_file():QFontDatabase.addApplicationFont(str(font))
        self.setFont(QFont("Segoe UI",10))
        self.lang=lang
        self.status_key="ready"
        self.buffer=b""
        self.had_error=False
        self.stopped=False
        self.messages=0
        self.pixmap=None
        self.original=QImage()
        self.setWindowTitle("IPScans LPR Pro · Recognition Lab")
        self.resize(1280,820)
        self.setMinimumSize(900,620)
        self.setStyleSheet(STYLE)
        root=QWidget()
        self.setCentralWidget(root)
        layout=QVBoxLayout(root)
        layout.setContentsMargins(32,24,32,24)
        layout.setSpacing(16)
        top=QHBoxLayout()
        brand=QLabel("IPSCANS  /  LPR PRO")
        brand.setObjectName("brand")
        top.addWidget(brand)
        top.addStretch()
        self.language=QComboBox()
        self.language.addItems(["Türkçe","English"])
        self.language.setCurrentIndex(0 if lang=="tr" else 1)
        self.language.setAccessibleName("Language / Dil")
        self.language.currentIndexChanged.connect(self.change_language)
        top.addWidget(self.language)
        layout.addLayout(top)
        self.title=QLabel();self.title.setObjectName("title")
        self.subtitle=QLabel();self.subtitle.setObjectName("muted")
        layout.addWidget(self.title);layout.addWidget(self.subtitle)
        self.model_label=QLabel();self.input_label=QLabel()
        self.model=QLineEdit();self.model.setReadOnly(True)
        self.input=QLineEdit();self.input.setReadOnly(True)
        self.model_label.setBuddy(self.model);self.input_label.setBuddy(self.input)
        self.model_button=QPushButton();self.input_button=QPushButton()
        self.model_button.clicked.connect(self.choose_model)
        self.input_button.clicked.connect(self.choose_input)
        for label,edit,button in [(self.model_label,self.model,self.model_button),(self.input_label,self.input,self.input_button)]:
            layout.addWidget(label)
            row=QHBoxLayout();row.addWidget(edit,1);row.addWidget(button);layout.addLayout(row)
        controls=QHBoxLayout()
        self.evaluation=QCheckBox();self.evaluation.setChecked(True)
        controls.addWidget(self.evaluation,1)
        self.run_button=QPushButton();self.run_button.setObjectName("primary")
        self.run_button.setShortcut("Ctrl+Return");self.run_button.clicked.connect(self.start)
        self.stop_button=QPushButton();self.stop_button.setShortcut("Escape")
        self.stop_button.clicked.connect(self.cancel);self.stop_button.setEnabled(False)
        controls.addWidget(self.run_button);controls.addWidget(self.stop_button);layout.addLayout(controls)
        splitter=QSplitter()
        self.preview=QLabel();self.preview.setObjectName("preview")
        self.preview.setMinimumSize(320,220)
        self.preview.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.preview.setTextFormat(Qt.TextFormat.PlainText)
        splitter.addWidget(self.preview)
        right=QWidget();right_layout=QVBoxLayout(right);right_layout.setContentsMargins(16,0,0,0)
        self.results_label=QLabel();self.results_label.setObjectName("section");right_layout.addWidget(self.results_label)
        self.table=QTableWidget(0,3)
        self.table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self.table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.table.verticalHeader().hide()
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        right_layout.addWidget(self.table)
        splitter.addWidget(right);splitter.setSizes([700,450]);layout.addWidget(splitter,1)
        self.status=QLabel();self.status.setTextFormat(Qt.TextFormat.PlainText)
        self.status.setWordWrap(True);layout.addWidget(self.status)
        self.footer=QLabel();self.footer.setObjectName("muted");self.footer.setWordWrap(True);layout.addWidget(self.footer)
        self.process=QProcess(self)
        self.process.setWorkingDirectory(str(Path(__file__).resolve().parents[1]))
        env=QProcessEnvironment.systemEnvironment();env.insert("PYTHONUTF8","1")
        self.process.setProcessEnvironment(env)
        self.process.readyReadStandardOutput.connect(self.read_output)
        self.process.readyReadStandardError.connect(lambda:self.process.readAllStandardError())
        self.process.finished.connect(self.finished)
        self.process.errorOccurred.connect(self.process_error)
        self.timer=QTimer(self);self.timer.setSingleShot(True);self.timer.timeout.connect(self.timeout)
        self.translate()

    def t(self,key): return COPY[self.lang][key]

    def change_language(self,index):
        self.lang="tr" if index==0 else "en"
        self.translate()

    def translate(self):
        for widget,key in [(self.title,"title"),(self.subtitle,"sub"),(self.model_label,"model"),
            (self.input_label,"input"),(self.model_button,"browse"),(self.input_button,"browse"),
            (self.evaluation,"evaluation"),(self.run_button,"run"),(self.stop_button,"stop"),
            (self.results_label,"results"),(self.footer,"footer")]:widget.setText(self.t(key))
        self.table.setHorizontalHeaderLabels(self.t("columns"))
        for row in range(self.table.rowCount()):
            item=self.table.item(row,2)
            if item and item.data(Qt.ItemDataRole.UserRole) in COPY[self.lang]:
                item.setText(self.t(item.data(Qt.ItemDataRole.UserRole)))
        self.model.setAccessibleName(self.t("model"));self.input.setAccessibleName(self.t("input"))
        if self.pixmap is None:self.preview.setText(self.t("empty"))
        self.set_status(self.status_key)

    def set_status(self,key):
        self.status_key=key;self.status.setText(self.t(key))

    def choose_model(self):
        path,_=QFileDialog.getOpenFileName(self,self.t("model"),"","JSON (*.json)")
        if path:self.model.setText(path)

    def choose_input(self):
        path,_=QFileDialog.getOpenFileName(self,self.t("input"),"","Media (*.png *.jpg *.jpeg *.bmp *.mp4 *.avi *.mkv *.mov)")
        if path:self.set_input(path)

    def set_input(self,path):
        self.input.setText(path)
        self.original=QImage(path)
        self.pixmap=QPixmap.fromImage(self.original) if not self.original.isNull() else None
        self.update_preview()

    def update_preview(self):
        if self.pixmap is not None:
            self.preview.setPixmap(self.pixmap.scaled(self.preview.size(),Qt.AspectRatioMode.KeepAspectRatio,Qt.TransformationMode.SmoothTransformation))
        else:
            self.preview.clear();self.preview.setText(self.t("video" if self.input.text() else "empty"))

    def resizeEvent(self,event):
        super().resizeEvent(event)
        if hasattr(self,"preview"):self.update_preview()

    def busy(self,value):
        for widget in (self.run_button,self.input_button,self.model_button,self.evaluation):widget.setEnabled(not value)
        self.stop_button.setEnabled(value)

    def start(self):
        if self.process.state()!=QProcess.ProcessState.NotRunning:return
        if not Path(self.model.text()).is_file() or not Path(self.input.text()).is_file():
            self.set_status("choose");return
        self.buffer=b"";self.had_error=False;self.stopped=False;self.messages=0
        self.table.setRowCount(0)
        is_video=Path(self.input.text()).suffix.lower() in {".mp4",".avi",".mkv",".mov"}
        prefix=["--worker"] if getattr(sys,"frozen",False) else ["-m","lpr.cli"]
        args=prefix+["video" if is_video else "image","--models",self.model.text(),self.input.text()]
        if self.evaluation.isChecked():args.append("--evaluation")
        self.busy(True);self.set_status("busy")
        self.process.start(sys.executable,args)
        self.timer.start(120000)

    def read_output(self):
        if self.stopped:
            self.process.readAllStandardOutput();self.buffer=b"";return
        self.buffer+=bytes(self.process.readAllStandardOutput())
        if len(self.buffer)>2*1024*1024:
            self.had_error=True;self.process.kill();return
        while b"\n" in self.buffer:
            line,self.buffer=self.buffer.split(b"\n",1)
            try:self.consume(json.loads(line))
            except (ValueError,KeyError,TypeError):self.had_error=True

    def consume(self,message):
        self.messages+=1
        if "error" in message:
            self.had_error=True;self.set_status("error");return
        readings=message.get("readings",[])
        if message.get("decision"):
            d=message["decision"]
            readings=[{"text":d["plate"],"confidence":d["confidence"],"status":d["status"]}]
        for r in readings:
            text=str(r["text"]);score=float(r["confidence"])
            if not math.isfinite(score) or not 0<=score<=1:raise ValueError("Invalid score")
            if self.table.rowCount()>=200:self.table.removeRow(0)
            row=self.table.rowCount();self.table.insertRow(row)
            state=r.get("status","candidate" if score>=.9 and valid_tr_plate(text) else "review")
            for col,value in enumerate((text,f"{score:.1%}",COPY[self.lang].get(state,state))):
                self.table.setItem(row,col,QTableWidgetItem(value))
            self.table.item(row,2).setData(Qt.ItemDataRole.UserRole,state)
        if "readings" in message and not self.original.isNull():
            image=self.original.copy();painter=QPainter(image);painter.setPen(QPen(QColor("white"),3))
            try:
                for r in readings:
                    box=r["box"]
                    painter.drawRect(box["x1"],box["y1"],box["x2"]-box["x1"],box["y2"]-box["y1"])
            finally:painter.end()
            self.pixmap=QPixmap.fromImage(image);self.update_preview()
        if "inference_ms" in message:
            self.status.setText(f"{self.t('results')}  /  {message['inference_ms']:.1f} ms")

    def process_error(self,error):
        if self.stopped:return
        self.had_error=True;self.timer.stop();self.busy(False);self.set_status("error")

    def finished(self,code,*args):
        self.read_output();self.timer.stop();self.busy(False)
        if self.stopped:return
        self.set_status("error" if code or self.had_error or not self.messages else ("done" if self.table.rowCount() else "no_plate"))

    def cancel(self):
        self.stopped=True;self.timer.stop();self.process.kill();self.set_status("cancelled")

    def timeout(self):
        self.cancel();self.set_status("timeout")

    def closeEvent(self,event):
        self.cancel()
        if self.process.state()!=QProcess.ProcessState.NotRunning:self.process.waitForFinished(1000)
        super().closeEvent(event)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--lang",choices=["tr","en"],default="tr")
    parser.add_argument("--models")
    parser.add_argument("--image")
    args=parser.parse_args()
    app=QApplication(sys.argv[:1]);window=RecognitionWindow(args.lang)
    if args.models:window.model.setText(str(Path(args.models).resolve()))
    if args.image:window.set_input(str(Path(args.image).resolve()))
    window.show();return app.exec()


if __name__=="__main__":sys.exit(main())
