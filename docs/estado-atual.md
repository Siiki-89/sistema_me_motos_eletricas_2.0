# Estado atual — 09/11/2026

## Ponto de retomada

Etapa 4 implementada: Modelos, Recebimento, Estoque de caixas e histórico com ajustes/estornos. API/SQLite reais. Não avançar automaticamente para OP ou outra entrega.

- Stack aprovada preservada: React/TypeScript/Vite, Fastify/Node24, SQLite local3.53.4.
- Verificação final: build/typecheck,45testes e Agent Browser receipt/backup passaram; revisão independente sem bloqueantes. Aplicação normal iniciada em127.0.0.1:4317, schema2, com cópia prévia1.
- Schema2 incremental; migration001 intacta,002 operacional. Upgrade1→2 com cópia prévia validada. Backup/restauração suportam1/2.
- Reserva sempre0 nesta etapa; disponível=físico−reservado. Sem caixas físicas serializadas, chassi ou OP.
- Referências ME/cor compartilháveis; código único no catálogo, nome comercial opcional. Inativação preserva vínculos; origem/movimentos preservam identificação histórica.
- Comandos atômicos, idempotência, auditoria e versão otimista. Operador local sem autenticação individual.

## Ler para continuar

[Operação local](operacao-local.md), [regras do incremento](modulos/catalogo-caixas.md), [verificação real](verificacao-modelos-caixas.md) e [plano incremental](superpowers/plans/2026-11-08-me-estoque-implementacao.md). Tarefas1/3 entregues; tarefa2 parcial; tarefas4–12 pendentes.

Iniciar com scripts/start.ps1; encerrar com scripts/stop.ps1. Banco padrão em %LOCALAPPDATA%/ME-Estoque/data; desenvolvimento em data/development; testes isolados em artifacts. Nenhum dado real, planilha ou legado importado. Não usar banco padrão para testes.

Backup agendado/retencão, segundo destino, recuperação automática excepcional, instalador e acesso multiusuário continuam pendentes. Journal de restauração pendente bloqueia startup; não apagar para destravar. Extras/checklists pertencem a módulos futuros.

Git: branch codex/fundacao-local. Fundação cd687d7 foi publicada em origin/main por pedido anterior; esta etapa requer somente commit local. Não publicar automaticamente. Bancos, backups, logs e evidências ignorados.

Fluxo futuro: [proposta operacional](proposta-fluxo-operacional.md), [regras produção](modulos/estoque-producao.md), [requisitos](requisitos-operacionais.md), [arquitetura](arquitetura-tecnica.md) e [consistência](validacao-consistencia.md).
