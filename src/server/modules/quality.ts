import {randomUUID} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import type {SqliteDatabase} from '../platform/database.js';
import type {DatabaseStore} from '../platform/backups.js';
import {command,fail} from '../platform/commands.js';
import {IdParams} from '../../shared/contracts/catalog.js';
import {QualitySaveBody,QualityDecisionBody,qualityStaticItems,qualityRoadItems,type QualityAnswerDto,type QualityDto,type QualitySaveRequest,type QualityDecisionRequest} from '../../shared/contracts/quality.js';
import {order} from './orders-domain.js';

type QualityRow={orderId:string;unitId:string;version:number;status:'DRAFT'|'APPROVED'|'REJECTED';productionVersion:number;checker:string|null;notes:string|null;staticAnswers:string;roadAnswers:string;updatedAt:string};
const empty=(codes:readonly {code:string}[]):QualityAnswerDto[]=>codes.map(({code})=>({code,state:'UNASSESSED',notes:null}));
function production(db:SqliteDatabase,orderId:string){
 const p=db.prepare('SELECT version FROM production_record WHERE orderId=?').get(orderId) as {version:number}|undefined;
 const stages=(db.prepare("SELECT data FROM production_stage WHERE orderId=? AND kind IN ('ASSEMBLY','REWORK')").all(orderId) as {data:string}[]).map(x=>JSON.parse(x.data) as {kind:string;state:string});
 const pending=(db.prepare("SELECT data FROM production_occurrence WHERE orderId=?").all(orderId) as {data:string}[]).some(x=>(JSON.parse(x.data) as {status:string}).status!=='RESOLVED');
 const assembled=stages.some(x=>x.kind==='ASSEMBLY'&&x.state==='COMPLETED')&&stages.every(x=>x.state==='COMPLETED');
 return {version:p?.version??0,assembled,pending};
}
function row(db:SqliteDatabase,id:string){return db.prepare('SELECT * FROM quality_record WHERE orderId=?').get(id) as QualityRow|undefined;}
function read(db:SqliteDatabase,id:string):QualityDto{
 const o=order(db,id);
 if(!o.unitId)fail('UNIT_REQUIRED','Individualize a moto antes da inspeção.',409);
 const r=row(db,id),p=production(db,id);
 const historical=(db.prepare('SELECT id,action,reason,actorId,createdAt FROM quality_event WHERE orderId=? ORDER BY createdAt,id').all(id) as QualityDto['history']);
 const valid=!!r&&r.productionVersion===p.version&&p.assembled&&!p.pending;
 return {orderId:id,unitId:o.unitId!,version:r?.version??0,status:r?.status??'DRAFT',
  effectiveStatus:!r||r.status==='DRAFT'||!valid?'PENDING':r.status,
  productionVersion:r?.productionVersion??0,currentProductionVersion:p.version,
  checker:r?.checker??null,notes:r?.notes??null,staticAnswers:r?JSON.parse(r.staticAnswers) as QualityAnswerDto[]:empty(qualityStaticItems),
  roadAnswers:r?JSON.parse(r.roadAnswers) as QualityAnswerDto[]:empty(qualityRoadItems),updatedAt:r?.updatedAt??null,history:historical};
}
function validate(answers:QualityAnswerDto[],template:readonly {code:string}[]){
 const expected=new Set(template.map(x=>x.code)),found=new Set<string>();
 for(const a of answers){
  if(!expected.has(a.code)||found.has(a.code))fail('QUALITY_ITEM_INVALID','Item de inspeção inválido ou repetido.',400);
  if(a.state==='NA'&&!a.notes?.trim())fail('QUALITY_JUSTIFICATION','Justifique o item não aplicável.',400);
  found.add(a.code);
 }
}
function requireVersion(current:QualityDto,version:number){
 if(current.version!==version)fail('VERSION_CONFLICT','Inspeção alterada. Atualize antes de salvar.',409);
}
function audit(db:SqliteDatabase,before:QualityDto,after:QualityDto,actorId:string,action:'SAVED'|'APPROVED'|'REJECTED'|'REOPENED',reason:string|null){
 db.prepare('INSERT INTO quality_event VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),before.orderId,actorId,action,reason,JSON.stringify(before),JSON.stringify(after),new Date().toISOString());
}
export function approvedQuality(db:SqliteDatabase,id:string):boolean{return read(db,id).effectiveStatus==='APPROVED';}
export function registerQuality(app:FastifyInstance,store:DatabaseStore){
 const root='/api/v1/orders/:id/quality';
 app.get<{Params:{id:string}}>(root,{schema:{params:IdParams}},r=>read(store.db,r.params.id));
 app.put<{Params:{id:string};Body:QualitySaveRequest}>(root,{schema:{params:IdParams,body:QualitySaveBody}},r=>command(store.db,'quality.save:'+r.params.id,r.body,()=>{
   const db=store.db,o=order(db,r.params.id),b=r.body,before=read(db,o.id);
   if(o.status==='CANCELLED')fail('ORDER_CANCELLED','OP cancelada.',409);
   requireVersion(before,b.version);
   if(before.status!=='DRAFT')fail('QUALITY_LOCKED','Reabra a inspeção para alterá-la.',409);
   validate(b.staticAnswers,qualityStaticItems);validate(b.roadAnswers,qualityRoadItems);
   const now=new Date().toISOString(),afterVersion=before.version+1;
   db.prepare(`INSERT INTO quality_record VALUES(?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(orderId) DO UPDATE SET version=excluded.version,status=excluded.status,productionVersion=excluded.productionVersion,checker=excluded.checker,staticAnswers=excluded.staticAnswers,roadAnswers=excluded.roadAnswers,notes=excluded.notes,updatedAt=excluded.updatedAt`)
     .run(o.id,o.unitId,afterVersion,'DRAFT',production(db,o.id).version,b.checker?.trim()||null,JSON.stringify(b.staticAnswers),JSON.stringify(b.roadAnswers),b.notes?.trim()||null,now);
   const after=read(db,o.id);audit(db,before,after,b.actorId,'SAVED',null);return read(db,o.id);
 }));
 for(const action of ['approve','reject','reopen'] as const) app.post<{Params:{id:string};Body:QualityDecisionRequest}>(`${root}/${action}`,{schema:{params:IdParams,body:QualityDecisionBody}},r=>command(store.db,'quality.'+action+':'+r.params.id,r.body,()=>{
   const db=store.db,o=order(db,r.params.id),before=read(db,o.id),b=r.body;
   if(o.status==='CANCELLED')fail('ORDER_CANCELLED','OP cancelada.',409);
   requireVersion(before,b.version);const existing=row(db,o.id);
   if(!existing)fail('QUALITY_EMPTY','Preencha a inspeção antes de decidir.',409);
   if(action==='reopen'){
     if(before.status==='DRAFT')fail('INVALID_TRANSITION','Inspeção já está em andamento.');
     if(!b.reason?.trim())fail('REASON_REQUIRED','Informe o motivo da reinspeção.',400);
     db.prepare("UPDATE quality_record SET status='DRAFT',version=version+1,updatedAt=? WHERE orderId=?").run(new Date().toISOString(),o.id);
   }else{
     if(before.status!=='DRAFT')fail('QUALITY_LOCKED','Reabra a inspeção.',409);
     if(!before.checker?.trim())fail('QUALITY_CHECKER','Identifique o conferente.',400);
     const p=production(db,o.id);
     if(action==='approve'){
       if(!o.unitId||!db.prepare('SELECT chassis FROM unit WHERE id=? AND chassis IS NOT NULL').get(o.unitId))fail('CHASSIS_REQUIRED','Informe o chassi antes de aprovar.',409);
       if(!p.assembled||p.pending)fail('PRODUCTION_INCOMPLETE','A montagem e os retrabalhos precisam estar concluídos, sem ocorrências pendentes.',409);
       const all=([] as QualityAnswerDto[]).concat(before.staticAnswers,before.roadAnswers);
       if(all.length!==qualityStaticItems.length+qualityRoadItems.length||all.some(a=>a.state==='UNASSESSED'||a.state==='NOK'||a.state==='NA'&&!a.notes?.trim()))fail('QUALITY_INCOMPLETE','Avalie todos os itens, resolva não conformidades e justifique os não aplicáveis.',409);
     }else{
       if(!b.reason?.trim()&&!before.staticAnswers.concat(before.roadAnswers).some(a=>a.state==='NOK'))fail('REASON_REQUIRED','Informe o motivo da reprovação.',400);
     }
     db.prepare('UPDATE quality_record SET status=?,productionVersion=?,version=version+1,updatedAt=? WHERE orderId=?')
       .run(action==='approve'?'APPROVED':'REJECTED',p.version,new Date().toISOString(),o.id);
   }
   const after=read(db,o.id);audit(db,before,after,b.actorId,action==='approve'?'APPROVED':action==='reject'?'REJECTED':'REOPENED',b.reason?.trim()||null);return read(db,o.id);
 }));
}
