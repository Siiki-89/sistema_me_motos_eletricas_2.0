# Validação de consistência do fluxo aprovado

08/11/2026. Revisão lógica/documental, não execução de testes de software. As aprovações mais recentes estão em [proposta-fluxo-operacional.md](proposta-fluxo-operacional.md). As decisões técnicas abaixo serão submetidas junto à arquitetura.

## Invariantes

- I1: por variante, disponível D = saldo registrado S − reservas ativas R − bloqueios B; todos não negativos.
- I2: somente OP inicial pode reservar/converter. Quantidade reservada por OP é uma.
- I3: conversão inicial consome uma reserva, baixa uma caixa e cria uma unidade na mesma transação; repetição não repete efeitos.
- I4: cada unidade tem um ID estável e uma origem; novas OPs usam esse ID e nunca acionam conversão.
- I5: cancelamento libera R apenas antes da conversão. Cancelar/encerrar depois dela mantém S, R e unidade.
- I6: movimentação administrativa não altera o resultado de qualidade nem satisfaz os requisitos da expedição normal.
- I7: transferência de extra debita e credita a mesma quantidade/unidade de medida, preservando origem; consumo e saída terminal são eventos próprios.
- I8: edição, reimpressão, reinspeção, nova OP e reenvio não criam movimentos duplicados.

## Conflitos identificados e resolução

| Conflito | Resolução |
|---|---|
| “Uma OP por moto” poderia ser interpretado como unicidade permanente | Relação correta: uma moto por OP; várias OPs históricas por unidade. Somente uma OP inicial de origem |
| Regra anterior mantinha sempre a mesma OP no retrabalho | Atualizada: continuar nela ou abrir nova OP da mesma unidade, sem reserva/baixa |
| Conversão chamada ao iniciar qualquer OP | Separar tipos INITIAL e EXISTING_UNIT. Endpoint de conversão rejeita EXISTING_UNIT mesmo com estoque disponível |
| Cancelamento concorrente com conversão | Executar transação com verificação de versão/estado. Uma vence: se cancelamento vencer, não converter; se conversão vencer, cancelar depois não libera reserva consumida |
| Duas OPs para última caixa | Reserva verifica disponibilidade dentro da mesma transação de criação. Não validar só na tela |
| Retry com chave diferente | Além de chave idempotente, unicidade de conversão por OP e transições válidas impedem segunda baixa |
| Resposta perdida depois de gravar | Repetir mesma chave retorna resultado salvo; mesma chave com conteúdo diferente é conflito |
| Cancelar antes do lançamento, mas caixa já foi aberta fisicamente | Liberar R e bloquear a mesma quantidade B atomicamente quando abertura/divergência for informada. Regularização cria nova OP inicial ligada à cancelada, transferindo B para R sem aumentar D; conversão ocorre só na transcrição. Liberação direta para D exige confirmação de caixa fechada. Recomendação de controle, não inferência de caixa rastreada |
| Nova OP após aprovação reutiliza liberação antiga | Recomenda-se uma OP ativa por unidade; nova execução invalida aptidão vigente e pede reinspeção, preservando aprovação histórica |
| OP cancelada após conversão tratada como unidade inexistente | Unidade permanece, com pendência de continuidade/destino; cancelamento não elimina ocorrência bloqueante |
| Exceção administrativa usada como botão “forçar expedição” | Comandos, registros e documentos diferentes. Não criar parâmetro force/override no endpoint de entrega ao cliente |
| Transferir extra apaga sua origem | Lote/registro de origem imutável; posição atual é derivada do livro de movimentos. Divisão de quantidade mantém proveniência |
| Dois usuários/abas transferem último extra | Débito condicionado ao saldo na mesma transação que o crédito; sem saldo negativo e sem atualização parcial |
| Ajuste/estorno remove algo que já foi consumido/expedido | Recusar efeito sem resolução das dependências. Nunca estornar em cascata silenciosamente |

Movimentações administrativas de motos sem chassi usam o ID interno, mantendo a identificação pendente. Destino é administrativo (serviço, custódia, quarentena, devolução ou outro justificado); não pode ser entrega comercial disfarçada. Não mudar o status para “apta”. O registro não impede fisicamente uma decisão humana fora do sistema, mas o software não deve emitir liberação falsa.

## Cenários numéricos revisados

| Sequência | Resultado esperado |
|---|---|
| Receber 2; criar OP A | S=2, R=1, B=0, D=1, unidades=0 |
| Converter A | S=1, R=0, D=1, unidades=1 |
| Repetir conversão / salvar dados de A | Mesmos saldos, mesmo ID, uma conversão |
| Cancelar A convertida; criar OP B para sua unidade | S=1, R=0, D=1, unidades=1; duas OPs históricas |
| Cancelar B | Nenhuma mudança em caixas ou contagem de unidades |
| Criar OP C inicial e cancelar antes de converter | Reserva sobe e volta a zero; S=1 e D=1 ao final |
| Extra fictício: origem U1 com 3 peças; transferir 2 para comum; 1 do comum para U2 | U1=1, comum=1, U2=1, total=3; origem U1 preservada em todas |
| Tentar transferir 2 de U2, que tem 1 | Rejeição; saldos anteriores preservados |
| Unidade reprovada movida administrativamente | Localização muda; reprovação permanece; entrega normal continua bloqueada |

Quantidades acima são exclusivamente exemplos inventados para revisão lógica. Nenhuma operação foi aplicada a SQLite ou dados reais.

## Critérios transversais

Toda mutação registra operador, responsável quando distinto, data efetiva, data de gravação e correlação; exceções/cancelamentos/correções exigem motivo. Data retroativa não reescreve silenciosamente saldo histórico: os eventos preservam ordem de gravação e relatórios deixam explícita a dimensão temporal.

Somente aprovação atual correspondente à revisão operacional da unidade pode autorizar saída normal. Cancelar OP ou mover administrativamente não aumenta essa revisão para simular aprovação nem apaga reprovação. Se houver abertura de nova OP de execução, a aprovação anterior fica histórica e nova reinspeção é necessária pela recomendação técnica.

Conclusão da revisão: as três políticas aprovadas são conciliáveis com reserva e conversão se os dois tipos de OP e os dois tipos de saída forem explícitos. Riscos remanescentes são de implementação, recuperação e situação física não informada; os casos acima estão distribuídos no plano de testes futuro.

## Verificação documental realizada

Em 08/11/2026: conferidos 16 arquivos Markdown e 56 links locais, sem links quebrados ou espaços ao fim de linha. `git diff --check` concluiu com código 0; Git apenas avisou sobre normalização futura LF/CRLF. Plano contém 12 tarefas e 60 passos pendentes, nenhum marcado como executado. Revisados contratos entre etapas e cobertura das regras; identificada e incluída a regularização de B para R para não deixar caixa aberta em um bloqueio sem caminho de continuidade.

Arquivos preexistentes alterados nesta entrega têm cópia em `backups/arquitetura-plano-20261108-201258`. Alterações do trabalho restritas a Markdown e backups documentais. Não foram executados testes de produto, benchmarks, migrations ou comandos sobre banco de dados.
