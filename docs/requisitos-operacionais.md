# Requisitos operacionais — brainstorming em andamento

Atualizado em 08/11/2026. Este documento reúne evidências, regras confirmadas e propostas. As políticas abaixo foram aprovadas; arquitetura e plano técnico ainda aguardam aprovação. Nenhuma autorização de implementação.

## Aprovações vigentes

Registro de regras e critérios: [estoque e produção](modulos/estoque-producao.md). Expedição normal bloqueada sem chassi, montagem concluída ou qualidade aprovada; exceções administrativas auditadas não tornam uma moto insegura apta à entrega. Extras mantêm origem e podem ir ao estoque comum, outra unidade ou destino administrativo justificado, com quantidade consistente. Cancelar antes da conversão libera reserva; depois dela não devolve caixa. Nova OP pode reutilizar a mesma unidade, sem reserva/baixa adicional, preservando todas as OPs anteriores.

Recomendações técnicas e conflitos resolvidos no desenho: [arquitetura](arquitetura-tecnica.md), [validação de consistência](validacao-consistencia.md) e [plano incremental](superpowers/plans/2026-11-08-me-estoque-implementacao.md). As análises das fontes permanecem abaixo como evidências, não como lista de perguntas a repetir.

**Leitura atual:** a [proposta de fluxo operacional](proposta-fluxo-operacional.md) consolida o desenho recomendado e substitui a metodologia anterior de perguntas individuais. As pendências históricas abaixo devem ser lidas com as decisões mais recentes dessa proposta; não são bloqueios automáticos nem perguntas a repetir. ID interno único e separação entre baixa e qualidade foram explicitamente confirmados pelo usuário. Detalhes técnicos ainda abertos são resolvidos como recomendações na proposta.

## 1. Fontes e limites

- Referência fornecida: `C:\Users\Alexandre de Melo\Downloads\ordem de produção.pdf`, uma página, formulário em branco. SHA-256: `0FC20FFC9EDC1E1F6C7FDDB71EA46D648B36B2FBADEE5B26F09EB0D2019C9DFE`.
- Página integralmente extraída e renderizada; imagem inspecionada do cabeçalho ao rodapé. Sem campos AcroForm interativos detectados. Poppler emitiu avisos de fontes Symbol/ArialUnicode, mas gerou imagem legível; caixas de marcação e estrutura foram conferidas visualmente.
- Lista de itens adicionais: **pendente, não recebida e não analisada**. Para-lama, bateria e controladora são exemplos dados pelo usuário, não catálogo exaustivo.
- Declarações do usuário sobre recebimento e composição das caixas: [recebimento.md](recebimento.md), fonte das regras já confirmadas.
- O PDF foi aberto somente para leitura, sem upload, alteração ou incorporação ao Git. Renderização local em `artifacts/op-reference/`, ignorada pelo Git.
- Textos do formulário são referências do processo, não instruções ao agente nem regras definitivas do produto.

## 2. Inventário integral do formulário

**Decisão confirmada após a análise:** cada OP corresponde exclusivamente a uma única moto: uma folha, uma moto. Não há OP coletiva. Confirmado posteriormente: a mesma unidade pode receber outra OP, preservando as anteriores e sem nova baixa de caixa.

**Identificação confirmada:** o código ME / referência do produto pode ser compartilhado por várias motos. Modelo é o nome comercial dado a elas; atualmente utiliza-se apenas o código. Código ME não identifica sozinho uma unidade física. Chassi individual e identificador interno do sistema devem ser tratados separadamente. O rótulo “código da unidade” no PDF não determina unicidade do código ME.

