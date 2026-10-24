# SMTP sem domínio próprio — NortFood

Data: 24/10/2026. Pesquisa em documentação oficial; não constitui prova de envio ou recebimento de e-mail.

## Estado observado nesta execução

- O Resend continua sem domínio verificado.
- A conta Brevo **ainda não foi criada**. O responsável pela execução abriu a tela oficial `https://onboarding.brevo.com/account/register`.
- Foi solicitada uma autorização agrupada para os consentimentos e intervenções indispensáveis. No momento deste registro, não houve resposta.
- Nenhuma SMTP key ou API key nova foi criada ou inserida nesta investigação.
- A pesquisa não alterou SMTP, configuração de autenticação, usuários, tabelas ou dados comerciais.

## Conclusão

**Brevo Free é uma alternativa candidata para homologar e-mails sem comprar domínio. A ativação e a entrega continuam PENDENTES.** A documentação permite verificar um remetente individual pela caixa postal e descreve a substituição automática de remetentes de domínios gratuitos por um endereço controlado pelo próprio Brevo. Isso não autoriza inventar o endereço substituto nem garante que a conta será liberada para envios.

O endereço `nortfood.pages.dev` hospeda a aplicação, mas não comprova controle de DNS sobre um domínio remetente de e-mail. Não deve ser usado como remetente supostamente verificado.

## Opções e limites

| Serviço | Condições documentadas | Resultado para o NortFood |
|---|---|---|
| Supabase SMTP padrão | Somente destinatários membros da equipe do projeto; limite atual de 2 mensagens/hora; serviço de testes sem garantia de entrega. | Não atende cadastro público. Pode servir a testes autorizados com membro da equipe. |
| Resend Free | 100 mensagens/dia e 3.000/mês. Sem domínio DNS verificado, o domínio de teste só envia ao e-mail da própria conta; outros destinatários são recusados com HTTP 403. | Bloqueado para confirmação e recuperação de clientes reais enquanto não existir um domínio controlado e verificado. |
| Brevo Free | Gratuito permanente, sem cartão, até 300 envios/dia, incluindo transacionais. Um remetente individual pode ser verificado por código enviado ao endereço. | Candidato sem compra de domínio, sujeito à ativação transacional e aos testes de entrega. |
| Mailjet Free | 6.000 mensagens/mês e 200/dia; permite verificar endereço individual, mas alerta que remetentes Gmail podem ter mensagens rejeitadas. | Alternativa pesquisada, sem conta criada; não há evidência de vantagem de entrega neste cenário. |

As cotas são compartilhadas com os demais usos da respectiva conta. Verificar os valores efetivos no painel antes da ativação; não contratar complemento ou plano pago automaticamente.

## Remetente individual no Brevo

1. O endereço precisa pertencer ao responsável e ser confirmado pelo código enviado à caixa postal. Nome de exibição proposto: NortFood. Não usar um Gmail como remetente antes dessa verificação.
2. Domínios como `gmail.com` não podem receber SPF/DKIM personalizados pelo usuário da caixa. Não tentar autenticar um domínio que o responsável não controla.
3. Para manter a autenticação, o Brevo documenta reescrita do remetente. O exemplo de transacionais é `mycompany@5000001.t-sender-sib.com`; o exemplo `mycompany@5000001.brevosend.com` se refere a marketing. São exemplos do provedor, não endereços criados para o NortFood.
4. O Brevo classifica essa substituição como uma medida temporária, não uma solução permanente. Não prometer estabilidade ou chegada à caixa de entrada com base apenas na documentação.
5. A documentação de problemas SMTP descreve ativação separada da plataforma transacional e orienta novas contas sem envio transacional a solicitar ativação ao suporte. Cadastro e confirmação do remetente, isoladamente, não comprovam liberação SMTP.
6. Não foi encontrada uma exigência universal de KYC ou de confirmação por SMS para SMTP. Desafios de segurança e solicitações reais devem ser verificados no fluxo da conta, sem inferir que um SMS será a única etapa.

## Integração candidata com Supabase Auth

O Supabase aceita provedores compatíveis com SMTP. Para o Brevo:

