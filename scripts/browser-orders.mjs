import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';

// Only called by the isolated browser runner with its own synthetic database.
export async function testOrders({browser,evaluate,evidence,base,dataDir}) {
  const click = name => browser('find','role','button','click','--name',name,'--exact');
  const link = name => browser('find','role','link','click','--name',name,'--exact');
  const fill = (label,value) => browser('find','label',label,'fill',value);
  const sessionResponse = await fetch(`${base}/api/v1/session`);
  const session = await sessionResponse.json();
  const headers = {origin:base,cookie:sessionResponse.headers.get('set-cookie').split(';')[0],
    'x-csrf-token':session.csrfToken,'content-type':'application/json'};
  const api = async (path,body) => {
    const response = await fetch(`${base}/api/v1${path}`,body ? {method:'POST',headers,
      body:JSON.stringify({operationId:randomUUID(),actorId:'local-operator',...body})} : {});
    const result = await response.json();
    assert.ok(response.ok, `${path}: ${JSON.stringify(result)}`);
    return result;
  };
  const product = await api('/catalog/products',{meCode:'SYN-OP-BROWSER',commercialName:'Moto sintética'});
  const variant = await api('/catalog/variants',{productId:product.id,color:'Azul'});
  const receipt = await api('/boxes/receipts',{variantId:variant.id,quantity:3,
    receivedDate:'2026-11-10',supplier:'Fornecedor sintético',invoice:'NF-SYN',lot:'LOTE-OP-SYN'});
  const balances = async expected => {
    const s = await api('/boxes/summary');
    assert.deepEqual([s.physical,s.reserved,s.blocked,s.available],expected);
  };
  const create = async () => {
    link('Ordens de produção'); browser('wait','--text','Caixas abertas aguardando regularização');
    link('Nova OP'); browser('wait','--text','SYN-OP-BROWSER');
    browser('select','select',variant.id);
    click('Revisar reserva'); browser('wait','--text','O saldo físico permanece igual.');
    click('Criar OP e reservar 1 caixa'); browser('wait','--text','OP criada e 1 caixa reservada.');
    const latest = (await api('/orders')).items[0];
    link(`Abrir ${latest.code}`); browser('wait','--text','Primeira transcrição');
    return latest;
  };
  const cancel = async (opened=null) => {
    click('Cancelar OP'); fill('Motivo do cancelamento','Cancelamento sintético de teste');
    if (opened !== null) browser('select','[role="dialog"] select',opened?'opened':'closed');
    click('Confirmar cancelamento');
    browser('wait','--fn',"!document.querySelector('[role=dialog]') && document.body.textContent.includes('Situação da OP: Cancelada')");
  };
  const first = await create();
  await balances([3,1,0,2]);
  browser('screenshot',join(evidence,'order-reserved-desktop.png'),'--full');
  click('Iniciar transcrição e baixar 1 caixa'); browser('wait','--text','Confirmar individualização');
  await balances([3,1,0,2]); // Confirmation has not deducted anything.
  click('Confirmar baixa de 1 caixa'); browser('wait','--text','Salvar alterações');
  await balances([2,0,0,2]);
  const converted = await api(`/orders/${first.id}`);
  assert.equal(converted.unit.chassis,null);
  assert.equal(converted.unit.originId,receipt.originId);
  assert.equal(converted.unit.qualityStatus,'PENDING');
  browser('wait','--text','LOTE-OP-SYN');
  fill('Chassi (opcional)',' syn-browser-01 '); click('Salvar alterações');
  browser('wait','--text','Operação registrada com sucesso.');
  browser('wait','--fn',"document.querySelector('input[name^=\"chassi-opcional\"]')?.value === 'syn-browser-01'");
  await balances([2,0,0,2]);
  assert.equal((await api(`/orders/${first.id}`)).unit.id,converted.unit.id);
  assert.equal((await api(`/orders/${first.id}`)).unit.chassis,'SYN-BROWSER-01');
  browser('open',`${base}/ordens/${first.id}`); browser('wait','--text','Salvar alterações');
  assert.match(evaluate('document.body.textContent'),/syn-browser-01/);
  browser('screenshot',join(evidence,'order-converted-desktop.png'),'--full');
  writeFileSync(join(evidence,'order-a11y.json'),browser('a11y','--json'));
  link('Ficha para impressão'); browser('wait','--text','Imprimir ficha');
  browser('wait','--text','LOTE-OP-SYN');
  browser('screenshot',join(evidence,'order-print.png'),'--full');
  const printed = join(evidence,'order-print.pdf');
  browser('pdf',printed);
  // Chromium writes uncompressed Page object dictionaries in this output.
  assert.equal((readFileSync(printed,'latin1').match(/\/Type\s*\/Page\b/g)??[]).length,1,'A ficha deve ocupar uma página');
  link('Voltar à OP'); browser('wait','--text','Salvar alterações');
  await cancel(); await balances([2,0,0,2]);
  link('Abrir unidade'); browser('wait','--text','Detalhes da unidade');
  assert.match(evaluate('document.body.textContent'),/Cancelada/);
  await create(); await balances([2,1,0,1]);
  await cancel(false); await balances([2,0,0,2]);
  await create(); await cancel(true); await balances([2,0,1,1]);
  link('Ordens de produção'); browser('wait','--text','Criar OP de regularização');
  click('Criar OP de regularização'); fill('Motivo da regularização','Continuar caixa aberta sintética');
  click('Confirmar regularização'); browser('wait','--text','Regularização reservada.');
  await balances([2,1,0,1]);
  const regularized = (await api('/orders')).items[0];
  link(`Abrir ${regularized.code}`); browser('wait','--text','Primeira transcrição');
  await cancel(false); await balances([2,0,0,2]);
  link('Ordens de produção'); fill('Pesquisar OPs','syn-browser-01');
  browser('wait','--fn',"location.search.includes('q=syn-browser-01')");
  browser('wait','--text',first.code);
  browser('set','viewport','390','844');
  browser('screenshot',join(evidence,'orders-mobile.png'),'--full');
  assert.match(evaluate('document.documentElement.scrollWidth <= innerWidth'),/true/);
  const db = new Database(join(dataDir,'me-estoque.sqlite'),{readonly:true});
  try {
    assert.equal(db.prepare('SELECT COUNT(*) n FROM unit').get().n,1);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM box_conversion').get().n,1);
    assert.equal(db.pragma('integrity_check',{simple:true}),'ok');
    assert.deepEqual(db.pragma('foreign_key_check'),[]);
  } finally { db.close(); }
  writeFileSync(join(evidence,'orders-checks.json'),JSON.stringify({passed:true,
    checks:['create/reserve','confirm before deduction','partial conversion without chassis','save without deduction',
      'origin/lot preserved','reload','cancel after conversion','cancel closed reservation','cancel open creates block',
      'regularize block to reservation','chassis search URL','one unit/conversion','SQLite integrity/FK']},null,2));
  link('Proteção dos dados');
}
