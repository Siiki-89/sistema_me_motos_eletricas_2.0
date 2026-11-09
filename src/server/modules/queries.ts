import type { SqliteDatabase } from "../platform/database.js";
import type { ListRequest } from "../../shared/contracts/catalog.js";
export function sqlPage<T>(db: SqliteDatabase, select: string, where: string, parameters: (string | number)[], order: string, q: ListRequest) {
    const page = q.page ?? 1, limit = q.limit ?? 50;
    const total = (db.prepare(`SELECT COUNT(*) n FROM (${select} ${where})`).get(...parameters) as {
        n: number;
    }).n;
    const items = db.prepare(`${select} ${where} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...parameters, limit, (page - 1) * limit) as T[];
    return { items, total, page, limit };
}
export function filters(q: ListRequest, fields: string[], extra: {
    column: string;
    value: string | number | undefined;
}[] = []) {
    const clauses: string[] = [], parameters: (string | number)[] = [];
    if (q.q) {
        clauses.push(`(${fields.map(f => `instr(lower(COALESCE(${f},'')),lower(?))>0`).join(" OR ")})`);
        parameters.push(...fields.map(() => q.q!));
    }
    for (const e of extra)
        if (e.value !== undefined) {
            clauses.push(`${e.column}=?`);
            parameters.push(e.value);
        }
    return { where: clauses.length ? "WHERE " + clauses.join(" AND ") : "", parameters };
}
