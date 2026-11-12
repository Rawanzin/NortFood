# NortFood — status de lançamento em 08/11/2026

## 1. Resumo executivo

**NO-GO para operação comercial.** A candidata local fecha a falha de revogação de acesso comercial e passa pela jornada de retirada em Chrome com PostgreSQL descartável. A validação da candidata com Auth, Storage e Realtime hospedados depende de uma homologação íntegra. A API de homologação voltou a responder após a restauração no Supabase. O painel pediu nova autenticação antes da conferência administrativa final.

[Produção oficial](https://nortfood.pages.dev) serve `ab341e2835462747437a`, implantação `a29cb6e6`. O banco principal está com piloto desativado, catálogo público vazio e zero pedidos. Duas lojas estão cadastradas. A Dan Burguer conserva **46 produtos, 20 grupos e 220 opções**. O percentual padrão observado é **500 pontos-base (5%)**. Consulta administrativa de leitura em 08/11 e sondagens HTTP independentes.

## 2. Problemas e gravidade

| Gravidade | Problema | Situação |
| --- | --- | --- |
| Alta | Um vendedor vinculado continuava alterando a loja suspensa com uma sessão aberta. | Reproduzido em SQL. A migração 017 bloqueia alterações comerciais, acesso a pedidos e reserva de mídia para loja suspensa ou vendedor com banimento Auth vigente. A interface remove a loja da seleção e filtra pedidos mantidos em memória. Correção local. |
| Alta | Homologação fora do ar. | Projeto inicialmente pausado. Retomado no plano gratuito. A consulta administrativa inicial confirmou auth.users e ainda não localizou as estruturas comerciais consultadas durante a retomada. Depois da propagação em DNS público, Auth, catálogo e status do piloto responderam HTTP 200, com catálogo vazio e piloto desativado. A sessão do painel expirou antes da confirmação do inventário atualizado. A resolução DNS padrão do computador ainda retornava falha no reteste. |
| Alta | O piloto está fechado e nenhuma loja é visível ao público. | Controle intencional do servidor confirmado. A operação exige homologação e uma loja piloto escolhida pelo responsável. |
| Média | Relatório de vendedor usava períodos de calendário e o painel estimava comissão pela taxa atual. | A candidata usa janelas de 1, 7 e 30 dias em São Paulo e relatório com produtos líquidos de descontos, frete, comissão gerada e líquido estimado. |
| Média | Google OAuth desativado e avatar indisponível em produção. | Configuração pública confirmou Google desativado. O botão respeita essa indisponibilidade na candidata. A função `profile-avatar` retorna 404; implementação e testes locais disponíveis. |
| Média | Reenvio classificado como Spam pelo Gmail na rodada anterior. | O recebimento e uso de links foram comprovados em 02/11. Em 08/11 foram rechecadas as configurações públicas de Auth. A entrega e os cabeçalhos SPF/DKIM/DMARC não foram retestados com novas mensagens. |

## 3. Correções da candidata

- [Migração 017](../supabase/migrations/202611080017_store_access.sql) centraliza autorização de gestão, expõe `can_manage` em `nf_context`, protege os caminhos de mídia e onboarding comercial e conserva o bloqueio de autoatendimento na própria loja.
- [Upload de mídia](../supabase/functions/upload-media/index.ts) traduz a recusa de permissão em HTTP 403. As quotas e validações de arquivo continuam no fluxo.
- [Projeção da sessão](../src/application/snapshot.js), [controle comercial](../src/commercial.js) e [painel](../app.js) respeitam a autorização retornada pelo banco e invalidam a seleção e dados carregados da loja quando ela perde acesso.
- O botão de endereço no [app](../app.js) usa o texto visível como nome acessível. [Financeiro](../src/presentation/finance.js) apresenta períodos móveis e valores calculados sobre pedidos concluídos. [Administração](../src/presentation/admin.js) abre os detalhes dos pedidos recentes com a sessão administrativa já validada pelo servidor.
- [Template de confirmação](../supabase/templates/confirmation.html) contém botão azul **Confirmar e-mail**. [Verificador público](../scripts/verify-public-pilot.cjs) considera o alfa do ícone oficial atual e mede presença de conteúdo, preservando os PNGs de marca.
- Regressões adicionadas para suspensão e banimento com sessão ativa, permissões do contexto, histórico em memória, aprovação administrativa pela interface e relatórios comerciais.

## 4. Banco, integridade e reversão

Produção registra as migrações 001–016, com zero tabelas da aplicação sem RLS. A migração 017 altera funções e preserva dados, vínculos, estados e a configuração do piloto. Nenhuma migração foi aplicada remotamente nesta rodada. O backup privado de aplicação de 02/11 foi restaurado localmente com 33 tabelas, 320 registros e 55 chaves estrangeiras validadas. A aplicação local das pendências até 017 preservou os dados originais de lojas, catálogo, pedidos e configuração. O snapshot é de aplicação e exclui senhas/sessões Auth, segredos gerenciados e bytes de Storage.

Antes de qualquer mudança hospedada, confirmar referência e schema do projeto, tirar novo ponto de recuperação privado e verificar restauração. Exportar as definições atuais de `private.is_member`, `public.nf_context`, `public.nf_reserve_media_upload`, `public.nf_complete_seller`, `public.nf_place_order` e `public.nf_chat` com ACLs. Aplicar 017 primeiro em homologação, em transação. Em caso de regressão, preparar uma migração corretiva que restaure as definições comprovadas, conserve o histórico e mantenha pedidos bloqueados. Para reverter o frontend, usar o deploy de produção anterior pelo Pages e repetir o verificador público. Reverter uma Edge Function pelo artefato da função anterior e conferir CORS e o contrato de autorização.

## 5. Cobertura por requisito

| Área | Classificação | Evidência e limite |
| --- | --- | --- |
| Base, Git e VS Code | Implementado e testado localmente | A pasta ativa é `C:\Users\keven\Documents\NortFood`. A pasta inicial do chat continha somente um Git vazio. GitHub `main` em `6760ae2` e `release/nortfood` em `cdd3e37`. Release local anterior `0508888`. A candidata preserva a árvore local mais recente no checkpoint `a028e77` e utiliza os módulos já integrados das versões anteriores. `notify` encontrado em código é callback ou comando do PostgreSQL. A entrada local de demonstração usa `?demo=1`; o iniciador de homologação exige Auth hospedado saudável. |
| Cliente, vendedor e e-mail | Implementado e testado localmente; prova hospedada histórica | Cadastro, confirmação, reenvio, recuperação, sessão, logout, senha mínima de 8 e reutilização de link no relatório de 02/11. Esta rodada revalidou regressões com SDK e transporte de teste, configurações públicas e telas. Recebimento de e-mail e expiração natural de links da candidata aguardam homologação. [Provas históricas de e-mail](EMAIL_VALIDACAO_REAL_20261102.md) |
| Conta comercial e loja | Implementado e testado localmente; prova hospedada histórica parcial | Cadastro SQL, vínculo, rascunho, edição no celular, aprovação via painel, persistência de produto e adicionais, isolamento, suspensão e banimento. Login/sessão e upload da conta fictícia em 02/11 são evidência da release anterior. Aprovação/rejeição e bloqueio com Auth real ainda precisam de reteste. [Histórico comercial](CONTAS_COMERCIAIS_20261102.md) |
| Pedido e comissão | Implementado e testado localmente | Chrome e PostgreSQL com sessões isoladas percorrem carrinho, aprovação, retirada e conclusão. Servidor recalcula preço, adicional e frete, controla idempotência e transições e grava a comissão congelada ao concluir. Entrega, bloqueios de modalidade, adulteração e cancelamentos têm regressões SQL. Em homologação anterior a entrega foi comprovada em transação revertida. Falta jornada hospedada da candidata com cliente, vendedor e administrador independentes, sincronização e atualização sem recarga. |
| Entrega, retirada e mapa | Parcial | Modalidades independentes, cobertura por bairro/cidade/UF e horários têm regras no servidor. Busca e mapa passaram em Chrome, com coordenadas reais do catálogo quando disponíveis e testes de GPS controlado. Raio geográfico configurável, precisão de GPS físico e autocomplete em todas as regiões não foram homologados. |
| Painel administrativo | Parcial | Aprovação, suspensão, categorias, pedidos, comissão, solicitações e auditoria com ACL no banco. Gestão dinâmica de banners, cidades, cupons e conteúdo de políticas ainda está ausente do painel. Cupom inicial segue desativado. |
| QR, WhatsApp e chat | Parcial | QR usa URL estável por UUID e tem teste de leitura de imagem em Chrome. Validação em câmera física pendente. Formatação e links de WhatsApp são testáveis localmente. Chat e notificações no app têm isolamento em SQL; entrega ao destinatário em sessão hospedada e push em segundo plano permanecem pendentes. |
| UI, categorias, perfil e PWA | Parcial | Temas, logos, formulário móvel, mapa, categorias, cache, atualização e offline passaram em Chrome. Avatar real depende da função hospedada. Instalação física em Android, iPhone e desktop e GPS físico ainda precisam de teste. |
| SEO, desempenho e segurança | Parcial | Arquivos de SEO e 404, indexação desativada enquanto o catálogo público está vazio, auditoria do pacote e sondagens HTTP. RLS, permissões e tentativas adversariais locais retestadas. Experiência em dispositivo de entrada e desempenho de campo seguem sem medição. |

## 6. Testes e evidências

Resultados atuais em [test-results/launch-20261108](../test-results/launch-20261108/). O ensaio de jornada usa Chrome real e PGlite com as migrações, papéis SQL e RLS. As identidades são fornecidas por adaptador local. O ensaio é descartável e não faz pedidos, cobranças nem contatos externos. A aprovação local da retirada registrou R$ 0,65 sobre R$ 13,00 em uma única entrada. O relatório mostrou líquido estimado de R$ 12,35.

- Linha de base anterior às mudanças **236 aprovados, zero falhas**.
- Correção focada de segurança, schema e projeção **39 aprovados, zero falhas**.
- Produção **40 verificações públicas aprovadas** e **18 verificações no Chrome aprovadas**, sem erros JavaScript. Uma primeira tentativa esbarrou no verificador antigo do ícone, que esperava fundo opaco e arte predominantemente vermelha. O verificador foi atualizado para a especificação do ícone oficial transparente e o reteste passou.
- Comparação de pacote **129 verificações de HTTP/bytes**. Produção e candidata diferem em `app.js`, `assets/nortfood-backend.js`, `sw.js` e `release.json`. São versões distintas.
- Lighthouse 13.6 em Chrome móvel emulado, na versão pública: desempenho **90**, acessibilidade **100**, boas práticas **100** e SEO **69**. LCP **3,5 s** e CLS **0,016** em laboratório. O resultado de SEO inclui bloqueio explícito de indexação. O diagnóstico adicional de nome acessível do botão de endereço foi corrigido na candidata. [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview)
- Reteste focado das fixtures Auth e dos fluxos afetados **26 aprovados**. A primeira rodada da candidata teve cinco falhas em fixtures posicionais e um teste interrompido por timeout. O reteste após explicitar as colunas e a execução completa final estão registradas em logs separados.
- Demonstração **107 verificações aprovadas**. Suíte comercial **10 aprovados**. Segurança **25 aprovados**. Verificação de sintaxe **173 arquivos** e arquitetura **25 módulos**, sem ciclos ou violações.
- Auditoria de dependências de produção **43 dependências, zero alertas no registro**. Busca por padrões conhecidos de segredos no código e na parte examinada do histórico Git **zero achados**.
- O pacote candidato em loopback passou **7 verificações**, incluindo abrir a página de endereço e voltar pelo teclado, controle por service worker e viewport de 390 px. Lighthouse do pacote em loopback confirmou acessibilidade 100 e aprovação da auditoria de nome acessível.
- Suíte completa final **237 aprovados, zero falhas, zero cancelamentos e zero ignorados**. Evidência em final-clean.log.

## 7. Publicação e intervenção indispensável

Candidata estática `29915122726c604b754b` em [dist-pages](../dist-pages/), código `0d26d136744cc679c0c084a52593b6c06e069b2c` na branch `codex/lancamento-20261108`. Branch sincronizada com o GitHub e pacote preparado. Produção continua na implantação [a29cb6e6](https://a29cb6e6.nortfood.pages.dev). Sem publicação, alterações em contas reais ou ativação de pedidos.

1. Renovar o login no painel [NortFood-Homologacao](https://supabase.com/dashboard/project/zrczgghucwsaxqnyaapk) pelo navegador do ChatGPT. Com a sessão aberta, confirmar o esquema restaurado, fazer novo backup e executar os ensaios hospedados. Se o SMTP antigo continuar inválido, informar a credencial diretamente em **Authentication → Emails → SMTP Settings**. A skill Computer Use exige que o titular insira e confirme novas credenciais no painel. Não enviar segredos pelo chat.
2. Se o Google for exigido na estreia, disponibilizar o cliente OAuth Web autorizado em Google Cloud. Callback do projeto principal `https://zwkhqahivthzivmuirjr.supabase.co/auth/v1/callback`. O segredo deve ser inserido diretamente na configuração do provedor Google no Supabase. [Instruções do Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google)
3. Disponibilizar aparelhos para câmera/QR, instalação e GPS e definir a loja autorizada para o piloto após o ensaio. A verificação de entregabilidade pode usar um domínio de remetente controlado pelo NortFood e autenticado conforme o Brevo. [Requisitos de autenticação do Brevo](https://help.brevo.com/hc/en-us/articles/12163873383186-Authenticate-your-domain-with-Brevo-Brevo-code-DKIM-DMARC)

**Veredito NO-GO.** A etapa de publicação fica depois da homologação hospedada da candidata, confirmação operacional da loja e autorização explícita do responsável.

## 8. Continuação de 08/11/2026

A branch foi enviada para [Rawanzin/NortFood](https://github.com/Rawanzin/NortFood/tree/codex/lancamento-20261108) com push normal. O GitHub confirmou inicialmente `f778ab1b225724347337ea6574fcc237e490fb8c`. Esse commit contém `0d26d136744cc679c0c084a52593b6c06e069b2c`, a revisão usada no pacote candidato `29915122726c604b754b`. O pacote em `dist-pages` passou a auditoria de 126 arquivos.

- Homologação hospedada, acesso anônimo. Seis de sete sondagens passaram. Auth com cadastro habilitado e confirmação obrigatória, catálogo vazio, piloto desativado, pedidos e administração protegidos, preflight de mídia de loja aceito. A função de avatar respondeu 404. A resolução padrão do computador retornou falha de DNS. As sondagens HTTPS usaram a resolução pública mantendo hostname e validação TLS.
- Site oficial. 40 verificações públicas e 18 verificações Chrome aprovadas na release publicada `ab341e2835462747437a`.
- Retestes locais. 10 comerciais e 25 de segurança aprovados. A restauração local do snapshot histórico de homologação conferiu 34 tabelas, 639 registros e 56 chaves estrangeiras. O ensaio aplicou 016 e 017 localmente. O [inventário somente leitura](../supabase/checks/launch_staging_017_readonly.sql) também passou em PGlite antes e depois de 017, com o piloto desativado e o bucket de avatar privado.
- O snapshot histórico restaurado é evidência de recuperação local. O backup atual do projeto, o inventário administrativo restaurado, a aplicação hospedada da 017 e os testes autenticados de ponta a ponta aguardam o acesso ao painel. O CLI não possui token administrativo nesta sessão. A tela **Sign in | Supabase Dashboard** foi aberta no navegador do ChatGPT para o titular renovar a sessão. Depois, executar o inventário e exportar o snapshot de aplicação para a pasta privada de backups, validar a restauração e só então aplicar 017. [Backups do Supabase](https://supabase.com/docs/guides/platform/backups)

**NO-GO mantido.** A publicação e o piloto comercial aguardam homologação autenticada e autorização explícita. Os resultados anônimos estão em `test-results/launch-20261108/continuation/staging-public.json`.

## 9. Resultado da homologação após o login

A seção anterior registra o bloqueio encontrado antes da renovação da sessão. Depois do login, o inventário do projeto `zrczgghucwsaxqnyaapk` confirmou as versões 001–016, 19 lojas, 34 pedidos e o piloto desativado. O snapshot atual de aplicação foi exportado em leitura, validado por restauração local e aplicado com a 017 em ensaio descartável antes da execução hospedada. A cópia privada foi conferida em 34 tabelas, 639 registros e 56 chaves estrangeiras. SHA-256 `8bc08b3745352021170dbde0916afe0316ec0e3f163f9a356e7f7873c245959a`. Senhas, sessões, segredos gerenciados e binários de Storage ficam fora do snapshot de aplicação.

A migração **202611080017** foi aplicada e registrada em uma transação na homologação, com verificação da referência, do histórico, do piloto e das seis definições de funções alteradas. A comparação do snapshot anterior e posterior confirmou os mesmos registros, políticas, grants, buckets, metadados de Storage e publicação Realtime. O texto da migração confere com o Git após normalizar os finais de linha.

| Ensaio | Resultado e escopo |
| --- | --- |
| PostgreSQL hospedado com rollback | Cinco cenários aprovados. Onboarding, ausência de escalonamento por metadados, produto, submissão e aprovação, retirada, entrega, preço no servidor, idempotência, RLS, comissão e revogação por suspensão. Identidades sintéticas com papéis SQL. |
| Auth real e PostgREST | Login por senha aprovado para cliente, vendedor e administrador sintéticos provisionados. JWTs confirmaram vínculo e funções, onboarding, catálogo, administração, proteção cruzada e suspensão na mesma sessão. Upload comercial privado e leitura assinada aprovados. |
| Pedido e Realtime | Dois pedidos sintéticos foram criados na homologação pelo motor de pedidos em uma transação que restaurou o piloto para desativado antes do commit. O vendedor percorreu os estados com JWT real. O cliente recebeu os estados finais de retirada e entrega pelo Realtime. Cada pedido gerou uma única comissão de 500 pontos-base, R$ 0,65 sobre R$ 13,00. Uma mensagem real de chat também chegou à sessão autorizada. |
| Avatar hospedado | A função foi implantada somente em homologação, com o código fixado no commit `25bda7d5ad4105269a5a8911d7e27b42d4245351`. O ensaio encontrou HTTP 400 na remoção porque o gateway envia um stream vazio. O ajuste aceita zero bytes e continua recusando payload. Os cinco testes locais do avatar passaram. Em homologação, passaram CORS, bloqueio anônimo, origem externa recusada, upload, acesso assinado do proprietário, bloqueio cruzado e remoção da imagem sintética. |
| Mobile e PWA | Cliente e vendedor entraram pelo Auth hospedado usando o pacote candidato servido em loopback no Chrome a 390 px. Sem overflow e com service worker pronto. Instalação em aparelhos físicos ainda precisa de teste. |
| E-mail | O SMTP configurado em homologação é `smtp.ethereal.email`. Uma tentativa de cadastro com endereço sintético `example.test` retornou **HTTP 500 no envio**, sem sessão emitida. Entrega, confirmação, reenvio e recuperação por e-mail da candidata ainda não estão homologados. |

Encerramento. Os **639 registros originais** foram novamente conferidos após os ensaios, sem divergências. As três contas sintéticas foram desativadas e suas permissões temporárias foram revogadas. A loja sintética foi suspensa. Os dois pedidos identificados como teste foram mantidos para auditoria. O estado final de homologação é **20 lojas, 36 pedidos, catálogo público vazio e piloto desativado**. A produção e seu catálogo ficaram fora das alterações.

**NO-GO comercial.** A intervenção atual é configurar credenciais SMTP válidas diretamente no projeto de homologação e confirmar acesso à caixa de testes, para comprovar os links e a entrega de e-mail. Depois, repetir o cadastro e a recuperação e apresentar a versão para autorização explícita de publicação. [Abrir SMTP Settings da homologação](https://supabase.com/dashboard/project/zrczgghucwsaxqnyaapk/auth/smtp)

Evidências sanitizadas em `test-results/launch-20261108/continuation`. O pacote estático `29915122726c604b754b` continua em `dist-pages`. A correção do avatar é da Edge Function e acompanha separadamente o plano de publicação.

## 10. Reteste do SMTP e preparação final de 08/11/2026

A confirmação obrigatória foi verificada no endpoint Auth de homologação antes da tentativa. O SMTP personalizado continua ativo em `smtp.ethereal.email:587`. Após o ajuste informado, cadastro, reenvio e recuperação retornaram **HTTP 500 `unexpected_failure`**. Os três eventos exibiram **`535 "Authentication failed"`** nos logs Auth, respectivamente às 03:23:42, 03:26:55 e 03:26:58 de São Paulo. A recusa ocorreu na autenticação do SMTP. O erro observado não é uma resposta de limite nem um erro de renderização de template. A configuração de confirmação, templates e limites foi preservada. [Diagnóstico de erros Auth do Supabase](https://supabase.com/kb/troubleshooting/resolving-500-status-authentication-errors-7bU5U8)

Dez verificações no Auth hospedado passaram com quatro contas e links sintéticos provisionados no banco. A senha foi recusada antes da confirmação. Links válidos de confirmação e recuperação abriram sessão para a conta certa. Links com expiração simulada e links já usados foram recusados com `otp_expired` e sem sessão. O log registrou separadamente link expirado e token de uso único não encontrado. A recuperação aceitou a nova senha e recusou a anterior. Esse ensaio valida a verificação dos links no servidor. A entrega e a confirmação a partir da caixa postal ainda dependem do SMTP.

As quatro contas sintéticas foram desativadas e seus tokens invalidados. A homologação terminou com 20 lojas, 36 pedidos e piloto desativado. As únicas alterações persistentes do reteste ficaram restritas aos registros sintéticos do Auth e aos eventos de auditoria gerados pelo serviço.

A regressão completa passou com **237 testes, zero falhas, zero cancelamentos e zero ignorados**. A candidata `29915122726c604b754b` foi recompilada em `dist-pages` com os 126 arquivos aprovados na auditoria. O site oficial passou em 40 sondagens públicas. Evidências em `test-results/launch-20261108/smtp-final`.

**NO-GO comercial.** Salvar um par válido de usuário e senha SMTP e disponibilizar a caixa Ethereal correspondente para comprovar recebimento, confirmação, reenvio e recuperação. A autorização de publicação e de pedidos comerciais continua pendente. [SMTP Settings da homologação](https://supabase.com/dashboard/project/zrczgghucwsaxqnyaapk/auth/smtp)

## 11. Retomada de 12/11/2026

As novas páginas foram abertas diretamente nos endereços oficiais. A identidade foi conferida pela URL completa, origem e título: a sessão separada exigiu autenticação no Supabase/GitHub e no Ethereal. Depois, o navegador integrado voltou a disponibilizar a sessão autenticada de Rawanzin e ela foi reutilizada no projeto **NortFood-Homologacao**, referência `zrczgghucwsaxqnyaapk`. Nenhum bloqueio de segurança foi contornado e nenhuma credencial foi registrada em arquivos, logs ou chat.

O endpoint público de Auth da homologação respondeu HTTP 200, com e-mail habilitado, cadastro habilitado e `mailer_autoconfirm=false`. Uma única tentativa de cadastro sintético, em **12/11/2026 às 12:54:15 de São Paulo**, retornou **HTTP 500 `unexpected_failure`: `Error sending confirmation email`**, sem sessão emitida. Identificador para correlação nos logs Auth: `01a1d077-74b4-7466-af76-05e82f571604`. Evidência sanitizada: `test-results/launch-20261112-smtp/auth-probe.json`.

A causa foi confirmada nos logs Auth autenticados: **`535 "Authentication failed"`**, evento `1c0208ba-0652-4ace-82de-696d128f3c68`. O painel confirmou SMTP personalizado ativo em `smtp.ethereal.email:587`, remetente de homologação e formulário sem alterações pendentes. A senha armazenada fica oculta. Nesses eventos, a recusa ocorreu na autenticação SMTP, sem indicação de limite do provedor ou falha de renderização de template.

Uma nova conta Ethereal foi preparada com credenciais somente em memória. Passaram autenticação SMTP, STARTTLS, envio sintético e localização da mensagem correspondente por IMAP TLS. Após o titular informar novo salvamento, uma segunda tentativa controlada de cadastro retornou HTTP 500: request `01a1d08b-c5d3-7233-a7e7-1a340dc5cb02`, evento Auth `6356f578-94d6-4321-9fc5-39c1e28d8ab9`, às **13:16:26 de São Paulo**, novamente com **`535 "Authentication failed"`**. A conta preparada continuou autenticando diretamente no Ethereal. A comparação privada dos campos após recarregar as configurações confirmou que **o usuário persistido no Supabase é diferente do usuário da conta validada**. Nenhum desses valores foi registrado.

Um painel local temporário foi preparado com cópia e seleção manual do par validado, sem gravar credenciais em arquivos. A política da ferramenta de navegador exige intervenção do titular para inserir e salvar uma nova credencial. O próximo envio ficou suspenso até conferir a correspondência do usuário persistido. Não foram repetidos reenvios ou recuperações com o par divergente. Recebimento e consumo dos links gerados pelo Supabase permanecem **não comprovados nesta rodada**; o envio SMTP/IMAP direto não os substitui.

A regressão anterior encerrou sem resumo final e registrou dois timeouts de Auth. O callback expirado passou isoladamente em 16,6 segundos; o teste original do SDK passou em 20,6 segundos, com seu limite original de 60 segundos. Nenhuma alteração funcional de Auth foi necessária.

A regressão reiniciada terminou com **236 aprovados e 1 reprovado**, sem cancelados ou ignorados. A falha foi `Cannot read properties of null (reading 'width')` no teste mobile de endereço: a resposta simulada de geocodificação podia fechar o mapa antes da medição, pois o teste dependia de um atraso fixo. O teste agora mantém a resposta pendente até a nova escolha no mapa e então a libera explicitamente. A funcionalidade do aplicativo foi preservada. Após a correção, passaram os **2 testes de endereço** e a **regressão completa: 237 aprovados, zero falhas, zero cancelamentos e zero ignorados**, em 387,3 segundos. Evidência final: `test-results/launch-20261112-smtp/regression-corrected.log`.

Uma consulta hospedada em transação `READ ONLY` com `ROLLBACK` confirmou **20 lojas, 36 pedidos, `pilot_enabled=false` e função da migração 017 presente**. Lojas, produtos e pedidos existentes não foram alterados nesta retomada. Não foram executadas novas migrações nem alterações no banco principal.

O pacote existente **`29915122726c604b754b`**, em `dist-pages`, passou novamente na auditoria de publicação: **126 arquivos, nenhuma ocorrência**. Nenhuma implantação foi executada. A alteração exclusiva de teste/documentação não exige recompilar os mesmos bytes públicos. A preparação de publicação e reversão anterior permanece aplicável. Ethereal é captura de homologação; sua aprovação não substituirá um SMTP de entrega real para produção.

Evidências sanitizadas em `test-results/launch-20261112-smtp`: `auth-probe.json`, `auth-log-cause.json`, `hosted-ethereal.json`, `new-account-preflight.json`, `smtp-account-comparison.json`, `staging-readonly.json`, `package-audit.json` e logs dos testes. Senhas, tokens, corpos de mensagens e links de acesso ficam fora desses arquivos e do Git.

**NO-GO comercial.** Pendência imediata do titular: persistir no SMTP da homologação o par da conta validada apresentado no painel local. Depois: conferir a correspondência do usuário, comprovar cadastro/confirmação/reenvio/recuperação pelos e-mails recebidos e validar os links. Entrega de e-mail real de produção e aceitação em aparelho físico continuam separadas. Publicação e habilitação comercial dependem de autorização explícita.
