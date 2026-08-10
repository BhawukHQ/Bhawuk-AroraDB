# AroraDB v4.0 RBAC Authorization & Audit Trail Verification Script

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "      AroraDB v4.0 Authentication & Audit Demo    " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Start AroraDB server on port 9090 with a temporary data directory
Write-Host "`n1. Starting AroraDB server..." -ForegroundColor Green
$dbProcess = Start-Process .\aroradb.exe -ArgumentList "-port 9090 -dir .\data-demo-auth" -NoNewWindow -PassThru
Start-Sleep -Seconds 2

try {
    # 2. Login as 'dev' (Role: user_db - Database User)
    Write-Host "`n2. Logging in as 'dev' (Database User)..." -ForegroundColor Green
    $loginPayload = @{ username = "dev"; password = "dev" + "123" } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Uri "http://localhost:9090/api/auth/login" -Method Post -Body $loginPayload -ContentType "application/json"
    $devToken = $loginRes.token
    Write-Host "Dev Token acquired: $devToken" -ForegroundColor Cyan
    Write-Host "Resolved role: $($loginRes.role)" -ForegroundColor Yellow

    # 3. Attempt a CREATE TABLE as 'dev' -> Expected to fail with 403 Forbidden
    Write-Host "`n3. Attempting CREATE TABLE as 'dev'..." -ForegroundColor Green
    $createPayload = @{ query = "CREATE TABLE forbidden_test (id TEXT)" } | ConvertTo-Json
    try {
        $res = Invoke-RestMethod -Uri "http://localhost:9090/api/sql" -Method Post -Body $createPayload -ContentType "application/json" -Headers @{"X-Arora-Token" = $devToken}
        Write-Host "ERROR: Query succeeded but should have failed!" -ForegroundColor Red
    } catch {
        Write-Host "Query failed as expected (HTTP status: $($_.Exception.Response.StatusCode.value__))" -ForegroundColor Green
        $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Server Response Error: $($errorBody.error)" -ForegroundColor Yellow
    }

    # 4. Login as 'owner' (Role: admin_proj - Project Admin)
    Write-Host "`n4. Logging in as 'owner' (Project Admin)..." -ForegroundColor Green
    $adminPayload = @{ username = "owner"; password = "admin" + "123" } | ConvertTo-Json
    $adminRes = Invoke-RestMethod -Uri "http://localhost:9090/api/auth/login" -Method Post -Body $adminPayload -ContentType "application/json"
    $adminToken = $adminRes.token
    Write-Host "Admin Token acquired: $adminToken" -ForegroundColor Cyan

    # 5. Execute CREATE TABLE as 'owner' -> Expected to succeed
    Write-Host "`n5. Executing CREATE TABLE as 'owner'..." -ForegroundColor Green
    $createPayload2 = @{ query = "CREATE TABLE users (id TEXT, name TEXT)" } | ConvertTo-Json
    $res2 = Invoke-RestMethod -Uri "http://localhost:9090/api/sql" -Method Post -Body $createPayload2 -ContentType "application/json" -Headers @{"X-Arora-Token" = $adminToken}
    Write-Host "Response: $($res2.message)" -ForegroundColor Cyan

    # 6. Retrieve activity audit feed as 'owner'
    Write-Host "`n6. Retrieving project activity audit feed as 'owner'..." -ForegroundColor Green
    $auditLogs = Invoke-RestMethod -Uri "http://localhost:9090/api/admin/audit" -Method Get -Headers @{"X-Arora-Token" = $adminToken}
    $auditLogs | ConvertTo-Json

} catch {
    Write-Host "`nError occurred during demo execution: $_" -ForegroundColor Red
} finally {
    # 7. Shutdown Server
    Write-Host "`n7. Stopping database server process..." -ForegroundColor Green
    Stop-Process -Id $dbProcess.Id -Force
    
    Start-Sleep -Seconds 1
    if (Test-Path .\data-demo-auth) {
        Remove-Item -Recurse -Force .\data-demo-auth
    }
    Write-Host "Demo data cleaned up." -ForegroundColor Cyan
}

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "       RBAC & Audit Demo Complete!                " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
