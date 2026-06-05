# 单词突击007 — 部署与运维文档

> 本文档面向"切换服务器 / 切换运维智能体 / 接手新成员"场景，包含**完整的功能说明、目录结构、本地开发、生产部署、域名绑定、自动部署、备份、迁移到新服务器**等所有信息。

---

## 1. 项目概况

| 项 | 值 |
|---|---|
| 项目名 | 单词突击007 / 中萱文化 |
| 域名 | `https://zxsz007.cn` (主), `https://www.zxsz007.cn` (跳主) |
| 后端端口 | 3001 (生产) / 80 (本地) |
| 公开地址 | `https://zxsz007.cn` |
| 后台管理 | `https://zxsz007.cn/admin` |
| 服务器 IP | `165.99.43.241` |
| 服务器用户 | `root` |
| 应用目录 | `/root/danci007web` |
| 技术栈 | Vue 3 + Vite + vue-router + TypeScript (前端) / Node.js + Express + better-sqlite3 (后端) |
| 数据库 | SQLite (WAL 模式)，文件 `backend/data/danci007.db` |
| 镜像 | sharp (WebP 转换) / multer (上传) / express-rate-limit (防爆破) |
| 进程管理 | PM2 (`danci007web`) |
| 反向代理 | nginx 1.18 + Let's Encrypt SSL |

---

## 2. 功能列表

### 2.1 前台公开页面

| 路由 | 页面 | 文件 |
|---|---|---|
| `/` | 首页（Hero 轮播 + 课程入口 + 教师 + 校区介绍） | `src/views/Home.vue` |
| `/about` | 关于我们 / 品牌介绍 | `src/views/About.vue` |
| `/booking` | 预约体验课（可被 `?course=<id>` 预填） | `src/views/Booking.vue` |
| `/course` | 课程列表（移动端竖向 / 桌面端 3-4 列网格） | `src/views/Course.vue` |
| `/course/:id` | 课程详情页（Banner + 教师 + Tab：详情/互动/评价） | `src/views/Course.vue` |
| `*` | 404 NotFound | `src/views/NotFound.vue` |

### 2.2 后台管理 `/admin`

| Tab | 功能 |
|---|---|
| Banner 管理 | 增删改查首页轮播图（中英文 + 中英两套图） |
| 课程管理 | 增删改查课程（含中英文、教师关联、亮点列表、状态、有效期、排序） |
| 页面内容编辑 | 站点名称/标语/工作时间/二维码/学校简介等所有文本 |
| 预约记录 | 查看 / 删除前台 `/booking` 提交 |
| 师资力量管理 | 增删改查教师（中英文姓名/职称/简介/头像） |
| 课程评价 | 课程详情页用户评价的审核 / 删除 |
| 课程互动 | 课程详情页用户评论的审核 / 删除 |
| **存储管理** | 扫描孤儿上传文件、清理（`uploads/` 目录下未被 DB 引用的文件） |

### 2.3 业务流程

- 用户在首页/课程列表点课程 → 课程详情页 → 点"立即预约" → 跳 `/booking?course=<course_id>`，课程名锁在表单顶部，不能改
- 提交预约 → 后端 `POST /api/bookings` 写入 DB → 后台"预约记录" tab 可看
- 后台"课程管理"新增课程 → 用户立即在 `/course` 看到
- 上传图片走 `POST /api/upload`：用 `sharp` 转 webp q=85，最大 1920×1920，存入 `backend/uploads/`
- 凌晨 3 点 cron 自动跑 `node server.js --cleanup 24` 删除 24 小时前的孤儿上传

---

## 3. 目录结构

