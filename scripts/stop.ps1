param([string]$DataDirectory = (Join-Path $env:LOCALAPPDATA 'ME-Estoque/data'))
$ErrorActionPreference = 'Stop'
$OutputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$statePath = Join-Path $DataDirectory 'runtime-instance.json'
if (-not (Test-Path -LiteralPath $statePath)) { Write-Output 'Nenhuma instância registrada nesta pasta.'; return }
$lock = [IO.File]::Open((Join-Path $DataDirectory 'launcher.lock'), [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
try {
    $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    try { $health = Invoke-RestMethod -Uri "http://127.0.0.1:$($state.port)/api/v1/health" -TimeoutSec 2 } catch { Write-Output 'Instância não está respondendo; nenhum processo foi encerrado.'; return }
    if ($health.app -ne 'me-estoque' -or $health.instanceId -ne $state.instanceId) { throw 'A porta pertence a outra instância. Nenhum processo foi encerrado.' }
    $ownedProcess = Get-Process -Id $state.pid -ErrorAction Stop
    $expectedNode = [IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $PSScriptRoot) 'tools/runtime/node-v24.22.2-win-x64/node.exe'))
    if ($ownedProcess.Path -ne $expectedNode) { throw 'Processo não corresponde ao runtime local. Encerramento recusado.' }
    $origin = "http://127.0.0.1:$($state.port)"
    $session = Invoke-RestMethod -Uri "$origin/api/v1/session" -SessionVariable localSession -TimeoutSec 3
    Invoke-RestMethod -Uri "$origin/api/v1/shutdown" -Method Post -WebSession $localSession -ContentType 'application/json' -Body '{}' -Headers @{Origin=$origin;'x-csrf-token'=$session.csrfToken} -TimeoutSec 5 | Out-Null
    if (-not $ownedProcess.WaitForExit(10000)) { throw 'Encerramento ainda em andamento. Nenhum encerramento forçado foi realizado.' }
    Write-Output 'ME Estoque encerrado. Banco e backups preservados.'
} finally { $lock.Dispose() }
