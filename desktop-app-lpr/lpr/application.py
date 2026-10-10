"""Local single-station beta shell. No physical barrier driver is registered."""
import csv
from datetime import datetime, timezone
import os
from pathlib import Path
import sys
import time
import tempfile

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (QApplication,QMainWindow,QWidget,QVBoxLayout,QHBoxLayout,QLabel,
    QPushButton,QLineEdit,QTableWidget,QTableWidgetItem,QHeaderView,QTabWidget,QDialog,
    QDialogButtonBox,QFormLayout,QComboBox,QCheckBox,QSpinBox,QMessageBox,QFileDialog,QInputDialog)
from .desktop import RecognitionWindow,STYLE
from .operations import Operations


def data_directory():
    base=Path(os.environ.get("LOCALAPPDATA",str(Path.home()/".local/share")))
    folder=base/"IPScans"/"LPR Pro"
    folder.mkdir(parents=True,exist_ok=True)
    return folder


class Login(QDialog):
    def __init__(self,ops):
        super().__init__()
        self.ops=ops;self.session=None
        self.setWindowTitle("IPScans LPR Pro · Oturum / Sign in")
        self.setStyleSheet(STYLE);self.setMinimumWidth(460)
        layout=QVBoxLayout(self)
        setup=ops.needs_setup()
        title=QLabel("İlk yönetici hesabı / Create administrator" if setup else "Oturum aç / Sign in")
        layout.addWidget(title)
        layout.addWidget(QLabel("Parola: en az 12 karakter / Password: at least 12 characters"))
        form=QFormLayout();self.username=QLineEdit();self.password=QLineEdit()
        self.password.setEchoMode(QLineEdit.EchoMode.Password)
        form.addRow("Kullanıcı / User",self.username);form.addRow("Parola / Password",self.password)
        layout.addLayout(form);self.error=QLabel();self.error.setWordWrap(True);layout.addWidget(self.error)
        buttons=QDialogButtonBox(QDialogButtonBox.StandardButton.Ok|QDialogButtonBox.StandardButton.Cancel)
        buttons.accepted.connect(self.submit);buttons.rejected.connect(self.reject);layout.addWidget(buttons)

    def submit(self):
        try:
            if self.ops.needs_setup():self.ops.setup(self.username.text().strip(),self.password.text())
            self.session=self.ops.login(self.username.text().strip(),self.password.text())
            self.password.clear();self.accept()
        except (ValueError,PermissionError):self.error.setText("Giriş bilgilerini kontrol edin; 5 hatalı denemeden sonra 5 dakika kilitlenir. / Check credentials; five failed attempts lock sign-in for five minutes.")


