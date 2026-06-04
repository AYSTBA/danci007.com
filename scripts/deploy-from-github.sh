#!/bin/bash
set -e

echo "🚀 开始从 GitHub 部署 danci007web..."

# 配置变量
SERVER_IP="165.99.43.241"
SERVER_USER="root"
REPO_URL="https://github.com/AYSTBA/danci007web.git"
DEPLOY_DIR="/var/www/danci007web"

echo "📦 从 GitHub 克隆代码..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
  # 创建部署目录
  mkdir -p /var/www
  cd /var/www

  # 如果目录已存在，先删除
  if [ -d "danci007web" ]; then
    echo "⚠️  目录已存在，删除旧版本..."
    rm -rf danci007web
  fi

  # 克隆仓库
  echo "📥 克隆代码从 GitHub..."
  git clone https://github.com/AYSTBA/danci007web.git
  cd danci007web

  # 安装前端依赖
  echo "📦 安装前端依赖..."
  npm install

  # 构建前端
  echo "🔨 构建前端生产版本..."
  npm run build

  # 安装后端依赖
  echo "📦 安装后端依赖..."
  cd backend
  npm install --production

  # 配置环境变量
  if [ ! -f ".env" ]; then
    echo "⚙️  配置环境变量..."
    cp .env.example .env
    echo "⚠️  请编辑 backend/.env 设置生产环境变量！"
  fi

  # 创建 uploads 目录
  mkdir -p uploads
  chmod 755 uploads

  # 创建 data 目录和初始化数据库
  mkdir -p data
  chmod 755 data

  # 回到项目根目录
  cd ..

  # 使用 PM2 启动服务
  echo "🚀 启动服务..."
  if command -v pm2 &> /dev/null; then
    pm2 start ecosystem.config.cjs || pm2 restart ecosystem.config.cjs
    pm2 save
    pm2 startup || echo "⚠️  请手动运行 pm2 startup 设置开机自启"
  else
    echo "⚠️  PM2 未安装，使用 Node 直接启动..."
    nohup node backend/server.js > server.log 2> server.err &
    echo "✅ 服务已启动（PID: $!）"
  fi

  # 检查服务状态
  echo ""
  echo "✅ 部署完成！"
  echo "🌐 前端访问地址: http://$(hostname -I | awk '{print $1}'):3001"
  echo "🔧 管理后台: http://$(hostname -I | awk '{print $1}'):3001/admin"
  echo ""
  echo "📝 查看日志: pm2 logs danci007web"
  echo "📊 查看状态: pm2 status"

ENDSSH

echo "✅ 部署脚本执行完成！"
echo ""
echo "💡 如果首次部署，请编辑环境变量："
echo "   ssh ${SERVER_USER}@${SERVER_IP}"
echo "   nano /var/www/danci007web/backend/.env"
