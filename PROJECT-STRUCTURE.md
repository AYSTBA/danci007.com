# 单词突击007 - 项目结构说明

## 📁 项目结构

```
danci007web/
├── backend/                # 后端代码（Node.js + Express + SQLite）
│   ├── controllers/       # 控制器（可选，用于模块化）
│   ├── routes/            # 路由（可选，用于模块化）
│   ├── middleware/        # 中间件（可选）
│   ├── data/              # 数据库文件（gitignore）
│   │   └── .gitkeep      # 保留空目录结构
│   ├── uploads/           # 上传文件（gitignore）
│   │   └── .gitkeep      # 保留空目录结构
│   ├── package.json       # 后端依赖
│   ├── server.js          # 主服务器文件
│   └── seed-courses.js   # 种子数据
│
├── src/                   # 前端源代码（Vue 3 + TypeScript）
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
├── public/                # 静态资源（直接复制到 dist/）
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
├── README.md              # 项目说明
├── tsconfig.json          # TypeScript 配置
├── tsconfig.node.json     # Node 环境 TypeScript 配置
└── vite.config.ts         # Vite 配置
```

## 📝 文件说明

### 根目录配置文件
- **`package.json`** - 前端依赖、构建脚本
- **`vite.config.ts`** - Vite 构建配置
- **`tsconfig.json`** - TypeScript 配置
- **`.env.example`** - 环境变量模板（复制为 `.env` 并修改）
- **`ecosystem.config.cjs`** - PM2 进程管理配置

### 前端 (`src/`)
- **`views/`** - 页面级组件（Home, About, Booking, Admin, Course）
- **`components/`** - 可复用组件（Banner, TeacherCard, etc.）
- **`composables/`** - Vue 3 组合式函数（useLanguage, useBannerCarousel）
- **`router/`** - Vue Router 配置
- **`types/`** - TypeScript 接口和类型定义
- **`utils/`** - 工具函数（fetchJson, getImageUrl, etc.）
- **`i18n/`** - 国际化配置

### 后端 (`backend/`)
- **`server.js`** - Express 服务器主文件（所有 API 路由）
- **`package.json`** - 后端依赖（express, better-sqlite3, etc.）
- **`data/`** - SQLite 数据库文件（自动生成，不提交到 Git）
- **`uploads/`** - 用户上传文件（不提交到 Git）

### 文档 (`docs/`)
- **`API.md`** - RESTful API 文档
- **`DEPLOY.md`** - 部署指南
- **`CHANGELOG.md`** - 版本更新记录

### 脚本 (`scripts/`)
- **`deploy.sh`** - 一键部署脚本
- **`backup.sh`** - 数据库和文件备份脚本

---

## 🚀 快速开始

### 前端开发
```bash
npm install       # 安装依赖
npm run dev       # 启动开发服务器（端口 5173）
npm run build     # 构建生产版本（输出到 dist/）
```

### 后端开发
```bash
cd backend
npm install       # 安装依赖
node server.js    # 启动服务器（端口 3001）
```

### 生产部署
```bash
npm run build     # 构建前端
cd backend
pm2 start ecosystem.config.cjs  # 使用 PM2 管理进程
```

---

## 📦 构建输出

- **`dist/`** - 前端构建输出（被 `.gitignore` 忽略）
  - 由 `npm run build` 生成
  - 由后端 `express.static` 提供服务
  - **不应提交到 Git**

---

## 🔧 技术栈

### 前端
- **Vue 3** - 渐进式框架
- **TypeScript** - 类型安全
- **Vite** - 快速构建工具
- **Vue Router** - 路由管理

### 后端
- **Node.js** - JavaScript 运行时
- **Express** - Web 框架
- **SQLite** - 轻量级数据库
- **better-sqlite3** - SQLite 驱动

### 部署
- **PM2** - 进程管理器
- **Nginx** - 反向代理（可选）

---

## 📚 相关文档

- [API 文档](./docs/API.md)
- [部署指南](./docs/DEPLOY.md)
- [更新日志](./docs/CHANGELOG.md)
- [GitHub 仓库](https://github.com/AYSTBA/danci007web)

---

**最后更新：** 2026-06-04
