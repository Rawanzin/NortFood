# NortFood como PWA

O NortFood continua sendo um site estático com Supabase e também pode ser instalado como aplicativo quando o navegador oferece suporte a PWA.

## Publicação principal no Cloudflare Pages

O endereço principal é `https://nortfood.pages.dev`. Configure `NORTFOOD_APP_URL=https://nortfood.pages.dev`, `NORTFOOD_PUBLIC_ACCOUNTS=yes` e as variáveis públicas existentes do Supabase. Execute `pnpm build:pages` e audite com `node scripts/audit-release.cjs dist-pages`. Publique somente `dist-pages` no projeto Pages existente `nortfood`, usando a conta autenticada correta.

Depois da publicação, `node scripts/verify-pages-package.cjs` compara os arquivos com o pacote local; `node scripts/verify-public-pilot.cjs https://nortfood.pages.dev` verifica a interface e a tela offline. O Pages redireciona HTML para caminhos sem extensão: o worker trata especificamente `/offline.html` → `/offline` e continua excluindo outros redirecionamentos e respostas privadas do cache.

A publicação técnica não habilita o piloto nem pedidos comerciais. A identidade do aplicativo (`id`, `scope` e `start_url`) permanece `/`; atualizar conteúdo não exige reinstalar o PWA da mesma origem.

Para homologação isolada, use `pnpm build:homologation`. O comando lê `.env.homologacao` e gera `dist-homologacao`; mantenha essa saída em uma URL HTTPS separada e protegida.
O destino de publicação autorizado é exclusivamente o Cloudflare Pages. Configurações legadas de outros provedores não autorizam publicações neles.

## Instalação

- **Android/Chrome:** abra o site em HTTPS, aguarde o botão **Instalar NortFood** ou use o menu do navegador em **Instalar aplicativo**.
- **Computador compatível:** use o ícone de instalação na barra de endereço ou o botão exibido pelo NortFood.
- **iPhone/iPad:** abra no Safari, toque em **Compartilhar**, escolha **Adicionar à Tela de Início** e confirme. O NortFood mostra essas instruções quando o Safari não oferece o prompt automático.

A linha **Instalar NortFood** fica no Perfil, inclusive antes do login, com instruções adequadas ao navegador. O banner da home aparece dentro do conteúdo quando há prompt disponível ou no Safari iOS. Dispensá-lo adia o convite por 30 dias e mantém o acesso manual pelo Perfil. A experiência oficial só abre após um clique. `appinstalled` e o modo standalone ocultam os convites; o site não pode garantir a detecção de uma instalação feita por outro navegador ou dispositivo.

## Atualizações e cache

`sw.js` usa `nortfood-public-<hash do build>`. O build calcula a versão automaticamente a partir dos arquivos públicos. Não é necessário incrementar uma versão manual. A nova versão aguarda o usuário tocar em **Atualizar**; operações com formulário ocupado adiam a aplicação. Caches antigos do NortFood são removidos após a ativação.

Para atualizar o aplicativo já instalado, conecte-se à internet e abra ou retorne ao NortFood. Ele verifica novas versões ao voltar ao primeiro plano. Conclua ou salve formulários e toque em **Atualizar** quando o aviso aparecer. Aplicativos instalados pelo Netlify e pelo Pages pertencem a origens distintas; uma publicação no Pages atualiza o aplicativo instalado pelo Pages.

O service worker armazena somente arquivos estáticos públicos do mesmo domínio. HTML de navegação usa rede, com fallback em `offline.html`, sem checkout offline. Configuração, JSON, requisições do Supabase, autenticação, storage, funções, pedidos, pagamentos, consultas com parâmetros e respostas com `Authorization`, `private` ou `no-store` não entram no cache. CSS, JS e imagens usam rede primeiro e cache público quando a rede falha.

## Arquivos PWA

- `site.webmanifest`: fonte da identidade, escopo e ícones do app. O build também publica `/manifest.webmanifest` com o mesmo conteúdo.
- `sw.js`: atualização segura, cache público e fallback offline.
- `pwa.js` e `pwa.css`: registro do worker e experiência de instalação.
- `assets/app-icons/*.png`: ícones 192/512 comuns e maskable com nomes baseados no conteúdo. Fundo branco, símbolo oficial vermelho e margens seguras. Os SVGs antigos não são usados pelo manifesto novo.
- `apple-touch-icon.png`: ícone para instalação no ecossistema Apple.

