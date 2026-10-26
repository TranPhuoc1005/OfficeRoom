# Pixel Office Launch Script
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   Khoi chay Pixel Office (Antigravity Local)    " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan

$root = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

# 1. Start Server in background
$serverJob = Start-Process powershell -WorkingDirectory $root -ArgumentList "-NoExit", "-Command", "cd server; Write-Host '--- Backend Server (Port 3001) ---' -ForegroundColor Yellow; npm run dev" -PassThru

# 2. Wait 4 seconds for server to bind and compile
Start-Sleep -Seconds 4

# 3. Start Client in background
$clientJob = Start-Process powershell -WorkingDirectory $root -ArgumentList "-NoExit", "-Command", "cd client; Write-Host '--- Frontend Client (Port 5173) ---' -ForegroundColor Cyan; npm run dev" -PassThru

# 4. Open browser
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"

Write-Host "App da khoi chay tai http://localhost:5173" -ForegroundColor Green
