# Produção e tempos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development task-by-task. Um escritor por vez.

**Goal:** Transcrever produção física com tempos confiáveis e autoconferência sem alterar estoque.
**Architecture:** Extensão modular existente, tabelas aditivas e projeção de produção separada. API transacional por comando, contratos compartilhados, UI integrada à OP.
**Tech Stack:** React/TypeScript/Vite, Fastify/Node24, SQLite local, Windows; sem novas dependências.
**Spec:** docs/modulos/producao-tempos.md; pedido exato preservado localmente em .superpowers/sdd/etapa6/spec.md.

## Global Constraints

Não sobrescrever/migrar/restaurar base real nem alterar journals. Não modificar migrations001–003 nem reserva/conversão. Somente bases sintéticas; backup local antes de editar arquivos. Não implementar qualidade/expedição/peças completas. Commits locais; nenhum push implícito.

## Review Focus

- Intervalos parcialmente conhecidos/virada de dia/pausa aberta: pendente não vira zero.
- Alterar limites da etapa com pausas existentes: validar conjunto e rollback integral.
- Correção após conclusão/NC/NA: histórico e estado coerentes, qualidade nunca aprovada.
- Atualização obsoleta/reenvio após erro: idempotência sem perder rascunho ou duplicar etapas/estoque.
- Restore3→4 e status de unidade: handlers usam conexão atual, projeção consistente sem reconstruir identidade.

### Tarefa1 — Diagnóstico e inicialização explícita
- [x] Investigar somente leitura e classificar em docs/diagnostico-banco-operacional.md.
- [x] TDD de recusa sem pasta explícita; scripts/start.ps1 e src/server/main.ts não dependem de LOCALAPPDATA implícito. Testes em tests/tooling/ e bases descartáveis.
- [x] Documentar inicialização segura; preservar demo/operacional separados. Revisar na integração.

### Tarefa2 — Backend de produção
Files: criar migrations/004-production.sql, src/shared/contracts/production.ts, src/server/modules/production/{routes,service,time}.ts e tests/server/production*.test.ts. Alterar composição, suporte a schema/backup4 e projeção de status nas consultas de unidade; nenhum controle de estoque alterado.
Interfaces: GET /orders/:id/production; comandos de salvar etapa/pausas, concluir/reabrir, ocorrência e checklist. DTOs finais publicados pelo implementador antes da UI.
- [x] RED de parciais/tempos (23:00→01:00 menos30 =90), overlap/rollback, estados/checklist e manutenção de saldo.
- [x] Implementar tabelas/FKs/versionamento/checklistv1, idempotência/audit e cálculos puros; pausa ilimitada por domínio, limites técnicos de payload documentados.
- [x] GREEN de edições/retries, conflitos, reinício, migration3 preenchida preservada, backup/restore4 e proteção de segunda baixa.
- [x] Revisão de tarefa (spec e qualidade), contratos/relatório.

### Tarefa3 — UI de produção
Files: src/web/features/production/*, integração OP/unidades, lib/api.ts e tests/web/production.test.tsx. Manter design system.
- [x] RED de navegação/parcial/erro e confirmação de conclusão.
- [x] Formulários, pausas/retrabalhos/ocorrências/checklist, tempos/pendências, proteção de rascunho/retry e histórico.
- [x] GREEN, typecheck e revisão; sem cronômetro obrigatório nem aprovação de qualidade.

### Tarefa4 — Integração e entrega
Files: scripts/browser-production.mjs, runner e documentação de operação/verificação/estado/plano.
- [x] Build, suíte completa e AgentBrowser produção desktop/móvel; validar erro/retry, salvar parcial, cálculo90min, checklistNC, conclusão explícita, reabertura, saldo inalterado.
- [x] Regressão proporcional OP/backup e inspeção visual/a11y; somente sintéticos.
- [x] Revisão geral, correções necessárias, evidência real e commit local; relatar diagnóstico3 e pendências. Não avançar etapa7.
