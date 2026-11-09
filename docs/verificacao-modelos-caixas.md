# Verificação da etapa 4 — 09/11/2026

Entrega: cadastro de referências/cores, recebimento, estoque agregado, histórico, ajustes e estornos. API Fastify e SQLite reais, sem dados estáticos de demonstração na aplicação. Escopo e decisões em [catálogo e caixas](modulos/catalogo-caixas.md).

## Verificações executadas

| Verificação | Evidência |
|---|---|
| TypeScript e build | `scripts/npm.ps1 run build`, exit0; frontend local e backend compilados |
| Suíte integrada | 45/45 passaram em 6 arquivos: 20 backend, 21 interface e 4 ferramentas Windows. Execução final após correções: 09/11/2026, 18:27, exit0 |
| SQLite e domínio | Cadastro válido/inválido/duplicado, cores, inativação, versão concorrente, quantidades0/negativas/fracionadas, datas inválidas, idempotência/conflito, ajustes/estornos, saldo, filtros/paginação e reinício |
| Transações | Trigger sintético de falha de auditoria confirmou rollback; FK real; segunda conexão bloqueada resulta503; invariantes de reservas testadas em função, sem OP fictícia |
| Migração | Base sintética1 atualizada para2, cópia prévia validada; versão futura, checksum incompatível e tabela ausente recusados |
| Backup operacional | `artifacts/test-tmp/backup-domain-NPdhuH/result.json`: entrada3/ajuste−1, backup, entrada4, restore→2, replay→2 e reinício→2; auditoria4/movimentos2 preservados, integrity_check=ok |
| Agent Browser receipt | `artifacts/browser/receipt-eSI4oi/result.json`: cadastro de modelo/cor, buscaURL, entrada2 com origem/NF/lote, confirmação antes da mutação, ajuste−1, estorno+1, reload2/0/2,3movimentos no SQLite |
| Agent Browser backup | `artifacts/browser/backup-5U7Syr/result.json`: criar, validar, confirmar e restaurar SQLite real isolado com schema2; cenário inclui navegação, erro/retry e móvel |
| Visual e acessibilidade | Capturas desktop1440 e móvel390 inspecionadas; sem overflow da página, tabela com rolagem local. Auditoria axe na tela de estoque:46passes,0violações,0incompletos. Não equivale a certificação de toda a aplicação |
| Segurança/offline | Sessão própria, banco isolado e porta livre; recursos locais, HTTPS bloqueado no cenário; Host/Origin/CSRF e erros sanitizados mantidos |
| Inicializador Windows | Início/reuso/encerramento próprio e porta ocupada passaram com permissão de conexão local; falha anterior em sandbox não se repetiu |

Nenhum teste utilizou banco de produção ou perfil pessoal. Evidências, logs e cópias ficam ignorados pelo Git. A versão instalada do Chrome foi mantida; navegador de teste restrito ao aplicativo local.

## TDD, revisão e correções

Auxiliar de backend demonstrou RED inicial por rotas ausentes, RED de auditoria antes/depois e RED de schema incompleto. Auxiliar de frontend demonstrou RED das rotas operacionais antes de criá-las. Casos complementares foram adicionados depois; não alegamos RED individual para todos.

Coordenador reproduziu e corrigiu três regressões com RED/GREEN: atualização da URL apagava pesquisa ao reiniciar página; paginação submetia formulário de recebimento; botão de consultar novamente também submetia o formulário. Falhas de rede mantêm chave de operação e campos; erros definitivos permitem correção. Mensagens não expõem SQL/caminhos.

Revisão independente de backend: especificação aprovada, sem bloqueante. Revisão final: sem bloqueante de integridade/duplicação; botão de retry apontado e corrigido. Ressalva pequena: tipos de criação/edição ainda compartilham version opcional; UI envia e serviço exige versão ao editar, impedindo sobrescrita insegura. Teto de paginação foi adicionado. Cobertura de backup operacional complementou a revisão.

Web Design Guidelines consultadas em sua [fonte](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Labels, foco, estados, tabelas semânticas, filtrosURL, feedback e recursos locais conferidos. Auditoria detectou landmark/ARIA e a correção foi revalidada. A implementação do auxiliar foi retomada pelo coordenador após interrupção por limite de uso, preservando o trabalho existente.

## Limitações e continuidade

- Não há benchmark de grande volume, corte real de energia ou disco cheio físico; não alegar essas validações.
- Busca substring usa `lower` do SQLite padrão, cuja comparação Unicode não remove acentos nem faz todas as conversões de caixa.
- Rascunhos não persistem. Há aviso para saída pelos links do recebimento e fechamento/recarregamento; não é garantia contra toda forma de encerrar ou voltar pelo navegador.
- Operador local não é login pessoal. Backup automático/retencão/segundo disco e instalador completo não fazem parte deste incremento.
- OP, reservas, chassi, montagem, qualidade, expedição e peças permanecem fora do escopo. Não avançar automaticamente.
- Commit local somente, sem novo push. Bancos, backups, evidências e referências não entram no commit.

## Ativação local

Após build e testes, scripts/start.ps1 -NoBrowser iniciou a aplicação normal em http://127.0.0.1:4317. Health retornou status=ok e schemaVersion=2. A lista de backups mostrou uma cópia da estrutura1, gerada antes do upgrade. Não foram cadastrados dados sintéticos na base normal. Recarregar a aba antiga para carregar a interface nova.

## Decisões de execução

Mantida a branch codex/fundacao-local e a raiz autorizada para reaproveitar runtime; se outra organização Git for preferida, pode-se criar nova branch do commit sem refazer código. O pedido da etapa4 supera a antiga instrução de apenas planejamento; não altera a autorização dos módulos futuros. Operador local é identificação técnica explícita, sem atribuição pessoal; uso multiusuário exigirá cadastro/autenticação próprios. Evidências auxiliares preservadas fora do Git, sem limpeza destrutiva.
