# Credenciais somente no ambiente deste processo; nao escreve senhas em arquivos.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$names = @('NORTFOOD_TEST_SUPABASE_SERVICE_ROLE_KEY','NORTFOOD_TEST_ADMIN_EMAIL','NORTFOOD_TEST_ADMIN_PASSWORD')
$previous = @{}
function Read-ProtectedValue([string]$Prompt) {
    $protected = Read-Host $Prompt -AsSecureString
    $buffer = [IntPtr]::Zero
    try {
        if ($protected.Length -eq 0) { throw 'Valor vazio. Nenhum teste foi iniciado.' }
        $buffer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($protected)
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($buffer)
    } finally {
        if ($buffer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($buffer) }
        $protected.Dispose()
    }
}
Push-Location -LiteralPath $taskRoot
try {
    Get-Command node -ErrorAction Stop | Out-Null
    # Falha antes dos prompts se o destino estiver ausente ou for producao.
    & node -e "require('./scripts/homologation-config.cjs').configuration()"
    if ($LASTEXITCODE -ne 0) { throw 'Prepare .env.homologacao com URL/chave publica de TESTES e confirmacao de descartavel.' }
    foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name,'Process') }
    [Environment]::SetEnvironmentVariable($names[0],(Read-ProtectedValue 'Chave secreta SOMENTE do projeto de homologacao'),'Process')
    [Environment]::SetEnvironmentVariable($names[1],(Read-Host 'E-mail do administrador EXCLUSIVO de homologacao'),'Process')
    [Environment]::SetEnvironmentVariable($names[2],(Read-ProtectedValue 'Senha do administrador EXCLUSIVO de homologacao'),'Process')
    & node scripts/run-homologation.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Homologacao nao aprovada. Consulte test-results/homologation/resultado.json.' }
} finally {
    foreach ($name in $previous.Keys) { [Environment]::SetEnvironmentVariable($name,$previous[$name],'Process') }
    $previous.Clear()
    Pop-Location
}
