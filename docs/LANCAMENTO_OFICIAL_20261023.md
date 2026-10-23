# NortFood — lançamento público de 23/10/2026

**Site público/PWA: APROVADO no escopo de apresentação, sem cadastros e pedidos comerciais.**
**Operação comercial: PENDENTE / NÃO LIBERADA.** Não existe loja no principal; nenhuma foi escolhida, cadastrada ou aprovada automaticamente. As funcionalidades comerciais permanecem no código.

## Publicação

- URL oficial verificada: https://nortfood.netlify.app.
- Netlify Free, projeto `3bca8094-c54e-416c-89d8-bec51a3d252e`, deploy publicado `6adb1c5e60efcec27343ee88`.
- HTTPS real com certificado aceito e redirecionamento HTTP → HTTPS: APROVADO. O certificado do subdomínio Netlify dispensa compra de domínio.
- Código atual: https://github.com/Rawanzin/NortFood/tree/release/nortfood, commit `7071079393054844eb80c090a426c0f71cad819f`.
- Build automático: APROVADO. Pushes controlados atualizaram produção e o commit foi conferido em /release.json. Somente release/nortfood é branch de produção. A branch principal antiga não substituiu os arquivos locais.
- Integração: webhook oficial Netlify para eventos push e chave SSH de leitura restrita a NortFood. Nenhum token administrativo foi publicado ou entregue ao frontend.
- Pipeline remoto executa sintaxe, 30 testes de serviços/sessão/cache, arquitetura, build e auditoria do pacote. Diretório publicado: dist, 89 arquivos públicos; fontes, ambientes, relatórios internos, backups e banco ficam fora.
- Release pública: `ae3928efb4bf524718ea`. Evidências: [deploy](../test-results/launch-20261023/official-deployment.json), [release](../test-results/launch-20261023/published-release.json), [HTTP/HTTPS](../test-results/launch-20261023/https-official.json), [integração](../test-results/launch-20261023/git-netlify-integration.json).
- A prévia antiga de homologação continua privada: HTTP 401 anônimo. Não foi convertida no ambiente público.

## Aplicativo

- Manifesto estável NortFood, standalone, escopo e início /, ícones oficiais 192/512 e maskable, Apple Touch e favicons. /site.webmanifest é a fonte; /manifest.webmanifest também é publicado.
- Android/Chrome: instalabilidade técnica validada em Chromium; usar Instalar quando o navegador oferecer. Instalação em aparelho Android físico: NÃO TESTADO.
- iPhone/iPad: Safari → Compartilhar → Adicionar à Tela de Início. Instrução contextual implementada; instalação física/Safari real: NÃO TESTADO.
- Convite fechado/cancelado é adiado por 30 dias quando o armazenamento do navegador está disponível. O modo standalone não recebe convite.
- SW versionado pelo conteúdo; atualização oferecida por botão, sem recarregar automaticamente um formulário ocupado. O aviso foi observado e aplicado na URL oficial. CacheStorage e ciclo offline/atualização foram testados em Chromium local real; inspeção interna de CacheStorage no navegador integrado remoto não estava disponível.
- HTML usa rede com fallback offline.html; CSS/JS/imagens usam rede antes do cache. Supabase, tokens, configuração, JSON, respostas autenticadas/privadas e pedidos ficam fora do cache. Não há checkout offline nem fila automática de pedidos.
- A tela pública aparece antes do download completo do SDK. Testes mantiveram o SDK suspenso e comprovaram o shell visível; falha de carregamento libera uma tentativa real de recarga. Compatibilidade file:// preservada com orientação ao servidor.

## Backend e operação

| Item | Classificação | Evidência e limite |
|---|---|---|
| Conexão Supabase principal e catálogo anônimo | APROVADO | GET/RPC real; catálogo vazio, sem dados demonstrativos públicos |
| Histórico de migrações 001–007 | APROVADO | Sete versões registradas, consultadas em transação somente leitura; nenhuma reaplicada |
| Metadados de RLS/índices/restrições | APROVADO | 28 tabelas, 55 índices, 31 políticas; zero tabelas sem RLS, índices inválidos ou restrições não validadas |
| Acesso anônimo a perfis/pedidos/mensagens/administração | APROVADO | Respostas remotas negadas; não substitui teste entre duas contas |
| Novos cadastros bloqueados no servidor | APROVADO | disable_signup=true; confirmação por e-mail permanece exigida; contas existentes não foram apagadas |
| Site URL e retornos Auth | APROVADO (configuração) | Origem oficial e duas variantes exatas na allowlist; retornos locais anteriores preservados, sem wildcard |
| SMTP externo, confirmação e recuperação reais | PENDENTE | SMTP próprio desativado no principal. Capturas de sandbox antigas não comprovam entrega externa |
| Login/logout, persistência de sessão e isolamento remoto entre contas | NÃO TESTADO nesta execução | Regressões locais aprovadas; falta ensaio autenticado autorizado na origem oficial |
| Storage privado e limites | APROVADO (metadados/negação) | PNG/JPEG/WebP, 1 MiB; POST sem identidade negado. Upload/leitura assinada com vendedor real: PENDENTE |
| CORS da função upload-media | APROVADO | Origem oficial 200; origem arbitrária e localhost antigo 403; somente APP_ORIGIN foi alterado |
| Realtime | APROVADO (configuração), PENDENTE (autenticado) | Quatro tabelas publicadas; conexões de convidados eliminadas; evento real entre contas não foi repetido |
| Checkout/preços/adicionais/frete/idempotência | APROVADO local, PENDENTE comercial remoto | PostgreSQL isolado e UI sintética; nenhuma compra foi criada no principal |
| Gestão da loja/produtos/pausa/status/comissões | APROVADO local, PENDENTE operacional | Funções existentes preservadas e testes locais executados; falta loja autorizada |
| Chat, favoritos, avaliações e notificações | APROVADO local, NÃO TESTADO remoto nesta execução | Não foram tratados como fluxos comerciais homologados |
| Loja piloto | PENDENTE | Principal com zero lojas; aprovação nominal e dados oficiais dependem do responsável |
| Pedidos comerciais | PENDENTE / BLOQUEADO | pilot_enabled=false no servidor; interface também mantém publicPreview=true |
| WhatsApp | APROVADO local, PENDENTE loja real | Usa número formatado de loja aprovada e total persistido; nenhum envio foi efetuado |

