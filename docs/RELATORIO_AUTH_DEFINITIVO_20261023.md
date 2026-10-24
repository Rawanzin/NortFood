# Autenticação NortFood — evidências e limites

**O cadastro público e o Google ainda não estão homologados para uso real.**
As correções de código foram concluídas, enviadas ao GitHub e verificadas em uma prévia
do site existente. **A produção não foi atualizada: o Netlify bloqueou o deploy por cota.**
Pedidos comerciais continuam bloqueados, independentemente da autenticação.

Foram auditados o site `https://nortfood.netlify.app`, o projeto Supabase principal
`zwkhqahivthzivmuirjr` e a integração Netlify–GitHub `Rawanzin/NortFood`, branch
`release/nortfood`. A produção anterior usava o commit público `61011c4` e a release
`ec43a56032d791cc5b34`; não havia divergência de destino entre o frontend e o banco.

As causas comprovadas foram:

- Supabase Auth com novos cadastros desabilitados: chamada real devolveu HTTP 422,
  `signup_disabled`. O bloqueio acontece antes da criação do usuário.
- Google desabilitado no mesmo projeto: autorização real devolveu HTTP 400,
  `validation_failed`. O projeto Google existe, mas seu consentimento ainda aguarda
  o aceite específico da Política de Dados dos Serviços de API. O cliente OAuth
  e suas credenciais ainda não foram configurados. A escolha de uma conta não
  comprova retorno ao NortFood nem sessão válida.
- SMTP personalizado desligado e Resend sem domínio/remetente verificado. O serviço
  padrão do Supabase restringe destinatários à equipe e não serve ao cadastro público.
- Regressão no formulário publicado: não coletava nome, confirmação de senha nem
  dados comerciais; enviava o nome fixo “Cliente”. A retomada da loja também podia
  impedir o carregamento da conta quando sua RPC falhava.
- Na primeira prévia HTTPS desta execução, o botão de mostrar a confirmação de senha
  alterava a senha principal. Corrigido e coberto por regressão de navegador.

O Site URL já estava correto (`https://nortfood.netlify.app`), com redirects raiz
com e sem barra final. Não foi alterado sem necessidade. A arquitetura usa o fluxo
implicit do SDK para SPA estática, agora explícito: o SDK termina a leitura da sessão
antes da consulta de identidade no servidor e antes do roteador consumir o fragmento.
Não foi introduzido um callback PKCE incompleto. O retorno OAuth é tratado sem exibir
descrições arbitrárias vindas da URL, e encaminha o primeiro acesso para completar
as informações e o aceite que faltam.

Foram restaurados os fluxos Pedir e Vender: nome, e-mail, senha escolhida e confirmação;
para vendedor, responsável, estabelecimento e telefone comercial; termos e privacidade.
Cliente não precisa de telefone no cadastro. Há validação próxima aos campos, indicação
de envio, bloqueio de duplicidade e exibição independente das duas senhas. A senha segue
o mínimo de oito caracteres configurado no serviço, sem composição adicional arbitrária.
Confirmação possui reenvio, e recuperação/login exibem mensagens por classe de erro.

O nome e telefone comercial solicitados ficam nos metadados da conta para retomada,
sem armazenar senha no aplicativo. Telefone comercial não vira telefone pessoal nem
WhatsApp confirmado automaticamente. Falha da criação da loja mantém a conta acessível
e oferece conclusão do rascunho. A intenção local de vendedor não concede permissões.

**Banco remoto:** aplicada e registrada somente `202610230010_auth_onboarding`.
Cria `nf_complete_profile` e `nf_complete_seller`; reforça `nf_create_store_draft`.
São operações limitadas ao próprio usuário, com transação, trava por responsável,
reutilização do rascunho e proteção de lojas reservadas por convite. O e-mail verificado
do Supabase Auth comprova o vínculo; nome de loja ou metadado de cargo não o comprovam.
Não foram reaplicadas 001–009, criados administradores nem desabilitada confirmação.

A conferência remota posterior encontrou uma loja, 46 produtos, zero contas e perfis,
piloto desabilitado, novas RPCs negadas ao anônimo e permitidas ao papel autenticado.
Dan Burguer preservada: `40bac4d9-2e3c-4f1d-b33b-ab9628176136`, rascunho e pausada.
As tabelas auditadas têm RLS; o trigger `nortfood_auth_profile` estava ativo e sua
definição foi preservada em evidência privada. Nenhum defeito desse trigger foi
comprovado. Não foram inseridas contas diretamente em `auth.users` para simular Auth.

