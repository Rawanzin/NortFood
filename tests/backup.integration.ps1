#requires -Version 5.1
# Apenas cluster novo e descartável em TEMP; nenhuma conexão Supabase.
$ErrorActionPreference = 'Stop'
$bin = 'C:\Program Files\PostgreSQL\17\bin'
if (-not (Test-Path -LiteralPath (Join-Path (Split-Path $bin -Parent) 'share\postgres.bki'))) {
    Write-Output 'NAO EXECUTADO: instalacao sem share/postgres.bki; clientes disponiveis, servidor local incompleto. Nenhuma restauracao testada.'
    exit 2
}
$engine = 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'
$root = Split-Path $PSScriptRoot -Parent
$workspace = Join-Path $env:TEMP ('NortFood-backup-test-' + [Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($workspace) | Out-Null
$cluster = Join-Path $workspace 'cluster'
$output = Join-Path $workspace 'backups com espacos'
$listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, 0)
$listener.Start(); $port = $listener.LocalEndpoint.Port; $listener.Stop()
$started = $false
try {
    & (Join-Path $bin 'initdb.exe') '--pgdata' $cluster '--username=nf_backup_test' '--auth=trust' '--no-locale' '--encoding=UTF8' *> (Join-Path $workspace 'initdb.log')
    if ($LASTEXITCODE) { throw 'initdb falhou no cluster de teste.' }
    & (Join-Path $bin 'pg_ctl.exe') '-D' $cluster '-l' (Join-Path $workspace 'server.log') '-o' "-h 127.0.0.1 -p $port" '-w' '-t' '30' 'start' *> (Join-Path $workspace 'start.log')
    if ($LASTEXITCODE) { throw 'Servidor local de teste nao iniciou.' }
    $started = $true
    $sql = @'
create schema private;
create schema outro_schema;
create table public.backup_orders(id integer primary key, note text not null);
insert into public.backup_orders values(1,'dados de teste'),(2,'acentos: retirada');
create table private.secret(id integer primary key);
insert into private.secret values(99);
create table outro_schema.extra(id integer primary key);
insert into outro_schema.extra values(7);
alter table private.secret enable row level security;
create function private.check_secret() returns boolean language sql security definer set search_path='' as $$select exists(select 1 from private.secret)$$;
revoke all on function private.check_secret() from public;
'@
    $fixture = Join-Path $workspace 'fixture.sql'
    [IO.File]::WriteAllText($fixture, $sql)
    & (Join-Path $bin 'psql.exe') '-X' '-h' '127.0.0.1' '-p' $port '-U' 'nf_backup_test' '-d' 'postgres' '--set=ON_ERROR_STOP=1' '-f' $fixture *> (Join-Path $workspace 'fixture.log')
    if ($LASTEXITCODE) { throw 'Fixture falhou.' }
    # Sem senha real: trust somente no cluster isolado, escutando em loopback.
    $script = Join-Path $root 'scripts\Backup-NortFood.ps1'
    $command = "& '$($script.Replace("'","''"))' -DatabaseHost 127.0.0.1 -DatabaseUser nf_backup_test -Port $port -BackupDirectory '$($output.Replace("'","''"))' -AllowLocalTest -NonInteractive -Password (New-Object Security.SecureString)"
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))
    & $engine '-NoProfile' '-NonInteractive' '-EncodedCommand' $encoded *> (Join-Path $workspace 'backup.log')
    if ($LASTEXITCODE) { throw "Backup de teste falhou. Consulte $workspace\backup.log" }
    $dump = @(Get-ChildItem -LiteralPath $output -Filter '*.dump')
    if ($dump.Count -ne 1 -or $dump[0].Length -le 5) { throw 'Arquivo de teste ausente ou vazio.' }
    $report = Get-Content -LiteralPath ([IO.Path]::ChangeExtension($dump[0].FullName, '.json')) -Raw | ConvertFrom-Json
    if ($report.status -ne 'VALIDADO' -or $report.table_count_verified -ne 3) { throw 'Validacao incompleta.' }
    & (Join-Path $bin 'createdb.exe') '-h' '127.0.0.1' '-p' $port '-U' 'nf_backup_test' 'restore_isolado'
    if ($LASTEXITCODE) { throw 'Falha ao criar destino isolado.' }
    & (Join-Path $bin 'pg_restore.exe') '-h' '127.0.0.1' '-p' $port '-U' 'nf_backup_test' '-d' 'restore_isolado' '--no-owner' '--no-acl' '--exit-on-error' '--single-transaction' $dump[0].FullName *> (Join-Path $workspace 'restore.log')
    if ($LASTEXITCODE) { throw 'Restauracao local falhou.' }
    $check = & (Join-Path $bin 'psql.exe') '-X' '-h' '127.0.0.1' '-p' $port '-U' 'nf_backup_test' '-d' 'restore_isolado' '-At' '-c' "select (select count(*) from public.backup_orders)=2 and (select id from private.secret)=99 and (select id from outro_schema.extra)=7 and private.check_secret() and (select relrowsecurity from pg_class where oid='private.secret'::regclass);"
    if ($LASTEXITCODE -or $check -ne 't') { throw 'Dados, funcao ou RLS nao foram restaurados corretamente.' }
    # Reexecucao nunca sobrescreve o arquivo anterior.
    & $engine '-NoProfile' '-NonInteractive' '-EncodedCommand' $encoded *> (Join-Path $workspace 'backup-second.log')
    if ($LASTEXITCODE -or @(Get-ChildItem -LiteralPath $output -Filter '*.dump').Count -ne 2) { throw 'Protecao contra sobrescrita falhou.' }
    $badOutput = Join-Path $workspace 'failed'
    $badCommand = $command.Replace('nf_backup_test', 'usuario_inexistente').Replace($output, $badOutput)
    & $engine '-NoProfile' '-NonInteractive' '-EncodedCommand' ([Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($badCommand))) *> (Join-Path $workspace 'failed.log')
    if ($LASTEXITCODE -eq 0 -or @(Get-ChildItem -LiteralPath $badOutput -Filter '*.dump*').Count) { throw 'Falha de conexao criou arquivo indevido.' }
    # Arquivo vazio deve ser recusado pelo validador nativo.
    $empty = Join-Path $workspace 'empty.dump'; [IO.File]::WriteAllBytes($empty, [byte[]]@())
    $process = Start-Process -FilePath (Join-Path $bin 'pg_restore.exe') -ArgumentList @('--list', $empty) -WindowStyle Hidden -Wait -PassThru -RedirectStandardError (Join-Path $workspace 'empty.log') -RedirectStandardOutput (Join-Path $workspace 'empty-list.txt')
    if ($process.ExitCode -eq 0) { throw 'pg_restore aceitou arquivo vazio.' }
    Write-Output ('SUCESSO: backup, indice, leitura integral, restauracao real, RLS, tres schemas, reexecucao e falhas verificadas. Evidencias locais: ' + $workspace)
} finally {
    if ($started) {
        & (Join-Path $bin 'pg_ctl.exe') '-D' $cluster '-m' 'fast' '-w' 'stop' *> (Join-Path $workspace 'stop.log')
    }
    # Mantem evidencias locais; nao remove arquivos ou bancos preexistentes.
}
