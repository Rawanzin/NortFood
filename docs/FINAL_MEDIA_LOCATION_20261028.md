# Mídia e localização — revisão final de 28/10/2026

## Evidência atual e limites

- Preflight real às 15:37 BRT no Supabase principal `zwkhqahivthzivmuirjr`: `https://nortfood.pages.dev` recebeu HTTP 403 e anunciava `Access-Control-Allow-Origin: https://nortfood.netlify.app`; Netlify recebeu 200; origem intrusa recebeu 403. Isso confirma bloqueio de upload por CORS, separado do carregamento de imagens estáticas.
- HEAD real de 59 arquivos estáticos de imagem da versão pública `8868f199f4924ac0a7ec`: **59 HTTP 200**, 58 com MIME de imagem anunciado; o HEAD de `/favicon.ico` não anunciou Content-Type. Nenhum desses caminhos retornou 403. HEAD comprova acesso HTTP, sem substituir inspeção visual ou decode.
- Nenhum upload autenticado foi realizado nesta revisão; nenhuma foto ou dado comercial da Dan Burguer foi alterado.

Evidências: `test-results/final-media-20261028/preflight-before.json` e `public-images-before.json`. As datas e a versão acima identificam a fotografia anterior à implantação final conduzida pelo agente principal.

## Correções realizadas

- `supabase/functions/upload-media/runtime-config.mjs`: allowlist exata `APP_ORIGINS`, separada por vírgula, limitada a dez entradas e com falha fechada se houver origem inválida. `APP_ORIGIN` legado permanece como fallback quando não houver allowlist configurada. Wildcard, credenciais na URL, caminhos, `null` e HTTP público são recusados.
- `supabase/functions/upload-media/index.ts`: aceita somente origens da allowlist e reflete o cabeçalho CORS apenas para uma origem autorizada. Origens ausentes/intrusas continuam bloqueadas. Autenticação, vínculo com loja, quota atômica, limites de tamanho e processamento integral da imagem foram preservados.
- `assets/nearby-map.js`: coordenadas ausentes, vazias ou booleanas não viram `(0,0)`; o cartão da região selecionada escolhe a loja mais próxima, em vez da primeira entrada do catálogo; a lista válida continua disponível quando Leaflet não carrega. Resultados de busca sem coordenadas válidas são ignorados. Preservado o visual e as mudanças que já estavam no arquivo.
- `app.js`, somente `lookupNearbyLocation`: cada variante da mesma busca respeita o intervalo mínimo de 1,1 segundo, compartilhado com a fila de geocodificação. Antes, o intervalo era aplicado somente antes da tarefa e as variantes subsequentes eram enviadas imediatamente.

## Implantação necessária para upload

No projeto principal já existente, configurar:

```text
APP_ORIGINS=https://nortfood.pages.dev,https://nortfood.netlify.app
```

Preservar o valor legado de `APP_ORIGIN` e os segredos existentes. Implantar novamente `upload-media`, incluindo `index.ts`, `runtime-config.mjs` e `media-validation.mjs`. Não é necessária migração de banco ou alteração de RLS.

Depois da implantação, confirmar preflight 200 para Pages e Netlify, cabeçalho refletindo a origem exata e 403 para origem intrusa. Um POST anônimo na origem permitida deve continuar recebendo 401. Upload real, assinatura e carregamento da imagem exigem sessão de vendedor e loja de QA autorizada; não confundir preflight aprovado com essa jornada completa.

Nenhuma configuração remota foi alterada por este subagente. A implantação e sua prova posterior cabem ao agente principal nesta execução.

## Testes

`node --test --test-concurrency=1 tests/media-upload.test.cjs tests/nearby-map.test.cjs tests/delivery-address.test.cjs tests/store-location.test.cjs`: **11/11 aprovados**, sem cancelamentos. Evidência `test-results/final-media-20261028/local-tests-final.txt`.

Após o último refinamento do mapa e do tratamento de coordenadas nos resultados da busca, `node --test tests/nearby-map.test.cjs`: **3/3 aprovados**. Evidência `test-results/final-media-20261028/map-regressions-final.txt`.

Cobertura comprovada: decode WASM real de PNG/JPEG/WebP, MIME e arquivos truncados, limites de pixels e multipart, quota de mídia e permissões em PostgreSQL isolado; mapa real Leaflet em modal; GPS simulado com sucesso/negação/indisponibilidade/timeout; busca interceptada com espaçamento entre variantes; seleção manual; exclusão de coordenadas inválidas e lojas em rascunho; ordenação por distância; descarte de callbacks; endereço estruturado e separação entre explorar o mapa e salvar um endereço; responsividade e temas claro/escuro sob as condições dos testes.

Não comprovado nesta revisão: GPS em dispositivo físico, upload autenticado no backend principal após a correção, imagens oficiais da Dan Burguer, disponibilidade comercial ou recebimento de pedido real. Os testes usam lojas e endereços sintéticos somente em memória local e não criam estabelecimentos remotos.

## Dados e segurança

Sem migrações, sem escrita de dados remotos, sem criação de contas, pedidos ou fotos. A Dan Burguer permanece sujeita às travas comerciais do servidor. O mapa recebe exclusivamente o catálogo público e ainda filtra lojas aprovadas com coordenadas válidas; não transforma rascunhos em lojas públicas nem infere frete por distância em linha reta.
