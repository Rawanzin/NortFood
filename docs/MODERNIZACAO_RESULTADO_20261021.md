# NortFood — modernização de 21/10/2026

**Estado: alterações locais implementadas; missão integral e lançamento ainda pendentes.** Nenhuma produção foi modificada, nenhuma migração reaplicada e nenhum dado remoto apagado. O projeto continua em `C:\Users\keven\Documents\NortFood`, na branch `codex/modernizacao-arquitetural-20261021`. A validação final local está registrada nos arquivos de evidências indicados abaixo.

## 1. Diagnóstico inicial

O checkout já tinha alterações extensas não commitadas. Foram preservadas antes do trabalho em um snapshot privado com 237 arquivos e comparação SHA-256. O diagnóstico anterior à refatoração está em `docs/MODERNIZACAO_DIAGNOSTICO_20261021.md`.

Principais achados: publicação parcial de estado durante troca de identidade; respostas tardias e URLs assinadas atravessando a invalidação da sessão; journal de checkout sujeito a JSON inválido/quota/bloqueio; carrinho anterior selecionado antes de autenticar; cache-first com versão fixa e configuração elegível ao cache; build sobre saída reutilizada; leitura incorreta de headers específicos como globais; carregamento da interface condicionado à resposta remota.

A suite inicial tinha **112 testes: 111 aprovados e 1 falha**. A falha de recuperação foi reproduzida e diagnosticada como interferência do SW no transporte simulado de um teste. O teste controlado passou a bloquear SW; o comportamento real de SW/CacheStorage ganhou suite própria. Não se atribuiu esse defeito ao serviço Auth.

## 2. Arquitetura anterior e resultante

Foi mantida a stack HTML/CSS/JavaScript + esbuild + Supabase/PostgreSQL; a Edge Function permanece em TypeScript. Não foi criado outro aplicativo. Uma troca integral de framework/linguagem deslocaria contratos de UI e publicação sem resolver os defeitos demonstrados.

Antes, `app.js` combinava catálogo sintético, telas, estado, eventos e persistência; `commercial.js` combinava sincronização, comandos, checkout e apresentação financeira/administrativa; `backend.js` misturava transporte, SDK, autenticação, consultas e cache de mídia.

Depois, aplicação, plataforma, dados e apresentação têm módulos próprios. `src/README.md` documenta cada responsabilidade. Há 18 módulos JS/CJS/MJS em `src`, além da documentação. O grafo do bundle principal contém 16 módulos de aplicação, sem ciclos ou violações das dependências verificadas. Demo e exportação PDF são entradas separadas.

O adaptador de interface e seus handlers existentes permanecem em `app.js`; não se afirma que toda a UI legada foi convertida em componentes de um framework. A divisão adicional deve seguir por domínio, com testes que preservem os contratos existentes. Código original e imagens sem obsolescência comprovada foram mantidos.

## 3. Arquivos e módulos

O inventário `implementation-inventory.json` compara os arquivos atuais com o snapshot inicial, distinguindo esta intervenção das mudanças que já existiam. Agrupamento principal:

| Área | Arquivos |
|---|---|
| Aplicação | `src/application/{refresh-queue,snapshot,catalog-images,checkout,session-commands}.js` |
| Plataforma/dados | `src/platform/{http,cart-storage}.js`, `src/data/signed-media.js` |
| Apresentação | `src/presentation/{finance,admin}.js` |
| Integração existente | `app.js`, `src/backend.js`, `src/commercial.js` |
| Demo | `src/demo/catalog.js`, bundle gerado `assets/demo-catalog.js` |
| Build/servidor | `scripts/build.cjs`, `build-output.cjs`, `http-headers.cjs`, `serve.cjs`, `hostinger-config.cjs`, `prepare-hostinger.cjs`, `_headers`, `.gitignore` |
| PWA | `sw.js`, `pwa.js`, `pwa.css`, `offline.html`, `refinements.css` |
| Verificação | novos testes de serviços, isolamento, migrações completas, promoção do build, SW, navegador PWA e carregamento inicial; scripts de auditoria local/remota e arquitetura |
| Documentação | diagnóstico, resultado, implantação/reversão, `src/README.md`, atualização de README e status |

