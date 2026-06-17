$body = '{"urduText":"Candidate acha tha, technical skills theek thi"}'
$headers = @{
    "Authorization" = "Bearer db_jwt_mock_token_key_for_Rizviz"
    "Content-Type"  = "application/json"
}
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:5000/api/feedback/enhance" `
        -Method POST -Headers $headers -Body $body -TimeoutSec 30
    Write-Host "SUCCESS:" $resp.Content
} catch {
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "ERROR:" $reader.ReadToEnd()
}
