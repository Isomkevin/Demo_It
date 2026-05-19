# Starts the Stripe MCP server using STRIPE_SECRET_KEY from the repo root .env
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root ".env"

if (-not (Test-Path $envFile)) {
  Write-Error "Missing .env at $envFile. Set STRIPE_SECRET_KEY there first."
}

$line = Get-Content $envFile | Where-Object { $_ -match '^\s*STRIPE_SECRET_KEY\s*=' } | Select-Object -First 1
if (-not $line) {
  Write-Error "STRIPE_SECRET_KEY not found in $envFile"
}

$value = ($line -split '=', 2)[1].Trim().Trim('"').Trim("'")
if (-not $value) {
  Write-Error "STRIPE_SECRET_KEY is empty in $envFile"
}

$env:STRIPE_SECRET_KEY = $value
& npx -y @stripe/mcp@latest
