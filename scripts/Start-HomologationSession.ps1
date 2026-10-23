# Entrada protegida exclusiva da homologacao; nao grava credenciais.
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$result = Join-Path $taskRoot 'test-results\homologation\protected-session.log'
$oldKey = [Environment]::GetEnvironmentVariable('NORTFOOD_TEST_SUPABASE_SERVICE_ROLE_KEY','Process')
$protectedKey = $null
$taskBuffer = [IntPtr]::Zero
$nodeExecutable = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
try {
    Set-Location -LiteralPath $taskRoot
    if (-not (Test-Path -LiteralPath $nodeExecutable)) { $nodeExecutable = (Get-Command node -ErrorAction Stop).Source }
    & $nodeExecutable -e "const c=require('./scripts/homologation-config.cjs').configuration();if(c.url!=='https://zrczgghucwsaxqnyaapk.supabase.co')throw Error('Destino incorreto')"
    if ($LASTEXITCODE -ne 0) { throw 'Configuracao isolada nao confirmada.' }
    Write-Host 'SOMENTE NortFood-Homologacao (zrczgghucwsaxqnyaapk).'
    Write-Host 'No painel API Keys deste projeto, copie a Secret key existente.'
    Write-Host 'Cole abaixo. A entrada fica oculta e nao e gravada. Nao use chave do principal.'
    'AGUARDANDO_ENTRADA_PROTEGIDA' | Set-Content -LiteralPath $result
    $protectedKey = Read-Host 'Secret key de HOMOLOGACAO' -AsSecureString
    if ($protectedKey.Length -lt 40) { throw 'Chave incompleta; nenhum teste iniciado.' }
    $taskBuffer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($protectedKey)
    [Environment]::SetEnvironmentVariable('NORTFOOD_TEST_SUPABASE_SERVICE_ROLE_KEY',[Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskBuffer),'Process')
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskBuffer)
    $taskBuffer = [IntPtr]::Zero
    & $nodeExecutable scripts/homologation-session.cjs --service-fixtures *> $result
    $taskExit = $LASTEXITCODE
    if ($taskExit -ne 0) { throw 'Sessao interrompida. O Codex verificara o log sem credenciais.' }
    Write-Host 'Sessao encerrada. O Codex verificara os resultados.'
} catch {
    'SESSAO_INTERROMPIDA: entrada/configuracao nao concluida.' | Add-Content -LiteralPath $result
    Write-Host $_.Exception.Message -ForegroundColor Red
} finally {
    [Environment]::SetEnvironmentVariable('NORTFOOD_TEST_SUPABASE_SERVICE_ROLE_KEY',$oldKey,'Process')
    if ($taskBuffer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskBuffer) }
    if ($null -ne $protectedKey) { $protectedKey.Dispose() }
}
