# Executa npm com o runtime local fixado, sem modificar PATH global.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot 'tools/runtime/node-v24.22.2-win-x64'
$previousPath = $env:PATH
try {
    $env:PATH = $runtimeDir + ';' + $env:PATH
    Push-Location $projectRoot
    & (Join-Path $runtimeDir 'node.exe') (Join-Path $runtimeDir 'node_modules/npm/bin/npm-cli.js') @args
    $result = $LASTEXITCODE
} finally {
    Pop-Location
    $env:PATH = $previousPath
}
exit $result