WhatsApp só aparece para pedido persistido e loja aprovada com número válido. O link inclui identificação, loja, itens/adicionais, total e pagamento. Endereço e observações pessoais ficam fora da URL; o usuário pode escolher copiar o resumo completo. Abrir/copiar não confirma envio, leitura, recebimento ou aceite. Supabase permanece como registro do pedido; aguarda-se aceite no NortFood.

Evidências: [auditoria SQL](../test-results/launch-20261023/backend-audit-readonly.json), [Auth](../test-results/launch-20261023/auth-public-settings.json), [CORS](../test-results/launch-20261023/upload-cors.json). Somente metadados/configuração foram modificados remotamente; nenhum usuário, pedido, produto ou estabelecimento foi apagado e nenhuma migração foi aplicada.

## Qualidade e limites

| Verificação | Classificação | Resultado real |
|---|---|---|
| Suíte automatizada local | APROVADO | 142 testes, zero falhas; PostgreSQL isolado, regressões de sessão/checkout/UI/SW |
| Fluxos locais de demonstração | APROVADO | 107 verificações; dados sintéticos exclusivamente para teste |
| Sintaxe e arquitetura | APROVADO | pnpm lint valida sintaxe; esbuild verifica os módulos; zero ciclos/violações. Não existe lint de estilo/semântica completo configurado |
| Dependências | APROVADO no audit executado | Zero avisos no pnpm audit, inclusive dependências de desenvolvimento; não é garantia de ausência de vulnerabilidades |
| HTTP/HTTPS da URL oficial | APROVADO | 36/36 verificações, incluindo arquivos privados 404 e upload anônimo negado |
| Responsividade pública | APROVADO no recorte | 320, 360, 390, 430, 768 e 1365 px sem overflow; busca, carrinho vazio e bloqueio de cadastro verificados |
| Console e acessibilidade automatizada | APROVADO no recorte | Zero erros no console final; Lighthouse acessibilidade 100, boas práticas 100 |
| Performance mobile de laboratório | PENDENTE de evolução | Lighthouse 77; LCP 4.87 s; FCP 1.56 s; TBT 135 ms; CLS 0 |
| SEO | PENDENTE de indexação | Título/canonical/OG/imagem/robots/sitemap/404 preparados; noindex e sitemap vazio mantidos durante apresentação sem operação; Lighthouse 69 |
| Compartilhamento em WhatsApp/Instagram | NÃO TESTADO nos aplicativos externos | Metadados e imagem pública verificados por HTTPS; não foi alegada uma prévia real nesses aplicativos |
| Dispositivos físicos, teclado real e tecnologia assistiva | NÃO TESTADO | Viewports em Chromium não equivalem a Android/iPhone/Safari ou leitor de tela físico |

A comparação pareada da otimização registrou prévia 90/LCP 3,45 s e versão anterior 81/LCP 4,46 s. Na URL oficial otimizada, a amostra final acima variou; não se promete a melhora da prévia como SLA nem se declara aprovação de Core Web Vitals de campo. Persistem custos de renderização e sincronização inicial a evoluir.

Resultados: [suíte](../test-results/launch-20261023/complete-final-suite.txt), [107 fluxos](../test-results/launch-20261023/complete-final-demo.txt), [Lighthouse final](../test-results/launch-20261023/lighthouse-release.report.html), [métricas finais](../test-results/launch-20261023/performance-release.json), [imagem mobile](../test-results/launch-20261023/nortfood-publicado-mobile.jpg).

## Carga efetivamente executada

