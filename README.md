# ME Estoque 2.0

Fundação local para gestão de estoque e produção da ME Motos Elétricas. Windows, React/TypeScript, Fastify e SQLite; operação essencial offline.

**Entrega atual:** interface inicial, comunicação local, persistência técnica, migrations, backup e restauração. Módulos operacionais ainda não implementados.

## Iniciar neste computador

No PowerShell7, na raiz do projeto:

```powershell
.\scripts\start.ps1
# Para encerrar com segurança:
.\scripts\stop.ps1
```

Abre `http://127.0.0.1:4317`. Runtime Node local já preparado, sem dependência do Codex ou mudança no Node global. Banco padrão: `%LOCALAPPDATA%\ME-Estoque\data\me-estoque.sqlite`. Consulte [operação e recuperação](docs/operacao-local.md).

## Desenvolvimento e verificação

```powershell
.\scripts\npm.ps1 run build
.\scripts\npm.ps1 test
.\scripts\npm.ps1 run dev
.\scripts\npm.ps1 run test:browser shell
.\scripts\npm.ps1 run test:browser backup
```

Desenvolvimento usa banco separado; testes usam dados sintéticos. Não executar dev e instância normal na mesma porta ao mesmo tempo.

- [Estado atual](docs/estado-atual.md)
- [Resultados e limites dos testes](docs/verificacao-fundacao.md)
- [Design system provisório](docs/design-system.md)
- [Arquitetura aprovada](docs/arquitetura-tecnica.md)
- [Plano incremental e progresso](docs/superpowers/plans/2026-11-08-me-estoque-implementacao.md)
- [Fluxo operacional](docs/proposta-fluxo-operacional.md)
- [Requisitos e evidências](docs/requisitos-operacionais.md)

Dados, backups, logs, ferramentas locais e artefatos não são versionados. Não colocar SQLite em pasta de rede/sincronização. Esta entrega é um checkout executável neste computador; o instalador de distribuição e os módulos operacionais pertencem a próximas etapas.
