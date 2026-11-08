# NortFood — modernização de 30/10/2026

## Escopo e arquitetura preservada

O NortFood existente usa HTML/CSS/JavaScript com composição em `app.js`, módulos de apresentação em `assets/`, serviços em `src/application`, adaptadores em `src/data` e `src/platform`, bundle esbuild e Supabase. A aplicação não foi recriada nem convertida para React, o que substituiria sua arquitetura sem necessidade. Rotas, autenticação, recuperação, cadastro completo de cliente/vendedor, cardápio, adicionais, QR/mesas e regras financeiras foram preservados.

O checkout já continha mudanças de perfil, pedidos, mapa e confirmação de e-mail. Essas frentes foram revisadas e incluídas na validação atual. O estado inicial está em `test-results/modernization-20261030/git-before.txt`; a cópia dos arquivos alterados nesta rodada está em `backups/modernization-20261030-start/`. Nenhuma restauração ou limpeza do trabalho anterior foi feita.

## Funcionalidades e correções

- **Mapa:** modal com cores próprias para claro/escuro, busca por rua/bairro/cidade/CEP, GPS solicitado por clique, marcadores com logo/categoria/cardápio e filtro de lojas aprovadas, públicas, ativas, não pausadas e com coordenadas válidas. Lojas aprovadas fora do horário podem ser consultadas, com indicação de fechadas. Atribuição OpenStreetMap preservada. Agora a região explicitamente confirmada sobrevive ao recarregamento na mesma aba por até 24 horas; sua chave é separada do endereço de entrega. Mover o mapa ou usar GPS não grava endereço nem altera o perfil.
- **Perfil:** cabeçalho com nome, e-mail, avatar e edição; menu vertical com conversas, notificações, conta, endereços, favoritos, ajuda, configurações, privacidade e saída. Benefícios/cupons aparecem como ainda indisponíveis. Formulários completos de cliente e vendedor permanecem. O editor de foto oferece galeria/câmera quando suportada, prévia, zoom/recorte, compressão e remoção. Se o serviço remoto estiver ausente, a prévia continua disponível e o envio fica explicitamente desativado.
- **Pedidos:** página exclusiva, seções em andamento/histórico, filtros, loja, produtos, quantidades/adicionais, imagens quando disponíveis, datas, total e detalhes. Os estados vêm do backend, incluindo retirada e consumo no local. Os detalhes usam os snapshots de produtos/endereço, taxas e eventos reais. Pedir novamente confere o catálogo atual, preço, estoque, adicionais, ingredientes e disponibilidade da loja; a proposta exige confirmação e nova confirmação se houver mudança ou substituição de carrinho. Não envia pedido nem pagamento automaticamente.
- **E-mail:** template em português com logo, cartão branco, fundo claro, botão azul, link alternativo e o destino real `{{ .ConfirmationURL }}`. Callback com prova de usuário confirmado no servidor, vinculado ao token e à sessão recebidos; rejeita sessão antiga, token inválido, expiração e troca de identidade. Recuperação permanece separada e há reenvio pela interface.
- **Instalação:** linha no Perfil, inclusive para visitantes; banner discreto dentro da home somente quando aplicável; prompt oficial acionado apenas após clique; `appinstalled` e modo standalone ocultam convites. Safari iOS recebe instruções manuais; outros navegadores recebem orientação compatível. Dispensa do banner vale 30 dias sem retirar a opção manual do Perfil. Não há promessa de APK ou instalação concluída apenas por abrir instruções.
- **Identidade PWA:** fundo vermelho no manifesto, símbolo branco, PNG 192/512 comuns e maskable, Apple 180 e favicons PNG/ICO. Nomes dos ícones do manifesto contêm hashes de conteúdo. O manifesto mantém identidade, escopo e início `/`, e `display: standalone`. A abertura usa as opções nativas da plataforma, sem tela artificial que atrase o carregamento.
- **Atualização:** preservado o worker com rede primeiro, versão calculada no build, aviso para aplicar atualização e limpeza apenas de caches públicos antigos do NortFood. Autenticação, configuração, pedidos, dados privados e URLs assinadas permanecem fora do cache.

## Origem da imagem

A imagem vermelha e as referências iFood descritas não chegaram como anexos acessíveis nesta tarefa. O único arquivo encontrado em `.codex-attachments` era uma fotografia de uma tela de configuração. Os ícones atuais foram exportados explicitamente a partir do símbolo oficial já existente em `assets/logo-light.png`, preservando sua geometria e proporções, em branco sobre vermelho. **Não foram validados contra o novo original solicitado.** Origem e SHA-256 estão em `docs/APP_ICON_SOURCE.json`.

O gerador `scripts/generate-app-icons.cjs` aceita o original quadrado e opaco com `pnpm generate:favicons --source caminho/icone-oficial.png`. A opção `--existing-brand` reproduz a fonte provisória de forma explícita. A substituição pelo novo original permanece pendente de esse arquivo estar disponível.