```
D:\code\danci007web-clean\            ← 本地开发根目录
├── backend/
│   ├── server.js                     ← 后端入口（API + 静态文件 + CLI 清理）
│   ├── data/                         ← SQLite 数据库（不进 git）
│   │   └── danci007.db
│   ├── uploads/                      ← 上传图片（不进 git）
│   └── .env.example                  ← 环境变量模板
├── src/
│   ├── App.vue                       ← 顶层布局 + TabBar
│   ├── main.ts                       ← 入口
│   ├── style.css                     ← 全局样式（CSS 变量、品牌色）
│   ├── router/                       ← vue-router 配置
│   ├── types/index.ts                ← TypeScript 类型定义
│   ├── views/
│   │   ├── Home.vue
│   │   ├── About.vue
│   │   ├── Booking.vue
│   │   ├── Course.vue
│   │   ├── Admin.vue                 ← 整个后台（多 tab 单文件）
│   │   └── NotFound.vue
│   └── components/                   ← 通用组件
│       ├── ImageEditor.vue
│       ├── MobileTabBar.vue
│       ├── BookingForm.vue
│       ├── HomeHero.vue
│       └── ...
├── dist/                             ← Vite 构建产物（git-ignored，但 force-add 进仓库用于部署）
│   ├── index.html
│   └── assets/
├── server-deploy.sh                  ← 服务器端自动部署脚本（被 cron 调用）
├── ecosystem.config.cjs              ← PM2 配置
├── .env.example                      ← 环境变量模板
├── .env                              ← 本地环境变量（不进 git）
├── package.json                      ← 依赖
├── tsconfig.json
├── vite.config.ts
├── DEPLOY.md                         ← 本文件
└── API.md                            ← 单独 API 文档
```

---

## 4. 本地开发

### 4.1 初次启动

```bash
# 1. 克隆代码
git clone https://github.com/AYSTBA/danci007.com.git
cd danci007.com
git checkout main

# 2. 安装依赖
npm install

# 3. 复制环境变量模板
cp .env.example .env
# 编辑 .env，至少要包含：
#   ADMIN_PASSWORD=888888        (本地默认密码)
#   CORS_ORIGIN=*
#   PORT=80

# 4. 启动开发服务器（前端热更新 + 后端 API）
npm run dev
# → http://localhost:5173 (Vite dev)
# → 后端 API 走 dev server 代理
```

### 4.2 本地管理后台

- 打开 `http://localhost:5173/admin`
- 输入密码 `888888`（或 `.env` 里 `ADMIN_PASSWORD` 的值）
- Token 存 `sessionStorage.adminToken`，24 小时有效

### 4.3 构建并启动生产模式

```bash
# 1. 构建前端
npm run build
# → 产物在 dist/

# 2. 启动后端（同时服务 dist/ 静态资源）
npm start
# → 监听 0.0.0.0:3001 (或 .env 里的 PORT)
# → http://localhost:3001

# 3. 用 PM2 守护
pm2 start ecosystem.config.cjs
pm2 save
```

---

## 5. 生产部署（当前服务器：165.99.43.241）

### 5.1 服务器信息

| 项 | 值 |
|---|---|
| OS | Ubuntu |
| nginx | 1.18.0 |
| Node | 20.20.2（系统）+ npm |
| 进程管理 | PM2 (进程名 `danci007web`) |
| SSL | Let's Encrypt 自动续期 |
| Git 部署密钥 | `~/.ssh/danci007_deploy` (ed25519) |
| 部署脚本 | `/root/danci007web/server-deploy.sh` |

### 5.2 当前 nginx 配置 `/etc/nginx/sites-enabled/danci007`

```nginx
server {
    server_name zxsz007.cn www.zxsz007.cn;
    root /root/danci007web/dist;
    index index.html;

    # API -> 后端
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 上传文件 -> 后端
    location /uploads {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # 静态文件 + SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/zxsz007.cn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/zxsz007.cn/privkey.pem;
}

server {
    listen 80;
    server_name zxsz007.cn www.zxsz007.cn;
    return 301 https://$host$request_uri;
}
```

### 5.3 域名解析

```
$ dig +short zxsz007.cn
165.99.43.241
```

DNS A 记录 `zxsz007.cn → 165.99.43.241`。证书由 certbot 自动签发 + 续期。

### 5.4 自动部署流程

**触发方式**：服务器 cron

```bash
$ crontab -l
0 0 * * * /root/danci007web/server-deploy.sh >> /var/log/danci007-cron.log 2>&1
0 3 * * * cd /root/danci007web && /usr/bin/node backend/server.js --cleanup 24 >> /var/log/danci007-cleanup.log 2>&1
```

