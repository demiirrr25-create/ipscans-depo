"""Asynchronous, read-only ONVIF profile selection before decoded-frame testing."""
from queue import Queue,Empty
from threading import Thread
from urllib.parse import urlsplit
from PySide6.QtCore import QTimer
from PySide6.QtWidgets import QDialog,QVBoxLayout,QFormLayout,QLineEdit,QSpinBox,QPushButton,QComboBox,QLabel,QCheckBox
from .onvif import OnvifClient,OnvifError


class OnvifDialog(QDialog):
    def __init__(self,parent=None,*,authorize=lambda:None,client_factory=OnvifClient):
        super().__init__(parent)
        self.authorize,self.client_factory=authorize,client_factory
        self.client=None;self.profiles=[];self.source=None;self.busy=False;self.closed=False
        self.results=Queue(maxsize=1)
        self.setWindowTitle('ONVIF · Kamera profilleri');self.resize(580,400)
        root=QVBoxLayout(self)
        self.network=QPushButton('Ağda kamera bul (3 saniye)');self.network.clicked.connect(self.find_devices);root.addWidget(self.network)
        self.devices=QComboBox();root.addWidget(self.devices)
        self.use_device=QPushButton('Seçili kameranın adresini kullan');self.use_device.setEnabled(False)
        self.use_device.clicked.connect(self.use_discovered);root.addWidget(self.use_device)
        form=QFormLayout();root.addLayout(form)
        self.host=QLineEdit();self.port=QSpinBox();self.port.setRange(1,65535);self.port.setValue(80)
        self.username=QLineEdit();self.password=QLineEdit();self.password.setEchoMode(QLineEdit.EchoMode.Password)
        self.https=QCheckBox('HTTPS')
        self.path=QLineEdit('/onvif/device_service')
        for label,widget in [('IP / Host',self.host),('ONVIF port',self.port),('Kamera kullanıcı adı',self.username),('Kamera parolası',self.password),('Bağlantı',self.https)]:form.addRow(label,widget)
        form.addRow('ONVIF servis yolu',self.path)
        root.addWidget(QLabel('Mercusys: ONVIF portu genellikle 2020. Kamera hesabını kullanın.'))
        self.discover=QPushButton('Profilleri bul');self.discover.clicked.connect(self.find_profiles);root.addWidget(self.discover)
        self.choice=QComboBox();root.addWidget(self.choice)
        self.select=QPushButton('Seçili profili canlı görüntüde test et');self.select.setEnabled(False)
        self.select.clicked.connect(self.select_profile);root.addWidget(self.select)
        self.status=QLabel('Kamera adresini ve ONVIF hesabını girin.');self.status.setWordWrap(True);root.addWidget(self.status)
        cancel=QPushButton('İptal');cancel.clicked.connect(self.reject);root.addWidget(cancel)
        self.timer=QTimer(self);self.timer.timeout.connect(self.poll);self.timer.start(100)
        for field in (self.host,self.username,self.password,self.path):field.textEdited.connect(self.invalidate)
        self.port.valueChanged.connect(self.invalidate);self.https.toggled.connect(self.invalidate)

    def invalidate(self,*args):
        self.client=None;self.profiles=[];self.choice.clear();self.select.setEnabled(False)

    def find_devices(self):
        if self.busy:return
        from .discovery import discover_cameras
        self.invalidate()
        try:self.launch(lambda:('devices',discover_cameras()))
        except PermissionError:self.reject()

    def use_discovered(self):
        device=self.devices.currentData()
        if self.busy or device is None:return
        parts=urlsplit(device.endpoint)
        self.invalidate()
        self.host.setText(parts.hostname);self.port.setValue(parts.port or (443 if parts.scheme=='https' else 80))
        self.https.setChecked(parts.scheme=='https')
        self.path.setText((parts.path or '/')+('?' + parts.query if parts.query else ''))
        self.username.clear();self.password.clear()
        self.status.setText('Adres seçildi. Bu kameranın hesabını girip profilleri bulun.')

    def launch(self,operation):
        self.authorize();self.busy=True
        for widget in (self.host,self.port,self.username,self.password,self.https,self.path,self.discover,self.select,self.choice,self.network,self.devices,self.use_device):widget.setEnabled(False)
        self.status.setText('Kamera yanıtı bekleniyor…')
        results=self.results
        def run():
            try:results.put((True,operation()))
            except OnvifError as error:results.put((False,str(error)))
            except Exception:results.put((False,'ONVIF işlemi başarısız. Kamera erişimini kontrol edin.'))
        Thread(target=run,daemon=True,name='onvif-query').start()

    def find_profiles(self):
        if self.busy:return
        self.invalidate()
        try:
            client=self.client_factory(self.host.text(),self.port.value(),self.username.text(),self.password.text(),https=self.https.isChecked(),device_path=self.path.text())
            self.launch(lambda:('profiles',client,client.profiles()))
        except (ValueError,PermissionError):self.status.setText('Bağlantı bilgilerini ve oturum yetkisini kontrol edin.')

    def select_profile(self):
        if self.busy or self.client is None or self.choice.currentIndex()<0:return
        client,profile=self.client,self.profiles[self.choice.currentIndex()]
        try:self.launch(lambda:('uri',client.stream_uri(profile)))
        except PermissionError:self.reject()

    def poll(self):
        if self.closed:return
        try:self.authorize()
        except PermissionError:self.reject();return
        try:success,value=self.results.get_nowait()
        except Empty:return
        self.busy=False
        for widget in (self.host,self.port,self.username,self.password,self.https,self.path,self.discover,self.choice,self.network,self.devices):widget.setEnabled(True)
        self.use_device.setEnabled(self.devices.count()>0)
        if not success:self.status.setText(value);self.select.setEnabled(bool(self.profiles));return
        if value[0]=='devices':
            self.devices.clear()
            for device in value[1]:self.devices.addItem(f'{device.name} · {device.endpoint}',device)
            self.use_device.setEnabled(self.devices.count()>0)
            self.status.setText('Bir kamera seçin; hesap bilgileri arama sırasında gönderilmedi.' if value[1] else 'Kamera bulunamadı. IP ve portu elle girebilirsiniz.')
            return
        if value[0]=='uri':self.source=value[1];self.password.clear();self.accept();return
        _,self.client,self.profiles=value
        self.choice.clear()
        for profile in self.profiles:self.choice.addItem(f'{profile.name} · {profile.encoding} · {profile.width}×{profile.height}')
        self.select.setEnabled(True);self.status.setText('Profili seçin. Kaydetmeden önce gerçek görüntü doğrulanacak.')

    def done(self,result):
        self.closed=True;self.timer.stop();self.password.clear()
        super().done(result)
