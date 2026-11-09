import { createHash, randomUUID } from "node:crypto";
import { withTransaction, type SqliteDatabase } from "./database.js";
export class DomainError extends Error {
    constructor(public code: string, message: string, public status = 409) {
        super(message);
    }
}
export const fail = (code: string, message: string, status = 409): never => {
    throw new DomainError(code, message, status);
};
function canonical(v: unknown): string {
    if (Array.isArray(v))
        return "[" + v.map(canonical).join(",") + "]";
    if (v && typeof v === "object")
        return "{" + Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => JSON.stringify(k) + ":" + canonical(x)).join(",") + "}";
    return JSON.stringify(v);
}
export function command(db: SqliteDatabase, action: string, body: {
    operationId: string;
    actorId: string;
}, work: () => unknown) {
    return withTransaction(db, () => {
        const hash = createHash("sha256").update(canonical({ action, body })).digest("hex");
        const old = db.prepare("SELECT hash,result FROM command_receipt WHERE operationId=?").get(body.operationId) as {
            hash: string;
            result: string;
        } | undefined;
        if (old) {
            if (old.hash !== hash)
                fail("IDEMPOTENCY_CONFLICT", "Esta opera\u00E7\u00E3o j\u00E1 foi usada com outros dados.");
            return JSON.parse(old.result);
        }
        if (!db.prepare("SELECT id FROM actor WHERE id=?").get(body.actorId))
            fail("INVALID_ACTOR", "Operador local inv\u00E1lido.", 400);
        const edited = /^(product|variant)\.edit:(.+)$/.exec(action);
        const before = edited ? db.prepare(`SELECT * FROM ${edited[1]} WHERE id=?`).get(edited[2]) : null;
        const result = work(), json = JSON.stringify(result), now = new Date().toISOString();
        const audit = JSON.stringify({ before, after: result });
        db.prepare("INSERT INTO command_receipt VALUES (?,?,?,?)").run(body.operationId, hash, json, now);
        db.prepare("INSERT INTO audit_event VALUES (?,?,?,?,?,?)").run(randomUUID(), body.operationId, body.actorId, action, audit, now);
        return result;
    });
}
