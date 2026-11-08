# ME Estoque 2.0 — proposta integrada de fluxo operacional

08/11/2026 · Etapa 2 · **Políticas de negócio aprovadas com os ajustes abaixo; detalhamento técnico, arquitetura e plano aguardam aprovação. Sem autorização de implementação.**

## Ajustes aprovados e precedência

Expedição normal exige chassi, montagem concluída e qualidade aprovada. Movimentação administrativa excepcional é permitida com justificativa, responsável, data e auditoria; não altera qualidade, não torna a moto apta à entrega ao cliente e não oferece um atalho para expedição normal.

Extras mantêm vínculo de origem e podem ser transferidos para estoque comum, outra unidade ou destino administrativo justificado, preservando quantidades e histórico. Lista oficial ainda pendente.

Antes da conversão, cancelar OP libera reserva. Depois, cancelar/encerrar preserva a unidade e não devolve caixa automaticamente. É permitido abrir outra OP para a mesma unidade, sem reserva, nova conversão ou segunda baixa. Uma unidade pode ter várias OPs ao longo do tempo; cada OP continua correspondendo a uma única moto.

Regras confirmadas e critérios: [registro do módulo](modulos/estoque-producao.md). Arquitetura: [arquitetura-tecnica.md](arquitetura-tecnica.md). Conflitos: [validacao-consistencia.md](validacao-consistencia.md). Plano: [implementação incremental](superpowers/plans/2026-11-08-me-estoque-implementacao.md).

Este documento é a proposta operacional vigente. Os registros e análises de referência continuam em [requisitos-operacionais.md](requisitos-operacionais.md). Em caso de divergência, prevalecem as confirmações mais recentes do usuário. “Confirmado” significa declaração do usuário; “recomendado” é uma decisão proposta pelo agente, ainda revisável; “pendente” identifica uma escolha de negócio relevante. Silêncio não equivale a aprovação.

## 1. Visão geral

Sistema novo, local, para um computador Windows, SQLite e funcionamento essencial offline. O núcleo acompanha quantidades de caixas antes da abertura e motos individualizadas depois do primeiro lançamento da OP. Não reutiliza código, importa histórico ou considera a planilha como estoque atual.

A operação real pode acontecer em papel antes do lançamento digital. Por isso, distinguir **data do acontecimento** de **data do registro** e mostrar “saldo registrado”, sem prometer contagem física em tempo real.

### Organização recomendada

| Módulo | Responsabilidade | Prioridade proposta |
|---|---|---|
| Cadastros | Referência ME, nome comercial, cores e pessoas responsáveis | Fundação |
| Estoque de caixas | Recebimentos, saldos, reservas, bloqueios e ajustes | Primeiro fluxo |
| OP e produção | Reserva, ficha, transcrição, identificação, tempos e montagem | Primeiro fluxo |
| Unidades e itens adicionais | Chassi, condição da moto e conteúdo vinculado | Primeiro fluxo |
| Qualidade | Inspeções, ocorrências, retrabalho e reinspeção | Incremento seguinte |
| Expedição | Saída, destino, itens conferidos e retorno do recebimento | Incremento seguinte |
| Histórico e recuperação | Rastreabilidade, backup/restauração e proteção contra repetição | Desde a fundação |
| Dashboard e relatórios | Indicadores derivados dos registros e filas de pendências | Crescimento gradual |
| Estoque comum mínimo de peças | Receber/mover extras, preservar origem e registrar consumo explícito | Núcleo de extras |
| Compras, orçamentos e catálogo completo | Reposição independente, fornecedores, preços e fluxo comercial | Expansão; fora do primeiro núcleo |

Itens adicionais e estoque comum mínimo entram no núcleo para suportar as transferências aprovadas. Não exige incorporar catálogos de fornecedores nem implementar compras/precificação.

## 2. Fluxo completo de uma moto

### 2.1 Receber caixas

**Confirmado:** chegam fechadas, uma moto por caixa; código ME e cor orientam a seleção; após chegar ao galpão podem atender a OPs.

**Recomendado:** tela “Registrar recebimento” com uma ou várias linhas de referência/cor/quantidade, data do recebimento e observação opcional. Referência existente é selecionada; cadastro rápido só quando necessário. Quantidade inteira positiva. Nome comercial não bloqueia entrada quando ainda não utilizado. Cor é selecionada quando aplicável; “não se aplica” é diferente de “não informada”.

