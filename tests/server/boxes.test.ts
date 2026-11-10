import { it, expect } from "vitest";
import { buildApp } from "../../src/server/app.js";
import { mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
mkdirSync("artifacts/test-tmp", { recursive: true });
it("catalog and receipt are atomic, idempotent and maintain nonnegative stock", async () => {
    const app = buildApp({ dataDir: mkdtempSync(join(process.cwd(), "artifacts/test-tmp/boxes-")), port: 4317, mode: "test" });
    try {
        const host = { host: "127.0.0.1:4317" };
        const s = await app.inject({ url: "/api/v1/session", headers: host });
        const headers = { ...host, origin: "http://127.0.0.1:4317", cookie: String(s.headers["set-cookie"]).split(";")[0]!, "x-csrf-token": s.json().csrfToken };
        const post = (url: string, payload: object) => app.inject({ method: "POST", url, headers, payload });
        const p = await post("/api/v1/catalog/products", { operationId: randomUUID(), actorId: "local-operator", meCode: " me-teste ", commercialName: "Sint\u00E9tico" });
        expect(p.statusCode).toBe(200);
        expect(p.json().meCode).toBe("ME-TESTE");
        const v = await post("/api/v1/catalog/variants", { operationId: randomUUID(), actorId: "local-operator", productId: p.json().id, color: " Azul " });
        expect(v.statusCode).toBe(200);
        const body = { operationId: randomUUID(), actorId: "local-operator", variantId: v.json().id, quantity: 3, receivedDate: "2026-11-09" };
        const r = await post("/api/v1/boxes/receipts", body);
        expect(r.statusCode).toBe(200);
        expect((await post("/api/v1/boxes/receipts", body)).json()).toEqual(r.json());
        expect((await post("/api/v1/boxes/receipts", { ...body, quantity: 4 })).statusCode).toBe(409);
        const stock = await app.inject({ url: "/api/v1/boxes/stock", headers: host });
        expect(stock.json().items[0]).toMatchObject({ physical: 3, reserved: 0, available: 3 });
        expect((await post("/api/v1/boxes/adjustments", { operationId: randomUUID(), actorId: "local-operator", originId: r.json().originId, quantity: -4, reason: "Corre\u00E7\u00E3o sint\u00E9tica", effectiveDate: "2026-11-09" })).statusCode).toBe(409);
    }
    finally {
        await app.close();
    }
});
import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { openDatabase, migrationChecksum, withTransaction } from "../../src/server/platform/database.js";
import { DatabaseStore } from "../../src/server/platform/backups.js";
import { quantities } from "../../src/server/modules/operations.js";
it("upgrades v1 with validated recoverable backup and restores either supported version", async () => {
    const dir = mkdtempSync(join(process.cwd(), "artifacts/test-tmp/upgrade-"));
    const old = new Database(join(dir, "me-estoque.sqlite"));
    old.exec("CREATE TABLE schema_migration(version INTEGER PRIMARY KEY,checksum TEXT NOT NULL,applied_at TEXT NOT NULL) STRICT");
    old.exec(readFileSync("migrations/001-foundation.sql", "utf8"));
    old.prepare("INSERT INTO schema_migration VALUES (1,?,?)").run(migrationChecksum(), new Date().toISOString());
    old.exec("INSERT INTO app_metadata VALUES ('synthetic','preserved')");
    old.close();
    const store = new DatabaseStore(dir);
    try {
        expect(store.db.prepare("SELECT COUNT(*) n FROM schema_migration").get()).toEqual({ n: 3 });
        const v1 = store.list()[0]!;
        expect(store.validate(v1.id).schemaVersion).toBe(1);
        const v2 = await store.create();
        expect(v2.schemaVersion).toBe(3);
        await store.restore(v1.id);
        expect(store.db.prepare("SELECT value FROM app_metadata WHERE key='synthetic'").get()).toEqual({ value: "preserved" });
        expect(store.db.prepare("SELECT COUNT(*) n FROM schema_migration").get()).toEqual({ n: 3 });
        await store.restore(v2.id);
        expect(store.db.pragma("integrity_check", { simple: true })).toBe("ok");
    }
    finally {
        store.close();
    }
});
it("keeps reservation invariant and rolls back receipt/audit when a trigger fails", async () => {
    expect(() => quantities(1, 2)).toThrow();
    expect(quantities(3, 2)).toEqual({ physical: 3, reserved: 2, available: 1 });
    const dir = mkdtempSync(join(process.cwd(), "artifacts/test-tmp/rollback-"));
    const db = openDatabase(dir);
    try {
        expect(() => withTransaction(db, () => {
            db.prepare("INSERT INTO product VALUES (?,?,?,?,?,?)").run(randomUUID(), "SYN", null, null, 1, 1);
            throw new Error("interrupted");
        })).toThrow();
        expect(db.prepare("SELECT COUNT(*) n FROM product").get()).toEqual({ n: 0 });
        expect(() => db.prepare("INSERT INTO variant VALUES (?,?,?,?,?,?)").run(randomUUID(), randomUUID(), null, "NULL", 1, 1)).toThrow();
    }
    finally {
        db.close();
    }
});
it("validates catalog, adjustments, reversal, snapshots, search, persistence and failed writes", async () => {
    const dir = mkdtempSync(join(process.cwd(), "artifacts/test-tmp/rules-"));
    let app = buildApp({ dataDir: dir, port: 4317, mode: "test" });
    const host = { host: "127.0.0.1:4317" };
    try {
        const s = await app.inject({ url: "/api/v1/session", headers: host });
        const headers = { ...host, origin: "http://127.0.0.1:4317", cookie: String(s.headers["set-cookie"]).split(";")[0]!, "x-csrf-token": s.json().csrfToken };
        const cmd = () => ({ operationId: randomUUID(), actorId: "local-operator" });
        const post = (url: string, payload: object) => app.inject({ method: "POST", url, headers, payload });
        const put = (url: string, payload: object) => app.inject({ method: "PUT", url, headers, payload });
        const get = (url: string) => app.inject({ url, headers: host });
        expect((await post("/api/v1/catalog/products", { ...cmd(), meCode: " " })).statusCode).toBe(400);
        const p = (await post("/api/v1/catalog/products", { ...cmd(), meCode: "SYN-ONE" })).json();
        expect((await post("/api/v1/catalog/products", { ...cmd(), meCode: "syn-one" })).statusCode).toBe(409);
        const v = (await post("/api/v1/catalog/variants", { ...cmd(), productId: p.id, color: null })).json();
        expect((await post("/api/v1/catalog/variants", { ...cmd(), productId: p.id, color: null })).statusCode).toBe(409);
        expect((await post("/api/v1/catalog/variants", { ...cmd(), productId: p.id })).statusCode).toBe(400);
        for (const quantity of [0, -1, 1.5])
            expect((await post("/api/v1/boxes/receipts", { ...cmd(), variantId: v.id, quantity, receivedDate: "2026-11-09" })).statusCode).toBe(400);
        expect((await post("/api/v1/boxes/receipts", { ...cmd(), variantId: v.id, quantity: 1, receivedDate: "2026-02-30" })).statusCode).toBe(400);
        const r = (await post("/api/v1/boxes/receipts", { ...cmd(), variantId: v.id, quantity: 3, receivedDate: "2026-11-09", lot: "SYN-LOT" })).json();
        const a = (await post("/api/v1/boxes/adjustments", { ...cmd(), originId: r.originId, quantity: -1, reason: "Diferen\u00E7a sint\u00E9tica", effectiveDate: "2026-11-09" })).json();
        expect(a.quantity).toBe(-1);
        expect((await post(`/api/v1/boxes/movements/${r.id}/reverse`, { ...cmd(), reason: "Corre\u00E7\u00E3o", effectiveDate: "2026-11-09" })).statusCode).toBe(409);
        expect((await post(`/api/v1/boxes/movements/${a.id}/reverse`, { ...cmd(), reason: "Corre\u00E7\u00E3o", effectiveDate: "2026-11-09" })).statusCode).toBe(200);
        expect((await post(`/api/v1/boxes/movements/${a.id}/reverse`, { ...cmd(), reason: "Outra", effectiveDate: "2026-11-09" })).statusCode).toBe(409);
        expect((await put(`/api/v1/catalog/products/${p.id}`, { ...cmd(), meCode: "SYN-EDIT", active: false, version: 1 })).statusCode).toBe(200);
        expect((await put(`/api/v1/catalog/products/${p.id}`, { ...cmd(), meCode: "STALE", version: 1 })).statusCode).toBe(409);
        expect((await post("/api/v1/boxes/receipts", { ...cmd(), variantId: v.id, quantity: 1, receivedDate: "2026-11-09" })).statusCode).toBe(409);
        expect((await get("/api/v1/catalog/products?q=edit&active=false")).json().total).toBe(1);
        expect((await get("/api/v1/boxes/origins?q=SYN-LOT")).json().items[0]).toMatchObject({ meCode: "SYN-ONE", physical: 3 });
        expect((await get("/api/v1/boxes/stock?limit=101")).statusCode).toBe(400);
        const db = openDatabase(dir);
        db.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON audit_event BEGIN SELECT RAISE(ABORT,'synthetic failure'); END");
        const failed = cmd();
        expect((await post("/api/v1/boxes/adjustments", { ...failed, originId: r.originId, quantity: 1, reason: "Falha sint\u00E9tica", effectiveDate: "2026-11-09" })).statusCode).toBe(409);
        expect(db.prepare("SELECT * FROM command_receipt WHERE operationId=?").get(failed.operationId)).toBeUndefined();
        expect(db.prepare("SELECT SUM(quantity) n FROM box_movement WHERE originId=?").get(r.originId)).toEqual({ n: 3 });
        db.exec("DROP TRIGGER fail_audit");
        db.pragma("busy_timeout=1");
        db.exec("BEGIN IMMEDIATE");
        const retryBody={...cmd(),originId:r.originId,quantity:1,reason:'Concorrência sintética',effectiveDate:'2026-11-09'};
        expect((await post('/api/v1/boxes/adjustments',retryBody)).statusCode).toBe(503);
        db.exec("ROLLBACK");
        db.close();
        await app.close();
        app = buildApp({ dataDir: dir, port: 4317, mode: "test" });
        expect((await get("/api/v1/boxes/summary")).json().physical).toBe(3);
    }
    finally {
        await app.close();
    }
});
it('audit preserves before and after identity on optimistic catalog editing',async()=>{
 const dir=mkdtempSync(join(process.cwd(),'artifacts/test-tmp/audit-'));const app=buildApp({dataDir:dir,port:4317,mode:'test'});try{const h={host:'127.0.0.1:4317'},s=await app.inject({url:'/api/v1/session',headers:h});const headers={...h,origin:'http://127.0.0.1:4317',cookie:String(s.headers['set-cookie']).split(';')[0]!, 'x-csrf-token':s.json().csrfToken};const p=(await app.inject({method:'POST',url:'/api/v1/catalog/products',headers,payload:{operationId:randomUUID(),actorId:'local-operator',meCode:'SYN-AUDIT'}})).json();const operationId=randomUUID();await app.inject({method:'PUT',url:`/api/v1/catalog/products/${p.id}`,headers,payload:{operationId,actorId:'local-operator',meCode:'SYN-UPDATED',version:1}});const db=openDatabase(dir);try{const audit=db.prepare('SELECT result FROM audit_event WHERE operationId=?').get(operationId) as {result:string};expect(JSON.parse(audit.result)).toMatchObject({before:{meCode:'SYN-AUDIT'},after:{meCode:'SYN-UPDATED'}});}finally{db.close();}}finally{await app.close();}
});
it('paginates in stable order, finds variants and refuses missing schema tables',async()=>{
 const dir=mkdtempSync(join(process.cwd(),'artifacts/test-tmp/pages-'));const app=buildApp({dataDir:dir,port:4317,mode:'test'});const db=openDatabase(dir);try{for(let i=0;i<51;i++)db.prepare('INSERT INTO product VALUES (?,?,?,?,?,?)').run(randomUUID(),'SYN-'+String(i).padStart(3,'0'),null,null,1,1);const first=db.prepare('SELECT id FROM product ORDER BY meCode LIMIT 1').get() as {id:string};db.prepare('INSERT INTO variant VALUES (?,?,?,?,?,?)').run(randomUUID(),first.id,'Violeta','COLOR:VIOLETA',1,1);const h={host:'127.0.0.1:4317'};const a=(await app.inject({url:'/api/v1/catalog/products',headers:h})).json();const b=(await app.inject({url:'/api/v1/catalog/products?page=2',headers:h})).json();expect(a.items).toHaveLength(50);expect(b.items).toHaveLength(1);expect(a.total).toBe(51);expect(b.items[0].meCode).toBe('SYN-050');expect((await app.inject({url:'/api/v1/catalog/products?q=violeta&active=true',headers:h})).json().total).toBe(1);db.exec('DROP TABLE audit_event');const {validateSchema}=await import('../../src/server/platform/database.js');expect(()=>validateSchema(db)).toThrow('Estrutura');}finally{db.close();await app.close();}
});
