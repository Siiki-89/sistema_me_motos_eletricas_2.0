import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createServer } from 'node:net';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { runtimePath } from './runtime.mjs';
import { testOrders } from './browser-orders.mjs';

const scenario = process.argv[2];
if (!['shell', 'backup', 'receipt', 'orders'].includes(scenario)) throw new Error('Cenário obrigatório: shell, backup, receipt ou orders.');
mkdirSync('artifacts/browser', { recursive: true });
const evidence = mkdtempSync(resolve('artifacts/browser', `${scenario}-`));
const dataDir = join(evidence, 'data');
const socket = createServer();
await new Promise(done => socket.listen(0, '127.0.0.1', done));
const port = socket.address().port;
await new Promise(done => socket.close(done));
const base = `http://127.0.0.1:${port}`;
const binary = resolve('tools/node_modules/agent-browser/bin/agent-browser-win32-x64.exe');
const prefix = execFileSync(binary, ['session', 'id', '--scope', 'worktree', '--prefix', 'me-foundation'], { encoding: 'utf8', windowsHide: true }).trim();
const session = `${prefix}-${scenario}`;
const browser = (...args) => {
  const output = execFileSync(binary, ['--session', session, '--config', resolve('tools/agent-browser.json'), '--allowed-domains', '127.0.0.1', ...args], { encoding: 'utf8', windowsHide: true, timeout: 35000 });
  return output.trim();
};
const evaluate = expression => browser('eval', '-b', Buffer.from(expression).toString('base64'));
const child = spawn(runtimePath(), ['dist/server/main.js'], { windowsHide: true, env: { ...process.env, NODE_ENV: 'production', ME_PORT: String(port), ME_DATA_DIR: dataDir, ME_INSTANCE_ID: `browser-${scenario}` }, stdio: ['ignore','pipe','pipe'] });
let logs = '';
child.stdout.on('data', b => { logs += b; }); child.stderr.on('data', b => { logs += b; });
const wait = ms => new Promise(done => setTimeout(done, ms));
try {
  let health;
  for (let i=0; i<60; i++) {
    if (child.exitCode !== null) throw new Error(`Backend encerrou: ${logs}`);
    try { health = await (await fetch(`${base}/api/v1/health`)).json(); if (health.app === 'me-estoque') break; } catch {}
    await wait(150);
  }
  assert.equal(health?.app, 'me-estoque');
  const fixture = new Database(join(dataDir, 'me-estoque.sqlite'));
  fixture.prepare('INSERT INTO app_metadata(key,value) VALUES (?,?)').run('browser-synthetic','before'); fixture.close();
  browser('open');
  browser('network', 'route', 'https://*', '--abort');
  browser('set', 'viewport', '1440', '1000');
  browser('open', base);
  browser('wait', '--text', 'Serviço local disponível');
  writeFileSync(join(evidence,'home-snapshot.txt'), browser('snapshot', '-i'));
  browser('press','Tab');
  assert.match(evaluate('document.activeElement.textContent'), /Pular para o conteúdo/);
  browser('screenshot', join(evidence,'home-desktop.png'), '--full');
  browser('find','role','link','click','--name','Proteção dos dados','--exact');
  browser('wait','--text','Nenhuma cópia local disponível.');
  writeFileSync(join(evidence,'backup-snapshot.txt'), browser('snapshot','-i'));
  if (scenario === 'receipt') {
    const click = name => browser('find','role','button','click','--name',name,'--exact');
    const link = name => browser('find','role','link','click','--name',name,'--exact');
    const fill = (label,value) => browser('find','label',label,'fill',value);
    const api = async path => (await fetch(`${base}/api/v1${path}`)).json();
    link('Modelos');
    browser('wait','--text','Nenhum modelo encontrado.');
    click('Cadastrar modelo');
    fill('Código ME','SYN-BROWSER'); fill('Nome comercial / modelo','Moto de teste');
    click('Salvar modelo'); browser('wait','--text','Modelo salvo.');
    fill('Nova cor','Azul'); click('Adicionar cor'); browser('wait','--text','Cor salva.');
    browser('screenshot',join(evidence,'model-desktop.png'),'--full');
    click('Fechar');
    fill('Pesquisar modelos','SYN-BROWSER');
    browser('wait','--fn',"location.search.includes('q=SYN-BROWSER')");
    const product = (await api('/catalog/products?q=SYN-BROWSER')).items[0];
    assert.equal(product.variants.length,1);
    link('Recebimento');
    browser('wait','--text','SYN-BROWSER');
    browser('select','select[name="modelo"]',product.id);
    browser('select','select[name="cor"]',product.variants[0].id);
    fill('Quantidade','2'); fill('Fornecedor','Fornecedor sintético');
    fill('Nota fiscal','NF-TESTE'); fill('Lote','LOTE-TESTE');
    browser('screenshot',join(evidence,'receipt-desktop.png'),'--full');
    click('Revisar recebimento'); browser('wait','--text','Confirmar recebimento');
    assert.equal((await api('/boxes/summary')).physical,0);
    click('Confirmar entrada'); browser('wait','--text','Entrada registrada.');
    assert.equal((await api('/boxes/summary')).physical,2);
    link('Estoque de caixas'); browser('wait','--text','SYN-BROWSER');
    browser('screenshot',join(evidence,'stock-desktop.png'),'--full');
    click('Origens e histórico SYN-BROWSER / Azul'); browser('wait','--text','LOTE-TESTE');
    click('Ver origem e histórico LOTE-TESTE'); browser('wait','--text','Detalhes da origem');
    click('Ajustar origem LOTE-TESTE'); fill('Variação de caixas','-1'); fill('Motivo da correção','Contagem sintética');
    click('Confirmar ajuste'); browser('wait','--text','Correção registrada.');
    browser('wait','--fn',"document.querySelector('[role=dialog] table tbody tr')?.textContent.includes('Ajuste')");
    assert.equal((await api('/boxes/summary')).physical,1);
    browser('click','[role="dialog"] table tbody tr:first-child button');
    fill('Motivo da correção','Desfazer ajuste sintético'); click('Confirmar estorno');
    browser('wait','--fn',"document.querySelector('[role=dialog] table tbody tr')?.textContent.includes('Estorno')");
    assert.equal((await api('/boxes/summary')).physical,2);
    browser('screenshot',join(evidence,'history-desktop.png'),'--full'); click('Fechar');
    browser('open',`${base}/estoque-de-caixas`); browser('wait','--text','SYN-BROWSER');
    const stock=(await api('/boxes/stock')).items[0];
    assert.deepEqual([stock.physical,stock.reserved,stock.available],[2,0,2]);
    const db = new Database(join(dataDir,'me-estoque.sqlite'),{readonly:true});
    assert.equal(db.prepare('SELECT COUNT(*) n FROM box_movement').get().n,3);
    assert.equal(db.pragma('integrity_check',{simple:true}),'ok');db.close();
    browser('set','viewport','390','844');
    browser('screenshot',join(evidence,'stock-mobile.png'),'--full');
    assert.match(evaluate('document.documentElement.scrollWidth <= innerWidth'), /true/);
    writeFileSync(join(evidence,'stock-a11y.json'),browser('a11y','--json'));
    link('Proteção dos dados');
  }
  if (scenario === 'orders') await testOrders({browser,evaluate,evidence,base,dataDir});
  if (scenario === 'backup') {
    browser('find','role','button','click','--name','Criar cópia agora','--exact');
    browser('wait','--text','Cópia criada com sucesso.');
    const changed = new Database(join(dataDir,'me-estoque.sqlite'));
    changed.prepare("UPDATE app_metadata SET value='after' WHERE key='browser-synthetic'").run(); changed.close();
    browser('find','role','button','click','--name','Validar e restaurar','--exact');
    browser('wait','--text','Digite RESTAURAR para confirmar');
    assert.match(evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Restaurar dados desta cópia').disabled"), /true/);
    browser('screenshot', join(evidence,'restore-confirmation.png'), '--full');
    browser('find','label','Digite RESTAURAR para confirmar','fill','RESTAURAR');
    browser('find','role','button','click','--name','Restaurar dados desta cópia','--exact');
    browser('wait','--text','Dados restaurados com sucesso.');
    const restored = new Database(join(dataDir,'me-estoque.sqlite'));
    assert.equal(restored.prepare("SELECT value FROM app_metadata WHERE key='browser-synthetic'").get().value,'before'); restored.close();
  }
  browser('set','viewport','390','844');
  browser('screenshot',join(evidence,'backup-mobile.png'),'--full');
  assert.match(evaluate('document.documentElement.scrollWidth <= innerWidth'), /true/);
  assert.match(evaluate("performance.getEntriesByType('resource').every(e=>new URL(e.name).hostname==='127.0.0.1')"), /true/);
  browser('find','role','link','click','--name','Início','--exact');
  browser('network','route','*/api/v1/health','--abort');
  browser('find','role','button','click','--name','Verificar novamente','--exact');
  browser('wait','--text','O serviço local não respondeu.');
  browser('network','unroute','*/api/v1/health');
  browser('find','role','button','click','--name','Verificar novamente','--exact');
  browser('wait','--text','Serviço local disponível');
  writeFileSync(join(evidence,'result.json'), JSON.stringify({scenario,passed:true,health,checks:['local communication','keyboard','mobile no overflow','external domains blocked','error recovery',...(scenario==='backup'?['create','validate','confirm','restore real SQLite']:[]),...(scenario==='receipt'?['create model/color','search URL','receipt confirmation before mutation','stock 2','origin details','adjust -1','reverse adjustment +1','reload stock 2/0/2','SQLite history and integrity']:[])]},null,2));
  console.log(`PASS ${scenario}: ${evidence}`);
} catch (error) {
  for (const command of ['snapshot','errors','console']) {
    try { writeFileSync(join(evidence,`${command}-failure.txt`),browser(command)); } catch {}
  }
  try { browser('screenshot',join(evidence,'failure.png'),'--full'); } catch {}
  throw error;
} finally {
  writeFileSync(join(evidence,'server.log'),logs);
  try { browser('close'); } catch {}
  try {
    const response = await fetch(`${base}/api/v1/session`); const token = await response.json();
    await fetch(`${base}/api/v1/shutdown`, {method:'POST',headers:{origin:base,cookie:response.headers.get('set-cookie').split(';')[0],'x-csrf-token':token.csrfToken,'content-type':'application/json'},body:'{}'});
    for (let i=0;i<50 && child.exitCode===null;i++) await wait(100);
  } catch {}
  if (child.exitCode===null) child.kill(); // Only this isolated test child.
}
