import { it, expect } from 'vitest';
import { buildApp } from '../../src/server/app.js';
import { openDatabase } from '../../src/server/platform/database.js';
import { mkdtempSync,mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fork } from 'node:child_process';
import { DatabaseStore } from '../../src/server/platform/backups.js';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { migrationChecksum } from '../../src/server/platform/database.js';

async function fixture(quantity=3) {
  mkdirSync('artifacts/test-tmp',{recursive:true});
  const dir=mkdtempSync(join(process.cwd(),'artifacts/test-tmp/order-rules-'));
  const app=buildApp({dataDir:dir,port:4317,mode:'test'}),db=openDatabase(dir),host={host:'127.0.0.1:4317'};
  const s=await app.inject({url:'/api/v1/session',headers:host});
  const headers={...host,origin:'http://127.0.0.1:4317',cookie:String(s.headers['set-cookie']).split(';')[0]!, 'x-csrf-token':s.json().csrfToken};
  const cmd=()=>({operationId:randomUUID(),actorId:'local-operator'});
  const post=(url:string,payload:object)=>app.inject({method:'POST',url,headers,payload});
  const put=(url:string,payload:object)=>app.inject({method:'PUT',url,headers,payload});
  const get=(url:string)=>app.inject({url,headers:host});
  const p=(await post('/api/v1/catalog/products',{...cmd(),meCode:'SYN-RULE'})).json();
  const v=(await post('/api/v1/catalog/variants',{...cmd(),productId:p.id,color:'Azul'})).json();
  const receipt=(await post('/api/v1/boxes/receipts',{...cmd(),variantId:v.id,quantity,receivedDate:'2026-11-10',lot:'SYN-LOT'})).json();
  const create=async()=> (await post('/api/v1/orders',{...cmd(),variantId:v.id,orderDate:'2026-11-10'})).json();
  return {app,db,dir,cmd,post,put,get,v,p,receipt,create,close:async()=>{if(db.open)db.close();await app.close();}};
}

it('protects reserved and blocked stock, regularizes and releases exactly once',async()=>{
 const f=await fixture(2);try{
  const o=await f.create();
  expect((await f.post('/api/v1/boxes/adjustments',{...f.cmd(),originId:f.receipt.originId,quantity:-2,reason:'SYN',effectiveDate:'2026-11-10'})).statusCode).toBe(409);
  expect((await f.post(`/api/v1/boxes/movements/${f.receipt.id}/reverse`,{...f.cmd(),reason:'SYN',effectiveDate:'2026-11-10'})).statusCode).toBe(409);
  const cancel={...f.cmd(),version:1,reason:'SYN aberta',effectiveDate:'2026-11-10',boxOpened:true};
  expect((await f.post(`/api/v1/orders/${o.id}/cancel`,cancel)).statusCode).toBe(200);
  expect((await f.get('/api/v1/boxes/summary')).json()).toMatchObject({physical:2,reserved:0,blocked:1,available:1});
  const b=(await f.get('/api/v1/boxes/blocks')).json().items[0];
  const body={...f.cmd(),orderDate:'2026-11-10',reason:'SYN regularização'};
  const reg=(await f.post(`/api/v1/boxes/blocks/${b.id}/regularize`,body)).json();
  expect(reg).toMatchObject({originId:b.originId,regularizesOrderId:o.id,status:'RESERVED'});
  expect((await f.post(`/api/v1/boxes/blocks/${b.id}/regularize`,body)).json()).toEqual(reg);
  expect((await f.post(`/api/v1/boxes/blocks/${b.id}/regularize`,{...body,...f.cmd()})).statusCode).toBe(409);
  expect((await f.get('/api/v1/boxes/summary')).json()).toMatchObject({physical:2,reserved:1,blocked:0,available:1});
  await f.post(`/api/v1/orders/${reg.id}/cancel`,{...cancel,...f.cmd()});
  const b2=(await f.get('/api/v1/boxes/blocks')).json().items.find((x:{status:string})=>x.status==='active');
  expect((await f.post(`/api/v1/boxes/blocks/${b2.id}/release`,{...f.cmd(),reason:'SYN fechada',physicalBoxClosed:false})).statusCode).toBe(400);
  const release={...f.cmd(),reason:'SYN fechada',physicalBoxClosed:true};
  expect((await f.post(`/api/v1/boxes/blocks/${b2.id}/release`,release)).statusCode).toBe(200);
  expect((await f.post(`/api/v1/boxes/blocks/${b2.id}/release`,release)).statusCode).toBe(200);
  expect((await f.get('/api/v1/boxes/summary')).json()).toMatchObject({physical:2,reserved:0,blocked:0,available:2});
 }finally{await f.close();}
});