Salvar cria um recebimento com identificador próprio e movimentos de entrada. Não gera chassis, OPs ou uma identidade artificial para cada caixa fechada. O histórico preserva de qual recebimento veio cada quantidade, mas não atribui uma origem física específica a uma moto quando as caixas são intercambiáveis e não rastreadas por lote.

Documento de compra, fornecedor e lote são opcionais na primeira versão. Não inventar fornecedor com base no cabeçalho da planilha. Um eventual saldo de abertura deve vir de contagem física nova e autorizada, nunca das referências históricas.

### 2.2 Consultar estoque e criar OP

Mostrar por código ME/cor: saldo registrado, reservado, bloqueado e disponível. A ação “Criar OP” parte da linha do estoque e reaproveita referência/cor.

**Confirmado:** uma OP corresponde a uma moto; criar OP pode reservar uma caixa. Adotar reserva automática na confirmação de criação, conforme a proposta anteriormente aceita. “Rascunho” ainda não é OP emitida e não reserva.

**Recomendado:** confirmar criação gera número da OP, ID interno da OP e reserva de exatamente uma caixa em uma única gravação. Não cria ainda unidade física individualizada. Selecionar qualquer caixa do mesmo código/cor atende à ordem; não exigir etiqueta exclusiva por caixa.

A ficha imprimível mostra número da OP, código ME, nome comercial se houver, cor e campos de coleta. Chassi permanece vazio. Reimpressão identifica a mesma OP e não reserva novamente. Campo “modelo” não substitui código ME, número da OP ou chassi.

### 2.3 Desembalar e coletar os dados

**Confirmado:** o chassi só é conhecido após abrir; podem existir extras, obrigatoriamente vinculados à unidade quando registrados.

A equipe coleta chassi, responsáveis, horários e ocorrências na ficha. Não se exige operação ao vivo no computador. Até iniciar a transcrição, a OP continua reservada no sistema, mesmo que a caixa já esteja aberta fisicamente. A interface explica essa defasagem.

### 2.4 Iniciar transcrição e converter caixa em unidade

**Confirmado:** a baixa ocorre após iniciar a transcrição, e esta pode anteceder o fim da conferência. Baixa não é aprovação de qualidade. Cada moto terá ID interno único.

**Decisão técnica recomendada:** abrir a tela não altera estoque. O primeiro comando persistente chama-se **“Iniciar transcrição e baixar 1 caixa”**. Mostra o efeito antes da confirmação. A OP existente já fornece referência, cor e reserva; o operador informa os dados disponíveis. A ausência de horários finais, conferência ou chassi ainda não digitado não impede iniciar.

Essa ação, numa única transação:

1. Verifica que a OP está reservada e ainda não foi convertida.
2. Consome sua reserva e registra uma baixa de uma caixa.
3. Cria uma única unidade com ID interno e a vincula à OP.
4. Salva os dados disponíveis e o evento de início da transcrição.

OP válida, reserva ativa, operador do lançamento e confirmação explícita são suficientes para esse primeiro registro. Não será perguntado novamente quais campos de qualidade precisam estar prontos. Chassi não informado resulta em “identificação pendente”, sem valor fictício. Antes de eventual expedição, a identificação deverá estar completa conforme a política proposta na seção 10.

Se um chassi digitado conflitar com outra unidade, o comando é recusado sem alteração de saldo, mantendo os campos na tela. Mostrar a unidade existente e permitir revisar o valor. Não mesclar registros. Se o chassi for adicionado mais tarde e houver conflito, a unidade permanece pendente até correção explícita.

Duplo clique, reenvio após perda de resposta ou retorno à tela recuperam a mesma conversão. Não criam nova unidade nem segunda baixa. Se houver falha, tudo é confirmado ou nada é gravado.

### 2.5 Completar transcrição e montagem

Depois da conversão, a ação passa a ser **“Salvar dados”**, sem efeito repetido no estoque. São permitidos lançamentos parciais; um resumo indica o que falta para identificar a unidade, concluir a montagem ou solicitar liberação.

Dados de cadastro vêm da OP. Responsáveis são selecionados de uma lista, mas o responsável pela execução e quem transcreveu são registrados separadamente. O nome de uma pessoa selecionada não constitui assinatura digital nem prova de autenticação.

