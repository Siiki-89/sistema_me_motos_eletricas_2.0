# Estado atual — 10/11/2026

Etapa5 implementada: OP inicial, reserva, transcrição parcial, individualização, chassi, cancelamento e rastreabilidade. Resultados em [verificação](verificacao-op-unidades.md). Não avançar automaticamente para montagem, qualidade, peças ou expedição.

- Stack preservada: React/TypeScript/Vite + Fastify/Node24 + SQLite local. Sem novas dependências.
- Schema3: migration003 aditiva; 001/002 intactas. Upgrade cria backup prévio validado. Backup/restauração aceitam estruturas1/2/3.
- Caixa fechada não tem ID físico. OP inicial reserva1 por ME/cor com FIFO contábil; físico não muda. Disponível = físico − reservado − bloqueado.
- Primeira transcrição confirmada cria UUID de unidade e baixa1 uma única vez. Chassi pode ficar pendente. Salvamentos posteriores preservam identidade e saldo.
- Cancelamento fechado libera reserva; caixa aberta fica bloqueada até regularização. Após conversão, preserva unidade e baixa. Qualidade permanece pendente e independente da OP.
- Telas: /ordens, /ordens/nova, /ordens/:id, /ordens/:id/imprimir, /unidades e /unidades/:id.
- Pessoas são campos opcionais; auditoria usa operador local, sem autenticação individual.

## Retomada e dados operacionais

Ler [operação local](operacao-local.md), [regras de OP](modulos/op-unidades.md), [verificação](verificacao-op-unidades.md) e [plano incremental](superpowers/plans/2026-11-08-me-estoque-implementacao.md).

Lançamentos reais anteriores não são massa de teste. Nesta retomada, a pasta padrão encontrada estava nova e vazia; o banco usado anteriormente não foi localizado. O usuário confirmou que não alterou a pasta. O registro local dos comandos anteriores está preservado fora do Git; isso não equivale a recuperar o banco nem seu histórico completo. Não reconstruir automaticamente, não importar novamente e não afirmar recuperação. A instância vazia foi encerrada; ativação operacional pendente de recuperação/conciliação.

Usar somente bases sintéticas em artifacts/ para testes. Iniciar/parar normalmente com scripts/start.ps1 e scripts/stop.ps1 e a mesma pasta explícita validada. LOCALAPPDATA pode variar entre execução restrita e sessão Windows normal; pastas diferentes não representam necessariamente a mesma base.

## Pendências

Tarefas1/3 entregues; tarefas4/5 no recorte da etapa5; tarefa2 parcial; tarefa6 somente proteções de vínculo/cancelamento. Alteração de variante reservada, nova OP da mesma unidade, estorno de conversão, produção/tempos, qualidade, extras e expedição pendentes. Agendamento/segundo destino de backup, instalador e multiusuário também.

Git: branch codex/fundacao-local, commits locais. Não publicar automaticamente. Bancos, dados operacionais, capturas, backups e logs não entram no Git. Publicação anterior da fundação não autoriza novos incrementos.
