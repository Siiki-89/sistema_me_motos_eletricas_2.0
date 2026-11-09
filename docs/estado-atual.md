# Estado atual — 09/11/2026

## Ponto de retomada

Arquitetura e plano aprovados. **Primeira entrega implementada, executável e validada.** Não avançar automaticamente para as tarefas seguintes. O usuário enviará o próximo prompt.

- React/TypeScript/Vite e Fastify/Node24 em loopback, SQLite local3.53.4.
- Interface inicial e Proteção dos dados; sem motos, caixas, OPs ou módulos operacionais.
- Schema técnico versão1, migration com checksum, FK/transações, backup manual consistente, validação e restauração com cópia de segurança.
- Windows: scripts/start.ps1 e scripts/stop.ps1; runtime local do projeto, independente do Codex.
- Suite24/24 passou; build/typecheck passaram; Agent Browser shell e backup passaram. Desktop1440 e móvel390 inspecionados.
- Revisão independente aprovou especificação e qualidade após corrigir concorrência e cleanup da restauração.

## Como continuar

Ler [operação local](operacao-local.md), [verificação da entrega](verificacao-fundacao.md) e [plano incremental](superpowers/plans/2026-11-08-me-estoque-implementacao.md). Tarefa1 marcada; apenas dependências mínimas da tarefa2 implementadas, seus passos compostos permanecem pendentes. Tarefas3–12 não iniciadas.

Banco padrão criado ao iniciar normalmente: `%LOCALAPPDATA%\ME-Estoque\data\me-estoque.sqlite`; backups em `data\backups` desse diretório. Desenvolvimento em `data/development`; testes em `artifacts/`. Nenhum dado anterior ou real importado; testes nunca usaram base de produção.

Limites: backup agendado/retencão, auditoria de negócio, recuperação automática excepcional e instalador final não estão prontos. Journal de restauração pendente bloqueia startup seguro e requer revisão manual. Não apagar arquivos para destravar. Regras/quantidades de extras e aplicabilidade de checklist continuam pendentes para módulos futuros.

## Referências de negócio

[Fluxo operacional](proposta-fluxo-operacional.md), [registro de regras](modulos/estoque-producao.md), [requisitos e fontes](requisitos-operacionais.md), [arquitetura](arquitetura-tecnica.md) e [consistência](validacao-consistencia.md).

Uma moto por caixa/OP; ME/cor compartilháveis; chassi após abrir; reserva na OP inicial e conversão ao iniciar transcrição. Novas OPs reutilizam unidade sem outra baixa. Movimento administrativo não aprova qualidade; extras preservam origem. Não repetir decisões já confirmadas.

Produto novo na raiz deste projeto. Referências PDF/planilha/ZIP foram só analisadas, sem execução de scripts/reutilização/importação. Git local na branch `codex/fundacao-local`, sem remoto/publicação. Documentos aprovados preservados no commit `1b77aea`; commit de implementação registrado no histórico Git. Dados, backups, runtime e evidências ignorados.
