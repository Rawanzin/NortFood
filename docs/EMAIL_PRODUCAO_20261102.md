# NortFood — SMTP e autenticação: evidências de 02/11/2026

> **Checkpoint histórico.** A autorização do alias e a renovação do acesso administrativo permitiram concluir a confirmação, o reenvio, o login e a recuperação da conta fictícia. O estado atualizado e as evidências reais estão em [EMAIL_VALIDACAO_REAL_20261102.md](EMAIL_VALIDACAO_REAL_20261102.md). As pendências de alias e de revisão do template descritas abaixo foram superadas. O risco de classificação como Spam permanece documentado na atualização.

## Resultado e limites

O SMTP personalizado Supabase → Brevo entregou quatro mensagens reais de recuperação à única caixa autorizada. As duas primeiras tiveram recebimento conferido diretamente no Gmail, além dos eventos Sent/Delivered do Brevo. A terceira comprovou a persistência do modelo em português, com assunto “Recupere seu acesso — NortFood”, corpo correto e botão “Definir nova senha”; seus eventos de envio, entrega, abertura e clique também foram conferidos no Brevo. A quarta repetiu o fluxo após a publicação final: recebida no Gmail, seu botão abriu `https://nortfood.pages.dev/#settings`, carregou a sessão da conta autorizada, removeu os tokens da URL visível e apresentou o formulário. Isso comprova transporte, entrega e callback, mas não comprova uma nova senha salva nem um login posterior com ela.

Durante o teste real inicial, o formulário desapareceu ao retornar à aba. Foi reproduzido em Chrome local: um novo evento `SIGNED_IN` da mesma conta causava renderização que descartava o formulário. A correção preserva o mesmo formulário e os valores somente para a mesma identidade. Trocas de conta continuam removendo os dados anteriores. O teste falhou antes da correção e passou depois. Após publicar a correção e atualizar o PWA de teste, o quarto e-mail abriu o formulário real; alternar para a aba do Gmail e retornar manteve o formulário aberto. Nenhuma senha real foi digitada ou enviada pelo agente.

A confirmação completa de **um novo cadastro** permanece pendente. A caixa autorizada já pertence a uma conta confirmada. Essa conta não foi apagada, recriada ou desconfirmada para produzir um teste. Foi solicitada autorização para um alias de teste, ainda sem resposta. Nenhuma mensagem foi enviada a esse alias ou a outro destinatário.

O piloto comercial continua bloqueado no servidor. Esta rodada não autoriza pedidos comerciais nem substitui os demais critérios de segurança e operação.

## Diagnóstico real

- Sessões administrativas existentes do Supabase e Brevo foram reutilizadas. Não foi necessário solicitar chaves SMTP.
- SMTP personalizado habilitado; host `smtp-relay.brevo.com`, porta 587, remetente NortFood verificado. A senha armazenada não foi lida, copiada ou trocada.
- Site URL e redirecionamento oficial configurados para `https://nortfood.pages.dev`. Redirecionamentos legados foram preservados.
- Cadastro por e-mail habilitado, confirmação obrigatória e provedor Google desabilitado. Google não foi ativado sem configuração própria.
- Limites observados: 30 e-mails/hora no Supabase e intervalo de 60 segundos entre solicitações por usuário. Nenhum limite foi aumentado ou saturado para teste.
- Logs do caso investigado: `/signup` HTTP 200 às 15:53:30, seguido por `/resend` HTTP 429 às 15:54:03 em 01/11; o servidor informou que faltavam 25 segundos. Horários conforme exibição do painel, sem conversão presumida de fuso. Esse caso caracteriza reenvio antecipado, sem evidência de falha de credencial SMTP.
- O Brevo exibe advertência de remetente em domínio gratuito. Um domínio próprio com SPF/DKIM sob controle do proprietário é melhoria operacional pendente; não foi inventado domínio nem tentada alteração de DNS do Gmail.

## Correções