it('normalizes unique chassis, rolls back conflict, audits corrections and never lowers stock on update',async()=>{
 const f=await fixture();try{
  const a=await f.create(),b=await f.create();
  const first=(await f.post(`/api/v1/orders/${a.id}/convert`,{...f.cmd(),version:1,chassis:' syn-001 '})).json();
  expect(first.unit.chassis).toBe('SYN-001');
  expect(first.unit.chassisOriginal).toBe('syn-001');
  const collision=await f.post(`/api/v1/orders/${b.id}/convert`,{...f.cmd(),version:1,chassis:'SYN-001'});
  expect(collision.json().error.code).toBe('CHASSIS_CONFLICT');
  expect((await f.get(`/api/v1/orders/${b.id}`)).json()).toMatchObject({status:'RESERVED',unit:null,reservation:{status:'active'}});
  expect((await f.put(`/api/v1/orders/${a.id}`,{...f.cmd(),version:2,chassis:'SYN-002'})).json().error.code).toBe('REASON_REQUIRED');
  expect((await f.put(`/api/v1/orders/${a.id}`,{...f.cmd(),version:2,chassis:'SYN-002',reason:'SYN correção'})).statusCode).toBe(200);
  const detail=(await f.get(`/api/v1/orders/${a.id}`)).json();
  expect(detail.unit.chassis).toBe('SYN-002');expect(detail.history.some((x:{kind:string})=>x.kind==='CHASSIS_UPDATED')).toBe(true);
  expect((await f.get('/api/v1/boxes/summary')).json()).toMatchObject({physical:2,reserved:1,available:1});
  const movement=(await f.get('/api/v1/boxes/movements')).json().items.find((x:{kind:string})=>x.kind==='conversion');
  expect(movement).toMatchObject({orderId:a.id,unitId:first.unit.id,quantity:-1});
  expect((await f.post(`/api/v1/boxes/movements/${movement.id}/reverse`,{...f.cmd(),reason:'SYN',effectiveDate:'2026-11-10'})).json().error.code).toBe('CONVERSION_NOT_REVERSIBLE');
  expect((await f.get('/api/v1/orders?q=SYN-002')).json().total).toBe(1);
  expect((await f.get('/api/v1/units?q=SYN-002')).json().total).toBe(1);
 }finally{await f.close();}
});

it('conversion failure rolls back unit, stock, reservation, events and receipt',async()=>{
 const f=await fixture();try{
  const o=await f.create(),body={...f.cmd(),version:1};
  const before=f.db.prepare('SELECT COUNT(*) n FROM order_event').get();
  f.db.exec("CREATE TRIGGER fail_conversion BEFORE INSERT ON box_conversion BEGIN SELECT RAISE(ABORT,'synthetic failure'); END");
  expect((await f.post(`/api/v1/orders/${o.id}/convert`,body)).statusCode).toBe(409);
  expect(f.db.prepare('SELECT COUNT(*) n FROM unit').get()).toEqual({n:0});
  expect(f.db.prepare('SELECT COUNT(*) n FROM order_event').get()).toEqual(before);
  expect(f.db.prepare('SELECT * FROM command_receipt WHERE operationId=?').get(body.operationId)).toBeUndefined();
  expect((await f.get(`/api/v1/orders/${o.id}`)).json()).toMatchObject({version:1,status:'RESERVED',reservation:{status:'active'}});
  expect((await f.get('/api/v1/boxes/summary')).json()).toMatchObject({physical:3,reserved:1});
  f.db.exec('DROP TRIGGER fail_conversion');
  expect((await f.post(`/api/v1/orders/${o.id}/convert`,body)).statusCode).toBe(200);
 }finally{await f.close();}
});

