import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, unlinkSync, readdirSync, statSync } from 'fs';
import Database from 'better-sqlite3';
import sharp from 'sharp';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const isDev = process.env.NODE_ENV !== 'production';

// ── 管理员密码 ──
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (isDev ? '888888' : null);
if (!ADMIN_PASSWORD) {
  console.error('FATAL: 生产环境必须设置 ADMIN_PASSWORD 环境变量');
  process.exit(1);
}
if (!process.env.ADMIN_PASSWORD) {
  console.warn('⚠ 使用默认密码 888888（仅限本地开发，生产环境请设置 ADMIN_PASSWORD）');
}

const ADMIN_TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');

// ── CORS ──
const corsOrigin = process.env.CORS_ORIGIN || '*';
const corsOptions = corsOrigin === '*'
  ? { origin: true }
  : { origin: corsOrigin.split(',').map(s => s.trim()) };
app.use(cors(corsOptions));

app.use(express.json({ limit: '5mb' }));

// ── 登录频率限制 ──
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 10,
  message: { error: '登录尝试过于频繁，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Admin 鉴权 ──
const activeTokens = new Map();

function generateAdminToken() {
  const payload = JSON.stringify({
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000,
    id: crypto.randomBytes(16).toString('hex'),
  });
  const encodedPayload = Buffer.from(payload).toString('base64url');
  const hmac = crypto.createHmac('sha256', ADMIN_TOKEN_SECRET);
  hmac.update(encodedPayload);
  const signature = hmac.digest('base64url');
  return encodedPayload + '.' + signature;
}

function verifyAdminToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encodedPayload, signature] = parts;
    const hmac = crypto.createHmac('sha256', ADMIN_TOKEN_SECRET);
    hmac.update(encodedPayload);
    const expectedSig = hmac.digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());
    if (payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function requireAdminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || !verifyAdminToken(token)) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }
  next();
}

// POST /api/admin/login — 管理员登录
app.post('/api/admin/login', loginLimiter, (req, res) => {
  const { password } = req.body;
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: '密码错误' });
  }
  const token = generateAdminToken();
  res.json({ success: true, token });
});

// POST /api/admin/logout — 管理员登出
app.post('/api/admin/logout', (req, res) => {
  res.json({ success: true });
});

// 生产环境：服务 Vite 构建输出的静态文件
const distDir = path.join(__dirname, '..', 'dist');
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  console.log('Serving static files from:', distDir);
}

const uploadDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');

for (const dir of [uploadDir, dataDir]) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

app.use('/uploads', express.static(uploadDir));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

