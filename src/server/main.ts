import { resolve, dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app.js';

const port = Number(process.env['ME_PORT'] ?? '4317');
const mode = process.env['NODE_ENV'] === 'development' ? 'development' : 'production';
const configured = process.env['ME_DATA_DIR'];
let app: ReturnType<typeof buildApp> | undefined;
try {
  if (!configured?.trim()) {
    console.error('ME_DATA_DIR obrigatório: informe explicitamente a pasta de dados verificada. Nenhuma base padrão foi aberta.');
    process.exitCode = 1;
  } else {
  const dataDir = configured;
  if (mode === 'production' && !existsSync(join(dataDir, 'me-estoque.sqlite')) && process.env['ME_INIT_NEW_DATABASE'] !== '1') {
    throw new Error('Banco operacional não encontrado. Crie um novo banco somente com a inicialização explícita.');
  }
  const webDir = mode === 'development' ? undefined : process.env['ME_WEB_DIR'] ?? resolve(dirname(fileURLToPath(import.meta.url)), '../web');
  app = buildApp({ dataDir, port, mode, ...(webDir ? { webDir } : {}), ...(process.env['ME_INSTANCE_ID'] ? { instanceId: process.env['ME_INSTANCE_ID'] } : {}) });
  await app.listen({ host: '127.0.0.1', port });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void app!.close().then(() => { process.exitCode = 0; }); });
  }
} catch {
  await app?.close();
  console.error('Não foi possível iniciar ME Estoque. Verifique a porta local, o diretório de dados e a compatibilidade do banco. Nenhum banco foi substituído.');
  process.exitCode = 1;
}
