# ME Estoque 2.0 — Implementation Plan

> **Execução vigente:** o usuário autorizou subagent-driven-development/TDD/revisão nas etapas3/4. Tarefas1/3 entregues e tarefa2 parcial; demais tarefas exigem novo pedido. Não reabrir aprovação já concedida nem antecipar OP.

**Goal:** Entregar gestão local de caixas, unidades e produção com estoque consistente, qualidade rastreável e recuperação verificável.

**Architecture:** Um aplicativo modular em TypeScript, UI React e API Fastify em loopback, com SQLite local. Comandos transacionais concentram regras; novas OPs de unidades existentes não usam o caminho de conversão.

**Tech Stack:** Node 24 LTS, TypeScript, React/Vite, React Router, CSS Modules/Radix, TanStack Query, Fastify/TypeBox, better-sqlite3, Vitest/Testing Library e Agent Browser.

**Spec:** [Arquitetura técnica](../../arquitetura-tecnica.md), [fluxo operacional](../../proposta-fluxo-operacional.md), [regras aprovadas](../../modulos/estoque-producao.md) e [invariantes/casos de conflito](../../validacao-consistencia.md).

**Status em 09/11/2026:** etapas 3 e 4 autorizadas. Tarefas1 e3 implementadas; tarefa2 parcial (persistência, auditoria/idempotência e recuperação manual); tarefas4–12 pendentes. Evidências em [verificação modelos/caixas](../../verificacao-modelos-caixas.md). Não avançar automaticamente.

## Global Constraints

### Registro da primeira entrega

Implementação real usa `tests/server/foundation.test.ts`, `tests/web/app.test.tsx` e `tests/tooling/`, em lugar dos nomes iniciais ilustrados na tarefa 1. Tokens ficam em `src/web/app/tokens.css`; schemas/DTOs mínimos em `src/shared/contracts/foundation.ts`. `buildApp` permanece síncrono. Tipos genéricos de comandos de domínio foram adiados até existirem consumidores. O runner aceita `shell` e `backup`, sem arquivos JSON de cenário redundantes. Backend e UI foram delegados separadamente conforme pedido posterior do usuário, com revisão independente.

Recorte mínimo da tarefa 2 já executado: migration técnica versão1 com checksum/compatibilidade, persistência, FK/transação, backup manual validado, restauração com safety backup e bloqueio por journal interrompido. Não marcar seus passos compostos como completos: retenção/agendamento, testes de crash abrangentes e recuperação automática continuam pendentes. A etapa4 acrescentou migration002 e domínio operacional. Auditoria/idempotência já entregues; backup agendado, retenção e recuperação automática excepcional permanecem pendentes.

- Windows/PowerShell; um computador; SQLite exclusivamente local; funções essenciais offline.
- Produto novo. Não reutilizar código, migrar planilha, executar ZIP ou cadastrar catálogos de referência automaticamente.
- Node.js 24 LTS; SQLite embutido 3.51.3 ou superior. Fixar patches e lockfile após prova de compatibilidade Windows.
- Uma moto por OP; uma unidade pode ter várias OPs históricas. Somente OP INITIAL reserva/converte.
- D = S − R − B; saldos não negativos. Conversão atômica e idempotente, com transcrição parcial.
- Saída administrativa nunca aprova qualidade nem substitui entrega normal ao cliente.
- Dados reais, SQLite, backups, logs e evidências de navegador ficam fora do Git.
- Backup antes de editar arquivos existentes; testes em base sintética isolada; nunca usar perfil pessoal do navegador.
- Encerrar cada incremento com revisão, evidências e commit local dos arquivos pertinentes. Não publicar nem iniciar operação real automaticamente.

## Review Focus

1. Resposta perdida após commit/duplo clique com outra chave: uma conversão e uma unidade — tarefas 2 e 5.
2. Duas abas reservando a última caixa ou cancelando durante conversão: uma transição vence sem saldo inválido — tarefas 4 e 5.
3. Horários atravessando meia-noite, pausas abertas/sobrepostas e N/A: não inventar duração/aprovação — tarefas 7 e 9.
4. Disco cheio, processo encerrado e backup incompatível: preservar estado válido e permitir recuperação — tarefas 2 e 12.
5. Moto já aprovada ganha nova OP ou saída administrativa: não reaproveitar aprovação nem descontar outra caixa — tarefas 6, 9 e 10.

