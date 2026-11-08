# NortFood — revisão funcional e auditoria de segurança, 01/11/2026

Frontend publicado e verificado; testes locais e auditoria de segurança concluídos dentro do alcance descrito. **Pedidos comerciais continuam bloqueados; backend autenticado e Android físico não foram homologados.**

## Escopo e preservação

Foi utilizado o projeto existente em `C:\Users\keven\Documents\NortFood`; a pasta inicialmente anexada à conversa não continha os arquivos da aplicação. As modificações anteriores foram preservadas. A arquitetura HTML/CSS/JavaScript, esbuild e Supabase, os formulários completos e a identidade do NortFood foram mantidos.

Os ensaios de autorização usam PostgreSQL WASM descartável, papéis SQL reais e pessoas/lojas/pedidos fictícios. Os testes Chrome usam a aplicação e, conforme o teste, SDK/decoder reais com transporte controlado. As consultas ao Supabase hospedado são GET/OPTIONS e usam `limit=0` nas tabelas privadas. Não houve teste de força bruta, DDoS, acesso a dados privados de terceiros ou ataques à infraestrutura compartilhada.

Nenhum banco remoto, conta, loja, produto, pedido ou comissão comercial foi alterado. Nenhum pedido real foi criado. A Dan Burguer foi preservada por ausência de mutações; não foi feita uma leitura dos seus registros privados para afirmar uma nova contagem do catálogo. O backup inicial local está em `backups/etapa10-20261031-initial/`. O pacote público anterior foi preservado e conferido por SHA-256 em `backups/etapa10-20261031-public-before/`, com 113 arquivos. Não foi aplicado SQL remoto; o backup atual do banco é requisito pendente antes de qualquer migração.

## Funcionalidades verificadas

| Área | Evidência executada / resultado | Limite operacional |
| --- | --- | --- |
| Cadastro completo, login/logout e confirmação | Suites de Auth, SDK real, formulários, callbacks e onboarding isolado; isolamento entre identidades e erro expirado tratados. | SMTP, recebimento/consumo de mensagem real e aceitação autenticada hospedada não foram homologados. |
| Recuperação de senha | Corrida reproduzida antes do ajuste com SDK consumindo o callback antes de `initialize`; correção passou 33 testes Auth e 4 negativos/concorrentes. SDK real verificou PUT da senha, rejeição da antiga e aceite da nova com transporte controlado. | Não considerar troca de senha remota aprovada sem repetir a aceitação no serviço hospedado. |
| Google | Configuração pública hospedada consultada no principal e na homologação. | Provedor permanece desativado nos dois ambientes; OAuth positivo pendente. |
| Perfil, foto e endereços | Suites de perfil/avatar, decoder WASM, armazenamento privado e formulários completos. GPS e permissões simulados no navegador, sem gravar endereço remotamente. | Avatar RPC e função não estão disponíveis remotamente; GPS físico e upload hospedado pendentes. |
| Busca, categorias, cardápio, adicionais e carrinho | Testes de interface, personalização, substituição de carrinho, histórico e pedir novamente. | Catálogo público real está vazio; não há prova de jornada comercial autenticada hospedada. |
| Pedidos, preços e comissões | SQL transacional isolado: total recalculado no servidor, idempotência, estados válidos, relatórios, histórico e proteção de campos financeiros. | Não houve pagamento real ou operação de conciliação. Campos forjados não confirmam pagamento; não foi homologado um provedor automático de pagamento. |
| Conversas e notificações | Isolamento de chat/notificações e ciclo de Realtime/polling no código/testes locais. | Recebimento entre aparelhos, alerta de operação e Push com app fechado não foram comprovados. |
| Vendedor e administração | SQL/UI cobrem vínculos, produtos, adicionais, horários/pausa, áreas/taxas, pedidos, relatórios, comissões, QR/mesas e operações administrativas. | Não houve sessão positiva de vendedor/admin no backend remoto nesta rodada. |
| Responsividade e temas | Chrome real em resoluções de celular/tablet/desktop, temas claro/escuro, contraste, formulários, mapa e menus. | Emulação não substitui aparelho físico nem teclado/GPS nativos. |
| PWA e atualização | Manifesto, ícones, primeira pintura, cache público, troca de versão, preservação de formulário e fallback offline. | Splash e botões Android nativos exigem verificação física após atualização/reinstalação. |

