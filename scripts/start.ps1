param(
    [ValidateRange(1,65535)][int]$Port = 4317,
    [string]$DataDirectory = (Join-Path $env:LOCALAPPDATA 'ME-Estoque/data'),
    [switch]$NoBrowser
)
$ErrorActionPreference = 'Stop'
$OutputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$projectRoot = Split-Path -Parent $PSScriptRoot
$node = Join-Path $projectRoot 'tools/runtime/node-v24.22.2-win-x64/node.exe'
$entry = Join-Path $projectRoot 'dist/server/main.js'
if (-not (Test-Path -LiteralPath $node) -or -not (Test-Path -LiteralPath $entry)) {
    throw 'Runtime ou build ausente. Execute scripts/npm.ps1 run build. Consulte docs/operacao-local.md.'
}
if (-not [IO.Path]::IsPathFullyQualified($DataDirectory) -or $DataDirectory.StartsWith('\\')) {
    throw 'Informe uma pasta absoluta neste computador, fora de pastas de rede.'
}
$dataPath = [IO.Path]::GetFullPath($DataDirectory)
New-Item -ItemType Directory -Force -Path $dataPath | Out-Null
$statePath = Join-Path $dataPath 'runtime-instance.json'
$lock = [IO.File]::Open((Join-Path $dataPath 'launcher.lock'), [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
$url = "http://127.0.0.1:$Port"
try {
    if (Test-Path -LiteralPath $statePath) {
        $previous = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
        $running = $null
        try { $running = Invoke-RestMethod -Uri "http://127.0.0.1:$($previous.port)/api/v1/health" -TimeoutSec 2 } catch { }
        if ($running -and $running.app -eq 'me-estoque' -and $running.instanceId -eq $previous.instanceId) {
            Write-Output "ME Estoque já está ativo em http://127.0.0.1:$($previous.port)"
            if (-not $NoBrowser) { Start-Process "http://127.0.0.1:$($previous.port)" }
            return
        }
    }
    $probe = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
    try { $probe.Start() } catch { throw "A porta $Port está ocupada. Nenhum processo foi encerrado." } finally { $probe.Stop() }
    $instance = [guid]::NewGuid().ToString()
    $logDir = Join-Path $dataPath 'logs'
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    $saved = @{}
    foreach ($name in @('ME_DATA_DIR','ME_PORT','ME_INSTANCE_ID','NODE_ENV')) { $saved[$name] = [Environment]::GetEnvironmentVariable($name,'Process') }
    try {
        $env:ME_DATA_DIR = $dataPath
        $env:ME_PORT = [string]$Port
        $env:ME_INSTANCE_ID = $instance
        $env:NODE_ENV = 'production'
        $child = Start-Process -FilePath $node -ArgumentList ('"' + $entry + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir "$instance.out.log") -RedirectStandardError (Join-Path $logDir "$instance.err.log")
    } finally { foreach ($name in $saved.Keys) { [Environment]::SetEnvironmentVariable($name,$saved[$name],'Process') } }
    $ready = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        if ($child.HasExited) { throw "O sistema não iniciou. Consulte o registro local $instance.err.log na pasta de dados." }
        try {
            $health = Invoke-RestMethod -Uri "$url/api/v1/health" -TimeoutSec 1
            if ($health.app -eq 'me-estoque' -and $health.instanceId -eq $instance) { $ready = $true; break }
        } catch { }
        Start-Sleep -Milliseconds 150
    }
    if (-not $ready) {
        # Only the process created in this invocation is eligible for cleanup.
        if (-not $child.HasExited) { $child.Kill() }
        throw 'O sistema não respondeu a tempo. Consulte os registros locais; nenhum banco foi substituído.'
    }
    if (Test-Path -LiteralPath $statePath) { Copy-Item -LiteralPath $statePath -Destination (Join-Path $dataPath "$instance.previous-instance.json") }
    @{pid=$child.Id;port=$Port;instanceId=$instance;startedAt=[DateTimeOffset]::Now.ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding utf8
    Write-Output "ME Estoque iniciado em $url"
    if (-not $NoBrowser) { Start-Process $url }
} finally { $lock.Dispose() }
