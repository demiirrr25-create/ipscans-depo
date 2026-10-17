"""Bounded network discovery and read-only capabilities before frame testing."""
from queue import Queue,Empty
from threading import Thread,Event
from urllib.parse import urlsplit
from PySide6.QtCore import QTimer,Qt
from PySide6.QtWidgets import (QDialog,QVBoxLayout,QFormLayout,QLineEdit,QSpinBox,
    QPushButton,QComboBox,QLabel,QCheckBox,QTableWidget,QTableWidgetItem,
    QAbstractItemView,QHeaderView,QScrollArea,QWidget)
from .onvif import OnvifClient,OnvifError


class OnvifDialog(QDialog):
    def __init__(self,parent=None,*,authorize=lambda:None,client_factory=OnvifClient):
        super().__init__(parent)
        self.authorize,self.client_factory=authorize,client_factory
        self.client=None;self.profiles=[];self.source=None;self.busy=False;self.closed=False
        self.device_information=None;self.capabilities=None;self.discovered=[]
        self.cancel=Event();self.results=Queue(maxsize=1)
        self.setWindowTitle('Ağda kamera bul · ONVIF');self.resize(760,680)
        outer=QVBoxLayout(self);scroll=QScrollArea();scroll.setWidgetResizable(True)
        content=QWidget();root=QVBoxLayout(content);scroll.setWidget(content);outer.addWidget(scroll,1)
        scope=QLabel('Yetkili yerel ağda ONVIF WS-Discovery araması yapılır. Arama kamera hesabı göndermez. Marka, model ve dahili ANPR yeteneği keşif yanıtından doğrulanmaz.')
        scope.setWordWrap(True);root.addWidget(scope)
        network_form=QFormLayout();self.interface=QLineEdit();self.interface.setPlaceholderText('Otomatik ağ arayüzü')
        network_form.addRow('Yerel arayüz IPv4 (isteğe bağlı)',self.interface);root.addLayout(network_form)
        self.network=QPushButton('Ağda kamera bul (3 saniye)');self.network.clicked.connect(self.find_devices);root.addWidget(self.network)
        self.devices=QTableWidget(0,6)
        self.devices.setHorizontalHeaderLabels(['IP adresi','Keşif adı','Marka','Model','Durum','Dahili ANPR'])
        self.devices.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self.devices.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.devices.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
        self.devices.verticalHeader().hide();self.devices.setMaximumHeight(155)
        self.devices.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.ResizeToContents)
        self.devices.horizontalHeader().setSectionResizeMode(1,QHeaderView.ResizeMode.Stretch)
        self.devices.itemSelectionChanged.connect(lambda:self.use_device.setEnabled(not self.busy and self.devices.currentRow()>=0))
        root.addWidget(self.devices)
        self.use_device=QPushButton('Seçili kameranın adresini kullan');self.use_device.setEnabled(False)
        self.use_device.clicked.connect(self.use_discovered);root.addWidget(self.use_device)
        form=QFormLayout();root.addLayout(form)
        self.host=QLineEdit();self.port=QSpinBox();self.port.setRange(1,65535);self.port.setValue(80)
        self.username=QLineEdit();self.password=QLineEdit();self.password.setEchoMode(QLineEdit.EchoMode.Password)
        self.https=QCheckBox('HTTPS');self.path=QLineEdit('/onvif/device_service')
        for label,widget in [('IP / Host',self.host),('ONVIF port',self.port),('Kamera kullanıcı adı',self.username),('Kamera parolası',self.password),('Bağlantı',self.https),('ONVIF servis yolu',self.path)]:form.addRow(label,widget)
        hint=QLabel('MC510 üzerinde doğrulanan ONVIF portu: 2020. Cihazın kendi kamera hesabını kullanın.')
        hint.setWordWrap(True);root.addWidget(hint)
        self.discover=QPushButton('Cihazı ve profilleri sorgula');self.discover.clicked.connect(self.find_profiles);root.addWidget(self.discover)
        self.capability_label=QLabel('Cihaz yetenekleri henüz sorgulanmadı.');self.capability_label.setTextFormat(Qt.TextFormat.PlainText)
        self.capability_label.setWordWrap(True);root.addWidget(self.capability_label)
        self.choice=QComboBox();root.addWidget(self.choice)
        self.select=QPushButton('Seçili profili canlı görüntüde test et');self.select.setEnabled(False)
        self.select.clicked.connect(self.select_profile);root.addWidget(self.select)
        self.status=QLabel('Bir cihaz seçin veya kamera adresini ve ONVIF hesabını girin.');self.status.setWordWrap(True);root.addWidget(self.status)
        cancel=QPushButton('İptal');cancel.clicked.connect(self.reject);outer.addWidget(cancel)
        self.timer=QTimer(self);self.timer.timeout.connect(self.poll);self.timer.start(100)
        for field in (self.host,self.username,self.password,self.path):field.textEdited.connect(self.invalidate)
        self.port.valueChanged.connect(self.invalidate);self.https.toggled.connect(self.invalidate)

    def invalidate(self,*args):
        self.client=None;self.profiles=[];self.choice.clear();self.select.setEnabled(False)
        self.device_information=None;self.capabilities=None
        self.capability_label.setText('Cihaz yetenekleri henüz sorgulanmadı.')

    def find_devices(self):
        if self.busy:return
        from .discovery import discover_cameras
        import ipaddress
        self.invalidate()
        interface=self.interface.text().strip() or '0.0.0.0'
        try:
            ipaddress.IPv4Address(interface)
            self.launch(lambda:('devices',discover_cameras(interface=interface,cancel=self.cancel)))
        except ValueError:self.status.setText('Yerel bilgisayarın geçerli bir IPv4 adresini girin veya alanı boş bırakın.')
        except PermissionError:self.reject()

    def use_discovered(self):
        row=self.devices.currentRow()
        if self.busy or not 0<=row<len(self.discovered):return
        parts=urlsplit(self.discovered[row].endpoint)
        self.invalidate();self.host.setText(parts.hostname)
        self.port.setValue(parts.port or (443 if parts.scheme=='https' else 80));self.https.setChecked(parts.scheme=='https')
        self.path.setText((parts.path or '/')+('?' + parts.query if parts.query else ''))
        self.username.clear();self.password.clear()
        self.status.setText('Adres seçildi. Bu kameranın hesabını girip cihazı sorgulayın.')

    def launch(self,operation):
        self.authorize();self.busy=True
        for widget in (self.host,self.port,self.username,self.password,self.https,self.path,self.discover,self.select,self.choice,self.network,self.devices,self.use_device,self.interface):widget.setEnabled(False)
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
            def query():
                profiles=client.profiles()
                information=capabilities=None
                # Optional metadata reads must not block an otherwise usable profile.
                try:information=client.device_information()
                except OnvifError:pass
                if self.cancel.is_set():return ('cancelled',)
                try:capabilities=client.capabilities()
                except OnvifError:pass
                return ('profiles',client,profiles,information,capabilities)
            self.launch(query)
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
        for widget in (self.host,self.port,self.username,self.password,self.https,self.path,self.discover,self.choice,self.network,self.devices,self.interface):widget.setEnabled(True)
        self.use_device.setEnabled(self.devices.currentRow()>=0)
        if not success:self.status.setText(value);self.select.setEnabled(bool(self.profiles));return
        if value[0]=='cancelled':return
        if value[0]=='devices':
            self.discovered=value[1];self.devices.setRowCount(len(self.discovered))
            for index,device in enumerate(self.discovered):
                values=(urlsplit(device.endpoint).hostname,device.name,'Sorgulanmadı','Sorgulanmadı','Keşif yanıtı alındı','Doğrulanmadı')
                for column,text in enumerate(values):
                    item=QTableWidgetItem(text);item.setToolTip(text);self.devices.setItem(index,column,item)
            self.use_device.setEnabled(self.devices.currentRow()>=0)
            self.status.setText('Bir kamera seçin; hesap bilgileri arama sırasında gönderilmedi.' if value[1] else 'Kamera bulunamadı. IP ve portu elle girebilirsiniz.')
            return
        if value[0]=='uri':self.source=value[1];self.password.clear();self.accept();return
        _,self.client,self.profiles,self.device_information,self.capabilities=value
        self.choice.clear()
        for profile in self.profiles:self.choice.addItem(f'{profile.name} · {profile.encoding} · {profile.width}×{profile.height}')
        information=self.device_information;caps=self.capabilities
        brand=information.manufacturer if information and information.manufacturer else 'Bilinmiyor'
        model=information.model if information and information.model else 'Bilinmiyor'
        events='Servis bildirildi; olay alımı doğrulanmadı' if caps and caps.events_service else 'Doğrulanmadı'
        self.capability_label.setText(f'{brand} · {model}\nONVIF Media1: profiller alındı · RTSP görüntüsü: test bekliyor\nOlay bildirimi: {events}\nDahili ANPR, araç fotoğrafı ve giriş/çıkış olayları: doğrulanmadı. Yazılım ANPR kullanılabilir.')
        for index,device in enumerate(self.discovered):
            if urlsplit(device.endpoint).hostname==self.host.text().strip():
                for column,text in ((2,brand),(3,model),(4,'Profiller alındı')):self.devices.setItem(index,column,QTableWidgetItem(text))
        self.select.setEnabled(True);self.status.setText('Profili seçin. Kaydetmeden önce gerçek görüntü doğrulanacak.')

    def done(self,result):
        self.closed=True;self.cancel.set();self.timer.stop();self.password.clear()
        super().done(result)
