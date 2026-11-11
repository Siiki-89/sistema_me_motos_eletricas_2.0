# ME Estoque 2.0

- Produto novo, local e offline, Windows/PowerShell. Raiz: esta pasta.
- Não procurar, reutilizar ou migrar o sistema anterior. Regras aprovadas e limites em docs/modulos/.
- Etapa atual: etapa6 (produção, montagem, pausas e tempos) implementada; consultar verificação e pendência da base em docs/estado-atual.md. Não avançar para qualidade, peças ou expedição sem novo pedido.
- Ler `docs/estado-atual.md` primeiro; consultar apenas os documentos do módulo necessário.
- Brainstorming agora é propositivo: usar `docs/proposta-fluxo-operacional.md`, separar confirmado/proposto/pendente e agrupar somente dúvidas de negócio relevantes ao final. Não repetir perguntas resolvidas nem bloquear em escolhas técnicas reversíveis.
- Usar Superpowers sob demanda: brainstorming → plano → implementação autorizada → testes e revisão.
- Skills ME em `.agents/skills/`; o catálogo de procedência está em `docs/skills.md`.
- Stack aprovada: React/TypeScript/Vite + Node/Fastify + SQLite local. Consultar docs/operacao-local.md e docs/verificacao-modelos-caixas.md para executar/testar.
- Não enviar dados operacionais, arquivos, capturas ou bancos para serviços externos; pesquisa pública só com termos genéricos.
- Antes de alterar arquivo existente, fazer backup local fora do Git. Nunca sobrescrever backups.
- Não executar scripts externos sem inspeção; não instalar dependências duplicadas.
- Sem publicação, nuvem, custos ou comandos destrutivos sem autorização. Evoluir SQLite somente por migrations aprovadas, com backup prévio.
- Pesquisar com `rg` de forma dirigida; respeitar `.gitignore`/`.rgignore` e evitar ler dependências ou documentos grandes repetidamente.
- Delegar somente tarefas independentes com arquivos distintos. Não paralelizar alterações no mesmo banco/repositório.
- Testes futuros: dados sintéticos, banco isolado e Agent Browser em sessão própria, sem perfil pessoal.
- Registrar comandos, resultados reais, limitações e próximo passo. Não declarar testes que não rodaram.
- Commits locais; nenhum remoto sem instrução explícita. Dados, backups e logs nunca entram no Git.
