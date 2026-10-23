# NortFood — preparação do beta em 20/10/2026

## Atualização posterior — autenticação e navegação

Correções de login/cadastro, diálogo de confirmação, barra inferior convencional e retirada dos quatro atalhos concluídas. Prévia privada atualizada no deploy `6ad7d58da165f7c1c4db882e`. 97/97 testes locais, 107 verificações demo, SMTP real de captura e login/persistência real aprovados nos recortes documentados. Google continua desativado; Console autenticado exige aceite inicial de Termos pelo titular antes de configurar OAuth. Nenhum piloto/produção liberado. Consulte [resultados e limites atuais](CORRECOES_AUTH_INTERFACE_20261020.md).

## Atualização posterior — reversão do tema escuro

Por solicitação do proprietário, a alternância claro/escuro foi retirada de forma cirúrgica. O CSS claro anterior é novamente utilizado; controles, controlador, persistência e estilos adicionais do tema foram removidos. Melhorias de Supabase, carrinho/POLL, autenticação, Hostinger e favicons preservadas. [Arquivos e evidências da reversão](REVERSAO_TEMA_20261020.md). O documento TEMAS é histórico, não a configuração atual.

## Último resultado — prévia HTTPS publicada e protegida

**Prévia de homologação disponível:** https://lucky-lamington-022ea1.netlify.app (acesso privado do proprietário Netlify Free). Origem e permalink recusam anonimamente raiz/configuração/scripts com **401**. Banner de teste/noindex conferidos; nenhum domínio comprado ou serviço pago contratado. Somente Supabase `zrczgghucwsaxqnyaapk`; banco principal e Rawanzin intactos.

**89/89 testes locais finais aprovados**, mais 12 regressões afetadas após parametrizar a origem do gate. **Gate administrativo remoto por RPC aprovado**, com baixa parcial/total, idempotência, ajustes e prazo preservado; cargo temporário revogado. **SMTP de captura aprovado em seis verificações**, repetidas com retorno HTTPS; não é entrega externa. **Nove asserts HTTPS de interface aprovados**: login/reload, cardápio/carrinho/retirada a 390 px, persistência 12000 centavos, atualização recebida, conclusão pelo vendedor, upload e URL assinada, carrinho preservado; desktop também conferido a 1365 px, sem erros de console capturados.

Corrigidos dois erros reais: fragmento `#settings` conflitava com os tokens de recuperação recebidos por e-mail; retorno agora usa raiz e evento de recuperação já existente. Atualização POLL fechava o drawer do carrinho; guard agora o preserva. Regressões falharam antes/passaram depois; correções implantadas na prévia.

Encerramento remoto: **piloto false, admins 0, lojas aprovadas 0, 34 pedidos sintéticos, 19 cobranças, 2 ajustes, 2 quitações, 0 divergências de vencimento, RLS ativo e bucket privado**. Históricos preservados; nenhuma migração reaplicada. SMTP de captura permanece exclusivamente na homologação; não usar com dados reais ou no principal.

**Beta real: NÃO APTO.** Falta entrega transacional externa com remetente verificado, definir/validar o ambiente operacional a liberar e concluir os aceites e recortes de UI/dispositivos ainda não executados. Não é mais necessário conceder administrador sintético para repetir o teste positivo de RPC: ele foi concluído. [Relatório detalhado e limites](RESULTADO_PREVIA_HTTPS_20261020.md). As seções abaixo são registros históricos e não substituem este fechamento.

## Atualização — autorização de prévia gratuita protegida

O responsável autorizou prévia HTTPS **protegida**, somente com homologação. Nenhum deploy ocorreu: Netlify está sem login e o Drop anônimo é público. Foi solicitada entrada pessoal na conta Free/aceite de termos; conferir visibilidade privada antes de enviar arquivos. Nenhum custo ou domínio contratado. A autorização anterior pendente de preview público descrita abaixo foi substituída por esta autorização restrita.

Build agora recusa qualquer Supabase diferente da homologação antes de gravar arquivos. Verificador de bloqueio anônimo preparado; sem URL, não há validação remota de HTTPS. **87/87 testes locais passaram**, evidência `test-results/beta/protected-preview-tests.txt`. Depois, o ensaio administrativo ganhou uma trava que exige confirmação antes da entrada de chave/conexão; os dois testes administrativos passaram isoladamente. Nenhuma configuração remota foi modificada nesta etapa.