## Mapa e contratos comuns

Estrutura em um package.json, sem monorepo. `src/server/modules/<capacidade>` contém serviço/rotas/persistência da capacidade; `src/web/features/<capacidade>` contém a interface; `src/shared/contracts` contém schemas/DTOs; `migrations` contém SQL incremental. Não criar arquivos vazios de módulos futuros.

Na tarefa 1, definir em `src/shared/contracts/common.ts`: `Id = string`, `CommandMeta = {operationId: Id; actorId: Id; effectiveAt: string; expectedVersion?: number}`, `DomainError = {code: string; message: string; fields?: Record<string,string>}`, `Result<T> = {ok: true; value: T} | {ok: false; error: DomainError}`, `Page<T> = {items: T[]; total: number; page: number; pageSize: number}`. Datas ISO com offset; exibir em horário local. Erros 400 de entrada, 404 inexistente e 409 de conflito/estado; falha interna sem detalhes privados.

Na tarefa 2, definir `AppContext = {db; clock; ids}` em `src/server/platform/context.ts`, com tipos concretos para SQLite, relógio e gerador de UUID. Serviços de domínio recebem `ctx, input, meta` e retornam `Result<T>` síncrono; rotas adaptam para HTTP. Não manter transação aberta durante await. Backup e jobs de arquivo têm API assíncrona própria.

Os nomes de DTOs abaixo são contratos a definir no arquivo indicado em cada tarefa; os campos listados são mínimos, não autorização para inventar dados de negócio. Valores de testes são fictícios.

Scripts planejados na tarefa 1: `npm run test -- <arquivo>` = Vitest run; `npm run typecheck`; `npm run build`; `npm run test:browser -- <cenario>` = executor Node do Agent Browser com sessão isolada, base temporária e falha por exit code. Antes da primeira instalação, verificar dependências contra documentação oficial; não usar runtime do Codex como dependência do produto.

## Fase A — fundação recuperável

### Tarefa 1 — Aplicação local e contrato de interface

**Criar:** `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/shared/contracts/common.ts`, `src/server/app.ts`, `src/server/main.ts`, `src/server/platform/http-security.ts`, `src/web/app/main.tsx`, `src/web/app/App.tsx`, `src/web/styles/tokens.css`, `src/web/components/Feedback.tsx`, `scripts/test-browser.mjs`, `tests/http-security.test.ts`, `tests/app.test.tsx`, `tests/browser/shell.json`, `docs/design-system.md`.

**Interfaces:** `buildApp(options: {dataDir: string; port: number; mode: 'test'|'development'|'production'}): FastifyInstance`; `GET /api/v1/health` retorna identidade/versão/status sem caminhos privados. Tokens/sessão local e proteção Origin/Host funcionam também em testes. Layout inicial sem funcionalidades falsas.

- [x] Definir tokens e estados de feedback conforme me-design-system/frontend-design; fixar dependências e escrever testes de proteção e navegação antes dos handlers/componentes.
- [x] Executar `npm run test -- tests/http-security.test.ts tests/app.test.tsx`; esperar FAIL: app ainda não implementado.
- [x] Implementar buildApp, contratos, sessão e shell; servir build na mesma origem em produção, API só loopback. Scripts de testes falham se não houver testes/cenário.
- [x] Reexecutar testes; esperar PASS; rodar typecheck/build e `npm run test:browser -- shell`, verificando foco/teclado e ausência de requisições externas.
- [x] Registrar versões e evidências; commit `feat: add local application foundation` com os arquivos desta tarefa.

Asserções obrigatórias do teste:
```ts
expect(health.app).toBe('me-estoque');
expect(externalOriginMutation.statusCode).toBe(403);
expect(invalidHost.statusCode).toBe(403);
expect(missingCsrf.statusCode).toBe(403);
```

### Tarefa 2 — SQLite, auditoria e recuperação

