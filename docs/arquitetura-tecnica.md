# ME Estoque 2.0 — arquitetura técnica para aprovação

08/11/2026. **Recomendação, não implementação autorizada.** Políticas de negócio aprovadas em [fluxo operacional](proposta-fluxo-operacional.md); conflitos e invariantes em [validação](validacao-consistencia.md). Plano executável futuro em [Writing Plans](superpowers/plans/2026-11-08-me-estoque-implementacao.md).

## 1. Recomendação e alternativas

Recomendo uma aplicação web local: React/TypeScript no navegador, Fastify/Node.js como serviço exclusivo do computador e SQLite em arquivo local. Um único projeto, um processo principal e módulos por capacidade. A interface de produção será servida pelo próprio backend, na mesma origem, com todos os recursos locais.

| Alternativa | Adequação ao projeto | Custo ou limite |
|---|---|---|
| **React + Fastify + SQLite, web local** | Uma linguagem no frontend/backend, regras testáveis sem navegador, aproveita Chrome/Edge já presentes; recomendada | Exige inicializador confiável e controle da porta/processo |
| React em Electron + SQLite | Janela própria e distribuição com navegador incorporado | Mais runtime para distribuir/atualizar; IPC e acesso nativo precisam de proteção; benefício inicial insuficiente |
| React em Tauri + SQLite | Janela própria; pode ser interessante se integração desktop se tornar central | Introduz Rust/toolchain e integração com WebView; custo adicional para manutenção e contexto |
| React + Python/FastAPI + SQLite | Backend também viável, bom para futura integração Python | Dois ecossistemas e contratos cruzados; sem requisito atual que justifique essa escolha |

A comparação é uma avaliação de engenharia para este escopo, não benchmark entre frameworks. Não precisamos de renderização no servidor, microsserviços, servidor de banco instalado nem sincronização de nuvem. Electron/Tauri podem ser reavaliados se uma janela dedicada e integrações nativas passarem a justificar o custo.

## 2. Stack proposta

| Camada | Escolha | Motivo e limite |
|---|---|---|
| Runtime | Node.js 24 LTS, patch atualizado e fixado na implementação | Linha LTS disponível; não depender do Node interno do Codex nem trocar versões globalmente sem necessidade |
| Linguagem | TypeScript em modo estrito | Contratos compartilhados, refatoração e erros verificáveis pelo compilador |
| Frontend | React + Vite; React Router | SPA de operação; páginas por tarefa, links diretos e build estático local |
| Estilo | CSS Modules e tokens CSS; Radix para diálogo/menu/abas quando necessário | Identidade visual própria e componentes focados; sem instalar dois kits de UI |
| Dados na UI | TanStack Query; formulários controlados por recurso | Cache e invalidação explícita; sem guardar estoque como verdade em estado global/localStorage |
| Backend | Fastify; JSON Schema/TypeBox compartilhado | Validação na fronteira, DTOs tipados e testes HTTP sem abrir porta |
| Persistência | better-sqlite3 + SQL parametrizado + migrations SQL versionadas | Transações explícitas; evita ORM e camadas geradas que escondam efeitos de estoque |
| Testes | Vitest, Testing Library, Fastify inject, SQLite temporário real | Domínio, interface e integridade sem depender de dados reais |
| Jornada no navegador | Agent Browser, cenários versionados com dados sintéticos | Verificar fluxos completos, teclado, impressão e mensagens; obrigatório quando houver frontend |
| Distribuição | Build estático + backend compilado + runtime próprio + inicializador Windows | Usuário opera sem npm, terminal aberto, ferramentas de desenvolvimento ou Codex |

