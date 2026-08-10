# AroraDB Quick API Demo Script

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "         AroraDB Quick Demo Script       " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Start AroraDB server on port 9090 with a temporary data directory
Write-Host "`n1. Starting AroraDB server..." -ForegroundColor Green
$dbProcess = Start-Process .\aroradb.exe -ArgumentList "-port 9090 -dir .\data-demo" -NoNewWindow -PassThru
Start-Sleep -Seconds 2

try {
    # 2. Check Health Endpoint
    Write-Host "`n2. Checking database health..." -ForegroundColor Green
    $health = Invoke-RestMethod -Uri "http://localhost:9090/health"
    $health | ConvertTo-Json

    # 3. Store Key-Value Pair
    Write-Host "`n3. Storing a Key-Value pair (Key: 'welcome_message', Value: 'Hello AroraDB!)..." -ForegroundColor Green
    $putKV = Invoke-RestMethod -Uri "http://localhost:9090/api/kv/welcome_message" -Method Post -Body "Hello AroraDB!"
    $putKV | ConvertTo-Json

    # 4. Retrieve Key-Value Pair
    Write-Host "`n4. Retrieving Key-Value pair..." -ForegroundColor Green
    $getKV = Invoke-RestMethod -Uri "http://localhost:9090/api/kv/welcome_message"
    $getKV | ConvertTo-Json

    # 5. Insert JSON Document into Collection
    Write-Host "`n5. Inserting a JSON document into 'users' collection (ID: 'user_101')..." -ForegroundColor Green
    $doc = @{
        name = "Bhawuk Arora"
        role = "Lead DB Designer"
        skills = @("Go", "React", "Systems Engineering")
        active = $true
    } | ConvertTo-Json
    $putDoc = Invoke-RestMethod -Uri "http://localhost:9090/api/documents/users?id=user_101" -Method Post -Body $doc -ContentType "application/json"
    $putDoc | ConvertTo-Json

    # 6. Retrieve Document by ID
    Write-Host "`n6. Retrieving document by ID..." -ForegroundColor Green
    $getDoc = Invoke-RestMethod -Uri "http://localhost:9090/api/documents/users/user_101"
    $getDoc | ConvertTo-Json

    # 7. Query Documents with Field Filtering
    Write-Host "`n7. Querying 'users' collection where role = 'Lead DB Designer'..." -ForegroundColor Green
    $query = @{
        role = "Lead DB Designer"
    } | ConvertTo-Json
    $queryResult = Invoke-RestMethod -Uri "http://localhost:9090/api/documents/users/query" -Method Post -Body $query -ContentType "application/json"
    $queryResult | ConvertTo-Json

    # 8. Fetch Database Telemetry Metrics
    Write-Host "`n8. Querying telemetry and performance metrics..." -ForegroundColor Green
    $metrics = Invoke-RestMethod -Uri "http://localhost:9090/api/metrics"
    $metrics | ConvertTo-Json

} catch {
    Write-Host "`nError occurred during demo execution: $_" -ForegroundColor Red
} finally {
    # 9. Shutdown Server Gracefully
    Write-Host "`n9. Stopping database server process..." -ForegroundColor Green
    Stop-Process -Id $dbProcess.Id -Force
    
    # Clean up temporary demo database files
    Start-Sleep -Seconds 1
    if (Test-Path .\data-demo) {
        Remove-Item -Recurse -Force .\data-demo
    }
    Write-Host "Demo data cleaned up." -ForegroundColor Cyan
}

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "          Demo Complete!                 " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