Desembalagem e montagem são etapas separadas. Cada execução comporta início, fim, responsável, observação e várias pausas com saída/retorno. Tempos completos usam data e hora, incluindo virada de dia. Cálculo líquido desconta pausas fechadas e válidas; dados incompletos exibem “tempo ainda não calculado”. Nunca converter vazio em zero.

Ao digitar só a hora, sugerir a data da etapa e exibi-la para confirmação, sem assumir silenciosamente que fim anterior ao início significa dia seguinte. Bloquear intervalos impossíveis e pausas sobrepostas; permitir registrar informações ausentes depois, sem inventar duração. Transcrever hoje um acontecimento anterior é permitido, preservando ambas as datas.

### 2.6 Registrar extras e ocorrências

Extras ficam no detalhe da unidade com item/descrição, quantidade conferida, unidade de medida e situação. Começam como **“extras ainda não conferidos”**; lista vazia não equivale a “nenhum extra”. Oferecer confirmação explícita de ausência ou inclusão dos itens encontrados. Não preencher quantidade 1 automaticamente, não criar kit padrão nem exigir bateria/controladora sem regra aprovada.

Itens sem catálogo oficial podem ser descritos provisoriamente e depois vinculados a cadastro revisado, mantendo a informação original. “Peça faltante”, “extra encontrado”, “peça consumida” e “item enviado junto” são registros distintos; nenhum gera automaticamente o outro.

Ocorrências têm tipo, descrição, etapa/item do checklist quando aplicável, responsável pelo registro, data e situação. Separar “problema”, “ação necessária” e “correção realizada”. Exemplos históricos de falta/avaria orientam categorias, não regras ou quantidades padrão.

### 2.7 Qualidade e retrabalho

Usar o formulário fornecido como checklist inicial versionado para revisão: autoconferência, inspeção estática e rodagem. Não copiar seu limite físico de dois retrabalhos ou uma pausa.

Resultados por item: não verificado, conforme, não conforme ou não aplicável com justificativa. Aplicabilidade por modelo será cadastrável; não presumir que todo veículo tem ré, NFC ou alarme. Não marcar itens em lote como aprovados por padrão.

**Política confirmada:** saída normal exige chassi registrado, montagem concluída e qualidade aprovada. **Detalhamento recomendado:** aprovação requer verificações aplicáveis respondidas, conferente/data e ausência de pendência bloqueante. Transcrição incompleta permanece salva sem produzir aprovação indevida; aplicabilidade final do checklist será configurada por modelo.

Falha gera ocorrência vinculada à mesma unidade/OP. Retrabalho registra execução, pausas, peças utilizadas se informadas, correção e reinspeção. Preservar resultado anterior. Pode continuar na OP atual ou abrir nova OP da mesma unidade, sem nova reserva ou baixa. Recomenda-se encerrar/cancelar a OP ativa antes de abrir outra, mantendo no máximo uma ativa por unidade. Nova execução invalida aptidão vigente e exige reinspeção; aprovação anterior permanece histórica. Reabertura de qualidade remove liberação enquanto houver pendência, com motivo e histórico.

### 2.8 Expedir e registrar recebimento

**Proposta:** listar somente unidades liberadas para seleção normal de expedição. Uma remessa pode reunir várias unidades, mas cada uma mantém sua OP individual. Informar destino, data, responsável pela entrega/expedição e conferência dos itens vinculados. Não permitir expedir a mesma unidade duas vezes.

A confirmação muda a localização/situação da unidade; não reduz novamente caixas. Itens que a acompanham transitam com ela mediante registro. Extras também podem ser transferidos para estoque comum, outra unidade ou destino administrativo justificado, com quantidades consistentes e origem preservada.

Movimentações administrativas usam ação e documento distintos da expedição ao cliente, exigem motivo, responsável, data efetiva e destino e mantêm a condição de qualidade. Uma unidade sem liberação deve aparecer como “movimentada administrativamente — não liberada para entrega”, nunca como aprovada. Retorno administrativo é outro evento; não recria caixa nem unidade.

Recebimento da loja pode ser transcrito depois no mesmo computador, registrando data real, quem conferiu, ressalvas e divergências. Não requer aplicativo na loja, servidor externo ou internet. “Expedida” e “recebida no destino” são eventos diferentes; falta de confirmação não desfaz a saída.