Os bundles do backend e do PDF foram regenerados das fontes; não são uma implementação paralela editada à mão.

## 4. Funcionalidades preservadas e corrigidas

- Mantidos marca, ícones oficiais, tema claro, navegação aprovada e catálogo interno, incluindo o filtro público de Saudável sem apagar os dados internos.
- Mantidos clientes/estabelecimentos, aprovação de loja, produtos/adicionais, endereços, delivery pela própria loja, retirada, mesas/QR, checkout, pedidos, chat, notificações, relatórios e comissões, nos recortes existentes e testados. Não foram acrescentados entregadores próprios, split ou operação financeira inexistente.
- Atualizações são preparadas fora do estado visível e conferem identidade após o último await. Logout invalida dados privados mesmo quando a próxima consulta falha.
- Comandos encadeados verificam a revisão da sessão; um resultado antigo não deve navegar/alterar o estado de uma nova conta. Checkout conserva idempotência em resposta incerta e não limpa carrinho de outra identidade.
- Carrinho tolera armazenamento inválido/indisponível e informa quando só permanece na aba. Antes da autenticação, seleciona apenas o carrinho de visitante. A durabilidade de uma tentativa entre abas fechadas não é prometida quando o navegador recusa armazenamento.
- A home apresenta a estrutura pública com estado de carregamento antes da consulta remota. Controles iniciais aguardam a identidade; falha de catálogo tem mensagem e tentativa explícita. Nenhuma loja demonstrativa é usada como substituta do servidor.

## 5. Segurança

Preços, adicionais, entrega, permissões, estados e comissões continuam sendo decididos no PostgreSQL. Foram preservados RPCs, RLS, grants, restrições, versões e histórico financeiro imutável existentes. Os testes locais verificam isolamento entre contas/lojas, alteração indevida de preços, transições e permissões administrativas.

URLs assinadas usam cache limitado, deduplicação e revisão de sessão; respostas anteriores não repovoam o cache de uma conta posterior. O SW exclui APIs, configuração, query strings sensíveis, respostas privadas/no-store e requisições autenticadas. O próprio precache respeita os headers de privacidade. Uma resposta privada também remove uma cópia pública anterior do mesmo asset.

O modo demo explícito em loopback não inicializa cliente Supabase, mesmo que exista configuração pública principal. Não foram introduzidos segredos no frontend. O pacote final contém fontes e assets, sem `.env`, dados privados, Git, backups ou arquivos antigos compactados.

## 6. Migrações e backups

**Nenhuma migração foi criada ou aplicada remotamente.** As sete migrações permaneceram iguais ao snapshot inicial, incluindo as diferenças que já existiam em relação ao Git. Os arquivos reais 001–007 foram executados com sucesso em PostgreSQL PGlite vazio com dependências de serviços simuladas, além dos testes existentes de permissões e negócios. O esquema resultante também foi comparado aos metadados reais da homologação autenticada, conforme seção 8.

O dump local existente tem 373.517 bytes e SHA-256 `002F7E0B786F18A7BBA9C67E8DEEEC3B05ADFB3B62D2B276928223ABA7F989FB`; índice com 615 entradas e decodificação integral aprovados por `pg_restore`. Também foi restaurado nesta sessão em um cluster PostgreSQL 17.11 novo, exclusivamente em `127.0.0.1`, sem contato com produção. A restauração compatível recuperou **64 tabelas**, com contagens iguais ao COPY do dump e nenhuma tabela da aplicação sem RLS. O servidor foi encerrado ao final. A tentativa integral falhou porque `supabase_vault` não está disponível nessa distribuição Windows; a tentativa compatível excluiu explicitamente as entradas dessa extensão e seus dados (zero linhas de Vault no dump). Uma constraint gerenciada `realtime.messages.messages_payload_exclusive` permanece não validada no dump; isso não foi alterado nem ocultado. O teste usa `--no-owner --no-acl` e não comprova a recuperação das permissões/serviços gerenciados ou dos binários do Storage. Evidência privada: `backups/restore-isolated-2026-10-21T20-52-58-642Z/result.json`.

O snapshot do código inclui configurações locais e fica na pasta privada `backups/modernization-20261021-1792612220855`. O pacote de entrega não contém o dump, o cluster restaurado, credenciais ou dados privados.

