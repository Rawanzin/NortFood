# Correção do cadastro — 21/10/2026

## Resultado e causa comprovada

O endereço informado era `file:///C:/Users/keven/Documents/NortFood/index.html#map`. Ele lê o `config.js` da raiz, que é um modelo deliberadamente sem URL/chave. Não executa o servidor nem a geração da configuração pública. A aplicação recusava o cadastro antes de chamar o Supabase. Não foi identificado erro de senha ou indisponibilidade do banco como causa desse bloqueio.

O servidor existente fornece `/config.js` a partir das variáveis de ambiente; o build gera esse arquivo no pacote publicado. A `.env` principal e a `.env.homologacao` têm destinos diferentes. Não foram copiadas configurações do principal para testes nem adicionadas chaves privilegiadas ao navegador.

Use `http://localhost:4174/`. Para abrir novamente, execute `Iniciar-NortFood.cmd` na pasta do projeto e mantenha o servidor aberto. `npm run dev` e `npm run start:homologation` usam o mesmo inicializador. `npm start` permanece com seu comportamento anterior e não deve ser usado para inserir dados sintéticos no principal.

## Correções e arquivos

| Arquivo | Finalidade |
| --- | --- |
| `assets/local-entry.js` (novo) | Orientação específica ao abrir via file; link para o servidor local, preservando a rota segura. Nenhuma configuração secreta é lida. |
| `index.html`, `app.js`, `src/backend.js` | Inicializar a orientação antes da aplicação; impedir inicialização comercial por file. |
| `scripts/start-local.cjs` (novo), `Iniciar-NortFood.cmd` (novo), `package.json` | Iniciar/reutilizar somente homologação na porta 4174, verificar configuração e Auth real; não encerrar serviços que ocupem a porta com outra configuração. |
| `scripts/build.cjs` | Recusar pacote sem URL/chave pública antes de sobrescrever saídas. |
| `src/commercial.js` | Resolver concorrência entre SIGNED_IN e envio do formulário: concluir atualização da identidade antes de fechar/navegar. |
| `assets/nortfood-backend.js` | Bundle regenerado das fontes corrigidas. |
| `tests/signup-entry.test.cjs` (novo) | Cinco regressões locais, incluindo abertura file, configuração inválida e concorrência de autenticação. |
| `tests/helpers/signup-accounts-live.cjs`, `scripts/run-signup-check.cjs` (novos) | Teste explicitamente acionado de contas sintéticas na homologação. Chave privilegiada apenas em memória/stdin do processo de testes, nunca no frontend, argumentos ou arquivos. |
| `README.md`, `docs/CONFIGURACAO_E_PUBLICACAO.md` | Corrigir instrução antiga que permitia abrir index diretamente e documentar a inicialização correta. |

A navegação precoce após login era um segundo defeito reproduzível: fechar o modal antes de atualizar o perfil permitia uma navegação tardia sobrepor a ação seguinte do usuário. O estado de envio agora coordena esse fluxo sem desativar confirmação de e-mail ou persistência de sessão.

## Evidências locais

- Ponto de recuperação anterior às alterações: `backups/signup-recovery-20261021-1792556684805`, manifesto de 219 entradas e cópias verificadas por SHA256; inclui alterações anteriores e estado de arquivos ausentes.
- `test-results/signup-20261021/full-tests-final.txt`: **108 aprovados, zero falhas**. Testes locais e com banco descartável/mocks não constituem prova remota.
- `test-results/signup-20261021/entry-tests-final.txt`: cinco regressões aprovadas após o ajuste final do inicializador.
- Inicializador exercitado tanto reutilizando servidor válido como iniciando novo servidor; Auth real validado. A abertura automática pelo Explorer e o clique duplo no .cmd não foram testados; a aplicação foi aberta pelo navegador integrado.
- Conferência visual: orientação file e formulário de estabelecimento em localhost. Imagens `file-entry.png` e `seller-registration-local.png` na mesma pasta de evidências.

## Homologação remota real

Destino exclusivo: `zrczgghucwsaxqnyaapk.supabase.co`. Resultado final: **APROVADA, 17 verificações**, em `test-results/signup-20261021/remote-accounts.json`; execução concluída em `worker.json`.

- Cadastro de cliente e vendedor pela interface normal, persistência em Auth e confirmação obrigatória preservada; login antes de confirmar recusado pelo servidor.
- Confirmação por link de teste, entrada automática, perfil persistido e sem privilégio administrativo.
- Persistência da identidade após recarregar; logout preservado após recarregar.
- Senha incorreta retornou HTTP 400/invalid_credentials e mensagem segura; login correto retornou HTTP 200 nas duas contas.
- Solicitação de recuperação pela interface aceita pelo Auth; link de recuperação de teste abriu o formulário real, gravou nova senha e invalidou a anterior.
- Solicitação normal de estabelecimento persistiu loja e vínculo owner; estado pending; loja não apareceu no catálogo anônimo; piloto permaneceu desligado.

Identidades sintéticas finais, mantidas para rastreabilidade (não excluídas):

| Objeto | UUID |
| --- | --- |
| Cliente | `8322f6e9-74d2-4487-b3de-940971ac6601` |
| Vendedor, e-mail confirmado | `5b508fed-2780-4665-9b45-e8399909642d` |
| Loja pendente de aprovação | `9f0a8279-437c-437c-a1e8-e48934f7586f` |

O cadastro de estabelecimento continua sujeito à confirmação da conta e aprovação da loja: depois de confirmar, acessar Vender e enviar a solicitação existente. Não foi concedida administração nem aprovada a loja para contornar esse fluxo.

### Tentativas anteriores e limitações

Os arquivos das tentativas malsucedidas foram preservados. Houve falha transitória de transporte ao gerar um link administrativo; um erro no próprio teste de senha (alteração após o limite de 72 bytes do bcrypt) foi corrigido usando senha sintética menor e alterando o primeiro caractere. Depois foi reproduzida e corrigida a corrida de navegação da aplicação. O resultado final acima substitui essas tentativas, sem tratá-las como aprovações.

Os links de confirmação/recuperação usados foram gerados pela API administrativa **somente para contas sintéticas**, e consumidos no fluxo real da aplicação. Isso valida tokens, sessões e persistência, mas **não comprova recebimento de e-mails**. A configuração conhecida de homologação utiliza captura Ethereal; entrega externa/SMTP de produção continua pendente. Google OAuth não está configurado neste ambiente e não foi declarado funcional.

## Segurança, publicação e conclusão

Nenhuma migração, política RLS, configuração Auth, bucket ou dado do banco principal foi alterado nesta correção. Nenhum pedido comercial foi habilitado. Contas sintéticas de tentativas incompletas também não foram apagadas. As diferenças já existentes nas migrações no Git antecedem este trabalho.

O erro relatado está resolvido no ambiente correto: interface local servida por HTTP, conectada ao Supabase de homologação real. O modelo vazio da raiz foi preservado; não foi escondida uma falha de conexão nem liberada operação sem validação. A prévia e a Hostinger não foram atualizadas nesta intervenção local. Não há aprovação de beta público: entrega externa de e-mail e demais critérios do relatório de lançamento continuam exigindo validação própria.
