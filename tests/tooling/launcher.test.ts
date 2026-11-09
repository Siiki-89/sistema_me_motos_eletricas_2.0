import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const launch = (expression: string) => execFileSync(process.execPath, ['--input-type=module', '-e',
  `import { parsePort, runtimePath } from './scripts/runtime.mjs'; ${expression}`,
], { cwd: resolve('.'), encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });

describe('launch configuration', () => {
  it('uses a local pinned runtime independent of Codex', () => {
    expect(launch('console.log(runtimePath())').trim()).toContain('node-v24.22.2-win-x64');
  });
  it('validates port rather than coercing malformed input', () => {
    expect(launch("console.log(parsePort('4317'))").trim()).toBe('4317');
    expect(() => launch("parsePort('4317junk')")).toThrow();
    expect(() => launch("parsePort('0')")).toThrow();
    expect(() => launch("parsePort('65536')")).toThrow();
  });
});
