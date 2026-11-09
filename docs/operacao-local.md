# Fundação local — iniciar e proteger os dados

Entrega 0.1.0, 09/11/2026. Somente fundação: interface inicial, conexão local e cópias/restauração. Não há cadastro de motos, caixas, OPs ou estoque. Este checkout está preparado neste computador; ainda não é instalador de distribuição.

## Iniciar no Windows

Abra PowerShell 7 na pasta `C:\Users\Alexandre de Melo\Desktop\me`:

```powershell
.\scripts\start.ps1
```

O inicializador abre `http://127.0.0.1:4317` no navegador. O processo Node fica oculto; outra chamada reutiliza somente a instância registrada desta pasta de dados. Porta ocupada por outro programa causa erro, sem encerrar esse programa. Não é necessário internet, Codex, npm ou terminal aberto durante a operação. A instalação do projeto e seu runtime local precisam permanecer no disco.

Para encerrar com fechamento da conexão SQLite:

```powershell
.\scripts\stop.ps1
```

O encerramento identifica a instância, obtém sessão local e chama o endpoint protegido. Não força encerramento se a aplicação estiver em manutenção ou não corresponder ao processo esperado. Não foi instalado serviço Windows ou inicialização automática. Nenhuma política global de execução PowerShell foi alterada; se o Windows bloquear scripts, usar a política aprovada pelo administrador, sem desabilitar proteção global.

## Armazenamento

Padrão: `%LOCALAPPDATA%\ME-Estoque\data\me-estoque.sqlite`, normalmente `C:\Users\Alexandre de Melo\AppData\Local\ME-Estoque\data\me-estoque.sqlite`. Criado no primeiro início normal. A entrega foi testada somente com bancos sintéticos separados em `artifacts/`; não usa a planilha nem banco anterior.

Na pasta de dados: `backups/` guarda cópias gerenciadas; `logs/` guarda saída do processo; `runtime-instance.json` identifica inicialização. SQLite pode manter arquivos `-wal` e `-shm`. Não copie/mova apenas o banco aberto nem remova esses arquivos para “corrigir” o programa.

Opcionalmente, o inicializador aceita `-DataDirectory 'C:\caminho\local' -Port 4318 -NoBrowser`; informe pasta absoluta local e use a mesma pasta ao parar. Não selecionar diretório sincronizado ou compartilhamento de rede. O aplicativo rejeita paths relativos/UNC, mas não detecta todo software de sincronização instalado.

## Backup e restauração disponíveis

Em **Proteção dos dados**, “Criar cópia agora” usa a API de backup do SQLite e registra SHA-256, tamanho, data e versão de estrutura. As cópias têm nomes únicos e não substituem cópias anteriores. Esta entrega tem backup manual; agendamento e retenção automática pertencem ao restante da tarefa 2.

“Validar e restaurar” verifica checksum, integridade, chaves estrangeiras e compatibilidade. O diálogo exige digitar `RESTAURAR` e confirmar. A restauração valida novamente, cria uma cópia de segurança do estado atual, bloqueia operações concorrentes, fecha a conexão e troca o arquivo. A cópia anterior à restauração também aparece na lista.

As cópias ficam neste computador. Proteção contra perda do disco ainda requer configurar um segundo destino local/removível antes de usar dados operacionais. Não há upload, nuvem, mesclagem de bancos, exclusão de backups ou importação de arquivos arbitrários nesta interface.

### Interrupção durante restauração

Se existir `restore-pending.json`, o próximo início recusa abrir/criar banco. Não apagar esse marcador para “destravar”. Preservar a pasta inteira e seus backups. O marcador referencia o arquivo anterior `recovery-*.sqlite`, o estágio de restauração e a cópia de segurança. A recuperação excepcional exige revisão técnica em cópia separada, verificando integridade e estado antes de escolher qual restaurar; não automatizamos essa escolha nesta entrega.

Uma falha de limpeza depois de restaurar não desfaz nem apaga o banco saudável. Artefatos remanescentes são preservados e podem manter o bloqueio de próximo início até revisão. Essa proteção não é promessa de recuperação automática contra perda de energia/hardware.

## Desenvolvimento e testes

Runtime local independente do Codex: `tools/runtime/node-v24.22.2-win-x64/node.exe`. Node global não foi alterado. O arquivo oficial ZIP foi verificado pelo SHA-256 `ca1bff5d8ead13c9f2ea404a176db46bd430704d5b5113734049fa365e7799e2`. Runtime, node_modules, dados e evidências são ignorados pelo Git. Para outro checkout/máquina, provisionar esse runtime a partir do site oficial e instalar dependências fixadas; o pacote distribuível completo será outra entrega.

```powershell
.\scripts\npm.ps1 run build
.\scripts\npm.ps1 test
.\scripts\npm.ps1 run dev
```

Build verifica TypeScript e gera `dist/web` e `dist/server`. Desenvolvimento usa frontend `http://127.0.0.1:5173`, proxy local para API 4317 e banco separado `data/development/me-estoque.sqlite`; encerrar com Ctrl+C. Não executar dev enquanto a instância normal ocupa a mesma porta.

```powershell
.\scripts\npm.ps1 run test:browser shell
.\scripts\npm.ps1 run test:browser backup
```

Esses cenários abrem sessões próprias do Agent Browser, com Chrome local, sem perfil pessoal; criam banco sintético, usam porta livre, bloqueiam domínios externos, salvam capturas em `artifacts/browser` e encerram sua instância. Em ambiente sandbox, testes de sockets/Chrome podem exigir a permissão local da ferramenta; isso não exige expor a aplicação na rede.

## Limites de segurança

API acessível somente por loopback, com validação Host/Origin, cookie HttpOnly/SameSite, CSRF, schemas e erros sanitizados. Isso não é autenticação individual nem impede um administrador local de acessar arquivos. Banco/auditoria multiusuário, assinatura digital, autorização de negócio e acesso em rede não fazem parte desta entrega.
