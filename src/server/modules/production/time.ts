import {fail} from '../../platform/commands.js';

type Interval = { start: number | null; end: number | null };

function overlapsKnownInterval(interval: Interval, other: Interval): boolean {
  if (interval.start === null || interval.end === null) return false;
  if (other.start !== null && other.end !== null) {
    return Math.max(interval.start, other.start) < Math.min(interval.end, other.end);
  }
  const knownEndpoint = other.start ?? other.end;
  return knownEndpoint !== null && interval.start < knownEndpoint && knownEndpoint < interval.end;
}

export function civilMinute(value:string|null):number|null {
 if(value===null)return null;
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))fail('INVALID_TIME','Informe data e hora completas.',400);
 const n=Date.parse(value+'Z');
 if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,16)!==value)fail('INVALID_TIME','Data ou hora inválida.',400);
 return n/60000;
}
export function calculateTimes(stage: {startAt:string|null;endAt:string|null;pauses:{startAt:string|null;endAt:string|null}[]}) {
 const start=civilMinute(stage.startAt),end=civilMinute(stage.endAt);
 if(start!==null&&end!==null&&end<start)fail('INVALID_INTERVAL','Término anterior ao início.',400);
 const intervals=stage.pauses.map(p=>({start:civilMinute(p.startAt),end:civilMinute(p.endAt)}));
 for(const p of intervals){
  if(p.start!==null&&p.end!==null&&p.end<p.start)fail('INVALID_INTERVAL','Pausa negativa.',400);
  for(const v of [p.start,p.end])if(v!==null&&((start!==null&&v<start)||(end!==null&&v>end)))fail('PAUSE_OUT_OF_BOUNDS','Pausa fora da etapa.',400);
 }
 for(let i=0;i<intervals.length;i++)for(let j=i+1;j<intervals.length;j++){
  const a=intervals[i]!,b=intervals[j]!;
  if (overlapsKnownInterval(a, b) || overlapsKnownInterval(b, a)) {
    fail('PAUSE_OVERLAP', 'Pausas sobrepostas.', 400);
  }
 }
 const grossMinutes=start!==null&&end!==null?end-start:null;
 const pauseMinutes=intervals.some(p=>p.start===null||p.end===null)?null:intervals.reduce((sum,p)=>sum+p.end!-p.start!,0);
 const netMinutes=grossMinutes!==null&&pauseMinutes!==null?grossMinutes-pauseMinutes:null;
 return {grossMinutes,pauseMinutes,netMinutes,pending:netMinutes===null};
}
