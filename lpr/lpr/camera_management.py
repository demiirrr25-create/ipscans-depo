"""Camera management widgets; connection and calibration use the existing flows."""
from html import escape
from PySide6.QtCore import Qt
from PySide6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QFormLayout, QLabel,
    QPushButton, QLineEdit, QComboBox, QCheckBox, QTableWidget, QTableWidgetItem,
    QHeaderView, QAbstractItemView, QDialog, QDialogButtonBox, QMessageBox)
from .camera_metadata import CameraMetadata
from .theme import apply_theme


class CameraEditDialog(QDialog):
    def __init__(self, camera, parent=None):
        super().__init__(parent)
        self.setWindowTitle('Kamerayı düzenle'); self.setMinimumWidth(440); apply_theme(self)
        layout = QVBoxLayout(self)
        form = QFormLayout(); layout.addLayout(form)
        identity = QLabel(camera['id']); identity.setTextFormat(Qt.TextFormat.PlainText)
        identity.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
        form.addRow('Kamera kimliği', identity)
        self.name = QLineEdit(camera['name']); self.name.setMaxLength(120)
        self.brand = QLineEdit(camera['brand']); self.brand.setMaxLength(120)
        self.model = QLineEdit(camera['model']); self.model.setMaxLength(120)
        self.location = QLineEdit(camera['location']); self.location.setMaxLength(120)
        self.direction = QComboBox(); self.direction.addItem('Giriş', 'entry'); self.direction.addItem('Çıkış', 'exit')
        self.direction.setCurrentIndex(max(0, self.direction.findData(camera['direction'])))
        self.enabled = QCheckBox('Canlı izlemeye dahil et'); self.enabled.setChecked(camera['enabled'])
        self.mode = QComboBox(); self.mode.addItem('Yazılım ANPR · LPR Pro', 'software')
        self.mode.addItem('Dahili ANPR · doğrulanmış adaptör gerekli', 'native')
        self.mode.model().item(1).setEnabled(False)
        self.decoder_mode = QComboBox()
        self.decoder_mode.addItem('Yazılım (CPU tercihi)', 'software')
        self.decoder_mode.addItem('Otomatik (uygunsa donanım)', 'auto')
        self.decoder_mode.setCurrentIndex(max(0, self.decoder_mode.findData(camera.get('decoder_mode', 'software'))))
        for label, field in [('Kamera adı', self.name), ('Marka', self.brand), ('Model', self.model),
                             ('Blok / bölge', self.location), ('Yön', self.direction),
                             ('Çalışma modu', self.mode), ('Video çözücü tercihi', self.decoder_mode), ('Durum', self.enabled)]:
            form.addRow(label, field)
        hint = QLabel('Ad değişikliği kamera kimliğini, bağlantı parolasını ve kayıt geçmişini korur.')
        hint.setObjectName('muted'); hint.setWordWrap(True); layout.addWidget(hint)
        decoder_hint = QLabel('Otomatik seçim donanım kullanıldığını garanti etmez. Uygun çözücü bulunamazsa yazılıma dönülür. Çözücü tercihi değişince akış yeniden bağlanır.')
        decoder_hint.setObjectName('muted'); decoder_hint.setWordWrap(True); layout.addWidget(decoder_hint)
        self.error = QLabel(); self.error.setWordWrap(True); layout.addWidget(self.error)
        buttons = QDialogButtonBox(QDialogButtonBox.StandardButton.Save | QDialogButtonBox.StandardButton.Cancel)
        buttons.button(QDialogButtonBox.StandardButton.Save).setText('Kaydet')
        buttons.button(QDialogButtonBox.StandardButton.Cancel).setText('İptal')
        buttons.accepted.connect(self.validate); buttons.rejected.connect(self.reject); layout.addWidget(buttons)

    def validate(self):
        if not self.name.text().strip():
            self.error.setText('Bir kamera adı girin.'); return
        self.accept()

    def values(self):
        return dict(name=self.name.text(), direction=self.direction.currentData(), brand=self.brand.text(),
                    model=self.model.text(), location=self.location.text(), enabled=self.enabled.isChecked(),
                    mode=self.mode.currentData(), decoder_mode=self.decoder_mode.currentData())


