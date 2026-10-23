**Homologacao atualizada em 19/10/2026:** upload-media implantada, historico 001-007 conciliado sem reaplicacao e restauracao isolada realizada com limitacao do Vault. Resultado: **PARCIAL / NO-GO para beta publico**, pendentes dominio HTTPS, SMTP e fluxos autenticados reais. Consulte o [relatorio atual](BETA_20261019.md). As afirmacoes anteriores abaixo sao historicas.

# Backup PostgreSQL do NortFood — 18/10/2026

## Correção de diagnóstico — 19/10/2026

A mensagem antiga "Conexão não confirmou o banco postgres em modo somente leitura" era lançada pelo script depois de `psql` terminar com código zero e retornar JSON. Portanto, essa mensagem não era um erro de autenticação do PostgreSQL. O relatório antigo não guardava os campos retornados antes da validação, impedindo distinguir com certeza banco inesperado de `transaction_read_only=off`.

Agora o script registra `session_probe` (banco, papel e flags iniciais) e `connection` antes de validar. Cada consulta de validação/inventário usa `BEGIN READ ONLY`, timeout local e `ROLLBACK`; não depende apenas do encaminhamento de `PGOPTIONS` pelo pooler. Mantém SSL obrigatório, parâmetros explícitos e preservação da mensagem original do PostgreSQL em caso de erro. `pg_dump` também define sua própria transação `REPEATABLE READ, READ ONLY`, conforme o [código oficial da versão 17](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/bin/pg_dump/pg_dump.c).

O parâmetro opcional `-ConnectionTestOnly` testa autenticação, banco, papel, versão e transação somente leitura e encerra **antes de inventário e backup**. Não altera dados ou configurações persistentes. O diagnóstico registra separadamente o estado inicial e a transação explícita; um default `off` não equivale a uma transação de leitura desprotegida.

Testes controlados cobrem sucesso com flags iniciais `off`, falha de autenticação, erro SQL original preservado, banco incorreto, recusa de transação sem READ ONLY, teste sem dump, falha do dump, arquivo vazio, índice ilegível e arquivo corrompido. Eles não substituem o teste no projeto real com entrada segura da senha.

**Resultado real em 19/10:** teste protegido no Session Pooler confirmou autenticação, papel `postgres`, banco `postgres` e servidor 17.11. A sondagem inicial retornou `session_read_only=off` e `default_read_only=off`, apesar de `PGOPTIONS`. A transação explícita retornou `read_only=on`; o teste encerrou com `CONEXAO_VALIDADA`, sem dump. Portanto, a falha antiga era a premissa do script sobre a propagação do parâmetro de startup, não rejeição da senha. `sslmode=require` exige TLS entre cliente e pooler; `pg_stat_ssl=false` descreve a conexão separada do pooler com o backend, não ausência de TLS no cliente.

## Executar novamente

