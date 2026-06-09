<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const isLoggedIn = ref(false);
const password = ref('');
const errorMsg = ref('');
const loginLoading = ref(false);

const data = ref<any>(null);
const loading = ref(false);
const refreshTimer = ref<ReturnType<typeof setInterval> | null>(null);

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
      const d = await r.json();
      sessionStorage.setItem('adminToken', d.token);
      isLoggedIn.value = true;
      password.value = '';
      fetchStats();
      refreshTimer.value = setInterval(fetchStats, 10000);
    } else {
      const d = await r.json().catch(() => ({}));
      errorMsg.value = d.error || '登录失败';
    }
  } catch {
    errorMsg.value = '网络错误';
  } finally {
    loginLoading.value = false;
  }
};

const logout = () => {
  sessionStorage.removeItem('adminToken');
  isLoggedIn.value = false;
  if (refreshTimer.value) clearInterval(refreshTimer.value);
};

const fetchStats = async () => {
  const token = sessionStorage.getItem('adminToken');
  if (!token) return;
  loading.value = true;
  try {
    const r = await fetch('/api/admin/server-stats', {
      headers: { 'X-Admin-Token': token }
    });
    if (r.ok) data.value = await r.json();
    else if (r.status === 401) logout();
  } catch {} finally {
    loading.value = false;
  }
};

