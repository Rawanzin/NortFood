# Autenticação: revisão final de 28/10/2026

## Resultado e limites

O cadastro por e-mail está habilitado no servidor, com confirmação obrigatória. O Google continua desativado no Supabase. A recuperação e a persistência de sessão passam nos testes locais com SDK real e transporte controlado; isso não comprova nova entrega de e-mail ou troca efetiva de senha no serviço remoto.

Esta revisão não criou contas, não enviou mensagens, não alterou senhas reais, não modificou configurações remotas e não liberou o piloto. Nenhuma migração foi necessária.

## Verificação remota somente leitura

Evidência: `test-results/final-auth-20261028/public-readonly.json`, consulta em 28/10/2026 às 15:37:48 de Brasília.

| Item | Evidência atual | Resultado |
| --- | --- | --- |
| Hospedagem consultada | `https://nortfood.pages.dev` | HTTPS acessível |
| Release anterior à publicação desta missão | `8868f199f4924ac0a7ec` | Identificação consultada por HTTP |
| Supabase principal | `zwkhqahivthzivmuirjr.supabase.co` | Identidade conferida antes das consultas |
| Cadastro por e-mail | HTTP 200 em `/auth/v1/settings`, `disable_signup=false`, `external.email=true` | Habilitado; `signup_disabled` não é o bloqueio atual |
| Confirmação de e-mail | `mailer_autoconfirm=false` | Obrigatória |
| Google | `external.google=false`; autorização HTTP 400, `validation_failed` | Bloqueado por configuração externa |

Esses endpoints não comprovam SMTP, entrega à caixa de entrada ou uma sessão Google positiva. A versão final implantada deve ser consultada no relatório geral de publicação; a release acima é a fotografia anterior ao deploy.

## Correção realizada

Em `app.js`, o formulário comercial de senha ocultava apenas o contêiner do campo antigo e deixava o rótulo “Senha atual” visível. A seção completa agora fica oculta e o campo fica desabilitado. O formulário continua solicitando e validando a senha nova e a confirmação, com mínimo de oito caracteres. O modo demonstrativo conserva sua validação local de senha antiga.

O teste em `tests/auth-ui.test.cjs` verifica que o rótulo e o campo antigo estão ocultos, que o campo está desabilitado e que um novo evento de recuperação não apaga a senha nova já digitada.

O teste de `tests/auth-sdk.test.cjs` passou a manter o estado da senha no provedor controlado, rejeitar credenciais antigas após a atualização e permitir login com a senha nova. O SDK Supabase e o navegador são reais; todos os endpoints de Auth/RPC e os links de confirmação/recuperação desse teste são interceptados localmente.

Nenhum campo de cadastro de cliente ou vendedor foi retirado. Nome, telefone, e-mail, endereço completo, número, bairro, cidade, UF, CEP, complemento, referência, categoria comercial e aceite continuam nas jornadas existentes. Horários, meios de pagamento e os demais dados da operação permanecem no perfil comercial, sujeitos à validação e à aprovação da loja.

## Testes

A execução conjunta dos arquivos abaixo passou com **28 testes aprovados, zero reprovados**, em 62,7 segundos:

```text
node --test tests/auth-lifecycle.test.cjs tests/auth-ui.test.cjs tests/auth-sdk.test.cjs tests/auth-onboarding.test.cjs tests/complete-onboarding.test.cjs tests/signup-flow.test.cjs
```

Os testes cobriram cadastro e retomada separados por identidade, ausência de senhas nos rascunhos, confirmação, mensagens de erro seguras, recuperação, persistência e logout, formulários completos, endereço privado e idempotência de onboarding em PostgreSQL/PGlite isolado. São evidências locais, sem pedidos ou contas comerciais remotas.

A validação posterior das novas asserções de recuperação e senha passou com **3/3 testes**, zero reprovados, em 41,2 segundos (`node --test tests/auth-ui.test.cjs tests/auth-sdk.test.cjs`). O log está em `test-results/final-auth-20261028/browser-tests.txt`.

## Pendências externas

1. **Google OAuth:** o provedor precisa ser habilitado no projeto Supabase correto com o cliente OAuth autorizado. Conferir no Google Cloud o callback `https://zwkhqahivthzivmuirjr.supabase.co/auth/v1/callback`, a origem `https://nortfood.pages.dev`, a tela de consentimento e os usuários permitidos enquanto o aplicativo estiver em teste. Depois, executar login positivo no navegador. Esta revisão não expôs nem substituiu client secret.
2. **SMTP e confirmação reais:** a consulta pública confirma a exigência de confirmação, mas não revela o estado do SMTP. A operação precisa concluir uma jornada real autorizada de recebimento e consumo do e-mail, sem extrapolar o resultado dos testes controlados. Evidências históricas não foram tratadas como nova validação.
3. **Recuperação remota completa:** o titular de uma conta QA autorizada deve receber e consumir um novo link, submeter a senha no fluxo protegido e verificar rejeição da senha antiga e login com a nova. O teste controlado não substitui essa etapa.
4. **Dispositivos físicos:** não houve nova comprovação desta etapa em Android/iPhone físico ou em provedores de e-mail adicionais.

A aprovação comercial depende também dos demais bloqueios documentados no relatório geral. Autenticação local aprovada não autoriza pedidos reais.
