import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';

export async function testProduction({browser,evaluate,evidence,base,dataDir}) {
  const click = name => browser('find','role','button','click','--name',name,'--exact');
  const link = name => browser('find','role','link','click','--name',name,'--exact');
  const slug = label => label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-');
  const fill = (label,value) => {
    const selector = '[name="'+slug(label)+'"]';
    const type = JSON.parse(evaluate(`document.querySelector(${JSON.stringify(selector)}).type`));
    if (type === 'date' || type === 'datetime-local' || value === '') {
      // Native date segments and clearing are not handled by this CLI's fill.
      // Use the DOM setter plus normal events; persistence is asserted through API.
      evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)});
        const prototype = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype,'value').set.call(el,${JSON.stringify(value)});
        el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    } else browser('find','label',label,'fill',value);
    const actual = JSON.parse(evaluate(`document.querySelector(${JSON.stringify(selector)}).value`));
    assert.equal(actual,value,'Browser fill: '+label);
  };
  const select = (label,value) => browser('select','select[name="'+slug(label)+'"]',value);
  const response = await fetch(base+'/api/v1/session');
  const session = await response.json();
  const headers = {origin:base,cookie:response.headers.get('set-cookie').split(';')[0],
    'x-csrf-token':session.csrfToken,'content-type':'application/json'};
  const api = async (path,body) => {
    const r = await fetch(base+'/api/v1'+path,body ? {method:'POST',headers,
      body:JSON.stringify({operationId:randomUUID(),actorId:'local-operator',...body})} : {});
    const value = await r.json();
    assert.ok(r.ok,path+': '+JSON.stringify(value));
    return value;
  };
  const product = await api('/catalog/products',{meCode:'SYN-PRODUCTION',commercialName:'Moto sintética de produção'});
  const variant = await api('/catalog/variants',{productId:product.id,color:'Azul'});
  await api('/boxes/receipts',{variantId:variant.id,quantity:2,receivedDate:'2026-11-10',lot:'LOTE-PROD-SYN'});
  const order = await api('/orders',{variantId:variant.id,orderDate:'2026-11-10'});
  const converted = await api('/orders/'+order.id+'/convert',{version:order.version,chassis:'SYN-PROD-01'});
  const path = '/orders/'+order.id+'/production';
  const get = () => api(path);
  const save = async () => {
    const before = (await get()).version;
    click('Salvar produção');
    browser('wait','--fn',"document.body.textContent.includes('Produção salva.') && !document.body.textContent.includes('Alterações não salvas.')");
    const after = await get();
    assert.equal(after.version,before+1);
    return after;
  };
  const complete = async name => {
    click('Concluir '+name);
    browser('wait','--text','Confirmar conclusão');
    click('Confirmar conclusão');
    browser('wait','--fn',"!document.querySelector('[role=dialog]') && document.body.textContent.includes('Etapa concluída.')");
  };
  browser('open',base+'/ordens/'+order.id);
  browser('wait','--text','Produção');
  link('Produção');
  browser('wait','--text','Adicionar desembalagem');
  click('Adicionar desembalagem');
  fill('Responsável — Desembalagem','Operador sintético');
  fill('Data da ficha — Desembalagem','2026-11-10');
  fill('Início (data e hora) — Desembalagem','2026-11-10T23:00');
  select('Situação — Desembalagem','IN_PROGRESS');
  let saved = await save();
  assert.equal(saved.stages[0].times.netMinutes,null);
  assert.equal(saved.totals.pendingCount,1);

  fill('Observações — Desembalagem','Rascunho preservado no histórico do navegador');
  browser('back'); browser('wait','--text','Salvar alterações');
  browser('forward'); browser('wait','--text','Adicionar montagem');
  assert.match(evaluate("document.querySelector('textarea[name=observacoes-desembalagem]').value"),/Rascunho preservado/);
  fill('Observações — Desembalagem','');

  fill('Término (data e hora) — Desembalagem','2026-11-11T01:00');
  click('Adicionar pausa — Desembalagem');
  fill('Início da pausa 1 — Desembalagem','2026-11-10T23:30');
  fill('Término da pausa 1 — Desembalagem','2026-11-11T00:00');
  select('Motivo da pausa 1 — Desembalagem','BREAK');
  saved = await save();
  assert.deepEqual(saved.stages[0].times,{grossMinutes:120,pauseMinutes:30,netMinutes:90,pending:false});

  click('Adicionar montagem');
  fill('Responsável — Montagem','Mecânico sintético');
  fill('Data da ficha — Montagem','2026-11-11');
  fill('Início (data e hora) — Montagem','2026-11-11T09:00');
  fill('Término (data e hora) — Montagem','2026-11-11T12:00');
  select('Situação — Montagem','IN_PROGRESS');
  click('Adicionar pausa — Montagem');
  fill('Início da pausa 1 — Montagem','2026-11-11T09:30');
  fill('Término da pausa 1 — Montagem','2026-11-11T09:40');
  select('Motivo da pausa 1 — Montagem','EQUIPMENT');
  click('Adicionar pausa — Montagem');
  fill('Início da pausa 2 — Montagem','2026-11-11T10:30');
  fill('Término da pausa 2 — Montagem','2026-11-11T10:50');
  select('Motivo da pausa 2 — Montagem','OPERATIONAL_WAIT');
  saved = await save();
  const assembly = saved.stages.find(s=>s.kind==='ASSEMBLY');
  assert.equal(assembly.times.netMinutes,150);
  assert.equal(saved.totals.netMinutes,240);

  fill('Início da pausa 2 — Montagem','2026-11-11T09:35');
  click('Salvar produção');
  browser('wait','--fn',"!!document.querySelector('[role=alert]')");
  assert.equal((await get()).version,saved.version);
  fill('Início da pausa 2 — Montagem','2026-11-11T10:30');

  click('Adicionar ocorrência');
  select('Tipo — ocorrência 1','ASSEMBLY');
  select('Etapa — ocorrência 1',assembly.id);
  fill('Componente — ocorrência 1','Conector sintético');
  fill('Data e hora — ocorrência 1','2026-11-11T10:00');
  fill('Descrição do problema — ocorrência 1','Conector aguardando ajuste sintético');
  fill('Destino previsto — ocorrência 1','Bancada de revisão');
  for (let n=1;n<=8;n++) select('Avaliação 2.'+n,n===6?'NONCONFORMING':'CONFORMING');
  fill('Observação 2.6','Ajuste pendente');
  saved = await save();
  click('Concluir Montagem'); click('Confirmar conclusão');
  browser('wait','--fn',"!!document.querySelector('[role=dialog] [role=alert]')");
  assert.equal((await get()).stages.find(s=>s.kind==='ASSEMBLY').state,'IN_PROGRESS');
  assert.equal((await api('/units/'+converted.unit.id)).qualityStatus,'PENDING');
  click('Fechar');
  select('Avaliação 2.6','CONFORMING');
  fill('Observação 2.6','Ajuste realizado');
  select('Situação — ocorrência 1','RESOLVED');
  fill('Ação realizada — ocorrência 1','Conexão corrigida no teste');
  await save();
  await complete('Desembalagem');
  await complete('Montagem');
  saved = await get();
  assert.equal(saved.productionStatus,'ASSEMBLED');
  assert.equal((await api('/units/'+converted.unit.id)).qualityStatus,'PENDING');
  browser('screenshot',join(evidence,'production-completed-desktop.png'));
  writeFileSync(join(evidence,'production-a11y.json'),browser('a11y','--json'));

  click('Reabrir Montagem');
  fill('Motivo da reabertura','Revisão sintética dos registros');
  click('Confirmar reabertura');
  browser('wait','--fn',"!document.querySelector('[role=dialog]') && document.body.textContent.includes('Etapa reaberta.')");
  click('Adicionar retrabalho');
  fill('Responsável — Retrabalho 1','Mecânico sintético');
  fill('Início (data e hora) — Retrabalho 1','2026-11-11T12:30');
  fill('Término (data e hora) — Retrabalho 1','2026-11-11T13:00');
  select('Situação — Retrabalho 1','IN_PROGRESS');
  select('Ocorrência vinculada — Retrabalho 1',saved.occurrences[0].id);
  saved = await save();
  assert.equal(saved.totals.reworkKnownNetMinutes,30);
  assert.equal(saved.totals.netMinutes,270);

  fill('Observações — Montagem','Tentativa preservada após falha de comunicação');
  const beforeRetry = (await get()).version;
  browser('network','route','*'+path,'--abort');
  click('Salvar produção');
  browser('wait','--text','Resultado incerto.');
  browser('back');
  browser('network','unroute','*'+path);
  browser('forward'); browser('wait','--text','Repetir confirmação');
  click('Repetir confirmação');
  browser('wait','--fn',"document.body.textContent.includes('Produção salva.') && !document.body.textContent.includes('Resultado incerto.')");
  assert.equal((await get()).version,beforeRetry+1);
  browser('open',base+'/ordens/'+order.id+'/producao');
  browser('wait','--text','4h 30min');
  browser('screenshot',join(evidence,'production-desktop.png'));
  browser('set','viewport','390','844');
  browser('screenshot',join(evidence,'production-mobile.png'));
  assert.match(evaluate('document.documentElement.scrollWidth <= innerWidth'),/true/);
  assert.match(evaluate("performance.getEntriesByType('resource').every(e=>new URL(e.name).hostname==='127.0.0.1')"),/true/);
  const summary = await api('/boxes/summary');
  assert.deepEqual([summary.physical,summary.reserved,summary.blocked,summary.available],[1,0,0,1]);
  const db = new Database(join(dataDir,'me-estoque.sqlite'),{readonly:true});
  try {
    assert.equal(db.prepare('SELECT COUNT(*) n FROM unit').get().n,1);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM box_conversion').get().n,1);
    assert.equal(db.pragma('integrity_check',{simple:true}),'ok');
    assert.deepEqual(db.pragma('foreign_key_check'),[]);
  } finally { db.close(); }
  writeFileSync(join(evidence,'production-checks.json'),JSON.stringify({passed:true,netUnpacking:90,netAssembly:150,
    netRework:30,totalRegistered:270,checks:['partial','back-forward draft','midnight','multiple pauses',
      'invalid overlap rollback','occurrence','NC prevents completion','explicit completion','quality pending',
      'reopen','rework','uncertain retry survives navigation','stock and identity unchanged','mobile']},null,2));
  link('Proteção dos dados');
}
