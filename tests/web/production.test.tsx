import React from 'react';
import '@testing-library/jest-dom/vitest';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render,screen,cleanup,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter,useNavigate} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {App} from '../../src/web/app/App';
import {checklistTemplate,type ProductionDto} from '../../src/shared/contracts/production';
let data:ProductionDto; let unit=true; let cancelled=false; let lost=false; let writes:any[];
beforeEach(()=>{unit=true;cancelled=false;lost=false;writes=[];data={orderId:'o1',unitId:'u1',version:0,productionStatus:'WAITING',stages:[],occurrences:[],selfCheck:{templateVersion:1,answers:checklistTemplate.items.map(i=>({code:i.code,state:'UNASSESSED',notes:null}))},template:checklistTemplate,totals:{netMinutes:0,knownNetMinutes:0,pendingCount:0,reworkKnownNetMinutes:0},history:[]};vi.stubGlobal('fetch',vi.fn(async(input:string,init?:RequestInit)=>{let p=String(input);if(p.endsWith('/session'))return Response.json({csrfToken:'t'});if(p.endsWith('/actor'))return Response.json({id:'local-operator'});if(p.endsWith('/orders/o1'))return Response.json({id:'o1',code:'OP-1',meCode:'ME-1',commercialName:'Sintético',color:'Azul',unitId:unit?'u1':null,unit:unit?{chassis:null}:null,status:cancelled?'CANCELLED':'COMPLETED'});if(p.endsWith('/production')){if(init?.method==='PUT'){const b=JSON.parse(String(init.body));writes.push(b);if(lost)throw Error('lost');data={...data,...b,version:data.version+1,stages:b.stages.map((s:any)=>({...s,times:{grossMinutes:null,pauseMinutes:0,netMinutes:null,pending:true}}))};}return Response.json(data);}return Response.json(data);}));});
afterEach(()=>{cleanup();sessionStorage.clear();vi.unstubAllGlobals();});
function HistoryControls() {
  const navigate = useNavigate();
  return <><button type="button" onClick={() => navigate(-1)}>Histórico anterior</button><button type="button" onClick={() => navigate(1)}>Histórico seguinte</button></>;
}
function mount(withHistory = false) {
  const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
  const route = '/ordens/o1/producao';
  return {...render(<QueryClientProvider client={client}><MemoryRouter initialEntries={withHistory ? ['/rota-sintetica-fora-do-editor',route] : [route]}>
    {withHistory && <HistoryControls/>}<App/>
  </MemoryRouter></QueryClientProvider>),client};
}
it('requires explicit individualization before production',async()=>{unit=false;mount();expect(await screen.findByText(/Individualize a unidade/)).toBeVisible();expect(screen.queryByRole('button',{name:'Salvar produção'})).not.toBeInTheDocument();});
it('saves partial stages with stable IDs, explicit empty times and unassessed answers',async()=>{mount();const u=userEvent.setup();await u.click(await screen.findByRole('button',{name:'Adicionar desembalagem'}));await u.type(screen.getByLabelText('Responsável — Desembalagem'),'Ana');expect(screen.getByRole('button',{name:'Concluir Desembalagem'})).toBeDisabled();await u.click(screen.getByRole('button',{name:'Salvar produção'}));await screen.findByText('Produção salva.');expect(writes[0].stages[0]).toMatchObject({startAt:null,endAt:null,responsible:'Ana',state:'WAITING'});expect(writes[0].selfCheck.answers.every((x:any)=>x.state==='UNASSESSED')).toBe(true);expect(writes[0].stages[0]).not.toHaveProperty('times');});
it('freezes ambiguous retry and keeps exact payload and UUID',async()=>{mount();const u=userEvent.setup();await u.click(await screen.findByRole('button',{name:'Adicionar montagem'}));lost=true;await u.click(screen.getByRole('button',{name:'Salvar produção'}));await screen.findByRole('alert');expect(screen.getByLabelText('Responsável — Montagem')).toBeDisabled();lost=false;await u.click(screen.getByRole('button',{name:'Repetir confirmação'}));await screen.findByText('Produção salva.');expect(writes).toHaveLength(2);expect(writes[0]).toEqual(writes[1]);});
it('requires a visible pause reason and allows multiple pauses',async()=>{mount();const u=userEvent.setup();await u.click(await screen.findByRole('button',{name:'Adicionar desembalagem'}));await u.click(screen.getByRole('button',{name:'Adicionar pausa — Desembalagem'}));expect(screen.getByLabelText('Motivo da pausa 1 — Desembalagem')).toHaveValue('');await u.click(screen.getByRole('button',{name:'Salvar produção'}));expect(writes).toHaveLength(0);await u.selectOptions(screen.getByLabelText('Motivo da pausa 1 — Desembalagem'),'BREAK');await u.click(screen.getByRole('button',{name:'Adicionar pausa — Desembalagem'}));expect(screen.getAllByText(/Motivo da pausa/)).toHaveLength(2);});
it('cancelled orders expose read only production',async()=>{cancelled=true;mount();expect(await screen.findByText(/OP cancelada: produção somente para consulta/)).toBeVisible();expect(screen.queryByRole('button',{name:'Salvar produção'})).not.toBeInTheDocument();});
it('keeps completed assembly and checklist locked until explicit reopen with reason',async()=>{data.version=1;data.stages=[{id:'s1',kind:'ASSEMBLY',state:'COMPLETED',civilDate:'2026-11-10',startAt:'2026-11-10T10:00',endAt:'2026-11-10T11:00',responsible:'Ana',notes:null,occurrenceId:null,pauses:[],times:{grossMinutes:60,pauseMinutes:0,netMinutes:60,pending:false}}];mount();const u=userEvent.setup();expect(await screen.findByLabelText('Responsável — Montagem')).toBeDisabled();expect(screen.getByLabelText('Avaliação 2.1')).toBeDisabled();await u.click(screen.getByRole('button',{name:'Reabrir Montagem'}));expect(screen.getByRole('button',{name:'Confirmar reabertura'})).toBeDisabled();await u.type(screen.getByLabelText('Motivo da reabertura'),'Corrigir ficha');expect(screen.getByRole('button',{name:'Confirmar reabertura'})).toBeEnabled();});
it('preserves draft on version conflict and guards link navigation',async()=>{const original=fetch;vi.stubGlobal('fetch',vi.fn(async(input:string,init?:RequestInit)=>init?.method==='PUT'?Response.json({error:{code:'VERSION_CONFLICT'}},{status:409}):original(input,init)));mount();const u=userEvent.setup();await u.click(await screen.findByRole('button',{name:'Adicionar montagem'}));await u.type(screen.getByLabelText('Responsável — Montagem'),'Ficha nova');await u.click(screen.getByRole('button',{name:'Salvar produção'}));await screen.findByRole('alert');expect(screen.getByLabelText('Responsável — Montagem')).toHaveValue('Ficha nova');const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);await u.click(screen.getByRole('link',{name:'Voltar à OP'}));expect(confirm).toHaveBeenCalled();expect(screen.getByLabelText('Responsável — Montagem')).toHaveValue('Ficha nova');confirm.mockRestore();});
it('distinguishes pending total and known subtotal and shows history changes without raw JSON',async()=>{data.totals={netMinutes:null,knownNetMinutes:90,pendingCount:1,reworkKnownNetMinutes:20};data.history=[{id:'h1',kind:'SAVED',actorId:'local-operator',reason:null,createdAt:'2026-11-10T12:00:00Z',before:{stages:[],occurrences:[],selfCheck:{answers:[]}},after:{stages:[],occurrences:[{id:'x',description:'Cabo solto',status:'RESOLVED',resolution:'Conector ajustado'}],selfCheck:{answers:[{code:'2.1',state:'NONCONFORMING',notes:'Conferir direção'}]}}}];mount();expect(await screen.findByText('Pendente')).toBeVisible();expect(screen.getByText('1h 30min')).toBeVisible();await userEvent.click(screen.getByText('Histórico da produção (1)'));expect(screen.getByText(/Cabo solto.*resolvida.*Conector ajustado/)).toBeVisible();expect(screen.getByText(/Item 2.1: Não conforme/)).toBeVisible();});
it('requires occurrence time and problem before aggregate save',async()=>{mount();const u=userEvent.setup();await u.click(await screen.findByRole('button',{name:'Adicionar ocorrência'}));await u.click(screen.getByRole('button',{name:'Salvar produção'}));expect(writes).toHaveLength(0);expect(screen.getByLabelText('Data e hora — ocorrência 1')).toBeRequired();expect(screen.getByLabelText('Descrição do problema — ocorrência 1')).toBeRequired();});
it('shows changed pause intervals and stage notes in production history',async()=>{const stage={id:'s',kind:'UNPACKING',state:'IN_PROGRESS',startAt:'2026-11-10T10:00',endAt:'2026-11-10T12:00',responsible:'Ana',notes:'Ficha corrigida',pauses:[{id:'p',startAt:'2026-11-10T10:30',endAt:'2026-11-10T10:45',reason:'EQUIPMENT',notes:'Troca de ferramenta'}]};data.history=[{id:'h',actorId:'local-operator',kind:'SAVED',reason:null,createdAt:'2026-11-10T12:00:00Z',before:{stages:[]},after:{stages:[stage]}}];mount();await screen.findByText('Histórico da produção (1)');await userEvent.click(screen.getByText('Histórico da produção (1)'));expect(screen.getByText(/Ficha corrigida/)).toBeVisible();expect(screen.getByText(/10:30.*10:45.*Ferramenta \/ equipamento.*Troca de ferramenta/)).toBeVisible();});
it('restores a draft on history back and forward and preserves its base version', async () => {
  const view = mount(true);
  const u = userEvent.setup();
  await u.click(await screen.findByRole('button', {name:'Adicionar montagem'}));
  await u.type(screen.getByLabelText('Responsável — Montagem'), 'Ficha local');
  await u.click(screen.getByRole('button', {name:'Histórico anterior'}));
  expect(screen.queryByLabelText('Responsável — Montagem')).not.toBeInTheDocument();
  data = {...data, version: 4};
  await u.click(screen.getByRole('button', {name:'Histórico seguinte'}));
  await view.client.refetchQueries({queryKey:['production','o1']});
  expect(await screen.findByLabelText('Responsável — Montagem')).toHaveValue('Ficha local');
  await u.click(screen.getByRole('button', {name:'Salvar produção'}));
  expect(writes[0].version).toBe(0);
});
it('restores the frozen confirmation without automatically sending it', async () => {
  const view = mount();
  const u = userEvent.setup();
  await u.click(await screen.findByRole('button', {name:'Adicionar montagem'}));
  lost = true;
  await u.click(screen.getByRole('button', {name:'Salvar produção'}));
  await screen.findByRole('alert');
  view.unmount();
  lost = false;
  mount();
  const retry = await screen.findByRole('button', {name:'Repetir confirmação'});
  expect(writes).toHaveLength(1);
  expect(screen.getByLabelText('Responsável — Montagem')).toBeDisabled();
  await u.click(retry);
  await screen.findByText('Produção salva.');
  expect(writes[0]).toEqual(writes[1]);
});
it('reconciles clean refetches but preserves dirty edits', async () => {
  const view = mount();
  const u = userEvent.setup();
  const add = await screen.findByRole('button', {name:'Adicionar montagem'});
  data = {...data, version: 1, productionStatus: 'ASSEMBLING'};
  await view.client.refetchQueries({queryKey:['production','o1']});
  expect(await screen.findByText('Em montagem')).toBeVisible();
  await u.click(add);
  data = {...data, version: 2, productionStatus: 'PAUSED'};
  await view.client.refetchQueries({queryKey:['production','o1']});
  expect(screen.getByLabelText('Responsável — Montagem')).toBeVisible();
  await u.click(screen.getByRole('button', {name:'Salvar produção'}));
  expect(writes[0].version).toBe(1);
});
it('keeps version-conflict recovery available after a failed recovery GET', async () => {
  let fail = true;
  const original = fetch;
  vi.stubGlobal('fetch', vi.fn(async (input:string, init?:RequestInit) => {
    if (init?.method === 'PUT') return Response.json({error:{code:'VERSION_CONFLICT'}},{status:409});
    if (fail && writes.length && String(input).endsWith('/production')) return new Response(null,{status:500});
    return original(input,init);
  }));
  mount();
  const u = userEvent.setup();
  await u.click(await screen.findByRole('button', {name:'Adicionar montagem'}));
  await u.click(screen.getByRole('button', {name:'Salvar produção'}));
  const recovery = await screen.findByRole('button', {name:'Descartar rascunho e consultar versão salva'});
  writes.push({});
  const confirm = vi.spyOn(window,'confirm').mockReturnValue(true);
  try {
    await u.click(recovery);
    expect(await screen.findByText(/Não foi possível concluir a operação/)).toBeVisible();
    fail = false;
    await u.click(screen.getByRole('button', {name:'Descartar rascunho e consultar versão salva'}));
    await screen.findByText('Versão salva consultada.');
  } finally { confirm.mockRestore(); }
});
it('removes new rows individually while retaining other changes and saved rows', async () => {
  mount();
  const u = userEvent.setup();
  await u.click(await screen.findByRole('button', {name:'Adicionar desembalagem'}));
  await u.click(screen.getByRole('button', {name:'Salvar produção'}));
  await screen.findByText('Produção salva.');
  expect(screen.queryByRole('button', {name:'Remover Desembalagem'})).not.toBeInTheDocument();
  await u.type(screen.getByLabelText('Responsável — Desembalagem'), 'Ana');
  await u.click(screen.getByRole('button', {name:'Adicionar pausa — Desembalagem'}));
  await u.click(screen.getByRole('button', {name:'Remover pausa 1 — Desembalagem'}));
  await u.click(screen.getByRole('button', {name:'Adicionar montagem'}));
  await u.click(screen.getByRole('button', {name:'Adicionar ocorrência'}));
  const stage = screen.getByLabelText('Etapa — ocorrência 1');
  await u.selectOptions(stage, within(stage).getByRole('option', {name:'Montagem'}));
  expect(screen.getByRole('button', {name:'Remover Montagem'})).toBeDisabled();
  await u.click(screen.getByRole('button', {name:'Remover ocorrência 1'}));
  await u.click(screen.getByRole('button', {name:'Remover Montagem'}));
  expect(screen.getByLabelText('Responsável — Desembalagem')).toHaveValue('Ana');
  await u.click(screen.getByRole('button', {name:'Salvar produção'}));
  expect(writes[1]).toMatchObject({stages:[{responsible:'Ana',pauses:[]}],occurrences:[]});
});
it('keeps resolved occurrences resolved while assembly is completed', async () => {
  data.stages = [{id:'s1',kind:'ASSEMBLY',state:'COMPLETED',civilDate:null,startAt:null,endAt:null,responsible:null,notes:null,occurrenceId:null,pauses:[],times:{grossMinutes:null,pauseMinutes:0,netMinutes:null,pending:true}}];
  data.occurrences = [{id:'x',stageId:null,type:'OTHER',component:null,description:'Cabo solto',occurredAt:'2026-11-10T12:00',recordedBy:null,status:'RESOLVED',plannedDestination:null,requiredAction:null,resolution:'Conector ajustado',notes:null,checklistItemCode:null}];
  mount();
  await userEvent.click(await screen.findByRole('button',{name:'Adicionar ocorrência'}));
  expect(screen.getByLabelText('Situação — ocorrência 2')).toHaveValue('RESOLVED');
  expect(screen.getByLabelText('Ação realizada — ocorrência 2')).toBeRequired();
  expect(within(screen.getByLabelText('Situação — ocorrência 2')).getByRole('option',{name:'Em andamento'})).toBeDisabled();
  expect(within(screen.getByLabelText('Situação — ocorrência 1')).getByRole('option',{name:'Aberta'})).toBeDisabled();
  expect(screen.getByLabelText('Descrição do problema — ocorrência 1')).toHaveValue('Cabo solto');
});

