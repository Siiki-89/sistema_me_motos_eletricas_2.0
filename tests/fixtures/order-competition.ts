import { openDatabase } from '../../src/server/platform/database.js';
import { command } from '../../src/server/platform/commands.js';
import { createOrder } from '../../src/server/modules/orders-domain.js';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/server/app.js';
if(process.argv[4]) {
 const app=buildApp({dataDir:process.argv[2]!,port:4317,mode:'test'});
 const host={host:'127.0.0.1:4317'};
 const s=await app.inject({url:'/api/v1/session',headers:host});
 const headers={...host,origin:'http://127.0.0.1:4317',cookie:String(s.headers['set-cookie']).split(';')[0]!, 'x-csrf-token':s.json().csrfToken};
 process.send?.('ready');
 process.once('message',async()=>{
  const action=process.argv[4]!;
  const payload={operationId:randomUUID(),actorId:'local-operator',version:1,...(action==='cancel'?{reason:'SYN race',effectiveDate:'2026-11-10',boxOpened:false}:{})};
  const response=await app.inject({method:'POST',url:`/api/v1/orders/${process.argv[3]}/${action}`,headers,payload});
  process.send?.({ok:response.statusCode===200,code:response.json().error?.code});
  await app.close();process.disconnect();
 });
} else {
const db=openDatabase(process.argv[2]!);
process.send?.('ready');
process.once('message',()=>{
 try {
  const result=command(db,'order.create',{operationId:randomUUID(),actorId:'local-operator'},()=>createOrder(db,{operationId:randomUUID(),actorId:'local-operator',variantId:process.argv[3]!,orderDate:'2026-11-10'}));
  process.send?.({ok:true,result});
 }catch(e){process.send?.({ok:false,code:(e as {code?:string}).code});}
 finally{db.close();process.disconnect();}
});
}