**Criar:** `src/server/platform/{context,db,migrations,commands,audit,backup}.ts`, `src/shared/contracts/backup.ts`, `migrations/001-foundation.sql`, `src/web/features/settings/BackupPage.tsx`, `tests/persistence.test.ts`, `tests/backup.test.ts`, `tests/fixtures/crash-worker.ts`, `tests/browser/backup.json`. **Modificar:** app.ts/App.tsx para registrar a capacidade.

**Interfaces:** `openDatabase(path: string): Database`; `runCommand<T>(ctx, name, input, meta, apply: () => T): Result<T>` grava recibo/hash/auditoria e efeitos juntos; `createBackup(ctx, targetDir): Promise<BackupManifest>`; `validateRestore(path): Promise<RestoreReport>`; `restoreBackup(ctx, path, confirmation): Promise<RestoreReport>`. Manifesto inclui schemaVersion, createdAt e sha256. `actorId` é validado contra cadastro local inicial criado no primeiro uso, sem alegar autenticação pessoal.

- [ ] Escrever testes com SQLite temporário para foreign keys, rollback, repetição de comando, conteúdo divergente, falha de escrita/backup e schema futuro recusado.
- [ ] Executar `npm run test -- tests/persistence.test.ts tests/backup.test.ts`; esperar FAIL por contratos ausentes.
- [ ] Implementar migrations verificadas por checksum, transações curtas, versão SQLite mínima, auditoria e backup/restauração em manutenção exclusiva. Incluir cópia prévia e estado de recuperação da troca de arquivos.
- [ ] Reexecutar testes (PASS), encerrando subprocesso antes e depois do commit; rodar `npm run test:browser -- backup` com cópias sintéticas válidas/corrompidas.
- [ ] Documentar procedimento de restauração e commit `feat: add transactional storage and recovery`.

```ts
expect(retry.value).toEqual(first.value);
expect(sameKeyDifferentBody.error.code).toBe('IDEMPOTENCY_CONFLICT');
expect(afterRollback).toEqual(before);
expect(liveHashAfterRejectedRestore).toBe(liveHashBefore);
```

## Registro da etapa 4

Prompt posterior autorizou tarefa3 e dependências mínimas restantes da tarefa2, com SDD/TDD/revisão. Estrutura real: modules/{catalog,boxes,domain,queries,operations}.ts e platform/commands.ts; UI features/catalog/Models.tsx, features/boxes/{Receiving,Stock}.tsx e features/common/Operational.tsx. Testes em tests/server/boxes.test.ts e tests/web/operations.test.tsx. Cenário navegador: scripts/test-browser.mjs receipt. Não foram criados placeholders de módulos futuros.

Nesta entrega R=0 e B não existe; D=S−R. Campos e regras em [catálogo e caixas](../../modulos/catalogo-caixas.md). A tarefa4 adicionará reservas/bloqueios com seus próprios testes. Produto/cor são comandos separados, origem agregada guarda snapshots; correções exigem motivo. Versão otimista e operação UUID protegem repetição/conflito. Consultas SQL paginadas50/máximo100. Migration002 com backup pré-upgrade e restauração compatível1/2. A tarefa2 continua parcial: não marcar seus passos compostos como integralmente concluídos.

## Fase B — caixas e identidade individual

### Tarefa 3 — Cadastros, recebimento e saldo de caixas

**Criar:** `src/shared/contracts/{catalog,boxes}.ts`, `src/server/modules/catalog/{service,routes}.ts`, `src/server/modules/boxes/{service,routes}.ts`, `migrations/002-boxes.sql`, `src/web/features/boxes/{StockPage,ReceiptForm}.tsx`, `tests/boxes.test.ts`, `tests/browser/receipt.json`. **Modificar:** composição app.ts/App.tsx.

