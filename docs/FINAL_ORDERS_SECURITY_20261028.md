# Pedidos, catálogo, WhatsApp, QR e segurança — 28/10/2026

## Resultado desta revisão

**Validação local aprovada; liberação comercial da Dan Burguer ainda BLOQUEADA.** Esta revisão não criou usuários, lojas, pedidos ou transações no Supabase remoto, não alterou a Dan Burguer e não ativou o piloto. A publicação técnica é responsabilidade da etapa de build/deploy e não equivale à liberação comercial.

## Problemas encontrados e correções

1. **P1 — edição de produtos perdia a estrutura de múltiplos grupos.** A tela juntava opções de todos os grupos em um único campo; salvar enviava somente um grupo ao RPC, que arquivava os grupos anteriores. O editor agora apresenta separadamente todos os grupos, nomes, mínimos, máximos e preços. Permite adicionar e remover grupos individualmente, com o limite existente de vinte. As opções de grupos que não foram removidos continuam no payload.
2. **P1 — ingredientes removíveis eram apagados ao salvar o produto.** O comando enviava `ingredients: []`, pois o formulário não oferecia esse campo. A tela agora carrega todos os ingredientes existentes e permite editá-los, preservando-os em uma alteração de nome/preço/imagem.
3. **P1 — resumo completo do WhatsApp não separava subtotal/frete nem mostrava preços de itens/adicionais.** A cópia explícita do resumo completo agora inclui esses valores persistidos e, quando existentes, cliente, contato, mesa e referência de endereço. O link `wa.me` continua sem endereço, contato e observações pessoais. Abrir o WhatsApp não comprova envio, leitura ou aceite; o pedido precisa existir no banco e a loja precisa ser aprovada e ter número válido.

Arquivos alterados nesta frente:

- `app.js`: somente `openProductForm`, em coordenação com as outras frentes.
- `src/commercial.js`: renderização, adição/remoção e leitura de todos os grupos no editor.
- `src/application/product-options.js`: validação e conversão de grupos para o contrato RPC.
- `src/presentation/product-options.js`: campos separados por grupo e ingredientes.
- `src/application/whatsapp.js`: complemento do resumo copiado, com valores do pedido persistido.
- `tests/product-personalization.test.cjs` e `tests/launch.test.cjs`: regressões de preservação e privacidade.

Não houve migração, alteração de RLS, ampliação de permissões ou mudança de contratos RPC. O RPC de produto existente preserva o UUID do produto e o histórico, arquiva grupos/opções anteriores e cria novos UUIDs para as versões salvas; esta revisão mantém esse comportamento. Portanto, não se afirma estabilidade de UUIDs de opções após editar, nem ausência de crescimento do histórico. Os QR Codes dependem do UUID da loja/mesa, não dessas opções.

## Evidências de testes

Comando executado:

```text
node --test tests/database.test.cjs tests/database-fresh.test.cjs tests/migrations-audit.test.cjs tests/application-services.test.cjs tests/session-isolation.test.cjs tests/qr-tables.test.cjs tests/qr-browser.test.cjs tests/dan-catalog.test.cjs tests/public-pilot.test.cjs tests/launch.test.cjs tests/product-personalization.test.cjs
```

**67 testes aprovados, zero reprovados, zero ignorados; duração 74,5 segundos.** Saída em `test-results/final-20261028/orders-security.txt`. Após complementar as verificações do resumo WhatsApp, `node --test tests/launch.test.cjs` também passou 3/3. São os mesmos três testes do grupo anterior, reexecutados, e não setenta testes únicos.

| Área | Evidência obtida | Limite |
|---|---|---|
| PostgreSQL | Migrações reais 001–012 aplicadas em PGlite novo; constraints e grants verificados | Banco local descartável; não inspeciona configuração atual do Supabase remoto |
| RLS/autorização | Cliente não lê pedidos/endereços alheios; vendedor não altera outra loja; metadados não concedem administração; políticas Storage e superfície RPC validadas | Identidades sintéticas locais |
| Pedido | Valores calculados no servidor; preço fraudado, opções inválidas, mínimos, região, loja fechada e produto indisponível rejeitados; transação sem resíduos | Pedidos locais, sem pessoas reais ou entrega |
| Duplicação/concorrência | Duas submissões simultâneas do cliente são bloqueadas; repetição preserva chave; resposta incerta recupera pedido; versão antiga em alteração de status é rejeitada; locks SQL inspecionados | Não houve carga paralela contra PostgreSQL remoto nem demonstração de throughput comercial |
| Comissão | 5% sobre produtos sem frete; taxa congelada no pedido; lançamento único e imutável; ajuste/baixa administrativos auditados | Contabilidade sintética local |
| Vendedor/cliente | Pedido aparece no snapshot do vendedor autorizado, não em outra loja; transições e acompanhamento testados | Browser com transporte controlado e banco local, sem notificações físicas |
| QR geral/mesas | PNG gerado e decodificado; PDF aberto; cardápio e mesa no browser; token conservado ao renomear/arquivar; histórico preservado | Câmera física, impressão e todos os QR já distribuídos não foram testados |
| Carrinho/personalização | Adicionais, remoções, quantidade e persistência; troca de conta não mistura carrinhos/pedidos | Chrome automatizado local |
| Editor | Dois grupos e ingredientes mantidos ao editar preço; criação de terceiro grupo; remoção somente do grupo escolhido; larguras 320/390/768 sem overflow | RPC controlado capturado; nenhuma edição da Dan remota |
| WhatsApp | Número brasileiro validado, loja aprovada exigida, resumo usa centavos persistidos; dados pessoais ausentes do link e presentes somente na cópia solicitada | Não houve envio de mensagem ou aceite de loja real |

