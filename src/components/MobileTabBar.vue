<template>
  <!-- 移动端底部导航栏 - 磨砂玻璃效果 -->
  <nav class="mobile-tab-bar">
    <!-- 首页 -->
    <router-link to="/" class="tab-item" :class="{ active: $route.path === '/' }">
      <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
      <span>首页</span>
    </router-link>

    <!-- 预约 -->
    <router-link to="/booking" class="tab-item" :class="{ active: $route.path === '/booking' }">
      <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      <span>预约</span>
    </router-link>

    <!-- 课程 -->
    <router-link to="/course" class="tab-item" :class="{ active: $route.path === '/course' }">
      <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
      </svg>
      <span>课程</span>
    </router-link>

    <!-- 关于我们 -->
    <router-link to="/about" class="tab-item" :class="{ active: $route.path === '/about' }">
      <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
      <span>关于我们</span>
    </router-link>
  </nav>
</template>

<style scoped>
/* 桌面端隐藏 */
.mobile-tab-bar {
  display: none;
}

/* ── 移动端（≤768px）底部悬浮磨砂玻璃导航 ── */
@media (max-width: 768px) {
  .mobile-tab-bar {
    display: flex;
    position: fixed;
    bottom: 12px;
    left: 12px;
    right: 12px;
    height: 60px;
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.45);
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.08),
      0 2px 8px rgba(0, 0, 0, 0.04),
      inset 0 1px 0 rgba(255, 255, 255, 0.6);
    z-index: 999;
    justify-content: space-around;
    align-items: center;
    padding: 0 4px;
    margin-bottom: var(--safe-bottom);
    will-change: transform;
  }

  .tab-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    color: rgba(0, 0, 0, 0.45);
    font-size: 10px;
    font-weight: 500;
    min-width: 60px;
    height: 48px;
    gap: 2px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    -webkit-tap-highlight-color: transparent;
    border-radius: 14px;
    padding: 2px 8px;
    position: relative;
  }

  .tab-item:active {
    transform: scale(0.94);
  }

  .tab-item.active {
    color: var(--primary-color);
  }

  /* 选中态底部小圆点 */
  .tab-item.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--primary-color);
  }

  .tab-icon {
    width: 22px;
    height: 22px;
    transition: all 0.25s ease;
  }

  .tab-item.active .tab-icon {
    transform: scale(1.08);
  }
}

/* 超小屏微调 */
@media (max-width: 360px) {
  .mobile-tab-bar {
    left: 8px;
    right: 8px;
    bottom: 8px;
    height: 54px;
    border-radius: 16px;
  }

  .tab-item {
    min-width: 50px;
    font-size: 9px;
  }

  .tab-icon {
    width: 20px;
    height: 20px;
  }
}
</style>