**Interfaces:** `createVariant(ctx, {meCode, commercialName?, color, colorApplicable}, meta): Result<Variant>`; `receiveBoxes(ctx, {lines: {variantId, quantity}[]}, meta): Result<Receipt>`; `reverseReceipt(ctx, {receiptId, reason}, meta): Result<ReceiptReversal>`; `getBoxBalance(ctx, variantId): {S:number; R:number; B:number; D:number}`. DTOs com ID e version quando mutáveis. Busca paginada `Page<VariantBalance>`. Estorno de entrada compensa movimentos e rejeita redução incompatível com S/R/B; tarefa 4 acrescenta testes com reservas.

- [x] Escrever casos de código compartilhado entre unidades futuras, cadastro variante único, quantidade zero/fracionada recusada, entrada repetida, estorno idempotente/compensatório e nome comercial ausente permitido.
- [x] Executar `npm run test -- tests/boxes.test.ts`; esperar FAIL.
- [x] Implementar cadastros e recebimentos com auditoria, livro de movimentos e tela por código/cor; sem IDs de caixas físicas e sem carregar catálogo de referência.
- [x] Reexecutar (PASS); `npm run test:browser -- receipt`: registrar 2 caixas, atualizar página, pesquisar e conferir D=2.
- [x] Commit `feat: receive boxes by product and color`.

```ts
expect(balanceAfterReceivingTwo).toEqual({S:2,R:0,B:0,D:2});
expect(balanceAfterRetry).toEqual(balanceAfterReceivingTwo);
expect(invalidQuantity.error.code).toBe('INVALID_QUANTITY');
```

### Tarefa 4 — OP inicial, reserva, impressão e cancelamento

**Criar:** `src/shared/contracts/orders.ts`, `src/server/modules/orders/{service,routes}.ts`, `migrations/003-orders.sql`, `src/web/features/orders/{OrdersPage,CreateOrderForm,OrderPrint}.tsx`, `tests/reservations.test.ts`, `tests/browser/reservation.json`. **Modificar:** boxes/service.ts e composição.

**Interfaces:** `createInitialOrder(ctx, {variantId}, meta): Result<Order>`; `cancelOrder(ctx, {orderId, reason, boxAlreadyOpened:boolean}, meta): Result<Order>`; `changeReservation(ctx, {orderId, variantId, reason}, meta): Result<Order>`. Order inclui id, number, type, unitId nullable, state, version. `blockBoxes(ctx, {variantId, quantity, reason}, meta): Result<BoxBlock>` e `releaseBoxBlock(ctx, {blockId, quantity, reason, physicalBoxClosed:true}, meta): Result<BoxBlock>` pertencem a boxes/service.ts. `regularizeOpenedBox(ctx, {blockId, cancelledOrderId, reason}, meta): Result<Order>` transfere uma quantidade B para R ao criar nova INITIAL, sem usar disponibilidade nem converter antes da transcrição.

- [ ] Testar última caixa com duas conexões, cancelamento repetido, mudança de variante sem saldo, estorno de entrada impedido por reservas e cancelamento com abertura física informada (libera R e aumenta B). Testar regularização B→R uma vez, D inalterado, vínculo à OP cancelada e recusa de liberar caixa aberta como fechada.
- [ ] Executar `npm run test -- tests/reservations.test.ts`; esperar FAIL.
- [ ] Implementar criação atômica, numeração não reutilizada, cancelamento e ficha imprimível; impressão/reimpressão não têm mutação.
- [ ] Reexecutar (PASS); `npm run test:browser -- reservation`: criar/imprimir/cancelar e conferir saldos, mensagem de indisponibilidade e motivo obrigatório.
- [ ] Commit `feat: reserve boxes for initial production orders`.

```ts
expect(successfulReservationsForLastBox).toBe(1);
expect(afterClosedBoxCancellation).toEqual({S:1,R:0,B:0,D:1});
expect(afterOpenedBoxCancellation).toEqual({S:1,R:0,B:1,D:0});
```

### Tarefa 5 — Conversão e transcrição parcial

**Criar:** `src/shared/contracts/units.ts`, `src/server/modules/orders/conversion.ts`, `src/server/modules/production/{units,routes}.ts`, `migrations/004-units.sql`, `src/web/features/orders/TranscriptionPage.tsx`, `src/web/features/units/UnitPage.tsx`, `tests/conversion.test.ts`, `tests/browser/conversion.json`. **Modificar:** rotas/composição de OP.

