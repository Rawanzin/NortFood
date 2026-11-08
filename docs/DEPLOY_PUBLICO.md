# NortFood

Aplicação existente em HTML/CSS/JavaScript, esbuild e Supabase. Hospedagem oficial e único destino autorizado de publicação: https://nortfood.pages.dev, projeto Cloudflare Pages `nortfood`. Configurações legadas do Netlify são preservadas como histórico; não publicar por elas.

Atualização de 01/11/2026: release `c64b4e442beb444a7d7e` publicada no Pages, com 228 testes funcionais, 107 verificações de fluxos, 52 testes de segurança, 120 checks de arquivos/status e 18 cenários Chrome na prévia e no principal. Veja o [relatório atual e os bloqueios comerciais](RELATORIO_ETAPA10_20261101.md). Migrações/funções remotas, Auth autenticado e Android físico ainda exigem validação; a publicação não libera pedidos comerciais.

Histórico de 30/10/2026: release `62ac362f436ce49a1de9`, preservada para reversão, documentada no [relatório da modernização](MODERNIZACAO_20261030.md). Esses resultados anteriores não substituem a rodada atual.

## Build

Node 24 e pnpm 11.25.0. Executar `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm check:architecture`, `pnpm test`, `pnpm test:demo` e `pnpm build:pages`. Executar a auditoria final de segurança após as correções e os testes funcionais. Manter `pnpm-workspace.yaml`, que autoriza somente o script de instalação do esbuild. Publicar apenas `dist-pages` no Pages. O build valida a chave pública, usa staging próprio e identifica o conteúdo da versão. A tela inicial é desenhada antes de concluir o carregamento do SDK; os controles comerciais aguardam a identidade e o catálogo.

Variáveis de build: `NORTFOOD_SUPABASE_URL`, `NORTFOOD_SUPABASE_PUBLISHABLE_KEY`, `NORTFOOD_APP_URL=https://nortfood.pages.dev`, `NORTFOOD_PUBLIC_PREVIEW=no`, `NORTFOOD_PUBLIC_ACCOUNTS=yes`, `NORTFOOD_ENABLE_INDEXING=no`. Não fornecer service_role, PATs, senhas ou segredos de servidor ao frontend.

## Estado operacional

A interface pública permite acessar cadastro, login e recuperação. A disponibilidade real depende do Supabase Auth e do SMTP autorizado; abrir o formulário não comprova criação de conta. Categorias editoriais permanentes aparecem mesmo com catálogo de lojas vazio. A migração 008 adiciona rascunhos privados, envio para análise e limite administrativo de uma loja aprovada. Não habilita pedidos ou concede administradores. Para liberar operação, validar loja nominal autorizada, e-mail real, sessões independentes, RLS e checkout, recebimento do vendedor, confirmação e contingência. Alterar uma flag de interface não aprova o lançamento comercial.

A migração 009 acrescenta ingredientes removíveis, snapshot no pedido, restrições de venda e configuração comercial privada. A importação de cardápio é separada, transacional e idempotente. Não reaplicar migrações nem publicar lojas pendentes para preencher a interface. O cadastro completo solicita contato e endereço; vendedores informam também loja e categoria real. A migração 011 grava esses dados somente após autenticação, de forma atômica e idempotente. Dados pendentes ficam temporariamente na aba sem senhas; confirmação em outro navegador pode exigir completá-los novamente. Nenhum cargo administrativo vem do formulário ou dos metadados. O mapa de descoberta abre em modal, com GPS pontual e busca manual; não salva automaticamente endereço ou coordenadas.

## PWA

O cadastro usa etapas de contato, endereço e acesso, senha nova com mínimo de 8 caracteres sem exigência de composição, confirmação e mensagens em português. A migração 012 acrescenta CEP privado de endereços e referência comercial, preserva permissões existentes e não reaplica as anteriores. Endereço de entrega usa pesquisa explícita, formulário manual e GPS opcional; mapa é uma confirmação secundária. A seleção aproximada não grava dados automaticamente. `node scripts/verify-ux-public.cjs https://nortfood.pages.dev/` verifica a interface pública sem criar contas ou pedidos; `--geocode` limita a uma busca de endereço comercial e uma identificação de ponto escolhido. Testes de GPS controlado não comprovam GPS físico.

Formulários interrompidos oferecem Retomar ou Recomeçar na mesma aba, por até 24 horas, separados por tipo de conta e e-mail. Senhas, confirmação de senha e o aceite da interface não são guardados; devem ser preenchidos novamente. Recibos de cadastro enviado permanecem vinculados à identidade Auth correspondente. Sair da conta limpa os rascunhos da aba. O mapa para explorar lojas é separado da seleção do endereço de entrega; somente lojas elegíveis com coordenadas cadastradas podem aparecer.

