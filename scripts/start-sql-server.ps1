# Run as Administrator — delegates to full repair script
Set-ExecutionPolicy -Scope Process Bypass -Force
& "$PSScriptRoot\repair-sql-server.ps1"
