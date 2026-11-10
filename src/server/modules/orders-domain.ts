import { randomUUID } from 'node:crypto';
import type { SqliteDatabase } from '../platform/database.js';
import { fail } from '../platform/commands.js';
import { clean, date, row } from './domain.js';
import type { OrderDto, ReservationDto, UnitDto, OrderEventDto, BlockDto, OrderCreateRequest, OrderUpdateRequest } from '../../shared/contracts/orders.js';

export function order(db:SqliteDatabase,id:string):OrderDto {
  return db.prepare('SELECT * FROM production_order WHERE id=?').get(id) as OrderDto | undefined ?? fail('NOT_FOUND','OP não encontrada.',404);
}
export function unit(db:SqliteDatabase,id:string):UnitDto {
  return db.prepare('SELECT * FROM unit WHERE id=?').get(id) as UnitDto | undefined ?? fail('NOT_FOUND','Unidade não encontrada.',404);
}
export function reservation(db:SqliteDatabase,id:string):ReservationDto {
  return db.prepare('SELECT * FROM reservation WHERE orderId=?').get(id) as ReservationDto | undefined ?? fail('RESERVATION_REQUIRED','Reserva não encontrada.');
}
export function block(db:SqliteDatabase,id:string):BlockDto {
  return db.prepare('SELECT * FROM box_block WHERE id=?').get(id) as BlockDto | undefined ?? fail('NOT_FOUND','Bloqueio não encontrado.',404);
}
export function history(db:SqliteDatabase,id:string):OrderEventDto[] {
  return db.prepare('SELECT * FROM order_event WHERE orderId=? ORDER BY createdAt,rowid').all(id) as OrderEventDto[];
}
export function event(db:SqliteDatabase,o:OrderDto,kind:string,actorId:string,reason:string|null=null,data:unknown=o):void {
  db.prepare('INSERT INTO order_event VALUES(?,?,?,?,?,?,?)').run(randomUUID(),o.id,kind,actorId,reason,JSON.stringify(data),new Date().toISOString());
}
export function assertEditable(o:OrderDto,version:number):void {
  if(o.version!==version) fail('VERSION_CONFLICT','A OP mudou. Reabra os dados antes de salvar.');
  if(['CANCELLED','COMPLETED'].includes(o.status)) fail('ORDER_TERMINAL','OP encerrada. Consulte o histórico.');
}
export function createOrder(db:SqliteDatabase,b:OrderCreateRequest,source?:BlockDto):OrderDto {
  date(b.orderDate);
  const v=row(db,'variant',b.variantId), p=row(db,'product',v.productId);
  if(!v.active||!p.active) fail('INACTIVE_REFERENCE','Modelo ou cor inativo.');
  const originId=source?.originId ?? (db.prepare(`SELECT o.id FROM box_origin o WHERE o.variantId=? AND
    COALESCE((SELECT SUM(quantity) FROM box_ledger WHERE originId=o.id),0)
    -(SELECT COUNT(*) FROM reservation WHERE originId=o.id AND status='active')
    -(SELECT COUNT(*) FROM box_block WHERE originId=o.id AND status='active')>=1
    ORDER BY o.receivedDate,(SELECT MIN(createdAt) FROM box_movement WHERE originId=o.id AND kind='receipt'),o.id LIMIT 1`).get(b.variantId) as {id:string}|undefined)?.id;
  if(!originId) fail('INSUFFICIENT_STOCK','Não há caixa disponível deste código e cor.');
  if(source && (source.status!=='active'||source.variantId!==b.variantId)) fail('BLOCK_RESOLVED','Bloqueio já regularizado ou liberado.');
  db.prepare('UPDATE order_sequence SET value=value+1 WHERE id=1').run();
  const sequence=(db.prepare('SELECT value FROM order_sequence WHERE id=1').get() as {value:number}).value;
  const id=randomUUID(),now=new Date().toISOString();
  db.prepare(`INSERT INTO production_order VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id,'OP-'+String(sequence).padStart(6,'0'),'INITIAL',v.id,originId,p.meCode,p.commercialName,v.color,b.orderDate,
    clean(b.unpacker),clean(b.mechanic),clean(b.checker),clean(b.destination),clean(b.notes),'RESERVED',null,1,now,now,source?.cancelledOrderId??null);
  if(source) db.prepare("UPDATE box_block SET status='regularized',resolvedAt=?,regularizedOrderId=? WHERE id=?").run(now,id,source.id);
  db.prepare('INSERT INTO reservation VALUES(?,?,?,?,?,?,?)').run(randomUUID(),id,originId,v.id,'active',now,now);
  const result=order(db,id);
  event(db,result,'CREATED',b.actorId);event(db,result,'RESERVED',b.actorId,source?.reason??null);
  return result;
}
export function editFields(db:SqliteDatabase,o:OrderDto,b:OrderUpdateRequest):void {
  for(const key of ['unpacker','mechanic','checker','destination','notes'] as const) {
    if(b[key]!==undefined) db.prepare(`UPDATE production_order SET ${key}=? WHERE id=?`).run(clean(b[key]),o.id);
  }
  if(b.chassis!==undefined) {
    if(!o.unitId) fail('CONVERSION_REQUIRED','Inicie a transcrição antes de informar o chassi.');
    const u=unit(db,o.unitId!),chassis=clean(b.chassis)?.toUpperCase()??null;
    if(u.chassis!==chassis) {
      if(u.chassis&&!b.reason?.trim()) fail('REASON_REQUIRED','Informe o motivo da correção do chassi.',400);
      if(chassis&&db.prepare('SELECT id FROM unit WHERE chassis=? COLLATE NOCASE AND id<>?').get(chassis,u.id)) fail('CHASSIS_CONFLICT','Chassi já registrado em outra unidade.');
      db.prepare('UPDATE unit SET chassis=?,chassisOriginal=? WHERE id=?').run(chassis,clean(b.chassis),u.id);
      event(db,o,'CHASSIS_UPDATED',b.actorId,clean(b.reason),{before:u.chassis,after:chassis,beforeOriginal:u.chassisOriginal,afterOriginal:clean(b.chassis)});
    }
  }
}
