# Plano preliminar de evolução

Base: `estado-atual.md` e `brainstorming.md`. Writing Plans aplicado ao planejamento de fases; este documento não é plano detalhado executável e não autoriza implementação.

## Restrições

Windows/PowerShell; um computador; SQLite local; offline nas funções essenciais; sem legado, migração, nuvem ou dados publicados. Nenhuma funcionalidade de estoque nesta etapa.

## Fases e critérios de saída

1. **Brainstorming do primeiro fluxo.** Produzir `docs/modulos/<modulo-aprovado>.md` com entidades, exemplos, exceções e critérios de aceitação. Saída: regras aprovadas, sem pressupor módulos.
2. **Design e stack.** Registrar `docs/design-system.md` e decisão de arquitetura; comparar web local e desktop com requisitos Windows, offline e distribuição. Saída: desenho aprovado e metas de desempenho verificáveis.
3. **Plano detalhado.** Criar plano por incremento em `docs/superpowers/plans/`, com arquivos, interfaces, testes e comandos exatos. Saída: revisão e autorização para implementar.
4. **Fundação técnica.** Após autorização: inicialização local, SQLite, migrations, backup/restauração e erros. Saída: testes sintéticos de integridade, operação offline e recuperação.
5. **Primeiro fluxo vertical.** TDD das regras aprovadas, transações e UI. Saída: domínio/integração e Agent Browser para tarefa completa, teclado, formulários, erros e responsividade.
6. **Expansões aprovadas.** Uma capacidade por vez; regressões e rastreabilidade. Agentes somente onde não disputem arquivos ou banco.
7. **Distribuição local.** Validar instalação, início/encerramento, atualização e restauração no Windows. Saída: operar sem Codex e sem internet.

## Foco dos futuros testes

- Queda durante gravação: nenhuma operação parcialmente aplicada.
- Clique repetido/reenvio: comportamento definido sem duplicação involuntária.
- Entrada inválida: mensagem clara e nenhuma alteração persistente.
- Backup corrompido/incompatível: recusa sem sobrescrever banco válido.
- Internet ausente: fluxo essencial e assets funcionam.

Esses testes ainda não foram executados no produto. O plano detalhado usará TDD e revisão; execução por subagentes será escolhida apenas quando houver tarefas realmente independentes.