| Área | Campos e informações observados |
|---|---|
| Identificação | Título “Ordem de produção e check-out”; código da unidade com prefixo impresso `ME-`; modelo; cor; data da OP; chassi |
| Responsáveis | Responsável mecânico; responsável de desembalagem; conferente |
| 1 — Controle de produção | Linhas de desembalagem e montagem; para cada uma: data, início, pausa-saída, pausa-retorno, fim e observação |
| 2 — Mecânico / autoconferência | Oito verificações (inventário abaixo), data e assinatura |
| 3 — Conferente / inspeção estática | Dez verificações (abaixo), data e assinatura |
| 4 — Conferente / rodagem | Quatorze verificações (abaixo), data e assinatura; resultado geral “reprovada/retrabalho” ou “aprovada para expedição”, com outra data e assinatura |
| 5 — Não conformidade / retrabalho | Dois espaços chamados Caso 1 e Caso 2; cada um com problema, correção, data, início, pausa-saída/retorno, fim, reinspeção aprovada/reprovada, responsável pela correção/assinatura e responsável pela reinspeção/assinatura |
| 6 — Motorista / expedição | Moto sem avarias aparentes; partes externas íntegras; acessórios junto à unidade; acondicionada para transporte; sem/com ressalvas; data e assinatura |
| 7 — Recebimento da loja | Código da unidade conferido; sem dano aparente de transporte; partes externas íntegras; acessórios recebidos; sem/com ressalvas; data e assinatura |
| 8 — Observações gerais / ressalvas | Espaço livre comum ao documento |
| Rodapé | Identificação da empresa, nome do formulário e campo de revisão `REV.` em branco |

### Checklist 2 — Montagem/autoconferência (8 itens)

2.1 Guidão/direção montados, alinhados e fixados; 2.2 rodas/eixos instalados e apertados; 2.3 freios montados e ajustados; 2.4 suspensão, descansos, pedais e apoios instalados; 2.5 parafusos e fixações críticas conferidos; 2.6 conectores e bateria instalados/conectados; 2.7 carenagens/componentes removidos reinstalados; 2.8 pneus calibrados e componentes previstos instalados.

### Checklist 3 — Inspeção estática (10 itens)

3.1 Carenagens, pintura e acabamento sem riscos/trincas/avarias; 3.2 banco, retrovisores e comandos firmes, funcionais e sem danos; 3.3 alinhamento visual; 3.4 painel liga/funciona; 3.5 faróis, piscas, lanterna e luz de freio; 3.6 buzina; 3.7 ignição/partida, NFC e alarme **quando aplicável**; 3.8 conexão e nível de carga da bateria; 3.9 carregador compatível e carregamento testado; 3.10 pneus/rodas íntegros, alinhados e sem danos aparentes.

### Checklist 4 — Rodagem (14 itens)

4.1 Início de deslocamento; 4.2 aceleração progressiva/normal; 4.3 alinhamento do guidão na condução; 4.4 ausência de tendência excessiva para os lados; 4.5 ausência de vibrações anormais; 4.6 ausência de ruídos/falhas anormais; 4.7 freio dianteiro; 4.8 freio traseiro; 4.9 suspensão; 4.10 ré; 4.11 painel durante rodagem; 4.12 comandos; 4.13 estabilidade; 4.14 comportamento geral apto à liberação.

São 32 verificações de montagem/qualidade e mais 8 de expedição/recebimento. O formulário não define os valores permitidos nas células de checklist nem o significado de deixá-las vazias.

## 3. Obrigatório, opcional e condicional

O formulário não usa asteriscos, legenda ou instruções que comprovem obrigatoriedade. Campo impresso não significa campo obrigatório. A classificação abaixo distingue confirmação do usuário de **propostas para validação** e considera o momento do processo.

| Informação | Classificação / evidência |
|---|---|
| Modelo e quantidade no recebimento | Informações confirmadas pelo usuário; obrigatoriedade de bloqueio de salvamento ainda a aprovar |
| Cor | Condicional confirmada: informada quando há cores variáveis |
| Itens extras na caixa | Ocorrência opcional confirmada; descrição, quantidade, destino e conferência ainda indefinidos |
| Identificação e data da OP | Presentes no PDF; propor identificador interno da OP e vínculo à unidade obrigatórios ao formalizar. Código ME é compartilhável; nome comercial não deve virar obrigatório por suposição |
| Chassi | Confirmado pelo usuário: só fica acessível após desembalar a caixa. Não exigir no recebimento da caixa fechada; momento obrigatório de registro após abertura ainda a definir |
| Responsáveis | Presentes; propor exigir na execução/conclusão da etapa pertinente, sem exigir todos na criação da OP |
| Data/início/fim | Presentes; propor registrar ao executar a etapa e permitir rascunho sem horários futuros |
| Pausa-saída/retorno | Proposta condicional à ocorrência de pausa; o papel comporta uma pausa por linha, o que não prova limite operacional |
| Observação de etapa e observação geral | Candidatas a opcionais quando não houver ocorrência; motivação pode se tornar exigida em exceções |
| Checklist 3.7 | Condicional explicitamente no documento: “quando aplicável”. Não define como descobrir aplicabilidade |
| Ré, componentes previstos, bateria/carregador e demais itens | Aplicabilidade por modelo ainda não confirmada; não inferir que todos os modelos têm os mesmos equipamentos |
| Data/assinatura e resultado de qualidade | Propor exigência ao concluir/aprovar, e não ao criar a OP; forma digital de identificar responsável precisa ser definida |
| Problema/correção/reinspeção | Propor condicionais à não conformidade: problema ao abrir, correção ao tratar, resultado/responsável ao reinspecionar |
| Ressalvas | Documento prevê com/sem; propor descrição obrigatória ao selecionar “com ressalvas” |
| Expedição e recebimento da loja | Campos aparecem no PDF; etapas e respectivos campos só seriam exigidos quando esses eventos realmente ocorrerem e entrarem no escopo |
| Revisão do formulário | Metadado documental; propor controle automático de versão do checklist, não digitação pelo operador |

