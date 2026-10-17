"""Five-section operator workspace, live camera wall and database-backed event feed."""
from datetime import datetime
import math
from pathlib import Path
import time
from PySide6.QtCore import QRectF, Qt, QTimer
from PySide6.QtGui import QBrush, QColor, QFont, QLinearGradient, QPainter, QPainterPath, QPen, QPixmap
from PySide6.QtWidgets import (QWidget,QVBoxLayout,QHBoxLayout,QLabel,QPushButton,QListWidget,
    QSplitter,QScrollArea,QFrame,QDialog,QDialogButtonBox,QFormLayout,QLineEdit,QTabWidget)
from .event_service import EventService,DurablePassageQueue

STYLE='''
QMainWindow,QDialog,QWidget {background:#000000;color:#e8eaed;font-family:"Segoe UI","Inter",sans-serif;font-size:13px;}
QLabel {background:transparent;color:#e8eaed;}
QLabel#brand {font-size:18px;font-weight:600;letter-spacing:1.4px;color:#ffffff;}
QLabel#pageTitle {font-size:24px;font-weight:600;letter-spacing:-0.4px;color:#ffffff;}
QLabel#muted {color:#9aa0a6;}
QFrame#eventCard {background:#0d0e12;border:1px solid rgba(255,255,255,0.12);border-radius:18px;padding:6px;}
QPushButton {background:rgba(255,255,255,0.06);color:#e8eaed;border:1px solid rgba(255,255,255,0.14);border-radius:18px;padding:9px 16px;min-height:18px;font-weight:500;}
QPushButton:hover {background:rgba(255,255,255,0.12);border-color:rgba(255,255,255,0.28);color:#ffffff;}
QPushButton:disabled {color:#6f7480;background:rgba(255,255,255,0.02);border-color:rgba(255,255,255,0.06);}
QLineEdit,QComboBox,QSpinBox,QDoubleSpinBox,QDateTimeEdit {background:#090a0d;color:#ffffff;border:1px solid rgba(255,255,255,0.14);border-radius:16px;padding:8px 14px;selection-background-color:#ffffff;selection-color:#000000;}
QLineEdit:focus,QComboBox:focus,QSpinBox:focus,QDoubleSpinBox:focus,QDateTimeEdit:focus {border:1px solid rgba(255,255,255,0.52);}
QTableWidget,QListWidget {background:#0d0e12;alternate-background-color:#111318;border:1px solid rgba(255,255,255,0.10);border-radius:18px;gridline-color:rgba(255,255,255,0.06);}
QHeaderView::section {background:#090a0d;color:#9aa0a6;border:0;border-bottom:1px solid rgba(255,255,255,0.10);padding:10px 8px;font-weight:600;}
QListWidget#navigation {border:1px solid rgba(255,255,255,0.10);border-radius:20px;background:#0d0e12;font-size:13.5px;padding:6px;}
QListWidget#navigation::item {padding:14px 14px;margin:3px;border-radius:14px;color:#9aa0a6;font-weight:500;}
QListWidget#navigation::item:hover {background:rgba(255,255,255,0.06);color:#ffffff;}
QListWidget#navigation::item:selected {background:#ffffff;color:#000000;font-weight:600;}
QTabWidget::pane {border:0;}
QTabBar::tab {background:#0d0e12;color:#9aa0a6;border:1px solid rgba(255,255,255,0.10);border-radius:16px;padding:9px 18px;margin-right:6px;font-weight:500;}
QTabBar::tab:selected {background:#ffffff;color:#000000;border-color:#ffffff;font-weight:600;}
QScrollArea {border:0;}
QSplitter::handle {background:rgba(255,255,255,0.08);}
QCheckBox::indicator {width:16px;height:16px;border:1px solid rgba(255,255,255,0.35);background:#090a0d;border-radius:5px;}
QCheckBox::indicator:checked {background:#ffffff;border:1px solid #ffffff;}
'''


