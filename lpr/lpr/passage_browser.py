"""Bounded passage history with explicit filters and stable page navigation."""
from datetime import datetime,timezone
import time
from PySide6.QtCore import QDateTime,QTimeZone,Qt
from PySide6.QtWidgets import (QWidget,QVBoxLayout,QHBoxLayout,QFormLayout,QLineEdit,QComboBox,
    QCheckBox,QDateTimeEdit,QSpinBox,QPushButton,QLabel,QTableWidget,QTableWidgetItem,QHeaderView,QFileDialog)
from .passage_query import PassageFilter
from .theme import apply_theme


class PassageBrowser(QWidget):
    def __init__(self,ops,session,parent=None):
        super().__init__(parent)
        apply_theme(self)
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
        registry=QHBoxLayout()
        self.registration=QComboBox()
        for label,value in [('Tümü',''),('Kayıtlı araç','registered'),('Tanımsız araç','unknown'),('Eşleştirme bekliyor','review')]:self.registration.addItem(label,value)
        self.block=QComboBox();self.unit=QComboBox()
        self.block.addItem('Tüm bloklar',None);self.unit.addItem('Tüm daireler',None)
        for name,widget in [('Araç kaydı',self.registration),('Blok',self.block),('Daire',self.unit)]:
            registry.addWidget(QLabel(name));registry.addWidget(widget,1)
        self.block.currentIndexChanged.connect(lambda _:self.update_units())
        layout.addLayout(registry)
        dates=QHBoxLayout();self.use_dates=QCheckBox('Tarih aralığı / Date range (UTC)');dates.addWidget(self.use_dates)
        self.start=QDateTimeEdit(QDateTime.currentDateTimeUtc().addDays(-1));self.end=QDateTimeEdit(QDateTime.currentDateTimeUtc())
        for widget in (self.start,self.end):
            widget.setTimeZone(QTimeZone.utc())
            widget.setDisplayFormat('yyyy-MM-dd HH:mm:ss');widget.setCalendarPopup(True);widget.setEnabled(False)
            self.use_dates.toggled.connect(widget.setEnabled);dates.addWidget(widget)
        layout.addLayout(dates)
        actions=QHBoxLayout();apply=QPushButton('Filtrele / Apply');apply.setObjectName('primaryBtn');apply.clicked.connect(self.apply_filters)
        self.plate.returnPressed.connect(self.apply_filters);actions.addWidget(apply)
        reset=QPushButton('Temizle / Reset');reset.clicked.connect(self.reset_filters);actions.addWidget(reset)
        fresh=QPushButton('En yeni kayıtlar / Latest');fresh.clicked.connect(self.latest);actions.addWidget(fresh);actions.addStretch()
        layout.addLayout(actions)
        reports=QHBoxLayout();summary=QPushButton('Geçiş raporu / Passage report');summary.clicked.connect(self.show_report)
        reports.addWidget(summary);self.export_format=QComboBox()
        self.export_format.addItem('CSV - geçişler / passages','csv');self.export_format.addItem('XLSX - geçişler / passages','xlsx')
        self.export_format.addItem('PDF - özet rapor / summary','pdf');reports.addWidget(self.export_format)
        self.export_button=QPushButton('Filtrelenen kayıtları aktar / Export filtered records')
        self.export_button.clicked.connect(self.export_csv);reports.addWidget(self.export_button);reports.addStretch()
        layout.addLayout(reports)
        # Keep Event ID at column 8 for the operator workspace's detail action.
        self.table=QTableWidget(0,12);self.table.setHorizontalHeaderLabels(['UTC','Kamera','Çizgi','Yön','Araç','Plaka','Güven','Karar','Olay ID','Araç kaydı','Blok','Daire'])
        self.table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self.table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.table.setColumnHidden(8, True)  # Internal event identity remains available to detail actions.
        self.table.setAlternatingRowColors(True);self.table.verticalHeader().hide()
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.ResizeToContents)
        self.table.horizontalHeader().setStretchLastSection(True);layout.addWidget(self.table,1)
        navigation=QHBoxLayout();self.back=QPushButton('Önceki / Previous');self.forward=QPushButton('Sonraki / Next')
        self.back.clicked.connect(self.previous_page);self.forward.clicked.connect(self.next_page)
        navigation.addWidget(self.back);navigation.addWidget(self.forward);self.info=QLabel();self.info.setObjectName('muted');navigation.addWidget(self.info,1)
        layout.addLayout(navigation)
        self.error=QLabel();self.error.setWordWrap(True);layout.addWidget(self.error)

    def registry_available(self):
        tables={row[0] for row in self.ops.db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        return {'blocks','units','residents','vehicles','vehicle_owners'}<=tables

    def update_registry_filters(self):
        self.ops.check(self.session,'read')
        selected=self.block.currentData()
        items=[('Tüm bloklar',None)]
        if self.registry_available():items.extend((row['name'],row['id']) for row in self.ops.db.execute('SELECT id,name FROM blocks ORDER BY name,id'))
        current=[(self.block.itemText(i),self.block.itemData(i)) for i in range(self.block.count())]
        if current!=items:
            self.block.blockSignals(True)
            self.block.clear()
            for name,identity in items:self.block.addItem(name,identity)
            self.block.setCurrentIndex(max(0,self.block.findData(selected)))
            self.block.blockSignals(False)
        self.update_units(preserve=True)

    def update_units(self,*,preserve=False):
        try:self.ops.check(self.session,'read')
        except PermissionError:
            self.unit.clear();self.unit.addItem('Tüm daireler',None)
            self.error.setText('Oturum veya yetki geçersiz / Session expired or permission denied')
            return
        selected=self.unit.currentData() if preserve else None
        items=[('Tüm daireler',None)]
        if self.registry_available():
            block_id=self.block.currentData()
            where=' WHERE u.block_id=?' if block_id is not None else ''
            rows=self.ops.db.execute('SELECT u.id,u.number,b.name AS block FROM units u JOIN blocks b ON b.id=u.block_id'+where+' ORDER BY b.name,u.number,u.id',(block_id,) if block_id is not None else ())
            items.extend((f"{row['block']} / {row['number']}",row['id']) for row in rows)
        current=[(self.unit.itemText(i),self.unit.itemData(i)) for i in range(self.unit.count())]
        if current!=items or not preserve:
            self.unit.clear()
            for name,identity in items:self.unit.addItem(name,identity)
            self.unit.setCurrentIndex(max(0,self.unit.findData(selected)))

    def registry_locations(self,rows):
        identities=sorted({row.get('registry_vehicle_id') for row in rows if row.get('registry_vehicle_id') is not None})
        if not identities or not self.registry_available():return {}
        placeholders=','.join('?' for _ in identities)
        values={}
        for row in self.ops.db.execute('SELECT DISTINCT vo.vehicle_id,b.name AS block,u.number AS unit FROM vehicle_owners vo '
                'JOIN residents resident ON resident.id=vo.resident_id JOIN units u ON u.id=resident.unit_id '
                'JOIN blocks b ON b.id=u.block_id WHERE vo.vehicle_id IN ('+placeholders+') ORDER BY b.name,u.number',identities):
            values.setdefault(row['vehicle_id'],[]).append((row['block'],row['unit']))
        return values

    def update_cameras(self):
        selected=self.camera.currentData();items=self.ops.cameras(self.session)
        self.camera.clear();self.camera.addItem('Tüm kameralar / All cameras','')
        for row in items:self.camera.addItem(f"{row['name']} ({row['id']})",row['id'])
        index=self.camera.findData(selected);self.camera.setCurrentIndex(max(0,index))
        self.refresh_camera_names()

    def refresh_camera_names(self):
        names={c['id']:c['name'] for c in self.ops.cameras(self.session)}
        for row in range(self.table.rowCount()):
            item=self.table.item(row,1)
            if item is not None and item.data(Qt.ItemDataRole.UserRole):
                identity=item.data(Qt.ItemDataRole.UserRole);item.setText(names.get(identity,identity))

    def apply_filters(self):
        try:
            candidate=PassageFilter(plate=self.plate.text(),camera=self.camera.currentData() or '',
                direction=self.direction.currentData(),vehicle_type=self.kind.currentData(),status=self.status.currentData(),
                start=self.start.dateTime().toSecsSinceEpoch() if self.use_dates.isChecked() else None,
                end=self.end.dateTime().toSecsSinceEpoch() if self.use_dates.isChecked() else None,
                min_confidence=self.minimum.value()/100,max_confidence=self.maximum.value()/100,
                registration=self.registration.currentData(),block_id=self.block.currentData(),unit_id=self.unit.currentData())
            candidate.sql();self.filters=candidate;self.latest()
        except ValueError:self.error.setText('Tarih ve güven aralığını kontrol edin. / Check date and confidence ranges.')

    def reset_filters(self):
        self.plate.clear();self.use_dates.setChecked(False);self.minimum.setValue(0);self.maximum.setValue(100)
        for widget in (self.camera,self.direction,self.kind,self.status,self.registration,self.block,self.unit):widget.setCurrentIndex(0)
        self.apply_filters()

    def latest(self):
        self.cursor=None;self.snapshot=None;self.previous=[];self.load_page()

    def show_report(self):
        from .passage_report import PassageReport
        try:
            report=self.ops.passage_report(self.session,self.filters)
            PassageReport(report,self).exec()
        except PermissionError:self.error.setText('Rapor yetkisi veya oturum geçersiz / Report permission or session invalid')
        except ValueError:self.error.setText('Daha kısa bir tarih aralığı seçin / Select a shorter date range')

    def export_csv(self):
        from .passage_export import export_passages_csv,export_passages_xlsx,export_passage_summary_pdf
        try:
            self.ops.check(self.session,'export')
            extension=self.export_format.currentData()
            path,_=QFileDialog.getSaveFileName(self,'Geçiş raporu / Passage report','lpr-passages.'+extension,extension.upper()+' (*.'+extension+')')
            if not path:return
            if not path.lower().endswith('.'+extension):path+='.'+extension
            exporter={'csv':export_passages_csv,'xlsx':export_passages_xlsx,'pdf':export_passage_summary_pdf}[extension]
            count=exporter(self.ops,self.session,self.filters,path)
            self.error.setText(f'{count} geçiş rapora dahil edildi / passages included · UTC')
        except PermissionError:self.error.setText('Dışa aktarım yetkisi yok veya dosyaya erişilemiyor / Permission denied or destination inaccessible')
        except ValueError:self.error.setText('Tarih aralığını daraltın / Narrow the date range (CSV/XLSX: 100,000 records; PDF: 10,000 groups)')
        except OSError:self.error.setText('Dosya yazılamadı / Could not write file')

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
            try:self.ops.check(self.session,'export');self.export_button.setEnabled(True)
            except PermissionError:self.export_button.setEnabled(False)
            page=self.ops.passage_page(self.session,self.filters,before=self.cursor,snapshot=self.snapshot)
            self.update_cameras()
            self.update_registry_filters()
            self.snapshot=page['snapshot'];self.next_cursor=page['next_cursor'];self.last_refresh=time.monotonic()
            selected_item = self.table.item(self.table.currentRow(), 8)
            selected_event = selected_item.text() if selected_item else None
            scroll_position = self.table.verticalScrollBar().value()
            self.table.clearSelection()
            self.table.setCurrentCell(-1, -1)
            self.table.setRowCount(len(page['rows']))
            names={c['id']:c['name'] for c in self.ops.cameras(self.session)}
            locations=self.registry_locations(page['rows'])
            registration_labels={'registered':'Kayıtlı araç','unknown':'Tanımsız araç','review':'Eşleştirme bekliyor'}
            for index,row in enumerate(page['rows']):
                addresses=locations.get(row.get('registry_vehicle_id'),())
                values=[datetime.fromtimestamp(row['at'],timezone.utc).strftime('%Y-%m-%d %H:%M:%S'),
                    names.get(row['camera'],row['camera']),row['line_id'],row['direction'],row['vehicle_type'],row['plate'] or '—',
                    f"{row['confidence']:.1%}",row['status'],row['event_id'],registration_labels[row['registration']],
                    ' / '.join(dict.fromkeys(block for block,_ in addresses)) or '—',
                    '; '.join(f'{block} / {unit}' for block,unit in addresses) or '—']
                for column,value in enumerate(values):self.table.setItem(index,column,QTableWidgetItem(value))
                self.table.item(index,1).setData(Qt.ItemDataRole.UserRole,row['camera'])
                if row['event_id'] == selected_event:self.table.setCurrentCell(index, 0)
                if row.get('corrected_plate'):
                    self.table.item(index,5).setToolTip('Operatör tarafından düzeltilen plaka. İlk OCR: '+(row.get('original_plate') or 'Okunamadı'))
                    self.table.item(index,7).setText(row['status']+' · Düzeltilmiş')
            self.table.verticalScrollBar().setValue(scroll_position)
            self.back.setEnabled(bool(self.previous));self.forward.setEnabled(self.next_cursor is not None)
            self.info.setText(f"Sayfa / Page {len(self.previous)+1} · {len(page['rows'])} kayıt / records · 100 / page")
            self.error.clear()
        except PermissionError:
            self.table.setRowCount(0);self.back.setEnabled(False);self.forward.setEnabled(False)
            self.error.setText('Oturum veya yetki geçersiz / Session expired or permission denied')
        except (ValueError,TypeError):self.error.setText('Geçersiz filtre / Invalid filter')
