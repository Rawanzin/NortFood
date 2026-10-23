# NortFood — prévia privada HTTPS, SMTP e administração

Atualização de 20/10/2026. Prevalece sobre os bloqueios históricos de acesso à hospedagem e autorização administrativa. **NÃO APTO para lançamento a clientes reais; prévia privada disponível para homologação.**

## Endereço e proteção

[Abrir prévia privada](https://lucky-lamington-022ea1.netlify.app). Exige a sessão do proprietário na Netlify; o plano Free não foi convertido em Pro, não há cartão cadastrado e nenhum domínio foi comprado. O nome aleatório é fornecido pela hospedagem.

A equipe confirmou **Private for new projects antes do upload**. O projeto continua Private após o deploy. A raiz, `index.html`, `config.js`, `app.js` e `assets/nortfood-backend.js` devolveram **401 sem cookies**; o mesmo resultado foi comprovado no permalink do deploy `6ad7c1c15e120a6330e97211`. O proprietário autenticado abriu a aplicação HTTPS normalmente. Não foram exportados cookies ou sessões da hospedagem.

O pacote usa somente `zrczgghucwsaxqnyaapk`, com aviso de dados sintéticos, meta `noindex,nofollow`, X-Robots-Tag, robots bloqueado e sitemap vazio. O build recusa outro Supabase. A inspeção do pacote não encontrou configuração secret/service_role, ambiente, backup, SQL administrativo ou arquivos privados de testes. A regra de headers foi aceita pela Netlify sem erro. A meta foi conferida no DOM HTTPS; os headers internos da aplicação não foram inspecionados em uma resposta autenticada por CLI.

Evidências privadas em `test-results/homologation/preview-access-result.json`, `preview-permalink-access-result.json`; capturas `test-results/beta/netlify-free-private-before-deploy.png`, `netlify-private-published.png`, `https-preview-final.png`.

O primeiro upload ficou incompleto e foi cancelado sem excluir o projeto. Os envios seguintes concluíram mantendo a página de upload aberta. Não houve janela intencional de exposição pública. A classificação “Production” da Netlify indica o deploy principal **deste projeto privado de homologação**, não publicação do NortFood para clientes.

## Testes remotos executados

| Recorte | Resultado | Evidência e limite |
|---|---|---|
| Administração por RPC | APROVADA | Gate remoto terminou com código 0: aprovação de loja, categoria, baixa parcial/total, idempotência, ajustes +10/-10 e vencimento original preservado. `admin-api-result.json`, `admin-api-gate.log` |
| Revogação | APROVADA | SQL confirmou remoção somente do vínculo administrativo sintético. Conta e históricos preservados. `admin-revoked.png`, `admin-final-state.json` |
| Cadastro/SMTP/IMAP | APROVADA no sandbox | Cadastro normal via API pública, conta não confirmada recusada, mensagem recebida pela captura, confirmação, login/logout, recuperação/troca e senha anterior recusada, ambos os links de uso único. Seis verificações em `smtp-capture-live-result.json` |
| Links com destino HTTPS | APROVADA no sandbox | Mesmas seis verificações, com retorno Auth para a origem HTTPS exata. `smtp-https-redirect-result.json`. Consumo por SDK/HTTP, não formulário completo de troca de senha no navegador |
| Login, catálogo e pedido HTTPS | APROVADA no recorte | Cliente autenticou na UI; cardápio, produto, carrinho e retirada a 390 px; pedido `895742e3-515f-4cc4-ad1e-11438a7dc3a6` persistiu total 12000 centavos. `https-ui-result.json` |
| Atualizações e retirada HTTPS | APROVADA no recorte | Vendedor autenticado por SDK avançou até Pronto para retirada; cliente recebeu a atualização na UI. Vendedor entrou na UI HTTPS e marcou Retirado, confirmado no banco. Não é prova de todos os estados pela UI HTTPS |
| Upload HTTPS | APROVADA | Formulário do vendedor enviou PNG sintético; produto salvo e imagem carregada no cardápio por URL assinada do bucket privado. Descrição obrigatória foi validada e preenchida |
| CORS/autenticação do upload | APROVADA | Origem HTTPS exata aceita; origem arbitrária e localhost antigo recusados 403; POST sem identidade recusado 401. `https-upload-cors-result.json` |
| Layout/navegação | APROVADA no recorte | 390 e 1365 px sem overflow nas telas verificadas, zero erros de console capturados, login/logout e reload. Capturas `https-pickup-mobile.png`, `https-pickup-desktop.png`. Não são dispositivos físicos/Safari |

Os nove asserts do ensaio HTTPS estão registrados em `https-ui-result.json`. A entrega pela UI e o chat em duas sessões haviam sido comprovados em localhost com Supabase remoto; não foram repetidos integralmente no HTTPS. Interface administrativa remota permanece sem ensaio positivo; o novo resultado administrativo é de **RPC real**, não de cliques nessa interface. A preparação SQL do ensaio HTTPS teve espera expirada; o estado da fixture foi conferido no banco e o roteiro prosseguiu manualmente, com encerramento explícito.

## Falhas reproduzidas e corrigidas

1. **Recuperação por e-mail:** retorno `/#settings` disputava o fragmento da URL com os tokens Auth. O frontend agora solicita retorno à raiz; o evento `PASSWORD_RECOVERY` existente escolhe a tela de configurações. O primeiro ensaio SMTP falhou e foi preservado em `smtp-capture-first-failure.json`. A regressão falhou antes e passou depois (`recovery-fragment-before.txt`, `recovery-fragment-after.txt`); os dois novos ensaios SMTP passaram.
2. **Carrinho fechando durante atualização automática:** o guard de renderização preservava modais/formulários, mas não `.drawer`. A proteção agora inclui o carrinho. A regressão de navegador disparando POLL falhou antes e passou depois (`cart-poll-before.txt`, `cart-poll-after.txt`). Correção implantada; no HTTPS o carrinho permaneceu aberto durante o intervalo de atualização. Captura `https-cart-preserved.png`.

Suíte completa final: **89/89 testes locais**, zero falhas, em `test-results/beta/https-final-tests.txt`. Depois da parametrização da origem do gate, **12/12 regressões locais** passaram em `final-config-regressions.txt`. Build de homologação passou. Testes locais/PGlite e transportes controlados não foram usados como prova remota.

## Configuração e efeitos

- Somente homologação: Site URL e redirect exatos para a prévia; retornos locais anteriores preservados, sem wildcard. `APP_ORIGIN` do upload agora permite **somente a prévia HTTPS**; localhost passa a receber 403. Para repetir gate API nessa origem, fornecer `NORTFOOD_TEST_APP_ORIGIN=https://lucky-lamington-022ea1.netlify.app`.
- SMTP de captura Ethereal configurado **somente na homologação**, com TLS e templates próprios. Credenciais geradas em memória e inseridas na configuração criptografada do Supabase; não gravadas no repositório, logs ou frontend. O serviço captura mensagens, não entrega a clientes. Não utilizar essa configuração no principal nem inserir dados reais na homologação. A caixa é temporária e não possui garantia de disponibilidade/entregabilidade operacional.
- A conta sintética autorizada recebeu cargo administrativo apenas para o ensaio; vínculo revogado ao terminar. Nenhum usuário real recebeu poderes. Não houve alteração de grants ou RLS para passar testes.
- Dados sintéticos adicionais: contas de ensaio SMTP/API, lojas/produtos/categoria, pedidos/comissões, duas quitações, dois ajustes e imagem. Históricos preservados. Senhas de duas contas sintéticas antigas foram renovadas em memória para testar login HTTPS; nenhuma senha de pessoa real ou do banco foi alterada.
- Piloto encerrado, loja da fixture suspensa e categorias da fixture desativadas. A prévia pode aparecer sem lojas ao final, intencionalmente. Não reabrir pedidos para demonstrar a interface.
- **Nenhuma migração 001–007 reaplicada ou modificada nesta etapa. Nenhuma operação no NortFood principal ou Rawanzin. Nenhum dado real excluído, site público liberado, cobrança ou domínio contratado.**

## Arquivos desta continuação

`src/backend.js` (retorno de recuperação), `src/commercial.js` (preservação do carrinho), `assets/nortfood-backend.js` regenerado, `tests/auth-lifecycle.test.cjs`, `tests/ui-contract.test.cjs`, `tests/helpers/smtp-capture-live.cjs` (ensaio SMTP remoto opt-in), `scripts/run-homologation.cjs` (origem parametrizada), `package.json`/`pnpm-lock.yaml` (Nodemailer/IMAPFlow/MailParser somente dev, para testes, sem inclusão no frontend), documentação. Os scripts de proteção/administração e templates preparados na etapa anterior foram utilizados.

## O que ainda impede o beta

1. **Envio real:** falta conta autorizada e remetente/domínio verificado de um provedor transacional. Brevo Free continua candidato, condicionado à elegibilidade e limites da conta. O sandbox não comprova recebimento em Gmail/Outlook, spam ou entregabilidade. Não é necessário comprar domínio agora para continuar homologando.
2. **Destino de operação:** esta URL e banco são de homologação privada, não o ambiente a liberar aos clientes. Falta definir hospedagem/origem operacional e ensaiar a configuração real de Auth, SMTP e upload antes da autorização de publicação. Não transplantar os dados sintéticos para o principal.
3. **Aceites e cobertura final:** textos jurídicos continuam rascunhos; falta revisão/aceite operacional do responsável e validação em Android/iPhone/Safari. Administração positiva pela UI e jornadas completas de cadastro/recuperação pela UI HTTPS continuam pendentes; APIs e links SMTP estão aprovados nos recortes acima.

Não há necessidade de enviar segredos pelo chat. A intervenção indispensável para e-mail real é disponibilizar uma conta/remetente verificado por acesso protegido. Não houve compra ou contratação para contornar esse bloqueio.
