import sqlite3
import pytest
from test_operations import station


def test_automatic_retention_needs_explicit_admin_opt_in(station):
    ops,session,now=station
    ops.record(session,'34ABC123',.9,'review','offline','offline_image')
    assert ops.retention_policy(session)['automatic'] is False
    now[0]+=40*86400
    assert ops.apply_retention_policy()==0
    assert ops.db.execute('SELECT count(*) FROM observations').fetchone()[0]==1


def test_enabled_policy_runs_without_session_and_only_when_due(station):
    ops,session,now=station
    ops.retain(session,1,automatic=True)
    ops.record(session,'34ABC123',.9,'review','offline','offline_image')
    last=ops.retention_policy(session)['last_run']
    now[0]+=100
    assert ops.apply_retention_policy()==0
    assert ops.retention_policy(session)['last_run']==last
    ops.logout(session);now[0]+=2*86400
    assert ops.apply_retention_policy()==1
    assert ops.apply_retention_policy()==0
    assert ops.db.execute("SELECT actor FROM audit WHERE action='retention_automatic'").fetchone()[0]=='system'


def test_closed_parking_visits_expire_without_removing_current_occupancy(station):
    ops,session,now=station
    ops.confirm_passage(session,'34ABC123','entry','Test entry','one')
    ops.confirm_passage(session,'34ABC123','exit','Test exit','two')
    ops.confirm_passage(session,'06AB1234','entry','Still inside','three')
    now[0]+=31*86400;session=ops.login('admin','a secure test password')
    assert ops.retain(session,30,automatic=True)==1
    assert ops.parking(session)['occupied']==1
    assert ops.db.execute('SELECT count(*) FROM passage_receipts').fetchone()[0]==1
    assert ops.db.execute('PRAGMA foreign_key_check').fetchall()==[]


def test_failed_purge_rolls_back_all_deletions(station):
    ops,session,now=station
    ops.retain(session,1,automatic=True)
    ops.record(session,'34ABC123',.9,'review','offline','offline_image')
    ops.confirm_passage(session,'34ABC123','entry','Test entry','one')
    ops.confirm_passage(session,'34ABC123','exit','Test exit','two')
    with ops.db:ops.db.execute("CREATE TRIGGER prevent_parking_delete BEFORE DELETE ON parking_visits BEGIN SELECT RAISE(ABORT,'test failure'); END")
    now[0]+=2*86400
    with pytest.raises(sqlite3.IntegrityError):ops.apply_retention_policy()
    assert ops.db.execute('SELECT count(*) FROM observations').fetchone()[0]==1
    assert ops.db.execute('SELECT count(*) FROM passage_receipts').fetchone()[0]==2


def test_invalid_persisted_policy_never_deletes(station):
    ops,session,now=station
    ops.retain(session,1,automatic=True)
    ops.record(session,'34ABC123',.9,'review','offline','offline_image')
    with ops.db:ops.db.execute("UPDATE settings SET value='0' WHERE key='retention_days'")
    now[0]+=2*86400
    with pytest.raises(ValueError):ops.apply_retention_policy()
    assert ops.db.execute('SELECT count(*) FROM observations').fetchone()[0]==1
