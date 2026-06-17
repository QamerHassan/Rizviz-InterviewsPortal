# Run as Administrator
# Repairs common SQLEXPRESS start failures on this PC

$ErrorActionPreference = "Continue"
Write-Host "=== SQL Server SQLEXPRESS repair helper ===" -ForegroundColor Cyan

$dataPath = "C:\Program Files\Microsoft SQL Server\MSSQL15.SQLEXPRESS\MSSQL\DATA"
$logPath  = "C:\Program Files\Microsoft SQL Server\MSSQL15.SQLEXPRESS\MSSQL\Log"
$sqlAccount = "NT Service\MSSQL`$SQLEXPRESS"

# 1) Fix folder permissions for the SQL service account
foreach ($path in @($dataPath, $logPath)) {
    if (Test-Path $path) {
        Write-Host "Granting permissions on $path ..."
        icacls $path /grant "${sqlAccount}:(OI)(CI)F" /T | Out-Null
    } else {
        Write-Host "Path not found (skip): $path" -ForegroundColor Yellow
    }
}

# 2) Enable Mixed Mode (Windows + SQL login) — LoginMode 2
$regPath = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL15.SQLEXPRESS\MSSQLServer"
if (Test-Path $regPath) {
    Set-ItemProperty -Path $regPath -Name "LoginMode" -Value 2 -Type DWord
    Write-Host "Set LoginMode=2 (Mixed Mode) in registry."
} else {
    Write-Host "Registry path not found: $regPath" -ForegroundColor Yellow
}

# 3) Start SQL Server
Write-Host "Starting MSSQL`$SQLEXPRESS ..."
try {
    Start-Service "MSSQL`$SQLEXPRESS" -ErrorAction Stop
    Start-Sleep -Seconds 5
    $status = (Get-Service "MSSQL`$SQLEXPRESS").Status
    Write-Host "MSSQL`$SQLEXPRESS status: $status" -ForegroundColor $(if ($status -eq 'Running') { 'Green' } else { 'Red' })
} catch {
    Write-Host "FAILED to start SQL Server: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "SQL Server is CRASHING (sqlservr.exe access violation)." -ForegroundColor Red
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Open Settings -> Apps -> SQL Server 2019 Express -> Modify -> Repair"
    Write-Host "  2. Or reinstall SQL Server Express (SQLEXPRESS instance)"
    Write-Host "  3. Check Event Viewer -> Windows Logs -> Application for 'sqlservr.exe' errors"
    Write-Host "  4. Your ERP app will use IN-MEMORY data until SQL is fixed (restart dotnet run)"
    exit 1
}

# 4) Test Windows auth connection
Write-Host ""
Write-Host "Testing Windows authentication ..."
sqlcmd -S ".\SQLEXPRESS" -E -Q "SELECT @@VERSION" -W -h -1

Write-Host ""
Write-Host "Listing databases ..."
sqlcmd -S ".\SQLEXPRESS" -E -Q "SELECT name FROM sys.databases ORDER BY name" -W -h -1

Write-Host ""
Write-Host "If Accounting_System_UAT is missing, attach or restore it in SSMS." -ForegroundColor Yellow
Write-Host "When SQL works, run: cd RizvizERP.API; dotnet ef database update" -ForegroundColor Yellow
