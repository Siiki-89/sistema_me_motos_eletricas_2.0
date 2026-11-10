const renameFault = vi.hoisted(() => ({ fail: false, cleanup: '' }));
vi.mock('node:fs', async (original) => { const actual = await original<typeof import('node:fs')>(); return { ...actual, rmSync: (...args: Parameters<typeof actual.rmSync>) => { const path=String(args[0]); if(renameFault.cleanup && path.includes(renameFault.cleanup)) throw new Error('synthetic cleanup failure'); return actual.rmSync(...args); }, renameSync: (...args: Parameters<typeof actual.renameSync>) => { if (renameFault.fail) { renameFault.fail = false; throw new Error('synthetic rename failure'); } return actual.renameSync(...args); } }; });
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';

import { join } from 'node:path';
import { openDatabase, migrateDatabase, withTransaction } from '../../src/server/platform/database.js';
import { buildApp } from '../../src/server/app.js';

mkdirSync(join(process.cwd(), 'artifacts/test-tmp'), { recursive: true });
const dirs: string[] = [];
const temp = () => { const dir = mkdtempSync(join(process.cwd(), 'artifacts/test-tmp/me-foundation-')); dirs.push(dir); return dir; };
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe('SQLite foundation', () => {
  it('persists, migrates once, enables FK and rolls back failed transactions', () => {
    const dir = temp(); let db = openDatabase(dir);
    expect(db.prepare('SELECT count(*) AS n FROM schema_migration').get()).toEqual({ n: 3 });
    db.exec('CREATE TABLE parent(id INTEGER PRIMARY KEY); CREATE TABLE child(parent_id INTEGER REFERENCES parent(id));');
    expect(() => db.prepare('INSERT INTO child VALUES (12)').run()).toThrow();
    expect(() => withTransaction(db, () => { db.prepare('INSERT INTO parent VALUES (1)').run(); throw new Error('interrupt'); })).toThrow('interrupt');
    expect(db.prepare('SELECT count(*) AS n FROM parent').get()).toEqual({ n: 0 });
    db.prepare("INSERT INTO app_metadata(key,value) VALUES ('synthetic','persisted')").run(); db.close();
    db = openDatabase(dir);
    expect(db.prepare("SELECT value FROM app_metadata WHERE key='synthetic'").get()).toEqual({ value: 'persisted' });
    expect(db.prepare('SELECT count(*) AS n FROM schema_migration').get()).toEqual({ n: 3 }); db.close();
  });
  it('refuses checksum drift and future schema', () => {
    const db = openDatabase(temp());
    db.prepare("UPDATE schema_migration SET checksum='drift'").run();
    expect(() => migrateDatabase(db)).toThrow();
    db.prepare('UPDATE schema_migration SET version=99 WHERE version=2').run();
    expect(() => migrateDatabase(db)).toThrow(); db.close();
  });
  it('refuses relative and network data paths', () => {
    expect(() => openDatabase('data')).toThrow();
    expect(() => openDatabase('\\\\server\\share')).toThrow();
  });
});

