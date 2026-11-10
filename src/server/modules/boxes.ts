import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { DatabaseStore } from "../platform/backups.js";
import { command, fail } from "../platform/commands.js";
import { clean, date, row, originBalance, movement, quantities } from "./domain.js";
import { ListQuery, IdParams, type ListRequest } from "../../shared/contracts/catalog.js";
import { ReceiptBody, AdjustmentBody, ReversalBody, type ReceiptRequest, type AdjustmentRequest, type ReversalRequest } from "../../shared/contracts/boxes.js";
import { sqlPage, filters } from "./queries.js";
export function registerBoxes(app: FastifyInstance, store: DatabaseStore): void {
    function balance(physical:number, key?:'variantId'|'originId', id?:string) {
        const where=key ? ' AND '+key+'=?' : '';
        const args=id?[id]:[];
        const count=(table:string)=>(store.db.prepare(`SELECT COUNT(*) n FROM ${table} WHERE status='active'${where}`).get(...args) as {n:number}).n;
        const reserved=count('reservation'),blocked=count('box_block');
        return {...quantities(physical,reserved,blocked),blocked};
    }
    app.post<{
        Body: ReceiptRequest;
    }>("/api/v1/boxes/receipts", { schema: { body: ReceiptBody } }, r => command(store.db, "receipt", r.body, () => {
        const b = r.body;
        date(b.receivedDate);
        const v = row(store.db, "variant", b.variantId), p = row(store.db, "product", v.productId);
        if (!v.active || !p.active)
            fail("INACTIVE_REFERENCE", "Modelo ou cor inativo. Ative o cadastro antes de receber.");
        const originId = randomUUID();
        store.db.prepare("INSERT INTO box_origin VALUES (?,?,?,?,?,?,?,?,?,?)").run(originId, v.id, b.quantity, b.receivedDate, clean(b.supplier), clean(b.invoice), clean(b.lot), clean(b.notes), p.meCode, v.color);
        const m = movement(store.db, { originId, quantity: b.quantity, effectiveDate: b.receivedDate, actorId: b.actorId }, "receipt");
        return { ...m, originId };
    }));
    app.post<{
        Body: AdjustmentRequest;
    }>("/api/v1/boxes/adjustments", { schema: { body: AdjustmentBody } }, r => command(store.db, "adjustment", r.body, () => {
        if (!r.body.reason.trim())
            fail("REASON_REQUIRED", "Informe o motivo.", 400);
        return movement(store.db, r.body, "adjustment");
    }));
    app.post<{
        Body: ReversalRequest;
        Params: {
            id: string;
        };
    }>("/api/v1/boxes/movements/:id/reverse", { schema: { body: ReversalBody, params: IdParams } }, r => command(store.db, "reverse:" + r.params.id, r.body, () => {
        if(store.db.prepare('SELECT id FROM box_conversion WHERE id=?').get(r.params.id)) fail('CONVERSION_NOT_REVERSIBLE','Conversão vinculada à unidade não admite estorno genérico.');
        const m = row(store.db, "box_movement", r.params.id);
        if (m.kind === "reversal" || store.db.prepare("SELECT id FROM box_movement WHERE reversesId=?").get(m.id))
            fail("ALREADY_REVERSED", "Movimento j\u00E1 estornado ou compensat\u00F3rio.");
        if (!r.body.reason.trim())
            fail("REASON_REQUIRED", "Informe o motivo.", 400);
        return movement(store.db, { ...r.body, originId: m.originId, quantity: -m.quantity }, "reversal", m.id);
    }));
    const stockSelect = `SELECT v.id variantId,p.id productId,p.meCode,p.commercialName,v.color,(p.active AND v.active) active,COALESCE(b.physical,0) physical FROM variant v JOIN product p ON p.id=v.productId LEFT JOIN (SELECT o.variantId,SUM(m.quantity) physical FROM box_origin o JOIN box_ledger m ON m.originId=o.id GROUP BY o.variantId) b ON b.variantId=v.id`;
    app.get<{
        Querystring: ListRequest;
    }>("/api/v1/boxes/stock", { schema: { querystring: ListQuery } }, r => {
        const q = r.query, f = filters(q, ["p.meCode", "p.commercialName", "v.color"], [{ column: "v.id", value: q.variantId }, { column: "p.id", value: q.productId }, { column: "(p.active AND v.active)", value: q.active === undefined ? undefined : Number(q.active === "true") }]);
        const result = sqlPage<{
            variantId: string;
            productId: string;
            meCode: string;
            commercialName: string | null;
            color: string | null;
            active: number;
            physical: number;
        }>(store.db, stockSelect, f.where, f.parameters, "p.meCode,v.colorKey,v.id", q);
        return { ...result, items: result.items.map(x => ({ ...x, active: !!x.active, ...balance(x.physical, 'variantId', x.variantId) })) };
    });
    app.get("/api/v1/boxes/summary", () => {
        const physical = (store.db.prepare("SELECT COALESCE(SUM(quantity),0) n FROM box_ledger").get() as {
            n: number;
        }).n;
        const origins = (store.db.prepare("SELECT COUNT(*) n FROM box_origin").get() as {
            n: number;
        }).n;
        const variants = (store.db.prepare("SELECT COUNT(*) n FROM (" + stockSelect + " WHERE COALESCE(b.physical,0)>0)").get() as {
            n: number;
        }).n;
        return { ...balance(physical), origins, variants };
    });
    app.get<{
        Querystring: ListRequest;
    }>("/api/v1/boxes/origins", { schema: { querystring: ListQuery } }, r => {
        const q = r.query, f = filters(q, ["o.meCode", "o.color", "o.supplier", "o.invoice", "o.lot"], [{ column: "o.variantId", value: q.variantId }, { column: "o.id", value: q.originId }]);
        const result = sqlPage<{id:string;physical:number}>(store.db, "SELECT o.*,COALESCE((SELECT SUM(m.quantity) FROM box_ledger m WHERE m.originId=o.id),0) physical FROM box_origin o", f.where, f.parameters, "o.receivedDate DESC,o.id", q);
        return {...result,items:result.items.map(x=>({...x,...balance(x.physical,'originId',x.id)}))};
    });
    app.get<{
        Params: {
            id: string;
        };
    }>("/api/v1/boxes/origins/:id", { schema: { params: IdParams } }, r => ({ ...row(store.db, "box_origin", r.params.id), ...balance(originBalance(store.db, r.params.id),'originId',r.params.id) }));
    app.get<{
        Querystring: ListRequest;
    }>("/api/v1/boxes/movements", { schema: { querystring: ListQuery } }, r => {
        const q = r.query, f = filters(q, ["o.meCode", "o.color", "m.reason"], [{ column: "m.originId", value: q.originId }, { column: "o.variantId", value: q.variantId }]);
        return sqlPage(store.db, "SELECT m.*,o.meCode,o.color FROM box_ledger m JOIN box_origin o ON o.id=m.originId", f.where, f.parameters, "m.createdAt DESC,m.id", q);
    });
}
