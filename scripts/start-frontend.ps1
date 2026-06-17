# Run in PowerShell: starts the React website
$frontendPath = Join-Path $PSScriptRoot "..\rizviz-frontend"
Set-Location $frontendPath

Write-Host "Starting website at http://localhost:3000 ..." -ForegroundColor Green
Write-Host "Leave this window OPEN." -ForegroundColor Cyan
Write-Host ""

npm start
