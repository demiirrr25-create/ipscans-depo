import csv
import json
import sqlite3
import zipfile

import pytest

from lpr.operations import Operations
from lpr.registry import Registry


@pytest.fixture
def registry(tmp_path):
    now = [1_800_000_000.0]
    ops = Operations(tmp_path / 'registry.db', clock=lambda: now[0])
    ops.setup('admin', 'registry admin test password')
    session = ops.login('admin', 'registry admin test password')
    yield Registry(ops), session, now
    ops.close()


def test_additive_migration_preserves_grants_and_restart(tmp_path):
    path = tmp_path / 'existing.db'; now = 1_800_000_000.0
    ops = Operations(path, clock=lambda: now)
    ops.setup('admin', 'registry admin test password'); session = ops.login('admin', 'registry admin test password')
    ops.save_grant(session, '34 ABC 123', 'resident', False, now - 5, now + 100, 'entry', 0)
    ops.save_grant(session, '06AB1234', 'visitor', True, now - 5, now + 100, 'both')
    observation = ops.record(session, '34ABC123', .96, 'recognized', 'gate', 'live_rtsp')
    grants = [dict(row) for row in ops.db.execute('SELECT * FROM grants')]
    registry = Registry(ops); first = registry.lookup(session, '34 abc 123')
    assert first['owners'] == [] and first['access']['entry_allowed'] is False
    assert registry.lookup(session, '06AB1234')['status'] == 'blocked'
    assert [dict(row) for row in ops.db.execute('SELECT * FROM grants')] == grants
    assert ops.db.execute('SELECT id FROM observations').fetchone()[0] == observation
    registry.delete(session, 'vehicle', first['id']); ops.close()
    reopened = Operations(path, clock=lambda: now); session = reopened.login('admin', 'registry admin test password')
    registry = Registry(reopened)
    assert registry.lookup(session, '34ABC123') is None  # No deleted records resurrected.
    registry.save_vehicle(session, '34ABC123', entry_allowed=True)
    assert not registry.lookup(session, '34ABC123')['access']['entry_allowed']  # Original use limit still applies.
    assert [dict(row) for row in reopened.db.execute('SELECT * FROM grants')] == grants
    reopened.close()


def test_relations_uniqueness_and_actual_lookup(registry):
    reg, session, _ = registry
    block = reg.save_block(session, 'A Blok'); unit = reg.save_unit(session, block, '24')
    one = reg.save_resident(session, 'Deniz', 'Yılmaz', unit_id=unit, phone='+90 555 000 0000')
    two = reg.save_resident(session, 'Ece', 'Yılmaz', unit_id=unit)
    first = reg.save_vehicle(session, '34 abc-123', owner_ids=[one, two], entry_allowed=True)
    second = reg.save_vehicle(session, '06AB1234', owner_ids=[one])
    found = reg.lookup(session, '34ABC123')
    assert {o['id'] for o in found['owners']} == {one, two}
    assert found['owners'][0]['block'] == 'A Blok' and found['owners'][0]['unit'] == '24'
    assert reg.lookup(session, '34ABC124') is None
    assert reg.lookup(session, '') is None
    assert reg.page(session, block_id=block, unit_id=unit)['total'] == 2
    assert reg.page(session, query='Deniz')['total'] == 2
    assert reg.page(session, query='%')['total'] == 0  # Literal, not wildcard.
    assert reg.page(session, query="' OR 1=1 --")['total'] == 0
    assert reg.page(session, limit=1)['rows'][0]['id'] == second
    with pytest.raises(ValueError, match='zaten'): reg.save_vehicle(session, '34 ABC 123')
    with pytest.raises(ValueError): reg.save_vehicle(session, '34ABC123', vehicle_id=first, owner_ids=[999999])
    assert len(reg.vehicle(session, first)['owners']) == 2  # Failed edit is atomic.
    with pytest.raises(ValueError): reg.delete(session, 'unit', unit)
    reg.delete(session, 'resident', one)
    assert len(reg.vehicle(session, first)['owners']) == 1
    assert reg.vehicle(session, second)['owners'] == []


