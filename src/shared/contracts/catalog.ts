import { Type, type Static } from "@sinclair/typebox";
export const Id = Type.String({ pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$" });
export const Text = Type.String({ maxLength: 2000 });
export const Command = { operationId: Id, actorId: Type.Literal("local-operator") };
export const ProductBody = Type.Object({ ...Command, meCode: Type.String({ minLength: 1, maxLength: 80 }), commercialName: Type.Optional(Text), notes: Type.Optional(Text), active: Type.Optional(Type.Boolean()), version: Type.Optional(Type.Integer({ minimum: 1 })) }, { additionalProperties: false });
export const VariantBody = Type.Object({ ...Command, productId: Id, color: Type.Union([Type.String({ minLength: 1, maxLength: 100 }), Type.Null()]), active: Type.Optional(Type.Boolean()), version: Type.Optional(Type.Integer({ minimum: 1 })) }, { additionalProperties: false });
export const ListQuery = Type.Object({ q: Type.Optional(Type.String({ maxLength: 100 })), active: Type.Optional(Type.Union([Type.Literal("true"), Type.Literal("false")])), productId: Type.Optional(Id), variantId: Type.Optional(Id), originId: Type.Optional(Id), page: Type.Optional(Type.Integer({ minimum: 1, maximum: 1000000000 })), limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })) }, { additionalProperties: false });
export const IdParams = Type.Object({ id: Id }, { additionalProperties: false });
export type ProductRequest = Static<typeof ProductBody>;
export type VariantRequest = Static<typeof VariantBody>;
export type ListRequest = Static<typeof ListQuery>;
export interface VariantDto {
    id: string;
    productId: string;
    color: string | null;
    active: boolean;
    version: number;
}
export interface ProductDto {
    id: string;
    meCode: string;
    commercialName: string | null;
    notes: string | null;
    active: boolean;
    version: number;
    variants: VariantDto[];
}
export interface Page<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
}
export interface LocalActorDto {
    id: string;
    label: string;
}
