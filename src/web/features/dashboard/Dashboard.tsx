import {useQuery} from '@tanstack/react-query';
import {NavLink} from 'react-router-dom';
import {request} from '../../lib/api';
import {Header,ErrorNotice} from '../common/Operational';
import s from '../../app/Operations.module.css';
type Dashboard={boxes:{physical:number;reserved:number;blocked:number;available:number};units:number;assemblyDone:number;qualityApproved:number;pendingQuality:number;shipped:number;received:number;orders:{status:string;n:number}[];topStock:{meCode:string;color:string|null;physical:number}[]};
type ReportRow={op:string;meCode:string;color:string|null;chassis:string|null;kind:string;state:string;responsible:string|null;startAt:string|null;endAt:string|null;grossMinutes:number|null;pauseMinutes:number|null;netMinutes:number|null;pending:boolean};
type Report={total:number;limited:boolean;items:ReportRow[]};
const n=(v:number)=>new Intl.NumberFormat('pt-BR').format(v);
function csv(items:ReportRow[]){
 const fields:(keyof ReportRow)[]=['op','meCode','color','chassis','kind','state','responsible','startAt','endAt','grossMinutes','pauseMinutes','netMinutes'];
 const labels=['OP','Código ME','Cor','Chassi','Etapa','Estado','Responsável','Início','Fim','Minutos brutos','Minutos de pausa','Minutos líquidos'];
 const esc=(v:unknown)=>'"'+String(v??'').replace(/"/g,'""')+'"';
 return '\uFEFF'+labels.map(esc).join(';')+'\r\n'+items.map(r=>fields.map(f=>esc(r[f])).join(';')).join('\r\n');
}
function download(data:ReportRow[]){
 const file=new Blob([csv(data)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(file);
 const a=document.createElement('a');a.href=url;a.download='relatorio-producao-me.csv';a.click();URL.revokeObjectURL(url);
}
export function DashboardPage(){
 const q=useQuery({queryKey:['dashboard'],queryFn:()=>request<Dashboard>('/dashboard'),retry:false});
 const report=useQuery({queryKey:['production-report'],queryFn:()=>request<Report>('/reports/production'),retry:false});
 return <><Header title="Painel operacional">Saldos registrados, andamento das motos e indicadores derivados das OPs.</Header>
 <ErrorNotice error={q.error}/><ErrorNotice error={report.error}/>
 {(q.isPending||report.isPending)&&<p role="status">Calculando indicadores do banco local…</p>}
 {q.data&&<><div className={s.summary}>
  {[['Caixas disponíveis',q.data.boxes.available],['Caixas reservadas',q.data.boxes.reserved],['Caixas bloqueadas',q.data.boxes.blocked],['Unidades registradas',q.data.units]].map(([label,value])=><div key={label}><span>{label}</span><strong>{n(Number(value))}</strong></div>)}
 </div><div className={s.summary}>
  {[['Montagem concluída',q.data.assemblyDone],['Qualidade aprovada',q.data.qualityApproved],['Aguardando qualidade',q.data.pendingQuality],['Em transporte',q.data.shipped],['Recebidas na loja',q.data.received]].map(([label,value])=><div key={label}><span>{label}</span><strong>{n(Number(value))}</strong></div>)}
 </div>
 <section className={s.origin}><h2>OPs por situação</h2>{q.data.orders.map(o=><p key={o.status}>{o.status}: <strong>{n(o.n)}</strong></p>)}
 <NavLink to="/ordens">Abrir Ordens de Produção</NavLink></section>
 <section className={s.origin}><h2>Maiores saldos em caixas</h2>
 {q.data.topStock.length===0?<p className={s.empty}>Sem caixas cadastradas.</p>:<div className={s.tableWrap}><table><thead><tr><th>Código ME</th><th>Cor</th><th>Caixas físicas</th></tr></thead><tbody>{q.data.topStock.map((x,i)=><tr key={i}><td>{x.meCode}</td><td>{x.color??'Não aplicável'}</td><td>{n(x.physical)}</td></tr>)}</tbody></table></div>}</section>
 </>}
 <section className={s.origin}><h2>Relatório de tempos por etapa</h2>
 <p>Dados transcritos das OPs. Valores pendentes não entram como zero nas médias.</p>
 {report.data&&<><button onClick={()=>download(report.data!.items)} disabled={report.data.items.length===0}>Exportar CSV para Excel</button>
 <p>{n(report.data.items.length)} etapas exibidas de {n(report.data.total)}.</p>{report.data.limited&&<p role="alert">A exportação está limitada às 2.000 etapas mais recentes.</p>}
 {report.data.items.length>0&&<div className={s.tableWrap}><table><thead><tr><th>OP</th><th>Modelo</th><th>Etapa</th><th>Responsável</th><th>Minutos líquidos</th></tr></thead>
 <tbody>{report.data.items.slice(0,50).map((r,i)=><tr key={i}><td>{r.op}</td><td>{r.meCode}</td><td>{r.kind}</td><td>{r.responsible??'Pendente'}</td><td>{r.netMinutes===null?'Pendente':n(r.netMinutes)}</td></tr>)}</tbody></table></div>}</>}
 </section></>;
}
