import { defineConfig } from 'vitest/config';

export default defineConfig({ test: {
  environment: 'node', testTimeout: 15000, hookTimeout: 15000,
  projects: [
    { extends: true, test: { name: 'server', include: ['tests/server/**/*.test.ts'], environment: 'node' } },
    { extends: true, test: { name: 'web', include: ['tests/web/**/*.test.tsx'], environment: 'jsdom' } },
    { extends: true, test: { name: 'tooling', include: ['tests/tooling/**/*.test.ts'], environment: 'node' } }
  ]
} });