describe('local HTTP foundation', () => {
  it('protects host/origin/session, validates schemas and returns sanitized errors', async () => {
    const app = await buildApp({ dataDir: temp(), port: 4317, mode: 'test' });
    const host = { host: '127.0.0.1:4317' };
    try {
      expect((await app.inject({ url: '/api/v1/health', headers: { host: 'evil.test' } })).statusCode).toBe(403);
      const health = await app.inject({ url: '/api/v1/health', headers: host });
      expect(health.json()).toMatchObject({ app: 'me-estoque', instanceId: expect.any(String), database: { schemaVersion: 3, status: 'ready' } });
      const session = await app.inject({ url: '/api/v1/session', headers: host });
      expect(session.headers['set-cookie']).toContain('HttpOnly');
      const cookie = String(session.headers['set-cookie']).split(';')[0]!;
      const headers = { ...host, origin: 'http://127.0.0.1:4317', cookie, 'x-csrf-token': session.json().csrfToken };
      for (const bad of [{ ...headers, origin: 'https://evil.test' }, { ...host }, { ...headers, 'x-csrf-token': 'bad' }, { ...headers, 'x-csrf-token': 'é'.repeat(64) }]) {
        expect((await app.inject({ method: 'POST', url: '/api/v1/backups', headers: bad, payload: {} })).statusCode).toBe(403);
      }
      const invalid = await app.inject({ method: 'POST', url: '/api/v1/restore', headers, payload: { backupId: '../../secret', confirmation: 'YES' } });
      expect(invalid.statusCode).toBe(400);
      expect(invalid.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' }, requestId: expect.any(String) });
      expect((await app.inject({ url: '/api/v1/unknown', headers: host })).statusCode).toBe(404);
    } finally { await app.close(); }
  });
  it('backs up, validates, restores with safety copy and refuses corruption', async () => {
    const dir = temp(); const app = await buildApp({ dataDir: dir, port: 4317, mode: 'test' });
    const host = { host: '127.0.0.1:4317' };
    try {
      const session = await app.inject({ url: '/api/v1/session', headers: host });
      const headers = { ...host, origin: 'http://127.0.0.1:4317', cookie: String(session.headers['set-cookie']).split(';')[0]!, 'x-csrf-token': session.json().csrfToken };
      const post = (url: string, payload: object) => app.inject({ method: 'POST', url, headers, payload });
      let db = openDatabase(dir); db.exec("INSERT INTO app_metadata VALUES ('synthetic','before')"); db.close();
      const backup = await post('/api/v1/backups', {}); expect(backup.statusCode).toBe(201); const id = backup.json().id;
      expect((await post(`/api/v1/backups/${id}/validate`, {})).json()).toMatchObject({ id, valid: true });
      db = openDatabase(dir); db.exec("UPDATE app_metadata SET value='after' WHERE key='synthetic'"); db.close();
      const restored = await post('/api/v1/restore', { backupId: id, confirmation: 'RESTAURAR' });
      expect(restored.statusCode).toBe(200); expect(restored.json().safetyBackupId).not.toBe(id);
      db = openDatabase(dir); expect(db.prepare("SELECT value FROM app_metadata WHERE key='synthetic'").get()).toEqual({ value: 'before' }); db.close();
      const bytes = readFileSync(join(dir, 'backups', `${id}.sqlite`)); writeFileSync(join(dir, 'backups', `${id}.sqlite`), 'corrupt');
      expect((await post('/api/v1/restore', { backupId: id, confirmation: 'RESTAURAR' })).statusCode).toBe(400);
      db = openDatabase(dir); expect(db.prepare("SELECT value FROM app_metadata WHERE key='synthetic'").get()).toEqual({ value: 'before' }); db.close();
      writeFileSync(join(dir, 'backups', `${id}.sqlite`), bytes);
      const list = await app.inject({ url: '/api/v1/backups', headers: host }); expect(list.json().items).toHaveLength(2);
    } finally { await app.close(); }
  });
});


describe('graceful shutdown', () => {
  it('requires the local session and acknowledges shutdown', async () => {
    const app=buildApp({dataDir:temp(),port:4317,mode:'test'});
    const host={host:'127.0.0.1:4317'};
    try {
      expect((await app.inject({method:'POST',url:'/api/v1/shutdown',headers:host,payload:{}})).statusCode).toBe(403);
      const session=await app.inject({url:'/api/v1/session',headers:host});
      const result=await app.inject({method:'POST',url:'/api/v1/shutdown',payload:{},headers:{...host,origin:'http://127.0.0.1:4317',cookie:String(session.headers['set-cookie']).split(';')[0]!, 'x-csrf-token':session.json().csrfToken}});
      expect(result.statusCode).toBe(202); expect(result.json()).toEqual({stopping:true});
    } finally {await app.close();}
  });
});

describe('interrupted restore', () => {
  it('refuses startup with a pending restore before creating any database', async () => {
    const dir=temp(); writeFileSync(join(dir,'restore-pending.json'), '{}');
    const {DatabaseStore}=await import('../../src/server/platform/backups.js');
    expect(()=>new DatabaseStore(dir)).toThrow('pendente');
    const {existsSync}=await import('node:fs');
    expect(existsSync(join(dir,'me-estoque.sqlite'))).toBe(false);
  });
});


it('reopens the unchanged database when the first restore rename fails', async () => {
 const {DatabaseStore}=await import('../../src/server/platform/backups.js'); const store=new DatabaseStore(temp());
 try {store.db.exec("INSERT INTO app_metadata VALUES ('synthetic','original')"); const copy=await store.create(); renameFault.fail=true; await expect(store.restore(copy.id)).rejects.toThrow('synthetic rename failure'); expect(store.db.open).toBe(true); expect(store.db.prepare("SELECT value FROM app_metadata WHERE key='synthetic'").get()).toEqual({value:'original'});}
 finally {renameFault.fail=false;store.close();}
});


it('keeps the previous database recoverable after interruption between renames', async()=>{
 const dir=temp();const db=openDatabase(dir);db.exec("INSERT INTO app_metadata VALUES ('synthetic','recoverable')");db.close();
 const fs=await import('node:fs');const previous=join(dir,'recovery-synthetic.sqlite');fs.renameSync(join(dir,'me-estoque.sqlite'),previous);const bytes=fs.readFileSync(previous);
 fs.writeFileSync(join(dir,'restore-pending.json'),JSON.stringify({previous}));
 const {DatabaseStore}=await import('../../src/server/platform/backups.js');expect(()=>new DatabaseStore(dir)).toThrow('pendente');
 expect(fs.existsSync(join(dir,'me-estoque.sqlite'))).toBe(false);expect(fs.readFileSync(previous)).toEqual(bytes);
});


it('rejects overlapping real snapshot operations at the store boundary', async()=>{
 const {DatabaseStore}=await import('../../src/server/platform/backups.js');const store=new DatabaseStore(temp());
 try {const first=store.create(); await expect(store.create()).rejects.toThrow('andamento');await first;}finally{store.close();}
});

it.each(['restore-pending.json','recovery-'])('preserves restored data when cleanup of %s fails', async(cleanup)=>{
 const {DatabaseStore}=await import('../../src/server/platform/backups.js');const store=new DatabaseStore(temp());
 try{store.db.exec("INSERT INTO app_metadata VALUES ('synthetic','before')");const backup=await store.create();store.db.exec("UPDATE app_metadata SET value='after' WHERE key='synthetic'");renameFault.cleanup=cleanup;
 await expect(store.restore(backup.id)).resolves.toEqual(expect.any(String));expect(store.db.open).toBe(true);expect(store.db.prepare("SELECT value FROM app_metadata WHERE key='synthetic'").get()).toEqual({value:'before'});
 }finally{renameFault.cleanup='';store.close();}
});

it('returns maintenance rather than overlapping concurrent HTTP backup handlers',async()=>{
 const app=buildApp({dataDir:temp(),port:4317,mode:'test'});const host={host:'127.0.0.1:4317'};
 try {const session=await app.inject({url:'/api/v1/session',headers:host});const headers={...host,origin:'http://127.0.0.1:4317',cookie:String(session.headers['set-cookie']).split(';')[0]!, 'x-csrf-token':session.json().csrfToken};
 const results=await Promise.all([app.inject({method:'POST',url:'/api/v1/backups',headers,payload:{}}),app.inject({method:'POST',url:'/api/v1/backups',headers,payload:{}})]);expect(results.map(r=>r.statusCode).sort()).toEqual([201,503]);
 }finally{await app.close();}
});

it('serves built SPA root, deep links and static assets with the local host', async()=>{
 const webDir=temp();writeFileSync(join(webDir,'index.html'),'<!doctype html><html><body>synthetic SPA</body></html>');writeFileSync(join(webDir,'synthetic.js'),'console.log("synthetic");');
 const app=buildApp({dataDir:temp(),port:4317,mode:'test',webDir});const headers={host:'127.0.0.1:4317'};
 try {for(const url of ['/','/protecao/detalhe']){const response=await app.inject({url,headers});expect(response.statusCode).toBe(200);expect(response.headers['content-type']).toContain('text/html');expect(response.body).toContain('synthetic SPA');}
 const asset=await app.inject({url:'/synthetic.js',headers});expect(asset.statusCode).toBe(200);expect(asset.body).toBe('console.log("synthetic");');expect((await app.inject({url:'/api/v1/missing',headers})).statusCode).toBe(404);
 }finally{await app.close();}
});
