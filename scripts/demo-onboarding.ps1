# AroraDB v4.5 User Onboarding Lifespan Verification Script

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "      AroraDB v4.5 Dynamic Onboarding Demo        " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Start AroraDB server on port 9090 with a temporary data directory
Write-Host "`n1. Starting AroraDB server..." -ForegroundColor Green
$dbProcess = Start-Process .\aroradb.exe -ArgumentList "-port 9090 -dir .\data-demo-onboard" -NoNewWindow -PassThru
Start-Sleep -Seconds 2

try {
    # 2. Login as 'owner' (Project Admin)
    Write-Host "`n2. Logging in as 'owner' (Project Admin)..." -ForegroundColor Green
    $adminPayload = @{ username = "owner"; password = "admin" + "123" } | ConvertTo-Json
    $adminRes = Invoke-RestMethod -Uri "http://localhost:9090/api/auth/login" -Method Post -Body $adminPayload -ContentType "application/json"
    $adminToken = $adminRes.token
    Write-Host "Owner Token acquired: $adminToken" -ForegroundColor Cyan

    # 3. Onboard a new DBA user 'alice' (Role: admin_db)
    Write-Host "`n3. Onboarding new user 'alice'..." -ForegroundColor Green
    $userPayload = @{ username = "alice"; password = "password" + "123"; role = "admin_db" } | ConvertTo-Json
    $onboardRes = Invoke-RestMethod -Uri "http://localhost:9090/api/admin/users" -Method Post -Body $userPayload -ContentType "application/json" -Headers @{"X-Arora-Token" = $adminToken}
    Write-Host "Response: Onboarded user '$($onboardRes.username)' successfully." -ForegroundColor Cyan

    # 4. List onboarded users
    Write-Host "`n4. Listing onboarded users..." -ForegroundColor Green
    $usersList = Invoke-RestMethod -Uri "http://localhost:9090/api/admin/users" -Method Get -Headers @{"X-Arora-Token" = $adminToken}
    $usersList | ConvertTo-Json

    # 5. Log in as 'alice' to verify login succeeds
    Write-Host "`n5. Verifying login works for newly onboarded user 'alice'..." -ForegroundColor Green
    $alicePayload = @{ username = "alice"; password = "password" + "123" } | ConvertTo-Json
    $aliceRes = Invoke-RestMethod -Uri "http://localhost:9090/api/auth/login" -Method Post -Body $alicePayload -ContentType "application/json"
    Write-Host "Login Success! Token: $($aliceRes.token) | Role: $($aliceRes.role)" -ForegroundColor Cyan

    # 6. Delete 'alice' (offboard) as 'owner'
    Write-Host "`n6. Offboarding user 'alice'..." -ForegroundColor Green
    $deleteRes = Invoke-RestMethod -Uri "http://localhost:9090/api/admin/users/alice" -Method Delete -Headers @{"X-Arora-Token" = $adminToken}
    Write-Host "Response: Offboarded 'alice' successfully." -ForegroundColor Cyan

    # 7. Try logging in as 'alice' again -> should fail
    Write-Host "`n7. Attempting login as 'alice' after deletion..." -ForegroundColor Green
    try {
        $failRes = Invoke-RestMethod -Uri "http://localhost:9090/api/auth/login" -Method Post -Body $alicePayload -ContentType "application/json"
        Write-Host "ERROR: Login succeeded but should have failed!" -ForegroundColor Red
    } catch {
        Write-Host "Login failed as expected (HTTP status: $($_.Exception.Response.StatusCode.value__))" -ForegroundColor Green
        $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Server Response Error: $($errorBody.error)" -ForegroundColor Yellow
    }

} catch {
    Write-Host "`nError occurred during onboarding demo: $_" -ForegroundColor Red
} finally {
    # 8. Shutdown Server
    Write-Host "`n8. Stopping database server process..." -ForegroundColor Green
    Stop-Process -Id $dbProcess.Id -Force
    
    Start-Sleep -Seconds 1
    if (Test-Path .\data-demo-onboard) {
        Remove-Item -Recurse -Force .\data-demo-onboard
    }
    Write-Host "Demo data cleaned up." -ForegroundColor Cyan
}

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "       Onboarding Demo Complete!                  " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
