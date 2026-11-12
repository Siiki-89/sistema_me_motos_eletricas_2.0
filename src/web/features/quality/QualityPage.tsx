import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {NavLink,useParams} from 'react-router-dom';
import type {QualityDto,QualityAnswerDto} from '../../../shared/contracts/quality';
import {qualityStaticItems,qualityRoadItems} from '../../../shared/contracts/quality';
import type {OrderDetailDto} from '../../../shared/contracts/orders';
import {request} from '../../lib/api';
import {Header,Field,ErrorNotice,useWriteOperation,useUnsavedChanges} from '../common/Operational';
import s from '../../app/Operations.module.css';

const labels={UNASSESSED:'Não avaliado',OK:'Conforme',NOK:'Não conforme',NA:'Não aplicável'} as const;
const statuses={PENDING:'Pendente / necessita reinspeção',APPROVED:'Aprovada',REJECTED:'Reprovada'} as const;
type CheckSectionProps={title:string;template:readonly {code:string;label:string}[];answers:QualityAnswerDto[];set:(answers:QualityAnswerDto[])=>void;disabled:boolean};
function CheckSection({title,template,answers,set,disabled}:CheckSectionProps){
 function update(code:string,patch:Partial<QualityAnswerDto>){
   const old=answers.find(x=>x.code===code)??{code,state:'UNASSESSED' as const,notes:null};
   set(answers.filter(x=>x.code!==code).concat({...old,...patch}));
 }
 return <section className={s.origin}><h2>{title}</h2>
   {template.map(item=>{const a=answers.find(x=>x.code===item.code)??{code:item.code,state:'UNASSESSED' as const,notes:null};
     return <div className={s.origin} key={item.code}>
       <strong>{item.code} · {item.label}</strong>
       <Field label={`Resultado ${item.code}`}><select value={a.state} disabled={disabled} onChange={e=>update(item.code,{state:e.target.value as QualityAnswerDto['state']})}>
         {Object.entries(labels).map(([value,text])=><option key={value} value={value}>{text}</option>)}
       </select></Field>
       {(a.state==='NOK'||a.state==='NA')&&<Field label="Observação / justificativa"><textarea value={a.notes??''} disabled={disabled} maxLength={2000} onChange={e=>update(item.code,{notes:e.target.value||null})}/></Field>}
     </div>;})}</section>;
}
function Editor({saved,orderId}:{saved:QualityDto;orderId:string}){
 const client=useQueryClient(),op=useWriteOperation();
 const [checker,setChecker]=useState(saved.checker??'');
 const [notes,setNotes]=useState(saved.notes??'');
 const [staticAnswers,setStaticAnswers]=useState(saved.staticAnswers);
 const [roadAnswers,setRoadAnswers]=useState(saved.roadAnswers);
 const [reason,setReason]=useState('');
 const [pending,setPending]=useState(false);
 const [notice,setNotice]=useState('');
 const [error,setError]=useState<Error|null>(null);
 const savedDraft=JSON.stringify({checker:saved.checker??'',notes:saved.notes??'',staticAnswers:saved.staticAnswers,roadAnswers:saved.roadAnswers});
 const dirty=JSON.stringify({checker,notes,staticAnswers,roadAnswers})!==savedDraft;
 useUnsavedChanges(dirty||op.locked);
 const disabled=saved.status!=='DRAFT'||pending||op.locked;
 async function act(action:'save'|'approve'|'reject'|'reopen'){
   setError(null);setNotice('');setPending(true);
   try{
     const path=`/orders/${orderId}/quality`+(action==='save'?'':`/${action}`);
     const body=action==='save'?{version:saved.version,checker:checker||null,notes:notes||null,staticAnswers,roadAnswers}:{version:saved.version,reason:reason||undefined};
     await op.write<QualityDto>(path,body,action==='save'?'PUT':'POST');
     setNotice(action==='save'?'Inspeção salva.':action==='approve'?'Unidade aprovada.':action==='reject'?'Unidade reprovada.':'Inspeção reaberta.');
     void client.invalidateQueries({queryKey:['quality',orderId]});
   }catch(e){setError(e as Error);}finally{setPending(false);}
 }
 const effective=saved.effectiveStatus;
 return <div>
   {notice&&<p className={s.success} role="status">{notice}</p>}
   {saved.status==='APPROVED'&&effective==='PENDING'&&<p role="alert" className={s.error}>A produção foi modificada depois da aprovação. É necessário reabrir e inspecionar novamente antes da expedição.</p>}
   <p><strong>Estado:</strong> {statuses[effective]} · Versão {saved.version}</p>
   <p>A aprovação exige chassi, montagem concluída, ocorrências resolvidas e todos os itens avaliados. A ficha pode ser salva parcialmente.</p>
   <form onSubmit={e=>{e.preventDefault();void act('save');}}>
     <Field label="Conferente"><input value={checker} maxLength={2000} disabled={disabled} onChange={e=>setChecker(e.target.value)}/></Field>
     <CheckSection title="Inspeção estática" template={qualityStaticItems} answers={staticAnswers} set={setStaticAnswers} disabled={disabled}/>
     <CheckSection title="Teste de rodagem" template={qualityRoadItems} answers={roadAnswers} set={setRoadAnswers} disabled={disabled}/>
     <Field label="Observações gerais"><textarea value={notes} maxLength={2000} disabled={disabled} onChange={e=>setNotes(e.target.value)}/></Field>
     <ErrorNotice error={error}/><ErrorNotice error={op.actor.error}/>
     {saved.status==='DRAFT'&&<button disabled={pending||!op.actor.data} type="submit">{op.locked?'Repetir salvamento':'Salvar inspeção'}</button>}
   </form>
   <section className={s.origin}><h2>Decisão da qualidade</h2>
     <Field label="Motivo da reprovação ou reinspeção"><textarea maxLength={2000} value={reason} disabled={pending||op.locked} onChange={e=>setReason(e.target.value)}/></Field>
     <div className={s.toolbar}>
       {saved.status==='DRAFT'&&<>
         <button disabled={pending||dirty||!op.actor.data} onClick={()=>void act('approve')}>Aprovar qualidade</button>
         <button className={s.secondary} disabled={pending||dirty||!op.actor.data||!reason.trim()&&!staticAnswers.concat(roadAnswers).some(x=>x.state==='NOK')} onClick={()=>void act('reject')}>Reprovar qualidade</button>
       </>}
       {saved.status!=='DRAFT'&&<button disabled={pending||!reason.trim()||!op.actor.data} onClick={()=>void act('reopen')}>Reabrir para reinspeção</button>}
     </div>
     {dirty&&<p role="status">Salve as alterações antes de decidir a qualidade.</p>}
   </section>
   <section className={s.origin}><h2>Histórico de decisões</h2>
   {saved.history.length===0?<p>Nenhuma alteração registrada.</p>:<ul>{saved.history.map(h=><li key={h.id}>{new Date(h.createdAt).toLocaleString('pt-BR')} · {h.action}{h.reason?` — ${h.reason}`:''}</li>)}</ul>}
   </section>
 </div>;
}
export function QualityPage(){
 const {id}=useParams();
 const order=useQuery({queryKey:['order',id],queryFn:()=>request<OrderDetailDto>(`/orders/${id}`),retry:false});
 const q=useQuery({queryKey:['quality',id],queryFn:()=>request<QualityDto>(`/orders/${id}/quality`),enabled:!!order.data?.unitId,retry:false});
 return <>
 <Header title={`Controle de qualidade ${order.data?.code??''}`}>Inspeção estática, teste de rodagem e reinspeção antes da expedição.</Header>
 <p><NavLink to={`/ordens/${id}`}>Voltar à OP</NavLink> · <NavLink to={`/ordens/${id}/producao`}>Produção</NavLink></p>
 <ErrorNotice error={order.error}/><ErrorNotice error={q.error}/>
 {!order.data?.unitId&&order.data&&<p className={s.empty}>A moto precisa ser individualizada antes da inspeção.</p>}
 {q.isPending&&order.data?.unitId&&<p role="status">Carregando inspeção...</p>}
 {q.isError&&<button onClick={()=>void q.refetch()}>Tentar novamente</button>}
 {q.data&&<Editor key={`${q.data.orderId}-${q.data.version}`} saved={q.data} orderId={q.data.orderId}/>}
 </>;
}