**Interfaces:** `convertOrder(ctx, {orderId, chassis?:string}, meta): Result<Unit>`; `updateUnitIdentity(ctx, {unitId, chassis, reason?}, meta): Result<Unit>`. Unit inclui id, originOrderId, variantId, chassis nullable, operationalRevision, version. Mais dados parciais entram pelas APIs das tarefas 7–9, sem converter outra vez.

- [ ] Escrever testes de rollback em cada efeito, chassi pendente/duplicado, retry com mesma/outra chave, edição obsoleta e disputa conversão/cancelamento em duas conexões.
- [ ] Executar `npm run test -- tests/conversion.test.ts`; esperar FAIL.
- [ ] Implementar conversão INITIAL uma única vez e identidade normalizada; recusar conflito antes de qualquer commit. Guardar origem e não afirmar lote físico conhecido.
- [ ] Reexecutar (PASS); `npm run test:browser -- conversion`: iniciar sem chassi, recarregar, completar identificação e repetir envio sem nova baixa.
- [ ] Commit `feat: convert reserved box into a unique unit`.

```ts
expect(afterConvert).toEqual({S:1,R:0,B:0,D:1}); // recebeu 2, reservou 1
expect(unitCountAfterRetries).toBe(1);
expect(conversionCount).toBe(1);
expect(duplicateChassis.error.code).toBe('CHASSIS_CONFLICT');
```

### Tarefa 6 — Novas OPs da mesma unidade e correções

**Criar:** `src/server/modules/orders/{existing-unit,corrections}.ts`, `migrations/005-order-continuity.sql`, `src/web/features/orders/ExistingUnitOrderForm.tsx`, `tests/order-continuity.test.ts`, `tests/browser/continuity.json`. **Modificar:** orders.ts, service/rotas/UnitPage e cancelOrder.

**Interfaces:** `createUnitOrder(ctx, {unitId, reason}, meta): Result<Order>`; `reverseMistakenConversion(ctx, {orderId, reason, physicalBoxClosed:true}, meta): Result<Correction>`; `correctConvertedVariant(ctx, {unitId, variantId, reason}, meta): Result<Correction>`. Correction inclui id, originalOperationId e compensatingOperationId. Invalidar unidade por estorno preserva ID/histórico, não permite outra conversão na OP estornada.

- [ ] Testar nova OP sem caixa disponível; uma ativa por unidade; cancelamento pós-conversão sem devolver caixa; conversão de EXISTING_UNIT rejeitada; estorno com dependências recusado; correção de variante conserva totais.
- [ ] Executar `npm run test -- tests/order-continuity.test.ts`; esperar FAIL.
- [ ] Implementar reutilização da unidade, revisão operacional/invalidação da aptidão, correções compensatórias e suspensão com pendência; não permitir estorno cego em cascata.
- [ ] Reexecutar (PASS); `npm run test:browser -- continuity`: cancelar inicial convertida e criar nova OP pelo detalhe da unidade, exibindo ambas no histórico.
- [ ] Commit `feat: preserve unit identity across production orders`.

```ts
expect(newOrder.unitId).toBe(originalUnit.id);
expect(boxBalanceAfterNewOrder).toEqual(boxBalanceBefore);
expect(activeUnitCount).toBe(1);
expect(convertExisting.error.code).toBe('ORDER_TYPE_CONFLICT');
```

## Fase C — execução, peças e qualidade

### Tarefa 7 — Etapas, pausas e ocorrências

**Criar:** `src/shared/contracts/production.ts`, `src/server/modules/production/{stages,occurrences}.ts`, `migrations/006-production.sql`, `src/web/features/production/ProductionForm.tsx`, `tests/production.test.ts`, `tests/browser/production.json`. **Modificar:** rotas/transcrição.

**Interfaces:** `saveStage(ctx, {orderId, type, responsibleId, start?, end?, pauses:{start,end?}[]}, meta): Result<StageRun>`; `recordOccurrence(ctx, {orderId, description, requiredAction?, blocking:boolean}, meta): Result<Occurrence>`; `calculateEffectiveMinutes(stage): number|null`. Etapas contêm datas completas; concluir montagem é ação explícita, não preencher fim automaticamente.

