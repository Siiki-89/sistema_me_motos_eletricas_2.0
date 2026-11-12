import {Type,type Static} from '@sinclair/typebox';
import {Command,Id,Text} from './catalog.js';
const nonBlank=Type.String({minLength:1,maxLength:200});
const stamp=Type.String({pattern:'^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$'});
export const ShipBody=Type.Object({...Command,orderId:Id,driver:nonBlank,destination:nonBlank,dispatchedAt:stamp,accessoriesChecked:Type.Literal(true)},{additionalProperties:false});
export const ReceiveBody=Type.Object({...Command,version:Type.Integer({minimum:1}),receivedAt:stamp,receivedBy:nonBlank,withRemarks:Type.Boolean(),remarks:Type.Optional(Text)},{additionalProperties:false});
export type ShipRequest=Static<typeof ShipBody>;
export type ReceiveRequest=Static<typeof ReceiveBody>;
export interface ShipmentDto {id:string;orderId:string;unitId:string;status:'SHIPPED'|'RECEIVED'|'RECEIVED_WITH_REMARKS';driver:string;destination:string;dispatchedAt:string;receivedAt:string|null;receivedBy:string|null;remarks:string|null;accessoriesChecked:number;version:number;createdAt:string;updatedAt:string}
export interface ShipmentDetailDto extends ShipmentDto {history:{id:string;kind:string;actorId:string;reason:string|null;createdAt:string;data:string}[]}