## 7. Testes e desempenho

**Suite completa final: 138 testes aprovados, zero falhas, zero pulados; 58,520 segundos.** Evidência: `test-results/modernization-20261021/final-verified-suite.txt`. Os registros de tentativas anteriores foram mantidos, inclusive falhas corrigidas; eles não devem ser confundidos com o resultado final.

- Fluxos demonstrativos: **107 verificações aprovadas**, incluindo cliente, estabelecimento, produtos, adicionais, pedidos, relatórios/navegação e responsividade.
- Telas controladas: larguras de 320 a 1440 px nos recortes cobertos; tema claro, contraste essencial, foco, formulários, layouts e ausência de overflow nos fluxos exercitados.
- PWA em Chrome: instalação técnica do SW, detecção de nova release, preservação de rascunho até atualizar, bloqueio de recarga durante submit, ativação, limpeza dos caches próprios e tela offline explícita. Não equivale a instalação em aparelhos Android/iPhone.
- `pnpm audit`: zero vulnerabilidades conhecidas na consulta realizada. Isso não é garantia de ausência de defeitos.
- Build principal e homologação gerados localmente; saída limpa por estágio, identificador de conteúdo do SW e promoção com restauração da saída anterior em caso de falha de promoção.
- Desempenho: três amostras alternadas por versão, Chrome 390 px, CPU 4x, 1,6 Mbps/150 ms, contextos/cache frios e SW bloqueado. Mediana de LCP **3.872 → 3.096 ms** (aproximadamente 20% menor); CLS **0,00249** em ambas; bytes locais codificados **455.244 → 450.199**. Não é medição de campo, INP ou SLA. A primeira amostra isolada feita junto de outras verificações não foi usada para a comparação.

Durante a conferência, o texto do aviso PWA sofreu regravações entre gravação e teste, chegando a produzir JavaScript inválido. A mensagem passou a usar nós de texto com literais serializados e foi validada pelo texto exato no DOM. O build também passou a recusar scripts públicos com sintaxe inválida antes de alterar saídas. Não foi possível atribuir a origem da interferência a um processo com segurança; o inventário permite conferir o conteúdo entregue.

## 8. Homologação remota desta sessão

Destino exclusivo: `zrczgghucwsaxqnyaapk.supabase.co`.

