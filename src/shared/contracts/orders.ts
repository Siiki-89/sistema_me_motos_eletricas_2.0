import { Type, type Static } from '@sinclair/typebox';
import { Command, Id, Text } from './catalog.js';
import { CivilDate } from './boxes.js';

export const OrderStatus = Type.Union(['RESERVED','TRANSCRIBING','IN_PROGRESS','COMPLETED','CANCELLED'].map(x => Type.Literal(x)));
const fields = { unpacker:Type.Optional(Text), mechanic:Type.Optional(Text), checker:Type.Optional(Text), destination:Type.Optional(Text), notes:Type.Optional(Text) };
const version = Type.Integer({minimum:1});
export const OrderCreateBody = Type.Object({...Command,...fields,variantId:Id,orderDate:CivilDate},{additionalProperties:false});
export const OrderUpdateBody = Type.Object({...Command,...fields,version,chassis:Type.Optional(Text),reason:Type.Optional(Text)},{additionalProperties:false});
export const OrderConvertBody = OrderUpdateBody;
export const OrderCancelBody = Type.Object({...Command,version,reason:Type.String({minLength:1,maxLength:2000}),effectiveDate:CivilDate,boxOpened:Type.Boolean()},{additionalProperties:false});
export const OrderStatusBody = Type.Object({...Command,version,status:Type.Union([Type.Literal('IN_PROGRESS'),Type.Literal('COMPLETED')])},{additionalProperties:false});
export const BlockRegularizeBody = Type.Object({...Command,...fields,orderDate:CivilDate,reason:Type.String({minLength:1,maxLength:2000})},{additionalProperties:false});
export const BlockReleaseBody = Type.Object({...Command,reason:Type.String({minLength:1,maxLength:2000}),physicalBoxClosed:Type.Literal(true)},{additionalProperties:false});
export const OrderListQuery = Type.Object({q:Type.Optional(Type.String({maxLength:100})),status:Type.Optional(OrderStatus),originId:Type.Optional(Id),page:Type.Optional(Type.Integer({minimum:1,maximum:1000000000})),limit:Type.Optional(Type.Integer({minimum:1,maximum:100}))},{additionalProperties:false});
export type OrderCreateRequest = Static<typeof OrderCreateBody>;
export type OrderUpdateRequest = Static<typeof OrderUpdateBody>;
export type OrderCancelRequest = Static<typeof OrderCancelBody>;
export type OrderStatusRequest = Static<typeof OrderStatusBody>;
export type BlockRegularizeRequest = Static<typeof BlockRegularizeBody>;
export type BlockReleaseRequest = Static<typeof BlockReleaseBody>;
export type OrderListRequest = Static<typeof OrderListQuery>;
export interface OrderDto {
  id:string; code:string; type:'INITIAL'|'EXISTING_UNIT'; variantId:string; originId:string; meCode:string; commercialName:string|null; color:string|null;
  orderDate:string; unpacker:string|null; mechanic:string|null; checker:string|null; destination:string|null; notes:string|null;
  status:'RESERVED'|'TRANSCRIBING'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED'; unitId:string|null; version:number; createdAt:string; updatedAt:string; regularizesOrderId:string|null;
}
export interface ReservationDto {id:string;orderId:string;originId:string;variantId:string;status:'active'|'consumed'|'released';createdAt:string;updatedAt:string}
export interface OrderListDto extends OrderDto {chassis:string|null}
export interface UnitDto {id:string;variantId:string;meCode:string;commercialName:string|null;color:string|null;chassis:string|null;chassisOriginal:string|null;originId:string;originOrderId:string;createdAt:string;productionStatus:'WAITING';qualityStatus:'PENDING';location:'GALPAO'}
export interface OrderEventDto {id:string;orderId:string;kind:string;actorId:string;reason:string|null;data:string;createdAt:string}
export interface OrderDetailDto extends OrderDto {reservation:ReservationDto;unit:UnitDto|null;history:OrderEventDto[]}
export interface ConversionDto {order:OrderDto;unit:UnitDto}
export interface BlockDto {id:string;originId:string;variantId:string;cancelledOrderId:string;status:'active'|'regularized'|'released';reason:string;createdAt:string;resolvedAt:string|null;regularizedOrderId:string|null}
export interface UnitDetailDto extends UnitDto {orders:OrderDto[];history:OrderEventDto[]}
