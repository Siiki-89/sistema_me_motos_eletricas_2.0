import {randomUUID} from 'node:crypto';
import {Type} from '@sinclair/typebox';
import type {FastifyInstance} from 'fastify';
import type {DatabaseStore} from '../../platform/backups.js';
import type {SqliteDatabase} from '../../platform/database.js';
import {command,fail} from '../../platform/commands.js';
import {order} from '../orders-domain.js';
import {Id,IdParams} from '../../../shared/contracts/catalog.js';
import {ProductionSaveBody,StageActionBody,checklistTemplate,type ProductionDto,type ProductionSaveRequest,type StageActionRequest,type StageDto,type OccurrenceDto,type ProductionStatus,type SelfCheckDto} from '../../../shared/contracts/production.js';
import {calculateTimes,civilMinute} from './time.js';

type Stored={orderId:string;unitId:string;version:number;productionStatus:ProductionStatus;selfCheck:string};
function read(db:SqliteDatabase,id:string):ProductionDto {
 const o=order(db,id);if(!o.unitId)fail('UNIT_REQUIRED','Individualize a unidade antes de registrar produção.');
 const row=db.prepare('SELECT * FROM production_record WHERE orderId=?').get(id) as Stored|undefined;
 const stages=(db.prepare('SELECT data FROM production_stage WHERE orderId=? ORDER BY rowid').all(id) as {data:string}[]).map(r=>{const stage=JSON.parse(r.data) as StageDto;return {...stage,times:calculateTimes(stage)};});
 const pendingCount=stages.filter(s=>s.times.pending).length,knownNetMinutes=stages.reduce((n,s)=>n+(s.times.netMinutes??0),0);
 const history=(db.prepare('SELECT * FROM production_history WHERE orderId=? ORDER BY rowid').all(id) as {id:string;actorId:string;kind:string;reason:string|null;createdAt:string;beforeData:string;afterData:string}[]).map(({beforeData,afterData,...h})=>({...h,before:JSON.parse(beforeData),after:JSON.parse(afterData)}));
 return {orderId:id,unitId:o.unitId!,version:row?.version??0,productionStatus:row?.productionStatus??'WAITING',stages,occurrences:(db.prepare('SELECT data FROM production_occurrence WHERE orderId=? ORDER BY rowid').all(id) as {data:string}[]).map(r=>JSON.parse(r.data) as OccurrenceDto),selfCheck:row?JSON.parse(row.selfCheck) as SelfCheckDto:{templateVersion:1,answers:checklistTemplate.items.map(i=>({code:i.code,state:'UNASSESSED',notes:null}))},template:checklistTemplate,totals:{netMinutes:pendingCount?null:knownNetMinutes,knownNetMinutes,pendingCount,reworkKnownNetMinutes:stages.filter(s=>s.kind==='REWORK').reduce((n,s)=>n+(s.times.netMinutes??0),0)},history};
}
function plain(p:ProductionDto){return {stages:p.stages.map(({times,...s})=>s),occurrences:p.occurrences,selfCheck:p.selfCheck};}
function editable(db:SqliteDatabase,id:string,version:number){const p=read(db,id);if(order(db,id).status==='CANCELLED')fail('ORDER_CANCELLED','OP cancelada permite somente consulta.');if(p.version!==version)fail('VERSION_CONFLICT','Produção alterada. Reabra os dados.');return p;}
function canonical(value:unknown):string {
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
 return JSON.stringify(value);
}
const same=(a:unknown,b:unknown)=>canonical(a)===canonical(b);
function productionStatus(stages:StageDto[]):ProductionStatus {
 if(stages.some(s=>s.state==='PAUSED'))return 'PAUSED';
 if(stages.some(s=>s.kind==='REWORK'&&s.state!=='COMPLETED'&&s.state!=='WAITING'))return 'ASSEMBLING';
 const assembly=stages.find(s=>s.kind==='ASSEMBLY');
 if(assembly?.state==='COMPLETED')return 'ASSEMBLED';
 if(assembly&&assembly.state!=='WAITING')return 'ASSEMBLING';
 if(stages.some(s=>s.kind==='UNPACKING'&&s.state!=='WAITING'))return 'UNPACKING';return 'WAITING';
}
function validate(data:ReturnType<typeof plain>){
 const stageIds=new Set<string>(),pauseIds=new Set<string>(),occurrenceIds=new Set<string>(),primary=new Set<string>();
 for(const s of data.stages){
  if(stageIds.has(s.id)||s.kind!=='REWORK'&&primary.has(s.kind))fail('DUPLICATE_STAGE','Etapa primária ou ID duplicado.',400);stageIds.add(s.id);primary.add(s.kind);
  if(s.civilDate!==null)civilMinute(s.civilDate+'T00:00');calculateTimes(s);
  for(const p of s.pauses){if(pauseIds.has(p.id))fail('DUPLICATE_PAUSE','ID de pausa duplicado.',400);pauseIds.add(p.id);}
 }
 const codes=new Set<string>();for(const a of data.selfCheck.answers){if(codes.has(a.code))fail('DUPLICATE_ANSWER','Item duplicado.',400);codes.add(a.code);}
 for(const o of data.occurrences){
  if(occurrenceIds.has(o.id))fail('DUPLICATE_OCCURRENCE','Ocorrência duplicada.',400);occurrenceIds.add(o.id);
  if(o.stageId&&!stageIds.has(o.stageId))fail('INVALID_STAGE_LINK','Etapa da ocorrência não pertence à OP.',400);
  if(!o.description.trim())fail('DESCRIPTION_REQUIRED','Descreva o problema.',400);if(!o.occurredAt)fail('OCCURRENCE_TIME_REQUIRED','Informe data e hora da ocorrência.',400);civilMinute(o.occurredAt);
  if(o.status==='RESOLVED'&&!o.resolution?.trim())fail('RESOLUTION_REQUIRED','Descreva a ação realizada.',400);
 }
 for(const s of data.stages)if(s.occurrenceId&&(!occurrenceIds.has(s.occurrenceId)||s.kind!=='REWORK'))fail('INVALID_OCCURRENCE_LINK','Vínculo de retrabalho inválido.',400);
}
function ensureComplete(stage:StageDto,data:ReturnType<typeof plain>){
 const t=calculateTimes(stage);if(t.pending||!t.grossMinutes||!stage.responsible?.trim()||stage.pauses.some(p=>p.startAt===p.endAt))fail('STAGE_INCOMPLETE','Informe intervalo positivo, pausas completas de duração positiva e responsável.');
 if(stage.kind==='ASSEMBLY'){
  if(data.selfCheck.answers.length!==8||data.selfCheck.answers.some(a=>a.state==='UNASSESSED'||a.state==='NONCONFORMING'||a.state==='NOT_APPLICABLE'&&!a.notes?.trim()))fail('SELF_CHECK_PENDING','Avalie os oito itens; resolva não conformidades e justifique não aplicáveis.');
  if(data.occurrences.some(o=>o.status!=='RESOLVED'))fail('OCCURRENCES_PENDING','Resolva as ocorrências antes de concluir montagem.');
 }
}
function save(db:SqliteDatabase,before:ProductionDto,data:ReturnType<typeof plain>,actorId:string,kind:string,reason:string|null):ProductionDto {
 validate(data);
 // Reject cross-OP IDs before upsert, including IDs of pauses stored within each owned stage.
 for(const [table,rows] of [['production_stage',data.stages],['production_occurrence',data.occurrences]] as const)for(const row of rows){const owner=db.prepare(`SELECT orderId FROM ${table} WHERE id=?`).get(row.id) as {orderId:string}|undefined;if(owner&&owner.orderId!==before.orderId)fail('INVALID_OWNERSHIP','Registro pertence a outra OP.',400);}
 for(const s of data.stages)for(const p of s.pauses){
  const owner=db.prepare("SELECT s.id FROM production_stage s,json_each(s.data,'$.pauses') p WHERE json_extract(p.value,'$.id')=?").get(p.id) as {id:string}|undefined;
  if(owner&&owner.id!==s.id)fail('INVALID_OWNERSHIP','Pausa pertence a outra etapa ou OP.',400);
 }
 const version=before.version+1,status=productionStatus(data.stages);
 db.prepare('INSERT INTO production_record VALUES(?,?,?,?,?) ON CONFLICT(orderId) DO UPDATE SET version=excluded.version,productionStatus=excluded.productionStatus,selfCheck=excluded.selfCheck').run(before.orderId,before.unitId,version,status,JSON.stringify(data.selfCheck));
 for(const s of data.stages)db.prepare('INSERT INTO production_stage VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(s.id,before.orderId,s.kind,JSON.stringify(s));
 for(const o of data.occurrences)db.prepare('INSERT INTO production_occurrence VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET stageId=excluded.stageId,data=excluded.data').run(o.id,before.orderId,o.stageId,JSON.stringify(o));
 db.prepare('INSERT INTO production_history VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),before.orderId,actorId,kind,reason,new Date().toISOString(),JSON.stringify(plain(before)),JSON.stringify(data));
 return read(db,before.orderId);
}
export function registerProduction(app:FastifyInstance,store:DatabaseStore){
 const root='/api/v1/orders/:id/production';
 app.get<{Params:{id:string}}>(root,{schema:{params:IdParams}},r=>read(store.db,r.params.id));
 app.put<{Params:{id:string};Body:ProductionSaveRequest}>(root,{bodyLimit:1048576,schema:{params:IdParams,body:ProductionSaveBody}},r=>command(store.db,'production.save:'+r.params.id,r.body,()=>{
  const before=editable(store.db,r.params.id,r.body.version),data={stages:r.body.stages,occurrences:r.body.occurrences,selfCheck:r.body.selfCheck};
  for(const collection of ['stages','occurrences'] as const)for(const old of before[collection])if(!data[collection].some(x=>x.id===old.id))fail('PERSISTED_ROW_OMITTED','Preserve os registros já salvos.');
  for(const old of before.stages){const s=data.stages.find(x=>x.id===old.id)!;
   if(s.kind!==old.kind)fail('STAGE_KIND_IMMUTABLE','Tipo da etapa é permanente.');
   for(const p of old.pauses)if(!s.pauses.some(x=>x.id===p.id))fail('PERSISTED_ROW_OMITTED','Preserve as pausas já salvas.');
   if(old.state==='COMPLETED'&&(!same(s,plain(before).stages.find(x=>x.id===old.id))||old.kind==='ASSEMBLY'&&!same(data.selfCheck,before.selfCheck)))fail('STAGE_COMPLETED','Reabra explicitamente a etapa antes de corrigir.');
  }
  for(const s of data.stages)if(s.state==='COMPLETED'&&before.stages.find(x=>x.id===s.id)?.state!=='COMPLETED')fail('EXPLICIT_COMPLETION_REQUIRED','Use a ação Concluir etapa.');
  if (before.stages.some(stage => stage.kind === 'ASSEMBLY' && stage.state === 'COMPLETED')) {
    const previouslyPendingIds = new Set(
      before.occurrences.filter(occurrence => occurrence.status !== 'RESOLVED').map(occurrence => occurrence.id),
    );
    const introducesPendingOccurrence = data.occurrences.some(
      occurrence => occurrence.status !== 'RESOLVED' && !previouslyPendingIds.has(occurrence.id),
    );
    if (introducesPendingOccurrence) {
      fail('STAGE_COMPLETED', 'Reabra a montagem antes de registrar uma ocorrência pendente.');
    }
  }
  return save(store.db,before,data,r.body.actorId,'SAVED',null);
 }));
 for(const action of ['complete','reopen'] as const)app.post<{Params:{id:string;stageId:string};Body:StageActionRequest}>(`${root}/stages/:stageId/${action}`,{schema:{params:Type.Object({id:Id,stageId:Id},{additionalProperties:false}),body:StageActionBody}},r=>command(store.db,`production.${action}:${r.params.id}:${r.params.stageId}`,r.body,()=>{
  const before=editable(store.db,r.params.id,r.body.version),data=plain(before),stage=data.stages.find(s=>s.id===r.params.stageId)??fail('NOT_FOUND','Etapa não encontrada.',404);
  if(action==='complete'){if(stage.state==='COMPLETED')fail('INVALID_TRANSITION','Etapa já concluída.');ensureComplete(stage,data);stage.state='COMPLETED';}
  else {if(stage.state!=='COMPLETED')fail('INVALID_TRANSITION','Somente etapa concluída pode ser reaberta.');if(!r.body.reason?.trim())fail('REASON_REQUIRED','Informe o motivo da reabertura.',400);stage.state='IN_PROGRESS';}
  return save(store.db,before,data,r.body.actorId,action==='complete'?'COMPLETED':'REOPENED',r.body.reason?.trim()??null);
 }));
}
