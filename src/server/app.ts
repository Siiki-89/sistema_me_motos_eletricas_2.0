import {registerOperations,DomainError} from './modules/operations.js';
import {validateSchema} from './platform/database.js';
import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import staticFiles from '@fastify/static';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { BackupParams, EmptyBody, RestoreBody, type RestoreRequest } from '../shared/contracts/foundation.js';
import { BackupError, MaintenanceError, DatabaseStore } from './platform/backups.js';

export interface AppOptions { dataDir: string; port: number; mode: 'test' | 'development' | 'production'; webDir?: string; instanceId?: string }
export function buildApp(options: AppOptions): FastifyInstance {
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) throw new Error('Porta local inválida.');
  const store = new DatabaseStore(options.dataDir);
  const app = Fastify({ logger: false, bodyLimit: 16384, ajv: { customOptions: { removeAdditional: false } } });
  const expectedHost = `127.0.0.1:${options.port}`; const expectedOrigin = `http://${expectedHost}`;
  const startedAt = new Date().toISOString(); const instanceId = options.instanceId ?? randomUUID();
  const sessions = new Map<string, { token: string; expires: number }>();
  if (options.mode === 'production') {
    let backupTimer: ReturnType<typeof setInterval> | undefined;
    app.addHook('onReady', async () => {
      // The first automatic snapshot runs before serving any operational request.
      await store.createAutomaticIfDue();
      backupTimer = setInterval(() => { void store.createAutomaticIfDue().catch(() => {
        // Backup errors remain observable through the backup screen / filesystem.
        // Do not interrupt ongoing user operations when a scheduled copy fails.
      }); }, 6 * 60 * 60 * 1000);
      backupTimer.unref();
    });
    app.addHook('onClose', async () => { if (backupTimer) clearInterval(backupTimer); });
  }
  app.register(cookie);
  app.addHook('onClose', async () => { sessions.clear(); store.close(); });
  const errorPayload = (code: string, message: string, requestId: string) => ({ error: { code, message }, requestId });
  app.addHook('onRequest', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Cache-Control', 'no-store');
    reply.header('Content-Security-Policy', "default-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'");
    if (request.headers.host !== expectedHost) return reply.code(403).send(errorPayload('FORBIDDEN', 'Acesso local não autorizado.', request.id));
    if (store.busy && request.url !== '/api/v1/health') return reply.code(503).send(errorPayload('MAINTENANCE', 'Recuperação em andamento. Aguarde.', request.id));
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const session = sessions.get(request.cookies['me_session'] ?? '');
      const token = request.headers['x-csrf-token'];
      const validToken = typeof token === 'string' && session && /^[0-9a-f]{64}$/.test(token) && timingSafeEqual(Buffer.from(token), Buffer.from(session.token));
      if (request.headers.origin !== expectedOrigin || !session || session.expires < Date.now() || !validToken) return reply.code(403).send(errorPayload('FORBIDDEN', 'Sessão local inválida. Reabra a aplicação.', request.id));
      if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) return reply.code(415).send(errorPayload('JSON_REQUIRED', 'Envie dados no formato JSON.', request.id));
    }
  });
  // Repeat after body parsing: a request may have entered before another acquired maintenance.
  app.addHook('preHandler', async (request, reply) => {
    if (store.busy && request.url !== '/api/v1/health') return reply.code(503).send(errorPayload('MAINTENANCE', 'Recuperação em andamento. Aguarde.', request.id));
  });
  app.setErrorHandler((error, request, reply) => {
    const details = error as { validation?: unknown; statusCode?: number; code?: string };
    if (error instanceof DomainError) return reply.code(error.status).send(errorPayload(error.code,error.message,request.id));
    if (details.code === 'SQLITE_BUSY') return reply.code(503).send(errorPayload('DATABASE_BUSY','Banco ocupado. Aguarde e repita a mesma operação.',request.id));
    if (details.code?.startsWith('SQLITE_CONSTRAINT')) return reply.code(409).send(errorPayload('REFERENCE_CONFLICT','Referência repetida ou vínculo inválido. Confira os dados.',request.id));
    if (details.validation || details.statusCode === 400) return reply.code(400).send(errorPayload('VALIDATION_ERROR', 'Confira os dados informados.', request.id));
    if (error instanceof MaintenanceError) return reply.code(503).send(errorPayload('MAINTENANCE', 'Operação em andamento. Aguarde.', request.id));
    if (error instanceof BackupError) return reply.code(400).send(errorPayload('INVALID_BACKUP', error.message, request.id));
    if (details.statusCode === 415) return reply.code(415).send(errorPayload('JSON_REQUIRED', 'Envie dados no formato JSON.', request.id));
    return reply.code(500).send(errorPayload('INTERNAL_ERROR', 'Não foi possível concluir a operação. Tente novamente.', request.id));
  });
  app.post('/api/v1/shutdown', { schema: { body: EmptyBody } }, async (_request, reply) => {
    reply.code(202).send({ stopping: true });
    setImmediate(() => { void app.close(); });
    return reply;
  });
  app.get('/api/v1/health', () => ({ app: 'me-estoque', version: '0.1.0', instanceId, status: 'ok', database: { status: 'ready', schemaVersion: validateSchema(store.db) }, startedAt }));
  app.get('/api/v1/session', (request, reply) => {
    const existing = sessions.get(request.cookies['me_session'] ?? '');
    if (existing && existing.expires > Date.now()) return { csrfToken: existing.token };
    for (const [key, value] of sessions) if (value.expires < Date.now()) sessions.delete(key);
    if (sessions.size >= 1000) sessions.delete(sessions.keys().next().value!);
    const id = randomBytes(32).toString('hex'); const token = randomBytes(32).toString('hex');
    sessions.set(id, { token, expires: Date.now() + 8 * 60 * 60 * 1000 });
    reply.setCookie('me_session', id, { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 8 * 60 * 60 });
    return { csrfToken: token };
  });
  app.get('/api/v1/backups', () => ({ items: store.list() }));
  app.post('/api/v1/backups', { schema: { body: EmptyBody } }, async (_request, reply) => {
    return reply.code(201).send(await store.create());
  });
  app.post<{ Params: { id: string } }>('/api/v1/backups/:id/validate', { schema: { params: BackupParams, body: EmptyBody } }, request => {
    const item = store.validate(request.params.id); return { id: item.id, valid: true, schemaVersion: item.schemaVersion, createdAt: item.createdAt };
  });
  app.post<{ Body: RestoreRequest }>('/api/v1/restore', { schema: { body: RestoreBody } }, async request => {
    const safetyBackupId = await store.restore(request.body.backupId); return { restored: true, safetyBackupId };
  });
  registerOperations(app,store);
  if (options.webDir) {
    if (!isAbsolute(options.webDir) || !existsSync(join(options.webDir, 'index.html'))) { store.close(); throw new Error('Arquivos locais da interface não encontrados.'); }
    app.register(staticFiles, { root: options.webDir, index: 'index.html' });
  }
  app.setNotFoundHandler((request, reply) => {
    if (request.url.split('?')[0]?.match(/^\/api(?:\/|$)/) || !options.webDir || !['GET', 'HEAD'].includes(request.method)) return reply.code(404).send(errorPayload('NOT_FOUND', 'Página ou operação não encontrada.', request.id));
    return reply.type('text/html').sendFile('index.html');
  });
  return app;
}
