import { registerOrders } from './orders.js';
import { registerProduction } from './production/index.js';
import type { FastifyInstance } from "fastify";
import type { DatabaseStore } from "../platform/backups.js";
import { registerCatalog } from "./catalog.js";
import { registerBoxes } from "./boxes.js";
export { quantities } from "./domain.js";
export { DomainError } from "../platform/commands.js";
export function registerOperations(app: FastifyInstance, store: DatabaseStore): void {
    app.get("/api/v1/actor", () => store.db.prepare("SELECT id,label FROM actor WHERE id=?").get("local-operator"));
    registerCatalog(app, store);
    registerBoxes(app, store);
    registerOrders(app, store);
    registerProduction(app, store);
}
