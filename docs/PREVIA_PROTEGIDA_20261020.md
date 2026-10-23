# Prévia protegida e envio transacional — 20/10/2026

**Atualização:** a sessão de hospedagem foi concluída pelo responsável, a prévia privada foi publicada, SMTP de captura testado e administração RPC aprovada/revogada. [Resultado atual, URL e evidências](RESULTADO_PREVIA_HTTPS_20261020.md). O conteúdo abaixo registra a preparação anterior; as autorizações ali pendentes foram recebidas e utilizadas.

## Estado atual

**Prévia não publicada, sem URL HTTPS.** Nenhum arquivo enviado à hospedagem. Principal e Rawanzin não foram utilizados; nenhuma configuração remota foi alterada nesta etapa. O usuário autorizou somente uma prévia gratuita protegida, exclusivamente com NortFood-Homologacao.

O Netlify Drop anônimo publica um endereço aberto e não atende essa autorização. A documentação atual permite projeto privado no plano Free baseado em créditos, com acesso apenas ao proprietário autenticado. É necessário conferir o plano efetivo da conta e definir visibilidade privada **antes** do primeiro deploy. Não presumir que toda conta Free antiga oferece a mesma configuração. Senha compartilhada não é a opção gratuita escolhida. Fonte: [Project visibility](https://docs.netlify.com/manage/security/secure-access-to-sites/project-visibility/).

A aba Netlify está na tela de login, que vincula o acesso ao aceite dos termos. Essa intervenção foi solicitada ao responsável; não houve aceite automático. Captura privada: `test-results/beta/netlify-login-pendente.png`.

## Preparação técnica concluída

- Build `dist-homologacao/` exclusivo do projeto `zrczgghucwsaxqnyaapk`; o build recusa outro Supabase antes de escrever artefatos. Não há chave administrativa no pacote.
- Banner de homologação, robots bloqueado, sitemap vazio e noindex no HTML/header. São camadas adicionais; não substituem autenticação na hospedagem.
- `node scripts/check-protected-preview.cjs`: recebe `NORTFOOD_HOMOLOGATION_PREVIEW_URL` e verifica anonimamente a raiz e quatro arquivos importantes, sem cookies. Só considera aprovado se todos negarem acesso ou encaminharem ao acesso restrito reconhecido. HTTP 200 ou 404 não comprova proteção. Ainda **não executado contra um deploy**, pois não existe URL confirmada.
- Regressões locais: recusa de origem inválida, host disfarçado, página pública e build apontado para outro banco.
- Suíte completa local **87/87**, zero falhas, em `test-results/beta/protected-preview-tests.txt`. Depois foi acrescentado um teste administrativo adicional: os **2/2** testes de `tests/admin-authorization.test.cjs` passaram. A suíte completa não foi repetida após essa adição isolada.

Quando houver sessão de hospedagem: confirmar Free/privado, publicar somente o pacote de homologação, obter a URL real e gerar novamente o pacote com essa origem exata. Configurar retornos Auth e origem de upload somente no Supabase de homologação. Verificar acesso anônimo negado também nas URLs de deploy, headers/noindex, ausência de segredos e jornadas autenticadas em HTTPS. Não exportar cookies de proprietário para os testes. A proteção de hospedagem não substitui RLS, permissões ou autenticação da aplicação.

## E-mail

Os templates `supabase/templates/homologacao-confirmation.html` e `homologacao-recovery.html` estão preparados, com o placeholder Supabase `{{ .ConfirmationURL }}`, aviso de teste e sem rastreadores. Não foram aplicados nem enviados. SMTP de produção não foi configurado.

Para ensaiar sem domínio: foi proposta uma caixa SMTP temporária **Ethereal**, pendente de autorização. Ela captura mensagens; não entrega e-mails aos clientes. Poderá comprovar a cadeia Supabase → SMTP de captura → confirmação/recuperação de contas sintéticas, mas não entregabilidade externa. Não enviar dados pessoais ou links administrativos. Fonte: [Nodemailer — Ethereal](https://nodemailer.com/guides/testing-with-ethereal).

Para operação real, a opção candidata é Brevo Free, documentada com 300 envios/dia, sujeito aos limites e condições da conta. Requer conta autorizada, remetente verificado e autenticação de domínio quando exigida; não se deve inventar remetente ou comprar domínio nesta etapa. Configuração oficial: `smtp-relay.brevo.com`, porta 587/STARTTLS ou 465/TLS, login SMTP e chave SMTP do provedor, mantidos exclusivamente na configuração protegida do Supabase. A chave da API não substitui a chave SMTP. Fontes: [planos Brevo](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans), [integração oficial Supabase](https://developers.brevo.com/docs/supabase-smtp-integration).

## Administração

Concessão **não executada**. Foi solicitada autorização específica para o operador sintético existente `6a4d5e61-5f98-41e2-a621-6064f11b39fe`, somente na homologação. O ensaio reutiliza essa identidade, verifica e-mail e marcador sintético e exige autorização explícita antes de solicitar a chave ou iniciar conexões.

`scripts/prepare-admin-homologation.cjs` prepara concessão/revogação revisáveis; não abre conexão. O SQL valida identidade exata e recusa assumir um privilégio preexistente. O encerramento remove apenas o vínculo administrativo temporário, preservando conta e históricos. Não há expiração automática: revogação e conferência final são obrigatórias após o ensaio. Testes em PGlite comprovaram recusa de identidade ausente, proteção contra concessão repetida, bloqueio da leitura direta e preservação das demais contas/cargos na revogação. Isso não aprova as RPCs administrativas remotas.

## Intervenções mínimas pendentes

1. Entrar/criar a conta Free na aba Netlify e aceitar pessoalmente os termos, se concordar; não contratar upgrade.
2. Responder à autorização específica de administrador sintético temporário; até lá, testes positivos administrativos ficam pendentes.
3. Autorizar ou recusar SMTP de captura. Para entrega real, disponibilizar conta/remetente verificado; segredos nunca pelo chat.

**Beta real: NÃO APTO.** Faltam a prévia protegida com jornadas HTTPS, entrega transacional real e testes administrativos positivos. As aprovações remotas anteriores continuam válidas nos respectivos recortes e estão no relatório de finalização; os testes locais novos não são homologação remota.
