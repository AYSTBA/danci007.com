<template>
  <!-- 移动端底部导航栏 - 磨砂玻璃效果 -->
  <nav class="mobile-tab-bar">
    <router-link to="/" class="tab-item" :class="{ active: $route.path === '/' }">
      <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <span>{{ currentLang === 'zh' ? '首页' : 'Home' }}</span>
    </router-link>
    <router-link to="/about" class="tab-item" :class="{ active: $route.path === '/about' }">
      <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      <span>{{ currentLang === 'zh' ? '关于' : 'About' }}</span>
    </router-link>
    <router-link to="/enrollment" class="tab-item" :class="{ active: $route.path === '/enrollment' }">
      <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
      <span>{{ currentLang === 'zh' ? '课程' : 'Course' }}</span>
    </router-link>
    <router-link to="/booking" class="tab-item tab-cta" :class="{ active: $route.path === '/booking' }">
      <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
      <span>{{ currentLang === 'zh' ? '预约' : 'Book' }}</span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { useLanguage } from '../composables/useLanguage';

const { currentLang } = useLanguage();
</script>

<style scoped>
/* ── 底部 Tab Bar - 磨砂玻璃效果 ── */
.mobile-tab-bar {
  display: none; /* 默认隐藏，只在移动端显示 */
}

@media (max-width: 768px) {
  .mobile-tab-bar {
    display: flex;
    position: fixed;
    bottom: 16px;
    left: 16px;
    right: 16px;
    height: var(--tab-bar-h);
    background: rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.08),
      0 2px 8px rgba(0, 0, 0, 0.04),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
    z-index: 200;
    justify-content: space-around;
    align-items: center;
    padding: 0 8px;
    margin-bottom: var(--safe-bottom);
  }

  .tab-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    color: rgba(0, 0, 0, 0.5);
    font-size: 11px;
    font-weight: 500;
    min-width: 64px;
    min-height: var(--tab-bar-h);
    gap: 4px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    -webkit-tap-highlight-color: transparent;
    border-radius: 16px;
    padding: 4px 12px;
  }

  .tab-item.router-link-active,
  .tab-item.active {
    color: #3498db;
    background: rgba(52, 152, 219, 0.12);
  }

  .tab-icon {
    width: 22px;
    height: 22px;
    stroke-width: 1.8;
    transition: all 0.3s ease;
  }

  .tab-item.router-link-active .tab-icon,
  .tab-item.active .tab-icon {
    stroke-width: 2.2;
    transform: scale(1.1);
  }

  .tab-cta {
    background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
    color: white !important;
    border-radius: 16px;
    padding: 6px 14px;
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
  }

  .tab-cta .tab-icon {
    color: white;
    stroke: white;
  }

  .tab-cta.router-link-active,
  .tab-cta.active {
    background: linear-gradient(135deg, #45a049 0%, #3d8b40 100%);
    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
  }
}
</style>
