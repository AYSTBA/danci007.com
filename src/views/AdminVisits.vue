<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchJson } from '../utils';

const route = useRoute();
const router = useRouter();

// 鉴权
const isLoggedIn = ref(false);
const password = ref('');
const errorMsg = ref('');
const loginLoading = ref(false);
const saveMessage = ref('');
const showSaveMessage = ref(false);

function showSuccess(msg: string) {
  saveMessage.value = msg;
  showSaveMessage.value = true;
  setTimeout(() => (showSaveMessage.value = false), 2000);
}

const login = async () => {
  if (!password.value) return;
  loginLoading.value = true;
  errorMsg.value = '';
  try {
    const r = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value })
    });
    if (r.ok) {
      const data = await r.json();
      sessionStorage.setItem('adminToken', data.token);
      isLoggedIn.value = true;
      password.value = '';
      initData();
    } else {
      const data = await r.json().catch(() => ({}));
      errorMsg.value = data.error || '登录失败';
    }
  } catch (e) {
    errorMsg.value = '网络错误';
  } finally {
    loginLoading.value = false;
  }
};

const logout = () => {
  sessionStorage.removeItem('adminToken');
  isLoggedIn.value = false;
};

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('adminToken');
  return token ? { 'X-Admin-Token': token } : {};
};

const checkLogin = () => {
  isLoggedIn.value = !!sessionStorage.getItem('adminToken');
};

const dataLoading = ref(false);
const dataError = ref<string | null>(null);

// 访客分析数据
const visitStats = ref<any>(null);
const visitList = ref<any[]>([]);
const visitTotal = ref(0);
const visitLoading = ref(false);
const visitFilter = ref({
  ip: '', browser: '', os: '', device: '', path: '',
  since: '', until: '', limit: 50, offset: 0
});

const visitViewMode = ref<'visitors' | 'pageviews'>('visitors');
const visitorList = ref<any[]>([]);
const visitorTotal = ref(0);
const visitorLoading = ref(false);
const selectedVisitor = ref<any | null>(null);
const visitorPageviews = ref<any[]>([]);
const visitorPageviewsLoading = ref(false);
const showVisitorModal = ref(false);

async function loadVisitStats() {
  try {
    const res = await fetchJson('/api/admin/visits/stats', { headers: getAuthHeaders() });
    if (res) visitStats.value = res;
  } catch (e) { console.error('loadVisitStats failed:', e); }
}

async function loadVisits() {
  visitLoading.value = true;
  try {
    const f = visitFilter.value;
    const params = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) params.set(k, String(v)); });
    const res = await fetchJson('/api/admin/visits?' + params.toString(), { headers: getAuthHeaders() });
    if (res) {
      visitList.value = (res as any).rows || [];
      visitTotal.value = (res as any).total || 0;
    }
  } catch (e) { console.error('loadVisits failed:', e); }
  finally { visitLoading.value = false; }
}

function switchVisitView(mode: 'visitors' | 'pageviews') {
  visitViewMode.value = mode;
  if (mode === 'visitors') loadVisitors();
  else loadVisits();
}

async function loadVisitors() {
  visitorLoading.value = true;
  try {
    const params = new URLSearchParams();
    if (visitFilter.value.since) params.set('since', visitFilter.value.since.replace('T', ' ').slice(0, 19));
    if (visitFilter.value.until) params.set('until', visitFilter.value.until.replace('T', ' ').slice(0, 19));
    params.set('limit', '200');
    const res = await fetchJson('/api/admin/visitors?' + params.toString(), { headers: getAuthHeaders() });
    if (res) {
      visitorList.value = (res as any).visitors || [];
      visitorTotal.value = (res as any).total || 0;
    }
  } catch (e) { console.error('loadVisitors failed:', e); }
  finally { visitorLoading.value = false; }
}

async function openVisitorDetail(v: any) {
  selectedVisitor.value = v;
  showVisitorModal.value = true;
  visitorPageviews.value = [];
  visitorPageviewsLoading.value = true;
  try {
    const params = new URLSearchParams({
      ip: v.ip || '',
      device_type: v.device_type || '',
      browser: v.browser || '',
      os: v.os || '',
      device_vendor: v.device_vendor || '',
      device_model: v.device_model || ''
    });
    const res = await fetchJson('/api/admin/visitors/pageviews?' + params.toString(), { headers: getAuthHeaders() });
    if (res) visitorPageviews.value = (res as any).rows || [];
  } catch (e) { console.error('loadVisitorPageviews failed:', e); }
  finally { visitorPageviewsLoading.value = false; }
}

