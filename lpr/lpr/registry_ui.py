"""Working vehicle, resident and location management widgets."""
from datetime import datetime
import csv
from html import escape
from pathlib import Path

from PySide6.QtCore import QDateTime, Qt, Signal
from PySide6.QtWidgets import (QAbstractItemView, QCheckBox, QComboBox, QDateTimeEdit,
    QDialog, QDialogButtonBox, QFileDialog, QFormLayout, QHBoxLayout, QHeaderView,
    QInputDialog, QLabel, QLineEdit, QListWidget, QListWidgetItem, QMessageBox,
    QPushButton, QScrollArea, QTableWidget, QTableWidgetItem, QTabWidget, QVBoxLayout, QWidget)

from .registry import FIELDS, Registry, STATUSES, VEHICLE_TYPES

STATUS_LABELS = dict(zip(STATUSES, ('Kayıtlı', 'Tanımsız', 'Ziyaretçi', 'Personel', 'Geçici izinli', 'Yasaklı', 'Pasif')))
TYPE_LABELS = dict(zip(VEHICLE_TYPES, ('Otomobil', 'Motosiklet', 'Otobüs', 'Kamyon', 'Diğer')))


def _combo(values, selected=None):
    widget = QComboBox()
    for key, label in values.items(): widget.addItem(label, key)
    if selected is not None: widget.setCurrentIndex(max(0, widget.findData(selected)))
    return widget


def _table(headers):
    table = QTableWidget(0, len(headers)); table.setHorizontalHeaderLabels(headers)
    table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
    table.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
    table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
    table.setAlternatingRowColors(True); table.verticalHeader().hide()
    table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
    return table


def _fill(table, rows):
    table.setRowCount(len(rows))
    for row, values in enumerate(rows):
        for column, value in enumerate(values):
            item = QTableWidgetItem(str(value or '—'))
            # Qt tooltips accept rich text. Imported names must remain plain text.
            item.setToolTip('<span>' + escape(str(value or '')) + '</span>')
            table.setItem(row, column, item)


def _stamp(value):
    return datetime.fromtimestamp(value).strftime('%d.%m.%Y %H:%M') if value is not None else '—'


class _Editor(QDialog):
    def __init__(self, title, parent):
        super().__init__(parent); self.setWindowTitle(title); self.resize(650, 660)
        outer = QVBoxLayout(self); scroll = QScrollArea(); scroll.setWidgetResizable(True)
        content = QWidget(); self.form = QFormLayout(content); self.form.setFieldGrowthPolicy(QFormLayout.FieldGrowthPolicy.AllNonFixedFieldsGrow)
        scroll.setWidget(content); outer.addWidget(scroll)
        self.error = QLabel(); self.error.setWordWrap(True); outer.addWidget(self.error)
        self.buttons = QDialogButtonBox(QDialogButtonBox.StandardButton.Save | QDialogButtonBox.StandardButton.Cancel)
        self.buttons.rejected.connect(self.reject); outer.addWidget(self.buttons)

    def submit(self, callback):
        try:
            callback(); self.accept()
        except (ValueError, PermissionError) as exc:
            self.error.setText(str(exc))


class ResidentEditor(_Editor):
    def __init__(self, registry, session, parent=None, resident=None):
        super().__init__('Sakin düzenle' if resident else 'Sakin ekle', parent)
        self.saved_id = None; data = resident or {}
        first = QLineEdit(data.get('first_name', '')); first.setMaxLength(120)
        last = QLineEdit(data.get('last_name', '')); last.setMaxLength(120)
        phone = QLineEdit(data.get('phone', '')); phone.setMaxLength(40)
        unit = QComboBox(); unit.addItem('Daire bağlantısı yok', None)
        for item in registry.units(session): unit.addItem(f"{item['block']} / {item['number']}", item['id'])
        unit.setCurrentIndex(max(0, unit.findData(data.get('unit_id'))))
        self.form.addRow('Ad', first); self.form.addRow('Soyad', last)
        self.form.addRow('Telefon (isteğe bağlı)', phone); self.form.addRow('Blok / daire', unit)
        note = QLabel('Aynı isimdeki kişiler otomatik birleştirilmez. Araç bağlantıları kayıt kimliğiyle tutulur.'); note.setWordWrap(True)
        self.form.addRow(note)
        def save():
            self.saved_id = registry.save_resident(session, first.text(), last.text(), phone=phone.text(), unit_id=unit.currentData(), resident_id=data.get('id'))
        self.buttons.accepted.connect(lambda: self.submit(save))