class CameraManagementPanel(QWidget):
    def __init__(self, ops, session, *, on_add, on_discover, on_calibrate, on_changed,
                 on_connection=None, parent=None):
        super().__init__(parent)
        apply_theme(self)
        self.ops, self.session, self.store = ops, session, CameraMetadata(ops)
        self.on_changed, self.on_calibrate, self.on_connection = on_changed, on_calibrate, on_connection
        self.rows = []
        root = QVBoxLayout(self); root.setContentsMargins(20, 20, 20, 20); root.setSpacing(14)
        heading = QLabel('Kamera yönetimi'); heading.setObjectName('pageTitle'); root.addWidget(heading)
        summary = QLabel('Kameraları adlandırın, konumlarını düzenleyin ve her görüntüyü ayrı kalibre edin.')
        summary.setObjectName('muted'); summary.setWordWrap(True); root.addWidget(summary)
        tools = QHBoxLayout(); root.addLayout(tools)
        self.add = QPushButton('Kamera ekle'); self.add.setObjectName('primaryBtn'); self.add.clicked.connect(lambda: self.invoke(on_add)); tools.addWidget(self.add)
        self.discover = QPushButton('Ağda kamera bul'); self.discover.clicked.connect(lambda: self.invoke(on_discover)); tools.addWidget(self.discover)
        tools.addStretch()
        self.archived = QCheckBox('Arşivlenenler'); self.archived.toggled.connect(self.refresh); tools.addWidget(self.archived)
        self.table = QTableWidget(0, 10)
        self.table.setHorizontalHeaderLabels(['Kamera adı', 'IP / Host', 'Marka / Model', 'Bölge', 'Yön', 'Protokol', 'Durum', 'ANPR modu', 'Çözücü tercihi', 'Kimlik'])
        self.table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.table.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
        self.table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self.table.verticalHeader().hide(); self.table.setAlternatingRowColors(True)
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.ResizeToContents)
        self.table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        self.table.itemSelectionChanged.connect(self.selection_changed)
        self.table.itemDoubleClicked.connect(lambda _: self.edit_camera())
        root.addWidget(self.table, 1)
        actions = QHBoxLayout(); root.addLayout(actions)
        self.edit = QPushButton('Düzenle'); self.edit.clicked.connect(self.edit_camera); actions.addWidget(self.edit)
        self.calibrate = QPushButton('Canlı görüntü / Kalibrasyon'); self.calibrate.clicked.connect(self.calibrate_camera); actions.addWidget(self.calibrate)
        self.connection = QPushButton('Bağlantıyı düzenle'); self.connection.clicked.connect(self.edit_connection)
        self.connection.setVisible(on_connection is not None); actions.addWidget(self.connection)
        actions.addStretch()
        self.remove = QPushButton('Arşivle'); self.remove.clicked.connect(self.archive_camera); actions.addWidget(self.remove)
        self.restore_button = QPushButton('Geri yükle'); self.restore_button.clicked.connect(self.restore_camera); actions.addWidget(self.restore_button)
        self.status = QLabel(); self.status.setWordWrap(True); root.addWidget(self.status)
        self.refresh()

    def invoke(self, callback, *args):
        try:
            self.ops.check(self.session, 'manage')
            result = callback(*args)
            self.refresh()
            return result
        except (PermissionError, ValueError) as error:
            self.status.setText(str(error))
        except Exception:
            self.status.setText('Kamera işlemi tamamlanamadı. Yapılandırmayı ve veri erişimini kontrol edin.')

    def selected_camera_id(self):
        row = self.table.currentRow()
        return self.rows[row]['id'] if 0 <= row < len(self.rows) else None

    def refresh(self, *args):
        selected = self.selected_camera_id()
        try:
            self.rows = self.store.list(self.session, include_archived=self.archived.isChecked())
        except PermissionError:
            self.rows = []; self.status.setText('Bu oturumun kamera kayıtlarını okuma yetkisi yok.')
        self.table.setRowCount(len(self.rows))
        for index, row in enumerate(self.rows):
            values = [row['name'], row['host'] or '—', ' / '.join(filter(None, (row['brand'], row['model']))) or '—',
                row['location'] or '—', 'Giriş' if row['direction'] == 'entry' else 'Çıkış',
                row['protocol'] + ' · ' + row['transport'].upper(),
                'Arşivlendi' if row['archived'] else 'Aktif' if row['enabled'] else 'Pasif',
                'Yazılım ANPR', 'Otomatik' if row['decoder_mode'] == 'auto' else 'Yazılım', row['id']]
            for column, value in enumerate(values):
                item = QTableWidgetItem(str(value)); item.setToolTip('<span>' + escape(str(value)) + '</span>'); self.table.setItem(index, column, item)
            if row['id'] == selected:
                self.table.selectRow(index)
        self.selection_changed()

    def selection_changed(self):
        camera_id = self.selected_camera_id()
        try:
            self.ops.check(self.session, 'manage'); manage = True
        except PermissionError:
            manage = False
        row = next((item for item in self.rows if item['id'] == camera_id), None)
        active = bool(row and not row['archived'])
        for button in (self.edit, self.calibrate, self.connection, self.remove):
            button.setEnabled(manage and active)
        self.restore_button.setEnabled(manage and bool(row and row['archived']))
        self.add.setEnabled(manage); self.discover.setEnabled(manage)

    def edit_camera(self):
        camera_id = self.selected_camera_id()
        if camera_id is None:
            return
        def action():
            row = self.store.get(self.session, camera_id)
            if row['archived']:
                return
            dialog = CameraEditDialog(row, self)
            if dialog.exec() == QDialog.DialogCode.Accepted:
                self.store.save(self.session, camera_id, **dialog.values())
                self.on_changed(); self.status.setText('Kamera bilgileri kaydedildi.')
        self.invoke(action)

    def calibrate_camera(self):
        camera_id = self.selected_camera_id()
        if camera_id is not None:
            self.invoke(self.on_calibrate, camera_id)

    def edit_connection(self):
        camera_id = self.selected_camera_id()
        if camera_id is not None and self.on_connection:
            self.invoke(self.on_connection, camera_id)

    def archive_camera(self):
        camera_id = self.selected_camera_id()
        if camera_id is None:
            return
        choice = QMessageBox.question(self, 'Kamerayı arşivle',
            'Kamera canlı izlemeden çıkarılacak. Geçmiş kayıtları, bağlantısı ve kalibrasyonu saklanacak.',
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No, QMessageBox.StandardButton.No)
        if choice != QMessageBox.StandardButton.Yes:
            return
        def action():
            self.store.archive(self.session, camera_id); self.on_changed()
            self.status.setText('Kamera arşivlendi. Geri yüklediğinizde önce pasif durumda açılır.')
        self.invoke(action)

    def restore_camera(self):
        camera_id = self.selected_camera_id()
        if camera_id is None:
            return
        def action():
            self.store.restore(self.session, camera_id); self.on_changed()
            self.status.setText('Kamera pasif olarak geri yüklendi. Düzenle ekranından etkinleştirebilirsiniz.')
        self.invoke(action)