## 3. Estados e transições recomendados

Evitar um único status que tente representar estoque, montagem e qualidade ao mesmo tempo.

| Objeto/eixo | Estados e transições |
|---|---|
| Quantidades de caixas | Disponível → reservada → baixada na transcrição. Reservada → disponível por cancelamento antes da baixa. Disponível ↔ bloqueada por ocorrência/ajuste justificado |
| OP — ciclo administrativo | Inicial: reservada → em transcrição → transcrição completa → encerrada. Para unidade existente: aberta sem reserva → em execução/transcrição → encerrada. Cancelamento preserva o histórico; só OP inicial ainda reservada libera caixa |
| Unidade — identificação | Chassi pendente → identificada. Correção mantém ID e histórico |
| Unidade — produção | Dados ainda não informados → em montagem → montagem concluída; pode entrar em retrabalho sem mudar identidade |
| Unidade — qualidade | Não avaliada → em inspeção → reprovada ou aprovada. Reprovada → retrabalho → reinspeção; aprovação pode ser revogada justificadamente |
| Unidade — localização | Galpão → expedida/em transporte → recebida no destino. Devolução é movimento específico, não apagar expedição |
| Reserva | Ativa → consumida ou liberada; nunca ambas |
| Ocorrência | Aberta → em tratamento → aguardando reinspeção → resolvida; reabertura preserva tentativas |
| Conferência de extras | Não conferidos → conferidos sem extras ou conferidos com itens; divergência permanece sinalizada |

“Transcrição completa” é uma condição administrativa derivada dos registros previstos para aquela fase, não sinônimo de aprovada ou expedida. A saída física depende da política de liberação, não desse rótulo isoladamente. Os estados de caixas são quantidades agregadas, sem inventar identidade física por caixa.

## 4. Reserva, baixa e movimentação

Para cada código ME/cor, adotar:

- **S:** saldo registrado de caixas ainda não baixadas.
- **R:** reservas ativas.
- **B:** quantidade bloqueada sem reserva, se houver avarias conhecidas.
- **D = S − R − B:** disponível para novas OPs.

Exigir S, R, B e D não negativos. Um bloqueio não pode atingir a mesma quantidade já reservada: primeiro resolver a reserva explicitamente. Bloqueio de quantidade é proposta de prevenção; não afirma que exista identificação física de cada caixa.

| Ação | Variação em S | Variação em R | Efeito |
|---|---:|---:|---|
| Receber q caixas | +q | 0 | Aumenta disponibilidade |
| Criar OP inicial | 0 | +1 | Disponibilidade diminui em 1 |
| Cancelar OP inicial antes da baixa | 0 | −1 | Devolve disponibilidade; se abertura física for informada, bloquear quantidade B na mesma transação até reconciliar |
| Iniciar transcrição | −1 | −1 | Uma caixa vira uma unidade; D não cai outra vez |
| Salvar dados novamente | 0 | 0 | Atualiza registros da mesma unidade |
| Criar/cancelar OP de unidade existente | 0 | 0 | Reutiliza unidade; não cria reserva ou conversão |
| Cancelar/encerrar OP depois da conversão | 0 | 0 | Preserva unidade e movimentos anteriores |
| Aprovar qualidade ou expedir | 0 | 0 | Atua na unidade, sem nova baixa de caixa |

Exemplo fictício, sem bloqueios: receber 10 → S=10/R=0/D=10; criar duas OPs → 10/2/8; transcrever uma → 9/1/8 e uma unidade; salvar novamente → inalterado; cancelar a outra → 9/0/9. Não somar reservas ao total físico: elas já estão incluídas em S. Antes de saída, S + unidades ativas convertidas preserva a quantidade de motos, descontadas apenas perdas/saídas/ajustes explícitos.

Movimentos guardam tipo, quantidade, referência/cor, vínculo ao documento/OP/unidade, data efetiva, data de registro, autor e motivo quando aplicável. Saldos são derivados de movimentos; qualquer projeção de desempenho deve ser reconciliável. Histórico não é um campo de texto que substitui o registro anterior.

## 5. Erros, cancelamentos e estornos