function closeVisitorModal() {
  showVisitorModal.value = false;
  selectedVisitor.value = null;
  visitorPageviews.value = [];
}

async function deleteVisit(id: number) {
  if (!confirm('确定删除这条访问记录吗？')) return;
  const res = await fetchJson('/api/admin/visits/' + id, { method: 'DELETE', headers: getAuthHeaders() });
  if (res && (res as any).success) {
    visitList.value = visitList.value.filter(v => v.id !== id);
    visitTotal.value = Math.max(0, visitTotal.value - 1);
    loadVisitStats();
    showSuccess('已删除');
  }
}

async function deleteVisitor(v: any) {
  const msg = `确定删除该访客的全部 ${v.pageview_count} 条记录吗？`;
  if (!confirm(msg)) return;
  const pvs = visitorPageviews.value.length ? visitorPageviews.value : await fetchAllPageviewsForVisitor(v);
  for (const pv of pvs) {
    await fetchJson('/api/admin/visits/' + pv.id, { method: 'DELETE', headers: getAuthHeaders() });
  }
  closeVisitorModal();
  loadVisitors();
  loadVisitStats();
  showSuccess(`已删除 ${pvs.length} 条`);
}

async function fetchAllPageviewsForVisitor(v: any) {
  const params = new URLSearchParams({
    ip: v.ip || '', device_type: v.device_type || '',
    browser: v.browser || '', os: v.os || '',
    device_vendor: v.device_vendor || '', device_model: v.device_model || ''
  });
  const res = await fetchJson('/api/admin/visitors/pageviews?' + params.toString(), { headers: getAuthHeaders() });
  return (res as any)?.rows || [];
}

