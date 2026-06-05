#!/bin/bash
# server-deploy.sh - 服务器端自动部署脚本
# 由 GitHub webhook 或 cron 触发
# 路径假设：/root/danci007web

set -e

APP_DIR="/root/danci007web"
LOG_DIR="$APP_DIR/logs"
DEPLOY_LOG="$LOG_DIR/deploy.log"
mkdir -p "$LOG_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$DEPLOY_LOG"; }

cd "$APP_DIR"

# 1. 拉取最新代码（仅覆盖源码和 dist，不动数据）
log "==> 拉取最新代码"
git fetch origin server
git reset --hard origin/server

# 2. 保留关键目录
log "==> 保护数据目录"
mkdir -p backend/data backend/uploads
[ -f backend/data/.gitkeep ] || touch backend/data/.gitkeep
[ -f backend/uploads/.gitkeep ] || touch backend/uploads/.gitkeep

# 3. 如果 .env 不存在，从 .env.example 复制并提示
if [ ! -f .env ]; then
  log "==> .env 不存在，从 .env.example 复制"
  cp .env.example .env
  log "!! 请编辑 .env 填入生产密码和 CORS_ORIGIN 后再次部署 !!"
fi

# 4. 安装依赖（如果 package.json 变更）
if [ package.json -nt node_modules/.package-lock.json ]; then
  log "==> 安装依赖"
  npm ci --omit=dev 2>&1 | tee -a "$DEPLOY_LOG"
fi

# 5. dist/ 已经在仓库中，无需构建

# 6. 重启 PM2 服务
log "==> 重启 PM2"
pm2 restart danci007-backend 2>&1 | tee -a "$DEPLOY_LOG" || pm2 start ecosystem.config.cjs 2>&1 | tee -a "$DEPLOY_LOG"

# 7. 清理 PM2 旧的日志
pm2 flush 2>/dev/null || true

# 8. 健康检查
sleep 3
if curl -fsS http://127.0.0.1:3001/api/banners >/dev/null 2>&1; then
  log "✅ 部署成功，API 健康"
else
  log "❌ 部署后 API 无响应，请检查日志"
  pm2 logs danci007-backend --lines 50 --nostream 2>&1 | tee -a "$DEPLOY_LOG"
  exit 1
fi

log "==> 完成"
