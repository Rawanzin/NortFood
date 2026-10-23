# Auditoria da integração NortFood / Supabase — 19/10/2026

**Evolução posterior:** os problemas de termos e URL protegida foram corrigidos e validados localmente. A preparação do ambiente isolado está em [HOMOLOGACAO.md](HOMOLOGACAO.md), com [resultados e classificações remotas](HOMOLOGACAO_RESULTADO_20261019.md). O diagnóstico abaixo é o registro anterior às correções; não representa homologação remota dessas mudanças.

**Veredito: integração implementada, mas homologação remota incompleta. NO-GO para beta público.** Não foi implementada funcionalidade, corrigido código de aplicação, alterada configuração de produção, reaplicada migração ou desativado RLS nesta auditoria.

## 1. O que foi efetivamente verificado

A revisão cobriu `app.js`, `src/backend.js`, `src/commercial.js`, `src/compatibility.js`, `src/auth-storage.mjs`, `src/qr-menu.js`, configuração pública/build, sete migrações, função de upload e testes. As consultas SQL remotas usaram **BEGIN READ ONLY**, timeout e ROLLBACK. A consulta retornou `transaction_read_only=on`. Nenhuma credencial foi solicitada ou registrada.

| Área | Integração e persistência existentes | Evidência desta auditoria / situação real |
|---|---|---|
| Cadastro | `auth.signUp`, trigger de perfil, confirmação de e-mail; metadados não concedem cargo | Configuração remota responde 200, e-mail ativo e autoconfirmação desativada. **Cadastro completo não homologado**: SMTP próprio ausente e nenhuma conta criada |
| Login, saída, recuperação | Supabase Auth, `getUser`, sessão gerenciada pelo SDK, recuperação e troca de senha | Regressões locais passaram, incluindo transporte simulado. Formulários reais abriram. **Não houve login válido, saída de sessão real nem envio/consumo de e-mail remoto** |
| Permissões | RLS, privilégios de tabela/coluna e RPCs DEFINER com verificações de identidade/vínculo/admin | ACLs/RLS conferidos no remoto; acessos anônimos indevidos recusados. Isolamento com identidades distintas passou **localmente**, não com duas contas Supabase reais |
| Estabelecimentos | `nf_request_store`, `nf_save_store`, `nf_set_store_open`, aprovação administrativa e categorias múltiplas | Estruturas e leitura pública disponíveis; escrita/vínculo/loja fechada passaram no PostgreSQL isolado. **Não existe loja remota para homologar o fluxo completo** |
| Cardápios | `nf_catalog`, tabelas de produtos/adicionais; edição/arquivamento/reordenação por RPC | Catálogo, produtos e categorias retornaram 200 e listas vazias no remoto. Preservação de histórico e edição passaram localmente. **Nenhum produto real foi publicado ou editado** |
| Carrinho | LocalStorage `nortfood-cart-v2`, separado por identidade, um estabelecimento por pedido | Persistência local intencional; não é carrinho sincronizado entre dispositivos. Interface e regra de loja única cobertas nos testes locais. O conteúdo local não autoriza preço ou pedido |
| Checkout e pedidos | `nf_place_order`, preços/adicionais/taxa calculados no servidor, idempotência, snapshots; transições versionadas | Cenários SQL locais passaram. **Nenhum pedido remoto foi criado ou alterado**; piloto continua desabilitado |
| Chat | `nf_chat`, `nf_send_message`, conversas/mensagens no PostgreSQL, autoria e autorização no servidor | Isolamento e persistência passaram localmente. **Nenhuma mensagem de negócio remota nem conversa entre contas reais foi enviada** |
| Notificações / Realtime | Tabelas remotas, inscrição `postgres_changes` e polling a cada 15 s | Publicação restrita confirmada. Broadcast transitório entre dois clientes anônimos funcionou. **Isso não comprova eventos autenticados de pedidos/chat/notificações**. Não existe push com navegador fechado |
| Imagens | Edge `upload-media`, bucket privado, URLs assinadas, quota e validação/reencodificação de conteúdo | Função responde; sem sessão 401, token inválido 401, origem externa 403. Políticas e limite do bucket conferidos. **Upload válido e leitura assinada de arquivo existente ainda não homologados remotamente** |
| Relatórios e comissões | `nf_report`, ledger/quitações persistentes; parte dos totais da UI é agregada sobre registros remotos carregados | Cálculo, autorização e prazos passaram localmente. Leitura financeira anônima recusada no remoto. **Não há venda/comissão remota para validar relatório preenchido** |

