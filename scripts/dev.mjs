import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { runtimePath } from './runtime.mjs';

// The developer database is persistent but isolated from the user's installation.
const env = { ...process.env, ME_DATA_DIR: resolve('data/development'), ME_PORT: '4317', NODE_ENV: 'development' };
const children = [
  spawn(runtimePath(), ['--import', 'tsx', '--watch', 'src/server/main.ts'], { env, stdio: 'inherit', windowsHide: true }),
  spawn(runtimePath(), ['node_modules/vite/bin/vite.js'], { env, stdio: 'inherit', windowsHide: true }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
for (const child of children) {
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { if (!stopping) stop(code ?? 1); });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
