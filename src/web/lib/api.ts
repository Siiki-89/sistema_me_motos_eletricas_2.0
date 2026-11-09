export interface Health { app: string; version: string; status: string; database: { status: string; schemaVersion: number }; startedAt: string }
export interface Backup { id: string; createdAt: string; schemaVersion: number; sizeBytes: number }

// Only fixed, relative application endpoints are used. Browser supplies Origin.
export async function request<T>(path: string, body?: unknown): Promise<T> {
  let headers: Record<string, string> = {};
  if (body !== undefined) {
    const session = await request<{ csrfToken: string }>('/session');
    headers = { 'Content-Type': 'application/json', 'x-csrf-token': session.csrfToken };
  }
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, { credentials: 'same-origin', ...(body !== undefined ? { method: 'POST', headers, body: JSON.stringify(body) } : {}) });
  } catch {
    throw new Error('O serviço local não respondeu. Verifique se o aplicativo está aberto e tente novamente.');
  }
  if (!response.ok) {
    // Server details may contain technical internals; expose safe action guidance.
    const messages: Record<string, string> = {
      '/health': 'Não foi possível verificar o serviço local.',
      '/session': 'Não foi possível iniciar uma sessão local. Tente novamente.',
      '/backups': body === undefined ? 'Não foi possível consultar as cópias locais.' : 'Não foi possível criar a cópia. Tente novamente.',
      '/restore': 'Não foi possível restaurar a cópia. Seus dados de confirmação foram mantidos para uma nova tentativa.',
    };
    throw new Error(messages[path] ?? 'Não foi possível validar a cópia. Tente novamente antes de restaurar.');
  }
  return response.json() as Promise<T>;
}
