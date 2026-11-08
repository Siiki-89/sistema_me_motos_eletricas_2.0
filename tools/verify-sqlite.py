"""Verifica o motor SQLite em memória, sem ler ou criar banco do produto."""
import json
import sqlite3

db = sqlite3.connect(':memory:')
db.execute('PRAGMA foreign_keys = ON')
assert db.execute('PRAGMA foreign_keys').fetchone()[0] == 1
db.executescript('CREATE TABLE parent(id INTEGER PRIMARY KEY); CREATE TABLE child(id INTEGER PRIMARY KEY, parent_id INTEGER NOT NULL REFERENCES parent(id));')
try:
    db.execute('INSERT INTO child VALUES(1, 999)')
except sqlite3.IntegrityError:
    db.rollback()
else:
    raise AssertionError('Foreign key not enforced')
db.execute('INSERT INTO parent VALUES(1)')
db.rollback()
assert db.execute('SELECT COUNT(*) FROM parent').fetchone()[0] == 0
db.execute('INSERT INTO parent VALUES(2)')
db.commit()
restored = sqlite3.connect(':memory:')
db.backup(restored)
assert restored.execute('SELECT id FROM parent').fetchall() == [(2,)]
assert restored.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
assert restored.execute('PRAGMA foreign_key_check').fetchall() == []
print(json.dumps({'sqlite': sqlite3.sqlite_version, 'foreign_keys': 'PASS', 'rollback': 'PASS', 'backup_restore_in_memory': 'PASS', 'integrity_check': 'ok'}))
restored.close()
db.close()
