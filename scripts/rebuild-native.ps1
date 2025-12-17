# PowerShell 脚本：重建原生模块

Write-Host "开始重建原生模块..." -ForegroundColor Green
Write-Host ""

# 设置环境变量
$env:npm_config_target = "39.2.6"
$env:npm_config_arch = "x64"
$env:npm_config_target_platform = "win32"
$env:npm_config_disturl = "https://electronjs.org/headers"
$env:npm_config_runtime = "electron"
$env:npm_config_build_from_source = "true"
$env:npm_config_msvs_version = "18"

# 清理构建产物
Write-Host "清理构建产物..." -ForegroundColor Yellow
if (Test-Path "node_modules\better-sqlite3-multiple-ciphers\build") {
    Remove-Item -Recurse -Force "node_modules\better-sqlite3-multiple-ciphers\build"
}
if (Test-Path "node_modules\bcrypt\build") {
    Remove-Item -Recurse -Force "node_modules\bcrypt\build"
}

Write-Host ""

# 重建 better-sqlite3-multiple-ciphers
Write-Host "重建 better-sqlite3-multiple-ciphers..." -ForegroundColor Yellow
try {
    npm rebuild better-sqlite3-multiple-ciphers --build-from-source
    Write-Host "✅ better-sqlite3-multiple-ciphers 重建成功" -ForegroundColor Green
} catch {
    Write-Host "❌ better-sqlite3-multiple-ciphers 重建失败: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 重建 bcrypt
Write-Host "重建 bcrypt..." -ForegroundColor Yellow
try {
    npm rebuild bcrypt --build-from-source
    Write-Host "✅ bcrypt 重建成功" -ForegroundColor Green
} catch {
    Write-Host "❌ bcrypt 重建失败: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "所有原生模块重建完成！" -ForegroundColor Green

# 验证构建产物
Write-Host ""
Write-Host "验证构建产物..." -ForegroundColor Yellow
$betterSqlite3 = Test-Path "node_modules\better-sqlite3-multiple-ciphers\build\Release\better_sqlite3.node"
$bcrypt = Test-Path "node_modules\bcrypt\build\Release\bcrypt_lib.node"

if ($betterSqlite3 -and $bcrypt) {
    Write-Host "✅ 所有构建产物已验证存在" -ForegroundColor Green
} else {
    Write-Host "⚠️  部分构建产物缺失：" -ForegroundColor Yellow
    if (-not $betterSqlite3) {
        Write-Host "  - better-sqlite3-multiple-ciphers/build/Release/better_sqlite3.node 缺失" -ForegroundColor Red
    }
    if (-not $bcrypt) {
        Write-Host "  - bcrypt/build/Release/bcrypt_lib.node 缺失" -ForegroundColor Red
    }
}







