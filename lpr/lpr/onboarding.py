"""First-station setup using real product actions and database-backed completion.

Constructing/importing this module never opens the wizard. Existing installations
can open it explicitly; the caller decides whether to offer it after account setup.
"""
import json
from pathlib import Path

from PySide6.QtCore import Qt,QTimer,QUrl
from PySide6.QtGui import QDesktopServices
from PySide6.QtWidgets import (QDialog,QWidget,QVBoxLayout,QHBoxLayout,QLabel,
    QPushButton,QStackedWidget,QComboBox,QListWidget)


def setup_status(ops,session):
    """Read actual state; a previous completion marker is never proof by itself."""
    ops.check(session,"read")
    account=ops.db.execute("SELECT name FROM users WHERE role='admin' LIMIT 1").fetchone()
    cameras=ops.cameras(session)
    calibrated=[];missing=[]
    for camera in cameras:
        try:valid=bool(ops.camera_calibration(session,camera["id"]).trigger_lines)
        except (ValueError,TypeError,KeyError):valid=False
        (calibrated if valid else missing).append(camera["id"])
    exists=ops.db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='vehicles'").fetchone()
    vehicle_count=ops.db.execute("SELECT count(*) FROM vehicles").fetchone()[0] if exists else 0
    path=Path(ops.path)
    persistent=str(path)!=":memory:" and path.is_file()
    checks={"account":bool(account),"storage":persistent,"camera":bool(cameras),
        "calibration":bool(cameras) and not missing,"vehicle":vehicle_count>0}
    return dict(checks=checks,complete=all(checks.values()),cameras=cameras,
        calibrated=calibrated,missing_calibration=missing,vehicle_count=vehicle_count,
        data_path=str(path.resolve()) if persistent else "Bellekte; kalıcı dosya yok")


from .operator_shell import AntigravityWelcomeBanner, STYLE


