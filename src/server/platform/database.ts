import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA_VERSION = 1;
export const DATABASE_NAME = 'me-estoque.sqlite';
export type SqliteDatabase = Database.Database;
export function assertLocalDirectory(dataDir: string): void {
  if (!isAbsolute(dataDir) || /^[/\\]{2}/.test(dataDir)) throw new Error('O diretório de dados deve ser absoluto e local.');
  // Reject a symlink/junction resolving to a network share too.
  if (existsSync(dataDir) && /^[/\\]{2}/.test(realpathSync(dataDir))) throw new Error('O diretório de dados deve ser local.');
}
function migrationRoot(): string {
  let current = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(current, 'migrations', '001-foundation.sql'))) return join(current, 'migrations');
    current = dirname(current);
  }
  throw new Error('Arquivos de preparação do banco não encontrados.');
}
export function migrationChecksum(migrationsDir = migrationRoot()): string {
  return createHash('sha256').update(readFileSync(join(migrationsDir, '001-foundation.sql'))).digest('hex');
}
export function withTransaction<T>(db: SqliteDatabase, work: () => T): T {
  return db.transaction(work).immediate();
}
export function validateSchema(db: SqliteDatabase, migrationsDir?: string): void {
  const rows = db.prepare('SELECT version,checksum FROM schema_migration ORDER BY version').all() as { version: number; checksum: string }[];
  if (rows.length !== 1 || rows[0]?.version !== SCHEMA_VERSION || rows[0]?.checksum !== migrationChecksum(migrationsDir)) throw new Error('Versão ou assinatura de banco incompatível.');
  if (!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='app_metadata'").get()) throw new Error('Estrutura de banco incompatível.');
}
export function migrateDatabase(db: SqliteDatabase, migrationsDir = migrationRoot()): void {
  const present = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migration'").get();
  if (present) { validateSchema(db, migrationsDir); return; }
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  if (tables.length) throw new Error('Banco sem histórico de preparação reconhecido.');
  withTransaction(db, () => {
    db.exec('CREATE TABLE schema_migration(version INTEGER PRIMARY KEY,checksum TEXT NOT NULL,applied_at TEXT NOT NULL) STRICT');
    db.exec(readFileSync(join(migrationsDir, '001-foundation.sql'), 'utf8'));
    db.prepare('INSERT INTO schema_migration VALUES (?,?,?)').run(SCHEMA_VERSION, migrationChecksum(migrationsDir), new Date().toISOString());
  });
}
export function openDatabase(dataDir: string, options: { migrationsDir?: string } = {}): SqliteDatabase {
  assertLocalDirectory(dataDir); mkdirSync(dataDir, { recursive: true }); assertLocalDirectory(dataDir);
  const db = new Database(resolve(dataDir, DATABASE_NAME));
  try {
    const version = db.prepare('SELECT sqlite_version() AS version').get() as { version: string };
    const [major = 0, minor = 0, patch = 0] = version.version.split('.').map(Number);
    if (major < 3 || (major === 3 && (minor < 51 || (minor === 51 && patch < 3)))) throw new Error('SQLite 3.51.3 ou superior necessário.');
    db.pragma('foreign_keys = ON'); db.pragma('busy_timeout = 5000');
    // Verify compatibility before persistent journal configuration.
    migrateDatabase(db, options.migrationsDir);
    db.pragma('journal_mode = WAL'); db.pragma('synchronous = FULL');
    return db;
  } catch (error) { db.close(); throw error; }
}
