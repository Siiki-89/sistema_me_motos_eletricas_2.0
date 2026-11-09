import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { DatabaseStore } from "../platform/backups.js";
import { command, fail } from "../platform/commands.js";
import { clean, row, variant, product } from "./domain.js";
import { ProductBody, VariantBody, ListQuery, IdParams, type ProductRequest, type VariantRequest, type ListRequest } from "../../shared/contracts/catalog.js";
import { sqlPage, filters } from "./queries.js";
export function registerCatalog(app: FastifyInstance, store: DatabaseStore): void {
    app.get<{
        Querystring: ListRequest;
    }>("/api/v1/catalog/products", { schema: { querystring: ListQuery } }, r => {
        const q = r.query;
        const f = filters(q, ["p.meCode", "p.commercialName", "(SELECT group_concat(color,' ') FROM variant cv WHERE cv.productId=p.id)"], [{ column: "p.active", value: q.active === undefined ? undefined : Number(q.active === "true") }, { column: "p.id", value: q.productId }]);
        const result = sqlPage<{
            id: string;
            meCode: string;
            commercialName: string | null;
            notes: string | null;
            active: number;
            version: number;
        }>(store.db, "SELECT p.* FROM product p", f.where, f.parameters, "p.meCode,p.id", q);
        const ids = result.items.map(p => p.id);
        const variants = ids.length ? store.db.prepare("SELECT * FROM variant WHERE productId IN (" + ids.map(() => "?").join(",") + ") ORDER BY colorKey,id").all(...ids) as {
            id: string;
            productId: string;
            color: string | null;
            colorKey: string;
            active: number;
            version: number;
        }[] : [];
        return { ...result, items: result.items.map(p => ({ ...p, active: !!p.active, variants: variants.filter(v => v.productId === p.id).map(variant) })) };
    });
    app.post<{
        Body: ProductRequest;
    }>("/api/v1/catalog/products", { schema: { body: ProductBody } }, r => command(store.db, "product.create", r.body, () => {
        const b = r.body, code = b.meCode.trim().toUpperCase();
        if (!code)
            fail("INVALID_CODE", "Informe o c\u00F3digo ME.", 400);
        const id = randomUUID();
        store.db.prepare("INSERT INTO product VALUES (?,?,?,?,?,1)").run(id, code, clean(b.commercialName), clean(b.notes), b.active === false ? 0 : 1);
        return product(store.db, id);
    }));
    app.put<{
        Body: ProductRequest;
        Params: {
            id: string;
        };
    }>("/api/v1/catalog/products/:id", { schema: { body: ProductBody, params: IdParams } }, r => command(store.db, "product.edit:" + r.params.id, r.body, () => {
        const b = r.body, old = row(store.db, "product", r.params.id);
        if (b.version !== old.version)
            fail("VERSION_CONFLICT", "Cadastro alterado. Recarregue antes de salvar.");
        const code = b.meCode.trim().toUpperCase();
        if (!code)
            fail("INVALID_CODE", "Informe o c\u00F3digo ME.", 400);
        store.db.prepare("UPDATE product SET meCode=?,commercialName=?,notes=?,active=?,version=version+1 WHERE id=?").run(code, clean(b.commercialName), clean(b.notes), b.active === false ? 0 : 1, old.id);
        return product(store.db, old.id);
    }));
    app.post<{
        Body: VariantRequest;
    }>("/api/v1/catalog/variants", { schema: { body: VariantBody } }, r => command(store.db, "variant.create", r.body, () => {
        const b = r.body;
        row(store.db, "product", b.productId);
        const color = b.color === null ? null : b.color.trim();
        if (color === "")
            fail("INVALID_COLOR", "Informe a cor ou selecione n\u00E3o aplic\u00E1vel.", 400);
        const id = randomUUID();
        store.db.prepare("INSERT INTO variant VALUES (?,?,?,?,?,1)").run(id, b.productId, color, color === null ? "NULL" : `COLOR:${color.toUpperCase()}`, b.active === false ? 0 : 1);
        return variant(row(store.db, "variant", id));
    }));
    app.put<{
        Body: VariantRequest;
        Params: {
            id: string;
        };
    }>("/api/v1/catalog/variants/:id", { schema: { body: VariantBody, params: IdParams } }, r => command(store.db, "variant.edit:" + r.params.id, r.body, () => {
        const b = r.body, old = row(store.db, "variant", r.params.id);
        if (b.version !== old.version)
            fail("VERSION_CONFLICT", "Cor alterada. Recarregue antes de salvar.");
        if (b.productId !== old.productId)
            fail("VARIANT_PRODUCT_CONFLICT", "A cor deve permanecer no mesmo modelo.");
        const color = b.color === null ? null : b.color.trim();
        if (color === "")
            fail("INVALID_COLOR", "Informe a cor ou selecione n\u00E3o aplic\u00E1vel.", 400);
        store.db.prepare("UPDATE variant SET color=?,colorKey=?,active=?,version=version+1 WHERE id=?").run(color, color === null ? "NULL" : `COLOR:${color.toUpperCase()}`, b.active === false ? 0 : 1, old.id);
        return variant(row(store.db, "variant", old.id));
    }));
}
