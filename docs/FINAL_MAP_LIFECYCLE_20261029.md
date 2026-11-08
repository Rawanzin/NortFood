# Correção do fechamento rápido do mapa — 29/10/2026

## Defeito comprovado

Ao selecionar uma cidade e fechar o modal durante o zoom, o Leaflet 1.9.4 concluía uma transição CSS depois de `Map.remove()`. O timeout de 250 ms de `_onZoomTransitionEnd` tentava recalcular a origem de pixels usando o painel já removido, causando `Cannot read properties of undefined (reading '_leaflet_pos')`.

O defeito foi reproduzido localmente em Chrome headless com Leaflet real: busca de cidade, seleção de resultado e fechamento no evento público `zoomstart`, seguido de espera de 400 ms. O stack coincide com o erro público: `_onZoomTransitionEnd` → `_move` → `_getNewPixelOrigin` → `_getMapPanePos`.

Evidências anteriores à correção:

- `test-results/final-media-20261029/rapid-close-before.json`.
- `test-results/final-media-20261028/rapid-close-before.txt` (nome da pasta histórica; execução desta regressão em 29/10).

## Correção

`assets/nearby-map.js` passa a criar o mapa modal com a opção pública `zoomAnimation:false`. Isso evita agendar a transição CSS que pode sobreviver ao fechamento. A seleção de cidade, o zoom, o GPS, o arraste, os controles e o visual permanecem disponíveis. Nenhuma alteração em internals do Leaflet ou nos arquivos do fornecedor.

## Validação

`node --test tests/nearby-map.test.cjs`: **4/4 aprovados**, sem erros de página. A regressão também verifica que o modal reabre após o fechamento rápido. O mesmo cenário falhou antes da correção e passou depois.

Evidências posteriores:

- `test-results/final-media-20261029/rapid-close-regression.json` — `errors: []`.
- `test-results/final-media-20261029/map-tests-final.txt` — quatro testes aprovados.

Busca e tiles foram interceptados no teste; o motor Chrome e o Leaflet são reais. Nenhuma chamada comercial, escrita remota, migração ou implantação foi feita por este subagente. A publicação e a verificação da versão HTTPS corrigida permanecem com o agente principal.
