# 单词突击007 部署指南

> 🎯 目标：让你在 **10分钟内** 成功把网站跑在服务器上

---

## 📌 部署前必读：为什么之前会失败？

这个项目有两个特殊依赖：

| 依赖 | 为什么麻烦 |
|------|-----------|
| `better-sqlite3` | 含 C++ 原生模块，需要服务器有 `python3` + `make` + `gcc` |
| `sharp` | 含 C++ 原生模块，还需要 `libvips` 图像库 |

**直接 `npm install` 就报错，就是因为这两个包。** 下面的方案都已解决这个问题。

---

## 方案 A：Docker 部署（⭐ 推荐，最简单）

### 前提
- 服务器安装了 Docker（一行命令搞定）

### 步骤

**1. 服务器安装 Docker（如果没有）**
```bash
curl -fsSL https://get.docker.com | bash
```

**2. 把代码传到服务器**
```bash
# 方法一：用 git（推荐）
git clone https://github.com/你的用户名/danci007web.git /var/www/danci007web
cd /var/www/danci007web

# 方法二：用 scp（如果没有 git 仓库）
scp -r D:/code/danci007web root@你的服务器IP:/var/www/danci007web
```

**3. 配置环境变量**
```bash
cd /var/www/danci007web
cp .env.example .env
nano .env  # 修改密码等配置
```

**4. 一键启动**
```bash
# 创建数据持久化目录
mkdir -p data uploads

# 构建并启动
docker compose up -d --build
```

**5. 完成！** 访问 `http://你的服务器IP:3001`

### 常用命令
```bash
docker compose logs -f        # 查看日志
docker compose restart        # 重启
docker compose down           # 停止
docker compose up -d --build  # 更新代码后重新部署
```

### 配置 Nginx + HTTPS（可选，让域名好看）
```bash
# 安装 Nginx 和 certbot
apt install -y nginx certbot python3-certbot-nginx

# 复制 Nginx 配置
cp nginx.conf.example /etc/nginx/sites-available/danci007web
# 编辑，把 your-domain.com 改成你的域名
nano /etc/nginx/sites-available/danci007web

# 启用配置
ln -s /etc/nginx/sites-available/danci007web /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 申请 HTTPS 证书（免费）
certbot --nginx -d your-domain.com
```

> ⚠️ 用了 Nginx 之后，把 docker-compose.yml 里的端口改为只监听本地：
> `ports: ["127.0.0.1:3001:3001"]`

---

## 方案 B：传统服务器（Ubuntu/Debian）

### 一键脚本
```bash
# 1. 把代码传上服务器
git clone 你的仓库 /var/www/danci007web
cd /var/www/danci007web

# 2. 编辑 deploy.sh 里的 APP_DIR 和 REPO_URL
nano deploy.sh

# 3. 运行（需要 root）
sudo bash deploy.sh
```

脚本会自动：安装 Node.js → 安装编译工具 → 安装依赖（含原生编译）→ 构建前端 → 启动 PM2 → 设置开机自启

### 手动步骤（如果脚本有问题）
```bash
# 安装编译工具（关键！）
sudo apt update
sudo apt install -y build-essential python3 git

# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 安装依赖（含原生模块编译）
cd /var/www/danci007web
npm ci --omit=dev

# 构建前端
npm ci          # 装 devDependencies
npm run build   # 构建
npm prune --omit=dev  # 清理

# 创建数据目录
mkdir -p backend/data backend/uploads logs

# 启动
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup   # 复制输出的命令运行，设置开机自启
```

---

## 方案 C：宝塔面板（如果你用宝塔）

1. 宝塔 → **网站** → **Node项目** → 添加项目
2. 项目目录：上传代码的路径
3. 启动命令：`node backend/server.js`
4. 端口：`3001`
5. **在宝塔终端里先运行**：
   ```bash
   cd 你的项目路径
   apt install -y build-essential python3  # 安装编译工具
   npm ci --omit=dev                       # 安装依赖
   npm run build                           # 构建前端
   ```
6. 然后用宝塔面板启动项目

---

## 🔧 常见问题

### Q: `node-pre-gyp` 或 `gyp ERR` 报错
**原因**：缺少编译工具
```bash
sudo apt install -y build-essential python3
```

### Q: `sharp` 安装失败
**原因**：缺少 libvips
```bash
sudo apt install -y libvips-dev
```
或者改用 Docker 方案，Docker 里已经处理好了。

### Q: `Cannot find module './dist/index.html'`
**原因**：没有构建前端
```bash
npm run build
```

### Q: 端口 3001 被占用
```bash
# 查看占用
lsof -i :3001
# 或修改 .env 里的 PORT
```

### Q: 数据库文件权限问题
```bash
chown -R www-data:www-data /var/www/danci007web/backend/data
chmod 755 /var/www/danci007web/backend/data
```

---

## 📁 生产环境文件结构

```
/var/www/danci007web/
├── backend/
│   ├── data/          ← SQLite 数据库（要备份！）
│   ├── uploads/       ← 上传的图片（要备份！）
│   └── server.js
├── dist/              ← 前端构建产物
├── logs/              ← PM2 日志
├── .env               ← 环境变量（不要提交 git！）
├── ecosystem.config.cjs
└── package.json
```

---

## 💾 备份

重要数据只有两个目录：
```bash
# 备份
tar -czf backup-$(date +%Y%m%d).tar.gz backend/data backend/uploads

# 恢复
tar -xzf backup-20240101.tar.gz
```

---

## 🔐 安全检查清单

- [ ] 修改 `.env` 里的 `ADMIN_PASSWORD`（不要用默认的 888888）
- [ ] 设置 `CORS_ORIGIN` 为你的域名（不要留 `*`）
- [ ] 配置了 HTTPS（防止预约数据明文传输）
- [ ] 定期备份 `backend/data/` 目录
