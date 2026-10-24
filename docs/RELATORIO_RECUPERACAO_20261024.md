# NortFood — resultado da recuperação em 24/10/2026

**Autenticação pública e pedidos reais continuam BLOQUEADOS. Não foi comprovada nenhuma criação de conta ou sessão Google no Supabase real.** O código foi corrigido, testado e publicado numa alternativa gratuita autorizada, preservando o site Netlify e o banco existente.

## Publicação comprovada

- Nova versão HTTPS: https://nortfood.pages.dev/ — HTTP 200, versão **64fed906fbed68b3a2e5**, fonte pública **4565f5741169070038649d19b6cce11224be31cb**.
- Projeto Pages nortfood, conta já autorizada; dois uploads estáticos do mesmo aplicativo e Supabase. Não houve troca de DNS, domínio comprado, novo banco ou alteração do UaiMove.
- 97 arquivos servidos conferidos por SHA-256 contra o build. Sete caminhos internos retornaram 404: ambiente, Git, fontes, relatório, backup, headers internos e rota inexistente. CSP, HSTS, MIME, cache e no-store conferidos por HTTPS.
- Pacote auditado: 98 arquivos, cerca de 23,1 MB; maior arquivo inferior a 2 MB. Nenhuma chave privilegiada ou fonte privada detectada. O arquivo de regras 404 específico do Netlify foi omitido no Pages; o 404.html nativo foi preservado.
- **https://nortfood.netlify.app/ não recebeu esta atualização.** Continua na versão ec43a56032d791cc5b34, fonte 61011c4. O último deploy de produção retornou “Skipped due to account credit usage exceeded”. Não foi tentado contornar a cota ou contratar créditos.
- GitHub atualizado em https://github.com/Rawanzin/NortFood/tree/release/nortfood. O [marcador oficial de omissão do deploy](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/#skip-a-deploy) evitou novas tentativas bloqueadas. A integração Git–Netlify continua ligada à branch correta; futuras publicações dependem da disponibilidade da conta.

## Causas efetivamente encontradas

1. O servidor Supabase tem disable_signup=true; novos usuários não podem ser criados, inclusive pelo Google. A disponibilidade da interface agora consulta também o estado do provedor de e-mail.
2. O Google continua com external.google=false. O endpoint real /auth/v1/authorize retornou **400 / validation_failed / provider is not enabled**. A informação de que as credenciais foram salvas não foi convertida em aprovação de funcionamento.
3. Google Cloud: cliente Web **NortFood Web** criado após autorização; o app permanece em **Teste, com zero usuários de teste**. Homepage, política e termos estavam vazios no branding; a publicação estava desabilitada. Campos reais e um único usuário nominal foram preparados, sem salvar nem publicar globalmente. **Correção da interpretação em nova investigação:** isso não comprova um bloqueio do login básico. A documentação oficial do Google permite acesso em teste sem allowlist quando são solicitados somente openid, e-mail e perfil; branding verificado é recomendado, não requisito para esse teste. O erro efetivamente observado continua sendo o provedor desligado no Supabase. Fonte: https://developers.google.com/identity/protocols/oauth2/production-readiness/overview.
4. Resend: login e aceites autorizados concluídos; **nenhum domínio verificado**, nenhuma API key criada. SMTP personalizado continua ausente. O serviço padrão do Supabase é restrito e não foi tratado como envio público operacional. Não foi inventado um From nem usado Gmail como remetente.
5. A produção Netlify estava servindo código anterior às correções, devido ao bloqueio de crédito. O deploy preparado localmente e o site oficial não eram a mesma versão.
6. O cadastro não cobria os campos completos pedidos na última ordem. Agora há telefone e endereço no cliente, além de loja e categoria real no vendedor; a conclusão passa por RPC autenticada e idempotente. Botões indisponíveis fornecem feedback, sem criar contas falsas.

## Correção dos cadastros

Clientes: nome, e-mail, senha escolhida e confirmação, telefone, rua, número, bairro, cidade, UF e consentimento; complemento e referência opcionais. Vendedores: responsável, loja, telefone comercial, categoria ativa real e endereço, além dos campos de acesso. Foram preservados Pedir/Vender, campos de senha visível, validação junto ao campo, estados de carregamento e bloqueio de envio repetido.

Dados pendentes ficam por até 24 horas na sessão da aba, sem senha, vinculados à identidade antes da conclusão automática. O endereço definitivo só é gravado após autenticação. Confirmação em outro navegador pode exigir completar os campos novamente; o usuário conclui na conta existente, sem novo signUp obrigatório.

Falha ao concluir a loja mantém a conta válida e oferece retomada. A loja nasce em rascunho e pausada. Funções não concedem administração por metadados ou nome/e-mail informado. Endereços existentes e informações oficiais da Dan Burguer são preservados.

## Banco remoto e recuperação