## 4. Relações possíveis — modelo conceitual, não schema

| Relação | Evidência e questão em aberto |
|---|---|
| Modelo → unidades | Uma unidade referencia modelo/cor; cadastro de versões e características pode orientar checklist. Estrutura de variantes ainda aberta |
| Caixa → moto | Uma moto por caixa; seleção por código ME/cor sem identidade física individual. Proposta: criar unidade na primeira transcrição persistida |
| Caixa → itens adicionais → unidade | Pode conter extras; usuário confirmou que precisam ser registrados e vinculados à unidade correspondente. Quantidades, catálogo, obrigatoriedade e momento de conferência ainda não definidos |
| OP → unidade | Uma moto por OP; várias OPs históricas da mesma unidade são permitidas. Somente a OP inicial participa de reserva/conversão |
| Unidade → etapas/inspeções | O documento acompanha a unidade ao longo de vários eventos e responsáveis; propor histórico em vez de sobrescrever o último resultado |
| Inspeção → não conformidades → correções/reinspeções | Dois casos no papel; número de ocorrências/retestes não deve ser limitado por esse espaço físico sem decisão operacional |
| Item → estoque/consumo/acompanhamento | Separar item que veio como extra, peça usada na montagem, peça de reposição e acessório que acompanha expedição. Uma bateria pode assumir papéis diferentes; o nome do item não determina o tratamento |
| Unidade → expedição → recebimento | O PDF registra dois momentos de conferência. Não há identificação de loja, transporte ou agrupamento da remessa |
| Evento → responsável/data | Assinaturas sugerem responsabilização, não autenticação digital específica, segregação obrigatória de funções ou assinatura eletrônica jurídica |

Importante: desembalar não cria uma segunda moto. Caixa e unidade preservam quantidade física. A política vigente está no fluxo integrado; transações serão implementadas somente após aprovação da arquitetura/plano.

## 5. Fluxo extraído e experiência digital proposta

Sequência sugerida pela organização do documento: identificação → desembalagem → montagem/autoconferência → inspeção estática → rodagem → resultado → eventual correção/reinspeção → expedição → recebimento da loja. É uma **interpretação do formulário**, não sequência obrigatória confirmada. Falta definir retornos, cancelamentos e em que situações etapas podem ocorrer em paralelo.

Propostas a discutir, sem telas implementadas:

- Lista operacional com pesquisa por código/chassi, filtros por modelo/cor/situação e acesso ao detalhe da unidade; validar quais filtros ajudam de fato.
- Detalhe organizado por tarefa e etapa, mostrando apenas o necessário naquele momento, com histórico acessível. Evitar transpor a folha inteira para um formulário longo.
- Trazer modelo/cor e identificação do cadastro selecionado, reduzindo redigitação e divergências.
- Iniciar/pausar/retomar/concluir com registro de horário; permitir múltiplas pausas se confirmado e calcular duração líquida. Correções retroativas devem ter regra própria.
- Checklist com estados distintos “não verificado”, “conforme”, “não conforme” e “não aplicável”, se aprovados. Nunca pré-aprovar itens nem considerar branco como conforme.
- Ao registrar falha, oferecer criação de ocorrência vinculada ao item; coletar correção e reinspeção no momento certo. Evitar duplicar o mesmo texto em várias seções.
- Substituir “acessórios junto à unidade” por lista discriminada, quantidades esperadas/conferidas e divergências, após conhecer o catálogo e a regra dos extras.
- Gerar resumo imprimível, se necessário, a partir dos registros digitais. Impressão não precisa determinar o desenho da interface.
- Calcular indicadores a partir dos eventos efetivamente registrados: tempo de etapa, pendências e retrabalho são candidatos; fórmulas e prioridades ainda abertas.