it('restores a frozen reopen action with its exact request and reason', async () => {
  const stageId = '10000000-0000-4000-8000-000000000001';
  data.stages = [{id:stageId,kind:'ASSEMBLY',state:'COMPLETED',civilDate:null,startAt:null,endAt:null,responsible:null,notes:null,occurrenceId:null,pauses:[],times:{grossMinutes:null,pauseMinutes:0,netMinutes:null,pending:true}}];
  const attempts: unknown[] = [];
  const original = fetch;
  vi.stubGlobal('fetch', vi.fn(async (input:string, init?:RequestInit) => {
    if (init?.method === 'POST') {
      attempts.push([input,init.method,init.body]);
      if (attempts.length === 1) throw Error('lost');
      return Response.json({...data,version:1,stages:data.stages.map(stage => ({...stage,state:'IN_PROGRESS'}))});
    }
    return original(input, init);
  }));
  const view = mount();
  const u = userEvent.setup();
  await u.click(await screen.findByRole('button', {name:'Reabrir Montagem'}));
  await u.type(screen.getByLabelText('Motivo da reabertura'),'Corrigir ficha');
  await u.click(screen.getByRole('button', {name:'Confirmar reabertura'}));
  await screen.findByRole('alert');
  view.unmount();
  mount();
  const dialog = await screen.findByRole('dialog', {name:'Reabrir etapa'});
  expect(within(dialog).getByLabelText('Motivo da reabertura')).toHaveValue('Corrigir ficha');
  expect(within(dialog).getByRole('button', {name:'Fechar'})).toBeDisabled();
  expect(attempts).toHaveLength(1);
  await u.click(within(dialog).getByRole('button', {name:'Repetir confirmação'}));
  await screen.findByText('Etapa reaberta.');
  expect(attempts).toHaveLength(2);
  expect(attempts[0]).toEqual(attempts[1]);
});
it('keeps the frozen command when the response arrives after leaving the editor', async () => {
  const original = fetch;
  let release!: (response: Response) => void;
  const first = new Promise<Response>(resolve => { release = resolve; });
  const attempts: unknown[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input:string, init?:RequestInit) => {
    if (init?.method === 'PUT') {
      attempts.push(init.body);
      if (attempts.length === 1) return first;
    }
    return original(input, init);
  }));
  const view = mount();
  const u = userEvent.setup();
  await u.click(await screen.findByRole('button', {name:'Adicionar montagem'}));
  await u.click(screen.getByRole('button', {name:'Salvar produção'}));
  expect(attempts).toHaveLength(1);
  view.unmount();
  release(Response.json(data));
  mount();
  await u.click(await screen.findByRole('button', {name:'Repetir confirmação'}));
  await screen.findByText('Produção salva.');
  expect(attempts).toHaveLength(2);
  expect(attempts[0]).toEqual(attempts[1]);
});
it('warns about unavailable tab storage and preserves edits within the app', async () => {
  const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('storage unavailable'); });
  try {
    const view = mount();
    const u = userEvent.setup();
    await u.click(await screen.findByRole('button', {name:'Adicionar retrabalho'}));
    expect(await screen.findByText(/recuperação pelo armazenamento da aba está indisponível/)).toBeVisible();
    view.unmount();
    mount();
    await u.type(await screen.findByLabelText('Responsável — Retrabalho 1'),'Ana');
    await u.click(screen.getByRole('button', {name:'Salvar produção'}));
    await screen.findByText('Produção salva.');
    expect(writes[0].stages[0].responsible).toBe('Ana');
  } finally { storage.mockRestore(); }
});


