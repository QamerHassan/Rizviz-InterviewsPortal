param(
    [string]$TargetUrl = "https://rizviz-interviewsportal-production.up.railway.app/api/interviews/sync-upload",
    [string]$FilePath = "Interview Software.xlsx"
)

# Resolve absolute path
$absolutePath = Resolve-Path $FilePath -ErrorAction SilentlyContinue
if (-not $absolutePath) {
    # Try parent directory if run from scripts/ folder
    $absolutePath = Resolve-Path "..\$FilePath" -ErrorAction SilentlyContinue
}

if (-not $absolutePath) {
    Write-Host "Error: Excel file '$FilePath' not found." -ForegroundColor Red
    exit 1
}

$absolutePath = $absolutePath.Path
Write-Host "Monitoring file: $absolutePath" -ForegroundColor Cyan
Write-Host "Uploading updates to: $TargetUrl" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop watching.`n" -ForegroundColor Yellow

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = [System.IO.Path]::GetDirectoryName($absolutePath)
$watcher.Filter = [System.IO.Path]::GetFileName($absolutePath)
$watcher.EnableRaisingEvents = $true

# Debounce tracker
$lastEventTime = [DateTime]::MinValue

Register-ObjectEvent $watcher "Changed" -Action {
    $now = [DateTime]::Now
    # Debounce: Excel triggers multiple events within a short window
    if (($now - $global:lastEventTime).TotalMilliseconds -gt 2000) {
        $global:lastEventTime = $now
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Change detected! Preparing upload..." -ForegroundColor Green
        
        # Wait a brief moment to allow Excel to release the file handle
        Start-Sleep -Milliseconds 500

        try {
            # Build Form-Data request
            $fileBytes = [System.IO.File]::ReadAllBytes($Event.SourceEventArgs.FullPath)
            $fileName = [System.IO.Path]::GetFileName($Event.SourceEventArgs.FullPath)
            
            $LF = "`r`n"
            $boundary = "----WebKitFormBoundary" + [Guid]::NewGuid().ToString("N")
            
            $bodyLines = (
                "--$boundary",
                "Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`"",
                "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "",
                [System.Text.Encoding]::GetEncoding("ISO-8859-1").GetString($fileBytes),
                "--$boundary--",
                ""
            ) -join $LF

            $bodyBytes = [System.Text.Encoding]::GetEncoding("ISO-8859-1").GetBytes($bodyLines)

            $headers = @{
                "Content-Type" = "multipart/form-data; boundary=$boundary"
            }

            Write-Host "Uploading file..." -ForegroundColor Cyan
            $response = Invoke-RestMethod -Uri $Event.MessageData.TargetUrl -Method Post -Headers $headers -Body $bodyBytes -ContentType "multipart/form-data; boundary=$boundary" -TimeoutSec 30
            
            Write-Host "Sync successful!" -ForegroundColor Green
            Write-Host "Message: $($response.message)" -ForegroundColor Gray
            Write-Host "Inserted: $($response.insertedRows) | Updated: $($response.updatedRows) | Unchanged: $($response.unchangedRows)" -ForegroundColor Gray
            if ($response.changes -and $response.changes.Count -gt 0) {
                Write-Host "Changes dispatched:" -ForegroundColor Green
                foreach ($change in $response.changes) {
                    Write-Host " - [$($change.changeType)] $($change.intervieweeName) @ $($change.companyName): $($change.summary)" -ForegroundColor White
                }
            }
        }
        catch {
            Write-Host "Upload failed: $_" -ForegroundColor Red
            if ($_.Exception.Response) {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $errBody = $reader.ReadToEnd()
                Write-Host "Error details: $errBody" -ForegroundColor Red
            }
        }
        Write-Host "`nWaiting for next change..." -ForegroundColor Yellow
    }
} -MessageData @{ TargetUrl = $TargetUrl }

# Keep script running
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
finally {
    $watcher.Dispose()
    Unregister-Event -SourceIdentifier "Changed" -ErrorAction SilentlyContinue
}
