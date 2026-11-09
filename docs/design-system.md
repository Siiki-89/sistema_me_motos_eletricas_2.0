# Identidade provisória da fundação

Direção autorizada para a fundação local, sem antecipar módulos de estoque. A marca tipográfica ME ocupa a faixa lateral; o conteúdo é uma área de trabalho clara e contínua. Não há indicadores fictícios.

## Tokens e composição

- Grafite azul `#172b35`: navegação e marca.
- Petróleo `#076875`: ação principal e foco na superfície clara.
- Verde sinal `#c0ed83`: assinatura discreta da marca na lateral.
- Superfície `#f3f6f6`, papel `#ffffff`, tinta `#20343d`.
- Linhas `#cbd6d9`; erro `#a52a34` acompanhado de texto.
- Tipografia exclusivamente local: Segoe UI, sistema Windows, sans-serif. Corpo 16px, entrelinha 1.55; títulos 32–44px, peso 650, sem caixa alta ornamental.
- Ritmo de espaço 4/8/12/16/24/32/48px; largura máxima de leitura 76 caracteres. Raios pequenos de 6px em controles; sem sombras ou gradientes.

```
Desktop                         390px
ME | título / contexto          ME  Estoque 2.0
   |                            Início | Proteção dos dados
nav| estado local               título
   | ação e explicação          estado / ação
   | conteúdo contínuo          conteúdo empilhado
```

Alinhamento à esquerda, lateral compacta fixa no fluxo da página e conteúdo flexível. A seção de conexão usa uma borda lateral como sinal de estado, sempre acompanhada de descrição. Backups são registros em lista, com data, versão e tamanho reais.

## Revisão contra o brief

A identidade se concentra no monograma ME e na estrutura de posto de trabalho. Foi descartado o padrão de dashboard com cards e métricas: o início explica a preparação e mostra somente a conexão real. A faixa verde aparece apenas na marca, deixando o petróleo como cor funcional. A identidade é provisória, não uma marca comercial aprovada.

## Interação e acessibilidade

Navegação limitada a Início e Proteção dos dados. Link para pular ao conteúdo, foco visível, HTML semântico e mensagens anunciadas. Sem animação contínua; reduced-motion respeitado. A 390px a navegação passa ao topo e os controles se empilham. Estados de carregamento, vazio, erro e sucesso devem preservar contexto.

Restauração exige selecionar uma cópia, validar sua integridade e digitar RESTAURAR em diálogo com foco contido. A explicação informa a substituição dos dados locais e a cópia de segurança automática. Falhas mantêm a seleção e o texto; nenhuma opção de caminho ou upload arbitrário.

## Extensão operacional — etapa4

Navegação: Início, Modelos, Recebimento, Estoque de caixas e Proteção dos dados. Mantida identidade e tokens da fundação. Tabelas são a área principal; três saldos reais aparecem em faixa contínua. Recebimento usa duas seções: modelo/quantidade e origem. Confirmação mostra efeito antes de gravar. Modelos e histórico usam diálogos focados; correções exigem motivo.

Consultas com50 linhas; filtros/página de modelos e estoque na URL. Seleção de modelo também tem pesquisa e paginação. Datas civis não sofrem conversão de dia pelo fuso. Feedback tem texto e status/alert; falha preserva campos e chave. Campos do Field recebem name/autocomplete; códigos sem corretor ortográfico.

Desktop1440 e móvel390 inspecionados; tabela estreita permite rolagem local. Sem fontes/assets remotos. Componentes comuns em src/web/features/common/Operational.tsx, CSS operacional em src/web/app/Operations.module.css, cores/tipografia em tokens.css. Evidências de auditoria e limites no relatório da etapa4.