- Destino confirmado: **zwkhqahivthzivmuirjr**, NortFood, main/Production, Free. Não foi utilizado o projeto isolado de homologação.
- Migrações 001–010 já registradas foram apenas verificadas. **Somente 011 — complete_onboarding foi aplicada**, transacionalmente e com guardas contra destino incorreto ou reaplicação.
- A 011 acrescenta recibo privado de conclusão, categoria principal, RPC de conclusão atômica, preservação da edição da loja e requisito de contato/termos antes de inserir pedidos. Não altera o mecanismo existente de preços, adicionais, frete e idempotência do checkout.
- Antes: checkpoint checkpoint/recuperacao-cadastros-20261024 → 0a44afb; backup privado de 32 tabelas, funções e políticas. SHA-256 do backup: c4c94f8873ad683831f86db5f080b3398a3891892b6072f2f941778d18cae99e.
- Depois: comparação integral dos registros das 32 tabelas confirmou **dados iguais**, descontada apenas a nova coluna nula. Dan Burguer: **1 loja, 46 produtos, 20 grupos e 220 opções**. Não houve reinserção do cardápio, duplicação ou exclusão.
- Zero tabelas de aplicação sem RLS; RPC nova negada a anônimos e permitida ao papel autenticado. Negativa remota comprovada: HTTP 401, PostgreSQL 42501. O isolamento positivo entre duas contas reais permanece pendente de Auth.
- Ainda há **zero usuários, perfis e administradores reais**. O e-mail indicado para administração não recebeu privilégios. O convite de propriedade da Dan permanece condicionado à identidade verificada.
- Reversão do frontend: checkpoint/commit anterior ou pacote anterior validado. No Pages, preservar o upload inicial/URL de versão e o ZIP auditado para republicação. Não restaurar o banco inteiro nem apagar migração registrada; uma eventual correção de banco deve ser incremental, preservando dados novos.

## Matriz de homologação

| Verificação | Classificação | Evidência e limite |
|---|---|---|
| Suíte completa do código final | APROVADO | **161/161**, zero falhas; inclui PostgreSQL local, RLS, checkout, sessões, formulários, mapa, temas e PWA |
| Sintaxe, arquitetura, builds e auditoria de publicação | APROVADO | 131 arquivos de sintaxe, 19 módulos sem ciclos/violações; builds Netlify e Pages aprovados |
| Interface Auth em HTTPS publicado | APROVADO | 19 verificações: oito larguras 320–1365 px, cliente/vendedor, campos, senha incorreta, retorno inválido e recuperação visual; zero erros JS |
| Categorias, temas, logo, mapa, responsividade e PWA em HTTPS | APROVADO | 18 verificações, categorias reais do backend, busca manual e tiles HTTPS; não comprova GPS físico |
| Integridade dos arquivos públicos e proteção dos internos | APROVADO | SHA-256 de 97 arquivos e sete respostas 404; headers conferidos |
| SW e cache como visitante real | APROVADO | Chrome/HTTPS, worker ativo e cache sem config.js, Supabase/Auth/REST; nenhum tráfego autenticado foi simulado como real |
| Atualização do PWA entre os dois deploys | APROVADO | Aba IAB permaneceu aberta: aviso real, formulário sintético preservado até a decisão, Atualizar acionado, retorno à home e tema conservado |
| Driver CLI inicial do teste entre deploys | REPROVADO | Canal stdin foi fechado e houve timeout de infraestrutura; ensaio foi repetido pela interface IAB real, com evidência própria |
| Cadastro cliente/vendedor com confirmação e sessão real | PENDENTE | Servidor bloqueia novos usuários; não houve teste positivo no Supabase remoto |
| Google completo com sessão válida e reentrada | PENDENTE | Provedor desativado e público de teste vazio; abrir seletor não foi considerado sucesso |
| E-mail de confirmação, recuperação e alteração | PENDENTE | Resend sem domínio e SMTP; templates locais preparados, não ativos remotamente |
| Edição remota por vendedor e isolamento entre contas reais | NÃO TESTADO | Testes SQL locais passaram; faltam identidades remotas autorizadas |
| Pedidos reais, recebimento pelo vendedor, chat e notificações | NÃO TESTADO | Piloto permanece desligado; suítes locais/controladas não equivalem a homologação comercial |
| WhatsApp comercial da Dan | PENDENTE | Telefone informado incompleto/não confirmado; WhatsApp cadastrado vazio; nenhuma mensagem enviada |
| Instalação física Android/iPhone, GPS físico e sessão autenticada após update | NÃO TESTADO | Manifest, SW, contratos e instrução iOS preparados; não havia aparelho/conta real para comprovação |

Evidências em test-results/recovery-20261024/, test-results/auth-definitive/pages/ e test-results/public-pilot-20261023/pages/. Os relatórios distinguem contratos controlados de requisições ao ambiente real.

## Performance e carga

