import {it,expect} from 'vitest';
import {buildApp} from '../../src/server/app.js';
import {mkdtempSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
it('tracks extra parts from box to common stock without duplication',async()=>{
 mkdirSync('artifacts/test-tmp',{recursive:true});
 const app=buildApp({dataDir:mkdtempSync(join(process.cwd(),'artifacts/test-tmp/parts-')),port:4317,mode:'test'});
 const host={host:'127.0.0.1:4317'},ss=await app.inject({url:'/api/v1/session',headers:host});
 const headers={...host,origin:'http://127.0.0.1:4317',cookie:String(ss.headers['set-cookie']).split(';')[0]!,'x-csrf-token':ss.json().csrfToken};
 const cmd=()=>({operationId:randomUUID(),actorId:'local-operator' as const});
 const post=(url:string,payload:object)=>app.inject({method:'POST',url,headers,payload});
 const get=(url:string)=>app.inject({url,headers:host});
 try{
 const p=(await post('/api/v1/catalog/products',{...cmd(),meCode:'SYN-PART'})).json();
 const v=(await post('/api/v1/catalog/variants',{...cmd(),productId:p.id,color:null})).json();
 await post('/api/v1/boxes/receipts',{...cmd(),variantId:v.id,quantity:1,receivedDate:'2026-11-11'});
 const order=(await post('/api/v1/orders',{...cmd(),variantId:v.id,orderDate:'2026-11-11'})).json();
 const unit=(await post(`/api/v1/orders/${order.id}/convert`,{...cmd(),version:1,chassis:'PART-TEST'})).json().unit.id;
 const item=await post('/api/v1/parts',{...cmd(),code:'CONTROL-001',name:'Controladora extra',category:'CONTROLADORA'});
 expect(item.statusCode).toBe(200);const partId=item.json().id;
 expect((await post('/api/v1/parts/receipts',{...cmd(),partId,quantity:3,effectiveDate:'2026-11-11'})).statusCode).toBe(200);
 const extra={...cmd(),partId,unitId:unit,quantity:2,effectiveDate:'2026-11-11'};
 const result=await post('/api/v1/parts/extras',extra);expect(result.statusCode).toBe(200);
 expect((await post('/api/v1/parts/extras',extra)).json()).toEqual(result.json());
 expect((await get(`/api/v1/units/${unit}/extras`)).json().items[0].quantity).toBe(2);
 const loc='UNIT:'+unit;
 expect((await post('/api/v1/parts/transfers',{...cmd(),partId,fromLocation:loc,toLocation:'COMMON',quantity:1,effectiveDate:'2026-11-11',reason:'Excedente'})).statusCode).toBe(200);
 expect((await post('/api/v1/parts/transfers',{...cmd(),partId,fromLocation:loc,toLocation:'COMMON',quantity:2,effectiveDate:'2026-11-11',reason:'Excedente'})).statusCode).toBe(409);
 expect((await get('/api/v1/parts')).json().items[0].commonQuantity).toBe(4);
 expect((await get(`/api/v1/units/${unit}/extras`)).json().items[0].quantity).toBe(1);
 }finally{await app.close();}
});