| Verificação | Resultado | Alcance da evidência |
|---|---|---|
| Suíte completa | APROVADO | 158 testes executados; inclui PostgreSQL local, RLS, preço, idempotência, UI e PWA |
| Lint e arquitetura | APROVADO | 129 arquivos de sintaxe; 18 módulos, zero ciclos/violações |
| Formulários, senha e retomada | APROVADO local | SDK/transportes controlados; não prova Auth remoto positivo |
| Rascunho, convite verificado e isolamento | APROVADO local | Migrações reais em PostgreSQL isolado; duas chamadas preservam o mesmo ID |
| Migração e preservação remota | APROVADO | Registro 010, ACL e contagens consultados no banco principal |
| Login com dados inexistentes | APROVADO negativo | Supabase real retorna HTTP 400 `invalid_credentials`, sem sessão |
| Cadastro, confirmação, login e logout reais | PENDENTE | Cadastro remoto desabilitado, sem SMTP público validado |
| Recuperação/alteração de e-mail entregues | NÃO TESTADO | Domínio/remetente e transporte de produção pendentes |
| Google: seleção, retorno e sessão válida | PENDENTE | Consentimento, cliente OAuth e configuração do provedor pendentes |
| Sessão autenticada persistente em produção | NÃO TESTADO | Nenhuma conta real criada/confirmada nesta execução |
| Edição por vendedor autenticado remoto | NÃO TESTADO | Exige concluir Auth e vínculo do proprietário |
| Prévia HTTPS corrigida | APROVADO | Formulários em oito larguras, senha, SDK real negativo, retorno OAuth inválido; zero erros JS |
| Publicação no domínio oficial | REPROVADO / BLOQUEADO | Netlify recusou o commit público por créditos esgotados; versão oficial permanece anterior |
| Android/iPhone físicos e PWA autenticado | NÃO TESTADO | Viewports de navegador não comprovam dispositivos físicos |
| Pedidos reais | BLOQUEADO | `nf_operating_status=false`; nenhuma liberação comercial |

Arquivos principais: `app.js`, `src/backend.js`, `src/commercial.js`,
`src/application/snapshot.js`, `assets/password-policy.js`, `styles.css`, bundle gerado
`assets/nortfood-backend.js`, migração 010 e testes de Auth/onboarding. Os verificadores
`scripts/audit-auth-public.cjs` e `scripts/verify-auth-browser.cjs` registram respostas
reais sem criar contas, enviar e-mails ou pedidos. Os resultados privados ficam em
`test-results/auth-definitive/`; não são incluídos no site nem no histórico público.

Checkpoint: `checkpoint/auth-definitivo-20261023` → `f773103`. Código corrigido:
`34adbcf`. Definições anteriores das funções e políticas foram salvas antes da migração.
Plano de recuperação: `docs/RECUPERACAO_AUTH_DEFINITIVO_20261023.md`.

A intervenção mínima restante é aceitar os compromissos específicos pendentes do
Google/Resend, concluir a entrada protegida das credenciais OAuth/SMTP e disponibilizar
um domínio autorizado com DNS para verificar o remetente Resend. Não se deve usar Gmail
ou o subdomínio Netlify como remetente sem comprovação. A confirmação final exige o
usuário selecionar a conta Google e, para e-mail, abrir o link realmente recebido.
Não enviar senhas, chaves ou links com tokens pela conversa.

Referências: [SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp),
[Google Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-google),
[SMTP Resend](https://resend.com/docs/send-with-smtp).
Nenhum serviço pago foi contratado; Netlify continua Free e não houve compra de domínio.

Prévia final verificada: [versão corrigida](https://6adc04796be0768b1435f43b--nortfood.netlify.app).
O verificador específico executou 16 combinações de largura/tipo de conta, login negativo
com SDK e Supabase reais (HTTP 400, sessão nula), cancelamento OAuth com limpeza da URL
e formulário de recuperação. O verificador geral passou em 18 verificações, sem erros JS.
Isso não inclui criação/confirmacão de conta ou retorno Google autenticado.

Commit público enviado: `30afe84a25926274e441dfc5c3cb6fb9735fa983`.
Deploy de produção recusado: `6adc04dac6e5806d7665a871`, erro da API
`Skipped due to account credit usage exceeded`. O painel também apresenta uma mensagem
genérica de deploy ignorado; a API e o aviso de créditos confirmam o bloqueio por cota.
O site [oficial](https://nortfood.netlify.app) continuou respondendo HTTPS e servindo
`61011c4`, release `ec43a56032d791cc5b34`, na verificação posterior à tentativa.
Consequentemente, seus formulários e PWA ainda não receberam esta correção.

Conta Netlify Free: ciclo exibido 20/10–19/11; 300 créditos consumidos por 20 deploys
de produção, 303 créditos totais consumidos no painel. Restam 27,4 créditos operacionais
de 30, exclusivamente para manter sites publicados no ar, indisponíveis para deploys.
Sem cartão cadastrado, sem faturas e sem compra de domínio. Nenhuma tentativa foi feita
de contornar a pausa ou contratar plano pago. A alternativa gratuita é aguardar a
renovação do ciclo e reexecutar o deploy do mesmo commit na mesma branch/site.

Evidências finais: `test-results/auth-definitive/full-release.txt`, `lint-release.txt`,
`architecture-release.txt`, `audit-final.txt`, `database-before.json`, `database-after.json`,
`official-auth-final.json`, `preview-final-browser.txt`, `preview-final-general.txt`,
`netlify-credits.txt` e capturas de tela. Esses arquivos permanecem privados e ignorados.
Os painéis oficiais Google, Resend e Netlify foram mantidos para continuidade segura.
