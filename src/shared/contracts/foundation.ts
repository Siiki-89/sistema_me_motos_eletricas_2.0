import { Type, type Static } from '@sinclair/typebox';
export const EmptyBody = Type.Object({}, { additionalProperties: false });
export const BackupId = Type.String({ pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' });
export const BackupParams = Type.Object({ id: BackupId }, { additionalProperties: false });
export const RestoreBody = Type.Object({ backupId: BackupId, confirmation: Type.Literal('RESTAURAR') }, { additionalProperties: false });
export type RestoreRequest = Static<typeof RestoreBody>;
export interface HealthResponse { app: 'me-estoque'; version: '0.1.0'; instanceId: string; status: 'ok'; database: { status: 'ready'; schemaVersion: number }; startedAt: string }
export interface BackupItem { id: string; createdAt: string; schemaVersion: number; sizeBytes: number }
export interface ApiError { error: { code: string; message: string; fields?: Record<string, string> }; requestId: string }
