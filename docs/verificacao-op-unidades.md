# Verificação da etapa5 — 10/11/2026

## Escopo e pré-requisito

OP inicial, reserva1, transcrição parcial, unidade/chassi, cancelamento e rastreabilidade; sem produção detalhada, qualidade, expedição, peças ou retrabalho completo. Regras em [OP/unidades](modulos/op-unidades.md).

Etapa4 já versionada em5277f08. Antes do novo código: build/typecheck e45/45 testes passaram, junto com Agent Browser receipt-7tzWAo e backup-3M98qn. Verificação anterior09/11 também preservada localmente. Não se repetiu commit da etapa4.

## Evidência final de integração

- `scripts/npm.ps1 run build`: PASS; TypeScript, Vite e compilação servidor. Sem dependências novas.
- `scripts/npm.ps1 test`: PASS, **64 testes em9 arquivos**,10/11 às12:07:32;31servidor,29web,4tooling. Execução local com permissão para sockets e subprocessos Windows. Inclui ajustes finais de interface.
- `node scripts/test-browser.mjs orders`: PASS, evidência local orders-XUdcBR (anterior orders-EqmVh2 também PASS).
- `node scripts/test-browser.mjs receipt`: PASS,receipt-bmhMvL. Cadastro/cor, recebimento2, ajuste−1, estorno+1, histórico/recarga e integridade.
- `node scripts/test-browser.mjs backup`: PASS,backup-lOT9QB. Criação, validação, confirmação e restauração SQLite real em base sintética.

Runtime local: tools/runtime/node-v24.22.2-win-x64/node.exe. Capturas/JSON/PDF/logs em artifacts/browser/, fora do Git. Sessões próprias do Agent Browser, Chrome sem perfil pessoal, porta livre, rede externa bloqueada e apenas dados sintéticos.

## OP no navegador

Recebe3 → cria OP (S3/R1/B0/D2) → abre confirmação sem efeito → converte parcial sem chassi (S2/R0/B0/D2,uma unidade) → preenche chassi e salva/recarrega sem nova baixa → cancela convertida, mantém unidade/saldo → outra OP cancelada fechada liberaR → outra cancelada aberta criaB → regularizaB→R, mesmaorigem, sem aumentarD. Pesquisa por chassi persiste na URL; banco termina com uma unidade/uma conversão,integrity_check ok e FK sem violações.

Desktop1440 e móvel390 inspecionados; sem overflow da página (tabela tem rolagem própria). Axe no detalhe:0 violações,0 verificações incompletas. Confirmação por teclado, estados de erro/retry, feedback e ausência de assets externos exercitados pelo runner.

Ficha renderizada pelo comando PDF do Agent Browser:1 página, inspecionada com Poppler e imagem. CLI emitiu tamanho Letter; CSS especificaA4, mas impressão física A4/impressora não foi ensaiada. Textos extensos da ficha são resumidos com indicação para consultar a OP; não há checklist de montagem futuro.

## TDD, regras e revisão

RED inicial backend404 e UIrotas ausentes → GREEN. Falha real de proteção de saldo por SQL e chassiOriginal ausente → correções verificadas. Testes incluem replay/intent divergente, FIFO, disputa de última caixa e cancel/conversão em dois processos Node/conexões reais, duplicidade chassi, correção auditada, rollback por falha intermediária, origem/lote, cancelamentosB, estados independentes, persistência/reabertura, upgrade2 e backup/restauração3 com OP/unidade/histórico/recibos.

Revisão backend independente: spec/quality PASS, sem P1/P2. Revisão UI identificouP2: concluir registro com alterações não salvas descartava rascunho. Corrigido com impedimento/explicação e guarda; préconversão requer consentimento explícito para descartar e cancelar. RED1FAIL/5PASS → GREEN; teste dirigido final7/7; re-revisão aprovada.

Ocorrências de verificação: teste Windows executado pelo agente sem buildnovo/permissão adequada teve timeout; após build e execução local, suíte61/61 e depois63/63 passou. Primeira inicialização do browser concorrendo com suíte não respondeu dentro da janela; execução sequencial passou. Um seletor do runner esperava mensagem antiga de sucesso; evidência mostrou salvamento correto e texto novo, seletor corrigido. Essas falhas não são apresentadas como testes verdes anteriores à correção.

## Limites conhecidos

Sem casos dedicados para empate FIFO exato/página51 de OP; upgrade2 preserva metadata, mas fixture não contém catálogo/movimentos preenchidos. Migration003 é aditiva e001/002 permanecem intactas. Testes não garantem proteção contra edição SQL arbitrária ou perda de energia/hardware.

Ajuste final revisado: data de criação além da dataOP, rótulo amigável de CHASSIS_UPDATED e limpeza da seleção ao paginar referências. Oito testes dirigidos e TypeScript passaram. Permanece como melhoria exibir valores anteriores/posteriores no histórico visual; auditoria integral está no banco. Revisão final geral e revisão restrita do ajuste: PASS, sem P1/P2 abertos.

## Dados e ativação

Nenhum teste usou banco real. Nesta retomada a pasta padrão encontrada estava nova/vazia; o usuário confirmou que não mudou a pasta. Registro dos lançamentos anteriores preservado fora do Git, mas banco operacional ainda não localizado. Não houve recriação/importação, restauração ou migration da base operacional. Instância vazia encerrada. Não declarar recuperação nem disponibilidade para uso diário até conciliação da base correta.

Implementação revisada, pronta para commit local. Próximo passo operacional: localizar/conciliar a base correta. Sem push automático e sem iniciar etapa6.
