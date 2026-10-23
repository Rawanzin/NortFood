**Homologacao atualizada em 19/10/2026:** upload-media implantada, historico 001-007 conciliado sem reaplicacao e restauracao isolada realizada com limitacao do Vault. Resultado: **PARCIAL / NO-GO para beta publico**, pendentes dominio HTTPS, SMTP e fluxos autenticados reais. Consulte o [relatorio atual](BETA_20261019.md). As afirmacoes anteriores abaixo sao historicas.

# Resultado da preparação do backup — 18/10/2026

## Backup validado — 19/10/2026

**Status: VALIDADO_COM_AVISOS.** Arquivo: `backups/NortFood-backup-20261019-104439-345-518a4338.dump`, **373.517 bytes**. SHA-256: `002F7E0B786F18A7BBA9C67E8DEEEC3B05ADFB3B62D2B276928223ABA7F989FB`.

Exportação real por conexão direta canônica do mesmo projeto, SSL obrigatório, PostgreSQL cliente/servidor 17.11, `pg_dump` custom sem proprietários/ACLs e sem filtros de schema. Código de saída do dump: zero. Revalidação independente local com `pg_restore --list` e leitura integral `pg_restore --no-owner --no-acl --file=NUL`: ambos código zero. **64 tabelas**, incluindo suas entradas de dados, comparadas com o inventário real. Schemas inventariados: auth, extensions, graphql, graphql_public, pgbouncer, private, public, realtime, storage e vault; objetos efetivamente exportados estão no índice protegido ao lado do arquivo.

O dump terminou antes de uma falha local em `Get-FileHash`, indisponível naquela sessão do Windows PowerShell. Substituído por SHA-256 via .NET. O arquivo existente foi revalidado, sem nova consulta ou exportação remota. O manifesto preserva a falha anterior e marca `local_revalidation=true`. O aviso permanece porque os possíveis avisos originais da exportação não foram persistidos antes da falha; a revalidação não retornou erros. Não houve restauração isolada por instalação incompleta do servidor local (`share/postgres.bki` ausente).

O arquivo não inclui os binários do Storage, senhas globais de roles, segredos de funções ou configurações gerenciadas Auth/SMTP/OAuth. Uma restauração futura requer ambiente isolado compatível, reconciliação de proprietários/permissões a partir do inventário e validação dos serviços; não executar restauração diretamente sobre produção. O arquivo contém dados privados, está na pasta com ACL restrita e ignorada pelo Git. Os relatos abaixo são históricos.

## Atualização — 19/10/2026: autenticação restabelecida e validação corrigida

O responsável redefiniu a senha e a forneceu exclusivamente pela janela protegida. O teste real do Session Pooler confirmou banco `postgres`, papel `postgres` e servidor PostgreSQL 17.11. Host oficial, usuário completo, porta 5432 e `sslmode=require` foram preservados.

A falha atual **não era senha incorreta**: o `psql` retornava sucesso, mas a checagem do script exigia `transaction_read_only=on` somente a partir de `PGOPTIONS`. A sondagem real confirmou flags iniciais `session_read_only=off` e `default_read_only=off`. O script passou a usar transação SQL explícita; o servidor retornou `read_only=on` e o teste encerrou com `CONEXAO_VALIDADA`, sem iniciar dump.

Agora há diagnósticos separados de banco, papel e proteção de leitura, gravados antes das validações. Erros originais do PostgreSQL continuam preservados e senhas não são registradas. Dez cenários controlados, quatro testes de transporte com clientes nativos e análise de sintaxe PowerShell passaram. Detalhes em [BACKUP.md](BACKUP.md).

Após essa validação, foi aberta nova execução protegida do backup. A conclusão e o arquivo final ainda dependem de exportação e validação reais; o teste de conexão não é um backup. Não houve migração, restauração, alteração de RLS, Auth ou dados do banco. Os relatos de falha de autenticação abaixo são históricos, anteriores à redefinição.

