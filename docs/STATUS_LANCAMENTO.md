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

Candidata estática `29915122726c604b754b` em [dist-pages](../dist-pages/), código `0d26d136744cc679c0c084a52593b6c06e069b2c` na branch `codex/lancamento-20261108`. Git local e pacote preparado. Produção continua na implantação [a29cb6e6](https://a29cb6e6.nortfood.pages.dev). Sem publicação, alterações em contas reais ou ativação de pedidos.

1. Renovar o login no painel [NortFood-Homologacao](https://supabase.com/dashboard/project/zrczgghucwsaxqnyaapk) pelo navegador do ChatGPT. Com a sessão aberta, confirmar o esquema restaurado, fazer novo backup e executar os ensaios hospedados. Se o SMTP antigo continuar inválido, informar a credencial diretamente em **Authentication → Emails → SMTP Settings**. A skill Computer Use exige que o titular insira e confirme novas credenciais no painel. Não enviar segredos pelo chat.
2. Se o Google for exigido na estreia, disponibilizar o cliente OAuth Web autorizado em Google Cloud. Callback do projeto principal `https://zwkhqahivthzivmuirjr.supabase.co/auth/v1/callback`. O segredo deve ser inserido diretamente na configuração do provedor Google no Supabase. [Instruções do Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google)
3. Disponibilizar aparelhos para câmera/QR, instalação e GPS e definir a loja autorizada para o piloto após o ensaio. A verificação de entregabilidade pode usar um domínio de remetente controlado pelo NortFood e autenticado conforme o Brevo. [Requisitos de autenticação do Brevo](https://help.brevo.com/hc/en-us/articles/12163873383186-Authenticate-your-domain-with-Brevo-Brevo-code-DKIM-DMARC)

**Veredito NO-GO.** A etapa de publicação fica depois da homologação hospedada da candidata, confirmação operacional da loja e autorização explícita do responsável.