| Situação | Tratamento recomendado |
|---|---|
| Duas ações tentam reservar a última caixa | Validar e reservar na mesma transação. Só uma confirma; a outra recebe o saldo atualizado |
| Falta de saldo | “Não há caixa disponível deste código e cor. Revise as reservas ou registre a entrada.” Não permitir saldo negativo para contornar |
| Primeiro lançamento falhou | Não deixar baixa sem unidade ou unidade sem baixa; preservar campos para repetir com a mesma identidade da operação |
| Chassi repetido | “Este chassi já está vinculado a outra unidade. Abra o cadastro para conferir.” Não excluir ou unir automaticamente |
| Cancelamento antes da transcrição | Exigir motivo, liberar reserva e preservar OP cancelada. Se abertura física for informada, liberar R e bloquear B atomicamente até reconciliação, sem anunciar caixa fechada disponível fictícia |
| Cancelamento depois da baixa | Cancelar OP com motivo, mantendo unidade e sua condição real. Se trabalho ficou incompleto, manter pendência de continuidade/destino; não devolver caixa fechada automaticamente |
| Baixa digitada por engano, caixa ainda fechada | Estorno administrativo explícito, após confirmar situação e resolver dependências; movimento compensatório ligado ao original. Unidade invalidada fica no histórico e sai das contagens ativas; IDs não são reciclados |
| Caixa realmente aberta ou moto já montada | Não transformar em caixa fechada com um botão de cancelar. Correção trata a unidade existente; reembalagem/retorno excepcional exige procedimento próprio aprovado |
| Entrada incorreta já usada por OPs | Bloquear estorno que deixaria reservas/saldo inconsistentes. Mostrar dependências para corrigir com rastreabilidade |
| Código/cor errado na OP | Antes da baixa, trocar reserva atomicamente se houver disponibilidade. Depois, correção administrativa com contrapartidas no grupo de origem/destino e revisão da identidade física; não editar saldo diretamente |
| Erro em horários ou responsáveis | Guardar antes/depois, motivo e autor. Recalcular somente indicadores afetados; não gerar movimento de estoque |
| Expedição lançada errada | Correção compensatória quando comprovadamente não houve saída. Se houve entrega/retorno, registrar devolução real, sem apagar o evento |

Correções com efeitos posteriores (qualidade, peça transferida, expedição) exigem revisar essas dependências; não oferecer estorno cego em cascata. Quantidade bloqueada por abertura informada pode ser reconciliada para uma nova OP inicial de regularização: transferir B para R atomicamente, com vínculo à OP cancelada e justificativa, sem aumentar D; converter somente pelo comando explícito de transcrição. Se a caixa foi confirmada fechada, a liberação justificada de B pode devolvê-la a D. Não criar unidade ao simplesmente bloquear/liberar quantidade.

A política de perdas, descarte, devolução ao fornecedor e reembalagem física fica fora da operação normal inicial e deve ser aprovada quando necessária. Movimentar administrativamente para um destino não implementa automaticamente a baixa patrimonial ou descarte.

## 6. Telas e formulários

| Tela | Organização e ação principal |
|---|---|
| Visão geral | Disponíveis, reservadas, OPs sem transcrição, unidades com pendências, aprovadas e expedidas; cada número abre sua lista filtrada |
| Caixas | Tabela por código/cor, filtros compactos, saldos alinhados e ações Registrar recebimento / Criar OP. Histórico abaixo ou em detalhe, sem perder filtros |
| OPs | Pesquisa por número/código/chassi, filtros de transcrição/produção/qualidade; criar, imprimir e iniciar transcrição |
| Detalhe da OP/unidade | Cabeçalho fixo com número, código, cor, ID e chassi; seções Identificação, Produção, Qualidade, Itens adicionais e Histórico |
| Transcrição | Formulário por seções, salvamento parcial e resumo de pendências. Primeiro salvamento explica baixa; seguintes dizem apenas Salvar dados |
| Qualidade e retrabalho | Lista de pendências e checklist contextual. Registrar falha sem perder ponto de conferência; correção e reinspeção vinculadas |
| Expedição | Seleção de unidades aptas, destino, conferência de itens e confirmação de saída; recebimento posterior na mesma remessa |
| Cadastros e recuperação | Referências/cores/pessoas/itens/checklists; situação do backup e restauração assistida |

