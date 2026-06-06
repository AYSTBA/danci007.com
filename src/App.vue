<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import MobileTabBar from './components/MobileTabBar.vue'

const route = useRoute()
const isMobileTabBarVisible = computed(() => {
  return !route.path.startsWith('/course') && !route.path.startsWith('/admin')
})

// 访客埋点: 路由变化时上报 (sendBeacon 保证页面关闭也能送达)
function trackVisit(path: string) {
  try {
    const payload = JSON.stringify({
      path,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language || '',
      referer: document.referrer || ''
    })
    const blob = new Blob([payload], { type: 'application/json' })
    // sendBeacon 在不支持时降级到 fetch keepalive
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/visit', blob)
    } else {
      fetch('/api/visit', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {})
    }
  } catch { /* 静默失败 */ }
}

onMounted(() => trackVisit(route.fullPath))
watch(() => route.fullPath, (p) => trackVisit(p))
</script>

<template>
  <div class="app" :class="{ 'no-tab-bar': !isMobileTabBarVisible }">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    <!-- 移动端底部磨砂玻璃导航栏（课程详情页与后台页面使用自定义底部栏时不显示） -->
    <MobileTabBar v-if="isMobileTabBarVisible" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
}

/* 移动端底部留出导航栏空间 */
@media (max-width: 768px) {
  .app {
    padding-bottom: 90px;
  }
  .app.no-tab-bar {
    padding-bottom: 0;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>