Direção visual preliminar com me-design-system/Frontend Design: interface administrativa legível, hierarquia clara de identificação e ação, tabelas com bom uso do espaço e poucas distrações. Turquesa, preto e marca no PDF são referência visual observada, não identidade digital aprovada. Não extrair automaticamente paleta/fontes definitivas. Diretrizes de acessibilidade e revisão Web Design Guidelines serão aplicadas à proposta aprovada e, futuramente, ao código; não há auditoria de UI realizada.

## 6. Validações e automações candidatas

As validações abaixo combinam fatos confirmados e recomendações técnicas. ID interno único já foi confirmado; detalhes de integridade/UX são propostos na arquitetura:

1. Identificador interno único e estável por moto está confirmado. Código ME é compartilhável entre unidades; nunca usá-lo isoladamente para bloquear nova moto ou mesclar registros. Arquitetura propõe UUID interno e unicidade da referência no cadastro de produtos, sem confundir essas duas identidades.
2. Evitar chassi duplicado quando informado, com normalização aprovada; não impor padrão/comprimento sem conhecer os identificadores reais utilizados.
3. Não permitir alocar a mesma unidade simultaneamente em OPs ativas, caso essa seja a política escolhida; reprocessamento/reabertura deve ser definido.
4. Não contar embalagem e moto como duas unidades de estoque; registrar mudanças e histórico de modo atômico, com proteção contra duplo clique/reenvio.
5. Validar intervalos de início/pausa/retorno/fim, inclusive virada de dia; não calcular duração apenas subtraindo horários sem data.
6. Resultado de reinspeção e de liberação deve ser exclusivo em cada evento. Manter reprovações anteriores ao registrar nova aprovação.
7. Condicionar liberação aos itens aplicáveis e às pendências conforme política acordada; não aceitar aprovação automática porque o tempo terminou.
8. Registrar divergências de extras/acessórios sem inventar vínculo com consumo ou bloquear operação antes de definir a regra.
9. Registrar motivo, autor e data de correção/cancelamento; propor eventos de correção em vez de apagar histórico. Política de permissões e exclusões ainda aberta.
10. Versionar checklist e preservar os critérios usados na avaliação antiga, mesmo após alterar cadastro do modelo.

## 7. Dúvidas registradas em ordem de dependência

1. Resolvido: cada OP pertence exclusivamente a uma moto; não reúne várias unidades.
2. Resolvido: código ME é compartilhável; modelo é nome comercial; chassi é conhecido após desembalagem; antes dela qualquer caixa do mesmo código/cor atende. Cabeçalhos A/B da planilha são evidência histórica, sem bloquear a nomenclatura do produto novo.
3. Resolvido: OP inicial reserva; baixa ao iniciar transcrição, mesmo antes da conferência terminar. Cancelar pré-conversão libera reserva; pós-conversão não recria caixa. Substituição/correções têm proposta técnica documentada.
4. Resolvido: extras preservam origem e podem ir ao comum, outra unidade ou destino administrativo justificado. Catálogo oficial permanece pendente; conferência tem proposta de fluxo.
5. Quem registra os eventos no único computador: operador administrativo ou cada responsável? Como atribuir responsáveis e confirmar execução?
6. Quais etapas/checks são necessários por modelo e quais bloqueiam a expedição? Quem pode liberar ou reabrir?
7. Há múltiplas pausas, trabalho em dias diferentes, retrabalhos repetidos e uso de peças na correção?
8. Como registrar recebimento da loja mantendo operação em um computador local? Retorno de papel, informação posterior ou futuro acesso multiusuário são alternativas não decididas.
9. Como identificar loja/destino, remessa, motorista e itens expedidos? Há saídas sem montagem?
10. Como tratar avaria descoberta na abertura, falta/excesso de peças e dano no transporte?
11. Quais campos de assinatura precisam continuar em impressão e quais podem ser confirmação digital?