A execução seguinte pelo pooler retornou novamente `FATAL: password authentication failed for user "postgres"` (código nativo 2), antes das consultas. Esse resultado é distinto do erro de validação READ ONLY, já corrigido. Como as entradas ocorreram em processos separados e a senha não foi guardada, não há evidência para afirmar se houve variação na entrada ou no estado do serviço. O DNS do pooler apresentou três endereços; isso, isoladamente, não prova problema de cache. Preparado um teste diferencial explícito pela conexão direta canônica do mesmo projeto, porta 5432, SSL obrigatório e papel `postgres`, com teste e eventual dump usando a mesma entrada segura durante um único processo. Sem repetição automática nem mudança de senha, papel ou permissões.

## Resultado atual — investigação definitiva do transporte e teste diferencial

**Status: FALHOU na autenticação remota; nenhum backup de produção criado ou validado.** Não há tamanho ou SHA-256 de dump a informar.

Foi acrescentado um teste com os executáveis PostgreSQL reais, não apenas os mocks .NET anteriores. Ele demonstrou perda/conversão de caracteres Unicode no caminho `PGPASSWORD` desta instalação Windows. Esse defeito foi corrigido: a senha agora chega pelo prompt nativo em pipe privado UTF-8, com `OSTYPE=msys` somente no processo filho para o PostgreSQL respeitar stdin redirecionado. Nenhum arquivo de senha, URL com senha ou configuração global é criado. A bateria nativa passou nos quatro casos (psql/pg_dump, ASCII/Unicode); os seis cenários controlados e a reexecução sem sobrescrita também passaram novamente. A descoberta invalida a conclusão anterior de que os mocks, sozinhos, provavam os bytes recebidos pela libpq.

Após a autorização explícita do responsável, a credencial fornecida nesta conversa foi lida somente da própria conversa identificada pelo ID da sessão, mantida em memória e entregue por pipe ao PowerShell/SecureString. Não foi copiada para código, argumentos, ambiente, novos arquivos ou relatórios. Houve uma falha local de carregamento de módulo de segurança antes de qualquer conexão; a invocação foi corrigida para construir SecureString por .NET e isolar o caminho de módulos do Windows PowerShell.

Com o transporte corrigido, foi executada uma tentativa no Session Pooler: Host oficial, 5432, `postgres.<project-ref>` completo, `sslmode=require`, banco `postgres` e opção transacional somente leitura. Resultado: `psql` código 2, `password authentication failed`. Em seguida foi executado **um teste diferencial** no endpoint direto canônico do mesmo projeto, alcançável por IPv6, usando papel `postgres`, a mesma credencial em memória, 5432 e SSL obrigatório. Resultado: a mesma rejeição de autenticação. Não houve laço de tentativas.

Isso comprova que a rejeição desta credencial ocorre também fora do pooler, portanto não pode ser atribuída apenas a seu cache ou ao sufixo de usuário. O defeito de Unicode era real, mas sua correção não resolveu a autenticação com a credencial fornecida. Não é possível restabelecer o acesso alterando somente o script quando ambos os servidores rejeitam a credencial. É indispensável confirmar a senha do papel `postgres` nesse projeto ou autorizar um procedimento separado de redefinição pelo responsável. O agente não redefiniu senha, criou roles ou alterou configurações do Supabase.

Relatórios protegidos em `backups`:

- `NortFood-backup-20261018-043424-936-d94e9b61.json`: Session Pooler, falha em `AUTENTICACAO_E_VERSAO`.
- `NortFood-backup-20261018-043427-145-d6010402.json`: conexão direta, mesma etapa e erro.

A credencial foi publicada no chat pelo responsável; recomenda-se rotação por essa exposição. O valor não é reproduzido aqui. A automação permanece preparada para executar e validar um backup quando houver autenticação aceita. Nenhum dado, migração, RLS ou configuração de Auth foi alterado; nenhuma restauração foi executada.

