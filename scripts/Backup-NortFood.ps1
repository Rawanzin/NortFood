#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$DatabaseHost,
    [string]$DatabaseUser,
    [int]$Port = 5432,
    [string]$PostgresBin = 'C:\Program Files\PostgreSQL\17\bin',
    [string]$BackupDirectory,
    [Security.SecureString]$Password,
    [ValidateSet('SessionPooler','Direct')][string]$ConnectionMode = 'SessionPooler',
    [string]$ExpectedProjectRef,
    [switch]$NonInteractive,
    [switch]$ConnectionTestOnly,
    [switch]$AllowLocalTest
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $BackupDirectory) { $BackupDirectory = Join-Path (Split-Path $PSScriptRoot -Parent) 'backups' }
$script:SecretText = $null
$script:ConnectionEnvironment = @{}
$utf8 = New-Object Text.UTF8Encoding($false)

function Protect-BackupDirectory([string]$Path) {
    # Falha fechado se não for possível restringir a pasta no Windows/NTFS.
    [IO.Directory]::CreateDirectory($Path) | Out-Null
    $directory = New-Object IO.DirectoryInfo($Path)
    $acl = $directory.GetAccessControl([Security.AccessControl.AccessControlSections]::Access)
    $acl.SetAccessRuleProtection($true, $false)
    foreach ($existing in @($acl.Access)) { $acl.RemoveAccessRuleSpecific($existing) }
    $inheritance = [Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit'
    $propagation = [Security.AccessControl.PropagationFlags]::None
    $identities = @([Security.Principal.WindowsIdentity]::GetCurrent().User,
        (New-Object Security.Principal.SecurityIdentifier('S-1-5-18')),
        (New-Object Security.Principal.SecurityIdentifier('S-1-5-32-544')))
    foreach ($identity in $identities) {
        $rule = New-Object Security.AccessControl.FileSystemAccessRule($identity, 'FullControl', $inheritance, $propagation, 'Allow')
        $acl.AddAccessRule($rule)
    }
    $directory.SetAccessControl($acl)
}
function Quote-NativeArgument([string]$Value) {
    # Regras CommandLineToArgvW: preservam espaços, aspas e barras no PS 5.1.
    '"' + (($Value -replace '(\\*)"', '$1$1\"') -replace '(\\+)$', '$1$1') + '"'
}
function Protect-Diagnostic([string]$Text) {
    if ($script:SecretText) { $Text = $Text.Replace($script:SecretText, '[senha omitida]') }
    $Text = $Text -replace '(?m)^Password(?: for user [^\r\n:]+)?:[ \t]*(?:\r?\n)?', ''
    $Text -replace '(?i)postgres(?:ql)?://[^\s]+', '[URL de conexão omitida]'
}
function Get-BackupSha256([string]$Path) {
    # Nao depende de autoload do modulo Microsoft.PowerShell.Utility.
    $stream = [IO.File]::OpenRead($Path)
    $algorithm = [Security.Cryptography.SHA256]::Create()
    try { ([BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-', '') }
    finally { $algorithm.Dispose(); $stream.Dispose() }
}
function Invoke-Pg([string]$Executable, [string[]]$Arguments, [int]$TimeoutSeconds = 1800) {
    $info = New-Object Diagnostics.ProcessStartInfo
    $info.FileName = Join-Path $PostgresBin $Executable
    $info.Arguments = ($Arguments | ForEach-Object { Quote-NativeArgument $_ }) -join ' '
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $passwordInput = $Executable -in @('psql.exe','pg_dump.exe') -and $Arguments -contains '--password'
    $info.RedirectStandardInput = $passwordInput
    if ($passwordInput) {
        # sprompt.c do PostgreSQL no Windows abre CONIN$ mesmo com stdin
        # redirecionado. Seu modo de compatibilidade msys força stdin/stderr.
        # Somente este processo recebe OSTYPE; nenhuma configuração global muda.
        $info.EnvironmentVariables['OSTYPE'] = 'msys'
        $info.EnvironmentVariables['LC_ALL'] = 'C'
        $info.EnvironmentVariables['LANG'] = 'C'
    }
    $info.StandardOutputEncoding = $utf8
    $info.StandardErrorEncoding = $utf8
    # Não herda PGHOST/PGSERVICE/PGOPTIONS/PGPASSWORD de tentativas anteriores.
    foreach ($key in @($info.EnvironmentVariables.Keys)) {
        if ($key -match '^PG') { $info.EnvironmentVariables.Remove($key) }
    }
    foreach ($key in $script:ConnectionEnvironment.Keys) { $info.EnvironmentVariables[$key] = $script:ConnectionEnvironment[$key] }
    $process = New-Object Diagnostics.Process
    $process.StartInfo = $info
    try {
        $process.Start() | Out-Null
        # Drenagem concorrente evita deadlock por stderr/stdout cheios.
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        if ($passwordInput) {
            # libpq/CRT no Windows pode converter PGPASSWORD para ANSI. O prompt
            # nativo lê bytes UTF-8 do pipe privado, sem shell, arquivo ou echo.
            $passwordBytes = [Text.Encoding]::UTF8.GetBytes($script:SecretText + "`n")
            try {
                $process.StandardInput.BaseStream.Write($passwordBytes, 0, $passwordBytes.Length)
                $process.StandardInput.BaseStream.Flush()
            } finally {
                [Array]::Clear($passwordBytes, 0, $passwordBytes.Length)
                $process.StandardInput.Close()
            }
        }
        if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
            $process.Kill(); $process.WaitForExit()
            throw "Tempo limite ao executar $Executable. Nenhuma nova tentativa automática."
        }
        $stdout = $stdoutTask.GetAwaiter().GetResult()
        $stderr = Protect-Diagnostic ($stderrTask.GetAwaiter().GetResult())
        [pscustomobject]@{ Code = $process.ExitCode; Output = $stdout; Error = $stderr }
    } finally {
        $info.EnvironmentVariables.Remove('PGPASSWORD')
        $process.Dispose()
    }
}
function Require-PgSuccess($Result, [string]$Step) {
    if ($Result.Code -eq 0) { return }
    $hint = if ($Result.Error -match 'password authentication failed') {
        'A autenticação falhou. Confira a senha DO BANCO e Host/User no painel Connect. Não é a senha da conta Supabase nem a chave da API.'
    } elseif ($Result.Error -match 'no tenant identifier|Tenant or user not found') {
        'O pooler não identificou o projeto. Confira o User completo postgres.<project-ref> e o Host oficial; não use somente postgres.'
    } elseif ($Result.Error -match 'permission denied|row-level security') {
        'Permissões insuficientes para uma cópia completa. Nenhuma política ou permissão será alterada pelo script.'
    } else { 'Confira o diagnóstico abaixo; o script interrompeu a operação.' }
    throw "$Step falhou (código $($Result.Code)). $hint`n$($Result.Error.Trim())"
}
function Query-Json([string]$Sql, [switch]$SessionProbe) {
    # Nao depende do encaminhamento de PGOPTIONS pelo pooler.
    $commandSql = if ($SessionProbe) { $Sql } else { "BEGIN READ ONLY; SET LOCAL statement_timeout=900000;`n" + $Sql + "`nROLLBACK;" }
    $r = Invoke-Pg 'psql.exe' @('-X', '--quiet', '--password', '--host', $DatabaseHost, '--port', [string]$Port, '--username', $DatabaseUser, '--dbname=postgres', '--tuples-only', '--no-align', '--set=ON_ERROR_STOP=1', '--command', $commandSql) 60
    Require-PgSuccess $r 'Consulta somente leitura'
    if ($r.Error.Trim()) { $script:Warnings.Add($r.Error.Trim()) }
    $r.Output.Trim() | ConvertFrom-Json
}

$manifestPath = $null
$report = [ordered]@{ status = 'INICIANDO'; started_at = [DateTimeOffset]::Now.ToString('o'); remote_modified = $false }
$script:Warnings = New-Object 'Collections.Generic.List[string]'
function Set-BackupStage([string]$Stage) {
    $report['stage'] = $Stage
    if ($manifestPath) { [IO.File]::WriteAllText($manifestPath, ($report | ConvertTo-Json -Depth 12), $utf8) }
}
try {
    foreach ($binary in @('psql.exe', 'pg_dump.exe', 'pg_restore.exe')) {
        if (-not (Test-Path -LiteralPath (Join-Path $PostgresBin $binary) -PathType Leaf)) { throw "Dependência ausente: $binary em $PostgresBin." }
    }
    $client = Invoke-Pg 'pg_dump.exe' @('--version') 10
    Require-PgSuccess $client 'Verificação do pg_dump'
    if ($client.Output -notmatch '\(PostgreSQL\) (\d+)\.') { throw 'Versão do pg_dump não reconhecida.' }
    $clientMajor = [int]$Matches[1]
    $BackupDirectory = [IO.Path]::GetFullPath($BackupDirectory)
    Protect-BackupDirectory $BackupDirectory
    # Relatório também existe quando a primeira autenticação falha.
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    $name = 'NortFood-backup-' + $stamp + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8)
    $manifestPath = Join-Path $BackupDirectory ($name + '.json')
    $report['client_version'] = $client.Output.Trim()
    Set-BackupStage 'CONFIGURACAO'
    $connectionFile = Join-Path $BackupDirectory 'connection.json'
    if (Test-Path -LiteralPath $connectionFile) {
        $saved = Get-Content -LiteralPath $connectionFile -Raw | ConvertFrom-Json
        if (-not $DatabaseHost) { $DatabaseHost = [string]$saved.host }
        if (-not $DatabaseUser) { $DatabaseUser = [string]$saved.user }
    }
    if (-not $DatabaseHost) {
        if ($NonInteractive) { throw 'Host oficial não informado.' }
        $DatabaseHost = Read-Host 'Host oficial em Supabase > Connect > Session pooler (sem senha)'
    }
    if (-not $DatabaseUser) {
        if ($NonInteractive) { throw 'User oficial não informado.' }
        $DatabaseUser = Read-Host 'User completo em Supabase > Connect > Session pooler'
    }
    $DatabaseHost = $DatabaseHost.Trim(); $DatabaseUser = $DatabaseUser.Trim()
    $local = $AllowLocalTest -and $DatabaseHost -in @('127.0.0.1', 'localhost')
    $direct = $ConnectionMode -eq 'Direct'
    if ($direct -and ($ExpectedProjectRef -notmatch '^[a-z0-9]+$' -or $DatabaseHost -cne ('db.'+$ExpectedProjectRef+'.supabase.co') -or $DatabaseUser -ne 'postgres' -or $Port -ne 5432)) {
        throw 'Conexão direta exige host canônico do projeto confirmado, papel postgres e porta 5432.'
    }
    if (-not $local -and -not $direct -and ($DatabaseHost -notmatch '^[a-z0-9-]+\.pooler\.supabase\.com$' -or $DatabaseUser -notmatch '^postgres\.[a-z0-9]+$' -or $Port -ne 5432)) {
        throw 'Use Host oficial do Session pooler, User postgres.<project-ref> e porta 5432. Não informe URI nem senha nesses campos.'
    }
    if ($local -and ($DatabaseUser -notmatch '^[a-zA-Z0-9_]+$' -or $Port -lt 1024 -or $Port -gt 65535)) { throw 'Configuração local inválida.' }
    $report['parameters'] = [ordered]@{
        host = $DatabaseHost; user = $DatabaseUser; port = $Port; database = 'postgres'
        connection_mode = $ConnectionMode
        sslmode = $(if ($local) { 'disable' } else { 'require' })
        options = '-c default_transaction_read_only=on -c statement_timeout=900000'
        password_transport = 'SecureString -> pipe stdin UTF-8 privado do prompt nativo; sem URI, PGPASSWORD ou arquivo'
    }
    Set-BackupStage 'AGUARDANDO_SENHA_SEGURA'
    if ($null -eq $Password) {
        if ($NonInteractive) { throw 'Senha segura não fornecida; não será lida do ambiente nem de arquivos.' }
        Write-Host 'Informe somente a senha DO BANCO. Ela não será exibida, gravada ou passada na linha de comando.'
        Write-Host 'Use a senha atual do banco deste projeto, sem aspas adicionais e sem codificação de URL. Não cole a chave da API nem a URL de conexão.'
        $Password = Read-Host 'Senha do banco (entrada protegida)' -AsSecureString
    }
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
    try { $script:SecretText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    if (-not $script:SecretText -and -not $local) { throw 'Senha vazia. Nenhuma conexão foi tentada.' }
    if ($script:SecretText -match '^(?i:postgres(?:ql)?://|sb_(?:publishable|secret)_|eyJ[A-Za-z0-9_-]+\.)') {
        throw 'A entrada parece uma URL ou chave de API. Informe somente a senha do banco, na forma original. Nenhuma conexão foi tentada.'
    }
    $script:ConnectionEnvironment = @{
        PGHOST = $DatabaseHost; PGUSER = $DatabaseUser; PGPORT = [string]$Port; PGDATABASE = 'postgres'
        PGSSLMODE = $(if ($local) { 'disable' } else { 'require' }); PGCONNECT_TIMEOUT = '15'
        PGCLIENTENCODING = 'UTF8'; PGAPPNAME = 'NortFood-readonly-backup'
        PGOPTIONS = '-c default_transaction_read_only=on -c statement_timeout=900000'
    }
    Write-Host 'Testando autenticação, TLS e versão em consulta somente leitura...'
    Set-BackupStage 'AUTENTICACAO_E_VERSAO'
    $probe = Query-Json -SessionProbe @'
select json_build_object('current_user',current_user,'database',current_database(),
'session_read_only',current_setting('transaction_read_only'),
'default_read_only',current_setting('default_transaction_read_only'));
'@
    $report['session_probe'] = $probe
    Set-BackupStage 'VALIDANDO_TRANSACAO_READ_ONLY'
    $server = Query-Json @'
select json_build_object('current_user',current_user,'database',current_database(),
'version',version(),'version_num',current_setting('server_version_num')::int,
'read_only',current_setting('transaction_read_only'),
'ssl',coalesce((select ssl from pg_stat_ssl where pid=pg_backend_pid()),false));
'@
    $report['connection'] = $server
    Set-BackupStage 'VALIDANDO_IDENTIDADE_E_VERSAO'
    if ($server.database -ne 'postgres') { throw "Banco inesperado: $($server.database); esperado postgres. Autenticacao concluida; backup interrompido." }
    if ($server.current_user -ne 'postgres' -and -not $local) { throw "Papel inesperado: $($server.current_user); esperado postgres. Backup interrompido." }
    if ($server.read_only -ne 'on') { throw "Transacao explicita READ ONLY nao confirmada (valor: $($server.read_only)). Autenticacao concluida; nenhum dump iniciado." }
    if ($probe.default_read_only -ne 'on') { Write-Host 'O backend nao herdou default_transaction_read_only=on do startup. Consultas protegidas por BEGIN READ ONLY explicito; pg_dump usa sua propria transacao READ ONLY.' }
    # sslmode=require exige TLS entre libpq e o pooler. pg_stat_ssl descreve
    # o outro trecho (pooler -> Postgres), portanto não valida o TLS do cliente.
    if ([math]::Floor($server.version_num / 10000) -gt $clientMajor) { throw 'Servidor mais novo que o pg_dump instalado. Use cliente compatível; nenhum arquivo de backup foi criado.' }
    Write-Host "Conexão confirmada. Servidor PostgreSQL $([math]::Floor($server.version_num / 10000)); cliente $($client.Output.Trim())."
    if ($ConnectionTestOnly) {
        $report['status'] = 'CONEXAO_VALIDADA'; $report['finished_at'] = [DateTimeOffset]::Now.ToString('o')
        Set-BackupStage 'CONEXAO_CONCLUIDA_SEM_BACKUP'
        Write-Host 'Conexao validada: autenticacao, banco, papel e READ ONLY explicito confirmados; SSL exigido. Nenhum dump iniciado.'
        return
    }
    Set-BackupStage 'INVENTARIO'
    $inventory = Query-Json @'
select json_build_object(
'schemas',(select coalesce(json_agg(nspname order by nspname),'[]') from pg_namespace where nspname !~ '^pg_' and nspname<>'information_schema'),
'tables',(select coalesce(json_agg(json_build_object('schema',n.nspname,'name',c.relname,'kind',c.relkind) order by n.nspname,c.relname),'[]') from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in('r','p') and n.nspname !~ '^pg_' and n.nspname<>'information_schema' and not exists(select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e')),
'extensions',(select coalesce(json_agg(json_build_object('name',extname,'version',extversion)),'[]') from pg_extension),
'roles',(select coalesce(json_agg(rolname),'[]') from pg_roles),
'security',(select coalesce(json_agg(json_build_object('schema',n.nspname,'name',c.relname,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity)),'[]') from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private')),
'function_security',(select coalesce(json_agg(json_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'acl',p.proacl,'definer',p.prosecdef,'config',p.proconfig)),'[]') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private')));
'@
    foreach ($required in @('public', 'private')) {
        if (-not $local -and $required -notin @($inventory.schemas)) { throw "Schema esperado ausente: $required. Confira se o projeto está correto." }
    }
    $destination = Join-Path $BackupDirectory ($name + '.dump')
    $partial = $destination + '.partial'
    $tocPath = Join-Path $BackupDirectory ($name + '.list.txt')
    $inventoryPath = Join-Path $BackupDirectory ($name + '.inventory.json')
    # CreateNew reserva o nome: nunca reutiliza backup anterior.
    $reservation = [IO.File]::Open($partial, [IO.FileMode]::CreateNew); $reservation.Dispose()
    $report['status'] = 'EXPORTANDO'; $report['connection'] = $server
    $report['client_sslmode'] = $script:ConnectionEnvironment['PGSSLMODE']
    $report['dump'] = $destination; $report['scope'] = 'Banco inteiro: schemas não sistêmicos acessíveis ao executor, sem filtros de schema'
    $report['schemas_discovered'] = @($inventory.schemas)
    [IO.File]::WriteAllText($manifestPath, ($report | ConvertTo-Json -Depth 12), $utf8)
    [IO.File]::WriteAllText($inventoryPath, ($inventory | ConvertTo-Json -Depth 18), $utf8)
    Write-Host 'Exportando banco em formato customizado; nenhum dado será alterado...'
    Set-BackupStage 'PG_DUMP'
    $dump = Invoke-Pg 'pg_dump.exe' @('--password', '--host', $DatabaseHost, '--port', [string]$Port, '--username', $DatabaseUser, '--dbname=postgres', '--format=custom', '--no-owner', '--no-acl', '--lock-wait-timeout=15000', '--file', $partial)
    Require-PgSuccess $dump 'pg_dump'
    $report['dump_exit_code'] = $dump.Code
    if ($dump.Error.Trim()) { $script:Warnings.Add($dump.Error.Trim()) }
    $report['warnings'] = @($script:Warnings.ToArray())
    if (-not (Test-Path -LiteralPath $partial) -or (Get-Item -LiteralPath $partial).Length -le 5) { throw 'Arquivo vazio ou incompleto. Não é um backup válido.' }
    Set-BackupStage 'VALIDACAO_INDICE'
    $list = Invoke-Pg 'pg_restore.exe' @('--list', $partial) 60
    Require-PgSuccess $list 'Leitura do índice pg_restore --list'
    if ($list.Error.Trim()) { $script:Warnings.Add($list.Error.Trim()) }
    [IO.File]::WriteAllText($tocPath, $list.Output, $utf8)
    foreach ($table in @($inventory.tables)) {
        $qualified = [regex]::Escape($table.schema + ' ' + $table.name)
        if ($list.Output -notmatch "(?m)^\d+; \d+ \d+ TABLE $qualified ") { throw "Tabela ausente no índice: $($table.schema).$($table.name)." }
        if ($table.kind -eq 'r' -and $list.Output -notmatch "(?m)^\d+; \d+ \d+ TABLE DATA $qualified ") { throw "Dados da tabela ausentes no índice: $($table.schema).$($table.name)." }
    }
    Write-Host 'Validando todos os blocos do arquivo, sem conexão de restauração...'
    Set-BackupStage 'VALIDACAO_INTEGRAL'
    # Gera SQL para o dispositivo nulo: descomprime o conteúdo inteiro sem executar SQL.
    $read = Invoke-Pg 'pg_restore.exe' @('--no-owner', '--no-acl', '--file=NUL', $partial)
    Require-PgSuccess $read 'Leitura integral do arquivo'
    if ($read.Error.Trim()) { $script:Warnings.Add($read.Error.Trim()) }
    [IO.File]::Move($partial, $destination)
    $report['status'] = $(if ($script:Warnings.Count) { 'VALIDADO_COM_AVISOS' } else { 'VALIDADO' })
    $report['bytes'] = (Get-Item -LiteralPath $destination).Length
    $report['sha256'] = Get-BackupSha256 $destination
    $report['list_exit_code'] = $list.Code; $report['full_read_exit_code'] = $read.Code
    $report['table_count_verified'] = @($inventory.tables).Count
    $report['restore_test'] = 'Não executado neste backup; leitura integral não substitui restauração isolada.'
    $report['warnings'] = @($script:Warnings.ToArray())
    $report['finished_at'] = [DateTimeOffset]::Now.ToString('o')
    $report['stage'] = 'CONCLUIDO'
    [IO.File]::WriteAllText($manifestPath, ($report | ConvertTo-Json -Depth 12), $utf8)
    if (-not $local -and -not $direct) { [IO.File]::WriteAllText($connectionFile, (@{host=$DatabaseHost;user=$DatabaseUser} | ConvertTo-Json), $utf8) }
    Write-Host "Backup validado: $destination"
    Write-Host "Tamanho: $($report['bytes']) bytes. Índice e leitura integral: OK."
    if ($script:Warnings.Count) { Write-Warning 'Existem avisos. Revise o relatório JSON protegido junto ao backup.' }
    Write-Host 'Não é cópia dos arquivos do Storage, configurações de Auth ou de outros serviços. Consulte docs/BACKUP.md.'
} catch {
    $message = Protect-Diagnostic $_.Exception.Message
    $report['status'] = 'FALHOU'; $report['error'] = $message
    $report['finished_at'] = [DateTimeOffset]::Now.ToString('o')
    if ($manifestPath) { [IO.File]::WriteAllText($manifestPath, ($report | ConvertTo-Json -Depth 12), $utf8) }
    Write-Error -Message $message -ErrorAction Continue
    exit 1
} finally {
    $script:SecretText = $null
    $script:ConnectionEnvironment.Clear()
    # A SecureString fornecida pelo chamador continua sob responsabilidade dele.
    $Password = $null
}