def test_authorization_privacy_and_session_expiry(registry, tmp_path):
    reg, admin, now = registry; ops = reg.ops
    resident = reg.save_resident(admin, 'Actual', 'Resident', phone='secret-phone')
    vehicle = reg.save_vehicle(admin, '34ABC123', notes='private-note', owner_ids=[resident])
    ops.add_user(admin, 'operator', 'registry operator password', 'operator')
    ops.add_user(admin, 'auditor', 'registry auditor password', 'auditor')
    operator = ops.login('operator', 'registry operator password'); auditor = ops.login('auditor', 'registry auditor password')
    assert 'phone' not in reg.resident(operator, resident)
    assert 'phone' not in reg.lookup(operator, '34ABC123')['owners'][0]
    assert 'notes' not in reg.vehicle(operator, vehicle)
    assert 'secret-phone' not in str(ops.audit(admin))
    with pytest.raises(PermissionError): reg.save_vehicle(operator, '06AB1234')
    with pytest.raises(PermissionError): reg.delete(operator, 'vehicle', vehicle)
    with pytest.raises(PermissionError): reg.export_file(operator, tmp_path / 'denied.csv')
    target = tmp_path / 'audit.csv'; reg.export_file(auditor, target)
    assert 'secret-phone' not in target.read_text('utf-8-sig') and 'private-note' not in target.read_text('utf-8-sig')
    assert 'Actual' in target.read_text('utf-8-sig')
    now[0] += 8 * 3600 + 1
    with pytest.raises(PermissionError): reg.lookup(operator, '34ABC123')


def test_permissions_temporary_expiry_and_no_actuation(registry):
    reg, admin, now = registry
    with pytest.raises(ValueError): reg.save_vehicle(admin, '34ABC123', status='temporary')
    reg.save_vehicle(admin, '34ABC123', status='temporary', entry_allowed=True, exit_allowed=True,
                     valid_from=now[0] - 1, valid_until=now[0] + 10)
    assert reg.lookup(admin, '34ABC123')['access'] == dict(entry_allowed=True, exit_allowed=True, reason='allowed_record', barrier_command=False)
    now[0] += 10
    assert not reg.lookup(admin, '34ABC123')['access']['entry_allowed']
    reg.save_vehicle(admin, '06AB1234', status='blocked', entry_allowed=True)
    assert not reg.lookup(admin, '06AB1234')['access']['entry_allowed']


def test_atomic_import_rollback_and_ambiguous_people_not_merged(registry):
    reg, admin, _ = registry
    person = {'first_name': 'Deniz', 'last_name': 'Yılmaz', 'block': 'A', 'unit': '24'}
    rows = [{'plate': '34ABC123', 'owners': [person]}, {'plate': '34 ABC 123', 'owners': [person]}]
    before_audit = reg.db.execute('SELECT count(*) FROM audit').fetchone()[0]
    with pytest.raises(ValueError, match='Satır 3'): reg.import_rows(admin, rows)
    assert reg.page(admin)['total'] == 0 and reg.residents(admin) == [] and reg.blocks(admin) == []
    assert reg.db.execute('SELECT count(*) FROM audit').fetchone()[0] == before_audit
    reg.import_rows(admin, [rows[0], {'plate': '06AB1234', 'owners': [person]}])
    a = reg.lookup(admin, '34ABC123')['owners'][0]; b = reg.lookup(admin, '06AB1234')['owners'][0]
    assert a['id'] != b['id']  # A shared name/address is not proof of identity.
    assert a['unit_id'] == b['unit_id']
    reg.import_rows(admin, [{'plate': '35ABC123', 'owners': [{'id': a['id'], 'first_name': a['first_name']}]}])
    assert reg.lookup(admin, '35ABC123')['owners'][0]['id'] == a['id']
    with pytest.raises(ValueError, match='eşleşmiyor'):
        reg.import_rows(admin, [{'plate': '16ABC123', 'owners': [{'id': a['id'], 'first_name': 'Other'}]}])


