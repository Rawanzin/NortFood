#requires -Version 5.1
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$BackupManifest)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$credential=$null
$script:SecretText=$null
$script:ConnectionEnvironment=@{}
$deploymentPath=$null
$deploymentReport=[ordered]@{status='INICIANDO';remote_modified=$false;started_at=[DateTimeOffset]::Now.ToString('o')}
function Hash-File([string]$Path){$stream=[IO.File]::OpenRead($Path);$sha=[Security.Cryptography.SHA256]::Create();try{([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-','')}finally{$sha.Dispose();$stream.Dispose()}}
function Save-Deployment([string]$Stage){$deploymentReport['stage']=$Stage;if($deploymentPath){[IO.File]::WriteAllText($deploymentPath,($deploymentReport|ConvertTo-Json -Depth 15),(New-Object Text.UTF8Encoding($false)))}}
try {
    Set-Location -LiteralPath $root
    $backupRoot=[IO.Path]::GetFullPath((Join-Path $root 'backups'))
    $approvedManifest=Get-Content -LiteralPath $BackupManifest -Raw | ConvertFrom-Json
    if($approvedManifest.status -notin @('VALIDADO','VALIDADO_COM_AVISOS') -or $approvedManifest.dump_exit_code -ne 0 -or $approvedManifest.list_exit_code -ne 0 -or $approvedManifest.full_read_exit_code -ne 0){throw 'Backup sem validacao integral: nenhuma conexao sera aberta.'}
    $approvedDump=[IO.Path]::GetFullPath($approvedManifest.dump)
    if([IO.Path]::GetDirectoryName($approvedDump) -ne $backupRoot -or (Hash-File $approvedDump) -ne $approvedManifest.sha256){throw 'Backup fora da pasta protegida ou hash divergente.'}
    if($approvedManifest.parameters.host -notin @('db.zwkhqahivthzivmuirjr.supabase.co','aws-1-sa-east-1.pooler.supabase.com') -or $approvedManifest.connection.database -ne 'postgres'){throw 'Projeto de origem do backup nao confirmado.'}
    if(([DateTimeOffset]::Now-[DateTimeOffset]::Parse($approvedManifest.finished_at)).TotalHours -gt 6){throw 'Backup com mais de seis horas: gere copia atual antes do deploy.'}
    if((Hash-File (Join-Path $root 'supabase/migrations/202610120001_foundation.sql')) -ne 'AD69B835FCF6575BD9DA1CE627A5EC8241AA45704D617A2531B139E5CF75FB16'){throw 'A 001 mudou desde a auditoria. Interrompido.'}
    $stamp=Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    $deploymentPath=Join-Path $backupRoot ('NortFood-deployment-'+$stamp+'.json')
    $deploymentReport['backup']=$approvedDump
    $deploymentReport['backup_sha256']=$approvedManifest.sha256
    $sqlPath=Join-Path $backupRoot ('NortFood-deployment-'+$stamp+'.sql')
    $migrationInfo=& node (Join-Path $PSScriptRoot 'prepare-supabase-deployment.cjs') $sqlPath
    if($LASTEXITCODE){throw 'Falha na preparacao local do lote SQL.'}
    $parsedMigrations=ConvertFrom-Json -InputObject ($migrationInfo -join "`n")
    $deploymentReport['migrations']=@(foreach($entry in $parsedMigrations){[ordered]@{name=[string]$entry.name;sha256=[string]$entry.sha256}})
    $deploymentReport['sql_sha256']=Hash-File $sqlPath
    Save-Deployment 'AGUARDANDO_ENTRADA_SEGURA'
    Write-Host 'NortFood: uma unica entrada protegida para conferir o banco e aplicar 002-007.'
    Write-Host 'Backup ja validado. A 001 nao sera executada. Nenhuma senha sera salva.'
    $credential=Read-Host 'Senha atual DO BANCO (entrada protegida)' -AsSecureString
    Save-Deployment 'VALIDANDO_CONEXAO'
    # Reutiliza o transporte nativo ja testado. O teste encerra antes de inventario/dump.
    . (Join-Path $PSScriptRoot 'Backup-NortFood.ps1') -ConnectionMode Direct -ExpectedProjectRef zwkhqahivthzivmuirjr -DatabaseHost db.zwkhqahivthzivmuirjr.supabase.co -DatabaseUser postgres -Port 5432 -ConnectionTestOnly -Password $credential
    $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($credential)
    try{$script:SecretText=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)}
    $script:ConnectionEnvironment=@{PGHOST='db.zwkhqahivthzivmuirjr.supabase.co';PGUSER='postgres';PGPORT='5432';PGDATABASE='postgres';PGSSLMODE='require';PGCONNECT_TIMEOUT='15';PGCLIENTENCODING='UTF8';PGAPPNAME='NortFood-reviewed-deployment';PGOPTIONS='-c statement_timeout=120000 -c lock_timeout=15000'}
    Save-Deployment 'INVENTARIO_SOMENTE_LEITURA'
    $deploymentReport['before']=Query-Json @'
select json_build_object('database',current_database(),'user',current_user,
'rpc_count',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'nf\_%' escape '\'),
'migration_history_present',to_regclass('supabase_migrations.schema_migrations') is not null,
'location_columns',(select count(*) from information_schema.columns where table_schema='public' and table_name='stores' and column_name in('latitude','longitude')),
'bucket_present',exists(select 1 from storage.buckets where id='store-media'));
'@
    Save-Deployment 'APLICANDO_TRANSACAO_ATOMICA_002_007'
    $deploymentReport['commit_state']='Ainda nao confirmado; em falha, conferir banco sem repetir o lote.'
    Save-Deployment 'APLICANDO_TRANSACAO_ATOMICA_002_007'
    $result=Invoke-Pg 'psql.exe' @('-X','--quiet','--password','--host',$DatabaseHost,'--port','5432','--username','postgres','--dbname=postgres','--set=ON_ERROR_STOP=1','--file',$sqlPath) 600
    $deploymentReport['sql_exit_code']=$result.Code
    $deploymentReport['sql_output']=$result.Output
    $deploymentReport['sql_diagnostics']=$result.Error
    Require-PgSuccess $result 'Lote atomico 002-007'
    $deploymentReport['remote_modified']=$true
    $deploymentReport['commit_state']='COMMIT confirmado pelo psql; codigo zero.'
    Save-Deployment 'CONFERENCIA_POS_APLICACAO'
    $deploymentReport['after']=Query-Json @'
select json_build_object('rpc_count',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'nf\_%' escape '\'),
'tables_without_rls',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private') and c.relkind='r' and not c.relrowsecurity),
'definers_with_untrusted_search_path',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.prosecdef and not coalesce('search_path=""'=any(p.proconfig) or 'search_path=pg_catalog'=any(p.proconfig),false)),
'anon_internal_reason',has_column_privilege('anon','public.stores','status_reason','SELECT'),
'bucket_public',(select public from storage.buckets where id='store-media'),
'realtime_tables',(select json_agg(tablename order by tablename) from pg_publication_tables where pubname='supabase_realtime'),
'pilot_enabled',(select pilot_enabled from public.platform_settings where id=true));
'@
    $deploymentReport['status']='APLICADO_E_CONFERIDO'
    $deploymentReport['finished_at']=[DateTimeOffset]::Now.ToString('o')
    Save-Deployment 'CONCLUIDO'
    Write-Host 'Migracoes 002-007 aplicadas atomicamente; contagens existentes e controles de seguranca conferidos. Nenhum piloto habilitado.'
} catch {
    $deploymentReport['status']='FALHOU_OU_REQUER_CONFERENCIA'
    $message=$_.Exception.Message
    if($script:SecretText){$message=$message.Replace($script:SecretText,'[senha omitida]')}
    $deploymentReport['error']=$message
    $deploymentReport['finished_at']=[DateTimeOffset]::Now.ToString('o')
    Save-Deployment 'INTERROMPIDO_SEM_REPETICAO'
    Write-Error -Message $message -ErrorAction Continue
    exit 1
} finally {
    $script:SecretText=$null
    if(Get-Variable -Name ConnectionEnvironment -Scope Script -ErrorAction SilentlyContinue){$script:ConnectionEnvironment.Clear()}
    if($credential){$credential.Dispose()}
}
