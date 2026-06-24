# 单词突击007 — 功能能力清单

## 页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页 | `/` | GSAP 入场动效 + 滚动触发动画，Banner 轮播，教师团队，3D 照片墙，双语 |
| 关于我们 | `/about` | 品牌介绍、数据统计、课程特色 Banner 轮播，Grainient 背景 |
| 预约 | `/booking` | 预约试听表单（名称+电话+邮箱选填+课程） |
| 课程 | `/course` | 课程列表 + 点击查看详情弹窗，评分星星 |
| 团购 | `/group-buy` | 创建/加入团购，分享链接，树状查看参与者 |
| 管理后台 | `/admin/*` | 内容/Banner/教师/预约/课程/团购管理 |
| 服务器监控 | `/admin/server` | CPU/内存/磁盘实时曲线图 |
| 访客分析 | `/admin/visits` | 独立访客/浏览器/OS 地域分布统计 |
| 404 | `/:shareId` | 通配路由，显示未找到页面 |

## 前端组件

| 组件 | 说明 |
|------|------|
| `LoadingScreen.vue` | 首屏闪电 SVG + 进度条动画，`sessionStorage('loaded')` 仅首次显示 |
| `Grainient.vue` | 桌面 WebGL(OGL) 全屏动态渐变色，移动端纯 CSS 渐变降级，全局单例 Canvas |
| `MobileTabBar.vue` | 移动端底部毛玻璃导航栏，fixed 定位 |
| `useBannerCarousel` | Banner 自动轮播 composable，Home/About 共用 |
| `useDevice` | 移动端检测 composable |
| `useLanguage` | 中英文切换 composable |

## 核心功能

### 双语支持
- 全站中英文切换，按钮在页面头部
- 内容管理支持中英文分别编辑
- 课程、Banner、教师、团购等均支持双语

### 响应式
- 桌面/平板/手机三端适配
- 移动端 320px~768px 断点适配
- iOS safe-area-inset 兼容
- 移动端禁用 `backdrop-filter` 和 WebGL

### 首屏加载动画
- 闪电 SVG 动效 + 进度条
- 3 秒动画 + 0.8s 滑出过渡
- 仅首次访问显示（`sessionStorage` 控制）
- 得意黑字体（SmileySans）

### 团购拼课
- 名称即账户，无需注册
- 创建团购 → 分享链接 → 他人加入
- 树状图结构查看参与人
- 管理员可删除参与者

### 管理后台
- 密码登录（Token 认证）
- 首页内容编辑（支持 Markdown）
- Banner 管理（上传+双语标题+链接）
- 教师管理（添加/编辑/删除+头像上传）
- 预约管理（查看/删除）
- 课程管理（CRUD+详情编辑）
- 团购管理（树状图查看+删除）
- **访客分析**：独立访客统计、浏览器分布、操作系统分布、每日访问量折线图
- **服务器监控**：CPU 使用率、内存占用、磁盘使用率、系统运行时间

### 访客追踪
- 路由变化自动上报（sendBeacon）
- 记录 path、screen_resolution、language、referer
- 访客统计：今日/昨日/本月/总独立访客

### 动画
- **GSAP + ScrollTrigger** 首页入场和滚动动画
- **Grainient WebGL 渐变** 桌面端全屏动态渐变色（OGL 库）
- **Canvas 单例** 全局唯一 WebGL 上下文，页面切换仅更新颜色参数
- **LoadingScreen** 闪电 SVG + 辉光 + 字符逐个出现动画

## 后端 API

| 路径 | 说明 |
|------|------|
| `GET /api/banners` | 获取条幅列表 |
| `POST /api/banners` | 添加条幅（管理端） |
| `DELETE /api/banners/:id` | 删除条幅 |
| `GET /api/pages/:page/contents` | 获取页面内容 |
| `PUT /api/pages/:page/contents` | 更新页面内容 |
| `GET /api/teachers` | 获取教师列表 |
| `POST /api/teachers` | 添加教师 |
| `PUT /api/teachers/:id` | 更新教师 |
| `DELETE /api/teachers/:id` | 删除教师 |
| `GET /api/appointments` | 获取预约列表 |
| `POST /api/appointments` | 提交预约 |
| `DELETE /api/appointments/:id` | 删除预约 |
| `GET /api/courses` | 获取课程列表 |
| `POST /api/courses` | 添加课程 |
| `PUT /api/courses/:id` | 更新课程 |
| `DELETE /api/courses/:id` | 删除课程 |
| `GET /api/group-buys` | 获取团购列表 |
| `POST /api/group-buys` | 创建团购 |
| `POST /api/group-buys/:code/join` | 加入团购 |
| `DELETE /api/group-buys/:id/participants/:pid` | 删除参与者 |
| `DELETE /api/group-buys/:id` | 删除团购 |
| `POST /api/visit` | 上报访客数据 |
| `GET /api/visits/stats` | 访客统计数据 |
| `POST /api/admin/login` | 管理员登录 |
| `POST /api/admin/verify` | 验证 Token |
| `POST /api/upload` | 文件上传（自动 WebP 压缩） |
| `GET /api/server/status` | 服务器状态（CPU/内存/磁盘/运行时间） |
| `GET /api/server/logs` | 最近 N 行日志 |

## 部署

- **双仓库**：公开仓库 `danci007.com` + 私有服务器仓库 `zxsz007.com_server`
- **双分支**：`main` 分支公开，`server` 分支私有（含服务器配置）
- **Nginx** 反向代理，`/api` `/uploads` 代理到后端 3001
- **PM2** 进程管理
- **Gzip + Brotli** 静态资源压缩
- **字体缓存** `/fonts/` 1 年强缓存
- `dist/` 直接部署，服务器无需 build

## 已知限制

- 团购名称即账户，无独立账户系统
- 移动端不支持 Grainient WebGL（CSS 渐变替代）
- 通配路由 `:shareId` 需写在固定路由之后
- 无用户注册/登录系统（管理后台除外）
