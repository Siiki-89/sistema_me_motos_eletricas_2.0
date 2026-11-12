import { it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';

const exec = promisify(execFile);
async function testDirectory(prefix: string) {
  const root = resolve('artifacts/test-launcher');
  await mkdir(root, { recursive: true });
  return mkdtemp(join(root, prefix));
}
async function freePort() {
  const server = createServer();
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const port = (server.address() as {port:number}).port;
  await new Promise<void>(done => server.close(() => done()));
  return port;
}
const run = (script:string, args:string[]) => exec('pwsh', ['-NoProfile', '-File', resolve('scripts',script), ...args], { timeout:25000, windowsHide:true });

it('starts the built app, reuses only its own instance and stops it safely', async () => {
  const data = await testDirectory('me-fundacao-á ');
  const port = await freePort();
  try {
    const first = await run('start.ps1', ['-DataDirectory',data,'-Port',String(port),'-NoBrowser','-InitializeNewDatabase']);
    expect(first.stdout).toContain('http://127.0.0.1:');
    const health = await (await fetch(`http://127.0.0.1:${port}/api/v1/health`)).json();
    expect(health.app).toBe('me-estoque');
    const second = await run('start.ps1', ['-DataDirectory',data,'-Port',String(port),'-NoBrowser']);
    expect(second.stdout).toContain('já está ativo');
    const again = await (await fetch(`http://127.0.0.1:${port}/api/v1/health`)).json();
    expect(again.instanceId).toBe(health.instanceId);
  } finally {
    await run('stop.ps1', ['-DataDirectory',data]).catch(()=>undefined);
  }
  await expect(fetch(`http://127.0.0.1:${port}/api/v1/health`)).rejects.toThrow();
}, 40000);

it('refuses an occupied port without terminating the other service', async () => {
  const listener = createServer(socket => socket.end());
  await new Promise<void>(done => listener.listen(0,'127.0.0.1',done));
  const port = (listener.address() as {port:number}).port;
  const data = await testDirectory('me-port-conflict-');
  try {
    await expect(run('start.ps1',['-DataDirectory',data,'-Port',String(port),'-NoBrowser'])).rejects.toThrow();
    expect(listener.listening).toBe(true);
  } finally { await new Promise<void>(done=>listener.close(()=>done())); }
},30000);
