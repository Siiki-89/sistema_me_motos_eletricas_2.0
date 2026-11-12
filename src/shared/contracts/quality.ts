import {Type,type Static} from '@sinclair/typebox';
import {Command, Text} from './catalog.js';

export const qualityStaticItems=[
  {code:'S01',label:'Carenagens e pintura sem riscos, trincas ou danos'},
  {code:'S02',label:'Banco e componentes externos corretamente fixados'},
  {code:'S03',label:'Retrovisores, manetes e comandos íntegros'},
  {code:'S04',label:'Painel e ignição funcionando'},
  {code:'S05',label:'Farol alto e baixo funcionando'},
  {code:'S06',label:'Piscas, lanterna e luz de freio funcionando'},
  {code:'S07',label:'Buzina funcionando'},
  {code:'S08',label:'NFC e alarme quando aplicável'},
  {code:'S09',label:'Carregador compatível e carga conferida'},
  {code:'S10',label:'Pneus, rodas e alinhamento visual íntegros'},
] as const;
export const qualityRoadItems=[
  {code:'R01',label:'Inicia deslocamento normalmente'},
  {code:'R02',label:'Aceleração progressiva e normal'},
  {code:'R03',label:'Guidão alinhado e sem tendência lateral excessiva'},
  {code:'R04',label:'Ausência de ruídos, vibrações e falhas anormais'},
  {code:'R05',label:'Freio dianteiro funcionando'},
  {code:'R06',label:'Freio traseiro funcionando'},
  {code:'R07',label:'Suspensão com comportamento normal'},
  {code:'R08',label:'Sistema de ré quando aplicável'},
  {code:'R09',label:'Painel e comandos funcionando em rodagem'},
  {code:'R10',label:'Estabilidade e comportamento geral seguros'},
] as const;

export const QualityAnswer=Type.Object({
  code:Type.String({minLength:3,maxLength:3,pattern:'^[SR][0-9]{2}$'}),
  state:Type.Union([Type.Literal('UNASSESSED'),Type.Literal('OK'),Type.Literal('NOK'),Type.Literal('NA')]),
  notes:Type.Union([Text,Type.Null()])
},{additionalProperties:false});
export type QualityAnswerDto=Static<typeof QualityAnswer>;
export const QualitySaveBody=Type.Object({
  ...Command,version:Type.Integer({minimum:0}),
  checker:Type.Union([Text,Type.Null()]),
  notes:Type.Union([Text,Type.Null()]),
  staticAnswers:Type.Array(QualityAnswer,{maxItems:10}),
  roadAnswers:Type.Array(QualityAnswer,{maxItems:10}),
},{additionalProperties:false});
export const QualityDecisionBody=Type.Object({
  ...Command,version:Type.Integer({minimum:0}),reason:Type.Optional(Text)
},{additionalProperties:false});
export type QualitySaveRequest=Static<typeof QualitySaveBody>;
export type QualityDecisionRequest=Static<typeof QualityDecisionBody>;
export interface QualityDto {
 orderId:string;unitId:string;version:number;
 status:'DRAFT'|'APPROVED'|'REJECTED'; effectiveStatus:'PENDING'|'APPROVED'|'REJECTED';
 productionVersion:number;currentProductionVersion:number;checker:string|null;notes:string|null;
 staticAnswers:QualityAnswerDto[];roadAnswers:QualityAnswerDto[];
 updatedAt:string|null;history:{id:string;action:string;reason:string|null;actorId:string;createdAt:string}[];
}
