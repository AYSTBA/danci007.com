# 单词突击007 - API 文档

**Base URL:** `http://165.99.43.241:3001`  
**Content-Type:** `application/json` (除了文件上传)

---

## 🔐 管理员认证

所有管理接口需要在请求头中携带 `x-admin-token`。

### 登录

**POST** `/api/admin/login`

**请求体：**
```json
{
  "password": "888888"
}
```

**响应：**
```json
{
  "success": true,
  "token": "base64url-encoded-token"
}
```

**使用示例：**
```bash
curl -X POST http://165.99.43.241:3001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password": "888888"}'
```

---

### 登出

**POST** `/api/admin/logout`

**请求头：**
```
x-admin-token: <your-token>
```

**响应：**
```json
{
  "success": true
}
```

---

## 📄 页面内容 API

### 获取首页内容

**GET** `/api/pages/home`

**响应：**
```json
{
  "site_name": { "value": "中萱文化", "type": "text" },
  "hero_title": { "value": "欢迎来到深圳市龙岗区教学点", "type": "text" },
  "hero_subtitle": { "value": "单词突击007 - 智能单词学习系统", "type": "text" },
  "why_title": { "value": "为什么选择我们", "type": "text" },
  "why_content": { "value": "## 科学的学习方法...", "type": "markdown" },
  "contact_phone": { "value": "18938908657", "type": "text" },
  "contact_address": { "value": "深圳市龙岗区...", "type": "text" },
  "business_hours_weekday": { "value": "17:00 - 21:00", "type": "text" },
  "business_hours_weekend": { "value": "9:00 - 18:30", "type": "text" }
}
```

---

### 获取所有页面内容（纯文本）

**GET** `/api/pages/home/contents`

**响应：**
```json
{
  "site_name": "中萱文化",
  "site_name_en": "Zhongxuan Culture",
  "hero_title": "欢迎来到深圳市龙岗区教学点",
  "hero_title_en": "Welcome to Longgang District Teaching Center",
  "contact_phone": "18938908657",
  "contact_email": "",
  "contact_address": "深圳市龙岗区悦龙华府·二期8栋20号(中萱英语)",
  "why_content": "## 科学的学习方法\n\n基于艾宾浩斯遗忘曲线理论...",
  "booking_rotating_texts": "专业的师资团队,科学的学习方法,轻松掌握英语单词",
  "wechat_qrcode": "",
  "business_hours_weekday": "17:00 - 21:00",
  "business_hours_weekend": "9:00 - 18:30"
}
```

---

### 更新页面内容（需要管理员权限）

**PUT** `/api/pages/home/contents`

**请求头：**
```
x-admin-token: <your-token>
```

**请求体：**
```json
{
  "site_name": "中萱文化",
  "hero_title": "欢迎来到深圳市龙岗区教学点",
  "contact_phone": "18938908657"
}
```

**响应：**
```json
{
  "success": true
}
```

---

## 🖼️ Banner API

### 获取启用的 Banner（公开）

**GET** `/api/banners`

**响应：**
```json
[
  {
    "id": 1,
    "title": "活动标题",
    "title_en": "Event Title",
    "image_url": "/uploads/banner-123456.webp",
    "image_url_en": "/uploads/banner-en-123456.webp",
    "link": "/course/intro",
    "active": 1,
    "sort_order": 0,
    "created_at": "2026-06-01 12:00:00",
    "updated_at": "2026-06-01 12:00:00"
  }
]
```

---

### 获取所有 Banner（管理员）

**GET** `/api/admin/banners`

**请求头：**
```
x-admin-token: <your-token>
```

**响应：** 同上（包含所有 active=0 的 Banner）

---

### 创建 Banner（管理员）

**POST** `/api/banners`

**请求头：**
```
x-admin-token: <your-token>
Content-Type: application/json
```

**请求体：**
```json
{
  "title": "新活动",
  "title_en": "New Event",
  "image_url": "/uploads/banner-123456.webp",
  "image_url_en": "/uploads/banner-en-123456.webp",
  "link": "/course/intro",
  "active": 1,
  "sort_order": 1
}
```

**响应：**
```json
{
  "id": 2
}
```

---

### 更新 Banner（管理员）

**PUT** `/api/banners/:id`

