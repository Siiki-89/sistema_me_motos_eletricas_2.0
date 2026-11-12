import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {NavLink,useParams} from 'react-router-dom';
import {request} from '../../lib/api';
import type {OrderDetailDto} from '../../../shared/contracts/orders';
import type {QualityDto} from '../../../shared/contracts/quality';
import type {ShipmentDto,ShipmentDetailDto} from '../../../shared/contracts/shipping';
import {Header,Field,ErrorNotice,useWriteOperation} from '../common/Operational';
import s from '../../app/Operations.module.css';

const localStamp=()=>{const d=new Date(),pad=(v:number)=>String(v).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;};
export function ShippingList(){
 const q=useQuery({queryKey:['shipments'],queryFn:()=>request<{items:ShipmentDto[]}>('/shipments'),retry:false});
 return <><Header title="Expedição e recebimento">Acompanhe saídas e confirmações recebidas pelas lojas.</Header>
 <ErrorNotice error={q.error}/>
 {q.isPending&&<p role="status">Consultando expedições…</p>}
 {q.isError&&<button onClick={()=>void q.refetch()}>Consultar novamente</button>}
 {q.data?.items.length===0&&<p className={s.empty}>Nenhuma expedição registrada. Inicie pela OP de uma moto aprovada.</p>}
 {q.data&&q.data.items.length>0&&<div className={s.tableWrap}><table>
 <thead><tr><th>Saída</th><th>Destino</th><th>Motorista</th><th>Situação</th><th>Acessar</th></tr></thead>
 <tbody>{q.data.items.map(item=><tr key={item.id}><td>{new Date(item.dispatchedAt+'Z').toLocaleString('pt-BR')}</td><td>{item.destination}</td><td>{item.driver}</td><td>{item.status==='SHIPPED'?'Em transporte':item.status==='RECEIVED'?'Recebida':'Recebida com ressalvas'}</td><td><NavLink to={`/expedicao/${item.id}`}>Abrir</NavLink></td></tr>)}</tbody></table></div>}
 </>;
}
export function ShippingNew(){
 const {id}=useParams();const op=useWriteOperation();const client=useQueryClient();
 const o=useQuery({queryKey:['order',id],queryFn:()=>request<OrderDetailDto>(`/orders/${id}`),retry:false});
 const quality=useQuery({queryKey:['quality',id],queryFn:()=>request<QualityDto>(`/orders/${id}/quality`),enabled:!!o.data?.unitId,retry:false});
 const [driver,setDriver]=useState(''),[destination,setDestination]=useState(''),[at,setAt]=useState(localStamp()),[checked,setChecked]=useState(false);
 const [message,setMessage]=useState(''),[error,setError]=useState<Error|null>(null);
 const [finished,setFinished]=useState<ShipmentDetailDto|null>(null),[busy,setBusy]=useState(false);
 async function submit(){
 setBusy(true);setError(null);
 try{const r=await op.write<ShipmentDetailDto>('/shipments',{orderId:id,driver,destination,dispatchedAt:at,accessoriesChecked:true});setFinished(r);setMessage('Expedição registrada com sucesso.');void client.invalidateQueries({queryKey:['shipments']});}
 catch(e){setError(e as Error);}finally{setBusy(false);}
 }
 return <><Header title="Nova expedição">Envio normal permitido apenas com chassi, montagem e inspeção aprovados.</Header>
 <p><NavLink to={`/ordens/${id}`}>Voltar à OP</NavLink></p>
 <ErrorNotice error={o.error}/><ErrorNotice error={quality.error}/>
 {o.data&&<p><strong>{o.data.code}</strong> · {o.data.meCode} · Chassi {o.data.unit?.chassis??'pendente'}</p>}
 {quality.data&&<p>Qualidade: <strong>{quality.data.effectiveStatus==='APPROVED'?'Aprovada':quality.data.effectiveStatus==='REJECTED'?'Reprovada':'Pendente'}</strong></p>}
 {finished?<p className={s.success}>{message} <NavLink to={`/expedicao/${finished.id}`}>Abrir expedição</NavLink></p>:
 <form onSubmit={e=>{e.preventDefault();void submit();}}>
 <fieldset className={s.formFields} disabled={busy||op.locked||quality.data?.effectiveStatus!=='APPROVED'}>
 <Field label="Motorista"><input required maxLength={200} value={driver} onChange={e=>setDriver(e.target.value)}/></Field>
 <Field label="Destino / loja"><input required maxLength={200} value={destination} onChange={e=>setDestination(e.target.value)}/></Field>
 <Field label="Data e horário da saída"><input required type="datetime-local" value={at} onChange={e=>setAt(e.target.value)}/></Field>
 <label className={s.check}><input required type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/>Conferi fisicamente o veículo e os acessórios que o acompanham</label>
 </fieldset><ErrorNotice error={error}/><ErrorNotice error={op.actor.error}/>
 <button type="submit" disabled={busy||!op.actor.data||!checked||!driver.trim()||!destination.trim()||quality.data?.effectiveStatus!=='APPROVED'}>Confirmar saída</button>
 </form>}
 {quality.data?.effectiveStatus!=='APPROVED'&&<p className={s.error}>Expedição bloqueada: a OP precisa de inspeção aprovada e atualizada.</p>}
 </>;
}
export function ShippingDetail(){
 const {id}=useParams();const op=useWriteOperation(),client=useQueryClient();
 const q=useQuery({queryKey:['shipment',id],queryFn:()=>request<ShipmentDetailDto>(`/shipments/${id}`),retry:false});
 const [receiver,setReceiver]=useState(''),[at,setAt]=useState(localStamp()),[remarks,setRemarks]=useState(''),[withRemarks,setWithRemarks]=useState(false);
 const [error,setError]=useState<Error|null>(null),[busy,setBusy]=useState(false);
 async function receive(){
 if(!q.data)return;setBusy(true);setError(null);
 try{await op.write<ShipmentDetailDto>(`/shipments/${id}/receive`,{version:q.data.version,receivedAt:at,receivedBy:receiver,withRemarks,remarks:remarks||undefined});void client.invalidateQueries({queryKey:['shipment',id]});void client.invalidateQueries({queryKey:['shipments']});}
 catch(e){setError(e as Error);}finally{setBusy(false);}
 }
 return <><Header title="Acompanhamento da expedição">Conferência do recebimento pela loja e registro de ressalvas.</Header>
 <p><NavLink to="/expedicao">Todas as expedições</NavLink></p><ErrorNotice error={q.error}/>
 {q.isPending&&<p role="status">Carregando…</p>}
 {q.data&&<><section className={s.origin}>
 <p><strong>Motorista:</strong> {q.data.driver}</p><p><strong>Destino:</strong> {q.data.destination}</p>
 <p><strong>Saída:</strong> {q.data.dispatchedAt.replace('T',' ')} · <strong>Situação:</strong> {q.data.status}</p>
 </section>
 {q.data.status==='SHIPPED'&&<form onSubmit={e=>{e.preventDefault();void receive();}}>
 <h2>Recebimento da loja</h2>
 <Field label="Responsável pelo recebimento"><input required maxLength={200} value={receiver} onChange={e=>setReceiver(e.target.value)}/></Field>
 <Field label="Data e horário do recebimento"><input required type="datetime-local" value={at} onChange={e=>setAt(e.target.value)}/></Field>
 <label className={s.check}><input type="checkbox" checked={withRemarks} onChange={e=>setWithRemarks(e.target.checked)}/>Recebimento com ressalvas</label>
 {withRemarks&&<Field label="Descreva as ressalvas"><textarea required value={remarks} maxLength={2000} onChange={e=>setRemarks(e.target.value)}/></Field>}
 <ErrorNotice error={error}/><ErrorNotice error={op.actor.error}/>
 <button disabled={busy||!receiver.trim()||!op.actor.data||withRemarks&&!remarks.trim()}>Confirmar recebimento</button>
 </form>}
 <section className={s.origin}><h2>Histórico</h2><ul>{q.data.history.map(h=><li key={h.id}>{h.kind} · {new Date(h.createdAt).toLocaleString('pt-BR')}</li>)}</ul></section>
 </>}
 </>;
}
