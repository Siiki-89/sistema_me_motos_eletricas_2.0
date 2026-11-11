# Produção e tempos — especificação do incremento6

Origem: prompt etapa6 (10/11/2026), fluxo operacional2.5/2.7, tarefa7 do plano existente e OP física (artifacts/op-reference/page-1.png, seção2 conferida visualmente). Não reiniciar arquitetura. Fase1 concluída: classificação3; somente registros anteriores disponíveis. Bancos reais permanecem isolados.

## Requisitos confirmados

Transcrição de fichas físicas, não cronômetro do mecânico. Desembalagem e montagem com data/início/fim/responsável/observações, salvamento parcial. Pausas ilimitadas por etapa, motivos enumerados no prompt. Ocorrências por OP/unidade/etapa com componente, problema, data/hora, responsável, situação, destino previsto e observações. Nenhum consumo de estoque. Autoconferência de8 itens da OP; quatro respostas distintas, branco nunca aprovado. Auditoria, idempotência, versões, reinício/backup e preservação da conversão existentes.

## Decisões técnicas para executar

- Exigir pasta absoluta explícita em inicialização; remover fallback silencioso de LOCALAPPDATA. Não iniciar/migrar/restaurar base real durante este incremento. Dev e testes mantêm diretórios sintéticos explícitos.
- Registro de produção somente em OP já individualizada; nunca converter implicitamente. OP cancelada somente consulta. OP administrativamente concluída permite transcrição operacional, porque estados são independentes; qualidade não é alterada.
- Etapas primárias: UNPACKING/ASSEMBLY (uma de cada por OP); execuções REWORK adicionais para registrar tempos de correção na mesma OP. Isso não abre nova OP, não reserva caixa e não implementa reinspeção.
- Horários civis completos YYYY-MM-DDTHH:mm, com data final explícita para meia-noite; sem inferir virada automaticamente. Cálculo em minutos de relógio civil, independente do fuso do processo; não representa conversão histórica de horário de verão.
- Fim anterior ao início, pausas sobrepostas e partes conhecidas fora dos limites conhecidos da etapa: recusados atomicamente. Intervalos incompletos salvos como pendentes. Pausa aberta/incompleta impede cálculo líquido e conclusão. Nunca tratar ausência como zero.
- Bruto=fim−início; pausas=soma de pausas completas válidas; líquido=bruto−pausas somente com todos os dados necessários. Desconto apenas na própria etapa. Total líquido completo fica pendente se qualquer execução registrada estiver incompleta; subtotal conhecido e quantidade pendente separados. Retrabalho tem subtotal próprio; totais são soma de trabalho registrado, não promessa de tempo decorrido sem paralelismo.
- Campos de execução opcionais no rascunho. Concluir etapa exige intervalo completo, pausas completas/coerentes e responsável. Montagem exige também8 itens avaliados, sem não conformidade, justificativa em não aplicável e ocorrências abertas resolvidas. Esta condição conservadora é proposta técnica revisável; não é qualidade final.
- Editar etapa concluída requer reabertura explícita com motivo, preservando histórico. Alterar checklist de montagem concluída exige reabertura. Não há aprovação final, conferente ou rodagem.
- Checklist template inicial imutável/versionado. Respostas NÃO_AVALIADO/CONFORME/NÃO_CONFORME/NÃO_APLICÁVEL; NC/NA podem ser rascunho sem observação mas aparecem pendentes; não concluir com NC ou NA sem justificativa.
- Ocorrências: OPEN/IN_PROGRESS/RESOLVED; resolução exige descrição da ação realizada; separar problema, ação necessária, ação realizada e destino previsto. Operador que transcreve é auditado independentemente do executante informado. Nenhuma assinatura/autenticação individual nova.
- Migration004 aditiva;001–003 intactas. Coluna legada unit.productionStatus tem CHECK WAITING; usar projeção/tabela complementar de produção, sem reconstruir unidade/FKs/ledger. DTO e telas passam a mostrar status real calculado; qualidade/localização continuam independentes.

## Autoconferência v1 (texto da OP)

2.1 Guidão/direção montados, alinhados e fixados
2.2 Rodas/eixos instalados e apertados
2.3 Sistema de freios montado e ajustado
2.4 Suspensão, descansos, pedais e apoios corretamente instalados
2.5 Parafusos e fixações críticas da montagem conferidos
2.6 Conectores e bateria corretamente instalados/conectados
2.7 Carenagens/componentes removidos corretamente reinstalados
2.8 Pneus calibrados e componentes previstos instalados

Aplicabilidade pode ser explicitamente NA com justificativa; não presumir lista universal por modelo. Não adicionar conferente/rodagem/expedição.

## UX

Link Produção no detalhe da OP e rota /ordens/:id/producao. Cabeçalho OP/ME/cor/chassi e resumo de tempos; seções desembalagem, montagem, pausas, retrabalhos, ocorrências e autoconferência. Formulários compactos com datas/horas explícitas, teclado e pendências; salvar parciais, confirmar conclusão/reabertura, proteger rascunhos/resultados incertos. Histórico recolhível com autor/antes/depois relevantes, sem JSON cru. Estados de produção nas unidades deixam de ser texto WAITING fixo.

## Contratos e limites implementados — 11/11/2026

GET/PUT `/api/v1/orders/:id/production` consultam/salvam o agregado. POST `.../stages/:stageId/complete|reopen` conclui/reabre com versão otimista e chave de comando. PUT tem teto técnico de transporte de 1 MiB; não há limite de duas pausas no domínio. IDs e vínculo OP/unidade são preservados; omitir registro já salvo é recusado. Somente linhas ainda não salvas podem ser removidas na interface. Correção de exclusão/anulação de pausas já persistidas fica pendente de mecanismo auditado.

Intervalos parcialmente conhecidos não são tratados como infinitos: sobreposição comprovada é recusada, dúvida mantém tempo pendente. Montagem concluída exige reabertura para nova pendência ou alteração de autoconferência; permite transcrever ocorrência já resolvida com ação realizada, sem reabrir e sem aprovar qualidade.

O editor de produção guarda rascunho e tentativa exata no sessionStorage da aba, por OP/unidade. Voltar/avançar e recarregar na mesma aba permitem recuperar; uma tentativa incerta exige repetição explícita com a mesma chave. Não é backup nem garantia de persistência após fechar a aba. Falha de armazenamento exibe aviso. GET autoritativo aceita versão menor após restauração; recibo antigo provoca nova consulta para evitar mostrar versão superada. Os formulários anteriores de OP/estoque mantêm suas limitações próprias.

Quando nenhuma execução existe, total zero significa nenhum tempo registrado; não significa serviço concluído. Qualidade continua PENDING. Não há autenticação por mecânico: responsável transcrito e operador local auditado são informações distintas.

## Funcionalidades posteriores

Nova OP de unidade existente, aprovação de qualidade, checklist do conferente, teste de rodagem, expedição, loja, consumo/transferência de peças, financeiro, relatórios/metas e recuperação automática das224 caixas.
