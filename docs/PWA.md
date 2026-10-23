# NortFood como PWA

O NortFood continua sendo um site estático com Supabase e também pode ser instalado como aplicativo quando o navegador oferece suporte a PWA.

## Deploy no Netlify

1. Mantenha o deploy em HTTPS e configure o diretório de publicação como `dist`.
2. Use o comando `pnpm build`. O `netlify.toml` existente já define o comando e o diretório.
3. Configure as variáveis públicas do Supabase no ambiente do deploy. Segredos de servidor não devem ser colocados no frontend.
4. Faça uma publicação somente depois da revisão do ambiente. Esta implementação não publicou nada.

Para homologação isolada, use `pnpm build:homologation`. O comando lê `.env.homologacao` e gera `dist-homologacao`; mantenha essa saída em uma URL HTTPS separada e protegida.

## Instalação

- **Android/Chrome:** abra o site em HTTPS, aguarde o botão **Instalar NortFood** ou use o menu do navegador em **Instalar aplicativo**.
- **Computador compatível:** use o ícone de instalação na barra de endereço ou o botão exibido pelo NortFood.
- **iPhone/iPad:** abra no Safari, toque em **Compartilhar**, escolha **Adicionar à Tela de Início** e confirme. O NortFood mostra essas instruções quando o Safari não oferece o prompt automático.

## Atualizações e cache

`sw.js` usa o cache versionado `nortfood-public-v1`. Ao alterar o shell público (HTML, CSS, JS ou manifesto), incremente `CACHE_VERSION` para liberar os arquivos antigos durante a ativação do novo service worker.

O service worker armazena somente shell e assets públicos do mesmo domínio. Requisições do Supabase, autenticação, storage, funções, pedidos, pagamentos e respostas com `Authorization` nunca entram no cache. O fallback offline abre o shell do app; dados autenticados continuam dependendo de conexão.

## Arquivos PWA

- `site.webmanifest`: identidade, escopo e ícones do app.
- `sw.js`: atualização segura, cache público e fallback offline.
- `pwa.js` e `pwa.css`: registro do worker e experiência de instalação.
- `assets/icon-192-maskable.png` e `assets/icon-512-maskable.png`: ícones maskable gerados a partir da logo oficial.
- `apple-touch-icon.png`: ícone para instalação no ecossistema Apple.
