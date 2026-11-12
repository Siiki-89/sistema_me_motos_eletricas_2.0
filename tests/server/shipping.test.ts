import {it,expect} from 'vitest';
import {buildApp} from '../../src/server/app.js';
import {mkdtempSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {qualityStaticItems,qualityRoadItems} from '../../src/shared/contracts/quality.js';

it('blocks shipment until quality approved and preserves receiving history',async()=>{
 mkdirSync('artifacts/test-tmp',{recursive:true});
 const dataDir=mkdtempSync(join(process.cwd(),'artifacts/test-tmp/ship-'));
 const app=buildApp({dataDir,port:4317,mode:'test'}),host={host:'127.0.0.1:4317'};
 const session=await app.inject({url:'/api/v1/session',headers:host});
 const headers={...host,origin:'http://127.0.0.1:4317',cookie:String(session.headers['set-cookie']).split(';')[0]!,'x-csrf-token':session.json().csrfToken};
 const cmd=()=>({operationId:randomUUID(),actorId:'local-operator' as const});
 const post=(url:string,payload:object)=>app.inject({method:'POST',url,headers,payload});
 const put=(url:string,payload:object)=>app.inject({method:'PUT',url,headers,payload});
 try{
 const p=(await post('/api/v1/catalog/products',{...cmd(),meCode:'SHIP-SYNTHETIC'})).json();
 const v=(await post('/api/v1/catalog/variants',{...cmd(),productId:p.id,color:null})).json();
 await post('/api/v1/boxes/receipts',{...cmd(),variantId:v.id,quantity:1,receivedDate:'2026-11-11'});
 const o=(await post('/api/v1/orders',{...cmd(),variantId:v.id,orderDate:'2026-11-11'})).json();
 const noShip=await post('/api/v1/shipments',{...cmd(),orderId:o.id,driver:'D',destination:'Loja',dispatchedAt:'2026-11-11T10:00',accessoriesChecked:true});
 expect(noShip.statusCode).toBe(409);
 await post(`/api/v1/orders/${o.id}/convert`,{...cmd(),version:1,chassis:'SHIPPING-CHASSIS'});
 const stage={id:randomUUID(),kind:'ASSEMBLY',state:'IN_PROGRESS',civilDate:null,startAt:'2026-11-11T08:00',endAt:'2026-11-11T09:00',responsible:'Mecânico',notes:null,occurrenceId:null,pauses:[]};
 const selfCheck={templateVersion:1,answers:Array.from({length:8},(_,i)=>({code:`2.${i+1}`,state:'CONFORMING',notes:null}))};
 await put(`/api/v1/orders/${o.id}/production`,{...cmd(),version:0,stages:[stage],occurrences:[],selfCheck});
 await post(`/api/v1/orders/${o.id}/production/stages/${stage.id}/complete`,{...cmd(),version:1});
 const ans=(items:readonly {code:string}[])=>items.map(i=>({code:i.code,state:'OK',notes:null}));
 await put(`/api/v1/orders/${o.id}/quality`,{...cmd(),version:0,checker:'Conferente',notes:null,staticAnswers:ans(qualityStaticItems),roadAnswers:ans(qualityRoadItems)});
 await post(`/api/v1/orders/${o.id}/quality/approve`,{...cmd(),version:1});
 const body={...cmd(),orderId:o.id,driver:'Motorista',destination:'Loja 1',dispatchedAt:'2026-11-11T10:00',accessoriesChecked:true};
 const ship=await post('/api/v1/shipments',body);
 expect(ship.statusCode).toBe(200);
 expect((await post('/api/v1/shipments',body)).json()).toEqual(ship.json());
 expect((await post('/api/v1/shipments',{...body,...cmd()})).statusCode).toBe(409);
 const receive=await post(`/api/v1/shipments/${ship.json().id}/receive`,{...cmd(),version:1,receivedAt:'2026-11-11T12:00',receivedBy:'Loja',withRemarks:true,remarks:'Avaria visível'});
 expect(receive.statusCode).toBe(200);
 expect(receive.json()).toMatchObject({status:'RECEIVED_WITH_REMARKS',version:2});
 expect(receive.json().history).toHaveLength(2);
 expect((await post(`/api/v1/shipments/${ship.json().id}/receive`,{...cmd(),version:2,receivedAt:'2026-11-11T13:00',receivedBy:'Outro',withRemarks:false})).statusCode).toBe(409);
 }finally{await app.close();}
});