| 时间 | 动作 |
|---|---|
| 每天 00:00 | 拉 main 最新代码 → 装依赖 → 重启 PM2 → 健康检查 |
| 每天 03:00 | 清理 24 小时前的孤儿上传文件 |

**`server-deploy.sh` 完整脚本**（仓库根目录）：

```bash
#!/bin/bash
set -e
APP_DIR="/root/danci007web"
LOG_DIR="$APP_DIR/logs"
DEPLOY_LOG="$LOG_DIR/deploy.log"
mkdir -p "$LOG_DIR"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$DEPLOY_LOG"; }
cd "$APP_DIR"
log "==> 拉取最新代码 (origin/main)"
git fetch --force origin +refs/heads/main:refs/remotes/origin/main
git reset --hard origin/main
log "==> 保护数据目录"
mkdir -p backend/data backend/uploads
[ -f backend/data/.gitkeep ] || touch backend/data/.gitkeep
[ -f backend/uploads/.gitkeep ] || touch backend/uploads/.gitkeep
if [ ! -f .env ]; then
  log "==> .env 不存在，从 .env.example 复制"
  cp .env.example .env
fi
if [ package.json -nt node_modules/.package-lock.json ]; then
  log "==> 安装依赖"
  npm ci --omit=dev 2>&1 | tee -a "$DEPLOY_LOG"
fi
log "==> 重启 PM2"
pm2 restart danci007web 2>&1 | tee -a "$DEPLOY_LOG" || pm2 start ecosystem.config.cjs
pm2 flush 2>/dev/null || true
sleep 3
if curl -fsS http://127.0.0.1:3001/api/banners >/dev/null 2>&1; then
  log "✅ 部署成功，API 健康"
else
  log "❌ 部署后 API 无响应"
  pm2 logs danci007web --lines 50 --nostream 2>&1 | tee -a "$DEPLOY_LOG"
  exit 1
fi
log "==> 完成"
```

> ⚠ **不要用 `git merge` 把 main 合到 server 分支**。dist/ 在 `.gitignore` 里，但 force-add 进 main 仓库；服务器只用 main 分支 deploy，不要再保留 server 分支。

### 5.5 手动部署

```bash
ssh root@165.99.43.241
cd /root/danci007web
git fetch --force origin +refs/heads/main:refs/remotes/origin/main
git reset --hard origin/main
pm2 restart danci007web
sleep 3
curl -fsS http://127.0.0.1:3001/api/banners
```

### 5.6 查看状态

```bash
pm2 status                                    # 看进程
pm2 logs danci007web --lines 50 --nostream    # 看最近 50 行日志
pm2 logs danci007web --lines 200 --nostream --err   # 错误日志
tail -f /var/log/danci007-cron.log            # 自动部署日志
tail -f /var/log/danci007-cleanup.log         # 清理日志
```

### 5.7 数据库与上传

| 内容 | 路径 | 备份 |
|---|---|---|
| SQLite DB | `/root/danci007web/backend/data/danci007.db` | **必须备份** |
| 上传图片 | `/root/danci007web/backend/uploads/` | **必须备份** |
| `.env` | `/root/danci007web/.env` | **必须备份** |
| PM2 日志 | `/root/danci007web/logs/` | 不必 |
| dist/ | `/root/danci007web/dist/` | 不必（每次部署重建） |

---

## 6. 环境变量 `.env`

| 变量 | 必须 | 默认 | 说明 |
|---|---|---|---|
| `PORT` | 否 | `3001` | 后端监听端口（生产 3001，本地 80） |
| `ADMIN_PASSWORD` | **生产必须** | 开发 `888888` | 后台管理密码（生产没设置会启动失败） |
| `ADMIN_TOKEN_SECRET` | 否 | 随机生成 | HMAC token 密钥（重启会变，所以要持久设置） |
| `CORS_ORIGIN` | 否 | `*` | 跨域白名单，逗号分隔，生产建议填域名 |
| `DATA_DIR` | 否 | `./backend/data` | 数据库目录 |
| `UPLOAD_DIR` | 否 | `./backend/uploads` | 上传目录 |
| `NODE_ENV` | 否 | - | `production` 时启用更严格的限流（10/15min） |

