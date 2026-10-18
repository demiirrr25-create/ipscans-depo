"""Five-section operator workspace, live camera wall and database-backed event feed."""
from datetime import datetime
import math
from pathlib import Path
import time
from PySide6.QtCore import QRectF, Qt, QTimer
from PySide6.QtGui import QBrush, QColor, QFont, QLinearGradient, QPainter, QPainterPath, QPen, QPixmap, QRadialGradient
from PySide6.QtWidgets import (QWidget,QVBoxLayout,QHBoxLayout,QLabel,QPushButton,QListWidget,
    QSplitter,QScrollArea,QFrame,QDialog,QDialogButtonBox,QFormLayout,QLineEdit,QTabWidget)
from .event_service import EventService,DurablePassageQueue
from .theme import (
    DARK_STYLE,
    DARK_TOKENS,
    LIGHT_STYLE,
    LIGHT_TOKENS,
    STYLE,
    TOKENS,
    apply_theme,
    create_theme_toggle_button,
    detect_os_theme,
    get_stylesheet,
    get_theme,
    get_tokens,
    persist_theme,
    set_theme,
    toggle_theme,
    update_theme_toggle_button,
)


class IPScansWelcomeBanner(QWidget):
    """Executive minimalist IPScans header bar for LPR Pro (Light & Dark Mode aware)."""

    def __init__(self, eyebrow: str, headline: str, compact: bool = True, parent=None):
        super().__init__(parent)
        self._eyebrow = eyebrow
        self._headline = headline
        self._compact = compact
        self.setFixedHeight(68 if compact else 84)

    def paintEvent(self, _event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        rect = QRectF(0.5, 0.5, max(1.0, self.width() - 1.0), max(1.0, self.height() - 1.0))
        path = QPainterPath()
        path.addRoundedRect(rect, 14.0, 14.0)

        is_light = get_theme() == "light"
        tokens = get_tokens()

        # 1. Surface with subtle linear gradient matching active theme
        bg = QLinearGradient(0.0, 0.0, float(self.width()), float(self.height()))
        if is_light:
            bg.setColorAt(0.0, QColor("#F8F9FA"))
            bg.setColorAt(1.0, QColor("#F1F3F6"))
        else:
            bg.setColorAt(0.0, QColor("#0D0F14"))
            bg.setColorAt(1.0, QColor("#141821"))
        painter.fillPath(path, QBrush(bg))

        # 2. Subtle ambient corner illumination
        halo = QRadialGradient(30.0, 20.0, 220.0)
        if is_light:
            halo.setColorAt(0.0, QColor(47, 107, 255, 16))
            halo.setColorAt(1.0, QColor(47, 107, 255, 0))
        else:
            halo.setColorAt(0.0, QColor(76, 130, 255, 22))
            halo.setColorAt(1.0, QColor(0, 0, 0, 0))
        painter.fillPath(path, QBrush(halo))

        # 3. Outer hairline border
        border_color = QColor(11, 13, 18, 22) if is_light else QColor(255, 255, 255, 24)
        painter.setPen(QPen(border_color, 1.0))
        painter.drawPath(path)

        # 4. Eyebrow badge
        mono = QFont("Segoe UI", 8)
        mono.setBold(True)
        mono.setLetterSpacing(QFont.SpacingType.AbsoluteSpacing, 1.4)
        painter.setFont(mono)
        painter.setPen(QColor(tokens["ink_3"]))
        painter.drawText(
            QRectF(20.0, 14.0, float(self.width()) - 40.0, 16.0),
            int(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter),
            self._eyebrow.upper(),
        )

        # 5. Crisp executive headline
        title_font = QFont("Segoe UI", 13 if self._compact else 15)
        title_font.setWeight(QFont.Weight.DemiBold)
        title_font.setLetterSpacing(QFont.SpacingType.AbsoluteSpacing, -0.2)
        painter.setFont(title_font)
        painter.setPen(QColor(tokens["ink"]))
        painter.drawText(
            QRectF(20.0, 32.0 if self._compact else 36.0, float(self.width()) - 40.0, 24.0),
            int(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter),
            self._headline,
        )
        painter.end()


# Backward compatibility alias
AntigravityWelcomeBanner = IPScansWelcomeBanner



def label(text='',name=None):
    item=QLabel(text);item.setTextFormat(Qt.TextFormat.PlainText);item.setWordWrap(True)
    if name:item.setObjectName(name)
    return item


class LiveDashboard(QWidget):
    def __init__(self,window):
        super().__init__();self.window=window;self.center=None;self.signature=None;self.feed_signature=None;self.closing=False
        self.events=EventService(window.ops)
        from .registry import Registry
        self.registry=Registry(window.ops)
        database=window.ops.path
        journal=database.with_name(database.stem+'-event-outbox.sqlite3') if str(database)!=':memory:' else ':memory:'
        self.queue=DurablePassageQueue(journal)
        root=QVBoxLayout(self);root.setContentsMargins(0,0,0,0)
        bar=QHBoxLayout();bar.addWidget(label('Canlı izleme','pageTitle'));bar.addStretch()
        self.health=label('Kameralar hazırlanıyor…','muted');bar.addWidget(self.health);root.addLayout(bar)
        self.metrics=label('','muted');root.addWidget(self.metrics)
        self.splitter=QSplitter(Qt.Orientation.Horizontal);root.addWidget(self.splitter,1)
        self.wall=QWidget();self.wall_layout=QVBoxLayout(self.wall);self.wall_layout.setContentsMargins(0,0,0,0)
        self.empty=label('Henüz etkin kamera yok. Kameralar bölümünden bir kamera ekleyin.');self.wall_layout.addWidget(self.empty)
        self.splitter.addWidget(self.wall)
        right=QWidget();right_layout=QVBoxLayout(right);right_layout.setContentsMargins(8,0,0,0)
        right_layout.addWidget(label('Son araç geçişleri','pageTitle'))
        self.search=QLineEdit();self.search.setPlaceholderText('Son 30 geçişte plaka ara');self.search.textChanged.connect(self.refresh_feed)
        right_layout.addWidget(self.search)
        scroll=QScrollArea();scroll.setWidgetResizable(True);self.feed=QWidget();self.feed_layout=QVBoxLayout(self.feed)
        self.feed_layout.setContentsMargins(0,0,0,0);scroll.setWidget(self.feed);right_layout.addWidget(scroll,1)
        self.splitter.addWidget(right);self.splitter.setSizes([940,370]);right.setMinimumWidth(285)
        self.timer=QTimer(self);self.timer.setInterval(1000);self.timer.timeout.connect(self.tick);self.timer.start()
        QTimer.singleShot(0,self.sync_cameras)

    def sync_cameras(self):
        if self.closing:return
        w=self.window
        if not w.autostart:return
        if not w.permitted('stream'):
            self.empty.setText('Bu hesap canlı izleme yetkisine sahip değil. Geçiş kayıtları görüntülenebilir.');return
        from .camera_metadata import CameraMetadata
        cameras=[r for r in CameraMetadata(w.ops).list(w.session) if r['enabled']]
        if len(cameras)>16:
            if self.center:self.center.close()
            self.empty.setText('Canlı izleme için en fazla 16 kamera etkinleştirin.');return
        cameras=[{**c,'source':w.ops.camera_stream_source(w.session,c['id']),
                  'calibration':w.ops.camera_calibration(w.session,c['id']),
                  'lines':w.ops.camera_calibration(w.session,c['id']).trigger_lines,
                  'roi':w.ops.camera_region(w.session,c['id'])} for c in cameras]
        signature=tuple((c['id'],c['source'],c['transport'],c.get('decoder_mode','software')) for c in cameras)
        if self.center and not self.center.closing and signature==self.signature:
            for camera in cameras:
                for existing in self.center.cameras:
                    if existing['id']==camera['id']:existing.update(camera)
                self.center.tiles[camera['id']].update_metadata(camera)
            from .vision import build_pipeline
            model=w.lab.model.text()
            self.center.pipeline_factory=(lambda:build_pipeline(model)) if Path(model).is_file() else None
            self.center.ocr_button.setEnabled(self.center.pipeline_factory is not None)
            return
        if self.center:
            self.center.close()
            if not self.stopped():
                QTimer.singleShot(150,self.sync_cameras);return
            self.wall_layout.removeWidget(self.center);self.center.deleteLater();self.center=None
        self.signature=signature;self.empty.setVisible(not cameras)
        if not cameras:return
        from .camera_center import CameraCenter
        from .vision import build_pipeline
        model=w.lab.model.text()
        self.center=CameraCenter(cameras,self,embedded=True,authorize=lambda:w.ops.check(w.session,'stream'),
            open_detail=self.detail,pipeline_factory=(lambda:build_pipeline(model)) if Path(model).is_file() else None,
            on_result=self.consume)
        self.wall_layout.addWidget(self.center,1);self.center.show()

    def detail(self,camera_id,worker,parent):
        w=self.window
        if not w.permitted('manage'):
            w.notice('Kalibrasyon için yönetici yetkisi gerekir.');return
        w.guard(lambda:w.preview_camera(camera_id,worker,parent));self.sync_cameras()

    def consume(self,result):
        # Closing stops the periodic drain timer. Free durable capacity before
        # retrying a batch, and do not enqueue its already accepted prefix again.
        self.deliver()
        passages=result.get('passages',[])
        for index in range(result.get('_outbox_offset',0),len(passages)):
            self.queue.enqueue(passages[index])
            result['_outbox_offset']=index+1
        # Raw OCR candidates are displayed as hints; only tracked crossings enter the event feed.
        if self.center and result['camera'] in self.center.tiles:
            decisions=result.get('decisions',[])
            if decisions:self.center.tiles[result['camera']].last_plate=decisions[-1]['plate']
        self.deliver()

    def deliver(self):
        try:
            session=getattr(self.window,'delivery_session',None) or self.window.session
            count=self.queue.drain(lambda e:self.events.persist(session,e))
            if count and self.window.permitted('read'):self.refresh_feed(force=True)
        except Exception:
            # Durable data remains queued. Never claim successful persistence.
            self.health.setText(f'Kayıt bekliyor: {self.queue.pending}. Veritabanı erişimi tekrar denenecek.')
            return False
        return True

    def tick(self):
        if self.closing:return
        try:
            self.window.ops.check(self.window.session,'read')
            delivered=self.deliver()
            if delivered:self.health.setText(f'Bekleyen kayıt: {self.queue.pending}')
            self.refresh_feed()
            midnight=datetime.now().replace(hour=0,minute=0,second=0,microsecond=0).timestamp()
            total=self.window.ops.db.execute("SELECT count(*),coalesce(sum(direction='entry'),0),coalesce(sum(direction='exit'),0) FROM vehicle_passages WHERE at>=?",(midnight,)).fetchone()
            self.metrics.setText(f'Bugün {total[0]} geçiş  ·  {total[1]} giriş  ·  {total[2]} çıkış  ·  Yerel saat')
            self.window.passage_browser.refresh()
        except PermissionError:self.stop()
        except Exception:self.health.setText('Veriler okunamadı; yeniden denenecek.')

    def refresh_feed(self,*_,force=False):
        from .registry import Registry
        rows=self.events.latest(self.window.session)
        search=self.search.text().replace(' ','').upper()
        names={c['id']:c['name'] for c in self.window.ops.cameras(self.window.session)}
        registry=self.registry
        entries=[]
        for row in rows:
            plate=row['corrected_plate'] or row['plate']
            if search and search not in plate:continue
            registered=registry.lookup(self.window.session,plate) if plate and (row['status']=='recognized' or row['corrected_plate']) else None
            entries.append((row,plate,registered))
        signature=repr(entries)
        if signature==self.feed_signature and not force:return
        self.feed_signature=signature
        while self.feed_layout.count():
            item=self.feed_layout.takeAt(0)
            if item.widget():item.widget().deleteLater()
        if not entries:self.feed_layout.addWidget(label('Henüz eşleşen geçiş kaydı yok.','muted'))
        for row,plate,vehicle in entries:
            card=QFrame();card.setObjectName('eventCard');layout=QVBoxLayout(card)
            title=QPushButton(plate or 'PLAKA OKUNAMADI');title.clicked.connect(lambda checked=False,e=row['event_id']:self.open_event(e));layout.addWidget(title)
            statuses={'registered':'KAYITLI ARAÇ','unknown':'TANIMSIZ ARAÇ','visitor':'ZİYARETÇİ','staff':'PERSONEL',
                      'temporary':'GEÇİCİ İZİNLİ','blocked':'YASAKLI ARAÇ','inactive':'PASİF ARAÇ'}
            state=statuses.get(vehicle.get('status'),'TANIMSIZ ARAÇ') if vehicle else ('İNCELEME GEREKİYOR' if row['status']!='recognized' and not row['corrected_plate'] else 'TANIMSIZ ARAÇ')
            layout.addWidget(label(state))
            if vehicle:
                description=' '.join(str(vehicle.get(k) or '') for k in ('color','make','model')).strip()
                if description:layout.addWidget(label(description,'muted'))
            if vehicle:
                owners=vehicle.get('owners',[])
                for owner in owners[:3]:
                    layout.addWidget(label(' '.join(filter(None,[owner.get('first_name'),owner.get('last_name')]))))
                    unit=' · '.join(str(owner.get(k) or '') for k in ('block','unit')).strip(' ·')
                    if unit:layout.addWidget(label(unit,'muted'))
            direction='Giriş' if row['direction']=='entry' else 'Çıkış'
            layout.addWidget(label(f"{names.get(row['camera'],row['camera'])} · {direction}\n{datetime.fromtimestamp(row['at']):%d.%m.%Y %H:%M:%S} · Güven {row['confidence']:.1%}",'muted'))
            images=self.window.ops.db.execute('SELECT vehicle,plate FROM passage_media WHERE event_id=?',(row['event_id'],)).fetchone()
            if images:
                for blob in images:
                    if blob:
                        pix=QPixmap();pix.loadFromData(blob);thumb=QLabel()
                        thumb.setPixmap(pix.scaled(260,130,Qt.AspectRatioMode.KeepAspectRatio,Qt.TransformationMode.SmoothTransformation));layout.addWidget(thumb)
            self.feed_layout.addWidget(card)
        self.feed_layout.addStretch()

    def open_event(self,event_id):
        w=self.window;data=self.events.details(w.session,event_id)
        dialog=QDialog(w);dialog.setWindowTitle('Geçiş ayrıntısı');dialog.resize(600,550);apply_theme(dialog);layout=QVBoxLayout(dialog)
        plate=data['corrections'][-1]['plate'] if data['corrections'] else data['plate']
        layout.addWidget(label(plate or 'PLAKA OKUNAMADI','pageTitle'))
        layout.addWidget(label(f"{data['camera_name']} · {data['direction']}\n{datetime.fromtimestamp(data['at']):%d.%m.%Y %H:%M:%S}\nOlay: {event_id}\nKaynak: yazılım / araç çizgi geçişi · Güven: {data['confidence']:.1%}"))
        vehicle=self.registry.lookup(w.session,plate) if plate and (data['status']=='recognized' or data['corrections']) else None
        if vehicle:
            for owner in vehicle.get('owners',[]):
                layout.addWidget(label(f"Araç kaydındaki kişi: {owner.get('first_name','')} {owner.get('last_name','')}\n{owner.get('block') or ''} · {owner.get('unit') or ''}"))
        for name,blob in data['images'].items():
            if blob:
                pix=QPixmap();pix.loadFromData(blob);image=QLabel();image.setPixmap(pix.scaled(550,190,Qt.AspectRatioMode.KeepAspectRatio,Qt.TransformationMode.SmoothTransformation));layout.addWidget(image)
        if not data['images']:layout.addWidget(label('Bu olay için görüntü kanıtı kaydedilmemiş.','muted'))
        for change in data['corrections']:
            layout.addWidget(label(f"Düzeltme: {change['plate']} · {change['actor']} · {change['reason']}",'muted'))
        actions=QHBoxLayout()
        register=QPushButton('Araç kaydına dönüştür');register.setEnabled(w.permitted('manage') and bool(plate))
        register.clicked.connect(lambda:w.registry_widget.create_vehicle(plate));actions.addWidget(register)
        correction=QPushButton('Okumayı düzelt');correction.setEnabled(w.permitted('review'))
        def correct():
            values=w.fields('Gerekçeli düzeltme',[('Plaka',plate,False),('Gerekçe','',False)])
            if values:
                self.events.correct(w.session,event_id,values['Plaka'],values['Gerekçe']);dialog.accept();self.refresh_feed(force=True)
        correction.clicked.connect(lambda:w.guard(correct));actions.addWidget(correction);layout.addLayout(actions)
        confirm=QPushButton('Gerçekleşen geçişi onayla');confirm.setEnabled(w.permitted('review') and bool(plate))
        def confirm_event():
            values=w.fields(f"{plate} · {data['direction']} · Gerçekleşen geçiş",[('Onay gerekçesi','',False)])
            if values:
                self.events.confirm(w.session,event_id,values['Onay gerekçesi'])
                w.refresh();dialog.accept()
        confirm.clicked.connect(lambda:w.guard(confirm_event));layout.addWidget(confirm)
        close=QDialogButtonBox(QDialogButtonBox.StandardButton.Close);close.rejected.connect(dialog.reject);layout.addWidget(close);dialog.exec()

    def stop(self):
        self.timer.stop();self.closing=True
        if self.center:self.center.close()

    def stopped(self):
        return not self.center or (not any(x.is_alive() for x in self.center.workers.values()) and not (self.center.inference and self.center.inference.is_alive()) and self.center.pending_result is None and not (self.center.inference and not self.center.inference.results.empty()))


def install_shell(window):
    from .registry_ui import RegistryWidget
    from .camera_management import CameraManagementPanel
    apply_theme(window)
    old=window.takeCentralWidget();old.hide();old.setParent(window)
    root=QWidget();window.setCentralWidget(root);layout=QVBoxLayout(root);layout.setContentsMargins(18,16,18,12)
    header=QHBoxLayout();brand=label('IPSCANS / LPR PRO','brand');brand.setWordWrap(False)
    header.addWidget(brand);header.addStretch();header.addWidget(window.account)
    window.theme_toggle_btn=getattr(window,'theme_toggle_btn',None) or create_theme_toggle_button(window)
    update_theme_toggle_button(window.theme_toggle_btn)
    header.addWidget(window.theme_toggle_btn)
    lock=QPushButton('Oturumu kilitle');lock.clicked.connect(window.lock_session);header.addWidget(lock);layout.addLayout(header)
    window.welcome_banner=IPScansWelcomeBanner(
        'IPSCANS LPR PRO · STATION WORKSPACE',
        'Yerel plaka tanıma, bağımsız kalibrasyon çizgileri ve canlı operatör çalışma alanı.',
        compact=True,
        parent=root,
    )
    layout.addWidget(window.welcome_banner)
    window.banner.setText('Geliştirme sürümü · Üretim kabul testleri sürüyor');layout.addWidget(window.banner)
    body=QHBoxLayout();layout.addLayout(body,1)
    window.navigation=QListWidget();window.navigation.setObjectName('navigation');window.navigation.setFixedWidth(195)
    titles=['Canlı İzleme','Kameralar','Araçlar ve Sakinler','Geçiş Kayıtları','Sistem Ayarları']
    window.navigation.addItems(titles);body.addWidget(window.navigation)
    # Keep Qt's page API for existing integrations, but expose exactly five navigation destinations.
    tabs=window.tabs
    while tabs.count():tabs.removeTab(0)
    tabs.tabBar().hide();body.addWidget(tabs,1)
    window.live_dashboard=LiveDashboard(window);tabs.addTab(window.live_dashboard,titles[0])
    window.camera_management=CameraManagementPanel(window.ops,window.session,on_add=window.add_camera,
        on_discover=window.discover_camera,on_calibrate=window.calibrate_camera,on_changed=window.refresh,on_connection=window.edit_camera_connection)
    tabs.addTab(window.camera_management,titles[1])
    vehicle_page=QTabWidget();window.registry_widget=RegistryWidget(window.ops,window.session)
    vehicle_page.addTab(window.registry_widget,'Araç ve sakin kayıtları');vehicle_page.addTab(window.widgets['vehicles'][0],'Geçiş izinleri')
    tabs.addTab(vehicle_page,titles[2])
    events=QTabWidget();events.addTab(window.widgets['passages'][0],'Araç geçişleri')
    events.addTab(window.widgets['history'][0],'Plaka okumaları');events.addTab(window.widgets['parking'][0],'Onaylı geçiş defteri')
    tabs.addTab(events,titles[3]);tabs.addTab(window.widgets['settings'][0],titles[4])
    maintenance=QPushButton('Yetkili bakım araçları');maintenance.setEnabled(window.permitted('manage'))
    maintenance.clicked.connect(lambda:window.guard(window.open_maintenance));window.settings_page.insertWidget(0,maintenance)
    setup=QPushButton('Kurulum rehberini aç');setup.setEnabled(window.permitted('manage'))
    setup.clicked.connect(lambda:window.guard(window.open_setup));window.settings_page.insertWidget(0,setup)
    updates=QPushButton('Güvenli güncelleme');updates.setEnabled(window.permitted('manage'))
    updates.clicked.connect(lambda:window.guard(window.open_updates));window.settings_page.insertWidget(0,updates)
    model=QHBoxLayout();model.addWidget(label('Model manifesti'));model.addWidget(window.lab.model)
    choose=QPushButton('Dosya seç');choose.clicked.connect(window.select_model);model.addWidget(choose);window.settings_page.insertLayout(1,model)
    window.navigation.currentRowChanged.connect(tabs.setCurrentIndex);tabs.currentChanged.connect(window.navigation.setCurrentRow)
    window.navigation.setCurrentRow(0);layout.addWidget(window.message)
    window.registry_widget.changed.connect(lambda:window.live_dashboard.refresh_feed(force=True))
    window.nested_sections=[vehicle_page,events]
    window.passage_browser.table.cellDoubleClicked.connect(lambda row,column:window.guard(
        lambda:window.live_dashboard.open_event(window.passage_browser.table.item(row,8).text())))
    window.operator_pages={'dashboard':window.live_dashboard,'cameras':window.camera_management,'vehicles':vehicle_page,'events':events,'settings':window.widgets['settings'][0]}


def __getattr__(name: str):
    if name in ("OperatorMainWindow", "ProductWindow"):
        from .application import ProductWindow
        return ProductWindow
    if name in ("LoginDialog", "Login"):
        from .application import Login
        return Login
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