const dbPath = path.join(dataDir, 'danci007.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

const initDb = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS page_contents (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT DEFAULT '',
      title_en TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      image_url_en TEXT DEFAULT '',
      link TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT DEFAULT '',
      name_en TEXT DEFAULT '',
      title TEXT DEFAULT '',
      title_en TEXT DEFAULT '',
      description TEXT DEFAULT '',
      description_en TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      date TEXT DEFAULT '',
      time TEXT DEFAULT '',
      course TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id TEXT UNIQUE NOT NULL,
      name TEXT DEFAULT '',
      name_en TEXT DEFAULT '',
      subtitle TEXT DEFAULT '',
      subtitle_en TEXT DEFAULT '',
      description TEXT DEFAULT '',
      description_en TEXT DEFAULT '',
      price TEXT DEFAULT '0',
      original_price TEXT DEFAULT '0',
      teacher_name TEXT DEFAULT '',
      teacher_name_en TEXT DEFAULT '',
      teacher_title TEXT DEFAULT '',
      teacher_title_en TEXT DEFAULT '',
      teacher_avatar TEXT DEFAULT '',
      banner_image TEXT DEFAULT '',
      features TEXT DEFAULT '[]',
      lesson_count TEXT DEFAULT '1',
      student_count TEXT DEFAULT '0',
      status TEXT DEFAULT '已完结',
      validity TEXT DEFAULT '长期有效',
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS course_enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id TEXT NOT NULL,
      course_name TEXT DEFAULT '',
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS course_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id TEXT NOT NULL,
      name TEXT NOT NULL,
      rating INTEGER DEFAULT 5,
      content TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS course_interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id TEXT NOT NULL,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 兼容旧表：补齐缺失列
  for (const col of ['lesson_count', 'student_count', 'status', 'validity', 'sort_order']) {
    try { db.exec(`ALTER TABLE courses ADD COLUMN ${col} TEXT DEFAULT ''`); } catch { /* 已存在 */ }
  }

  const defaultContents = db.prepare('SELECT COUNT(*) as count FROM page_contents').get().count;
  if (defaultContents === 0) {
    const insertContent = db.prepare('INSERT OR IGNORE INTO page_contents (key, value) VALUES (?, ?)');
    insertContent.run('site_name', '中萱文化');
    insertContent.run('site_name_en', 'Zhongxuan Culture');
    insertContent.run('hero_title', '欢迎来到深圳市龙岗区教学点');
    insertContent.run('hero_title_en', 'Welcome to Longgang District Teaching Center');
    insertContent.run('hero_subtitle', '单词突击007 - 智能单词学习系统');
    insertContent.run('hero_subtitle_en', 'Word Assault 007 - Intelligent Word Learning System');
    insertContent.run('contact_phone', '18938908657');
    insertContent.run('contact_email', '');
    insertContent.run('contact_address', '深圳市龙岗区悦龙华府·二期8栋20号(中萱英语)');
    insertContent.run('contact_address_en', 'Building 8, No. 20, Phase II, Yuelong Huafu, Longgang District, Shenzhen (中萱英语)');
    insertContent.run('why_title', '为什么选择我们');
    insertContent.run('why_title_en', 'Why Choose Us');
    insertContent.run('why_content', '## 科学的学习方法\n\n基于艾宾浩斯遗忘曲线理论，结合大数据和AI人工 智能，针对每个学生提供精准单词学习。\n\n## 智能系统\n\nAI辅助学习，个性化方案， 让学习更高效。\n\n## 专业团队\n\n资深教师团队，丰富的教学经验。');
    insertContent.run('why_content_en', '## Scientific Learning Method\n\nBased on Ebbinghaus Forgetting Curve theory, combined with big data and AI, providing personalized word learning for each student.\n\n## Intelligent System\n\nAI-assisted learning with personalized plans for more efficient learning.\n\n## Professional Team\n\nExperienced teaching team with rich teaching experience.');
    insertContent.run('booking_rotating_texts', '专业的师资团队,科学的学习方法,轻松掌握英语单词,快速提升英语水平');
    insertContent.run('booking_rotating_texts_en', 'Professional teachers,Scientific learning methods,Master English words easily,Improve English quickly');
    insertContent.run('wechat_qrcode', '');
    insertContent.run('business_hours_weekday', '17:00 - 21:00');
    insertContent.run('business_hours_weekend', '9:00 - 18:30');
    insertContent.run('site_note', '中萱百日学通文化的简称');
    insertContent.run('site_note_en', 'Abbreviation for Zhongxuan Bairixuetong Culture');
  }

  const defaultTeachers = db.prepare('SELECT COUNT(*) as count FROM teachers').get().count;
  if (defaultTeachers === 0) {
    const insertTeacher = db.prepare(`
      INSERT INTO teachers (name, name_en, title, title_en, description, description_en, sort_order) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertTeacher.run('李老师', 'Ms. Li', '高级英语教师', 'Senior English Teacher', '10年教学经验，专注于青少年英语教育，擅长激发学生学习兴趣。', '10 years of teaching experience, specializing in youth English education, skilled in motivating students.', 0);
    insertTeacher.run('王老师', 'Mr. Wang', '资深外教', 'Senior Foreign Teacher', '母语为英语，持有TESOL证书，丰富的国际教学经验。', 'Native English speaker, TESOL certified, extensive international teaching experience.', 1);
    insertTeacher.run('张老师', 'Ms. Zhang', '教学主管', 'Teaching Supervisor', '英语专业硕士，专注于课程研发和教学管理，深受学生喜爱。', 'Master of English, specializing in curriculum development and teaching management.', 2);
  }
};

initDb();

app.get('/api/pages/home', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM page_contents').all();
  const result = {};
  for (const row of rows) {
    result[row.key] = { value: row.value, type: row.key.includes('content') ? 'markdown' : 'text' };
  }
  res.json(result);
});

app.get('/api/pages/home/contents', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM page_contents').all();
  const result = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  res.json(result);
});

app.put('/api/pages/home/contents', requireAdminAuth, (req, res) => {
  const updates = req.body;
  const updateStmt = db.prepare('INSERT OR REPLACE INTO page_contents (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
  
  for (const [key, value] of Object.entries(updates)) {
    updateStmt.run(key, value);
  }
  
  res.json({ success: true });
});

app.get('/api/banners', (req, res) => {
  const banners = db.prepare('SELECT * FROM banners WHERE active = 1 ORDER BY sort_order ASC').all();
  res.json(banners);
});

app.get('/api/admin/banners', requireAdminAuth, (req, res) => {
  const banners = db.prepare('SELECT * FROM banners ORDER BY sort_order ASC').all();
  res.json(banners);
});

app.post('/api/banners', requireAdminAuth, (req, res) => {
  try {
    const { title, title_en, image_url, image_url_en, link, active, sort_order } = req.body;
    const result = db.prepare(`
      INSERT INTO banners (title, title_en, image_url, image_url_en, link, active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title || '', title_en || '', image_url || '', image_url_en || '', link || '', active !== undefined ? active : 1, sort_order || 0);
    
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({ error: 'Failed to create banner', details: error.message });
  }
});

app.put('/api/banners/:id', requireAdminAuth, (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title, title_en, image_url, image_url_en, link, active, sort_order } = req.body;
    
    db.prepare(`
      UPDATE banners 
      SET title = COALESCE(?, title),
          title_en = COALESCE(?, title_en),
          image_url = COALESCE(?, image_url),
          image_url_en = COALESCE(?, image_url_en),
          link = COALESCE(?, link),
          active = COALESCE(?, active),
          sort_order = COALESCE(?, sort_order),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, title_en, image_url, image_url_en, link, active, sort_order, id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({ error: 'Failed to update banner', details: error.message });
  }
});

app.delete('/api/banners/:id', requireAdminAuth, (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM banners WHERE id = ?').run(id);
  res.json({ success: true });
});

app.get('/api/teachers', (req, res) => {
  const teachers = db.prepare('SELECT * FROM teachers WHERE active = 1 ORDER BY sort_order ASC').all();
  res.json(teachers);
});

app.post('/api/teachers', requireAdminAuth, (req, res) => {
  try {
    const { name, name_en, title, title_en, description, description_en, avatar, active, sort_order } = req.body;
    const result = db.prepare(`
      INSERT INTO teachers (name, name_en, title, title_en, description, description_en, avatar, active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name || '', name_en || '', title || '', title_en || '', description || '', description_en || '', avatar || '', active !== undefined ? active : 1, sort_order || 0);
    
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error creating teacher:', error);
    res.status(500).json({ error: 'Failed to create teacher', details: error.message });
  }
});