**生产 `.env` 示例**（`/root/danci007web/.env`）：

```env
PORT=3001
ADMIN_PASSWORD=<一个强密码>
ADMIN_TOKEN_SECRET=<32字节随机hex>
CORS_ORIGIN=https://zxsz007.cn
NODE_ENV=production
```

---

## 7. 安全特性

| 项 | 实现 |
|---|---|
| 后台密码 | HMAC-SHA256 token，24h 过期，签名存在 `ADMIN_TOKEN_SECRET` |
| 密码爆破防护 | `express-rate-limit`：开发 1000/15min，生产 10/15min |
| CORS | 严格白名单（生产环境必须设 `CORS_ORIGIN`） |
| 请求体大小 | `express.json({ limit: '5mb' })` |
| 上传大小 | multer 10MB |
| 输入校验 | 后端二次校验（年龄 1-120、姓名 50 字内、电话 30 字内、评价 2000 字内、互动 500 字内） |
| XSS | 文本全部 Vue 模板 `{{ }}` 自动转义 |
| 静态文件路径 | SPA fallback 只在 `try_files` 后才命中 |

---

## 8. PM2 配置 `ecosystem.config.cjs`

```javascript
module.exports = {
  apps: [{
    name: 'danci007web',
    script: './backend/server.js',
    cwd: '/root/danci007web',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
  }],
};
```

---

## 9. 监控与运维

### 9.1 健康检查端点

```bash
# 公开 API（无需鉴权）
curl -fsS https://zxsz007.cn/api/banners
curl -fsS https://zxsz007.cn/api/courses
```

### 9.2 常见故障排查

| 现象 | 排查 |
|---|---|
| `pm2 status` 显示 `errored` | `pm2 logs danci007web` 看启动错误（一般是环境变量缺失、SQLite 锁、port 占用） |
| 502 Bad Gateway | 后端没启动或 3001 端口监听失败 |
| 上传图片 500 | 检查 `backend/uploads/` 写权限、`sharp` native binding |
| 后台 401 | Token 过期，重新登录；如反复过期，检查 `ADMIN_TOKEN_SECRET` 是否稳定 |
| 网站返回 git 冲突标记 | `git reset --hard origin/main && cd backend && pm2 restart danci007web` |
| DB 损坏 | `cd backend && sqlite3 data/danci007.db .schema > schema.sql; rm data/danci007.db*; pm2 restart danci007web`（会自动建表） |

### 9.3 备份与恢复

```bash
# 备份（每日跑一次）
ssh root@165.99.43.241 'cd /root/danci007web && tar -czf /root/backup-$(date +%Y%m%d).tar.gz backend/data backend/uploads .env'
# 把 /root/backup-*.tar.gz scp 到本地

# 恢复
ssh root@165.99.43.241 'cd /root/danci007web && tar -xzf /root/backup-20260101.tar.gz && pm2 restart danci007web'
```

---

## 10. 迁移到新服务器

### 10.1 准备

- 新服务器：Ubuntu 22.04+，root 账号，Node 20+，nginx，PM2 (`npm i -g pm2`)

### 10.2 步骤

