# AgileLocal 管理员模式打包脚本
# 此脚本需要管理员权限才能运行

Write-Host "正在检查管理员权限..." -ForegroundColor Cyan

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "错误：需要管理员权限！" -ForegroundColor Red
    Write-Host "请右键点击 PowerShell 并选择 '以管理员身份运行'，然后再运行此脚本。" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "✓ 管理员权限已确认" -ForegroundColor Green
Write-Host ""

# 切换到项目目录
Set-Location -Path "d:\softapp\AgileLocal"

Write-Host "正在清理旧的构建..." -ForegroundColor Cyan
Remove-Item dist -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "正在构建应用程序..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ 构建成功！" -ForegroundColor Green
    Write-Host "可执行文件位置: dist\win-unpacked\AgileLocal.exe" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "✗ 构建失败！" -ForegroundColor Red
}

Write-Host ""
pause
