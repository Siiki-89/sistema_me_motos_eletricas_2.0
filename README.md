# ME Estoque 2.0

Fundação local para gestão de estoque e produção da ME Motos Elétricas. Windows, React/TypeScript, Fastify e SQLite; operação essencial offline.

**Entrega atual (etapa6):** modelos/cores, caixas, OP com reserva e individualização, produção/montagem, pausas, tempos, ocorrências, autoconferência, backup e restauração. Inspeção de qualidade e expedição/recebimento incorporados na branch de finalização. Peças e melhorias de produção permanecem pendentes.

**Ativação operacional pendente:** o banco anterior de224 caixas não foi localizado. Há somente registros dos lançamentos preservados; não houve reconstrução. Leia o [diagnóstico](docs/diagnostico-banco-operacional.md). Testes e demonstrações utilizam bases sintéticas.

## Iniciar neste computador

No PowerShell7, na raiz do projeto:

```powershell
.\scripts\start.ps1 -DataDirectory 'C:\caminho\da\pasta-verificada'
# Para encerrar com segurança:
.\scripts\stop.ps1 -DataDirectory 'C:\caminho\da\pasta-verificada'
```

Substitua o caminho de exemplo pela pasta absoluta previamente verificada; não existe fallback para uma base padrão. Abre `http://127.0.0.1:4317`. Runtime Node local já preparado, sem dependência do Codex ou mudança no Node global. Consulte [operação e recuperação](docs/operacao-local.md).

## Desenvolvimento e verificação

```powershell
.\scripts\npm.ps1 run build
.\scripts\npm.ps1 test
.\scripts\npm.ps1 run dev
.\scripts\npm.ps1 run test:browser shell
.\scripts\npm.ps1 run test:browser backup
.\scripts\npm.ps1 run test:browser production
```

Desenvolvimento usa banco separado; testes usam dados sintéticos. Não executar dev e instância normal na mesma porta ao mesmo tempo.

- [Estado atual](docs/estado-atual.md)
- [Resultados e limites dos testes desta etapa](docs/verificacao-producao.md)
- [Design system provisório](docs/design-system.md)
- [Arquitetura aprovada](docs/arquitetura-tecnica.md)
- [Plano incremental e progresso](docs/superpowers/plans/2026-11-08-me-estoque-implementacao.md)
- [Fluxo operacional](docs/proposta-fluxo-operacional.md)
- [Requisitos e evidências](docs/requisitos-operacionais.md)

Dados, backups, logs, ferramentas locais e artefatos não são versionados. Não colocar SQLite em pasta de rede/sincronização. Esta entrega é um checkout executável neste computador; instalador de distribuição e módulos restantes pertencem a próximas etapas.
