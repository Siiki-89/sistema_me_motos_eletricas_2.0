# Recebimento — decisões vigentes

## Confirmado pelo usuário

- Chegam caixas fechadas, uma moto por caixa, com código ME, quantidade e cor quando aplicável. Após chegada ao galpão estão disponíveis para OP.
- Código ME é referência compartilhável; nome comercial é separado. Não identifica unidade individual.
- Chassi só fica conhecido após desembalar; qualquer caixa do mesmo ME/cor pode atender à OP, sem identificação física prévia da caixa.
- OP inicial reserva uma caixa; baixa só ao iniciar transcrição dos dados coletados. Transcrição pode anteceder conclusão da conferência; baixa não significa aprovação de qualidade.
- Extras, quando encontrados, ficam vinculados à origem; podem ser transferidos ao comum, outra unidade ou destino administrativo justificado, com rastreabilidade/quantidades. Lista oficial permanece pendente.
- Cancelar OP inicial antes da conversão libera reserva. Após converter, não devolve caixa automaticamente; nova OP da unidade existente não reserva nem baixa outra caixa.

## Representação técnica proposta

Recebimento agregado por referência/cor; saldo registrado, reservado, bloqueado e disponível separados. Unidade criada uma vez no primeiro comando persistente de transcrição. Ausências de chassi, tempos finais e inspeção permanecem pendentes sem bloquear lançamento parcial nem liberar entrega.

Se cancelamento pré-conversão informa que a caixa já foi aberta, liberar reserva e bloquear quantidade para reconciliação na mesma transação. Detalhes em [fluxo](proposta-fluxo-operacional.md) e [validação](validacao-consistencia.md). Não confundir saldo registrado com contagem física em tempo real.

Análise da OP e demais referências: [requisitos operacionais](requisitos-operacionais.md). Aprovação técnica/implementação continua pendente.
