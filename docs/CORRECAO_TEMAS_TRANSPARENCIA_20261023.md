# NortFood — temas, logo e transparência corrigidos em produção

**Publicado e verificado em 23/10/2026:** https://nortfood.netlify.app.

Site Netlify existente `3bca8094-c54e-416c-89d8-bec51a3d252e`; deploy de produção `6adb7f00d38e9e6a857df8f4`, estado `ready`; branch `release/nortfood`; commit público `a95ee3fee65c54aa4e95c216107e4a05f9d746f4`; release HTTPS `3fb3a3315bf6b1ea06cd`. O endereço e a integração GitHub–Netlify foram preservados. [Evidência da entrega](../test-results/theme-final-20261023/delivery.json).

## Causas identificadas

1. **Tema claro continuava escuro:** o comportamento foi reproduzido com Auto Dark do Chrome. O atributo de tema, o ícone e as cores computadas podiam estar claros enquanto os pixels ainda eram escurecidos pelo navegador. Os testes anteriores verificavam principalmente atributos, arquivos de logo e ausência de overflow; isso não detectava a repintura externa. A declaração anterior `color-scheme:light` não impedia o escurecimento automático. Agora a escolha explícita usa `only light`/`only dark`, sinalização antecipada no HTML e tokens comuns a ambos os temas. A proteção segue o mecanismo documentado pelo [Chrome](https://developer.chrome.com/blog/auto-dark-theme) e pela [especificação CSS](https://www.w3.org/TR/css-color-adjust-1/).
2. **Logo sem contraste/aparência correta:** as variantes oficiais já estavam corretas, mas a logo preta selecionada para o tema claro podia aparecer sobre a página escurecida externamente. Foram preservados integralmente os arquivos oficiais preto/vermelho e branco/vermelho; a troca acompanha a paleta efetivamente selecionada. Nenhum filtro ou alteração de símbolo, tipografia ou cores da imagem foi aplicado.
3. **Quadrado branco/rosa em “Todos”:** o PNG original e o WebP otimizado já tinham canal alfa real. A regra `.category.active .cat-icon { background:#ffe0e1 }` tinha maior especificidade do que a regra transparente genérica. Foi corrigida na origem para `background:transparent`. O card e seu estado de seleção permanecem; a ilustração e seu contorno original não foram editados.

O anexo desta etapa continha o texto do pedido, sem os dois arquivos de captura mencionados. A investigação usou os ativos oficiais locais, a aba pública existente e reproduções de navegador registradas.

## Correções

- `theme.css` centraliza paletas claras/escuras: página, superfícies, campos, texto, bordas, estados ativos, erros, ações, cabeçalho e rodapé. O vermelho oficial permanece como token de marca; textos de destaque recebem contraste adequado em cada fundo.
- As mesmas regras atendem cliente, vendedor, administração, navegação, modais, carrinho, formulários, busca, estados vazios, conversas e preferências. Foram removidas cores fixas de avisos PWA e três cores `!important` antigas nos textos de autenticação.
- Transições de cor/fundo não deixam componentes presos visualmente à paleta anterior após o toque. Trocar tema não recria formulários nem limpa carrinho/sessão. A preferência continua em `nortfood-theme`, restaurada em recarga e nova aba; sem escolha explícita, acompanha o sistema.
- `scripts/theme-assets.cjs` gera nomes com SHA-256 do conteúdo para o controlador e a folha de tema. HTML principal e 404 usam essas URLs; os bytes publicados foram conferidos contra o nome. Os arquivos com hash recebem cache imutável, e os aliases existentes continuam revalidados para compatibilidade.
- O SW continua versionado pelo conteúdo. A página offline agora respeita o tema salvo, com os dois arquivos públicos de tema no cache essencial. APIs, configurações, tokens, pedidos e respostas privadas continuam fora do cache.
- A atualização controlada apareceu na aba oficial existente, foi aplicada pelo botão Atualizar e preservou a escolha clara. Não houve limpeza de armazenamento do usuário.

## Testes executados

| Verificação | Resultado | Evidência / escopo |
|---|---|---|
| Suíte completa final | APROVADO | 149 testes, zero falhas; [log](../test-results/theme-final-20261023/full-suite-final.txt) |
| Fluxos no tema claro | APROVADO | 107 verificações; [log](../test-results/theme-final-20261023/flows-light.txt) |
| Fluxos no tema escuro | APROVADO | 107 verificações; [log](../test-results/theme-final-20261023/flows-dark.txt) |
| Paletas nas telas de cliente/vendedor | APROVADO local | Além dos fluxos, verificações de cores renderizadas em páginas, cards, campos, modais e painéis; viewport de 320 a 1365 px. Dados sintéticos locais |
| Administração | APROVADO visual local | HTML do componente real `createAdmin` com contexto explicitamente sintético; claro/escuro em 390 e 1365 px; [registro](../test-results/theme-final-20261023/admin-render.json). Não concede nem comprova acesso administrativo remoto |
| Tema manual com sistema claro | APROVADO | Pixels, paleta, logos, troca imediata, recarga e nova aba |
| Tema manual com sistema escuro e Auto Dark | APROVADO | O controle sem proteção é escurecido; o aplicativo permanece claro quando selecionado, e escuro quando selecionado. Testes conferem pixels de captura, não apenas CSS computado |
| Transparência e logos | APROVADO | Alfa real do PNG/WebP, fundo CSS transparente, imagens decodificadas e sem filtro. Nenhum arquivo em `assets/` foi alterado nesta etapa |
| PWA / offline / atualização | APROVADO no Chromium | Troca de versão por SW, escolha clara preservada após atualizar e no fallback offline; dados de formulário preservados enquanto a atualização aguarda ação |
| Sintaxe e arquitetura | APROVADO | 119 arquivos sem erro; 18 módulos, zero ciclos/violações. O comando lint valida sintaxe, não é um lint semântico completo |
| Build / pacote público | APROVADO | Produção gerada, 93 arquivos auditados, zero problemas encontrados |
| Prévia HTTPS | APROVADO | 38/38 verificações e 16 combinações de tema/viewport, incluindo pixels com Auto Dark |
| Produção HTTPS | APROVADO | 38/38 verificações; fonte/release conferidas; [verificação HTTP](../test-results/launch-20261023/https-official.json) |
| Produção no navegador | APROVADO no recorte | 320/360/375/390/412/430/768/1365 px × dois temas; pixels, logo carregada, transparência CSS, banners, navegação e console; [registro](../test-results/theme-final-20261023/official-browser.json) |
| Cache de tema publicado | APROVADO | Dois arquivos com hash, HTTP 200 e `public,max-age=31536000,immutable`; nome corresponde aos bytes. Configuração privada não foi incluída no pacote |
| Lighthouse público | APROVADO no recorte automatizado | Acessibilidade 100, boas práticas 100, zero erros de console e contraste aprovado; [relatório](../test-results/theme-final-20261023/lighthouse.report.html) |

Lighthouse mobile: performance 77, LCP 4,93 s, CLS 0; SEO 69 com noindex preservado durante o modo de preparação. Não é medição de campo ou garantia de desempenho. [Métricas](../test-results/theme-final-20261023/quality.json).

## Limites e pendências reais

- Android/iPhone físicos, Safari real e instalação física do PWA: **NÃO TESTADOS** nesta execução. O ciclo real do Service Worker foi testado em Chromium e a atualização foi aplicada na aba HTTPS existente; isso não equivale a validar um aparelho físico.
- Um experimento artificial combinando `WebContentsForceDark` com preferência de sistema emulada como clara ignorou `only light` até em uma página mínima sem NortFood. Esse ensaio foi reprovado e isolado; não foi convertido em aprovação do aplicativo. Os testes aprovados cobrem sistema claro normal e sistema escuro com escurecimento automático, alternando manualmente ambas as paletas. Inversões externas que ignoram as regras CSS do autor não podem ser garantidas pelo aplicativo sem distorcer imagens ou interferir nas preferências de acessibilidade. [Diagnóstico de controle](../test-results/theme-final-20261023/system-light-diagnosis.txt).
- Nenhum teste visual local foi apresentado como autenticação comercial remota. O modo de preparação, as restrições comerciais, o banco e as integrações Supabase foram preservados; esta correção não libera pedidos comerciais.

## Arquivos modificados

Interface: `theme.js`, `theme.css`, `styles.css`, `index.html`, `404.html`, `offline.html`, `pwa.js`, `pwa.css`, `sw.js`.

Publicação: `_headers`, `scripts/build.cjs`, novo `scripts/theme-assets.cjs`.

Testes: `package.json`, `tests/theme-rendering.test.cjs`, `tests/theme-palette.cjs`, `tests/theme-interface.test.cjs`, `tests/final-audit.test.cjs`, `tests/flows.cjs`, `tests/pwa-browser.test.cjs`.

Documentação privada: este relatório e o plano de recuperação. O diretório `assets/` não foi modificado; não houve substituição ou geração de ilustrações, banners ou logos.

## Recuperação e custos

Checkpoint anterior às alterações: `4839794`, tag `checkpoint/theme-transparency-20261023`. Preservar trabalho posterior antes de recuperar arquivos. Para regressão publicada, criar um commit de reversão na fonte de produção e deixar o fluxo GitHub–Netlify gerar novo deploy, seguido de conferência HTTPS. Não usar reset/clean nem restaurar banco para reverter aparência.

Foram usados o projeto e o site existentes. Nenhum serviço pago, domínio, plano novo ou cobrança foi contratado. Relatórios internos e histórico privado permanecem fora da branch pública sanitizada.

Capturas da produção: [claro no celular](../test-results/theme-final-20261023/official-light-390.png), [escuro no celular](../test-results/theme-final-20261023/official-dark-390.png), [claro desktop](../test-results/theme-final-20261023/official-light-1365.png), [escuro desktop](../test-results/theme-final-20261023/official-dark-1365.png).
