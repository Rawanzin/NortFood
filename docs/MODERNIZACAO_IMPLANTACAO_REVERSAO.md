# Implantação e reversão da modernização

## Situação da entrega

As alterações estão no projeto existente, na branch `codex/modernizacao-arquitetural-20261021`, com as alterações anteriores preservadas. Não houve commit/push, publicação, migração remota, mudança em RLS/Auth/Storage ou habilitação de pedidos. Os builds são candidatos locais.

## Preparação reproduzível

1. Usar Node 24 e o pnpm declarado no `package.json`. Executar `pnpm install --frozen-lockfile` quando necessário.
2. Manter `.env` e `.env.homologacao` separados e fora do Git. Somente URL e chave publishable/anon podem ir para o frontend. Credenciais administrativas continuam exclusivamente no servidor/mecanismo protegido.
3. Para uso local autorizado: `pnpm dev`; abrir `http://localhost:4174`. Para demo independente: adicionar `?demo=1` somente em loopback. Não executar fixtures no principal.
4. Verificar `pnpm test`, `pnpm test:demo`, `pnpm check:architecture` e `pnpm audit`. Os testes controlados/PGlite não equivalem a homologação remota positiva.
5. Gerar `pnpm build:homologation`. Confirmar em `dist-homologacao/config.js` o destino isolado e a ausência de segredos, sem copiar a configuração principal para a prévia.
6. `pnpm build` gera `dist/` a partir da configuração principal. Isso não publica nada. `pnpm check:release-config` continua obrigatório: uma origem localhost não aprova lançamento.

## Antes de publicar

Publicação e alterações em produção exigem autorização explícita do proprietário. A comparação do esquema/histórico/RLS reais foi realizada pela sessão atual do painel, com diferenças classificadas no relatório. Continuam necessários: testes autenticados independentes da versão resultante com acessos de teste atuais por mecanismo protegido; comprovar e-mail transacional externo; validar upload/Realtime/concorrência no ambiente final; origem HTTPS operacional e aceite comercial/operacional; Android/iOS e tecnologia assistiva reais; restauração operacional completa, incluindo binários de Storage e configurações gerenciadas.

Os SQLs `supabase/checks/modernization-*-readonly.sql` coletam somente metadados. Confirmar o projeto `zrczgghucwsaxqnyaapk` antes da execução. Salvar os valores das exportações JSON como `remote-schema.json`, `remote-functions.json`, `remote-history.json` e `remote-integrity.json`. A primeira consulta retorna JSON em `jsonb_pretty`; as outras retornam, respectivamente, `functions`, `history` e `integrity`. Executar `node scripts/compare-homologation-schema.cjs [pasta-das-evidencias]` para a comparação offline com PGlite novo. Não usar repair/reset/db push nem reaplicar 001–007 no servidor para descobrir o estado remoto. Nenhuma migração nova foi necessária para as correções locais desta entrega.

Publicar somente a saída aprovada do build, preservando os headers corretos. Nunca enviar a pasta original, `.git`, `.env`, `backups`, `test-results`, `node_modules` ou ZIPs históricos para o document root. O pacote Hostinger permanece uma preparação offline; ele não comprova plano, configuração de Apache/Nginx, SSL ou proteção da hospedagem.

## PWA e atualização

O build emite `release.json` e usa um identificador do conteúdo no nome do cache do SW. O navegador busca versões novas dos assets e oferece **Atualizar / Depois**; não força recarga sobre uma operação em andamento. Configuration e respostas privadas/no-store nunca devem ser armazenadas. Em uma hospedagem privada que aplica `Cache-Control: private` a todos os arquivos, o SW respeita essa regra; a página offline poderá não estar disponível e a resposta será 503 com instrução de reconexão.

Quando uma versão nova for autorizada, verificar no navegador: atualização encontrada, formulário preservado até o usuário atualizar, nova versão ativa, remoção somente dos caches antigos do NortFood, configuração sempre pela rede e comportamento offline sem promessa de pedido. HTTPS local em navegador não comprova instalação física Android/iOS.

## Reversão local

1. Suspender a edição dos arquivos afetados. Comparar alterações posteriores com o manifesto antes de copiar qualquer arquivo.
2. O snapshot confiável desta intervenção é `backups/modernization-20261021-1792612220855/source`, acompanhado por `manifest.json`, `git-status.txt` e `git-diff.patch`. Conferir SHA-256 dos arquivos a recuperar. A pasta inclui `.env` e é privada.
3. Restaurar apenas os arquivos modificados por esta intervenção, após revisar o inventário no relatório. Arquivos novos não substituem arquivos anteriores; removê-los somente depois de conferir que não receberam trabalho posterior. Não usar `git reset --hard`, `git clean` ou uma cópia antiga de outra pasta.
4. Trocar de branch, sozinho, não desfaz as alterações locais. A branch anterior era `codex/commercial-mvp-20261012`; o HEAD inicial era `17d7f8be02c88cd7ad20c3dbe308675c1a59c0a2`.
5. Regenerar os bundles e o pacote a partir das fontes selecionadas; testar os fluxos afetados antes de usar a cópia recuperada. Uma publicação futura deve usar um novo identificador de release para o SW, mesmo quando as fontes voltarem a uma versão anterior.

## Reversão de publicação futura

Guardar o artefato imutável e os hashes da versão aprovada antes de publicar outra. Caso seja necessário voltar, republicar o artefato anterior pelo mecanismo do provedor, mantendo a origem e as proteções de acesso, e conferir a atualização do SW. Não restaurar banco para reverter frontend. Esta intervenção não alterou esquema ou dados remotos e não requer rollback de banco.

O dump existente passou em índice, decodificação integral e ensaio desta sessão com 64 tabelas/contagens conferidas em PostgreSQL 17.11 local novo. A tentativa integral encontrou indisponibilidade de `supabase_vault`; a restauração compatível excluiu explicitamente essa extensão. Owners/ACLs não foram restaurados pelo ensaio e uma constraint gerenciada de Realtime permanece não validada no dump. Consultar as limitações no relatório antes de usar esse resultado. Isso não substitui backup atual, recuperação de arquivos Storage ou configurações Auth/SMTP/OAuth/Edge Functions. Repetir, quando necessário, com `node scripts/restore-backup-isolated.cjs [manifesto-json-do-backup-validado]`, que gera outro cluster exclusivamente local e o encerra ao final. Nunca apontar esse procedimento para um banco remoto. Não expor um destino restaurado antes de conferir ACLs, RLS, funções e serviços gerenciados.
