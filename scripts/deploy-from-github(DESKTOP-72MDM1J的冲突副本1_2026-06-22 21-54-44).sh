#!/bin/bash
set -e

echo "🚀 开始从 GitHub 部署 danci007web..."

# 配置变量
SERVER_IP="165.99.43.241"
SERVER_USER="root"
REPO_URL="https://github.com/AYSTBA/zxsz007.com_server.git"
DEPLOY_DIR="/root/danci007web"

echo "📦 从 GitHub 克隆代码..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
  cd /root/danci007web

  # 拉取最新代码
  echo "📥 拉取最新代码..."
  git pull origin main

  # 安装后端依赖
  echo "📦 安装后端依赖..."
  cd backend
  npm install --production
  cd ..

  # 配置环境变量
  if [ ! -f .env ]; then
    echo "⚙️  配置环境变量..."
    cp .env.example .env
    echo "⚠️  请编辑 backend/.env 设置生产环境变量！"
  fi

  # 创建必要目录
  mkdir -p backend/data backend/uploads logs

  # 重启服务
  echo "🚀 重启服务..."
  pm2 restart danci007web --update-env

  # 检查服务状态
  echo ""
  echo "✅ 部署完成！"
  echo "🌐 前端访问地址: https://zxsz007.cn"
  echo "🔧 管理后台: https://zxsz007.cn/admin"
  echo ""
  echo "📝 查看日志: pm2 logs danci007web"
  echo "📊 查看状态: pm2 status"

ENDSSH

echo "✅ 部署脚本执行完成！"