class VehicleEditor(_Editor):
    def __init__(self, registry, session, parent=None, vehicle=None, plate=''):
        super().__init__('Araç düzenle' if vehicle else 'Araç ekle', parent)
        data = vehicle or {}; self.saved_id = None
        self.plate = QLineEdit(data.get('plate', plate)); self.plate.setMaxLength(32)
        self.status = _combo(STATUS_LABELS, data.get('status', 'registered'))
        self.make = QLineEdit(data.get('make', '')); self.make.setMaxLength(80)
        self.model = QLineEdit(data.get('model', '')); self.model.setMaxLength(80)
        self.color = QLineEdit(data.get('color', '')); self.color.setMaxLength(60)
        self.type = _combo(TYPE_LABELS, data.get('vehicle_type', 'car'))
        self.entry = QCheckBox('Giriş kaydı izinli'); self.entry.setChecked(bool(data.get('entry_allowed')))
        self.exit = QCheckBox('Çıkış kaydı izinli'); self.exit.setChecked(bool(data.get('exit_allowed')))
        self.notes = QLineEdit(data.get('notes', '')); self.notes.setMaxLength(2000)
        self.form.addRow('Plaka', self.plate); self.form.addRow('Statü', self.status)
        self.form.addRow('Marka', self.make); self.form.addRow('Model', self.model)
        self.form.addRow('Renk', self.color); self.form.addRow('Tür', self.type)
        self.form.addRow(self.entry); self.form.addRow(self.exit)
        self.dates = {}
        for key, label in (('valid_from', 'İzin başlangıcı'), ('valid_until', 'İzin bitişi')):
            container = QWidget(); line = QHBoxLayout(container); line.setContentsMargins(0, 0, 0, 0)
            enabled = QCheckBox(label); value = QDateTimeEdit(); value.setCalendarPopup(True)
            value.setDisplayFormat('dd.MM.yyyy HH:mm'); value.setDateTime(QDateTime.currentDateTime())
            if data.get(key) is not None: value.setDateTime(QDateTime.fromSecsSinceEpoch(int(data[key])))
            enabled.setChecked(data.get(key) is not None); value.setEnabled(enabled.isChecked())
            enabled.toggled.connect(value.setEnabled); line.addWidget(enabled); line.addWidget(value)
            self.form.addRow(container); self.dates[key] = (enabled, value)
        selected = {owner['id']: owner for owner in data.get('owners', [])}
        self.owner_search = QLineEdit(); self.owner_search.setPlaceholderText('Yetkili kişi ara…')
        self.owner_list = QListWidget(); self.owner_list.setMinimumHeight(150)
        self.owner_status = QLabel(); self.owner_status.setWordWrap(True)
        self.form.addRow('Yetkili kişiler', self.owner_search); self.form.addRow(self.owner_list); self.form.addRow(self.owner_status)
        def owners_refresh():
            self.owner_list.blockSignals(True); self.owner_list.clear()
            people = registry.residents(session, self.owner_search.text(), limit=100)
            for owner in people:
                address = ' / '.join(value for value in (owner.get('block'), owner.get('unit')) if value)
                item = QListWidgetItem(f"{owner['first_name']} {owner['last_name']} · {address or 'Daire yok'} · #{owner['id']}")
                item.setData(Qt.ItemDataRole.UserRole, owner)
                item.setFlags(item.flags() | Qt.ItemFlag.ItemIsUserCheckable)
                item.setCheckState(Qt.CheckState.Checked if owner['id'] in selected else Qt.CheckState.Unchecked)
                self.owner_list.addItem(item)
            self.owner_list.blockSignals(False)
            self.owner_status.setText(f'{len(selected)} yetkili kişi seçili. İlk 100 eşleşme gösterilir; diğer kişiler için arayın.')
        def selection(item):
            owner = item.data(Qt.ItemDataRole.UserRole)
            if item.checkState() == Qt.CheckState.Checked: selected[owner['id']] = owner
            else: selected.pop(owner['id'], None)
            self.owner_status.setText(f'{len(selected)} yetkili kişi seçili. Arama değişse de seçim korunur.')
        def add_resident():
            editor = ResidentEditor(registry, session, self)
            if editor.exec():
                owner = registry.resident(session, editor.saved_id); selected[owner['id']] = owner; owners_refresh()
        self.owner_list.itemChanged.connect(selection); self.owner_search.textChanged.connect(owners_refresh)
        add = QPushButton('Yeni sakin ekle'); add.clicked.connect(add_resident); self.form.addRow(add); owners_refresh()
        self.form.addRow('Açıklama (yalnız yönetici)', self.notes)
        note = QLabel('İzinler kayıt durumunu tanımlar. Bariyer komutu verilmez. Geçici izinlerde iki tarih de zorunludur.'); note.setWordWrap(True)
        self.form.addRow(note)
        if data.get('legacy_plate'):
            note = QLabel('Önceki sürümün izin kaydı korunur. Eski tarih, yön ve kullanım sınırları ayrıca uygulanır.'); note.setWordWrap(True); self.form.addRow(note)
            self.plate.setReadOnly(True)
        def save():
            self.saved_id = registry.save_vehicle(session, self.plate.text(), vehicle_id=data.get('id'), status=self.status.currentData(),
                make=self.make.text(), model=self.model.text(), color=self.color.text(), vehicle_type=self.type.currentData(),
                entry_allowed=self.entry.isChecked(), exit_allowed=self.exit.isChecked(), notes=self.notes.text(), owner_ids=tuple(selected),
                **{key: widget.dateTime().toSecsSinceEpoch() if enabled.isChecked() else None for key, (enabled, widget) in self.dates.items()})
        self.buttons.accepted.connect(lambda: self.submit(save))


