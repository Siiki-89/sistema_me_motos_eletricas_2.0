import {it,expect} from 'vitest';
import {DatabaseStore} from '../../src/server/platform/backups.js';
import {mkdtempSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
it('creates no more than one automatic backup per 24 hours and preserves manual backups',async()=>{
 mkdirSync('artifacts/test-tmp',{recursive:true});
 const store=new DatabaseStore(mkdtempSync(join(process.cwd(),'artifacts/test-tmp/automatic-backup-')));
 try{
  expect(store.list()).toHaveLength(0);
  const first=await store.createAutomaticIfDue();
  expect(first?.mode).toBe('AUTO');
  expect(await store.createAutomaticIfDue()).toBeNull();
  expect(store.list()).toHaveLength(1);
  const manual=await store.create();
  expect(manual.mode).toBe('MANUAL');
  expect(store.list()).toHaveLength(2);
  expect(store.validate(first!.id).schemaVersion).toBe(7);
 }finally{store.close();}
});
