import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NavLink, useSearchParams } from 'react-router-dom';
import { request } from '../../lib/api';
import type { Page } from '../../../shared/contracts/catalog';
import type { OrderDto, OrderListDto, BlockDto, UnitDto } from '../../../shared/contracts/orders';
import type { StockDto } from '../../../shared/contracts/boxes';
import { Header, Field, Pager, QueryState, ErrorNotice, Modal, useWriteOperation, today, color, civil, useUnsavedChanges } from '../common/Operational';
import s from '../../app/Operations.module.css';
export const statuses: Record<OrderDto['status'], string> = { RESERVED: 'Reservada', TRANSCRIBING: 'Em transcrição', IN_PROGRESS: 'Em andamento', COMPLETED: 'Concluída', CANCELLED: 'Cancelada' };
export const emptyFields = { unpacker: '', mechanic: '', checker: '', destination: '', notes: '' };
export function OrderFields({ value, set, disabled = false }: {
    value: typeof emptyFields;
    set: (v: typeof emptyFields) => void;
    disabled?: boolean;
}) {
    return <fieldset disabled={disabled} className={s.formFields}>
    <div className={s.grid}>{Object.entries({ unpacker: 'Responsável pelo desembalamento', mechanic: 'Mecânico responsável', checker: 'Conferente', destination: 'Destino / loja', notes: 'Observações' }).map(([key, label]) => <Field key={key} label={label}>
        <input maxLength={2000} value={value[key as keyof typeof value]} onChange={e => set({ ...value, [key]: e.target.value })}/>
        </Field>)}</div>
    </fieldset>;
}
function useFilters() { const [params, set] = useSearchParams(); const q = params.get('q') ?? ''; const status = Object.hasOwn(statuses, params.get('status') ?? '') ? params.get('status')! : ''; const raw = Number(params.get('page')); const page = Number.isSafeInteger(raw) && raw > 0 ? raw : 1; return { q, status, page, update: (key: string, value: string) => set(old => { const n = new URLSearchParams(old); value ? n.set(key, value) : n.delete(key); if (key !== 'page')
        n.delete('page'); return n; }, { replace: true }) }; }
