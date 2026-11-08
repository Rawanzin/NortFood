# NortFood — validação real de e-mail e autenticação, 02/11/2026

## Resultado atual

**Cadastro, confirmação, reenvio, login e recuperação de senha foram comprovados em produção com a conta fictícia do alias autorizado.** O cadastro permaneceu sem sessão até confirmar o e-mail. O botão da mensagem abriu o NortFood em Chrome isolado, a aplicação verificou a confirmação no servidor e o login passou. A recuperação também passou pela API real: recebimento do e-mail, consumo do link, verificação da identidade, troca de senha temporária, login com a nova senha e recusa da senha anterior.

**A entrega na caixa de entrada ainda tem uma limitação concreta:** o Gmail classificou o reenvio como Spam. O Brevo confirmou envio e entrega, mas isso não comprova posicionamento na caixa de entrada. O remetente atual é verificado e usa domínio gratuito; não há domínio de envio autenticado no Brevo. O proprietário informou que ainda não possui domínio próprio. Não houve compra, mudança de provedor, alteração de DNS ou redução dos filtros de spam.

A conta principal foi preservada. Sua senha não foi alterada pelo agente; o proprietário informou que ainda não salvou a nova senha no formulário. Os testes de senha usaram exclusivamente credenciais aleatórias da conta fictícia, mantidas em memória durante os processos de teste.

## Configuração e correções

- Supabase de produção: SMTP personalizado habilitado, host `smtp-relay.brevo.com`, porta 587, remetente NortFood verificado. Credenciais existentes preservadas, sem leitura da senha SMTP.
- Site URL e retorno oficial: `https://nortfood.pages.dev`; confirmação por e-mail obrigatória preservada.
- Limites observados na etapa anterior: 30 e-mails/hora e intervalo de 60 segundos por usuário. Não foram aumentados nem saturados.
- O modelo de confirmação foi substituído integralmente pelo arquivo local em português, removendo o bloco inglês remanescente. A gravação foi verificada após recarregar e pelos e-mails reais recebidos. `{{ .ConfirmationURL }}` foi preservada.
- O modelo de recuperação em português também foi recebido e utilizado no teste real. Não foi necessário trocar a configuração SMTP que já estava entregando mensagens.
- A etapa anterior corrigiu o reenvio prematuro após cadastro, a tradução segura do erro 429 e a perda do formulário de senha ao retornar à aba.
- Node **24.22.2**, npm/npx **11.19.1** e Supabase CLI **2.122.0** foram instalados e verificados na etapa anterior. Não foi necessário instalar pnpm no terminal comum. A CLI não precisa de uma nova autenticação para esta conclusão, feita pelo painel administrativo renovado.

O teste de STARTTLS local em 01/11 aprovou a conexão à porta 587, sem autenticação ou envio (`test-results/email-confirmation-20261101/smtp-connectivity.json`). Ele não é uma captura da conexão Supabase → Brevo. A prova atual de envio é constituída pelos eventos reais do Brevo e pelo recebimento independente no Gmail.

## Evidências executadas

Resultados em `test-results/email-alias-20261102/`:

| Cenário | Resultado | Evidência e escopo |
| --- | --- | --- |
| Cadastro novo | Aprovado | `real-auth.json`: conta pendente, sem sessão antes da confirmação; Auth API real |
| Login antes de confirmar | Aprovado: acesso recusado | HTTP 400, `email_not_confirmed`; resultado negativo esperado |
| Reenvio após espera | Aprovado no serviço; Spam no recebimento | Reenvio aceito após mais de 60 segundos; duas mensagens recebidas; `inbox-proof.json` |
| Envio e entrega no Brevo | Aprovado | `brevo-confirmation-events.json`: envio/entrega de cadastro e reenvio; abertura/clique registrados |
| Botão e confirmação real | Aprovado | `real-confirmation-browser.json`: Chrome isolado, aplicação publicada, serviços reais, retorno oficial, URL sem tokens e botão Continuar funcional |
| Login depois de confirmar | Aprovado | Sessão concedida e usuário confirmado verificado novamente no servidor |
| Recuperação por e-mail | Aprovado | `recovery-inbox-proof.json`, `brevo-recovery-events.json`: mensagem real do alias, entrega e clique |
| Redefinição e novo login | Aprovado na API real | `real-recovery-api.json`: identidade do alias conferida antes da troca; senha temporária gerada em memória; novo login confirmado |
| Senha anterior depois da troca | Aprovado: acesso recusado | HTTP 400, `invalid_credentials`; resultado negativo esperado |
| Logout | Reteste aprovado | `supabase-logout-events.json`: dois retornos HTTP 204 no Auth. Uma tentativa anterior no cliente falhou sem código; causa isolada não determinada, preservada em `real-auth.json` |
| Link de confirmação já utilizado | Aprovado: reutilização recusada | `real-used-link.json`: navegador isolado, mensagem de link indisponível, retorno limpo e ação de reenvio. A expiração natural por prazo não foi aguardada |
| Modelo persistido | Aprovado | `template-persisted.json`: recarregamento, assunto/corpo em português, ausência do título inglês e Save changes desabilitado |
| Regressões locais desta continuação | **10/10 aprovadas** | `auth-regressions.log`: testes com transporte controlado, separados das provas reais acima |
| Suíte completa da correção anterior | **235/235 aprovadas** | `test-results/email-environment-20261102/full-suite-recovery-final.log`; código da aplicação não foi modificado nesta continuação |

