#requires -Version 5.1
# Testes de processo com executaveis controlados. Nao testa Supabase/pg_dump real.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$work = Join-Path $env:TEMP ('NortFood-backup-unit-' + [Guid]::NewGuid().ToString('N'))
$bin = Join-Path $work 'bin'
[IO.Directory]::CreateDirectory($bin) | Out-Null
$source = @'
using System;using System.IO;using System.Linq;using System.Text;
public class FakePg {
 public static int Main(string[] args){
 string exe=Path.GetFileNameWithoutExtension(System.Diagnostics.Process.GetCurrentProcess().MainModule.FileName);
 if(args.Contains("--version")){Console.WriteLine("pg_dump (PostgreSQL) 17.11");return 0;}
 string scenario=Environment.GetEnvironmentVariable("NF_BACKUP_SCENARIO")??"success";
 if(exe=="psql"||exe=="pg_dump"){
  Console.InputEncoding=new UTF8Encoding(false);string password=Console.ReadLine();
  if(Environment.GetEnvironmentVariable("PGPASSWORD")!=null||Environment.GetEnvironmentVariable("OSTYPE")!="msys"||password==null||Convert.ToBase64String(Encoding.UTF8.GetBytes(password))!=Environment.GetEnvironmentVariable("NF_BACKUP_EXPECTED_PASSWORD")||args.Any(x=>x.Contains(password))||!args.Contains("--password")){Console.Error.WriteLine("password transport mismatch");return 4;}
  if(!args.Contains("--username")||args[Array.IndexOf(args,"--username")+1]!="postgres.testref"||!args.Contains("--host")||args[Array.IndexOf(args,"--host")+1]!="aws-1-test.pooler.supabase.com"||!args.Contains("--dbname=postgres")){Console.Error.WriteLine("connection arguments mismatch");return 5;}
 }
 if(exe=="psql"){
  if(scenario=="auth"){Console.Error.WriteLine("FATAL: password authentication failed");return 2;}
  if(Environment.GetEnvironmentVariable("PGSSLMODE")!="require"||Environment.GetEnvironmentVariable("PGSERVICE")!=null||!Environment.GetEnvironmentVariable("PGOPTIONS").Contains("read_only=on")){Console.Error.WriteLine("bad environment");return 3;}
  string sql=args[Array.IndexOf(args,"--command")+1];
  if(scenario=="sql_error"){Console.Error.WriteLine("ERROR: permission denied for view pg_stat_ssl");return 1;}
  if(sql.Contains("session_read_only"))Console.WriteLine("{\"current_user\":\"postgres\",\"database\":\"postgres\",\"session_read_only\":\"off\",\"default_read_only\":\"off\"}");
  else if(!sql.StartsWith("BEGIN READ ONLY;")||!sql.Contains("ROLLBACK;")||!args.Contains("--quiet")){Console.Error.WriteLine("explicit read only missing");return 9;}
  else if(args.Any(x=>x.Contains("current_user")))Console.WriteLine("{\"current_user\":\"postgres\",\"database\":\""+(scenario=="wrong_database"?"other":"postgres")+"\",\"version\":\"PostgreSQL 17.11\",\"version_num\":170011,\"read_only\":\""+(scenario=="unsafe"?"off":"on")+"\",\"ssl\":false}");
  else Console.WriteLine("{\"schemas\":[\"public\",\"private\",\"custom\"],\"tables\":[{\"schema\":\"public\",\"name\":\"orders\",\"kind\":\"r\"}],\"extensions\":[],\"roles\":[],\"security\":[],\"function_security\":[]}");return 0;
 }
 if(exe=="pg_dump"){
  string file=args[Array.IndexOf(args,"--file")+1];File.WriteAllText(file,scenario=="empty"?"":"PGDMP-synthetic-not-a-real-archive");
  if(scenario=="dump"){Console.Error.WriteLine("permission denied for table internal");return 1;}return 0;
 }
 if(args.Contains("--list")){
  if(scenario=="list"){Console.Error.WriteLine("input file is too short");return 1;}
  Console.WriteLine("1; 1259 123 TABLE public orders postgres\n2; 0 123 TABLE DATA public orders postgres");return 0;
 }
 if(scenario=="corrupt"){Console.Error.WriteLine("could not uncompress data");return 1;}return 0;
 }
}
'@
Add-Type -TypeDefinition $source -Language CSharp -OutputAssembly (Join-Path $bin 'pg_dump.exe') -OutputType ConsoleApplication
foreach ($name in @('psql.exe','pg_restore.exe')) { Copy-Item -LiteralPath (Join-Path $bin 'pg_dump.exe') -Destination (Join-Path $bin $name) }
$engine = 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'
$script = Join-Path $root 'scripts\Backup-NortFood.ps1'
$env:PGSERVICE = 'test-must-not-be-inherited'
$env:PGUSER = 'postgres'
$env:PGSSLMODE = 'disable'
# Caracteres literais, sem URL-encoding e sem expansao pelo shell.
$fixturePassword = ' fixture-only-$@%:;"\ / ' + [char]0x00E7 + [char]0x00E3
$env:NF_BACKUP_EXPECTED_PASSWORD = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($fixturePassword))
try {
 foreach ($scenario in @('success','auth','dump','empty','list','corrupt','unsafe','wrong_database','sql_error','test_only')) {
    $env:NF_BACKUP_SCENARIO = $scenario
    $output = Join-Path $work ($scenario + ' com espacos')
    $command = "& '$($script.Replace("'","''"))' -DatabaseHost aws-1-test.pooler.supabase.com -DatabaseUser postgres.testref -BackupDirectory '$($output.Replace("'","''"))' -PostgresBin '$($bin.Replace("'","''"))' -NonInteractive -Password (New-Object Security.SecureString)"
    # Senha ficticia para o executavel controlado, nunca usada em rede.
    $command = $command.Replace('(New-Object Security.SecureString)',"(ConvertTo-SecureString '$($fixturePassword.Replace("'","''"))' -AsPlainText -Force)")
    if ($scenario -eq 'test_only') { $command += ' -ConnectionTestOnly' }
    $p = Start-Process -FilePath $engine -ArgumentList @('-NoProfile','-NonInteractive','-EncodedCommand',[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))) -WindowStyle Hidden -Wait -PassThru -RedirectStandardOutput (Join-Path $work ($scenario+'.out')) -RedirectStandardError (Join-Path $work ($scenario+'.err'))
    $files = @(Get-ChildItem -LiteralPath $output -Filter '*.dump')
    if ($scenario -eq 'test_only') {
      $connectionReport = Get-Content -LiteralPath (Get-ChildItem -LiteralPath $output -Filter '*.json' | Select-Object -First 1).FullName -Raw | ConvertFrom-Json
      if ($p.ExitCode -or $files.Count -or $connectionReport.status -ne 'CONEXAO_VALIDADA' -or $connectionReport.session_probe.default_read_only -ne 'off' -or $connectionReport.connection.read_only -ne 'on') { throw 'Teste isolado de conexao falhou.' }
    } elseif ($scenario -eq 'success') {
      if ($p.ExitCode -ne 0 -or $files.Count -ne 1) { throw "Cenario success falhou: $work" }
      $report=Get-Content -LiteralPath ([IO.Path]::ChangeExtension($files[0].FullName,'.json')) -Raw | ConvertFrom-Json
      if ($report.status -ne 'VALIDADO' -or $report.table_count_verified -ne 1) { throw 'Relatorio incorreto.' }
      $again=Start-Process -FilePath $engine -ArgumentList @('-NoProfile','-NonInteractive','-EncodedCommand',[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))) -WindowStyle Hidden -Wait -PassThru -RedirectStandardOutput (Join-Path $work 'second.out') -RedirectStandardError (Join-Path $work 'second.err')
      if ($again.ExitCode -or @(Get-ChildItem -LiteralPath $output -Filter '*.dump').Count -ne 2) { throw 'Sobrescrita ou segunda execucao falhou.' }
    } elseif ($p.ExitCode -eq 0 -or $files.Count) { throw "Cenario $scenario aceitou backup invalido." }
    if ($scenario -eq 'auth') {
        $failedReport = Get-Content -LiteralPath (Get-ChildItem -LiteralPath $output -Filter 'NortFood-backup-*.json' | Select-Object -First 1).FullName -Raw | ConvertFrom-Json
        if ($failedReport.status -ne 'FALHOU' -or $failedReport.stage -ne 'AUTENTICACAO_E_VERSAO' -or $failedReport.error -notmatch 'password authentication failed' -or $failedReport.parameters.user -ne 'postgres.testref' -or $failedReport.parameters.sslmode -ne 'require') { throw 'Diagnostico persistente de autenticacao incorreto.' }
    }
    if ($scenario -in @('unsafe','wrong_database','sql_error')) {
      $failure = Get-Content -LiteralPath (Get-ChildItem -LiteralPath $output -Filter '*.json' | Select-Object -First 1).FullName -Raw | ConvertFrom-Json
      if ($scenario -eq 'sql_error' -and $failure.error -notmatch 'ERROR: permission denied for view pg_stat_ssl') { throw 'Erro original SQL foi perdido.' }
      if ($scenario -ne 'sql_error' -and (-not $failure.connection -or $failure.session_probe.default_read_only -ne 'off')) { throw 'Diagnostico da conexao foi perdido.' }
    }
    if ((Get-Content -LiteralPath (Join-Path $work ($scenario+'.out')),(Join-Path $work ($scenario+'.err')) -Raw) -match 'fixture-only') { throw 'Senha vazou no diagnostico.' }
    Write-Output "PASS: $scenario"
 }
 Write-Output "Testes controlados OK. Nao equivalem a backup real. Evidencias: $work"
} finally { foreach($key in @('NF_BACKUP_SCENARIO','NF_BACKUP_EXPECTED_PASSWORD','PGSERVICE','PGUSER','PGSSLMODE')) { Remove-Item ('Env:'+ $key) -ErrorAction SilentlyContinue } }
