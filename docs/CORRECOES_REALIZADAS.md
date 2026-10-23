# Correções realizadas — 20/10/2026

Alterações incrementais, comparadas ao ponto de recuperação desta tarefa. Melhorias anteriores preservadas; nenhum SQL, logo, configuração de ambiente ou dado principal alterado.

| Arquivo | Finalidade |
|---|---|
| app.js | safeImageUrl/imageAttr/coverStyle; proteção de capa, logos e fotos; emoji do carrinho escapado; frete por endereço com ausência explícita; revisão bloqueada fora da zona; total a confirmar; seleção de entrega desabilitada quando indisponível; nomes acessíveis dos controles e CTA sem pressupor entrega; rótulo de avaliação conforme modo |
| refinements.css | Texto secundário com contraste maior e foco sólido; escurecimento apenas de texto de ações/preços sobre fundos claros, preservando marca e tema |
| src/commercial.js | Manter endereço selecionado pelo ID em refresh da mesma conta; respeitar mudança de identidade e endereço removido |
| assets/nortfood-backend.js | Bundle regenerado de commercial.js |
| package.json | Incluir regressões finais no comando test; sem dependências novas |
| tests/final-audit.test.cjs | Seis regressões: frete/cobertura/UF/zero; carrinho/revisão; protocolos de imagens; injeção no navegador em seis larguras; seleção de endereço/isolamento entre identidades; contraste/foco |
| tests/helpers/final-readonly-live.cjs | Ensaio explícito com conta comum sintética e destino de homologação fixo: leituras, negativas de permissão e login/logout; sem segredo no código |
| docs/AUDITORIA_FINAL_20261020.md | Diagnóstico P0/P1/P2 e alcance real |
| docs/CORRECOES_REALIZADAS.md | Este registro |
| docs/VALIDACAO_BETA.md | Evidências locais, remotas e pendentes |
| docs/PENDENCIAS_LANCAMENTO.md | Bloqueios e intervenções mínimas |

Regressões verificam comportamento, inclusive atributos/tags hostis no DOM e endereço secundário sobrevivendo a POLL. Frete zero válido continua aceito quando a zona configurada tem fee_cents=0; retirada/mesa continuam sem taxa de entrega. Não houve alteração da validação definitiva no servidor.

Sem redesign: tema claro, imagens originais, cinco abas inferiores, banners, categorias, carrinho, menus e painéis mantidos. A revisão mostra valores coerentes em vez de prometer entrega gratuita por ausência de cobertura. Sem remoção de funções comerciais, criação de tecnologia nova ou refatoração ampla.

Evidências: test-results/final-audit/regressions.txt, full-tests-final.txt, affected-final.txt, change-scope.json e build-manifest.json. Os diffs anteriores à tarefa continuam no Git e na recuperação. Não usar git diff HEAD como lista exclusiva destas mudanças: o checkout já estava modificado.

A conferência de whitespace do diff contra HEAD aponta somente a linha vazia final de app.js que já consta na cópia inicial de recuperação. Foi preservada; não é erro de sintaxe nem regressão destas correções.
