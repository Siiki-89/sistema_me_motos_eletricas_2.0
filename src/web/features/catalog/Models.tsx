import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from '../../lib/api';
import type { ProductDto, VariantDto, Page } from '../../../shared/contracts/catalog';
import s from '../../app/Operations.module.css';
import { color, today, civil, num, kind, ErrorNotice, Header, Field, Pager, QueryState, Modal, useListFilters, useCommand, useWriteOperation } from '../common/Operational';
function ProductEditor({ item, close }: {
    item: ProductDto | null;
    close: () => void;
}) {
    const client = useQueryClient();
    const { actor, write, locked, pendingPath } = useWriteOperation();
    const [me, setMe] = useState(item?.meCode ?? '');
    const [name, setName] = useState(item?.commercialName ?? '');
    const [notes, setNotes] = useState(item?.notes ?? '');
    const [active, setActive] = useState(item?.active ?? true);
    const [saved, setSaved] = useState<ProductDto | null>(item);
    const [variant, setVariant] = useState<VariantDto | null>(null);
    const [tone, setTone] = useState('');
    const [na, setNa] = useState(false);
    const [toneActive, setToneActive] = useState(true);
    const [notice, setNotice] = useState('');
    const save = useMutation({ mutationFn: () => write<ProductDto>(saved ? `/catalog/products/${saved.id}` : '/catalog/products', { meCode: me, commercialName: name, notes, active, ...(saved ? { version: saved.version } : {}) }, saved ? 'PUT' : 'POST'), onSuccess: p => { setSaved(p); setNotice('Modelo salvo. Cadastre ou revise as cores abaixo.'); void client.invalidateQueries({ queryKey: ['products'] }); void client.invalidateQueries({ queryKey: ['stock'] }); } });
    const saveColor = useMutation({ mutationFn: () => write<VariantDto>(variant ? `/catalog/variants/${variant.id}` : '/catalog/variants', { productId: saved!.id, color: na ? null : tone, active: toneActive, ...(variant ? { version: variant.version } : {}) }, variant ? 'PUT' : 'POST'), onSuccess: v => { setSaved(p => p ? { ...p, variants: [...p.variants.filter(x => x.id !== v.id), v] } : p); setVariant(null); setTone(''); setNa(false); setToneActive(true); setNotice('Cor salva.'); void client.invalidateQueries({ queryKey: ['products'] }); void client.invalidateQueries({ queryKey: ['stock'] }); } });
    const busy = save.isPending || saveColor.isPending;
    return <Modal title={item ? 'Editar modelo' : 'Cadastrar modelo'} description="Referência de catálogo compartilhada por várias unidades. Os vínculos históricos são preservados." close={() => { if (locked) {
        if (!window.confirm("O resultado é incerto. Consulte o catálogo antes de cadastrar outra referência. Fechar mesmo assim?"))
            return;
    }
    else if ((me !== (saved?.meCode ?? '') || name !== (saved?.commercialName ?? '') || notes !== (saved?.notes ?? '') || active !== (saved?.active ?? true) || tone || na) && !window.confirm('Fechar o cadastro? Campos ainda não salvos serão descartados.'))
        return; close(); }} busy={busy}>
    <ErrorNotice error={actor.error}/>{locked && <p role="alert">O resultado da tentativa é incerto. Repita a mesma ação para obter seu resultado sem duplicar o cadastro. Os dados desta tentativa foram preservados.</p>}{notice && <p role="status" className={s.success}>{notice}</p>}<form onSubmit={e => { e.preventDefault(); save.mutate(); }}>
    <fieldset disabled={locked}>
    <Field label="Código ME">
    <input name="meCode" autoComplete="off" spellCheck={false} required maxLength={80} value={me} onChange={e => setMe(e.target.value)}/>
    </Field>
    <Field label="Nome comercial / modelo">
    <input maxLength={2000} value={name} onChange={e => setName(e.target.value)}/>
    </Field>
    <Field label="Observações do modelo">
    <textarea maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)}/>
    </Field>
    <label className={s.check}>
    <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)}/>Modelo ativo</label>
    </fieldset>
    <ErrorNotice error={save.error}/>
    <button disabled={busy || !actor.data || (locked && pendingPath !== (saved ? `/catalog/products/${saved.id}` : '/catalog/products'))}>Salvar modelo</button>
    </form>{saved && <section className={s.colorSection}>
        <h3>Cores disponíveis</h3>{saved.variants.length === 0 && <p>Cadastre uma cor para permitir recebimentos.</p>}<ul className={s.colorList}>{saved.variants.map(v => <li key={v.id}>
            <span>{color(v.color)} · {v.active ? 'Ativa' : 'Inativa'}</span>
            <button className={s.secondary} disabled={locked || busy} onClick={() => { setVariant(v); setTone(v.color ?? ''); setNa(v.color === null); setToneActive(v.active); saveColor.reset(); }}>Editar cor {color(v.color)}</button>
            </li>)}</ul>
        <form onSubmit={e => { e.preventDefault(); saveColor.mutate(); }}>
        <fieldset disabled={locked}>
        <Field label={variant ? 'Editar nome da cor' : 'Nova cor'}>
        <input required={!na} maxLength={100} disabled={na} value={tone} onChange={e => setTone(e.target.value)}/>
        </Field>
        <label className={s.check}>
        <input type="checkbox" checked={na} onChange={e => setNa(e.target.checked)}/>Cor não aplicável</label>
        <label className={s.check}>
        <input type="checkbox" checked={toneActive} onChange={e => setToneActive(e.target.checked)}/>Cor ativa</label>
        </fieldset>
        <ErrorNotice error={saveColor.error}/>
        <button disabled={busy || !actor.data || (locked && pendingPath !== (variant ? `/catalog/variants/${variant.id}` : '/catalog/variants'))}>{variant ? 'Salvar cor' : 'Adicionar cor'}</button>{variant && <button type="button" className={s.secondary} disabled={locked || busy} onClick={() => { setVariant(null); setTone(''); setNa(false); setToneActive(true); }}>Cancelar edição da cor</button>}</form>
        </section>}</Modal>;
}
export function Models() {
    const { q, setQ, active, setActive, page, setPage } = useListFilters();
    const [editing, setEditing] = useState<ProductDto | null | undefined>();
    const query = useQuery({ queryKey: ['products', q, active, page], queryFn: () => request<Page<ProductDto>>(`/catalog/products?${new URLSearchParams({ q, page: String(page), limit: '50', ...(active ? { active } : {}) })}`), retry: false });
    return <>
    <Header title="Modelos">Organize referências e cores antes de receber caixas. Cada código ME pode representar várias unidades.</Header>
    <div className={s.toolbar}>
    <Field label="Pesquisar modelos">
    <input type="search" placeholder="Código ME, nome ou cor" value={q} onChange={e => { setQ(e.target.value); }}/>
    </Field>
    <Field label="Status dos modelos">
    <select value={active} onChange={e => { setActive(e.target.value); }}>
    <option value="">Todos</option>
    <option value="true">Ativos</option>
    <option value="false">Inativos</option>
    </select>
    </Field>
    <button onClick={() => setEditing(null)}>Cadastrar modelo</button>
    </div>
    <QueryState query={query} empty="Nenhum modelo encontrado. Cadastre uma referência ou revise os filtros."/>{!query.isError && !!query.data?.items.length && <div className={s.tableWrap}>
        <table>
        <caption>Referências de modelos</caption>
        <thead>
        <tr>
        <th>Código ME</th>
        <th>Nome comercial</th>
        <th>Cores</th>
        <th>Status</th>
        <th>Ações</th>
        </tr>
        </thead>
        <tbody>{query.data.items.map(p => <tr key={p.id}>
            <th scope="row">{p.meCode}</th>
            <td>{p.commercialName || 'Não informado'}</td>
            <td>{p.variants.length ? p.variants.map(v => <span className={s.tag} key={v.id}>{color(v.color)}{!v.active ? ' (inativa)' : ''}</span>) : 'Nenhuma cor'}</td>
            <td>
            <span className={s.tag}>{p.active ? 'Ativo' : 'Inativo'}</span>
            </td>
            <td>
            <button className={s.secondary} onClick={() => setEditing(p)}>Editar {p.meCode}</button>
            </td>
            </tr>)}</tbody>
        </table>
        </div>}<Pager data={query.data} page={page} setPage={setPage} label="modelos"/>{editing !== undefined && <ProductEditor item={editing} close={() => setEditing(undefined)}/>}</>;
}
