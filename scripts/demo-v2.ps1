# AroraDB v2.0 Advanced API & Operator Demo Script

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "      AroraDB v2.0 Advanced Query & Restore Demo  " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Start AroraDB server on port 9090 with a temporary data directory
Write-Host "`n1. Starting AroraDB server..." -ForegroundColor Green
$dbProcess = Start-Process .\aroradb.exe -ArgumentList "-port 9090 -dir .\data-demo-v2" -NoNewWindow -PassThru
Start-Sleep -Seconds 2

try {
    # 2. Insert test documents into collection 'devs'
    Write-Host "`n2. Populating 'devs' collection..." -ForegroundColor Green
    
    $dev1 = @{ name = "Alice"; role = "Lead Engineer"; age = 32; skills = @("Go", "Docker") } | ConvertTo-Json
    $dev2 = @{ name = "Bob"; role = "QA Engineer"; age = 24; skills = @("Python", "Selenium") } | ConvertTo-Json
    $dev3 = @{ name = "Charlie"; role = "Frontend Dev"; age = 28; skills = @("React", "TypeScript") } | ConvertTo-Json

    $res1 = Invoke-RestMethod -Uri "http://localhost:9090/api/documents/devs?id=alice" -Method Post -Body $dev1 -ContentType "application/json"
    $res2 = Invoke-RestMethod -Uri "http://localhost:9090/api/documents/devs?id=bob" -Method Post -Body $dev2 -ContentType "application/json"
    $res3 = Invoke-RestMethod -Uri "http://localhost:9090/api/documents/devs?id=charlie" -Method Post -Body $dev3 -ContentType "application/json"
    
    Write-Host "Inserted Alice, Bob, and Charlie into 'devs' collection." -ForegroundColor Cyan

    # 3. Test Comparison Operator ($gt)
    Write-Host "`n3. Querying: age > 25 (MongoDB operator '$gt')..." -ForegroundColor Green
    $query1 = @{
        age = @{ '$gt' = 25 }
    } | ConvertTo-Json
    $resQuery1 = Invoke-RestMethod -Uri "http://localhost:9090/api/documents/devs/query" -Method Post -Body $query1 -ContentType "application/json"
    $resQuery1 | ConvertTo-Json

    # 4. Test Contains Operator ($contains)
    Write-Host "`n4. Querying: skills contains 'React' (operator '$contains')..." -ForegroundColor Green
    $query2 = @{
        skills = @{ '$contains' = "React" }
    } | ConvertTo-Json
    $resQuery2 = Invoke-RestMethod -Uri "http://localhost:9090/api/documents/devs/query" -Method Post -Body $query2 -ContentType "application/json"
    $resQuery2 | ConvertTo-Json

    # 5. Test In Array Operator ($in)
    Write-Host "`n5. Querying: role is in ['QA Engineer', 'Frontend Dev'] (operator '$in')..." -ForegroundColor Green
    $query3 = @{
        role = @{ '$in' = @("QA Engineer", "Frontend Dev") }
    } | ConvertTo-Json
    $resQuery3 = Invoke-RestMethod -Uri "http://localhost:9090/api/documents/devs/query" -Method Post -Body $query3 -ContentType "application/json"
    $resQuery3 | ConvertTo-Json

    # 6. Check System Logs Endpoint
    Write-Host "`n6. Querying system logs console endpoint..." -ForegroundColor Green
    $logs = Invoke-RestMethod -Uri "http://localhost:9090/api/logs"
    Write-Host "Total system log entries retrieved: $($logs.Count)" -ForegroundColor Cyan
    Write-Host "Last log entry: $($logs[-1].message)" -ForegroundColor Yellow

} catch {
    Write-Host "`nError occurred during demo execution: $_" -ForegroundColor Red
} finally {
    # 7. Shutdown Server
    Write-Host "`n7. Stopping database server process..." -ForegroundColor Green
    Stop-Process -Id $dbProcess.Id -Force
    
    # Clean up temporary database files
    Start-Sleep -Seconds 1
    if (Test-Path .\data-demo-v2) {
        Remove-Item -Recurse -Force .\data-demo-v2
    }
    Write-Host "Demo data cleaned up." -ForegroundColor Cyan
}

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "           Demo v2.0 Complete!                    " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