**请求头：**
```
x-admin-token: <your-token>
Content-Type: application/json
```

**请求体：**（所有字段可选，只传需要更新的字段）
```json
{
  "title": "更新后的标题",
  "active": 0,
  "sort_order": 2
}
```

**响应：**
```json
{
  "success": true
}
```

---

### 删除 Banner（管理员）

**DELETE** `/api/banners/:id`

**请求头：**
```
x-admin-token: <your-token>
```

**响应：**
```json
{
  "success": true
}
```

---

## 👨‍🏫 教师 API

### 获取启用的教师（公开）

**GET** `/api/teachers`

**响应：**
```json
[
  {
    "id": 1,
    "name": "李老师",
    "name_en": "Ms. Li",
    "title": "高级英语教师",
    "title_en": "Senior English Teacher",
    "description": "10年教学经验...",
    "description_en": "10 years of teaching experience...",
    "avatar": "/uploads/avatar-123456.webp",
    "active": 1,
    "sort_order": 0
  }
]
```

---

### 创建教师（管理员）

**POST** `/api/teachers`

**请求头：**
```
x-admin-token: <your-token>
Content-Type: application/json
```

**请求体：**
```json
{
  "name": "王老师",
  "name_en": "Mr. Wang",
  "title": "资深外教",
  "title_en": "Senior Foreign Teacher",
  "description": "母语为英语...",
  "description_en": "Native English speaker...",
  "avatar": "/uploads/avatar-789012.webp",
  "active": 1,
  "sort_order": 1
}
```

**响应：**
```json
{
  "id": 2
}
```

---

### 更新教师（管理员）

**PUT** `/api/teachers/:id`

**请求体：**（所有字段可选）

**响应：**
```json
{
  "success": true
}
```

---

### 删除教师（管理员）

**DELETE** `/api/teachers/:id`

**响应：**
```json
{
  "success": true
}
```

---

## 📅 预约 API

### 提交预约（公开）

**POST** `/api/bookings`

**请求体：**
```json
{
  "name": "张三",
  "phone": "13800138000",
  "email": "zhangsan@example.com",
  "date": "2026-06-10",
  "time": "14:00",
  "course": "单词突击007基础班"
}
```

**响应：**
```json
{
  "success": true,
  "id": 1
}
```

---

### 获取所有预约（管理员）

**GET** `/api/bookings`

**请求头：**
```
x-admin-token: <your-token>
```

**响应：**
```json
[
  {
    "id": 1,
    "name": "张三",
    "phone": "13800138000",
    "email": "zhangsan@example.com",
    "date": "2026-06-10",
    "time": "14:00",
    "course": "单词突击007基础班",
    "created_at": "2026-06-03 23:00:00"
  }
]
```

---

### 删除预约（管理员）

**DELETE** `/api/bookings/:id`

**响应：**
```json
{
  "success": true
}
```

---

## 📤 文件上传 API

### 上传图片（管理员）

**POST** `/api/upload`

**请求头：**
```
x-admin-token: <your-token>
Content-Type: multipart/form-data
```

**请求体：**
```
file: <binary-image-data>
```

**响应：**
```json
{
  "url": "/uploads/1717452000000-123456789.webp"
}
```

**说明：**
- 图片会自动转换为 WebP 格式
- 最大尺寸：1920x1920（超出会等比例缩放）
- 质量：85%（平衡质量和文件大小）

**使用示例：**
```bash
curl -X POST http://165.99.43.241:3001/api/upload \
  -H "x-admin-token: <your-token>" \
  -F "file=@/path/to/image.jpg"
```

---

## 🎓 课程 API

### 获取启用的课程（公开）

**GET** `/api/courses`

**响应：**
```json
[
  {
    "id": 1,
    "course_id": "basic-001",
    "name": "单词突击007基础班",
    "name_en": "Word Assault 007 Basic",
    "subtitle": "适合小学3-6年级",
    "subtitle_en": "For Elementary 3-6",
    "description": "课程内容详情...",
    "description_en": "Course details...",
    "price": "1999",
    "original_price": "2999",
    "teacher_name": "李老师",
    "teacher_name_en": "Ms. Li",
    "teacher_title": "高级英语教师",
    "teacher_title_en": "Senior English Teacher",
    "teacher_avatar": "/uploads/avatar-123456.webp",
    "banner_image": "/uploads/course-banner-123456.webp",
    "features": "["个性化学习", "智能复习", "进度追踪"]",
    "active": 1,
    "created_at": "2026-06-01 12:00:00",
    "updated_at": "2026-06-01 12:00:00"
  }
]
```

