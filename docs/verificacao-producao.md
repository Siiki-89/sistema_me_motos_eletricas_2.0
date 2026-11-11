# Verificação da etapa6 — 11/11/2026

Escopo: produção, montagem, pausas, tempos, ocorrências, autoconferência e retrabalho na mesma OP. [Regras](modulos/producao-tempos.md), [plano](superpowers/plans/2026-11-10-producao-tempos.md) e [diagnóstico](diagnostico-banco-operacional.md).

## Segurança dos dados

Classificação3: somente registros dos lançamentos anteriores disponíveis. Banco original224 e backup correspondente não localizados; causa histórica não comprovada. Nenhuma recuperação automática, ativação, restauração ou migration da base operacional. Journal original preservado fora do Git. Toda execução abaixo usou dados sintéticos locais em artifacts/.

Inicialização exige pasta absoluta explícita. Migration004 é aditiva;001–003 permanecem intactas. Backup pré-upgrade, restauração de schemas anteriores e nova conexão após restore foram verificados nos testes de servidor.

## Execuções reais

Runtime fixado `tools/runtime/node-v24.22.2-win-x64/node.exe`, sem novas dependências.

| Comando | Resultado |
|---|---|
| `scripts/npm.ps1 run build` | exit0; TypeScript web/servidor e Vite aprovados |
| `scripts/npm.ps1 test` | 14 arquivos, 98 testes aprovados, 0 falhas; 31,64s |
| `node scripts/test-browser.mjs production` (runtime fixado) | PASS; production-YJWt2Z |
| `node scripts/test-browser.mjs orders` (runtime fixado) | PASS; orders-XPiy7B |
| `node scripts/test-browser.mjs backup` (runtime fixado) | PASS; backup-4aXG0b |

Testes de servidor/tooling também rodaram separadamente:48 aprovados. Revisões direcionadas corrigiram sobreposição indeterminada de pausas, novas pendências após conclusão, recuperação de rascunho/retry, versão menor após restauração e ocorrência já resolvida. Testes específicos registraram RED antes das correções e GREEN depois; registros locais em `.superpowers/sdd/etapa6/`.

Cobertura automatizada: transcrição parcial, horários civis inválidos/negativos, virada de dia, pausas múltiplas/abertas/sobrepostas/fora dos limites, rollback, versões obsoletas, idempotência, reinício, backup/restore4 e upgrade/restore3 preenchido, OP cancelada/administrativamente concluída, IDs estrangeiros, checklist4 estados/NA/NC, reabertura com motivo, ocorrências, qualidade independente, identidade e saldo preservados. Testes não representam carga de milhares de registros nem ensaio de falha física do disco.

## Agent Browser

Sessões próprias, Chrome local sem perfil pessoal, API em127.0.0.1 com porta livre, domínios externos bloqueados. Cenários encerraram somente suas instâncias. Capturas/JSON/logs/bancos permanecem fora do Git em `artifacts/browser/<identificador>`.

Produção: salvamento parcial; rascunho no voltar/avançar; múltiplas pausas; erro de sobreposição sem persistir; ocorrência; não conformidade impedindo conclusão; conclusão explícita; qualidade ainda PENDING; reabertura e retrabalho; falha de comunicação e repetição preservada após navegação; recarga; saldo final físico1/reservado0/bloqueado0/disponível1; uma unidade e uma conversão; SQLite integrity_check=ok e foreign_key_check vazio.

Datas nativas exigiram adaptação do teste: o comando fill desta versão do CLI deixou os campos vazios. O helper usa setter nativo e eventos input/change para datas e limpeza, confirma o valor DOM e verifica persistência via API. Demais campos, seleções e botões usam interação do Agent Browser. As duas execuções iniciais falharam por esse problema do preenchimento; o cenário corrigido passou integralmente.

Capturas desktop1440×1000 e móvel390×844 inspecionadas, sem transbordamento horizontal. Axe4.12.1:45 regras aprovadas,0 violações,0 incompletas na tela avaliada; não equivale a auditoria completa de todas as telas. Inspeção visual cobriu cabeçalho, navegação, resumo e início do formulário, além dos elementos exercitados pela jornada. Não se afirma que todos os estados longos do histórico foram inspecionados visualmente.

## Exemplo sintético confirmado

| Execução | Intervalo | Bruto | Pausas | Líquido |
|---|---|---:|---:|---:|
| Desembalagem | 10/11 23:00 → 11/11 01:00 |120min|30min|90min|
| Montagem | 11/11 09:00 → 12:00 |180min|10+20min|150min|
| Retrabalho | 11/11 12:30 → 13:00 |30min|0min|30min|

Total registrado270min =4h30min. Início sem término fica pendente; não vira zero. Datas/horas são minutos civis, sem inferência de virada de dia ou ajuste histórico de horário de verão.

## Limitações e próximo passo

Recuperação/conciliação operacional continua pendente. Autoconferência não é inspeção final. Não há expedição, rodagem, estoque completo de peças, nova OP de mesma unidade, financeiro ou relatórios avançados. Ocorrências guardam destino previsto sem movimentar peças. Linhas salvas não podem ser apagadas; anulação auditada pendente. sessionStorage recupera a edição na mesma aba, não substitui backup nem garante persistência após fechamento.

Conclusão de montagem exige autoconferência completa e pendências resolvidas por decisão conservadora documentada, revisável. Pausas JSON e salvamento agregado têm limite técnico1MiB; não foi executado teste de grande volume. Auditoria local não é assinatura individual. Ativação real, qualidade e próximas etapas dependem de novo pedido.

Revisão final independente: aprovada, sem achados bloqueadores. Conferidos atomicidade/idempotência, vínculos/saldos, intervalos parciais, conclusão independente da qualidade, recuperação da edição e migration/restore3→4. Revisão somente leitura, sem nova execução de testes nem acesso a bancos reais.
