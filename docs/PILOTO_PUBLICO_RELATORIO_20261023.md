# NortFood — entrega do piloto público em 23/10/2026

**Site atualizado e verificado: https://nortfood.netlify.app. Operação comercial ainda BLOQUEADA.** O formulário público está disponível, mas novas contas reais ainda não estão liberadas pelo Supabase Auth. Não houve venda, pagamento, envio de WhatsApp ou autorização comercial simulada.

## 1. Cadastro de clientes

**PENDENTE em produção; APROVADO no transporte controlado local.** Cadastro com nome, e-mail, celular com DDD, senha de pelo menos 12 caracteres, confirmação e consentimento. Login, recuperação, callback e persistência usam Supabase Auth; contas demonstrativas não são usadas no site público. A disponibilidade é consultada no servidor e a interface informa o bloqueio real.

O endpoint Auth real respondeu `disable_signup=true`. O SMTP personalizado está desativado no painel autenticado. A consulta SQL final encontrou zero contas Auth. Confirmação entregue a cliente externo, recuperação recebida, login/logout e sessão real entre dispositivos permanecem **NÃO TESTADOS** nesta entrega. O envio padrão do Supabase se restringe aos endereços da equipe e não serve para esse cadastro público: [documentação oficial](https://supabase.com/docs/guides/auth/auth-smtp).

## 2. Cadastro de vendedores

**Implementado; homologação autenticada real PENDENTE.** A escolha “Quero vender no NortFood” registra a intenção de loja na conta Auth. Após confirmação, uma RPC cria o rascunho e o vínculo com o usuário de maneira idempotente, inclusive se a confirmação ocorrer em outro dispositivo. Cadastro de conta não aprova loja.

Estados: Rascunho, Pendente de aprovação, Aprovada, Rejeitada e Suspensa. “Salvar rascunho” aceita campos parciais e persiste na conta, com versão para recusar alterações concorrentes. Imagens e localização exigem “Salvar perfil”, conforme aviso visível. “Solicitar aprovação” valida dados operacionais e ao menos um produto disponível no servidor. Nenhuma loja foi criada em produção nesta execução.

## 3. Aprovação administrativa

**APROVADO nos testes PostgreSQL locais; uso com administrador real PENDENTE.** Administradores continuam definidos somente em `private.admin_users`; metadados, papel solicitado e e-mail no frontend não concedem acesso. O banco real possui zero administradores.

O limite inicial de lojas aprovadas é **1**, aplicado por trigger com bloqueio transacional da configuração, inclusive para decisões concorrentes. O administrador pode ampliar o limite futuramente por RPC auditada. Rascunho não pode ser aprovado antes da solicitação. Pedidos continuam dependentes do gate administrativo separado `pilot_enabled=false`.

Loja nominal indicada: **DanBurguer**. Contato informado: **Danburguer@gmail.com**, ainda sem verificação Auth. Isso não concede administração da plataforma e não foi convertido em loja fictícia ou aprovação por aproximação de nome.

## 4. Cardápio

**APROVADO em PostgreSQL e interface controlados; cardápio real NÃO TESTADO.** Preservados produtos, preços em centavos, adicionais, disponibilidade, imagens, categorias múltiplas e arquivamento com histórico. O painel mantém a configuração de entrega/retirada, horários, bairros e taxas. Associação e RPCs verificam a loja do usuário.

A compatibilidade entre nomes anteriores, como Lanches/Pizzaria/Padaria, e os nomes do catálogo base foi corrigida também na seleção e gravação do formulário. O teste da interface verifica os UUIDs enviados, além da aparência.

## 5. Categorias

**APROVADO em produção**, com zero lojas: Todos, Hambúrgueres, Pizzas, Açaí, Doces, Salgados, Sorvetes, Marmitas, Bebidas, Padarias, Mercados e Outros. São 11 registros editoriais no banco e a opção Todos na interface. Não foram criados produtos, preços ou estabelecimentos demonstrativos.

O catálogo inicial existe antes de terminar a consulta remota e permanece disponível em atualizações. IDs são estáveis; aliases evitam duplicação visual. Todos os filtros foram clicados no site publicado. Categorias sem lojas mantêm seleção e exibem estado vazio verdadeiro. Rolagem horizontal das categorias não causa overflow do documento.

Foram reutilizadas ilustrações transparentes já existentes. Padarias usa a cesta de pães de queijo e Outros usa o conjunto de alimentos. Isso evitou carregar dois PNGs opacos de 1.069.656 e 1.028.058 bytes. Logos, banners e arquivos originais não foram alterados.

## 6. Pedidos e WhatsApp

**Liberação comercial PENDENTE; pedidos reais BLOQUEADOS.** Foram preservados o checkout transacional e os testes de preços/adicionais/frete calculados pelo servidor, idempotência, recuperação da confirmação, histórico, estados com controle de versão, isolamento entre contas e bloqueios de loja/produto/região. A suíte local final aprovou esses controles. Isso não substitui homologação autenticada no Supabase remoto.

O painel continua como fonte operacional do pedido. O WhatsApp usa identificador e valores persistidos; abrir conversa não comprova envio, leitura, aceite ou pagamento. Endereço e observações pessoais entram apenas no resumo completo que a pessoa decide copiar. O link público não recebe esses dados desnecessariamente. **WhatsApp da DanBurguer NÃO TESTADO:** o número oficial não foi fornecido. Nenhuma mensagem foi enviada.

Pagamento permanece separado do andamento. Dinheiro, cartão e Pix diretamente à loja só podem ser oferecidos conforme configuração real. Não foi criada integração bancária, cobrança automática, split ou falsa confirmação de Pix.

## 7. Supabase

**Conectividade, categorias e auditoria de permissões APROVADAS; fluxos autenticados reais PENDENTES.** Projeto preservado: `zwkhqahivthzivmuirjr`. Foram conferidas as versões 001–007 antes de agir. Aplicada somente a nova `202610230008_public_pilot`, em transação com verificação do estado anterior e registro de versão. Não houve recriação de banco, reexecução das migrações antigas ou concessão de administrador.

Conferência SQL após aplicação, repetida ao final: versões 001–008; 11 categorias; zero contas Auth, lojas e administradores; limite de lojas 1; piloto desabilitado; zero tabelas públicas/privadas sem RLS. Superfície RPC anônima preservada: `nf_catalog`, `nf_operating_status`, `nf_table_context`. Novos rascunhos não têm escrita direta pelo cliente.

Storage privado, função de upload e Realtime existentes foram preservados. Upload e recebimento de eventos com contas reais nesta entrega: **NÃO TESTADOS**, por falta de contas verificadas. O frontend continua recebendo somente URL e chave pública; nenhum segredo foi enviado ao pacote público.

Backup/checkpoint: `checkpoint/public-pilot-20261023-14b02b2`, cópias locais das fontes e preflight em `backups/public-pilot-20261023/`. Isso não é apresentado como um dump remoto completo. O preflight encontrou zero contas e dados comerciais. Recuperação: [plano](PILOTO_PUBLICO_RECUPERACAO_20261023.md). As versões antigas permanecem intactas.

## 8. Netlify e GitHub

**APROVADO.** Mesmo site `nortfood`, HTTPS válido e domínio preservado. Deploy final pronto: `6adb8c48ad0d7b86e8b27208`; commit público `43aec6754d9c3e8c6f1be075069ba9519ae034b2`; release verificada `62377c3ff8d1953800cb`; publicação em 23/10/2026 às 13:33:31 de Brasília.

A prévia foi validada antes da primeira promoção. Os commits acionaram a integração GitHub–Netlify existente, restrita a `release/nortfood`. O build automático executa sintaxe, testes de serviços/sessões/cache, arquitetura, build e auditoria do pacote. Branch de desenvolvimento e documentos privados não foram enviados como histórico público. O pacote publica somente `dist`, com 96 arquivos e sem `.env`, SQL, backups ou documentos internos.

Evidências reais finais:

- [39 verificações HTTPS aprovadas](../test-results/public-pilot-official-https.txt).
- [18 verificações de navegador aprovadas](../test-results/public-pilot-20261023/official/browser.json): oito larguras em dois temas, logos, categorias, formulários e ícones maskable. Sem erros JavaScript.
- [Home móvel clara](../test-results/public-pilot-20261023/official/home-light-390.png), [escura](../test-results/public-pilot-20261023/official/home-dark-390.png), [cadastro vendedor em 320px](../test-results/public-pilot-20261023/official/seller-signup-320.png).
- [150 testes finais, zero falhas](../test-results/public-pilot-final-suite.txt); [107 verificações demonstrativas claras](../test-results/public-pilot-flows-light.txt) e [107 escuras](../test-results/public-pilot-flows-dark.txt), exclusivamente locais.
- [Lighthouse final real](../test-results/public-pilot-20261023/lighthouse-final.report.html): desempenho **76**, acessibilidade **100**, boas práticas **100**, SEO **69**. LCP **5,03 s**, CLS **0**, transferência **575.761 bytes**, em emulação móvel. A indexação continua desativada, afetando SEO. Desempenho ainda tem margem de melhora; a medição não é percentil de campo nem prova de capacidade comercial simultânea.

Falhas intermediárias de expectativas antigas, pacote compilado anterior e escolha dos PNGs opacos foram corrigidas; a suíte completa foi repetida e aprovada. Não foi executada carga contra produção. Não foi certificada capacidade de 1.000 compradores simultâneos.

## 9. Aplicativo PWA

**APROVADO no navegador desktop/HTTPS; aparelhos físicos NÃO TESTADOS.** Manifest estável, standalone, fundo branco e ícones oficiais. O ícone principal PNG transparente permanece intacto. A composição SVG dos maskable define branco atrás do N original, sem redesenhar a marca; pixels conferidos no site real. O N ficou dentro do círculo seguro de raio 0,4 (raio máximo medido 0,3652).

O Service Worker continua sem cache de configuração, Auth, API, pedidos, respostas privadas ou autenticadas. Atualização é oferecida por botão; foi aplicada pela interface no site aberto, sem limpar sessões. Testes de instalação, cancelamento, atualização, rascunho e offline passaram no Chromium. Android/iPhone físicos e a aparência exata da splash nativa permanecem **NÃO TESTADOS**. O navegador/sistema controla elementos da splash: [referência oficial](https://web.dev/articles/add-manifest).

Android: instalar quando o navegador oferecer. iPhone: Safari → Compartilhar → Adicionar à Tela de Início. Uma instalação antiga pode precisar aceitar “Atualizar”; não foi forçada perda de dados.

## 10. Bloqueios reais, intervenção mínima e primeira compra

| Situação | Classificação | Intervenção necessária |
|---|---|---|
| Confirmação e recuperação de conta para clientes externos | PENDENTE | Definir provedor/remetente autorizado e concluir entrada de credenciais exclusivamente na tela protegida do provedor/Supabase. O Gmail informado é contato, não configuração de SMTP. Depois, habilitar e homologar o cadastro com confirmação preservada. |
| Primeiro administrador | PENDENTE | Informar o e-mail nominal que administrará a plataforma; verificar a conta real antes de conceder o vínculo administrativo autorizado. |
| DanBurguer operacional | PENDENTE | Fornecer WhatsApp, endereço, horários, cardápio/preços reais, métodos de pagamento, retirada/entrega, bairros e fretes. Esses dados não podem ser inferidos ou inventados. |
| Homologação autenticada remota | NÃO TESTADO | Após resolver e-mail e identidades, testar cliente/vendedor/terceiro, uploads, pedidos/status/histórico, duplicação e confirmação incerta; só então aprovar exclusivamente o UUID verificado da loja e habilitar o piloto. |
| Primeira compra real supervisionada | NÃO TESTADO | Proprietário e cliente humano executam a compra após aprovação técnica; nenhuma compra foi simulada como real. |

Roteiro da primeira compra: responsável verifica conta e prepara loja real; administrador aprova somente essa loja; testes críticos remotos passam; cliente humano compra um produto real e confere entrega/retirada, frete e pagamento; o registro aparece uma única vez no Supabase e no painel; proprietário aceita e atualiza estados; cliente recebe ou retira; pagamento é confirmado pelo meio real, separado do estado do pedido. Se a confirmação de rede falhar, consultar a tentativa existente antes de repetir. WhatsApp é auxiliar.

**Custos desta execução:** Netlify Free confirmado pela API e Supabase Free confirmado no painel. Nenhum site/banco adicional, domínio, plano ou serviço pago foi contratado. Não houve upgrade ou recarga automática. Permanecem as cotas dos serviços existentes; o futuro provedor de e-mail ainda precisa ser definido sem contratação paga automática.