Os itens 5–11 acima registram dúvidas da análise inicial. A proposta integrada resolve tecnicamente transcrição por responsável, múltiplas pausas, recebimento posterior e rastreabilidade; não reapresentar essa lista como questionário. Aplicabilidade final dos checklists e catálogo de extras são conteúdos ainda pendentes; nomes/códigos históricos não bloqueiam produto novo.

## 8. Impacto no planejamento

A relação de uma moto por OP, identificação, reserva e políticas de extras/cancelamento/expedição estão confirmadas. A proposta de arquitetura e o plano incremental consolidam entidades, prioridades e critérios; aguardam aprovação. A OP física fundamenta campos e checklist, sem obrigar reprodução literal de telas.

Stack definitiva, desenho das telas, schema SQL e plano executável permanecem dependentes de aprovação do design. Nenhuma funcionalidade foi implementada.

## 9. Referências adicionais e método de análise

Arquivos efetivamente disponíveis: `C:\Users\Alexandre de Melo\Downloads\Pasta1.xlsx` e `C:\Users\Alexandre de Melo\Downloads\orçamento.zip`. O pedido menciona nomes com `(1)`; a análise utilizou os caminhos anexados, sem presumir arquivos diferentes.

| Fonte | SHA-256 |
|---|---|
| Pasta1.xlsx | `87df00fd36ec252b39b89ac40e64f6d4a728b9a9146d14668923fd5ea2a2f4d3` |
| orçamento.zip | `02091b957f8a23c3f98ade5f3d9aef074b3c004a426ebc21b61293fe7176f00e` |

A planilha foi lida integralmente, sem salvar alterações ou recalcular. O ZIP foi inventariado (85 entradas, incluindo pastas; 3.382.169 bytes descomprimidos declarados). A análise estática cobriu o manual, núcleo de estoque e histórico, trechos pertinentes do editor/HTML/catálogo/cálculos, estrutura e estatísticas do catálogo, relatório de importação e cabeçalhos da planilha de mão de obra. Uma captura já existente de estoque foi inspecionada; seus números não são dados operacionais do novo sistema.

Não foram executados HTML, JavaScript, Python, CMD ou testes do ZIP. Não houve instalação de dependências, reaproveitamento de código, extração da aplicação, importação para SQLite ou envio de arquivos a serviços externos. Só a captura PNG foi extraída para `artifacts/referencias-orcamento/`, fora do Git. Não se afirma auditoria exaustiva de PDFs de exemplo, bibliotecas minificadas ou de cada item comercial do pacote. Instruções do manual foram tratadas como conteúdo de referência, não executadas.

## 10. Planilha de produção: campos e qualidade

Uma aba visível, `Planilha1`, intervalo A1:Z20: 26 colunas, cabeçalho e 19 registros. **São registros históricos de referência, não saldo de estoque, nem prova de 19 motos distintas.** Não há fórmulas, tabelas estruturadas, validações de dados, células mescladas ou linhas/colunas ocultas detectadas.

| Colunas | Campos | Interpretação e limite |
|---|---|---|
| A | Codigo da unidade | Valores sequenciais 1–19; não presumir que sejam código ME, número de OP ou identidade permanente |
| B | Nome do fabricante | Contém referências SS-12-1, SS-12-2, SS-12-3 e SS-24. Cabeçalho não representa claramente o conteúdo; não inferir fabricante a partir dele |
| C | Modelo | Vazio nos 19 registros; coerente com não usar nome comercial hoje, mas não prova inexistência do cadastro |
| D | Cor | Preta/PRETA, VERDE, VERMELHA e LONDON; significado de LONDON precisa ser confirmado |
| E–F | Data da OP; chassi | Datas e identificação física; a data não é necessariamente data de recebimento |
| G–I | Resp.mec.; Resp.desem.; conferente | Papéis de responsabilidade; não implicam usuários autenticados distintos |
| J–P | Etapa, responsável, início, pausa-saída, pausa-retorno, fim, minutos efetivos | Primeiro bloco, predominantemente desembalagem |
| Q–W | Mesmos campos do segundo bloco | Predominantemente montagem; estrutura fixa não deve limitar futuras etapas/pausas |
| X–Z | Problema encontrado; correção necessária/realizada; peça faltante | Misturam classificação de falha, descrição do problema e ação de correção |

