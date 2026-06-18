#!/bin/bash
# 单词突击007 - 部署脚本
# 用法：
#   ./scripts/deploy.sh from-github  # 从 GitHub 部署（在服务器上运行）
#   ./scripts/deploy.sh update       # 更新代码并重启

set -e

DEPLOY_DIR="${DEPLOY_DIR:-/var/www/danci007web}"

log_info() { echo -e "\033[0;32m[INFO]\033[0m $1"; }
log_warn() { echo -e "\033[1;33m[WARN]\033[0m $1"; }

case "${1:-}" in
  from-github)
    log_info "从 GitHub 部署..."

    # 检查部署目录
    if [ ! -d "$DEPLOY_DIR" ]; then
      log_info "目录不存在，克隆代码..."
      git clone https://github.com/AYSTBA/danci007web.git "$DEPLOY_DIR"
    fi

    cd "$DEPLOY_DIR"
    git pull origin main

    # 安装后端依赖
    cd backend
    npm install --production
    cd ..

    # 配置环境变量
    if [ ! -f .env ]; then
      cp .env.example .env
      log_warn "已创建 .env 文件，请编辑设置 ADMIN_PASSWORD"
    fi

    # 创建必要目录
    mkdir -p backend/data backend/uploads logs

    # 启动/重启服务
    if command -v pm2 &> /dev/null; then
      pm2 start ecosystem.config.cjs --env production || pm2 restart danci007web --update-env
      pm2 save
      log_info "✅ 部署完成（PM2）"
    else
      log_warn "PM2 未安装，请手动启动：node backend/server.js"
    fi
    ;;

  update)
    log_info "更新代码并重启..."
    cd "$DEPLOY_DIR"
    git pull origin main

    cd backend
    npm install --production
    cd ..

    if command -v pm2 &> /dev/null; then
      pm2 restart danci007web --update-env
      log_info "✅ 重启完成"
    else
      log_warn "PM2 未安装，请手动重启"
    fi
    ;;

  *)
    echo "用法："
    echo "  $0 from-github  # 从 GitHub 部署（在服务器上运行）"
    echo "  $0 update       # 更新代码并重启"
    echo ""
    echo "环境变量："
    echo "  DEPLOY_DIR  部署目录（默认 /var/www/danci007web）"
    exit 1
    ;;
esac