## Migrações e segurança

A migração incremental preparada `supabase/migrations/202610290013_profile_avatars.sql` acrescenta `profiles.avatar_path`, bucket privado `profile-avatars`, políticas restritivas, RPC de troca do avatar e cotas de upload. As políticas não permitem alterar a imagem de outra conta. A Edge Function autentica com `auth.getUser()`, determina o usuário pelo token, valida/decodifica/recomprime a imagem, remove metadados e usa caminhos aleatórios sob a identidade do dono. Não recebe um usuário arbitrário do cliente.

Os testes de PostgreSQL isolado verificam leitura/escrita cruzada, anonimato, tentativa de permissões amplas, cotas, rollback e preservação das lojas/produtos/adicionais, inclusive o catálogo Dan Burguer (46 produtos, 20 grupos e 220 opções no ensaio isolado).

**Nenhuma migração foi aplicada no Supabase remoto nesta execução. Nenhuma conta, loja, pedido, imagem de cliente ou regra financeira real foi criada/alterada. O piloto comercial não foi liberado.**

## Verificação atual do backend real

Consulta apenas GET/OPTIONS em 30/10/2026, projeto `zwkhqahivthzivmuirjr`, evidência `test-results/modernization-20261030/backend-live-readonly.json`:

| Verificação | Resultado |
| --- | --- |
| Cadastro por e-mail | habilitado, confirmação obrigatória |
| Google | desabilitado no provedor |
| Piloto comercial | `false` |
| Catálogo público | zero lojas publicadas |
| Perfis e pedidos anônimos | HTTP 401 / `42501` |
| RPC `nf_avatar_capabilities` | HTTP 404 / `PGRST202` |
| Edge Function `profile-avatar` | HTTP 404 / `NOT_FOUND` |
| Preflight `upload-media` pelo Pages | HTTP 403; origem permitida ainda aponta para Netlify |

Essas verificações não revelam dados privados nem comprovam upload autenticado, pedidos, envio de e-mail ou confirmação de uma mensagem real.

## Configuração externa pendente

A hospedagem Cloudflare tem sessão válida. O Supabase CLI não dispõe de token administrativo. O controle do painel pelo navegador foi interrompido automaticamente por não identificar a URL atual com segurança; nenhuma configuração foi feita por essa via.

Com uma sessão administrativa disponível, no projeto existente correto:

1. Conferir histórico de migrações e backup atual. Aplicar **somente a migração 013 pendente**, de maneira transacional, registrando seu histórico. Não reaplicar o conjunto antigo nem usar bootstrap de banco novo.
2. Preservar segredos existentes e configurar `APP_ORIGINS=https://nortfood.pages.dev,https://nortfood.netlify.app`. Implantar `profile-avatar` e a correção já preparada de `upload-media`. O controle JWT da função permanece dentro do handler por `auth.getUser()`; não remover essa autenticação. Conferir preflight das duas origens, recusa de origem intrusa e recusa de usuário anônimo.
3. Em Authentication/Emails/Confirm signup, aplicar `supabase/templates/confirmation.html` e o assunto **Confirme seu e-mail — NortFood**. O arquivo `supabase/config.toml` configura o ambiente local; não atualiza sozinho um projeto hospedado. Manter `{{ .ConfirmationURL }}` integral, confirmação obrigatória e os templates/fluxos de recuperação e troca de e-mail existentes.
4. Conferir Site URL `https://nortfood.pages.dev` e a allowlist exata dos redirecionamentos autorizados. O frontend usa a origem configurada; não aceita um destino arbitrário fornecido pela URL de entrada.
5. Em contas próprias de QA autorizadas, validar upload/troca/remoção, persistência após login, tentativa cruzada negada e recebimento/consumo/reutilização de um e-mail real. Validar instalação em Android/iPhone físicos e GPS com permissão/negação reais.

