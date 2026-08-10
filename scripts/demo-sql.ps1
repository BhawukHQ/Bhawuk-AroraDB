# AroraDB v3.0 SQL Engine Verification Demo Script

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "      AroraDB v3.0 Custom SQL Query Engine Demo   " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Start AroraDB server on port 9090 with a temporary data directory
Write-Host "`n1. Starting AroraDB server..." -ForegroundColor Green
$dbProcess = Start-Process .\aroradb.exe -ArgumentList "-port 9090 -dir .\data-demo-sql" -NoNewWindow -PassThru
Start-Sleep -Seconds 2

try {
    # 2. CREATE TABLE
    Write-Host "`n2. Executing: CREATE TABLE users (id TEXT, name TEXT, age INT)..." -ForegroundColor Green
    $body1 = @{ query = "CREATE TABLE users (id TEXT, name TEXT, age INT)" } | ConvertTo-Json
    $res1 = Invoke-RestMethod -Uri "http://localhost:9090/api/sql" -Method Post -Body $body1 -ContentType "application/json"
    $res1 | ConvertTo-Json

    # 3. INSERT INTO users
    Write-Host "`n3. Executing: INSERT INTO users VALUES ('usr_1', 'Alice', 32)..." -ForegroundColor Green
    $body2 = @{ query = "INSERT INTO users VALUES ('usr_1', 'Alice', 32)" } | ConvertTo-Json
    $res2 = Invoke-RestMethod -Uri "http://localhost:9090/api/sql" -Method Post -Body $body2 -ContentType "application/json"
    $res2 | ConvertTo-Json

    Write-Host "`nExecuting: INSERT INTO users VALUES ('usr_2', 'Bob', 24)..." -ForegroundColor Green
    $body3 = @{ query = "INSERT INTO users VALUES ('usr_2', 'Bob', 24)" } | ConvertTo-Json
    $res3 = Invoke-RestMethod -Uri "http://localhost:9090/api/sql" -Method Post -Body $body3 -ContentType "application/json"
    $res3 | ConvertTo-Json

    Write-Host "`nExecuting: INSERT INTO users VALUES ('usr_3', 'Charlie', 28)..." -ForegroundColor Green
    $body4 = @{ query = "INSERT INTO users VALUES ('usr_3', 'Charlie', 28)" } | ConvertTo-Json
    $res4 = Invoke-RestMethod -Uri "http://localhost:9090/api/sql" -Method Post -Body $body4 -ContentType "application/json"
    $res4 | ConvertTo-Json

    # 4. SELECT * FROM users
    Write-Host "`n4. Executing: SELECT * FROM users..." -ForegroundColor Green
    $bodySel1 = @{ query = "SELECT * FROM users" } | ConvertTo-Json
    $resSel1 = Invoke-RestMethod -Uri "http://localhost:9090/api/sql" -Method Post -Body $bodySel1 -ContentType "application/json"
    $resSel1 | ConvertTo-Json

    # 5. SELECT name, age FROM users WHERE age >= 28
    Write-Host "`n5. Executing filter query: SELECT name, age FROM users WHERE age >= 28..." -ForegroundColor Green
    $bodySel2 = @{ query = "SELECT name, age FROM users WHERE age >= 28" } | ConvertTo-Json
    $resSel2 = Invoke-RestMethod -Uri "http://localhost:9090/api/sql" -Method Post -Body $bodySel2 -ContentType "application/json"
    $resSel2 | ConvertTo-Json

    # 6. Fetch Tables Schemas metadata list
    Write-Host "`n6. Checking table schema metadata API endpoint..." -ForegroundColor Green
    $tables = Invoke-RestMethod -Uri "http://localhost:9090/api/sql/tables"
    $tables | ConvertTo-Json

} catch {
    Write-Host "`nError occurred during SQL demo execution: $_" -ForegroundColor Red
} finally {
    # 7. Shutdown Server
    Write-Host "`n7. Stopping database server process..." -ForegroundColor Green
    Stop-Process -Id $dbProcess.Id -Force
    
    Start-Sleep -Seconds 1
    if (Test-Path .\data-demo-sql) {
        Remove-Item -Recurse -Force .\data-demo-sql
    }
    Write-Host "Demo data cleaned up." -ForegroundColor Cyan
}

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "         SQL Demo Complete!                       " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
