# NortFood — reversão cirúrgica do tema escuro

## Escopo

Retirada da implementação de alternância claro/escuro, mantendo a aplicação atual. Nenhum reset, checkout geral, reversão de commit ou restauração indiscriminada foi usado. A referência foi o inventário da implementação em `TEMAS_20261020.md`, a inspeção dos trechos atuais e uma cópia local anterior à reversão em `test-results/theme-revert/before/`.

## Arquivos e trechos revertidos

| Arquivo | Alteração restrita ao tema |
|---|---|
| `app.js` | Retirados controles do cabeçalho, configurações, modais e carrinho; retirada a seção Aparência; logo passa a usar sempre o arquivo claro existente. Navegação, formulários, carrinho e regras comerciais preservados. |
| `index.html`, `404.html` | Retiradas somente referências ao bootstrap e ao CSS de tema. Favicons recentes, manifesto, scripts comerciais, segurança e estilos originais preservados. |
| `assets/theme-bootstrap.js` | Removido controlador, persistência, listeners de dispositivo/abas, ícones lua/sol e troca de logos. |
| `assets/theme.css` | Removidos tokens, sobrescritas e ajustes visuais introduzidos para a alternância, incluindo os que afetavam o tema claro. |
| `styles.css` | Acrescentado apenas `color-scheme:light` à raiz para controles nativos permanecerem claros mesmo no dispositivo escuro; cores, medidas e regras anteriores preservadas. |
| `tests/ui-contract.test.cjs` | Retiradas chamadas de alternância; mantidos contratos de checkout, autorização, paginação, localização, exportação, preservação do carrinho durante POLL, rotas e tamanhos de tela. |
| `tests/theme.test.cjs`, `tests/helpers/theme-check.cjs` | Removidos testes/helpers exclusivos da implementação retirada. |
| `tests/light-interface.test.cjs` | Regressões substitutas: aparência clara com dispositivo escuro e preferência antiga, formulários, carrinho, 404 e responsividade. |
| `package.json` | Substituída suíte do tema pelas regressões de reversão; removido comando `test:theme`. Scripts de Hostinger e demais testes mantidos. |

`refinements.css` permanece intacto nesta reversão: seu CSS claro anterior é reutilizado. As antigas regras parciais de modo escuro que já haviam sido retiradas durante a implementação não foram reintroduzidas, pois o pedido atual é voltar ao claro sem alternância. Fotografias, logos originais, PNGs e favicons recentes não foram modificados.

Não é necessário apagar dados do navegador: a antiga chave `nortfood-theme`, se existir, fica ignorada. Não há leitura, gravação ou listener de preferência na aplicação. Nenhum carrinho, sessão, formulário ou informação pessoal é limpo para voltar ao tema claro.

Cópias obsoletas dos arquivos do tema nos diretórios gerados foram arquivadas em `test-results/theme-revert/before/`, fora da publicação. Uma proteção automática recusou a exclusão por PowerShell; foi usada movimentação reversível com caminhos literais. Não houve exclusão de dados. O arquivo `dist/assets/theme.css` já não existia. Os builds novos não contêm o controlador/CSS retirados.

## Preservação verificada

Antes das edições, foram registrados SHA-256 de 43 arquivos protegidos: `src/`, Supabase/migrações/configuração/funções/templates, ambientes, `_headers`, `netlify.toml`, scripts de build/configuração/Hostinger, logos/favicons e `refinements.css`. A conferência posterior está em `test-results/theme-revert/protected-result.json`.

Não foram executados comandos SQL manuais, alterações administrativas no Supabase, migrações, criação de contas, pedidos, concessão de privilégios, alterações de DNS ou compra de serviços. A inspeção HTTPS realiza as leituras normais da interface visitante na homologação. O destino do build publicado continua sendo exclusivamente NortFood-Homologacao. As proteções da prévia foram verificadas antes e depois do deploy.

## Testes e prévia

**94/94 testes automatizados aprovados**, 0 falhas, 38,77 s (`full-suite.txt`). **107 verificações de demonstração aprovadas**, sem erro JavaScript (`demo-suite.txt`). **3/3 testes focados** de aparência clara/contrato comercial passaram (`targeted.txt`). Testes locais usam navegador e banco embarcado/respostas controladas, não produção.

Conferência SHA-256 final: **43/43 arquivos protegidos intactos**. Bootstrap/CSS retirados ausentes tanto da fonte quanto dos três diretórios gerados (`result.json`). As cores e medidas do CSS claro original foram recuperadas ao retirar a folha adicional; regressões confirmaram fundo `rgb(251,251,250)`, logo claro, campos nativos claros, nenhuma alternância e nenhuma chamada a arquivos do tema, inclusive com a preferência antiga `dark` salva e dispositivo escuro.

**Prévia privada atualizada e validada:** https://lucky-lamington-022ea1.netlify.app, deploy `6ad7ccf96ce9f4f64f073a9f`. Não foi usado rollback de deploy antigo; o pacote foi reconstruído a partir do projeto atual, preservando as demais melhorias.

Na URL HTTPS real: cabeçalho sem lua/sol; raiz sem `data-theme`; nenhuma referência ao bootstrap/CSS retirados; aparência clara após recarga; `noindex,nofollow`; aviso de homologação e de piloto bloqueado; login aberto/fechado sem submissão; carrinho aberto/fechado sem pedido; nenhum overflow a 390/1365 px; **0 erros de console capturados**. Nenhuma conta, mensagem, pedido ou pagamento foi submetido. A inspeção não repete a homologação de jornadas de negócio remotas.

Proteção conferida antes e depois: raiz, HTML, config, app e SDK recusados anonimamente com **401**, tanto na origem quanto no permalink novo (**10/10** após o deploy). Evidências em `test-results/theme-revert/protection-before.json`, `protection-after.json`, `result.json`, `https-light-final.png`, `https-login-light.png` e capturas locais em 390/1365 px.

Pacote: `test-results/theme-revert/nortfood-light-private-20261020.zip`, **21.696.620 bytes**, SHA-256 `70124b0bbdc6ac9c83caa09c9bb621bc9f901b8fa5f4c20e56642e3a2acc95fe`. Sem arquivos de tema, fontes de servidor, ambientes, backups ou chaves privadas. Arquivos de demonstração/resultados/backup não foram enviados.

**Reversão concluída no código e na prévia privada.** Nenhuma alteração no banco, RLS, credenciais, funções, piloto, DNS ou permissões de hospedagem. Os bloqueios operacionais anteriores do lançamento beta continuam sendo assunto separado.
