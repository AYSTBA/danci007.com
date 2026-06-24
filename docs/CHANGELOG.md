# 更新日志 (Changelog)

## [未发布] - 2026-06-04

### ✨ 新功能
- 添加页面加载动画：全屏黑底 + SVG 闪电路径（右上往下爬行）、绿色渐变进度条、百分比、居左标题（得意黑字体）
- 后端首页: http://localhost:3001/ 显示"你现在是在后端页面"，提供跳转前端和查看 API 文档链接
- API 文档页: http://localhost:3001/docs 使用 marked.js + highlight.js 渲染 API.md

### 🎨 样式
- 加载动画字体使用得意黑 (SmileySans-Oblique)
- 左对齐标题布局，进度条固定在底部，适配手机端 safe-area

### 🐛 修复
- CSS animation 简写覆盖 animation-delay/duration 自定义变量导致闪电不显示
- 后端 / 路由被 express.static() 提前拦截，移至 static 中间件之前

### 📚 文档
- API.md 顶部添加项目简介和技术栈概述
- API.md 底部移除"相关链接"段（前端/管理后台/GitHub URL）

### 🔧 其他
- Vite 端口恢复为 80

### 🔧 优化
- 整理项目结构，创建 docs/ 和 scripts/ 文件夹
- 删除冲突的数据库文件
- 删除 dist/ 文件夹（不应在仓库中）
- 更新 .gitignore 规则
- 创建 PROJECT-STRUCTURE.md 说明文档

### 📚 文档（前期）
- 添加 API 文档 (docs/API.md)
- 添加部署文档 (docs/DEPLOY.md)
- 添加项目结构说明 (PROJECT-STRUCTURE.md)

---

## [1.0.0] - 2026-05-22

### ✨ 初始版本
- 前端：Vue 3 + Vite + TypeScript
- 后端：Node.js + Express + SQLite
- 功能：首页、关于、预约、管理后台、课程展示
- 部署：PM2 进程管理