## Dan Burguer e preservação de dados

O manifesto local oficial permanece com 46 produtos, vinte lanches com grupo de adicionais e onze opções por lanche: **46 produtos, 20 grupos e 220 opções**. O teste de importação aplica o manifesto somente no PostgreSQL descartável, verifica produtos/preços/restrições e 220 opções, repete a importação e comprova que uma edição posterior não é sobrescrita. Nenhuma importação foi executada no projeto principal.

A evidência privada anterior `test-results/auth-dan/remote-audit.json` é de **23/10/2026**, não uma leitura remota desta revisão. Ela registra a loja `40bac4d9-2e3c-4f1d-b33b-ab9628176136`, 46 produtos, vinte grupos, 220 opções, status `draft`, pausa ativa, WhatsApp vazio, sem entrega/retirada/pagamentos habilitados e `pilot=false`. As contagens e condições remotas atuais devem ser confirmadas na frente administrativa; este documento não as apresenta como verificadas hoje.

Pendências comerciais desse registro: confirmar responsável/vínculo, estoque e disponibilidade; WhatsApp/telefone; bairro, coordenadas e imagens oficiais; cobertura/frete por zona; retirada, preparo e pagamentos; preço das nove jarras; regra de substituição. Seis bebidas alcoólicas continuam com restrição de venda no servidor. Não foram inventados dados para preencher essas lacunas.

## QR permanente e permissões

- O link geral conserva `#shop/<UUID da loja>`; alterações de produtos, preços, horários ou imagens não modificam esse UUID.
- Mesas usam `?mesa=<token público>#shop/<UUID da loja>`. O token identifica a mesa; não é token Auth e não concede acesso privado. Renomear, desativar ou arquivar não apaga o histórico ou muda o token.
- O gerador elimina query anterior e fragmento anterior antes de criar o link e rejeita credenciais na URL. Nenhuma URL de QR existente foi regravada nesta revisão.
- Lojas privadas não aparecem no catálogo anônimo. Pedidos exigem piloto habilitado pelo administrador, aprovação/abertura da loja e configurações válidas. O limite administrativo inicial de uma loja foi testado.

## Migrações, backups e decisão

**Zero migrações aplicadas e zero dados remotos alterados nesta frente.** Não foi necessário restaurar nem criar backup de banco para estas mudanças de interface. Um backup lógico remoto verificável continua obrigatório antes de qualquer futura migração; evidência histórica de catálogo não substitui backup restaurável atual.

**BLOQUEADO para piloto comercial real:** falta homologar a operação autenticada no ambiente remoto com o responsável da Dan, confirmar dados comerciais e obter a confirmação final do usuário. Os testes locais comprovam os mecanismos e as correções listados; não comprovam operação comercial com pessoas/dispositivos físicos. A trava comercial permanece preservada.

## SQL de conferência remota preparado, sem execução remota nesta frente

Arquivo `supabase/checks/final_launch_readonly_20261028.sql`. A transação usa isolamento `repeatable read`, `read only` e termina com `rollback`. As dezenove instruções são abertura/encerramento de transação e consultas `SELECT`/CTE; nenhuma função da aplicação é chamada. A identidade do projeto principal deve ser confirmada na CLI antes da execução. O arquivo não tenta estabelecer identidade por `current_database()`, que em instalações Supabase diferentes pode ter o mesmo nome.

O resultado contém somente contagens, estado comercial e metadados de segurança: Dan pelo UUID existente; produtos/grupos/opções totais e ativos; configuração por booleanos/contagens; vínculos/convite sem e-mail; piloto/comissão/limite; versões de migração sem SQL armazenado; políticas e grants efetivos; atributos de `SECURITY DEFINER`, `search_path` e execução; índices, triggers e bucket. Não retorna tokens de mesa/Auth, contatos, endereços, payloads ou corpos de funções. Os sinais de guardas em corpos SQL são retornados como booleanos/hash, e exigem interpretação: presença de texto não prova semântica nem homologação.

O script foi executado somente em PGlite descartável com migrações 001–012, histórico sintético e catálogo local: dezenove conjuntos de resultado; transação somente leitura confirmada; 46/20/220; doze versões; zero tabelas locais sem RLS. Evidência em `test-results/final-20261028/sql-readonly-local-validation.json`. Isso valida sintaxe/compatibilidade com o esquema local, sem afirmar estado remoto. Tabela ausente ou permissão insuficiente causa falha, sem criar objetos, aplicar migrações ou alterar ACL. Grants de leitura listados ainda dependem de RLS; esta auditoria não simula jornadas positivas de usuários remotos.
