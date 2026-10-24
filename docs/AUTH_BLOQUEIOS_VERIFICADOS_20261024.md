# NortFood — autenticação e publicação verificadas

24/10/2026. Endereço principal temporário: https://nortfood.pages.dev/.

**Cadastro público e Google continuam bloqueados no servidor. Não há aprovação de autenticação ou de pedidos comerciais.** Esta execução corrigiu uma falha real de retomada, publicou a correção e reproduziu os impedimentos externos por HTTP e pelo painel correto.

## Produção atual

- Cloudflare Pages, projeto existente nortfood, deploy 99fcf5a4-6d14-4239-98b0-96b24e90bfec.
- Versão 71a03a52e3b2e3c9e473; fonte pública 51f4a7c87137ac160ec27522c63ce17c0245939a.
- 97 arquivos HTTPS comparados por SHA-256 com o build atual; sete caminhos internos retornaram 404. Pacote de 98 arquivos auditado, sem problemas detectados de exposição.
- GitHub release/nortfood atualizado com marcador oficial [skip netlify]. Nenhum comando de publicação Netlify foi executado nesta execução.
- O PWA existente exibiu atualização pendente e aplicou a atualização pelo botão Atualizar. O tema foi preservado. Uma nova sessão de Chrome confirmou um único cache público versionado, sem config.js, Supabase, Auth ou REST. Não existia sessão autenticada para comprovar preservação de login.
- Checkpoint anterior às alterações: checkpoint/auth-desbloqueio-20261024, commit 67289fe. Pacote anterior e deploy 821e47a7 continuam preservados para reversão do frontend. Não reverter o banco para desfazer código.

## Causas comprovadas agora

| Item | Evidência real | Consequência |
|---|---|---|
| Cadastro desativado | settings.disable_signup=true; POST controlado /auth/v1/signup devolveu HTTP 422, signup_disabled, “Signups not allowed for this instance” | Não cria clientes ou vendedores; o teste negativo não criou conta |
| Google desligado | settings.external.google=false; /auth/v1/authorize devolveu HTTP 400, validation_failed, “Unsupported provider: provider is not enabled” | O erro reproduzido ocorre no Supabase antes de completar OAuth; Client ID/Secret e retorno não podem ser aprovados sem ciclo real |
| E-mail público sem infraestrutura validada | Email provider ligado, confirmação ligada, custom SMTP desligado no painel; Resend mostra No domains yet | O SMTP padrão só atende membros da equipe e tem limite documentado de 2 mensagens/hora; não atende cadastro público |
| Retorno do novo domínio | Configuração Pages já no build; alterações de Site URL/allowlist remota ainda não salvas | É necessário concluir a autorização da origem exata antes de homologar o retorno OAuth/links |
| Imagens pelo Pages | Preflight upload-media com Origin Pages: 403; o mesmo endpoint permite Netlify com 200 e anuncia Access-Control-Allow-Origin Netlify | APP_ORIGIN do endpoint ainda aponta para Netlify. O ajuste para Pages é técnico; não é necessário o usuário editar código ou servidor |

O modo Testing e zero test users do Google não são, isoladamente, prova de bloqueio do login básico. A documentação oficial contém exceção para openid, e-mail e perfil. Não é necessário publicar globalmente o app ou pedir acesso a Gmail/Drive para testar esse login. Fonte: https://developers.google.com/identity/protocols/oauth2/production-readiness/overview.

## Correção implementada e publicada

- src/platform/onboarding-draft.js preserva o rascunho vinculado ao repetir cadastro do mesmo e-mail e impede reatribuição a outro UID. A tentativa obfuscada com identities=[] não apaga os dados aguardando confirmação. Senhas continuam fora do rascunho.
- tests/auth-lifecycle.test.cjs adiciona regressão para repetição, preservação de endereço e isolamento de identidade.
- tests/helpers/auth-email-ui-live.cjs foi atualizado com contato/endereço completos e verificação de persistência. É um helper opt-in de homologação isolada; **não foi executado remotamente e não prova Pages ou SMTP público**.
- assets/nortfood-backend.js foi regenerado pelo build. docs/DEPLOY_PUBLICO.md identifica o Pages como endereço principal temporário.
- Formulários completos, Pedir/Vender, senhas escolhidas pelo usuário, confirmação, telefone e endereço continuam preservados. Vendedores mantêm responsável, loja e categoria.

## Preservação e banco

Consulta somente leitura no projeto zwkhqahivthzivmuirjr, NortFood main/Production:

- Dan Burguer: ID 40bac4d9-2e3c-4f1d-b33b-ab9628176136; 46 produtos, 20 grupos e 220 opções; rascunho e pausada.
- Uma loja, zero usuários, perfis, vínculos, administradores e pedidos. Piloto false.
- Onze migrações registradas, incluindo 011 já aplicada na execução anterior. **Nenhuma migração ou alteração de banco aplicada agora.**
- Nenhuma tabela de aplicação sem RLS; trigger nortfood_auth_profile habilitada. A chamada anônima à conclusão do cadastro foi negada com HTTP 401/42501.
- Nenhum dado comercial, conta ou tabela foi apagado ou recriado. O backup anterior continua preservado. Nenhuma operação destrutiva foi executada.

## Testes desta execução

| Teste | Classificação | Limite |
|---|---|---|
| Suíte local completa | APROVADO: 162/162 | Inclui testes controlados e PostgreSQL local; não substitui Supabase Auth real |
| Sintaxe e arquitetura | APROVADO: 131 arquivos, 19 módulos, zero falhas/ciclos/violações | Análise local |
| Build Pages e auditoria | APROVADO | 98 arquivos; release comprovada por HTTPS |
| Auth público responsivo | APROVADO: 19 verificações, oito larguras | Campos de cliente/vendedor, senha incorreta real, retorno inválido, ausência de sessão falsa e formulário de recuperação; nenhum e-mail enviado |
| Interface pública, mapa, temas e PWA | APROVADO: 18 verificações | Não prova instalação em aparelho físico ou pedido |
| HTTPS/privacidade/cache | APROVADO | SHA-256 de 97 arquivos, 404 internos, headers e cache público atual |
| Cadastro real positivo cliente/vendedor | PENDENTE | Negativa real 422 comprovada; servidor não permite criar usuários |
| Google com retorno e sessão válida | PENDENTE | Negativa real 400 comprovada; provedor desligado |
| Confirmação, recuperação e recebimento de e-mail | NÃO TESTADO | SMTP personalizado desligado, remetente não validado |
| Isolamento positivo entre duas contas reais | NÃO TESTADO | Ainda não há contas autenticadas; RLS negativa não substitui esse teste |
| Preflight de imagens no Pages | REPROVADO | HTTP 403, origem permitida ainda Netlify |
| Checkout e pedidos comerciais | NÃO TESTADO / BLOQUEADO | Nenhum pedido ou mensagem WhatsApp enviado; piloto permanece false |

Evidências privadas: test-results/recovery-20261024/auth-blockers-http-current.json, auth-blockers-remote-current.json, pages-https.json, pages-storage-security.json, upload-origin-current.json, fullsuite-auth-current.txt, auth-pages-current.txt e public-pages-current.txt. Capturas: pages-auth-deployed-current.png, pwa-auth-update-pending-current.png, pwa-auth-update-applied-current.png e smtp-current.png.

## Uma etapa humana agrupada, ainda pendente

Foi enviada uma solicitação única. As configurações dependentes não foram aplicadas sem resposta.

1. Na aba Supabase Google, o usuário precisa concluir entrada protegida e salvamento do Client ID/Secret, habilitando Google, com Skip nonce checks e Allow users without an email desligados. A regra da ferramenta impede o agente de preencher/submeter novas credenciais pelo usuário. Nenhum segredo deve ser enviado no chat.
2. Autorizar o ajuste das origens exatas do Pages e a criação de novos usuários por Google enquanto o e-mail não estiver homologado. O agente executa as configurações técnicas, incluindo a correção de origem do endpoint de imagens antes de testar uploads; não é tarefa manual de programação para o usuário. E-mail não deve ser aberto ao público apenas para esconder o problema de SMTP.
3. Autorizar criação/login da conta Brevo Free via Google, somente nome/e-mail/perfil, aceite de Termos/Privacidade, verificação do remetente individual kevenrawan@gmail.com e eventual pedido explícito de ativação transacional ao suporte. Sem cartão, cobrança ou compra de domínio. Autenticação e nova SMTP key seguem fluxo protegido.

Brevo é uma alternativa documentada sem comprar domínio, até 300 mensagens/dia, mas a conta ainda não foi criada, o SMTP não foi ativado e a entrega não foi testada. O provedor pode reescrever remetentes de domínio gratuito e exigir ativação pelo suporte. Detalhes e fontes oficiais em docs/SMTP_SEM_DOMINIO_20261024.md.

Após a etapa protegida, ainda é obrigatório executar cadastro/retorno, sessão válida, gravação de perfil/endereço/loja, logout/relogin/reload, recuperação e isolamento entre contas na versão pública. Nenhuma dessas aprovações está presumida neste relatório. As pendências comerciais da Dan continuam independentes da autenticação.

Nenhum plano pago, crédito, domínio ou upgrade foi contratado.
