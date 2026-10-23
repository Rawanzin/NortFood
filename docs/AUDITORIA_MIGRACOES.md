# Auditoria das migrações — 12/10/2026

**Registro histórico.** Vencimento, cursor e localização foram concluídos na etapa de [15/10/2026](LOCALIZACAO_E_MIGRACOES.md). A ordem atual é 002 → 003 → 004 → 005, com 001 já aplicada. Os hashes e limites abaixo correspondem à auditoria anterior.

## Decisão

As versões locais corrigidas de **002 → 003 → 004** passaram nos testes descritos abaixo e estão preparadas para aplicação, condicionada à conferência do estado remoto e dos privilégios do executor. **Não executar novamente 001.** Nenhuma conexão ao Supabase remoto foi realizada. Esta auditoria não autoriza o lançamento comercial nem certifica os serviços hospedados.

Premissas fornecidas pelo proprietário: projeto novo, 001 executada com sucesso, 002 ainda não executada e `private` fora da Data API. A primeira foi somente lida e mantida intacta nesta auditoria. Seu estado declarativo serviu de fixture em banco descartável; o arquivo 001 não foi executado como migração nos testes. Não foi criado/recriado nenhum objeto remoto.

## Arquivos

Modificados: `supabase/migrations/202610120002_operations.sql`, `202610120003_storage_realtime.sql`, `202610120004_reporting.sql`, `tests/database.test.cjs` e `package.json` (inclui a nova auditoria no comando de testes).

Criados: `tests/helpers/foundation-fixture.cjs`, `tests/migrations-audit.test.cjs`, `supabase/checks/before_remaining_migrations.sql`, este documento e `docs/VALIDACAO_MIGRACOES.json`. README e alterações preexistentes de 001 não foram sobrescritos. Não houve alteração da interface, regras de entrega, arquivos de ambiente, publicação ou banco remoto.

## 001 — fundação já aplicada

26 tabelas, UUIDs e centavos, constraints, índices, funções auxiliares e políticas. Todas as tabelas públicas do NortFood têm RLS; `private.admin_users` tem RLS sem políticas e revogação explícita para PUBLIC/anon/authenticated. `USAGE` em `private` permite as chamadas auxiliares usadas pelas políticas, mas não concede leitura/escrita na tabela.

`private.is_admin()` não aceita um UUID arbitrário e consulta somente `auth.uid()`; retorna booleano. As funções auxiliares são SECURITY DEFINER com `search_path` vazio e relações qualificadas. Cadastro Auth não transforma metadados em permissão administrativa. O trigger de cadastro não é uma RPC pública e tem EXECUTE revogado para papéis de cliente.

As políticas limitam perfil, endereço, pedidos/itens/eventos, chats, notificações, favoritos, obrigações e solicitações aos respectivos usuários/membros ou administradores quando previsto. Dados comerciais aprovados são públicos por desenho. FKs não têm `ON DELETE CASCADE`: exclusão de conta/loja com histórico pode ser impedida; precisa de procedimento de retenção, não de exclusão indiscriminada.

Encontrado: a revogação das tabelas públicas na 001 não neutralizava grants herdados de PUBLIC. O endurecimento foi colocado na 002, sem alterar/reexecutar 001. A 002 verifica RLS em todas as tabelas NortFood e na tabela privada antes de continuar. O papel executor das RPCs deve ter acesso privilegiado às tabelas, normalmente o mesmo `postgres` usado na primeira migração; não mudar proprietários ou impor FORCE RLS sem revisão.

## 002 — operações

27 RPCs públicas. Apenas catálogo e estado do piloto têm EXECUTE para anon. As demais exigem authenticated e verificam identidade/vínculo/admin no próprio servidor. Autorização não depende de dados recebidos do navegador. Helpers privados de escrita/verificação têm EXECUTE revogado para clientes. Catálogo público não lista lojas pendentes; membros/admins podem consultá-las.

Correções:

- Revogação de privilégios herdados de PUBLIC nas tabelas NortFood e conferência de RLS.
- Motivos administrativos de loja removidos da leitura pública por coluna e do catálogo de terceiros; membros/admins continuam recebendo-os pela RPC autorizada.
- `nf_transition` exige igualdade de versão incluindo rejeição de NULL, além de transição explicitamente verdadeira. Não permite saltar estados ou gerar comissão antes da conclusão.
- Locks transacionais por usuário para limite de pedidos, mensagens, solicitações de lojas, solicitações de dados e atualização de endereço principal. Chaves diferentes não contornam o limite usando o mesmo usuário. Não implementam proteção contra criação de muitas contas/IPs.
- Retry de mensagem idempotente é tratado antes do limite de frequência, sem gerar segunda mensagem/notificação.
- Validação de objetos/arrays JSON, itens/quantidades, grupos e motivos nulos. Até 20 grupos de adicionais por produto e 20 opções por grupo; interface atual edita um grupo.
- Cálculos intermediários de pedido e saldo financeiro usam bigint; teto de pedido é aplicado antes da gravação final em centavos inteiros.
- Quitação exige chave, referência e motivo; serializa por chave e compara também referência/motivo no retry. Lançamentos existentes não são modificados.
- GRANTs de RPCs usam lista de nomes NortFood explícita, evitando o antigo padrão LIKE que poderia atingir funções diferentes.
- Corrigida uma corrupção textual de SQL observada durante os testes: mensagem `QUERY LENGTH LIMIT EXCEEDED` no lugar da função administrativa e token inválido `defineer`. A função foi restaurada sem substituir função remota; a versão final validada possui SECURITY DEFINER verdadeiro. A origem dessa alteração externa não foi determinada.