app.put('/api/teachers/:id', requireAdminAuth, (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, name_en, title, title_en, description, description_en, avatar, active, sort_order } = req.body;
    
    db.prepare(`
      UPDATE teachers 
      SET name = COALESCE(?, name),
          name_en = COALESCE(?, name_en),
          title = COALESCE(?, title),
          title_en = COALESCE(?, title_en),
          description = COALESCE(?, description),
          description_en = COALESCE(?, description_en),
          avatar = COALESCE(?, avatar),
          active = COALESCE(?, active),
          sort_order = COALESCE(?, sort_order),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, name_en, title, title_en, description, description_en, avatar, active, sort_order, id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating teacher:', error);
    res.status(500).json({ error: 'Failed to update teacher', details: error.message });
  }
});

app.delete('/api/teachers/:id', requireAdminAuth, (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM teachers WHERE id = ?').run(id);
  res.json({ success: true });
});

app.get('/api/bookings', requireAdminAuth, (req, res) => {
  const bookings = db.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all();
  res.json(bookings);
});

app.post('/api/bookings', (req, res) => {
  const { name, phone, email, date, time, course } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: '姓名和电话不能为空' });
  }
  if (name.length > 50 || phone.length > 30) {
    return res.status(400).json({ error: '姓名或电话过长' });
  }
  const result = db.prepare(`
    INSERT INTO bookings (name, phone, email, date, time, course)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name.trim(), phone.trim(), (email || '').trim(), date || '', time || '', course || '');
  
  res.json({ success: true, id: result.lastInsertRowid });
});