async function cleanupVisits(days: number | 'all') {
  const msg = days === 'all' ? '确定清空所有访客记录吗？此操作不可恢复！' : `确定删除 ${days} 天前的所有访客记录吗？`;
  if (!confirm(msg)) return;
  const body = days === 'all' ? { all: true } : { olderThanDays: days };
  const res = await fetchJson('/api/admin/visits', {
    method: 'DELETE',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (res && (res as any).success) {
    showSuccess(`已清理 ${(res as any).deleted} 条记录`);
    loadVisitStats();
    if (visitViewMode.value === 'visitors') loadVisitors();
    else loadVisits();
  }
}

function deviceIcon(type: string) {
  if (type === 'mobile') return '📱';
  if (type === 'tablet') return '📲';
  if (type === 'console' || type === 'smarttv') return '🖥️';
  return '💻';
}

function formatVisitTime(t: string) {
  if (!t) return '';
  const d = new Date(t.includes('Z') || t.includes('+') ? t : t.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return t;
  return d.toLocaleString('zh-CN', { hour12: false });
}

function timeAgo(t: string): string {
  if (!t) return '';
  const d = new Date(t.includes('Z') || t.includes('+') ? t : t.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 0) return '未来';
  const s = Math.floor(diff / 1000);
  if (s < 60) return s + ' 秒前';
  const m = Math.floor(s / 60);
  if (m < 60) return m + ' 分钟前';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' 小时前';
  const day = Math.floor(h / 24);
  if (day < 30) return day + ' 天前';
  return d.toLocaleDateString('zh-CN');
}

function goBack() {
  if (window.history.length > 1) router.back();
  else router.push('/admin');
}

function initData() {
  loadVisitStats();
  if (visitViewMode.value === 'visitors') loadVisitors();
  else loadVisits();
}

onMounted(() => {
  checkLogin();
  if (isLoggedIn.value) initData();
});

// 路由 query 变化时自动刷新 (便于从其他页面跳转)
watch(() => route.query.refresh, () => {
  if (isLoggedIn.value) initData();
});
</script>

<template>
  <div class="admin-visits-page">
    <!-- 顶部导航 -->
    <header class="page-header">
      <div class="container">
        <div class="header-left">
          <button class="back-btn" @click="goBack" title="返回">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 class="page-title">📊 访客分析</h1>
        </div>
        <div class="header-right">
          <router-link to="/admin" class="link-back">← 返回后台</router-link>
          <button v-if="isLoggedIn" @click="logout" class="btn-logout">退出登录</button>
        </div>
      </div>
    </header>

    <div v-if="showSaveMessage" class="save-success">✓ {{ saveMessage }}</div>

    <!-- 登录界面 -->
    <div v-if="!isLoggedIn" class="login-container">
      <div class="login-box">
        <h2>🔒 后台管理登录</h2>
        <p class="login-hint">访客分析需先登录后台</p>
        <input v-model="password" type="password" placeholder="管理员密码" @keyup.enter="login" :disabled="loginLoading" />
        <button @click="login" :disabled="loginLoading">{{ loginLoading ? '登录中…' : '登录' }}</button>
        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      </div>
    </div>

    <!-- 主体内容 -->
    <section v-else class="admin-content">
      <div class="container">

        <!-- 统计卡片 -->
        <div class="visit-stats" v-if="visitStats">
          <div class="stat-card">
            <div class="stat-label">总浏览量</div>
            <div class="stat-value">{{ visitStats.total }}</div>
          </div>
          <div class="stat-card stat-today">
            <div class="stat-label">今日浏览</div>
            <div class="stat-value">{{ visitStats.today }}</div>
            <div class="stat-sub">访客 {{ visitStats.uniqueVisitorsToday || 0 }} · IP {{ visitStats.uniqueToday }}</div>
          </div>
          <div class="stat-card stat-visitor">
            <div class="stat-label">独立访客</div>
            <div class="stat-value">{{ visitStats.uniqueVisitors || 0 }}</div>
            <div class="stat-sub">IP {{ visitStats.uniqueIps }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">本周浏览</div>
            <div class="stat-value">{{ visitStats.week }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">本月浏览</div>
            <div class="stat-value">{{ visitStats.month }}</div>
          </div>
        </div>

        <!-- 详细分布 -->
        <div class="visit-distribution" v-if="visitStats">
          <div class="dist-block">
            <h4>热门页面 (Top 10)</h4>
            <div class="dist-list">
              <div v-for="p in visitStats.topPaths" :key="p.path" class="dist-row">
                <span class="dist-name">{{ p.path }}</span>
                <div class="dist-bar-wrap"><div class="dist-bar" :style="{ width: Math.min(100, (p.c / (visitStats.topPaths[0]?.c || 1)) * 100) + '%' }"></div></div>
                <span class="dist-count">{{ p.c }}</span>
              </div>
              <div v-if="!visitStats.topPaths.length" class="empty-state"><p>暂无数据</p></div>
            </div>
          </div>

          <div class="dist-block">
            <h4>浏览器分布</h4>
            <div class="dist-list">
              <div v-for="b in visitStats.topBrowsers" :key="b.name" class="dist-row">
                <span class="dist-name">{{ b.name }}</span>
                <div class="dist-bar-wrap"><div class="dist-bar" :style="{ width: Math.min(100, (b.c / (visitStats.topBrowsers[0]?.c || 1)) * 100) + '%' }"></div></div>
                <span class="dist-count">{{ b.c }}</span>
              </div>
              <div v-if="!visitStats.topBrowsers.length" class="empty-state"><p>暂无数据</p></div>
            </div>
          </div>

          <div class="dist-block">
            <h4>操作系统分布</h4>
            <div class="dist-list">
              <div v-for="o in visitStats.topOs" :key="o.name" class="dist-row">
                <span class="dist-name">{{ o.name }}</span>
                <div class="dist-bar-wrap"><div class="dist-bar" :style="{ width: Math.min(100, (o.c / (visitStats.topOs[0]?.c || 1)) * 100) + '%' }"></div></div>
                <span class="dist-count">{{ o.c }}</span>
              </div>
              <div v-if="!visitStats.topOs.length" class="empty-state"><p>暂无数据</p></div>
            </div>
          </div>

          <div class="dist-block">
            <h4>设备类型</h4>
            <div class="dist-list">
              <div v-for="d in visitStats.deviceDist" :key="d.name" class="dist-row">
                <span class="dist-name">{{ deviceIcon(d.name) }} {{ d.name || '未知' }}</span>
                <div class="dist-bar-wrap"><div class="dist-bar" :style="{ width: Math.min(100, (d.c / (visitStats.deviceDist[0]?.c || 1)) * 100) + '%' }"></div></div>
                <span class="dist-count">{{ d.c }}</span>
              </div>
              <div v-if="!visitStats.deviceDist.length" class="empty-state"><p>暂无数据</p></div>
            </div>
          </div>

          <div class="dist-block">
            <h4>访客来源 (Top 5)</h4>
            <div class="dist-list">
              <div v-for="(c, i) in visitStats.topCountries" :key="i" class="dist-row">
                <span class="dist-name">🌍 {{ c.country }}{{ c.region ? ' · ' + c.region : '' }}{{ c.city ? ' · ' + c.city : '' }}</span>
                <div class="dist-bar-wrap"><div class="dist-bar" :style="{ width: Math.min(100, (c.c / (visitStats.topCountries[0]?.c || 1)) * 100) + '%' }"></div></div>
                <span class="dist-count">{{ c.c }}</span>
              </div>
              <div v-if="!visitStats.topCountries.length" class="empty-state"><p>暂无数据</p></div>
            </div>
          </div>

          <div class="dist-block" v-if="visitStats.hourly.length">
            <h4>今日 24 小时访问分布</h4>
            <div class="hourly-chart">
              <div v-for="h in 24" :key="h" class="hourly-bar">
                <div class="hourly-fill" :style="{ height: (() => { const found = visitStats.hourly.find((x: any) => parseInt(x.hour) === h - 1); if (!found) return '0%'; const max = Math.max(...visitStats.hourly.map((x: any) => x.c)); return max ? (found.c / max * 100) + '%' : '0%'; })() }"></div>
                <div class="hourly-label">{{ String(h - 1).padStart(2, '0') }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 子视图切换 -->
        <div class="visit-subtabs">
          <button :class="['subtab', { active: visitViewMode === 'visitors' }]" @click="switchVisitView('visitors')">
            👤 访客 (按设备分组)
          </button>
          <button :class="['subtab', { active: visitViewMode === 'pageviews' }]" @click="switchVisitView('pageviews')">
            📄 全部浏览记录
          </button>
        </div>

        <!-- 时间筛选 (访客视图) -->
        <div class="visit-filters" v-if="visitViewMode === 'visitors'">
          <div class="filter-row">
            <input v-model="visitFilter.since" type="datetime-local" @change="loadVisitors" title="开始时间" />
            <input v-model="visitFilter.until" type="datetime-local" @change="loadVisitors" title="结束时间" />
            <button class="btn-primary" @click="loadVisitors">查询</button>
            <button class="btn-secondary" @click="visitFilter.since = ''; visitFilter.until = ''; loadVisitors()">重置</button>
          </div>
        </div>

        <!-- 完整筛选 (浏览记录视图) -->
        <div class="visit-filters" v-else>
          <div class="filter-row">
            <input v-model="visitFilter.ip" placeholder="筛选IP" @keyup.enter="loadVisits" />
            <input v-model="visitFilter.browser" placeholder="浏览器" @keyup.enter="loadVisits" />
            <input v-model="visitFilter.os" placeholder="操作系统" @keyup.enter="loadVisits" />
            <select v-model="visitFilter.device">
              <option value="">所有设备</option>
              <option value="desktop">💻 桌面</option>
              <option value="mobile">📱 手机</option>
              <option value="tablet">📲 平板</option>
            </select>
            <input v-model="visitFilter.path" placeholder="路径" @keyup.enter="loadVisits" />
            <input v-model="visitFilter.since" type="datetime-local" @change="loadVisits" title="开始时间" />
            <input v-model="visitFilter.until" type="datetime-local" @change="loadVisits" title="结束时间" />
            <button class="btn-primary" @click="loadVisits">查询</button>
            <button class="btn-secondary" @click="visitFilter = { ip: '', browser: '', os: '', device: '', path: '', since: '', until: '', limit: 50, offset: 0 }; loadVisits()">重置</button>
          </div>
        </div>

        <!-- 操作栏 -->
        <div class="visit-actions" v-if="visitViewMode === 'visitors'">
          <span class="visit-count">共 {{ visitorTotal }} 位独立访客 (按 IP+设备 分组)</span>
          <button class="btn-tool" @click="loadVisitors; loadVisitStats">刷新</button>
          <button class="btn-tool" @click="cleanupVisits(30)">清理 30 天前</button>
          <button class="btn-tool" @click="cleanupVisits(7)">清理 7 天前</button>
          <button class="btn-delete" @click="cleanupVisits('all')">清空全部</button>
        </div>
        <div class="visit-actions" v-else>
          <span class="visit-count">共 {{ visitTotal }} 条浏览记录</span>
          <button class="btn-tool" @click="loadVisits; loadVisitStats">刷新</button>
          <button class="btn-tool" @click="cleanupVisits(30)">清理 30 天前</button>
          <button class="btn-tool" @click="cleanupVisits(7)">清理 7 天前</button>
          <button class="btn-delete" @click="cleanupVisits('all')">清空全部</button>
        </div>

        <!-- 访客视图 -->
        <div class="visit-table-wrap" v-if="visitViewMode === 'visitors'">
          <div v-if="visitorLoading" class="empty-state"><p>加载中…</p></div>
          <div v-else-if="visitorList.length === 0" class="empty-state"><p>暂无访客记录</p></div>
          <table v-else class="visit-table">
            <thead>
              <tr>
                <th>最近访问</th>
                <th>IP · 地理位置</th>
                <th>设备</th>
                <th>浏览器 / 操作系统</th>
                <th>浏览</th>
                <th>首次访问</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(v, idx) in visitorList" :key="v.visitor_key || idx" class="visitor-row" @click="openVisitorDetail(v)">
                <td class="cell-time">
                  <div>{{ formatVisitTime(v.last_visit) }}</div>
                  <span class="time-ago">{{ timeAgo(v.last_visit) }}</span>
                </td>
                <td class="cell-ip">
                  <div class="ip-line">{{ v.ip || '-' }}</div>
                  <div class="geo-line" v-if="v.country">📍 {{ v.country }}{{ v.region ? ' · ' + v.region : '' }}{{ v.city ? ' · ' + v.city : '' }}</div>
                  <div class="geo-line" v-else style="color:#999">📍 未知</div>
                </td>
                <td>
                  <div class="device-line">
                    <span class="device-badge" :class="'device-' + (v.device_type || 'desktop')">
                      {{ deviceIcon(v.device_type) }} {{ v.device_type || 'desktop' }}
                    </span>
                    <span class="device-model" v-if="v.device_vendor || v.device_model">
                      {{ v.device_vendor }} {{ v.device_model }}
                    </span>
                  </div>
                </td>
                <td>
                  <div class="browser-line">
                    <strong>{{ v.browser }}</strong>
                    <span class="browser-ver">{{ v.browser_version }}</span>
                  </div>
                  <div class="os-line">
                    {{ v.os || '-' }}
                    <span v-if="v.suspicious" class="suspicious-badge" :title="v.suspicious">⚠️ 可疑</span>
                  </div>
                </td>
                <td class="cell-counts">
                  <span class="count-pill">{{ v.pageview_count }} 次</span>
                  <span class="count-sub">{{ v.unique_paths }} 页</span>
                </td>
                <td class="cell-time">{{ formatVisitTime(v.first_visit) }}</td>
                <td @click.stop>
                  <button class="btn-primary-sm" @click="openVisitorDetail(v)">详情</button>
                  <button class="btn-delete-sm" @click="deleteVisitor(v)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 浏览记录视图 -->
        <div class="visit-table-wrap" v-else>
          <div v-if="visitLoading" class="empty-state"><p>加载中…</p></div>
          <div v-else-if="visitList.length === 0" class="empty-state"><p>暂无访问记录</p></div>
          <table v-else class="visit-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>路径</th>
                <th>IP</th>
                <th>地理位置</th>
                <th>浏览器</th>
                <th>操作系统</th>
                <th>设备</th>
                <th>语言</th>
                <th>分辨率</th>
                <th>来源</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in visitList" :key="v.id">
                <td class="cell-time">{{ formatVisitTime(v.visit_time) }}</td>
                <td class="cell-path"><code>{{ v.path }}</code></td>
                <td class="cell-ip">{{ v.ip || '-' }}</td>
                <td class="cell-geo">
                  <span v-if="v.country">{{ v.country }}{{ v.region ? ' · ' + v.region : '' }}{{ v.city ? ' · ' + v.city : '' }}</span>
                  <span v-else>-</span>
                </td>
                <td>{{ v.browser }}{{ v.browser_version ? ' ' + v.browser_version : '' }}</td>
                <td>{{ v.os || '-' }}</td>
                <td class="cell-device">
                  <span class="device-badge" :class="'device-' + (v.device_type || 'desktop')">
                    {{ deviceIcon(v.device_type) }} {{ v.device_type || 'desktop' }}{{ v.device_model ? ' · ' + v.device_model : '' }}
                  </span>
                </td>
                <td>{{ v.language || '-' }}</td>
                <td>{{ v.screen_resolution || '-' }}</td>
                <td class="cell-referer" :title="v.referer">
                  <span v-if="v.referer">{{ new URL(v.referer).hostname }}</span>
                  <span v-else>直接访问</span>
                </td>
                <td><button class="btn-delete-sm" @click="deleteVisit(v.id)">删除</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- 访客详情弹窗 -->
    <div v-if="showVisitorModal" class="modal-overlay" @click="closeVisitorModal">
      <div class="modal-content modal-content-wide" @click.stop>
        <div class="modal-header">
          <h3>访客详情 — {{ selectedVisitor?.ip }} ({{ selectedVisitor?.city || '未知' }})</h3>
          <button @click="closeVisitorModal">×</button>
        </div>
        <div class="modal-body" v-if="selectedVisitor">
          <div class="detail-row"><span class="label">设备:</span><span>{{ deviceIcon(selectedVisitor.device_type) }} {{ selectedVisitor.device_type || 'desktop' }} {{ selectedVisitor.device_vendor || '' }} {{ selectedVisitor.device_model || '' }}</span></div>
          <div class="detail-row"><span class="label">浏览器:</span><span>{{ selectedVisitor.browser }} {{ selectedVisitor.browser_version }}</span></div>
          <div class="detail-row"><span class="label">操作系统:</span><span>{{ selectedVisitor.os || '-' }}</span></div>
          <div class="detail-row"><span class="label">语言:</span><span>{{ selectedVisitor.language || '-' }}</span></div>
          <div class="detail-row"><span class="label">分辨率:</span><span>{{ selectedVisitor.screen_resolution || '-' }}</span></div>
          <div class="detail-row"><span class="label">浏览次数:</span><span><strong>{{ selectedVisitor.pageview_count }}</strong> 次 / <strong>{{ selectedVisitor.unique_paths }}</strong> 不同页</span></div>
          <div class="detail-row"><span class="label">首次访问:</span><span>{{ formatVisitTime(selectedVisitor.first_visit) }}</span></div>
          <div class="detail-row"><span class="label">最近访问:</span><span>{{ formatVisitTime(selectedVisitor.last_visit) }}</span></div>
          <div class="detail-row" v-if="selectedVisitor.suspicious"><span class="label">⚠️ 可疑:</span><span style="color:#856404">{{ selectedVisitor.suspicious }}</span></div>
          <div class="detail-row"><span class="label">UA:</span><span class="ua-text">{{ selectedVisitor.user_agent }}</span></div>

          <h4 style="margin: 18px 0 8px;">浏览历史 ({{ visitorPageviews.length }} 条)</h4>
          <div v-if="visitorPageviewsLoading" class="empty-state"><p>加载中…</p></div>
          <div v-else-if="visitorPageviews.length === 0" class="empty-state"><p>暂无浏览记录</p></div>
          <table v-else class="visit-table" style="font-size:12px">
            <thead>
              <tr>
                <th>时间</th>
                <th>路径</th>
                <th>来源</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pv in visitorPageviews" :key="pv.id">
                <td class="cell-time" style="white-space:nowrap">{{ formatVisitTime(pv.visit_time) }}</td>
                <td class="cell-path"><code>{{ pv.path }}</code></td>
                <td class="cell-referer" :title="pv.referer">
                  <span v-if="pv.referer">{{ new URL(pv.referer).hostname }}</span>
                  <span v-else style="color:#999">直接访问</span>
                </td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 16px; text-align: right;">
            <button class="btn-delete" @click="deleteVisitor(selectedVisitor)">删除该访客全部记录</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-visits-page { min-height: 100vh; background: #f5f7fa; }

.page-header { background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.05); padding: 1.2rem 0; position: sticky; top: 0; z-index: 100; }
.page-header .container { max-width: 1400px; margin: 0 auto; padding: 0 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.header-left { display: flex; align-items: center; gap: 1rem; }
.header-right { display: flex; align-items: center; gap: 1rem; }
.page-title { margin: 0; font-size: 1.4rem; color: #333; }
.back-btn { background: none; border: 1px solid #e0e0e0; padding: 6px; cursor: pointer; border-radius: 6px; color: #555; display: flex; align-items: center; }
.back-btn:hover { background: #f0f0f0; }
.link-back { color: #4a90e2; text-decoration: none; font-size: 14px; }
.link-back:hover { text-decoration: underline; }
.btn-logout { background: #fff; border: 1px solid #dc3545; color: #dc3545; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; }
.btn-logout:hover { background: #fff5f5; }

.save-success { position: fixed; top: 80px; right: 24px; background: #28a745; color: #fff; padding: 10px 20px; border-radius: 6px; z-index: 200; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }

.login-container { display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 100px); padding: 2rem; }
.login-box { background: white; padding: 3rem; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center; width: 100%; max-width: 400px; }
.login-box h2 { margin: 0 0 1rem; color: #333; }
.login-hint { color: #666; margin-bottom: 1.5rem; }
.login-box input { width: 100%; padding: 12px; margin-bottom: 1rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; box-sizing: border-box; }
.login-box button { width: 100%; padding: 12px; background: var(--primary-color, #1a6b4a); color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; transition: background 0.3s; }
.login-box button:hover { background: var(--primary-light, #2a8b5a); }
.login-box button:disabled { opacity: 0.6; cursor: not-allowed; }
.login-box .error { color: #f56c6c; margin-top: 1rem; }

.admin-content { padding: 24px 0; }
.admin-content .container { max-width: 1400px; margin: 0 auto; padding: 0 1.5rem; }

.visit-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}
.stat-card {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 12px;
  padding: 18px;
  border: 1px solid #e0e0e0;
  transition: transform .2s;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.stat-card.stat-today { background: linear-gradient(135deg, #4a90e2, #357abd); color: #fff; border-color: #357abd; }
.stat-card.stat-today .stat-sub { color: rgba(255,255,255,0.85); }
.stat-card.stat-today .stat-label { color: rgba(255,255,255,0.9); }
.stat-card.stat-visitor { background: linear-gradient(135deg, #28a745, #1e7e34); color: #fff; border-color: #1e7e34; }
.stat-card.stat-visitor .stat-sub { color: rgba(255,255,255,0.85); }
.stat-card.stat-visitor .stat-label { color: rgba(255,255,255,0.9); }
.stat-label { font-size: 13px; color: #6c757d; margin-bottom: 6px; }
.stat-value { font-size: 28px; font-weight: 700; line-height: 1.2; }
.stat-sub { font-size: 12px; margin-top: 4px; color: #6c757d; }

.visit-distribution {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}
.dist-block {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 16px;
}
.dist-block h4 { margin: 0 0 12px 0; font-size: 15px; color: #333; }
.dist-list { display: flex; flex-direction: column; gap: 8px; }
.dist-row {
  display: grid;
  grid-template-columns: 130px 1fr 40px;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.dist-name { color: #555; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dist-bar-wrap { background: #f0f0f0; border-radius: 4px; height: 8px; overflow: hidden; }
.dist-bar { background: linear-gradient(90deg, #4a90e2, #5ba0f2); height: 100%; transition: width .3s; }
.dist-count { text-align: right; font-weight: 600; color: #333; }

.hourly-chart {
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  gap: 3px;
  height: 90px;
  align-items: end;
  margin-top: 8px;
}
.hourly-bar { display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
.hourly-fill { width: 100%; background: linear-gradient(180deg, #4a90e2, #357abd); border-radius: 2px 2px 0 0; min-height: 1px; transition: height .3s; }
.hourly-label { font-size: 9px; color: #999; margin-top: 2px; }

.visit-subtabs { display: flex; gap: 8px; margin-bottom: 14px; border-bottom: 2px solid #e9ecef; padding-bottom: 0; }
.subtab { padding: 10px 18px; background: transparent; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-size: 14px; color: #666; margin-bottom: -2px; transition: all .2s; font-weight: 500; }
.subtab:hover { color: #4a90e2; }
.subtab.active { color: #4a90e2; border-bottom-color: #4a90e2; font-weight: 600; }

.visit-filters { background: #f8f9fa; padding: 14px; border-radius: 8px; margin-bottom: 14px; }
.filter-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.filter-row input, .filter-row select { padding: 7px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; background: #fff; }
.filter-row input { min-width: 110px; }
.filter-row select { min-width: 110px; }

.visit-actions { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
.visit-count { color: #666; font-size: 14px; margin-right: auto; }

.visit-table-wrap { overflow-x: auto; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; }
.visit-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 1100px; }
.visit-table th { background: #f8f9fa; padding: 10px 8px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #e0e0e0; position: sticky; top: 0; z-index: 1; }
.visit-table td { padding: 9px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
.visit-table tr:hover { background: #fafbfc; }
.cell-time { white-space: nowrap; color: #666; font-size: 12px; }
.cell-time .time-ago { display: block; color: #999; font-size: 11px; margin-top: 2px; }
.cell-path code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 12px; color: #d63384; }
.cell-ip { font-family: monospace; color: #0d6efd; }
.cell-ip .ip-line { font-family: monospace; color: #0d6efd; font-weight: 500; font-size: 13px; }
.cell-ip .geo-line { color: #198754; font-size: 11px; margin-top: 2px; }
.cell-geo { color: #198754; }
.cell-device .device-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; background: #e7f1ff; color: #0d6efd; }
.cell-device .device-badge.device-mobile { background: #fff3cd; color: #856404; }
.cell-device .device-badge.device-tablet { background: #d1ecf1; color: #0c5460; }
.device-line { display: flex; flex-direction: column; gap: 2px; }
.device-line .device-model { color: #555; font-size: 11px; }
.browser-line { font-size: 13px; }
.browser-line .browser-ver { color: #999; font-size: 11px; margin-left: 4px; }
.os-line { font-size: 12px; color: #555; margin-top: 2px; }
.suspicious-badge { display: inline-block; background: #fff3cd; color: #856404; padding: 1px 6px; border-radius: 8px; font-size: 10px; margin-left: 4px; cursor: help; }
.cell-referer { color: #6c757d; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cell-counts { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.count-pill { background: #4a90e2; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; }
.count-sub { color: #666; font-size: 11px; }
.btn-delete-sm { padding: 3px 10px; font-size: 12px; background: #dc3545; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
.btn-delete-sm:hover { background: #c82333; }
.btn-primary-sm { padding: 4px 12px; font-size: 12px; background: #4a90e2; color: #fff; border: none; border-radius: 4px; cursor: pointer; margin-right: 4px; }
.btn-primary-sm:hover { background: #357abd; }
.visitor-row { cursor: pointer; transition: background .15s; }
.visitor-row:hover { background: #f0f7ff !important; }

.btn-primary, .btn-secondary, .btn-tool, .btn-delete {
  padding: 7px 14px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; transition: all .15s;
}
.btn-primary { background: #4a90e2; color: #fff; }
.btn-primary:hover { background: #357abd; }
.btn-secondary { background: #e0e0e0; color: #333; }
.btn-secondary:hover { background: #d0d0d0; }
.btn-tool { background: #fff; border: 1px solid #ddd; color: #333; }
.btn-tool:hover { background: #f8f9fa; }
.btn-delete { background: #dc3545; color: #fff; }
.btn-delete:hover { background: #c82333; }

.empty-state { padding: 60px 20px; text-align: center; color: #999; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: #fff; border-radius: 12px; width: 90%; max-width: 500px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; }
.modal-content-wide { max-width: 800px !important; max-height: 85vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e9ecef; }
.modal-header h3 { margin: 0; font-size: 16px; color: #333; }
.modal-header button { background: none; border: none; font-size: 24px; cursor: pointer; color: #999; padding: 0; line-height: 1; }
.modal-header button:hover { color: #333; }
.modal-body { padding: 20px; overflow-y: auto; }
.detail-row { display: flex; padding: 6px 0; font-size: 13px; }
.detail-row .label { width: 100px; color: #666; flex-shrink: 0; }
.detail-row > span:last-child { flex: 1; word-break: break-all; }
.ua-text { font-family: monospace; font-size: 11px; color: #666; word-break: break-all; background: #f5f5f5; padding: 6px 8px; border-radius: 4px; }

@media (max-width: 768px) {
  .page-header .container { padding: 0 1rem; }
  .page-title { font-size: 1.1rem; }
  .admin-content .container { padding: 0 1rem; }
  .visit-stats { grid-template-columns: repeat(2, 1fr); }
  .dist-row { grid-template-columns: 100px 1fr 30px; font-size: 12px; }
  .stat-value { font-size: 22px; }
  .filter-row input, .filter-row select { min-width: 0; flex: 1; }
  .header-right .link-back { display: none; }
  .visit-table { min-width: 800px; }
}
</style>
