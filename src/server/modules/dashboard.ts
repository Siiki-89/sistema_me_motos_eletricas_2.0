import type {FastifyInstance} from 'fastify';
import type {DatabaseStore} from '../platform/backups.js';
import {calculateTimes} from './production/time.js';
const count=(db:DatabaseStore['db'],query:string)=>((db.prepare(query).get() as {n:number}).n);
export function registerDashboard(app:FastifyInstance,store:DatabaseStore){
 app.get('/api/v1/dashboard',()=>{
 const db=store.db;
 const physical=count(db,'SELECT COALESCE(SUM(quantity),0) n FROM box_ledger');
 const reserved=count(db,"SELECT COUNT(*) n FROM reservation WHERE status='active'");
 const blocked=count(db,"SELECT COUNT(*) n FROM box_block WHERE status='active'");
 const units=count(db,'SELECT COUNT(*) n FROM unit');
 const orders=db.prepare('SELECT status,COUNT(*) n FROM production_order GROUP BY status').all() as {status:string;n:number}[];
 const assemblyDone=count(db,"SELECT COUNT(*) n FROM production_record WHERE productionStatus='ASSEMBLED'");
 const qualityApproved=count(db,`SELECT COUNT(*) n FROM quality_record q
   JOIN production_record p ON p.orderId=q.orderId
   WHERE q.status='APPROVED' AND q.productionVersion=p.version AND p.productionStatus='ASSEMBLED'`);
 const shipped=count(db,"SELECT COUNT(*) n FROM shipment WHERE status='SHIPPED'");
 const received=count(db,"SELECT COUNT(*) n FROM shipment WHERE status IN('RECEIVED','RECEIVED_WITH_REMARKS')");
 const pendingQuality=Math.max(0,units-qualityApproved);
 const topStock=db.prepare(`SELECT o.meCode,o.color,COALESCE(SUM(l.quantity),0) physical
 FROM box_origin o JOIN box_ledger l ON l.originId=o.id
 GROUP BY o.meCode,o.color HAVING physical>0 ORDER BY physical DESC,o.meCode LIMIT 12`).all();
 return {boxes:{physical,reserved,blocked,available:physical-reserved-blocked},units,
  assemblyDone,qualityApproved,pendingQuality,shipped,received,
  orders,topStock};
 });
 app.get('/api/v1/reports/production',()=>{
 const db=store.db,limit=2000;
 const total=count(db,'SELECT COUNT(*) n FROM production_stage');
 const records=db.prepare(`SELECT s.data,s.kind,o.code,o.meCode,o.color,u.chassis
 FROM production_stage s JOIN production_order o ON o.id=s.orderId
 JOIN unit u ON u.id=o.unitId ORDER BY o.createdAt DESC,s.rowid DESC LIMIT ?`).all(limit) as {data:string;kind:string;code:string;meCode:string;color:string|null;chassis:string|null}[];
 return {total,limited:total>limit,items:records.map(r=>{
  const stage=JSON.parse(r.data) as {state:string;startAt:string|null;endAt:string|null;responsible:string|null;pauses:{startAt:string|null;endAt:string|null}[]};
  const time=calculateTimes(stage);
  return {op:r.code,meCode:r.meCode,color:r.color,chassis:r.chassis,kind:r.kind,state:stage.state,
  responsible:stage.responsible,startAt:stage.startAt,endAt:stage.endAt,...time};
 })};
 });
}
