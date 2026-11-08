# Ambiente — 08/11/2026

## Inventário verificado

| Ferramenta | Versão | Situação |
|---|---|---|
| PowerShell | 7.6.5 | Existente, shell principal |
| Git | 2.49.0.windows.1 | Existente; repositório local inicializado em main |
| Node no PATH | 22.16.0 | Preservado |
| npm | 10.9.2 | Preservado; usar npm.cmd no PowerShell |
| Codex CLI | 0.166.0-alpha.6 | Encontrado no bundle do app; não instalado novamente |
| Codex desktop | Não confirmada | Consulta Appx bloqueada; versão CLI não é versão do app |
| Chrome | 156.0.8078.81 | Existente; usado em teste headless isolado |
| Edge | 157.0.4341.42 | Existente; não usado no smoke test |
| Python no PATH | Alias WindowsApps não executável | Não substituído |
| Python do Codex | 3.12.14 | Encontrado pelo localizador de dependências do Codex |
| SQLite do Python | 3.53.1 | Disponível; teste sintético em memória |
| SQLite do Node 22 | 3.49.1 | Consulta de versão executada; módulo experimental, não escolhido para produção |
| sqlite3 CLI | Não encontrado | Desnecessário agora: inspeção via Python padrão |
| Node do Codex | 24.22.1 | Já incluído; compatível com engines do pacote Agent Browser |
| Agent Browser | 0.41.2 | Instalado localmente em tools, versão exata no lockfile |
| PyYAML | 6.0.3 | Instalado apenas em tools/python-libs para validador de skills |

## Caminhos e uso

Runtime incluído no Codex nesta máquina:

`C:\Program Files\WindowsApps\OpenAI.CodexPrimaryRuntime.v26-1105-1297-0_26.1105.1297.0_x64__3k8sg7r9htsxt\dependencies`

Python: `python\python.exe`; Node: `node\bin\node.exe`. A versão do diretório pode mudar ao atualizar o Codex; redescobrir com o localizador de dependências. Não tornar esses caminhos requisito do produto distribuído.

```powershell
$pythonExe = 'C:\Program Files\WindowsApps\OpenAI.CodexPrimaryRuntime.v26-1105-1297-0_26.1105.1297.0_x64__3k8sg7r9htsxt\dependencies\python\python.exe'
& $pythonExe .\tools\verify-sqlite.py
# Somente quando houver banco de teste criado/autorizado:
& $pythonExe .\tools\inspect-sqlite.py <caminho-do-banco-de-teste>
.\tools\agent-browser.ps1 --version
.\tools\agent-browser.ps1 skills get core
.\tools\agent-browser.ps1 session id --scope worktree --prefix me
```

Usar a sessão retornada em cada comando; encerrar só essa sessão com `close`. `tools/agent-browser.json` seleciona Chrome headless e pode ser passado por `--config`. Não usar perfis pessoais nem provedores externos. Socket padrão do Agent Browser fica em `~/.agent-browser`, podendo exigir permissão fora do sandbox.

## Instalação e compatibilidade

O pacote publicado exige Node >=24 e declara pnpm >=11. O npm 10 baixou o pacote com `--ignore-scripts`, emitindo aviso de engines por estar no Node 22; nenhum script de ciclo de vida rodou. O executável nativo Windows já veio no pacote e é usado diretamente pelo wrapper PowerShell, sem depender do Node 22. Não foi instalado pnpm, Node ou Chrome duplicado.

Foram inspecionados `package.json`, `scripts/postinstall.js` e o launcher. O postinstall poderia baixar binário e reescrever shims globais; não precisou ser executado. Integridade do pacote npm registrada no lockfile. Não houve instalação global.

Para reinstalar ferramentas, revisar scripts da versão fixada e executar `npm.cmd ci --prefix tools --ignore-scripts --no-audit --no-fund` com Node compatível no PATH; confirmar o binário nativo. Não atualizar para latest silenciosamente.

Python/PyYAML são ferramentas de preparação, não escolha de backend. SQLite não requer servidor. Não foi instalado editor gráfico redundante; `inspect-sqlite.py` usa URI `mode=ro`, `query_only` e não imprime registros de negócio.

## Limitações observadas

Consulta npm inicial ficou bloqueada no sandbox; repetição autorizada fora dele funcionou. Codex CLI tentou manutenção automática de temporários/aliases, bloqueada pelo sandbox. Agent Browser avisou que o Chrome estava abaixo da versão estável que ele conhece; navegador existente não foi substituído. Planejar atualização pelo mecanismo do navegador antes de navegação externa; o teste desta etapa abriu somente fixture local.

Fontes: [Agent Browser oficial](https://github.com/vercel-labs/agent-browser), [pacote npm](https://www.npmjs.com/package/agent-browser), [SQLite](https://www.sqlite.org/). Nenhum serviço pago, remoto Git ou infraestrutura de nuvem configurado.
