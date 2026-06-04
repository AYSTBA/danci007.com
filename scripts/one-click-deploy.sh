#!/bin/bash
# 单词突击007 - 一键部署脚本
# 使用方法：在服务器上执行以下命令（复制整行）：
# curl -sL https://raw.githubusercontent.com/AYSTBA/danci007web/main/one-click-deploy.sh | bash
# 或者手动下载后执行：bash one-click-deploy.sh

set -e

echo "🚀 单词突击007 - 开始部署..."
echo "================================================"

# 配置
REPO_URL="https://github.com/AYSTBA/danci007web.git"
DEPLOY_DIR="/var/www/danci007web"
BACKEND_DIR="${DEPLOY_DIR}/backend"
ADMIN_PASSWORD="888888"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    log_warn "建议以 root 用户运行此脚本"
fi

# 1. 安装依赖
log_info "步骤 1/8: 检查并安装依赖..."
if ! command -v git &> /dev/null; then
    log_info "安装 git..."
    apt-get update && apt-get install -y git
fi

if ! command -v node &> /dev/null; then
    log_info "安装 Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

if ! command -v npm &> /dev/null; then
    log_error "npm 未安装，请手动安装 Node.js"
    exit 1
fi

log_info "✅ Node.js $(node --version) 和 npm $(npm --version) 已安装"

# 2. 创建部署目录
log_info "步骤 2/8: 准备部署目录..."
mkdir -p /var/www
cd /var/www

# 3. 克隆或更新代码
if [ -d "${DEPLOY_DIR}" ]; then
    log_warn "目录已存在，删除旧版本..."
    rm -rf "${DEPLOY_DIR}"
fi

log_info "步骤 3/8: 从 GitHub 克隆代码..."
git clone "${REPO_URL}" "${DEPLOY_DIR}"
cd "${DEPLOY_DIR}"

# 4. 安装前端依赖并构建
log_info "步骤 4/8: 安装前端依赖（可能需要几分钟）..."
npm install

log_info "步骤 5/8: 构建前端生产版本..."
npm run build

# 5. 安装后端依赖
log_info "步骤 6/8: 安装后端依赖..."
cd "${BACKEND_DIR}"
npm install --production

# 6. 配置环境变量
log_info "步骤 7/8: 配置环境变量..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    sed -i "s/ADMIN_PASSWORD=.*/ADMIN_PASSWORD=${ADMIN_PASSWORD}/" .env
    log_info "✅ .env 文件已创建，默认密码: ${ADMIN_PASSWORD}"
    log_warn "⚠️  请修改 backend/.env 中的 ADMIN_PASSWORD！"
fi

# 7. 创建必要目录
mkdir -p uploads data
chmod 755 uploads data

# 8. 启动服务
log_info "步骤 8/8: 启动服务..."
cd "${DEPLOY_DIR}"

if command -v pm2 &> /dev/null; then
    log_info "使用 PM2 启动服务..."
    pm2 start ecosystem.config.cjs || pm2 restart ecosystem.config.cjs
    pm2 save
    pm2 startup || log_warn "请手动运行: pm2 startup"
    log_info "✅ 服务已通过 PM2 启动"
else
    log_warn "PM2 未安装，使用 nohup 启动..."
    nohup node backend/server.js > backend/server.log 2> backend/server.err &
    PID=$!
    log_info "✅ 服务已启动（PID: ${PID}）"
fi

# 获取服务器 IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "================================================"
log_info "🎉 部署完成！"
echo ""
echo "🌐 访问地址："
echo "   前端: http://${SERVER_IP}:3001"
echo "   管理后台: http://${SERVER_IP}:3001/admin"
echo ""
echo "🔑 默认管理员密码: ${ADMIN_PASSWORD}"
echo ""
echo "📝 查看日志："
echo "   pm2 logs danci007web"
echo ""
echo "📊 查看状态："
echo "   pm2 status"
echo ""
log_warn "⚠️  请尽快修改 backend/.env 中的 ADMIN_PASSWORD！"
echo "================================================"
