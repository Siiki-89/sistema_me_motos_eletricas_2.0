import { Type, type Static } from "@sinclair/typebox";
import { Command, Id, Text } from "./catalog.js";
export const CivilDate = Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" });
export const ReceiptBody = Type.Object({ ...Command, variantId: Id, quantity: Type.Integer({ minimum: 1, maximum: 1000000 }), receivedDate: CivilDate, supplier: Type.Optional(Text), invoice: Type.Optional(Text), lot: Type.Optional(Text), notes: Type.Optional(Text) }, { additionalProperties: false });
export const AdjustmentBody = Type.Object({ ...Command, originId: Id, quantity: Type.Integer({ minimum: -1000000, maximum: 1000000 }), reason: Type.String({ minLength: 1, maxLength: 2000 }), effectiveDate: CivilDate }, { additionalProperties: false });
export const ReversalBody = Type.Object({ ...Command, reason: Type.String({ minLength: 1, maxLength: 2000 }), effectiveDate: CivilDate }, { additionalProperties: false });
export type ReceiptRequest = Static<typeof ReceiptBody>;
export type AdjustmentRequest = Static<typeof AdjustmentBody>;
export type ReversalRequest = Static<typeof ReversalBody>;
export interface MovementDto {
    id: string;
    originId: string;
    quantity: number;
    kind: "receipt" | "adjustment" | "reversal" | "conversion";
    effectiveDate: string;
    reason: string | null;
    reversesId: string | null;
    actorId: string;
    createdAt: string;
    orderId?: string | null;
    unitId?: string | null;
}
export interface OriginDto {
    id: string;
    variantId: string;
    quantity: number;
    receivedDate: string;
    supplier: string | null;
    invoice: string | null;
    lot: string | null;
    notes: string | null;
    meCode: string;
    color: string | null;
    physical: number;
    reserved: number;
    blocked: number;
    available: number;
}
export interface StockDto {
    variantId: string;
    productId: string;
    meCode: string;
    commercialName: string | null;
    color: string | null;
    active: boolean;
    physical: number;
    reserved: number;
    available: number;
    blocked: number;
}
export interface BoxSummary {
    physical: number;
    reserved: number;
    available: number;
    blocked: number;
    origins: number;
    variants: number;
}
export interface MovementHistoryDto extends MovementDto {meCode:string;color:string|null}
