import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import os from 'os';
import { exec } from 'child_process';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, unlinkSync, readdirSync, statSync } from 'fs';
import Database from 'better-sqlite3';
import sharp from 'sharp';
import { UAParser } from 'ua-parser-js';
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

// Express 信任 Nginx 反向代理
app.set('trust proxy', 1);

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

// ── 访客分析 ──

// 提取真实 IP (兼容 nginx proxy)
function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return xff.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket.remoteAddress || '';
}

// IP 地理定位缓存 (24h)
const geoCache = new Map();
const GEO_CACHE_TTL = 24 * 60 * 60 * 1000;
async function lookupGeo(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return { country: '内网/本地', region: '', city: '' };
  }
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.t < GEO_CACHE_TTL) {
    return cached.data;
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN&fields=status,country,regionName,city`, { signal: ctrl.signal });
    clearTimeout(t);
    const j = await r.json();
    if (j.status === 'success') {
      const data = { country: j.country || '', region: j.regionName || '', city: j.city || '' };
      geoCache.set(ip, { t: Date.now(), data });
      return data;
    }
  } catch { /* 忽略错误 */ }
  return { country: '', region: '', city: '' };
}

// ── UA 解析增强 ──

// Windows 版本细化: NT 10.0 + Edge 110+ 或 Chrome 110+ → 实际是 Win11
function refineWindowsVersion(ua, osName, osVersion, browserName, browserVersion) {
  if (!/Windows NT 10\.0/.test(ua)) return `${osName || ''} ${osVersion || ''}`.trim();
  // Edge/Chrome 110+ 在 Windows 11 上发布, Win10 只支持到 Edge 110 (2023年初)
  // Edge 111+ (2023年中) 之后只在 Win10 22H2 但更常见是 Win11
  const major = parseInt((browserVersion || '').split('.')[0]);
  if (browserName === 'Edge' || browserName === 'Chrome') {
    if (!isNaN(major) && major >= 111) return 'Windows 11';
    if (!isNaN(major) && major >= 100) return 'Windows 10/11'; // 模糊
    return 'Windows 10';
  }
  return 'Windows 10';
}

// macOS 版本细化: 11+ 统称 macOS (不是 Mac OS X)
function refineMacOS(osName, osVersion) {
  if (!osName) return '';
  if (osName === 'Mac OS') {
    const m = (osVersion || '').match(/(\d+)\.(\d+)/);
    if (m) {
      const major = parseInt(m[1]);
      const minor = parseInt(m[2]);
      // Mac OS X 10.x → macOS 11+ (Big Sur 2020)
      if (major === 10) {
        if (minor >= 15) return 'macOS 10.15 Catalina';
        if (minor >= 14) return 'macOS 10.14 Mojave';
        if (minor >= 13) return 'macOS 10.13 High Sierra';
        return 'macOS 10.' + minor;
      }
      return 'macOS ' + major;
    }
    return 'macOS';
  }
  return `${osName} ${osVersion || ''}`.trim();
}

// 可疑 UA 检测
function detectSuspiciousUA(ua, parsed) {
  const reasons = [];
  // iOS + Edge/Chrome with version > 130: Edge 130 (2024) 才开始较多人用
  // iOS + Edge 149 (2025) 的组合很罕见 (iOS 用户 99% 用 Safari)
  if ((parsed.os.name === 'iOS' || /iPhone|iPad/.test(ua)) &&
      parsed.browser.name === 'Edge' &&
      parseInt((parsed.browser.version || '0').split('.')[0]) >= 130) {
    reasons.push('iOS+Edge 较罕见, 可能是伪造 UA');
  }
  // Linux 桌面 + Edge (Linux 不支持官方 Edge)
  if (parsed.os.name === 'Linux' && parsed.device.type !== 'mobile' && parsed.device.type !== 'tablet' &&
      parsed.browser.name === 'Edge' && parseInt((parsed.browser.version || '0').split('.')[0]) >= 100) {
    reasons.push('Linux 桌面无官方 Edge');
  }
  // Android + Safari (Android 没有 Safari, 只有 Chrome)
  if (parsed.os.name === 'Android' && parsed.browser.name === 'Safari') {
    reasons.push('Android 无 Safari');
  }
  // 设备型号包含 X11 / x86 等服务器标识
  if (/X11|bot|headless|phantom|wget|curl/i.test(ua) && !/mozilla/i.test(ua.toLowerCase().slice(0, 20))) {
    reasons.push('可疑 UA 字符串');
  }
  return reasons;
}

// 设备型号友好名称映射 (技术代号 → 用户能看懂的)
const DEVICE_NAME_MAP = {
  '23124RN87C': 'Redmi Note 13 5G',
  '23113RKC6C': 'Redmi Note 12 Pro',
  '2201116SC': 'Redmi Note 11',
  '22041211AC': 'Redmi K50',
};
function refineDeviceName(vendor, model) {
  if (!model) return { vendor: vendor || '', model: '', friendly: '' };
  const code = model.toUpperCase();
  if (DEVICE_NAME_MAP[code]) {
    return { vendor: vendor || 'Xiaomi/Redmi', model, friendly: DEVICE_NAME_MAP[code] };
  }
  return { vendor: vendor || '', model, friendly: '' };
}

// 综合 OS 显示
function buildOsDisplay(ua, parsedOs) {
  const refined = refineWindowsVersion(ua, parsedOs.name, parsedOs.version, parsedOs.browser?.name || '', parsedOs.browser?.version || '');
  if (refined) return refined;
  return refineMacOS(parsedOs.name, parsedOs.version);
}

// POST /api/visit — 前端埋点接口 (公开)
app.post('/api/visit', express.json({ limit: '2kb' }), async (req, res) => {
  try {
    const { path: visitPath = '/', screen_resolution = '', language = '', referer = '' } = req.body || {};
    // 过滤: 内部路径不计入访客分析
    const p = String(visitPath || '/');
    if (p.startsWith('/admin') || p.startsWith('/api') || p.startsWith('/login') || p.startsWith('/account')) {
      return res.json({ success: true, ignored: true });
    }
    // 过滤: 常见爬虫/机器人
    const ua = req.headers['user-agent'] || '';
    if (/bot|spider|crawl|slurp|baiduspider|bingpreview|facebookexternalhit|headlesschrome|windowspowershell|curl\/|wget|python-requests|python-urllib|httpie|postman|node-fetch|axios|insomnia/i.test(ua)) {
      return res.json({ success: true, ignored: true, reason: 'bot_or_tool' });
    }
    const ip = getClientIp(req);
    const parser = new UAParser(ua);
    const uaResult = parser.getResult();
    const browser = uaResult.browser;
    const osRaw = uaResult.os;
    const device = uaResult.device;
    const osWithBrowser = { name: osRaw.name, version: osRaw.version, browser: { name: browser.name, version: browser.version } };
    const suspiciousReasons = detectSuspiciousUA(ua, uaResult);
    const deviceRefined = refineDeviceName(device.vendor, device.model);
    const osDisplay = buildOsDisplay(ua, osWithBrowser);

    // 异步解析地理 (不阻塞响应)
    lookupGeo(ip).then(geo => {
      try {
        db.prepare(`
          INSERT INTO page_visits
            (path, ip, country, region, city, user_agent, browser, browser_version, os, device_type, device_vendor, device_model, suspicious, referer, language, screen_resolution)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          p.slice(0, 200),
          ip,
          geo.country, geo.region, geo.city,
          ua.slice(0, 500),
          browser.name || '',
          browser.version || '',
          osDisplay,
          device.type || 'desktop',
          deviceRefined.vendor,
          deviceRefined.friendly || deviceRefined.model,
          suspiciousReasons.join('|'),
          String(referer).slice(0, 500),
          String(language).slice(0, 50),
          String(screen_resolution).slice(0, 50)
        );
      } catch (e) {
        console.error('Insert visit failed:', e.message);
      }
    });

    res.json({ success: true });
  } catch (e) {
    res.json({ success: false });
  }
});