**注意：** `features` 字段是 JSON 字符串，需要 `JSON.parse()` 解析。

---

### 获取单个课程详情（公开）

**GET** `/api/courses/:id`

**示例：** `GET /api/courses/basic-001`

**响应：** 同上（单个课程对象）

**错误响应（404）：**
```json
{
  "error": "Course not found"
}
```

---

### 获取所有课程（管理员）

**GET** `/api/admin/courses`

**请求头：**
```
x-admin-token: <your-token>
```

**响应：** 同 `/api/courses`（包含所有 active=0 的课程）

---

### 创建课程（公开）

**POST** `/api/courses`

**请求体：**
```json
{
  "course_id": "advanced-001",
  "name": "单词突击007进阶班",
  "name_en": "Word Assault 007 Advanced",
  "subtitle": "适合初中1-3年级",
  "subtitle_en": "For Junior High 1-3",
  "description": "进阶课程内容...",
  "description_en": "Advanced course content...",
  "price": "2999",
  "original_price": "3999",
  "teacher_name": "王老师",
  "teacher_name_en": "Mr. Wang",
  "teacher_title": "资深外教",
  "teacher_title_en": "Senior Foreign Teacher",
  "teacher_avatar": "/uploads/avatar-789012.webp",
  "banner_image": "/uploads/course-banner-789012.webp",
  "features": ["高级词汇", "语法强化", "口语训练"],
  "active": 1
}
```

**注意：** `features` 字段是数组，后端会自动 `JSON.stringify()`

**响应：**
```json
{
  "id": 2
}
```

---

### 更新课程（管理员）

**PUT** `/api/courses/:id`

**请求头：**
```
x-admin-token: <your-token>
Content-Type: application/json
```

**请求体：**（所有字段可选）

**响应：**
```json
{
  "success": true
}
```

---

### 删除课程（管理员）

**DELETE** `/api/courses/:id`

**响应：**
```json
{
  "success": true
}
```

---

### 课程报名

**POST** `/api/course-enroll`

**请求体：**
```json
{
  "course_id": "basic-001",
  "course_name": "单词突击007基础班",
  "name": "李四",
  "phone": "13900139000"
}
```

**响应：**
```json
{
  "success": true,
  "id": 1
}
```

---

### 获取所有报名记录（管理员）

**GET** `/api/course-enrollments`

**请求头：**
```
x-admin-token: <your-token>
```

**响应：**
```json
[
  {
    "id": 1,
    "course_id": "basic-001",
    "course_name": "单词突击007基础班",
    "name": "李四",
    "phone": "13900139000",
    "created_at": "2026-06-03 23:00:00"
  }
]
```

---

### 删除报名记录（管理员）

**DELETE** `/api/course-enrollments/:id`

**响应：**
```json
{
  "success": true
}
```

---

## ⭐ 课程评价 API

### 获取课程评价（公开）

**GET** `/api/courses/:id/reviews`

**示例：** `GET /api/courses/basic-001/reviews`

**响应：**
```json
[
  {
    "id": 1,
    "course_id": "basic-001",
    "name": "张三",
    "rating": 5,
    "content": "非常好的课程！",
    "created_at": "2026-06-03 23:00:00"
  }
]
```

---

### 提交课程评价（公开）

**POST** `/api/courses/:id/reviews`

**请求体：**
```json
{
  "name": "张三",
  "rating": 5,
  "content": "非常好的课程！"
}
```

**响应：**
```json
{
  "success": true,
  "id": 1
}
```

---

### 删除评价（管理员）

**DELETE** `/api/course-reviews/:id`

**响应：**
```json
{
  "success": true
}
```

---

### 获取所有评价（管理员）

**GET** `/api/admin/course-reviews`

**响应：** 所有课程的所有评价

---

## 💬 课程互动 API

### 获取课程互动（公开）

**GET** `/api/courses/:id/interactions`

**响应：**
```json
[
  {
    "id": 1,
    "course_id": "basic-001",
    "name": "张三",
    "content": "请问这个课程适合零基础吗？",
    "created_at": "2026-06-03 23:00:00"
  }
]
```

