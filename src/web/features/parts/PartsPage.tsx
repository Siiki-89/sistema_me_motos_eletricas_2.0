import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {request} from '../../lib/api';
import type {PartDto,PartMovementDto} from '../../../shared/contracts/parts';
import type {Page} from '../../../shared/contracts/catalog';
import type {UnitDto} from '../../../shared/contracts/orders';
import {Header,Field,ErrorNotice,today,useWriteOperation} from '../common/Operational';
import s from '../../app/Operations.module.css';
export function PartsPage(){
 const client=useQueryClient(),writer=useWriteOperation();
 const parts=useQuery({queryKey:['parts'],queryFn:()=>request<{items:PartDto[]}>('/parts'),retry:false});
 const units=useQuery({queryKey:['parts-units'],queryFn:()=>request<Page<UnitDto>>('/units?limit=100'),retry:false});
 const moves=useQuery({queryKey:['part-movements'],queryFn:()=>request<{items:PartMovementDto[]}>('/parts/movements'),retry:false});
 const [code,setCode]=useState(''),[name,setName]=useState(''),[category,setCategory]=useState('PECA');
 const [partId,setPartId]=useState(''),[quantity,setQuantity]=useState(1),[date,setDate]=useState(today()),[reason,setReason]=useState('');
 const [mode,setMode]=useState('RECEIPT'),[unit,setUnit]=useState(''),[source,setSource]=useState('COMMON'),[dest,setDest]=useState('COMMON');
 const [message,setMessage]=useState(''),[error,setError]=useState<Error|null>(null),[busy,setBusy]=useState(false);
 const refresh=()=>{void client.invalidateQueries({queryKey:['parts']});void client.invalidateQueries({queryKey:['part-movements']});};
 async function save(path:string,body:Record<string,unknown>){
 setBusy(true);setError(null);setMessage('');
 try{await writer.write(path,body);setMessage('Operação gravada com histórico.');refresh();}
 catch(e){setError(e as Error);}finally{setBusy(false);}
 }
 const locations=[{value:'COMMON',label:'Estoque comum'},...(units.data?.items??[]).map(u=>({value:'UNIT:'+u.id,label:u.meCode+' · '+(u.chassis??u.id.slice(0,8))}))];
 return <><Header title="Peças e itens extras">Cadastre peças e acompanhe os extras que vieram nas caixas; movimentações nunca são automáticas.</Header>
 {message&&<p className={s.success} role="status">{message}</p>}
 <ErrorNotice error={error}/><ErrorNotice error={parts.error}/><ErrorNotice error={units.error}/><ErrorNotice error={moves.error}/>
 <div className={s.grid}>
 <section><h2>Novo item</h2><form onSubmit={e=>{e.preventDefault();void save('/parts',{code,name,category});}}>
 <Field label="Código"><input required maxLength={80} value={code} onChange={e=>setCode(e.target.value)}/></Field>
 <Field label="Descrição"><input required maxLength={200} value={name} onChange={e=>setName(e.target.value)}/></Field>
 <Field label="Categoria"><select value={category} onChange={e=>setCategory(e.target.value)}>{['PECA','BATERIA','CONTROLADORA','ACESSORIO','OUTRO'].map(k=><option key={k} value={k}>{k}</option>)}</select></Field>
 <button disabled={busy||!writer.actor.data||!code.trim()||!name.trim()}>Cadastrar</button></form></section>
 <section><h2>Nova movimentação</h2><form onSubmit={e=>{e.preventDefault();const base={partId,quantity,effectiveDate:date,reason:reason||undefined};if(mode==='EXTRA')void save('/parts/extras',{...base,unitId:unit});else if(mode==='TRANSFER')void save('/parts/transfers',{...base,fromLocation:source,toLocation:dest==='OUT'?null:dest});else void save('/parts/receipts',base);}}>
 <Field label="Operação"><select value={mode} onChange={e=>setMode(e.target.value)}><option value="RECEIPT">Entrada no estoque comum</option><option value="EXTRA">Extra encontrado na caixa</option><option value="TRANSFER">Transferência / consumo</option></select></Field>
 <Field label="Peça"><select required value={partId} onChange={e=>setPartId(e.target.value)}><option value="">Selecione</option>{parts.data?.items.map(p=><option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></Field>
 {mode==='EXTRA'&&<Field label="Unidade que trouxe o extra"><select required value={unit} onChange={e=>setUnit(e.target.value)}><option value="">Selecione</option>{units.data?.items.map(u=><option key={u.id} value={u.id}>{u.meCode} · {u.chassis??u.id.slice(0,8)}</option>)}</select></Field>}
 {mode==='TRANSFER'&&<><Field label="Origem"><select value={source} onChange={e=>setSource(e.target.value)}>{locations.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}</select></Field>
 <Field label="Destino"><select value={dest} onChange={e=>setDest(e.target.value)}><option value="OUT">Consumo / descarte</option>{locations.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}</select></Field></>}
 <Field label="Quantidade"><input type="number" min={1} step={1} required value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></Field>
 <Field label="Data"><input type="date" value={date} required onChange={e=>setDate(e.target.value)}/></Field>
 <Field label="Motivo"><textarea maxLength={200} required={mode==='TRANSFER'} value={reason} onChange={e=>setReason(e.target.value)}/></Field>
 <button disabled={busy||!writer.actor.data||!partId||!Number.isSafeInteger(quantity)||quantity<1||mode==='EXTRA'&&!unit||mode==='TRANSFER'&&(!reason.trim()||source===dest)}>Registrar</button></form></section>
 </div>
 <section className={s.origin}><h2>Itens cadastrados</h2>
 {parts.data?.items.length===0&&<p className={s.empty}>Ainda não há itens.</p>}
 {parts.data&&parts.data.items.length>0&&<div className={s.tableWrap}><table><thead><tr><th>Código</th><th>Descrição</th><th>Categoria</th><th>Saldo comum</th></tr></thead><tbody>{parts.data.items.map(p=><tr key={p.id}><td>{p.code}</td><td>{p.name}</td><td>{p.category}</td><td>{p.commonQuantity}</td></tr>)}</tbody></table></div>}
 </section>
 <section className={s.origin}><h2>Últimos movimentos</h2>
 {moves.data?.items.length===0&&<p className={s.empty}>Nenhuma movimentação.</p>}
 {moves.data&&moves.data.items.length>0&&<div className={s.tableWrap}><table><thead><tr><th>Data</th><th>Peça</th><th>Tipo</th><th>Quantidade</th><th>Origem</th><th>Destino</th></tr></thead><tbody>{moves.data.items.map(m=><tr key={m.id}><td>{m.effectiveDate}</td><td>{parts.data?.items.find(p=>p.id===m.partId)?.code??m.partId.slice(0,8)}</td><td>{m.kind}</td><td>{m.quantity}</td><td>{m.sourceLocation??'Externo'}</td><td>{m.destinationLocation??'Saída'}</td></tr>)}</tbody></table></div>}
 </section></>;
}
