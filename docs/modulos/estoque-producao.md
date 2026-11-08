# Estoque e produção — registro das decisões aprovadas

Fonte: confirmações do usuário no brainstorming e mensagem “APROVAÇÃO DO FLUXO OPERACIONAL”, 08/11/2026. Este registro distingue aprovação de negócio de recomendações técnicas; não autoriza implementação.

| ID | Regra confirmada | Exemplo válido / inválido | Aceitação futura |
|---|---|---|---|
| ME-01 | Uma moto por OP; uma moto por caixa | Uma OP para U1 / uma OP coletiva para U1 e U2 | OP nunca aponta para duas unidades |
| ME-02 | Código ME é compartilhável; cor participa da seleção; chassi só após abrir | Duas motos com mesmo ME/cor / usar código ME como ID individual | Seleção por variante; ID interno único por unidade |
| ME-03 | Qualquer caixa de mesmo código/cor pode atender; OP inicial reserva | Reservar uma quantidade / exigir identidade física ainda inexistente | Reserva exclui uma caixa da disponibilidade sem baixar saldo |
| ME-04 | Baixa ao iniciar transcrição; dados podem anteceder conferência completa | Salvar parcialmente / exigir qualidade final para lançar | Conversão única; dados pendentes não são inventados |
| ME-05 | Expedição normal requer chassi, montagem concluída e qualidade aprovada | Expedir unidade apta / liberar reprovada usando exceção | Backend bloqueia falta de qualquer requisito |
| ME-06 | Movimento administrativo excepcional exige motivo, responsável, data e auditoria | Transferir custódia com condição real / emitir aprovação falsa | Qualidade preservada; documento não representa liberação ao cliente |
| ME-07 | Extras vinculados à origem; transferíveis a comum, outra unidade ou destino administrativo justificado | Fracionar saldo com origem preservada / duplicar saldo ou perder origem | Quantidades conservadas e trilha de todas as transferências |
| ME-08 | Cancelamento pré-conversão libera reserva | Liberar uma reserva ativa / liberar novamente reserva já consumida | Efeito único e histórico preservado |
| ME-09 | Cancelar/encerrar depois da conversão não devolve caixa automaticamente | Manter unidade pendente / recriar caixa por cancelar OP | Quantidades de caixas não mudam nesse cancelamento |
| ME-10 | Nova OP pode usar mesma unidade, sem nova baixa/duplicação | Nova OP de U1 / criar U2 para representar retrabalho de U1 | Várias OPs históricas, mesmo unit_id e nenhuma nova reserva |
| ME-11 | Lista oficial de extras pendente | Registrar item encontrado / impor bateria ou quantidade padrão | Quantidade/medida informadas explicitamente |

Detalhes de telas/estados em [fluxo operacional](../proposta-fluxo-operacional.md). A fonte das evidências documentais é [requisitos operacionais](../requisitos-operacionais.md), que não deve converter prática observada em obrigação automaticamente.

Propostas técnicas submetidas à aprovação com a arquitetura: uma OP ativa por unidade; revisão operacional para aprovação de qualidade; bloqueio de quantidade ao cancelar antes do lançamento quando abertura física é informada; conversão explícita/idempotente; estornos compensatórios com dependências resolvidas. Essas propostas não são novas declarações atribuídas ao usuário.