it('selects FIFO deterministically, rejects invalid schema and stale command versions',async()=>{
 const f=await fixture(1);try{
  const earlier=(await f.post('/api/v1/boxes/receipts',{...f.cmd(),variantId:f.v.id,quantity:1,receivedDate:'2026-11-01'})).json();
  const o=await f.create();expect(o.originId).toBe(earlier.originId);
  expect((await f.post('/api/v1/orders',{...f.cmd(),variantId:f.v.id,orderDate:'2026-11-10',unitId:randomUUID()})).statusCode).toBe(400);
  expect((await f.put(`/api/v1/orders/${o.id}`,{...f.cmd(),notes:'SYN'})).statusCode).toBe(400);
  expect((await f.post(`/api/v1/orders/${o.id}/convert`,{...f.cmd(),version:9})).json().error.code).toBe('VERSION_CONFLICT');
  await f.post(`/api/v1/orders/${o.id}/cancel`,{...f.cmd(),version:1,reason:'SYN',effectiveDate:'2026-11-10',boxOpened:false});
  expect((await f.post(`/api/v1/orders/${o.id}/convert`,{...f.cmd(),version:1})).statusCode).toBe(409);
  expect((await f.get('/api/v1/boxes/summary')).json()).toMatchObject({physical:2,reserved:0,available:2});
 }finally{await f.close();}
});

it('two real processes compete for the last box and only one commits a reservation',async()=>{
 const f=await fixture(1);try{
  const workers=[0,1].map(()=>fork(join(process.cwd(),'tests/fixtures/order-competition.ts'),[f.dir,f.v.id],{execArgv:['--import','tsx'],stdio:['ignore','ignore','pipe','ipc']}));
  try {
   await Promise.all(workers.map(w=>new Promise<void>((resolve,reject)=>{w.once('message',m=>m==='ready'?resolve():reject(new Error('worker not ready')));w.once('error',reject);})));
   const pending=workers.map(w=>new Promise<{ok:boolean;code?:string}>(resolve=>w.once('message',resolve)));
   workers.forEach(w=>w.send('go'));
   const result=await Promise.all(pending);
   expect(result.filter(x=>x.ok)).toHaveLength(1);
   expect(result.find(x=>!x.ok)?.code).toBe('INSUFFICIENT_STOCK');
   expect((await f.get('/api/v1/boxes/summary')).json()).toMatchObject({physical:1,reserved:1,available:0});
  }finally{workers.forEach(w=>{if(w.connected)w.disconnect();});}
 }finally{await f.close();}
});

it('preserves v2 during upgrade and restores v3 orders units receipts and history',async()=>{
 const dir=mkdtempSync(join(process.cwd(),'artifacts/test-tmp/order-upgrade-'));
 const old=new Database(join(dir,'me-estoque.sqlite'));
 old.exec('CREATE TABLE schema_migration(version INTEGER PRIMARY KEY,checksum TEXT NOT NULL,applied_at TEXT NOT NULL) STRICT');
 for(let v=1;v<=2;v++){old.exec(readFileSync(`migrations/00${v}-${v===1?'foundation':'boxes'}.sql`,'utf8'));old.prepare('INSERT INTO schema_migration VALUES(?,?,?)').run(v,migrationChecksum(undefined,v),new Date().toISOString());}
 old.exec("INSERT INTO app_metadata VALUES('synthetic','v2-preserved')");old.close();
 const store=new DatabaseStore(dir);try{
  const v2=store.list()[0]!;expect(store.validate(v2.id).schemaVersion).toBe(2);
  await store.restore(v2.id);expect(store.db.prepare("SELECT value FROM app_metadata WHERE key='synthetic'").get()).toEqual({value:'v2-preserved'});
 }finally{store.close();}
 const f=await fixture(2);try{
  const o=await f.create(),body={...f.cmd(),version:1,chassis:'SYN-BACKUP'};
  const converted=(await f.post(`/api/v1/orders/${o.id}/convert`,body)).json();
  const before=(await f.get(`/api/v1/orders/${o.id}`)).json();
  const b=(await f.post('/api/v1/backups',{})).json();expect(b.schemaVersion).toBe(7);
  await f.post(`/api/v1/orders/${o.id}/cancel`,{...f.cmd(),version:2,reason:'SYN',effectiveDate:'2026-11-10',boxOpened:false});
  f.db.close();
  expect((await f.post('/api/v1/restore',{backupId:b.id,confirmation:'RESTAURAR'})).statusCode).toBe(200);
  expect((await f.get(`/api/v1/orders/${o.id}`)).json()).toEqual(before);
  expect((await f.post(`/api/v1/orders/${o.id}/convert`,body)).json()).toEqual(converted);
  expect((await f.get('/api/v1/boxes/summary')).json()).toMatchObject({physical:1,reserved:0,available:1});
  expect((await f.get(`/api/v1/units/${converted.unit.id}`)).json().chassis).toBe('SYN-BACKUP');
 }finally{await f.close();}
});

