# NortFood — homologação em 20/10/2026

**Atualização final desta execução:** o bloqueio da chave foi resolvido automaticamente usando a credencial legada existente, somente em memória. **Gate autenticado de API aprovado (exit 0) e cinco verificações de interface autenticada aprovadas.** Não foi criada conta de administrador. A aprovação continua limitada aos recortes descritos abaixo; e-mail e operações administrativas positivas permanecem pendentes.

## Destino e alterações remotas efetivas

Projeto confirmado pela sessão autenticada: **NortFood-Homologacao**, organização **NortFood FREE**, São Paulo (`sa-east-1`), NANO, estado Healthy. Identificador `zrczgghucwsaxqnyaapk`; Project URL `https://zrczgghucwsaxqnyaapk.supabase.co`. O rótulo `main PRODUCTION` do painel identifica a branch padrão deste projeto de testes, não o NortFood principal.

- Configuração pública exclusiva em `.env.homologacao`, ignorada pelo Git. O servidor `http://localhost:4174` usa esse destino e somente sua chave publishable. `.env` do principal não foi alterado.
- **001 → 002 → 003 → 004 → 005 → 006 → 007** aplicadas em uma transação protegida contra banco ocupado, com resultado remoto `HOMOLOGATION_SCHEMA_READY_PILOT_DISABLED` e sete versões registradas em `supabase_migrations.schema_migrations`. Não reaplicar. As fontes das migrações não foram alteradas nesta execução.
- A implantação confirmou zero lojas e pedidos. Não houve importação de backup ou dados pessoais, reset, exclusão de registros ou alteração de outros projetos.
- `upload-media` implantada com `index.ts`, `media-validation.mjs` e `runtime-config.mjs` do repositório. `APP_ORIGIN=http://localhost:4174`.
- O gateway usa `verify_jwt=false`, conforme `supabase/config.toml`, para aceitar JWTs das chaves novas. Isso não torna o upload anônimo: o código exige Bearer, valida `auth.getUser()`, vínculo com a loja e conteúdo do arquivo antes de gravar. O teste remoto sem identidade retornou 401.
- Auth: Site URL `http://localhost:4174`; retornos exatos `http://localhost:4174` e `http://localhost:4174/#settings`, sem curingas. Cadastro por e-mail e confirmação ativos, login anônimo desativado, confirmação nos dois endereços para troca de e-mail e senha mínima de **12 caracteres**. Nenhum provedor pago ou SMTP foi contratado.

## Auditoria remota somente leitura

- Nenhuma tabela de `public`/`private` sem RLS.
- Nenhuma RPC `nf_*` com EXECUTE concedido a PUBLIC.
- `private.admin_users` sem SELECT/INSERT/UPDATE/DELETE para anon/authenticated; authenticated sem CREATE no esquema private.
- `status_reason` não legível por anon; latitude/longitude disponíveis nos caminhos públicos autorizados, sujeitos ao RLS.
- `nf_reserve_media_upload` não executável por authenticated; uso exclusivo do servidor.
- Bucket `store-media` privado, limite de 1 MB, PNG/JPEG/WebP; cinco políticas de leitura e proteção contra escrita direta.
- Realtime publica somente `orders`, `messages`, `notifications` e `dining_tables`.
- Piloto desativado.
- As funções da aplicação usam search_path vazio. A função `public.rls_auto_enable`, criada pelo Supabase ao ativar RLS automático, usa **pg_catalog**, caminho confiável, e retorna event_trigger. O primeiro filtro que exigia literalmente caminho vazio a listou; a definição foi conferida e não se trata de caminho mutável/inseguro.

Isso comprova configuração e acessos anônimos. Isolamento entre contas autenticadas e comportamento de negócio ainda exigem o gate positivo abaixo.