## Correções e melhorias

- Splash: `background_color` e `theme_color` brancos; símbolo oficial vermelho centralizado nos ícones comuns/maskable e Apple. A origem é a logo existente, com hashes em `docs/APP_ICON_SOURCE.json`. A primeira pintura web começa branca; não foi adicionada uma tela artificial de espera.
- Barra Android: o documento solicita branco no claro e preto no escuro por `theme-color`, `color-scheme` e safe areas. A escolha salva e mudanças de sistema/abas são acompanhadas. O navegador/Android controlam a aparência final dos botões, scrim e transparência; nenhum resultado físico foi declarado.
- Vendedor: dois switches independentes de entrega/retirada, confirmação do servidor e trava contra cliques simultâneos. A RPC altera somente essas modalidades, sem reenviar preços/áreas/horários. Carrinho e observações são preservados quando a disponibilidade muda; o checkout exige modalidade válida.
- Auth: ID duplicado de erro corrigido e limpeza do callback adiada até o backend capturar seu erro. A validação das duas ordens de carregamento e da falha do loader foi executada. A recuperação agora preserva a intenção perdida pelo listener apenas após validar o token exato com `getUser(token)`, conferir sessão/IDs e e-mail confirmado e recusar resultado tardio de outra revisão de identidade. O token é descartado e a intenção consumida uma única vez. A revisão independente não encontrou bypass introduzido. A falha anterior foi reproduzida deterministicamente; o teste não teve seu prazo ampliado.
- Segurança: migração 015 preparada e retestada localmente para reserva de nome no cadastro legado e autorização anterior à verificação de versão do pedido. Detalhes e gravidades estão na tabela abaixo.
- Documentação: o destino oficial passou a ser exclusivamente Cloudflare Pages, com reversão por pacote validado; instruções antigas de publicação Netlify deixaram de ser o procedimento atual.

### Entrega e retirada: quatro combinações

Entrega+retirada, somente entrega, somente retirada e ambas desativadas foram exercitadas em SQL isolado. Cliente, anônimo e vendedor de outra loja não conseguem alterar as modalidades. Chamadas diretas de pedidos rejeitam a modalidade desativada; ambas desativadas suspendem novos pedidos, inclusive presenciais, sem interromper os anteriores. Taxas, horários, catálogo e histórico são preservados.

O teste Chrome usa duas páginas e transporte local controlado: verifica switches, rejeição no checkout, conservação do carrinho/observações e fallback explícito quando a nova RPC não existe. Os atalhos não têm persistência hospedada comprovada antes de a migração 014 ser aplicada e validada.

Visitantes usam atualização periódica de até 60 segundos; autenticados têm inscrição Realtime e polling de contingência. A entrada no checkout e a troca de modalidade consultam novamente o catálogo. Não foi comprovada atualização instantânea entre visitantes em dispositivos distintos. Pedidos diretos dependem da validação do servidor, independentemente da velocidade da vitrine.

Evidências: `test-results/etapa10-20261031/fulfillment/browser-results.json`, `seller-both-disabled-mobile.png`, `checkout-disabled-cart-preserved.png` e `browser-retest-20261101.tap`. Detalhes: `docs/ENTREGA_RETIRADA_20261031.md`.

## Resultados consolidados