it('database rejects inconsistent relationships, immutable identity and a second active order per unit',async()=>{
 const f=await fixture();try{
  const o=await f.create();const converted=(await f.post(`/api/v1/orders/${o.id}/convert`,{...f.cmd(),version:1})).json();
  expect(()=>f.db.prepare('UPDATE unit SET originId=? WHERE id=?').run(randomUUID(),converted.unit.id)).toThrow();
  expect(()=>f.db.prepare('DELETE FROM unit WHERE id=?').run(converted.unit.id)).toThrow();
  const second=await f.create();
  expect(()=>f.db.prepare('UPDATE production_order SET unitId=? WHERE id=?').run(converted.unit.id,second.id)).toThrow();
  expect(()=>f.db.prepare('UPDATE reservation SET originId=? WHERE orderId=?').run(randomUUID(),second.id)).toThrow();
  expect(f.db.pragma('foreign_key_check')).toEqual([]);
 }finally{await f.close();}
});

it('database rejects stock below active holds and mismatched initial unit linkage',async()=>{
 const f=await fixture(2);try{
  const a=await f.create(),b=await f.create();
  expect(()=>f.db.prepare("INSERT INTO box_movement VALUES(?,?,?,'adjustment',?,'SYN',NULL,?,?)").run(randomUUID(),f.receipt.originId,-1,'2026-11-10','local-operator',new Date().toISOString())).toThrow();
  const converted=(await f.post(`/api/v1/orders/${a.id}/convert`,{...f.cmd(),version:1})).json();
  await f.post(`/api/v1/orders/${a.id}/cancel`,{...f.cmd(),version:2,reason:'SYN',effectiveDate:'2026-11-10',boxOpened:false});
  expect(()=>f.db.prepare('UPDATE production_order SET unitId=? WHERE id=?').run(converted.unit.id,b.id)).toThrow();
 }finally{await f.close();}
});

it('cancel and convert compete in separate processes and stale version cannot commit',async()=>{
 const f=await fixture(1);try{
  const o=await f.create();
  const workers=['cancel','convert'].map(action=>fork(join(process.cwd(),'tests/fixtures/order-competition.ts'),[f.dir,o.id,action],{execArgv:['--import','tsx'],stdio:['ignore','ignore','pipe','ipc']}));
  await Promise.all(workers.map(w=>new Promise<void>((resolve,reject)=>{w.once('message',m=>m==='ready'?resolve():reject(new Error('worker not ready')));w.once('error',reject);})));
  const pending=workers.map(w=>new Promise<{ok:boolean;code?:string}>(resolve=>w.once('message',resolve)));workers.forEach(w=>w.send('go'));
  const results=await Promise.all(pending);
  expect(results.filter(x=>x.ok)).toHaveLength(1);expect(results.find(x=>!x.ok)?.code).toBe('VERSION_CONFLICT');
  const detail=(await f.get(`/api/v1/orders/${o.id}`)).json();
  const summary=(await f.get('/api/v1/boxes/summary')).json();
  expect(summary).toMatchObject({physical:detail.unit?0:1,reserved:0,available:detail.unit?0:1});
  expect(f.db.pragma('foreign_key_check')).toEqual([]);
 }finally{await f.close();}
});

it('persists after reopening and keeps administrative completion independent from quality',async()=>{
 const f=await fixture(2);let unitId:string,orderId:string;
 try{
  const o=await f.create();orderId=o.id;
  const converted=(await f.post(`/api/v1/orders/${o.id}/convert`,{...f.cmd(),version:1})).json();unitId=converted.unit.id;
  expect((await f.post(`/api/v1/orders/${o.id}/status`,{...f.cmd(),version:2,status:'IN_PROGRESS'})).statusCode).toBe(200);
  expect((await f.post(`/api/v1/orders/${o.id}/status`,{...f.cmd(),version:3,status:'COMPLETED'})).statusCode).toBe(200);
  expect((await f.get(`/api/v1/units/${unitId}`)).json()).toMatchObject({qualityStatus:'PENDING',productionStatus:'WAITING',location:'GALPAO'});
 }finally{await f.close();}
 const app=buildApp({dataDir:f.dir,port:4317,mode:'test'});try{
  const h={host:'127.0.0.1:4317'};
  expect((await app.inject({url:`/api/v1/orders/${orderId!}`,headers:h})).json()).toMatchObject({status:'COMPLETED',unitId:unitId!});
  expect((await app.inject({url:'/api/v1/boxes/summary',headers:h})).json()).toMatchObject({physical:1,reserved:0});
 }finally{await app.close();}
});