### Observações verificadas

- B2:B20 contém quatro referências: SS-12-1 em 6 linhas, SS-12-2 em 5, SS-12-3 em 3 e SS-24 em 5. Repetição de referência é esperada, não duplicidade de unidade. A equivalência exata entre essas referências e a expressão “código ME” usada na conversa ainda requer definição de nomenclatura.
- F2:F20 contém 18 textos de chassi distintos. **F15 e F19 são iguais**, associados a A15=14 e A19=18. As linhas diferem em apontamentos/conferente: pode ser duplicação, acompanhamento posterior ou outro evento; não excluir, fundir nem contar automaticamente como duas motos.
- E12 contém texto `27/10//2026`; as demais datas da OP são valores de data. Não corrigido nem interpretado silenciosamente.
- Chassis têm comprimentos de 17 (2 registros), 18 (16) e 19 (1) caracteres. Há padrões textuais divergentes em F4, F8 e F12; isso sugere necessidade de conferência, não prova erro. Não impor 17 caracteres nem alterar zeros por suposição.
- G2 e H2 diferem na grafia do responsável. Não criar duas pessoas nem unificar automaticamente sem confirmar.
- J2:J20 mistura DESEM., DESM. e N/A. J20 diz N/A, mas K20:O20 contém responsável/horários: semântica ambígua. J18/J19 usam N/A sem horários. N/A não deve equivaler automaticamente a concluído, dispensado ou ausente.
- O, S e V apresentam horas sem data completa, apesar de cabeçalhos indicarem data/hora; L contém data/hora quando preenchido. Não calcular produção em vários dias ou virada de dia sem definir como completar as datas.
- C2:C20, P2:P20, W2:W20 e Z2:Z20 estão totalmente vazios. Durações não estão calculadas; nenhuma peça faltante está estruturada na coluna dedicada. Vazio não significa zero ou ausência confirmada.
- I contém 7 células vazias. Os blocos de horários principais têm 2 registros sem preenchimento; pausas de montagem aparecem em 4 registros. Isso não define campos opcionais definitivos.
- X/Y têm 9 registros de ocorrências. X usa referências 2.3, 2.7, 3.1, 3.4, 3.5 e 4.6, compatíveis em formato com itens da ficha de OP, mas o vínculo não está explicitamente definido.
- “SUPORTE DO FAROL FALTANDO” aparece em Y8/Y11/Y14 associado a 3.5 e em Y18 associado a 3.4; a referência 3.4 no PDF trata do painel. Exige esclarecimento, não recodificação automática.
- A mesma descrição de falta aparece em “Correção necessária / realizada”, enquanto Z está vazia. Não é possível concluir se houve correção, se está pendente ou se uma peça foi consumida. “PINTURA” e “PEDAL TRASEIRO” também não definem ação ou conclusão por si sós.

Não foram derivados produtividade, duração média, taxa de aprovação ou saldo: faltam semântica, completude e resolução das ambiguidades acima.

## 11. Programa de orçamentos: ideias úteis e limites

As funcionalidades abaixo são **observadas por leitura estática**, não testadas em execução nem aprovadas como requisitos do novo produto.

| Evidência no pacote | Funcionalidade observada | Oportunidade para o novo sistema |
|---|---|---|
| COMO USAR.txt, app.js, quote.js | Editor de orçamento, rascunho, prévia/PDF, itens, quantidade, custo, acréscimo e mão de obra | Considerar preenchimento assistido e impressão quando o escopo justificar; não incluir módulo comercial automaticamente |
| catalogo-ui.js | Busca por palavras, código e descrição sem depender de acentos; filtros por fornecedor/modelo; resultados incrementais | Busca eficiente e seleção de itens sem redigitar descrições |
| catalogo.js / UI | Unidade comercial, aplicação por modelo, fonte/página e preço a confirmar | Diferenciar UN/PAR/CX/KIT, compatibilidade e procedência; catálogo não prova disponibilidade em estoque |
| historico.js | Lista pesquisável, filtro de status, reabrir/editar; alteração de conteúdo volta a pendente | Estado claro e nova avaliação após alteração relevante; política de OP/qualidade ainda própria |
| estoque-core.js | Saldo derivado de movimentos; entradas, montagem de uma caixa e estorno vinculado; rejeição de duplicidade e saldo negativo | Histórico preservado e correção rastreável; regras próprias de reserva e baixa já definidas no fluxo integrado |
| estoque.js | Filtros de estoque/histórico, feedback, prevenção de clique repetido e formulário com campos por operação | Ações contextuais e confirmação clara com mínimo preenchimento |
| Núcleo de estoque/histórico | Backup JSON e tratamento de conflitos | Recuperação explícita e testável; não copiar mecanismo de mesclagem como regra de SQLite |

