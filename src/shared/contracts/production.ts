import {Type,type Static} from '@sinclair/typebox';
import {Command,Id,Text} from './catalog.js';
const enumeration=<T extends string>(values:readonly T[])=>Type.Union(values.map(v=>Type.Literal(v)));
export const pauseReasons=['BREAK','DAMAGED_PART','MISSING_PART','REWORK','EQUIPMENT','OPERATIONAL_WAIT','OTHER'] as const;
export const occurrenceTypes=['DAMAGED_PART','MISSING_PART','ELECTRICAL','ASSEMBLY','COSMETIC','ADJUSTMENT','OTHER'] as const;
export const checklistTemplate={version:1,items:[
 {code:'2.1',label:'Guidão/direção montados, alinhados e fixados'},
 {code:'2.2',label:'Rodas/eixos instalados e apertados'},
 {code:'2.3',label:'Sistema de freios montado e ajustado'},
 {code:'2.4',label:'Suspensão, descansos, pedais e apoios corretamente instalados'},
 {code:'2.5',label:'Parafusos e fixações críticas da montagem conferidos'},
 {code:'2.6',label:'Conectores e bateria corretamente instalados/conectados'},
 {code:'2.7',label:'Carenagens/componentes removidos corretamente reinstalados'},
 {code:'2.8',label:'Pneus calibrados e componentes previstos instalados'},
]} as const;
const nullableText=Type.Union([Text,Type.Null()]);
const time=Type.Union([Type.String({pattern:'^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$'}),Type.Null()]);
const Pause=Type.Object({id:Id,startAt:time,endAt:time,reason:enumeration(pauseReasons),notes:nullableText},{additionalProperties:false});
export const Stage=Type.Object({id:Id,kind:enumeration(['UNPACKING','ASSEMBLY','REWORK'] as const),state:enumeration(['WAITING','IN_PROGRESS','PAUSED','COMPLETED'] as const),civilDate:Type.Union([Type.String({pattern:'^\\d{4}-\\d{2}-\\d{2}$'}),Type.Null()]),startAt:time,endAt:time,responsible:nullableText,notes:nullableText,occurrenceId:Type.Union([Id,Type.Null()]),pauses:Type.Array(Pause)},{additionalProperties:false});
const Occurrence=Type.Object({id:Id,stageId:Type.Union([Id,Type.Null()]),type:enumeration(occurrenceTypes),component:nullableText,description:Type.String({minLength:1,maxLength:2000}),occurredAt:time,recordedBy:nullableText,status:enumeration(['OPEN','IN_PROGRESS','RESOLVED'] as const),plannedDestination:nullableText,requiredAction:nullableText,resolution:nullableText,notes:nullableText,checklistItemCode:Type.Union([Type.String({pattern:'^2\\.[1-8]$'}),Type.Null()])},{additionalProperties:false});
const Answer=Type.Object({code:Type.String({pattern:'^2\\.[1-8]$'}),state:enumeration(['UNASSESSED','CONFORMING','NONCONFORMING','NOT_APPLICABLE'] as const),notes:nullableText},{additionalProperties:false});
export const SelfCheck=Type.Object({templateVersion:Type.Literal(1),answers:Type.Array(Answer,{maxItems:8})},{additionalProperties:false});
export const ProductionSaveBody=Type.Object({...Command,version:Type.Integer({minimum:0}),stages:Type.Array(Stage),occurrences:Type.Array(Occurrence),selfCheck:SelfCheck},{additionalProperties:false});
export const StageActionBody=Type.Object({...Command,version:Type.Integer({minimum:0}),reason:Type.Optional(Text)},{additionalProperties:false});
export type ProductionSaveRequest=Static<typeof ProductionSaveBody>;
export type StageActionRequest=Static<typeof StageActionBody>;
export type StageDto=Static<typeof Stage>;
export type OccurrenceDto=Static<typeof Occurrence>;
export type SelfCheckDto=Static<typeof SelfCheck>;
export interface TimeDto {grossMinutes:number|null;pauseMinutes:number|null;netMinutes:number|null;pending:boolean}
export type ProductionStatus='WAITING'|'UNPACKING'|'ASSEMBLING'|'PAUSED'|'ASSEMBLED';
export interface ProductionDto {orderId:string;unitId:string;version:number;productionStatus:ProductionStatus;stages:(StageDto&{times:TimeDto})[];occurrences:OccurrenceDto[];selfCheck:SelfCheckDto;template:typeof checklistTemplate;totals:{netMinutes:number|null;knownNetMinutes:number;pendingCount:number;reworkKnownNetMinutes:number};history:{id:string;actorId:string;kind:string;reason:string|null;createdAt:string;before:unknown;after:unknown}[]}
