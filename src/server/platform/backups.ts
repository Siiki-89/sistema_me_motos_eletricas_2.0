import Database from 'better-sqlite3';
import { createHash, randomUUID } from 'node:crypto';
import { constants, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATABASE_NAME, openDatabase, SCHEMA_VERSION, validateSchema, type SqliteDatabase } from './database.js';

export interface BackupItem { id: string; createdAt: string; schemaVersion: number; sizeBytes: number }
interface Manifest extends BackupItem { sha256: string }
export class BackupError extends Error {}
export class MaintenanceError extends Error {}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function hash(path: string): string { return createHash('sha256').update(readFileSync(path)).digest('hex'); }
function regularFile(path: string): boolean { return existsSync(path) && lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(); }
export class DatabaseStore {
  db: SqliteDatabase;
  private operationActive = false;
  get busy(): boolean { return this.operationActive; }
  private async exclusive<T>(operation: () => Promise<T>): Promise<T> {
    if (this.operationActive) throw new MaintenanceError('Operação em andamento. Aguarde.');
    this.operationActive = true;
    try { return await operation(); } finally { this.operationActive = false; }
  }
  readonly backupDir: string;
  constructor(readonly dataDir: string) {
    if (existsSync(join(dataDir, 'restore-pending.json'))) throw new BackupError('Restauração pendente. Preserve os arquivos locais para recuperação.');
    this.backupDir = join(dataDir, 'backups');
    mkdirSync(this.backupDir, { recursive: true });
    if (lstatSync(this.backupDir).isSymbolicLink()) throw new BackupError('Diretório de cópias inválido.');
    this.db = openDatabase(dataDir);
  }
  close(): void { if (this.db.open) this.db.close(); }
  private paths(id: string): { database: string; manifest: string } {
    if (!uuid.test(id)) throw new BackupError('Cópia não encontrada.');
    return { database: join(this.backupDir, `${id}.sqlite`), manifest: join(this.backupDir, `${id}.json`) };
  }
  private manifest(id: string): Manifest {
    const paths = this.paths(id);
    if (!regularFile(paths.manifest) || !regularFile(paths.database)) throw new BackupError('Cópia não encontrada.');
    try {
      const item = JSON.parse(readFileSync(paths.manifest, 'utf8')) as Manifest;
      if (item.id !== id || !Array.from({length:SCHEMA_VERSION},(_,i)=>i+1).includes(item.schemaVersion) || !Number.isSafeInteger(item.sizeBytes) || item.sizeBytes <= 0 || !Number.isFinite(Date.parse(item.createdAt)) || !/^[0-9a-f]{64}$/.test(item.sha256)) throw new Error();
      return item;
    } catch { throw new BackupError('Manifesto de cópia incompatível.'); }
  }
  list(): BackupItem[] {
    return readdirSync(this.backupDir).filter(name => name.endsWith('.json') && uuid.test(name.slice(0, -5))).flatMap(name => {
      try { const { sha256: _hash, ...item } = this.manifest(name.slice(0, -5)); return [item]; } catch { return []; }
    }).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  }
  validate(id: string): BackupItem {
    const item = this.manifest(id); const path = this.paths(id).database;
    if (statSync(path).size !== item.sizeBytes || hash(path) !== item.sha256) throw new BackupError('Cópia corrompida.');
    let copy: SqliteDatabase | undefined;
    try {
      copy = new Database(path, { readonly: true, fileMustExist: true });
      if (copy.pragma('integrity_check', { simple: true }) !== 'ok' || (copy.pragma('foreign_key_check') as unknown[]).length !== 0) throw new Error();
      if (validateSchema(copy) !== item.schemaVersion) throw new Error();
    } catch { throw new BackupError('Cópia inválida ou incompatível.'); } finally { copy?.close(); }
    const { sha256: _hash, ...publicItem } = item; return publicItem;
  }
  async create(): Promise<BackupItem> { return this.exclusive(() => this.createSnapshot()); }
  private async createSnapshot(): Promise<BackupItem> {
    const id = randomUUID(); const paths = this.paths(id);
    // Driver backup makes a consistent snapshot including committed WAL contents.
    try {
      await this.db.backup(paths.database);
      const item: Manifest = { id, createdAt: new Date().toISOString(), schemaVersion: SCHEMA_VERSION, sizeBytes: statSync(paths.database).size, sha256: hash(paths.database) };
      writeFileSync(paths.manifest, JSON.stringify(item), { flag: 'wx' });
      return this.validate(id);
    } catch (error) {
      rmSync(paths.database, { force: true }); rmSync(paths.manifest, { force: true }); throw error;
    }
  }
  async restore(id: string): Promise<string> { return this.exclusive(() => this.restoreSnapshot(id)); }
  private async restoreSnapshot(id: string): Promise<string> {
    this.validate(id);
    const staged = join(this.dataDir, `restore-${randomUUID()}.sqlite`);
    const previous = join(this.dataDir, `recovery-${randomUUID()}.sqlite`);
    const target = join(this.dataDir, DATABASE_NAME);
    copyFileSync(this.paths(id).database, staged, constants.COPYFILE_EXCL);
    const journal = join(this.dataDir, 'restore-pending.json');
    let switched = false; let preserved = false; let journalCreated = false;
    try {
      // Recheck source and staged bytes after copy, before touching current DB.
      this.validate(id);
      if (hash(staged) !== this.manifest(id).sha256) throw new BackupError('Cópia alterada durante restauração.');
      const safety = await this.createSnapshot();
      writeFileSync(journal, JSON.stringify({ previous, staged, target, safetyBackupId: safety.id }), { flag: 'wx', flush: true }); journalCreated = true;
      this.db.pragma('wal_checkpoint(TRUNCATE)'); this.db.close();
      renameSync(target, previous); preserved = true;
      renameSync(staged, target); switched = true;
      this.db = openDatabase(this.dataDir);
      // Opening the validated replacement commits the restore. Cleanup cannot roll it back.
      try {
        rmSync(journal); journalCreated = false;
        rmSync(previous);
      } catch { /* Preserve any recovery artifacts; startup refuses a remaining journal. */ }
      return safety.id;
    } catch (error) {
      if (preserved) {
        this.close();
        if (switched) rmSync(target, { force: true });
        renameSync(previous, target); this.db = openDatabase(this.dataDir);
      }
      if (!preserved && !this.db.open) this.db = openDatabase(this.dataDir);
      if (journalCreated) { rmSync(journal); journalCreated = false; }
      throw error;
    } finally { try { rmSync(staged, { force: true }); } catch { /* Recovery artifacts may be cleaned manually. */ } }
  }
}
