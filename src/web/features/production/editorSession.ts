import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { Stage, SelfCheck, ProductionSaveBody, StageActionBody } from '../../../shared/contracts/production';
import type { ProductionDto } from '../../../shared/contracts/production';
import type { Draft } from './model';

const nullable = Type.Union([Type.String(), Type.Null()]);
const minutes = Type.Union([Type.Number(), Type.Null()]);
const stageFields = Stage.properties;
const pauseFields = stageFields.pauses.items.properties;
const occurrenceFields = ProductionSaveBody.properties.occurrences.items.properties;
const draftFields = {
  stages: Type.Array(Type.Object({
    ...stageFields,
    pauses: Type.Array(Type.Object({ ...pauseFields, reason: Type.Union([pauseFields.reason, Type.Literal('')]) })),
  })),
  occurrences: Type.Array(Type.Object({ ...occurrenceFields, description: Type.String({ maxLength: 2000 }) })),
  selfCheck: SelfCheck,
};
const recordSchema = Type.Object({
  saved: Type.Object({
    orderId: Type.String(),
    unitId: Type.String(),
    version: Type.Integer({ minimum: 0 }),
    productionStatus: Type.Union([Type.Literal('WAITING'), Type.Literal('UNPACKING'), Type.Literal('ASSEMBLING'), Type.Literal('PAUSED'), Type.Literal('ASSEMBLED')]),
    ...draftFields,
    stages: Type.Array(Type.Object({
      ...stageFields,
      times: Type.Object({ grossMinutes: minutes, pauseMinutes: minutes, netMinutes: minutes, pending: Type.Boolean() }),
    })),
    totals: Type.Object({ netMinutes: minutes, knownNetMinutes: Type.Number(), pendingCount: Type.Number(), reworkKnownNetMinutes: Type.Number() }),
    template: Type.Object({
      version: Type.Literal(1),
      items: Type.Array(Type.Object({ code: Type.String({ pattern: '^2\\.[1-8]$' }), label: Type.String() })),
    }),
    history: Type.Array(Type.Object({
      id: Type.String(), actorId: Type.String(), kind: Type.String(), createdAt: Type.String(),
      reason: nullable, before: Type.Unknown(), after: Type.Unknown(),
    })),
  }),
  draft: Type.Object(draftFields),
  conflict: Type.Boolean(),
  pending: Type.Union([
    Type.Null(),
    Type.Object({ path: Type.String(), method: Type.Literal('PUT'), body: ProductionSaveBody }),
    Type.Object({ path: Type.String(), method: Type.Literal('POST'), body: StageActionBody }),
  ]),
});

export type Attempt = NonNullable<Static<typeof recordSchema>['pending']>;
export type EditorRecord = { saved: ProductionDto; draft: Draft; conflict: boolean; pending: Attempt | null };
export type StageAction = { kind: 'complete' | 'reopen'; stage: Draft['stages'][number] };

export function actionFrom(attempt: Attempt | null, saved: ProductionDto): StageAction | null {
  if (attempt?.method !== 'POST') return null;
  const stage = saved.stages.find(row => {
    const prefix = `/orders/${saved.orderId}/production/stages/${row.id}/`;
    return attempt.path === prefix + 'complete' || attempt.path === prefix + 'reopen';
  });
  return stage ? { stage, kind: attempt.path.endsWith('/reopen') ? 'reopen' : 'complete' } : null;
}

const keyOf = (saved: ProductionDto) => `me.production.v1/${saved.orderId}/${saved.unitId}`;
const fallback = new Map<string, EditorRecord | null>();

export function storeRecord(saved: ProductionDto, record: EditorRecord | null) {
  const key = keyOf(saved);
  try {
    if (record) sessionStorage.setItem(key, JSON.stringify(record));
    else sessionStorage.removeItem(key);
    fallback.delete(key);
    return false;
  } catch {
    fallback.set(key, record);
    return true;
  }
}

export function readRecord(initial: ProductionDto): { record: EditorRecord | null; storageError: boolean } {
  const key = keyOf(initial);
  if (fallback.has(key)) return { record: fallback.get(key) ?? null, storageError: true };
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return { record: null, storageError: false };
    const record: unknown = JSON.parse(raw);
    if (Value.Check(recordSchema, record) && record.saved.orderId === initial.orderId && record.saved.unitId === initial.unitId) {
      const restored = record as unknown as EditorRecord;
      const pending = restored.pending;
      if (!pending || (
        pending.body.version === restored.saved.version &&
        (pending.method === 'PUT'
          ? pending.path === `/orders/${initial.orderId}/production`
          : actionFrom(pending, restored.saved) !== null)
      )) return { record: restored, storageError: false };
    }
  } catch {
    return { record: null, storageError: true };
  }
  return { record: null, storageError: true };
}
