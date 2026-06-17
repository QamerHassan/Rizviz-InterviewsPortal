# Double-click or run in PowerShell: stops old API, checks SQL, then starts a fresh one.
$ErrorActionPreference = "SilentlyContinue"

Write-Host "Stopping any old API on port 5000..." -ForegroundColor Yellow
Stop-Process -Name "RizvizERP.API" -Force
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
Start-Sleep -Seconds 2

$apiPath = Join-Path $PSScriptRoot "..\RizvizERP.API"
Set-Location $apiPath

# Read connection string from appsettings.Development.json (fallback appsettings.json)
$settingsFile = Join-Path $apiPath "appsettings.Development.json"
if (-not (Test-Path $settingsFile)) { $settingsFile = Join-Path $apiPath "appsettings.json" }
$conn = $null
if (Test-Path $settingsFile) {
    $json = Get-Content $settingsFile -Raw | ConvertFrom-Json
    $conn = $json.ConnectionStrings.DefaultConnection
}

if ($conn) {
    Write-Host "Checking SQL Server..." -ForegroundColor Cyan
    $builder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder $conn
    $server = $builder.DataSource
    $db = $builder.InitialCatalog
    $sqlArgs = @("-S", $server, "-Q", "SELECT 1")
    if ($builder.IntegratedSecurity) {
        $sqlArgs += "-E"
    } else {
        $sqlArgs += @("-U", $builder.UserID, "-P", $builder.Password)
    }
    $sqlOk = & sqlcmd @sqlArgs 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "WARNING: Cannot reach SQL Server ($server)." -ForegroundColor Red
        Write-Host "  Start 'SQL Server (SQLEXPRESS)' in services.msc, then run this script again." -ForegroundColor Red
        Write-Host "  API calls will return 500 until SQL is available." -ForegroundColor Red
        Write-Host ""
    } else {
        Write-Host "SQL OK ($server / $db)" -ForegroundColor Green
    }
}

Write-Host "Starting API at http://localhost:5000 ..." -ForegroundColor Green
Write-Host "Leave this window OPEN. Press Ctrl+C to stop." -ForegroundColor Cyan
Write-Host ""

dotnet run
