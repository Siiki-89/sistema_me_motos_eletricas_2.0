import {it,expect} from 'vitest';
import {calculateTimes} from '../../src/server/modules/production/time.js';
it('subtracts only known own pauses across midnight and preserves pending data',()=>{
 expect(calculateTimes({startAt:'2026-11-10T23:00',endAt:'2026-11-11T01:00',pauses:[{startAt:'2026-11-10T23:30',endAt:'2026-11-11T00:00'}]})).toEqual({grossMinutes:120,pauseMinutes:30,netMinutes:90,pending:false});
 expect(calculateTimes({startAt:null,endAt:null,pauses:[]})).toMatchObject({grossMinutes:null,netMinutes:null,pending:true});
 expect(calculateTimes({startAt:'2026-11-10T23:00',endAt:null,pauses:[{startAt:'2026-11-10T23:30',endAt:null}]})).toMatchObject({pauseMinutes:null,netMinutes:null,pending:true});
});
it('preserves ambiguous incomplete pauses as pending and rejects only demonstrated intersections',()=>{
 const period={startAt:'2026-11-10T10:00',endAt:'2026-11-10T15:00'};
 for(const pauses of [
  [{startAt:'2026-11-10T11:00',endAt:'2026-11-10T12:00'},{startAt:null,endAt:'2026-11-10T14:00'}],
  [{startAt:'2026-11-10T11:00',endAt:null},{startAt:'2026-11-10T13:00',endAt:null}],
  [{startAt:null,endAt:'2026-11-10T11:00'},{startAt:null,endAt:'2026-11-10T14:00'}],
 ])expect(calculateTimes({...period,pauses})).toMatchObject({grossMinutes:300,pauseMinutes:null,netMinutes:null,pending:true});
 for(const pauses of [
  [{startAt:'2026-11-10T11:00',endAt:'2026-11-10T12:00'},{startAt:null,endAt:'2026-11-10T11:30'}],
  [{startAt:'2026-11-10T11:00',endAt:'2026-11-10T12:00'},{startAt:'2026-11-10T11:30',endAt:null}],
  [{startAt:'2026-11-10T11:00',endAt:'2026-11-10T12:00'},{startAt:'2026-11-10T10:30',endAt:'2026-11-10T11:30'}],
 ])expect(()=>calculateTimes({...period,pauses})).toThrow('Pausas sobrepostas');
});
it('rejects impossible civil values, reversed, overlapping and out of bounds intervals',()=>{
 for(const stage of [
 {startAt:'2026-02-30T10:00',endAt:null,pauses:[]},
 {startAt:'2026-11-10T12:00',endAt:'2026-11-10T11:00',pauses:[]},
 {startAt:'2026-11-10T10:00',endAt:'2026-11-10T12:00',pauses:[{startAt:'2026-11-10T09:00',endAt:null}]},
 {startAt:null,endAt:null,pauses:[{startAt:'2026-11-10T10:00',endAt:'2026-11-10T11:00'},{startAt:'2026-11-10T10:30',endAt:null}]},
 ])expect(()=>calculateTimes(stage)).toThrow();
});