class ProductWindow(QMainWindow):
    def __init__(self,ops,session):
        super().__init__()
        self.ops=ops;self.session=session;self.lang="tr"
        self.setWindowTitle("IPScans LPR Pro · 0.3.0 Beta")
        self.resize(1440,950);self.setMinimumSize(1000,720);self.setStyleSheet(STYLE)
        self.lab=RecognitionWindow()
        self.lab.footer.hide()
        original_consume=self.lab.consume
        def consume(message):
            original_consume(message)
            if message.get("model_manifest"):
                self.lab.model.setText(message["model_manifest"])
                self.notice("Modeller hazır. Tanıma sekmesinden görüntü seçin. / Models ready. Select an image in Recognition.")
            if "relay_state" in message:
                self.notice(f"Röle durumu / Relay state: {'ON' if message['relay_state'] else 'OFF'} — gönderilen komut / commands sent: 0")
            readings=message.get("readings",[])
            source=message.get("source","offline_image")
            if message.get("decision"):
                d=message["decision"]
                readings=[{"text":d["plate"],"confidence":d["confidence"],"status":d["status"]}]
            for r in readings:
                from .core import valid_tr_plate
                status=r.get("status","candidate" if r["confidence"]>=.9 and valid_tr_plate(r["text"]) else "review")
                if status in {"recognized","review","candidate"}:
                    try:self.ops.record(self.session,r["text"],float(r["confidence"]),status,message.get("camera","offline"),source)
                    except PermissionError:pass
                    except Exception:self.notice("Kayıt yazılamadı / Could not save observation")
            self.refresh()
        self.lab.consume=consume
        from PySide6.QtCore import QProcessEnvironment
        self.lab.process.started.connect(lambda:self.lab.process.setProcessEnvironment(QProcessEnvironment.systemEnvironment()))
        self.lab.language.currentIndexChanged.connect(self.switch_language)
        root=QWidget();self.setCentralWidget(root);layout=QVBoxLayout(root)
        layout.setContentsMargins(20,16,20,16)
        header=QHBoxLayout();brand=QLabel("IPSCANS  /  LPR PRO  ·  0.3.0 BETA")
        brand.setObjectName("brand");header.addWidget(brand);header.addStretch()
        self.account=QLabel(f"{session.username} / {session.role}");header.addWidget(self.account)
        lock=QPushButton("Kilitle / Lock");lock.clicked.connect(self.lock_session);header.addWidget(lock)
        layout.addLayout(header)
        self.banner=QLabel("Yerel beta • Fiziksel bariyer kontrolü yok / Local beta • No physical barrier control")
        self.banner.setWordWrap(True);layout.addWidget(self.banner)
        self.tabs=QTabWidget();layout.addWidget(self.tabs,1)
        self.widgets={};self.labels=[]
        self.dashboard=self.page("dashboard","Genel bakış","Dashboard")
        self.summary=QLabel();self.summary.setWordWrap(True);self.summary.setObjectName("title");self.dashboard.addWidget(self.summary)
        self.info=QLabel("Kayıtlar bu Windows kullanıcısının yerel veri klasöründe tutulur.\nÇevrimdışı görüntüler fiziksel geçiş kanıtı değildir.\n\nRecords stay in this Windows user's local data directory.\nOffline images are not evidence of a physical passage.")
        self.info.setWordWrap(True);self.dashboard.addWidget(self.info);self.dashboard.addStretch()
        self.tabs.addTab(self.lab,"Tanıma / Recognition")
        self.vehicles=self.page("vehicles","Araç izinleri","Vehicle permissions")
        self.grant_table=self.table(["Plaka / Plate","Kategori / Category","Engelli / Blocked","Başlangıç / From","Bitiş / Until","Yön / Direction","Kalan / Uses"])
        self.vehicles.addWidget(self.grant_table)
        self.add_button(self.vehicles,"İzin ekle / güncelle","Add / update permission",self.add_grant,"manage")
        self.access=self.page("access","Erişim kontrolü","Access control")
        self.access.addWidget(QLabel("SİMÜLATÖR / SIMULATOR — Gerçek kontrol cihazı bağlı değil / No physical controller connected"))
        self.sim_plate=QLineEdit();self.sim_plate.setPlaceholderText("34 ABC 123")
        self.access.addWidget(self.sim_plate)
        self.add_button(self.access,"Ethernet röle durumunu oku","Read Ethernet relay status",self.relay_status,"manage")
        self.sim_direction=QComboBox();self.sim_direction.addItems(["entry","exit"]);self.access.addWidget(self.sim_direction)
        self.sim_presence=QCheckBox("Simülasyon: bağımsız sensör kanıtı ve taze kare / Simulate sensor evidence and fresh frame")
        self.access.addWidget(self.sim_presence)
        self.add_button(self.access,"Kuralı sınayın","Test rule",self.simulate)
        self.sim_result=QLabel();self.sim_result.setWordWrap(True);self.access.addWidget(self.sim_result);self.access.addStretch()
        self.history_page=self.page("history","Geçmiş ve raporlar","History & reports")
        self.search=QLineEdit();self.search.setPlaceholderText("Plaka ara / Search plate");self.search.textChanged.connect(self.refresh)
        self.history_page.addWidget(self.search)
        self.history_table=self.table(["ID","UTC","Kamera / Camera","Plaka / Plate","Güven / Confidence","Durum / Status","Kaynak / Source"])
        self.history_page.addWidget(self.history_table)
        self.add_button(self.history_page,"Seçili okumayı düzelt","Correct selected reading",self.correct,"review")
        self.add_button(self.history_page,"CSV dışa aktar","Export CSV",self.export,"export")
        self.cameras_page=self.page("cameras","Kameralar","Cameras")
        self.cameras_page.addWidget(QLabel("RTSP parolaları Windows DPAPI ile bu kullanıcıya bağlı şifrelenir. / RTSP secrets are protected for this Windows user with DPAPI."))
        self.camera_table=self.table(["ID","Ad / Name","Yön / Direction"]);self.cameras_page.addWidget(self.camera_table)
        self.add_button(self.cameras_page,"Kamera ekle / güncelle","Add / update camera",self.add_camera,"manage")
        self.add_button(self.cameras_page,"Seçili kamerayı 60 saniye izle","Observe selected camera for 60 seconds",self.start_camera,"manage")
        self.camera_status=QLabel("Canlı mod için ticari kullanımı onaylı model manifesti gerekir. / Live mode requires a commercially approved model manifest.")
        self.camera_status.setWordWrap(True);self.cameras_page.addWidget(self.camera_status)
        self.settings_page=self.page("settings","Ayarlar ve denetim","Settings & audit")
        self.add_button(self.settings_page,"Değerlendirme modellerini indir (11 MB)","Download evaluation models (11 MB)",self.setup_models)
        self.add_button(self.settings_page,"Kullanıcı ekle","Add user",self.add_user,"users")
        self.retention=QSpinBox();self.retention.setRange(1,3650);self.retention.setValue(30)
        self.settings_page.addWidget(QLabel("Saklama süresi (gün) / Retention (days)"));self.settings_page.addWidget(self.retention)
        self.add_button(self.settings_page,"Saklama politikasını uygula","Apply retention policy",self.retain,"manage")
        self.audit_table=self.table(["ID","UTC","Kullanıcı / User","İşlem / Action","Ayrıntı / Detail"])
        self.settings_page.addWidget(self.audit_table)
        self.message=QLabel();self.message.setWordWrap(True);layout.addWidget(self.message)
        self.refresh()
        model=data_directory()/"models"/"evaluation-models.json"
        if model.is_file():self.lab.model.setText(str(model))

    def setup_models(self):
        from PySide6.QtCore import QProcess
        if self.lab.process.state()!=QProcess.ProcessState.NotRunning:raise ValueError("Already running")
        reply=QMessageBox.question(self,"Model kurulumu / Model setup",
            "GitHub üzerinden yaklaşık 11 MB değerlendirme modeli indirilecek. Görüntüleriniz gönderilmez. "
            "Modeller yalnız çevrimdışı değerlendirmeye açıktır; ticari hak onayı henüz tamamlanmadı.\n\n"
            "Download about 11 MB of evaluation models from GitHub? Images stay local. "
            "These models are for offline evaluation; commercial rights clearance is pending.")
        if reply!=QMessageBox.StandardButton.Yes:return
        self.lab.buffer=b"";self.lab.had_error=False;self.lab.stopped=False;self.lab.messages=0
        self.lab.busy(True);self.lab.set_status("busy")
        prefix=["--worker"] if getattr(sys,"frozen",False) else ["-m","lpr.cli"]
        self.lab.process.start(sys.executable,prefix+["setup-models","--output",str(data_directory()/"models")])
        self.lab.timer.start(240000);self.tabs.setCurrentWidget(self.lab)

    def relay_status(self):
        from PySide6.QtCore import QProcess
        if self.lab.process.state()!=QProcess.ProcessState.NotRunning:raise ValueError("Already running")
        protocol,ok=QInputDialog.getItem(self,"Röle / Relay","Salt okunur protokol / Read-only protocol",["Modbus TCP","Shelly RPC"],0,False)
        if not ok:return
        values=self.fields(protocol,[("Host / IP","",False),("Port",502 if protocol=="Modbus TCP" else 80,False),("Unit ID",1,False),("Coil / switch ID (zero-based)",0,False)])
        if not values:return
        from .devices import host_name
        host_name(values['Host / IP'])
        port=int(values['Port']);unit=int(values['Unit ID']);channel=int(values['Coil / switch ID (zero-based)'])
        if not 1<=port<=65535 or not 0<=unit<=247 or not 0<=channel<=65535:raise ValueError("Invalid device address")
        self.lab.buffer=b"";self.lab.had_error=False;self.lab.stopped=False;self.lab.messages=0
        self.lab.busy(True);self.lab.set_status("busy")
        prefix=["--worker"] if getattr(sys,"frozen",False) else ["-m","lpr.cli"]
        self.lab.process.start(sys.executable,prefix+["device-status","--protocol",protocol,"--host",values['Host / IP'],"--port",str(port),"--unit",str(unit),"--channel",str(channel)])
        self.lab.timer.start(10000)

    def permitted(self,p):
        try:self.ops.check(self.session,p);return True
        except PermissionError:return False

    def page(self,key,tr,en):
        widget=QWidget();layout=QVBoxLayout(widget);layout.setContentsMargins(24,24,24,24)
        self.widgets[key]=(widget,tr,en);self.tabs.addTab(widget,tr)
        return layout

    def add_button(self,layout,tr,en,fn,permission="read"):
        button=QPushButton(tr);button.clicked.connect(lambda:self.guard(fn));button.setEnabled(self.permitted(permission))
        self.labels.append((button,tr,en,permission));layout.addWidget(button);return button

    def table(self,headers):
        table=QTableWidget(0,len(headers));table.setHorizontalHeaderLabels(headers)
        table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        table.setSelectionMode(QTableWidget.SelectionMode.SingleSelection)
        table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch);return table

    def fill(self,table,rows):
        table.setRowCount(len(rows))
        for row,values in enumerate(rows):
            for col,value in enumerate(values):table.setItem(row,col,QTableWidgetItem(str(value if value is not None else "—")))

    def switch_language(self,index):
        self.lang="tr" if index==0 else "en"
        for widget,tr,en in self.widgets.values():self.tabs.setTabText(self.tabs.indexOf(widget),tr if index==0 else en)
        self.tabs.setTabText(self.tabs.indexOf(self.lab),"Tanıma" if index==0 else "Recognition")
        for button,tr,en,_ in self.labels:button.setText(tr if index==0 else en)

    def notice(self,text):self.message.setText(text)

    def guard(self,fn):
        try:fn()
        except PermissionError:self.notice("Yetki veya oturum geçersiz / Permission denied or session expired")
        except Exception:self.notice("İşlem tamamlanamadı; değerleri ve dosya erişimini kontrol edin. / Could not complete; check values and file access.")

    def refresh(self):
        if not hasattr(self,"search"):return
        try:
            rows=self.ops.history(self.session,self.search.text())
            utc=lambda n:datetime.fromtimestamp(n,timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
            self.fill(self.history_table,[(r["id"],utc(r["at"]),r["camera"],r["plate"],f'{r["confidence"]:.1%}',r["status"],r["source"]) for r in rows])
            grants=self.ops.grants(self.session);cameras=self.ops.cameras(self.session)
            self.fill(self.grant_table,[(r["plate"],r["category"],bool(r["blocked"]),utc(r["valid_from"]),utc(r["valid_until"]),r["direction"],r["remaining"]) for r in grants])
            self.fill(self.camera_table,[(r["id"],r["name"],r["direction"]) for r in cameras])
            self.fill(self.audit_table,[(r["id"],utc(r["at"]),r["actor"],r["action"],r["detail"]) for r in self.ops.audit(self.session)])
            self.summary.setText(f"{len(cameras)} kamera / cameras\n{len(grants)} araç izni / vehicle permissions\n{len(rows)} son kayıt / recent records (max. 500)")
        except PermissionError:self.notice("Oturum süresi doldu / Session expired")

    def fields(self,title,fields):
        dialog=QDialog(self);dialog.setWindowTitle(title);layout=QFormLayout(dialog);edits={}
        for name,initial,secret in fields:
            edit=QLineEdit(str(initial));edits[name]=edit
            if secret:edit.setEchoMode(QLineEdit.EchoMode.Password)
            layout.addRow(name,edit)
        buttons=QDialogButtonBox(QDialogButtonBox.StandardButton.Ok|QDialogButtonBox.StandardButton.Cancel)
        buttons.accepted.connect(dialog.accept);buttons.rejected.connect(dialog.reject);layout.addRow(buttons)
        return {k:v.text() for k,v in edits.items()} if dialog.exec()==QDialog.DialogCode.Accepted else None

    def add_grant(self):
        data=self.fields("Araç izni / Vehicle permission",[("Plate","",False),("Category (resident/staff/visitor)","visitor",False),
            ("Blocked (yes/no)","no",False),("Valid days",1,False),("Direction (entry/exit/both)","entry",False),("Uses (empty=unlimited)","",False)])
        if data:
            days=int(data["Valid days"])
            if not 1<=days<=3650:raise ValueError("Invalid days")
            if data["Blocked (yes/no)"] not in {"yes","no"}:raise ValueError("Invalid block")
            self.ops.save_grant(self.session,data["Plate"],data["Category (resident/staff/visitor)"],data["Blocked (yes/no)"]=="yes",
                time.time(),time.time()+days*86400,data["Direction (entry/exit/both)"],int(data["Uses (empty=unlimited)"]) if data["Uses (empty=unlimited)"] else None)
            self.refresh()

    def add_camera(self):
        brand,ok=QInputDialog.getItem(self,"Kamera / Camera","Bağlantı profili / Connection profile",["Hikvision","Dahua","Custom RTSP"],0,False)
        if not ok:return
        if brand!="Custom RTSP":
            data=self.fields(brand,[("ID","gate-1",False),("Name",brand,False),("Host / IP","",False),("Port",554,False),("Channel",1,False),("Username","",False),("Password","",True),("Direction (entry/exit)","entry",False)])
            if data:
                from .devices import rtsp_url
                source=rtsp_url(brand.lower(),data["Host / IP"],int(data["Port"]),int(data["Channel"]),data["Username"],data["Password"])
                self.ops.save_camera(self.session,data["ID"],data["Name"],source,data["Direction (entry/exit)"]);self.refresh()
            return
        data=self.fields("Kamera / Camera",[("ID","gate-1",False),("Name","",False),("RTSP URL","",True),("Direction (entry/exit)","entry",False)])
        if data:self.ops.save_camera(self.session,data["ID"],data["Name"],data["RTSP URL"],data["Direction (entry/exit)"]);self.refresh()

    def start_camera(self):
        from PySide6.QtCore import QProcess,QProcessEnvironment
        from .vision import load_manifest
        row=self.camera_table.currentRow()
        if row<0:raise ValueError("Select camera")
        camera_id=self.camera_table.item(row,0).text()
        load_manifest(self.lab.model.text())
        if self.lab.process.state()!=QProcess.ProcessState.NotRunning:raise ValueError("Already running")
        source=self.ops.camera_source(self.session,camera_id)
        env=QProcessEnvironment.systemEnvironment();env.insert("PYTHONUTF8","1");env.insert("IPSCANS_LPR_RTSP",source)
        self.lab.process.setProcessEnvironment(env)
        self.lab.buffer=b"";self.lab.had_error=False;self.lab.stopped=False;self.lab.messages=0
        self.lab.busy(True);self.lab.set_status("busy")
        prefix=["--worker"] if getattr(sys,"frozen",False) else ["-m","lpr.cli"]
        self.lab.process.start(sys.executable,prefix+["live","--models",self.lab.model.text(),"--camera",camera_id,"--seconds","60"])
        self.lab.timer.start(75000);self.tabs.setCurrentWidget(self.lab)
        # Remove the secret from the reusable process environment after child launch.

    def simulate(self):
        value=self.ops.simulate(self.session,self.sim_plate.text(),.99,self.sim_direction.currentText(),
            physical_presence=self.sim_presence.isChecked(),fresh=self.sim_presence.isChecked())
        self.sim_result.setText(f"{value['reason']}\nBariyer komutu / Barrier command: 0");self.refresh()

    def correct(self):
        row=self.history_table.currentRow()
        if row<0:raise ValueError("Select record")
        event=int(self.history_table.item(row,0).text())
        data=self.fields("Düzelt / Correct",[("Plate",self.history_table.item(row,3).text(),False),("Reason","",False)])
        if data:self.ops.correct(self.session,event,data["Plate"],data["Reason"]);self.refresh()

    def export(self):
        path,_=QFileDialog.getSaveFileName(self,"CSV","lpr-report.csv","CSV (*.csv)")
        if not path:return
        rows=self.ops.export_rows(self.session,self.search.text())
        target=Path(path)
        fd,tmp=tempfile.mkstemp(prefix=".lpr-",suffix=".csv",dir=target.parent)
        temporary=Path(tmp)
        with os.fdopen(fd,"w",encoding="utf-8-sig",newline="") as file:
            keys=["id","at","camera","plate","confidence","status","source"]
            writer=csv.DictWriter(file,fieldnames=keys);writer.writeheader()
            for row in rows:
                writer.writerow({k:("'"+str(v) if isinstance(v,str) and v.startswith(("=","+","-","@")) else v) for k,v in row.items()})
        os.replace(temporary,target);self.refresh();self.notice("CSV kaydedildi / CSV saved")

    def add_user(self):
        data=self.fields("Kullanıcı / User",[("Username","",False),("Password","",True),("Role (admin/operator/auditor)","operator",False)])
        if data:self.ops.add_user(self.session,data["Username"],data["Password"],data["Role (admin/operator/auditor)"]);self.refresh()

    def retain(self):
        if QMessageBox.question(self,"Saklama / Retention","Süreyi aşan kayıtlar silinsin mi? / Delete records older than the selected period?")!=QMessageBox.StandardButton.Yes:return
        count=self.ops.retain(self.session,self.retention.value());self.refresh();self.notice(f"Silinen / Deleted: {count}")

    def lock_session(self):
        self.lab.cancel();self.ops.logout(self.session);self.hide()
        self.lab.process.waitForFinished(1000)
        login=Login(self.ops)
        if login.exec()==QDialog.DialogCode.Accepted:
            self.session=login.session;self.account.setText(f"{self.session.username} / {self.session.role}")
            self.lab.table.setRowCount(0)
            for button,_,_,permission in self.labels:button.setEnabled(self.permitted(permission))
            self.refresh();self.show()
        else:self.close()

    def closeEvent(self,event):
        self.lab.close();self.ops.logout(self.session);super().closeEvent(event)


def main():
    app=QApplication(sys.argv[:1])
    # Initialize Qt font handling before the sign-in dialog.
    initializer=RecognitionWindow();initializer.close()
    ops=Operations(str(data_directory()/"operations.sqlite3"))
    login=Login(ops)
    if login.exec()!=QDialog.DialogCode.Accepted:ops.close();return 0
    window=ProductWindow(ops,login.session);window.show()
    code=app.exec();ops.close();return code
