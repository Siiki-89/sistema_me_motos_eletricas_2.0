import { randomUUID } from "node:crypto";
import type { SqliteDatabase } from "../platform/database.js";
import { fail } from "../platform/commands.js";
import type { ProductDto, VariantDto } from "../../shared/contracts/catalog.js";
import type { OriginDto, MovementDto } from "../../shared/contracts/boxes.js";
export interface ProductRow extends Omit<ProductDto, "active" | "variants"> {
    active: number;
}
export interface VariantRow extends Omit<VariantDto, "active"> {
    active: number;
    colorKey: string;
}
interface Tables {
    product: ProductRow;
    variant: VariantRow;
    box_origin: Omit<OriginDto, "physical" | "reserved" | "blocked" | "available">;
    box_movement: MovementDto;
}
export const clean = (s: string | undefined) => s?.trim() || null;
export function quantities(physical: number, reserved = 0, blocked = 0) {
    if (!Number.isSafeInteger(physical) || !Number.isSafeInteger(reserved) || reserved < 0 || physical < reserved + blocked || !Number.isSafeInteger(blocked) || blocked < 0)
        fail("INSUFFICIENT_STOCK", "Saldo insuficiente. Revise os movimentos da origem antes de corrigir.");
    return { physical, reserved, available: physical - reserved - blocked, ...(blocked ? {blocked} : {}) };
}
export function date(s: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(s + "T00:00:00Z")) || new Date(s + "T00:00:00Z").toISOString().slice(0, 10) !== s)
        fail("INVALID_DATE", "Informe uma data civil v\u00E1lida.", 400);
}
export function row<T extends keyof Tables>(db: SqliteDatabase, table: T, id: string): Tables[T] {
    const r = db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id) as Tables[T] | undefined;
    return r ?? fail("NOT_FOUND", "Registro n\u00E3o encontrado.", 404);
}
export function variant(r: VariantRow): VariantDto {
    const { colorKey: _key, ...rest } = r;
    return { ...rest, active: !!r.active };
}
export function product(db: SqliteDatabase, id: string) {
    const p = row(db, "product", id);
    return { ...p, active: !!p.active, variants: (db.prepare("SELECT * FROM variant WHERE productId=? ORDER BY colorKey,id").all(id) as VariantRow[]).map(variant) };
}
export function originBalance(db: SqliteDatabase, id: string): number {
    return (db.prepare("SELECT COALESCE(SUM(quantity),0) n FROM box_ledger WHERE originId=?").get(id) as {
        n: number;
    }).n;
}
export function movement(db: SqliteDatabase, b: {
    originId: string;
    quantity: number;
    effectiveDate: string;
    reason?: string;
    actorId: string;
}, kind: string, reversesId: string | null = null) {
    row(db, "box_origin", b.originId);
    date(b.effectiveDate);
    if (!b.quantity)
        fail("INVALID_QUANTITY", "A quantidade deve ser diferente de zero.", 400);
    const held = db.prepare("SELECT (SELECT COUNT(*) FROM reservation WHERE originId=? AND status='active') reserved,(SELECT COUNT(*) FROM box_block WHERE originId=? AND status='active') blocked").get(b.originId,b.originId) as {reserved:number;blocked:number};
    quantities(originBalance(db, b.originId) + b.quantity,held.reserved,held.blocked);
    const id = randomUUID();
    db.prepare("INSERT INTO box_movement VALUES (?,?,?,?,?,?,?,?,?)").run(id, b.originId, b.quantity, kind, b.effectiveDate, clean(b.reason), reversesId, b.actorId, new Date().toISOString());
    return row(db, "box_movement", id);
}