def test_csv_xlsx_export_import_and_formula_protection(registry, tmp_path):
    reg, admin, _ = registry
    resident = reg.save_resident(admin, '=resident', 'Actual', phone='+9000')
    original = reg.save_vehicle(admin, '34ABC123', make='=HYPERLINK("malicious")', notes='@formula', owner_ids=[resident])
    csv_path = tmp_path / 'vehicles.csv'; xlsx_path = tmp_path / 'vehicles.xlsx'
    assert reg.export_file(admin, csv_path) == 1
    assert reg.export_file(admin, xlsx_path) == 1
    with csv_path.open(encoding='utf-8-sig', newline='') as stream:
        row = next(csv.DictReader(stream)); assert row['make'].startswith("'=") and row['notes'].startswith("'@")
    with zipfile.ZipFile(xlsx_path) as file:
        assert '<f>' not in file.read('xl/worksheets/sheet1.xml').decode()
    reg.delete(admin, 'vehicle', original)
    assert reg.import_file(admin, xlsx_path) == 1
    found = reg.lookup(admin, '34ABC123'); assert found['make'] == '=HYPERLINK("malicious")'
    assert found['owners'][0]['id'] == resident and found['notes'] == '@formula'


def test_spreadsheet_rejects_formulas_and_duplicate_headers_atomically(registry, tmp_path):
    import xlsxwriter
    reg, admin, _ = registry
    target = tmp_path / 'formula.xlsx'
    with xlsxwriter.Workbook(target) as book:
        sheet = book.add_worksheet(); sheet.write_row(0, 0, ['plate', 'make'])
        sheet.write_row(1, 0, ['34ABC123', 'Safe']); sheet.write(2, 0, '06AB1234'); sheet.write_formula(2, 1, '=1+1')
    with pytest.raises(ValueError, match='Formüller'): reg.import_file(admin, target)
    assert reg.page(admin)['total'] == 0
    csv_path = tmp_path / 'duplicates.csv'; csv_path.write_text('plate,plate\n34ABC123,06AB1234\n', encoding='utf-8')
    with pytest.raises(ValueError): reg.import_file(admin, csv_path)


def test_crud_persists_and_foreign_keys_remain_valid(registry):
    reg, admin, _ = registry
    block = reg.save_block(admin, 'A'); unit = reg.save_unit(admin, block, '1')
    person = reg.save_resident(admin, 'One', 'Person', unit_id=unit)
    vehicle = reg.save_vehicle(admin, '34ABC123', owner_ids=[person])
    reg.save_block(admin, 'North', block); reg.save_unit(admin, block, '42', unit)
    reg.save_resident(admin, 'New', 'Name', resident_id=person, unit_id=unit)
    reg.save_vehicle(admin, '34ABC124', vehicle_id=vehicle, owner_ids=[person], color='Beyaz')
    assert reg.lookup(admin, '34ABC123') is None
    assert reg.lookup(admin, '34ABC124')['owners'][0]['unit'] == '42'
    assert reg.db.execute('PRAGMA foreign_key_check').fetchall() == []
    reg.delete(admin, 'resident', person); reg.delete(admin, 'unit', unit); reg.delete(admin, 'block', block)
    assert reg.lookup(admin, '34ABC124')['owners'] == []


@pytest.mark.parametrize('malformation', ['negative_shared_index', 'duplicate_cell'])
def test_spreadsheet_ambiguous_cells_cannot_select_another_identity(registry, tmp_path, malformation):
    import xlsxwriter
    reg, admin, _ = registry
    original = tmp_path / 'original.xlsx'; target = tmp_path / 'malformed.xlsx'
    with xlsxwriter.Workbook(original) as book:
        sheet = book.add_worksheet(); sheet.write_row(0, 0, ['plate']); sheet.write_row(1, 0, ['34ABC123'])
    with zipfile.ZipFile(original) as source, zipfile.ZipFile(target, 'w') as destination:
        for item in source.infolist():
            value = source.read(item.filename)
            if item.filename == 'xl/worksheets/sheet1.xml':
                if malformation == 'negative_shared_index':
                    value = value.replace(b'<c r="A2" t="s"><v>1</v></c>', b'<c r="A2" t="s"><v>-1</v></c>')
                else:
                    value = value.replace(b'<c r="A2" t="s"><v>1</v></c>', b'<c r="A2" t="s"><v>1</v></c>' * 2)
            destination.writestr(item, value)
    with pytest.raises(ValueError): reg.import_file(admin, target)
    assert reg.page(admin)['total'] == 0
