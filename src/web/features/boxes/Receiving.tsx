import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { ApiError, request } from '../../lib/api';
import type { ProductDto, Page } from '../../../shared/contracts/catalog';
import type { ReceiptRequest } from '../../../shared/contracts/boxes';
import s from '../../app/Operations.module.css';
import { color, today, civil, num, kind, ErrorNotice, Header, Field, Pager, QueryState, Modal, useCommand, useUnsavedChanges } from '../common/Operational';
export function Receiving() {
    const [dirty, setDirty] = useState(false);
    const client = useQueryClient();
    const { actor, command } = useCommand();
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const [product, setProduct] = useState<ProductDto | null>(null);
    const [variantId, setVariant] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [receivedDate, setDate] = useState(today());
    const [supplier, setSupplier] = useState('');
    const [invoice, setInvoice] = useState('');
    const [lot, setLot] = useState('');
    const [notes, setNotes] = useState('');
    const [pending, setPending] = useState<ReceiptRequest | null>(null);
    const [attempted, setAttempted] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [notice, setNotice] = useState('');
    useUnsavedChanges(dirty || !!pending);
    const products = useQuery({ queryKey: ['products', 'receiving', q, page], queryFn: () => request<Page<ProductDto>>(`/catalog/products?${new URLSearchParams({ active: 'true', q, page: String(page), limit: '50' })}`), retry: false });
    const save = useMutation({ mutationFn: () => request('/boxes/receipts', pending), onError: error => { if (error instanceof ApiError && !error.ambiguous)
            setAttempted(false); }, onSuccess: () => { setDirty(false); setPending(null); setReviewOpen(false); setAttempted(false); setNotice('Entrada registrada. O estoque foi atualizado. Para outra entrada, revise os dados e confirme uma nova operação.'); setQuantity('1'); void client.invalidateQueries({ queryKey: ['stock'] }); void client.invalidateQueries({ queryKey: ['summary'] }); void client.invalidateQueries({ queryKey: ['origins'] }); void client.invalidateQueries({ queryKey: ['movements'] }); } });
    function review(e: FormEvent) { e.preventDefault(); if (pending) {
        setReviewOpen(true);
        return;
    } setReviewOpen(true); setNotice(''); save.reset(); setAttempted(false); setPending({ ...command(), variantId, quantity: Number(quantity), receivedDate, supplier, invoice, lot, notes }); }
    return <>
    <Header title="Recebimento">Registre caixas fechadas por modelo, cor e origem. Cada caixa corresponde a uma moto.</Header>{notice && <p className={s.success} role="status">{notice}</p>}<ErrorNotice error={actor.error}/>
    <form onChange={() => setDirty(true)} onSubmit={review}>
    <fieldset className={s.receiving} disabled={!!pending}>
    <section>
    <h2>Modelo e quantidade</h2>
    <Field label="Buscar modelo para recebimento">
    <input type="search" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Pesquisar código ME ou nome"/>
    </Field>
    <QueryState query={products} empty="Nenhum modelo ativo encontrado. Cadastre ou ative uma referência em Modelos."/>
    <Field label="Modelo">
    <select required value={product?.id ?? ''} onChange={e => { setProduct(products.data?.items.find(p => p.id === e.target.value) ?? null); setVariant(''); }}>
    <option value="">Selecione um modelo</option>{product && !products.data?.items.some(p => p.id === product.id) && <option value={product.id}>{product.meCode} — {product.commercialName}</option>}{products.data?.items.map(p => <option key={p.id} value={p.id}>{p.meCode}{p.commercialName ? ` — ${p.commercialName}` : ''}</option>)}</select>
    </Field>
    <Pager data={products.data} page={page} setPage={setPage} label="modelos para seleção"/>
    <Field label="Cor">
    <select required value={variantId} disabled={!product} onChange={e => setVariant(e.target.value)}>
    <option value="">Selecione uma cor</option>{product?.variants.filter(v => v.active).map(v => <option key={v.id} value={v.id}>{color(v.color)}</option>)}</select>
    </Field>{product && !product.variants.some(v => v.active) && <p>Este modelo não possui cores ativas. Revise seu cadastro.</p>}<div className={s.grid}>
    <Field label="Quantidade">
    <input required type="number" min="1" max="1000000" step="1" value={quantity} onChange={e => setQuantity(e.target.value)}/>
    </Field>
    <Field label="Data de recebimento">
    <input required type="date" value={receivedDate} onChange={e => setDate(e.target.value)}/>
    </Field>
    </div>
    </section>
    <section>
    <h2>Origem das caixas</h2>
    <p className={s.muted}>Informações opcionais para localizar o recebimento depois.</p>
    <Field label="Fornecedor">
    <input maxLength={2000} value={supplier} onChange={e => setSupplier(e.target.value)}/>
    </Field>
    <div className={s.grid}>
    <Field label="Nota fiscal">
    <input maxLength={2000} value={invoice} onChange={e => setInvoice(e.target.value)}/>
    </Field>
    <Field label="Lote">
    <input maxLength={2000} value={lot} onChange={e => setLot(e.target.value)}/>
    </Field>
    </div>
    <Field label="Observações do recebimento">
    <textarea maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)}/>
    </Field>
    <button disabled={!actor.data || !variantId}>Revisar recebimento</button>
    </section>
    </fieldset>
    </form>{pending && !reviewOpen && <section className={s.correction}>
        <p>Há uma entrada pendente. Repita a confirmação para obter o resultado com segurança. Consulte o histórico antes de iniciar outra operação.</p>
        <button onClick={() => setReviewOpen(true)}>Retomar confirmação da entrada</button>
        <button className={s.secondary} onClick={() => { if (window.confirm("Você conferiu o histórico? Uma nova operação pode duplicar uma entrada já registrada. Iniciar outra operação?")) {
            setPending(null);
            setAttempted(false);
            save.reset();
            setNotice("Nova operação iniciada. Revise os dados antes de confirmar.");
        } }}>Iniciar outra operação após conferir histórico</button>
        </section>}<p className={s.muted}>{actor.data?.label}</p>
    <NavLink to="/estoque-de-caixas">Consultar estoque de caixas</NavLink>{pending && reviewOpen && <Modal title="Confirmar recebimento" description="Confira os dados antes de registrar a entrada no estoque." busy={save.isPending} close={() => { setReviewOpen(false); if (!attempted)
            setPending(null); }}>
        <dl className={s.details}>
        <dt>Modelo / cor</dt>
        <dd>{product?.meCode} / {color(product?.variants.find(v => v.id === pending.variantId)?.color ?? null)}</dd>
        <dt>Quantidade</dt>
        <dd>{num(pending.quantity)} caixas</dd>
        <dt>Data</dt>
        <dd>{civil(pending.receivedDate)}</dd>
        <dt>Fornecedor / NF / lote</dt>
        <dd>{pending.supplier || 'Não informado'} / {pending.invoice || 'Não informada'} / {pending.lot || 'Não informado'}</dd>
        </dl>
        <ErrorNotice error={save.error}/>{attempted && save.isError && <p>O resultado pode ter sido registrado mesmo sem resposta. Tente novamente nesta confirmação: a mesma operação será reutilizada sem duplicar a entrada. Consulte o histórico antes de iniciar outra.</p>}<button disabled={save.isPending} onClick={() => { setAttempted(true); save.mutate(); }}>{save.isPending ? 'Registrando entrada…' : 'Confirmar entrada'}</button>
        </Modal>}</>;
}
