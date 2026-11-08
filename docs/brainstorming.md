# Brainstorming inicial

## Confirmado

Produto novo de estoque e produção, para um único computador Windows, SQLite exclusivamente local e funções essenciais offline. Prioridades: usabilidade, design profissional, desempenho, modularidade e contexto eficiente. Sem reaproveitamento ou migração de legado.

## Questões para a próxima etapa

| Tema | Decisão aberta | Impacto |
|---|---|---|
| Operação | Quem usa e qual a primeira tarefa diária? | Fluxo inicial e terminologia |
| Caixas/unidades | Caixa é embalagem, lote ou entidade rastreável? | Identidade e conversões |
| Peças/baterias | Controle agregado, por lote ou número de série? | Cadastro e rastreabilidade |
| Produção/montagem | Existem ordens, etapas, consumo e retrabalho? | Estados e transações |
| Qualidade/expedição | Há bloqueio, aprovação, reserva e liberação? | Validações e permissões locais |
| Movimentações | Quais eventos, ajustes e reversões são permitidos? | Histórico e correções |
| Volume | Quantos itens/movimentos e anos de histórico? | Índices, paginação e medições |
| Backup | Destino local, frequência e perda aceitável? | Recuperação |
| UX | Monitor, leitor, impressão e atalhos? | Layout e acessibilidade |

Não assumir que todos esses módulos serão necessários. Saldo negativo, composição, custos, unidades de medida, identificação dos operadores e serialização não têm regras definidas.

## Alternativas preliminares

Web local com serviço em loopback e SQLite aproveita o navegador existente, mas exige coordenação de processos. Aplicação desktop com frontend web oferece janela e inicialização integradas, mas adiciona empacotamento e manutenção do runtime.

Recomendação provisória: avaliar primeiro web local, sem escolher framework. Essa recomendação não foi aprovada como stack definitiva.

Abrir a próxima conversa com: “Qual operação você quer que o ME Estoque execute primeiro, do começo ao fim?” Registrar exemplos válidos e inválidos, discutir alternativas e aprovar o desenho antes do plano de implementação. Nesta etapa, brainstorming significa levantamento inicial; não foi concluída a definição do produto.