app.delete('/api/bookings/:id', requireAdminAuth, (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM bookings WHERE id = ?').run(id);
  res.json({ success: true });
});

app.post('/api/upload', requireAdminAuth, upload.single('file'), async (req, res) => {
  try {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const webpFilename = uniqueSuffix + '.webp';
    const outputPath = path.join(uploadDir, webpFilename);
    
    await sharp(req.file.buffer)
      .resize(1920, 1920, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .webp({ 
        quality: 85, 
        effort: 4
      })
      .toFile(outputPath);
    
    res.json({ url: '/uploads/' + webpFilename });
  } catch (error) {
    console.error('Error converting image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// ── 孤儿文件清理 (上传后未保存到数据库的图片) ──
// GET  /api/admin/orphan-uploads  → 列出未引用的文件
// POST /api/admin/orphan-uploads  → 删除未引用的文件
//                                     body: { olderThanHours?: number, paths?: string[] }
function collectReferencedUploadPaths() {
  const refSet = new Set();
  const tryAdd = (val) => {
    if (typeof val !== 'string') return;
    const m = val.match(/\/uploads\/([^\s"'<>)]+)/g);
    if (m) m.forEach(p => refSet.add(p.replace('/uploads/', '')));
  };
  for (const table of ['banners', 'teachers', 'page_contents']) {
    try {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all();
      for (const col of cols) {
        const rows = db.prepare(`SELECT "${col.name}" FROM ${table}`).all();
        for (const row of rows) tryAdd(row[col.name]);
      }
    } catch { /* 表可能不存在 */ }
  }
  return refSet;
}

app.get('/api/admin/orphan-uploads', requireAdminAuth, (req, res) => {
  try {
    const files = readdirSync(uploadDir).filter(f => !f.startsWith('.'));
    const referenced = collectReferencedUploadPaths();
    const orphans = files.filter(f => !referenced.has(f));
    const totalSize = orphans.reduce((sum, f) => {
      try { return sum + statSync(path.join(uploadDir, f)).size; } catch { return sum; }
    }, 0);
    res.json({ orphans, count: orphans.length, totalSize });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/orphan-uploads', requireAdminAuth, (req, res) => {
  try {
    const { olderThanHours = 0, paths } = req.body || {};
    let toDelete;
    if (Array.isArray(paths) && paths.length > 0) {
      toDelete = paths.filter(p => typeof p === 'string' && !p.includes('/') && !p.includes('\\'));
    } else {
      const files = readdirSync(uploadDir).filter(f => !f.startsWith('.'));
      const referenced = collectReferencedUploadPaths();
      toDelete = files.filter(f => !referenced.has(f));
    }
    if (olderThanHours > 0) {
      const cutoff = Date.now() - olderThanHours * 3600 * 1000;
      toDelete = toDelete.filter(f => {
        try { return statSync(path.join(uploadDir, f)).mtimeMs < cutoff; } catch { return false; }
      });
    }
    let deleted = 0;
    for (const f of toDelete) {
      try { unlinkSync(path.join(uploadDir, f)); deleted++; } catch {}
    }
    res.json({ success: true, deleted, total: toDelete.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 课程招生页 API ──

// 课程列表（公开接口）
app.get('/api/courses', (req, res) => {
  try {
    const courses = db.prepare('SELECT * FROM courses WHERE active = 1 ORDER BY sort_order ASC, created_at DESC').all();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: '获取课程列表失败' });
  }
});

app.get('/api/courses/:id', (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE course_id = ? AND active = 1').get(req.params.id);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }
  try {
    course.features = JSON.parse(course.features || '[]');
  } catch {
    course.features = [];
  }
  res.json(course);
});

app.get('/api/admin/courses', requireAdminAuth, (req, res) => {
  const courses = db.prepare('SELECT * FROM courses ORDER BY created_at DESC').all();
  res.json(courses);
});

app.post('/api/courses', requireAdminAuth, (req, res) => {
  try {
    const {
      course_id, name, name_en, subtitle, subtitle_en, description, description_en,
      price, original_price, teacher_name, teacher_name_en, teacher_title, teacher_title_en,
      teacher_avatar, banner_image, features, lesson_count, student_count, status, validity,
      sort_order, active
    } = req.body;
    if (!course_id || !/^[a-zA-Z0-9_-]{2,40}$/.test(course_id)) {
      return res.status(400).json({ error: 'course_id 必须是 2-40 位的字母数字下划线连字符' });
    }
    const result = db.prepare(`
      INSERT INTO courses (course_id, name, name_en, subtitle, subtitle_en, description, description_en, price, original_price, teacher_name, teacher_name_en, teacher_title, teacher_title_en, teacher_avatar, banner_image, features, lesson_count, student_count, status, validity, sort_order, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      course_id, name || '', name_en || '', subtitle || '', subtitle_en || '',
      description || '', description_en || '', price || '0', original_price || '0',
      teacher_name || '', teacher_name_en || '', teacher_title || '', teacher_title_en || '',
      teacher_avatar || '', banner_image || '', JSON.stringify(features || []),
      lesson_count || '1', student_count || '0', status || '已完结', validity || '长期有效',
      Number(sort_order) || 0, active !== undefined ? active : 1
    );
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/courses/:id', requireAdminAuth, (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      name, name_en, subtitle, subtitle_en, description, description_en,
      price, original_price, teacher_name, teacher_name_en, teacher_title, teacher_title_en,
      teacher_avatar, banner_image, features, lesson_count, student_count, status, validity,
      sort_order, active
    } = req.body;
    db.prepare(`
      UPDATE courses SET
        name=COALESCE(?,name), name_en=COALESCE(?,name_en),
        subtitle=COALESCE(?,subtitle), subtitle_en=COALESCE(?,subtitle_en),
        description=COALESCE(?,description), description_en=COALESCE(?,description_en),
        price=COALESCE(?,price), original_price=COALESCE(?,original_price),
        teacher_name=COALESCE(?,teacher_name), teacher_name_en=COALESCE(?,teacher_name_en),
        teacher_title=COALESCE(?,teacher_title), teacher_title_en=COALESCE(?,teacher_title_en),
        teacher_avatar=COALESCE(?,teacher_avatar), banner_image=COALESCE(?,banner_image),
        features=COALESCE(?,features),
        lesson_count=COALESCE(?,lesson_count), student_count=COALESCE(?,student_count),
        status=COALESCE(?,status), validity=COALESCE(?,validity),
        sort_order=COALESCE(?,sort_order),
        active=COALESCE(?,active),
        updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(
      name, name_en, subtitle, subtitle_en, description, description_en,
      price, original_price, teacher_name, teacher_name_en, teacher_title, teacher_title_en,
      teacher_avatar, banner_image, features ? JSON.stringify(features) : null,
      lesson_count, student_count, status, validity, sort_order,
      active, id
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/courses/:id', requireAdminAuth, (req, res) => {
  db.prepare('DELETE FROM courses WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true });
});

app.post('/api/course-enroll', (req, res) => {
  const { course_id, course_name, name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: '姓名和电话不能为空' });
  }
  if (name.length > 50 || phone.length > 30) {
    return res.status(400).json({ error: '姓名或电话过长' });
  }
  const result = db.prepare(`
    INSERT INTO course_enrollments (course_id, course_name, name, phone)
    VALUES (?, ?, ?, ?)
  `).run(course_id || '', course_name || '', name.trim(), phone.trim());
  res.json({ success: true, id: result.lastInsertRowid });
});

app.get('/api/course-enrollments', requireAdminAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM course_enrollments ORDER BY created_at DESC').all();
  res.json(rows);
});

app.delete('/api/course-enrollments/:id', requireAdminAuth, (req, res) => {
  db.prepare('DELETE FROM course_enrollments WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true });
});

// ── 课程评价 API ──

app.get('/api/courses/:id/reviews', (req, res) => {
  const rows = db.prepare('SELECT * FROM course_reviews WHERE course_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json(rows);
});

app.post('/api/courses/:id/reviews', (req, res) => {
  const { name, rating, content } = req.body;
  if (content && content.length > 2000) {
    return res.status(400).json({ error: '评价内容过长' });
  }
  const result = db.prepare('INSERT INTO course_reviews (course_id, name, rating, content) VALUES (?, ?, ?, ?)').run(req.params.id, name || '匿名', Math.min(5, Math.max(1, Number(rating) || 5)), (content || '').slice(0, 2000));
  res.json({ success: true, id: result.lastInsertRowid });
});

app.delete('/api/course-reviews/:id', requireAdminAuth, (req, res) => {
  db.prepare('DELETE FROM course_reviews WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true });
});

app.get('/api/admin/course-reviews', requireAdminAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM course_reviews ORDER BY created_at DESC').all();
  res.json(rows);
});

// ── 课程互动 API ──

app.get('/api/courses/:id/interactions', (req, res) => {
  const rows = db.prepare('SELECT * FROM course_interactions WHERE course_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json(rows);
});

app.post('/api/courses/:id/interactions', (req, res) => {
  const { name, content } = req.body;
  if (!content || content.length > 500) {
    return res.status(400).json({ error: '互动内容不能为空且不超过500字' });
  }
  const result = db.prepare('INSERT INTO course_interactions (course_id, name, content) VALUES (?, ?, ?)').run(req.params.id, name || '匿名', content.slice(0, 500));
  res.json({ success: true, id: result.lastInsertRowid });
});

app.delete('/api/course-interactions/:id', requireAdminAuth, (req, res) => {
  db.prepare('DELETE FROM course_interactions WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true });
});

app.get('/api/admin/course-interactions', requireAdminAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM course_interactions ORDER BY created_at DESC').all();
  res.json(rows);
});

// SPA fallback：所有非 API 路由返回 index.html
const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
if (existsSync(distDir) && existsSync(indexPath)) {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) {
      res.sendFile(indexPath);
    }
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  ✅ 单词突击007 已启动`);
  console.log(`  📍 访问地址: http://localhost:${PORT}`);
  console.log(`  🔧 后台管理: http://localhost:${PORT}/admin`);
  console.log(`  📦 数据路径: ${dbPath}\n`);
});

// ── CLI 入口：node server.js --cleanup [hours] ──
if (process.argv.includes('--cleanup')) {
  const idx = process.argv.indexOf('--cleanup');
  const hours = Number(process.argv[idx + 1]) || 24;
  try {
    const files = readdirSync(uploadDir).filter(f => !f.startsWith('.'));
    const referenced = collectReferencedUploadPaths();
    const cutoff = Date.now() - hours * 3600 * 1000;
    let deleted = 0;
    let totalBytes = 0;
    for (const f of files) {
      if (referenced.has(f)) continue;
      const full = path.join(uploadDir, f);
      try {
        const st = statSync(full);
        if (st.mtimeMs >= cutoff) continue;
        unlinkSync(full);
        deleted++;
        totalBytes += st.size;
      } catch {}
    }
    console.log(`[cleanup] 删除 ${deleted} 个 ${hours}h 前的孤儿文件 (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`);
  } catch (e) {
    console.error('[cleanup] 错误:', e.message);
  }
  process.exit(0);
}