O arquivo `final-summary.json` foi gerado verificando as condições dos testes e comparando novamente os bytes do backend público. Tentativas recusadas esperadas de login não representam falha de segurança. A falha isolada de logout foi registrada, e os retestes foram comprovados também nos logs do servidor.

![Confirmação real aprovada, sem dados pessoais](../test-results/email-alias-20261102/real-confirmation-verified.png)

## Problemas, gravidade e risco residual

| Vulnerabilidade/problema | Gravidade | Área afetada | Correção | Reteste | Risco residual |
| --- | --- | --- | --- | --- | --- |
| Reenvio antecipado após cadastro recebe 429 | Média | Cadastro/reenvio | Espera local iniciada pelo cadastro; limites do servidor preservados | Aprovado | Cotas globais e intervalos entre navegadores continuam sendo responsabilidade do servidor |
| Mensagem de intervalo confundida com cota geral | Baixa | Mensagens de autenticação | Tradução restrita ao número validado de segundos, mantendo código do erro | Aprovado | Erros verdadeiros do serviço não são ocultados |
| Formulário de recuperação desaparece ao retornar à aba | Média | Sessão/interface | Preserva formulário em evento repetido da mesma identidade; troca de conta limpa o formulário | Aprovado local e real na etapa anterior | A troca da senha principal continua sendo feita pelo proprietário |
| Modelo remoto mistura inglês e português | Baixa | Template Supabase | Substituição integral e verificação após recarregar | Aprovado por e-mail real e navegador | Filtros de e-mail podem classificar a mensagem como Spam |
| Remetente sem domínio próprio autenticado | Média operacional | Entregabilidade | Remetente verificado mantido; causa e limitação documentadas | Entrega aprovada; caixa de entrada pendente | Reenvio foi para Spam. Domínio próprio autenticado depende de disponibilidade do proprietário; não há garantia universal de caixa de entrada |
| Falha isolada de logout no cliente | Baixa operacional | Auth/rede | Investigação dos logs e reteste; sem alteração especulativa de código | Dois HTTP 204 comprovados | Causa da tentativa isolada sem código não determinada |

## Publicação e preservação

O frontend oficial permanece na release **`cb5dc60cd2041fd9fd0a`**, deployment [2afb565d](https://2afb565d.nortfood.pages.dev), em [nortfood.pages.dev](https://nortfood.pages.dev). A correção mais recente foi exclusivamente no template remoto do Supabase, já salvo e utilizado em produção; não houve necessidade de publicar novamente arquivos estáticos. O backend público foi conferido novamente por SHA-256 e corresponde ao pacote aprovado. A etapa anterior aprovou o build, 129 checks públicos e 18 testes de navegador.

Foram enviadas três mensagens ao alias nesta continuação: cadastro, reenvio e recuperação. Com as quatro mensagens anteriores à caixa principal autorizada, são sete mensagens, exclusivamente aos dois destinatários autorizados. Nenhuma senha, token ou link sensível foi incluído neste relatório.

Não houve exclusão de contas, lojas, produtos ou pedidos, alteração da Dan Burguer, migração de banco, mudança de RLS ou pedido comercial. A conta fictícia foi mantida com identificação `nortfood_email_test=true`; nenhuma loja foi criada por ela. Os processos com credenciais temporárias foram encerrados e os arquivos transitórios de links foram removidos.

## Pendências do proprietário

1. Definir a senha da conta principal diretamente no formulário NortFood, quando desejar concluir essa recuperação pessoal. O proprietário informou que ainda não a salvou; a recuperação completa do serviço já foi comprovada na conta fictícia.
2. Caso futuramente disponha de domínio próprio, autenticar o remetente no Brevo e repetir os testes de posicionamento na caixa de entrada. Nenhum serviço ou domínio será comprado automaticamente.

A participação pessoal na senha principal segue a skill [Computer Use](C:/Users/keven/.codex/plugins/cache/openai-bundled/computer-use/26.1027.30824/skills/computer-use/SKILL.md) e sua [política de confirmações](C:/Users/keven/.codex/plugins/cache/openai-bundled/computer-use/26.1027.30824/docs/confirmations.md): “Ask the user to take over before any new credential is entered”. Isso não impede testes automatizados da API com credenciais geradas para a conta fictícia autorizada.

**Os pedidos comerciais continuam bloqueados.** Esta validação cobre os cenários de e-mail descritos; não aprova os demais critérios do piloto nem garante entrega universal ou ausência de vulnerabilidades.

## Referências oficiais

- [Brevo: autenticação de domínio e impossibilidade de autenticar Gmail/Yahoo](https://help.brevo.com/hc/en-us/articles/12163873383186-Authenticate-your-domain-with-Brevo-Brevo-code-DKIM-DMARC)
- [Brevo: substituição de remetente gratuito por brevosend.com](https://help.brevo.com/hc/en-us/articles/16045394674066-Troubleshooting-Domain-authentication)
- [Supabase: SMTP personalizado](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase: templates de e-mail](https://supabase.com/docs/guides/auth/auth-email-templates)

O relatório `EMAIL_PRODUCAO_20261102.md` registra o checkpoint anterior à autorização do alias e aponta para esta atualização final.
