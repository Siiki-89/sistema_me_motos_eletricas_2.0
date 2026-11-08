# Arquitetura preliminar

SQLite persistente local é a direção definida pelo usuário. Nenhuma tabela, migration ou banco de produção criado.

| Opção | Benefícios | Custos |
|---|---|---|
| Web local + backend em loopback | Navegador existente, separação clara e testes diretos | Inicialização e encerramento coordenados |
| Desktop com frontend web | Janela e inicialização unificadas | Instalador, atualização, tamanho e runtime |

React/TypeScript é candidato, não requisito. Python também é candidato a backend. Não há motivo confirmado para SSR, nuvem ou Next.js. Runtime do Codex serve à preparação; o produto final deve funcionar sem Codex instalado.

## Limites recomendados para aprovação futura

- UI chama casos de uso; domínio concentra regras; adaptadores cuidam de SQLite, backup e exportação.
- Modularidade por capacidade confirmada, sem microsserviços para um PC.
- Caso haja HTTP, escutar somente em loopback, validar origem e entradas e não expor à rede local por padrão.
- Banco em diretório local, fora de Git, executáveis e pastas sincronizadas. Caminho definitivo a aprovar no desenho de distribuição.
- Operação crítica e histórico na mesma transação; definir comportamento de repetição após falha.
- Ativar e verificar integridade referencial em cada conexão. [SQLite: foreign keys](https://www.sqlite.org/foreignkeys.html).
- Migrations versionadas após modelo aprovado, com backup prévio e teste em cópia.
- Backup consistente pela API SQLite e restauração em caminho separado; copiar só o `.db` em uso não é estratégia suficiente. [SQLite: backup](https://www.sqlite.org/backup.html).
- Logs locais com rotação e sem dados sensíveis desnecessários; erros explicam recuperação sem perder contexto do formulário.
- Assets/fontes locais e fluxo essencial offline. Sem e-mail, Resend, nuvem ou integrações externas.
- Medir desempenho com volume representativo antes de escolher índices e paginação.

## Organização futura sugerida

Após aprovar a stack: `src/modules/<capacidade>/`, `src/shared/`, `tests/`, `migrations/` e scripts PowerShell. Não foram criados scaffolds de frameworks nem pastas vazias de aplicação nesta etapa.
