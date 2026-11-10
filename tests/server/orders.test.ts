import { it, expect } from 'vitest';
import { buildApp } from '../../src/server/app.js';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

it('reserves once, converts partial once and preserves stock after cancellation', async () => {
  mkdirSync('artifacts/test-tmp', { recursive: true });
  const app = buildApp({ dataDir: mkdtempSync(join(process.cwd(),'artifacts/test-tmp/orders-')), port:4317, mode:'test' });
  const host = {host:'127.0.0.1:4317'};
  try {
    const s = await app.inject({url:'/api/v1/session',headers:host});
    const headers = {...host,origin:'http://127.0.0.1:4317',cookie:String(s.headers['set-cookie']).split(';')[0]!, 'x-csrf-token':s.json().csrfToken};
    const cmd = () => ({operationId:randomUUID(),actorId:'local-operator'});
    const post = (url:string,payload:object) => app.inject({method:'POST',url,headers,payload});
    const get = (url:string) => app.inject({url,headers:host});
    const p = (await post('/api/v1/catalog/products',{...cmd(),meCode:'SYN-OP'})).json();
    const v = (await post('/api/v1/catalog/variants',{...cmd(),productId:p.id,color:'Azul'})).json();
    const receipt = (await post('/api/v1/boxes/receipts',{...cmd(),variantId:v.id,quantity:1,receivedDate:'2026-11-10',lot:'SYN-LOT'})).json();
    const body={...cmd(),variantId:v.id,orderDate:'2026-11-10'};
    const created=await post('/api/v1/orders',body);
    expect(created.statusCode).toBe(200);
    const o=created.json();
    expect(o).toMatchObject({code:'OP-000001',status:'RESERVED',version:1,originId:receipt.originId});
    expect((await post('/api/v1/orders',body)).json()).toEqual(o);
    expect((await post('/api/v1/orders',{...body,operationId:randomUUID()})).statusCode).toBe(409);
    expect((await get('/api/v1/boxes/summary')).json()).toMatchObject({physical:1,reserved:1,available:0});
    const convert={...cmd(),version:1};
    const converted=await post(`/api/v1/orders/${o.id}/convert`,convert);
    expect(converted.statusCode).toBe(200);
    const result=converted.json();
    expect(result.order.status).toBe('TRANSCRIBING');
    expect(result.unit).toMatchObject({originId:receipt.originId,chassis:null,originOrderId:o.id,qualityStatus:'PENDING'});
    expect((await post(`/api/v1/orders/${o.id}/convert`,convert)).json()).toEqual(result);
    expect((await post(`/api/v1/orders/${o.id}/convert`,{...cmd(),version:2})).json().unit.id).toBe(result.unit.id);
    expect((await get('/api/v1/boxes/summary')).json()).toMatchObject({physical:0,reserved:0,available:0});
    expect((await post(`/api/v1/orders/${o.id}/cancel`,{...cmd(),version:2,reason:'Sintético',effectiveDate:'2026-11-10',boxOpened:false})).statusCode).toBe(200);
    expect((await post(`/api/v1/orders/${o.id}/convert`,convert)).json()).toEqual(result);
    expect((await get('/api/v1/boxes/summary')).json().physical).toBe(0);
  } finally { await app.close(); }
});