---

### 提交课程互动（公开）

**POST** `/api/courses/:id/interactions`

**请求体：**
```json
{
  "name": "张三",
  "content": "请问这个课程适合零基础吗？"
}
```

**响应：**
```json
{
  "success": true,
  "id": 1
}
```

---

### 删除互动（管理员）

**DELETE** `/api/course-interactions/:id`

**响应：**
```json
{
  "success": true
}
```

---

### 获取所有互动（管理员）

**GET** `/api/admin/course-interactions`

**响应：** 所有课程的所有互动

---

## 🤖 Agent 集成示例

### Python 示例

```python
import requests

BASE_URL = "http://165.99.43.241:3001"

# 1. 登录获取 token
def login(password="888888"):
    response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": password})
    data = response.json()
    if data.get("success"):
        return data["token"]
    return None

# 2. 获取首页内容
def get_home_page():
    response = requests.get(f"{BASE_URL}/api/pages/home/contents")
    return response.json()

# 3. 创建 Banner（需要管理员权限）
def create_banner(token, title, image_url):
    headers = {"x-admin-token": token, "Content-Type": "application/json"}
    data = {
        "title": title,
        "image_url": image_url,
        "active": 1,
        "sort_order": 0
    }
    response = requests.post(f"{BASE_URL}/api/banners", headers=headers, json=data)
    return response.json()

# 4. 提交预约
def submit_booking(name, phone, date, time, course):
    data = {
        "name": name,
        "phone": phone,
        "date": date,
        "time": time,
        "course": course
    }
    response = requests.post(f"{BASE_URL}/api/bookings", json=data)
    return response.json()

# 使用示例
if __name__ == "__main__":
    # 登录
    token = login("888888")
    print(f"Token: {token}")
    
    # 获取首页内容
    home_content = get_home_page()
    print(home_content)
    
    # 提交预约
    result = submit_booking("张三", "13800138000", "2026-06-10", "14:00", "单词突击007基础班")
    print(result)
```

---

### JavaScript/Node.js 示例

```javascript
const axios = require('axios');

const BASE_URL = 'http://165.99.43.241:3001';

// 1. 登录获取 token
async function login(password = '888888') {
  const response = await axios.post(`${BASE_URL}/api/admin/login`, { password });
  if (response.data.success) {
    return response.data.token;
  }
  return null;
}

// 2. 获取首页内容
async function getHomePage() {
  const response = await axios.get(`${BASE_URL}/api/pages/home/contents`);
  return response.data;
}

// 3. 创建 Banner（需要管理员权限）
async function createBanner(token, title, imageUrl) {
  const response = await axios.post(
    `${BASE_URL}/api/banners`,
    { title, image_url: imageUrl, active: 1, sort_order: 0 },
    { headers: { 'x-admin-token': token } }
  );
  return response.data;
}

// 4. 提交预约
async function submitBooking(name, phone, date, time, course) {
  const response = await axios.post(`${BASE_URL}/api/bookings`, {
    name, phone, date, time, course
  });
  return response.data;
}

// 使用示例
(async () => {
  // 登录
  const token = await login('888888');
  console.log('Token:', token);
  
  // 获取首页内容
  const homeContent = await getHomePage();
  console.log(homeContent);
  
  // 提交预约
  const result = await submitBooking('张三', '13800138000', '2026-06-10', '14:00', '单词突击007基础班');
  console.log(result);
})();
```

---

## 📝 注意事项

1. **管理员接口** 需要在请求头中携带 `x-admin-token`
2. **Token 有效期** 24 小时，过期后需要重新登录
3. **文件上传** 使用 `multipart/form-data` 格式
4. **课程 features 字段** 是 JSON 字符串，前端需要 `JSON.parse()` 解析
5. **生产环境** 务必修改 `.env` 中的 `ADMIN_PASSWORD` 和 `ADMIN_TOKEN_SECRET`

---

## 🔗 相关链接

- **前端地址：<ADDRESS_REMOVED>
- **管理后台：<ADDRESS_REMOVED>
- **GitHub 仓库：** https://github.com/AYSTBA/danci007web

---

**文档版本：** 1.0.0  
**最后更新：** 2026-06-03
