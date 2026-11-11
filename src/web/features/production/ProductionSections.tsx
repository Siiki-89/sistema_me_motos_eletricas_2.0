import type { OccurrenceDto, StageDto, SelfCheckDto, ProductionDto } from '../../../shared/contracts/production';
import { Field } from '../common/Operational';
import { occurrenceLabels, stageLabels, answerLabels, nullable, reasons, states } from './model';
import s from '../../app/Operations.module.css';
import p from './Production.module.css';
export function Occurrences({ items, stages, disabled, completed, savedItems, change, remove }: {
  items: OccurrenceDto[];
  stages: StageDto[];
  disabled: boolean;
  completed: boolean;
  savedItems: OccurrenceDto[];
  remove: (id: string) => void;
  change: (v: OccurrenceDto[]) => void;
}) {
  return <section className={p.section}>
    <h2>Ocorrências</h2>
    <p>Problemas e ações registradas nesta OP. Não movimentam estoque de peças.</p>
    <fieldset disabled={disabled} className={s.formFields}>
      {items.map((o, i) => {
        const set = (key: keyof OccurrenceDto, value: unknown) => change(items.map(x => x.id === o.id ? { ...x, [key]: value } : x));
        return <fieldset className={p.pause} key={o.id}>
          <legend>Ocorrência {i + 1}
          </legend>
          <div className={s.grid}>
            <Field label={`Tipo — ocorrência ${i + 1}`}>
              <select value={o.type} onChange={e => set('type', e.target.value)}>{Object.entries(occurrenceLabels).map(([k, label]) => <option key={k} value={k}>{label}
              </option>)}
              </select>
            </Field>
            <Field label={`Etapa — ocorrência ${i + 1}`}>
              <select value={o.stageId ?? ''} onChange={e => set('stageId', nullable(e.target.value))}>
                <option value="">OP / unidade</option>{stages.map((stage, j) => <option key={stage.id} value={stage.id}>{stageLabels[stage.kind]}{stage.kind === 'REWORK' ? ' ' + stages.slice(0, j + 1).filter(row => row.kind === 'REWORK').length : ''}
                </option>)}
              </select>
            </Field>
            <Field label={`Componente — ocorrência ${i + 1}`}>
              <input maxLength={2000} value={o.component ?? ''} onChange={e => set('component', nullable(e.target.value))} />
            </Field>
            <Field label={`Data e hora — ocorrência ${i + 1}`}>
              <input required type="datetime-local" value={o.occurredAt ?? ''} onChange={e => set('occurredAt', nullable(e.target.value))} />
            </Field>
            <Field label={`Responsável pelo registro — ocorrência ${i + 1}`}>
              <input maxLength={2000} value={o.recordedBy ?? ''} onChange={e => set('recordedBy', nullable(e.target.value))} />
            </Field>
            <Field label={`Situação — ocorrência ${i + 1}`}>
              <select value={o.status} onChange={e => set('status', e.target.value)}>
                <option value="OPEN" disabled={completed}>Aberta</option>
                <option value="IN_PROGRESS" disabled={completed}>Em andamento</option>
                <option value="RESOLVED">Resolvida</option>
              </select>
            </Field>
            {(['description', 'plannedDestination', 'requiredAction', 'resolution', 'notes'] as const).map(key => <Field
              key={key}
              label={`${({ description: 'Descrição do problema', plannedDestination: 'Destino previsto', requiredAction: 'Ação necessária', resolution: 'Ação realizada', notes: 'Observações' })[key]} — ocorrência ${i + 1}`}>
              <textarea
                maxLength={2000}
                required={key === 'description' || (key === 'resolution' && o.status === 'RESOLVED')}
                value={o[key] ?? ''}
                onChange={e => set(key, key === 'description' ? e.target.value : nullable(e.target.value))} />
            </Field>)}
            <Field label={`Item de autoconferência — ocorrência ${i + 1}`}>
              <select value={o.checklistItemCode ?? ''} onChange={e => set('checklistItemCode', nullable(e.target.value))}>
                <option value="">Sem vínculo</option>{Array.from({ length: 8 }, (_, j) => <option key={j} value={`2.${j + 1}`}>2.{j + 1}
                </option>)}
              </select>
            </Field>
          </div>
          {!savedItems.some(row => row.id === o.id) && <button type="button" className={s.secondary}
            onClick={() => remove(o.id)}>Remover ocorrência {i + 1}</button>}
        </fieldset>;
      })}
      <button
        type="button"
        className={s.secondary}
        onClick={() => change([...items, { id: crypto.randomUUID(), stageId: null, type: 'OTHER', component: null, description: '', occurredAt: null, recordedBy: null, status: completed ? 'RESOLVED' : 'OPEN', plannedDestination: null, requiredAction: null, resolution: null, notes: null, checklistItemCode: null }])}>Adicionar ocorrência</button>
    </fieldset>
  </section>;
}
export function SelfCheck({ value, template, disabled, change }: {
  value: SelfCheckDto;
  template: ProductionDto['template'];
  disabled: boolean;
  change: (v: SelfCheckDto) => void;
}) {
  return <section className={p.section}>
    <h2>Autoconferência do mecânico</h2>
    <p>Modelo da ficha versão {template.version}. Não avaliado permanece pendente. Esta conferência não aprova a qualidade final.</p>
    <fieldset disabled={disabled} className={s.formFields}>{template.items.map(item => {
      const answer = value.answers.find(a => a.code === item.code) ?? { code: item.code, state: 'UNASSESSED' as const, notes: null };
      const update = (key: string, next: string | null) => change({ ...value, answers: template.items.map(i => i.code === item.code ? { ...answer, [key]: next } : value.answers.find(a => a.code === i.code) ?? { code: i.code, state: 'UNASSESSED', notes: null }) });
      return <div key={item.code} className={p.checkItem}>
        <h3 id={'self-check-' + item.code}>{item.code} {item.label}
        </h3>
        <div className={s.grid}>
          <Field label={`Avaliação ${item.code}`}>
            <select aria-describedby={'self-check-' + item.code} value={answer.state} onChange={e => update('state', e.target.value)}>{Object.entries(answerLabels).map(([k, label]) => <option key={k} value={k}>{label}
            </option>)}
            </select>
          </Field>
          <Field label={`Observação ${item.code}`}>
            <textarea aria-describedby={'self-check-' + item.code} maxLength={2000} value={answer.notes ?? ''} onChange={e => update('notes', nullable(e.target.value))} />
          </Field>
        </div>{answer.state === 'NONCONFORMING' && <p>Pendência: não conformidade impede a conclusão da montagem.</p>}
        {answer.state === 'NOT_APPLICABLE' && !answer.notes?.trim() && <p>Pendência: justifique por que este item não se aplica.</p>}
      </div>;
    })}
    </fieldset>
  </section>;
}
function snapshot(value: unknown) {
  const v = value as {
    stages?: StageDto[];
    occurrences?: OccurrenceDto[];
    selfCheck?: SelfCheckDto;
  } | null;
  return v && typeof v === 'object' ? v : null;
}
function changes(fields: [string, string | null | undefined, string | null | undefined][]) {
  return fields.flatMap(([label, before, after]) => (before ?? null) === (after ?? null)
    ? [] : [`${label}: ${before ?? 'sem registro'} → ${after ?? 'sem registro'}`]).join(' · ');
}