Pagamentos continuam sendo realizados diretamente à loja. “Informar pagamento recebido” é declaração do estabelecimento, não aprovação bancária ou integração de cartões/Pix. Nenhuma transação financeira real foi feita.

## 2. Resultados dos testes — sem misturar ambientes

| Teste | Resultado | Classificação |
|---|---|---|
| Suíte automatizada `pnpm test` | **71 aprovados, 0 falhas, código 0** | Local: PGlite, testes de código, navegador e fixtures/mocks conforme cada arquivo |
| `node tests/flows.cjs` | **107 verificações aprovadas, código 0** | Protótipo demonstrativo local; não valida backend remoto |
| Restauração + `--with-sql-flows` | **64 tabelas conferidas e 18 cenários aprovados**, código 0 | PostgreSQL 17.11 nativo isolado, claims JWT por SQL; não é GoTrue/Auth real |
| Build em memória | Sucesso; bundle existente coincide com o compilado das fontes | Sem regravar bundle/configuração |
| `check-production-readonly.cjs` | **8/8 verificações aprovadas** | HTTP real no Supabase, somente consultas/preflight |
| Sondas remotas adicionais | Produtos/categorias 200 vazios; pedidos, perfis, ledger, snapshot e contexto anônimos 401 | Acesso real sem sessão, não teste positivo autenticado |
| Edge remota | OPTIONS 200, anônimo 401, token inválido 401, origem externa 403 | Rejeições antes de upload/quota; nenhum arquivo gravado |
| Realtime | Duas sessões anônimas conectadas, ACK `ok`, broadcast recebido | Transporte real transitório; sem alterações de tabelas |
| Navegador comercial + banco remoto | Leitura real de categorias/catálogo/estado operacional 200; zero lojas exibidas | Chrome headless em servidor local, sem mocks e sem submit de cadastro/pedido |
| Responsividade dessa sonda | 390 e 1365 px, sem overflow e sem erro JS observado nas telas exercitadas | Home, acesso/recuperação; não equivale a todos os painéis autenticados ou aparelhos reais |
| Auditoria de dependências | Zero advisories retornados nas consultas `pnpm audit --prod --json` e `pnpm audit --json` | Abrange o grafo npm consultado; não certifica ausência de vulnerabilidades ou segurança dos serviços gerenciados |
| Gate de publicação | **NO_GO / PUBLIC_HTTPS_URL_PENDING**, saída 2 esperada | Domínio ainda não definido; não é falha de sintaxe |

Os cenários nativos verificaram preços e idempotência, acesso entre lojas/clientes, categorias múltiplas, coordenadas zero, loja fechada, chat, notificações e perfil, relatórios, edição/reordenação/arquivamento de produtos, histórico com timestamps iguais, snapshot de retirada e comissão exatamente em `completed_at + interval '7 days'`, sem taxa de entrega. Quitações e ajustes preservaram o vencimento; cancelamento não gerou comissão. Esses resultados são **locais**.

O backup foi restaurado em outro cluster de loopback, com credencial temporária local e sem contato com produção. A extensão gerenciada `supabase_vault` não existe nessa distribuição Windows: a restauração compatível excluiu somente a extensão/comentário e a entrada de dados de `vault.secrets`, que tinha zero linhas. Não é uma restauração de toda a infraestrutura Supabase. O servidor de teste foi encerrado; zero processos PostgreSQL dessa instalação permaneceram ativos na conferência.

`tests/supabase-live.cjs` **não foi executado**: cria contas/fixtures, habilita piloto e grava pedidos; seu uso é exclusivo de ambiente descartável. Não foi apontado para produção. Tentativas exploratórias de alcançar termos/configurações sem sessão não acessaram a tela protegida; uma expectativa de normalização de URL atingiu timeout, levando ao achado de navegação descrito abaixo. Isso não foi contado como validação autenticada.

## 3. Estado remoto confirmado nesta execução