| Validação | Resultado final | Evidência |
| --- | --- | --- |
| Suíte funcional completa | **228/228 aprovados**, zero falhas/cancelamentos/ignorados | `test-results/etapa10-20261031/functional-final.log` |
| Fluxos em Chrome | 107 verificações aprovadas | `demo-final.log` |
| Sintaxe | 164 arquivos, zero falhas | `syntax.log` |
| Arquitetura | 24 módulos, zero ciclos/violações | `architecture.log` |
| Ataques SQL/XSS e segurança complementar, por último | **52/52 aprovados**, zero falhas; repetidos após a aceitação HTTPS com o mesmo resultado | `security/security-final-after-functional.tap`, `security/security-final-after-https.tap` |
| Dependências | Zero advisory em 121 dependências, repetido após a suíte funcional | `security/pnpm-audit.json` |
| Segredos no código atual | 311 arquivos, zero ocorrências nos padrões consultados, repetido após a suíte funcional | `security/secrets.json` |
| Build e pacote Pages | Build aprovado, 117 arquivos sem achados, incluindo correção de recuperação | `build-pages.log`, `public-package.json` |
| Semgrep / ZAP | Não disponíveis nos caminhos consultados; não executados | `security/tools.json` |
| Publicação, bytes e navegador HTTPS | Principal e prévia: **120/120 checks de arquivos/status e 18/18 cenários Chrome aprovados**, zero erros JavaScript | `production-package.json`, `production-browser.json`, equivalentes `preview-*` |
| Verificação operacional ampliada | **38/40 aprovados**; dois checks de upload reprovados por CORS 403, não marcados como sucesso | `production-operational.json` |

Os logs das execuções que falharam são mantidos: o contrato antigo de ícone vermelho foi substituído pelo requisito branco e retestado; a falha intermitente de recuperação de senha foi investigada separadamente. Aprovação de um reteste não apaga a evidência anterior.

## Relatório de segurança

| Vulnerabilidade | Gravidade | Área afetada | Correção | Reteste | Risco residual |
| --- | --- | --- | --- | --- | --- |
| Cadastro legado permite homônimo de nome reservado, sem conceder controle da loja verdadeira. | Média | RPC `nf_request_store` | Migração 015 aplica a comparação normalizada de nomes reservados também nesse caminho. | **Aprovado local** na rodada final; falha reproduzida antes do ajuste | Validar/aplicar a migração remota após backup; o estado SQL hospedado não foi certificado. |
| A diferença de erro na versão permite distinguir UUID de pedido existente. | Baixa | RPC `nf_transition` | Migração 015 autoriza o titular/membro antes de comparar versão; pedido alheio/inexistente retorna a mesma recusa. | **Aprovado local** na rodada final; falha reproduzida antes do ajuste | Migração remota pendente; a falha não demonstrou leitura de detalhes ou alteração de pedido alheio. |