function pauseSummary(stage?: StageDto) {
  return stage?.pauses.map(pause => [
    pause.startAt ?? 'início pendente',
    pause.endAt ?? 'fim pendente',
    reasons[pause.reason],
    pause.notes,
  ].filter(Boolean).join(' / ')).join(' · ') || null;
}

const occurrenceStates = { OPEN: 'aberta', IN_PROGRESS: 'em andamento', RESOLVED: 'resolvida' };
export function ProductionHistory({ items }: {
  items: ProductionDto['history'];
}) {
  return <details className={p.history}>
    <summary>Histórico da produção ({items.length})</summary>{!items.length && <p>Nenhuma alteração salva.</p>}<ol>{items.map(h => {
      const before = snapshot(h.before), after = snapshot(h.after);
      return <li key={h.id}>
        <strong>{({ SAVED: 'Produção salva', COMPLETED: 'Etapa concluída', REOPENED: 'Etapa reaberta' } as Record<string, string>)[h.kind] ?? 'Produção atualizada'}
        </strong>
        <p>{new Date(h.createdAt).toLocaleString('pt-BR')} · {h.actorId === 'local-operator' ? 'Operador local' : h.actorId}
        </p>{h.reason && <p>Motivo: {h.reason}
        </p>}
        {after?.stages?.map(stage => {
          const old = before?.stages?.find(x => x.id === stage.id);
          const details = changes([
            ['Data da ficha', old?.civilDate, stage.civilDate],
            ['Início', old?.startAt, stage.startAt],
            ['Término', old?.endAt, stage.endAt],
            ['Responsável', old?.responsible, stage.responsible],
            ['Situação', old && states[old.state], states[stage.state]],
            ['Observações', old?.notes, stage.notes],
            ['Pausas', pauseSummary(old), pauseSummary(stage)],
            ['Ocorrência vinculada', before?.occurrences?.find(o => o.id === old?.occurrenceId)?.description,
              after.occurrences?.find(o => o.id === stage.occurrenceId)?.description],
          ]);
          return details && <p key={stage.id}>{stageLabels[stage.kind]} · {details}</p>;
        })}
        {after?.occurrences?.map(o => {
          const old = before?.occurrences?.find(x => x.id === o.id);
          const oldStage = before?.stages?.find(stage => stage.id === old?.stageId);
          const nextStage = after.stages?.find(stage => stage.id === o.stageId);
          const details = changes([
            ['Problema', old?.description, o.description],
            ['Situação', old && occurrenceStates[old.status], occurrenceStates[o.status]],
            ['Ação realizada', old?.resolution, o.resolution],
            ['Ação necessária', old?.requiredAction, o.requiredAction],
            ['Componente', old?.component, o.component],
            ['Data e hora', old?.occurredAt, o.occurredAt],
            ['Responsável', old?.recordedBy, o.recordedBy],
            ['Tipo', old && occurrenceLabels[old.type], occurrenceLabels[o.type]],
            ['Destino previsto', old?.plannedDestination, o.plannedDestination],
            ['Observações', old?.notes, o.notes],
            ['Etapa', oldStage && stageLabels[oldStage.kind], nextStage && stageLabels[nextStage.kind]],
            ['Item da autoconferência', old?.checklistItemCode, o.checklistItemCode],
          ]);
          return details && <p key={o.id}>Ocorrência{old && old.description === o.description ? ` — ${o.description}` : ''} · {details}</p>;
        })}
        {after?.selfCheck?.answers.map(a => {
          const old = before?.selfCheck?.answers.find(x => x.code === a.code);
          const details = changes([
            ['Avaliação', old && answerLabels[old.state], answerLabels[a.state]],
            ['Observação', old?.notes, a.notes],
          ]);
          return details && <p key={a.code}>Item {a.code}: {old ? details : `${answerLabels[a.state]}${a.notes ? ' · ' + a.notes : ''}`}</p>;
        })}
      </li>;
    })}
    </ol>
  </details>;
}
