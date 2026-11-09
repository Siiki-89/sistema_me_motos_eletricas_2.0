import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app.js';

const port = Number(process.env['ME_PORT'] ?? '4317');
const mode = process.env['NODE_ENV'] === 'development' ? 'development' : 'production';
const configured = process.env['ME_DATA_DIR'];
const localAppData = process.env['LOCALAPPDATA'];
let app: ReturnType<typeof buildApp> | undefined;
try {
  if (!configured && !localAppData) throw new Error('Diretório local do Windows indisponível. Configure ME_DATA_DIR.');
  if (mode === 'development' && !configured) throw new Error('Desenvolvimento exige ME_DATA_DIR explícito.');
  const dataDir = configured ?? join(localAppData!, 'ME-Estoque', 'data');
  const webDir = mode === 'development' ? undefined : process.env['ME_WEB_DIR'] ?? resolve(dirname(fileURLToPath(import.meta.url)), '../web');
  app = buildApp({ dataDir, port, mode, ...(webDir ? { webDir } : {}), ...(process.env['ME_INSTANCE_ID'] ? { instanceId: process.env['ME_INSTANCE_ID'] } : {}) });
  await app.listen({ host: '127.0.0.1', port });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void app!.close().then(() => { process.exitCode = 0; }); });
} catch {
  await app?.close();
  console.error('Não foi possível iniciar ME Estoque. Verifique a porta local, o diretório de dados e a compatibilidade do banco. Nenhum banco foi substituído.');
  process.exitCode = 1;
}