Android/Chrome: usar Instalar quando oferecido pelo navegador. iPhone/iPad: Safari → Compartilhar → Adicionar à Tela de Início. O SW protege respostas privadas, oferece uma página offline e pede confirmação para aplicar atualização. Fechar/cancelar o convite de instalação adia nova oferta por 30 dias. Instalação física em aparelhos exige ensaio específico.

## Publicação e reversão

Confirmar a identidade da conta e o projeto Pages existente antes de publicar. Conferir no projeto a branch de produção e a existência de integração Git: upload direto não comprova integração com o repositório. Não mudar o tipo de projeto nem conectar outro repositório automaticamente. A configuração do ambiente fica na hospedagem ou no processo local do build; o pacote contém somente configuração pública.

Validar uma prévia Pages com `node scripts/verify-pages-package.cjs https://<deploy>.nortfood.pages.dev` e `node scripts/verify-public-pilot.cjs https://<deploy>.nortfood.pages.dev`. Após publicar, repetir explicitamente com `https://nortfood.pages.dev`; evitar comandos legados sem URL. Esses verificadores não criam contas ou pedidos; registram separadamente a indisponibilidade real do Auth e o bloqueio de pedidos. A aceitação autenticada exige contas de teste e evidência própria.

Antes de publicar, preservar um pacote público anterior com inventário SHA-256 conferido. Para reversão do frontend, republicar esse pacote no mesmo projeto Pages. Conferir HTTPS, `release.json`, configuração pública e bloqueio comercial. Não restaurar banco para reverter frontend. Migrações registradas não devem ser reaplicadas.

Cloudflare Pages, projeto `nortfood`, mesma aplicação e mesmo backend: gerar com `NORTFOOD_APP_URL=https://nortfood.pages.dev`, `NORTFOOD_PUBLIC_ACCOUNTS=yes` e `pnpm build:pages`; auditar com `node scripts/audit-release.cjs dist-pages`. Publicar apenas o conteúdo de `dist-pages`, com `_headers` e `404.html` nativo, sem a regra 404 específica do Netlify. O upload direto aceita o pacote estático; não altera DNS nem outro provedor. Configurar a origem exata na allowlist do Auth antes de homologar OAuth. Uma sessão não é transferida entre origens.

Verificação no Pages: `node scripts/verify-public.cjs https://nortfood.pages.dev`, `node scripts/verify-pages-package.cjs` e `node scripts/verify-public-pilot.cjs https://nortfood.pages.dev`. O comparador confere hashes contra `dist-pages`; os redirecionamentos canônicos de HTML devem permanecer na mesma origem. O teste de navegador também exige a tela offline e exclusão de dados privados do cache. Ele não envia cadastro, recuperação, pedido ou WhatsApp.

Upload de imagens: a função `upload-media` aceita a allowlist exata `APP_ORIGINS=https://nortfood.pages.dev,https://nortfood.netlify.app`, preservando `APP_ORIGIN` como fallback. Configurar a variável no projeto principal correto e implantar a função; o build estático sozinho não atualiza esse serviço. Preflight das duas origens deve retornar 200; origem intrusa, 403; POST anônimo de origem permitida, 401. Um ensaio autenticado de upload continua separado desses controles.

Carga controlada do pacote: `node scripts/load-isolated.cjs dist-pages` contata somente loopback, retorna falha quando há erros e não mede capacidade do Cloudflare ou pedidos reais. A homologação remota somente de leitura tem comando próprio e limites de segurança.

Não executar push que acione uma publicação legada do Netlify. A autorização atual é exclusiva para Cloudflare Pages. Não contratar créditos, fazer upgrade, modificar DNS ou ativar pedidos comerciais como parte do deploy técnico.

## Testes e limites

`pnpm test` e `pnpm test:demo` são verificações locais. Dados sintéticos e mocks nunca comprovam operação remota real. `pnpm test:load:isolated` testa somente GET / no servidor HTTP em loopback nos níveis 50, 100, 250, 500 e 1000; não contata hospedagem ou banco remoto. `scripts/load-homologation-readonly.cjs` aceita somente a homologação isolada, com piloto bloqueado e catálogo vazio, até 50 leitores/500 consultas GET, abortando em erro ou latência elevada. Nenhum desses ensaios demonstra capacidade de jornadas comerciais completas. Nunca direcionar carga sintética para produção gratuita.

Conferir limites dos serviços antes de novas publicações ou campanhas. Não habilitar recarga, upgrade ou serviços pagos automaticamente.
