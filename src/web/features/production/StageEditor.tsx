import type { StageDto, OccurrenceDto, TimeDto } from '../../../shared/contracts/production';
import { Field } from '../common/Operational';
import { reasons, stageLabels, states, nullable, minutes } from './model';
import s from '../../app/Operations.module.css';
import p from './Production.module.css';
type Props = {
  stage: StageDto;
  index: number;
  disabled: boolean;
  actionDisabled: boolean;
  savedStage?: StageDto & { times: TimeDto };
  remove?: () => void;
  removeBlocked: boolean;
  occurrences: OccurrenceDto[];
  change: (v: StageDto) => void;
  action: (a: 'complete' | 'reopen', stage: StageDto) => void;
};
export function StageEditor({ stage: v, index, disabled, actionDisabled, savedStage, remove, removeBlocked, occurrences, change, action }: Props) {
  const title = stageLabels[v.kind] + (v.kind === 'REWORK' ? ` ${index}` : '');
  const times = savedStage?.times;
  const locked = disabled || v.state === 'COMPLETED';
  const set = (key: keyof StageDto, value: unknown) => change({ ...v, [key]: value });
  return <section className={p.section} aria-label={title}>
    <div className={p.heading}>
      <h2>{title}
      </h2>
      <span>{states[v.state]}
      </span>
    </div>
    {times && <p>Último cálculo salvo: bruto {minutes(times.grossMinutes)} · pausas {minutes(times.pauseMinutes)} · líquido {minutes(times.netMinutes)}
    </p>}
    <fieldset disabled={locked} className={s.formFields}>
      <div className={s.grid}>
        <Field label={`Data da ficha — ${title}`}>
          <input type="date" value={v.civilDate ?? ''} onChange={e => set('civilDate', nullable(e.target.value))} />
        </Field>
        <Field label={`Responsável — ${title}`}>
          <input maxLength={2000} value={v.responsible ?? ''} onChange={e => set('responsible', nullable(e.target.value))} />
        </Field>
        <Field label={`Início (data e hora) — ${title}`}>
          <input type="datetime-local" value={v.startAt ?? ''} onChange={e => set('startAt', nullable(e.target.value))} />
        </Field>
        <Field label={`Término (data e hora) — ${title}`}>
          <input type="datetime-local" value={v.endAt ?? ''} onChange={e => set('endAt', nullable(e.target.value))} />
        </Field>
        <Field label={`Situação — ${title}`}>
          <select value={v.state} onChange={e => set('state', e.target.value)}>{Object.entries(states).filter(([key]) => key !== 'COMPLETED' || v.state === 'COMPLETED').map(([k, label]) => <option key={k} value={k}>{label}
          </option>)}
          </select>
        </Field>
        {v.kind === 'REWORK' && <Field label={`Ocorrência vinculada — ${title}`}>
          <select value={v.occurrenceId ?? ''} onChange={e => set('occurrenceId', nullable(e.target.value))}>
            <option value="">Sem vínculo</option>{occurrences.map(o => <option key={o.id} value={o.id}>{o.description || 'Ocorrência em rascunho'}
            </option>)}
          </select>
        </Field>}
      </div>
      <Field label={`Observações — ${title}`}>
        <textarea maxLength={2000} value={v.notes ?? ''} onChange={e => set('notes', nullable(e.target.value))} />
      </Field>
      <h3>Pausas de {title.toLowerCase()}
      </h3>
      {v.pauses.length === 0 && <p>Nenhuma pausa registrada.</p>}
      {v.pauses.map((pause, i) => {
        const update = (key: string, value: unknown) => set('pauses', v.pauses.map(x => x.id === pause.id ? { ...x, [key]: value } : x));
        return <fieldset key={pause.id} className={p.pause}>
          <legend>Pausa {i + 1}
          </legend>
          <div className={s.grid}>
            <Field label={`Início da pausa ${i + 1} — ${title}`}>
              <input type="datetime-local" value={pause.startAt ?? ''} onChange={e => update('startAt', nullable(e.target.value))} />
            </Field>
            <Field label={`Término da pausa ${i + 1} — ${title}`}>
              <input type="datetime-local" value={pause.endAt ?? ''} onChange={e => update('endAt', nullable(e.target.value))} />
            </Field>
            <Field label={`Motivo da pausa ${i + 1} — ${title}`}>
              <select required value={pause.reason} onChange={e => update('reason', e.target.value)}>
                <option value="">Selecione o motivo</option>{Object.entries(reasons).map(([k, label]) => <option key={k} value={k}>{label}
                </option>)}
              </select>
            </Field>
            <Field label={`Observação da pausa ${i + 1} — ${title}`}>
              <input maxLength={2000} value={pause.notes ?? ''} onChange={e => update('notes', nullable(e.target.value))} />
            </Field>
          </div>
          {!savedStage?.pauses.some(row => row.id === pause.id) && <button type="button" className={s.secondary}
            onClick={() => set('pauses', v.pauses.filter(row => row.id !== pause.id))}>Remover pausa {i + 1} — {title}</button>}
        </fieldset>;
      })}
      <button
        type="button"
        className={s.secondary}
        onClick={() => set('pauses', [...v.pauses, { id: crypto.randomUUID(), startAt: null, endAt: null, reason: '', notes: null }])}>Adicionar pausa — {title}
      </button>
    </fieldset>
    {!disabled && <div className={p.actions}>
      {remove && <>
        <button type="button" className={s.secondary} disabled={removeBlocked} onClick={remove}>Remover {title}</button>
        {removeBlocked && <span>Desvincule as ocorrências para remover esta etapa.</span>}
      </>}
      <button type="button" disabled={actionDisabled} onClick={() => action(v.state === 'COMPLETED' ? 'reopen' : 'complete', v)}>{v.state === 'COMPLETED' ? 'Reabrir' : 'Concluir'} {title}
      </button>
    </div>}
  </section>;
}