Na pasta do projeto, execute **um comando** no PowerShell do Windows:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Backup-NortFood.ps1
```

`Bypass` vale somente para esse processo; o script não altera a política do Windows. Na primeira execução, informe Host e User **exatamente** como aparecem no Supabase → Connect → Session pooler. A porta é 5432, banco `postgres`; o usuário deve incluir o identificador do projeto. Depois da primeira execução bem-sucedida, apenas Host/User são lembrados em `backups/connection.json`. Não é uma configuração do aplicativo.

A senha **do banco** é solicitada por `Read-Host -AsSecureString`. Não informe senha no chat, URI, argumentos de linha de comando ou arquivos `.env`. A senha não é salva: fica temporariamente em memória e é enviada ao prompt nativo por pipe privado UTF-8, sem `PGPASSWORD`. O ambiente do terminal pai não é alterado. Outros processos privilegiados da máquina continuam podendo inspecionar memória. Se uma senha foi publicada ou colada em comandos anteriormente, providencie sua rotação pelo responsável; esta automação não troca senhas.

## O que a automação faz

1. Confere `psql.exe`, `pg_dump.exe` e `pg_restore.exe` em `C:\Program Files\PostgreSQL\17\bin`.
2. Restringe a pasta `backups` ao usuário atual, administradores locais e SYSTEM. Interrompe se não puder aplicar a proteção. Toda a pasta é ignorada pelo Git.
3. Limpa variáveis `PG*` herdadas **nos processos filhos** e configura Host/User oficiais, 5432, `postgres`, `sslmode=require`, timeout e modo transacional somente leitura.
4. Consulta identidade, versão, banco, modo de leitura e inventário. Bloqueia servidor de versão principal superior à do `pg_dump` e projeto sem schemas `public`/`private`.
5. Executa `pg_dump --format=custom --no-owner --no-acl`, sem filtros de schema, com limite de espera por bloqueio. Não usa `--enable-row-security`: falta de acesso deve falhar em vez de exportar silenciosamente apenas linhas visíveis por RLS.
6. Mantém o resultado como `.dump.partial` até confirmar saída zero, tamanho, `pg_restore --list`, presença de tabelas/dados esperados e leitura/descompressão integral via `pg_restore --file=NUL`. Esta última operação gera SQL para o dispositivo nulo, **sem executá-lo e sem conectar para restaurar**.
7. Somente então promove o arquivo para `.dump`, calcula SHA-256 e grava os relatórios. Nomes incluem milissegundos e identificador aleatório; arquivos anteriores não são sobrescritos.

Uma falha não provoca repetição com os mesmos parâmetros. Arquivos parciais ficam protegidos para diagnóstico e nunca devem ser tratados como backup válido. O JSON da tentativa agora é criado **antes de solicitar a senha**, registrando etapa, Host/User/porta, SSL e o erro sanitizado, inclusive quando a autenticação falha. Não registra a senha nem a linha de comando completa. Falhas de dependência ou proteção da pasta, anteriores à criação desse relatório, aparecem na janela. Erros de permissão não são contornados mudando RLS, concedendo privilégios ou excluindo schemas silenciosamente.

O Host, a porta, o User completo e o banco também são enviados como argumentos explícitos ao `psql` e `pg_dump`. A senha segue pelo stdin privado UTF-8, em sua forma original, sem URL-encoding. Nos binários PostgreSQL 17.11 desta instalação, `PGPASSWORD` sofre conversão ANSI para caracteres não ASCII; a primeira bateria de mocks .NET não detectou esse defeito. O transporte foi substituído e conferido com os dois executáveis nativos reais, verificando os bytes do protocolo com senhas inteiramente fictícias em loopback.

O prompt nativo do PostgreSQL/Windows normalmente abre `CONIN$` mesmo com stdin redirecionado. O modo de compatibilidade `OSTYPE=msys`, já previsto no código oficial, faz esse prompt usar stdin/stderr. Ele é definido somente no processo filho, junto com mensagens em locale C para remover apenas o prompt do diagnóstico; a senha continua UTF-8. O script não grava `pgpass.conf`, não muda code pages do Windows e não usa a linha de comando para transportar senha. [Implementação oficial do prompt](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/common/sprompt.c).

O padrão continua Session Pooler. O modo explícito `Direct` exige Host canônico `db.<project-ref>.supabase.co`, papel `postgres`, porta 5432 e `ExpectedProjectRef` correspondente. Ele permite diagnóstico diferencial de autenticação e backup pela conexão direta, quando disponível, sem trocar o projeto nem criar roles. Não há fallback ou repetição automática escondida; cada tentativa gera seu relatório.

## Conteúdo e limites

O escopo padrão é **um banco PostgreSQL inteiro**, sem `--schema` ou exclusões: objetos não sistêmicos exportáveis pelo executor, tabelas e dados de `public`, `private` e demais schemas existentes, funções, índices, constraints, sequências, triggers, políticas e definições de RLS. O inventário e o índice ao lado do arquivo registram o conteúdo efetivamente encontrado. Objetos internos de extensões podem ser representados pela extensão, e não como tabelas individuais; isso segue o comportamento do `pg_dump`.

Se `auth` e `storage` aparecerem no índice, seus dados/objetos SQL foram exportados, **não os serviços**. Um dump não inclui os binários de imagens/arquivos dos buckets, configurações do painel/Auth/SMTP/OAuth, segredos/chaves externos, código implantado de Edge Functions, certificados ou infraestrutura. Exportação dos arquivos do Storage e inventário dessas configurações exigem procedimento separado. Não confunda metadados de `storage.objects` com os próprios arquivos. Não há cópia contínua, PITR, agendamento ou cópia externa nesta entrega.

O formato custom é comprimido, **não criptografado**. Pode conter dados pessoais, hashes de autenticação e outros registros sensíveis do banco. Não envie os arquivos ou os inventários ao GitHub; mantenha uma cópia externa protegida/criptografada sob controle do responsável.

Roles globais e senhas de roles não são exportadas por `pg_dump`. ACLs são omitidas por `--no-acl`; o inventário guarda os ACLs de relações e funções em `public`/`private` para conferência, mas não é um script completo de restauração de permissões. As permissões necessárias devem ser reconciliadas com as migrações revisadas antes de expor um banco restaurado. **Não exponha a Data API imediatamente após restaurar sem ACLs**: especialmente funções `SECURITY DEFINER` precisam de `REVOKE`/`GRANT` explícitos. Políticas/RLS no arquivo não substituem essa conferência. `--no-owner` precisa ser informado novamente ao `pg_restore`, pois, para arquivos custom, a supressão de proprietários é aplicada na restauração.

`sslmode=require` exige TLS entre o cliente e o pooler. `pg_stat_ssl` descreve a conexão do backend PostgreSQL com o pooler e não é prova do TLS do primeiro trecho. Validação da identidade por CA/hostname (`verify-full`) exige o certificado oficial apropriado e não é afirmada por este script.

## Restauração futura — não executa no banco principal

Primeiro verifique o SHA-256 contra o relatório e leia o índice. Prepare **outro projeto Supabase isolado e compatível**, ou um PostgreSQL local novo com as extensões, roles e dependências de serviços necessárias. Dumps com Auth/Storage/Realtime gerenciados não têm portabilidade automática para uma instalação PostgreSQL comum. Revise também assinaturas de funções, ownership, configurações de execução, triggers, publicações e permissões antes de restaurar. Não reaplique migrações inteiras sobre objetos já restaurados.

Exemplo de revisão offline (não conecta a banco):

```powershell
& 'C:\Program Files\PostgreSQL\17\bin\pg_restore.exe' --list 'CAMINHO_DO_ARQUIVO.dump'
```

Depois de preparar e confirmar um destino **novo, isolado**, o operador pode usar `pg_restore --no-owner --no-acl --exit-on-error --single-transaction`, informando a conexão do **destino** e senha por entrada segura. Não fornecemos comando apontando para produção. Não usar `--clean`, `DROP`, `TRUNCATE`, `db reset` ou restauração no banco principal. Reconciliar ACLs e roles, testar contagens, vínculos, RLS, RPCs, Auth e Storage antes de permitir acesso. Validação por índice e leitura integral demonstra legibilidade do arquivo; **não prova restauração funcional**.

## Verificações locais desta entrega

- Clientes nativos `psql`, `pg_dump`, `pg_restore`: **17.11**, executados com sucesso.
- Testes controlados de processo em Windows PowerShell 5.1: sucesso, repetição sem sobrescrita, autenticação inválida, falha do dump, arquivo vazio, índice inválido e erro de descompressão. Também verificam pipe privado sem senha em variável de ambiente, User completo, argumentos explícitos, SSL obrigatório apesar de variáveis herdadas hostis e relatório persistente na falha inicial. Usam executáveis falsos explícitos, não atestam conexão ou dump reais.
- `node --test tests/backup.native.cjs`: quatro testes com `psql.exe`/`pg_dump.exe` reais e servidor mínimo de protocolo em loopback, sempre com senhas fictícias. Os bytes ASCII e Unicode enviados correspondem exatamente ao valor UTF-8 original. Isso valida transporte da credencial, não login ou SQL de um PostgreSQL real.
- `tests/backup.integration.ps1` prepara somente um cluster local novo em TEMP e uma restauração isolada quando a instalação está completa. Neste computador, `share/postgres.bki` não existe: **restauração real local não executada**. Nenhum servidor/Docker foi instalado para contornar isso.
- Resultado da execução de produção: consultar o relatório datado desta etapa e o JSON protegido em `backups`, depois que a senha for informada na janela segura.

Fontes: [pg_dump 17](https://www.postgresql.org/docs/17/app-pgdump.html), [pg_restore 17](https://www.postgresql.org/docs/17/app-pgrestore.html), [conexões Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres), [limites dos backups Supabase](https://supabase.com/docs/guides/platform/backups).