Preparados templates de confirmação/recuperação para homologação, opção de SMTP de captura sem domínio e SQL de privilégio temporário para a identidade sintética exata. SMTP de captura e concessão administrativa aguardam respostas específicas; nenhum foi aplicado. Captura SMTP não comprova entrega externa. **NÃO APTO para beta real**: continuam pendentes entrega transacional, operação administrativa positiva e jornadas na prévia protegida HTTPS. Detalhes, evidências e intervenções mínimas: [PREVIA_PROTEGIDA_20261020.md](PREVIA_PROTEGIDA_20261020.md).

## Continuação executada — estado atual

**NÃO APTO para lançamento.** Esta atualização substitui as pendências técnicas já resolvidas nos registros históricos abaixo; não repete a auditoria.

- **84/84 testes locais aprovados**, zero falhas; build de homologação isolado e seis regressões específicas de publicação/privacidade aprovados. Evidência: `test-results/beta/continuacao-final-tests.txt`.
- **11 verificações de interface com Supabase remoto APROVADAS**: login em duas sessões, refresh real do token, categorias múltiplas persistentes, coordenadas zero, mapa aberto/fechado sem instâncias duplicadas, retirada, estados pelo vendedor, snapshot de retirada preservado após mudança da loja, remoção de coordenadas, checkout de entrega com taxa 499 e estado Entregue, chat e logout. Relatório: `test-results/homologation/authenticated-ui-result.json`. Cliente a 390 px, vendedor a 1365 px; não são aparelhos físicos.
- **5 verificações de tokens Auth reais APROVADAS**, sem SMTP: login não confirmado recusado; token confirma a conta; confirmação repetida recusada; recuperação troca senha e recusa a antiga; recuperação repetida recusada. Links gerados pela API administrativa para identidades sintéticas, sem cargo administrativo. **Não aprova cadastro público nem envio/recebimento de e-mail.** Evidência: `auth-tokens-live-result.json`.
- Os novos asserts de preço adulterado, endereço de outro cliente, metadados de cargo e conclusão concorrente chegaram ao trecho de UI sem falhar nos gates remotos desta continuação; conclusão manteve cobrança única. A renovação de sessão também foi comprovada no novo teste de UI. O arquivo genérico `resultado.json` conserva a falha intermediária de automação; não foi sobrescrito para esconder o erro. O encerramento separado de UI retornou **0**, com as 11 verificações acima. A aprovação de API anterior permanece preservada em `antes-continuacao/resultado.json`.
- **HTTPS/TLS real local APROVADO**: CA específica por requisição, hostname correto aceito e hostname/certificado não confiável recusados. Não houve mudança da confiança do Windows, bypass de intersticial ou `ignoreHTTPSErrors`. **HTTPS público continua PENDENTE**. Evidência: `test-results/beta/https-local-result.json`.

### Correções concluídas nesta retomada

Foi reproduzida uma corrida real entre `INITIAL_SESSION` e `BOOT`: a segunda chamada de refresh retornava antes da primeira, e o roteador tratava a identidade ainda não carregada como visitante, perdendo a rota protegida em um reload. `src/commercial.js` agora compartilha a promessa em andamento, preserva a atualização pendente e o encaminhamento de recuperação. A regressão falhou antes e passou depois; a UI remota comprovou persistência e reload no painel. Evidências: `refresh-race-before.txt` e `refresh-race-after.txt`.

`app.js` passou a distinguir “Confirmar pedido”/“Cancelar pedido” comerciais dos rótulos demonstrativos. A regressão de checkout conferiu texto e preço revisado no servidor. O roteiro remoto agora autentica explicitamente seu canal Realtime; o primeiro ensaio sem recebimento do evento foi preservado em `realtime-first-failure.log`. Ensaios seguintes receberam o evento. Também foram corrigidos seletores ambíguos da automação e a expectativa de visibilidade de um pane interno do Leaflet; a visibilidade do container real é conferida. Não se alteraram RLS ou permissões para passar nesses testes.