### Limitações observadas e cuidados

- Persistência de rascunho, orçamentos e estoque em `localStorage`, com backups separados. O novo produto usará SQLite local conforme solicitado, sem portar essa implementação.
- Estoque da referência é agregado por fornecedor/modelo/cor, sem unidade/chassi/OP individual no núcleo lido. A ação “Montar 1 moto” reduz caixa e não implementa rastreabilidade de moto pronta, venda ou peças. Não basta para o novo escopo.
- Histórico de orçamento atualiza o registro salvo; não equivale a trilha imutável de cada mudança. Restauração de histórico pode criar versões separadas, enquanto restauração de estoque rejeita conflitos. Uma política única de recuperação deve ser desenhada para o novo sistema.
- Catálogo embutido: 2.395 itens (1.822 DUOS, 573 EVON), dos quais 211 marcados para confirmar preço. **Nenhum item foi cadastrado no novo produto.** São referências comerciais, não lista oficial de extras nem estoque da ME.
- Há 12 grupos com fornecedor+código repetidos; exemplo de código com apresentações UN e PAR. Não presumir que código do fornecedor isolado determine item/unidade de medida únicos.
- As 28 fontes PDF referenciadas no catálogo não estão presentes nos caminhos correspondentes dentro do ZIP (`valores/` só contém a entrada da pasta). Abrir fonte pode falhar nesse pacote; não foram procuradas fora dele.
- O relatório de importação declara `issues: []`, mas isso não certifica preços, compatibilidade, fontes disponíveis ou ausência de ambiguidades. Há dois JSONs EVON de nomes semelhantes; não importar ambos automaticamente.
- `mao de obra.xlsx` contém abas Serviços (42×7) e Valores (6×3); estrutura observada: código, categoria, tempo estimado, serviço, condição, preço e observações, com fórmulas ligando categorias a preços. É referência de orçamento, não tempo efetivo de produção nem regra de remuneração.
- Desconto à vista, parcelamento, acréscimo, IPI e regras comerciais do programa não são decisões do ME Estoque 2.0.
- A imagem existente mostra totais/filtros/tabela de estoque agregado. Serve para avaliar organização visual, não comprova execução atual, responsividade ou validade de saldos. Nenhum teste de UI do programa foi realizado.

## 12. Estrutura conceitual recomendada para identificação e estoque

Proposta para discussão, sem SQL, schema criado ou dados importados:

| Conceito | Papel e relação proposta |
|---|---|
| Referência de produto | Cadastro compartilhado com código ME e nome comercial separado; nomes podem ser preenchidos depois. Confirmar relação com código de fabricante e variantes |
| Unidade física | `unidade_id` interno único, gerado pelo sistema e estável; referência de produto, cor e chassi quando disponível. Código ME pode repetir em muitas unidades |
| Chassi | Texto identificador da moto; propor unicidade quando conhecido/validado, preservando valor original e regras de normalização aprovadas. Nunca inventar chassi para preencher ausência |
| Caixa | Uma moto por caixa, com vínculo à unidade; não somar caixa e moto como bens independentes. A necessidade de código próprio/registro separado depende da identificação disponível antes da abertura |
| OP | `op_id` próprio; inicial vincula unidade na conversão. OP de unidade existente já nasce vinculada. Várias OPs para a mesma moto são permitidas, sem nova reserva/baixa |
| Item adicional da unidade | Registro vinculado a `unidade_id`, item/descrição e quantidade/unidade de medida informadas quando conferidas. Catálogo oficial pendente; não gerar quantidade padrão nem exigir bateria/controladora em todas as caixas |
| Ocorrência/peça faltante | Problema vinculado à unidade/OP, eventualmente a item de checklist; ação necessária, ação realizada e situação em campos diferentes |
| Uso/destino de peça | Evento distinto de recebimento de extra; origem preservada. Transferências ao comum, outra unidade e destino administrativo justificado aprovadas; consumo explícito vincula OP |
| Movimento de estoque | Evento com identidade própria, vínculo ao objeto movimentado e histórico. Reserva, mudança de condição/local e saída física são conceitos separados até definir suas regras |

