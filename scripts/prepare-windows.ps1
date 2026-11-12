# Prepara uma nova cópia do projeto no Windows, sem modificar o Node global nem o banco de dados.
param([switch]$SkipDependencyInstall)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$version = 'v24.22.2'
$folder = 'node-v24.22.2-win-x64'
$runtimeRoot = Join-Path $projectRoot 'tools/runtime'
$runtimeDir = Join-Path $runtimeRoot $folder
$runtimeExecutable = Join-Path $runtimeDir 'node.exe'
$expectedSha256 = 'ca1bff5d8ead13c9f2ea404a176db46bd430704d5b5113734049fa365e7799e2'
if (-not (Test-Path -LiteralPath $runtimeExecutable)) {
    New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
    $temporary = Join-Path ([IO.Path]::GetTempPath()) ("me-runtime-" + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $temporary | Out-Null
    try {
        $archive = Join-Path $temporary "$folder.zip"
        $url = "https://nodejs.org/dist/$version/$folder.zip"
        Write-Output "Baixando Node.js oficial $version..."
        Invoke-WebRequest -Uri $url -OutFile $archive
        $actual = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actual -ne $expectedSha256) {
            throw "O SHA-256 do runtime não corresponde ao valor esperado. Nenhum arquivo será instalado."
        }
        Expand-Archive -LiteralPath $archive -DestinationPath $temporary
        if (-not (Test-Path -LiteralPath (Join-Path $temporary "$folder/node.exe"))) {
            throw "O arquivo oficial não contém node.exe."
        }
        if (Test-Path -LiteralPath $runtimeDir) {
            throw "Já existe um diretório parcial de runtime. Verifique-o manualmente, sem sobrescrever arquivos."
        }
        Move-Item -LiteralPath (Join-Path $temporary $folder) -Destination $runtimeDir
    } finally {
        if (Test-Path -LiteralPath $temporary) {
            Remove-Item -LiteralPath $temporary -Recurse -Force
        }
    }
}
if (-not (Test-Path -LiteralPath $runtimeExecutable)) {
    throw 'Node.js local não encontrado.'
}
try {
    Push-Location $projectRoot
    if (-not $SkipDependencyInstall -or -not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules'))) {
        Write-Output 'Instalando dependências fixadas por package-lock.json...'
        & (Join-Path $PSScriptRoot 'npm.ps1') ci
        if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar dependências.' }
    }
    Write-Output 'Compilando e verificando TypeScript...'
    & (Join-Path $PSScriptRoot 'npm.ps1') run build
    if ($LASTEXITCODE -ne 0) { throw 'Falha no build. Não inicie o sistema.' }
    Write-Output 'Preparação concluída. Para a primeira instalação, consulte README.md.'
} finally {
    Pop-Location
}
