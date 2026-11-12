import Database from "better-sqlite3";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
export const SCHEMA_VERSION = 5;
export const DATABASE_NAME = "me-estoque.sqlite";
export type SqliteDatabase = Database.Database;
export function assertLocalDirectory(dir: string): void {
    if (!isAbsolute(dir) || /^[/\\]{2}/.test(dir) || (existsSync(dir) && /^[/\\]{2}/.test(realpathSync(dir))))
        throw new Error("O diret\u00F3rio de dados deve ser absoluto e local.");
}
function migrationRoot(): string {
    let dir = dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 6; i++) {
        if (existsSync(join(dir, "migrations", "001-foundation.sql")))
            return join(dir, "migrations");
        dir = dirname(dir);
    }
    throw new Error("Prepara\u00E7\u00E3o n\u00E3o encontrada.");
}
const files = ["001-foundation.sql", "002-boxes.sql", "003-orders-units.sql", "004-production.sql", "005-quality.sql"];
export function migrationChecksum(dir = migrationRoot(), version = 1): string {
    return createHash("sha256").update(readFileSync(join(dir, files[version - 1]!))).digest("hex");
}
export function withTransaction<T>(db: SqliteDatabase, work: () => T): T {
    return db.transaction(work).immediate();
}
export function validateSchema(db: SqliteDatabase, dir = migrationRoot()): number {
    const rows = db.prepare("SELECT version,checksum FROM schema_migration ORDER BY version").all() as {
        version: number;
        checksum: string;
    }[];
    if (!rows.length || rows.length > SCHEMA_VERSION || rows.some((r, i) => r.version !== i + 1 || r.checksum !== migrationChecksum(dir, r.version)))
        throw new Error("Vers\u00E3o ou assinatura de banco incompat\u00EDvel.");
    const required=rows.length===1?['app_metadata']:['app_metadata','actor','product','variant','box_origin','box_movement','command_receipt','audit_event'];
    const present=new Set((db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {name:string}[]).map(r=>r.name));
    if(rows.length>=3) required.push('production_order','reservation','unit','box_conversion','box_block','order_event','order_sequence');
    if(rows.length>=4) required.push('production_record','production_stage','production_occurrence','production_history');
    if(rows.length>=5) required.push('quality_record','quality_event');
    if(required.some(name=>!present.has(name)))throw new Error('Estrutura incompatível.');
    return rows.length;
}
function preUpgrade(db: SqliteDatabase, version: number, migrationsDir: string): void {
    const dir = join(dirname(db.name), "backups");
    mkdirSync(dir, { recursive: true });
    assertLocalDirectory(dir);
    if (lstatSync(dir).isSymbolicLink())
        throw new Error("Diret\u00F3rio de c\u00F3pias inv\u00E1lido.");
    const id = randomUUID(), path = join(dir, id + ".sqlite");
    db.prepare("VACUUM INTO ?").run(path);
    const copy = new Database(path, { readonly: true });
    try {
        if (validateSchema(copy, migrationsDir) !== version || copy.pragma("integrity_check", { simple: true }) !== "ok" || (copy.pragma("foreign_key_check") as unknown[]).length)
            throw new Error("Falha na valida\u00E7\u00E3o pr\u00E9-upgrade.");
    }
    finally {
        copy.close();
    }
    writeFileSync(join(dir, id + ".json"), JSON.stringify({ id, createdAt: new Date().toISOString(), schemaVersion: version, sizeBytes: statSync(path).size, sha256: createHash("sha256").update(readFileSync(path)).digest("hex") }), { flag: "wx", flush: true });
}
export function migrateDatabase(db: SqliteDatabase, dir = migrationRoot()): void {
    const present = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migration'").get();
    let version = 0;
    if (present) {
        version = validateSchema(db, dir);
        if (version < SCHEMA_VERSION)
            preUpgrade(db, version, dir);
    }
    else if (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().length)
        throw new Error("Banco sem hist\u00F3rico reconhecido.");
    withTransaction(db, () => {
        if (!present)
            db.exec("CREATE TABLE schema_migration(version INTEGER PRIMARY KEY,checksum TEXT NOT NULL,applied_at TEXT NOT NULL) STRICT");
        for (let v = version + 1; v <= SCHEMA_VERSION; v++) {
            db.exec(readFileSync(join(dir, files[v - 1]!), "utf8"));
            db.prepare("INSERT INTO schema_migration VALUES (?,?,?)").run(v, migrationChecksum(dir, v), new Date().toISOString());
        }
    });
}
export function openDatabase(dir: string, options: {
    migrationsDir?: string;
} = {}): SqliteDatabase {
    assertLocalDirectory(dir);
    mkdirSync(dir, { recursive: true });
    assertLocalDirectory(dir);
    const db = new Database(resolve(dir, DATABASE_NAME));
    try {
        const sqliteVersion = (db.prepare("SELECT sqlite_version() version").get() as {
            version: string;
        }).version.split(".").map(Number);
        if (sqliteVersion[0]! < 3 || (sqliteVersion[0] === 3 && (sqliteVersion[1]! < 51 || (sqliteVersion[1] === 51 && sqliteVersion[2]! < 3))))
            throw new Error("SQLite 3.51.3 ou superior necess\u00E1rio.");
        db.pragma("foreign_keys=ON");
        db.pragma("busy_timeout=5000");
        migrateDatabase(db, options.migrationsDir);
        db.pragma("journal_mode=WAL");
        db.pragma("synchronous=FULL");
        return db;
    }
    catch (e) {
        db.close();
        throw e;
    }
}
