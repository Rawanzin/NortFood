# Confirmação de e-mail — preparação de UX em 29/10/2026

## Entrega local

O template de confirmação está preparado em `supabase/templates/confirmation.html`, com a copy solicitada, assunto **Confirme seu e-mail — NortFood**, logotipo oficial, fundo cinza-claro, cartão branco e botão azul **CONFIRMAR MEU E-MAIL**. O assunto correspondente foi atualizado somente na seção `[auth.email.template.confirmation]` de `supabase/config.toml`.

O HTML usa tabelas de apresentação e estilos inline, fontes Arial/Helvetica, largura fluida limitada a 560px e imagem PNG. O botão e o link alternativo continuam apontando diretamente para **`{{ .ConfirmationURL }}`**. O link não foi reconstruído, abreviado nem substituído por um destino próprio. Não foram adicionados tokens, URLs de autenticação fictícias ou rastreadores ao template entregue.

O logotipo `https://nortfood.pages.dev/assets/logo-light.png` foi consultado por HTTPS: HTTP 200, `image/png`, 196.435 bytes. Trata-se do arquivo oficial já existente no projeto.

Segundo a [documentação oficial de templates Supabase](https://supabase.com/docs/guides/auth/auth-email-templates), `ConfirmationURL` contém a URL de confirmação gerada pelo serviço. Para projetos hospedados, o template local precisa ser aplicado ao projeto remoto; alterar apenas este arquivo não publica o e-mail, conforme a [documentação de personalização](https://supabase.com/docs/guides/local-development/customizing-email-templates).

## Prévia e testes

Comando: `node --test tests/auth-confirmation-ui.test.cjs`.

Resultado: **4 testes aprovados, zero reprovados**. Cobertura:

- Copy, assunto, cor azul, URL oficial da imagem e preservação integral do destino Supabase.
- Renderização da UI de sucesso somente com estado `verified` acompanhado de `serverVerified === true`.
- Expiração/link já utilizado, erro de verificação e indisponibilidade sem exibir descrições ou dados arbitrários vindos da URL.
- Prévia no Chrome em larguras 1280px, 390px e 320px, sem rolagem horizontal, logotipo carregado e os dois links com o mesmo destino controlado.

Evidências em `test-results/auth-confirmation-ux-20261029/`:

- `email-preview-1280.png`, `email-preview-390.png`, `email-preview-320.png`.
- `preview-report.json`.

**As imagens são prévias locais controladas, não e-mails recebidos no Gmail.** A faixa amarela visível pertence somente à ferramenta de prévia, não ao template entregue. A prévia substitui a variável por uma rota local sem token; o clique foi validado apenas nessa rota. Nenhum cadastro, envio de e-mail ou consumo de link real ocorreu. O logotipo da prévia é fornecido pelo arquivo oficial local após conferir a URL pública, sem depender de solicitações de autenticação remotas.

## Contrato para integração do callback

O módulo `assets/auth-confirmation-ui.js` exporta `confirmationResultHTML(result)`. Seu retorno é o conteúdo de uma seção que pode ser exibida pelo modal existente. O ícone usa os tokens vermelhos da marca; o azul fica restrito ao botão e ao link do template de e-mail. A raiz deve fazer a integração no roteamento compartilhado.

Estados aceitos:

```js
confirmationResultHTML({status:'verified', serverVerified:true});
confirmationResultHTML({status:'expired'});
confirmationResultHTML({status:'invalid'});
confirmationResultHTML({status:'unavailable'});
```

Sem a combinação exata `status === 'verified' && serverVerified === true`, o módulo não mostra o título de sucesso nem o botão de continuação. Ele também não inclui e-mail, token, descrição de erro ou qualquer conteúdo recebido da URL. Isso é uma proteção de apresentação; a prova de autenticação pertence ao backend, não ao módulo de UI.

O elemento raiz usa `data-auth-confirmation-result` com o estado. O botão de sucesso usa `data-confirmation-continue`; a raiz deve direcioná-lo para a conta ou para a conclusão do cadastro, conforme o contexto autenticado. Os erros usam as ações existentes `data-action="resend-confirmation"` e `data-auth-mode="login"`.

### Condições necessárias antes de emitir sucesso

1. Capturar apenas em memória a intenção de callback de confirmação (`type=signup` ou `type=email`) antes de o SDK consumir o fragmento. `type=recovery` deve continuar na recuperação, sem tela de confirmação de cadastro.
2. Aguardar a inicialização real do SDK e consultar `client.auth.getUser()`. Exigir resposta sem erro, ID válido e `email_confirmed_at` preenchido. Não confiar somente no objeto de sessão armazenado no navegador.
3. Relacionar a sessão verificada ao token recebido neste callback, comparando os valores somente em memória; uma sessão antiga já autenticada não deve produzir sucesso para um novo callback inválido. Não registrar tokens nem propagá-los para a UI.
4. Só então fornecer `{status:'verified', serverVerified:true}` à UI. Remover dados sensíveis da URL utilizando o tratamento existente após o SDK consumir o retorno.
5. Para `otp_expired`, exibir “expirou ou já foi utilizado”, sem afirmar qual das duas causas ocorreu. Callback inválido ou falha na verificação deve permanecer em erro; indisponibilidade de rede deve permitir nova tentativa sem afirmar que o cadastro foi confirmado.

O código anterior já preserva o código seguro do erro antes de limpar a URL, oferece reenvio e trata recuperação separadamente. O novo módulo não altera essas políticas nem substitui o servidor.

### Backend integrado

Após autorização da raiz, a verificação foi implementada em `src/application/auth-confirmation.js` e conectada por três inserções pontuais em `src/backend.js`: importação do módulo, captura do retorno antes da criação do SDK e exposição do método `confirmationResult`. Não foram modificados `setUser`, `context`, a camada de imagens ou a política de inicialização.

A integração da aplicação deve usar `await api.confirmationResult()` depois de inicializar a sessão. O retorno é `null` quando não há callback de confirmação, em recuperação de senha ou quando a identidade muda durante/depois da verificação. O resultado de sucesso exige `getUser(tokenOriginal)` positivo no servidor, `email_confirmed_at`, ID igual ao usuário da sessão ativa e igualdade entre o token da sessão e o token original recebido. Uma sessão antiga, mesmo confirmada, não pode validar outro token. Os erros retornam apenas estado seguro e `serverVerified:false`.

O token original permanece somente em memória até a primeira verificação e é apagado da closure no `finally`. Chamadas concorrentes compartilham a verificação. O resultado sanitizado é vinculado ao ID e à revisão da identidade, portanto não reaparece após logout e troca de conta. O armazenamento normal de sessão continua sendo responsabilidade do SDK existente.

Testes adicionais:

- `tests/auth-confirmation-callback.test.cjs`: 6/6 aprovados, cobrindo os três tipos de confirmação, sessão antiga, token inválido, usuário não confirmado, expiração, rede indisponível, concorrência e troca de identidade.
- `tests/auth-confirmation-sdk.test.cjs`: 1/1 aprovado com **SDK Supabase real e Chrome**, HTTP totalmente interceptado. Confirmou callback válido, token forjado com sessão antiga, token válido com outra sessão ativa e callback expirado. Nenhum serviço Auth remoto ou e-mail foi usado.
- Execução conjunta de callback, UI e lifecycle: 28/28 aprovados. A prova final de recebimento/consumo de um e-mail real continua separada.

## Publicação e validação externa

Esta frente **não publicou** o template e não alterou configurações remotas. A integração em `app.js`, build, publicação e eventuais ações no painel Supabase pertencem à raiz. A prova final ainda deve distinguir a prévia visual, o callback controlado e uma mensagem real recebida/consumida no Gmail.
