# Verificação da primeira entrega — 09/11/2026

Escopo aprovado: tarefa 1 e dependências mínimas SQLite/migrations/backup/restauração explicitamente exigidas no pedido de implementação. Nenhum módulo operacional. Stack e plano aprovados pelo usuário; execução com implementadores independentes e revisão de código separada.

## Arquivos e responsabilidades

| Arquivos | Responsabilidade |
|---|---|
| `package.json`, `package-lock.json`, `tsconfig*.json`, `vite.config.ts`, `vitest.config.ts`, `index.html` | Dependências fixadas, build, tipagem e execução de testes |
| `src/server/app.ts`, `main.ts` | API local, segurança, servidor da interface e ciclo de vida |
| `src/server/platform/database.ts`, `backups.ts`, `migrations/001-foundation.sql` | Persistência técnica, migration, transação, backup e restauração |
| `src/shared/contracts/foundation.ts` | Schemas de entrada e contratos mínimos |
| `src/web/app/App.tsx`, `main.tsx`, `App.module.css`, `tokens.css`, `src/web/lib/api.ts` | Navegação, conexão real, proteção dos dados, tokens e cliente HTTP |
| `scripts/start.ps1`, `stop.ps1`, `npm.ps1`, `runtime.mjs`, `dev.mjs`, `test-browser.mjs` | Inicialização Windows, desenvolvimento e jornada Agent Browser |
| `tests/server/foundation.test.ts`, `tests/web/app.test.tsx`, `tests/tooling/*.test.ts` | Regressões e integração em dados isolados |
| `docs/design-system.md`, `operacao-local.md`, este relatório | Identidade provisória, instruções e evidências |

Comunicação demonstrada: a tela consulta `GET /api/v1/health` e exibe o retorno real `app=me-estoque`, `status=ok`, `database.status=ready`, `schemaVersion=1`. As ações de cópia usam sessão local e requisições POST protegidas; a jornada do navegador verificou o resultado diretamente no SQLite sintético.

## Resultado executado

| Verificação | Resultado |
|---|---|
| Build + TypeScript estrito | PASS; Vite gerou assets locais, backend compilado |
| Suite Vitest completa | 24/24 PASS em 4 arquivos; 14 server, 6 interface, 4 tooling |
| SQLite nativo | 3.53.4; persistência/reabertura, FK, transação/rollback e migration única verificados |
| Segurança HTTP | Host/Origin/sessão/CSRF, token Unicode, validação, erro sanitizado e API404 verificados |
| Servir frontend | Raiz, link direto SPA e asset JavaScript testados com arquivos reais |
| Backup/restauração | Cópia consistente, integridade, corrupção recusada, estado anterior preservado e safety backup verificados |
| Concorrência | Duas cópias concorrentes: uma executa, outra recebe503; lock também no serviço |
| Falhas de restauração | Primeiro rename falha e banco reabre; cleanup pós-commit não desfaz estado saudável; marcador de interrupção bloqueia startup vazio |
| Inicializador Windows | Início/reuso/encerramento da instância própria e porta ocupada; pasta com espaços/acentos |
| Agent Browser, cenário backup | PASS; cria, valida, exige confirmação e restaura valor SQLite sintético de “after” para “before” |
| Agent Browser, cenário shell | PASS; navegação, conexão, teclado, móvel e recuperação de erro |
| UX real | Desktop1440 e móvel390 inspecionados; teclado/skip link, sem overflow horizontal, erro de conexão e repetição |
| Recursos externos | Cenário limitado a127.0.0.1, HTTPS bloqueado e recursos da página conferidos como locais |

Comandos: `scripts/npm.ps1 run build`, `scripts/npm.ps1 test`, runtime local executando `scripts/test-browser.mjs backup` e `scripts/test-browser.mjs shell`. Evidências: `artifacts/browser/backup-Hv7HbK/` e `artifacts/browser/shell-4Aikga/` (result.json, snapshots e capturas locais). Não enviar essas evidências a serviços externos. O navegador instalado foi preservado; o Agent Browser emitiu aviso de versão, e a sessão foi restrita à aplicação local.

## TDD e diagnóstico

Testes de backend e UI foram escritos antes da implementação e executados em estado RED. A implementação tornou esses casos verdes. Novos defeitos detectados na integração/revisão receberam regressão: conexão antiga anunciada após falha, manutenção concorrente, cleanup destrutivo, CSRF Unicode e página estática raiz retornando500.

Uma falha inicial EPERM de rename também ocorreu com arquivo de texto na pasta temporária do sandbox; fixtures foram movidas para `artifacts/test-tmp`, sem alterar a semântica da restauração. Sockets do PowerShell ficaram bloqueados no sandbox; suite Windows passou com permissão local ampliada e bancos sintéticos próprios. Nenhuma base real foi usada para testes.

## Revisão independente

Primeira revisão identificou dois P1: requisições admitidas antes da manutenção podiam sobrepor operações; falha ao limpar journal podia acionar rollback depois de remover a cópia anterior. Ambos foram corrigidos com testes de regressão. Reavaliação independente: especificação e qualidade aprovadas para o recorte da tarefa 1, sem novo bloqueante. Limitação aceita e documentada: journal residual pode exigir recuperação manual. Não confundir revisão documental com execução dos testes acima.

## Limitações explícitas

- Tarefa 2 não concluída integralmente: faltam auditoria/recibos de comandos, backup agendado, retenção e recuperação automática excepcional.
- Interrupção de restauração foi simulada em arquivos sintéticos; não houve corte de energia ou teste de disco fisicamente cheio. Não alegar esses testes.
- A lista de migrations atualmente tem apenas a versão1 técnica, checksum e recusa de schema futuro. Novas migrations de domínio serão incrementos posteriores.
- Testes não medem desempenho de estoque nem 10mil unidades/100mil movimentos, pois esses módulos não existem.
- Distribuição final, instalador, atualização e políticas multiusuário não foram antecipados.

O plano mantém tarefas 3–12 pendentes. Não iniciar próxima entrega sem novo pedido.
