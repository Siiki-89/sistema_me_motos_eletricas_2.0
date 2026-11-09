import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function runtimePath() {
  const path = fileURLToPath(new URL('../tools/runtime/node-v24.22.2-win-x64/node.exe', import.meta.url));
  if (!existsSync(path)) throw new Error('Runtime local ausente. Consulte docs/operacao-local.md.');
  return path;
}

export function parsePort(value = '4317') {
  if (!/^\d+$/.test(String(value))) throw new Error('Porta inválida.');
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('Porta inválida.');
  return port;
}
