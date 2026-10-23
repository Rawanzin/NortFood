**Homologacao atualizada em 19/10/2026:** upload-media implantada, historico 001-007 conciliado sem reaplicacao e restauracao isolada realizada com limitacao do Vault. Resultado: **PARCIAL / NO-GO para beta publico**, pendentes dominio HTTPS, SMTP e fluxos autenticados reais. Consulte o [relatorio atual](BETA_20261019.md). As afirmacoes anteriores abaixo sao historicas.

# Resultado da configuração — 19/10/2026

## Resultado confirmado

**Backup validado e migrações 002–007 aplicadas no Supabase remoto.** A 001 não foi modificada nem reaplicada nesta execução. O piloto permanece desabilitado. Nenhum registro existente foi excluído; a transação comparou as contagens de todas as 26 tabelas anteriores de `public`/`private`, mantendo locks de escrita até o commit.

## Backup

- Arquivo: `backups/NortFood-backup-20261019-104439-345-518a4338.dump`.
- Tamanho: **373.517 bytes**; formato custom PostgreSQL, clientes/servidor 17.11.
- SHA-256: `002F7E0B786F18A7BBA9C67E8DEEEC3B05ADFB3B62D2B276928223ABA7F989FB`.
- `pg_dump`, `pg_restore --list` e leitura integral para `NUL`: código zero. As 64 tabelas e respectivas entradas de dados foram conferidas com o inventário remoto.
- Status `VALIDADO_COM_AVISOS`: houve falha local no cmdlet de hash depois de exportar; a cópia foi revalidada independentemente. Eventuais avisos da exportação anterior não tinham sido persistidos; o manifesto conserva essa limitação. Revalidação sem erros.
- Sem restauração de ensaio: instalação local sem `share/postgres.bki`. Leitura integral não substitui restauração isolada. Não inclui binários do Storage, configurações Auth/SMTP/OAuth, segredos de funções nem senhas globais. ACLs/proprietários foram omitidos do dump; inventário separado preserva metadados para reconciliação num destino compatível.

Pasta restrita por ACL e ignorada pelo Git. Nenhuma senha foi gravada ou exibida pelo script.

## Causa das falhas e correções

O erro "Conexão não confirmou o banco postgres em modo somente leitura" era produzido pelo script **após autenticação aceita**, não pelo PostgreSQL. No teste real pelo Session Pooler, a sessão iniciou com `transaction_read_only=off` e `default_transaction_read_only=off`, apesar de `PGOPTIONS`. A transação explícita `BEGIN READ ONLY` confirmou `on`. O script agora registra ambos os estados e protege as consultas no SQL, separando falhas de banco, papel, autenticação e modo de leitura.

Uma execução separada seguinte retornou realmente `FATAL: password authentication failed`. Não foi tratada como se fosse o mesmo erro. O teste diferencial pelo host direto canônico do mesmo projeto funcionou e permitiu exportar. Não há evidência suficiente para atribuir a rejeição intermitente a entrada diferente ou cache do pooler; não houve redefinição automática de senha nem repetição infinita.

O cálculo de hash passou a usar .NET em vez de depender do carregamento de `Get-FileHash`. O transporte permanece por pipe privado UTF-8, sem URI com senha, arquivo de senha ou segredo nos argumentos. SSL obrigatório em ambos os caminhos. `pg_stat_ssl=false` pelo pooler descrevia seu trecho de backend, não o TLS exigido do cliente.

## Aplicação real das migrações

O inventário autenticado anterior mostrou zero RPCs `nf_*`, ausência das colunas de localização e do bucket, consistente com apenas a fundação. O executor confirmou papel e banco `postgres`. A transação também exigiu RLS/proprietários esperados, publicação vazia e ausência de estruturas conflitantes. Qualquer divergência abortaria o lote.

Ordem efetivamente aplicada, em **uma transação com commit confirmado e código zero**, sem avisos SQL:

1. `202610120002_operations.sql`
2. `202610120003_storage_realtime.sql`
3. `202610120004_reporting.sql`
4. `202610150005_store_location.sql`
5. `202610170006_qr_tables.sql`
6. `202610190007_media_upload_limits.sql`

As transações externas dos arquivos foram agrupadas somente no lote gerado; os arquivos originais não foram reescritos para isso. O manifesto protegido `backups/NortFood-deployment-20261019-105130-154.json` registra resultados, hashes e lista revisada dos seis arquivos; o SQL aplicado está ao lado dele.

**Não reaplicar 001–007.** Não havia tabela de histórico `supabase_migrations.schema_migrations`; a aplicação foi SQL controlada, registrada no manifesto local, sem inventar um histórico da CLI. Antes de adotar `supabase db push`, conciliar os registros com os hashes e evidências desta execução. O executor novo recusa reaplicação ou estado inesperado; não é um mecanismo automático para migrações futuras arbitrárias.

## Segurança e API após commit

