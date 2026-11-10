import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { DatabaseStore } from '../platform/backups.js';
import { command, fail } from '../platform/commands.js';
import { date, clean } from './domain.js';
import { IdParams, ListQuery, type ListRequest } from '../../shared/contracts/catalog.js';
import { OrderCreateBody,OrderUpdateBody,OrderConvertBody,OrderCancelBody,OrderStatusBody,OrderListQuery,BlockRegularizeBody,BlockReleaseBody,
 type OrderCreateRequest,type OrderUpdateRequest,type OrderCancelRequest,type OrderStatusRequest,type OrderListRequest,type BlockRegularizeRequest,type BlockReleaseRequest,type OrderListDto,type UnitDto } from '../../shared/contracts/orders.js';
import { order,unit,reservation,block,history,event,assertEditable,createOrder,editFields } from './orders-domain.js';
import { sqlPage,filters } from './queries.js';
type Params={id:string};

export function registerOrders(app:FastifyInstance,store:DatabaseStore):void {
  app.post<{Body:OrderCreateRequest}>('/api/v1/orders',{schema:{body:OrderCreateBody}},r=>command(store.db,'order.create',r.body,()=>createOrder(store.db,r.body)));
  app.get<{Querystring:OrderListRequest}>('/api/v1/orders',{schema:{querystring:OrderListQuery}},r=>{
    const q=r.query,f=filters(q,['o.code','o.meCode','o.commercialName','u.chassis'],[{column:'o.status',value:q.status},{column:'o.originId',value:q.originId}]);
    return sqlPage<OrderListDto>(store.db,'SELECT o.*,u.chassis FROM production_order o LEFT JOIN unit u ON u.id=o.unitId',f.where,f.parameters,'o.createdAt DESC,o.id',q);
  });
  app.get<{Params:Params}>('/api/v1/orders/:id',{schema:{params:IdParams}},r=>{
    const o=order(store.db,r.params.id);return {...o,reservation:reservation(store.db,o.id),unit:o.unitId?unit(store.db,o.unitId):null,history:history(store.db,o.id)};
  });
  app.put<{Params:Params;Body:OrderUpdateRequest}>('/api/v1/orders/:id',{schema:{params:IdParams,body:OrderUpdateBody}},r=>command(store.db,'order.update:'+r.params.id,r.body,()=>{
    const o=order(store.db,r.params.id);assertEditable(o,r.body.version);editFields(store.db,o,r.body);
    store.db.prepare('UPDATE production_order SET version=version+1,updatedAt=? WHERE id=?').run(new Date().toISOString(),o.id);
    const after=order(store.db,o.id);event(store.db,after,'UPDATED',r.body.actorId,clean(r.body.reason),{before:o,after});return after;
  }));
  app.post<{Params:Params;Body:OrderUpdateRequest}>('/api/v1/orders/:id/convert',{schema:{params:IdParams,body:OrderConvertBody}},r=>command(store.db,'order.convert:'+r.params.id,r.body,()=>{
    const db=store.db,b=r.body,o=order(db,r.params.id);
    if(o.unitId) {
      if(['CANCELLED','COMPLETED'].includes(o.status)) fail('ORDER_TERMINAL','OP encerrada. Consulte a unidade já criada.');
      const u=unit(db,o.unitId);
      const mismatch=(b.chassis!==undefined&&(clean(b.chassis)?.toUpperCase()??null)!==u.chassis)||(['unpacker','mechanic','checker','destination','notes'] as const).some(k=>b[k]!==undefined&&clean(b[k])!==o[k]);
      if(mismatch) fail('ALREADY_CONVERTED','Unidade já criada. Use Salvar dados com a versão atual.');
      if(b.version>o.version) fail('VERSION_CONFLICT','Versão da OP inválida.');
      return {order:o,unit:u};
    }
    assertEditable(o,b.version);
    if(o.status!=='RESERVED'||reservation(db,o.id).status!=='active') fail('INVALID_RESERVATION','A OP precisa de reserva ativa.');
    const chassis=clean(b.chassis)?.toUpperCase()??null;
    if(chassis&&db.prepare('SELECT id FROM unit WHERE chassis=? COLLATE NOCASE').get(chassis)) fail('CHASSIS_CONFLICT','Chassi já registrado em outra unidade.');
    const id=randomUUID(),now=new Date().toISOString();
    db.prepare('INSERT INTO unit VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,o.variantId,o.meCode,o.commercialName,o.color,chassis,o.originId,o.id,now,'WAITING','PENDING','GALPAO',clean(b.chassis));
    db.prepare("UPDATE reservation SET status='consumed',updatedAt=? WHERE orderId=?").run(now,o.id);
    db.prepare("INSERT INTO box_conversion VALUES(?,?,-1,'conversion',?,NULL,NULL,?,?,?,?)").run(randomUUID(),o.originId,o.orderDate,b.actorId,now,o.id,id);
    db.prepare("UPDATE production_order SET unitId=?,status='TRANSCRIBING',version=version+1,updatedAt=? WHERE id=?").run(id,now,o.id);
    editFields(db,order(db,o.id),b);
    const after=order(db,o.id);
    event(db,after,'RESERVATION_CONSUMED',b.actorId,null,reservation(db,o.id));
    event(db,after,'CONVERTED',b.actorId);return {order:after,unit:unit(db,id)};
  }));
  app.post<{Params:Params;Body:OrderCancelRequest}>('/api/v1/orders/:id/cancel',{schema:{params:IdParams,body:OrderCancelBody}},r=>command(store.db,'order.cancel:'+r.params.id,r.body,()=>{
    const db=store.db,b=r.body,o=order(db,r.params.id);assertEditable(o,b.version);date(b.effectiveDate);
    if(!b.reason.trim()) fail('REASON_REQUIRED','Informe o motivo.',400);
    const now=new Date().toISOString();
    if(!o.unitId) {
      if(reservation(db,o.id).status!=='active') fail('INVALID_RESERVATION','Reserva não está ativa.');
      db.prepare("UPDATE reservation SET status='released',updatedAt=? WHERE orderId=?").run(now,o.id);
      if(b.boxOpened) db.prepare("INSERT INTO box_block VALUES(?,?,?,?,'active',?,?,NULL,NULL)").run(randomUUID(),o.originId,o.variantId,o.id,b.reason.trim(),now);
      event(db,o,'RESERVATION_RELEASED',b.actorId,b.reason.trim(),{boxOpened:b.boxOpened,effectiveDate:b.effectiveDate});
    }
    db.prepare("UPDATE production_order SET status='CANCELLED',version=version+1,updatedAt=? WHERE id=?").run(now,o.id);
    const after=order(db,o.id);event(db,after,'CANCELLED',b.actorId,b.reason.trim(),{before:o,after,effectiveDate:b.effectiveDate,boxOpened:b.boxOpened});return after;
  }));
  app.post<{Params:Params;Body:OrderStatusRequest}>('/api/v1/orders/:id/status',{schema:{params:IdParams,body:OrderStatusBody}},r=>command(store.db,'order.status:'+r.params.id,r.body,()=>{
    const o=order(store.db,r.params.id);assertEditable(o,r.body.version);
    if(!o.unitId||!(['TRANSCRIBING','IN_PROGRESS'].includes(o.status))||o.status===r.body.status) fail('INVALID_TRANSITION','Inicie a transcrição antes de alterar a situação administrativa.');
    store.db.prepare('UPDATE production_order SET status=?,version=version+1,updatedAt=? WHERE id=?').run(r.body.status,new Date().toISOString(),o.id);
    const after=order(store.db,o.id);event(store.db,after,'STATUS_CHANGED',r.body.actorId);return after;
  }));
  app.get<{Querystring:OrderListRequest}>('/api/v1/units',{schema:{querystring:OrderListQuery}},r=>{
    const f=filters(r.query,['u.meCode','u.commercialName','u.chassis','o.code'],[{column:'u.originId',value:r.query.originId},{column:'o.status',value:r.query.status}]);
    return sqlPage<UnitDto>(store.db,'SELECT u.* FROM unit u JOIN production_order o ON o.id=u.originOrderId',f.where,f.parameters,'u.createdAt DESC,u.id',r.query);
  });
  app.get<{Params:Params}>('/api/v1/units/:id',{schema:{params:IdParams}},r=>{
    const u=unit(store.db,r.params.id);return {...u,orders:store.db.prepare('SELECT * FROM production_order WHERE unitId=? ORDER BY createdAt,id').all(u.id),history:history(store.db,u.originOrderId)};
  });
  app.get<{Querystring:ListRequest}>('/api/v1/boxes/blocks',{schema:{querystring:ListQuery}},r=>{
    const f=filters(r.query,['b.reason'],[{column:'b.originId',value:r.query.originId},{column:'b.variantId',value:r.query.variantId}]);
    return sqlPage(store.db,'SELECT b.* FROM box_block b',f.where,f.parameters,'b.createdAt DESC,b.id',r.query);
  });
  app.post<{Params:Params;Body:BlockRegularizeRequest}>('/api/v1/boxes/blocks/:id/regularize',{schema:{params:IdParams,body:BlockRegularizeBody}},r=>command(store.db,'block.regularize:'+r.params.id,r.body,()=>{
    const b=block(store.db,r.params.id);if(!r.body.reason.trim()) fail('REASON_REQUIRED','Informe o motivo.',400);
    const o=createOrder(store.db,{...r.body,variantId:b.variantId},b);event(store.db,o,'BLOCK_REGULARIZED',r.body.actorId,r.body.reason.trim(),{blockId:b.id,cancelledOrderId:b.cancelledOrderId});return o;
  }));
  app.post<{Params:Params;Body:BlockReleaseRequest}>('/api/v1/boxes/blocks/:id/release',{schema:{params:IdParams,body:BlockReleaseBody}},r=>command(store.db,'block.release:'+r.params.id,r.body,()=>{
    const b=block(store.db,r.params.id);if(b.status!=='active') fail('BLOCK_RESOLVED','Bloqueio já resolvido.');
    if(!r.body.reason.trim()) fail('REASON_REQUIRED','Informe o motivo.',400);
    store.db.prepare("UPDATE box_block SET status='released',resolvedAt=? WHERE id=?").run(new Date().toISOString(),b.id);
    event(store.db,order(store.db,b.cancelledOrderId),'BLOCK_RELEASED',r.body.actorId,r.body.reason.trim(),{blockId:b.id,physicalBoxClosed:true});return block(store.db,b.id);
  }));
}
