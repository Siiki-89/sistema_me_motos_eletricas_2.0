# Diagnóstico do banco operacional — 10/11/2026

**Classificação 3: somente registros de lançamentos disponíveis.** O banco original com 224 caixas e o arquivo do backup posterior aos lançamentos não foram localizados nos caminhos examinados. Não há recuperação nem restauração realizada. A causa histórica permanece não comprovada.

## Evidências confirmadas

- `artifacts/operational-import/recebimento-20261109.json`: 44 comandos com 44 resultados, conclusão em 09/11/2026 às 21:35:49.821 UTC; resumo final físico224, reservado0, disponível224, origens20 e variantes20. Arquivo preservado, 37.220 bytes, SHA256 `920bcb35b4f1cee92fbbbf9dd80568f0ff966e0b2e3293ab3298d6cb033d99c3`. Não equivale ao banco e ao histórico completo.
- `.superpowers/sdd/etapa5/production-before.json`: registra backup `f61fbbad-7968-4c4d-a554-bc12633bd62f`, schema2, 139.264 bytes, 09/11/2026 21:43:46.381 UTC, com resumo224/20. O arquivo SQLite correspondente não foi localizado. O journal também referencia o backup **anterior** ao recebimento `37a61b40-8fef-4507-9cc5-bc931a3a76d2`, schema2, 98.304 bytes; arquivo não localizado.
- O usuário informou que não alterou manualmente a pasta. Não foi atribuída a ele qualquer mudança.

## Resolução de caminho observada antes da correção da etapa6

Nota posterior (11/11): a implementação passou a exigir pasta explícita em start.ps1 e ME_DATA_DIR no backend, removendo a criação por fallback. O diagnóstico abaixo descreve o código e os caminhos examinados antes dessa correção. Nenhuma base operacional foi ativada ou migrada para verificar a mudança.

`scripts/start.ps1` e `stop.ps1` usam por padrão `$env:LOCALAPPDATA/ME-Estoque/data`. Start aceita `-DataDirectory` absoluto local, normaliza com `GetFullPath` e fornece `ME_DATA_DIR` ao filho; cria pasta se ausente. Backend `src/server/main.ts` prefere `ME_DATA_DIR`, senão `LOCALAPPDATA/ME-Estoque/data`; a validação rejeita caminho relativo/rede. `scripts/dev.mjs` força `resolve('data/development')`, dependente do diretório de trabalho. Não foram executados esses inicializadores durante a investigação.

Na mesma pasta de trabalho `C:/Users/Alexandre de Melo/Desktop/me`, o PowerShell restrito retornou `LOCALAPPDATA` e KnownFolder LocalApplicationData em `C:/Users/Alexandre de Melo/AppData/Local/Packages/openai.codex_2p2nqsd0c76g0/AC/#!sandbox.{0969378f-b843-4e42-a85a-52c96ae341ee}`. A execução escalada retornou ambos em `C:/Users/Alexandre de Melo/AppData/Local`. Na sessão normal, `ME_DATA_DIR`, `ME_PORT` e `NODE_ENV` estavam ausentes. A enumeração posterior do AC mostrou outro GUID de sandbox (`248ec595-a712-41e6-9f40-237d711e9cdf`), confirmando que o nome não deve ser tratado como estável.

**Hipótese:** uma inicialização sem pasta explícita em ambientes com LOCALAPPDATA distintos pode abrir/criar outra base, mesmo sem mudança manual. A divergência foi observada hoje; não há registro do caminho efetivamente usado pelo processo dos lançamentos em 09/11 que prove ser essa a causa do desaparecimento.

## Arquivos atuais da pasta padrão normal

Prefixo `C:/Users/Alexandre de Melo/AppData/Local/ME-Estoque/data/`. Datas UTC; nenhuma base foi ativada.