As tentativas adicionais de UI reutilizaram duas contas sintéticas já existentes, com senhas aleatórias renovadas exclusivamente pela API de testes e mantidas em memória. Nenhuma senha de pessoa real foi alterada. O modo implícito do script de sessão agora é recusado antes da entrada de chave; é necessário selecionar explicitamente o ensaio. O PowerShell usa o modo de fixtures sem cargo administrativo.

### Fechamento remoto confirmado

Somente NortFood-Homologacao: **0 administradores; piloto desligado; 0 lojas aprovadas; 27 contas Auth sintéticas; 14 lojas; 29 pedidos; 16 cobranças e 6 imagens de teste**. Zero tabelas de aplicação sem RLS, cobranças duplicadas, cobranças sem conclusão ou vencimentos divergentes de sete dias. Sete migrações continuam registradas, sem reaplicação. Bucket permanece privado, Realtime limitado às quatro tabelas previstas e grants protegidos preservados. Evidência: `test-results/homologation/continuacao-final-state.json` e captura correspondente.

### Bloqueios que ainda impedem o beta

1. **Envio transacional real:** o painel confirmou SMTP personalizado desligado. Falta disponibilizar acesso a um provedor/remetente verificado e caixa controlada de testes. O Codex pode configurar e executar a jornada quando houver esse acesso; não enviar senhas ou chaves pelo chat. O serviço padrão não atende cadastro público irrestrito, conforme [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp). O SDK, os tokens e a troca de senha já foram testados; entrega e links recebidos na caixa ainda não.
2. **Operação administrativa positiva:** segue a decisão expressa de manter os testes pendentes. Nenhum cargo foi concedido. Aprovação pela UI/RPC e ajustes/quitações remotos continuam sem aprovação; preparação de fixture por SQL não os substitui.
3. **Preview HTTPS autorizado:** pacote `dist-homologacao/` criado com configuração exclusiva de staging, aviso de teste e noindex. Não altera `.env` nem o build principal. Arquivo privado `test-results/beta/nortfood-homologacao-preview-20261020.zip` pronto. A Netlify Drop informa prévia gratuita com link público; a autorização específica para essa exposição foi solicitada e permanece pendente. Não houve upload/deploy. Depois da autorização, configurar origens exatas e testar retorno Auth/upload na URL efetiva; não comprar domínio agora.

Não foram contratados serviços, publicados sites, apagados dados, concedidos poderes administrativos ou alterados o banco principal/Rawanzin. A validação física Android/iPhone, o aceite operacional/jurídico dos textos em rascunho e os limites do ensaio de recuperação continuam documentados abaixo; não são cobertos pelas provas de laboratório.

### Arquivos desta retomada

`src/commercial.js`, `app.js`, bundle regenerado; `tests/ui-contract.test.cjs`, `tests/supabase-live.cjs`, `tests/helpers/authenticated-ui.cjs`, `auth-tokens-live.cjs`, `resume-ui-live.cjs`, `staging-sql-fixture.cjs`; `tests/https-local.test.cjs`, `tests/beta-release.test.cjs`; `scripts/homologation-session.cjs`, `Start-HomologationSession.ps1`, `scripts/build.cjs`, `package.json`, `.gitignore` e documentação. Nenhuma migração foi modificada nesta retomada.

---

## Registro anterior — preservado para contexto


**Veredito: NÃO APTO para abrir o beta a clientes reais.** Há recortes remotos aprovados, mas a homologação completa permanece pendente. Não foi encontrado erro funcional reproduzível da aplicação nos cenários aprovados; ausência de teste não significa aprovação.

Este documento consolida a continuação do prompt mestre e prevalece sobre os estados históricos de 19/10. O projeto existente, a identidade e a separação cliente/estabelecimento foram preservados. Nenhuma publicação, contratação, exclusão de dados ou alteração do NortFood principal ocorreu nesta continuação.

## Decisão sobre administração

O responsável escolheu **manter os testes administrativos pendentes**. Nenhum cargo foi concedido. O processo que aguardava a autorização foi encerrado. A conta Auth sintética criada para preparar o ensaio permanece sem privilégios, sem exclusão do seu registro. O SQL de autorização preparado **não foi executado** e não deve ser executado como parte de uma repetição automática.

