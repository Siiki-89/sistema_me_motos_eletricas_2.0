import {it,expect} from 'vitest';
import {buildApp} from '../../src/server/app.js';
import {mkdtempSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
it('dashboard reflects persisted box and OP balances and exports stage reports',async()=>{
 mkdirSync('artifacts/test-tmp',{recursive:true});
 const app=buildApp({dataDir:mkdtempSync(join(process.cwd(),'artifacts/test-tmp/dashboard-')),port:4317,mode:'test'});
 const h={host:'127.0.0.1:4317'},ss=await app.inject({url:'/api/v1/session',headers:h});
 const headers={...h,origin:'http://127.0.0.1:4317',cookie:String(ss.headers['set-cookie']).split(';')[0]!,'x-csrf-token':ss.json().csrfToken};
 const cmd=()=>({operationId:randomUUID(),actorId:'local-operator'});
 const post=(url:string,payload:object)=>app.inject({method:'POST',url,headers,payload});
 try{
 const p=(await post('/api/v1/catalog/products',{...cmd(),meCode:'DASH-ME'})).json();
 const v=(await post('/api/v1/catalog/variants',{...cmd(),productId:p.id,color:'Verde'})).json();
 await post('/api/v1/boxes/receipts',{...cmd(),variantId:v.id,quantity:3,receivedDate:'2026-11-11'});
 const before=(await app.inject({url:'/api/v1/dashboard',headers:h})).json();
 expect(before.boxes).toMatchObject({physical:3,available:3,reserved:0});
 await post('/api/v1/orders',{...cmd(),variantId:v.id,orderDate:'2026-11-11'});
 const after=(await app.inject({url:'/api/v1/dashboard',headers:h})).json();
 expect(after.boxes).toMatchObject({physical:3,available:2,reserved:1});
 expect(after.orders.some((x:{status:string;n:number})=>x.status==='RESERVED'&&x.n===1)).toBe(true);
 expect((await app.inject({url:'/api/v1/reports/production',headers:h})).json()).toMatchObject({total:0,limited:false,items:[]});
 }finally{await app.close();}
});