const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}天 ${h}小时 ${m}分钟`;
};

const formatSize = (bytes: number) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
};

const checkLogin = () => {
  const token = sessionStorage.getItem('adminToken');
  if (token) {
    isLoggedIn.value = true;
    fetchStats();
    refreshTimer.value = setInterval(fetchStats, 10000);
  }
};

onMounted(checkLogin);
</script>

<template>
  <div class="server-page">
    <!-- 登录 -->
    <div v-if="!isLoggedIn" class="login-screen">
      <div class="login-card">
        <h1>🖥 服务器运行面板</h1>
        <p class="subtitle">请输入管理员密码</p>
        <form @submit.prevent="login">
          <input v-model="password" type="password" placeholder="管理员密码" autofocus />
          <button type="submit" :disabled="loginLoading" class="btn-primary">
            {{ loginLoading ? '登录中...' : '登录' }}
          </button>
        </form>
        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      </div>
    </div>

    <!-- 主面板 -->
    <div v-else class="dashboard">
      <header>
        <h1>🖥 服务器运行面板</h1>
        <div class="header-actions">
          <button class="btn-back" @click="router.push('/admin')">← 返回后台</button>
          <button class="btn-logout" @click="logout">退出</button>
        </div>
      </header>

      <div v-if="!data" class="loading">加载中...</div>

      <div v-else class="grid">
        <!-- 服务器基本信息 -->
        <section class="card">
          <h2>服务器信息</h2>
          <table>
            <tr><td>主机名</td><td>{{ data.server.hostname }}</td></tr>
            <tr><td>操作系统</td><td>{{ data.server.platform }} {{ data.server.arch }}</td></tr>
            <tr><td>内核版本</td><td>{{ data.server.release }}</td></tr>
            <tr><td>运行时间</td><td>{{ formatUptime(data.server.uptime) }}</td></tr>
            <tr><td>Node.js</td><td>{{ data.server.nodeVersion }}</td></tr>
            <tr><td>进程运行时间</td><td>{{ formatUptime(data.server.processUptime) }}</td></tr>
          </table>
        </section>

        <!-- CPU -->
        <section class="card">
          <h2>CPU</h2>
          <table>
            <tr><td>型号</td><td class="break">{{ data.server.cpuModel }}</td></tr>
            <tr><td>核心数</td><td>{{ data.server.cpuCores }}</td></tr>
            <tr><td>负载 1min</td><td>{{ data.server.loadAvg.m1.toFixed(2) }}</td></tr>
            <tr><td>负载 5min</td><td>{{ data.server.loadAvg.m5.toFixed(2) }}</td></tr>
            <tr><td>负载 15min</td><td>{{ data.server.loadAvg.m15.toFixed(2) }}</td></tr>
          </table>
          <div class="bar-wrap">
            <div class="bar" :style="{ width: Math.min(data.server.loadAvg.m1 / data.server.cpuCores * 100, 100) + '%' }"></div>
          </div>
        </section>

        <!-- 内存 -->
        <section class="card">
          <h2>内存</h2>
          <table>
            <tr><td>总计</td><td>{{ formatSize(data.server.memTotal) }}</td></tr>
            <tr><td>已用</td><td>{{ formatSize(data.server.memUsed) }}</td></tr>
            <tr><td>空闲</td><td>{{ formatSize(data.server.memFree) }}</td></tr>
          </table>
          <div class="bar-wrap">
            <div class="bar bar-mem" :style="{ width: data.server.memUsagePercent + '%' }"></div>
          </div>
          <div class="percent">{{ data.server.memUsagePercent }}%</div>
        </section>

        <!-- 磁盘 -->
        <section class="card" v-if="data.server.diskTotal">
          <h2>磁盘</h2>
          <table>
            <tr><td>总计</td><td>{{ formatSize(data.server.diskTotal) }}</td></tr>
            <tr><td>已用</td><td>{{ formatSize(data.server.diskUsed) }}</td></tr>
            <tr><td>空闲</td><td>{{ formatSize(data.server.diskFree) }}</td></tr>
          </table>
          <div class="bar-wrap">
            <div class="bar bar-disk" :style="{ width: data.server.diskUsagePercent + '%' }"></div>
          </div>
          <div class="percent">{{ data.server.diskUsagePercent }}%</div>
        </section>

        <!-- GPU -->
        <section class="card" v-if="data.server.gpu">
          <h2>GPU</h2>
          <table>
            <tr><td>型号</td><td>{{ data.server.gpu.name }}</td></tr>
            <tr><td>显存总计</td><td>{{ data.server.gpu.memTotal }} MB</td></tr>
            <tr><td>显存已用</td><td>{{ data.server.gpu.memUsed }} MB</td></tr>
            <tr><td>显存空闲</td><td>{{ data.server.gpu.memFree }} MB</td></tr>
            <tr><td>利用率</td><td>{{ data.server.gpu.util }}%</td></tr>
          </table>
          <div class="bar-wrap">
            <div class="bar bar-gpu" :style="{ width: data.server.gpu.util + '%' }"></div>
          </div>
        </section>

        <!-- 进程 -->
        <section class="card">
          <h2>进程</h2>
          <table>
            <tr><td>内存占用</td><td>{{ formatSize(data.server.processMemory) }}</td></tr>
            <tr><td>进程运行时间</td><td>{{ formatUptime(data.server.processUptime) }}</td></tr>
          </table>
        </section>

        <!-- 网站统计 -->
        <section class="card">
          <h2>网站统计</h2>
          <table>
            <tr><td>站点名称</td><td>{{ data.website.siteName }}</td></tr>
            <tr><td>数据库大小</td><td>{{ formatSize(data.website.dbSize) }}</td></tr>
            <tr><td>上传文件数</td><td>{{ data.website.uploadCount }}</td></tr>
            <tr><td>上传总大小</td><td>{{ formatSize(data.website.uploadSize) }}</td></tr>
            <tr><td>访客记录</td><td>{{ data.website.visitCount }} 条</td></tr>
            <tr><td>预约记录</td><td>{{ data.website.bookingCount }} 条</td></tr>
            <tr><td>服务器时间</td><td>{{ new Date(data.website.serverTime).toLocaleString() }}</td></tr>
          </table>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.server-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f0faf0 0%, #f5f7fa 50%, #e8f5e9 100%);
  font-family: -apple-system, system-ui, sans-serif;
}
.login-screen {
  display: flex; justify-content: center; align-items: center;
  min-height: 100vh; background: #1a1a2e;
}
.login-card {
  background: #16213e; padding: 40px; border-radius: 16px;
  width: 100%; max-width: 380px; text-align: center;
}
.login-card h1 { color: #e94560; font-size: 22px; margin-bottom: 8px; }
.login-card .subtitle { color: #aaa; font-size: 14px; margin-bottom: 24px; }
.login-card input {
  width: 100%; padding: 12px 16px; border: 1px solid #0f3460; border-radius: 8px;
  background: #0f3460; color: #eee; font-size: 15px; outline: none; box-sizing: border-box;
}
.login-card input:focus { border-color: #e94560; }
.login-card .btn-primary {
  width: 100%; padding: 12px; background: #e94560; color: #fff; border: none;
  border-radius: 8px; font-size: 15px; cursor: pointer; margin-top: 16px;
}
.login-card .btn-primary:disabled { opacity: 0.6; }
.login-card .error { color: #ef5350; margin-top: 12px; font-size: 13px; }

.dashboard { max-width: 1100px; margin: 0 auto; padding: 20px; }
header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
}
header h1 { font-size: 22px; color: #1a1a2e; margin: 0; }
.header-actions { display: flex; gap: 8px; }
.btn-back, .btn-logout {
  padding: 8px 16px; border: none; border-radius: 8px; font-size: 13px; cursor: pointer;
}
.btn-back { background: #e8eaf6; color: #3949ab; }
.btn-logout { background: #ffebee; color: #c62828; }

.loading { text-align: center; color: #888; padding: 60px; font-size: 16px; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
.card {
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.7);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.card h2 { font-size: 15px; color: #1a1a2e; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e94560; }
table { width: 100%; border-collapse: collapse; }
td { padding: 5px 0; font-size: 13px; }
td:first-child { color: #888; width: 100px; white-space: nowrap; }
td:last-child { color: #333; }
.break { word-break: break-all; }

.bar-wrap {
  height: 8px; background: #e0e0e0; border-radius: 4px; margin-top: 10px; overflow: hidden;
}
.bar { height: 100%; background: #3949ab; border-radius: 4px; transition: width 1s ease; }
.bar-mem { background: #e94560; }
.bar-disk { background: #2e7d32; }
.bar-gpu { background: #f57c00; }
.percent { font-size: 12px; color: #888; margin-top: 4px; text-align: right; }
</style>