export function Orders() {
    const f = useFilters();
    const query = useQuery({ queryKey: ['orders', f.q, f.status, f.page], queryFn: () => request<Page<OrderListDto>>(`/orders?${new URLSearchParams({ q: f.q, ...(f.status ? { status: f.status } : {}), page: String(f.page), limit: '50' })}`), retry: false });
    return <>
    <Header title="Ordens de produção">Cada OP reserva uma caixa para uma moto. A primeira transcrição individualiza a unidade.</Header>
    <div className={s.toolbar}>
    <Field label="Pesquisar OPs">
    <input type="search" placeholder="OP, código ME, modelo ou chassi" value={f.q} onChange={e => f.update('q', e.target.value)}/>
    </Field>
    <Field label="Situação da OP">
    <select value={f.status} onChange={e => f.update('status', e.target.value)}>
    <option value="">Todas</option>{Object.entries(statuses).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
    </Field>
    <NavLink to="/ordens/nova">Nova OP</NavLink>
    </div>
    <QueryState query={query} empty="Nenhuma OP encontrada. Crie uma OP ou revise os filtros."/>{query.data?.items.length && !query.isError ? <div className={s.tableWrap}>
        <table>
        <caption>Ordens de produção</caption>
        <thead>
        <tr>
        <th>OP / data</th>
        <th>Modelo / cor</th>
        <th>Responsáveis</th>
        <th>Situação</th>
        <th>Chassi</th>
        </tr>
        </thead>
        <tbody>{query.data.items.map(o => <tr key={o.id}>
            <th>
            <NavLink to={`/ordens/${o.id}`}>{o.code}</NavLink>
            <small>Data da OP: {civil(o.orderDate)}</small>
            <small>Criada em: {new Date(o.createdAt).toLocaleString('pt-BR')}</small>
            </th>
            <td>{o.meCode}<small>{o.commercialName} / {color(o.color)}</small>
            </td>
            <td>{o.unpacker || 'Desembalamento não informado'}<small>{o.mechanic || 'Mecânico não informado'}</small>
            </td>
            <td>{statuses[o.status]}</td>
            <td>{o.chassis || 'Chassi pendente'}</td>
            </tr>)}</tbody>
        </table>
        </div> : null}<Pager data={query.data} page={f.page} setPage={v => f.update('page', String(v))} label="OPs"/>
    <Blocks />
    </>;
}
export function NewOrder() {
    const client = useQueryClient();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<StockDto | null>(null);
    const [fields, setFields] = useState(emptyFields);
    const [date, setDate] = useState(today());
    const [confirm, setConfirm] = useState(false);
    const [result, setResult] = useState<OrderDto | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [busy, setBusy] = useState(false);
    const op = useWriteOperation();
    useUnsavedChanges(!result && !!selected);
    const stock = useQuery({ queryKey: ['stock', 'order-select', search, page], queryFn: () => request<Page<StockDto>>(`/boxes/stock?${new URLSearchParams({ q: search, active: 'true', page: String(page), limit: '50' })}`), retry: false });
    async function save() { setBusy(true); setError(null); try {
        setResult(await op.write<OrderDto>('/orders', { variantId: selected!.variantId, orderDate: date, ...fields }));
        setConfirm(false);
        for (const key of ['orders', 'stock', 'summary', 'origins']) void client.invalidateQueries({queryKey:[key]});
    }
    catch (e) {
        setError(e as Error);
    }
    finally {
        setBusy(false);
    } }
    return <>
    <Header title="Nova OP">A confirmação reserva 1 caixa disponível. Os responsáveis podem ser preenchidos depois.</Header>{result ? <p role="status" className={s.success}>OP criada e 1 caixa reservada. <NavLink to={`/ordens/${result.id}`}>Abrir {result.code}</NavLink>
        </p> : <form onSubmit={e => { e.preventDefault(); if (selected)
            setConfirm(true); }}>
        <fieldset className={s.formFields} disabled={op.locked || busy}>
        <Field label="Buscar modelo para OP">
        <input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); setSelected(null); }}/>
        </Field>
        <QueryState query={stock} empty="Nenhuma referência ativa encontrada."/>
        <Field label="Modelo e cor">
        <select required value={selected?.variantId ?? ''} onChange={e => setSelected(stock.data?.items.find(x => x.variantId === e.target.value) ?? null)}>
        <option value="">Selecione</option>{stock.data?.items.map(x => <option key={x.variantId} value={x.variantId} disabled={x.available < 1}>{x.meCode} / {x.commercialName} / {color(x.color)} — {x.available} disponível</option>)}</select>
        </Field>
        <Pager data={stock.data} page={page} setPage={v => { setPage(v); setSelected(null); }} label="referências"/>{selected && <p>Física: {selected.physical} · Reservada: {selected.reserved} · Bloqueada: {selected.blocked ?? 0} · Disponível: {selected.available}</p>}<Field label="Data da OP">
        <input type="date" required value={date} onChange={e => setDate(e.target.value)}/>
        </Field>
        <OrderFields value={fields} set={setFields}/>
        </fieldset>
        <ErrorNotice error={op.actor.error}/>
        <button type="submit" disabled={!selected || !op.actor.data || busy}>{op.locked ? 'Retomar confirmação da OP' : 'Revisar reserva'}</button>
        </form>}{confirm && <Modal title="Criar OP e reservar 1 caixa" description="O saldo físico permanece igual. O disponível diminui em 1 caixa. A origem é selecionada por ordem de recebimento (alocação contábil)." close={() => setConfirm(false)} busy={busy}>
        <p>{selected?.meCode} / {color(selected?.color ?? null)} · {civil(date)}</p>
        <ErrorNotice error={error}/>{op.locked && <p>Resultado incerto. Repita a mesma operação para recuperar o resultado sem duplicação.</p>}<button type="button" disabled={busy} onClick={() => void save()}>Criar OP e reservar 1 caixa</button>
        </Modal>}</>;
}
function Blocks() {
    const client = useQueryClient();
    const [page, setPage] = useState(1);
    const [notice, setNotice] = useState('');
    const query = useQuery({ queryKey: ['blocks', page], queryFn: () => request<Page<BlockDto>>(`/boxes/blocks?page=${page}&limit=50`), retry: false });
    const [selected, setSelected] = useState<BlockDto | null>(null);
    const [action, setAction] = useState<'regularize' | 'release'>('regularize');
    const [reason, setReason] = useState('');
    const [closed, setClosed] = useState(false);
    const [date, setDate] = useState(today());
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [result, setResult] = useState<OrderDto | null>(null);
    const op = useWriteOperation();
    async function save() { setBusy(true); setError(null); try {
        if (action === 'regularize')
            setResult(await op.write<OrderDto>(`/boxes/blocks/${selected!.id}/regularize`, { reason, orderDate: date }));
        else
            await op.write<BlockDto>(`/boxes/blocks/${selected!.id}/release`, { reason, physicalBoxClosed: true });
        setSelected(null);
        setNotice(action === 'regularize' ? 'Bloqueio transferido para reserva.' : 'Caixa fechada liberada para o disponível.');
        for (const key of ['blocks', 'orders', 'stock', 'summary', 'origins']) void client.invalidateQueries({queryKey:[key]});
    }
    catch (e) {
        setError(e as Error);
    }
    finally {
        setBusy(false);
    } }
    return <section className={s.origin}>
    <h2>Caixas abertas aguardando regularização</h2>
    {notice && <p role="status">{notice}</p>}
    <QueryState query={query} empty="Nenhum bloqueio registrado."/>{result && <p role="status">Regularização reservada. <NavLink to={`/ordens/${result.id}`}>Abrir {result.code}</NavLink>
        </p>}{query.data?.items.filter(b => b.status === 'active').map(b => <div className={s.origin} key={b.id}>
        <p>Origem {b.originId} · {b.reason}</p>
        <NavLink to={`/ordens/${b.cancelledOrderId}`}>Ver OP cancelada</NavLink>{(['regularize', 'release'] as const).map(a => <button key={a} type="button" className={s.secondary} disabled={op.locked} onClick={() => { setSelected(b); setAction(a); setReason(''); setClosed(false); setError(null); }}>{a === 'regularize' ? 'Criar OP de regularização' : 'Liberar caixa fechada'}</button>)}</div>)}<Pager data={query.data} page={page} setPage={setPage} label="bloqueios"/>{selected && <Modal title={action === 'regularize' ? 'Criar OP de regularização' : 'Liberar caixa fechada'} description={action === 'regularize' ? 'Transfere 1 caixa bloqueada para reserva na mesma origem, sem aumentar a disponibilidade.' : 'Somente libere se a caixa física estiver fechada e disponível.'} close={() => { if (!op.locked)
            setSelected(null); }} busy={busy || op.locked}>
        <fieldset className={s.formFields} disabled={busy || op.locked}>
        <Field label="Motivo da regularização">
        <textarea required maxLength={2000} value={reason} onChange={e => setReason(e.target.value)}/>
        </Field>{action === 'regularize' ? <Field label="Data da OP de regularização">
            <input type="date" required value={date} onChange={e => setDate(e.target.value)}/>
            </Field> : <label className={s.check}>
            <input type="checkbox" checked={closed} onChange={e => setClosed(e.target.checked)}/>Confirmo que a caixa física está fechada</label>}</fieldset>
        <ErrorNotice error={error}/>{op.locked && <p>Resultado incerto. Repita esta confirmação com os mesmos dados.</p>}<button type="button" disabled={busy || !op.actor.data || !reason.trim() || (action === 'release' && !closed)} onClick={() => void save()}>Confirmar {action === 'regularize' ? 'regularização' : 'liberação'}</button>
        </Modal>}</section>;
}
export function Units() {
    const f = useFilters();
    const query = useQuery({ queryKey: ['units', f.q, f.page], queryFn: () => request<Page<UnitDto>>(`/units?${new URLSearchParams({ q: f.q, page: String(f.page), limit: '50' })}`), retry: false });
    return <>
    <Header title="Unidades">Motos individualizadas, com identificação interna preservada.</Header>
    <Field label="Pesquisar unidades">
    <input type="search" value={f.q} onChange={e => f.update('q', e.target.value)}/>
    </Field>
    <QueryState query={query} empty="Nenhuma unidade encontrada."/>{query.data?.items.map(u => <div className={s.origin} key={u.id}>
        <NavLink to={`/unidades/${u.id}`}>{u.meCode} / {color(u.color)} — {u.chassis || 'Chassi pendente'}</NavLink>
        <p>ID interno: {u.id}</p>
        </div>)}<Pager data={query.data} page={f.page} setPage={v => f.update('page', String(v))} label="unidades"/>
    </>;
}