// GET /api/admin/visits — 查询访客记录 (后台)
app.get('/api/admin/visits', requireAdminAuth, (req, res) => {
  const { limit = 100, offset = 0, ip, browser, os, device, path: vp, since, until } = req.query;
  const conds = [];
  const args = [];
  if (ip) { conds.push('ip LIKE ?'); args.push('%' + ip + '%'); }
  if (browser) { conds.push('browser LIKE ?'); args.push('%' + browser + '%'); }
  if (os) { conds.push('os LIKE ?'); args.push('%' + os + '%'); }
  if (device) { conds.push('device_type = ?'); args.push(device); }
  if (vp) { conds.push('path LIKE ?'); args.push('%' + vp + '%'); }
  if (since) { conds.push('visit_time >= ?'); args.push(since); }
  if (until) { conds.push('visit_time <= ?'); args.push(until); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const sql = `SELECT id, path, ip, country, region, city, user_agent, browser, browser_version, os, device_type, device_vendor, device_model, suspicious, referer, language, screen_resolution, visit_time FROM page_visits ${where} ORDER BY visit_time DESC LIMIT ? OFFSET ?`;
  const rows = db.prepare(sql).all(...args, Math.min(Number(limit) || 100, 1000), Number(offset) || 0);
  const total = db.prepare(`SELECT COUNT(*) as c FROM page_visits ${where}`).get(...args).c;
  res.json({ rows, total, limit: Number(limit), offset: Number(offset) });
});

// GET /api/admin/visits/stats — 统计概览
app.get('/api/admin/visits/stats', requireAdminAuth, (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().replace('T', ' ').slice(0, 19);
  const weekAgo = new Date(Date.now() - 7 * 86400e3).toISOString().replace('T', ' ').slice(0, 19);
  const monthAgo = new Date(Date.now() - 30 * 86400e3).toISOString().replace('T', ' ').slice(0, 19);

  const total = db.prepare('SELECT COUNT(*) as c FROM page_visits').get().c;
  const todayCount = db.prepare('SELECT COUNT(*) as c FROM page_visits WHERE visit_time >= ?').get(todayStr).c;
  const weekCount = db.prepare('SELECT COUNT(*) as c FROM page_visits WHERE visit_time >= ?').get(weekAgo).c;
  const monthCount = db.prepare('SELECT COUNT(*) as c FROM page_visits WHERE visit_time >= ?').get(monthAgo).c;
  const uniqueIps = db.prepare('SELECT COUNT(DISTINCT ip) as c FROM page_visits').get().c;
  const uniqueToday = db.prepare('SELECT COUNT(DISTINCT ip) as c FROM page_visits WHERE visit_time >= ?').get(todayStr).c;
  // 独立访客 = (ip + device_type + browser + os + device_vendor + device_model) 唯一组合
  const visitorKey = `ip || '|' || COALESCE(device_type,'') || '|' || COALESCE(browser,'') || '|' || COALESCE(os,'') || '|' || COALESCE(device_vendor,'') || '|' || COALESCE(device_model,'')`;
  const uniqueVisitors = db.prepare(`SELECT COUNT(DISTINCT ${visitorKey}) as c FROM page_visits`).get().c;
  const uniqueVisitorsToday = db.prepare(`SELECT COUNT(DISTINCT ${visitorKey}) as c FROM page_visits WHERE visit_time >= ?`).get(todayStr).c;

  const topPaths = db.prepare(`SELECT path, COUNT(*) as c FROM page_visits GROUP BY path ORDER BY c DESC LIMIT 10`).all();
  const topBrowsers = db.prepare(`SELECT browser as name, COUNT(*) as c FROM page_visits WHERE browser != '' GROUP BY browser ORDER BY c DESC LIMIT 5`).all();
  const topOs = db.prepare(`SELECT os as name, COUNT(*) as c FROM page_visits WHERE os != '' GROUP BY os ORDER BY c DESC LIMIT 5`).all();
  const deviceDist = db.prepare(`SELECT device_type as name, COUNT(*) as c FROM page_visits GROUP BY device_type ORDER BY c DESC`).all();
  const topCountries = db.prepare(`SELECT country, region, city, COUNT(*) as c FROM page_visits WHERE country != '' GROUP BY country, region, city ORDER BY c DESC LIMIT 5`).all();
  const hourly = db.prepare(`
    SELECT strftime('%H', visit_time) as hour, COUNT(*) as c
    FROM page_visits WHERE visit_time >= ?
    GROUP BY hour ORDER BY hour
  `).all(todayStr);

  res.json({
    total, today: todayCount, week: weekCount, month: monthCount,
    uniqueIps, uniqueToday, uniqueVisitors, uniqueVisitorsToday,
    topPaths, topBrowsers, topOs, deviceDist, topCountries, hourly
  });
});

// GET /api/admin/visitors — 按 (IP+设备+浏览器+OS) 分组的独立访客列表
app.get('/api/admin/visitors', requireAdminAuth, (req, res) => {
  const { limit = 200, offset = 0, since, until } = req.query;
  const conds = [];
  const args = [];
  if (since) { conds.push('MAX(visit_time) >= ?'); args.push(since); }
  if (until) { conds.push('MAX(visit_time) <= ?'); args.push(until); }
  const having = conds.length ? 'HAVING ' + conds.join(' AND ') : '';
  const key = `ip || '|' || COALESCE(device_type,'') || '|' || COALESCE(browser,'') || '|' || COALESCE(os,'') || '|' || COALESCE(device_vendor,'') || '|' || COALESCE(device_model,'')`;
  const sql = `
    SELECT
      ${key} as visitor_key,
      ip,
      MAX(country) as country, MAX(region) as region, MAX(city) as city,
      MAX(user_agent) as user_agent,
      browser, browser_version, os,
      device_type, device_vendor, device_model,
      MAX(suspicious) as suspicious,
      MAX(language) as language, MAX(screen_resolution) as screen_resolution,
      COUNT(*) as pageview_count,
      COUNT(DISTINCT path) as unique_paths,
      MIN(visit_time) as first_visit,
      MAX(visit_time) as last_visit
    FROM page_visits
    GROUP BY ${key}, ip, browser, browser_version, os, device_type, device_vendor, device_model
    ${having}
    ORDER BY MAX(visit_time) DESC
    LIMIT ? OFFSET ?
  `;
  const visitors = db.prepare(sql).all(...args, Math.min(Number(limit) || 200, 1000), Number(offset) || 0);
  const totalSql = `SELECT COUNT(DISTINCT ${key}) as c FROM page_visits`;
  const total = db.prepare(totalSql).get().c;
  res.json({ visitors, total, limit: Number(limit), offset: Number(offset) });
});

// GET /api/admin/visitors/pageviews?ip=&device_type=&browser=&os= — 指定访客的全部浏览
app.get('/api/admin/visitors/pageviews', requireAdminAuth, (req, res) => {
  const { ip, device_type = '', browser = '', os = '', device_vendor = '', device_model = '', limit = 500 } = req.query;
  if (!ip) return res.json({ rows: [], total: 0 });
  const sql = `
    SELECT id, path, ip, country, region, city, browser, browser_version, os,
           device_type, device_vendor, device_model, suspicious, referer, language, screen_resolution, visit_time
    FROM page_visits
    WHERE ip = ? AND COALESCE(device_type,'') = ? AND COALESCE(browser,'') = ?
      AND COALESCE(os,'') = ? AND COALESCE(device_vendor,'') = ? AND COALESCE(device_model,'') = ?
    ORDER BY visit_time DESC
    LIMIT ?
  `;
  const rows = db.prepare(sql).all(
    ip, String(device_type), String(browser), String(os),
    String(device_vendor), String(device_model),
    Math.min(Number(limit) || 500, 2000)
  );
  res.json({ rows, total: rows.length });
});

// DELETE /api/admin/visits — 批量删除访客记录
app.delete('/api/admin/visits', requireAdminAuth, (req, res) => {
  const { olderThanDays = 0, all = false } = req.body || {};
  let deleted = 0;
  if (all) {
    const r = db.prepare('DELETE FROM page_visits').run();
    deleted = r.changes;
  } else if (Number(olderThanDays) > 0) {
    const cutoff = new Date(Date.now() - Number(olderThanDays) * 86400e3).toISOString().replace('T', ' ').slice(0, 19);
    const r = db.prepare('DELETE FROM page_visits WHERE visit_time < ?').run(cutoff);
    deleted = r.changes;
  }
  res.json({ success: true, deleted });
});

// DELETE /api/admin/visits/:id — 单条删除
app.delete('/api/admin/visits/:id', requireAdminAuth, (req, res) => {
  const r = db.prepare('DELETE FROM page_visits WHERE id = ?').run(Number(req.params.id));
  res.json({ success: true, deleted: r.changes });
});

// ── 服务器运行面板 API ──
app.get('/api/admin/server-stats', requireAdminAuth, async (req, res) => {
  try {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const loadAvg = os.loadavg();

    let diskInfo = { total: 0, used: 0, free: 0 };
    let gpuInfo = null;
    try {
      const diskOut = await new Promise((r) => exec('df -k /', (e, o) => r(e ? '' : o)));
      if (diskOut) {
        const parts = diskOut.trim().split('\n').pop().split(/\s+/);
        if (parts.length >= 4) {
          diskInfo = { total: parseInt(parts[1]) * 1024, used: parseInt(parts[2]) * 1024, free: parseInt(parts[3]) * 1024 };
        }
      }
    } catch {}
    try {
      const gpuOut = await new Promise((r) => exec("nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu --format=csv,noheader,nounits 2>/dev/null", (e, o) => r(e ? '' : o)));
      if (gpuOut) {
        const line = gpuOut.trim().split('\n')[0];
        if (line) {
          const parts = line.split(',').map(s => s.trim());
          gpuInfo = { name: parts[0] || '', memTotal: parseInt(parts[1]) || 0, memUsed: parseInt(parts[2]) || 0, memFree: parseInt(parts[3]) || 0, util: parseInt(parts[4]) || 0 };
        }
      }
    } catch {}

    const dbPath = path.join(dataDir, 'danci007.db');
    let dbSize = 0;
    try { dbSize = statSync(dbPath).size; } catch {}
    const uploadFiles = [];
    let uploadSize = 0;
    try {
      const files = readdirSync(uploadDir).filter(f => !f.startsWith('.'));
      for (const f of files) {
        try { const s = statSync(path.join(uploadDir, f)); uploadSize += s.size; uploadFiles.push(f); } catch {}
      }
    } catch {}
    const visitCount = db.prepare('SELECT COUNT(*) as c FROM page_visits').get().c;
    const bookingCount = db.prepare('SELECT COUNT(*) as c FROM bookings').get().c;
    const siteName = db.prepare("SELECT value FROM page_contents WHERE key='site_name'").get()?.value || '';

    res.json({
      server: {
        hostname: os.hostname(), platform: os.platform(), arch: os.arch(),
        release: os.release(), uptime: os.uptime(),
        nodeVersion: process.version, processUptime: process.uptime(),
        processMemory: process.memoryUsage().rss,
        cpuModel: cpus[0]?.model || '', cpuCores: cpus.length,
        loadAvg: { m1: loadAvg[0], m5: loadAvg[1], m15: loadAvg[2] },
        memTotal: totalMem, memUsed: usedMem, memFree: freeMem, memUsagePercent: totalMem ? Math.round(usedMem / totalMem * 100) : 0,
        diskTotal: diskInfo.total, diskUsed: diskInfo.used, diskFree: diskInfo.free,
        diskUsagePercent: diskInfo.total ? Math.round(diskInfo.used / diskInfo.total * 100) : 0,
        gpu: gpuInfo,
      },
      website: {
        dbSize, uploadCount: uploadFiles.length, uploadSize,
        visitCount, bookingCount, siteName,
        serverTime: new Date().toISOString(),
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 后端首页 & 文档（必须在 static 之前）──
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'backend.html'));
});
app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'docs.html'));
});
app.get('/docs/api.md', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'docs', 'API.md'));
});

