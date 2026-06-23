#!/bin/bash
# 一键部署脚本 - 从本地打包上传到服务器
# 用法: bash scripts/one-click-deploy.sh

set -e

SERVER_IP="165.99.43.241"
SERVER_USER="root"
SERVER_PASSWORD="gbtnLWOF4370"
APP_NAME="danci007web"

echo "🚀 单词突击007 - 一键部署脚本"
echo "================================"
echo ""

# 检查是否有 sshpass
if ! command -v sshpass &> /dev/null; then
    echo "⚠️  请先安装 sshpass"
    echo "   Mac: brew install hudochenkov/sshpass/sshpass"
    echo "   Ubuntu: sudo apt-get install sshpass"
    exit 1
fi

echo "📦 步骤 1/5: 构建项目..."
npm run build

echo ""
echo "📦 步骤 2/5: 打包 dist 目录..."
tar -czf /tmp/danci007-dist.tar.gz dist/

echo ""
echo "📦 步骤 3/5: 上传到服务器..."
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no /tmp/danci007-dist.tar.gz ${SERVER_USER}@${SERVER_IP}:/tmp/

echo ""
echo "📦 步骤 4/5: 在服务器上部署..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
  # 备份旧的 dist
  if [ -d /root/danci007web/dist ]; then
    echo "📦 备份旧的 dist..."
    mv /root/danci007web/dist /root/danci007web/dist.bak.$(date +%Y%m%d%H%M%S) 2>/dev/null || true
  fi

  # 解压新的 dist
  echo "📦 解压新版本..."
  cd /root/danci007web
  tar -xzf /tmp/danci007-dist.tar.gz

  # 清理临时文件
  rm -f /tmp/danci007-dist.tar.gz

  # 检查 nginx 配置
  echo "🔍 检查 nginx 配置..."
  sudo nginx -t

  # 重载 nginx
  echo "🔄 重载 nginx..."
  sudo systemctl reload nginx

  # 删除备份（保留最新 3 个）
  echo "🧹 清理旧备份..."
  cd /root/danci007web
  ls -dt dist.bak.* 2>/dev/null | tail -n +4 | xargs rm -rf 2>/dev/null || true
ENDSSH

echo ""
echo "📦 步骤 5/5: 清理本地临时文件..."
rm -f /tmp/danci007-dist.tar.gz

echo ""
echo "✅ 部署完成！"
echo "🌐 前端访问地址: https://zxsz007.cn"
echo "🔧 管理后台: https://zxsz007.cn/admin"