```bash
# 1. 域名 DNS 改 A 记录到新 IP，等 TTL 过期（一般 10 分钟）
# 2. SSH 到新服务器

# 3. 安装依赖
apt update && apt install -y nginx nodejs npm certbot python3-certbot-nginx git
npm i -g pm2

# 4. 拉取代码
mkdir -p /root && cd /root
git clone https://github.com/AYSTBA/danci007.com.git danci007web
cd danci007web
git checkout main

# 5. 安装项目依赖
npm ci --omit=dev

# 6. 复制 .env
cp .env.example .env
nano .env   # 填 ADMIN_PASSWORD / CORS_ORIGIN / ADMIN_TOKEN_SECRET

# 7. 启动 PM2
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup

# 8. nginx 配置
cat > /etc/nginx/sites-available/danci007 << 'EOF'
server {
    server_name zxsz007.cn www.zxsz007.cn;
    root /root/danci007web/dist;
    index index.html;
    location /api { proxy_pass http://127.0.0.1:3001; proxy_http_version 1.1; proxy_set_header Host $host; }
    location /uploads { proxy_pass http://127.0.0.1:3001; proxy_http_version 1.1; proxy_set_header Host $host; }
    location / { try_files $uri $uri/ /index.html; }
    listen 80;
}
EOF
ln -s /etc/nginx/sites-available/danci007 /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 9. 申请 SSL
certbot --nginx -d zxsz007.cn -d www.zxsz007.cn
# certbot 会自动把 listen 80 改成 443 + 加 SSL 配置

# 10. 拷贝旧服务器的数据
scp -r root@OLD_IP:/root/danci007web/backend/data /root/danci007web/backend/
scp -r root@OLD_IP:/root/danci007web/backend/uploads /root/danci007web/backend/

# 11. 恢复孤儿清理 cron
(crontab -l 2>/dev/null; echo "0 0 * * * /root/danci007web/server-deploy.sh >> /var/log/danci007-cron.log 2>&1"; echo "0 3 * * * cd /root/danci007web && /usr/bin/node backend/server.js --cleanup 24 >> /var/log/danci007-cleanup.log 2>&1") | crontab -

# 12. 健康检查
curl -fsS http://127.0.0.1:3001/api/banners
curl -fsS https://zxsz007.cn/api/banners
```

### 10.3 切换智能体 / 新成员接手

将本文件 (`DEPLOY.md`) + `API.md` 一起传给新成员 / 智能体，附带：
- 服务器 root 密码（或 SSH 密钥）
- GitHub 仓库写入权限（`AYSTBA/danci007.com`）
- `.env` 当前内容

即可独立完成从开发、构建、部署、迁移的全流程。

---

## 11. 切换域名 / 更换品牌

如果要换域名 `zxsz007.cn` → `newdomain.com`：

```bash
# 1. 改 nginx server_name
# 2. certbot --nginx -d newdomain.com
# 3. 改 .env 的 CORS_ORIGIN
# 4. 改 src/views/About.vue / Home.vue / NotFound.vue 等里的"中萱文化"硬编码文字
#    （已经支持从 page_contents 站点名称改，但版权/品牌名仍需手动改源码）
# 5. 改 frontend/index.html 的 og:site_name
# 6. 改 src/types/index.ts 里 "中萱文化" 的英文翻译
# 7. 重新 build + push
```

---

## 12. 已知约束

| 约束 | 原因 |
|---|---|
| `dist/` 在 `.gitignore` 但 force-add | 部署时服务器不构建，直接 serve 静态 |
| 后台 token 24h 过期 | 安全性 vs 便利性的折衷；用户重新登录即可 |
| 上传图片转 webp | 节省带宽；如需保留原格式，改 `backend/server.js` 第 470 行 |
| SQLite 限制 | 单机部署；高并发写需要切到 PostgreSQL（已用 `better-sqlite3` 包好接口，换 DB 改连接即可） |
| 国内服务器需备案 | 当前 `165.99.43.241` IP 在国外/香港，不需要备案 |
| 中英文翻译在前端硬编码 | 简单实现，没用 i18n 库；后端文本（中英文）通过 `*_en` 字段区分 |

---

## 13. 快速检查清单（接手时用）

- [ ] 服务器能 SSH 登录（root@165.99.43.241）
- [ ] PM2 进程 `danci007web` 状态 `online`
- [ ] `https://zxsz007.cn` 200 OK
- [ ] `curl http://127.0.0.1:3001/api/banners` 返回 JSON 数组
- [ ] `/root/danci007web/.env` 存在且 `ADMIN_PASSWORD` 不为空
- [ ] `/root/danci007web/backend/data/danci007.db` 文件存在且有写权限
- [ ] `/root/danci007web/backend/uploads/` 文件夹存在
- [ ] cron `0 0` 和 `0 3` 都已设置
- [ ] git 仓库 `main` 分支可拉取
- [ ] 已知 owner 联系方式（紧急故障时）