- 38 RPCs `nf_*` presentes.
- Zero tabelas de aplicação sem RLS.
- `status_reason` sem leitura direta por `anon`/`authenticated`; `admin_users` sem CRUD desses papéis.
- Bucket `store-media` privado; escrita direta de clientes continua bloqueada.
- Publicação Realtime restrita a `orders`, `messages`, `notifications`, `dining_tables`.
- Histórico com assinatura única; quota executável apenas por `service_role`.
- Catálogo e estado operacional: HTTP 200. Coordenadas e opção de mesas: consulta pública autorizada, HTTP 200 com limite zero.
- Motivo administrativo, histórico anônimo e quota anônima: HTTP 401 / `42501`, como esperado sem autenticação.
- Tentativa de selecionar esquema `private` pela API: HTTP 406 / `PGRST106`; esquema não exposto.
- Auth settings: HTTP 200, login por e-mail habilitado. Isso não equivale a teste de login/SMTP.
- Piloto continua `false`; nenhuma autorização operacional foi criada automaticamente.

O diagnóstico inicial de caminhos de funções contou um helper preexistente `public.rls_auto_enable()`, proprietário `postgres`, com `search_path=pg_catalog`. Isso é caminho confiável, não exposição: o indicador de "não vazio" era excessivamente amplo. O helper foi identificado no inventário anterior e preservado; o manifesto registra a interpretação. O verificador futuro distingue caminho vazio de catálogo confiável e exige caminho vazio nas funções da aplicação.

## Efeitos de dados e regras preservadas

Nenhum `DROP TABLE`, `TRUNCATE` executado, limpeza ou atualização histórica foi feito. A 006 substitui dois CHECKs por versões ampliadas para atendimento por mesa; a operação não remove pedidos. A 003 acrescenta o bucket, políticas, triggers de imutabilidade e publicação. A 005 acrescenta coordenadas nulas, sem posições fictícias. A 006 acrescenta tabelas/campos e mantém atendimento por mesa desabilitado por padrão. A 007 acrescenta reservas privadas de upload. RPCs de exclusão de endereço e substituição de categorias não foram chamadas durante o deploy.

Comissão continua exclusivamente na conclusão positiva, uma cobrança por pedido, com vencimento no mesmo `completed_at + interval '7 days'`; entrega excluída da base e ajustes/quitações sem reiniciar prazo. Cursor composto, snapshots de retirada e isolamento por usuário/loja foram preservados. `owner` e `staff` mantêm os poderes de membro já existentes; diferenciação de cargos continua decisão de negócio pendente, sem poderes administrativos de plataforma.

## Arquivos desta etapa

- `scripts/Backup-NortFood.ps1`: leitura explícita, diagnóstico, teste isolado, hash sem autoload e avisos persistidos.
- `tests/backup.unit.ps1`: dez cenários controlados, além da reexecução sem sobrescrita.
- `scripts/prepare-supabase-deployment.cjs`: lote transacional, pré-condições, locks, preservação de contagens e verificações de segurança.
- `scripts/Deploy-NortFoodSupabase.ps1`: exige backup validado/hash/projeto/recência, única entrada protegida, teste, aplicação e conferência.
- `tests/deployment.test.cjs`: aplicação, recusa de repetição e rollback integral em falha.
- `package.json`: inclui regressões do executor na suíte principal.
- Documentação e relatórios atualizados. As alterações de URL, upload e 007 da auditoria anterior são descritas em `CONFIGURACAO_SUPABASE_20261019.md`.

## Testes e limites

**61/61 testes locais aprovados**, incluindo banco PostgreSQL embarcado PGlite, segurança, financeiro, localização, QR/mesas, upload e executor. Os dois testes do lote foram repetidos depois de reforçar a verificação de `search_path` e passaram. Dez cenários PowerShell controlados, quatro testes com clientes PostgreSQL reais e senhas fictícias, análise de sintaxe e build aprovados. Fluxo demonstrativo: 107 verificações da etapa anterior. Deno/WASM e TypeScript aprovados na etapa de upload.

Teste de navegador contra o servidor local com configuração comercial real: Chrome em 390 e 1365 pixels, sem erros JavaScript nem overflow horizontal. Tela exibiu piloto bloqueado e catálogo real vazio, sem lojas fictícias. A primeira tentativa usou Chromium headless não instalado; o ensaio foi repetido com Chrome instalado e passou.

PGlite não inicia Auth/Storage/Realtime gerenciados. Não foram criados usuários, lojas, mensagens ou pedidos falsos em produção para testes. Login com confirmação de e-mail, recebimento Realtime entre sessões, upload real e checkout completo ainda exigem homologação com contas apropriadas. Não há evidência de operação comercial completa.

## Pendências concretas

`GET /functions/v1/upload-media` retornou **404 / NOT_FOUND**: a função não está implantada. O bucket privado e sua RPC de quota estão prontos no banco, mas upload ainda depende de deploy da função com WASM, configuração de `APP_ORIGIN`/segredos exclusivamente no servidor e teste de upload/leitura assinada. Não abrir o bucket ou escrita direta para contornar isso.

Também faltam domínio/HTTPS de publicação, URLs de retorno e SMTP conferidos no painel, provisionamento administrativo autorizado, contas reais de homologação e teste dos fluxos completos. Não foi obtida sessão autenticada da API de gerenciamento para implantar funções ou alterar essas configurações. Nenhum segredo foi solicitado pelo chat.

**Vereditos:** backup legível e validado com limites documentados; migrações 002–007 aplicadas e conferidas; integração pública do aplicativo funcionando; upload e fluxos autenticados completos ainda pendentes; marketplace permanece **NO-GO para operação real** até homologação e pendências operacionais. Não confundir DDL aplicado com produto pronto para produção.
