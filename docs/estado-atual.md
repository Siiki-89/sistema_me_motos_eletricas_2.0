# Estado atual — 08/11/2026

## Ponto de retomada

O usuário aprovou as três políticas operacionais com ajustes, incorporados em [proposta-fluxo-operacional.md](proposta-fluxo-operacional.md) e [requisitos-operacionais.md](requisitos-operacionais.md). Saída administrativa não aprova qualidade; extras preservam origem nas transferências; novas OPs reutilizam unidade sem reserva/baixa. Não repetir perguntas resolvidas. Sem implementação ou alteração de banco.

**Próximo passo:** aprovação da [arquitetura técnica](arquitetura-tecnica.md) e do [plano incremental](superpowers/plans/2026-11-08-me-estoque-implementacao.md), com 12 entregas verificáveis. Recomendação: React/TypeScript + Fastify/Node + SQLite, web local em loopback. [Validação de consistência](validacao-consistencia.md) documenta conflitos e invariantes; [registro do módulo](modulos/estoque-producao.md) concentra regras aprovadas. Uma OP ativa por unidade, reinspeção após nova execução e bloqueio de quantidade aberta ao cancelar são propostas técnicas ainda submetidas à revisão.

Produto novo, criado do zero em `C:\Users\Alexandre de Melo\Desktop\me`. Por orientação posterior do usuário, análise, busca e migração de legado estão fora do escopo. Regras de negócio serão definidas em brainstorming.

Nenhuma funcionalidade, schema de domínio ou frontend foi implementado. SQLite local está definido; stack/empacotamento foram recomendados, ainda não aprovados. Revisão desta entrega é documental; testes de software e benchmarks estão previstos, não executados.

| Local | Finalidade |
|---|---|
| `.git/` | Histórico local, sem publicação |
| `AGENTS.md` | Instruções curtas e roteamento de contexto |
| `.agents/skills/` | Skills ME e frontend/QA selecionadas |
| `docs/` | Ambiente, decisões, plano e evidências |
| `tools/` | Dependências e utilitários de desenvolvimento |
| `data/` | Reservado para persistência futura, ignorado pelo Git |
| `backups/` | Cópias anteriores a alterações, ignoradas pelo Git |
| `artifacts/` | Evidências locais de verificação, ignoradas pelo Git |

A subpasta provisória `me-estoque-2.0`, criada antes do esclarecimento do usuário, teve o conteúdo movido para a raiz após conferir caminhos e ausência de colisões; só a pasta vazia foi removida. Nenhum conteúdo perdido.

Etapa 2 em andamento: recebimento confirmado parcialmente em [recebimento.md](recebimento.md). A referência de OP fornecida pelo usuário foi analisada integralmente em [requisitos-operacionais.md](requisitos-operacionais.md); lista de itens extras pendente. O uso autorizado desse formulário como referência operacional não inclui reaproveitamento de código ou migração de dados.

Confirmado: cada OP corresponde exclusivamente a uma única moto, com uma ficha individual. A mesma unidade pode ter várias OPs históricas; apenas a inicial participa da reserva/conversão.

Referências adicionais analisadas: planilha de produção e programa de orçamento em ZIP, exclusivamente como material de processo e UX, sem execução/reuso/importação. Resultados em `requisitos-operacionais.md`, seções 9–13. ME/cor selecionam caixas; chassi só após desembalagem; reserva na OP inicial e baixa ao iniciar transcrição, mesmo antes do fim da conferência. Dados mínimos/ação explícita estão propostos no fluxo; não retomar a pergunta individual. Pendentes: catálogo oficial de extras e aplicabilidade de checklist; não bloqueiam aprovação do desenho técnico.