- [ ] Escrever testes de meia-noite, múltiplas pausas, pausa aberta, sobreposição e campos ausentes; alteração preserva versão e autor.
- [ ] Executar `npm run test -- tests/production.test.ts`; esperar FAIL.
- [ ] Implementar cálculo e salvamento parcial; separar executante/transcritor, problema/ação prevista/realizada. Reabrir montagem invalida aptidão vigente.
- [ ] Reexecutar (PASS); `npm run test:browser -- production`: transcrever etapa parcial e completar com teclado sem perder contexto.
- [ ] Commit `feat: track production stages and occurrences`.

```ts
expect(minutesFor2300to0100With30MinutePause).toBe(90);
expect(minutesWithOpenPause).toBeNull();
expect(overlappingPauses.error.code).toBe('INVALID_INTERVAL');
```

### Tarefa 8 — Extras e estoque comum mínimo

**Criar:** `src/shared/contracts/parts.ts`, `src/server/modules/parts/{service,routes}.ts`, `migrations/007-parts.sql`, `src/web/features/parts/{PartsPage,UnitExtrasForm,TransferForm}.tsx`, `tests/parts.test.ts`, `tests/browser/parts.json`. **Modificar:** composição e UnitPage.

**Interfaces:** `recordExtra(ctx, {unitId, description, measure, quantity}, meta): Result<PartOrigin>`; `transferPart(ctx, {originId, from, to, quantity, reason?}, meta): Result<PartMovement>`; `consumePart(ctx, {originId, from, orderId, quantity}, meta): Result<PartMovement>`. Destinos tipados UNIT, COMMON, ADMIN; consumo é evento separado. ADMIN exige motivo/destino. Origem guarda unitId imutável.

- [ ] Testar transferência parcial/origem preservada, duas saídas simultâneas, unidades de medida distintas, nenhum extra confirmado vs não conferido, correção/retorno compensatório e quantidade não informada.
- [ ] Executar `npm run test -- tests/parts.test.ts`; esperar FAIL.
- [ ] Implementar livro de movimentos com débito/crédito atômicos, registro provisório sem lista oficial e consumo explícito por OP. Não carregar fornecedores nem valores comerciais.
- [ ] Reexecutar (PASS); `npm run test:browser -- parts`: U1 → comum → U2, conferir origem e bloqueio de quantidade insuficiente.
- [ ] Commit `feat: trace unit extras and shared parts quantities`.

```ts
expect(positionsAfterTransfers).toEqual({U1:1,COMMON:1,U2:1});
expect(totalRemaining).toBe(3);
expect(allOrigins).toEqual(['U1']);
expect(overspend.error.code).toBe('INSUFFICIENT_PARTS');
```

### Tarefa 9 — Inspeção, retrabalho e aptidão atual

**Criar:** `src/shared/contracts/quality.ts`, `src/server/modules/quality/{service,routes}.ts`, `migrations/008-quality.sql`, `src/web/features/quality/InspectionPage.tsx`, `tests/quality.test.ts`, `tests/browser/quality.json`. **Modificar:** ocorrências, revisão da unidade e composição.

**Interfaces:** `saveInspection(ctx, {unitId, orderId, checklistVersionId, answers, inspectorId}, meta): Result<Inspection>`; `approveInspection(ctx, {inspectionId}, meta): Result<Inspection>`; `getDispatchEligibility(ctx, unitId): {eligible:boolean; reasons:string[]}`. Answers: resultado por item e justificativa de não aplicável; aprovação vinculada à operationalRevision.

- [ ] Escrever casos de parcial/não aplicável sem justificativa, falha com ocorrência aberta, montagem/chassi pendentes, reprovada seguida de reinspeção e nova OP após aprovação.
- [ ] Executar `npm run test -- tests/quality.test.ts`; esperar FAIL.
- [ ] Implementar checklist versionado usando estrutura do PDF como proposta configurável, sem transformar todos os itens em obrigatórios universais. Manter resultado anterior e permitir correções ilimitadas vinculadas à mesma unidade.
- [ ] Reexecutar (PASS); `npm run test:browser -- quality`: reprovar, corrigir, reinspecionar e mostrar liberação/pendências; testar teclado e mensagens.
- [ ] Commit `feat: gate delivery on current quality approval`.