| Arquivo | Bytes | Criação UTC | Última escrita UTC | Schema | Físico/origens/variantes | Integridade / FKs |
|---|---:|---|---|---:|---|---|
| `me-estoque.sqlite` | 98.304 | 10/11 09:55:17.638 | 10/11 09:55:17.653 | 2 | 0/0/0 | ok / 0 erros |
| `backups/59c55e81-fd05-4dd8-96b3-285bc0bd5dbc.sqlite` | 98.304 | 10/11 09:55:42.656 | 10/11 09:55:42.661 | 2 | 0/0/0 | ok / 0 erros |

O backup tem WAL existente vazio e SHM existente. Não foram removidos ou modificados. O runtime-instance registra início em 10/11 09:55:18 UTC, consistente com a base recém-criada. Ambos os logs dessa instância têm zero bytes. Não demonstram o caminho usado em 09/11. O backup íntegro vazio **não** é classificado como recuperação das 224 caixas.

## Alcance e procedimento somente leitura

Foram lidos os scripts acima, `platform/database.ts`, migration002, operação local, snapshots da etapa5 e o script de registro (inspecionado, nunca executado). Pesquisas dirigidas com `rg -n` e `Get-ChildItem -LiteralPath ... -Recurse -File` abrangeram a pasta normal ME-Estoque, AC do pacote Codex, `artifacts/` e `data/` da raiz. Não se pesquisou o sistema anterior, pastas de outros projetos, perfis ou o disco inteiro. Não foram lidos registros gerais de chats nem históricos pessoais do shell.

Inventário: 460 arquivos `.sqlite` em artifacts/data/pasta normal; nenhum apresentou saldo224. Os arquivos em artifacts são evidências/fixtures sintéticas, inclusive a demonstração ativa em `artifacts/preview/9f69dfd6-f715-4a04-803e-20597c3f7ef6/data`. Ela não foi parada nem tratada como base operacional. Nenhum WAL não vazio foi encontrado nesse inventário. A busca no AC não localizou banco ME nem os backups identificados.

Para evitar inclusive criação implícita de SHM, o diagnóstico SQL foi feito com `better-sqlite3` sobre **Buffer em memória**, `readonly:true`: `readFileSync`, tabela `schema_migration`, `sqlite_master`, `count(*)`, `sum(quantity)`, `PRAGMA integrity_check` e `PRAGMA foreign_key_check`. A primeira tentativa com Buffer de bancos em modo WAL produziu `unable to open database file`; foi repetida após ajustar apenas os bytes18/19 do Buffer para modo rollback, sem alterar arquivos. Isso só foi permitido após conferir WAL ausente/vazio; nunca se ignorou WAL com conteúdo. A repetição leu460/460 sem erros. Os resultados de integridade da tabela acima são das imagens em memória, não de uma abertura gravável dos originais. Não se importaram `buildApp`, migrações, restauração ou módulos de inicialização.

Comandos de ambiente executados nos dois contextos: `Get-Location`; leitura apenas de `LOCALAPPDATA`, `ME_DATA_DIR`, `ME_PORT`, `NODE_ENV` e `[Environment]::GetFolderPath('LocalApplicationData')`. Metadados: `Get-Item`, `Get-ChildItem`, `Get-FileHash -Algorithm SHA256`. Execução SQL: runtime Node24 local via stdin, requerendo apenas `node:fs`, `node:path` e `better-sqlite3`; nenhum script externo ou dependência instalada. A enumeração ampla inicial de fixtures teve saída truncada; o resumo posterior foi completo. Uma busca com glob PowerShell literal falhou; foi substituída pela pesquisa dirigida ao diretório. Não se afirma ausência fora do alcance examinado.

## Encaminhamento

Preservar a pasta vazia, os backups, os journals e quaisquer candidatos futuros. Não escolher banco, migrar, restaurar, reexecutar lançamentos ou ativar silenciosamente o padrão. Retomada operacional depende de localizar/conferir o original ou de decisão explícita de recuperação/conciliação. A Fase2 pode seguir em bases sintéticas explicitamente identificadas e isoladas, conforme autorização do pedido, com proteção para impedir ativação operacional silenciosa.
