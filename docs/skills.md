# Skills e procedência

## Superpowers

Plugin nativo global já instalado, versão 7.0.1, manifest `.codex-plugin/plugin.json` conferido no cache. O [repositório oficial](https://github.com/obra/superpowers#codex-app) recomenda o gerenciador nativo do Codex. Não foi criada cópia duplicada nem alterada a configuração global.

Raiz nesta máquina: `C:\Users\Alexandre de Melo\.codex\plugins\cache\openai-curated-remote\superpowers\7.0.1\skills`.

| Skill | Disponibilidade | Uso nesta etapa |
|---|---|---|
| brainstorming | Catálogo e arquivo | Levantamento inicial; definição de produto pendente |
| writing-plans | Arquivo presente, ausente do catálogo inicial | Leitura direta; plano preliminar, não plano executável |
| subagent-driven-development | Catálogo e arquivo | Reservada para implementação autorizada |
| dispatching-parallel-agents | Catálogo e arquivo | Auditoria independente de ferramentas delegada |
| test-driven-development | Catálogo e arquivo | Não exercitada em funcionalidades: não há produto |
| systematic-debugging | Catálogo e arquivo | Causa da incompatibilidade de metadados identificada |
| verification-before-completion | Arquivo presente, ausente do catálogo inicial | Leitura direta e verificação das entregas |
| requesting-code-review | Catálogo e arquivo | Disponível; nenhuma revisão de código de estoque alegada |
| using-git-worktrees | Catálogo e arquivo | Não invocada: repositório novo já isolado, sem feature em curso |

Disponibilidade no disco não comprova ativação automática. Após atualização de sessão, conferir o catálogo; quando necessário, carregar o SKILL.md pelo caminho exato. Não foi fingida execução de TDD, worktrees ou desenvolvimento por subagentes.

Execução multiagente comprovada: agente `auditar_ambiente` recebeu tarefa independente, executou consultas locais e entregou relatório. Não disputou escrita em arquivos, banco ou Git. Não foi preciso alterar config global.

## Skills locais

| Skill | Origem | Decisão |
|---|---|---|
| frontend-design | [Anthropic](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | Instalada; direção visual futura |
| web-design-guidelines | [Vercel](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | Instalada; revisão de UI/acessibilidade |
| agent-browser | [Vercel](https://github.com/vercel-labs/agent-browser/tree/main/skills/agent-browser) | Instalada e CLI testada; adaptação abaixo |
| React Best Practices | [Vercel](https://github.com/vercel-labs/agent-skills) | Não instalada: React ainda não escolhido |
| Skill Creator | Integrada em `.codex/skills/.system/skill-creator` | Reutilizada; nenhuma cópia duplicada |
| me-estoque | Criada para este projeto | Regras e rastreabilidade, sem inventar regras |
| me-design-system | Criada para este projeto | Padrões operacionais e UX, sem inventar identidade |
| me-quality-assurance | Criada para este projeto | Verificação proporcional, dados sintéticos e offline |

Instalação externa pelo script integrado `install-skill-from-github.py`, origem main em 08/11/2026; conteúdo instalado fica preservado no commit local e manifesto de hashes. Scripts externos dessas skills não foram executados. Skill Creator orientou arquivos mínimos, descrições específicas e validação, sem scaffolds desnecessários.

Agent Browser traz `hidden: true`, rejeitado pelo validador integrado. Foi feita cópia em `backups/agent-browser-SKILL.original.md` e removido somente esse campo. `allowed-tools: Bash(...)` é metadado upstream e não cria uma ferramenta Bash aqui: usar o wrapper PowerShell e as permissões reais do ambiente. Referências Shell da skill devem ser adaptadas ao Windows.

Frontend Design cuida de direção estética; Guidelines de revisão; me-design-system apenas das decisões específicas ME. As três não são duplicatas. Guidelines pode baixar texto público para revisão, nunca enviar código/dados. Funções essenciais do futuro produto continuam offline.

As skills locais devem ser descobertas no próximo turno com este projeto aberto; arquivos instalados/validados não equivalem a teste comportamental completo. Reabrir a sessão se o catálogo não atualizar.
