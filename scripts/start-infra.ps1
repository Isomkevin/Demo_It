# Start PostgreSQL + Redis for local development (requires Docker Desktop)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "Starting Postgres + Redis via Docker Compose..." -ForegroundColor Cyan

$dockerRunning = $false
try {
  docker info 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) { $dockerRunning = $true }
} catch {
  $dockerRunning = $false
}

if (-not $dockerRunning) {
  Write-Host ""
  Write-Host "Docker is not running." -ForegroundColor Yellow
  Write-Host "  1. Open Docker Desktop and wait until it shows 'Running'"
  Write-Host "  2. Run this script again: pnpm infra:up"
  Write-Host ""
  $dd = "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe"
  if (Test-Path $dd) {
    $open = Read-Host "Start Docker Desktop now? (y/n)"
    if ($open -eq "y") {
      Start-Process $dd
      Write-Host "Waiting 45s for Docker engine..." -ForegroundColor Gray
      Start-Sleep -Seconds 45
    } else {
      exit 1
    }
  } else {
    exit 1
  }
}

Set-Location $Root
docker compose up -d postgres redis
if ($LASTEXITCODE -ne 0) {
  Write-Host "docker compose failed. Is Docker Desktop fully started?" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Postgres: localhost:5432  (db: demo_copilot)" -ForegroundColor Green
Write-Host "Redis:    localhost:6379" -ForegroundColor Green
Write-Host ""
Write-Host "Next: pnpm db:push   (if first time)" -ForegroundColor Cyan
Write-Host "      pnpm dev" -ForegroundColor Cyan
