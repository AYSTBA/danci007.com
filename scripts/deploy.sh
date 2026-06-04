#!/bin/bash
# 单词突击007 - 主部署脚本
# 使用方法：
#   ./scripts/deploy.sh from-github  # 从 GitHub 部署
#   ./scripts/deploy.sh local        # 本地构建后部署
#   ./scripts/deploy.sh update       # 更新依赖并重启

set -e

DEPLOY_DIR="/var/www/danci007web"
BACKEND_DIR="\/backend"

log_info() { echo -e "\033[0;32m[INFO]\033[0m \"; }
log_warn() { echo -e "\033[1;33m[WARN]\033[0m \"; }

case "\" in
  from-github)
    log_info "从 GitHub 部署..."
    cd "\"
    git pull origin main
    npm install && npm run build
    cd "\"
    npm install --production
    pm2 restart danci007web
    log_info "✅ 部署完成！"
    ;;
    
  local)
    log_info "本地构建后部署..."
    npm install && npm run build
    log_info "请手动上传 dist/ 到服务器 \/dist/"
    ;;
    
  update)
    log_info "更新依赖并重启..."
    cd "\"
    npm install && npm run build
    cd "\"
    npm install --production
    pm2 restart danci007web
    log_info "✅ 更新完成！"
    ;;
    
  *)
    echo "使用方法："
    echo "  \ from-github  # 从 GitHub 部署"
    echo "  \ local         # 本地构建"
    echo "  \ update        # 更新依赖"
    exit 1
    ;;
esac
