# Brasinha Print Agent

Agente simples para Windows. O site envia uma cópia criptografada do pedido para a fila técnica do GitHub. O agente do PC consulta a fila, descriptografa e manda o cupom para a impressora instalada no Windows.

## Comportamento no PC da Brasinha

O agente foi preparado para conviver com o sistema que já existe no computador:

- roda em segundo plano, sem janela de terminal aberta;
- inicia automaticamente quando o usuário da pizzaria entra no Windows;
- não substitui nem interfere no outro sistema do PC;
- possui watchdog: se o processo de impressão cair, tenta iniciar novamente após 5 segundos;
- impede duas cópias do Brasinha Print Agent de ficarem rodando ao mesmo tempo;
- grava diagnóstico em `logs/agent.log`;
- mantém `state.json` para não imprimir o mesmo pedido duas vezes.

A inicialização automática é registrada somente no usuário atual do Windows (`HKCU`), então não precisa instalar um serviço do sistema nem alterar o software já usado pela pizzaria.

## Instalação rápida

1. Instale Node.js 20+ no PC da Brasinha.
2. Execute `list-printers.bat` e copie o nome exato da impressora térmica.
3. Copie `config.example.json` para `config.json`.
4. Preencha em `config.json`:
   - `githubToken`: Fine-grained token com acesso de leitura ao repositório;
   - `queueSecret`: exatamente o mesmo valor de `PRINT_QUEUE_SECRET` configurado na Vercel;
   - `printerName`: nome retornado por `list-printers.bat`;
   - `paperWidth`: 42 para 80 mm; tente 32 para 58 mm.
5. Execute `test-print.bat`.
6. Se o teste sair corretamente, execute **uma única vez** `install-autostart.bat`.

Depois disso não é necessário abrir o Brasinha manualmente. Em cada login do Windows, `run-hidden.vbs` espera alguns segundos para rede/spooler subirem e inicia `launcher.js` invisivelmente.

## Arquivos de operação

- `install-autostart.bat` — instala a inicialização automática e já liga o agente.
- `start.bat` — inicia manualmente em segundo plano.
- `stop.bat` — encerra somente o Brasinha Print Agent.
- `status.bat` — mostra se a inicialização está instalada, se o processo está rodando e as últimas linhas do log.
- `uninstall-autostart.bat` — para o agente e remove a inicialização automática.
- `run-hidden.vbs` — inicia sem abrir janela.
- `launcher.js` — watchdog do processo de impressão.
- `agent.js` — consulta a fila, descriptografa e imprime.

## Vercel

O projeto precisa ter:

- `GITHUB_TOKEN`: token usado pelo backend para escrever na fila;
- `PRINT_QUEUE_SECRET`: segredo longo e aleatório usado para criptografar os pedidos;
- `PRINT_QUEUE_ISSUE=1` é opcional, pois 1 já é o padrão.

## Segurança

A issue da fila está no repositório público, mas o conteúdo de cada pedido é AES-256-GCM e não contém dados pessoais em texto aberto. Nunca coloque `config.json`, tokens ou o segredo no GitHub. Arquivos de configuração, estado, PID e logs estão ignorados pelo `.gitignore`.

## Impressão

O WhatsApp continua funcionando normalmente mesmo que a impressão esteja indisponível. O agente verifica novos pedidos a cada 5 segundos por padrão. Na primeira execução ele sincroniza a fila e só imprime pedidos que chegarem depois, evitando imprimir histórico antigo.

Para o primeiro teste real, execute `status.bat` após a instalação e confirme que aparece `Processo em segundo plano: RODANDO`.
