# NortFood

Aplicação existente em HTML/CSS/JavaScript, esbuild e Supabase. Endereço principal temporário: https://nortfood.pages.dev. O endereço Netlify é preservado, mas suas publicações estão suspensas enquanto a cota estiver bloqueada.

## Build

Node 24 e pnpm 11.25.0. Executar `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm check:architecture` e `pnpm build`. Manter `pnpm-workspace.yaml`, que autoriza somente o script de instalação do esbuild. Publicar apenas `dist`. O build valida a chave pública, usa staging próprio e identifica o conteúdo da versão. A tela inicial é desenhada antes de concluir o carregamento do SDK; os controles comerciais aguardam a identidade e o catálogo.

Variáveis de build: `NORTFOOD_SUPABASE_URL`, `NORTFOOD_SUPABASE_PUBLISHABLE_KEY`, `NORTFOOD_APP_URL=https://nortfood.netlify.app`, `NORTFOOD_PUBLIC_PREVIEW=no`, `NORTFOOD_PUBLIC_ACCOUNTS=yes`, `NORTFOOD_ENABLE_INDEXING=no`. Não fornecer service_role, PATs, senhas ou segredos de servidor ao frontend.

## Estado operacional

A interface pública permite acessar cadastro, login e recuperação. A disponibilidade real depende do Supabase Auth e do SMTP autorizado; abrir o formulário não comprova criação de conta. Categorias editoriais permanentes aparecem mesmo com catálogo de lojas vazio. A migração 008 adiciona rascunhos privados, envio para análise e limite administrativo de uma loja aprovada. Não habilita pedidos ou concede administradores. Para liberar operação, validar loja nominal autorizada, e-mail real, sessões independentes, RLS e checkout, recebimento do vendedor, confirmação e contingência. Alterar uma flag de interface não aprova o lançamento comercial.

A migração 009 acrescenta ingredientes removíveis, snapshot no pedido, restrições de venda e configuração comercial privada. A importação de cardápio é separada, transacional e idempotente. Não reaplicar migrações nem publicar lojas pendentes para preencher a interface. O cadastro completo solicita contato e endereço; vendedores informam também loja e categoria real. A migração 011 grava esses dados somente após autenticação, de forma atômica e idempotente. Dados pendentes ficam temporariamente na aba sem senhas; confirmação em outro navegador pode exigir completá-los novamente. Nenhum cargo administrativo vem do formulário ou dos metadados. O mapa de descoberta abre em modal, com GPS pontual e busca manual; não salva automaticamente endereço ou coordenadas.

## PWA

Android/Chrome: usar Instalar quando oferecido pelo navegador. iPhone/iPad: Safari → Compartilhar → Adicionar à Tela de Início. O SW protege respostas privadas, oferece uma página offline e pede confirmação para aplicar atualização. Fechar/cancelar o convite de instalação adia nova oferta por 30 dias. Instalação física em aparelhos exige ensaio específico.

## Publicação e reversão

Somente `release/nortfood` é branch de produção Netlify. Branches experimentais não devem ser configuradas como produção. O comando em `netlify.toml` executa validação sintática, testes de serviços/sessões/cache, verificação arquitetural, build e auditoria do pacote. Diretório: `dist`. A configuração do ambiente fica na hospedagem; o repositório não contém credenciais. A integração usa chave SSH de leitura restrita a este repositório e webhook oficial do Netlify para eventos push; não distribui token administrativo do Netlify ao GitHub.

Validar uma prévia com `node scripts/verify-public-pilot.cjs https://<deploy>--nortfood.netlify.app` antes da promoção. Após publicar: `pnpm test:public` e `node scripts/verify-public-pilot.cjs`. Esses verificadores não criam contas ou pedidos; registram separadamente a indisponibilidade real do Auth e o bloqueio de pedidos. A aceitação autenticada exige contas de teste e evidência própria.

Para recuperação, reverter o commit correspondente em novo commit de `release/nortfood` e deixar o deploy Git publicar a correção. Conferir HTTPS, `release.json`, configuração pública e bloqueio comercial. Não restaurar banco para reverter frontend. Migrações registradas não devem ser reaplicadas.

Alternativa gratuita autorizada: Cloudflare Pages, projeto `nortfood`, mesma aplicação e mesmo backend. Gerar com `NORTFOOD_APP_URL=https://nortfood.pages.dev`, `NORTFOOD_PUBLIC_ACCOUNTS=yes` e `pnpm build:pages`; auditar com `node scripts/audit-release.cjs dist-pages`. Publicar apenas o conteúdo de `dist-pages`, com `_headers` e `404.html` nativo, sem a regra 404 específica do Netlify. O upload direto aceita o pacote estático; não altera DNS nem o site Netlify. Reversão: republicar um pacote previamente validado. Configurar a origem exata na allowlist do Auth antes de homologar OAuth. Uma sessão não é transferida entre as duas origens.

Se a cota do Netlify impedir produção, não contratar créditos nem tentar contornar o bloqueio. O código pode ser sincronizado com `[skip netlify]` no commit público, conforme o mecanismo oficial, sem tentar novo deploy. O próximo commit sem esse marcador volta a disparar o build automático.

## Testes e limites

`pnpm test` e `pnpm test:demo` são verificações locais. Dados sintéticos e mocks nunca comprovam operação remota real. `pnpm test:load:isolated` testa somente GET / no servidor HTTP em loopback nos níveis 50, 100, 250, 500 e 1000; não contata hospedagem ou banco remoto. `scripts/load-homologation-readonly.cjs` aceita somente a homologação isolada, com piloto bloqueado e catálogo vazio, até 50 leitores/500 consultas GET, abortando em erro ou latência elevada. Nenhum desses ensaios demonstra capacidade de jornadas comerciais completas. Nunca direcionar carga sintética para produção gratuita.

Netlify e Supabase usam planos Free. Limites são compartilhados pela conta/organização e devem ser consultados no painel antes de novas publicações ou campanhas. Não habilitar recarga, upgrade ou serviços pagos automaticamente.