O **Security Advisor** mostrou **0 erros, 42 avisos e 2 sugestões** depois das migrações. Os 42 avisos pertencem às classes de funções SECURITY DEFINER executáveis por anon ou authenticated: as três RPCs públicas deliberadas (`nf_catalog`, `nf_operating_status`, `nf_table_context`), as RPCs autenticadas com verificações explícitas e o event trigger `rls_auto_enable` da plataforma. Não foram removidos grants necessários nem desativadas verificações para esconder os avisos. As duas sugestões são RLS ativo sem políticas em `private.admin_users` e `private.media_upload_reservations`: bloqueio direto intencional, com acesso apenas pelos caminhos administrativos/servidor. A ausência de erros no Advisor não substitui os testes de isolamento entre identidades.

Foi preservado o comportamento atual de permissões: owner e staff são membros autorizados pelos mesmos auxiliares `private.is_member`/`private.require_store`; não foi criada distinção nova de poderes nesta etapa. As operações de edição de loja/localização, produtos, pedidos, mesas, mídia e relatórios seguem o vínculo da loja. Administração da plataforma continua exigindo `private.is_admin`, sem promoção baseada em metadados de cadastro.

## Testes executados

| Execução | Resultado | Alcance real |
|---|---|---|
| Suíte Node de regressão | **82/82 aprovados na rodada final** | Local: PGlite, testes de validação e navegadores com fixtures; não prova remota autenticada |
| Preparação isolada | **3/3 aprovados**, também incluídos na suíte | Local: bootstrap 001–007, recusa de reaplicação e configuração segregada |
| Build estático | Aprovado | Local; nenhum deploy/publicação |
| `node scripts/check-homologation-readonly.cjs` | **15/15 respostas esperadas**, mais assertions de confirmação ativa/piloto bloqueado | Supabase remoto real, sem fixtures |
| `node tests/homologation-browser-live.cjs` | **5 verificações aprovadas** | Interface local conectada ao Supabase remoto, sem mocks: catálogo vazio, rota protegida, login inexistente recusado, formulário de recuperação, mobile/desktop |
| Aplicação e auditoria SQL pelo painel | Aprovadas | PostgreSQL remoto do projeto novo; grants/RLS/bucket/publicação/histórico |
| Gate autenticado de pedidos/chat/upload/comissões | **APROVADO, exit 0** | Supabase real, contas provisionadas pelo Auth Admin sem cargo de administrador; preparação de fixtures por SQL no ambiente isolado |
| Interface autenticada em duas sessões | **5 verificações aprovadas** | Login cliente/vendedor, carrinho/checkout de retirada, estados até Retirado, chat entre telas e logout; 390/1365 px |
| Regressões após ajuste da automação | **5/5 aprovadas** | Local: inclui bloqueio explícito dos dois projetos Rawanzin |

Os 15 probes incluem catálogo/estado operacional/Auth settings/coordenadas (200), bloqueio de status_reason/histórico/perfis/pedidos/mensagens/comissões (401), esquema private fora da Data API (406), upload OPTIONS local (200), upload sem identidade (401), origem externa (403) e senha de oito caracteres rejeitada por exigir doze (422). A tentativa de cadastro fraco não criou usuário nem solicitou envio de e-mail. A interface obteve respostas reais de categorias/catálogo/estado e Auth token; não se injetou identidade simulada nesse teste. As larguras verificadas foram 390 e 1365 px, sem erro JavaScript ou overflow horizontal.

## Classificação funcional

