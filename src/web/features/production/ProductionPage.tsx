import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NavLink, useParams } from 'react-router-dom';
import type { OrderDetailDto } from '../../../shared/contracts/orders';
import type { ProductionDto, StageDto } from '../../../shared/contracts/production';
import { request, ApiError } from '../../lib/api';
import { Header, ErrorNotice, Field, Modal, color, useUnsavedChanges, useCommand } from '../common/Operational';
import { StageEditor } from './StageEditor';
import { Occurrences, SelfCheck, ProductionHistory } from './ProductionSections';
import { actionFrom, readRecord, storeRecord, type Attempt, type StageAction } from './editorSession';
import { draftOf, newStage, minutes, productionLabels, type Draft } from './model';
import s from '../../app/Operations.module.css';
import p from './Production.module.css';
export function ProductionPage() {
  const { id } = useParams();
  const order = useQuery({ queryKey: ['order', id], queryFn: () => request<OrderDetailDto>(`/orders/${id}`), retry: false });
  const production = useQuery({ queryKey: ['production', id], queryFn: () => request<ProductionDto>(`/orders/${id}/production`), enabled: !!order.data?.unitId, retry: false });
  return <>
    <Header title={`Produção${order.data ? ` · ${order.data.code}` : ''}`}>{order.data ? `${order.data.meCode} / ${order.data.commercialName ?? 'Modelo não informado'} / ${color(order.data.color)} / Chassi: ${order.data.unit?.chassis ?? 'pendente'}` : 'Consultando identificação da OP…'}
    </Header>
    <p>
      <NavLink to={`/ordens/${id}`}>Voltar à OP</NavLink>{order.data?.unitId && <> · <NavLink to={`/unidades/${order.data.unitId}`}>Abrir unidade</NavLink>
      </>}
    </p>
    <ErrorNotice error={order.error} />
    {order.isError && <button onClick={() => void order.refetch()}>Consultar OP novamente</button>}
    {order.data && !order.data.unitId && <p className={p.notice}>Individualize a unidade na primeira transcrição da OP antes de registrar produção. <NavLink to={`/ordens/${id}`}>Abrir primeira transcrição</NavLink>
    </p>}
    {production.isFetching && !production.data && <p role="status">Consultando produção…</p>}<ErrorNotice error={production.error} />
    {production.isError && <button onClick={() => void production.refetch()}>Consultar produção novamente</button>}
    {production.data && order.data && <ProductionEditor key={id} initial={production.data} cancelled={order.data.status === 'CANCELLED'} />}
  </>;
}
function ProductionEditor({ initial, cancelled }: {
  initial: ProductionDto;
  cancelled: boolean;
}) {
  const [restored] = useState(() => readRecord(initial));
  const [saved, setSaved] = useState(restored.record?.saved ?? initial);
  const [draft, setDraft] = useState<Draft>(() => restored.record?.draft ?? draftOf(initial));
  const [pending, setPending] = useState(restored.record?.pending ?? null);
  const [conflict, setConflict] = useState(restored.record?.conflict ?? false);
  const [recovered, setRecovered] = useState(!!restored.record);
  const [storageError, setStorageError] = useState(restored.storageError);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [action, setAction] = useState<StageAction | null>(() => actionFrom(pending, saved));
  const [reason, setReason] = useState(pending?.method === 'POST' ? pending.body.reason ?? '' : '');
  const { actor, command } = useCommand();
  const client = useQueryClient();
  const path = `/orders/${saved.orderId}/production`;
  const dirty = JSON.stringify(draft) !== JSON.stringify(draftOf(saved));
  const mounted = useRef(false);
  const writing = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (!dirty && !action && !pending && !busy && !conflict && initial !== saved) {
      setSaved(initial);
      setDraft(draftOf(initial));
    }
  }, [initial, saved, dirty, action, pending, busy, conflict]);
  useUnsavedChanges(dirty || !!pending || busy || conflict,
    storageError ? 'Sair desta tela? A recuperação automática pode ficar indisponível.' : 'Sair desta tela? Você poderá retomar esta edição ao voltar.');
  const disabled = cancelled || busy || !!pending || conflict;
  const completed = draft.stages.some(x => x.kind === 'ASSEMBLY' && x.state === 'COMPLETED');

  function persist(nextDraft: Draft, attempt: Attempt | null, needsRecovery: boolean) {
    const changed = JSON.stringify(nextDraft) !== JSON.stringify(draftOf(saved));
    setStorageError(storeRecord(saved, changed || attempt || needsRecovery ? { saved, draft: nextDraft, pending: attempt, conflict: needsRecovery } : null));
  }
  function changeDraft(nextDraft: Draft) {
    setDraft(nextDraft);
    persist(nextDraft, null, false);
  }
  function accept(data: ProductionDto) {
    setStorageError(storeRecord(saved, null));
    setSaved(data);
    setDraft(draftOf(data));
    setPending(null);
    setConflict(false);
    setRecovered(false);
    setAction(null);
    setReason('');
    client.setQueryData(['production', saved.orderId], data);
    for (const key of ['order', 'units', 'unit'])
      void client.invalidateQueries({ queryKey: [key] });
  }
  async function submit() {
    if (writing.current || conflict || (!pending && (cancelled || !actor.data))) return;
    writing.current = true;
    setBusy(true);
    setError(null);
    try {
      const attempt: Attempt = pending ?? (action ? {
        path: `${path}/stages/${action.stage.id}/${action.kind}`,
        method: 'POST',
        body: { ...command(), version: saved.version, ...(action.kind === 'reopen' ? { reason } : {}) },
      } : {
        path, method: 'PUT', body: { ...command(), version: saved.version, ...draft },
      });
      persist(draft, attempt, false);
      setPending(attempt);
      const receipt = await request<ProductionDto>(attempt.path, attempt.body, attempt.method);
      // A replacement editor may already own the record. Leave the frozen command
      // available for explicit replay if this response arrives after navigation.
      if (!mounted.current) return;
      const cached = client.getQueryData<ProductionDto>(['production', saved.orderId]);
      let latest = receipt;
      if (receipt.version < (cached?.version ?? saved.version)) {
        try {
          latest = await request<ProductionDto>(path);
        }
        catch {
          if (mounted.current)
            setError(new Error('A confirmação foi recebida, mas a consulta da versão atual falhou. Repita a confirmação para consultar novamente.'));
          return;
        }
      }
      if (!mounted.current) return;
      accept(latest);
      setNotice(action ? `Etapa ${action.kind === 'complete' ? 'concluída' : 'reaberta'}.` : 'Produção salva.');
    }
    catch (e) {
      if (!mounted.current) return;
      if (e instanceof ApiError && !e.ambiguous) {
        const needsRecovery = e.code === 'VERSION_CONFLICT';
        persist(draft, null, needsRecovery);
        setPending(null);
        setConflict(needsRecovery);
        if (needsRecovery) setAction(null);
      }
      setError(e as Error);
    }
    finally {
      writing.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function reload() {
    if (writing.current || pending || !window.confirm('Descartar seu rascunho e consultar a versão salva?'))
      return;
    writing.current = true;
    setBusy(true);
    try {
      const latest = await request<ProductionDto>(path);
      if (!mounted.current) return;
      accept(latest);
      setError(null);
      setNotice('Versão salva consultada.');
    }
    catch (e) {
      if (mounted.current) setError(e as Error);
    }
    finally {
      writing.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return <>
    <p>Situação da produção: <strong>{productionLabels[saved.productionStatus]}
    </strong>. Qualidade e situação administrativa da OP são independentes.</p>
    {cancelled && <p className={p.notice}>OP cancelada: produção somente para consulta.</p>}
    <dl className={p.times}>
      <div>
        <dt>Total líquido registrado</dt>
        <dd>{minutes(saved.totals.netMinutes)}
        </dd>
      </div>
      <div>
        <dt>Subtotal líquido conhecido</dt>
        <dd>{minutes(saved.totals.knownNetMinutes)}
        </dd>
      </div>
      <div>
        <dt>Retrabalho conhecido</dt>
        <dd>{minutes(saved.totals.reworkKnownNetMinutes)}
        </dd>
      </div>
    </dl>
    <p>{saved.totals.pendingCount} execução(ões) com tempo pendente. Os cálculos usam somente os dados salvos; início e término incluem a data, inclusive ao atravessar meia-noite.</p>
    {notice && <p role="status" className={s.success}>{notice}
    </p>}<ErrorNotice error={action ? null : error} />
    <ErrorNotice error={actor.error} />
    {storageError && <p role="alert" className={p.notice}>A recuperação pelo armazenamento da aba está indisponível. Mantenha o aplicativo aberto até confirmar ou descartar a edição.</p>}
    {recovered && <p role="status" className={p.notice}>Edição recuperada nesta aba.</p>}
    {(conflict || dirty) && !pending && <p>{conflict && 'A versão salva mudou. Seu rascunho foi preservado. '}<button type="button" disabled={busy} onClick={() => void reload()}>Descartar rascunho e consultar versão salva</button>
    </p>}
    {pending && <p role="status" className={p.notice}>{busy ? 'Confirmando operação…' : 'Resultado incerto. Os campos e a confirmação foram preservados. Repita a confirmação para recuperar o resultado.'}</p>}
    <form onSubmit={e => { e.preventDefault(); if (!action) void submit(); }}>
      {(!cancelled || pending) && <div className={p.actions}>
        <button type="submit" disabled={busy || conflict || (!pending && !actor.data) || !!action}>{pending ? 'Repetir confirmação' : 'Salvar produção'}
        </button>
        <span role="status">{dirty ? 'Alterações não salvas. Salve antes de concluir ou reabrir etapas.' : 'Dados salvos; conclusão somente por confirmação explícita.'}
        </span>
      </div>}
      <div className={p.actions}>{(['UNPACKING', 'ASSEMBLY', 'REWORK'] as const).map(kind => !cancelled && (kind === 'REWORK' || !draft.stages.some(x => x.kind === kind)) && <button
        type="button"
        key={kind}
        className={s.secondary}
        disabled={disabled}
        onClick={() => changeDraft({ ...draft, stages: [...draft.stages, newStage(kind)] })}>Adicionar {kind === 'UNPACKING' ? 'desembalagem' : kind === 'ASSEMBLY' ? 'montagem' : 'retrabalho'}
      </button>)}
      </div>
      {draft.stages.map((stage, index) => <StageEditor
        key={stage.id}
        stage={stage}
        index={draft.stages.slice(0, index + 1).filter(x => x.kind === 'REWORK').length}
        disabled={disabled}
        actionDisabled={disabled || dirty || !saved.stages.some(x => x.id === stage.id) || !actor.data}
        savedStage={saved.stages.find(x => x.id === stage.id)}
        removeBlocked={draft.occurrences.some(x => x.stageId === stage.id)}
        remove={!saved.stages.some(x => x.id === stage.id)
          ? () => changeDraft({ ...draft, stages: draft.stages.filter(x => x.id !== stage.id) }) : undefined}
        occurrences={draft.occurrences}
        change={next => changeDraft({ ...draft, stages: draft.stages.map(x => x.id === next.id ? next : x) })}
        action={(kind, stage) => { setReason(''); setError(null); setAction({ kind, stage }); }} />)}
      {completed && <p className={p.notice}>Montagem concluída: reabra a etapa com motivo para alterar a autoconferência ou registrar ocorrências pendentes. Ocorrências já resolvidas podem ser registradas.</p>}
      <SelfCheck
        value={draft.selfCheck}
        template={saved.template}
        disabled={disabled || completed}
        change={selfCheck => changeDraft({ ...draft, selfCheck })} />
      <Occurrences
        items={draft.occurrences}
        completed={completed}
        savedItems={saved.occurrences}
        remove={id => changeDraft({
          ...draft,
          occurrences: draft.occurrences.filter(x => x.id !== id),
          stages: draft.stages.map(x => x.occurrenceId === id ? { ...x, occurrenceId: null } : x),
        })}
        stages={draft.stages}
        disabled={disabled}
        change={occurrences => changeDraft({ ...draft, occurrences })} />

    </form>
    <ProductionHistory items={saved.history} />
    {action && <Modal
      title={action.kind === 'complete' ? 'Concluir etapa' : 'Reabrir etapa'}
      description={action.kind === 'complete' ? 'Confirme a conclusão operacional. O sistema validará horários, pausas e responsável; montagem também exige autoconferência e ocorrências resolvidas. Qualidade final não será alterada.' : 'Informe o motivo. A conclusão anterior permanece no histórico.'}
      close={() => {
        if (!pending)
          setAction(null);
      }}
      busy={busy || !!pending}>
      {action.kind === 'reopen' && <Field label="Motivo da reabertura">
        <textarea required maxLength={2000} disabled={busy || !!pending} value={reason} onChange={e => setReason(e.target.value)} />
      </Field>}
      <ErrorNotice error={error} />
      {pending && <p>Resultado incerto. Repita a mesma confirmação.</p>}
      <button type="button" disabled={busy || (!pending && !actor.data) || (action.kind === 'reopen' && !reason.trim())} onClick={() => void submit()}>{pending ? 'Repetir confirmação' : action.kind === 'complete' ? 'Confirmar conclusão' : 'Confirmar reabertura'}
      </button>
    </Modal>}
  </>;
}
