# Diagnóstico anterior à refatoração — 21/10/2026

## Estado protegido

- Checkout existente: `C:\Users\keven\Documents\NortFood`; HEAD `17d7f8be02c88cd7ad20c3dbe308675c1a59c0a2`.
- Branch anterior: `codex/commercial-mvp-20261012`. Branch deste trabalho: `codex/modernizacao-arquitetural-20261021`.
- O checkout já continha dezenas de alterações e arquivos novos. Nenhum deles foi descartado, commitado como se fosse novo ou substituído por uma cópia antiga.
- Snapshot privado: `backups/modernization-20261021-1792612220855`, 237 arquivos, 52.184.843 bytes, cópias comparadas por SHA-256, manifesto, diff binário e status Git. Inclui `.env`; não publicar essa pasta. A primeira tentativa incompleta de snapshot foi preservada e não deve ser usada.
- `.env`: projeto principal `zwkhqahivthzivmuirjr`; `.env.homologacao`: projeto isolado `zrczgghucwsaxqnyaapk`. Somente chaves públicas configuradas; não foi encontrado acesso privilegiado autorizado nesta sessão. A origem principal configurada é localhost, não uma publicação operacional.
- Dump local existente: 373.517 bytes, SHA-256 `002F7E0B786F18A7BBA9C67E8DEEEC3B05ADFB3B62D2B276928223ABA7F989FB`; `pg_restore --list` (615 entradas) e decodificação integral para NUL aprovados. Não se conectou a banco nem restaurou dados. Isso não atesta atualidade, completude operacional ou restauração funcional. Storage binário e configuração gerenciada têm procedimento separado.

## Inventário e arquitetura encontrada

HTML/CSS/JavaScript com esbuild; SDK Supabase 2.117.3; PostgreSQL/RLS/RPCs; Edge Function TypeScript de upload; QRCode e PDF carregados conforme uso. `app.js` tem 168.135 bytes e reúne renderização, navegação, handlers, demonstração, armazenamento e adaptação comercial. `src/commercial.js` tem 31.126 bytes e mistura sincronização, comandos, checkout e HTML administrativo/financeiro. `src/backend.js` reúne SDK, autenticação, erros, transporte, dados, imagens e Realtime. CSS claro distribuído entre `styles.css`, `refinements.css` e PWA; assets originais e otimizados coexistem. Não há prova de obsolescência dos originais: preservá-los.

Foram inventariados código, ferramentas de build/servidor, 7 migrações, configuração Supabase, validação de mídia, PWA e suites existentes. As migrações 001–004 já estavam modificadas em relação ao Git antes desta sessão. Não reaplicar, reescrever ou inventar equivalência com o servidor. O fixture PGlite da fundação é declarativo e não representa inspeção de um Supabase real.

O banco já calcula preços, adicionais, entrega e comissões no servidor; usa idempotência, versões, bloqueios e histórico financeiro imutável. As políticas verificam identidade/membership e os RPCs têm search_path fixo e grants explícitos. Upload autentica, confere membership, limita volume, decodifica e regrava imagens em bucket privado. Manter e testar esses contratos, sem trocar por validações do navegador.

## Achados verificáveis

| Prioridade | Achado e evidência | Tratamento previsto |
|---|---|---|
| Alta | SW tem versão fixa `nortfood-public-v1`, cache-first para qualquer extensão JS/JSON/HTML; `/config.js` também é elegível; atualização é percebida apenas se já há worker esperando na inicialização | Restringir cache a assets declarados, excluir configuração/privados, atualizar assets pela rede, versionar por conteúdo e oferecer atualização sem perder formulário |
| Alta | Sincronização publica `context` antes de conferir revisão; altera dados e faz awaits adicionais de detalhe/admin/imagens antes de finalizar; não descarta resultado se identidade muda durante esses awaits | Preparar projeção isolada, conferir revisão antes de commit e invalidar estado privado na troca de sessão |
| Alta | Checkout faz JSON.parse/setItem/removeItem sem tratamento; limpeza após resposta do pedido não confere identidade que iniciou a operação | Serviço próprio, idempotência validada, tolerância a storage indisponível e guarda por identidade/revisão |
| Média | Recuperação de senha falhou na suite inicial (`tests/auth-ui.test.cjs`, espera do password-form) | Reproduzir e tratar a causa; não declarar fluxo aprovado apenas por testes unitários |
| Média | Categorias, catálogo, snapshot e estado operacional são buscados em sequência; URLs assinadas são resolvidas em loops sequenciais | Leituras independentes concorrentes e limite explícito para resolver imagens, sem cache de dados privados |
| Média | Build escreve diretamente nos bundles da raiz e copia para saída reutilizada | Gerar em diretório temporário e promover saída completa; impedir arquivos antigos/privados no pacote |
| Média | Muitas verificações de PWA são regex do código, sem exercício de cache/atualização | Testes comportamentais do worker e navegador com instalação/atualização/offline |
| Pendente | Falta acesso atual a pg_catalog/ACLs/migration history da homologação; `.env.homologacao` contém apenas URL/chave pública | Inspeção remota anônima possível; não equivale a auditoria integral do esquema/RLS nem teste com identidades independentes |

## Evidências anteriores às alterações estruturais

- `test-results/modernization-20261021/baseline-tests.txt`: 112 testes, 111 passaram, 1 falhou; 60,936 segundos. Inclui banco descartável PGlite, transporte controlado e navegador local. Não é homologação remota.
- `test-results/modernization-20261021/dependency-audit.json`: pnpm audit, 121 dependências inventariadas, zero vulnerabilidades conhecidas. Isso não garante ausência de defeitos.
- `test-results/modernization-20261021/backup-index.txt`: índice local do dump; dados potencialmente privados, não publicar.

## Decisão arquitetural e limites

Manter HTML/CSS/ES modules, SDK e esbuild. Uma migração total de framework/TypeScript deslocaria os contratos de UI, testes e publicação sem resolver as falhas demonstradas. Separar módulos de aplicação, infraestrutura e apresentação com dependências explícitas, documentação de contratos e testes de comportamento. TypeScript já permanece na Edge Function; a decisão poderá ser reavaliada por módulo, sem conversão automática do legado.

Preservar catálogo/categorias internas, tema claro, branding, navegação aprovada, dois tipos de conta, entrega pela loja, QR/mesas, relatórios, chat, pedidos e comissões. Não acrescentar estoque, entregadores próprios ou pagamentos/split que não existem. Manter Google e piloto indisponíveis quando o servidor assim informar. Não publicar nem mudar produção.

Reversão: conferir manifesto e restaurar somente os arquivos desta intervenção a partir do snapshot, após comparar alterações posteriores. Retornar à branch anterior não desfaz mudanças locais automaticamente. Nenhuma migração remota será aplicada; não há rollback de dados a executar nesta etapa. Build/preview local não autoriza lançamento.