Os registros abaixo são históricos e não representam sucesso atual.

## Investigação da falha após entrada de senha

A primeira tentativa terminou com código **1** no script. O buffer da janela foi recuperado sem capturar a entrada da senha; o `psql` retornou código **2**, com mensagem nativa `FATAL: password authentication failed for user "postgres"`. A falha foi na primeira consulta, antes de inventário/exportação. Não existe dump de produção dessa tentativa.

O script enviou `postgres.<project-ref>` completo, conferido com a configuração pública do aplicativo e os parâmetros oficiais informados pelo responsável. A mensagem do servidor usa o papel interno `postgres`; ela não demonstra omissão do sufixo no cliente. Nenhuma senha ficou disponível para reutilização.

Foi identificada e corrigida a falta de relatório antes da autenticação. A nova versão cria JSON protegido antes da entrada da senha, registra a etapa e os parâmetros não secretos e conserva o erro nativo sanitizado. Host/User/porta/banco são argumentos explícitos de `psql`/`pg_dump`; SSL continua `require`, sem downgrade. Os testes controlados foram executados novamente, incluindo transmissão literal de símbolos, espaços e Unicode, sem vazamento no diagnóstico, além dos seis cenários e reexecução sem sobrescrita: todos aprovados.

Uma sonda sem credenciais confirmou aceitação de SSLRequest e conexão criptografada **TLS 1.2**. A validação mais forte pela cadeia de certificados do Windows encontrou raiz não confiável (CA Supabase); isso não é a mensagem da falha original, pois o cliente usava `sslmode=require`, sem exigir `verify-full`. A sonda aceitou o certificado somente para observar a negociação, sem transmitir senha ou executar SQL; não alterou a configuração do backup nem instalou certificados. Não se declara validação de identidade do servidor por CA. `verify-full` exige certificado oficial adequado.

O motivo comprovado é **rejeição da credencial pelo servidor**. O log não permite distinguir senha incorreta, entrada codificada/colada de forma diferente ou eventual propagação/cache do pooler após rotação. Não houve redefinição da senha, reconexão em laço ou mudança de Auth/RLS. Uma nova janela protegida foi aberta para a senha atual, original, do banco. O resultado dessa tentativa será registrado no JSON correspondente em `backups`; não há declaração de sucesso antes das validações do arquivo.