O relatório detalhado `docs/SEGURANCA_ETAPA10_20261031.md` contém inventário de RLS/ACL/funções/buckets, testes de preços/descontos/frete/comissão/pagamento, uploads inofensivos, sessões, SQLi/XSS/CSRF e mapeamento [OWASP Top 10 2025](https://top10.owasp.org/2025/) / [ASVS 5.0.0](https://asvs.owasp.org/). Não representa certificação nem comprovação de todos os requisitos ASVS.

As identidades SQL simulam claims para testar autorização; não testam assinatura/revogação real de JWT, gateway Supabase, SMTP ou OAuth. A busca de segredos usa padrões delimitados no código atual, sem varredura de todo o histórico Git/entropia. A auditoria de dependências depende das bases consultadas e não certifica todos os ativos vendorizados. Nenhum pentest garante um sistema 100% invulnerável.

## Supabase hospedado e bloqueios comerciais

Leitura em 01/11/2026, principal e homologação, registrada em `backend-readonly.json`:

- Cadastro por e-mail habilitado e confirmação obrigatória; Google desativado.
- Piloto desativado e catálogo público vazio.
- Acesso anônimo recusado nas tabelas/RPCs privadas consultadas, sem ler registros pessoais.
- RPC de avatar retorna 404; `profile-avatar` retorna 404; preflight de `upload-media` pelo Pages retorna 403.
- Sem sessão CLI administrativa Supabase disponível. O controle do navegador bloqueou a inspeção do painel por não conseguir determinar a URL atual com segurança; a tentativa foi interrompida, sem contornar o bloqueio.

Esses resultados não provam autorização positiva/negativa entre contas fictícias no serviço hospedado. Essa aceitação exige ambiente de homologação configurado e acesso administrativo válido.

O roteiro concreto para fechar as pendências é `docs/OPERACAO_SUPABASE_PENDENTE_20261101.md`: confirmar histórico/identidade dos projetos, backup fresco verificável, aplicar somente migrações pendentes 013–015, implantar funções/corrigir CORS Pages, configurar templates/allowlist/Google e executar aceitação autenticada fictícia em homologação. Não executar bootstrap nem reaplicar o lote histórico 002–007.

## Publicação e origem do pacote

Publicação concluída no projeto Cloudflare Pages existente `nortfood`, branch `main`, exclusivamente por Direct Upload:

- Principal: [https://nortfood.pages.dev](https://nortfood.pages.dev).
- Release do conteúdo: **`c64b4e442beb444a7d7e`**.
- Deployment imutável: [https://edc12ad4.nortfood.pages.dev](https://edc12ad4.nortfood.pages.dev).
- Prévia validada antes da produção: [https://1adada0c.nortfood.pages.dev](https://1adada0c.nortfood.pages.dev).
- Principal e prévia: 120 checks de bytes/status e 18 cenários de navegador aprovados. Chrome verificou 320–1365 px, temas claro/escuro, formulários sem envio, mapa/tiles e busca comum HTTPS, manifesto/ícones, controle pelo SW e fallback offline. GPS físico, cadastro real e pedidos comerciais permanecem não testados.
- Operação ampliada: 38/40 aprovados. Preflight do upload pelo Pages retorna 403 em vez de 200; POST anônimo é barrado nesse CORS antes de chegar ao 401 esperado da autenticação. A correção da função remota permanece pendente.
- Atualização entre versões: o ensaio original no principal comprovou SW aguardando atualização, preservação do mesmo formulário/campo/valor sem recarga antecipada e chegada à release correta após o clique. Seu resultado integral ficou **parcial por falha de instrumentação**: `framenavigated` também conta mudanças de rota por `history.replaceState`/hash. A distinção foi reproduzida localmente usando identidade do documento e `DOMContentLoaded`. O teste corrigido foi repetido integralmente no alias HTTPS isolado `codex-pwa-update-20261101.nortfood.pages.dev`, com o pacote anterior 62ac e o novo c64. **Aprovado**: somente um novo documento após clicar Atualizar, manifesto/tema claros brancos, cache exclusivo da nova release e exclusão de dados privados; zero envios de Auth/pedido e zero erros JavaScript. A produção não foi revertida nem modificada por esse reteste. Evidências: `pwa/https-update.json`, `https-update-instrumentation-failed.json`, `navigation-counter-check.json` e `https-preview-update.json`. Isso comprova ciclo do service worker em Chrome HTTPS, não atualização do WebAPK, splash ou botões Android físicos.

Houve timeouts intermitentes de conexão Node ao Supabase na verificação da prévia. Os logs foram preservados. A ferramenta passou a repetir no máximo uma vez apenas GET com falha de transporte, registrando essas repetições; falhas HTTP e asserções de navegador continuam reprovando o teste. As execuções finais de prévia/principal passaram sem necessitar de repetição de transporte. Isso não comprova disponibilidade contínua do provedor. O verificador legado de pixels também foi alinhado ao novo requisito branco e seu teste específico passou; o produto não foi alterado nessa etapa.

Verificação somente leitura do Cloudflare confirmou projeto `nortfood`, branch de produção `main`, `source=null`, sem integração Git e sem build remoto configurado. O fluxo atual é Direct Upload; não foi criada uma integração de repositório nem realizado push que pudesse acionar outro provedor. Evidência sanitizada: `cloudflare-readonly.json`.

O pacote publicado deve corresponder aos hashes do inventário `public-package.json`. O checkout contém mudanças não commitadas; um SHA antigo exibido como metadado pelo provedor não comprova essas mudanças. O registro `source-manifest.json` identifica o conteúdo local, e a verificação dos bytes publicados é a evidência da release efetivamente entregue.

## Critério de liberação

**NortFood não está liberado para pedidos comerciais.** Manter o piloto bloqueado enquanto existirem falhas críticas/altas sem tratamento, migrações obrigatórias não validadas, Auth/recuperação sem aceite remoto e jornada cliente→pedido→vendedor→financeiro não homologada. A publicação técnica do frontend não altera esse critério.
