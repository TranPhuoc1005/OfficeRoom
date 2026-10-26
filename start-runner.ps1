param (
    [switch]$Pair,
    [switch]$AddFolder
)

$Host.UI.RawUI.WindowTitle = "Pixel Office - Windows Local Runner (Antigravity CLI)"
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   PIXEL OFFICE - WINDOWS LOCAL RUNNER (ANTIGRAVITY CLI)  " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$RunnerDir = Join-Path $PSScriptRoot "runner"
if (-not (Test-Path $RunnerDir)) {
    Write-Host "❌ Khong tim thay thu muc runner tai: $RunnerDir" -ForegroundColor Red
    Pause
    exit 1
}

# Check Node.js
try {
    $nodeVer = & node -v
    Write-Host "• Node.js: $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "❌ Chua cai dat Node.js tren may! Vui long cai dat Node.js v20+ tai https://nodejs.org" -ForegroundColor Red
    Pause
    exit 1
}

# Check agy.exe
$userProfile = $env:USERPROFILE
$geminiAgy = Join-Path $userProfile ".gemini\bin\agy.exe"
$localAppData = [System.Environment]::GetFolderPath('LocalApplicationData')
$localAgy = Join-Path $localAppData "agy\bin\agy.exe"

$agyPath = if (Test-Path $geminiAgy) { $geminiAgy } elseif (Test-Path $localAgy) { $localAgy } else { $null }

if ($agyPath) {
    Write-Host "• Antigravity CLI: $agyPath" -ForegroundColor Green
    $agyDir = Split-Path $agyPath
    if ($env:PATH -notlike "*$agyDir*") {
        $env:PATH = "$agyDir;$env:PATH"
    }
} else {
    Write-Host "⚠️ Khong tim thay agy.exe tai $geminiAgy hoac $localAgy, se su dung PATH he thong neu co." -ForegroundColor Yellow
}

# Check node_modules
$nodeModules = Join-Path $RunnerDir "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "Dang cai dat dependencies cho runner..." -ForegroundColor Yellow
    npm --prefix $RunnerDir install
}

if ($Pair) {
    Write-Host "Khoi chay cong cu ghep noi Runner..." -ForegroundColor Cyan
    npm --prefix $RunnerDir run pair
    exit 0
}

if ($AddFolder) {
    Write-Host "Khoi chay cong cu them thu muc du an..." -ForegroundColor Cyan
    npm --prefix $RunnerDir run add-folder
    exit 0
}

$envFile = Join-Path $RunnerDir ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "⚠️ Chua tim thay file runner/.env!" -ForegroundColor Yellow
    Write-Host "Chuyen sang che do ghep noi tu dong..." -ForegroundColor Cyan
    npm --prefix $RunnerDir run pair
    if (-not (Test-Path $envFile)) {
        Write-Host "❌ Chua hoan tat cau hinh runner/.env" -ForegroundColor Red
        Pause
        exit 1
    }
}

Write-Host "Dang khoi dong Windows Runner..." -ForegroundColor Green
npm --prefix $RunnerDir start