Direção visual: interface administrativa clara, boa densidade de informação e ações consistentes; cor de destaque inspirada na referência da marca, sem aprovar uma paleta definitiva. Tipografia legível, foco visível, navegação por teclado, rótulos permanentes e erros junto ao campo. Status combina texto e cor. Tabelas com paginação, ordenação estável e cabeçalho persistente; detalhe preserva busca/filtros ao voltar.

Evitar reproduzir a folha inteira em uma única tela ou encher o dashboard de gráficos sem ação. Conferência deve exigir escolha explícita, nunca preenchimento automático de “conforme”. Nenhum frontend, protótipo funcional ou tela foi criado.

## 7. Modelo conceitual e SQLite

### Entidades recomendadas

| Entidade | Atributos e relações essenciais |
|---|---|
| Produto/referência | ID, código ME, nome comercial opcional, características; código não é ID de unidade |
| Variante | Produto + cor aplicável; chave estável usada em saldo/reserva. Fabricante/fornecedor separado se cadastrado |
| Recebimento e linhas | Documento interno, data, observação; linhas por variante e quantidade |
| OP | ID, número único, tipo inicial/unidade existente, variante, situação e motivo. Inicial vincula unidade na conversão; nova OP de unidade existente já nasce vinculada a ela |
| Reserva | Somente OP inicial, variante, quantidade 1, estado e eventos. Uma reserva por OP inicial |
| Unidade | ID interno imutável, variante, OP de origem, chassi original/normalizado quando conhecido e condição atual. Uma conversão ativa por OP |
| Movimento de caixas | Identidade da operação, variação, variante, origem, datas, autor e eventual movimento compensado |
| Pessoas e lançamentos | Identidade do operador de registro separada de responsáveis de execução/conferência; metadados de auditoria |
| Execução de etapa e pausas | OP/unidade, tipo, responsável, início/fim; relação de uma execução para várias pausas |
| Checklist/versionamento e avaliações | Versão dos critérios, aplicabilidade, avaliação, resultados por item e responsável |
| Ocorrência, correção e reinspeção | Unidade/OP, item de checklist opcional, problema, ações, situação e tentativas |
| Cadastro de item e item da unidade | Descrição, unidade de medida; quantidade observada e vínculo à moto. Quantidade desconhecida não vira zero |
| Movimento de item | Origem/destino, quantidade, unidade/OP e motivo; sem saldo duplicado em estoque comum e na moto |
| Remessa, unidades e recebimento | Destino, saída, responsáveis, conferência e retorno/ressalvas. Uma remessa pode ter várias motos |
| Evento de auditoria | Entidade, ação, autor, datas, antes/depois pertinente e correlação entre eventos da mesma operação |

OP inicial reservada existe sem unidade cadastrada; isso representa uma moto solicitada, não uma caixa fisicamente individualizada. Na conversão, criar o ID da unidade e o vínculo em transação. Nova OP de unidade existente reutiliza o ID, não participa da reserva/conversão e preserva as OPs anteriores. Uma unidade tem uma OP inicial de origem e pode ter outras OPs de execução.

Chassi permanece texto, com valor original preservado. Normalização técnica inicial: remover espaços externos e padronizar caixa das letras; não apagar pontuação ou zeros automaticamente. Quando preenchido, rejeitar repetição do valor normalizado entre unidades; chassi ausente é nulo, nunca texto vazio ou marcador fictício. Não impor comprimento universal a partir da planilha. Correção mantém histórico e não cria novo ID.

### Persistência, integridade e evolução