| Problema | Gravidade | Alteração | Reteste | Risco residual |
| --- | --- | --- | --- | --- |
| Reenvio imediatamente após cadastro ignora o envio inicial e recebe 429 | Média | O cadastro pendente inicia a espera local de reenvio; proteção no servidor preservada | Aprovado: serviço, backend e navegador com SDK real e transporte controlado | A espera local não substitui os limites do Supabase nem é compartilhada entre navegadores |
| Erro de intervalo confundido com cota geral de e-mail | Baixa | Traduz somente o número validado de segundos de respostas 429; não reflete texto arbitrário do servidor | Aprovado: mensagem segura e código de erro preservado | Cota global ou erro SMTP verdadeiro continuam visíveis, sem falsa indicação de entrega |
| Formulário de recuperação some ao retornar à aba | Média | Preserva formulário e campos em `SIGNED_IN` repetido da mesma conta; troca de identidade continua limpando | Falha reproduzida antes; 11/11 focados e 235/235 completos aprovados; alternância real Gmail → NortFood preservou o formulário após publicar | Gravação de nova senha e login posterior dependem do proprietário |
| Terminal comum não encontra Node/npm/npx/Supabase | Média operacional | Node LTS oficial instalado por usuário, SHA-256 conferido, npm/npx e wrapper da CLI oficial configurados no PATH do usuário | Aprovado com PATH reconstruído sem entradas especiais do Codex | Terminal já aberto precisa ser reaberto para herdar o PATH; CLI não autenticada não impede uso do painel autenticado |
| Modelos remotos ainda em inglês | Baixa | Assuntos em português salvos; recuperação substituída integralmente, com `{{ .ConfirmationURL }}` preservada | Recuperação comprovada por mensagem real recebida e botão funcional | Sessão Supabase expirou antes da revisão final; confirmação ainda contém bloco inglês junto do português e precisa substituição integral |
| Teste antigo de ícone exige fundo opaco anterior | Baixa: contrato de teste desatualizado | Teste passou a verificar transparência, dimensões e centro pelo alfa da marca oficial existente | Aprovado na suíte completa | Nenhuma imagem ou ícone foi alterado nesta rodada |

## Ferramentas e preservação

- Node **v24.22.2**, npm/npx **11.19.1** e Supabase CLI **2.122.0** verificados em terminal com PATH normal do Windows.
- O comando `node` resolve diretamente para o executável oficial, sem wrapper `.cmd`; npm/npx/Supabase usam wrappers locais. Isso também evita interpretação incorreta de expressões `node -e` pelo `cmd.exe`. Verificado novamente após o ajuste final (`tools-verified.json`).
- Instalação em `C:\Users\keven\.local\tools\NortFood\node-v24.22.2-win-x64`; wrappers em `C:\Users\keven\.local\bin`. Não foi necessário instalar pnpm no terminal comum: `npx` atende ao fluxo solicitado.
- A CLI ainda não tem sessão própria. Não foi solicitado login adicional porque o painel administrativo já forneceu os acessos necessários até sua expiração.
- Backups de código anterior e dos modelos remotos em `backups/email-20261102/`.
- Nenhuma migração aplicada, banco recriado, RLS alterada ou registro comercial removido. Lojas, produtos, pedidos e dados da Dan Burguer preservados pelas ações desta rodada.

## Testes executados

| Teste | Resultado | Evidência |
| --- | --- | --- |
| Auth, callback de confirmação, callback de recuperação, reenvio e SDK | **35/35 aprovados** | `test-results/email-environment-20261102/auth-regressions.log` — transporte controlado, não prova entrega SMTP |
| Suíte completa após atualização do contrato dos ícones | **234/234 aprovados** | `full-suite-final.log` — primeira rodada 233/234 preservada em `full-suite.log` |
| Recuperação ao retornar à aba e isolamento de identidade | **11/11 focados e 235/235 na suíte completa final aprovados** | `recovery-focus-before.log`, `recovery-focus-after.log`, `full-suite-recovery-final.log`; inclui teste em Chrome que perdeu o formulário antes da correção |
| Sintaxe | **168 arquivos, zero falhas** | `syntax-final.log` |
| Arquitetura | **25 módulos, zero ciclos/violações** | `architecture-final.log` |
| Build de produção Cloudflare Pages | **Aprovado antes e depois da correção adicional** | `build-pages.log`, `build-pages-final.log` |
| Comparação do código anterior com publicação existente | **Idêntico antes da correção** | `isolated-package.json`: recompilação da cópia anterior reproduz exatamente o backend publicado |
| Pacote isolado de publicação | **126 arquivos; somente backend, release e service worker mudaram** | `package-audit.json`, `isolated-package.json` |
| Prévia HTTPS | **129/129 checks aprovados** | `preview-package.json` |
| Navegador real na prévia | **18 checks, zero erros JS** | `preview-browser.log`, `browser-preview/browser.json`: temas, responsividade 320–1365px, formulários, mapa e offline |
| Recuperação real | **Entrega, callback e permanência do formulário aprovados; senha/login posterior pendentes** | `smtp-auth-evidence.json`, `real-ui-final-proof.json`, observação direta dos painéis e caixa autorizada |
| Cadastro novo e reenvio de confirmação reais | **Pendente** | Caixa autorizada já confirmada; dados existentes preservados |