Lighthouse **13.5.0** na URL pública final: desempenho **67**, acessibilidade **100**, boas práticas **100**, SEO **69**. Uma medição móvel laboratorial, sem dados de campo. LCP 6.4 s; bloqueio total 194 ms. Otimização de imagens, JS e caminhos de renderização continua pendente. A nota SEO reflete a indexação intencionalmente bloqueada enquanto a operação não está homologada.

Carga equivalente executada **somente em loopback**, GET / estático, cinco segundos por nível, sem navegador, Auth, PostgreSQL, checkout, Netlify ou Supabase. Cliente e servidor dividem o mesmo processo/hardware. Os resultados não provam capacidade comercial:

| Leitores sintéticos | p50 ms | p95 ms | p99 ms | Respostas/s | Erros | CPU ms / RSS MiB |
|---:|---:|---:|---:|---:|---:|---:|
| 50 | 21.08 | 34.68 | 47.04 | 2160.17 | 0 (0.00%) | 5453 / 87 |
| 100 | 36.69 | 48.83 | 68.12 | 2608.53 | 0 (0.00%) | 5250 / 122 |
| 250 | 90.39 | 149.61 | 273.7 | 2466.91 | 0 (0.00%) | 4953 / 153 |
| 500 | 172.53 | 231.15 | 300.95 | 2761.21 | 36 (0.26%) | 4860 / 217 |
| 1000 | 1314.94 | 2604.68 | 2851.05 | 541.73 | 4335 (58.64%) | 3234 / 255 |

Houve ECONNREFUSED em 500 e 1.000; a causa exata da recusa local não foi isolada. **Nenhum patamar de usuários comerciais simultâneos foi validado.** Não foi aplicada carga à infraestrutura gratuita remota ou contratado escalonamento.

## Pendências e participação indispensável

1. **Entrada protegida de credenciais:** no Google/Supabase já aberto, concluir ativação de Enable Sign in with Google e Save, mantendo nonce e e-mail ausente desabilitados. A regra de segurança da ferramenta exige que o usuário conclua entrada e submissão de novas credenciais. Não enviar segredo no chat.
2. **Autorização de configuração:** pedido enviado para adicionar apenas as duas URLs raiz exatas do Pages ao retorno do Supabase e, após verificar Google ativo, permitir novos usuários somente pelo Google. E-mail seria temporariamente desativado antes de abrir novos cadastros; confirmação de e-mail, RLS e piloto bloqueado seriam preservados. Nada disso foi salvo sem resposta.
3. **Google Cloud:** pedido enviado para salvar os links públicos e domínio do Pages no branding e incluir somente kevenrawan@gmail.com como teste. App não foi publicado globalmente. Formulários preparados e mantidos para retomada.
4. **E-mail público:** precisa de domínio controlado e remetente verificado no Resend; nenhum domínio foi fornecido. Uma eventual chave será inserida em fluxo protegido. Não houve contorno, Gmail como From ou compra de domínio. O Google pode ser homologado separadamente se as autorizações acima forem atendidas.
5. **Comércio:** confirmar WhatsApp válido, responsável autenticado, cobertura/frete ou retirada, pagamentos, disponibilidade e dados do proprietário. A Dan segue draft/pausada, produtos indisponíveis e piloto false. Preços de sucos, restrições etárias e regra de troca continuam pendentes conforme fornecido. Após isso ainda é obrigatória a homologação real dos pedidos antes da liberação.

## Custos e serviços

Foram usados o Supabase existente, o GitHub autorizado, Netlify existente, Cloudflare Pages gratuito autorizado e a conta Resend autorizada. Não houve cartão, compra, recarga, upgrade, domínio comprado ou serviço pago contratado. O bloqueio de publicação Netlify e a ausência de remetente no Resend continuam relevantes. Limites devem ser conferidos antes de campanha ou expansão; nenhuma capacidade/isenção futura ilimitada foi prometida.

## Arquivos alterados

- .gitignore
- app.js
- assets/nortfood-backend.js
- docs/DEPLOY_PUBLICO.md
- docs/RECUPERACAO_CADASTROS_20261024.md
- docs/RESEND_AUTH_PREPARACAO_20261023.md
- package.json
- scripts/build-output.cjs
- scripts/build.cjs
- scripts/verify-auth-browser.cjs
- scripts/verify-public-pilot.cjs
- src/application/snapshot.js
- src/backend.js
- src/commercial.js
- src/platform/onboarding-draft.js
- styles.css
- supabase/migrations/202610240011_complete_onboarding.sql
- tests/auth-lifecycle.test.cjs
- tests/auth-ui.test.cjs
- tests/complete-onboarding.test.cjs
- tests/dan-catalog.test.cjs
- tests/database-fresh.test.cjs
- tests/database.test.cjs
- tests/location-finance.test.cjs
- tests/qr-tables.test.cjs
- tests/signup-entry.test.cjs
- tests/ui-contract.test.cjs

Os relatórios, backups, ZIPs, inventários e telas protegidas ficam fora do pacote público. O GitHub recebeu somente a árvore pública sanitizada; o histórico privado não foi enviado.