Referências oficiais: [erro de autenticação](https://supabase.com/docs/guides/troubleshooting/fatal-password-authentication-failed), [pooler após rotação](https://supabase.com/docs/guides/troubleshooting/supavisor-error-password-authentication-failed-after-password-rotation).

## Registro da preparação anterior

**Status: PARCIAL — aguardando a senha na janela segura já aberta.** Não foi gerado um backup de produção até a última conferência desta etapa. A automação continuará na própria janela após a entrada da senha, sem novos comandos do usuário. O resultado posterior fica no JSON datado ao lado do dump em `backups`; este relatório registra a situação no momento da entrega e não antecipa sucesso.

## Investigação

- PostgreSQL cliente: `psql`, `pg_dump` e `pg_restore` **17.11**, instalados no caminho informado e executados com sucesso. A versão do servidor só será confirmada após autenticação; o script bloqueia cliente de versão principal inferior à do servidor.
- Configuração pública `.env`: contém URL/chave pública do aplicativo, não credenciais SQL. Nenhum valor secreto foi impresso. Não foi encontrado script de backup preexistente nem `pgpass.conf` no caminho padrão conferido.
- Host e User do Session pooler foram fornecidos pelo responsável a partir de Connect e coincidem com uma tentativa completa encontrada no histórico. A porta **5432 está acessível por TCP**; isso não prova autenticação.
- O histórico contém comandos incompletos, placeholders e redirecionamento. Não é possível atestar a senha das tentativas anteriores. `password authentication failed` pode indicar senha do banco incorreta ou identidade/projeto incorretos; `no tenant identifier provided` indica ausência/inconsistência da identificação de tenant no pooler, tipicamente o sufixo do User. O script valida o formato e não usa `postgres` isolado no pooler.
- O erro de `pg_restore` foi reproduzido com o executável real em um arquivo de teste vazio: saída **1**, `input file is too short (read 0, expected 5)`. É um arquivo inválido, não evidência de backup concluído. Redirecionamento pode criar esse arquivo antes de o comando de exportação falhar.

## Implementação entregue

- `scripts/Backup-NortFood.ps1`: entrada segura, ambiente libpq isolado, SSL obrigatório, consulta prévia somente leitura, compatibilidade de versão, inventário, dump custom, validação do índice e dos blocos, hash e mensagens em português. Interrompe diante de falhas; não sobrescreve arquivos anteriores.
- `.gitignore`: pasta `/backups/` ignorada. Nenhum arquivo de backup é rastreado pelo Git.
- `tests/backup.unit.ps1`: seis cenários com executáveis controlados e uma repetição para conferir ausência de sobrescrita. **Todos aprovados** no Windows PowerShell 5.1. Cobrem sucesso, autenticação, falha do dump, vazio, índice inválido e corrupção na leitura integral. Testes não usam produção e não equivalem a dump real.
- `tests/backup.integration.ps1`: roteiro de PostgreSQL local novo com restauração isolada. **Não executado com sucesso neste computador**: instalação sem `share/postgres.bki`, necessário ao `initdb`. Nenhum servidor, Docker ou dependência extra foi instalado.
- `docs/BACKUP.md`: operação recorrente, segurança, escopo, limites e preparação de uma restauração futura.

A pasta local `C:\Users\keven\Documents\NortFood\backups` tem herança de permissões desativada, com acesso explícito somente ao usuário atual, administradores locais e SYSTEM. Os nomes incluem data/hora, milissegundos e identificador aleatório. O script só transforma `.dump.partial` em `.dump` após todas as verificações.

## Situação do arquivo e validação

| Item | Resultado nesta conferência |
|---|---|
| Arquivo de produção | Ainda não criado |
| Tamanho | Não aplicável; não existe dump válido |
| Autenticação no Supabase | Aguardando entrada segura da senha |
| Versão remota | Ainda não verificada |
| Índice e leitura integral do backup remoto | Pendentes |
| Restauração de produção | Não executada e proibida neste trabalho |
| Restauração local real | Bloqueada pela instalação incompleta do servidor |

O escopo pretendido é o banco inteiro, sem exclusões silenciosas de schemas. `public`, `private` e outros schemas/objetos exportáveis são descobertos no servidor; o conteúdo efetivo será registrado no índice e inventário. Nenhum dado é declarado incluído antes da exportação bem-sucedida.

O arquivo SQL não representa os arquivos físicos do Storage nem as configurações de Auth/SMTP/OAuth, Edge Functions ou outros serviços. Roles globais e suas senhas não são exportadas por `pg_dump`; ACLs são omitidas e precisam de reconciliação antes de expor um destino restaurado. Veja o procedimento e as dependências em `docs/BACKUP.md`.

## Preservação

Nenhuma migração, política RLS, configuração de Auth, tabela ou registro foi alterado por esta etapa. Nenhuma restauração remota foi executada. O SHA-256 da migração 001 continua `AD69B835FCF6575BD9DA1CE627A5EC8241AA45704D617A2531B139E5CF75FB16`. As mudanças anteriores do projeto permaneceram intactas; o trabalho desta etapa ficou restrito a backup, testes, documentação e regra de exclusão do Git.

Para repetir: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Backup-NortFood.ps1`. Para restaurar futuramente, preparar destino separado, conferir hash/índice e usar `pg_restore --no-owner --no-acl --exit-on-error --single-transaction` com a conexão do destino isolado. **Nenhuma restauração deve ser executada no banco principal com esse procedimento.**
