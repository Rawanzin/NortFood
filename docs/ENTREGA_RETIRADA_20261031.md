# Entrega e retirada — evidências de 31/10/2026

Implementado no projeto existente. Nenhuma alteração de dados ou esquema foi aplicada a Supabase remoto. A migração `202610310014_fulfillment_controls.sql` está pendente de validação/aplicação pelo operador autorizado, com backup antes de qualquer execução remota.

## Resultado local comprovado

- O painel do estabelecimento possui dois switches acessíveis, independentes, com estado ativado/desativado e confirmação do servidor. A operação altera somente `delivery_enabled` e `pickup_enabled` por `nf_set_fulfillment`, sem reenviar perfil, áreas, preços ou horários.
- A RPC exige sessão e vínculo com a loja. Cliente, visitante e vendedor de outra loja não conseguem alterar as modalidades.
- Entrega e retirada simultâneas, somente entrega, somente retirada e nenhuma modalidade foram exercitadas em PostgreSQL descartável com dados fictícios. Chamadas diretas de pedidos pela modalidade desativada são rejeitadas.
- Ambas desativadas tornam `private.store_open` falso, inclusive para novo pedido presencial. A alteração não muda `paused`/`open_override`, taxas, catálogo ou pedidos recebidos. Um pedido anterior pôde ser aceito depois da desativação.
- O cardápio e os cards exibem as modalidades atuais. O checkout consulta novamente o catálogo antes de iniciar ou trocar a modalidade. A tela impede escolher entrega desativada e exige uma opção válida.
- Ao receber atualização durante revisão, o formulário conserva observação e carrinho e desativa confirmação se a modalidade deixou de ser válida. A interface não escolhe outra modalidade silenciosamente.
- A ausência da nova RPC no servidor recebe mensagem explícita e mantém os estados anteriores. O vendedor pode continuar usando os campos existentes em **Perfil da loja**, seguidos de **Salvar perfil**.
- Os dois switches ficam desabilitados durante a confirmação para impedir que cliques simultâneos sobrescrevam as modalidades a partir do mesmo estado antigo. A regressão do navegador segura a primeira resposta e confirma que a segunda tentativa não envia outra alteração.

## Testes executados

| Execução | Resultado | Alcance |
| --- | --- | --- |
| `node --test tests/fulfillment-controls.test.cjs` | 6/6 aprovados | PostgreSQL PGlite, migrações, RLS/RPC, quatro combinações, pedidos e preservação do histórico |
| `node --test tests/fulfillment-browser.test.cjs` | 1/1 aprovado | Chrome real, duas páginas, transporte local controlado, switches/checkout, carrinho e observações conservados, fallback RPC ausente |
| `tests/ui-contract.test.cjs` e `tests/qr-browser.test.cjs` | 2/2 aprovados | Regressão de checkout, painéis e pedido presencial, com respostas controladas |
| `tests/database.test.cjs`, `tests/session-isolation.test.cjs`, `tests/final-audit.test.cjs` | 32/32 aprovados | Isolamento e finanças existentes, sessões, imagens hostis e preservação do endereço no polling |
| `NORTFOOD_APP_URL=https://nortfood.pages.dev node scripts/build.cjs --pages` | Aprovado | Build estático Pages; variável definida somente no processo |

Capturas e resultado legível por máquina: `test-results/etapa10-20261031/fulfillment/browser-results.json`, `seller-both-disabled-mobile.png`, `checkout-disabled-cart-preserved.png` e `checkout-disabled-confirmation.png`. Todas as pessoas, contas, produtos e pedidos usados nestes testes são fictícios e locais; nenhum pedido comercial foi criado.

Revalidação em 01/11/2026: `node --test --test-concurrency=1 tests/fulfillment-controls.test.cjs tests/fulfillment-browser.test.cjs tests/ui-contract.test.cjs tests/qr-browser.test.cjs tests/session-isolation.test.cjs` aprovou 13/13. Depois da serialização dos switches, o navegador dedicado foi reexecutado e aprovado.

## Limites e pendências

- Os testes de navegador usam o aplicativo real com transporte controlado. Não comprovam Auth, Realtime nem persistência do Supabase hospedado.
- A migração adiciona `stores` e `delivery_zones` à publicação `supabase_realtime` somente se ela existir e não for global; mantém RLS/grants. A inscrição autenticada acompanha essas tabelas. É obrigatório conferir a entrega real desses eventos depois da aplicação.
- Visitantes mantêm polling a cada 60 segundos. A vitrine pode demorar esse intervalo para atualizar; usuários autenticados têm Realtime e polling de contingência a cada 20 segundos. Ao entrar no checkout ou trocar modalidade, a consulta explícita confirma os estados mais recentes. Não foi comprovada atualização instantânea de visitantes em dispositivos diferentes.
- Pedidos diretos já verificavam `pickup_enabled`/`delivery_enabled` nas funções anteriores. A nova regra global de indisponibilidade, inclusive presencial, depende da migração 014.
- Não houve alteração de configuração de nenhuma loja remota, inclusive Dan Burguer. Preservação remota foi obtida por ausência de mutações, e não por leitura dos seus registros privados.
