# Modelos, recebimento e caixas — etapa 4

Autorização: prompt de implementação da etapa 4, confirmado pelo usuário em 09/11/2026. Implementa a tarefa 3 e auditoria/idempotência necessárias da tarefa 2. As regras futuras de produção permanecem em [estoque e produção](estoque-producao.md).

## Regras implementadas

| Área | Comportamento |
|---|---|
| Referência | Código ME obrigatório, único no catálogo após remover espaços externos e converter letras para maiúsculas. Preserva pontuação e zeros. Não identifica uma moto individual. Nome comercial e observações opcionais. |
| Cores | Variantes com ID estável, únicas por referência/cor normalizada. “Não aplicável” é escolha explícita, diferente de cor desconhecida. Não há catálogo predefinido. |
| Edição | Versão otimista evita sobrescrever edição concorrente. Inativação mantém vínculos. Sem exclusão pública. Modelos e cores são salvos em comandos separados e explícitos. |
| Entrada | Referência e cor ativas, quantidade inteira positiva, data civil válida; fornecedor, NF, lote e observações opcionais. Uma caixa contém uma moto; nenhuma caixa física recebe ID ou chassi. |
| Origem | Cada recebimento tem um ID documental e quantidades agregadas. Guarda código/cor da ocasião, mesmo se o cadastro mudar depois. Não afirma qual caixa física pertence ao documento. |
| Saldos | Físico deriva da soma dos movimentos. Reservado é sempre zero nesta entrega. Disponível = físico − reservado. Não há controles manuais nem tabela de reservas fictícias. |
| Correção | Ajuste positivo/negativo sobre uma origem exige motivo e data. Estorno acrescenta movimento oposto, uma vez; não apaga o original nem estorna outro estorno. Saldo da origem não pode ficar negativo, mesmo havendo saldo em outra origem. |
| Histórico | Data efetiva separada do instante de gravação. Operador, motivo, correlação e snapshots preservados. Auditoria de edição guarda antes/depois. |

Exemplo sintético de aceitação: entrada2 → ajuste−1 → estorno do ajuste+1 resulta em físico2/reservado0/disponível2 e três movimentos. Tentar estornar a entrada inteira quando a origem só tem1 é recusado; é necessário resolver os movimentos dependentes, sem cascata silenciosa.

## Decisões técnicas aplicadas

- Escritas em transação `BEGIN IMMEDIATE`: efeito, recibo de comando e auditoria confirmam juntos ou revertem juntos. Índices, chaves estrangeiras, CHECKs e unicidade complementam a validação da API.
- `operationId` UUID identifica uma intenção. Mesmo conteúdo e ação retornam o resultado anterior; mesma chave com outro conteúdo retorna conflito. O cliente conserva a chave/payload após falha ambígua. Erro definitivo de validação permite corrigir e iniciar nova intenção.
- Nova chave representa nova operação: NF ou lote iguais não são, isoladamente, prova de duplicação comercial. Não foi inventada unicidade de nota fiscal. Conferir histórico antes de abandonar uma tentativa de resultado incerto.
- Operador inicial é “Operador local (sem autenticação individual)”, consultado pela API e validado contra cadastro local. Não constitui identificação pessoal autenticada.
- Limites técnicos: quantidade por comando até1.000.000, texto até2.000 caracteres, ME80, cor100, pesquisa100; listas50 por página, máximo100 pela API. Consultas filtram/paginam no SQLite. Limites são ajustáveis, não dados operacionais presumidos.
- Datas de recebimento/correção são `YYYY-MM-DD`, sem deslocamento de fuso; gravação usa ISO UTC. A interface apresenta datas e números em português.
- Produto/cor inativo não recebe novas entradas, mas suas origens ainda aceitam correções auditadas. Renomear cadastro altera a referência atual do saldo; o histórico mantém o rótulo original.

## Proteção e limites

Migration002 acrescenta actor, product, variant, box_origin, box_movement, command_receipt e audit_event. Migration001 permanece intacta. Upgrade1→2 cria cópia consistente validada antes de migrar. Backups1/2 são aceitos; restauração1 é atualizada para2 com proteção do estado anterior.

Teste de invariantes com reservas é preparação técnica; OP e concorrência de reservas não estão implementadas. Não há chassi, montagem, qualidade, expedição, peças, extras ou relatórios completos. Backup manual disponível; agendamento, retenção automática, destino secundário e recuperação excepcional automática continuam pendentes. Nenhum dado das referências antigas foi importado.

[Operação e passo a passo](../operacao-local.md) · [Evidências](../verificacao-modelos-caixas.md).