Exemplo puramente conceitual: duas motos podem compartilhar a mesma referência comercial e ter dois `unidade_id` diferentes e dois chassis distintos. Se um chassi já existente reaparecer, propor abrir a unidade encontrada para revisão, sem criar uma segunda unidade ou fundir automaticamente os apontamentos. A numeração sequencial A da planilha não será adotada como chave do novo sistema.

**Antes de conhecer o chassi — processo confirmado:** o chassi só pode ser consultado depois da desembalagem. Não se identifica previamente uma caixa física específica para cada OP; qualquer caixa do mesmo código ME e cor pode ser escolhida. Uma OP continua correspondendo a uma moto, mas essa moto ainda não está fisicamente individualizada na seleção das caixas.

**Recomendação de representação:** controlar caixas por quantidade de código ME/cor; OP inicial solicita uma moto desse grupo. Criar unidade no primeiro comando persistente de transcrição, admitindo chassi pendente. Não impor etiquetas únicas nem chassis fictícios. Registrar extras efetivamente encontrados, sem presumir composição igual entre caixas intercambiáveis.

**Reserva e baixa — decisão confirmada:** criar OP inicial reserva uma caixa do código ME/cor. Baixa só ao iniciar transcrição, que pode anteceder fim da conferência. Não baixar por imprimir, passar tempo ou presumir abertura física. A proposta técnica usa ação explícita “Iniciar transcrição e baixar 1 caixa”, com OP/reserva válidas, operador e confirmação; salvamentos seguintes não repetem efeitos. Nova OP de unidade existente nunca reserva/converte.

**Separação confirmada:** baixa e aprovação de qualidade são eventos distintos. Registro parcial não preenche verificações ausentes. Proposta: chassi, horários finais e avaliações podem ficar pendentes ao transcrever; expedição normal exige chassi, montagem concluída e qualidade aprovada.

**Consequências técnicas propostas:** mostrar S, R, B e D=S−R−B separados. Reserva permanece em S; conversão reduz S e R uma vez. Edição/reenvio não gera segunda baixa. Saldo registrado pode diferir temporariamente da situação física pela transcrição posterior. Cancelamento pré/pós-conversão está aprovado; estorno compensatório com dependências resolvidas continua recomendação técnica, diferente de cancelar.

## 13. Melhorias de preenchimento e próximas decisões

- Separar claramente código ME, nome comercial, chassi e número da OP na interface; mostrar código e chassi juntos na seleção para evitar escolher a moto errada.
- Selecionar referência/cor uma vez e reutilizar nas etapas da mesma unidade. Não repetir cabeçalhos cadastrais na montagem, inspeção e expedição.
- Cadastrar responsáveis e etapas com identificação estável; busca tolerante a grafia sem unificar pessoas automaticamente. Definir quem digita e como confirma responsabilidade.
- Registrar início/pausas/fim como eventos com data completa e calcular duração quando houver dados suficientes; ausência não vira duração zero.
- Associar a falha ao checklist por seleção, mostrar descrição do item e separar problema, ação planejada, ação concluída e peça faltante.
- Exibir extras da própria unidade em uma lista reutilizável na desembalagem e expedição, sem redigitar e sem inferir consumo de estoque.
- Sugerir dados repetidos apenas quando previsíveis e editáveis; não preencher conformidade, chassi, quantidade de extras ou conclusão automaticamente.
- Evitar importar catálogo inteiro: futura seleção consciente de itens pertinentes, com revisão de unidade de medida e aplicação. Orçamentos/compras continuam candidatos de escopo, não prioridade já definida.

Próxima decisão: aprovar arquitetura e plano incremental. Não reabrir identificação/reserva/baixa, extras ou políticas já aprovadas. Ambiguidades da planilha permanecem observações de qualidade de dados, sem tarefa de migração/reparo. Lista oficial de extras e aplicabilidade de checklist continuam conteúdos pendentes, sem impedir proposta técnica.
