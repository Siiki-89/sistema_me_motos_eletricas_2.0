import {it,expect} from 'vitest';
import {buildApp} from '../../src/server/app.js';
import {openDatabase} from '../../src/server/platform/database.js';
import {DatabaseStore} from '../../src/server/platform/backups.js';
import {mkdirSync,mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
async function fixture(){
 mkdirSync('artifacts/test-tmp',{recursive:true});const dir=mkdtempSync(join(process.cwd(),'artifacts/test-tmp/production-rules-'));
 const app=buildApp({dataDir:dir,port:4317,mode:'test'}),host={host:'127.0.0.1:4317'};
 const s=await app.inject({url:'/api/v1/session',headers:host});const headers={...host,origin:'http://127.0.0.1:4317',cookie:String(s.headers['set-cookie']).split(';')[0]!,'x-csrf-token':s.json().csrfToken};
 const cmd=()=>({operationId:randomUUID(),actorId:'local-operator'}),post=(url:string,payload:object)=>app.inject({method:'POST',url,headers,payload}),put=(url:string,payload:object)=>app.inject({method:'PUT',url,headers,payload}),get=(url:string)=>app.inject({url,headers:host});
 const p=(await post('/api/v1/catalog/products',{...cmd(),meCode:'SYN-RULES'})).json(),v=(await post('/api/v1/catalog/variants',{...cmd(),productId:p.id,color:null})).json();
 await post('/api/v1/boxes/receipts',{...cmd(),variantId:v.id,quantity:5,receivedDate:'2026-11-10'});
 const create=async()=>{const o=(await post('/api/v1/orders',{...cmd(),variantId:v.id,orderDate:'2026-11-10'})).json();await post(`/api/v1/orders/${o.id}/convert`,{...cmd(),version:1});return {id:o.id,url:`/api/v1/orders/${o.id}/production`};};
 const body=()=>({stages:[],occurrences:[],selfCheck:{templateVersion:1 as const,answers:Array.from({length:8},(_,i)=>({code:`2.${i+1}`,state:'CONFORMING',notes:null as string|null}))}});
 const stage=(kind='ASSEMBLY')=>({id:randomUUID(),kind,state:'IN_PROGRESS',civilDate:null,startAt:'2026-11-10T10:00',endAt:'2026-11-10T12:00',responsible:'Sintético',notes:null,occurrenceId:null as string|null,pauses:[] as {id:string;startAt:string|null;endAt:string|null;reason:string;notes:string|null}[]});
 const occurrence=(stageId:string|null=null)=>({id:randomUUID(),stageId,type:'DAMAGED_PART',component:'SYN',description:'Problema sintético',occurredAt:'2026-11-10T11:00' as string|null,recordedBy:null,status:'OPEN',plannedDestination:null,requiredAction:'Corrigir',resolution:null as string|null,notes:null,checklistItemCode:null});
 return {app,dir,cmd,post,put,get,create,body,stage,occurrence,close:()=>app.close()};
}
it('keeps four checklist states distinct, blocks pending completion and requires resolution action',async()=>{
 const f=await fixture();try{const o=await f.create(),s=f.stage(),b={...f.body(),stages:[s],occurrences:[f.occurrence(s.id)]};
 b.selfCheck.answers[0]!.state='NONCONFORMING';b.selfCheck.answers[1]!.state='UNASSESSED';b.selfCheck.answers[2]!.state='NOT_APPLICABLE';
 expect((await f.put(o.url,{...f.cmd(),version:0,...b})).statusCode).toBe(200);
 expect((await f.post(`${o.url}/stages/${s.id}/complete`,{...f.cmd(),version:1})).json().error?.code).toBe('SELF_CHECK_PENDING');
 b.selfCheck.answers.forEach(a=>a.state='CONFORMING');b.selfCheck.answers[2]!.state='NOT_APPLICABLE';
 expect((await f.put(o.url,{...f.cmd(),version:1,...b})).statusCode).toBe(200);
 expect((await f.post(`${o.url}/stages/${s.id}/complete`,{...f.cmd(),version:2})).json().error?.code).toBe('SELF_CHECK_PENDING');
 b.selfCheck.answers[2]!.notes='Não se aplica ao modelo sintético';
 expect((await f.put(o.url,{...f.cmd(),version:2,...b})).statusCode).toBe(200);
 expect((await f.post(`${o.url}/stages/${s.id}/complete`,{...f.cmd(),version:3})).json().error?.code).toBe('OCCURRENCES_PENDING');
 b.occurrences[0]!.status='RESOLVED';expect((await f.put(o.url,{...f.cmd(),version:3,...b})).json().error?.code).toBe('RESOLUTION_REQUIRED');
 b.occurrences[0]!.resolution='Ajuste registrado';expect((await f.put(o.url,{...f.cmd(),version:3,...b})).statusCode).toBe(200);
 expect((await f.post(`${o.url}/stages/${s.id}/complete`,{...f.cmd(),version:4})).statusCode).toBe(200);
 b.stages[0]!.state='COMPLETED';b.selfCheck.answers[0]!.notes='Correção';expect((await f.put(o.url,{...f.cmd(),version:5,...b})).json().error?.code).toBe('STAGE_COMPLETED');
 }finally{await f.close();}
});
it('accepts partial stages and unlimited own pauses, totals rework and rejects foreign or moved IDs',async()=>{
 const f=await fixture();try{const o=await f.create(),other=await f.create(),s=f.stage('UNPACKING'),a=f.stage(),r=f.stage('REWORK');r.startAt=null as unknown as string;r.endAt=null as unknown as string;
 s.pauses=[10,30,50].map(m=>({id:randomUUID(),startAt:`2026-11-10T10:${m.toString().padStart(2,'0')}`,endAt:`2026-11-10T10:${(m+5).toString().padStart(2,'0')}`,reason:'BREAK',notes:null}));
 const b={...f.body(),stages:[s,a,r]};let saved=await f.put(o.url,{...f.cmd(),version:0,...b});expect(saved.statusCode).toBe(200);expect(saved.json().totals).toEqual({netMinutes:null,knownNetMinutes:225,pendingCount:1,reworkKnownNetMinutes:0});
 expect((await f.put(other.url,{...f.cmd(),version:0,...b})).json().error?.code).toBe('INVALID_OWNERSHIP');
 const oldPause=s.pauses.pop()!;a.pauses.push(oldPause);expect((await f.put(o.url,{...f.cmd(),version:1,...b})).json().error?.code).toBe('PERSISTED_ROW_OMITTED');a.pauses=[];s.pauses.push(oldPause);
 a.pauses.push({id:s.pauses[0]!.id,startAt:null,endAt:null,reason:'OTHER',notes:null});expect((await f.put(o.url,{...f.cmd(),version:1,...b})).json().error?.code).toBe('DUPLICATE_PAUSE');a.pauses=[];
 r.startAt='2026-11-10T12:00';r.endAt='2026-11-10T12:30';saved=await f.put(o.url,{...f.cmd(),version:1,...b});expect(saved.json().totals).toEqual({netMinutes:255,knownNetMinutes:255,pendingCount:0,reworkKnownNetMinutes:30});
 expect((await f.put(o.url,{...f.cmd(),version:2,...b,stages:[...b.stages,{...f.stage(),state:'COMPLETED'}]})).statusCode).toBe(409);
 const invalid=f.occurrence(randomUUID());expect((await f.put(o.url,{...f.cmd(),version:2,...b,occurrences:[invalid]})).json().error?.code).toBe('INVALID_STAGE_LINK');
 }finally{await f.close();}
});
it('requires occurrence time and keeps pause identity scoped to its original OP',async()=>{
 const f=await fixture();try{const o=await f.create(),other=await f.create(),s=f.stage(),pause={id:randomUUID(),startAt:'2026-11-10T10:10',endAt:'2026-11-10T10:20',reason:'BREAK',notes:null};s.pauses.push(pause);
 expect((await f.put(o.url,{...f.cmd(),version:0,...f.body(),stages:[s]})).statusCode).toBe(200);
 const os=f.stage();os.pauses.push({...pause});expect((await f.put(other.url,{...f.cmd(),version:0,...f.body(),stages:[os]})).json().error?.code).toBe('INVALID_OWNERSHIP');
 const oc=f.occurrence();oc.occurredAt=null;expect((await f.put(o.url,{...f.cmd(),version:1,...f.body(),stages:[s],occurrences:[oc]})).statusCode).toBe(400);
 }finally{await f.close();}
});
it('restores production v4 atomically and upgrades populated v3 without changing OP unit or ledger',async()=>{
 const f=await fixture();try{const o=await f.create(),s=f.stage();const saved=(await f.put(o.url,{...f.cmd(),version:0,...f.body(),stages:[s]})).json();const backup=(await f.post('/api/v1/backups',{})).json();expect(backup.schemaVersion).toBe(4);
 expect((await f.post(`${o.url}/stages/${s.id}/complete`,{...f.cmd(),version:1})).statusCode).toBe(200);
 expect((await f.post('/api/v1/restore',{backupId:backup.id,confirmation:'RESTAURAR'})).statusCode).toBe(200);expect((await f.get(o.url)).json()).toEqual(saved);
 const source=openDatabase(f.dir),v3dir=mkdtempSync(join(process.cwd(),'artifacts/test-tmp/production-v3-'));
 await source.backup(join(v3dir,'me-estoque.sqlite'));source.close();
 const db=(await import('better-sqlite3')).default;const v3=new db(join(v3dir,'me-estoque.sqlite'));
 // Only this isolated synthetic copy is converted into the pre-004 fixture.
 v3.exec('DROP TABLE production_history; DROP TABLE production_occurrence; DROP TABLE production_stage; DROP TABLE production_record; DELETE FROM schema_migration WHERE version=4');
 const before={unit:v3.prepare('SELECT * FROM unit').all(),order:v3.prepare('SELECT * FROM production_order').all(),ledger:v3.prepare('SELECT * FROM box_ledger').all()};v3.close();
 const store=new DatabaseStore(v3dir);try{expect(store.list().some(b=>b.schemaVersion===3)).toBe(true);expect(store.db.prepare('SELECT * FROM unit').all()).toEqual(before.unit);expect(store.db.prepare('SELECT * FROM production_order').all()).toEqual(before.order);expect(store.db.prepare('SELECT * FROM box_ledger').all()).toEqual(before.ledger);expect(store.db.pragma('foreign_key_check')).toEqual([]);const old=store.list().find(b=>b.schemaVersion===3)!;expect(store.validate(old.id).schemaVersion).toBe(3);await store.restore(old.id);expect(store.db.prepare('SELECT * FROM unit').all()).toEqual(before.unit);}finally{store.close();}
 }finally{await f.close();}
});
it('permits administratively completed production, refuses cancelled commands and keeps GET read only',async()=>{
 const f=await fixture();try{const o=await f.create();const db=openDatabase(f.dir);try{const before=db.prepare('SELECT COUNT(*) n FROM command_receipt').get();await f.get(o.url);expect(db.prepare('SELECT COUNT(*) n FROM production_record').get()).toEqual({n:0});expect(db.prepare('SELECT COUNT(*) n FROM command_receipt').get()).toEqual(before);}finally{db.close();}
 expect((await f.post(`/api/v1/orders/${o.id}/status`,{...f.cmd(),version:2,status:'COMPLETED'})).statusCode).toBe(200);
 expect((await f.put(o.url,{...f.cmd(),version:0,...f.body(),stages:[f.stage()]})).statusCode).toBe(200);
 const cancelled=await f.create();await f.post(`/api/v1/orders/${cancelled.id}/cancel`,{...f.cmd(),version:2,reason:'Sintético',effectiveDate:'2026-11-10',boxOpened:false});expect((await f.put(cancelled.url,{...f.cmd(),version:0,...f.body()})).json().error?.code).toBe('ORDER_CANCELLED');
 }finally{await f.close();}
});
it('rejects zero pause at completion while preserving draft and explicit paused projection',async()=>{
 const f=await fixture();try{const o=await f.create(),s=f.stage('UNPACKING');s.state='PAUSED';s.pauses.push({id:randomUUID(),startAt:'2026-11-10T10:30',endAt:'2026-11-10T10:30',reason:'BREAK',notes:null});
 expect((await f.put(o.url,{...f.cmd(),version:0,...f.body(),stages:[s]})).json().productionStatus).toBe('PAUSED');
 expect((await f.post(`${o.url}/stages/${s.id}/complete`,{...f.cmd(),version:1})).json().error?.code).toBe('STAGE_INCOMPLETE');
 }finally{await f.close();}
});
it('rolls back stage, history, audit and receipt together when persistence fails after mutation',async()=>{
 const f=await fixture();try{const o=await f.create(),s=f.stage(),db=openDatabase(f.dir);try{
 const before=db.prepare('SELECT COUNT(*) n FROM audit_event').get(),body={...f.cmd(),version:0,...f.body(),stages:[s]};
 db.exec("CREATE TRIGGER synthetic_history_failure BEFORE INSERT ON production_history BEGIN SELECT RAISE(ABORT,'synthetic failure'); END");
 expect((await f.put(o.url,body)).statusCode).toBe(409);
 expect(db.prepare('SELECT COUNT(*) n FROM production_stage').get()).toEqual({n:0});expect(db.prepare('SELECT COUNT(*) n FROM production_record').get()).toEqual({n:0});expect(db.prepare('SELECT COUNT(*) n FROM production_history').get()).toEqual({n:0});expect(db.prepare('SELECT COUNT(*) n FROM audit_event').get()).toEqual(before);expect(db.prepare('SELECT * FROM command_receipt WHERE operationId=?').get(body.operationId)).toBeUndefined();
 db.exec('DROP TRIGGER synthetic_history_failure');expect((await f.put(o.url,body)).statusCode).toBe(200);
 }finally{db.close();}}finally{await f.close();}
});
it('requires reopening completed assembly before adding or reopening unresolved occurrences',async()=>{
 const f=await fixture();try{
  const o=await f.create(),s=f.stage(),occurrence=f.occurrence(s.id);occurrence.status='RESOLVED';occurrence.resolution='Corrigido';
  const b={...f.body(),stages:[s],occurrences:[occurrence]};
  expect((await f.put(o.url,{...f.cmd(),version:0,...b})).statusCode).toBe(200);
  expect((await f.post(`${o.url}/stages/${s.id}/complete`,{...f.cmd(),version:1})).statusCode).toBe(200);s.state='COMPLETED';
  occurrence.status='OPEN';
  expect((await f.put(o.url,{...f.cmd(),version:2,...b})).json().error?.code).toBe('STAGE_COMPLETED');
  occurrence.status='RESOLVED';b.occurrences.push(f.occurrence());
  expect((await f.put(o.url,{...f.cmd(),version:2,...b})).json().error?.code).toBe('STAGE_COMPLETED');
  expect((await f.get(o.url)).json()).toMatchObject({version:2,productionStatus:'ASSEMBLED'});
  expect((await f.post(`${o.url}/stages/${s.id}/reopen`,{...f.cmd(),version:2,reason:'Registrar pendência'})).statusCode).toBe(200);s.state='IN_PROGRESS';
  expect((await f.put(o.url,{...f.cmd(),version:3,...b})).statusCode).toBe(200);
  expect((await f.get(o.url)).json()).toMatchObject({version:4,productionStatus:'ASSEMBLING'});
 }finally{await f.close();}
});