```ts
expect(eligibilityWithoutChassis.eligible).toBe(false);
expect(eligibilityAfterNewExecution.eligible).toBe(false);
expect(previousApprovedInspectionPreserved).toBe(true);
```

## Fase D — movimentação, visão gerencial e distribuição

### Tarefa 10 — Saída normal, administrativa e retorno

**Criar:** `src/shared/contracts/dispatch.ts`, `src/server/modules/dispatch/{service,routes}.ts`, `migrations/009-dispatch.sql`, `src/web/features/dispatch/{DispatchPage,AdministrativeMovementForm,DestinationReceiptForm}.tsx`, `tests/dispatch.test.ts`, `tests/browser/dispatch.json`. **Modificar:** composição, parts/service.ts e consulta de unidade.

**Interfaces:** `shipUnits(ctx, {unitIds, destination, responsibleId, accompanyingParts}, meta): Result<Shipment>`; `moveAdministratively(ctx, {unitId, destination, responsibleId, reason, accompanyingParts}, meta): Result<AdministrativeMovement>`; `recordDestinationReceipt(ctx, {shipmentId, responsibleId, remarks?}, meta): Result<DestinationReceipt>`; `returnUnit(ctx, {movementId, reason, destination}, meta): Result<AdministrativeMovement>`; `reverseUnperformedDispatch(ctx, {shipmentId, reason}, meta): Result<Correction>`.

- [ ] Escrever testes de saída normal bloqueada, comando administrativo sem motivo recusado, qualidade preservada, localização indisponível para nova saída, retry, extras acompanhando uma única vez e retorno sem criar unidade/caixa. Estorno só se comprovado que não houve saída e sem dependências posteriores.
- [ ] Executar `npm run test -- tests/dispatch.test.ts`; esperar FAIL.
- [ ] Implementar comandos/documentos separados, condições no backend e mesma transação para unidade e extras. Não aceitar force/override. Recebimento posterior mantém data efetiva e auditoria.
- [ ] Reexecutar (PASS); `npm run test:browser -- dispatch`: unidade reprovada só admite movimento administrativo identificado; retorno/ressalvas ficam no histórico.
- [ ] Commit `feat: separate customer dispatch from administrative movements`.

```ts
expect(unsafeCustomerDelivery.error.code).toBe('UNIT_NOT_ELIGIBLE');
expect(qualityAfterAdministrativeMove).toBe('REJECTED');
expect(unitsAfterReturn).toBe(unitsBeforeReturn);
expect(boxesAfterAllMoves).toEqual(boxesBeforeAllMoves);
```

### Tarefa 11 — Histórico, dashboard e relatórios

**Criar:** `src/shared/contracts/reports.ts`, `src/server/modules/reports/{service,routes}.ts`, `src/web/features/reports/{DashboardPage,HistoryPage}.tsx`, `tests/reports.test.ts`, `tests/performance.test.ts`, `tests/browser/reports.json`. **Modificar:** índices em nova `migrations/010-query-indexes.sql`, navegação e consultas existentes.

**Interfaces:** `getDashboard(ctx, {from?,to?}): Dashboard`; `getHistory(ctx, {entityId?,page,pageSize}): Page<AuditEntry>`; `getProductionReport(ctx, filters): ProductionReport`. Relatórios distinguem data efetiva/de gravação, tempo bruto/líquido e cobertura dos dados; tempo ausente não entra como zero.

- [ ] Escrever reconciliação entre movimentos/saldos e totais; filtros/ordenação estável; baixa coverage visível. Gerar só dados sintéticos: 10 mil unidades/100 mil movimentos.
- [ ] Executar `npm run test -- tests/reports.test.ts`; esperar FAIL.
- [ ] Implementar projeções consultáveis, histórico por entidade e relatórios básicos de caixas, produção, pendências e saídas; paginação 50, máximo 100. Exportação CSV protege células interpretáveis como fórmula.
- [ ] Reexecutar (PASS); `npm run test -- tests/performance.test.ts` e `npm run test:browser -- reports`; registrar p95 vs meta de 300 ms, máquina/volume/cache, corrigindo consultas lentas antes de adicionar workers.
- [ ] Commit `feat: add reconciled operational reports`.

