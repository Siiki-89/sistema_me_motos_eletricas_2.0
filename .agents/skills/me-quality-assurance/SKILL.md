---
name: me-quality-assurance
description: Planejar e executar verificações da ME Estoque 2.0, incluindo regras, persistência SQLite, interfaces e regressões.
---
# Qualidade ME
Consultar docs/verificacoes.md e os critérios do módulo. Escolher verificações proporcionais; reportar comandos, saída e limitações.
Para comportamento autorizado, usar TDD com falha relevante demonstrada, implementação e verificação. Documentação simples não exige testes artificiais.
SQLite: testar transação interrompida, integridade referencial, restauração, concorrência entre abas e repetição conforme regras aprovadas. Usar banco descartável, nunca produção.
Frontend: Agent Browser em sessão isolada para navegação, formulários, teclado, filtros, erros e larguras acordadas; capturas locais e dados fictícios.
Testar funções essenciais sem internet e assets remotos. Não enviar relatórios ou capturas a serviços externos.
Distinguir instalação, teste de ferramenta e teste de produto. Produto inexistente não tem E2E aprovado.
Registrar testes não executados e motivo; não tratar hipótese de risco como bug confirmado.
