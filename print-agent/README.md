# Brasinha Print Agent

MVP simples para Windows. O site envia uma cópia criptografada do pedido para a fila técnica do GitHub. O agente do PC consulta a fila, descriptografa e manda o cupom para a impressora instalada no Windows.

## Preparação

1. Instale Node.js 20+ no PC da Brasinha.
2. Execute `list-printers.bat` e copie o nome exato da impressora térmica.
3. Copie `config.example.json` para `config.json`.
4. Preencha em `config.json`:
   - `githubToken`: Fine-grained token com acesso de leitura ao repositório.
   - `queueSecret`: exatamente o mesmo valor de `PRINT_QUEUE_SECRET` configurado na Vercel.
   - `printerName`: nome retornado por `list-printers.bat`.
   - `paperWidth`: 42 para 80 mm; tente 32 para 58 mm.
5. Execute `test-print.bat`.
6. Se o teste sair corretamente, execute `start.bat`.

## Vercel

O projeto precisa ter:

- `GITHUB_TOKEN`: token do GitHub usado também pelo painel administrativo, com permissão para comentar na issue da fila.
- `PRINT_QUEUE_SECRET`: segredo longo e aleatório usado para criptografar os pedidos.
- `PRINT_QUEUE_ISSUE=1` é opcional, pois 1 já é o padrão.

## Segurança

A issue da fila está no repositório público, mas o conteúdo de cada pedido é AES-256-GCM e não contém dados pessoais em texto aberto. Nunca coloque `config.json`, tokens ou o segredo no GitHub; eles estão no `.gitignore`.

## Comportamento

- O WhatsApp continua sendo aberto normalmente mesmo que a impressão esteja indisponível.
- O agente verifica pedidos a cada 5 segundos por padrão.
- Na primeira execução ele sincroniza a fila e só imprime pedidos que chegarem depois, evitando imprimir histórico antigo.
- `state.json` guarda o último comentário processado para evitar impressão duplicada.

## Próximo passo

Depois do teste real na impressora, podemos empacotar o agente em `.exe`, iniciar automaticamente com o Windows e, se a impressora suportar ESC/POS direto, habilitar corte automático e formatação mais refinada.