- **0 usuários Auth, 0 administradores, 0 lojas, 0 categorias, 0 produtos, 0 pedidos, 0 mensagens e 0 objetos em `store-media`.** Ausência de registros impede verificar fluxos positivos com dados reais; não foi ocultada com sementes demonstrativas.
- Histórico contém as versões `202610120001`, `202610120002`, `202610120003`, `202610120004`, `202610150005`, `202610170006`, `202610190007`.
- **57/57 corpos de funções SQL** de aplicação/`private` coincidem com os definidos pelas migrações locais, considerando a substituição das versões e a renomeação de `save_store_base`. Comparação por MD5 do corpo retornado pelo catálogo PostgreSQL, não apenas nomes no histórico; isso verifica correspondência de código, não execução completa de cada função.
- **26/26 políticas RLS de `public`/`private`** coincidem com as produzidas localmente pelas migrações, comparando comando, papéis, modo, USING e WITH CHECK. Houve somente diferença de indentação na representação de `own_item_options`, inspecionada e desconsiderada. As cinco políticas de Storage também foram lidas e revisadas.
- Nenhuma tabela conferida em `public`, `private` ou `supabase_migrations` estava sem RLS.
- Únicos privilégios diretos de escrita concedidos a clientes nas tabelas de aplicação: INSERT/DELETE de `authenticated` em `favorites`, com política de identidade. Outras escritas passam por RPCs.
- Únicas RPCs `nf_*` executáveis por `anon`: `nf_catalog`, `nf_operating_status`, `nf_table_context`.
- `anon` e `authenticated` não têm SELECT de `private.admin_users` nem da coluna `stores.status_reason`. O esquema `private` é recusado pela Data API. USAGE no esquema não concede leitura da tabela.
- Funções DEFINER conferidas não apresentaram `search_path` não confiável. A análise das RPCs relevantes encontrou verificações de identidade, vínculo e administração, em conjunto com os testes locais; isso não substitui todos os testes de abuso com JWTs reais.
- Reserva de upload executável por `service_role`, não por `authenticated`. Bucket privado, 1 MB, PNG/JPEG/WebP. RLS de `storage.objects` ativo; políticas restritivas vedam escrita direta de clientes no bucket.
- Publicação Realtime não publica todas as tabelas: somente `orders`, `messages`, `notifications`, `dining_tables`.
- Piloto desabilitado. Auth por e-mail habilitado, telefone e login anônimo desabilitados, autoconfirmação de e-mail desabilitada.

Não foi confirmada exposição indevida de dados nos acessos remotos exercitados. **Isso não é aprovação de segurança do marketplace:** não foi possível comprovar remotamente o isolamento entre usuários/lojas autenticados, a cadeia de upload positiva ou todos os fluxos financeiros. As permissões são promissoras e passaram nos ensaios locais, mas essa lacuna permanece bloqueadora.

## 4. Achados e correções necessárias

| Prioridade | Achado | Ação antes do beta |
|---|---|---|
| Bloqueador | Sem domínio HTTPS e SMTP próprio, conforme confirmado pelo responsável | Definir domínio e remetente; configurar retornos/origens exatos e SMTP protegido; testar e-mails reais. Não desativar confirmação |
| Bloqueador | Nenhum fluxo autenticado completo validado no serviço remoto | Homologar em Supabase de testes descartável com cliente A/B, loja A/B e administrador: cadastro/e-mail/login/saída/recuperação, escrita entre lojas, checkout/transições, chat/notificações e relatórios |
| Bloqueador | Upload positivo e leitura privada assinada não exercitados no remoto | Testar imagem válida, MIME/conteúdo inválido, tamanho/quota, loja concorrente, loja pendente e visualização pública de loja aprovada, com contas autorizadas |
| Operacional | Nenhum administrador, categoria ou estabelecimento provisionado | Criar operador real, aprovar o UUID administrativo explicitamente e preparar catálogo real; não converter metadados de cadastro em poderes administrativos |
| P2 — conteúdo | Em `app.js:42` o botão Termos usa `data-action="terms"`; o handler em `app.js:161` ainda abre texto do protótipo, afirmando armazenamento apenas local | Unificar esse caminho com o conteúdo comercial revisado. Achado por rastreamento de código; tela autenticada não homologada remotamente. Não foi corrigido nesta auditoria |
| P3 — navegação | Sem sessão, abrir `#settings` mostra a home, mas mantém `#settings` na URL (`app.js:207–209`) | Normalizar rota/URL após o bloqueio. Reproduzido no navegador local com backend real anônimo. Não contorna autorização nem expõe configurações |
| Validação operacional | Owner e staff possuem os mesmos poderes existentes de membro para editar e operar a loja | Confirmar/documentar essa regra para os estabelecimentos. Nenhum recebe administração da plataforma; não restringir cargos silenciosamente |
| Recuperação | Ensaio Windows não restaura toda a infraestrutura gerenciada | Completar recuperação em destino Supabase compatível, incluindo objetos Storage e configurações/segredos por procedimento separado |