Aprovação de lojas e ajustes/quitações positivos pela aplicação continuam PENDENTES. A aprovação das fixtures por SQL não comprova a RPC administrativa. Não se substituirá esse teste por ampliação de privilégios ou enfraquecimento de RLS.

## O que foi concluído

- Homologação segregada no projeto `zrczgghucwsaxqnyaapk`, sem uso do principal ou dos projetos Rawanzin. Histórico com sete migrações; não reaplicar 001–007.
- Upload autenticado de imagem sintética e leitura assinada comprovados no bucket privado. Rejeição de upload concorrente, escrita direta e requisição sem identidade comprovadas.
- Pedidos, chat, notificações e Realtime autenticados comprovados nos recortes descritos em `HOMOLOGACAO_RESULTADO_20261020.md`.
- Termos comerciais identificados como rascunho e redirecionamento de `#settings` sem sessão com URL normalizada possuem regressões. Isso não equivale a revisão jurídica.
- Favicon, ícones, imagem Open Graph 1200 × 630, manifesto, página 404 HTTP e tratamento de fragmento desconhecido. Nenhum domínio foi inventado. Rotas privadas não entram no sitemap. Indexação permanece fechada por padrão.
- Canonical removido em páginas privadas e restaurado ao voltar ao início, quando a origem HTTPS configurada corresponde à origem atual.
- Preferências opcionais de estatísticas implementadas. Sem Measurement ID, não há SDK nem envio ao Google. Os testes de consentimento usam transporte controlado e não comprovam coleta real no GA4.
- Imagens derivadas menores, fontes locais com licenças e Leaflet 1.9.4 local com versão/integridade fixadas. Originais preservados; créditos do mapa mantidos. PDF de QR carregado somente quando solicitado.
- Servidor local bloqueia fontes, ambientes, backups e relatórios; entrega 404 e headers de segurança. Compressão de texto adicionada para o ensaio local. A hospedagem futura precisa validar seus próprios headers e compressão.

## Testes e alcance

| Execução | Resultado | O que comprova |
|---|---|---|
| Suíte final Node | **82/82**, zero falhas | PGlite, contratos e navegadores locais; inclui mapas, GPS controlado, QR/PDF, permissões, finanças, termos, rotas e privacidade |
| Interface demonstrativa | **107 verificações aprovadas** | Compatibilidade da demonstração; não é autenticação ou persistência Supabase |
| Build | Código 0 | Geração estática; não houve deploy |
| Gate de configuração de publicação | **NO_GO: PUBLIC_HTTPS_URL_PENDING** | Bloqueio esperado enquanto a origem pública não foi definida |
| Conferência remota somente leitura | **15/15 respostas esperadas** | RLS/acessos anônimos, catálogo/Auth e bloqueios de upload, mais assertions de confirmação ativa e piloto desabilitado |
| Visitante em navegador conectado à homologação | **5 verificações aprovadas** | Configuração segregada, catálogo real, rota protegida, login inválido, formulário de recuperação e ausência de overflow/erros a 390/1365 px |
| Gate autenticado real, concluído nesta sessão antes da rodada final de assets | **APROVADO, exit 0** | API de pedidos, isolamento, chat, upload, Realtime e comissões; contas sintéticas e preparação SQL isolada |
| Interface autenticada real em duas sessões | **5 verificações aprovadas** | Login, carrinho e pedido de retirada, estados pelo vendedor, chat recebido na outra sessão e logout |

Evidências locais ignoradas: `test-results/beta/final-tests.txt`, `final-demo.txt`, `performance-before.json`, `performance-final.json`; `test-results/homologation/readonly-result.json`, `browser-live-result.json`, `authenticated-ui-result.json`, `resultado.json` e `final-audit-result.json`. O relatório genérico do gate de API conserva PENDENTE para jornadas completas; o arquivo de interface autenticada comprova somente os cinco cenários efetivamente executados.

