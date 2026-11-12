import React from 'react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '../../src/web/app/App';
const order = { id: 'o1', code: 'OP-000001', variantId: 'v1', originId: 'r1', meCode: 'ME-TESTE', commercialName: 'Sintético', color: 'Azul', orderDate: '2026-11-10', createdAt: '2026-11-09T12:00:00Z', status: 'RESERVED', version: 1, unitId: null, unpacker: null, mechanic: null, checker: null, destination: null, notes: null, reservation: { status: 'active' }, unit: null, history: [{ id: 'e1', kind: 'CHASSIS_UPDATED', actorId: 'local-operator', createdAt: '2026-11-10T12:00:00Z', reason: 'Correção sintética' }] };
let writes: Record<string, unknown>[];
let lost: boolean;
beforeEach(() => { writes = []; lost = false; vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => { const p = String(input); if (p.endsWith('/session'))
    return Response.json({ csrfToken: 'test' }); if (p.endsWith('/actor'))
    return Response.json({ id: 'local-operator' }); if (p.endsWith('/convert')) {
    writes.push(JSON.parse(String(init?.body)));
    if (lost)
        throw Error('lost');
    return Response.json({ order: { ...order, unitId: 'u1' }, unit: { id: 'u1' } });
} if (p.endsWith('/orders/o1'))
    return Response.json(order); if (p.includes('/boxes/origins/'))
    return Response.json({ supplier: 'Sintético', invoice: 'NF1', lot: 'L1', receivedDate: '2026-11-10' }); return Response.json({ items: [order], total: 1, page: 1, limit: 50 }); })); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function mount(path: string) {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <MemoryRouter initialEntries={[path]}>
    <App />
    </MemoryRouter>
    </QueryClientProvider>);
}
it('preserva edição pendente e exige salvar antes de concluir ou cancelar OP convertida', async () => {
    const original = fetch;
    let current = {...order, status:'TRANSCRIBING', unitId:'u1', mechanic:'', unit:{id:'u1', chassis:null as string|null, chassisOriginal:null as string|null, createdAt:'2026-11-10T12:00:00Z'}};
    const commands:string[]=[];
    vi.stubGlobal('fetch',vi.fn(async(input:string,init?:RequestInit)=>{
        const path=String(input);
        if(path.endsWith('/orders/o1')){
            if(init?.method==='PUT'){
                const body=JSON.parse(String(init.body));
                commands.push('save');
                current={...current,mechanic:body.mechanic,version:2,unit:{...current.unit,chassis:body.chassis,chassisOriginal:body.chassis}};
            }
            return Response.json(current);
        }
        if(path.endsWith('/status')){commands.push('status');return Response.json({...current,status:'COMPLETED'});}
        return original(input,init);
    }));
    mount('/ordens/o1');
    const user=userEvent.setup();
    await user.type(await screen.findByLabelText('Mecânico responsável'),'Mecânico sintético');
    await user.type(screen.getByLabelText('Chassi (opcional)'),'SYN-123');
    expect(screen.getByRole('button',{name:'Concluir registro da OP'})).toBeDisabled();
    expect(screen.getByRole('button',{name:'Marcar em andamento'})).toBeDisabled();
    expect(screen.getByRole('button',{name:'Cancelar OP'})).toBeDisabled();
    await user.click(screen.getByRole('button',{name:'Concluir registro da OP'}));
    expect(commands).toEqual([]);
    expect(screen.getByLabelText('Chassi (opcional)')).toHaveValue('SYN-123');
    expect(screen.getByLabelText('Mecânico responsável')).toHaveValue('Mecânico sintético');
    await user.click(screen.getByRole('button',{name:'Salvar alterações'}));
    await screen.findByText('Operação registrada com sucesso.');
    await user.click(screen.getByRole('button',{name:'Concluir registro da OP'}));
    await user.click(await screen.findByRole('button',{name:'Confirmar situação da OP'}));
    expect(commands).toEqual(['save','status']);
    expect(screen.getByLabelText('Chassi (opcional)')).toHaveValue('SYN-123');
});
it('cancelar antes da individualização exige descarte explícito dos dados pendentes', async () => {
    mount('/ordens/o1');
    const user=userEvent.setup();
    await user.type(await screen.findByLabelText('Mecânico responsável'),'Rascunho sintético');
    await user.click(screen.getByRole('button',{name:'Cancelar OP'}));
    await user.type(screen.getByLabelText('Motivo do cancelamento'),'Desistência');
    await user.selectOptions(screen.getByLabelText('Condição física da caixa'),'closed');
    expect(screen.getByRole('button',{name:'Confirmar cancelamento'})).toBeDisabled();
    await user.click(screen.getByRole('button',{name:'Fechar'}));
    expect(screen.getByLabelText('Mecânico responsável')).toHaveValue('Rascunho sintético');
    await user.click(screen.getByRole('button',{name:'Cancelar OP'}));
    await user.type(screen.getByLabelText('Motivo do cancelamento'),'Desistência');
    await user.selectOptions(screen.getByLabelText('Condição física da caixa'),'closed');
    await user.click(screen.getByRole('checkbox',{name:'Descartar os dados ainda não salvos desta transcrição ao cancelar a OP'}));
    expect(screen.getByRole('button',{name:'Confirmar cancelamento'})).toBeEnabled();
});
it('lista OPs com chassi pendente e filtros sem perder pesquisa', async () => { mount('/ordens?page=2'); await screen.findByText('OP-000001'); await userEvent.type(screen.getByLabelText('Pesquisar OPs'), 'ME'); await userEvent.selectOptions(screen.getByLabelText('Situação da OP'), 'RESERVED'); expect(fetch).toHaveBeenCalledWith(expect.stringContaining('q=ME&status=RESERVED&page=1'), expect.anything()); expect(screen.getByText('Chassi pendente')).toBeVisible(); });
it('distingue data da OP da criação e traduz o evento de correção do chassi', async () => {
    mount('/ordens');
    expect(await screen.findByText('Data da OP: 10/11/2026')).toBeVisible();
    expect(screen.getByText(`Criada em: ${new Date(order.createdAt).toLocaleString('pt-BR')}`)).toBeVisible();
    cleanup();
    mount('/ordens/o1');
    expect(await screen.findByText('Chassi corrigido')).toBeVisible();
    expect(screen.queryByText('CHASSIS_UPDATED')).not.toBeInTheDocument();
});
it('confirma primeira baixa explicitamente e repete payload após resposta perdida', async () => { mount('/ordens/o1'); const user = userEvent.setup(); await user.click(await screen.findByRole('button', { name: 'Iniciar transcrição e baixar 1 caixa' })); expect(writes).toHaveLength(0); lost = true; await user.click(screen.getByRole('button', { name: 'Confirmar baixa de 1 caixa' })); await screen.findByRole('alert'); lost = false; await user.click(screen.getByRole('button', { name: 'Confirmar baixa de 1 caixa' })); expect(writes).toHaveLength(2); expect(writes[0]).toEqual(writes[1]); });
it('cancelamento aberto exige motivo e informa caixa aberta no comando', async () => { const original = fetch; vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => { if (String(input).endsWith('/cancel')) {
    writes.push(JSON.parse(String(init?.body)));
    return Response.json({ ...order, status: 'CANCELLED' });
} return original(input, init); })); mount('/ordens/o1'); const user = userEvent.setup(); await user.click(await screen.findByRole('button', { name: 'Cancelar OP' })); expect(screen.getByRole('button', { name: 'Confirmar cancelamento' })).toBeDisabled(); await user.type(screen.getByLabelText('Motivo do cancelamento'), 'Caixa aberta, operação interrompida'); await user.selectOptions(screen.getByLabelText('Condição física da caixa'), 'opened'); await user.click(screen.getByRole('button', { name: 'Confirmar cancelamento' })); expect(writes[0]).toMatchObject({ version: 1, boxOpened: true, reason: 'Caixa aberta, operação interrompida' }); });
it('salva unidade existente por PUT sem novo comando de conversão', async () => { const original = fetch; vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => { if (String(input).endsWith('/orders/o1')) {
    if (init?.method === 'PUT') {
        writes.push(JSON.parse(String(init.body)));
        return Response.json(order);
    }
    return Response.json({ ...order, status: 'TRANSCRIBING', unitId: 'u1', unit: { id: 'u1', chassis: null, createdAt: '2026-11-10T12:00:00Z' } });
} return original(input, init); })); mount('/ordens/o1'); const user = userEvent.setup(); await user.type(await screen.findByLabelText('Chassi (opcional)'), 'syn-1'); await user.click(screen.getByRole('button', { name: 'Salvar alterações' })); expect(writes[0]).toMatchObject({ version: 1, chassis: 'syn-1' }); expect(screen.queryByRole('button', { name: 'Iniciar transcrição e baixar 1 caixa' })).not.toBeInTheDocument(); expect(screen.getByRole('link',{name:'Qualidade'})).toBeVisible(); });
it('nova OP mostra saldo e confirma uma reserva com responsáveis opcionais', async () => { const original = fetch; vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => { if (String(input).includes('/boxes/stock?'))
    return Response.json({ items: [{ variantId: 'v1', meCode: 'ME-TESTE', color: 'Azul', available: 2, physical: 3, reserved: 1, blocked: 0 }], total: 1, limit: 50 }); if (String(input).endsWith('/orders') && init?.method === 'POST') {
    writes.push(JSON.parse(String(init.body)));
    return Response.json(order);
} return original(input, init); })); mount('/ordens/nova'); const user = userEvent.setup(); await screen.findByRole('option', { name: /ME-TESTE/ }); await user.selectOptions(screen.getByLabelText('Modelo e cor'), 'v1'); await user.click(screen.getByRole('button', { name: 'Revisar reserva' })); expect(writes).toHaveLength(0); await user.click(screen.getByRole('button', { name: 'Criar OP e reservar 1 caixa' })); expect(writes[0]).toMatchObject({ variantId: 'v1', unpacker: '', mechanic: '', checker: '' }); await screen.findByText(/OP criada e 1 caixa reservada/); });
