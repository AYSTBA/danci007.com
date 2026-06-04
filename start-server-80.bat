@echo off
:: 单词突击007 - 启动 80 端口服务器（需要管理员权限）

echo ========================================
echo   单词突击007 - 生产服务器
echo   端口: 80 (HTTP 默认端口)
echo ========================================
echo.

:: 检查是否以管理员身份运行
net session >nul 2>&1
if %errorLevel% neq 0 (
  echo [错误] 需要管理员权限！
  echo.
  echo 请右键点击此脚本，选择「以管理员身份运行」
  echo.
  pause
  exit /b 1
)

:: 进入后端目录
cd /d "%~dp0backend"

:: 启动服务器
echo [启动] 正在启动服务器...
echo.
node server.js

pause