A configuração do template segue a [documentação oficial do Supabase](https://supabase.com/docs/guides/auth/auth-email-templates); a allowlist segue a [documentação de redirecionamentos](https://supabase.com/docs/guides/auth/redirect-urls). Instalação usa o [prompt oficial](https://web.dev/learn/pwa/installation-prompt) e os ícones respeitam a [área segura maskable](https://web.dev/learn/pwa/web-app-manifest).

## Resultados dos testes e publicação

| Validação | Resultado |
| --- | --- |
| Suíte inicial, antes dos complementos | 210/210 aprovados |
| `pnpm test`, estado final | **215/215 aprovados**, zero falhas/cancelamentos |
| `pnpm test:demo` | **107 verificações aprovadas** |
| `pnpm lint` | 153 arquivos verificados, zero falhas |
| `pnpm check:architecture` | 23 módulos, zero ciclos/violações |
| Build Pages e auditoria do pacote | aprovados; 113 arquivos, sem segredos/arquivos privados |
| Mapa claro/escuro, 320/375/390/430/1365px, SO oposto | 10 cenários aprovados; contraste mínimo de texto 4,53:1 e de controles 4,67:1 |
| Perfil, prévia/foto, menus e persistência | aprovados no Chrome com transporte/identidades de QA controlados |
| Pedidos vazios/preenchidos, detalhes e novo carrinho | aprovados com snapshots sintéticos locais, preços atuais e isolamento entre contas |
| PostgreSQL/RLS, cotas e imagem WASM | aprovados em ambiente isolado, sem modificar produção |
| Template de e-mail | prévia desktop/mobile e callback com SDK real/HTTP interceptado aprovados; sem mensagem real enviada |
| Instalação Android/iOS | eventos/identificação de navegador controlados e instruções aprovados; aparelhos físicos pendentes |
| Atualização do service worker | navegador real, troca de versão, preservação de formulário, cache privado excluído e fallback offline aprovados |
| Prévia HTTPS | 116 checks de bytes/status e 18 checks de navegador aprovados |
| Principal HTTPS após publicar | **116 checks de bytes/status e 18 checks de navegador aprovados**, zero erros JavaScript |
| Verificação operacional remota ampliada | **38/40 aprovados**; os dois checks restantes falham pelo CORS preexistente de `upload-media` (HTTP 403) |

Os checks locais de avatar e confirmação usam o código/SDK/decoder reais com transporte controlado ou PostgreSQL isolado. Não equivalem a upload no Storage principal nem a consumir um e-mail real. Os dois checks remotos de upload não foram marcados como aprovados: a origem Pages é recusada antes mesmo de chegar à autenticação, que seria o HTTP 401 esperado para o teste anônimo.

**Publicação realizada no projeto Cloudflare Pages existente `nortfood`, branch `main`:**

- Principal: [https://nortfood.pages.dev](https://nortfood.pages.dev).
- Release: `62ac362f436ce49a1de9`.
- Deploy imutável: [https://af936ab3.nortfood.pages.dev](https://af936ab3.nortfood.pages.dev).
- Prévia validada: [https://a7242404.nortfood.pages.dev](https://a7242404.nortfood.pages.dev).
- Pacote anterior `d32f60a88eb7725e4497` preservado em `backups/modernization-20261030-public-before/dist-pages/` para reversão do frontend, sem restaurar banco.
- Netlify, DNS, planos pagos e liberação do piloto não foram alterados.

O ensaio na versão principal confirmou HTTPS, headers, arquivos publicados, responsividade, temas, carregamento de logos, mapa modal, tiles reais OpenStreetMap, busca real Nominatim, manifesto/ícones e worker controlando a página offline. O catálogo real continua vazio e pedidos permanecem bloqueados no servidor. Marcadores com lojas, perfil autenticado, histórico preenchido e fotos foram verificados em QA local; não se deve apresentá-los como operação comercial remota comprovada.

**Estado final: frontend/PWA publicados e verificados; conclusão do avatar no Storage, aplicação do template remoto, validação de e-mail real, original da marca e ensaios em aparelhos físicos permanecem pendentes.**

Evidências desta rodada ficam em `test-results/modernization-20261030/`: `final-tests.txt`, `demo-tests.txt`, `syntax.txt`, `architecture.txt`, `app-icons.json`, `backend-live-readonly.json`, `production-deploy.txt`, `production-package.json`, `production-browser.json` e `production-operational.json`. Os testes visuais também atualizaram `test-results/profile-modernization-20261029/`, `test-results/ux-map-20261029/`, `test-results/ux-20261029/` e `test-results/auth-confirmation-ux-20261029/`.

## Arquivos da entrega

Principais superfícies revisadas: `app.js`, `assets/profile-ui.js`, `assets/profile.css`, `assets/avatar-editor.js`, `assets/orders-ui.js`, `assets/orders.css`, `assets/nearby-map.js`, `assets/nearby-map.css`, `assets/auth-confirmation-ui.js`, `src/application/auth-confirmation.js`, `src/application/reorder.js`, `src/backend.js`, `src/commercial.js`, `supabase/templates/confirmation.html`, `supabase/config.toml`, migração 013 e `supabase/functions/profile-avatar/`.

Complementos desta rodada: `pwa.js`, `pwa.css`, `site.webmanifest`, `index.html`, `scripts/generate-app-icons.cjs`, `assets/app-icons/`, ícones PNG/ICO/Apple, `package.json`, testes de instalação/cache/ícones/mapa, ajuste do verificador público e documentação. O arquivo `assets/nortfood-backend.js` é regenerado pelo build existente. `git status` inclui alterações anteriores preservadas; não representa apenas esta execução.
