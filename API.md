# 单词突击007 — API 文档

> Base URL: `https://zxsz007.cn` (生产) / `http://localhost:3001` (本地)
>
> 所有响应均为 JSON。错误返回 `{ "error": "..." }`，HTTP 状态码遵循 REST 约定。

---

## 目录

- [通用规范](#通用规范)
- [鉴权](#鉴权)
- [公开 API](#公开-api)
  - [页面内容](#页面内容)
  - [Banner 轮播](#banner-轮播)
  - [教师](#教师)
  - [课程](#课程)
  - [课程评价](#课程评价)
  - [课程互动](#课程互动)
  - [预约](#预约)
  - [课程报名](#课程报名)
- [管理 API（需鉴权）](#管理-api需鉴权)
  - [登录登出](#登录登出)
  - [页面内容编辑](#页面内容编辑)
  - [Banner 管理](#banner-管理)
  - [教师管理](#教师管理)
  - [课程管理](#课程管理)
  - [预约记录](#预约记录)
  - [课程报名记录](#课程报名记录)
  - [评价/互动管理](#评价互动管理)
  - [文件上传](#文件上传)
  - [孤儿文件清理](#孤儿文件清理)
- [错误码速查](#错误码速查)

---

## 通用规范

| 项 | 约定 |
|---|---|
| 协议 | HTTPS (生产) / HTTP (本地) |
| 路径前缀 | `/api` |
| 字符集 | UTF-8 |
| 请求头 | `Content-Type: application/json` (除上传外) |
| 时间格式 | ISO 8601 字符串 (e.g. `2026-06-05 15:36:25`) |
| 分页 | **不支持**，所有列表接口直接返回完整数组 |
| CORS | 生产限定 `CORS_ORIGIN` 配置的域名 |
| 限流 | 登录接口 10/15min（生产） / 1000/15min（开发） |
| Body 大小 | 5MB 上限 |
| 文件上传 | multipart/form-data，单文件 10MB |

---

## 鉴权

### 登录获取 token

```http
POST /api/admin/login
Content-Type: application/json

{ "password": "YOUR_ADMIN_PASSWORD" }
```

**响应**：
```json
{ "success": true, "token": "eyJpYXQiOjE3ODA2NzI0NTg2NDQs..." }
```

**Token 格式**：`base64url(payload).base64url(hmac_sha256)`，有效期 **24 小时**。

**使用 token**：所有管理 API 都需要在请求头带上：

```http
GET /api/admin/banners
X-Admin-Token: eyJpYXQiOjE3ODA2NzI0NTg2NDQs...
```

**错误**：
| 状态码 | 含义 |
|---|---|
| 400 | 请求体格式错误 |
| 403 | 密码错误 |
| 429 | 登录尝试过于频繁（15min 内 10 次） |

### 校验 token

无显式接口，但任何 `X-Admin-Token` 头缺失或无效的管理 API 都会返回 401。

### 登出

```http
POST /api/admin/logout
```

> 注：服务端目前没有维护 token 黑名单，token 仍会 24h 内有效。客户端只需 `sessionStorage.removeItem('adminToken')`。

---

## 公开 API

### 页面内容

#### `GET /api/pages/home`

获取首页所有可编辑文本（站点名、标语、营业时间等）。

**响应**：
```json
{
  "site_name":       { "value": "中萱文化",          "type": "text" },
  "site_name_en":    { "value": "Zhongxuan Culture", "type": "text" },
  "site_note":       { "value": "...",               "type": "text" },
  "site_note_en":    { "value": "...",               "type": "text" },
  "hero_title":      { "value": "...",               "type": "text" },
  "hero_title_en":   { "value": "...",               "type": "text" },
  "hero_subtitle":   { "value": "...",               "type": "text" },
  "hero_subtitle_en":{ "value": "...",               "type": "text" },
  "business_hours_weekday": { "value": "9:00 - 21:00", "type": "text" },
  "business_hours_weekend": { "value": "10:00 - 18:00", "type": "text" },
  "wechat_qrcode":   { "value": "/uploads/xxx.webp", "type": "text" },
  "about_content":   { "value": "...",               "type": "markdown" },
  "about_content_en":{ "value": "...",               "type": "markdown" }
}
```

> 类型为 `markdown` 的字段是 key 包含 `content` 的；前端用 markdown 渲染。
> 未在 DB 中的 key 不会出现在返回里（不会有 `null`）。

#### `GET /api/pages/home/contents`

简化版，只返回 `key → value` 映射（无 type 字段），后台编辑用。

**响应**：
```json
{
  "site_name": "中萱文化",
  "site_name_en": "Zhongxuan Culture",
  "hero_title": "...",
  ...
}
```

---

### Banner 轮播

#### `GET /api/banners`

获取首页轮播图（仅 active=1 的）。

**响应**：
```json
[
  {
    "id": 1,
    "title": "标题中文",
    "title_en": "Title English",
    "image_url": "/uploads/banner1.webp",
    "image_url_en": "/uploads/banner1-en.webp",
    "link": "",
    "active": 1,
    "sort_order": 0,
    "created_at": "2026-06-01 10:00:00",
    "updated_at": "2026-06-01 10:00:00"
  },
  ...
]
```

排序：`sort_order ASC`（数字小排前）。

---

### 教师

#### `GET /api/teachers`

获取教师列表（仅 active=1）。

**响应**：
```json
[
  {
    "id": 1,
    "name": "张老师",
    "name_en": "Ms. Zhang",
    "title": "高级讲师",
    "title_en": "Senior Lecturer",
    "description": "...",
    "description_en": "...",
    "avatar": "/uploads/avatar1.webp",
    "active": 1,
    "sort_order": 0,
    "created_at": "...",
    "updated_at": "..."
  }
]
```

---

### 课程

#### `GET /api/courses`

获取所有上架课程（active=1）。**返回的是简化的课程对象**，不含 features 解析。

**响应**：
```json
[
  {
    "id": 1,
    "course_id": "enroll",
    "name": "单词突击007 - 英语课程报名",
    "name_en": "Word Blitz 007 - English Enrollment",
    "subtitle": "...",
    "subtitle_en": "...",
    "description": "...",
    "description_en": "...",
    "price": "2980",
    "original_price": "3980",
    "teacher_name": "张老师",
    "teacher_name_en": "Ms. Zhang",
    "teacher_title": "高级讲师",
    "teacher_title_en": "Senior Lecturer",
    "teacher_avatar": "/uploads/avatar1.webp",
    "banner_image": "/uploads/banner-course1.webp",
    "features": "[{\"icon\":\"⭐\",\"title\":\"...\",\"desc\":\"...\"}]",
    "lesson_count": "10",
    "student_count": "500",
    "status": "招生中",
    "validity": "长期有效",
    "sort_order": 0,
    "active": 1,
    "created_at": "...",
    "updated_at": "..."
  }
]
```

排序：`sort_order ASC, created_at DESC`。

> `features` 字段是 JSON 字符串，需要 `JSON.parse()` 解析成数组。

#### `GET /api/courses/:id`

获取单个课程详情（按 `course_id` 字段，不是数字 id）。`features` **已自动解析**为数组。

**响应**：
```json
{
  "id": 1,
  "course_id": "enroll",
  "name": "...",
  "name_en": "...",
  ...
  "features": [
    { "icon": "⭐", "title": "亮点1", "desc": "描述1" },
    { "icon": "📚", "title": "亮点2", "desc": "描述2" }
  ],
  ...
}
```

**错误**：
- `404` - 课程不存在或已下架（active=0）

---

### 课程评价

#### `GET /api/courses/:id/reviews`

获取某课程的所有评价（公开，按 `created_at DESC`）。

**响应**：
```json
[
  {
    "id": 1,
    "course_id": "enroll",
    "name": "小明妈妈",
    "rating": 5,
    "content": "孩子很喜欢...",
    "created_at": "..."
  }
]
```

#### `POST /api/courses/:id/reviews`

提交评价。

**请求体**：
```json
{
  "name": "小明妈妈",         // 可选，默认 "匿名"
  "rating": 5,                // 1-5，超出会被截断
  "content": "孩子很喜欢..."   // 必填，最长 2000 字
}
```

**响应**：`{ "success": true, "id": 123 }`

**错误**：
- `400` - 评价内容 > 2000 字

---

### 课程互动

#### `GET /api/courses/:id/interactions`

获取某课程的所有互动评论（公开）。

#### `POST /api/courses/:id/interactions`

提交评论。

**请求体**：
```json
{
  "name": "匿名用户",        // 可选
  "content": "请问怎么报名？" // 必填，1-500 字
}
```

**错误**：
- `400` - 内容为空或 > 500 字

---

### 预约

#### `POST /api/bookings`

公开提交预约表单（不需要 token）。前端在 `/booking` 页面调用。

**请求体**：
```json
{
  "name": "张三",                  // 必填，≤ 50 字
  "age": "25",                      // 可选，1-120
  "phone": "13800138000",           // 必填，≤ 30 字
  "email": "zhang@example.com",     // 可选
  "date": "2026-06-10",             // 可选，YYYY-MM-DD
  "time": "19:00-20:00",            // 可选
  "message": "希望尽快开课",         // 可选
  "course": "enroll",               // 可选，course_id
  "course_name": "单词突击007 - 英语课程报名"  // 可选
}
```

**响应**：`{ "success": true, "id": 5 }`

**错误**：
- `400` - 姓名/电话为空，或年龄非法，或字段超长

---

### 课程报名

#### `POST /api/course-enroll`

公开接口，课程详情页"立即报名"按钮专用（区别于 /booking 通用咨询）。

**请求体**：
```json
{
  "course_id": "enroll",
  "course_name": "...",
  "name": "李四",
  "phone": "13900139000"
}
```

**响应**：`{ "success": true, "id": 10 }`

---

## 管理 API（需鉴权）

> 所有管理 API 必须带 `X-Admin-Token` 头，否则 401。
> 涉及删除/修改的操作不可撤销（除登录登出外）。

### 登录登出

见 [鉴权](#鉴权) 章节。

---

### 页面内容编辑

#### `PUT /api/pages/home/contents`

批量更新首页文本。

**请求体**（任意 key-value 对）：
```json
{
  "site_name": "新站点名",
  "site_name_en": "New Site Name",
  "hero_title": "新标语"
}
```

只更新请求体里出现的 key，不在请求体里的 key 不变。

**响应**：`{ "success": true }`

---

### Banner 管理

#### `GET /api/admin/banners`

返回**所有** Banner（含 active=0 的），排序 `sort_order ASC`。

#### `POST /api/banners`

新增 Banner。

**请求体**：
```json
{
  "title": "标题中文",
  "title_en": "Title EN",
  "image_url": "/uploads/x.webp",   // 必填（前端先调 /api/upload 拿 URL）
  "image_url_en": "/uploads/y.webp",
  "link": "https://...",
  "active": 1,                       // 默认 1
  "sort_order": 0
}
```

**响应**：`{ "id": 6 }`

#### `PUT /api/banners/:id`

更新 Banner（部分更新，所有字段可选；NULL 表示不改）。

**请求体**：同 POST，但所有字段都允许 `null`/省略，COALESCE 保护不被覆盖。

**响应**：`{ "success": true }`

#### `DELETE /api/banners/:id`

删除 Banner。**不会删除对应的上传图片**（需手动清理或等孤儿清理 cron）。

**响应**：`{ "success": true }`

---

### 教师管理

#### `GET /api/admin/teachers`

返回所有教师（含 active=0 的）。**注意**：实际代码是 `GET /api/teachers`（公开版）返回 active=1，admin 版暂无，但 Admin.vue 直接调公开接口。

> ⚠ 当前 Admin.vue 用 `GET /api/teachers` 拿列表（公开版只看 active=1）。如要管理 inactive 的教师，临时改 SQL 即可。

#### `POST /api/teachers`

**请求体**：
```json
{
  "name": "...",
  "name_en": "...",
  "title": "...",
  "title_en": "...",
  "description": "...",
  "description_en": "...",
  "avatar": "/uploads/...",
  "active": 1,
  "sort_order": 0
}
```

**响应**：`{ "id": 5 }`

#### `PUT /api/teachers/:id`

部分更新（COALESCE 模式）。

#### `DELETE /api/teachers/:id`

删除。

---

### 课程管理

#### `GET /api/admin/courses`

返回所有课程（含 inactive 的），按 `created_at DESC`。

#### `POST /api/courses`

新增课程。

**请求体**：
```json
{
  "course_id": "enroll",            // 必填，2-40 字 [a-zA-Z0-9_-]
  "name": "课程名",
  "name_en": "Course Name",
  "subtitle": "...",
  "subtitle_en": "...",
  "description": "...",
  "description_en": "...",
  "price": "2980",
  "original_price": "3980",
  "teacher_name": "...",
  "teacher_name_en": "...",
  "teacher_title": "...",
  "teacher_title_en": "...",
  "teacher_avatar": "/uploads/...",
  "banner_image": "/uploads/...",
  "features": [{"icon":"⭐","title":"...","desc":"..."}],
  "lesson_count": "10",
  "student_count": "500",
  "status": "招生中",
  "validity": "长期有效",
  "sort_order": 0,
  "active": 1
}
```

**响应**：`{ "id": 7 }`

**错误**：
- `400` - `course_id` 格式错（必须是 2-40 字 `[a-zA-Z0-9_-]`）
- `500` - DB 错误（一般是 UNIQUE 冲突，`course_id` 已存在）

#### `PUT /api/courses/:id`

部分更新。**注意**：URL 里的 `:id` 是**数字主键**，不是 `course_id` 字符串。

#### `DELETE /api/courses/:id`

删除课程（按数字主键）。

---

### 预约记录

#### `GET /api/bookings`

返回所有预约（按 `created_at DESC`）。

**响应**：
```json
[
  {
    "id": 1,
    "name": "张三",
    "phone": "13800138000",
    "email": "...",
    "age": "25",
    "date": "2026-06-10",
    "time": "19:00-20:00",
    "message": "...",
    "course": "enroll",
    "course_name": "单词突击007",
    "created_at": "..."
  }
]
```

#### `DELETE /api/bookings/:id`

删除单条预约。

---

### 课程报名记录

#### `GET /api/course-enrollments`

返回所有课程详情页"立即报名"提交的记录（区别于通用 `/api/bookings`）。

**响应**：
```json
[
  {
    "id": 1,
    "course_id": "enroll",
    "course_name": "...",
    "name": "李四",
    "phone": "13900139000",
    "created_at": "..."
  }
]
```

#### `DELETE /api/course-enrollments/:id`

删除。

---

### 评价/互动管理

#### `GET /api/admin/course-reviews`

所有课程的评价（不限课程）。

#### `GET /api/admin/course-interactions`

所有课程的互动。

#### `DELETE /api/course-reviews/:id`

删除评价。

#### `DELETE /api/course-interactions/:id`

删除互动。

---

### 文件上传

#### `POST /api/upload`

`multipart/form-data` 单文件上传，自动转 webp 压缩。

**请求**：
- Header: `X-Admin-Token: ...`
- Body: `multipart/form-data`，字段名 `file`，任意图片格式

**服务端处理**：
1. multer 内存存储，10MB 限制
2. sharp 转 webp，1920×1920 等比缩放（不放大），质量 85
3. 文件名：`<timestamp>-<random>.webp`
4. 保存到 `backend/uploads/`
5. 返回 `/uploads/<filename>` 路径

**响应**：
```json
{ "url": "/uploads/1780668465159-555258858.webp" }
```

**错误**：
- `400` - 缺少文件
- `401` - 未鉴权
- `413` - 文件 > 10MB
- `500` - sharp 处理失败

**前端使用流程**：
1. 用户选文件 → `ImageEditor.vue` 裁剪
2. 用户确认 → 自动 `POST /api/upload` 返回 URL
3. 课程/Banner 表单拿到 URL 字段 → 提交保存到 DB

---

### 孤儿文件清理

`backend/uploads/` 里可能存在"上传后没保存到 DB"的文件（例如编辑时上传但最后没点保存）。这会浪费磁盘。

#### `GET /api/admin/orphan-uploads`

扫描并返回未被 DB 任何列引用的文件。

**响应**：
```json
{
  "orphans": ["1780668465159-555258858.webp", "..."],
  "count": 11,
  "totalSize": 1295214
}
```

`count` 是孤儿文件数，`totalSize` 是总字节数。

#### `POST /api/admin/orphan-uploads`

删除孤儿文件。

**请求体**（三种模式）：

```json
{ "olderThanHours": 24 }            // 模式 1: 删除所有 24 小时前的孤儿
{ "paths": ["file1.webp","file2.webp"] }  // 模式 2: 只删指定文件
{ "olderThanHours": 24, "paths": [...] }  // 模式 3: 同时指定
```

- `paths` 数组里的项必须是**纯文件名**（不能含 `/` 或 `\`），防止跨目录攻击
- `olderThanHours` 用文件 mtime 与当前时间比较

**响应**：
```json
{ "success": true, "deleted": 10, "total": 11 }
```

#### CLI 模式（cron 用）

```bash
# 删除所有 24 小时前的孤儿文件
node backend/server.js --cleanup 24
# 输出: [cleanup] 删除 5 个 24h 前的孤儿文件 (0.5 MB)
```

每天 3 点由 cron 自动执行 `node backend/server.js --cleanup 24`。

---

## 错误码速查

| 状态码 | 含义 | 典型场景 |
|---|---|---|
| 200 | OK | 成功 |
| 400 | Bad Request | 请求体格式错误、必填字段缺失、字段超长 |
| 401 | Unauthorized | 缺少/无效 `X-Admin-Token` |
| 403 | Forbidden | 登录密码错误 |
| 404 | Not Found | 资源不存在（课程 ID 错、API 路径错） |
| 413 | Payload Too Large | 上传文件 > 10MB |
| 429 | Too Many Requests | 登录爆破被限流 |
| 500 | Internal Server Error | DB 错误、sharp 失败、服务器异常 |

---

## 实战示例（curl）

```bash
# 1. 登录
TOKEN=$(curl -s -X POST https://zxsz007.cn/api/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"password":"YOUR_PASSWORD"}' | grep -oE '"token":"[^"]+' | cut -d'"' -f4)

# 2. 用 token 调管理 API
curl -s https://zxsz007.cn/api/admin/courses \
  -H "X-Admin-Token: $TOKEN"

# 3. 上传图片
curl -s -X POST https://zxsz007.cn/api/upload \
  -H "X-Admin-Token: $TOKEN" \
  -F "file=@/path/to/photo.jpg"
# → {"url":"/uploads/1780668465159-555258858.webp"}

# 4. 创建课程
curl -s -X POST https://zxsz007.cn/api/courses \
  -H "X-Admin-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "trial-001",
    "name": "体验课",
    "name_en": "Trial Class",
    "price": "1",
    "active": 1
  }'

# 5. 扫描孤儿文件
curl -s https://zxsz007.cn/api/admin/orphan-uploads \
  -H "X-Admin-Token: $TOKEN"
```

---

## 数据库表结构

> 文件：`backend/data/danci007.db`，SQLite WAL 模式。改表结构直接改 `backend/server.js` 的 `initDb()` 块，新部署自动建表；老库会自动 `ALTER TABLE ADD COLUMN` 补齐。

### `page_contents`
| 列 | 类型 | 说明 |
|---|---|---|
| `key` | TEXT PK | 文本 key，如 `site_name` / `hero_title` |
| `value` | TEXT | 值 |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

### `banners`
| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | |
| `title` / `title_en` | TEXT | 标题中/英 |
| `image_url` / `image_url_en` | TEXT | 图片路径中/英 |
| `link` | TEXT | 跳转 URL |
| `active` | INTEGER | 0/1 |
| `sort_order` | INTEGER | 排序，数字小在前 |
| `created_at` / `updated_at` | DATETIME | |

### `teachers`
| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PK | |
| `name` / `name_en` | TEXT | 姓名中/英 |
| `title` / `title_en` | TEXT | 职称中/英 |
| `description` / `description_en` | TEXT | 简介中/英 |
| `avatar` | TEXT | 头像路径 |
| `active` / `sort_order` | INTEGER | |
| `created_at` / `updated_at` | DATETIME | |

### `courses`
| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PK | |
| `course_id` | TEXT UNIQUE | 业务 ID（URL 标识） |
| `name` / `name_en` | TEXT | 课程名中/英 |
| `subtitle` / `subtitle_en` | TEXT | 副标题中/英 |
| `description` / `description_en` | TEXT | 描述中/英 |
| `price` / `original_price` | TEXT | 价格（字符串，避免精度问题） |
| `teacher_*` | TEXT | 教师信息中/英（4 字段 + 头像） |
| `banner_image` | TEXT | 课程封面图路径 |
| `features` | TEXT | JSON 字符串 `[{icon,title,desc}]` |
| `lesson_count` / `student_count` | TEXT | 课时 / 学员数 |
| `status` | TEXT | "招生中" / "已完结" 等 |
| `validity` | TEXT | "长期有效" / "3个月" 等 |
| `sort_order` | INTEGER | 排序 |
| `active` | INTEGER | 0/1 |
| `created_at` / `updated_at` | DATETIME | |

### `bookings`
| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PK | |
| `name` | TEXT | 必填，≤ 50 字 |
| `phone` | TEXT | 必填，≤ 30 字 |
| `email` | TEXT | |
| `age` | TEXT | 1-120 |
| `date` / `time` | TEXT | 预约日期/时间 |
| `message` | TEXT | 留言 |
| `course` | TEXT | course_id（可能为空） |
| `course_name` | TEXT | 课程名（冗余存） |
| `created_at` | DATETIME | |

### `course_enrollments`
| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PK | |
| `course_id` / `course_name` | TEXT | |
| `name` / `phone` | TEXT | 必填 |
| `created_at` | DATETIME | |

### `course_reviews`
| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PK | |
| `course_id` | TEXT | 业务 ID |
| `name` | TEXT | 评价人 |
| `rating` | INTEGER | 1-5 |
| `content` | TEXT | ≤ 2000 字 |
| `created_at` | DATETIME | |

### `course_interactions`
| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PK | |
| `course_id` | TEXT | |
| `name` | TEXT | |
| `content` | TEXT | ≤ 500 字 |
| `created_at` | DATETIME | |
