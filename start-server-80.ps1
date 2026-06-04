# 单词突击007 - 启动 80 端口服务器（需要管理员权限）

Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "  单词突击007 - 生产服务器"             -ForegroundColor Cyan
Write-Host "  端口: 80 (HTTP 默认端口)"             -ForegroundColor Cyan
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host ""

# 检查是否以管理员身份运行
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
  Write-Host "[错误] 需要管理员权限！" -ForegroundColor Red
  Write-Host ""
  Write-Host "请右键点击此脚本，选择「以管理员身份运行」" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "或者在管理员 PowerShell 中运行：" -ForegroundColor Yellow
  Write-Host "  cd '$PSScriptRoot\backend'" -ForegroundColor White
  Write-Host "  node server.js" -ForegroundColor White
  Write-Host ""
  pause
  exit 1
}

# 进入后端目录
Set-Location "$PSScriptRoot\backend"

# 启动服务器
Write-Host "[启动] 正在启动服务器..." -ForegroundColor Green
Write-Host ""
node server.js