Homologação isolada: 50 leitores HTTP anônimos, um GET de catálogo por segundo por leitor, dez rodadas, 500 respostas, 0 erros, 49.87 respostas/s. p50 45.57 ms, p95 266.24 ms, p99 566.14 ms. Piloto bloqueado e catálogo vazio foram exigidos antes do ensaio. Nenhuma escrita, conta, upload, pedido ou socket foi criado. Consumo de CPU/RAM do serviço remoto: NÃO MEDIDO. [Evidência](../test-results/launch-20261023/load-homologation-readonly.json).

No servidor estático em loopback, processo conjunto de cliente e servidor, GET / sem Auth/banco/Realtime, por aproximadamente cinco segundos por nível:

| Clientes HTTP | p50 ms | p95 ms | p99 ms | Erros | Respostas/s | CPU do processo ms | Pico RAM MiB |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 50 | 16.17 | 20.94 | 26.79 | 0.00% | 2961.48 | 6999 | 89 |
| 100 | 29.94 | 34.08 | 38.51 | 0.00% | 3318.87 | 7016 | 121 |
| 250 | 73.34 | 80.83 | 93.23 | 0.00% | 3361.85 | 7938 | 153 |
| 500 | 144.28 | 156.22 | 216.86 | 0.21% | 3386.6 | 7155 | 183 |
| 1000 | 293.68 | 917.2 | 1456.42 | 26.51% | 2321.09 | 6970 | 258 |

Até 250 conexões locais não houve erro. Em 500 e 1000 houve ECONNREFUSED: patamares REPROVADOS nesse ensaio. O primeiro ensaio, que também tinha uma suíte em paralelo, foi preservado separadamente; a tabela usa a execução controlada posterior, com contabilização de erros e backlog ampliado. [Resultado local](../test-results/launch-20261023/load-local.json).

**Não foi validada capacidade de 1000 usuários comerciais simultâneos.** Níveis remotos 100/250/500/1000: NÃO TESTADOS. Os 50 leitores de catálogo não equivalem a clientes fazendo pedidos. O [Free do Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase) inclui 200 conexões Realtime de pico; isso precisa ser considerado antes de crescer. Convidados não abrem Realtime, polling para abas em segundo plano é suspenso e trocas de identidade liberam timer/canal anteriores.

## Custos e recuperação

- Netlify e Supabase permanecem Free; nenhuma compra, cartão, domínio, upgrade, recarga automática ou serviço pago foi contratado nesta execução. GitHub utiliza o repositório público existente. Lighthouse e testes foram executados localmente.
- [Netlify Free](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/): 300 créditos mensais compartilhados, limite rígido e sem recarga automática. [Publicação de produção bem-sucedida](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/) consome 15 créditos; prévias não têm essa cobrança de deploy. Atingir limites pode suspender o serviço. Os créditos da conta já eram compartilhados com outros projetos.
- [Supabase Free](https://supabase.com/docs/guides/platform/billing-on-supabase): banco 500 MB, Storage 1 GB, egress 5 GB, 50 mil MAU, 500 mil invocações Edge e 200 conexões Realtime de pico. Monitorar o painel antes de campanhas; não foi contratado aumento de cota nem prometida disponibilidade de produção.
- Possíveis despesas futuras, somente mediante decisão humana: SMTP operacional, domínio opcional ou maior infraestrutura. Nenhuma foi aceita agora.
- Checkpoint inicial local 1bb5b75, tag checkpoint/launch-source-20261023; checkpoint público estável f2f530f, tag checkpoint/public-pwa-before-startup-optimization. [Plano de recuperação](LANCAMENTO_RECUPERACAO.md).
- Primeiros builds remotos falharam na configuração de acesso Git e porque a seleção inicial da branch pública omitiu pnpm-workspace.yaml. Foram corrigidos com chave de leitura e inclusão da política existente do esbuild. Builds posteriores concluíram; falhas permanecem no histórico.
- Um ref interno do Codex com conteúdo inteiramente nulo impedia git fetch. Foi movido, após verificação do caminho/conteúdo, para backup privado; branches/tags úteis não foram removidas.
- Reverter frontend pelo deploy Netlify anterior f2f530f / 6adb1780dd9bc46493fd3a69 e reverter o commit correspondente em release/nortfood. Não restaurar banco nem reaplicar migrações. APP_ORIGIN anterior era localhost:4173; sua mudança não afeta dados. Cadastros só devem ser reabilitados após a aprovação operacional.

## O que depende do responsável

1. Identificar a única loja autorizada, responsável e conta administrativa operacional, WhatsApp oficial, cardápio/preços, horários, formas de pagamento e cobertura reais. Não adotar uma fixture como loja real.
2. Disponibilizar provedor/remetente de e-mail autorizado por fluxo protegido e confirmar identidade/contato do operador, termos/privacidade e condições comerciais. Não enviar senhas ou chaves pelo chat.
3. Permitir ensaio com contas autorizadas e aparelhos reais. A partir desses dados, concluir Auth/e-mail, isolamento entre contas, upload, Realtime, checkout/recebimento/status/chat e contingência na origem oficial. Só após aprovar os testes críticos reabilitar cadastro e autorizar o piloto no servidor.

O endereço público já está funcional. A publicação não constitui autorização para receber pedidos reais.
