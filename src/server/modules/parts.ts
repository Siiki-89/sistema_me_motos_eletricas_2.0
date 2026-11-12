import {randomUUID} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import type {DatabaseStore} from '../platform/backups.js';
import {command,fail} from '../platform/commands.js';
import {date} from './domain.js';
import {IdParams} from '../../shared/contracts/catalog.js';
import {PartCreateBody,PartReceiptBody,PartExtraBody,PartTransferBody,type PartCreateRequest,type PartReceiptRequest,type PartExtraRequest,type PartTransferRequest,type PartDto} from '../../shared/contracts/parts.js';

type SqliteDb=DatabaseStore['db'];
const location=(db:SqliteDb,value:string)=>{
 if(value==='COMMON')return value;
 if(!/^UNIT:[0-9a-f]{8}-[0-9a-f-]{27}$/.test(value)||!db.prepare('SELECT id FROM unit WHERE id=?').get(value.slice(5)))fail('INVALID_LOCATION','Unidade de destino/origem inválida.',400);
 return value;
};
function part(db:SqliteDb,id:string){
 const p=db.prepare('SELECT * FROM part_catalog WHERE id=?').get(id) as PartDto|undefined;
 if(!p)fail('NOT_FOUND','Peça não encontrada.',404);
 return p!;
}
function balance(db:SqliteDb,id:string,loc:string){
 const r=db.prepare(`SELECT COALESCE(SUM(CASE WHEN destinationLocation=? THEN quantity ELSE 0 END)-
  SUM(CASE WHEN sourceLocation=? THEN quantity ELSE 0 END),0) n FROM part_movement WHERE partId=?`).get(loc,loc,id) as {n:number};
 return r.n;
}
function movement(db:SqliteDb,b:{partId:string;kind:string;quantity:number;sourceLocation:string|null;destinationLocation:string|null;sourceUnitId:string|null;reason:string|null;effectiveDate:string;actorId:string}){
 const p=part(db,b.partId);
 if(!p.active)fail('INACTIVE_PART','Item inativo.',409);
 date(b.effectiveDate);
 if(!Number.isSafeInteger(b.quantity)||b.quantity<1)fail('INVALID_QUANTITY','Quantidade inválida.',400);
 if(b.sourceLocation&&balance(db,b.partId,b.sourceLocation)<b.quantity)fail('INSUFFICIENT_PART_STOCK','Saldo de peça insuficiente.');
 const id=randomUUID(),now=new Date().toISOString();
 db.prepare('INSERT INTO part_movement VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,b.partId,b.kind,b.quantity,b.sourceLocation,b.destinationLocation,b.sourceUnitId,b.reason,b.effectiveDate,b.actorId,now);
 return {id,...b,createdAt:now};
}
export function registerParts(app:FastifyInstance,store:DatabaseStore){
 app.get('/api/v1/parts',()=>{
  const items=store.db.prepare(`SELECT p.*,
  COALESCE((SELECT SUM(CASE WHEN m.destinationLocation='COMMON' THEN m.quantity ELSE 0 END)-
                   SUM(CASE WHEN m.sourceLocation='COMMON' THEN m.quantity ELSE 0 END)
            FROM part_movement m WHERE m.partId=p.id),0) commonQuantity
  FROM part_catalog p ORDER BY name,id LIMIT 500`).all() as PartDto[];
  return {items};
 });
 app.get<{Params:{id:string}}>('/api/v1/parts/:id',{schema:{params:IdParams}},r=>({...part(store.db,r.params.id),commonQuantity:balance(store.db,r.params.id,'COMMON')}));
 app.get<{Params:{id:string}}>('/api/v1/units/:id/extras',{schema:{params:IdParams}},r=>{
  if(!store.db.prepare('SELECT id FROM unit WHERE id=?').get(r.params.id))fail('NOT_FOUND','Unidade não encontrada.',404);
  const loc='UNIT:'+r.params.id;
  return {items:store.db.prepare(`SELECT p.id,p.code,p.name,p.category,
   COALESCE(SUM(CASE WHEN m.destinationLocation=? THEN m.quantity WHEN m.sourceLocation=? THEN -m.quantity ELSE 0 END),0) quantity
   FROM part_catalog p JOIN part_movement m ON m.partId=p.id
   WHERE m.destinationLocation=? OR m.sourceLocation=? GROUP BY p.id HAVING quantity>0 ORDER BY p.name`).all(loc,loc,loc,loc)};
 });
 app.get('/api/v1/parts/movements',()=>({items:store.db.prepare('SELECT * FROM part_movement ORDER BY createdAt DESC,id DESC LIMIT 250').all()}));
 app.post<{Body:PartCreateRequest}>('/api/v1/parts',{schema:{body:PartCreateBody}},r=>command(store.db,'parts.create',r.body,()=>{
  const b=r.body,id=randomUUID(),now=new Date().toISOString(),code=b.code.trim().toUpperCase();
  if(!code||!b.name.trim())fail('INVALID_PART','Código e descrição obrigatórios.',400);
  store.db.prepare('INSERT INTO part_catalog VALUES(?,?,?,?,1,?)').run(id,code,b.name.trim(),b.category,now);
  return {...part(store.db,id),commonQuantity:0};
 }));
 app.post<{Body:PartReceiptRequest}>('/api/v1/parts/receipts',{schema:{body:PartReceiptBody}},r=>command(store.db,'parts.receipt',r.body,()=>movement(store.db,{...r.body,kind:'RECEIPT',sourceLocation:null,destinationLocation:'COMMON',sourceUnitId:null,reason:r.body.reason?.trim()||null})));
 app.post<{Body:PartExtraRequest}>('/api/v1/parts/extras',{schema:{body:PartExtraBody}},r=>command(store.db,'parts.extra',r.body,()=>{
  if(!store.db.prepare('SELECT id FROM unit WHERE id=?').get(r.body.unitId))fail('NOT_FOUND','Unidade não encontrada.',404);
  return movement(store.db,{...r.body,kind:'BOX_EXTRA',sourceLocation:null,destinationLocation:'UNIT:'+r.body.unitId,sourceUnitId:r.body.unitId,reason:r.body.reason?.trim()||null});
 }));
 app.post<{Body:PartTransferRequest}>('/api/v1/parts/transfers',{schema:{body:PartTransferBody}},r=>command(store.db,'parts.transfer',r.body,()=>{
  const b=r.body,fromLocation=location(store.db,b.fromLocation),toLocation=b.toLocation?location(store.db,b.toLocation):null;
  if(fromLocation===toLocation)fail('INVALID_LOCATION','Origem e destino devem ser diferentes.',400);
  return movement(store.db,{partId:b.partId,kind:toLocation?'TRANSFER':'CONSUMPTION',quantity:b.quantity,sourceLocation:fromLocation,destinationLocation:toLocation,sourceUnitId:null,reason:b.reason.trim(),effectiveDate:b.effectiveDate,actorId:b.actorId});
 }));
}