Versões exatas das bibliotecas e lockfile serão fixados no primeiro incremento, após conferir compatibilidade e executar o teste de carregamento do driver nativo no Windows. Não usar `latest` durante a operação nem instalar pacotes agora. A versão SQLite embutida no driver deve ser **3.51.3 ou superior**, conferida por consulta ao runtime; não basta a versão de um sqlite.exe independente. Esse piso evita depender de versões anteriores à correção de WAL descrita pelo projeto. [SQLite WAL](https://sqlite.org/wal.html).

Node recomenda linhas Active/Maintenance LTS para produção; a linha 24 está LTS na consulta desta entrega. [Node releases](https://nodejs.org/en/about/previous-releases). Vite produz o build de frontend e React documenta essa opção para aplicações construídas diretamente. [Vite](https://vite.dev/guide/), [React](https://react.dev/learn/build-a-react-app-from-scratch). O driver escolhido oferece transações, API síncrona e binários nativos; sua compatibilidade precisa ser verificada no pacote Windows, sem prometer desempenho com base no benchmark do fornecedor. [better-sqlite3](https://github.com/WiseLibs/better-sqlite3).

## 3. Organização e limites

Estrutura futura; nenhum diretório de código é criado por esta proposta:

```text
src/web/app/                 navegação, inicialização e sessão local
src/web/components/          componentes comuns e acessibilidade
src/web/styles/              tokens e estilos globais
src/web/features/<modulo>/   páginas, formulários e consultas do módulo
src/shared/contracts/       DTOs e schemas, sem dependência de SQLite/React
src/server/app.ts            composição HTTP testável
src/server/main.ts           inicialização e encerramento
src/server/platform/        SQLite, migrations, auditoria, backup, segurança
src/server/modules/         catalog, boxes, orders, production, parts,
                            quality, dispatch, reports
migrations/                 alterações incrementais de schema
tests/                      testes unitários, integração, UI e cenários browser
scripts/                    build, distribuição e inicialização Windows
docs/                       especificações e decisões
```

Um package.json e um lockfile são suficientes. Cada módulo concentra serviço de aplicação, persistência e rotas pequenas; o frontend consome contratos, nunca arquivos do backend. Um serviço chama outro por interface explícita. Não criar repositório genérico, barramento de eventos distribuído ou mecanismo de plugins sem necessidade.

API futura versionada em `/api/v1`. Comandos são ações de domínio, como reservar, converter, cancelar, transferir e expedir; não expor um CRUD genérico que permita editar saldo/qualidade arbitrariamente. GET não altera estado. Resposta de erro contém código estável, mensagem útil, campos afetados e ID de correlação; não contém SQL, stack trace ou caminhos privados.

## 4. Modelo conceitual e integridade

IDs internos são UUIDs estáveis, gerados pelo backend; número de OP é uma sequência legível e única, sem reutilização de números cancelados. Código ME identifica produto compartilhado. Chassi conhecido é texto original mais valor normalizado; somente espaços externos e caixa de letras são normalizados. Ausência é NULL; não inventar valores nem impor comprimento de 17 caracteres.

| Entidades propostas | Relações e restrições principais |
|---|---|
| product, variant | Código ME de cadastro único; nome comercial opcional. Variante única por produto/cor. Cor ausente e não aplicável não são misturadas |
| receipt, receipt_line, box_movement | Entrada por variante/quantidade inteira; livro de movimentos preserva origem documental. Não atribuir lote físico fictício às unidades |
| production_order | Tipo INITIAL ou EXISTING_UNIT; uma moto por OP. INITIAL pode existir sem unit_id antes da conversão; EXISTING_UNIT exige unit_id desde a criação |
| reservation, box_block | Reserva somente INITIAL, uma caixa por OP; estados ativa/consumida/liberada. Bloqueios são quantidades disjuntas das reservas |
| conversion, unit | Uma conversão por OP inicial e uma unidade por conversão; vínculo de origem permanente. Chassi normalizado preenchido tem unicidade; ID nunca reciclado |
| unit ↔ production_order | Uma unidade pode ter várias OPs históricas. Recomenda-se no máximo uma OP ativa por unidade. O encerramento/cancelamento não apaga vínculos |
| person, audit_event | Quem lançou separado de quem executou. Auditoria com motivo, antes/depois relevante, data efetiva, data de gravação e correlação |
| stage_run, pause, occurrence | Várias etapas/pausas/correções por OP/unidade; intervalos completos e coerentes; ausência não vira zero |
| checklist_version, inspection, inspection_answer | Critérios versionados e aplicabilidade explícita; avaliação ligada à revisão operacional da unidade; resultados históricos preservados |
| part_item, part_origin, part_movement | Item/unidade de medida; origem da quantidade ligada à unidade que recebeu o extra. Transferências conservam origem e saldo |
| shipment, shipment_unit, destination_receipt | Saída normal e confirmação posterior distintas; sem segunda saída ativa da mesma unidade |
| administrative_movement | Destino, motivo, responsável e data obrigatórios; condição de qualidade preservada; retorno é novo movimento |
| command_receipt, schema_migration | Idempotência com hash do conteúdo/resultado; histórico de migrations e checksum |

Unidade de medida pertence ao cadastro do item. Quantidades usam inteiros na menor precisão declarada, sem ponto flutuante para saldo. UN pode ser inteira; PAR/KIT não se convertem automaticamente em UN. Cada transferência preserva a unidade de medida; fracionamento/conversões comerciais exigirão regra própria. Itens provisórios podem ter descrição e medida declarada sem catálogo de fornecedor. Nenhum extra recebe quantidade ou obrigatoriedade padrão.

Estoque comum mínimo para receber/mover extras integra este escopo. Compras, precificação, orçamento, catálogo completo e controle especial por série de baterias ficam fora da primeira versão. “Associado à unidade”, “consumido na montagem” e “enviado junto” são destinos/eventos distintos. A origem nunca muda: ao transferir parte da quantidade U1 → comum → U2, todas as parcelas ainda apontam para U1.

### Transações e concorrência

- Saldo disponível por variante: D = S − R − B. Rejeitar qualquer operação que deixe esses valores negativos; verificar dentro da transação, inclusive com duas abas.
- Reserva inicial grava OP, reserva, auditoria e recibo do comando juntos. Nova OP de unidade existente não passa por esse serviço.
- Conversão valida tipo INITIAL, reserva ativa e versão; grava baixa, consumo da reserva, unidade, vínculo, dados parciais, auditoria e recibo em uma transação. Falha em qualquer etapa desfaz tudo.
- Cancelamento compete com conversão usando versão e transação de escrita. Depois de convertida, não libera reserva consumida nem devolve caixa; nova OP reutiliza unit_id.
- Chave idempotente por comando, preservada ao repetir após falha de resposta; mesma chave/conteúdo retorna resultado anterior, chave com conteúdo diferente retorna conflito. Unicidade e transições também impedem duplicidade usando outra chave.
- Índices por variante/data, OP/número/estado, unit_id, chassi normalizado, inspeção e origem de peça. Somente projeções reconciliáveis podem acelerar consultas; saldo não é editado diretamente.
- Usar transações curtas de escrita com BEGIN IMMEDIATE, parâmetros em SQL, foreign_keys=ON em cada conexão, WAL, synchronous=FULL e busy_timeout inicial de 5000 ms. Banco ocupado resulta em mensagem recuperável; não repetir cegamente um comando com identidade nova.

SQLite permite apenas um escritor por vez; o arquivo deve ficar no mesmo computador. [Uso apropriado](https://www.sqlite.org/whentouse.html), [transações](https://www.sqlite.org/lang_transaction.html), [foreign keys](https://www.sqlite.org/foreignkeys.html). Consultas síncronas devem ser pequenas. Relatórios extensos serão paginados; trabalho longo medido pode ir para worker com conexão própria, nunca compartilhando o handle entre threads.

### Qualidade e movimentação

Expedição normal valida no backend: chassi presente, montagem concluída, aprovação vigente, ausência de bloqueio e localização compatível. Recomenda-se que nova OP de execução ou alteração material invalide a aptidão atual e exija reinspeção; aprovação antiga permanece histórica. Uma correção administrativa de grafia, justificada, não equivale automaticamente a nova execução.

Saída administrativa tem comando/documento separados. Não existe `force` ou `override` para expedição ao cliente. Pode mover uma unidade sem chassi pelo ID interno, com aviso de identificação pendente e condição de qualidade real. Movimentação muda custódia/localização, não aprovação. Uma unidade fora do galpão não fica simultaneamente disponível para outra saída. Retorno usa a mesma unidade, sem recriar caixa.

Cancelamento antes do lançamento libera reserva. Se o operador informar que a caixa já foi aberta, a proposta é liberar R e bloquear B atomicamente. Regularização transfere B para R numa nova OP inicial vinculada à cancelada, sem aumentar D; a conversão continua explícita e única. Liberar B diretamente para disponível exige confirmar caixa fechada. Esse controle é recomendado, não uma nova identidade física de caixa.

## 5. UX e design

Navegação lateral: Visão geral, Caixas, OPs, Unidades, Peças vinculadas/estoque comum, Qualidade, Movimentações e Histórico; Configurações reúne cadastros e recuperação. Ações frequentes partem de contexto: selecionar código/cor → criar OP; selecionar unidade → nova OP ou movimento. Não redigitar identificação entre módulos.

Direção visual proposta: superfície clara, hierarquia sóbria, tipografia do sistema Windows, espaçamento consistente e tabelas de densidade confortável. A cor de marca será um token revisável; não inventar identidade oficial. Estados têm texto/ícone além de cor. Interface em português; nomes técnicos de banco não aparecem no fluxo do usuário.

Cada lista tem busca, filtros persistentes na URL, ordenação determinística, paginação inicial de 50 linhas (limite API 100), cabeçalho legível e ação principal clara. Detalhes por página/painel contextual; formulários extensos em seções de identificação, produção, extras e histórico. Diálogos reservados para efeitos relevantes. Mostrar sempre qual OP/unidade está sendo editada.

Salvar dados parciais é explícito. O primeiro salvamento diz “Iniciar transcrição e baixar 1 caixa”; os demais dizem “Salvar dados”. Rascunho não altera estoque; aviso ao sair com campos não salvos. Não usar sucesso otimista em reserva/conversão/saída. Se houver resposta perdida, consultar/repetir a mesma operação, preservando os campos.

Estados vazio, carregando, falha, conflito, sucesso e sem disponibilidade têm mensagens e recuperação próprias. Foco visível, labels, navegação por teclado, erro junto ao campo e resumo; Radix auxilia foco/ARIA, mas não substitui verificação da tela. [Radix acessibilidade](https://www.radix-ui.com/primitives/docs/overview/accessibility). Impressão de OP mantém número e dados conhecidos, permite coleta manual e não muda estoque.

## 6. Windows, proteção e recuperação

- Serviço escuta apenas `127.0.0.1`, mesma origem para UI/API. Validar Host e Origin, negar CORS externo e exigir token de sessão/CSRF em mutações. JSON com tamanho limitado, validação de entrada e sem SQL construído com texto do usuário.
- Computador/conta Windows inicialmente é a fronteira de acesso. Seleção de operador permite atribuição, mas não prova identidade; não prometer assinatura digital ou auditoria resistente a administrador local. Autenticação individual será necessária antes de uso compartilhado em rede.
- Produção em `%LOCALAPPDATA%\ME-Estoque\data\me-estoque.sqlite`; configuração/backups/logs em subpastas próprias. Verificar caminho real local e ausência de sincronização. Desenvolvimento/testes usam diretórios diferentes e nunca caem silenciosamente no banco de produção.
- Um inicializador abre o navegador após health check da aplicação correta. Se já estiver ativa, reutiliza; se porta estiver ocupada por outro app, informa conflito, sem matar processos. Processo em segundo plano oculto e comando de encerramento controlado; sem serviço Windows ou inicialização automática na primeira entrega.
- Pacote tem runtime Node próprio, frontend compilado e driver nativo compatível. Não precisa de npm/internet para operar. Atualização é local e explícita, com backup e teste de compatibilidade; sem downgrade automático de schema.
- Logs locais com rotação, sem conteúdo integral de fichas, tokens ou chassis desnecessários. Nenhuma telemetria, fonte/CDN ou dado operacional enviado para fora.

Backup consistente pela API do driver/SQLite, manual e no primeiro uso de cada dia, além de antes de migrations. Retenção proposta: 14 diários e 8 semanais. Manifesto registra versão, data e checksum; falha não conta como sucesso. Validar nova cópia antes de rotacionar apenas arquivos gerenciados. Backup no mesmo disco ajuda contra erro operacional, não contra perda do disco; segundo destino local removível é recomendado e será configurado antes de operação real. [SQLite backup](https://www.sqlite.org/backup.html).

Restauração tem modo de manutenção exclusivo: validar cópia em caminho separado (integrity_check, foreign_key_check e versão), mostrar resumo, obter confirmação específica, preservar estado atual, fechar conexões e trocar arquivos com procedimento de recuperação de falha. Não copiar só o .sqlite aberto ignorando WAL. Migrations são transacionais quando suportadas, com checksum e teste em cópia. Falha impede iniciar mutações; versão antiga do programa recusa schema futuro.

## 7. Verificação, desempenho e evolução

Fastify inject permite testar rotas sem iniciar um servidor de rede. [Documentação](https://fastify.dev/docs/latest/Guides/Testing/). Integração usa arquivos SQLite temporários, incluindo duas conexões e subprocesso encerrado em pontos controlados; mock sozinho não demonstra atomicidade. Agent Browser verifica tarefas/teclado/erros offline com dados fictícios e sem perfil pessoal.

Meta inicial proposta para ensaio no PC, não resultado medido: 10 mil unidades e 100 mil movimentos sintéticos; páginas de 50 itens e buscas indexadas com p95 de API abaixo de 300 ms, excluindo cold start e backup. Jornada de salvar deve dar retorno claro em até 1 s em operação normal; medir configuração/volume/cache e revisar meta se o hardware exigir. Nenhum benchmark foi executado nesta etapa.

Para múltiplos usuários: manter banco no servidor e acessar API central, acrescentando autenticação, permissões, TLS e política de conexão. Não compartilhar o arquivo em rede. Se a contenção de escrita medida justificar, avaliar PostgreSQL; modularidade reduz trabalho de migração, mas não a torna automática. Compras, vendas, custos e integrações permanecem expansões separadas.

## 8. O que está pronto para aprovação

Arquitetura e stack acima; política de uma OP ativa por unidade; reinspeção após nova execução; proteção para cancelamento de caixa fisicamente aberta; UX, estratégia de backup e sequência incremental. A lista oficial de extras continua pendente, sem bloquear o mecanismo genérico. Não há dependência de novas respostas sobre dados históricos. Ao aprovar, o próximo trabalho será o primeiro incremento do plano, com dados sintéticos; uso operacional só depois dos critérios de distribuição/recuperação.
