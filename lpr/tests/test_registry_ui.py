import os
os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')

import pytest
from PySide6.QtWidgets import QApplication, QDialog, QDialogButtonBox

from lpr.operations import Operations
from lpr.registry_ui import RegistryWidget, VehicleEditor


@pytest.fixture
def screen(tmp_path):
    app = QApplication.instance() or QApplication([])
    ops = Operations(tmp_path / 'ui.db')
    ops.setup('admin', 'registry screen test password')
    session = ops.login('admin', 'registry screen test password')
    widget = RegistryWidget(ops, session); widget.resize(1280, 760); widget.show(); app.processEvents()
    yield app, ops, session, widget
    widget.close(); widget.deleteLater(); app.processEvents(); ops.close()


def test_vehicle_editor_saves_real_data_and_updates_search(screen):
    app, ops, session, widget = screen
    reg = widget.registry; block = reg.save_block(session, 'A'); unit = reg.save_unit(session, block, '24')
    person = reg.save_resident(session, 'Deniz', 'Yılmaz', unit_id=unit)
    editor = VehicleEditor(reg, session, widget, plate='34 ABC 123'); editor.show(); app.processEvents()
    editor.owner_list.item(0).setCheckState(__import__('PySide6.QtCore', fromlist=['Qt']).Qt.CheckState.Checked)
    editor.make.setText('Actual make'); editor.entry.setChecked(True)
    editor.buttons.button(QDialogButtonBox.StandardButton.Save).click(); app.processEvents()
    assert editor.result() == QDialog.DialogCode.Accepted
    found = reg.lookup(session, '34ABC123'); assert found['owners'][0]['id'] == person
    assert found['entry_allowed'] is True and found['make'] == 'Actual make'
    widget.refresh(); assert widget.table.rowCount() == 1
    widget.query.setText('Deniz'); widget._search(); assert widget.table.rowCount() == 1
    widget.query.setText('not-a-resident'); widget._search(); assert widget.table.rowCount() == 0
    widget.query.setText(''); widget._search()
    assert not widget.grab().isNull()


def test_invalid_duplicate_edit_does_not_accept_or_lose_data(screen):
    app, _, session, widget = screen
    widget.registry.save_vehicle(session, '34ABC123')
    editor = VehicleEditor(widget.registry, session, widget, plate='34 ABC 123'); editor.show()
    editor.buttons.button(QDialogButtonBox.StandardButton.Save).click(); app.processEvents()
    assert editor.result() != QDialog.DialogCode.Accepted and 'zaten' in editor.error.text()
    assert widget.registry.page(session)['total'] == 1
    editor.close()


def test_read_only_ui_omits_phone_and_disables_mutations(screen):
    app, ops, admin, admin_widget = screen
    resident = admin_widget.registry.save_resident(admin, 'Actual', 'Person', phone='secret-phone')
    admin_widget.registry.save_vehicle(admin, '34ABC123', owner_ids=[resident])
    ops.add_user(admin, 'operator', 'registry operator password', 'operator'); operator = ops.login('operator', 'registry operator password')
    widget = RegistryWidget(ops, operator); widget.show(); app.processEvents()
    from PySide6.QtWidgets import QPushButton
    assert all(not button.isEnabled() for button in widget.findChildren(QPushButton) if button.text() in ('Araç ekle', 'Sakin ekle', 'İçe aktar', 'CSV / Excel dışa aktar'))
    assert widget.resident_table.item(0, 4).text() == 'Gizli'
    with pytest.raises(PermissionError): widget.create_vehicle('06AB1234')
    widget.close(); widget.deleteLater(); app.processEvents()


def test_imported_markup_is_plain_table_and_escaped_tooltip(screen):
    _, _, session, widget = screen
    markup = '<img src="file:///private.png">'
    widget.registry.save_vehicle(session, '34ABC123', make=markup)
    widget.refresh()
    item = widget.table.item(0, 4)
    assert item.text() == markup
    assert '<img' not in item.toolTip() and '&lt;img' in item.toolTip()
