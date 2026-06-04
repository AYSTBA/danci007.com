<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const links = [
  { label: '首页', path: '/' },
  { label: '关于我们', path: '/about' },
  { label: '在线预约', path: '/booking' },
];
</script>

<template>
  <div class="not-found">
    <!-- 装饰背景 -->
    <div class="bg-decor">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>

    <div class="content">
      <!-- 404 动画图标 -->
      <div class="icon-wrap">
        <svg viewBox="0 0 120 120" width="100" height="100" class="search-icon">
          <circle cx="50" cy="50" r="30" fill="none" stroke="var(--primary-color)" stroke-width="4" stroke-linecap="round" opacity="0.3"/>
          <line x1="72" y1="72" x2="95" y2="95" stroke="var(--primary-color)" stroke-width="4" stroke-linecap="round" opacity="0.3"/>
          <text x="50" y="58" text-anchor="middle" font-size="32" font-weight="700" fill="var(--primary-color)">?</text>
        </svg>
      </div>

      <h1 class="error-code">404</h1>
      <p class="error-title">{{ '页面不存在' }}</p>
      <p class="error-sub">请检查网址是否正确，或返回以下页面</p>

      <!-- 快捷导航 -->
      <div class="quick-links">
        <button
          v-for="link in links"
          :key="link.path"
          class="link-btn"
          @click="router.push(link.path)"
        >
          {{ link.label }}
        </button>
      </div>

      <button class="home-btn" @click="router.push('/')">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        返回首页
      </button>

      <!-- Copyright -->
      <p class="copyright">&copy; {{ new Date().getFullYear() }} 中萱文化 · 中萱书店</p>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  padding: 20px;
  position: relative;
  overflow: hidden;
}

/* ── 装饰背景圆 ── */
.bg-decor {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
}
.circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.06;
  background: var(--primary-color);
}
.circle-1 {
  width: 300px; height: 300px;
  top: -80px; right: -60px;
}
.circle-2 {
  width: 200px; height: 200px;
  bottom: -40px; left: -40px;
}
.circle-3 {
  width: 120px; height: 120px;
  top: 40%; left: 15%;
  opacity: 0.04;
}

/* ── 内容区 ── */
.content {
  text-align: center;
  position: relative;
  z-index: 1;
  max-width: 420px;
  width: 100%;
}

.icon-wrap {
  margin-bottom: 20px;
  animation: float 3s ease-in-out infinite;
}
.search-icon {
  display: inline-block;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.error-code {
  font-size: 80px;
  font-weight: 800;
  background: linear-gradient(to bottom, var(--primary-light), var(--primary-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  line-height: 1;
}

.error-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 12px 0 8px;
}

.error-sub {
  font-size: 14px;
  color: var(--text-light);
  margin: 0 0 28px;
  line-height: 1.6;
}

/* ── 快捷导航按钮组 ── */
.quick-links {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.link-btn {
  padding: 10px 20px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--sp-3);
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  min-height: var(--touch-min);
  transition: all 0.2s;
}
.link-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}
.link-btn:active {
  transform: scale(0.97);
}

/* ── 返回首页主按钮 ── */
.home-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
  padding: 14px 40px;
  background: linear-gradient(to bottom, var(--primary-light), var(--primary-dark));
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  min-height: 48px;
  transition: all 0.2s;
  box-shadow: var(--shadow-md);
}
.home-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
}
.home-btn:active {
  transform: scale(0.98);
}

.copyright {
  margin-top: 32px;
  font-size: 12px;
  color: var(--text-light);
}

@media (max-width: 768px) {
  .error-code { font-size: 64px; }
  .error-title { font-size: 18px; }
  .icon-wrap { margin-bottom: 16px; }
  .search-icon { width: 80px; height: 80px; }
}
</style>