Checkout continua transacional: valida piloto, loja aprovada/aberta, auto-pedido, entrega/retirada, endereço próprio, zona, pagamento, produtos, adicionais, mínimos e preço revisado. Recalcula valores, congela snapshots e conserva idempotência. Alterações de produto bloqueiam o produto pai, coordenando-se com o checkout; atualização de zonas bloqueia a loja. Comissões são geradas uma única vez após entrega/retirada, sem taxa de entrega, com percentual congelado.

Administração continua auditada e restrita. Informar recebimento não representa confirmação bancária. Ajustes compensatórios não alteram o lançamento original e não podem reduzir saldo pendente abaixo de zero. Pagamentos externos, multas, vencimentos automáticos e estorno bancário não são implementados.

## 003 — Storage, histórico e Realtime

Avaliações públicas expõem somente ID de avaliação/loja, nome público, nota, texto e data; IDs de cliente/pedido permanecem proibidos por coluna, mesmo com grant PUBLIC simulado. O usuário recebe suas avaliações completas por RPC própria. Nome e texto de avaliação são deliberadamente públicos: isso precisa constar na política de privacidade.

Bucket privado `store-media`, 1 MB, PNG/JPEG/WebP. A migração não altera um bucket existente: se sua configuração divergir, interrompe com `STORE_MEDIA_BUCKET_CONFIG_CONFLICT` e rollback. Também exige RLS em storage.objects. Nenhum arquivo é apagado ou convertido.

Parser de pasta UUID tolera caminhos inválidos e retorna NULL, em vez de causar erro de cast. Leitura é permitida para mídia de loja aprovada ou vínculo autorizado. Guards restritivos impedem políticas permissivas adicionais de abrir mídia privada ou autorizar INSERT/UPDATE/DELETE de clientes nesse bucket. Outros buckets mantêm suas próprias regras. A função de upload servidor usa credencial privilegiada, verifica vínculo e permanece responsável pelo upload; não foi implantada/testada remotamente nesta auditoria.

Histórico financeiro, quitações, eventos e auditoria são protegidos contra UPDATE/DELETE e agora também TRUNCATE, inclusive tentativas privilegiadas normais. Proprietário/superusuário ainda pode deliberadamente desabilitar triggers ou alterar DDL; isso exige controle operacional. A restrição não torna o banco imune a administradores privilegiados.

Realtime adiciona orders/messages/notifications à publicação existente, preservando suas outras tabelas. Rejeita publicação FOR ALL TABLES; não recria nem remove publicação. Se a publicação não existir, emite warning explícito e mantém o polling da aplicação; será necessário configurar Realtime antes do piloto.