| Funcionalidade | Estado | Evidência ou limite |
|---|---|---|
| Integração pública/visitante e redirecionamento protegido | **APROVADA** | Interface e API reais na homologação; catálogo ainda vazio |
| Negação de login inexistente e de acesso anônimo a dados privados | **APROVADA** | Respostas remotas e mensagem na interface |
| Cadastro completo de cliente e confirmação de e-mail | **PENDENTE** | SMTP/remetente e recebimento em caixa de teste não configurados |
| Login/logout positivo de conta provisionada | **APROVADA** | API e interface reais, contas sintéticas em sessões separadas |
| Recuperação completa de senha | **PENDENTE** | Formulário abre; envio/recebimento/troca não testados |
| Solicitação/edição de estabelecimento | **APROVADA** | RPCs reais criaram loja pendente, editaram endereço, bairro/taxa de entrega, horário e abertura |
| Aprovação pela RPC administrativa | **PENDENTE** | A fixture foi aprovada por SQL; isso não comprova a ação administrativa pela aplicação |
| Cadastro/edição de produtos | **APROVADA** | RPCs reais, adicionais obrigatórios e preservação do preço do pedido antigo após edição |
| Múltiplas categorias e edição de coordenadas pela interface | **PENDENTE** | Não exercitadas neste recorte remoto; regressões locais disponíveis |
| Upload autenticado e leitura assinada | **APROVADA** | PNG sintético enviado, URL assinada lida com 200, concorrente recusado com 403, escrita direta recusada |
| Carrinho/checkout/estados de retirada | **APROVADA** | Interface real: produto → carrinho → checkout → vendedor → Retirado |
| Entrega e cancelamento/rejeição | **APROVADA na API** | Fluxos reais com preço 10100 + taxa 499; checkout de entrega pela interface ainda não exercitado |
| Chat e notificações Realtime entre contas | **APROVADA** | postgres_changes autenticado de pedidos/mensagens/notificações; chat também comprovado entre duas telas |
| Relatórios/geração de comissões e prazo de sete dias | **APROVADA no recorte** | Consulta da loja, base sem entrega, cobrança por conclusão, ausência de comissão em cancelamento/rejeição e due_at exato |
| Ajustes/quitações pela RPC administrativa | **PENDENTE** | Nenhum cargo de plataforma concedido às contas de teste |
| Isolamento entre clientes/estabelecimentos autenticados | **APROVADA nos casos executados** | Outra conta não lê pedido, não altera estado/produto alheio, não acessa relatório ou chat alheio e não altera taxa administrativa |

Não houve erro funcional reproduzível da aplicação nesses testes. A preparação encontrou uma resposta mascarada da chave nova (tentativa incompleta recusada com 401 antes de criar usuário), resolvida usando a chave legada existente pelo painel. Depois, a tentativa de preparar fixtures por UPDATE de `platform_settings` com service_role foi corretamente recusada: seus grants foram preservados e a preparação passou ao SQL Editor isolado. O primeiro teste de interface esperava HTTP 200 de uma RPC void; o servidor respondeu corretamente 204. A expectativa do teste foi corrigida e a execução completa passou. Nenhuma dessas ocorrências foi contornada desativando segurança ou alterando produção. Nenhuma chave secreta completa foi registrada ou persistida.

## Credenciais, dados de teste e pendências

A intervenção de chave foi dispensada e a janela protegida encerrada. A automação obteve a chave `service_role` legada existente do projeto de testes pela interface oficial, sem gravá-la em arquivo, chat, comando ou log, e sem criar nova credencial. O transporte para o processo local usou named pipe temporário; o frontend recebeu somente a publishable. Senhas das contas sintéticas foram aleatórias e ficaram apenas em memória. Nenhum administrador de plataforma foi criado.

A tentativa de cadastro normal com chave publishable e domínio reservado `example.com` retornou HTTP 400, `email_address_invalid`, sem usuário ou sessão. Esse endereço não possui caixa postal de testes: a recusa não prova falha de cadastro com endereço real controlado. Não se tentou contornar o filtro nem confirmar contas de usuários reais. As contas usadas no gate foram provisionadas via Auth Admin com `email_confirm=true`, explicitamente como fixture; isso não comprova entrega de confirmação.

Conferência SQL final real: **13 usuários Auth, todos sintéticos; 7 lojas; 14 pedidos; 7 cobranças; 3 imagens sintéticas; zero administradores, zero lojas aprovadas, piloto desativado e zero tabelas sem RLS**. Zero cobranças duplicadas, zero cobranças sem conclusão e zero divergências entre due_at e completed_at + 7 dias. Os pedidos incluem 3 entregues, 4 retirados, 3 cancelados, 3 rejeitados e 1 aceito da execução interrompida do teste; todos são sintéticos e seus históricos foram preservados. Não foi feita limpeza destrutiva. A conta service_role continua sem UPDATE em platform_settings e authenticated sem DML em private.admin_users. Nenhuma migração foi reaplicada nesta continuação.

