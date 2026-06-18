# 📘 单词突击007 - 教学点分站

<div align="center">

**智能单词学习系统 - 教学点分站模板**

[![Vue 3](https://img.shields.io/badge/Vue-3.4-brightgreen?style=flat&logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green?style=flat&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat&logo=express)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3.45-003B57?style=flat&logo=sqlite)](https://www.sqlite.org/)

[📚 API 文档](./docs/API.md) | [📝 更新日志](./docs/CHANGELOG.md) | [🚀 部署指南](./docs/DEPLOY.md)

</div>

---

## ✨ 项目简介

**单词突击007** 是一款智能单词学习系统，基于艾宾浩斯遗忘曲线理论，帮助用户高效记忆英语单词。

本项目是教学点分站模板，包含：
- 🏠 **官方网站** - 展示课程、教师、预约报名
- 🎯 **团购拼课** - 名称即账户，分享链接拼团
- 🔐 **管理后台** - 管理内容、预约、课程、访客分析
- 🖥 **服务器运行面板** - 实时监控 CPU、内存、磁盘

---

## 🎯 功能特性

### 用户端
- 📖 **课程展示** - 浏览所有课程，查看详情
- 👨🏫 **教师团队** - 了解资深教师
- 📅 **在线预约** - 预约试听课程
- 🎯 **团购拼课** - 创建/加入团购，分享链接
- 🌐 **双语支持** - 中文 / English 一键切换
- 📱 **响应式设计** - 完美适配手机、平板、PC

### 管理端
- 🔐 **安全登录** - Token 认证
- 📄 **内容管理** - 编辑首页内容（支持 Markdown）
- 🖼️ **Banner 管理** - 上传图片、设置链接
- 👨🏫 **教师管理** - 添加/编辑/删除教师
- 📅 **预约管理** - 查看/删除用户预约
- 🎓 **课程管理** - 课程 CRUD
- 🎯 **团购管理** - 树状图查看，支持删除
- 📊 **访客分析** - 独立访客统计、浏览器/OS 分布
- 🖥 **服务器监控** - CPU/内存/磁盘实时使用率
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
| [Nginx](https://nginx.org/) | 反向代理 + 静态文件服务 |

---

## 📂 项目结构

```
danci007web/
├── backend/                # 后端代码
│   ├── data/              # 数据库文件（gitignore）
│   ├── uploads/           # 上传文件（gitignore）
│   ├── package.json       # 后端依赖
│   └── server.js          # 主服务器文件
│
├── src/                   # 前端源代码
│   ├── components/        # 可复用组件
│   ├── composables/       # Vue 组合式函数
│   ├── router/            # 路由配置
│   ├── types/             # TypeScript 类型定义
│   ├── utils/             # 工具函数
│   ├── views/             # 页面组件
│   ├── App.vue            # 根组件
│   ├── main.ts            # 入口文件
│   └── style.css          # 全局样式
│
├── dist/                  # Vite 构建输出（git 跟踪）
├── docs/                  # 项目文档
├── .env.example           # 环境变量模板
├── .gitignore
├── ecosystem.config.cjs   # PM2 配置
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

## 🚀 开发

### 环境要求
- **Node.js** ≥ 20.x
- **npm** ≥ 10

### 启动

```bash
# 1. 安装依赖
npm install
cd backend && npm install && cd ..

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，设置 ADMIN_PASSWORD

# 3. 启动后端（端口 3001）
cd backend && node server.js

# 4. 新终端启动前端（端口 5173）
npm run dev
```

---

## 🚢 部署

详见 [docs/DEPLOY.md](./docs/DEPLOY.md)

### 快速开始

```bash
# 克隆代码
git clone https://github.com/AYSTBA/danci007web.git
cd danci007web

# 配置环境变量
cp .env.example .env
# 编辑 .env，设置 ADMIN_PASSWORD 和 CORS_ORIGIN

# 启动（需要 PM2）
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

> **注意：** `dist/` 已包含在 git 中，服务器无需执行 `npm run build`。

---

## 📚 API 文档

**完整 RESTful API 文档：** [docs/API.md](./docs/API.md)

---

## 📝 更新日志

[docs/CHANGELOG.md](./docs/CHANGELOG.md)

---

## 🔐 安全说明

- 管理员密码通过 `.env` 文件配置，**不要提交到 git**
- 生产环境请设置 `CORS_ORIGIN` 为你的域名（不要留 `*`）
- 建议配置 HTTPS

---

## 📄 开源协议

MIT License
