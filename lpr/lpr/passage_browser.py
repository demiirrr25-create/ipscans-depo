"""Bounded passage history with explicit filters and stable page navigation."""
from datetime import datetime,timezone
import time
from PySide6.QtCore import QDateTime,QTimeZone
from PySide6.QtWidgets import (QWidget,QVBoxLayout,QHBoxLayout,QFormLayout,QLineEdit,QComboBox,
    QCheckBox,QDateTimeEdit,QSpinBox,QPushButton,QLabel,QTableWidget,QTableWidgetItem,QHeaderView)
from .passage_query import PassageFilter


class PassageBrowser(QWidget):
    def __init__(self,ops,session,parent=None):
        super().__init__(parent)
        self.ops,self.session=ops,session
        self.filters=PassageFilter();self.cursor=None;self.snapshot=None;self.previous=[];self.next_cursor=None
        self.last_refresh=0.
        self.session_token=session.token
        layout=QVBoxLayout(self)
        fields=QHBoxLayout();left=QFormLayout();right=QFormLayout();fields.addLayout(left);fields.addLayout(right)
        self.plate=QLineEdit();self.plate.setMaxLength(32);self.plate.setPlaceholderText('34 ABC / partial plate')
        self.camera=QComboBox();self.camera.addItem('Tüm kameralar / All cameras','')
        self.direction=QComboBox();self.kind=QComboBox();self.status=QComboBox()
        for widget,options in ((self.direction,[('Tümü / All',''),('Giriş / Entry','entry'),('Çıkış / Exit','exit')]),
                (self.kind,[('Tümü / All',''),('Otomobil / Car','car'),('Motosiklet / Motorcycle','motorcycle'),('Otobüs / Bus','bus'),('Kamyon / Truck','truck')]),
                (self.status,[('Tümü / All',''),('Doğrulandı / Recognized','recognized'),('İnceleme / Review','review'),('Okunamadı / Unread','unread')])):
            for label,value in options:widget.addItem(label,value)
        left.addRow('Plaka / Plate',self.plate);left.addRow('Kamera / Camera',self.camera);left.addRow('Yön / Direction',self.direction)
        right.addRow('Araç / Vehicle',self.kind);right.addRow('Durum / Status',self.status)
        confidence=QHBoxLayout();self.minimum=QSpinBox();self.maximum=QSpinBox()
        for spin in (self.minimum,self.maximum):spin.setRange(0,100);spin.setSuffix('%');confidence.addWidget(spin)
        self.maximum.setValue(100);right.addRow('Güven aralığı / Confidence',confidence)
        layout.addLayout(fields)
        dates=QHBoxLayout();self.use_dates=QCheckBox('Tarih aralığı / Date range (UTC)');dates.addWidget(self.use_dates)
        self.start=QDateTimeEdit(QDateTime.currentDateTimeUtc().addDays(-1));self.end=QDateTimeEdit(QDateTime.currentDateTimeUtc())
        for widget in (self.start,self.end):
            widget.setTimeZone(QTimeZone.utc())
            widget.setDisplayFormat('yyyy-MM-dd HH:mm:ss');widget.setCalendarPopup(True);widget.setEnabled(False)
            self.use_dates.toggled.connect(widget.setEnabled);dates.addWidget(widget)
        layout.addLayout(dates)
        actions=QHBoxLayout();apply=QPushButton('Filtrele / Apply');apply.clicked.connect(self.apply_filters)
        self.plate.returnPressed.connect(self.apply_filters);actions.addWidget(apply)
        reset=QPushButton('Temizle / Reset');reset.clicked.connect(self.reset_filters);actions.addWidget(reset)
        fresh=QPushButton('En yeni kayıtlar / Latest');fresh.clicked.connect(self.latest);actions.addWidget(fresh);actions.addStretch()
        layout.addLayout(actions)
        self.table=QTableWidget(0,9);self.table.setHorizontalHeaderLabels(['UTC','Kamera','Çizgi','Yön','Araç','Plaka','Güven','Durum','Olay ID'])
        self.table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self.table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.ResizeToContents)
        self.table.horizontalHeader().setStretchLastSection(True);layout.addWidget(self.table,1)
        navigation=QHBoxLayout();self.back=QPushButton('Önceki / Previous');self.forward=QPushButton('Sonraki / Next')
        self.back.clicked.connect(self.previous_page);self.forward.clicked.connect(self.next_page)
        navigation.addWidget(self.back);navigation.addWidget(self.forward);self.info=QLabel();navigation.addWidget(self.info,1)
        layout.addLayout(navigation)
        self.error=QLabel();self.error.setWordWrap(True);layout.addWidget(self.error)

    def update_cameras(self):
        selected=self.camera.currentData();items=self.ops.cameras(self.session)
        self.camera.clear();self.camera.addItem('Tüm kameralar / All cameras','')
        for row in items:self.camera.addItem(f"{row['name']} ({row['id']})",row['id'])
        index=self.camera.findData(selected);self.camera.setCurrentIndex(max(0,index))

    def apply_filters(self):
        try:
            candidate=PassageFilter(plate=self.plate.text(),camera=self.camera.currentData() or '',
                direction=self.direction.currentData(),vehicle_type=self.kind.currentData(),status=self.status.currentData(),
                start=self.start.dateTime().toSecsSinceEpoch() if self.use_dates.isChecked() else None,
                end=self.end.dateTime().toSecsSinceEpoch() if self.use_dates.isChecked() else None,
                min_confidence=self.minimum.value()/100,max_confidence=self.maximum.value()/100)
            candidate.sql();self.filters=candidate;self.latest()
        except ValueError:self.error.setText('Tarih ve güven aralığını kontrol edin. / Check date and confidence ranges.')

    def reset_filters(self):
        self.plate.clear();self.use_dates.setChecked(False);self.minimum.setValue(0);self.maximum.setValue(100)
        for widget in (self.camera,self.direction,self.kind,self.status):widget.setCurrentIndex(0)
        self.apply_filters()

    def latest(self):
        self.cursor=None;self.snapshot=None;self.previous=[];self.load_page()

    def next_page(self):
        if self.next_cursor is None:return
        self.previous.append(self.cursor);self.cursor=self.next_cursor;self.load_page()

    def previous_page(self):
        if not self.previous:return
        self.cursor=self.previous.pop();self.load_page()

    def refresh(self):
        try:self.ops.check(self.session,'read')
        except PermissionError:
            self.table.setRowCount(0);self.back.setEnabled(False);self.forward.setEnabled(False)
            self.error.setText('Oturum veya yetki geçersiz / Session expired or permission denied')
            return
        if self.session.token!=self.session_token:
            self.session_token=self.session.token;self.latest();return
        # Keep older pages fixed while new live events arrive; latest refreshes at most every 2s.
        if not self.previous and time.monotonic()-self.last_refresh>=2:
            self.snapshot=None;self.load_page()

    def load_page(self):
        try:
            page=self.ops.passage_page(self.session,self.filters,before=self.cursor,snapshot=self.snapshot)
            self.update_cameras()
            self.snapshot=page['snapshot'];self.next_cursor=page['next_cursor'];self.last_refresh=time.monotonic()
            self.table.setRowCount(len(page['rows']))
            for index,row in enumerate(page['rows']):
                values=[datetime.fromtimestamp(row['at'],timezone.utc).strftime('%Y-%m-%d %H:%M:%S'),
                    row['camera'],row['line_id'],row['direction'],row['vehicle_type'],row['plate'] or '—',
                    f"{row['confidence']:.1%}",row['status'],row['event_id']]
                for column,value in enumerate(values):self.table.setItem(index,column,QTableWidgetItem(value))
            self.back.setEnabled(bool(self.previous));self.forward.setEnabled(self.next_cursor is not None)
            self.info.setText(f"Sayfa / Page {len(self.previous)+1} · {len(page['rows'])} kayıt / records · 100 / page")
            self.error.clear()
        except PermissionError:
            self.table.setRowCount(0);self.back.setEnabled(False);self.forward.setEnabled(False)
            self.error.setText('Oturum veya yetki geçersiz / Session expired or permission denied')
        except (ValueError,TypeError):self.error.setText('Geçersiz filtre / Invalid filter')
