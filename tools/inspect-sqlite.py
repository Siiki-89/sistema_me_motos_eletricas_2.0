"""Inspeção somente leitura de um futuro banco local: schema e integridade, sem linhas."""
import argparse
import json
import sqlite3
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('database', type=Path)
args = parser.parse_args()
path = args.database.resolve(strict=True)
if not path.is_file():
    parser.error('Informe um arquivo SQLite existente.')
db = sqlite3.connect(path.as_uri() + '?mode=ro', uri=True)
db.execute('PRAGMA query_only = ON')
result = {
    'sqlite': sqlite3.sqlite_version,
    'schema': db.execute("SELECT type, name, tbl_name, sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name").fetchall(),
    'quick_check': db.execute('PRAGMA quick_check').fetchall(),
    'foreign_key_check': db.execute('PRAGMA foreign_key_check').fetchall(),
}
db.close()
print(json.dumps(result, ensure_ascii=False, indent=2))
if result['quick_check'] != [('ok',)] or result['foreign_key_check']:
    raise SystemExit(1)