A matriz local do painel foi ampliada para 320, 360, 375, 390, 414, 430, 768, 1024, 1365 e 1440 px. São viewports de Chrome desktop, não aparelhos físicos ou Safari. As últimas alterações de assets foram verificadas pela suíte completa e pelo visitante remoto; não se repetiu o pedido autenticado depois delas.

As novas assertions adicionadas ao roteiro remoto de preço adulterado, endereço alheio, conclusão concorrente, refresh e metadados de cargo estão **preparadas, mas não executadas nesta última rodada**. Os respectivos testes locais não substituem sua execução remota. O ramo administrativo permanece pendente por decisão expressa.

### Classificação funcional

| Área | Estado remoto | Limite |
|---|---|---|
| Login/logout positivo | APROVADA | Contas provisionadas para teste; não comprova cadastro público |
| Cadastro, confirmação e recuperação completa | PENDENTE | Falta caixa controlada e envio transacional configurado |
| Solicitação/edição de loja e produtos | APROVADA no recorte de API | Não cobre todas as combinações de formulários |
| Aprovação de loja; ajustes/quitações | PENDENTE | Sem administrador de teste, por escolha do responsável |
| Upload comercial e URL assinada | APROVADA no recorte | Não foi criada nova funcionalidade de avatar de cliente |
| Retirada ponta a ponta pela interface | APROVADA | Pedido real sintético, duas sessões |
| Entrega, cancelamento/rejeição | APROVADA na API | Checkout de entrega pela interface ainda PENDENTE |
| Chat e Realtime autenticado | APROVADA no recorte | Não equivale a notificação push externa |
| Comissão e relatório da loja | APROVADA no recorte | Conclusão gera uma cobrança, sem entrega na base; sete dias exatos |
| Isolamento entre contas/lojas | APROVADA nos casos executados | Não é certificação de todos os ataques possíveis |
| Múltiplas categorias, mapa/configurações completos na UI remota | PENDENTE | Há regressões locais; falta jornada remota e GPS físico |
| GA4, SEO público, DNS e HTTPS | PENDENTE | Recursos preparados localmente, nenhum domínio ou propriedade em operação |

Nenhum cenário foi classificado como REPROVADO sem erro reproduzível. Pendências não devem ser promovidas a APROVADA por estarem implementadas.

## Desempenho medido

Chrome, viewport 390 × 844, CPU 4×, rede 1,6 Mbps/150 ms e cache frio, servindo localhost com Supabase de homologação:

| Métrica | Antes | Depois |
|---|---:|---:|
| LCP | 11.328 ms | 3.944 ms |
| Recursos locais, soma de encodedBodySize | 3.447.646 bytes | 440.593 bytes |
| CLS | 0,000687 | 0,000687 |

São medições únicas de laboratório, sem percentil 75 e sem INP de campo. O LCP final ainda supera 2,5 s neste perfil; validar e continuar otimização na hospedagem real. Compressão e cache da futura hospedagem podem diferir.

## Segurança e estado remoto final

Conferência real em transação somente leitura, após a decisão de não conceder administração:

- **0 administradores**, 13 contas Auth sintéticas e 0 outras contas.
- 7 lojas, 14 pedidos, 7 cobranças e 3 imagens sintéticas; históricos preservados.
- 0 lojas aprovadas, piloto desativado, bucket privado, 0 tabelas de aplicação sem RLS.
- 0 cobranças duplicadas, 0 cobranças sem conclusão, 0 divergências de `due_at = completed_at + interval '7 days'`.
- Authenticated sem DML em `private.admin_users`; service_role sem UPDATE em `platform_settings`; esses grants não foram ampliados.
- Realtime restrito a `dining_tables`, `messages`, `notifications`, `orders`.

As 42 advertências de SECURITY DEFINER e duas sugestões de RLS sem políticas observadas anteriormente no Advisor estão explicadas na auditoria de homologação. Não foram escondidas removendo grants necessários. Zero erros no Advisor não comprova segurança completa.

Owner/staff mantêm os poderes existentes de membro, sem nova distinção inventada e sem poderes administrativos. Se o negócio quiser restrições adicionais a staff, precisa defini-las explicitamente.

## Arquivos desta finalização

