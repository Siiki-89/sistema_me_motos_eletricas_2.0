# Riscos e controles

| Risco | Situação | Tratamento |
|---|---|---|
| Regras incorretamente presumidas | Regras ainda abertas | Exemplos aprovados antes de schema/lógica |
| Falha do disco único | Inerente à operação local | Definir cópia em mídia local separada e ensaiar restauração |
| Backup inconsistente | Risco futuro de DB em uso | API SQLite; validar cópia/restauração |
| Dados em Git/nuvem | Prevenção necessária | Ignorar data/backups/logs; nenhum remoto/upload |
| Concorrência e repetição | Várias abas podem existir no mesmo PC | Transações e política de repetição a especificar |
| Cadeia de fornecimento | Dependências externas de desenvolvimento | Fontes oficiais, lockfile, inspeção e scripts automáticos desativados |
| Runtime do Codex | Usado em ferramentas de preparação | Produto terá runtime independente definido posteriormente |
| Skills consultam internet | Web Design Guidelines | Desenvolvimento apenas; funções do produto não dependem disso |
| Skill fora do catálogo | Duas skills Superpowers só visíveis no disco | Leitura direta e registro; não duplicar instalação |
| Confundir teste de ferramenta com produto | Produto ainda inexistente | Separação explícita no relatório |

Nenhuma perda, corrupção ou falha de desempenho de estoque foi confirmada. Não há produto implementado ou análise de legado.
