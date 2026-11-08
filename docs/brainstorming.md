# Brainstorming — decisões e ponto de continuidade

## Metodologia vigente

Planejamento autônomo e propositivo conforme instrução do usuário. Reutilizar documentação, separar confirmado/proposto/pendente e perguntar só sobre mudanças relevantes de negócio. Não retomar questionário individual nem reabrir identificação, reserva, baixa ou políticas já aprovadas.

## Confirmado

Produto novo para um computador Windows, SQLite exclusivamente local e operação essencial offline. Uma moto por caixa e por OP; ME/cor compartilháveis; chassi após abrir; reserva na OP inicial e baixa ao iniciar transcrição, admitindo conferência incompleta. Cada unidade tem identidade interna estável.

Última aprovação: saída normal exige chassi/montagem/qualidade; movimento administrativo auditado não libera entrega insegura. Extras preservam origem e podem ir a comum/outra unidade/destino administrativo justificado. Cancelamento pré-conversão libera reserva; depois não devolve caixa. Novas OPs podem usar a mesma unidade sem duplicar ou baixar outra caixa.

Registro com critérios: [regras do módulo](modulos/estoque-producao.md). Evidências da OP, planilha e ZIP: [requisitos operacionais](requisitos-operacionais.md). Materiais foram analisados como referência; não são estoque atual nem código reutilizável.

## Proposta entregue para aprovação

- [Fluxo integrado](proposta-fluxo-operacional.md): estados, telas, transições e políticas atualizadas.
- [Validação de consistência](validacao-consistencia.md): invariantes, conflitos e cenários numéricos.
- [Arquitetura](arquitetura-tecnica.md): React/TypeScript + Fastify/Node + SQLite, distribuição/backup local e alternativas.
- [Plano incremental](superpowers/plans/2026-11-08-me-estoque-implementacao.md): 12 entregas verificáveis, arquivos, contratos e testes futuros.

Recomendações técnicas ainda propostas: uma OP ativa por unidade; nova execução exige reinspeção; quantidade bloqueada ao cancelar antes do lançamento quando abertura física for informada; comandos idempotentes e correções compensatórias.

## Pendências reais

Lista oficial de extras e aplicabilidade final dos checklists por modelo. Antes da operação real, configurar destino secundário local de backup e validar recuperação. Compras, orçamentos, catálogo completo de fornecedores e série individual de baterias não integram automaticamente a primeira versão.

Próximo passo: usuário revisar arquitetura/plano; só depois implementar. Execução sequencial recomendada para evitar custo de contexto duplicado e mudanças concorrentes nos contratos. Nenhuma funcionalidade ou banco foi criado nesta etapa.