class SetupWizard(QDialog):
    STEPS=("Yönetici hesabı","Veri konumu","Kamera ekleme","Kamera kalibrasyonu","İlk araç kaydı","Canlı izleme")
    CHECK_LABELS={"account":"Yönetici hesabı","storage":"Kalıcı veri dosyası","camera":"En az bir kamera",
        "calibration":"Her kamera için tetik çizgisi","vehicle":"En az bir araç kaydı"}

    def __init__(self,window):
        window.ops.check(window.session,"manage")
        super().__init__(window)
        self.window=window;self.ops=window.ops;self.session=window.session
        self.current_status=None;self.exiting=False;self.busy=False
        self.setWindowTitle("IPScans LPR Pro · Antigravity İlk Kurulum")
        self.setWindowModality(Qt.WindowModality.WindowModal)
        self.setStyleSheet(STYLE)
        self.resize(760,600);self.setMinimumSize(640,480)
        root=QVBoxLayout(self)
        self.welcome_banner=AntigravityWelcomeBanner(
            "IPSCANS LPR PRO · İLK İSTASYON KURULUMU",
            "Gerçek kamera kalibrasyonu, araç kütüğü ve yerel veri doğrulaması.",
            compact=True,
            parent=self,
        )
        root.addWidget(self.welcome_banner)
        self.progress=QLabel();self.progress.setObjectName("pageTitle");root.addWidget(self.progress)
        self.description=self.label("Bu kılavuz gerçek kayıtlarınızı kullanır. Eksik adımları daha sonra tamamlayabilirsiniz.")
        root.addWidget(self.description)
        self.pages=QStackedWidget();root.addWidget(self.pages,1)
        self.account_label=self.label();self.page(self.account_label,
            self.label("Yönetici hesabı giriş ekranında oluşturulur. Kamera ve araç düzenleme işlemleri yönetici yetkisi gerektirir."))
        self.path_label=self.label();self.path_label.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
        storage=self.page(self.path_label,self.label("Bu istasyonun mevcut veri konumu gösterilir. Bu kılavuz veri dosyanızı taşımaz. Veri taşıma işlemi doğrulanmış yedek ve geri yükleme gerektirir."))
        self.folder_button=self.button("Veri klasörünü aç",self.open_data_folder,storage)
        camera=self.page(self.label("Yetkili olduğunuz kamerayı ekleyin. Kayıt işlemi çözülen canlı görüntünün doğrulanmasını ister."))
        self.camera_label=self.label();camera.addWidget(self.camera_label)
        self.add_camera_button=self.button("RTSP kamera ekle",lambda:self.perform(window.add_camera),camera)
        self.discover_button=self.button("Ağdaki kameraları bul",lambda:self.perform(window.discover_camera),camera)
        calibration=self.page(self.label("Her kamerada tetik çizgisini çizin ve kaydedin. Okuma çizgisi ve ROI bağımsızdır; kullanmadığınızda okuma alanı tam görüntüdür."))
        self.camera_choice=QComboBox();calibration.addWidget(self.camera_choice)
        self.calibrate_button=self.button("Seçilen kamerayı kalibre et",self.calibrate,calibration)
        self.calibration_label=self.label();calibration.addWidget(self.calibration_label)
        vehicle=self.page(self.label("İlk gerçek araç kaydını oluşturun. Plaka ve sakin bilgileri araç yönetimindeki aynı veri tabanına kaydedilir."))
        self.vehicle_label=self.label();vehicle.addWidget(self.vehicle_label)
        self.vehicle_button=self.button("Araç kaydı oluştur",lambda:self.perform(window.registry_widget.create_vehicle),vehicle)
        final=self.page(self.label("Kurulumu tamamlamadan önce kayıtlar yeniden kontrol edilir. Bu kontrol cihaz uyumluluğu veya saha OCR doğruluğu onayı değildir."))
        self.checklist=QListWidget();self.checklist.setFocusPolicy(Qt.FocusPolicy.NoFocus);final.addWidget(self.checklist)
        self.remaining=self.label();final.addWidget(self.remaining)
        self.error=self.label();root.addWidget(self.error)
        navigation=QHBoxLayout()
        self.back=QPushButton("Geri");self.back.clicked.connect(lambda:self.go(-1));navigation.addWidget(self.back)
        self.later=QPushButton("Daha sonra tamamla");self.later.clicked.connect(self.reject);navigation.addWidget(self.later)
        navigation.addStretch()
        self.next=QPushButton("İleri");self.next.clicked.connect(self.advance);navigation.addWidget(self.next)
        root.addLayout(navigation)
        self.pages.currentChanged.connect(self.page_changed)
        self.timer=QTimer(self);self.timer.timeout.connect(self.refresh);self.timer.start(1000)
        self.refresh();self.page_changed(0)

    @staticmethod
    def label(text=""):
        widget=QLabel(text);widget.setWordWrap(True);widget.setTextFormat(Qt.TextFormat.PlainText)
        return widget

    def page(self,*widgets):
        page=QWidget();layout=QVBoxLayout(page);layout.setContentsMargins(0,12,0,12)
        for widget in widgets:layout.addWidget(widget)
        self.pages.addWidget(page)
        return layout

    @staticmethod
    def button(text,callback,layout):
        button=QPushButton(text);button.clicked.connect(callback);layout.addWidget(button)
        return button

    def page_changed(self,index):
        self.progress.setText(f"{index+1} / {len(self.STEPS)} · {self.STEPS[index]}")
        self.back.setEnabled(index>0)
        self.next.setText("Doğrula ve Dashboard'a geç" if index==len(self.STEPS)-1 else "İleri")

    def go(self,delta):
        self.pages.setCurrentIndex(max(0,min(len(self.STEPS)-1,self.pages.currentIndex()+delta)))
        self.refresh()

    def advance(self):
        if self.pages.currentIndex()==len(self.STEPS)-1:self.finish_setup()
        else:self.go(1)

    def refresh(self):
        if self.exiting:return
        try:
            self.current_status=setup_status(self.ops,self.session)
            status=self.current_status
            self.account_label.setText(f"Yönetici hesabı hazır. Etkin kullanıcı: {self.session.username}")
            self.path_label.setText(f"Veri dosyası\n{status['data_path']}")
            self.folder_button.setEnabled(status["checks"]["storage"])
            self.camera_label.setText(f"Kayıtlı kamera: {len(status['cameras'])}")
            items=[]
            for camera in status["cameras"]:
                suffix=" · Çizgi kayıtlı" if camera["id"] in status["calibrated"] else " · Kalibrasyon gerekli"
                items.append((camera["name"]+suffix,camera["id"]))
            current=[(self.camera_choice.itemText(i),self.camera_choice.itemData(i)) for i in range(self.camera_choice.count())]
            if current!=items:
                selected=self.camera_choice.currentData();self.camera_choice.clear()
                for name,identity in items:self.camera_choice.addItem(name,identity)
                index=self.camera_choice.findData(selected)
                if index>=0:self.camera_choice.setCurrentIndex(index)
            self.calibrate_button.setEnabled(bool(status["cameras"]))
            self.calibration_label.setText(f"Tetik çizgisi kayıtlı kamera: {len(status['calibrated'])} / {len(status['cameras'])}. Kaydetmeden kapatılan çizimler tamamlanmış sayılmaz.")
            self.vehicle_label.setText(f"Kayıtlı araç: {status['vehicle_count']}")
            self.checklist.clear()
            for key,label in self.CHECK_LABELS.items():self.checklist.addItem(f"{'Tamam' if status['checks'][key] else 'Eksik'} · {label}")
            missing=[label for key,label in self.CHECK_LABELS.items() if not status["checks"][key]]
            self.remaining.setText("Kayıtlar hazır. Dashboard üzerinde canlı görüntü ve OCR durumunu kontrol edin." if not missing else "Tamamlanması gerekenler: "+", ".join(missing)+".")
        except Exception:
            self.current_status=None
            self.error.setText("Kurulum kayıtları okunamadı. Oturumu ve veri dosyası erişimini kontrol edin.")

    def perform(self,callback):
        if self.busy:return
        self.busy=True;visible=self.isVisible()
        try:
            self.ops.check(self.session,"manage")
            if visible:self.hide()
            callback()
            self.error.clear()
        except Exception:self.error.setText("İşlem tamamlanamadı. Kamera/araç ekranındaki bilgileri ve oturum yetkisini kontrol edin.")
        finally:
            self.busy=False;self.refresh()
            if visible and not self.exiting:self.show();self.raise_();self.activateWindow()

    def calibrate(self):
        camera_id=self.camera_choice.currentData()
        if camera_id is not None:self.perform(lambda:self.window.calibrate_camera(camera_id))

    def open_data_folder(self):
        self.ops.check(self.session,"read")
        path=Path(self.ops.path)
        if not path.is_file():return
        if not QDesktopServices.openUrl(QUrl.fromLocalFile(str(path.resolve().parent))):self.error.setText("Veri klasörü açılamadı. Yukarıdaki yolu Dosya Gezgini'nde açabilirsiniz.")

    def finish_setup(self):
        try:
            self.ops.check(self.session,"manage")
            with self.ops.db:
                # Reserve the writer before checking state, preventing another
                # connection from invalidating the checklist before completion.
                if not self.ops.db.in_transaction:self.ops.db.execute("BEGIN IMMEDIATE")
                status=setup_status(self.ops,self.session)
                if not status["complete"]:
                    self.refresh();self.error.setText("Eksik adımlar var. Tamamlayın veya 'Daha sonra tamamla' ile açık bırakın.")
                    return
                self.ops.db.execute("INSERT INTO settings(key,value) VALUES('onboarding_complete','1') ON CONFLICT(key) DO UPDATE SET value='1'")
                self.ops.db.execute("DELETE FROM settings WHERE key='onboarding_dismissed'")
                self.ops._audit(self.session.username,"onboarding_completed")
            self.exiting=True;self.timer.stop()
            if hasattr(self.window,"navigation"):self.window.navigation.setCurrentRow(0)
            elif hasattr(self.window,"tabs"):self.window.tabs.setCurrentIndex(0)
            self.window.notice("Kurulum adımları tamamlandı. Canlı görüntü ve tanıma durumunu Dashboard'da kontrol edin.")
            super().accept()
        except Exception:self.error.setText("Kurulum durumu kaydedilemedi. Veri dosyası erişimini ve oturumu kontrol edin.")

    def dismiss(self):
        if self.exiting:return
        try:
            self.ops.check(self.session,"manage")
            status=setup_status(self.ops,self.session)
            with self.ops.db:
                self.ops.db.execute("INSERT INTO settings(key,value) VALUES('onboarding_dismissed','1') ON CONFLICT(key) DO UPDATE SET value='1'")
                self.ops.db.execute("INSERT INTO settings(key,value) VALUES('onboarding_status',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                    (json.dumps(dict(complete=False,step=self.pages.currentIndex(),checks=status["checks"])),))
                if not status["complete"]:self.ops.db.execute("DELETE FROM settings WHERE key='onboarding_complete'")
                self.ops._audit(self.session.username,"onboarding_deferred",str(self.pages.currentIndex()+1))
            remaining=[label for key,label in self.CHECK_LABELS.items() if not status["checks"][key]]
            self.window.notice("Kurulum ertelendi. "+("Eksik: "+", ".join(remaining) if remaining else "Son doğrulamayı Ayarlar'daki kurulum kılavuzundan tamamlayabilirsiniz."))
        except Exception:
            # Exiting the guide must remain possible when the session expires.
            self.window.notice("Kurulum tamamlanmadı; ilerleme durumu kaydedilemedi.")
        self.exiting=True;self.timer.stop()

    def reject(self):
        self.dismiss();super().reject()

    def closeEvent(self,event):
        self.dismiss();event.accept()
