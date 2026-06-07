# 📘 单词突击007 - 龙岗教学点分站

<div align="center">

**智能单词学习系统 - 深圳市龙岗区教学点**

[![Vue 3](https://img.shields.io/badge/Vue-3.4-brightgreen?style=flat&logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green?style=flat&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat&logo=express)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3.45-003B57?style=flat&logo=sqlite)](https://www.sqlite.org/)

[🚀 在线演示](https://zxsz007.cn) | [📚 API 文档](./docs/API.md) | [📝 更新日志](./docs/CHANGELOG.md)

</div>

---

## ✨ 项目简介

**单词突击007** 是一款智能单词学习系统，基于艾宾浩斯遗忘曲线理论，帮助用户高效记忆英语单词。

本项目是 **深圳市龙岗区教学点** 的分站，包含：
- 🏠 **官方网站** - 展示课程、教师、预约报名
- 🔐 **管理后台** - 管理内容、预约、课程、访客分析
- 🖥 **服务器运行面板** - 实时监控 CPU、内存、磁盘、GPU
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
- 🎓 **课程管理** - 课程 CRUD
- 📊 **访客分析** - 独立访客统计、浏览器/OS 分布、IP 地理
- 🖥 **服务器监控** - CPU/内存/磁盘/GPU 实时使用率
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
│   ├── components/        # 可复用组件（ImageEditor）
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
├── .gitignore
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

# 3. 启动后端（端口 3001）
cd backend && node server.js

# 4. 新终端启动前端（端口 5173）
npm run dev
```

---

## 🚢 部署

### 生产服务器
- **域名：** https://zxsz007.cn
- **IP：** 165.99.43.241
- **后端端口：** 3001（Nginx 反向代理）
- **进程管理：** PM2

### 更新代码

```bash
# 本地修改 → 推送
git add .
git commit -m "描述"
git push origin main

# 服务器自动更新（或手动 SSH 执行）
ssh root@165.99.43.241
cd /root/danci007web
git fetch origin +refs/heads/main:refs/remotes/origin/main
git reset --hard origin/main
pm2 restart danci007web --update-env
```

> **注意：** 服务器不执行 `npm run build`，`dist/` 已包含在 git 中。

---

## 📚 API 文档

**完整 RESTful API 文档：** [docs/API.md](./docs/API.md)

---

## 📝 更新日志

[docs/CHANGELOG.md](./docs/CHANGELOG.md)

---

## 📄 开源协议

MIT License

Copyright © 2026 中萱文化 - 深圳市龙岗区教学点

---

## 📞 联系方式

- 🌐 **网站：** https://zxsz007.cn
- 📍 **地址：** 深圳市龙岗区悦龙华府·二期8栋20号（中萱英语）
- 📞 **电话：** 18938908657
