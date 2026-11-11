import { it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

it('refuses implicit LOCALAPPDATA startup without creating another database', () => {
  mkdirSync('artifacts/test-launcher', {recursive:true});
  const local = mkdtempSync(resolve('artifacts/test-launcher/explicit-path-'));
  const env: NodeJS.ProcessEnv = {...process.env, LOCALAPPDATA:local, NODE_ENV:'production'};
  delete env.ME_DATA_DIR;
  const backend = spawnSync(process.execPath, ['--import','tsx','src/server/main.ts'], {
    env, encoding:'utf8', timeout:10000, windowsHide:true,
  });
  expect(backend.status).toBe(1);
  expect(backend.stderr).toContain('ME_DATA_DIR');
  expect(existsSync(join(local,'ME-Estoque'))).toBe(false);
  const launcher = spawnSync('pwsh',['-NoProfile','-File','scripts/start.ps1','-NoBrowser'], {
    env, encoding:'utf8', timeout:10000, windowsHide:true,
  });
  expect(launcher.status).not.toBe(0);
  expect(launcher.stderr).toContain('DataDirectory');
  expect(existsSync(join(local,'ME-Estoque'))).toBe(false);
},25000);