- **14 verificações reais somente de leitura aprovadas**: catálogo, piloto bloqueado, confirmação de e-mail exigida, contrato de localização/mesas e recusa anônima de perfis, pedidos, mensagens, finanças e administração.
- Navegador real conectado à homologação: catálogo anônimo, normalização de rota protegida, login de identidade inexistente recusado pelo servidor (HTTP 400), mensagem segura, acesso ao formulário de recuperação e mobile/desktop sem erro JavaScript nos recortes exercitados. Nenhum e-mail foi solicitado por esse teste.
- Não há nova evidência positiva de cadastro/login/checkout/upload/Realtime/administração remotos da versão resultante. Relatórios históricos dessas operações foram preservados e não foram apresentados como validação atual.
- A sessão atual do painel permitiu consultar o projeto **NortFood-Homologacao**, referência exata `zrczgghucwsaxqnyaapk`, por SELECT de metadados. Não se reutilizaram segredos de arquivos antigos ou conversas, nem se alteraram schema, ACLs, usuários, piloto ou dados remotos.
- **28 tabelas, 216 colunas, 55 índices, 31 políticas e 279 permissões de coluna conferem** com as migrações do repositório. Todas as tabelas `public`/`private` têm RLS; nenhuma constraint da aplicação está sem validação; nenhum índice está inválido; nenhum gatilho de aplicação está desativado.
- **57 funções da aplicação conferem**, incluindo definição, `SECURITY DEFINER`, configurações e EXECUTE de anon/authenticated: 28 definições idênticas e 29 diferentes apenas por CRLF/LF. Não houve diferença de lógica encontrada por essa comparação textual normalizada.
- As 132 constraints comuns conferem. Os 192 registros adicionais locais são exclusivamente `NOT NULL`: o PGlite usa PostgreSQL 18.3, que passou a representá-los em `pg_constraint`; a homologação usa 17.11. A nulabilidade das 216 colunas confere separadamente. Essa classificação segue a [mudança documentada no PostgreSQL 18](https://www.postgresql.org/docs/18/release-18.html).
- O histórico contém exatamente as sete versões/nomes 001–007 esperados. O bucket `store-media` é privado, limitado a 1 MiB e PNG/JPEG/WebP, igual às migrações. A publicação Realtime contém `dining_tables`, `messages`, `notifications` e `orders`, como previsto; metadados não equivalem a teste de socket.
- Há uma função extra `public.rls_auto_enable()` ligada ao event trigger `ensure_rls`, ativo após CREATE TABLE/CREATE TABLE AS/SELECT INTO. Seu propósito coincide com o [mecanismo de RLS automático documentado pelo Supabase](https://supabase.com/docs/guides/database/postgres/event-triggers). Foi preservada. A implementação remota registra exceções sem abortar o DDL; futuras migrações precisam habilitar e verificar RLS explicitamente, sem depender apenas desse auxílio. Nenhuma tabela atual ficou sem RLS.

Evidências: `remote-schema.json`, `remote-functions.json`, `remote-history.json`, `remote-integrity.json`, `remote-sql-summary.json` e `schema-comparison.json`. As quatro consultas de `supabase/checks/modernization-*-readonly.sql` permitem repetir a coleta. Depois de salvar os valores exportados nos quatro arquivos de entrada, executar `node scripts/compare-homologation-schema.cjs [pasta-das-evidencias]`; o script não abre conexão remota, aplica as migrações em PGlite vazio e classifica as diferenças. Os shims locais de Auth/Storage não representam os serviços gerenciados completos.

## 9. Critérios e pendências

| Critério | Classificação |
|---|---|
| Preservação, snapshot, branch e inventário de reversão | Aprovado localmente |
| Organização dos módulos comerciais e contratos documentados | Aprovado no escopo implementado; UI legada ainda existe |
| Fluxos críticos em testes locais/controlados | Aprovado: 138 testes finais e 107 verificações demonstrativas; recortes acima |
| Esquema, migration history e políticas reais da homologação comparados ao repositório | **Aprovado no escopo dos metadados coletados**; diferenças de versão e gatilho adicional classificadas acima |
| Operações autenticadas remotas independentes na versão resultante | **Pendente** |
| SMTP externo/retornos Auth e operação final | **Pendente** |
| Mobile em navegador emulado | Aprovado nos recortes exercitados |
| Android/iOS e tecnologia assistiva reais | **Pendente** |
| PWA técnico e build local | Aprovado nos recortes exercitados |
| Origem HTTPS operacional e publicação | **Pendente**; gate principal retorna `PUBLIC_HTTPS_URL_PENDING` |
| Restauração dos dados do dump em PostgreSQL local isolado | **Aprovado com limitação explícita**: 64 tabelas, sem Vault/ACLs/owners/serviços |
| Restauração operacional completa, Storage binário e configuração gerenciada | **Pendente** |
| Lançamento comercial/missão integral | **Não aprovado** enquanto esses critérios permanecerem abertos |

O acesso atual ao painel resolveu a comparação de esquema. A sessão administrativa do painel não fornece, por si só, identidades cliente/vendedor/admin autenticadas no aplicativo nem uma caixa externa de e-mail. Para os ensaios positivos restantes, são necessários acessos de teste atuais por mecanismo protegido, destino externo de e-mail autorizado e a definição da origem operacional pelo titular. Credenciais nunca devem ser enviadas no chat. Ensaio autenticado, validação da origem final, SMTP, recuperação operacional e aceite comercial completam o trabalho antes de pedir autorização para produção.

## 10. Implantação e reversão

O procedimento detalhado está em `docs/MODERNIZACAO_IMPLANTACAO_REVERSAO.md`. Usar `pnpm dev` e `http://localhost:4174` para o ambiente isolado; os builds não publicam automaticamente. Nunca publicar a pasta original.

Para reversão, comparar o inventário com o snapshot privado e restaurar somente os arquivos desta intervenção, preservando alterações posteriores. Trocar a branch não desfaz alterações locais. Não executar reset/clean destrutivo nem restaurar banco para voltar o frontend. Uma publicação futura deve manter artefato anterior, hashes, proteção de acesso e um identificador de SW que permita a atualização.