O conteúdo comercial de termos/privacidade também continua identificado como rascunho, com responsável e contato pendentes. A auditoria não afirma conformidade jurídica. Não foi encontrado erro de cálculo nos cenários financeiros executados; isso não transforma relatório sem vendas remotas em relatório homologado.

## 5. O que é local ou simulado

- `?demo=1` em localhost: contas, autenticação demonstrativa, estabelecimentos, produtos, pedidos, chat, avaliações, notificações e relatórios em `nortfood-v1`. Esses dados **não são contas nem registros Supabase**. O modo comercial não usa esse conjunto como alternativa em falha de conexão.
- Modo comercial: carrinho em `nortfood-cart-v2`, tentativa de checkout em sessionStorage, escolha de tema e estado transitório da interface continuam locais. Tokens de Auth são mantidos pelo SDK no armazenamento correspondente à preferência de sessão. Isso não representa um backend falso, mas carrinho/tema não são sincronizados entre aparelhos.
- Modo comercial: perfis, endereços, lojas/categorias, cardápio, favoritos, pedidos, chat, notificações, avaliações e lançamentos financeiros têm caminhos reais para Supabase. **Implementação do caminho não comprova execução remota bem-sucedida**.
- `tests/auth-lifecycle.test.cjs` simula o transporte Auth. `tests/ui-contract.test.cjs` substitui respostas de contexto/catálogo/RPC e identifica isso no próprio arquivo. Testes SQL locais criam papéis/identidades de fixture; não emitem sessões reais GoTrue.
- A sonda de navegador desta auditoria não substituiu respostas Supabase: leu o banco remoto vazio. Seus limites são autenticação ausente e inexistência de dados de negócio.

## 6. Dependências manuais e veredito

O responsável precisa definir domínio HTTPS, provedor SMTP/remetente verificado, identidade administrativa autorizada e dados operacionais reais. Credenciais devem ser fornecidas por entrada protegida no momento da configuração, nunca no chat, frontend ou Git. O projeto descartável de homologação e caixas de e-mail autorizadas também precisam estar disponíveis para os testes completos.

Somente depois da homologação essencial devem ser revisadas publicação HTTPS/cabeçalhos, retornos Auth e origem do upload, procedimentos de suporte/comissões, termos operacionais e habilitação controlada do piloto. Nenhuma dessas configurações foi alterada nesta auditoria.

**Funcionando remotamente e comprovado:** consultas anônimas públicas, integração da home com o catálogo vazio, rejeições de acesso anônimo, barreiras negativas da função de upload e transporte Realtime por broadcast. **Implementado e validado localmente, ainda sem prova remota completa:** praticamente todos os fluxos autenticados e de negócio. **Beta público: não aprovado.**

## Evidências e alterações desta auditoria

Novo arquivo versionável: este relatório. Artefatos privados de execução em `test-results/`: `audit-integration-tests-20261019.txt`, `audit-integration-demo-20261019.txt`, `audit-integration-remote-20261019.jsonl`, `audit-integration-remote-extra-20261019.json`, `audit-integration-remote-sql-20261019.json`, comparações `audit-integration-function-comparison-20261019.json` / `audit-integration-policy-comparison-20261019.json`, `audit-integration-browser-20261019.json`, capturas `audit-integration-browser-390.png` / `1365.png`, `audit-integration-realtime-20261019.json`, auditorias de dependências e sondas/SQL de leitura. Restauração: `backups/restore-isolated-2026-10-19T17-17-55-023Z/result.json`.

Backups, resultados e `.env` estão fora do versionamento. Nenhum arquivo de aplicação ou migração foi alterado nesta etapa. Os testes de escrita rodaram exclusivamente em bancos locais isolados. No remoto houve consultas, preflight/rejeições sem sessão e broadcast transitório entre os próprios clientes de teste; não houve migração, DDL/DML de negócio, upload de arquivo, criação de usuário, envio de e-mail, alteração de configuração ou desativação de proteção.
