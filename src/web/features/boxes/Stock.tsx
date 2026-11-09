import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { ApiError, request } from '../../lib/api';
import type { Page } from '../../../shared/contracts/catalog';
import type { StockDto, OriginDto, MovementHistoryDto, BoxSummary } from '../../../shared/contracts/boxes';
import s from '../../app/Operations.module.css';
import { color, today, civil, num, kind, ErrorNotice, Header, Field, Pager, QueryState, Modal, useListFilters, useCommand } from '../common/Operational';
function StockDetail({ row, close }: {
    row: StockDto;
    close: () => void;
}) {
    const client = useQueryClient();
    const { actor, command } = useCommand();
    const [originPage, setOriginPage] = useState(1);
    const [movePage, setMovePage] = useState(1);
    const [origin, setOrigin] = useState<OriginDto | null>(null);
    const [correction, setCorrection] = useState<{
        originId: string;
        movementId?: string;
    } | null>(null);
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');
    const [date, setDate] = useState(today());
    const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
    const [notice, setNotice] = useState('');
    const origins = useQuery({ queryKey: ['origins', row.variantId, originPage], queryFn: () => request<Page<OriginDto>>(`/boxes/origins?variantId=${row.variantId}&page=${originPage}&limit=10`), retry: false });
    const movements = useQuery({ queryKey: ['movements', row.variantId, origin?.id, movePage], queryFn: () => request<Page<MovementHistoryDto>>(`/boxes/movements?variantId=${row.variantId}${origin ? `&originId=${origin.id}` : ''}&page=${movePage}&limit=10`), retry: false });
    const save = useMutation({ mutationFn: (body: Record<string, unknown>) => request(correction?.movementId ? `/boxes/movements/${correction.movementId}/reverse` : '/boxes/adjustments', body), onError: error => { if (error instanceof ApiError && !error.ambiguous)
            setPayload(null); }, onSuccess: () => { setCorrection(null); setPayload(null); setNotice('Correção registrada. Histórico e saldos atualizados.'); setOrigin(null); for (const key of ['stock', 'summary', 'origins', 'movements'])
            void client.invalidateQueries({ queryKey: [key] }); } });
    function start(c: {
        originId: string;
        movementId?: string;
    }) { if (payload || save.isPending)
        return; setCorrection(c); setQuantity(''); setReason(''); setDate(today()); setPayload(null); save.reset(); }
    return <Modal title={`${row.meCode} / ${color(row.color)}`} description="Origens e movimentos preservam os dados registrados no recebimento. Correções não apagam o histórico." close={() => { if (payload && !window.confirm('O resultado da correção é incerto. Confira o histórico antes de lançar outra correção. Fechar mesmo assim?'))
        return; close(); }} busy={save.isPending}>
    <ErrorNotice error={actor.error}/>{notice && <p className={s.success} role="status">{notice}</p>}<h3>Origens do estoque</h3>
    <QueryState query={origins} empty="Nenhum recebimento para esta referência."/>{!origins.isError && origins.data?.items.map(o => <div className={s.origin} key={o.id}>
        <strong>{civil(o.receivedDate)} · {num(o.physical)} caixas atuais</strong>
        <p>Fornecedor: {o.supplier || 'Não informado'} · NF: {o.invoice || 'Não informada'} · Lote: {o.lot || 'Não informado'}</p>
        <button className={s.secondary} onClick={() => { setOrigin(o); setMovePage(1); }}>Ver origem e histórico {o.lot || civil(o.receivedDate)}</button>
        <button className={s.secondary} disabled={!!payload || save.isPending} onClick={() => start({ originId: o.id })}>Ajustar origem {o.lot || civil(o.receivedDate)}</button>
        </div>)}<Pager data={origins.data} page={originPage} setPage={setOriginPage} label="origens"/>{origin && <section className={s.origin}>
        <h3>Detalhes da origem</h3>
        <dl className={s.details}>
        <dt>Referência recebida</dt>
        <dd>{origin.meCode} / {color(origin.color)}</dd>
        <dt>Quantidade original / saldo</dt>
        <dd>{num(origin.quantity)} / {num(origin.physical)}</dd>
        <dt>Recebimento</dt>
        <dd>{civil(origin.receivedDate)}</dd>
        <dt>Fornecedor</dt>
        <dd>{origin.supplier || 'Não informado'}</dd>
        <dt>Nota fiscal</dt>
        <dd>{origin.invoice || 'Não informada'}</dd>
        <dt>Lote</dt>
        <dd>{origin.lot || 'Não informado'}</dd>
        <dt>Observações</dt>
        <dd>{origin.notes || 'Não informadas'}</dd>
        <dt>Identificador da origem</dt>
        <dd>{origin.id}</dd>
        </dl>
        <button className={s.secondary} onClick={() => { setOrigin(null); setMovePage(1); }}>Ver histórico de todas as origens</button>
        </section>}<h3>Histórico de movimentos</h3>
    <QueryState query={movements} empty="Nenhum movimento encontrado."/>{!movements.isError && !!movements.data?.items.length && <div className={s.tableWrap}>
        <table>
        <caption>Movimentos {origin ? 'da origem selecionada' : 'desta referência'}</caption>
        <thead>
        <tr>
        <th>Data efetiva</th>
        <th>Movimento</th>
        <th>Quantidade</th>
        <th>Motivo / operador</th>
        <th>Correção</th>
        </tr>
        </thead>
        <tbody>{movements.data.items.map(m => <tr key={m.id}>
            <td>{civil(m.effectiveDate)}</td>
            <td>{kind[m.kind]}<small>{m.meCode} / {color(m.color)}</small>
            <small>Registro: {new Date(m.createdAt).toLocaleString('pt-BR')}</small>
            </td>
            <td>{m.quantity > 0 ? '+' : ''}{num(m.quantity)}</td>
            <td>{m.reason || 'Recebimento'}<small>{m.actorId === 'local-operator' ? 'Operador local' : m.actorId}</small>
            </td>
            <td>{m.kind !== 'reversal' && <button className={s.secondary} disabled={!!payload || save.isPending} onClick={() => start({ originId: m.originId, movementId: m.id })}>Estornar movimento {civil(m.effectiveDate)}</button>}{m.reversesId && <small>Compensa movimento {m.reversesId}</small>}</td>
            </tr>)}</tbody>
        </table>
        </div>}<Pager data={movements.data} page={movePage} setPage={setMovePage} label="movimentos"/>{correction && <section className={s.correction}>
        <h3>{correction.movementId ? 'Estornar movimento' : 'Ajustar saldo da origem'}</h3>
        <p>{correction.movementId ? 'Será registrado um movimento de quantidade oposta.' : 'Informe uma variação positiva para acrescentar ou negativa para retirar caixas.'}</p>
        <form onSubmit={e => { e.preventDefault(); const b = payload ?? { ...command(), ...(correction.movementId ? {} : { originId: correction.originId, quantity: Number(quantity) }), effectiveDate: date, reason }; setPayload(b); save.mutate(b); }}>
        <fieldset disabled={!!payload || save.isPending}>{!correction.movementId && <Field label="Variação de caixas">
            <input required type="number" step="1" min="-1000000" max="1000000" value={quantity} onChange={e => setQuantity(e.target.value)} onInvalid={e => e.currentTarget.setCustomValidity('Informe uma quantidade inteira diferente de zero.')} onInput={e => e.currentTarget.setCustomValidity(e.currentTarget.value === '0' ? 'A quantidade deve ser diferente de zero.' : '')}/>
            </Field>}<Field label="Data efetiva da correção">
        <input required type="date" value={date} onChange={e => setDate(e.target.value)}/>
        </Field>
        <Field label="Motivo da correção">
        <textarea required maxLength={2000} value={reason} onChange={e => setReason(e.target.value)}/>
        </Field>
        </fieldset>
        <ErrorNotice error={save.error}/>{payload && save.isError && <p>A tentativa manteve a mesma operação. Repita para consultar ou concluir seu resultado sem duplicação.</p>}<button disabled={!actor.data || save.isPending}>{save.isPending ? 'Registrando correção…' : correction.movementId ? 'Confirmar estorno' : 'Confirmar ajuste'}</button>{!payload && <button type="button" className={s.secondary} onClick={() => setCorrection(null)}>Cancelar correção</button>}</form>
        </section>}</Modal>;
}
export function Stock() {
    const { q, setQ, active, setActive, page, setPage } = useListFilters();
    const [selected, setSelected] = useState<StockDto | null>(null);
    const query = useQuery({ queryKey: ['stock', q, active, page], queryFn: () => request<Page<StockDto>>(`/boxes/stock?${new URLSearchParams({ q, page: String(page), limit: '50', ...(active ? { active } : {}) })}`), retry: false });
    const summary = useQuery({ queryKey: ['summary'], queryFn: () => request<BoxSummary>('/boxes/summary'), retry: false });
    return <>
    <Header title="Estoque de caixas">Saldos por modelo e cor, com recebimentos e correções rastreáveis.</Header>
    <div className={s.summary} role="region" aria-label="Resumo geral do estoque">{summary.isPending ? <p role="status">Consultando saldos…</p> : summary.data && !summary.isError ? <>
        <div>
        <span>Física em caixas</span>
        <strong>{num(summary.data.physical)}</strong>
        </div>
        <div>
        <span>Reservada</span>
        <strong>{num(summary.data.reserved)}</strong>
        </div>
        <div>
        <span>Disponível</span>
        <strong>{num(summary.data.available)}</strong>
        </div>
        <p>Disponível = física − reservada.<br />Reservas por OP serão disponibilizadas em outra etapa.</p>
        </> : null}<ErrorNotice error={summary.error}/>
    </div>
    <div className={s.toolbar}>
    <Field label="Pesquisar estoque">
    <input type="search" placeholder="Código ME, modelo ou cor" value={q} onChange={e => { setQ(e.target.value); }}/>
    </Field>
    <Field label="Status das referências">
    <select value={active} onChange={e => { setActive(e.target.value); }}>
    <option value="">Todos</option>
    <option value="true">Ativas</option>
    <option value="false">Inativas</option>
    </select>
    </Field>
    <NavLink to="/recebimento">Registrar recebimento</NavLink>
    </div>
    <QueryState query={query} empty="Nenhuma referência encontrada. Cadastre modelos e cores ou revise os filtros."/>{!query.isError && !!query.data?.items.length && <div className={s.tableWrap}>
        <table>
        <caption>Saldo por referência e cor</caption>
        <thead>
        <tr>
        <th>Código ME / modelo</th>
        <th>Cor</th>
        <th>Status</th>
        <th className={s.number}>Física</th>
        <th className={s.number}>Reservada</th>
        <th className={s.number}>Disponível</th>
        <th>Rastreabilidade</th>
        </tr>
        </thead>
        <tbody>{query.data.items.map(r => <tr key={r.variantId}>
            <th scope="row">{r.meCode}<small>{r.commercialName}</small>
            </th>
            <td>{color(r.color)}</td>
            <td>{r.active ? 'Ativa' : 'Inativa'}</td>
            <td className={s.number}>{num(r.physical)}</td>
            <td className={s.number}>{num(r.reserved)}</td>
            <td className={`${s.number} ${s.balance}`}>{num(r.available)}</td>
            <td>
            <button className={s.secondary} onClick={() => setSelected(r)}>Origens e histórico {r.meCode} / {color(r.color)}</button>
            </td>
            </tr>)}</tbody>
        </table>
        </div>}<Pager data={query.data} page={page} setPage={setPage} label="referências"/>{selected && <StockDetail row={selected} close={() => setSelected(null)}/>}</>;
}