// 生产环境：服务 Vite 构建输出的静态文件
const distDir = path.join(__dirname, '..', 'dist');
if (existsSync(distDir)) {
  app.use(express.static(distDir, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));
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
const upload = multer({ storage: storage, limits: { fileSize: 20 * 1024 * 1024 } });

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
      age TEXT DEFAULT '',
      date TEXT DEFAULT '',
      time TEXT DEFAULT '',
      course TEXT DEFAULT '',
      course_name TEXT DEFAULT '',
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
  for (const col of ['age', 'course_name']) {
    try { db.exec(`ALTER TABLE bookings ADD COLUMN ${col} TEXT DEFAULT ''`); } catch { /* 已存在 */ }
  }

  // 页面访问日志 (SEO / 访客分析)
  db.exec(`
    CREATE TABLE IF NOT EXISTS page_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      ip TEXT DEFAULT '',
      country TEXT DEFAULT '',
      region TEXT DEFAULT '',
      city TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      browser TEXT DEFAULT '',
      browser_version TEXT DEFAULT '',
      os TEXT DEFAULT '',
      device_type TEXT DEFAULT '',
      device_vendor TEXT DEFAULT '',
      device_model TEXT DEFAULT '',
      suspicious TEXT DEFAULT '',
      referer TEXT DEFAULT '',
      language TEXT DEFAULT '',
      screen_resolution TEXT DEFAULT '',
      visit_time DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_visit_time ON page_visits(visit_time DESC);
    CREATE INDEX IF NOT EXISTS idx_visit_ip ON page_visits(ip);
  `);
  // 迁移：删除旧团购表（含 inviter_name/joiners 列），重建新表
  try {
    const cols = db.prepare("PRAGMA table_info(group_buy_sessions)").all();
    const pcols = db.prepare("PRAGMA table_info(group_buy_participants)").all();
    if (cols.some(c => c.name === 'inviter_name') || !pcols.some(c => c.name === 'user_email')) {
      db.exec('DROP TABLE IF EXISTS group_buy_participants');
      db.exec('DROP TABLE IF EXISTS group_buy_sessions');
    }
  } catch (e) { /* 新安装 */ }
  db.exec(`
    CREATE TABLE IF NOT EXISTS group_buy_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id TEXT NOT NULL,
      share_id TEXT NOT NULL UNIQUE,
      creator_name TEXT NOT NULL,
      creator_phone TEXT DEFAULT '',
      creator_email TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_group_buy_share ON group_buy_sessions(share_id);
    CREATE INDEX IF NOT EXISTS idx_group_buy_course ON group_buy_sessions(course_id);
    CREATE INDEX IF NOT EXISTS idx_group_buy_creator ON group_buy_sessions(creator_name);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS group_buy_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      user_phone TEXT DEFAULT '',
      user_email TEXT DEFAULT '',
      lesson_bonus INTEGER DEFAULT 1,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES group_buy_sessions(id)
    );
    CREATE INDEX IF NOT EXISTS idx_gbp_session ON group_buy_participants(session_id);
    CREATE INDEX IF NOT EXISTS idx_gbp_user ON group_buy_participants(user_name);
  `);
  // 兼容老表: 添加新列
  try { db.exec(`ALTER TABLE page_visits ADD COLUMN suspicious TEXT DEFAULT ''`); } catch { /* 已存在 */ }

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
  const { name, age, phone, email, course, course_name } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: '姓名和电话不能为空' });
  }
  if (name.length > 50 || phone.length > 30) {
    return res.status(400).json({ error: '姓名或电话过长' });
  }
  if (age && (isNaN(Number(age)) || Number(age) < 1 || Number(age) > 120)) {
    return res.status(400).json({ error: '年龄必须在 1-120 之间' });
  }
  const result = db.prepare(`
    INSERT INTO bookings (name, phone, email, age, course, course_name)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(), phone.trim(),
    (email || '').trim(),
    age ? String(age).trim() : '',
    course || '',
    course_name || ''
  );

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
  for (const table of ['banners', 'teachers', 'page_contents', 'courses']) {
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

// ── 团购 API（基于名称账户持久化）──

function generateShareId() {
  return crypto.randomBytes(16).toString('hex');
}

// 创建团购
app.post('/api/group-buy/create', (req, res) => {
  const { course_id, creator_name, creator_phone, creator_email } = req.body;
  if (!course_id || !creator_name) {
    return res.status(400).json({ error: '缺少课程ID或用户名称' });
  }
  const shareId = generateShareId();
  db.prepare(`
    INSERT INTO group_buy_sessions (course_id, share_id, creator_name, creator_phone, creator_email)
    VALUES (?, ?, ?, ?, ?)
  `).run(String(course_id), shareId, creator_name, creator_phone || '', creator_email || '');
  res.json({ share_id: shareId });
});

// 管理员：查看所有团购（放在 :shareId 之前，避免冲突）
app.get('/api/admin/group-buys', requireAdminAuth, (req, res) => {
  const sessions = db.prepare('SELECT * FROM group_buy_sessions ORDER BY created_at DESC').all();
  const result = [];
  for (const s of sessions) {
    const participants = db.prepare('SELECT * FROM group_buy_participants WHERE session_id = ? ORDER BY joined_at ASC').all(s.id);
    const totalBonus = participants.reduce((sum, p) => sum + p.lesson_bonus, 0);
    result.push({ ...s, participants, total_bonus: totalBonus });
  }
  res.json(result);
});

// 管理员：删除团购（级联删除参与者）
app.delete('/api/admin/group-buys/:id', requireAdminAuth, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT id FROM group_buy_sessions WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: '团购不存在' });
  db.prepare('DELETE FROM group_buy_participants WHERE session_id = ?').run(id);
  db.prepare('DELETE FROM group_buy_sessions WHERE id = ?').run(id);
  res.json({ success: true });
});

// 管理员：删除团购参与者
app.delete('/api/admin/group-buys/:sessionId/participants/:participantId', requireAdminAuth, (req, res) => {
  const sessionId = Number(req.params.sessionId);
  const participantId = Number(req.params.participantId);
  const p = db.prepare('SELECT id FROM group_buy_participants WHERE id = ? AND session_id = ?').get(participantId, sessionId);
  if (!p) return res.status(404).json({ error: '参与者不存在' });
  db.prepare('DELETE FROM group_buy_participants WHERE id = ?').run(participantId);
  res.json({ success: true });
});

// 查询某用户参与的所有团购（放在 :shareId 之前，避免冲突）
app.get('/api/group-buy/user/:userName', (req, res) => {
  const userName = req.params.userName;
  const created = db.prepare('SELECT * FROM group_buy_sessions WHERE creator_name = ? ORDER BY created_at DESC').all(userName);
  const joined = db.prepare(`
    SELECT s.*, p.joined_at as my_join_time, p.lesson_bonus as my_bonus, p.user_phone, p.user_email
    FROM group_buy_participants p
    JOIN group_buy_sessions s ON s.id = p.session_id
    WHERE p.user_name = ? ORDER BY p.joined_at DESC
  `).all(userName);
  for (const s of [...created, ...joined]) {
    const count = db.prepare('SELECT COUNT(*) as c FROM group_buy_participants WHERE session_id = ?').get(s.id);
    s.participant_count = count.c;
  }
  res.json({ created, joined });
});

// 查询团购详情（含参与者）
app.get('/api/group-buy/:shareId', (req, res) => {
  const row = db.prepare('SELECT * FROM group_buy_sessions WHERE share_id = ?').get(req.params.shareId);
  if (!row) return res.status(404).json({ error: '团购不存在' });
  const participants = db.prepare('SELECT * FROM group_buy_participants WHERE session_id = ? ORDER BY joined_at ASC').all(row.id);
  const totalBonus = participants.reduce((sum, p) => sum + p.lesson_bonus, 0);
  res.json({
    id: row.id,
    course_id: row.course_id,
    share_id: row.share_id,
    creator_name: row.creator_name,
    creator_phone: row.creator_phone,
    creator_email: row.creator_email,
    participants,
    participant_count: participants.length,
    total_bonus: totalBonus,
    created_at: row.created_at
  });
});

// 加入团购
app.post('/api/group-buy/:shareId/join', (req, res) => {
  const { user_name, user_phone, user_email } = req.body;
  if (!user_name) return res.status(400).json({ error: '请输入你的名称' });
  const row = db.prepare('SELECT * FROM group_buy_sessions WHERE share_id = ?').get(req.params.shareId);
  if (!row) return res.status(404).json({ error: '团购不存在' });
  const existing = db.prepare('SELECT id FROM group_buy_participants WHERE session_id = ? AND user_name = ?').get(row.id, user_name);
  if (existing) return res.status(400).json({ error: '你已经加入过该团购' });
  db.prepare(`
    INSERT INTO group_buy_participants (session_id, user_name, user_phone, user_email) VALUES (?, ?, ?, ?)
  `).run(row.id, user_name, user_phone || '', user_email || '');
  const participants = db.prepare('SELECT * FROM group_buy_participants WHERE session_id = ? ORDER BY joined_at ASC').all(row.id);
  const totalBonus = participants.reduce((sum, p) => sum + p.lesson_bonus, 0);
  res.json({ success: true, participant_count: participants.length, total_bonus: totalBonus });
});

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
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
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
