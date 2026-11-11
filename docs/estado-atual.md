# Estado atual — 11/11/2026

Etapa6 implementada: transcrição de desembalagem/montagem, pausas, tempos, ocorrências, autoconferência e retrabalho na mesma OP. Consultar [verificação](verificacao-producao.md), [regras](modulos/producao-tempos.md) e [operação local](operacao-local.md). Não avançar automaticamente para qualidade, peças ou expedição.

- Stack preservada: React/TypeScript/Vite + Fastify/Node24 + SQLite local. Sem novas dependências.
- Schema4: migration004 aditiva; 001–003 intactas. Upgrade cria backup prévio validado. Backup/restauração reconhecem estruturas1–4.
- Reserva e conversão preservadas: primeira transcrição baixa1 e cria UUID uma única vez; produção só em OP já individualizada, sem outra baixa. Cancelamento não devolve caixa convertida.
- Produção tem estado próprio: salvar horário final não conclui etapa nem aprova qualidade. Concluir/reabrir é explícito; reabertura tem motivo e histórico.
- Tempos civis completos, inclusive próxima data após meia-noite. Dados incompletos ficam pendentes; líquido = bruto − pausas válidas. Retrabalho tem subtotal próprio.
- Autoconferência v1 tem8 itens e4 estados. Montagem concluída não aceita novas pendências sem reabertura, mas permite registrar ocorrência já resolvida. Qualidade permanece independente.
- Tela `/ordens/:id/producao` acessível por **Produção** no detalhe da OP. Rascunho/tentativa incerta recuperáveis na mesma aba; não são backup do banco.
- Auditoria usa operador local; responsáveis são campos textuais, sem autenticação individual.

## Dados operacionais — ativação pendente

[Diagnóstico](diagnostico-banco-operacional.md): **classificação3, somente registros dos lançamentos anteriores disponíveis**. O banco original de224 caixas e o arquivo de backup correspondente não foram localizados. O journal preservado não equivale a recuperar a base ou seu histórico. O usuário confirmou não ter alterado a pasta. Nenhuma reconstrução, restauração ou migration foi feita em dados reais.

A divergência de LOCALAPPDATA entre execução restrita e Windows normal foi constatada, mas não prova a causa histórica. `start.ps1` agora exige `-DataDirectory` absoluto e o backend exige `ME_DATA_DIR`; não há fallback que crie base operacional silenciosamente. Iniciar/parar com a mesma pasta explícita validada. Não usar a pasta vazia como substituta do banco anterior.

Testes usam exclusivamente bases sintéticas em `artifacts/`. A demonstração da etapa5 foi encerrada; não foi convertida em operação real.

## Pendências

Recuperação/conciliação dos dados antes de ativação operacional; lista oficial de extras; alteração de variante reservada; nova OP para unidade existente; estorno de conversão; anulação auditada de registros de produção já salvos; qualidade/conferente/rodagem; peças/expedição; agendamento/segundo destino de backup; instalador e multiusuário.

Tarefa7 entregue no recorte da etapa6, sem implementar integralmente as tarefas6/9 do plano original. Ver [plano incremental](superpowers/plans/2026-11-08-me-estoque-implementacao.md) e [plano desta etapa](superpowers/plans/2026-11-10-producao-tempos.md).

Git: branch `codex/fundacao-local`. Etapa5 foi publicada mediante pedido explícito. Etapa6 tem entrega por commit local; nenhum push automático. Bancos, dados operacionais, capturas, backups e logs ficam fora do Git.
