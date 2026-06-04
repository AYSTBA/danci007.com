# 📘 单词突击007 - 龙岗教学点分站

<div align="center">

**智能单词学习系统 - 深圳市龙岗区教学点**

[![Vue 3](https://img.shields.io/badge/Vue-3.4-brightgreen?style=flat&logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green?style=flat&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat&logo=express)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3.45-003B57?style=flat&logo=sqlite)](https://www.sqlite.org/)

[🚀 在线演示](http://165.99.43.241:3001) | [📚 API 文档](./docs/API.md) | [📝 更新日志](./docs/CHANGELOG.md)

</div>

---

## ✨ 项目简介

**单词突击007** 是一款智能单词学习系统，基于艾宾浩斯遗忘曲线理论，帮助用户高效记忆英语单词。

本项目是 **深圳市龙岗区教学点** 的分站，包含：
- 🏠 **官方网站** - 展示课程、教师、预约报名
- 🔐 **管理后台** - 管理内容、预约、课程
- 📱 **微信小程序**（开发中）

---

## 🎯 功能特性

### 用户端
- 📖 **课程展示** - 浏览所有课程，查看详情
- 👨🏫 **教师团队** - 了解资深教师
- 📅 **在线预约** - 预约试听课程
- 🌐 **双语支持** - 中文 / English 一键切换
- 📱 **响应式设计** - 完美适配手机、平板、PC

### 管理端
- 🔐 **安全登录** - Token 认证
- 📄 **内容管理** - 编辑首页内容（支持 Markdown）
- 🖼️ **Banner 管理** - 上传图片、设置链接
- 👨🏫 **教师管理** - 添加/编辑/删除教师
- 📅 **预约管理** - 查看/删除用户预约
- 📤 **文件上传** - 拖拽上传，自动压缩为 WebP

---

## 🔧 技术栈

### 前端
| 技术 | 版本 | 说明 |
|------|------|------|
| [Vue](https://vuejs.org/) | 3.4 | 渐进式框架 |
| [TypeScript](https://www.typescriptlang.org/) | 5.6 | 类型安全 |
| [Vite](https://vitejs.dev/) | 8.0 | 快速构建 |
| [Vue Router](https://router.vuejs.org/) | 4.5 | 路由管理 |

### 后端
| 技术 | 版本 | 说明 |
|------|------|------|
| [Node.js](https://nodejs.org/) | 20.x | JavaScript 运行时 |
| [Express](https://expressjs.com/) | 4.18 | Web 框架 |
| [SQLite](https://www.sqlite.org/) | 3.45 | 轻量级数据库 |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | 12.10 | SQLite 驱动 |

### 部署
| 技术 | 说明 |
|------|------|
| [PM2](https://pm2.keymetrics.io/) | 进程管理器 |
| [Nginx](https://nginx.org/) | 反向代理（可选） |
| [GitHub Actions](https://github.com/features/actions) | 自动部署（可选） |

---

## 📂 项目结构

```
danci007web/
├── backend/                # 后端代码
│   ├── controllers/       # 控制器（可选）
│   ├── routes/            # 路由（可选）
│   ├── middleware/        # 中间件（可选）
│   ├── data/              # 数据库文件（gitignore）
│   ├── uploads/           # 上传文件（gitignore）
│   ├── package.json       # 后端依赖
│   ├── server.js          # 主服务器文件
│   └── seed-courses.js   # 种子数据
│
├── src/                   # 前端源代码
│   ├── components/        # 可复用组件
│   ├── composables/       # Vue 组合式函数
│   ├── i18n/             # 国际化
│   ├── router/            # 路由配置
│   ├── types/             # TypeScript 类型定义
│   ├── utils/             # 工具函数
│   ├── views/             # 页面组件
│   ├── App.vue            # 根组件
│   ├── main.ts            # 入口文件
│   └── style.css          # 全局样式
│
├── public/                # 静态资源
│   ├── images/            # 图片资源
│   └── favicon.ico       # 网站图标
│
├── docs/                  # 项目文档
│   ├── API.md             # API 文档
│   ├── DEPLOY.md          # 部署文档
│   └── CHANGELOG.md      # 版本更新日志
│
├── scripts/               # 部署和运维脚本
│   ├── deploy.sh         # 主部署脚本
│   └── backup.sh         # 备份脚本（可选）
│
├── .env.example           # 环境变量示例
├── .gitignore            # Git 忽略规则
├── ecosystem.config.cjs   # PM2 配置文件
├── index.html             # 入口 HTML
├── package.json           # 前端依赖和脚本
├── PROJECT-STRUCTURE.md  # 项目结构说明
├── README.md              # 项目说明（本文件）
├── tsconfig.json          # TypeScript 配置
├── tsconfig.node.json     # Node 环境 TypeScript 配置
└── vite.config.ts         # Vite 配置
```

📖 **详细结构说明：** [PROJECT-STRUCTURE.md](./PROJECT-STRUCTURE.md)

---

## 🚀 快速开始

### 环境要求

- **Node.js** ≥ 20.19.0（推荐 20.x LTS）
- **npm** ≥ 10.0.0
- **Git** ≥ 2.30

### 1️⃣ 克隆项目

```bash
git clone https://github.com/AYSTBA/danci007web.git
cd danci007web
```

### 2️⃣ 安装依赖

**前端：**
```bash
npm install
```

**后端：**
```bash
cd backend
npm install --production
cd ..
```

### 3️⃣ 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，修改以下配置：
```env
# 管理员密码（⚠️ 务必修改！）
ADMIN_<SECRET_REMOVED>

# Token 密钥（⚠️ 务必修改！）
ADMIN_TOKEN_<SECRET_REMOVED>
```

### 4️⃣ 初始化数据库

```bash
cd backend
node seed-courses.js
cd ..
```

### 5️⃣ 启动开发服务器

**前端（端口 5173）：**
```bash
npm run dev
```

**后端（端口 3001）：**
```bash
cd backend
node server.js
```

**访问：**
- 前端： http://localhost:5173
- 后端 API： http://localhost:3001/api/...

---

## 📦 生产部署

### 方法 1：从 GitHub 自动部署（推荐）

**在服务器上：**

```bash
# 1. 克隆代码
cd /var/www
git clone https://github.com/AYSTBA/danci007web.git
cd danci007web

# 2. 安装依赖并构建
npm install
npm run build
cd backend
npm install --production

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，修改密码和密钥！

# 4. 使用 PM2 启动服务
cd ..
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # 开机自启（可选）
```

**以后更新代码：**
```bash
cd /var/www/danci007web
git pull
npm run build
pm2 restart danci007web
```

📖 **详细部署文档：** [docs/DEPLOY.md](./docs/DEPLOY.md)

---

### 方法 2：GitHub Webhook 自动部署（高级）

**原理：** 当你 `git push` 到 GitHub 时，服务器自动拉取代码、构建、重启服务。

**设置步骤：**

1. **在服务器上创建部署脚本：**
   ```bash
   cd /var/www/danci007web
   cat > deploy.sh << 'EOF'
   #!/bin/bash
   echo "🚀 开始自动部署..."
   git pull origin main
   npm install && npm run build
   cd backend && npm install --production
   cd ..
   pm2 restart danci007web
   echo "✅ 部署完成！"
   EOF
   chmod +x deploy.sh
   ```

2. **创建 Webhook 服务（后端添加 `webhook.js`）：**
   - 参考：[docs/DEPLOY.md - Webhook 配置](./docs/DEPLOY.md#webhook-自动部署)

3. **在 GitHub 仓库设置中添加 Webhook：**
   - Payload URL: `http://your-server:9000/webhook`
   - Content type: `application/json`
   - Secret: `your-webhook-secret`

**完成后，你只需要：**
```bash
# 本地修改代码 → git push → 服务器自动部署！🎉
git add .
git commit -m "更新说明"
git push origin main
# 等待 1-2 分钟，服务器自动更新！
```

---

## 📚 API 文档

**完整的 RESTful API 文档：** [docs/API.md](./docs/API.md)

### 快速示例

**登录获取 Token：**
```bash
curl -X POST http://165.99.43.241:3001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password": "888888"}'
```

**获取首页内容：**
```bash
curl http://165.99.43.241:3001/api/pages/home/contents
```

**提交预约：**
```bash
curl -X POST http://165.99.43.241:3001/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"name":"张三","phone":"13800138000","date":"2026-06-10","time":"14:00","course":"单词突击007基础班"}'
```

---

## 🤝 贡献指南

欢迎贡献代码、提出问题或改进建议！

### 贡献步骤

1. **Fork 本仓库**
2. **创建分支：**
   ```bash
   git checkout -b feature/your-feature
   ```
3. **提交更改：**
   ```bash
   git commit -m "Add: 你的功能描述"
   ```
4. **推送到你的 Fork：**
   ```bash
   git push origin feature/your-feature
   ```
5. **创建 Pull Request**

### 代码规范

- ✅ 使用 **TypeScript** 类型标注
- ✅ 组件使用 **Vue 3 Composition API**
- ✅ 遵循 **ESLint** 规则
- ✅ 提交信息使用 **Conventional Commits**

---

## 📝 更新日志

📖 **完整更新日志：** [docs/CHANGELOG.md](./docs/CHANGELOG.md)

### 最新版本：v1.0.0 (2026-05-22)

#### ✨ 新增功能
- 🏠 首页展示（Banner、教师团队、学员照片墙）
- 📅 在线预约系统
- 🔐 管理后台（内容管理、Banner 管理、预约管理）
- 🌐 双语支持（中文 / English）
- 📱 响应式设计

#### 🔧 优化
- ⚡ Vite 构建，秒级热更新
- 🗄️ SQLite 数据库，零配置
- 🖼️ 图片自动压缩为 WebP

---

## 📄 开源协议

本项目采用 **MIT 协议** 开源。

Copyright © 2026 中萱文化 - 深圳市龙岗区教学点

---

## 📞 联系方式

- 🌐 **官方网站：** [http://165.99.43.241:3001](http://165.99.43.241:3001)
- 📧 **联系邮箱：** （待添加）
- 📱 **微信公众号：** （待添加）
- 📍 **地址：** 深圳市龙岗区悦龙华府·二期8栋20号(中萱英语)
- 📞 **电话：** 18938908657

---

## 🙏 致谢

感谢以下开源项目：

- [Vue](https://vuejs.org/) - 渐进式框架
- [Vite](https://vitejs.dev/) - 快速构建工具
- [Express](https://expressjs.com/) - Web 框架
- [SQLite](https://www.sqlite.org/) - 轻量级数据库
- [PM2](https://pm2.keymetrics.io/) - 进程管理器

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给我一个 Star！⭐**

[🔝 回到顶部](#-单词突击007---龙岗教学点分站)

</div>
