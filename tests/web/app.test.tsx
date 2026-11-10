import React from 'react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '../../src/web/app/App';

const backup = { id: 'backup-1', createdAt: '2026-11-08T12:00:00.000Z', schemaVersion: 1, sizeBytes: 4096 };
const health = { app: 'me-estoque', version: '0.1.0', status: 'ok', database: { status: 'ready', schemaVersion: 1 }, startedAt: '2026-11-08T12:00:00.000Z' };
let healthFails = false;
let createFails = false;
let restoreFails = false;
let items: typeof backup[] = [];
let restoreCount = 0;
function mount(path = '/') {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={[path]}><App /></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => {
  healthFails = false; createFails = false; restoreFails = false; items = []; restoreCount = 0;
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const path = String(input);
    const error = (message: string) => Response.json({ error: { code: 'TEST_ERROR', message }, requestId: 'req-test' }, { status: 503 });
    if (path === '/api/v1/health') return healthFails ? error('Não foi possível verificar o serviço local.') : Response.json(health);
    if (path === '/api/v1/session') return Response.json({ csrfToken: 'test-token' });
    if (init?.method === 'POST') {
      if (new Headers(init.headers).get('x-csrf-token') !== 'test-token' || init.credentials !== 'same-origin') return error('Sessão inválida.');
      if (path === '/api/v1/backups') { if (createFails) return error('Não foi possível criar a cópia.'); items = [backup]; return Response.json(backup, { status: 201 }); }
      if (path === '/api/v1/backups/backup-1/validate') return Response.json({ ...backup, valid: true });
      if (path === '/api/v1/restore') { restoreCount++; const body = JSON.parse(String(init.body)); if (body.backupId !== 'backup-1' || body.confirmation !== 'RESTAURAR') return error('Confirmação inválida.'); return restoreFails ? error('Não foi possível restaurar a cópia.') : Response.json({ restored: true, safetyBackupId: 'safety-1' }); }
    }
    if (path === '/api/v1/backups') return Response.json({ items });
    throw new Error(`Unexpected endpoint: ${path}`);
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('fundação local', () => {
  it('mostra carregamento e a conexão real quando a verificação termina', async () => {
    mount(); expect(screen.getByRole('status')).toHaveTextContent(/verificando/i);
    expect(await screen.findByText('Serviço local disponível')).toBeVisible();
    expect(screen.getByText(/banco de dados pronto/i)).toBeVisible();
  });
  it('permite recuperar uma verificação que falhou', async () => {
    healthFails = true; mount(); await screen.findByRole('alert'); healthFails = false;
    await userEvent.click(screen.getByRole('button', { name: /verificar novamente/i }));
    expect(await screen.findByText('Serviço local disponível')).toBeVisible();
  });
  it('não anuncia conexão disponível com resultado antigo após falha', async () => {
    mount(); await screen.findByText('Serviço local disponível');
    healthFails = true;
    await userEvent.click(screen.getByRole('button', { name: /verificar novamente/i }));
    await screen.findByRole('alert');
    expect(screen.queryByText('Serviço local disponível')).not.toBeInTheDocument();
  });
  it('oferece navegação por teclado até a proteção e permite criar uma cópia real', async () => {
    mount(); const user = userEvent.setup(); await user.tab(); expect(screen.getByText('Pular para o conteúdo')).toHaveFocus();
    for (let index=0; index<10 && document.activeElement!==screen.getByRole('link', {name:'Proteção dos dados'}); index++) await user.tab(); expect(screen.getByRole('link', { name: 'Proteção dos dados' })).toHaveFocus(); await user.keyboard('{Enter}');
    expect(await screen.findByText('Nenhuma cópia local disponível.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Criar cópia agora' }));
    expect(await screen.findByText('Cópia criada com sucesso.')).toBeVisible();
    expect(screen.getByRole('button', { name: /validar e restaurar/i })).toBeVisible();
  });
  it('explica falha de criação e permite tentar novamente', async () => {
    createFails = true; mount('/protecao-dos-dados'); await screen.findByText('Nenhuma cópia local disponível.');
    await userEvent.click(screen.getByRole('button', { name: 'Criar cópia agora' })); expect(await screen.findByRole('alert')).toHaveTextContent(/criar a cópia/i);
    createFails = false; await userEvent.click(screen.getByRole('button', { name: 'Criar cópia agora' })); expect(await screen.findByText('Cópia criada com sucesso.')).toBeVisible();
  });
  it('exige validação e confirmação forte; preserva o contexto se a restauração falhar', async () => {
    items = [backup]; restoreFails = true; mount('/protecao-dos-dados');
    await userEvent.click(await screen.findByRole('button', { name: /validar e restaurar/i }));
    const dialog = await screen.findByRole('dialog'); expect(dialog).toHaveTextContent(/substituídos/i); expect(dialog).toHaveTextContent(/segurança/i);
    const submit = screen.getByRole('button', { name: 'Restaurar dados desta cópia' }); expect(submit).toBeDisabled(); expect(restoreCount).toBe(0);
    await userEvent.type(screen.getByLabelText('Digite RESTAURAR para confirmar'), 'RESTAURAR'); await userEvent.click(submit);
    expect(await screen.findByRole('alert')).toHaveTextContent(/restaurar a cópia/i); expect(screen.getByLabelText('Digite RESTAURAR para confirmar')).toHaveValue('RESTAURAR');
    restoreFails = false; await userEvent.click(submit); expect(await screen.findByText(/Dados restaurados com sucesso/i)).toBeVisible();
  });
});