- Uma camada local concentra as operações; interface não manipula arquivo SQLite diretamente. Banco em diretório local exclusivo, fora de Git e sincronização em nuvem.
- Chaves estrangeiras, campos de domínio restritos e unicidade para número de OP, reserva ativa, chassi conhecido e conversão ativa por OP. Quantidades inteiras para caixas; unidade/precisão de peças devem ser explícitas.
- Reserva, conversão e expedição executam validações e efeitos numa transação, com chave de operação para repetição segura. SQLite oferece atomicidade transacional; isso deve ser verificado também nos fluxos da aplicação. [Fonte](https://www.sqlite.org/transactional.html).
- Conflitos de edição detectados por versão do registro: não sobrescrever mudanças de outra aba silenciosamente. Transações curtas, tratamento de banco ocupado e índices nas buscas reais.
- Separar modelos, casos de uso e persistência em módulos do mesmo aplicativo; não criar microsserviços. React/TypeScript, Fastify e better-sqlite3 são recomendados na arquitetura para aprovação, sem novas instalações agora.
- Para múltiplos usuários no futuro, centralizar acesso por serviço local em rede com autenticação apropriada, sem compartilhar o arquivo SQLite diretamente em pasta de rede. Avaliar outro banco se carga/escritas concorrentes justificarem; não prometer expansão sem adaptação. [Orientação SQLite](https://www.sqlite.org/whentouse.html).

### Backup e restauração propostos

Backup automático local no primeiro uso de cada dia e antes de atualização/migration, mais ação manual. Retenção inicial sugerida: 14 cópias diárias e 8 semanais, revisável conforme espaço e uso. Rotação só remove cópias gerenciadas já excedentes após validar uma nova; nunca o único backup válido ou arquivos externos ao diretório próprio.

Usar API de backup consistente do SQLite, não copiar apenas o `.db` em uso. [Fonte](https://www.sqlite.org/backup.html). Guardar versão de schema, data e checksum; incluir anexos locais associados se esse recurso for adotado. Mostrar último sucesso/falha sem chamar uma tentativa fracassada de backup concluído.

Restaurar primeiro em arquivo separado, verificar integridade/compatibilidade e apresentar resumo; manter cópia do estado atual e interromper escritores antes da troca confirmada. Ensaiar recuperação com dados sintéticos. Segundo destino em mídia local distinta é recomendado contra falha do disco; caminho depende da disponibilidade do usuário. Sem nuvem e sem rotina agendada instalada nesta etapa.

## 8. Melhorias de UX, automações e entregas verificáveis

Automatizar IDs, número da OP, preenchimento de referência/cor, vínculos entre etapas, cálculo de tempos válidos e atualização de indicadores. Não automatizar chassi, quantidade de extras, resultados de qualidade ou interpretação de observações ambíguas.

Permitir pesquisa por OP, referência e chassi no mesmo campo, deixando claro o tipo do resultado. Exibir confirmação “OP salva; 1 caixa reservada” ou “Transcrição iniciada; caixa baixada; unidade criada” somente após gravação. Se a operação já foi registrada, informar isso sem repetir o efeito.

Indicadores distinguem disponíveis/reservadas, unidades identificadas/pendentes e qualidade/localização. Duração e produtividade só incluem registros completos segundo critério visível; informar cobertura dos dados. Não medir desempenho de pessoas com tempos incompletos.

### Sequência proposta de implementação futura

Esta tabela é a visão resumida inicial. O [plano detalhado com Writing Plans](superpowers/plans/2026-11-08-me-estoque-implementacao.md) agora define arquivos, interfaces, testes e comandos por incremento, incluindo OPs de unidade existente e estoque comum de extras. Aprovar arquitetura/plano antes de programar.

| Fase | Entrega pequena | Evidência de aceitação futura |
|---|---|---|
| 0 | Aprovar fluxo e políticas relevantes | Decisões pendentes resolvidas ou explicitamente excluídas |
| 1 | Persistência, cadastros, histórico e recuperação | Integridade, reinício offline e backup/restauração em base sintética |
| 2 | Recebimento e consulta de caixas | Entrada aumenta saldo uma vez; invalidez não muda saldo |
| 3 | Criar/cancelar OP e imprimir ficha | Última caixa não é reservada duas vezes; cancelar libera reserva; reimprimir não muda saldo |
| 4 | Transcrição e conversão individual | Primeiro salvamento gera uma unidade/baixa; repetição é neutra; chassi pendente e duplicado tratados |
| 5 | Tempos, pausas, ocorrências e extras | Virada de dia e pausas válidas calculadas; incompletos não viram zero; extras mantêm vínculo |
| 6 | Qualidade e retrabalho | Reprovação preservada; nova avaliação na mesma unidade sem nova baixa; liberação respeita critérios |
| 7 | Expedição e confirmação de destino | Impede saída duplicada/bloqueada; não baixa caixa novamente; ressalvas rastreadas |
| 8 | Indicadores e distribuição Windows | Totais reconciliáveis, buscas com volume representativo e execução sem Codex/internet |

Testes futuros: TDD em regras autorizadas, integração SQLite com falhas e repetição, Agent Browser com dados fictícios para fluxos/teclado/formulários/erros. Metas numéricas de desempenho serão estabelecidas com volume de teste declarado, sem promessas não medidas. Nenhum desses testes de produto foi executado nesta entrega documental.

## 9. Decisões confirmadas

1. Uma OP corresponde exclusivamente a uma moto.
2. Cada caixa contém uma moto e pode conter extras.
3. Código ME pode repetir entre motos; modelo comercial, chassi e ID interno são conceitos distintos.
4. Cor participa da seleção; pode-se usar qualquer caixa do mesmo código ME/cor.
5. Chassi só é conhecido depois de desembalar; não há identificação prévia da caixa individual.
6. Criar OP pode reservar uma caixa disponível; adotada como proposta aceita a reserva na criação.
7. Baixa da caixa só ocorre após iniciar a transcrição dos dados coletados.
8. Transcrição pode começar antes de a conferência terminar.
9. Baixa não significa aprovação de qualidade.
10. Cada moto terá identificador interno único.
11. Extras precisam ser registrados e vinculados à unidade; lista oficial ainda pendente.
12. Windows, SQLite local e funções essenciais offline; produto novo, sem reuso/importação das referências.
13. Nesta etapa, somente planejamento. Autonomia para recomendações técnicas reversíveis e perguntas agrupadas apenas sobre decisões relevantes.
14. Expedição normal bloqueada sem chassi, montagem concluída e qualidade aprovada; exceção administrativa auditada não aprova nem libera entrega insegura.
15. Extras podem ir ao comum, outra unidade ou destino administrativo justificado, com origem e quantidades preservadas.
16. Cancelar pré-conversão libera reserva; pós-conversão não devolve caixa. Nova OP da mesma unidade não cria outra unidade nem desconta outra caixa.

## 10. Hipóteses e pendências para revisão

### Recomendações adotadas nesta proposta, sem novas perguntas técnicas

- Estoque de caixas agregado por referência/cor; identidade da unidade criada na primeira transcrição persistida.
- Primeiro salvamento explícito efetiva conversão; chassi pode ficar pendente, sem bloquear registro parcial ou liberar expedição.
- Retrabalho preserva a unidade e pode continuar na OP ou usar uma nova OP vinculada; cancelamento após conversão não devolve caixa automaticamente.
- Uma pessoa pode transcrever em nome dos responsáveis identificados, mantendo separadas execução e digitação; autenticação/perfis detalhados ficam para a evolução, sem e-mail.
- Recebimento da loja é informação retornada e lançada no mesmo PC; sem integração remota no escopo inicial.
- Caixas com avaria conhecida podem ser bloqueadas por quantidade; localização/lote detalhados não são obrigatórios no núcleo.
- Planilha e catálogo informam estrutura, não cadastros iniciais, metas ou saldos. Dúvidas sobre grafia antiga não bloqueiam o desenho do produto novo.

### Políticas aprovadas pelo usuário

| Grupo | Decisão confirmada |
|---|---|
| Qualidade e saída | Bloqueio padrão sem chassi/montagem/qualidade. Exceções administrativas auditadas não aprovam qualidade nem autorizam entrega insegura ao cliente |
| Extras | Vínculo de origem preservado; transferências para estoque comum, outra unidade e destinos administrativos justificados, com consistência de quantidade |
| Cancelamento e novas OPs | Cancelamento pré-conversão libera reserva; pós-conversão não devolve caixa. Nova OP na mesma unidade é permitida sem duplicar unidade nem baixar caixa |

A lista oficial de extras continua pendente e pode ser enviada depois; não impede aprovar o fluxo de vínculo e conferência. Destino secundário de backup e permissões finais podem ser definidos antes da distribuição, sem interromper este desenho.

## Rastreabilidade e verificação desta entrega

Consultados AGENTS.md, estado atual, recebimento, brainstorming e requisitos operacionais; estes incluem a análise integral da OP, a leitura da planilha e a análise estática autorizada do ZIP. Reaproveitadas as evidências já registradas, sem reler grandes anexos desnecessariamente. Não houve execução de scripts do ZIP, cópia de código, alteração dos anexos, mudança de banco, criação de schema ou implementação de interface.

A revisão documental conferiu separação entre reserva/baixa/qualidade, contagem caixa/unidade, efeitos únicos, cancelamento antes/depois da abertura e campos pendentes. Os exemplos numéricos são fictícios para validar coerência do desenho, não saldos atuais.
