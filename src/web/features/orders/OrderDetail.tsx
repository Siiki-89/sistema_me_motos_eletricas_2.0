import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NavLink, useParams } from 'react-router-dom';
import { request } from '../../lib/api';
import type { OrderDetailDto, OrderDto, ConversionDto, UnitDetailDto, UnitDto, OrderEventDto } from '../../../shared/contracts/orders';
import type { OriginDto } from '../../../shared/contracts/boxes';
import { Header, Field, ErrorNotice, Modal, useWriteOperation, civil, today, color, useUnsavedChanges } from '../common/Operational';
import { OrderFields, emptyFields, statuses } from './Orders';
import s from '../../app/Operations.module.css';
const printText = (value:string|null) => value ? (value.length > 120 ? value.slice(0,120) + '… (texto completo na OP)' : value) : '________________________________';
const eventLabels: Record<string, string> = { CREATED: 'OP criada', RESERVED: 'Caixa reservada', CONVERTED: 'Caixa convertida em unidade', UPDATED: 'Dados atualizados', CANCELLED: 'OP cancelada', STATUS_CHANGED: 'Situação alterada', CHASSIS_UPDATED: 'Chassi corrigido', REGULARIZED: 'Bloqueio regularizado', RESERVATION_CONSUMED: 'Reserva consumida', RESERVATION_RELEASED: 'Reserva liberada', BLOCK_REGULARIZED: 'Bloqueio regularizado', BLOCK_RELEASED: 'Caixa fechada liberada' };
function History({ items }: {
    items: OrderEventDto[];
}) {
    return <section className={s.origin}>
    <h2>Histórico</h2>{items.map(h => <div className={s.origin} key={h.id}>
        <strong>{eventLabels[h.kind] ?? h.kind}</strong>
        <p>{new Date(h.createdAt).toLocaleString('pt-BR')} · {h.actorId === 'local-operator' ? 'Operador local' : h.actorId}</p>{h.reason && <p>Motivo: {h.reason}</p>}</div>)}</section>;
}
function Origin({ id, compact=false }: {
    id: string;
    compact?: boolean;
}) {
    const q = useQuery({ queryKey: ['origin', id], queryFn: () => request<OriginDto>(`/boxes/origins/${id}`), retry: false });
    return <section className={s.origin}>
    <h2>Origem contábil da caixa</h2>
    <ErrorNotice error={q.error}/>{q.isPending && <p role="status">Consultando origem…</p>}{q.isError && <button type="button" onClick={() => void q.refetch()}>Consultar origem novamente</button>}{q.data && <dl className={s.details}>
        <dt>Recebimento</dt>
        <dd>{civil(q.data.receivedDate)}</dd>
        <dt>Fornecedor</dt>
        <dd>{compact ? printText(q.data.supplier) : q.data.supplier || 'Não informado'}</dd>
        <dt>Nota fiscal</dt>
        <dd>{compact ? printText(q.data.invoice) : q.data.invoice || 'Não informada'}</dd>
        <dt>Lote</dt>
        <dd>{compact ? printText(q.data.lot) : q.data.lot || 'Não informado'}</dd>
        <dt>ID da origem</dt>
        <dd>{id}</dd>
        </dl>}<p>A alocação por recebimento não identifica uma caixa física individual.</p>
    </section>;
}
export function UnitInfo({ unit }: {
    unit: UnitDto;
}) {
    return <section className={s.origin}>
    <h2>Unidade individualizada</h2>
    <dl className={s.details}>
    <dt>ID interno imutável</dt>
    <dd>{unit.id}</dd>
    <dt>Chassi</dt>
    <dd>{unit.chassisOriginal || unit.chassis || 'Pendente'}</dd>
    <dt>Individualização</dt>
    <dd>{new Date(unit.createdAt).toLocaleString('pt-BR')}</dd>
    <dt>Produção</dt>
    <dd>Aguardando</dd>
    <dt>Qualidade</dt>
    <dd>Pendente</dd>
    <dt>Localização</dt>
    <dd>Galpão</dd>
    </dl>
    <p>Estes estados são independentes da situação administrativa da OP.</p>
    </section>;
}
export function UnitDetail() {
    const { id } = useParams();
    const q = useQuery({ queryKey: ['unit', id], queryFn: () => request<UnitDetailDto>(`/units/${id}`), retry: false });
    return <>
    <Header title="Detalhes da unidade">Identificação e rastreabilidade preservadas.</Header>
    <ErrorNotice error={q.error}/>{q.isPending && <p role="status">Consultando unidade…</p>}{q.isError && <button type="button" onClick={() => void q.refetch()}>Consultar novamente</button>}{q.data && <>
        <p>{q.data.meCode} / {q.data.commercialName} / {color(q.data.color)}</p>
        <UnitInfo unit={q.data}/>
        <Origin id={q.data.originId}/>
        <h2>OPs vinculadas</h2>{q.data.orders.map(o => <p key={o.id}>
            <NavLink to={`/ordens/${o.id}`}>{o.code}</NavLink> · {statuses[o.status]}</p>)}<History items={q.data.history}/>
        </>}</>;
}
export function OrderDetail({ print = false }: {
    print?: boolean;
}) { const [notice, setNotice] = useState(''); const { id } = useParams(); const q = useQuery({ queryKey: ['order', id], queryFn: () => request<OrderDetailDto>(`/orders/${id}`), retry: false }); return <>{notice && <p className={s.success} role="status">{notice}</p>}<ErrorNotice error={q.error}/>{q.isPending && <p role="status">Consultando OP…</p>}{q.isError && <button type="button" onClick={() => void q.refetch()}>Consultar novamente</button>}{q.data && <OrderContent key={`${q.data.id}-${q.data.version}`} order={q.data} print={print} onSaved={() => setNotice("Operação registrada com sucesso.")}/>}</>; }
function OrderContent({ order: o, print, onSaved }: {
    order: OrderDetailDto;
    print: boolean;
    onSaved: () => void;
}) {
    const client = useQueryClient();
    const op = useWriteOperation();
    const [fields, setFields] = useState({ ...emptyFields, ...Object.fromEntries(Object.keys(emptyFields).map(k => [k, o[k as keyof typeof emptyFields] ?? ''])) });
    const [chassis, setChassis] = useState(o.unit?.chassisOriginal ?? o.unit?.chassis ?? '');
    const [reason, setReason] = useState('');
    const [date, setDate] = useState(today());
    const [opened, setOpened] = useState('');
    const [discardDraft, setDiscardDraft] = useState(false);
    const [action, setAction] = useState<'convert' | 'cancel' | 'IN_PROGRESS' | 'COMPLETED' | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const terminal = o.status === 'CANCELLED' || o.status === 'COMPLETED';
    const dirty = JSON.stringify(fields) !== JSON.stringify({ ...emptyFields, ...Object.fromEntries(Object.keys(emptyFields).map(k => [k, o[k as keyof typeof emptyFields] ?? ''])) }) || chassis !== (o.unit?.chassisOriginal ?? o.unit?.chassis ?? '');
    useUnsavedChanges(dirty || op.locked);
    const body = { version: o.version, ...fields, chassis, ...(reason ? { reason } : {}) };
    async function save(which: 'update' | 'convert' | 'cancel' | 'IN_PROGRESS' | 'COMPLETED') {
        if (dirty && (which === 'IN_PROGRESS' || which === 'COMPLETED' || (which === 'cancel' && o.unit))) return;
        if (which === 'cancel' && dirty && !o.unit && !discardDraft) return;
        setBusy(true); setError(null); try {
        if (which === 'convert')
            await op.write<ConversionDto>(`/orders/${o.id}/convert`, body);
        else if (which === 'update')
            await op.write<OrderDto>(`/orders/${o.id}`, body, 'PUT');
        else if (which === 'cancel')
            await op.write<OrderDto>(`/orders/${o.id}/cancel`, { version: o.version, reason, effectiveDate: date, boxOpened: opened === 'opened' });
        else
            await op.write<OrderDto>(`/orders/${o.id}/status`, { version: o.version, status: which });
        setAction(null);
        onSaved();
        for (const key of ['order', 'orders', 'units', 'stock', 'summary', 'origins', 'movements', 'blocks'])
            void client.invalidateQueries({ queryKey: [key] });
    }
    catch (e) {
        setError(e as Error);
    }
    finally {
        setBusy(false);
    } }
    const changedChassis = !!o.unit?.chassis && chassis !== (o.unit.chassisOriginal ?? o.unit.chassis);
    return <article className={print ? s.printSheet : undefined}>
    <Header title={o.code}>{o.meCode} / {o.commercialName || 'Modelo comercial não informado'} / {color(o.color)}</Header>
    <p>Data: {civil(o.orderDate)} · Situação da OP: {statuses[o.status]}</p>
    <p>Reserva: {({ active: '1 caixa reservada', consumed: 'Consumida na individualização', released: 'Liberada' } as const)[o.reservation.status]}</p>{o.regularizesOrderId && <p>Regulariza <NavLink to={`/ordens/${o.regularizesOrderId}`}>OP anterior</NavLink>.</p>}{print ? <>
        <dl className={s.details}>{Object.entries({ unpacker: 'Desembalamento', mechanic: 'Mecânico', checker: 'Conferente', destination: 'Destino / loja', notes: 'Observações' }).map(([key, label]) => <div key={key}>
            <dt>{label}</dt>
            <dd>{printText(o[key as keyof typeof emptyFields])}</dd>
            </div>)}</dl>
        <p>Chassi: {o.unit?.chassisOriginal || o.unit?.chassis || '________________________________________________'}</p>
        <p>Conferência: ________________________________________________</p>
        <p className={s.noPrint}>
        <button type="button" onClick={() => window.print()}>Imprimir ficha</button> <NavLink to={`/ordens/${o.id}`}>Voltar à OP</NavLink>
        </p>
        </> : <>
        <div className={s.toolbar}>
        <NavLink to="/ordens">Voltar às OPs</NavLink>
        <NavLink to={`/ordens/${o.id}/imprimir`}>Ficha para impressão</NavLink>{o.unitId && <NavLink to={`/unidades/${o.unitId}`}>Abrir unidade</NavLink>}</div>
        <h2>{o.unit ? 'Transcrição' : 'Primeira transcrição'}</h2>
        <p>{o.unit ? 'Salvar alterações preserva a unidade e não baixa outra caixa.' : 'Pode salvar dados parciais. O chassi e os responsáveis podem permanecer pendentes.'}</p>
        <form onSubmit={e => { e.preventDefault(); if (o.unit)
            void save('update');
        else
            setAction('convert'); }}>
        <OrderFields value={fields} set={setFields} disabled={terminal || busy || op.locked}/>
        <fieldset className={s.formFields} disabled={terminal || busy || op.locked}>
        <Field label="Chassi (opcional)">
        <input maxLength={2000} spellCheck={false} value={chassis} onChange={e => setChassis(e.target.value)}/>
        </Field>{changedChassis && <Field label="Motivo da correção do chassi">
            <textarea required maxLength={2000} value={reason} onChange={e => setReason(e.target.value)}/>
            </Field>}</fieldset>
        <ErrorNotice error={action ? null : error}/>
        <ErrorNotice error={op.actor.error}/>{op.locked && <p>Resultado incerto. Os dados estão preservados; repita a mesma confirmação.</p>}{!terminal && <button type="submit" disabled={busy || !op.actor.data || (op.locked && op.pendingPath !== `/orders/${o.id}`)}>{o.unit ? 'Salvar alterações' : 'Iniciar transcrição e baixar 1 caixa'}</button>}</form>{!terminal && <div className={s.toolbar}>{o.unit && <>
                <button type="button" disabled={busy || op.locked || dirty || o.status === 'IN_PROGRESS'} onClick={() => setAction('IN_PROGRESS')}>Marcar em andamento</button>
                <button type="button" disabled={busy || op.locked || dirty} onClick={() => setAction('COMPLETED')}>Concluir registro da OP</button>
                </>}<button type="button" className={s.secondary} disabled={busy || op.locked || (!!o.unit && dirty)} onClick={() => { setReason(''); setOpened(''); setDiscardDraft(false); setAction('cancel'); }}>Cancelar OP</button>
            </div>}{!terminal && o.unit && dirty && <p role="status">Há alterações não salvas. Use Salvar alterações antes de mudar a situação ou cancelar a OP.</p>}</>}{o.unit && (print ? <p>ID interno da unidade: {o.unit.id}</p> : <UnitInfo unit={o.unit}/>)}<Origin id={o.originId} compact={print}/>{!print && <History items={o.history}/>} {action && <Modal title={action === 'convert' ? 'Confirmar individualização' : action === 'cancel' ? 'Cancelar OP' : 'Alterar situação administrativa'} description={action === 'convert' ? 'Esta confirmação baixa exatamente 1 caixa física, consome a reserva e cria uma unidade interna. O chassi pode ficar pendente.' : action === 'cancel' ? (o.unit ? 'A unidade e a baixa serão preservadas. Nenhuma caixa retorna ao estoque.' : 'A reserva será liberada. Informe se a caixa já foi aberta.') : 'Esta alteração encerra ou movimenta o registro administrativo. Não conclui montagem nem aprova qualidade.'} close={() => { if (!op.locked)
            setAction(null); }} busy={busy || op.locked}>{action === 'cancel' && <fieldset className={s.formFields} disabled={busy || op.locked}>
            <Field label="Motivo do cancelamento">
            <textarea required maxLength={2000} value={reason} onChange={e => setReason(e.target.value)}/>
            </Field>
            <Field label="Data do cancelamento">
            <input required type="date" value={date} onChange={e => setDate(e.target.value)}/>
            </Field>{!o.unit && <Field label="Condição física da caixa">
                <select required value={opened} onChange={e => setOpened(e.target.value)}>
                <option value="">Selecione a condição</option>
                <option value="closed">Caixa fechada — volta ao disponível</option>
                <option value="opened">Caixa já aberta — fica bloqueada</option>
                </select>
                </Field>}{dirty && !o.unit && <label className={s.check}><input type="checkbox" checked={discardDraft} onChange={e=>setDiscardDraft(e.target.checked)}/>Descartar os dados ainda não salvos desta transcrição ao cancelar a OP</label>}</fieldset>}<ErrorNotice error={error}/>{op.locked && <p>Resultado incerto. Repita com os mesmos dados para recuperar o resultado.</p>}<button type="button" disabled={busy || !op.actor.data || (action === 'cancel' && (!reason.trim() || !date || (!o.unit && (!opened || (dirty && !discardDraft)))))} onClick={() => void save(action)}>{action === 'convert' ? 'Confirmar baixa de 1 caixa' : action === 'cancel' ? 'Confirmar cancelamento' : 'Confirmar situação da OP'}</button>
        </Modal>}</article>;
}
