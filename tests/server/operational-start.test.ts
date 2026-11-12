import {it,expect} from 'vitest';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
it('production executable refuses absent SQLite without explicit initialization',()=>{
 mkdirSync('artifacts/test-tmp',{recursive:true});
 const dir=mkdtempSync(join(process.cwd(),'artifacts/test-tmp/no-operational-db-'));
 const result=spawnSync(process.execPath,['--import','tsx','src/server/main.ts'],{
  env:{...process.env,ME_DATA_DIR:dir,NODE_ENV:'production',ME_INIT_NEW_DATABASE:'0'},encoding:'utf8',timeout:15000
 });
 expect(result.status).toBe(1);
 expect(existsSync(join(dir,'me-estoque.sqlite'))).toBe(false);
});
