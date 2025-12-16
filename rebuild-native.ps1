# Rebuild native modules script - Use node-gyp directly
# VS Build Tools 2022 (installed on D: drive)

Write-Host "Starting native module rebuild..." -ForegroundColor Green
Write-Host ""

# Set environment variables for node-gyp
# VS Build Tools 2022 is installed on D: drive
$env:GYP_MSVS_VERSION = "2022"
$env:VCINSTALLDIR = "D:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC"
$env:VSINSTALLDIR = "D:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools"
$env:npm_config_msvs_version = "2022"

Write-Host "Environment variables set:" -ForegroundColor Yellow
Write-Host "  GYP_MSVS_VERSION = $env:GYP_MSVS_VERSION"
Write-Host "  VCINSTALLDIR = $env:VCINSTALLDIR"
Write-Host "  VSINSTALLDIR = $env:VSINSTALLDIR"
Write-Host ""

# Clean build artifacts
Write-Host "Cleaning build artifacts..." -ForegroundColor Yellow
npm run clean:native

Write-Host ""
Write-Host "Starting native module rebuild using node-gyp directly..." -ForegroundColor Yellow
Write-Host ""

# Get Electron version from package.json
$packageJsonContent = Get-Content "package.json" -Raw | ConvertFrom-Json
$electronVersionRaw = $packageJsonContent.dependencies.electron
# Remove ^ or ~ prefix if present
$electronVersion = $electronVersionRaw -replace '[\^~]', ''

Write-Host "Electron version: $electronVersion" -ForegroundColor Yellow
Write-Host ""

# Rebuild better-sqlite3-multiple-ciphers
Write-Host "Rebuilding better-sqlite3-multiple-ciphers..." -ForegroundColor Cyan
Push-Location "node_modules\better-sqlite3-multiple-ciphers"
try {
    $result = & npx node-gyp rebuild --msvs_version=2022 --target=$electronVersion --arch=x64 --disturl=https://electronjs.org/headers --runtime=electron 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to rebuild better-sqlite3-multiple-ciphers" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Write-Host "better-sqlite3-multiple-ciphers rebuilt successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error rebuilding better-sqlite3-multiple-ciphers: $_" -ForegroundColor Red
    Pop-Location
    exit 1
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Native module rebuild successful!" -ForegroundColor Green

# Verify build artifacts
Write-Host ""
Write-Host "Verifying build artifacts..." -ForegroundColor Yellow
$betterSqlite3 = Test-Path "node_modules\better-sqlite3-multiple-ciphers\build\Release\better_sqlite3.node"

if ($betterSqlite3) {
    Write-Host "All build artifacts verified!" -ForegroundColor Green
} else {
    Write-Host "Build artifact missing:" -ForegroundColor Yellow
    Write-Host "  - better-sqlite3-multiple-ciphers/build/Release/better_sqlite3.node missing" -ForegroundColor Red
}

exit 0
