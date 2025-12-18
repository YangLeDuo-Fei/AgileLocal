# AgileLocal Manual Portable Version Creator
# No need for electron-builder, uses pre-built code

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "AgileLocal Portable Creator" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Set-Location -Path "d:\softapp\AgileLocal"

if (-not (Test-Path "out\main\index.js")) {
    Write-Host "Error: Please build first with 'npx electron-vite build'" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "Found built code" -ForegroundColor Green

$portableDir = "dist\AgileLocal-Portable"
Write-Host "Creating portable directory..." -ForegroundColor Cyan
Remove-Item $portableDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $portableDir -Force | Out-Null

Write-Host "Copying files..." -ForegroundColor Cyan

Write-Host "  - Copying out directory" -ForegroundColor Gray
Copy-Item -Path "out" -Destination "$portableDir\resources\app" -Recurse -Force

Write-Host "  - Copying database migrations" -ForegroundColor Gray
New-Item -ItemType Directory -Path "$portableDir\resources\app\main\database\migrations" -Force | Out-Null
Copy-Item -Path "src\main\database\migrations\*" -Destination "$portableDir\resources\app\main\database\migrations\" -Force

Write-Host "  - Copying package.json" -ForegroundColor Gray
Copy-Item -Path "package.json" -Destination "$portableDir\resources\app\package.json" -Force

Write-Host "  - Copying node_modules (this may take a few minutes...)" -ForegroundColor Gray
$productionModules = @(
    "better-sqlite3-multiple-ciphers",
    "kysely",
    "bcryptjs",
    "node-schedule",
    "adm-zip",
    "fs-extra",
    "electron-log",
    "@octokit",
    "zod"
)

New-Item -ItemType Directory -Path "$portableDir\resources\app\node_modules" -Force | Out-Null

foreach ($module in $productionModules) {
    if (Test-Path "node_modules\$module") {
        Write-Host "    Copying $module" -ForegroundColor DarkGray
        Copy-Item -Path "node_modules\$module" -Destination "$portableDir\resources\app\node_modules\$module" -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "  - Finding Electron executable" -ForegroundColor Gray
$electronExe = Get-ChildItem -Path "node_modules\electron\dist" -Filter "electron.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1

if ($electronExe) {
    Write-Host "  - Copying Electron runtime" -ForegroundColor Gray
    Copy-Item -Path "$($electronExe.Directory)\*" -Destination $portableDir -Recurse -Force
    
    if (Test-Path "$portableDir\electron.exe") {
        Rename-Item -Path "$portableDir\electron.exe" -NewName "AgileLocal.exe" -Force
    }
} else {
    Write-Host "Error: Cannot find Electron executable" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "  - Creating launch script" -ForegroundColor Gray
$launchScript = @"
@echo off
start "" "%~dp0AgileLocal.exe" %*
"@
Set-Content -Path "$portableDir\Launch-AgileLocal.bat" -Value $launchScript -Encoding ASCII

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "Portable version created successfully!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Location: $portableDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run by:" -ForegroundColor Yellow
Write-Host "  1. Double-click: AgileLocal.exe" -ForegroundColor White
Write-Host "  2. Or run: Launch-AgileLocal.bat" -ForegroundColor White
Write-Host ""

Start-Process explorer.exe -ArgumentList (Resolve-Path $portableDir).Path

pause