| Grupo | Arquivos / finalidade |
|---|---|
| Interface | `app.js`, `index.html`, `refinements.css`, `404.html`: integração, privacidade, assets e navegação |
| Estatísticas/metadados | `assets/site-runtime.js`, `scripts/site-artifacts.cjs`, `scripts/public-config.cjs`, `.env.example`: opt-in, URLs saneadas, configuração fechada |
| Build/servidor | `scripts/build.cjs`, `scripts/serve.cjs`, `_headers`, `netlify.toml`, `package.json`: artefatos, compressão, proteção e preview sem indexação |
| Assets | `assets/optimized/`, `assets/fonts*`, `assets/vendor/leaflet/`, favicon/ícones/OG, `site.webmanifest`: derivados e recursos locais; originais preservados |
| PDF | `src/qr-menu.js`, `src/pdf-export.js`, `assets/pdf-export.js`, bundle regenerado: importação sob demanda |
| Ferramentas | `scripts/optimize-brand-assets.cjs`, `vendor-fonts.cjs`, `vendor-leaflet.cjs`, `generate-site-images.cjs`, `performance-lab.cjs` |
| Regressões | `tests/beta-release.test.cjs`, `tests/ui-contract.test.cjs`: publicação, consentimento, canonical e larguras; roteiro `tests/supabase-live.cjs` ampliado, com novas assertions remotas ainda pendentes |
| Documentação | Este relatório, checkpoint, atualização da homologação e prompt mestre preservado integralmente |

O Git contém alterações anteriores desta tarefa longa; não foram descartadas nem atribuídas integralmente a esta continuação. As migrações e configurações do banco principal não foram modificadas nesta finalização. Backup dos arquivos antes dos ajustes visuais em `backups/workspace-beta-20261020-104236/manifest.json` (privado).

## Dependências e próximos passos, em ordem

1. **E-mail:** definir remetente/provedor e caixa de teste controlada, fornecer credenciais por canal protegido, configurar SMTP na homologação e provar cadastro, confirmação, recuperação e retorno. Não desativar confirmação. Guia `SMTP.md`.
2. **Operação administrativa:** testes positivos continuam pendentes por decisão do responsável. Não existe caminho aprovado para abrir novas lojas e quitar/ajustar comissões sem homologar o operador que realmente usará a aplicação.
3. **Cobertura funcional restante:** jornada UI de entrega, configurações/categorias/localização remotas, novas assertions de segurança/conclusão concorrente e rodada final após e-mail. Aparelhos Android/iPhone e GPS reais não foram verificados.
4. **Revisão operacional/jurídica:** revisar termos e privacidade em rascunho, identidade do operador, suporte, regras comerciais e comissão. Não há aprovação jurídica presumida.
5. **Hospedagem:** quando autorizado, escolher uma URL HTTPS de preview sem comprar domínio agora; ajustar origem de Auth/upload exatamente, testar CORS, headers, rotas, retorno de e-mail, dispositivos e carga. Nenhuma publicação autorizada ou realizada neste relatório.
6. **Analytics opcional:** pode permanecer desligado. Se adotado, definir propriedade/Measurement ID e desativar a medição automática de páginas/history no GA4 antes de habilitar a variável de confirmação. `send_page_view:false` sozinho não desativa a medição otimizada; ver [documentação oficial de pageviews](https://developers.google.com/analytics/devguides/collection/ga4/views). Validar DebugView/consentimento no preview sem dados pessoais.
7. **Recuperação:** o ensaio de PostgreSQL 17 isolado registrado em `BETA_20261019.md` restaurou/comparou 64 tabelas, com exceção documentada da extensão Vault ausente no Windows e zero segredos no dump. Ainda falta ensaio integral em destino compatível com os serviços Supabase e cobertura dos objetos/configurações externos ao dump.

Só após fechar esses gates e receber autorização de publicação deve-se habilitar um beta controlado. Não é preciso comprar domínio para concluir os testes anteriores.

## Preservação

Nada foi excluído. Nesta continuação, nenhuma migração foi reaplicada, nenhum privilégio administrativo concedido, nenhum serviço pago contratado e nenhum site publicado. A conferência final remota foi somente leitura e exclusivamente na homologação. **O NortFood principal e os projetos Rawanzin não foram alterados.**