Ainda falta SMTP/remetente de testes. Contas provisionadas com `email_confirm=true` pelo serviço administrativo não comprovarão cadastro público/confirmação/recuperação. Não desativar confirmação para contornar essa pendência.

Também faltam testes positivos de operador administrativo autorizado (aprovação, ajustes/quitações), jornada de entrega pela interface, demais combinações de configuração da loja/localização e uma rodada final completa depois de configurar e-mail. Não é necessário conhecer a senha do banco nem copiar uma Secret Key para continuar os recortes que já foram aprovados.

## Arquivos e evidências

Criados nesta execução: `scripts/check-homologation-readonly.cjs`, `tests/homologation-browser-live.cjs`, `scripts/homologation-session.cjs`, `scripts/Start-HomologationSession.ps1`, este relatório e `.env.homologacao` (ignorado, somente configuração pública). Atualizado o guia `docs/HOMOLOGACAO.md`. O build regenerou o bundle/dist locais. Nenhuma migração foi editada.

Na continuação foram criados `tests/homologation-signup-live.cjs`, `tests/helpers/staging-sql-fixture.cjs` e `tests/helpers/authenticated-ui.cjs`; atualizados `tests/supabase-live.cjs`, `scripts/run-homologation.cjs`, `scripts/homologation-session.cjs`, `scripts/test-environment.cjs` e seu teste. Os auxiliares não são novas funcionalidades do marketplace; preparam e verificam dados sintéticos somente na homologação confirmada. Não ampliam grants nem concedem cargos.

Evidências privadas ignoradas pelo Git em `test-results/homologation/`: `migracoes-remotas-20261020.png`, `security-audit-20261020.txt`, `seguranca-remota-20261020.png`, `readonly-result.json`, `browser-live-result.json`, `visitante-remoto-390.png`, `visitante-remoto-1365.png`, `local-tests-20261020.txt`. Logs de sessão devem conter apenas estados/erros sanitizados. Não versionar backups, chaves ou arquivos de dados de teste.

Evidências da continuação: `resultado.json` (apiGate APROVADA, exit 0; classificação global pendente), `api-gate.log`, `authenticated-ui-result.json` (cinco checks APROVADOS), `autenticado-cliente-778db4d0.png`, `autenticado-vendedor-778db4d0.png`, `signup-live-result.json` (recusa normal do endereço reservado), `continuacao-local-tests.txt` (5/5 locais), arquivos SQL de preparação/fechamento sem credenciais e conferência final de dados. O log genérico do gate base pode mencionar UI pendente; o recorte executado adicionalmente está comprovado pelo arquivo separado `authenticated-ui-result.json`.

## Veredito

**Infraestrutura e recortes de API/interface autenticada aprovados; homologação funcional completa PENDENTE. NortFood NÃO APTO para liberação a clientes reais com estas evidências.** Faltam e-mail transacional, operações administrativas positivas e jornadas ainda não cobertas pela interface. Nenhum recurso pago foi contratado, nenhum outro projeto foi modificado e o site não foi publicado. O prompt mestre foi recebido e suas etapas independentes foram executadas, sem promover as pendências a aprovadas. Consulte a consolidação em [FINALIZACAO_BETA_20261020.md](FINALIZACAO_BETA_20261020.md).


## Decisão posterior do responsável e encerramento

O responsável escolheu manter os testes administrativos pendentes. Nenhum cargo foi concedido; o SQL de autorização não foi executado e o processo que aguardava a concessão foi encerrado. Uma conta Auth sintética adicional de preparação permanece sem privilégios, elevando o total para 13. A conferência somente leitura final confirmou zero administradores, piloto desativado e os mesmos 14 pedidos/7 cobranças, sem exclusões.

As últimas regressões locais passaram em 82/82 testes, além de 107 verificações demonstrativas. Build aprovado; gate de configuração NO_GO por falta de HTTPS público. Os 15 probes e cinco checks de visitante reais foram repetidos e aprovados após os ajustes de assets. O pedido autenticado não foi repetido depois da última rodada de assets. Resultados e bloqueios finais em [FINALIZACAO_BETA_20261020.md](FINALIZACAO_BETA_20261020.md); este histórico não significa aprovação de lançamento.