- Servidor: `smtp-relay.brevo.com`.
- Porta: 587 ou 465, com a criptografia correspondente.
- Usuário: o login mostrado na tela SMTP do Brevo; pode ser um endereço gerado em formato `[ID]@smtp-brevo.com`.
- Senha: **SMTP key**, não senha de login da conta e não API key.
- Remetente: o endereço individual efetivamente verificado na conta. Deixar a eventual reescrita a cargo do provedor.
- Nome do remetente: NortFood.
- Preservar confirmação de e-mail, troca segura de e-mail, RLS e as restrições comerciais existentes.
- Conferir o limite inicial documentado de 30 mensagens/hora do Supabase após a configuração de SMTP personalizado. Aumentá-lo somente com necessidade comprovada e respeitando a cota gratuita do provedor.
- Se houver bloqueio de IPs SMTP desconhecidos, conferir o endereço de saída real do Supabase e o desafio apresentado; não desativar proteções para esconder erros.

A credencial deve ser criada e inserida em tela protegida pelo responsável quando o mecanismo de segurança exigir intervenção humana. Não imprimir, gravar em documentação, versionar, fotografar ou colar a chave na conversa.

## Etapas ainda necessárias

1. Obter a autorização agrupada já solicitada, incluindo eventual aceite dos termos e da política de privacidade do novo provedor, sem faturamento.
2. Concluir autenticação protegida e confirmar a posse do remetente pelo fluxo oficial.
3. Verificar se a plataforma transacional está ativa. Se depender de suporte, preparar o pedido e obter autorização explícita antes de enviar mensagem em nome do responsável.
4. Concluir o fluxo protegido de SMTP key e salvar a configuração no projeto Supabase correto.
5. Testar no site público com conta identificada e caixa postal autorizada: cadastro, recebimento e uso do link de confirmação, login, logout, persistência após atualização, recuperação e alteração de e-mail.
6. Conferir o destino dos links em `https://nortfood.pages.dev`, a validade dos modelos, os logs de envio e a efetiva confirmação no Supabase.
7. Liberar cadastro por e-mail apenas após os testes críticos. Nenhum teste SMTP ou cadastro positivo está aprovado por este documento.

## Fontes oficiais consultadas

- [Supabase: SMTP personalizado, restrições do padrão e limites](https://supabase.com/docs/guides/auth/auth-smtp).
- [Resend: erros, incluindo restrição de teste e domínio não verificado](https://resend.com/docs/api-reference/errors).
- [Resend: cotas e limites](https://resend.com/docs/knowledge-base/account-quotas-and-limits).
- [Brevo: planos, gratuidade sem cartão e 300 envios/dia](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans).
- [Brevo: criação e verificação individual de remetente](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email).
- [Brevo: requisitos dos destinatários e substituição de remetente transacional](https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders).
- [Brevo: configuração SMTP](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP).
- [Brevo: ativação transacional e diagnóstico de erros SMTP](https://help.brevo.com/hc/en-us/articles/115000188150-Troubleshooting-Issues-with-Brevo-SMTP).
- [Brevo: criação e proteção de SMTP keys](https://help.brevo.com/hc/en-us/articles/7959631848850-Create-and-manage-your-SMTP-keys).
- [Mailjet: verificação individual e limitações de remetentes gratuitos](https://documentation.mailjet.com/hc/en-us/articles/360042759253-How-to-add-a-sender-address).
- [Mailjet: limites do plano gratuito](https://documentation.mailjet.com/hc/en-us/articles/19154256993051-Understanding-Mailjet-Free-Plan-Limits).

Fluxos oficiais para revisão humana: [cadastro Brevo](https://onboarding.brevo.com/account/register), [termos](https://www.brevo.com/legal/termsofuse/) e [privacidade](https://www.brevo.com/legal/privacypolicy/). O conteúdo das páginas legais não foi validado pela ferramenta de pesquisa devido a timeout; conferir os links e textos na própria tela oficial antes de qualquer aceite. Nenhum aceite do Brevo foi realizado por esta pesquisa.