class AntigravityWelcomeBanner(QWidget):
    """Animated Antigravity capsule particle stage + typewriter headline for LPR Pro."""

    def __init__(self, eyebrow: str, headline: str, compact: bool = True, parent=None):
        super().__init__(parent)
        self._eyebrow = eyebrow
        self._headline = headline
        self._compact = compact
        self._phase = 0.0
        self._typed = 0
        self.setFixedHeight(74 if compact else 112)
        self._timer = QTimer(self)
        self._timer.setInterval(45)
        self._timer.timeout.connect(self._step)
        self._timer.start()

    def _step(self):
        self._phase += 0.055
        if self._typed < len(self._headline):
            self._typed += 1
        self.update()

    def paintEvent(self, _event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        rect = QRectF(0.5, 0.5, max(1.0, self.width() - 1.0), max(1.0, self.height() - 1.0))
        path = QPainterPath()
        path.addRoundedRect(rect, 20.0, 20.0)

        bg = QLinearGradient(0.0, 0.0, float(self.width()), float(self.height()))
        bg.setColorAt(0.0, QColor(11, 13, 19))
        bg.setColorAt(0.55, QColor(7, 8, 12))
        bg.setColorAt(1.0, QColor(13, 16, 24))
        painter.fillPath(path, QBrush(bg))

        cols = 18 if self._compact else 22
        rows = 4 if self._compact else 5
        palette = [QColor(50, 121, 249), QColor(88, 146, 250), QColor(183, 191, 217), QColor(232, 234, 237)]
        painter.save()
        painter.setClipPath(path)
        for r in range(rows):
            for c in range(cols):
                nx = (c + 0.5) / cols
                ny = (r + 0.5) / rows
                if ((nx - 0.34) / 0.36) ** 2 + ((ny - 0.5) / 0.45) ** 2 < 0.75:
                    continue
                wave = math.sin(nx * 5.2 + self._phase + ny * 2.1)
                col = QColor(palette[(r * cols + c) % len(palette)])
                col.setAlpha(int(max(12, min(130, 30 + (wave + 1.0) * 36))))
                px = nx * self.width() + math.cos(self._phase + r * 0.7) * 5.0
                py = ny * self.height() + wave * 4.0
                painter.save()
                painter.translate(px, py)
                painter.rotate(math.degrees(math.atan2(wave * 0.4, 1.0)))
                painter.setPen(Qt.PenStyle.NoPen)
                painter.setBrush(QBrush(col))
                painter.drawRoundedRect(QRectF(-4.5, -1.3, 9.0, 2.6), 1.3, 1.3)
                painter.restore()
        painter.restore()

        painter.setPen(QPen(QColor(255, 255, 255, 28), 1.0))
        painter.drawPath(path)

        mono = QFont("Consolas", 8)
        mono.setBold(True)
        painter.setFont(mono)
        painter.setPen(QColor(154, 160, 166))
        painter.drawText(QRectF(22.0, 13.0, float(self.width()) - 44.0, 16.0), int(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter), self._eyebrow.upper())

        shown = self._headline[: max(1, self._typed)]
        title_font = QFont("Segoe UI", 13 if self._compact else 16)
        title_font.setWeight(QFont.Weight.DemiBold)
        painter.setFont(title_font)
        painter.setPen(QColor(255, 255, 255))
        painter.drawText(QRectF(22.0, 33.0, float(self.width()) - 44.0, 30.0), int(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter), shown)

        fm = painter.fontMetrics()
        cx = min(float(self.width()) - 28.0, 22.0 + fm.horizontalAdvance(shown) + 5.0)
        if (self._typed < len(self._headline)) or (int(self._phase * 2.2) % 2 == 0):
            grad = QLinearGradient(cx, 37.0, cx, 57.0)
            grad.setColorAt(0.0, QColor(66, 133, 244))
            grad.setColorAt(0.5, QColor(234, 67, 53))
            grad.setColorAt(1.0, QColor(52, 168, 83))
            painter.setPen(Qt.PenStyle.NoPen)
            painter.setBrush(QBrush(grad))
            painter.drawRoundedRect(QRectF(cx, 38.0, 3.0, 19.0), 1.5, 1.5)
        painter.end()


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
        dialog=QDialog(w);dialog.setWindowTitle('Geçiş ayrıntısı');dialog.resize(600,550);layout=QVBoxLayout(dialog)
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
    window.setStyleSheet(STYLE)
    old=window.takeCentralWidget();old.hide();old.setParent(window)
    root=QWidget();window.setCentralWidget(root);layout=QVBoxLayout(root);layout.setContentsMargins(18,16,18,12)
    from . import __version__
    header=QHBoxLayout();brand=label('IPSCANS / LPR PRO · '+__version__,'brand');brand.setWordWrap(False)
    header.addWidget(brand);header.addStretch();header.addWidget(window.account)
    lock=QPushButton('Oturumu kilitle');lock.clicked.connect(window.lock_session);header.addWidget(lock);layout.addLayout(header)
    window.welcome_banner=AntigravityWelcomeBanner(
        'IPSCANS.COM · ANTIGRAVITY DESIGN SYSTEM · LPR PRO '+__version__,
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