class RegistryWidget(QWidget):
    """Embed as the Vehicles navigation page; `changed` refreshes live lookups."""
    changed = Signal()

    def __init__(self, ops, session, parent=None):
        super().__init__(parent); self.ops, self.session = ops, session; self.registry = Registry(ops)
        self.offset = 0; self.resident_offset = 0; self.rows = []; self.resident_rows = []
        outer = QVBoxLayout(self); outer.setContentsMargins(0, 0, 0, 0)
        title = QLabel('Araç ve sakin yönetimi'); title.setStyleSheet('font-size:22px;font-weight:600'); outer.addWidget(title)
        hint = QLabel('Plaka, kişi ve daire kayıtlarını yönetin. Kişi eşleştirmeleri yalnız kayıtlı ilişkilerden gelir.'); hint.setWordWrap(True); outer.addWidget(hint)
        self.tabs = QTabWidget(); outer.addWidget(self.tabs)
        self.message = QLabel(); self.message.setWordWrap(True); outer.addWidget(self.message)
        self._vehicles(); self._residents(); self._locations(); self.refresh()

    def _button(self, title, callback, permission=None):
        button = QPushButton(title)
        button.clicked.connect(lambda: self._run(callback))
        if permission:
            try: self.ops.check(self.session, permission)
            except PermissionError: button.setEnabled(False)
        return button

    def _run(self, callback):
        try:
            self.ops.check(self.session, 'read'); callback()
        except Exception as exc:
            # No tracebacks/source paths/credentials in a product dialog.
            text = str(exc) if isinstance(exc, (ValueError, PermissionError)) else 'İşlem tamamlanamadı. Dosyanın kullanılabilir ve biçiminin uygun olduğunu kontrol edin.'
            self.message.setText(text)

    def _vehicles(self):
        pane = QWidget(); layout = QVBoxLayout(pane); self.tabs.addTab(pane, 'Araçlar')
        search = QHBoxLayout(); self.query = QLineEdit(); self.query.setPlaceholderText('Plaka, ad soyad, blok veya daire ara')
        self.status_filter = _combo({'': 'Tüm statüler', **STATUS_LABELS})
        self.block_filter = QComboBox(); self.unit_filter = QComboBox()
        search.addWidget(self.query, 3); search.addWidget(self.status_filter); search.addWidget(self.block_filter); search.addWidget(self.unit_filter)
        search.addWidget(self._button('Ara', self._search)); layout.addLayout(search)
        self.query.returnPressed.connect(lambda: self._run(self._search))
        self.block_filter.currentIndexChanged.connect(lambda: self._run(self._filter_units))
        dates = QHBoxLayout(); self.after_on = QCheckBox('Son geçiş başlangıcı'); self.before_on = QCheckBox('Son geçiş bitişi')
        self.after = QDateTimeEdit(QDateTime.currentDateTime().addDays(-30)); self.before = QDateTimeEdit(QDateTime.currentDateTime())
        for field in (self.after, self.before): field.setCalendarPopup(True); field.setDisplayFormat('dd.MM.yyyy HH:mm'); field.setEnabled(False)
        self.after_on.toggled.connect(self.after.setEnabled); self.before_on.toggled.connect(self.before.setEnabled)
        for field in (self.after_on, self.after, self.before_on, self.before): dates.addWidget(field)
        dates.addStretch(); layout.addLayout(dates)
        actions = QHBoxLayout()
        for title, callback, permission in (
            ('Araç ekle', self.create_vehicle, 'manage'), ('Düzenle', self.edit_vehicle, 'manage'), ('Sil', self.delete_vehicle, 'manage'),
            ('İçe aktar', self.import_file, 'manage'), ('CSV / Excel dışa aktar', self.export_file, 'export'), ('CSV şablonu', self.template, 'manage')):
            actions.addWidget(self._button(title, callback, permission))
        actions.addStretch(); layout.addLayout(actions)
        self.table = _table(['Plaka', 'Statü', 'Yetkili kişiler', 'Blok / daire', 'Araç', 'İzin', 'Son geçiş'])
        self.table.doubleClicked.connect(lambda: self._run(self.edit_vehicle)); layout.addWidget(self.table)
        bottom = QHBoxLayout(); self.count = QLabel(); bottom.addWidget(self.count); bottom.addStretch()
        self.previous = self._button('Önceki', lambda: self.turn(-100)); self.next = self._button('Sonraki', lambda: self.turn(100))
        bottom.addWidget(self.previous); bottom.addWidget(self.next); layout.addLayout(bottom)

    def _residents(self):
        pane = QWidget(); layout = QVBoxLayout(pane); self.tabs.addTab(pane, 'Sakinler')
        controls = QHBoxLayout(); self.resident_query = QLineEdit(); self.resident_query.setPlaceholderText('Sakin adı veya soyadı')
        controls.addWidget(self.resident_query); controls.addWidget(self._button('Ara', self.search_residents))
        for label, callback in (('Sakin ekle', self.add_resident), ('Düzenle', self.edit_resident), ('Sil', self.delete_resident)):
            controls.addWidget(self._button(label, callback, 'manage'))
        self.resident_query.returnPressed.connect(lambda: self._run(self.search_residents)); layout.addLayout(controls)
        self.resident_table = _table(['Ad', 'Soyad', 'Blok', 'Daire', 'Telefon (yönetici)'])
        self.resident_table.doubleClicked.connect(lambda: self._run(self.edit_resident)); layout.addWidget(self.resident_table)
        bottom = QHBoxLayout(); self.resident_count = QLabel(); bottom.addWidget(self.resident_count); bottom.addStretch()
        self.resident_previous = self._button('Önceki', lambda: self.turn_residents(-100))
        self.resident_next = self._button('Sonraki', lambda: self.turn_residents(100))
        bottom.addWidget(self.resident_previous); bottom.addWidget(self.resident_next); layout.addLayout(bottom)

    def _locations(self):
        pane = QWidget(); layout = QVBoxLayout(pane); self.tabs.addTab(pane, 'Bloklar ve daireler')
        self.locations = _table(['Blok', 'Daire']); layout.addWidget(self.locations)
        buttons = QHBoxLayout()
        for label, callback in (('Blok ekle', self.add_block), ('Blok düzenle', self.edit_block), ('Blok sil', self.delete_block),
                                ('Daire ekle', self.add_unit), ('Daire düzenle', self.edit_unit), ('Daire sil', self.delete_unit)):
            buttons.addWidget(self._button(label, callback, 'manage'))
        layout.addLayout(buttons)
        note = QLabel('Bağlı sakinleri olan daireler ve dairesi olan bloklar silinemez. Önce bağlantıları düzenleyin.'); note.setWordWrap(True); layout.addWidget(note)

    def _filters(self):
        start = self.after.dateTime().toSecsSinceEpoch() if self.after_on.isChecked() else None
        end = self.before.dateTime().toSecsSinceEpoch() if self.before_on.isChecked() else None
        if start is not None and end is not None and end <= start: raise ValueError('Bitiş başlangıçtan sonra olmalı')
        return dict(query=self.query.text(), status=self.status_filter.currentData(), block_id=self.block_filter.currentData(),
                    unit_id=self.unit_filter.currentData(), passed_after=start, passed_before=end)

    def _filter_units(self):
        previous = self.unit_filter.currentData(); self.unit_filter.clear(); self.unit_filter.addItem('Tüm daireler', None)
        for unit in self.registry.units(self.session, self.block_filter.currentData()):
            self.unit_filter.addItem(f"{unit['block']} / {unit['number']}", unit['id'])
        self.unit_filter.setCurrentIndex(max(0, self.unit_filter.findData(previous)))

    def refresh(self):
        self.ops.check(self.session, 'read')
        previous = self.block_filter.currentData(); self.block_filter.blockSignals(True); self.block_filter.clear(); self.block_filter.addItem('Tüm bloklar', None)
        blocks = self.registry.blocks(self.session)
        for block in blocks: self.block_filter.addItem(block['name'], block['id'])
        self.block_filter.setCurrentIndex(max(0, self.block_filter.findData(previous))); self.block_filter.blockSignals(False)
        self._filter_units(); self.refresh_vehicles(); self.refresh_residents()
        units = self.registry.units(self.session); self.location_rows = list(units)
        unit_blocks = {unit['block_id'] for unit in units}
        self.location_rows += [dict(id=None, block_id=block['id'], block=block['name'], number='') for block in blocks if block['id'] not in unit_blocks]
        self.location_rows.sort(key=lambda row: (row['block'], row['number']))
        _fill(self.locations, [(row['block'], row['number']) for row in self.location_rows])

    def refresh_vehicles(self):
        page = self.registry.page(self.session, **self._filters(), limit=100, offset=self.offset)
        if self.offset and not page['rows']: self.offset = 0; page = self.registry.page(self.session, **self._filters(), limit=100)
        self.rows = page['rows']
        _fill(self.table, [(row['plate'], STATUS_LABELS[row['status']],
            ', '.join(owner['first_name'] + ' ' + owner['last_name'] for owner in row['owners']),
            ', '.join(dict.fromkeys(' / '.join(value for value in (owner.get('block'), owner.get('unit')) if value) for owner in row['owners'])),
            ' '.join(value for value in (row['color'], row['make'], row['model']) if value),
            ('Giriş ' if row['access']['entry_allowed'] else '') + ('Çıkış' if row['access']['exit_allowed'] else ''), _stamp(row['last_passage'])) for row in self.rows])
        self.count.setText(f"{page['total']} araç · {self.offset + 1 if self.rows else 0}–{self.offset + len(self.rows)}")
        self.previous.setEnabled(self.offset > 0); self.next.setEnabled(self.offset + len(self.rows) < page['total'])

    def refresh_residents(self):
        people = self.registry.residents(self.session, self.resident_query.text(), limit=101, offset=self.resident_offset)
        self.resident_rows = people[:100]
        _fill(self.resident_table, [(row['first_name'], row['last_name'], row.get('block'), row.get('unit'), row.get('phone', 'Gizli')) for row in self.resident_rows])
        self.resident_count.setText(f'{self.resident_offset + 1 if people else 0}–{self.resident_offset + len(self.resident_rows)}')
        self.resident_previous.setEnabled(self.resident_offset > 0); self.resident_next.setEnabled(len(people) > 100)

    def _search(self): self.offset = 0; self.refresh_vehicles()
    def turn(self, delta): self.offset = max(0, self.offset + delta); self.refresh_vehicles()
    def search_residents(self): self.resident_offset = 0; self.refresh_residents()
    def turn_residents(self, delta): self.resident_offset = max(0, self.resident_offset + delta); self.refresh_residents()

    def _selected(self, table, rows):
        index = table.currentRow()
        if not 0 <= index < len(rows): raise ValueError('Önce tablodan bir kayıt seçin')
        return rows[index]

    def _saved(self): self.refresh(); self.changed.emit()

    def create_vehicle(self, plate=''):
        self.ops.check(self.session, 'manage')
        editor = VehicleEditor(self.registry, self.session, self, plate=plate)
        if editor.exec(): self._saved()

    def edit_vehicle(self):
        self.ops.check(self.session, 'manage')
        row = self._selected(self.table, self.rows)
        editor = VehicleEditor(self.registry, self.session, self, vehicle=self.registry.vehicle(self.session, row['id']))
        if editor.exec(): self._saved()

    def delete_vehicle(self):
        row = self._selected(self.table, self.rows); self._delete('vehicle', row['id'], 'Araç kaydı silinsin mi? Geçmiş geçişler ve önceki izin kayıtları korunur.')

    def add_resident(self):
        self.ops.check(self.session, 'manage')
        if ResidentEditor(self.registry, self.session, self).exec(): self._saved()

    def edit_resident(self):
        self.ops.check(self.session, 'manage')
        row = self._selected(self.resident_table, self.resident_rows)
        if ResidentEditor(self.registry, self.session, self, self.registry.resident(self.session, row['id'])).exec(): self._saved()

    def delete_resident(self):
        row = self._selected(self.resident_table, self.resident_rows)
        self._delete('resident', row['id'], 'Sakin ve araç sahipliği bağlantıları silinsin mi? Araçlar ve geçiş kayıtları korunur.')

    def _delete(self, kind, identifier, question):
        self.ops.check(self.session, 'manage')
        if QMessageBox.question(self, 'Kaydı sil', question, QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No, QMessageBox.StandardButton.No) == QMessageBox.StandardButton.Yes:
            self.registry.delete(self.session, kind, identifier); self._saved()

    def add_block(self):
        self.ops.check(self.session, 'manage'); name, ok = QInputDialog.getText(self, 'Blok ekle', 'Blok adı')
        if ok: self.registry.save_block(self.session, name); self._saved()

    def edit_block(self):
        self.ops.check(self.session, 'manage'); row = self._selected(self.locations, self.location_rows)
        name, ok = QInputDialog.getText(self, 'Blok düzenle', 'Blok adı', text=row['block'])
        if ok: self.registry.save_block(self.session, name, row['block_id']); self._saved()

    def delete_block(self):
        row = self._selected(self.locations, self.location_rows); self._delete('block', row['block_id'], 'Blok silinsin mi?')

    def _unit_dialog(self, row=None):
        self.ops.check(self.session, 'manage'); blocks = self.registry.blocks(self.session)
        if not blocks: raise ValueError('Önce bir blok ekleyin')
        dialog = _Editor('Daire düzenle' if row else 'Daire ekle', self); block = _combo({item['id']: item['name'] for item in blocks}, row['block_id'] if row else None)
        number = QLineEdit(row['number'] if row else ''); number.setMaxLength(40)
        dialog.form.addRow('Blok', block); dialog.form.addRow('Daire', number)
        dialog.buttons.accepted.connect(lambda: dialog.submit(lambda: self.registry.save_unit(self.session, block.currentData(), number.text(), row['id'] if row else None)))
        if dialog.exec(): self._saved()

    def add_unit(self): self._unit_dialog()
    def edit_unit(self):
        row = self._selected(self.locations, self.location_rows)
        if row['id'] is None: raise ValueError('Bu blokta henüz daire yok')
        self._unit_dialog(row)
    def delete_unit(self):
        row = self._selected(self.locations, self.location_rows)
        if row['id'] is None: raise ValueError('Bu blokta henüz daire yok')
        self._delete('unit', row['id'], 'Daire silinsin mi?')

    def import_file(self):
        self.ops.check(self.session, 'manage')
        path, _ = QFileDialog.getOpenFileName(self, 'Araç kayıtlarını içe aktar', '', 'CSV / Excel (*.csv *.xlsx)')
        if not path: return
        count = self.registry.import_file(self.session, path); self._saved(); self.message.setText(f'{count} araç içe aktarıldı. Yinelenen plakalar veya hatalı satırlar varsa aktarımın tamamı geri alınır.')

    def export_file(self):
        self.ops.check(self.session, 'export')
        path, selected = QFileDialog.getSaveFileName(self, 'Filtrelenen araçları dışa aktar', 'araclar.xlsx', 'Excel (*.xlsx);;CSV (*.csv)')
        if not path: return
        if not Path(path).suffix: path += '.csv' if 'CSV' in selected else '.xlsx'
        count = self.registry.export_file(self.session, path, **self._filters()); self.message.setText(f'{count} araç dışa aktarıldı. Telefon ve açıklama yalnız yönetici dışa aktarımında bulunur.')

    def template(self):
        self.ops.check(self.session, 'manage')
        path, _ = QFileDialog.getSaveFileName(self, 'CSV şablonunu kaydet', 'arac-aktarim-sablonu.csv', 'CSV (*.csv)')
        if not path: return
        if not Path(path).suffix: path += '.csv'
        with open(path, 'w', encoding='utf-8-sig', newline='') as stream: csv.writer(stream).writerow(FIELDS)
        self.message.setText('Şablon kaydedildi. plate zorunludur; izinler 0/1, tarihler saat dilimli ISO 8601, owners JSON listesidir. Ayrıntılar sürüm belgelerindedir.')