Para eventos INSERT/UPDATE, a autorização depende de SELECT/RLS do destinatário, não apenas do filtro enviado pelo cliente. Não foi aplicado REPLICA IDENTITY FULL, evitando ampliar a imagem antiga transmitida. DELETE no Supabase Realtime tem limitações de RLS: as RPCs não apagam essas três tabelas; qualquer rotina futura de limpeza precisa rever esse comportamento. URLs assinadas já emitidas podem continuar válidas até expirar após uma suspensão. [Realtime oficial](https://supabase.com/docs/guides/realtime/postgres-changes), [Storage oficial](https://supabase.com/docs/guides/storage/buckets/fundamentals).

## 004 — relatórios e suporte

6 RPCs públicas, somente authenticated, com checks internos. Relatórios têm intervalo limitado, fuso de São Paulo e dados da loja autorizada. Histórico/detalhe de pedido não expõe dados a outro cliente/loja. Reordenação conserva UUIDs e snapshots; cancelamento de suporte exige administrador, motivo e pedido ainda não finalizado. Solicitações de dados são registro/processamento administrativo, não exclusão automática de conta.

Correções: motivos/status nulos rejeitados; datas não finitas rejeitadas; saldo vencido calculado por pedido incluindo ajustes sem vencimento e deduzindo quitações, evitando saldo vencido incorreto/negativo. Sem `due_at` contratual no lançamento de cobrança, não existe vencimento a relatar. O cursor do histórico utiliza timestamp; empates podem exigir futura evolução conjunta da RPC/interface para cursor com UUID. Isso não apaga pedidos nem afeta autorização, mas é uma limitação de paginação registrada.

## Operações que mudam ou apagam dados

Não há DROP, TRUNCATE executável, CREATE OR REPLACE ou remoção em massa na aplicação das três migrações. CREATE FUNCTION cria funções novas; se já existirem, a transação falha em vez de substituí-las. Cada arquivo tem BEGIN/COMMIT; aplicar um de cada vez. Uma falha no arquivo não desfaz os arquivos anteriormente confirmados.

Na aplicação: 002 modifica privilégios; 003 modifica privilégios de avaliações, cria bucket se ausente, políticas/triggers e altera a publicação; 004 cria funções/grants. Nenhuma dessas operações apaga linhas existentes.

Há DELETE dentro de funções, executado somente quando elas forem chamadas depois: `nf_delete_address` apaga um endereço do próprio usuário; `nf_save_store` apaga os vínculos de categoria da própria loja e recria a seleção atual dentro da mesma transação. São funcionalidades necessárias e foram mantidas. Zonas e produtos/adicionais antigos são desativados/arquivados, sem apagar snapshots de pedidos. ON CONFLICT DO UPDATE aparece em operações de edição, leitura/chat, avaliações e cadastros autorizados; não substitui funções. Triggers contendo BEFORE TRUNCATE bloqueiam essa operação, não a executam.

## Testes realizados

`node --test tests/database.test.cjs tests/migrations-audit.test.cjs tests/commercial.test.cjs tests/ui-contract.test.cjs`: **39 testes aprovados, zero falhas**. PGlite PostgreSQL em memória, com Auth e Storage de teste. A fixture declara o estado esperado da 001 e os testes executam somente os arquivos 002/003/004, em ordem. Nada foi executado remotamente.

Cobertura: dependências/tipos, RLS, ACLs herdadas, 33 RPCs e superfície anônima, identidade/lojas/admin, checkout/preço/opções/idempotência, status/versionamento, comissão/quitação/ajuste, chat, avaliações, relatórios, motivos nulos, publicação existente, bucket conflitante e rollback, caminhos inválidos, políticas Storage amplas, negação de escrita e imutabilidade. A integração de interface comercial também passou em Chrome com transporte controlado e seis larguras de tela.

PGlite não reproduz o SQL Editor/supautils, PostgREST, Auth real, serviço de Storage, entrega Realtime nem conexões PostgreSQL concorrentes. Foi verificada a presença dos advisory locks e o comportamento serial, não uma corrida real entre conexões. Esses cenários precisam dos testes reais de piloto. Sintaxe aprovada não foi o único critério de conclusão.

## Avisos esperados e verificações antes de aplicar

- SQL Editor pode alertar por REVOKE/ALTER/POLICY, DELETE em corpos de funções ou triggers de TRUNCATE. Ler o comando correspondente; não retirar proteção para ocultar o aviso.
- Advisor pode marcar RPCs SECURITY DEFINER executáveis por anon/authenticated. São endpoints intencionais, com privilégios revogados de PUBLIC e verificações internas; catálogo/estado são as únicas RPCs anônimas.
- RLS sem política em `private.admin_users` é negação deliberada para clientes. Não adicionar uma política permissiva para eliminar o aviso.
- Avisos de desempenho podem continuar: FKs sem índice, chamadas de função em políticas, ausência de PK convencional em favorites, índices não usados em banco vazio. As uniques parciais de favoritos e RLS foram preservadas; não se alterou 001 para esconder esses avisos. Rever índices com volume/planos de consulta antes de escalar.
- Storage privado não significa impedir toda leitura pública: mídia de loja aprovada e avaliações públicas são parte do marketplace. Não armazenar comprovantes/documentos pessoais nesse bucket.

Confirmar no SQL Editor com as consultas **somente leitura** preparadas em `supabase/checks/before_remaining_migrations.sql`: RLS e ACL de admin_users, proprietário de tabela/função, ausência prévia de nf_*, bucket compatível, políticas Storage existentes e publicação sem FOR ALL TABLES. Usar o papel privilegiado do SQL Editor, normalmente postgres; 003 exige permissão de criar políticas em storage.objects e alterar a publicação. A compatibilidade exata do serviço não foi testada remotamente.

Ordem: **002_operations → 003_storage_realtime → 004_reporting**. Não repetir 001, não aplicar versões antigas e não repetir arquivos já confirmados. Se qualquer arquivo falhar, interromper, registrar o erro e inspecionar o estado antes de tentar novamente; não usar DROP para forçar passagem. Depois, executar testes reais de RLS/RPC/Storage/Realtime em duas identidades e o roteiro do piloto, mantendo pedidos bloqueados até validar a operação.

Os hashes em VALIDACAO_MIGRACOES.json identificam a versão local testada. Houve alterações textuais inesperadas durante a auditoria; caso alguma ferramenta continue editando SQL, conferir esses hashes e repetir os testes antes de copiar para o SQL Editor.
