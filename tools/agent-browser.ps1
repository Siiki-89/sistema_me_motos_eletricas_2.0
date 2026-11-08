# Usa somente o binário fixado no lockfile deste projeto.
$binary = Join-Path $PSScriptRoot 'node_modules\agent-browser\bin\agent-browser-win32-x64.exe'
if (-not (Test-Path -LiteralPath $binary)) { throw 'Agent Browser ausente. Consulte docs/ambiente.md.' }
& $binary @args
exit $LASTEXITCODE
