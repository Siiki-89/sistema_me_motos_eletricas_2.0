import {Type,type Static} from '@sinclair/typebox';
import {Command,Id} from './catalog.js';
import {CivilDate} from './boxes.js';
const nonBlank=Type.String({minLength:1,maxLength:200});
const qty=Type.Integer({minimum:1,maximum:1000000});
export const PartCreateBody=Type.Object({...Command,code:Type.String({minLength:1,maxLength:80}),name:nonBlank,category:Type.Union((['PECA','BATERIA','CONTROLADORA','ACESSORIO','OUTRO'] as const).map(x=>Type.Literal(x)))},{additionalProperties:false});
export const PartReceiptBody=Type.Object({...Command,partId:Id,quantity:qty,effectiveDate:CivilDate,reason:Type.Optional(nonBlank)},{additionalProperties:false});
export const PartExtraBody=Type.Object({...Command,partId:Id,unitId:Id,quantity:qty,effectiveDate:CivilDate,reason:Type.Optional(nonBlank)},{additionalProperties:false});
export const PartTransferBody=Type.Object({...Command,partId:Id,fromLocation:nonBlank,toLocation:Type.Union([nonBlank,Type.Null()]),quantity:qty,effectiveDate:CivilDate,reason:nonBlank},{additionalProperties:false});
export type PartCreateRequest=Static<typeof PartCreateBody>;
export type PartReceiptRequest=Static<typeof PartReceiptBody>;
export type PartExtraRequest=Static<typeof PartExtraBody>;
export type PartTransferRequest=Static<typeof PartTransferBody>;
export interface PartDto {id:string;code:string;name:string;category:string;active:number;createdAt:string;commonQuantity:number}
export interface PartMovementDto {id:string;partId:string;kind:string;quantity:number;sourceLocation:string|null;destinationLocation:string|null;sourceUnitId:string|null;reason:string|null;effectiveDate:string;actorId:string;createdAt:string}
