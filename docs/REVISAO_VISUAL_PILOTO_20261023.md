# NortFood — revisão visual publicada e situação comercial

## Resultado

**Site/PWA atualizado e verificado:** https://nortfood.netlify.app. **Operação comercial: BLOQUEADA.** A loja indicada pelo responsável é DanBurguer; ainda não foi cadastrada/aprovada no banco. A identificação recebida está na [ficha local do piloto](PILOTO_DANBURGUER.md).

Deploy automático Netlify `6adb6cab6a3e96e262fa0fa7`, estado `ready`, contexto `production`, branch `release/nortfood`, commit público `acd3165848c513272ec18a4d666c88351c19e9c6`. Release HTTPS observada: `79e56825c9165ad57a98`. Site ID preservado: `3bca8094-c54e-416c-89d8-bec51a3d252e`. Não houve criação de site nem troca de domínio. [Deploy oficial](https://app.netlify.com/projects/nortfood/deploys/6adb6cab6a3e96e262fa0fa7).

O log remoto confirmou 116 arquivos de sintaxe sem erro, 30 testes de release aprovados/zero falhas, 18 módulos sem ciclos/violações, build e auditoria de 91 arquivos sem problemas. Netlify processou 18 regras de headers e uma de redirect sem erro. `/netlify.toml`, `/_headers` e `/_redirects` também retornaram 404 por HTTPS; a presença de configuração reservada no navegador de arquivos do deploy não significa acesso público ao arquivo.

## Problemas e correções

- A versão atual só usava `logo-light.webp` e havia retirado o suporte ao tema escuro. A solicitação atual exige ambos os temas: foram reutilizadas as variantes oficiais clara (preto/vermelho) e escura (branco/vermelho), com seleção automática pelo dispositivo e preferência persistida. Alternar o tema não recria formulários, contas ou carrinho. Imagens não recebem filtros de inversão.
- Os quatro banners originais medem 1774×887; derivados existentes medem 1200×600. O CSS forçava 2.05:1 no desktop, 1.48:1 no celular e `object-fit:cover`. Foram removidas as proporções conflitantes e a altura máxima que cortava a imagem. A altura segue o arquivo real; todas as artes são exibidas completas. Indicadores e pausa ficam fora da imagem e têm áreas de toque de 44 px.
- O espaçamento das seções acumulava padding e margem de 30/24 px. Foi removida a margem duplicada e ajustado o acesso ao mapa, inclusive em 320 px. Nenhum conteúdo foi ocultado para mascarar overflow.
- Apenas “Todos” era resultado do banco vazio, confirmado por SQL real e REST. Não era perda de categorias por overflow. O estado vazio agora explica a ausência. Quando o backend fornece categorias ativas, todas são renderizadas, inclusive nomes fora da lista de ícones conhecidos. A exceção histórica de ocultar “Saudável” permanece apenas na demonstração local; não filtra categorias reais ativas. Filtro/seleção e indicação de rolagem foram testados com dados sintéticos identificados, sem criar categorias em produção.
- Foram mantidos menu inferior fixo, área segura, componentes existentes e identidade. Controles novos de tema não provocam overflow no cabeçalho pequeno. Formulários, estados vazios, painéis e conversas têm superfícies legíveis no tema escuro.
- JS/CSS de tema fazem parte do build, da auditoria de fonte pública e do cache estático permitido do SW; recebem revalidação HTTP. Versão do SW continua derivada do conteúdo. Dados Supabase, tokens, pedidos e respostas privadas continuam excluídos do cache.

## Bloqueios reais encontrados

| Camada | Estado observado | Efeito |
|---|---|---|
| Frontend | `config.publicPreview=true`; `authForm()`/`commercialBanner()` em `app.js` | Aviso e modal de preparação, cadastro público indisponível |
| Build/Netlify | `NORTFOOD_PUBLIC_PREVIEW=yes` em `netlify.toml` e configuração pública | Gera a versão de apresentação; alterar só o DOM não libera cadastro |
| Auditoria de publicação | `scripts/audit-release.cjs` exige apresentação pública | Recusa publicação comercial sem revisão explícita da aprovação |
| Supabase Auth | `disable_signup=true`, confirmação de e-mail exigida | O servidor também recusa novos cadastros |
| Banco | `platform_settings.pilot_enabled=false` / `nf_place_order` | Checkout recusa pedidos comerciais |
| Loja | Cadastro ausente; catálogo exige status aprovado | Não existe estabelecimento receptor de pedidos |
| Permissões | Associações comerciais e administradores: zero | E-mail ou nome no navegador não concedem acesso ao painel |
| E-mail | SMTP próprio desativado | Entrega de confirmação e recuperação para clientes não homologada |

SQL somente leitura confirmou: Auth users 0; perfis 0; lojas 0; lojas aprovadas 0; produtos 0; categorias 0; administradores 0; associações 0. Migrações 001–007 registradas. Nenhuma tabela de aplicação `public/private` sem RLS; visitantes sem execute para checkout/administração. Uma tentativa inicial de substituir texto no editor resultou em erro de sintaxe; a consulta foi corrigida e executada novamente. Nenhuma dessas consultas alterou dados.

Os bloqueios foram preservados por falhas de pré-requisitos, conforme a regra de lançamento. Não foi removido apenas o aviso para apresentar uma falsa liberação. [Auditoria remota desta etapa](../test-results/visual-pilot-20261023/backend-current.json).

## Matriz de homologação

| Verificação | Classificação | Evidência / limite |
|---|---|---|
| Suíte existente e regressões novas | APROVADO | 144 testes, zero falhas na suíte completa final; [log](../test-results/visual-pilot-20261023/full-tests-final.txt) |
| Correções visuais direcionadas | APROVADO | 4 testes de navegador; [log](../test-results/visual-pilot-20261023/visual-final.txt). Mais 2 testes finais verificaram decode e visibilidade real das logos |
| Fluxos locais da demonstração | APROVADO | 107 verificações; [log](../test-results/visual-pilot-20261023/demo-final.txt); não são vendas reais |
| Sintaxe / arquitetura | APROVADO | 116 arquivos sem erro; 18 módulos, zero ciclos/violações. `lint` é validação de sintaxe, não lint semântico completo |
| Build e privacidade do pacote | APROVADO | 91 arquivos públicos, sem arquivos internos/credenciais; build concluído; [inventário](../test-results/launch-20261023/public-package.json) |
| Prévia HTTPS | APROVADO | 38/38 verificações; 16 combinações de viewport/tema; console sem erros |
| Produção HTTPS | APROVADO | 38/38 verificações incluindo privados 404, HTTP→HTTPS, manifesto/ícones e negação anônima; [HTTP](../test-results/launch-20261023/https-official.json) |
| Logo, banners, categorias e navegação publicados | APROVADO | 320/360/375/390/412/430/768/1365 px, claro/escuro, sem overflow; logos decodificadas, sem filtros; quatro banners e navegação inferior; [navegador](../test-results/visual-pilot-20261023/official-browser.json) |
| Cadastro/login/logout/recuperação/sessão de clientes reais | PENDENTE | Novos cadastros desativados; nenhuma conta criada. Regressões locais aprovadas não comprovam Auth operacional comercial |
| RLS e operações anônimas remotas | APROVADO no recorte | RLS em metadados, checkout vazio anônimo HTTP 401, dados privados e administração negados. Não substitui duas contas autenticadas |
| Isolamento remoto cliente/vendedor/terceiro | NÃO TESTADO | Não existem contas/loja de teste operacional no principal |
| Produtos, adicionais, carrinho, frete, checkout e idempotência | APROVADO local / PENDENTE remoto | Servidor PostgreSQL isolado e contrato UI; faltam cardápio, cobertura e loja reais |
| Recebimento, abertura/fechamento e acompanhamento | PENDENTE comercial | Não há estabelecimento/membro para receber o pedido |
| WhatsApp | APROVADO local / PENDENTE real | Formatação usa total persistido e número de loja aprovada; falta número oficial. Nenhuma mensagem foi enviada |
| Storage/Realtime autenticados | PENDENTE | Sem vendedor/cliente operacional; não foram certificados por testes locais |
| Atualização do PWA na aba existente | APROVADO no recorte | Aviso “Uma nova versão…” apareceu, botão Atualizar aplicado; novo controle de tema visível e aviso removido. Nenhum armazenamento de usuário foi apagado |
| Instalação Android/iPhone físicos | NÃO TESTADO | Manifesto e ciclo SW têm testes Chromium; não equivalem a aparelho real. iPhone: Safari → Compartilhar → Adicionar à Tela de Início |
| Acessibilidade/boas práticas automatizadas públicas | APROVADO no recorte | Lighthouse 100/100, zero erros de console. Não equivale a auditoria manual com tecnologia assistiva |
| Performance | PENDENTE de evolução | Lighthouse mobile 76; FCP 1,57 s; LCP 5,05 s; TBT 112 ms; CLS 0. Medição de laboratório, sem alegação de SLA |
| SEO | PENDENTE de indexação | Lighthouse 69; noindex preservado durante apresentação sem operação |
| 1000 usuários comerciais simultâneos | NÃO TESTADO | Carga não foi repetida nesta revisão; [relatório anterior](LANCAMENTO_OFICIAL_20261023.md) distingue laboratório estático e leituras de homologação |

As primeiras execuções detectaram a allowlist Hostinger sem os novos arquivos e uma asserção antiga que proibia o controle de tema. A lista explícita foi atualizada e o contrato passou a refletir a exigência atual de ambos os temas. Os testes foram executados novamente; não foram declarados aprovados pela simples alteração de expectativas. A fixture visual também foi corrigida para usar o modo de demonstração explícito e o formato real do catálogo.

[Lighthouse completo](../test-results/visual-pilot-20261023/lighthouse.report.html), [métricas](../test-results/visual-pilot-20261023/quality-current.json), [captura clara](../test-results/visual-pilot-20261023/official-light-390.png), [captura escura](../test-results/visual-pilot-20261023/official-dark-390.png).

## Arquivos alterados

Interface: `app.js`, `styles.css`, `refinements.css`, novos `theme.js`/`theme.css`, `index.html`, `404.html`, `assets/ui-runtime.js`. Publicação/cache: `_headers`, `sw.js`, `scripts/build.cjs`, `scripts/check-syntax.cjs`, `scripts/prepare-hostinger.cjs`, `scripts/prepare-public-branch.cjs`, `scripts/verify-public.cjs`. Regressões: `package.json`, `tests/light-interface.test.cjs`, `tests/theme-interface.test.cjs`, `tests/visual-pilot.test.cjs`, `tests/ui-contract.test.cjs`. Documentação privada: este relatório, ficha DanBurguer e plano de recuperação. As imagens originais não foram modificadas. Nenhuma migração alterada/aplicada; UaiMove não foi modificado.

## Próximo passo indispensável

Receber WhatsApp, cardápio/preços e regras reais de atendimento da DanBurguer; autorizar o remetente/provedor de e-mail pelo fluxo protegido. O [SMTP padrão do Supabase](https://supabase.com/docs/guides/auth/auth-smtp) só envia para endereços da equipe e não é destinado a produção. O Gmail informado não basta para configurar SMTP e não foi usado como senha, remetente verificado ou conta já criada.

Depois, executar os testes autenticados e o pedido controlado, aprovar somente a loja validada e então alterar os portões de cadastro/build/piloto. Não é necessária reconstrução do projeto nem reaplicação das sete migrações.

## Custos e recuperação

Foram usados o site Netlify existente e o Supabase existente nos planos gratuitos. Nenhuma contratação paga, compra de domínio, alteração de plano ou cobrança foi aceita nesta etapa. Não foi alegado consumo ilimitado nem capacidade comercial comprovada de 1000 usuários.

Checkpoint anterior às modificações: `efdd0a8`, tag `checkpoint/visual-pilot-20261023`. Fonte pública passa por varredura e exclusão de relatórios/histórico interno; somente `release/nortfood` publica produção. Para regressão publicada, preparar um commit de reversão e novo deploy automático, com nova verificação pública. Não apagar históricos ou restaurar banco para reverter CSS. [Plano de recuperação](LANCAMENTO_RECUPERACAO.md).