Os testes locais que controlam respostas do serviço são identificados como tais. Não houve força bruta, DDoS, saturação de cota ou ataques à infraestrutura de terceiros.

## Publicação

Pacote isolado `.build/email-production-20261102`, release **`ac9c24662022c7d0bd99`**, base pública `075e7f3ec4709ed78571`. Todos os bytes dos ícones, manifesto, estilos e demais funcionalidades da base foram preservados. A prévia validada é `https://e5b813b7.nortfood.pages.dev`.

Primeira publicação principal concluída: deployment `https://4c171417.nortfood.pages.dev`, release `ac9c24662022c7d0bd99`. Site oficial aprovado em 129/129 checks de arquivos/status e 18 testes de navegador, sem erros JS (`production-package.json`, `production-browser.log`).

Segunda correção isolada e **publicação final**: `.build/email-recovery-focus-20261102`, release **`cb5dc60cd2041fd9fd0a`**, sobre a primeira publicação. Novamente, recompilar a cópia anterior reproduziu exatamente os bytes publicados; somente backend, release e service worker mudaram. Prévia `https://d60fb30b.nortfood.pages.dev` aprovada em 129/129 checks e 18 testes de navegador (`focus-isolated-package.json`, `focus-preview-package.json`, `focus-preview-browser.log`).

Publicado no site oficial [NortFood](https://nortfood.pages.dev), deployment imutável [2afb565d](https://2afb565d.nortfood.pages.dev). A publicação principal final passou em **129/129 checks de bytes/status e 18 testes de navegador**, sem erros JavaScript (`focus-production-package.json`, `focus-production-browser.log`, `focus-browser-production/browser.json`). O PWA de teste foi atualizado pela interface antes do quarto envio; o aviso de atualização desapareceu. Instalação/atualização física no Android não foi certificada nesta rodada.

As mudanças permanecem no checkout existente, junto das alterações anteriores preservadas; nenhum commit ou push foi realizado nesta rodada. A versão publicada é identificada pelo pacote, release e hashes, não pelo HEAD Git do checkout.

## Intervenções indispensáveis

1. **Reautenticar no painel Supabase aberto.** A sessão expirou durante a revisão de modelos; tentativa de reutilizar o formulário preenchido retornou “Invalid login credentials” e não havia sessão GitHub reutilizável. Não enviar credenciais pelo chat. Isso permite corrigir o bloco inglês remanescente na confirmação e verificar o resultado remoto final. A recuperação em português já foi comprovada por entrega real.
2. **Concluir a nova senha diretamente no formulário real aberto na última aba NortFood**, caso ainda não tenha sido salva. A ferramenta de controle do computador exige que o proprietário digite, confirme e envie a nova credencial. Não houve envio de senha pelo agente. O formulário final já permaneceu aberto após alternar entre as abas.
3. **Autorizar uma caixa/alias separado para cadastro novo**, se desejar comprovar cadastro → confirmação → login sem alterar a conta existente. Até essa autorização, somente o endereço exato originalmente informado pode receber os testes.

A participação pessoal na troca da senha decorre da skill [Computer Use](C:/Users/keven/.codex/plugins/cache/openai-bundled/computer-use/26.1027.30824/skills/computer-use/SKILL.md), que exige consultar sua [política de confirmações](C:/Users/keven/.codex/plugins/cache/openai-bundled/computer-use/26.1027.30824/docs/confirmations.md). A regra explícita é: “Ask the user to take over before any new credential is entered, and have them complete the entry, confirmation, and submission steps themselves.” Não é falta de autorização para corrigir o código; a regra exige que essa entrada e envio sejam feitos pelo proprietário.

Evidência consolidada sem dados pessoais ou segredos: `test-results/email-environment-20261102/final-summary.json`. A captura `recovery-focus-local.png` representa um teste **local controlado**, com campos vazios, e não deve ser apresentada como captura de senha real ou prova isolada de SMTP.

## Referências oficiais consultadas

- [SMTP personalizado do Supabase](https://supabase.com/docs/guides/auth/auth-smtp)
- [Limites do Supabase Auth](https://supabase.com/docs/guides/auth/rate-limits)
- [Variáveis e templates de e-mail](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Distribuições oficiais do Node.js](https://nodejs.org/dist/)

O diagnóstico anterior em `docs/EMAIL_CONFIRMACAO_20261101.md` é histórico. Suas pendências de acesso e de envio real foram parcialmente superadas pelos testes desta rodada; não devem ser repetidas como estado atual integral.
