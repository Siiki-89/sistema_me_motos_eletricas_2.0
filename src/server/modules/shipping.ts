import {randomUUID} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import type {DatabaseStore} from '../platform/backups.js';
import {command,fail} from '../platform/commands.js';
import {IdParams} from '../../shared/contracts/catalog.js';
import {ShipBody,ReceiveBody,type ShipRequest,type ReceiveRequest,type ShipmentDto,type ShipmentDetailDto} from '../../shared/contracts/shipping.js';
import {order} from './orders-domain.js';
import {approvedQuality} from './quality.js';
import {civilMinute} from './production/time.js';
function get(db:DatabaseStore['db'],id:string):ShipmentDetailDto{
 const item=db.prepare('SELECT * FROM shipment WHERE id=?').get(id) as ShipmentDto|undefined;
 if(!item)fail('NOT_FOUND','Expedição não encontrada.',404);
 return {...item!,history:db.prepare('SELECT * FROM shipment_event WHERE shipmentId=? ORDER BY createdAt,id').all(id) as ShipmentDetailDto['history']};
}
function event(db:DatabaseStore['db'],id:string,kind:string,actorId:string,data:unknown,reason:string|null=null){
 db.prepare('INSERT INTO shipment_event VALUES(?,?,?,?,?,?,?)').run(randomUUID(),id,actorId,kind,reason,new Date().toISOString(),JSON.stringify(data));
}
export function registerShipping(app:FastifyInstance,store:DatabaseStore){
 app.get<{Params:{id:string}}>('/api/v1/shipments/:id',{schema:{params:IdParams}},r=>get(store.db,r.params.id));
 app.get<{Params:{id:string}}>('/api/v1/units/:id/shipment',{schema:{params:IdParams}},r=>{
 const s=store.db.prepare('SELECT id FROM shipment WHERE unitId=?').get(r.params.id) as {id:string}|undefined;
 return s?get(store.db,s.id):{shipment:null};
 });
 app.get('/api/v1/shipments',()=>({items:store.db.prepare('SELECT * FROM shipment ORDER BY dispatchedAt DESC,id DESC LIMIT 200').all() as ShipmentDto[]}));
 app.post<{Body:ShipRequest}>('/api/v1/shipments',{schema:{body:ShipBody}},r=>command(store.db,'shipment.dispatch',r.body,()=>{
  const db=store.db,b=r.body,o=order(db,b.orderId);
  civilMinute(b.dispatchedAt);
  if(!o.unitId||o.status==='CANCELLED')fail('ORDER_NOT_READY','OP sem unidade válida para expedição.');
  const u=db.prepare('SELECT chassis FROM unit WHERE id=?').get(o.unitId) as {chassis:string|null}|undefined;
  if(!u?.chassis?.trim())fail('CHASSIS_REQUIRED','Informe o chassi antes de expedir.');
  if(!approvedQuality(db,o.id))fail('QUALITY_NOT_APPROVED','Unidade sem qualidade aprovada e atualizada.');
  if(db.prepare('SELECT id FROM shipment WHERE unitId=?').get(o.unitId))fail('ALREADY_SHIPPED','A unidade já possui expedição.');
  if(!b.driver.trim()||!b.destination.trim())fail('INVALID_SHIPMENT','Identifique o motorista e o destino.',400);
  const id=randomUUID(),now=new Date().toISOString();
  db.prepare("INSERT INTO shipment VALUES(?,?,?,'SHIPPED',?,?,?,NULL,NULL,NULL,1,?,?,1)").run(id,o.id,o.unitId,b.driver.trim(),b.destination.trim(),b.dispatchedAt,now,now);
  event(db,id,'DISPATCHED',b.actorId,{orderId:o.id,unitId:o.unitId,driver:b.driver,destination:b.destination,dispatchedAt:b.dispatchedAt,accessoriesChecked:b.accessoriesChecked});
  return get(db,id);
 }));
 app.post<{Params:{id:string};Body:ReceiveRequest}>('/api/v1/shipments/:id/receive',{schema:{params:IdParams,body:ReceiveBody}},r=>command(store.db,'shipment.receive:'+r.params.id,r.body,()=>{
  const db=store.db,b=r.body,s=get(db,r.params.id);
  civilMinute(b.receivedAt);
  if(s.status!=='SHIPPED')fail('ALREADY_RECEIVED','Recebimento já registrado.');
  if(b.version!==s.version)fail('VERSION_CONFLICT','A expedição foi alterada.');
  if(Date.parse(b.receivedAt+'Z')<Date.parse(s.dispatchedAt+'Z'))fail('INVALID_INTERVAL','Recebimento anterior à saída.',400);
  if(!b.receivedBy.trim())fail('INVALID_RECEIVER','Informe o responsável.',400);
  if(b.withRemarks&&!b.remarks?.trim())fail('REMARKS_REQUIRED','Descreva a ressalva.',400);
  const status=b.withRemarks?'RECEIVED_WITH_REMARKS':'RECEIVED',now=new Date().toISOString();
  db.prepare('UPDATE shipment SET status=?,receivedAt=?,receivedBy=?,remarks=?,version=version+1,updatedAt=? WHERE id=?').run(status,b.receivedAt,b.receivedBy.trim(),b.remarks?.trim()||null,now,s.id);
  event(db,s.id,status,b.actorId,{receivedBy:b.receivedBy,receivedAt:b.receivedAt,remarks:b.remarks??null});
  return get(db,s.id);
 }));
}