it('honors lower authoritative versions after restoring a backup, including explicit recovery', async () => {
  data = {...data, version: 8, productionStatus:'ASSEMBLED'};
  const view = mount();
  const u = userEvent.setup();
  expect(await screen.findByText('Montada')).toBeVisible();
  data = {...data, version: 5, productionStatus:'ASSEMBLING'};
  await view.client.refetchQueries({queryKey:['production','o1']});
  expect(await screen.findByText('Em montagem')).toBeVisible();
  await u.click(screen.getByRole('button',{name:'Adicionar retrabalho'}));
  data = {...data, version: 3, productionStatus:'PAUSED'};
  const confirm = vi.spyOn(window,'confirm').mockReturnValue(true);
  try {
    await u.click(screen.getByRole('button',{name:'Descartar rascunho e consultar versão salva'}));
    await screen.findByText('Versão salva consultada.');
    expect(screen.getByText('Pausada')).toBeVisible();
    await u.click(screen.getByRole('button',{name:'Salvar produção'}));
    expect(writes[0].version).toBe(3);
  } finally { confirm.mockRestore(); }
});

it('queries current production when replay returns an older receipt', async () => {
  const original = fetch;
  const historical = {...data, version:1, productionStatus:'UNPACKING'};
  const cached = {...data, version:4, productionStatus:'ASSEMBLING' as const};
  const latest = {...data, version:5, productionStatus:'PAUSED' as const};
  let attempts = 0;
  let receiptReturned = false;
  let readsAfterReceipt = 0;
  vi.stubGlobal('fetch', vi.fn(async (input:string, init?:RequestInit) => {
    if (String(input).endsWith('/production')) {
      if (init?.method === 'PUT') {
        if (++attempts === 1) throw Error('lost');
        receiptReturned = true;
        return Response.json(historical);
      }
      if (receiptReturned) {
        readsAfterReceipt++;
        return Response.json(latest);
      }
    }
    return original(input, init);
  }));
  const view = mount();
  const u = userEvent.setup();
  await u.click(await screen.findByRole('button',{name:'Adicionar retrabalho'}));
  await u.click(screen.getByRole('button',{name:'Salvar produção'}));
  await screen.findByRole('alert');
  data = cached;
  await view.client.refetchQueries({queryKey:['production','o1']});
  await u.click(screen.getByRole('button',{name:'Repetir confirmação'}));
  await screen.findByText('Produção salva.');
  expect(readsAfterReceipt).toBe(1);
  expect(screen.getByText('Pausada')).toBeVisible();
});
