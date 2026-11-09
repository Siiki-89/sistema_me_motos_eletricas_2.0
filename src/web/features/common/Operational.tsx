import { useState, useRef, useEffect, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { useSearchParams } from 'react-router-dom';
import { ApiError, request } from '../../lib/api';
import type { Page, LocalActorDto } from '../../../shared/contracts/catalog';
import s from '../../app/Operations.module.css';
export const color = (v: string | null) => v ?? 'Não aplicável';
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const civil = (v: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' }).format(new Date(v + 'T00:00:00Z'));
export const num = (v: number) => new Intl.NumberFormat('pt-BR').format(v);
export const kind = { receipt: 'Entrada', adjustment: 'Ajuste', reversal: 'Estorno' };
export function ErrorNotice({ error }: {
    error: Error | null;
}) { const ref = useRef<HTMLParagraphElement>(null); useEffect(() => { if (error)
    ref.current?.focus(); }, [error]); return error ? <p ref={ref} tabIndex={-1} role="alert" className={s.error}>{error.message}</p> : null; }
export function Header({ title, children }: {
    title: string;
    children: ReactNode;
}) {
    return <header className={s.header}>
    <h1>{title}</h1>
    <p>{children}</p>
    </header>;
}
export function Field({ label, children }: {
    label: string;
    children: ReactNode;
}) {
    const child = isValidElement(children) ? children as ReactElement<{
        name?: string;
        autoComplete?: string;
        spellCheck?: boolean;
        maxLength?: number;
        type?: string;
    }> : null;
    const name = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return <label className={s.field}>
    <span>{label}</span>{child ? cloneElement(child, { name: child.props.name ?? name, autoComplete: child.props.autoComplete ?? 'off', ...(child.type === 'input' && child.props.type === 'search' ? { maxLength: 100 } : {}), ...(label.includes('Código') || label === 'Lote' || label === 'Nota fiscal' ? { spellCheck: false } : {}) }) : children}</label>;
}
export function Pager({ data, page, setPage, label = 'resultados' }: {
    data?: {
        total: number;
        limit: number;
    };
    page: number;
    setPage: (v: number) => void;
    label?: string;
}) {
    return <div className={s.pager} role="group" aria-label={`Paginação de ${label}`}>
    <span>{data ? `${num(data.total)} ${label}` : 'Consultando…'} · Página {page}</span>
    <button type="button" className={s.secondary} disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
    <button type="button" className={s.secondary} disabled={!data || page * data.limit >= data.total} onClick={() => setPage(page + 1)}>Próxima</button>
    </div>;
}
export function QueryState<T>({ query, empty }: {
    query: UseQueryResult<Page<T>, Error>;
    empty: string;
}) {
    return <>{query.isPending && <p role="status">Carregando registros…</p>}{query.isError && <>
        <ErrorNotice error={query.error}/>
        <button type="button" className={s.secondary} onClick={() => void query.refetch()}>Consultar novamente</button>
        </>}{!query.isError && query.data?.items.length === 0 && <p className={s.empty}>{empty}</p>}</>;
}
export function Modal({ title, description, close, children, busy = false }: {
    title: string;
    description: string;
    close: () => void;
    children: ReactNode;
    busy?: boolean;
}) {
    return <Dialog.Root open onOpenChange={open => { if (!open && !busy)
        close(); }}>
    <Dialog.Portal>
    <Dialog.Overlay className={s.overlay}/>
    <Dialog.Content className={s.dialog} onPointerDownOutside={e => e.preventDefault()} onEscapeKeyDown={e => { if (busy)
        e.preventDefault(); }}>
    <Dialog.Title>{title}</Dialog.Title>
    <Dialog.Description>{description}</Dialog.Description>{children}<button className={s.secondary} disabled={busy} onClick={close}>Fechar</button>
    </Dialog.Content>
    </Dialog.Portal>
    </Dialog.Root>;
}
export function useActor() { return useQuery({ queryKey: ['actor'], queryFn: () => request<LocalActorDto>('/actor'), retry: false }); }
export function useCommand() { const actor = useActor(); return { actor, command: () => { if (actor.data?.id !== 'local-operator')
        throw new Error('Operador local indisponível. Consulte novamente.'); return { actorId: actor.data.id as 'local-operator', operationId: crypto.randomUUID() }; } }; }
export function useWriteOperation() { const { actor, command } = useCommand(); const frozen = useRef<{
    path: string;
    body: unknown;
    method: 'POST' | 'PUT';
} | null>(null); const [locked, setLocked] = useState(false); async function write<T>(path: string, body: Record<string, unknown>, method: 'POST' | 'PUT' = 'POST') { if (!frozen.current)
    frozen.current = { path, body: { ...command(), ...body }, method }; const attempt = frozen.current; try {
    const result = await request<T>(attempt.path, attempt.body, attempt.method);
    frozen.current = null;
    setLocked(false);
    return result;
}
catch (error) {
    if (error instanceof ApiError && !error.ambiguous) {
        frozen.current = null;
        setLocked(false);
    }
    else
        setLocked(true);
    throw error;
} } return { actor, write, locked, pendingPath: frozen.current?.path }; }
export function useListFilters() { const [params, setParams] = useSearchParams(); const q = params.get('q') ?? ''; const active = ['true', 'false'].includes(params.get('active') ?? '') ? params.get('active')! : ''; const raw = Number(params.get('page') ?? 1); const page = Number.isSafeInteger(raw) && raw > 0 ? raw : 1; function update(key: string, value: string) { setParams(previous => { const next = new URLSearchParams(previous); if (value)
    next.set(key, value);
else
    next.delete(key); if (key !== 'page')
    next.delete('page'); return next; }, { replace: true }); } return { q, active, page, setQ: (v: string) => update('q', v), setActive: (v: string) => update('active', v), setPage: (v: number) => update('page', v === 1 ? '' : String(v)) }; }
export function useUnsavedChanges(enabled: boolean) {
    useEffect(() => {
        if (!enabled)
            return;
        const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        const navigate = (event: MouseEvent) => { if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
            return; const anchor = (event.target as Element)?.closest?.('a'); if (anchor && anchor.target !== '_blank' && anchor.getAttribute('href')?.startsWith('/') && !window.confirm('Sair desta tela? Dados ainda não confirmados serão descartados.')) {
            event.preventDefault();
            event.stopPropagation();
        } };
        window.addEventListener('beforeunload', unload);
        document.addEventListener('click', navigate, true);
        return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigate, true); };
    }, [enabled]);
}
