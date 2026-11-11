import type { ProductionDto, StageDto, ProductionStatus } from '../../../shared/contracts/production';
export const productionLabels: Record<ProductionStatus, string> = { WAITING: 'Aguardando', UNPACKING: 'Em desembalagem', ASSEMBLING: 'Em montagem', PAUSED: 'Pausada', ASSEMBLED: 'Montada' };
export const stageLabels = { UNPACKING: 'Desembalagem', ASSEMBLY: 'Montagem', REWORK: 'Retrabalho' };
export const states = { WAITING: 'Aguardando', IN_PROGRESS: 'Em andamento', PAUSED: 'Pausada', COMPLETED: 'Concluída' };
export const reasons = { BREAK: 'Almoço / intervalo', DAMAGED_PART: 'Peça danificada', MISSING_PART: 'Peça faltante', REWORK: 'Ajuste / retrabalho', EQUIPMENT: 'Ferramenta / equipamento', OPERATIONAL_WAIT: 'Espera operacional', OTHER: 'Outros' };
export const occurrenceLabels = { DAMAGED_PART: 'Peça danificada', MISSING_PART: 'Peça faltante', ELECTRICAL: 'Problema elétrico', ASSEMBLY: 'Problema de montagem', COSMETIC: 'Avaria estética', ADJUSTMENT: 'Ajuste necessário', OTHER: 'Outros' };
export const answerLabels = { UNASSESSED: 'Não avaliado', CONFORMING: 'Conforme', NONCONFORMING: 'Não conforme', NOT_APPLICABLE: 'Não aplicável' };
export type Draft = {
  stages: StageDto[];
  occurrences: ProductionDto['occurrences'];
  selfCheck: ProductionDto['selfCheck'];
};
export function draftOf(data: ProductionDto): Draft { return { stages: data.stages.map(({ times: _, ...stage }) => stage), occurrences: data.occurrences, selfCheck: data.selfCheck }; }
export function newStage(kind: StageDto['kind']): StageDto { return { id: crypto.randomUUID(), kind, state: 'WAITING', civilDate: null, startAt: null, endAt: null, responsible: null, notes: null, occurrenceId: null, pauses: [] }; }
export const minutes = (n: number | null) => n === null ? 'Pendente' : `${Math.floor(n / 60)}h ${String(n % 60).padStart(2, '0')}min`;
export const nullable = (s: string) => s || null;
