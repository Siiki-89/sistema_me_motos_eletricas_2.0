import { useEffect, useRef, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { request, type Backup, type Health } from '../lib/api';
import styles from './App.module.css';
import { Models, Receiving, Stock } from './Operations';
import {Orders,NewOrder,Units} from '../features/orders/Orders';
import {OrderDetail,UnitDetail} from '../features/orders/OrderDetail';
import {DashboardPage} from '../features/dashboard/Dashboard';
import {PartsPage} from '../features/parts/PartsPage';
import {ShippingList,ShippingNew,ShippingDetail} from '../features/shipping/Shipping';
import {QualityPage} from '../features/quality/QualityPage';
import {ProductionPage} from '../features/production/ProductionPage';

const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
function ErrorNotice({ error }: { error: Error | null }) { return error ? <p className={styles.error} role="alert">{error.message}</p> : null; }

function Home() {
  const health = useQuery({ queryKey: ['health'], queryFn: () => request<Health>('/health'), retry: false });
  return <>
    <header className={styles.pageHeader}><p className={styles.context}>Seu ambiente de trabalho</p><h1>Sua operação,<br />no seu computador.</h1><p>Cadastre modelos e cores, registre recebimentos e acompanhe o estoque de caixas com rastreabilidade.</p></header>
    <section className={styles.connection} aria-labelledby="connection-title">
      <h2 id="connection-title">Conexão local</h2>
      {health.isFetching ? <p role="status">Verificando o serviço local…</p> : health.data && !health.isError ? <div role="status"><p className={styles.serviceTitle}>{health.data.status === 'ok' ? 'Serviço local disponível' : 'Serviço local indisponível'}</p><p>{health.data.database.status === 'ready' ? 'Banco de dados pronto' : 'Banco de dados indisponível'} · versão {health.data.version}</p></div> : null}
      <ErrorNotice error={health.error} />
      <button type="button" className={styles.secondary} disabled={health.isFetching} onClick={() => void health.refetch()}>Verificar novamente</button>
    </section>
    <section className={styles.note}><h2>Trabalho no seu computador</h2><p>A operação é local e não depende de internet. Modelos, recebimento e estoque de caixas estão disponíveis. A proteção dos dados mantém cópias locais da operação.</p><NavLink to="/protecao-dos-dados">Conhecer a proteção dos dados</NavLink></section>
  </>;
}

function Backups() {
  const queryClient = useQueryClient();
  const copies = useQuery({ queryKey: ['backups'], queryFn: () => request<{ items: Backup[] }>('/backups'), retry: false });
  const [selected, setSelected] = useState<Backup | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [notice, setNotice] = useState('');
  const [validateId, setValidateId] = useState<string | null>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  const create = useMutation({ mutationFn: () => request<Backup>('/backups', {}), onSuccess: () => { setNotice('Cópia criada com sucesso.'); void queryClient.invalidateQueries({ queryKey: ['backups'] }); } });
  const validate = useMutation({ mutationFn: (item: Backup) => request<{ id: string; valid: boolean; schemaVersion: number; createdAt: string }>(`/backups/${encodeURIComponent(item.id)}/validate`, {}), onSuccess: (result, item) => { if (result.valid && result.id === item.id) { setConfirmation(''); restore.reset(); setSelected(item); } else { setNotice('A cópia não passou na validação. Escolha outra cópia.'); } }, onSettled: () => setValidateId(null) });
  const restore = useMutation({ mutationFn: () => request<{ restored: boolean; safetyBackupId: string }>('/restore', { backupId: selected!.id, confirmation }), onSuccess: () => { setSelected(null); setConfirmation(''); setNotice('Dados restaurados com sucesso. Uma cópia de segurança anterior à restauração foi preservada.'); void queryClient.invalidateQueries(); } });
  const busy = create.isPending || validate.isPending || restore.isPending;
  return <>
    <header className={styles.pageHeader}><p className={styles.context}>Cuidado com a operação</p><h1>Proteção dos dados</h1><p>Crie cópias locais e verifique uma cópia antes de recuperar os dados deste computador.</p></header>
    <section className={styles.backupSection} aria-labelledby="copies-title">
      <div className={styles.sectionHeading}><div><h2 id="copies-title">Cópias locais</h2><p>Guardadas neste computador.</p></div><button disabled={busy} onClick={() => { setNotice(''); create.mutate(); }}>{create.isPending ? 'Criando cópia…' : 'Criar cópia agora'}</button></div>
      {notice && <p className={styles.success} role="status">{notice}</p>}
      <ErrorNotice error={create.error} /><ErrorNotice error={validate.error} />
      {copies.isPending && <p role="status">Consultando cópias locais…</p>}
      {copies.isError && <><ErrorNotice error={copies.error} /><button className={styles.secondary} onClick={() => void copies.refetch()} disabled={copies.isFetching}>Consultar novamente</button></>}
      {copies.data?.items.length === 0 && <div className={styles.empty}><h3>Nenhuma cópia local disponível.</h3><p>Crie a primeira cópia para ter um ponto de recuperação.</p></div>}
      {!!copies.data?.items.length && <ul className={styles.backupList}>{copies.data.items.map(item => <li key={item.id}><div><h3>Cópia de {date(item.createdAt)}</h3><p>Estrutura {item.schemaVersion} · {new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(item.sizeBytes / 1024)} KB</p></div><button className={styles.secondary} disabled={busy} onClick={event => { lastTrigger.current = event.currentTarget; setNotice(''); setValidateId(item.id); validate.mutate(item); }}>{validateId === item.id ? 'Validando cópia…' : 'Validar e restaurar'}</button></li>)}</ul>}
    </section>
    <aside className={styles.note}><h2>Uma cópia local precisa de cuidado</h2><p>As cópias deste computador ajudam a recuperar alterações. A proteção contra perda do equipamento exige também uma cópia em outro local seguro, a ser configurada antes da operação real.</p></aside>
    <Dialog.Root open={selected !== null} onOpenChange={open => { if (!open && !restore.isPending) setSelected(null); }}>
      <Dialog.Portal><Dialog.Overlay className={styles.overlay} /><Dialog.Content className={styles.dialog} onCloseAutoFocus={event => { event.preventDefault(); lastTrigger.current?.focus(); }} onEscapeKeyDown={event => { if (restore.isPending) event.preventDefault(); }} onPointerDownOutside={event => event.preventDefault()}>
        <Dialog.Title>Restaurar dados locais</Dialog.Title><Dialog.Description>Os dados atuais serão substituídos pelos dados da cópia selecionada. Uma cópia de segurança dos dados atuais será criada automaticamente antes da substituição.</Dialog.Description>
        {selected && <p className={styles.selection}>Cópia validada de {date(selected.createdAt)}</p>}
        <label htmlFor="restore-confirmation">Digite RESTAURAR para confirmar</label><input name="restore-confirmation" id="restore-confirmation" value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={restore.isPending} autoComplete="off" spellCheck={false} />
        <ErrorNotice error={restore.error} />
        <div className={styles.dialogActions}><Dialog.Close asChild><button className={styles.secondary} disabled={restore.isPending}>Cancelar</button></Dialog.Close><button className={styles.danger} disabled={confirmation !== 'RESTAURAR' || restore.isPending} onClick={() => restore.mutate()}>{restore.isPending ? 'Restaurando dados…' : 'Restaurar dados desta cópia'}</button></div>
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
  </>;
}

export function App() {
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);
  useEffect(() => { if (previousPath.current !== location.pathname) { main.current?.focus(); previousPath.current = location.pathname; } }, [location.pathname]);
  return <div className={styles.shell}><a className={styles.skipLink} href="#main">Pular para o conteúdo</a><aside className={styles.sidebar}><div className={styles.brand}><span className={styles.monogram}>ME</span><div>Estoque <span>2.0</span></div></div><nav aria-label="Principal"><NavLink end to="/" className={({ isActive }) => isActive ? styles.active : ''}>Início</NavLink><NavLink to="/painel">Painel</NavLink><NavLink to="/modelos" className={({ isActive }) => isActive ? styles.active : ''}>Modelos</NavLink><NavLink to="/recebimento" className={({ isActive }) => isActive ? styles.active : ''}>Recebimento</NavLink><NavLink to="/estoque-de-caixas" className={({ isActive }) => isActive ? styles.active : ''}>Estoque de caixas</NavLink><NavLink to="/ordens">Ordens de produção</NavLink><NavLink to="/unidades">Unidades</NavLink><NavLink to="/expedicao">Expedição</NavLink><NavLink to="/pecas">Peças e extras</NavLink><NavLink to="/protecao-dos-dados" className={({ isActive }) => isActive ? styles.active : ''}>Proteção dos dados</NavLink></nav><p className={styles.localLabel}><span aria-hidden="true" />Ambiente local</p></aside><div className={styles.workspace}><header className={styles.topline}>ME Estoque <span>Operação local</span></header><main id="main" ref={main} tabIndex={-1}><Routes><Route path="/" element={<Home />} /><Route path="/modelos" element={<Models />} /><Route path="/recebimento" element={<Receiving />} /><Route path="/estoque-de-caixas" element={<Stock />} /><Route path="/ordens" element={<Orders/>}/><Route path="/ordens/nova" element={<NewOrder/>}/><Route path="/ordens/:id" element={<OrderDetail/>}/><Route path="/ordens/:id/producao" element={<ProductionPage/>}/><Route path="/ordens/:id/qualidade" element={<QualityPage/>}/><Route path="/ordens/:id/expedir" element={<ShippingNew/>}/><Route path="/expedicao" element={<ShippingList/>}/><Route path="/expedicao/:id" element={<ShippingDetail/>}/><Route path="/pecas" element={<PartsPage/>}/><Route path="/painel" element={<DashboardPage/>}/><Route path="/ordens/:id/imprimir" element={<OrderDetail print/>}/><Route path="/unidades" element={<Units/>}/><Route path="/unidades/:id" element={<UnitDetail/>}/><Route path="/protecao-dos-dados" element={<Backups />} /><Route path="*" element={<><h1>Página não encontrada</h1><NavLink to="/">Voltar ao início</NavLink></>} /></Routes></main><footer>ME Estoque 2.0 <span>Dados no seu computador.</span></footer></div></div>;
}