```ts
expect(dashboard.availableBoxes).toBe(sumOfVariantAvailability);
expect(report.incompleteRuns).toBe(2);
expect(report.completedRuns).toBe(3); // universo sintético de 5
expect(page.items.length).toBeLessThanOrEqual(100);
```

### Tarefa 12 — Pacote Windows e ensaio de recuperação

**Criar:** `scripts/{package,start,stop,verify-release}.ps1`, `tests/release.test.ts`, `tests/browser/offline-full-flow.json`, `docs/operacao-local.md`, `docs/verificacao-produto.md`. **Modificar:** build/configuração, backup/restore conforme evidências, README.

**Interfaces:** pacote `release/ME-Estoque/` (ignorado pelo Git) com runtime próprio, build, dependências nativas e manifest de versões/checksums; `start.ps1` reutiliza aplicação saudável ou inicia processo oculto; `stop.ps1` encerra somente a instância identificada. Não instalar serviço/autorun nem alterar a política global de execução do PowerShell.

- [ ] Escrever testes de porta ocupada, segundo início, paths com espaço/acentos, banco incompatível, falha de migration, diretório sem permissão e restauração interrompida em pontos controlados.
- [ ] Executar `npm run test -- tests/release.test.ts`; esperar FAIL.
- [ ] Implementar empacotamento/runtime separado do Codex; instalar somente em destino local autorizado e manter dados fora do pacote. Ensaiar atualização em cópia; recusar downgrade incompatível.
- [ ] Rodar suite completa, typecheck/build, `pwsh -NoProfile -File scripts/verify-release.ps1` e `npm run test:browser -- offline-full-flow`; rede bloqueada para a sessão de teste, navegador sem perfil pessoal. Receber → reservar → converter → montar → aprovar → expedir → backup → restaurar em base isolada. Esperar exit 0, sem requisições externas nem diferença de saldos/auditoria após restauração.
- [ ] Registrar resultados reais e limitações, revisar entrega e commit `build: package verified offline Windows release`. Solicitar aceitação operacional antes de inserir dados reais.

## Cobertura e revisão do plano

| Requisito | Tarefas |
|---|---|
| Recebimento, estoque disponível/reservado/bloqueado | 3–4 |
| Conversão única, chassi, transcrição parcial | 5 |
| Cancelamento, estorno, nova OP mesma unidade | 4–6 |
| Montagem, tempos, pausas, ocorrências, retrabalho | 7 e 9 |
| Extras, estoque comum mínimo e rastreabilidade | 8 e 10 |
| Qualidade, saída normal, exceções, destino/retorno | 9–10 |
| UX, prevenção de erros e Agent Browser | 1 e cada entrega de UI |
| Auditoria, backup, atualização/recuperação | 2 e 12 |
| Dashboard, histórico, relatórios e desempenho | 11 |

Autor-revisão documental: requisitos principais têm tarefa; assinaturas usam os contratos comuns; cinco riscos de Review Focus têm casos de teste. As tarefas seguem dependências compartilhadas, por isso recomendo execução sequencial com executing-plans, evitando contextos duplicados. Só aprofundar planos independentes se compras/orçamentos ou outro subsistema entrar no escopo.

Pendências de conteúdo: catálogo oficial de extras e aplicabilidade final dos checklists. O mecanismo genérico é implementável após aprovação; nenhuma lista real ou aprovação de qualidade por modelo será inventada. Regras de descarte/perdas/reembalagem física ficam fora do fluxo inicial; registros administrativos não equivalem a implementação dessas políticas.

**Próximo passo:** aguardar novo pedido para a próxima entrega. A aprovação da arquitetura já ocorreu; ela não autoriza executar automaticamente as 12 tarefas.