## Splash e barras do Android — 31/10/2026

O manifesto usa `background_color` e `theme_color` brancos (`#ffffff`). Os PNGs têm fundo branco e o símbolo vermelho recortado da logo oficial existente em `assets/logo-light.png`, com proporções e pixels preservados. A origem e os hashes estão em `docs/APP_ICON_SOURCE.json`. O Chrome/Android gera a splash nativa a partir do manifesto e do ícone; nenhuma tela artificial atrasa a abertura.

A meta `theme-color` começa branca, inclusive no documento de erro. `theme.js`, carregado antes das folhas de estilo, aplica `#ffffff` no tema claro e `#000000` no escuro, acompanhando a escolha salva, mudanças do sistema e outras abas. `color-scheme` informa ao navegador o contraste selecionado. O viewport permite safe areas; somente o espaço reservado no rodapé standalone acompanha a cor da barra, preservando a superfície do menu do NortFood.

Não existe uma meta web padronizada `navigation-bar-color` que permita impor a cor e os ícones dos botões Android. O navegador e o sistema operacional decidem a aparência final, incluindo transparência e scrim em algumas versões. Os testes em Chrome desktop verificam manifesto, pixels dos ícones, primeira pintura e as cores solicitadas pela página; não comprovam a barra nativa nem a splash de um Android físico.

Após publicar no Pages, abra o app instalado pela mesma origem com internet e aplique a atualização oferecida. O WebAPK/manifesto e os ícones podem seguir um ciclo de atualização próprio do navegador. Se o ícone/splash antigo persistir, remova o atalho/app e reinstale a partir de `https://nortfood.pages.dev`; valide em Android com navegação por gestos e por três botões nos dois temas. Não há garantia do prazo dessa atualização pelo código web.

Para reproduzir os ícones atuais:

```powershell
pnpm generate:favicons
```

O modo `--source caminho/icone-oficial.png` continua disponível para o PNG oficial com transparência. Ele mantém os pixels e margens do arquivo fornecido; revise seu fundo antes de substituir os ativos atuais.

Referências: [manifesto e splash Android](https://web.dev/learn/pwa/web-app-manifest), [cores do PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Customize_your_app_colors) e [barras Android e limites do sistema](https://developer.android.com/develop/ui/views/layout/edge-to-edge).

## Evidência HTTPS de 01/11/2026

A release `c64b4e442beb444a7d7e` foi publicada no principal, com manifesto/ícones brancos conferidos por bytes e Chrome, cache privado excluído e fallback offline aprovado. O ensaio de transição no principal comprovou formulário preservado e chegada à versão correta, mas terminou parcial por um contador que confundia alterações de rota SPA com recarregamentos. A falha de instrumentação foi preservada e reproduzida separadamente.

O teste corrigido, com identidade do documento e `DOMContentLoaded`, foi repetido integralmente em um alias HTTPS isolado do mesmo Pages, do pacote anterior `62ac362f436ce49a1de9` para o novo. Passou: worker aguardando confirmação, mesmos campos/valores antes do clique, exatamente uma recarga após Atualizar, manifesto e tema claro brancos, remoção apenas dos caches públicos antigos e exclusão de respostas privadas. Nenhum cadastro, senha, endereço ou pedido foi enviado; zero erros JavaScript. A produção permaneceu na versão nova durante o reteste.

Evidências: `test-results/etapa10-20261031/pwa/https-update.json` e `https-preview-update.json`. Isso confirma o ciclo do service worker em Chrome HTTPS; instalação/WebAPK, splash nativa e botões Android físicos continuam pendentes.

## Ícone oficial fornecido em 01/11/2026

Fonte preservada sem alteração em `assets/app-icon-original.png` (SHA-256 `495b1f5590a7fdd76a953b7ae503020925f3ba015d0b78a2e1933bb46a2c2997`). Derivados transparentes com proporção original e margens maskable seguras; manifesto mantém fundo de abertura branco. O sistema operacional pode aplicar sua própria superfície ao ícone. Favicon e Apple Touch usam versão na URL; ícones do manifesto usam hash no nome. Atualização automática de atalhos já instalados depende do navegador: remover o PWA/atalho antigo e reinstalar pela origem oficial é o caminho mais confiável.
