# OP e individualização — etapa5

## Fluxo

1. Nova OP seleciona referência ME/cor ativa com saldo. Responsáveis, destino e observações opcionais; número automático não reutilizado. Confirmar reserva1 sem baixar físico.
2. FIFO contábil por data de recebimento, instante do movimento e ID. Caixas físicas intercambiáveis por ME/cor; não se afirma lote físico identificado.
3. Iniciar transcrição e baixar1 abre confirmação. Confirmar consome reserva, baixa1, cria unidade UUID e vínculos/histórico numa única transação. Chassi e responsáveis podem ficar pendentes.
4. Salvar alterações atualiza a mesma OP/unidade. Chassi trim/maiúsculas para unicidade, preservando grafia original. Correção/remoção de chassi existente exige motivo; sem comprimento universal.
5. Estados administrativos: Reservada, Em transcrição, Em andamento, Concluída, Cancelada. Criação é evento da reserva atômica. Concluir registro não conclui montagem/aprova qualidade. Unidade mantém Aguardando/Pendente/Galpão neste incremento.

S=físico; R=reservado; B=bloqueado; D=S−R−B. Ajuste/estorno não reduz origem ou total abaixo de R+B. Conversão aparece no histórico sem estorno genérico.

## Cancelamento e regularização

Antes da conversão: caixa fechada libera R; aberta transfere R para B sem alterar S/D. Motivo, data efetiva e operador registrados. Regularizar B cria outra OP inicial na mesma origem, ligada à cancelada, transferindo B→R. Não é retrabalho de unidade existente. Liberar B exige motivo e confirmação física de caixa fechada.

Após conversão: cancelar mantém unidade/origem/baixa. Não há retorno automático de caixa. Índice protege uma OP ativa por unidade; abertura de novas OPs da unidade ainda não implementada.

Salvar alterações pendentes da OP convertida antes de mudar estado/cancelar. Antes da conversão, cancelar com rascunho exige confirmação explícita de descarte.

## Integridade e recuperação

Comandos usam operationId, recibo persistido, auditoria, versão otimista e transação IMMEDIATE. Mesma intenção retorna resultado original; mesma chave com payload diferente é recusada. Outra chave de conversão não cria unidade/baixa duplicadas. Interface congela intenção/chave/campos quando resposta é incerta.

Não apagar unidades para corrigir. Identidade imutável, FKs compostas, conversão única e proteção de saldo complementam validações do serviço. Edição direta do SQLite não é fluxo suportado.

Migration003 acrescenta OP/unidade/reserva/bloqueio/eventos e livro complementar de conversões. View unifica movimentos anteriores; 001/002 intactas. Backups1/2 são atualizados com cópia prévia ao abrir; backups3 incluem vínculos/recibos. Ver [operação local](../operacao-local.md).

## Decisões e limites

Confirmado: uma OP/moto, uma caixa/moto, ME compartilhável, chassi posterior, baixa na transcrição parcial, qualidade independente e histórico preservado.

Escolhas técnicas reversíveis: FIFO contábil, responsáveis textuais opcionais, número sequencial. Cadastro de pessoas poderá evoluir preservando eventos.

Pendente: alteração da variante reservada, novas OPs da mesma unidade, correções compensatórias de conversão, montagem/tempos, inspeção, expedição e itens adicionais (lista oficial pendente). Não antecipar.
